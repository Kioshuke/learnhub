-- ============================================================================
-- create_schedule_settings.sql
-- ----------------------------------------------------------------------------
-- Bảng lưu "Lịch học & Lịch thi" hiển thị trên trang Phòng Học (phong-hoc.html).
-- Admin chỉnh online từ Admin Dashboard -> tab "Lịch học & thi".
--
-- Cách chạy: mở Supabase Dashboard -> SQL Editor -> dán toàn bộ file -> Run.
-- ============================================================================

create table if not exists schedule_settings (
  id boolean primary key default true,
  active boolean not null default true,
  events jsonb not null default '[]'::jsonb,
  updated_at timestamptz,
  updated_by text,
  constraint schedule_settings_single_row check (id)
);

alter table schedule_settings enable row level security;

-- Ai cũng đọc được (phong-hoc.html hiển thị lịch, không cần đăng nhập).
create policy "schedule_settings_select_policy"
  on schedule_settings for select
  using (true);

-- Chỉ user đã đăng nhập mới ghi được (Admin Dashboard).
create policy "schedule_settings_insert_policy"
  on schedule_settings for insert
  to authenticated
  with check (true);

create policy "schedule_settings_update_policy"
  on schedule_settings for update
  to authenticated
  using (true)
  with check (true);

-- Bật realtime để phong-hoc.html tự cập nhật ngay khi admin lưu.
-- (Nếu báo lỗi "already a member" nghĩa là đã thêm trước đó — bỏ qua được.)
alter publication supabase_realtime add table schedule_settings;
