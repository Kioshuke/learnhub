-- RPC báo cáo lịch sử làm bài cho khu vực giáo viên.
-- Hiển thị mọi tài khoản trong users, không lọc theo role, lớp hoặc giáo viên.

drop function if exists public.teacher_report_students();
create or replace function public.teacher_report_students()
returns table (
  user_id text,
  user_name text,
  user_email text,
  user_photo text,
  attempt_count bigint,
  latest_attempt_at timestamptz,
  average_score numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_teacher() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select u.id,
         coalesce(nullif(btrim(u.name), ''), nullif(btrim(u.email), ''), 'Học sinh'),
         coalesce(u.email, ''),
         coalesce(u.photo, ''),
         count(a.id)::bigint,
         max(a.created_at),
         coalesce(round(avg(a.score)::numeric, 2), 0)
    from public.users u
    left join public.test_attempts a on a.user_id = u.id
   group by u.id, u.name, u.email, u.photo
   order by max(a.created_at) desc nulls last, coalesce(nullif(btrim(u.name), ''), u.id);
end;
$$;

revoke all on function public.teacher_report_students() from public, anon;
grant execute on function public.teacher_report_students() to authenticated;

create or replace function public.teacher_report_student_attempts(
  p_user_id text,
  p_limit int default 20,
  p_offset int default 0
)
returns table (
  id uuid,
  test_id text,
  subject text,
  test_name text,
  score double precision,
  raw_score double precision,
  max_score int,
  correct_count int,
  total_questions int,
  duration_ms bigint,
  auto_submitted boolean,
  created_at timestamptz,
  show_score text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_teacher() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_user_id is null or not exists (select 1 from public.users u where u.id = p_user_id) then
    return;
  end if;

  return query
  select a.id, a.test_id, a.subject, a.test_name, a.score, a.raw_score,
         a.max_score, a.correct_count, a.total_questions, a.duration_ms,
         a.auto_submitted, a.created_at,
         coalesce(a.paper #>> '{meta,showScore}', 'always')
    from public.test_attempts a
   where a.user_id = p_user_id
   order by a.created_at desc, a.id asc
   limit greatest(1, least(coalesce(p_limit, 20), 100))
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

revoke all on function public.teacher_report_student_attempts(text, int, int) from public, anon;
grant execute on function public.teacher_report_student_attempts(text, int, int) to authenticated;

create or replace function public.teacher_report_attempt_detail(
  p_attempt_id uuid,
  p_user_id text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_teacher() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_attempt_id is null or p_user_id is null then
    return null;
  end if;

  select jsonb_build_object(
           'attempt', to_jsonb(a),
           'student_name', coalesce(nullif(btrim(u.name), ''), nullif(btrim(u.email), ''), 'Học sinh')
         )
    into v_result
    from public.test_attempts a
    join public.users u on u.id = a.user_id
   where a.id = p_attempt_id
     and a.user_id = p_user_id;
  return v_result;
end;
$$;

revoke all on function public.teacher_report_attempt_detail(uuid, text) from public, anon;
grant execute on function public.teacher_report_attempt_detail(uuid, text) to authenticated;
