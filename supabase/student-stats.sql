-- ============================================================================
-- student-stats.sql
-- ----------------------------------------------------------------------------
-- Gộp thống kê cá nhân về MỘT nguồn duy nhất: public.test_attempts
-- (cùng nguồn với RPC báo cáo của giáo viên trong teacher-test-reports.sql).
--
-- Mục đích:
--   1. Thay bảng đếm sẵn public.test_stats (hay lệch / về 0) bằng RPC tính
--      trực tiếp từ test_attempts.
--   2. Gỡ toàn bộ cơ chế reset theo chu kỳ (tự động + thủ công trong web admin).
--   3. Gỡ bảng xếp hạng (đã tạm ẩn ở phía giao diện).
--
-- Chạy SAU schema.sql. Có thể chạy lại nhiều lần (idempotent).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Thống kê hiệu suất cá nhân — tính trực tiếp từ test_attempts (toàn thời gian)
-- ---------------------------------------------------------------------------
drop function if exists public.student_performance_stats(text);
create or replace function public.student_performance_stats(p_user_id text)
returns table (
  total_tests bigint,
  total_score numeric,
  avg_score   numeric,
  best_score  numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::bigint,
         coalesce(sum(score), 0)::numeric,
         coalesce(round(avg(score)::numeric, 2), 0)::numeric,
         coalesce(max(score), 0)::numeric
    from public.test_attempts
   where user_id = p_user_id;
$$;

revoke all on function public.student_performance_stats(text) from public, anon;
grant execute on function public.student_performance_stats(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Gỡ cơ chế reset theo chu kỳ (tự động + thủ công)
-- ---------------------------------------------------------------------------
drop function if exists public.admin_bulk_reset_weekly(text, boolean, boolean, text);
drop function if exists public.record_auto_weekly_reset(text);

-- ---------------------------------------------------------------------------
-- 3) Gỡ bảng đếm sẵn test_stats và bảng log weekly_reset
-- ---------------------------------------------------------------------------
drop table if exists public.test_stats cascade;
drop table if exists public.weekly_reset cascade;
