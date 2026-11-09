-- ============================================================================
-- LEADERBOARD THEO THÁNG + ĐẾM THỜI GIAN ONLINE THEO THÁNG
-- ----------------------------------------------------------------------------
-- - Chu kỳ: tháng dương lịch, mốc reset 00:00 ngày 1 đầu tháng (giờ VN, UTC+7).
-- - KHÔNG tạo bảng mới: dùng lại cột public.users.online_week_key
--   (nay lưu khoá tháng dạng 'YYYY-MM', ví dụ '2026-11').
-- - Điểm xếp hạng lấy trực tiếp từ public.test_attempts (cùng nguồn với báo cáo
--   thống kê cá nhân) → tự "reset" mỗi tháng theo bộ lọc created_at.
-- - Chạy lại nhiều lần được (idempotent).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Helper: khoá kỳ + mốc đầu kỳ theo giờ Việt Nam
-- ---------------------------------------------------------------------------
create or replace function public.current_period_key()
returns text
language sql stable
as $$
  select to_char((now() at time zone 'Asia/Ho_Chi_Minh'), 'YYYY-MM');
$$;

create or replace function public.current_period_start_ms()
returns bigint
language sql stable
as $$
  select (extract(epoch from (
           date_trunc('month', (now() at time zone 'Asia/Ho_Chi_Minh'))
             at time zone 'Asia/Ho_Chi_Minh'
         )) * 1000)::bigint;
$$;

revoke execute on function public.current_period_key() from public, anon;
revoke execute on function public.current_period_start_ms() from public, anon;
grant execute on function public.current_period_key() to authenticated;
grant execute on function public.current_period_start_ms() to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Online timer: tự reset khi sang tháng mới (giữ nguyên cơ chế atomic cũ)
-- ---------------------------------------------------------------------------
create or replace function public.users_begin_online(p_uid text)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  now_ms     bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  v_key      text   := public.current_period_key();
  v_start_ms bigint := public.current_period_start_ms();
  r record;
begin
  if auth.uid()::text <> p_uid and not public.is_admin() then
    raise exception 'Forbidden';
  end if;

  select online_start_time, last_active, online_week_key into r
    from public.users where id = p_uid for update;

  if r.online_week_key is distinct from v_key then
    -- Sang tháng mới: reset bộ đếm về 0; phiên mở mới bắt đầu đếm từ bây giờ (tránh cộng giờ ảo).
    update public.users
      set online = true,
          last_active = now_ms,
          online_start_time = now_ms,
          online_timer = 0,
          online_week_key = v_key
      where id = p_uid and not coalesce(disabled, false);
  elsif r.online_start_time is null or r.online_start_time = 0 then
    -- Phiên mới: bắt đầu đếm từ bây giờ
    update public.users
      set online = true, last_active = now_ms, online_start_time = now_ms, online_week_key = v_key
      where id = p_uid and not coalesce(disabled, false);
  elsif r.last_active is not null and (now_ms - r.last_active) < 900000 then
    -- Phiên vẫn liên tục (heartbeat gần đây): giữ start, chỉ refresh last_active/online
    update public.users
      set online = true, last_active = now_ms
      where id = p_uid and not coalesce(disabled, false);
  else
    -- Phiên cũ chết (crash/tắt máy): chỉ cộng phần online thật (start -> last_active),
    -- KHÔNG cộng khoảng offline; reset start để bắt đầu phiên mới.
    update public.users
      set online = true,
          last_active = now_ms,
          online_start_time = now_ms,
          online_week_key = v_key,
          online_timer = online_timer + case
            when r.last_active is not null and r.online_start_time > 0
              then greatest(0, (least(r.last_active, now_ms) - r.online_start_time)) / 1000
            else 0 end
      where id = p_uid and not coalesce(disabled, false);
  end if;
end;
$$;

create or replace function public.users_finalize_online(p_uid text)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  now_ms     bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  v_key      text   := public.current_period_key();
  v_start_ms bigint := public.current_period_start_ms();
  r record;
