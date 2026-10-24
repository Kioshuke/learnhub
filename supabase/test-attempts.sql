-- ============================================================================
-- test-attempts.sql — LỊCH SỬ LÀM BÀI (test_attempts)
-- ----------------------------------------------------------------------------
-- BẢNG MỚI, chạy độc lập (giống test-sets.sql / subject-notices.sql),
-- KHÔNG sửa schema.sql. Mỗi dòng = 1 LẦN NỘP BÀI của 1 học sinh.
--
--   user_id         → id tài khoản nộp (khớp users.id, dạng text như test_stats)
--   test_id         → mã đề (giá trị TEST_DE, vd "t:<uuid>")
--   subject/name    → môn học + tên đề (chép lại để xem lịch sử khi đề đổi/xóa)
--   score           → điểm HS thấy, thang 10 (đã chuẩn hoá)
--   raw_score       → điểm thô theo thang tối đa của đề
--   max_score       → điểm tối đa của đề lúc làm
--   correct_count   → số câu đúng
--   total_questions → tổng số câu
--   duration_ms     → thời gian làm bài (mili-giây)
--   auto_submitted  → true nếu do hết giờ tự nộp
--   paper           → SNAPSHOT toàn bộ đề + bài làm (jsonb, xem cấu trúc bên dưới)
--   created_at      → thời điểm nộp
--
-- paper = {
--   "meta":   { "testId","subject","name","maxScore","showAnswers" },
--   "result": { "score","rawScore","correctCount","totalQuestions",
--               "durationMs","autoSubmitted" },
--   "sections": [ { "sectionTitle","type","passage","questions":[
--       { "type","text","answers","correct","chosen","isCorrect" } ] } ]
-- }
--
-- Quyền (RLS): GĐ1 chỉ HỌC SINH đọc/ghi bài của CHÍNH MÌNH; admin đọc toàn bộ.
-- Giáo viên đọc bài của HS để sau (xem khối cuối file — chưa bật).
-- Idempotent: chạy lại nhiều lần an toàn.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ============ 1. BẢNG ============
create table if not exists public.test_attempts (
  id              uuid primary key default gen_random_uuid(),
  user_id         text not null,
  test_id         text not null default '',
  subject         text not null default '',
  test_name       text not null default '',
  score           double precision not null default 0,
  raw_score       double precision,
  max_score       int,
  correct_count   int,
  total_questions int,
  duration_ms     bigint,
  auto_submitted  boolean not null default false,
  paper           jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

-- Bổ sung cột nếu chạy trên DB đã có bảng (idempotent).
alter table public.test_attempts add column if not exists test_id         text not null default '';
alter table public.test_attempts add column if not exists subject         text not null default '';
alter table public.test_attempts add column if not exists test_name       text not null default '';
alter table public.test_attempts add column if not exists score           double precision not null default 0;
alter table public.test_attempts add column if not exists raw_score       double precision;
alter table public.test_attempts add column if not exists max_score       int;
alter table public.test_attempts add column if not exists correct_count   int;
alter table public.test_attempts add column if not exists total_questions int;
alter table public.test_attempts add column if not exists duration_ms     bigint;
alter table public.test_attempts add column if not exists auto_submitted  boolean not null default false;
alter table public.test_attempts add column if not exists paper           jsonb not null default '{}'::jsonb;

-- ============ 2. INDEX ============
-- Lịch sử theo tài khoản, mới nhất trước (đúng truy vấn trang Hồ sơ).
create index if not exists test_attempts_user_idx on public.test_attempts (user_id, created_at desc);
-- Tra cứu theo đề (dùng khi mở cho giáo viên sau này).
create index if not exists test_attempts_test_idx on public.test_attempts (test_id);

-- ============ 3. RLS ============
alter table public.test_attempts enable row level security;

-- Học sinh: chỉ đọc bài của chính mình.
drop policy if exists test_attempts_select_own on public.test_attempts;
create policy test_attempts_select_own on public.test_attempts
  for select to authenticated using (user_id = auth.uid()::text);

-- Học sinh: chỉ ghi bài với user_id = chính mình (không giả mạo người khác).
drop policy if exists test_attempts_insert_own on public.test_attempts;
create policy test_attempts_insert_own on public.test_attempts
  for insert to authenticated with check (user_id = auth.uid()::text);

-- Admin: toàn quyền (quản trị / dọn dữ liệu).
drop policy if exists test_attempts_admin on public.test_attempts;
create policy test_attempts_admin on public.test_attempts
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============ 4. GRANT ============
grant select, insert on public.test_attempts to authenticated;

-- ============ 5. (GĐ SAU) Cho GIÁO VIÊN đọc bài của học sinh ============
-- Chưa bật ở giai đoạn này. Khi làm phần giáo viên thì bỏ chú thích 3 dòng dưới:
-- drop policy if exists test_attempts_select_teacher on public.test_attempts;
-- create policy test_attempts_select_teacher on public.test_attempts
--   for select to authenticated using (public.is_teacher());
