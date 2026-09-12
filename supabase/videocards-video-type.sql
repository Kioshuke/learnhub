-- ============================================================================
-- videocards-video-type.sql — Phân loại từng dòng trong video_cards là
-- VIDEO hay TÀI LIỆU (link Drive thư mục / doc / pdf...).
-- ----------------------------------------------------------------------------
-- * Chạy SAU videocards-v2.sql.
-- * Chạy lại nhiều lần được (idempotent).
-- * Trang giáo viên + phòng học sẽ đếm và hiển thị tách riêng:
--   video đếm là "video", tài liệu hiện icon file + "N tài liệu".
-- ============================================================================

-- 1) Cột mới
alter table public.video_cards add column if not exists video_type text not null default 'video';
update public.video_cards set video_type = 'video' where btrim(coalesce(video_type, '')) = '';

-- 2) Dữ liệu cũ: link Drive THƯ MỤC -> tài liệu (vd "Tài liệu Word/Excel/PowerPoint")
update public.video_cards
   set video_type = 'document'
 where btrim(coalesce(video_url, '')) like '%/folders/%';

-- 3) Upsert video card (thêm p_video_type)
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
  p_video_type text default 'video',
  p_sort_order int default 0,
  p_is_complete boolean default false
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_type text := lower(btrim(coalesce(p_video_type, 'video')));
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
  if v_type not in ('video', 'document') then
    v_type := 'video';
  end if;
  if p_id is null then
    insert into public.video_cards (teacher_id, subject, card_title, card_description, group_name, title, video_url, video_type, is_complete, sort_order)
    values (
      auth.uid()::text,
      btrim(p_subject),
      btrim(p_card_title),
      btrim(coalesce(p_card_description, '')),
      btrim(coalesce(p_group_name, '')),
      btrim(p_title),
      btrim(p_video_url),
      v_type,
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
         video_type  = v_type,
         is_complete = coalesce(p_is_complete, is_complete),
         sort_order  = coalesce(p_sort_order, sort_order),
         updated_at  = now()
   where id = p_id
     and (teacher_id = auth.uid()::text or public.is_teacher());
  return jsonb_build_object('ok', true, 'id', p_id);
end;
$$;
revoke execute on function public.teacher_upsert_video_card(uuid, text, text, text, text, text, text, text, int, boolean) from public;
grant execute on function public.teacher_upsert_video_card(uuid, text, text, text, text, text, text, text, int, boolean) to authenticated;

-- 4) Danh sách cho trang giáo viên (kèm video_type)
drop function if exists public.teacher_list_video_cards();
create or replace function public.teacher_list_video_cards()
returns table (
  card_id uuid, subject text, card_title text, card_description text, group_name text, title text,
  video_url text, video_type text, sort_order int, is_complete boolean, created_at timestamptz
)
language sql security definer
set search_path = public
as $$
  select id, subject, btrim(coalesce(card_title, '')), btrim(coalesce(card_description, '')), btrim(coalesce(group_name, '')),
         btrim(coalesce(title, '')), btrim(coalesce(video_url, '')), lower(btrim(coalesce(video_type, 'video'))),
         sort_order, is_complete, created_at
    from public.video_cards
   order by subject, card_title, group_name, sort_order, created_at;
$$;
grant execute on function public.teacher_list_video_cards() to authenticated;

-- 5) Video của 1 môn cho học sinh (kèm video_type)
drop function if exists public.list_video_cards_by_subject(text);
create or replace function public.list_video_cards_by_subject(p_subject text)
returns table (
  card_id uuid, card_title text, card_description text, group_name text, title text,
  video_url text, video_type text, sort_order int, is_complete boolean, created_at timestamptz
)
language sql security definer
set search_path = public
as $$
  select id, btrim(coalesce(card_title, '')), btrim(coalesce(card_description, '')), btrim(coalesce(group_name, '')),
         btrim(coalesce(title, '')), btrim(coalesce(video_url, '')), lower(btrim(coalesce(video_type, 'video'))),
         sort_order, is_complete, created_at
    from public.video_cards
   where subject = btrim(coalesce(p_subject, ''))
   order by card_title, group_name, sort_order, created_at;
$$;
revoke execute on function public.list_video_cards_by_subject(text) from public;
grant execute on function public.list_video_cards_by_subject(text) to anon, authenticated;

-- 6) Kiểm tra nhanh sau khi chạy
select subject, card_title, video_type, count(*) as so_dong
  from public.video_cards
 group by subject, card_title, video_type
 order by subject, card_title, video_type;