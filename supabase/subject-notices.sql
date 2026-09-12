-- ============================================================================
-- subject-notices.sql — Thông báo môn học (Phòng Học).
-- ----------------------------------------------------------------------------
-- Hiển thị đầu tab mỗi môn trong element/phong-hoc.html.
-- Dữ liệu nằm trong bảng subject_notices (1 dòng, jsonb `notices` keyed theo
-- subject id — pattern giống schedule_settings):
--   { "ly": {"icon":"fa-bell","html":"...","enabled":true}, ... }
-- Giáo viên/admin ghi qua RPC teacher_save/remove_subject_notice (security
-- definer, tự kiểm tra is_teacher); học sinh đọc qua RPC load_subject_notices.
-- Idempotent: chạy lại nhiều lần an toàn (create or replace).
-- ============================================================================

-- 1) Giáo viên cập nhật thông báo của 1 môn
create or replace function public.teacher_save_subject_notice(
  p_subject text default '',
  p_icon    text default 'fa-bell',
  p_html    text default '',
  p_enabled boolean default true
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_notices jsonb;
  v_by      text;
begin
  if not public.is_teacher() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if btrim(coalesce(p_subject, '')) = '' then
    return jsonb_build_object('ok', false, 'error', 'empty_subject');
  end if;

  select coalesce(n.notices, '{}'::jsonb) into v_notices
    from public.subject_notices n where n.id = true;

  v_notices := coalesce(v_notices, '{}'::jsonb)
    || jsonb_build_object(
         btrim(p_subject),
         jsonb_build_object(
           'icon',    coalesce(nullif(btrim(p_icon), ''), 'fa-bell'),
           'html',    btrim(coalesce(p_html, '')),
           'enabled', coalesce(p_enabled, true)
         )
       );

  select coalesce(nullif(btrim(email), ''), '') into v_by
    from public.users where id = auth.uid()::text;
  if v_by = '' then
    v_by := coalesce(auth.jwt()->>'email', auth.uid()::text);
  end if;

  insert into public.subject_notices (id, notices, updated_at, updated_by)
  values (true, v_notices, now(), v_by)
  on conflict (id) do update
    set notices    = v_notices,
        updated_at = now(),
        updated_by = v_by;

  return jsonb_build_object('ok', true);
end;
$$;
revoke execute on function public.teacher_save_subject_notice(text, text, text, boolean) from public;
grant execute on function public.teacher_save_subject_notice(text, text, text, boolean) to authenticated;

-- 2) Giáo viên xoá thông báo của 1 môn (trở về mặc định tĩnh ban đầu)
create or replace function public.teacher_remove_subject_notice(
  p_subject text default ''
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_notices jsonb;
  v_by      text;
begin
  if not public.is_teacher() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if btrim(coalesce(p_subject, '')) = '' then
    return jsonb_build_object('ok', false, 'error', 'empty_subject');
  end if;

  select coalesce(n.notices, '{}'::jsonb) into v_notices
    from public.subject_notices n where n.id = true;
  v_notices := coalesce(v_notices, '{}'::jsonb) - btrim(p_subject);

  select coalesce(nullif(btrim(email), ''), '') into v_by
    from public.users where id = auth.uid()::text;
  if v_by = '' then
    v_by := coalesce(auth.jwt()->>'email', auth.uid()::text);
  end if;

  insert into public.subject_notices (id, notices, updated_at, updated_by)
  values (true, v_notices, now(), v_by)
  on conflict (id) do update
    set notices    = v_notices,
        updated_at = now(),
        updated_by = v_by;

  return jsonb_build_object('ok', true);
end;
$$;
revoke execute on function public.teacher_remove_subject_notice(text) from public;
grant execute on function public.teacher_remove_subject_notice(text) to authenticated;

-- 3) Đọc toàn bộ thông báo (phòng học — anon + authenticated)
create or replace function public.load_subject_notices()
returns table (notices jsonb, updated_at timestamptz, updated_by text)
language sql stable security definer
set search_path = public
as $$
  select n.notices, n.updated_at, n.updated_by
    from public.subject_notices n
   where n.id = true;
$$;
revoke execute on function public.load_subject_notices() from public;
grant execute on function public.load_subject_notices() to anon, authenticated;