begin
  if auth.uid()::text <> p_uid and not public.is_admin() then
    raise exception 'Forbidden';
  end if;

  select online_start_time, online_week_key, last_active into r
    from public.users where id = p_uid for update;

  update public.users
    set online = false,
        last_active = now_ms,
        online_start_time = 0,
        online_week_key = v_key,
        online_timer = case
          when r.online_week_key is distinct from v_key then
            greatest(0, (least(coalesce(r.last_active, now_ms), now_ms) - v_start_ms)) / 1000
          when coalesce(r.online_start_time, 0) > 0 then
            online_timer + greatest(0, (now_ms - r.online_start_time)) / 1000
          else online_timer end
    where id = p_uid;
end;
$$;

create or replace function public.users_cleanup_stale_online(p_stale_ms bigint default 120000)
returns integer
language plpgsql security definer
set search_path = public
as $$
declare
  now_ms     bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  v_key      text   := public.current_period_key();
  v_start_ms bigint := public.current_period_start_ms();
  n integer;
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;

  update public.users
    set online = false,
        online_start_time = 0,
        online_week_key = v_key,
        online_timer = case
          when online_week_key is distinct from v_key then
            greatest(0, (least(coalesce(last_active, now_ms), now_ms) - v_start_ms)) / 1000
          when coalesce(online_start_time, 0) > 0 and last_active is not null then
            online_timer + greatest(0, (least(last_active, now_ms) - online_start_time)) / 1000
          else online_timer end
    where online = true
      and (last_active is null or (now_ms - last_active) > p_stale_ms);

  get diagnostics n = row_count;
  return n;
end;
$$;

-- Heartbeat nhẹ: chỉ cập nhật last_active + online, KHÔNG đếm thời gian.
create or replace function public.users_heartbeat(p_uid text)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  now_ms     bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  v_key      text   := public.current_period_key();
  v_start_ms bigint := public.current_period_start_ms();
begin
  if auth.uid()::text <> p_uid and not public.is_admin() then
    raise exception 'Forbidden';
  end if;

  update public.users
    set last_active = now_ms,
        online = true,
        online_week_key = v_key,
        online_timer = case when online_week_key is distinct from v_key then 0 else online_timer end,
        online_start_time = case when online_week_key is distinct from v_key then v_start_ms else online_start_time end
    where id = p_uid
      and not coalesce(disabled, false)
      and online = true;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3) Bảng xếp hạng điểm theo tháng (nguồn: test_attempts)
-- ---------------------------------------------------------------------------
-- Đảm bảo cột thời gian tồn tại (bảng có thể được tạo từ schema cũ thiếu cột).
alter table public.watched_videos add column if not exists watched_at timestamptz not null default now();
alter table public.test_attempts add column if not exists created_at timestamptz not null default now();

drop function if exists public.leaderboard_scores(integer);
create or replace function public.leaderboard_scores(p_limit integer default 50)
returns table (
  user_id     text,
  name        text,
  email       text,
  photo       text,
  total_score numeric,
  total_tests bigint,
  avg_score   numeric,
  best_score  numeric
)
language sql stable security definer
set search_path = public
as $$
  select u.id,
         u.name,
         u.email,
         u.photo,
         coalesce(sum(a.score), 0)::numeric                          as total_score,
         count(*)::bigint                                            as total_tests,
         coalesce(avg(a.score), 0)::numeric                          as avg_score,
         coalesce(max(a.score), 0)::numeric                          as best_score
    from public.test_attempts a
    join public.users u on u.id = a.user_id
   where not coalesce(u.disabled, false)
   group by u.id, u.name, u.email, u.photo
  having count(*) > 0
   order by avg_score desc, total_tests desc
   limit p_limit;
$$;

revoke all on function public.leaderboard_scores(integer) from public, anon;
grant execute on function public.leaderboard_scores(integer) to authenticated;
