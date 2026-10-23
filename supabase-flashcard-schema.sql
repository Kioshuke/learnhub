-- ============================================================================
-- LearnHub Flashcard Database Schema
-- Chạy file này trên Supabase Dashboard -> SQL Editor
-- Idempotent: an toàn chạy lại nhiều lần
-- ============================================================================

-- 1. Tạo extension cần thiết
create extension if not exists "pgcrypto";

-- 2. Bảng chứa các bộ flashcard
create table if not exists public.flashcard_sets (
  id            uuid primary key default gen_random_uuid(),
  name          text not null default '',
  description   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz
);

-- 3. Bảng chứa các lá bài (cards) trong mỗi bộ
create table if not exists public.flashcard_cards (
  id            uuid primary key default gen_random_uuid(),
  set_id        uuid not null references public.flashcard_sets(id) on delete cascade,
  front         text not null,      -- Từ tiếng Anh (câu hỏi)
  back          text not null,      -- Từ/Việt nghĩa (câu trả lời)
  example       text,             -- Ví dụ sử dụng
  description   text,             -- Mô tả chi tiết
  level         text default 'Dễ', -- Dễ / Trung bình / Khó / Nâng cao
  created_at    timestamptz not null default now(),
  updated_at    timestamptz
);

-- Index cho tốc tra
create index if not exists flashcard_cards_set_id_idx on public.flashcard_cards(set_id);
create index if not exists flashcard_cards_level_idx on public.flashcard_cards(level);

-- 4. Function: Lấy thông tin bộ flashcard kèm danh sách cards
create or replace function public.get_flashcard_set(p_set_id uuid)
returns table(
  name text,
  cards jsonb
)
language plpgsql security definer
set search_path = public
as $$
declare
  v_set public.flashcard_sets%rowtype;
  v_cards jsonb;
begin
  -- Lấy thông tin bộ
  select * into v_set from public.flashcard_sets where id = p_set_id;
  if not found then
    return query select 'Bộ từ vựng' as name, '[]'::jsonb as cards;
  end if;

  -- Lấy danh sách cards
  select jsonb_agg(jsonb_build_object(
    'front', front,
    'back', back,
    'example', example,
    'description', description,
    'level', level
  )) into v_cards from public.flashcard_cards
  where set_id = p_set_id;

  return query select v_set.name, coalesce(v_cards, '[]'::jsonb);
end;
$$;

-- 5. Function: Thêm bộ flashcard mới (chỉ admin/giáo viên)
create or replace function public.create_flashcard_set(p_name text, p_description text)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null or not public.is_admin() then
    return null;
  end if;
  insert into public.flashcard_sets (name, description)
  values (btrim(p_name), btrim(coalesce(p_description, '')))
  returning id into v_id;
  return v_id;
end;
$$;

-- 6. Function: Thêm lá bài mới vào bộ (chỉ admin/giáo viên)
create or replace function public.add_flashcard_card(p_set_id uuid, p_front text, p_back text, p_example text default null, p_description text default null, p_level text default 'Dễ')
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null or not public.is_admin() then
    return null;
  end if;
  insert into public.flashcard_cards (set_id, front, back, example, description, level)
  values (p_set_id, btrim(p_front), btrim(p_back), p_example, p_description, btrim(coalesce(p_level, 'Dễ')))
  returning id into v_id;
  return v_id;
end;
$$;

-- 7. Function: Cập nhật lá bài (chỉ admin)
create or replace function public.update_flashcard_card(p_card_id uuid, p_front text, p_back text, p_example text, p_description text, p_level text)
returns boolean
language plpgsql security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if auth.uid() is null or not public.is_admin() then
    return false;
  end if;

  update public.flashcard_cards
  set front = btrim(coalesce(p_front, '')),
      back = btrim(coalesce(p_back, '')),
      example = p_example,
      description = p_description,
      level = btrim(coalesce(p_level, 'Dễ')),
      updated_at = now()
  where id = p_card_id;

  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;

-- 8. Function: Xóa lá bài (chỉ admin)
create or replace function public.delete_flashcard_card(p_card_id uuid)
returns boolean
language plpgsql security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if auth.uid() is null or not public.is_admin() then
    return false;
  end if;

  delete from public.flashcard_cards where id = p_card_id;
  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;

-- 9. Policy: Cho phép authenticated đọc bộ flashcard
drop policy if exists flashcard_sets_select on public.flashcard_sets;
create policy flashcard_sets_select on public.flashcard_sets
  for select to authenticated using (true);

drop policy if exists flashcard_cards_select on public.flashcard_cards;
create policy flashcard_cards_select on public.flashcard_cards
  for select to authenticated using (true);

-- 10. Policy: Chỉ admin có thể viết
drop policy if exists flashcard_sets_admin on public.flashcard_sets;
create policy flashcard_sets_admin on public.flashcard_sets
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists flashcard_cards_admin on public.flashcard_cards;
create policy flashcard_cards_admin on public.flashcard_cards
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- RLS: Grant permissions
-- ============================================================================
grant usage on schema public to anon, authenticated;
grant select on public.flashcard_sets to anon, authenticated;
grant select on public.flashcard_cards to anon, authenticated;
grant insert, update, delete on public.flashcard_sets to authenticated;
grant insert, update, delete on public.flashcard_cards to authenticated;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================

-- Ví dụ sử dụng sau khi chạy xong:
--
-- -- Tạo bộ từ mới (chỉ admin):
-- select public.create_flashcard_set('Từ vựng tiếng Anh', '400 từ常用');
--
-- -- Thêm lá bài (chỉ admin):
-- select public.add_flashcard_card(
--   (select id from public.flashcard_sets where name = 'Từ vựng tiếng Anh'),
--   'apple', 'Táo', 'A fruit', 'Mô tả về táo', 'Dễ'
-- );
--
-- -- User tải bộ từ qua web:
-- -- URL: flashcard.html?set={set_id}
-- -- Code JS: window.__fcLoadSet('{set_id}')