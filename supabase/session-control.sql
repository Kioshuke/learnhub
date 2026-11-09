-- ============================================================================
-- session-control.sql — TÍN HIỆU "BUỘC ĐĂNG XUẤT TẤT CẢ" (session_control)
-- ----------------------------------------------------------------------------
-- Bảng singleton 1 dòng dùng làm tín hiệu realtime: khi admin bấm nút
-- "Đăng xuất tất cả", cột force_logout_at được ghi = now(); mọi client đang mở
-- web (đăng ký postgres_changes trên bảng này) nhận được thay đổi ngay và
-- tự đăng xuất (hiện thông báo + đếm ngược 5s).
-- Không dùng cho maintenance (bảng maintenance_settings riêng).
-- Idempotent: chạy lại nhiều lần an toàn.
-- ============================================================================

create table if not exists public.session_control (
  id              boolean primary key default true check (id),
  force_logout_at timestamptz,
  updated_by      text
);

alter table public.session_control enable row level security;

-- Mọi user đã đăng nhập cần ĐỌC được để realtime phát thay đổi cho họ.
drop policy if exists session_control_select on public.session_control;
create policy session_control_select on public.session_control
  for select to authenticated using (true);

-- Chỉ admin được ghi tín hiệu.
drop policy if exists session_control_write_admin on public.session_control;
create policy session_control_write_admin on public.session_control
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Bật realtime cho bảng (bỏ qua nếu đã bật).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'session_control'
  ) then
    alter publication supabase_realtime add table public.session_control;
  end if;
end $$;

-- Đảm bảo luôn có sẵn dòng singleton.
insert into public.session_control (id) values (true) on conflict (id) do nothing;
