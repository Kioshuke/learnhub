-- ============================================================================
-- fix-users-created-at.sql
-- ----------------------------------------------------------------------------
-- Vá ngày tạo tài khoản (public.users.created_at) cho user đăng nhập Google.
--
-- Bối cảnh:
--   - Cột created_at trước đây nullable và KHÔNG có default.
--   - User Google có thể được tạo bởi finalizeSession (client upsert) mà
--     không kèm created_at -> ô "Tạo lúc" trong admin bị null.
--
-- Cách chạy: dán toàn bộ file vào Supabase SQL Editor và Run (1 lần).
-- ============================================================================

-- 1) Mọi insert mới đều có created_at, kể cả khi client không gửi cột này.
alter table public.users
  alter column created_at set default now();

-- 2) Backfill các dòng đang null bằng mốc tạo tài khoản bên Supabase Auth
--    (với Google, đây chính là lần đăng nhập đầu tiên), fallback last_login/now().
update public.users u
set created_at = coalesce(
  (select a.created_at from auth.users a where a.id::text = u.id),
  u.last_login,
  now()
)
where u.created_at is null;

-- 3) (Tuỳ chọn) updated_at cũng nên có default để không bị null.
alter table public.users
  alter column updated_at set default now();
update public.users
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;
