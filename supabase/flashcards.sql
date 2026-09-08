-- ============================================================================
-- LEARNHUB — SOẠN FLASHCARD LƯU DATABASE (bảng + RLS + RPC security definer)
-- YÊU CẦU: đã chạy public.is_teacher() trước (schema.sql).
-- Chạy 1 lần trên SQL Editor.
-- ============================================================================

-- ============ 1. BẢNG ============

create table if not exists public.flashcard_sets (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  text not null,
  name        text not null default '',
  category    text not null default '',
  level       text not null default '',
  description text not null default '',
  cards       jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Bổ sung cột category nếu đã tạo bảng từ bản trước (tương thích migrate).
alter table public.flashcard_sets add column if not exists category text not null default '';

create index if not exists flashcard_sets_teacher_idx on public.flashcard_sets (teacher_id);

alter table public.flashcard_sets enable row level security;

-- ============ 2. RLS: chặn truy cập trực tiếp (mọi thao tác qua RPC) ============

drop policy if exists flashcard_sets_no_direct on public.flashcard_sets;
create policy flashcard_sets_no_direct on public.flashcard_sets
  for all to authenticated using (false) with check (false);

-- ============ 3. RPC ============

-- Xoá các hàm BẢN CŨ (chữ ký / kiểu trả về khác) trước khi tạo lại —
-- create or replace function không cho đổi kiểu trả về.
drop function if exists public.create_flashcard_set(text, text, text, jsonb);
drop function if exists public.create_flashcard_set(text, text, text, text, jsonb);
drop function if exists public.teacher_flashcard_sets();
drop function if exists public.list_flashcard_sets();
drop function if exists public.update_flashcard_set(uuid, text, text, text, jsonb);
drop function if exists public.update_flashcard_set(uuid, text, text, text, text, jsonb);

-- Giáo viên tạo bộ thẻ (kèm toàn bộ thẻ). p_cards = jsonb array [{front, back, example?}].
create or replace function public.create_flashcard_set(
  p_name text,
  p_category text,
  p_level text,
  p_description text,
  p_cards jsonb
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid text := auth.uid()::text;
  v_id uuid;
begin
  if v_uid is null or not public.is_teacher() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if btrim(coalesce(p_name, '')) = '' then
    return jsonb_build_object('ok', false, 'error', 'empty_name');
  end if;
  if p_cards is null or jsonb_typeof(p_cards) <> 'array' or jsonb_array_length(p_cards) = 0 then
    return jsonb_build_object('ok', false, 'error', 'empty_cards');
  end if;
  insert into public.flashcard_sets (teacher_id, name, category, level, description, cards)
    values (v_uid, btrim(p_name), btrim(coalesce(p_category, '')), btrim(coalesce(p_level, '')), btrim(coalesce(p_description, '')), p_cards)
    returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id, 'card_count', jsonb_array_length(p_cards));
end;
$$;
revoke execute on function public.create_flashcard_set(text, text, text, text, jsonb) from public;
grant execute on function public.create_flashcard_set(text, text, text, text, jsonb) to authenticated;

-- Danh sách bộ thẻ của GIÁO VIÊN hiện tại (web giáo viên — kèm số thẻ).
create or replace function public.teacher_flashcard_sets()
returns table(set_id uuid, name text, category text, level text, description text, card_count bigint, created_at timestamptz, updated_at timestamptz)
language sql stable security definer
set search_path = public
as $$
  select s.id,
         s.name,
         s.category,
         s.level,
         s.description,
         coalesce(jsonb_array_length(s.cards), 0),
         s.created_at,
         s.updated_at
    from public.flashcard_sets s
   where s.teacher_id = auth.uid()::text
   order by s.created_at desc;
$$;
revoke execute on function public.teacher_flashcard_sets() from public;
grant execute on function public.teacher_flashcard_sets() to authenticated;

-- Danh sách TẤT CẢ bộ thẻ (cho hub học sinh) — chỉ meta, không gửi nội dung thẻ.
create or replace function public.list_flashcard_sets()
returns table(set_id uuid, name text, category text, level text, description text, card_count bigint, teacher_name text, created_at timestamptz)
language sql stable security definer
set search_path = public
as $$
  select s.id,
         s.name,
         s.category,
         s.level,
         s.description,
         coalesce(jsonb_array_length(s.cards), 0),
         coalesce(u.name, ''),
         s.created_at
    from public.flashcard_sets s
    left join public.users u on u.id = s.teacher_id
   order by s.created_at desc;
$$;
revoke execute on function public.list_flashcard_sets() from public;
grant execute on function public.list_flashcard_sets() to authenticated;

-- Lấy 1 bộ thẻ đầy đủ (để vào học — flash.html?set=<id>). Ai cũng xem được sau khi đăng nhập.
create or replace function public.get_flashcard_set(p_set_id uuid)
returns table(set_id uuid, name text, level text, description text, cards jsonb, teacher_name text)
language sql stable security definer
set search_path = public
as $$
  select s.id, s.name, s.level, s.description, s.cards, coalesce(u.name, '')
    from public.flashcard_sets s
    left join public.users u on u.id = s.teacher_id
   where s.id = p_set_id;
$$;
revoke execute on function public.get_flashcard_set(uuid) from public;
grant execute on function public.get_flashcard_set(uuid) to authenticated;

-- Cập nhật 1 bộ thẻ (chỉ giáo viên sở hữu). Thay meta + thay toàn bộ thẻ.
create or replace function public.update_flashcard_set(
  p_set_id uuid,
  p_name text,
  p_category text,
  p_level text,
  p_description text,
  p_cards jsonb
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
begin
  if p_set_id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  if not exists (select 1 from public.flashcard_sets s where s.id = p_set_id and s.teacher_id = auth.uid()::text) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if btrim(coalesce(p_name, '')) = '' then
    return jsonb_build_object('ok', false, 'error', 'empty_name');
  end if;
  if p_cards is null or jsonb_typeof(p_cards) <> 'array' or jsonb_array_length(p_cards) = 0 then
    return jsonb_build_object('ok', false, 'error', 'empty_cards');
  end if;
  update public.flashcard_sets
     set name        = btrim(p_name),
         category    = btrim(coalesce(p_category, '')),
         level       = btrim(coalesce(p_level, '')),
         description = btrim(coalesce(p_description, '')),
         cards       = p_cards,
         updated_at  = now()
   where id = p_set_id;
  return jsonb_build_object('ok', true, 'id', p_set_id, 'card_count', jsonb_array_length(p_cards));
end;
$$;
revoke execute on function public.update_flashcard_set(uuid, text, text, text, text, jsonb) from public;
grant execute on function public.update_flashcard_set(uuid, text, text, text, text, jsonb) to authenticated;

-- Xoá 1 bộ thẻ (chỉ giáo viên sở hữu).
create or replace function public.delete_flashcard_set(p_set_id uuid)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
begin
  if p_set_id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  if not exists (select 1 from public.flashcard_sets s where s.id = p_set_id and s.teacher_id = auth.uid()::text) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  delete from public.flashcard_sets where id = p_set_id;
  return jsonb_build_object('ok', true);
end;
$$;
revoke execute on function public.delete_flashcard_set(uuid) from public;
grant execute on function public.delete_flashcard_set(uuid) to authenticated;