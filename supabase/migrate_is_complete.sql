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
  is_complete boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Bổ sung cột category nếu đã tạo bảng từ bản trước (tương thích migrate).
alter table public.flashcard_sets add column if not exists category text not null default '';
alter table public.flashcard_sets add column if not exists is_complete boolean not null default false;

create index if not exists flashcard_sets_teacher_idx on public.flashcard_sets (teacher_id);

alter table public.flashcard_sets enable row level security;

-- ============ 2. RLS: chặn truy cập trực tiếp (mọi thao tác qua RPC) ============

drop policy if exists flashcard_sets_no_direct on public.flashcard_sets;
create policy flashcard_sets_no_direct on public.flashcard_sets
  for all to authenticated using (false) with check (false);

-- ============ 3. RPC (phiên bản mới, kèm is_complete) ============
-- Xoá các hàm BẢN CŨ (chữ ký / kiểu trả về khác) trước khi tạo lại —
-- create or replace function không cho đổi kiểu trả về.
drop function if exists public.create_flashcard_set(text, text, text, jsonb);
drop function if exists public.create_flashcard_set(text, text, text, text, jsonb);
drop function if exists public.create_flashcard_set(text, text, text, text, jsonb, boolean);
drop function if exists public.teacher_flashcard_sets();
drop function if exists public.list_flashcard_sets();
drop function if exists public.get_flashcard_set(uuid);
drop function if exists public.update_flashcard_set(uuid, text, text, text, jsonb);
drop function if exists public.update_flashcard_set(uuid, text, text, text, text, jsonb);
drop function if exists public.update_flashcard_set(uuid, text, text, text, text, jsonb, boolean);
drop function if exists public.delete_flashcard_set(uuid);


-- Giáo viên tạo bộ thẻ (kèm toàn bộ thẻ). p_cards = jsonb array [{front, back, example?}].
create or replace function public.create_flashcard_set(
  p_name text,
  p_category text,
  p_level text,
  p_description text,
  p_cards jsonb,
  p_is_complete boolean default false
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
  insert into public.flashcard_sets (teacher_id, name, category, level, description, cards, is_complete)
    values (v_uid, btrim(p_name), btrim(coalesce(p_category, '')), btrim(coalesce(p_level, '')), btrim(coalesce(p_description, '')), p_cards, coalesce(p_is_complete, false))
    returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id, 'card_count', jsonb_array_length(p_cards));
end;
$$;
revoke execute on function public.create_flashcard_set(text, text, text, text, jsonb, boolean) from public;
grant execute on function public.create_flashcard_set(text, text, text, text, jsonb, boolean) to authenticated;

-- Danh sách bộ thẻ (web giáo viên — kèm số thẻ). Flashcard xài chung:
-- giáo viên/admin nào cũng thấy tất cả các bộ, không phân biệt chủ sở hữu.
create or replace function public.teacher_flashcard_sets()
returns table(set_id uuid, name text, category text, level text, description text, is_complete boolean, card_count bigint, created_at timestamptz, updated_at timestamptz)
language sql stable security definer
set search_path = public
as $$
  select s.id,
         s.name,
         s.category,
         s.level,
         s.description,
         s.is_complete,
         coalesce(jsonb_array_length(s.cards), 0),
         s.created_at,
         s.updated_at
    from public.flashcard_sets s
   where public.is_teacher()
   order by s.created_at desc;
$$;
revoke execute on function public.teacher_flashcard_sets() from public;
grant execute on function public.teacher_flashcard_sets() to authenticated;

-- Danh sách TẤT CẢ bộ thẻ (cho hub học sinh) — chỉ meta, không gửi nội dung thẻ.
-- Mọi người đều đọc được (kể cả chưa đăng nhập) vì security definer + RLS của bảng đã chặn trực tiếp.
create or replace function public.list_flashcard_sets()
returns table(set_id uuid, name text, category text, level text, description text, is_complete boolean, card_count bigint, teacher_name text, created_at timestamptz)
language sql stable security definer
set search_path = public
as $$
  select s.id,
         s.name,
         s.category,
         s.level,
         s.description,
         s.is_complete,
         coalesce(jsonb_array_length(s.cards), 0),
         coalesce(u.name, ''),
         s.created_at
    from public.flashcard_sets s
    left join public.users u on u.id = s.teacher_id
   order by s.created_at desc;
$$;
revoke execute on function public.list_flashcard_sets() from public;
grant execute on function public.list_flashcard_sets() to anon, authenticated;

-- Lấy 1 bộ thẻ đầy đủ (để vào học — flash.html?set=<id>). Mọi người đều đọc được.
create or replace function public.get_flashcard_set(p_set_id uuid)
returns table(set_id uuid, name text, level text, description text, is_complete boolean, cards jsonb, teacher_name text)
language sql stable security definer
set search_path = public
as $$
  select s.id, s.name, s.level, s.description, s.is_complete, s.cards, coalesce(u.name, '')
    from public.flashcard_sets s
    left join public.users u on u.id = s.teacher_id
   where s.id = p_set_id;
$$;
revoke execute on function public.get_flashcard_set(uuid) from public;
grant execute on function public.get_flashcard_set(uuid) to anon, authenticated;

-- Cập nhật 1 bộ thẻ (chỉ giáo viên — flashcard xài chung). Thay meta + thay toàn bộ thẻ.
create or replace function public.update_flashcard_set(
  p_set_id uuid,
  p_name text,
  p_category text,
  p_level text,
  p_description text,
  p_cards jsonb,
  p_is_complete boolean default null
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
begin
  if p_set_id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  if not public.is_teacher() then
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
         is_complete = coalesce(p_is_complete, is_complete),
         cards       = p_cards,
         updated_at  = now()
   where id = p_set_id;
  return jsonb_build_object('ok', true, 'id', p_set_id, 'card_count', jsonb_array_length(p_cards));
end;
$$;
revoke execute on function public.update_flashcard_set(uuid, text, text, text, text, jsonb, boolean) from public;
grant execute on function public.update_flashcard_set(uuid, text, text, text, text, jsonb, boolean) to authenticated;

-- Xoá 1 bộ thẻ (chỉ giáo viên — flashcard xài chung).
create or replace function public.delete_flashcard_set(p_set_id uuid)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
begin
  if p_set_id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  if not public.is_teacher() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  delete from public.flashcard_sets where id = p_set_id;
  return jsonb_build_object('ok', true);
end;
$$;
revoke execute on function public.delete_flashcard_set(uuid) from public;
grant execute on function public.delete_flashcard_set(uuid) to authenticated;