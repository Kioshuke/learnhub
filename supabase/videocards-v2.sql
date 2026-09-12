-- ============================================================================
-- videocards-v2.sql — Video Card giáo viên: BỔ SUNG khái niệm "card/khóa".
-- ----------------------------------------------------------------------------
-- NÂNG CẤP so với videocards.sql (đã chạy trước đó):
--   * Thêm cột card_title = TÊN CARD/KHÓA (vd: "Tổng ôn tiếng anh").
--     Học sinh thấy 1 card trên tab môn; bên trong card mục lục chia theo
--     Chủ đề (group_name) thành các dropdown.
--   * Thêm cột card_description = MÔ TẢ CARD (hiển thị trên card cho học sinh).
--   * teacher_upsert_video_card đổi signature: thêm p_card_title, p_card_description.
--   * BỎ cột description (mô tả từng video) - không còn dùng nữa.
-- Chạy LẠI nhiều lần được (idempotent).
-- ============================================================================

-- 1) Cột mới (idempotent)
alter table public.video_cards add column if not exists card_title text;
alter table public.video_cards drop column if exists description;
alter table public.video_cards add column if not exists card_description text;
update public.video_cards set card_title = '' where card_title is null;

-- 2) Upsert video card (thêm p_card_title, p_card_description; bỏ p_description)
drop function if exists public.teacher_upsert_video_card(uuid, text, text, text, text, text, int, boolean);
drop function if exists public.teacher_upsert_video_card(uuid, text, text, text, text, text, text, int, boolean);
drop function if exists public.teacher_upsert_video_card(uuid, text, text, text, text, text, text, text, int, boolean);
drop function if exists public.teacher_upsert_video_card(uuid, text, text, text, text, text, text, text, text, int, boolean);
create or replace function public.teacher_upsert_video_card(
  p_id uuid default null,
  p_subject text default '',
  p_card_title text default '',
  p_card_description text default '',
  p_group_name text default '',
  p_title text default '',
  p_video_url text default '',
  p_sort_order int default 0,
  p_is_complete boolean default false
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_teacher() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if btrim(coalesce(p_subject, '')) = '' then
    return jsonb_build_object('ok', false, 'error', 'empty_subject');
  end if;
  if btrim(coalesce(p_card_title, '')) = '' then
    return jsonb_build_object('ok', false, 'error', 'empty_card_title');
  end if;
  if btrim(coalesce(p_title, '')) = '' then
    return jsonb_build_object('ok', false, 'error', 'empty_title');
  end if;
  if btrim(coalesce(p_video_url, '')) = '' then
    return jsonb_build_object('ok', false, 'error', 'empty_video_url');
  end if;
  if p_id is null then
    insert into public.video_cards (teacher_id, subject, card_title, card_description, group_name, title, video_url, is_complete, sort_order)
    values (
      auth.uid()::text,
      btrim(p_subject),
      btrim(p_card_title),
      btrim(coalesce(p_card_description, '')),
      btrim(coalesce(p_group_name, '')),
      btrim(p_title),
      btrim(p_video_url),
      coalesce(p_is_complete, false),
      coalesce(p_sort_order, 0)
    )
    returning id into p_id;
    return jsonb_build_object('ok', true, 'id', p_id);
  end if;
  update public.video_cards
     set subject     = btrim(p_subject),
         card_title  = btrim(p_card_title),
         card_description = btrim(coalesce(p_card_description, '')),
         group_name  = btrim(coalesce(p_group_name, '')),
         title       = btrim(p_title),
         video_url   = btrim(p_video_url),
         is_complete = coalesce(p_is_complete, is_complete),
         sort_order  = coalesce(p_sort_order, sort_order),
         updated_at  = now()
   where id = p_id
     and (teacher_id = auth.uid()::text or public.is_teacher());
  return jsonb_build_object('ok', true, 'id', p_id);
end;
$$;
revoke execute on function public.teacher_upsert_video_card(uuid, text, text, text, text, text, text, int, boolean) from public;
grant execute on function public.teacher_upsert_video_card(uuid, text, text, text, text, text, text, int, boolean) to authenticated;

-- 3) Xoá video card
create or replace function public.teacher_delete_video_card(p_id uuid)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_teacher() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  delete from public.video_cards
   where id = p_id
     and (teacher_id = auth.uid()::text or public.is_teacher());
  return jsonb_build_object('ok', true);
end;
$$;
revoke execute on function public.teacher_delete_video_card(uuid) from public;
grant execute on function public.teacher_delete_video_card(uuid) to authenticated;

-- 4) Danh sách cho trang giáo viên (kèm card_title, card_description)
drop function if exists public.teacher_list_video_cards();
create or replace function public.teacher_list_video_cards()
returns table (
  card_id uuid, subject text, card_title text, card_description text, group_name text, title text,
  video_url text, sort_order int, is_complete boolean, created_at timestamptz
)
language sql security definer
set search_path = public
as $$
  select id, subject, btrim(coalesce(card_title, '')), btrim(coalesce(card_description, '')), btrim(coalesce(group_name, '')),
         btrim(coalesce(title, '')), btrim(coalesce(video_url, '')),
         sort_order, is_complete, created_at
    from public.video_cards
   order by subject, card_title, group_name, sort_order, created_at;
$$;
grant execute on function public.teacher_list_video_cards() to authenticated;

-- 5) Môn đang có video (cho học sinh)
drop function if exists public.list_video_subjects();
create or replace function public.list_video_subjects()
returns table (subject text, card_count bigint)
language sql security definer
set search_path = public
as $$
  select subject, count(*)::bigint as card_count
    from public.video_cards
   where btrim(subject) <> ''
   group by subject
   order by subject;
$$;
revoke execute on function public.list_video_subjects() from public;
grant execute on function public.list_video_subjects() to anon, authenticated;

-- 6) Video của 1 môn cho học sinh
drop function if exists public.list_video_cards_by_subject(text);
create or replace function public.list_video_cards_by_subject(p_subject text)
returns table (
  card_id uuid, card_title text, card_description text, group_name text, title text,
  video_url text, sort_order int, is_complete boolean, created_at timestamptz
)
language sql security definer
set search_path = public
as $$
  select id, btrim(coalesce(card_title, '')), btrim(coalesce(card_description, '')), btrim(coalesce(group_name, '')),
         btrim(coalesce(title, '')), btrim(coalesce(video_url, '')),
         sort_order, is_complete, created_at
    from public.video_cards
   where subject = btrim(coalesce(p_subject, ''))
   order by card_title, group_name, sort_order, created_at;
$$;
revoke execute on function public.list_video_cards_by_subject(text) from public;
grant execute on function public.list_video_cards_by_subject(text) to anon, authenticated;

-- 7) Index hỗ trợ truy vấn
create index if not exists video_cards_subject_idx on public.video_cards(subject);
create index if not exists video_cards_teacher_idx on public.video_cards(teacher_id);