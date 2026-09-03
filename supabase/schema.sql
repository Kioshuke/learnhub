-- ============================================================================
-- LearnHub Supabase Schema (schema.sql)
-- ----------------------------------------------------------------------------
-- Cách dùng: dán toàn bộ file này vào Supabase Dashboard -> SQL Editor -> Run
-- Idempotent: có thể chạy lại nhiều lần an toàn (dùng IF NOT EXISTS / OR REPLACE).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ============================== CLEANUP LEGACY (Firebase→Supabase) ==============================
-- Gỡ các object cũ của cơ chế chuyển dữ liệu Firebase (đã bỏ). Idempotent:
-- nếu chưa từng tồn tại thì `if exists` bỏ qua, không báo lỗi.
drop function if exists public.claim_legacy_data(text);
drop table if exists public.legacy_uid_map;

-- ============================== TABLES ==============================

-- users.id là TEXT (không phải uuid) vì dữ liệu import từ Firebase có id dạng text.
-- User mới đăng ký qua Supabase Auth sẽ có id = auth uid (text), tạo trực tiếp trên Supabase.
create table if not exists public.users (
  id               text primary key,
  email            text not null,
  name             text,
  photo            text,
  role             text not null default 'Thành viên',
  bio              text,
  phone            text,
  birthdate        text,
  gender           text,
  school           text,
  disabled         boolean not null default false,
  online           boolean not null default false,
  last_active      bigint,
  last_login       timestamptz,
  online_start_time bigint,
  online_timer     bigint not null default 0,
  online_week_key  text,
  created_at       timestamptz,
  updated_at       timestamptz
);

create unique index if not exists users_email_lower_idx on public.users (lower(email));

create table if not exists public.access_list (
  email      text primary key,
  enabled    boolean not null default true,
  source     text,
  added_at   timestamptz,
  updated_at timestamptz
);

create table if not exists public.test_stats (
  user_id     text primary key,
  total_tests int not null default 0,
  total_score double precision not null default 0,
  best_score  double precision not null default 0,
  total_videos int not null default 0,
  week_key    text,
  created_at  timestamptz,
  last_played timestamptz,
  updated_at  timestamptz
);

alter table public.test_stats add column if not exists total_videos int not null default 0;

-- Registration toggle: admin bật/tắt đăng ký, whitelist vẫn bypass được.
create table if not exists public.registration_settings (
  id         boolean primary key default true check (id),
  enabled    boolean not null default true,
  message    text not null default 'Đăng ký hiện đang đóng. Vui lòng liên hệ admin.',
  updated_at timestamptz,
  updated_by text
);

create table if not exists public.maintenance_settings (
  id         boolean primary key default true check (id),
  enabled    boolean not null default false,
  message    text not null default '',
  updated_at timestamptz,
  updated_by text
);

create table if not exists public.weekly_reset (
  id            boolean primary key default true check (id),
  last_reset_at timestamptz,
  last_reset_by text,
  week_key      text,
  reset_count   int not null default 0,
  users_reset   int,
  reset_targets text
);

create table if not exists public.broadcast_current (
  id           boolean primary key default true check (id),
  broadcast_id text,
  title        text,
  message      text,
  type         text,
  duration_ms  int,
  target_mode  text,
  target_email text,
  active       boolean not null default false,
  sender       text,
  updated_at   timestamptz
);

create table if not exists public.broadcast_welcome (
  id         boolean primary key default true check (id),
  title      text,
  message    text,
  active     boolean not null default false,
  show_mode  text,
  updated_at timestamptz,
  updated_by text
);

-- Hộp thư: lưu永久 nhiều tin nhắn, tách biệt khỏi broadcast realtime.
create table if not exists public.mailbox_messages (
  id         uuid primary key default gen_random_uuid(),
  title      text not null default '',
  message    text not null default '',
  sender     text not null default 'admin',
  target_mode text not null default 'all',
  target_email text,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists mailbox_messages_created_at_idx on public.mailbox_messages (created_at desc);

-- Cấu hình dòng chữ chạy trên cùng web chính (nội dung + tốc độ).
create table if not exists public.ticker_settings (
  id            boolean primary key default true check (id),
  text          text not null default '',
  speed_seconds int not null default 18,
  updated_at    timestamptz,
  updated_by    text
);

create table if not exists public.forum_posts (
  id         uuid primary key default gen_random_uuid(),
  legacy_id  text,
  user_id    text,
  user_name  text,
  role       text not null default 'member',
  text       text not null,
  image_url  text,
  parent_id  uuid,
  time       bigint,
  pinned     boolean not null default false,
  pin_time   bigint,
  is_edited  boolean not null default false,
  edit_time  bigint,
  reactions  jsonb not null default '{}'::jsonb,
  likes      jsonb not null default '{}'::jsonb,
  dislikes   jsonb not null default '{}'::jsonb
);

alter table public.forum_posts add column if not exists image_url text;
alter table public.forum_posts add column if not exists pinned boolean not null default false;
alter table public.forum_posts add column if not exists pin_time bigint;
alter table public.forum_posts add column if not exists is_edited boolean not null default false;
alter table public.forum_posts add column if not exists edit_time bigint;
alter table public.forum_posts add column if not exists reactions jsonb not null default '{}'::jsonb;
alter table public.forum_posts add column if not exists likes jsonb not null default '{}'::jsonb;
alter table public.forum_posts add column if not exists dislikes jsonb not null default '{}'::jsonb;

create index if not exists forum_posts_user_id_idx on public.forum_posts (user_id);
create index if not exists forum_posts_time_idx on public.forum_posts (time desc);

create table if not exists public.forum_events (
  id            bigserial primary key,
  type          text,
  reaction_type text,
  time          bigint,
  created_at    timestamptz not null default now()
);

-- Lịch học & Lịch thi (admin chỉnh từ Dashboard, phong-hoc/lich-hoc hiển thị).
create table if not exists public.schedule_settings (
  id         boolean primary key default true check (id),
  active     boolean not null default true,
  events     jsonb not null default '[]'::jsonb,
  updated_at timestamptz,
  updated_by text
);

-- Video user đã xem trong Phòng Học (đồng bộ trạng thái "đã xem").
create table if not exists public.watched_videos (
  user_id    text not null,
  video_id   text not null,
  watched_at timestamptz not null default now(),
  primary key (user_id, video_id)
);

create index if not exists watched_videos_user_id_idx on public.watched_videos (user_id);

-- ============================== LỚP HỌC (class) ==============================
-- Classes: lớp học do GIÁO VIÊN tạo. Mỗi lớp thuộc 1 khối (block) và có mã mời (invite_code)
-- để học sinh tự tham gia. Mọi thao tác đi qua RPC security definer (không mở RLS trực tiếp).
create table if not exists public.classes (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  text not null,
  name        text not null default '',
  block       text not null default '',
  invite_code text not null,
  created_at  timestamptz not null default now()
);

create unique index if not exists classes_invite_code_idx on public.classes (invite_code);
create index if not exists classes_teacher_idx on public.classes (teacher_id);
create index if not exists classes_block_idx on public.classes (block);

-- class_members: học sinh trong lớp. status: 'approved' (đã vào) / 'pending' (chờ giáo viên duyệt).
-- Vào bằng mã mời → approved ngay; chọn khối+lớp → pending chờ duyệt.
create table if not exists public.class_members (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references public.classes(id) on delete cascade,
  user_id    text not null,
  status     text not null default 'approved',
  joined_at  timestamptz not null default now(),
  unique (class_id, user_id)
);

create index if not exists class_members_user_idx on public.class_members (user_id);
create index if not exists class_members_class_idx on public.class_members (class_id);


-- Log lỗi hệ thống: client ghi qua RPC log_app_error (cho cả anon), admin xem/xoá trên dashboard.
create table if not exists public.error_logs (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  user_id     text,
  email       text,
  source      text not null default '',
  category    text not null default 'feature',
  level       text not null default 'warning',
  code        text not null default '',
  message     text not null default '',
  url         text not null default '',
  detail      jsonb not null default '{}'::jsonb,
  status      text not null default 'open',
  resolved_by text,
  resolved_at timestamptz
);

create index if not exists error_logs_created_at_idx on public.error_logs (created_at desc);
create index if not exists error_logs_status_idx on public.error_logs (status);
create index if not exists error_logs_level_idx on public.error_logs (level);

-- ============================== RLS ==============================

alter table public.users enable row level security;
alter table public.access_list enable row level security;
alter table public.test_stats enable row level security;
alter table public.maintenance_settings enable row level security;
alter table public.weekly_reset enable row level security;
alter table public.broadcast_current enable row level security;
alter table public.broadcast_welcome enable row level security;
alter table public.ticker_settings enable row level security;
alter table public.forum_posts enable row level security;
alter table public.forum_events enable row level security;
alter table public.schedule_settings enable row level security;
alter table public.watched_videos enable row level security;
alter table public.classes enable row level security;
alter table public.class_members enable row level security;
alter table public.error_logs enable row level security;
alter table public.mailbox_messages enable row level security;
alter table public.registration_settings enable row level security;

-- ============================== FUNCTIONS & TRIGGERS ==============================

-- Kiểm tra user hiện tại có phải admin không.
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid()::text
      and (lower(role) = 'admin' or email = 'learnhubadmin@gmail.com')
  );
$$;

-- is_admin: chỉ authenticated cần dùng (trong policy). anon/PUBLIC bị chặn.
revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Kiểm tra user hiện tại có phải GIÁO VIÊN không (role='Giáo viên' hoặc là admin vì admin quản lý mọi thứ).
create or replace function public.is_teacher()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid()::text
      and (lower(role) = 'giáo viên' or public.is_admin())
  );
$$;

-- is_teacher: chỉ authenticated cần dùng (trong policy). anon/PUBLIC bị chặn.
revoke execute on function public.is_teacher() from public;
grant execute on function public.is_teacher() to authenticated;

-- Kiểm tra email có trong whitelist không (dùng trước khi đăng ký, không lộ bảng access_list).
create or replace function public.is_email_allowed(p_email text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.access_list
    where email = lower(btrim(coalesce(p_email, '')))
      and enabled = true
  );
$$;

-- is_email_allowed: anon cần gọi lúc đăng ký (kiểm tra whitelist trước khi tạo tài khoản),
-- authenticated cần cho guard whitelist.
revoke execute on function public.is_email_allowed(text) from public;
grant execute on function public.is_email_allowed(text) to anon, authenticated;

-- Kiểm tra đăng ký có đang mở không (login.html gọi khi chưa đăng nhập).
create or replace function public.is_registration_open()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce(
    (select enabled from public.registration_settings where id = true),
    true
  );
$$;

revoke execute on function public.is_registration_open() from public;
grant execute on function public.is_registration_open() to anon, authenticated;

-- Tự tạo dòng users khi có user Supabase mới (Google / email) đăng ký/đăng nhập lần đầu.
-- Dùng `on conflict do nothing` (không chỉ định cột) để bỏ qua trường hợp trùng email.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name, photo, role, created_at, updated_at)
  values (
    new.id::text,
    lower(coalesce(new.email, '')),
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      split_part(lower(coalesce(new.email, '')), '@', 1)
    ),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    'Thành viên',
    now(),
    now()
  )
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- handle_new_user chỉ là trigger function, không cho ai gọi trực tiếp qua RPC.
revoke execute on function public.handle_new_user() from public;

-- ============================== STORAGE (ảnh forum) ==============================

-- Bucket ảnh forum: public, giới hạn 5MB, chỉ ảnh. Path upload bắt buộc {uid}/...
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('forum-images', 'forum-images', true, 5242880,
        array['image/png', 'image/jpeg', 'image/gif', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists forum_images_insert on storage.objects;
create policy forum_images_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'forum-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists forum_images_select on storage.objects;
create policy forum_images_select on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'forum-images');

-- Xóa ảnh ngay khi bài bị xóa (user sở hữu bài hoặc admin). Security definer để vượt
-- storage RLS (user không có quyền delete object trực tiếp).
create or replace function public.remove_forum_image(p_image_url text)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_path text;
begin
  if p_image_url is null or btrim(p_image_url) = '' then
    return;
  end if;
  -- Path là phần sau "/object/public/forum-images/" trong URL public
  v_path := regexp_replace(
    p_image_url,
    '^.*/object/public/forum-images/',
    '',
    'g'
  );
  if v_path = p_image_url then
    return; -- không phải URL của bucket forum-images
  end if;
  delete from storage.objects
   where bucket_id = 'forum-images' and name = v_path;
  update public.forum_posts set image_url = null where image_url = p_image_url;
end;
$$;

revoke execute on function public.remove_forum_image(text) from public;
grant execute on function public.remove_forum_image(text) to authenticated;

-- Dọn ảnh quá 7 ngày tuổi (giải phóng storage + null cột image_url giữ DB sạch).
-- Gọi "cơ hội": mỗi lần mở forum / sau khi upload. Security definer để vượt storage RLS.
create or replace function public.cleanup_expired_forum_images()
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_name text;
begin
  for v_name in
    select o.name
      from storage.objects o
     where o.bucket_id = 'forum-images'
       and o.created_at < now() - interval '7 days'
  loop
    delete from storage.objects
     where bucket_id = 'forum-images' and name = v_name;
    update public.forum_posts
       set image_url = null
     where image_url like '%/forum-images/' || v_name;
  end loop;
end;
$$;

revoke execute on function public.cleanup_expired_forum_images() from public;
grant execute on function public.cleanup_expired_forum_images() to authenticated;

-- Xóa bài viết + tất cả reply con (cascade) + ảnh trên storage — 1 RPC call duy nhất.
-- Trả về { deleted: N } để client biết số bài đã xóa.
create or replace function public.delete_forum_post_cascade(p_post_id uuid)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_ids  uuid[];
  v_urls text[];
  v_path text;
begin
  -- Permission check: chỉ chủ bài hoặc admin mới được xóa
  IF NOT EXISTS (
    SELECT 1 FROM public.forum_posts
     WHERE id = p_post_id
       AND (user_id = auth.uid()::text OR public.is_admin())
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  -- 1. Recursive CTE: bài gốc + tất cả reply con, cháu, ...
  WITH RECURSIVE cascade AS (
    SELECT id, image_url
      FROM public.forum_posts WHERE id = p_post_id
    UNION ALL
    SELECT fp.id, fp.image_url
      FROM public.forum_posts fp
      JOIN cascade c ON fp.parent_id = c.id
  )
  SELECT array_agg(id), array_agg(image_url)
    INTO v_ids, v_urls
    FROM cascade;

  IF v_ids IS NULL THEN
    RETURN jsonb_build_object('deleted', 0);
  END IF;

  -- 2. Thu thập image_urls hợp lệ
  v_urls := ARRAY(
    SELECT unnest(v_urls)
     WHERE unnest IS NOT NULL AND btrim(unnest) <> ''
  );

  -- 3. Xóa ảnh trên storage (1 round-trip, loop trong SQL)
  IF array_length(v_urls, 1) > 0 THEN
    FOREACH v_path IN ARRAY v_urls LOOP
      v_path := regexp_replace(
        v_path,
        '^.*/object/public/forum-images/',
        '', 'g'
      );
      IF v_path IS NOT NULL AND v_path <> '' THEN
        DELETE FROM storage.objects
         WHERE bucket_id = 'forum-images' AND name = v_path;
      END IF;
    END LOOP;
  END IF;

  -- 4. Xóa posts (batch)
  DELETE FROM public.forum_posts WHERE id = ANY(v_ids);

  RETURN jsonb_build_object('deleted', array_length(v_ids, 1));
end;
$$;

revoke execute on function public.delete_forum_post_cascade(uuid) from public;
grant execute on function public.delete_forum_post_cascade(uuid) to authenticated;

-- ============================== ERROR LOGS (log lỗi hệ thống) ==============================
-- Client ghi log qua RPC này: security definer chạy với quyền owner nên vượt RLS.
-- Cho phép cả anon (ghi log TRƯỚC khi đăng nhập: người không whitelist/bị khóa cố vào web).
-- Khi có session thì tự lấy user_id/email; không có thì dùng p_email do client truyền.
create or replace function public.log_app_error(
  p_source text,
  p_level text,
  p_code text,
  p_message text,
  p_url text,
  p_category text,
  p_email text,
  p_detail jsonb
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid    text := auth.uid()::text;
  v_email  text;
begin
  select email into v_email from public.users where id = v_uid;
  if v_email is null then
    v_email := lower(btrim(coalesce(auth.jwt()->>'email', '')));
  end if;
  if v_email is null or v_email = '' then
    v_email := lower(btrim(coalesce(p_email, '')));
  end if;

  insert into public.error_logs (user_id, email, source, category, level, code, message, url, detail)
  values (
    v_uid,
    nullif(v_email, ''),
    nullif(coalesce(p_source, ''), ''),
    nullif(coalesce(p_category, 'feature'), ''),
    nullif(coalesce(p_level, 'warning'), ''),
    nullif(coalesce(p_code, ''), ''),
    nullif(coalesce(p_message, ''), ''),
    nullif(coalesce(p_url, ''), ''),
    coalesce(p_detail, '{}'::jsonb)
  );
end;
$$;

revoke execute on function public.log_app_error(text, text, text, text, text, text, text, jsonb) from public;
grant execute on function public.log_app_error(text, text, text, text, text, text, text, jsonb) to anon, authenticated;

-- Dọn log cũ (mặc định >7 ngày). Chỉ admin mới chạy được (tự kiểm tra bên trong).
create or replace function public.cleanup_error_logs(p_days int default 7)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return;
  end if;
  delete from public.error_logs
   where created_at < now() - make_interval(days => coalesce(p_days, 7));
end;
$$;

revoke execute on function public.cleanup_error_logs(int) from public;
grant execute on function public.cleanup_error_logs(int) to authenticated;

-- Cho phép user tự xóa tài khoản auth của mình (sau khi đã xóa profile ở client).
-- SECURITY DEFINER để gọi được auth.users từ role authenticated.
create or replace function public.delete_own_account()
returns void
language plpgsql security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Không tìm thấy phiên đăng nhập!';
  end if;
  delete from auth.users where id = uid;
end;
$$;

revoke execute on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;

-- ============================== POLICIES ==============================

drop policy if exists users_select on public.users;
create policy users_select on public.users
  for select to authenticated using (true);

drop policy if exists users_insert_own on public.users;
create policy users_insert_own on public.users
  for insert to authenticated with check (id = auth.uid()::text);

drop policy if exists users_update_own on public.users;
create policy users_update_own on public.users
  for update to authenticated using (id = auth.uid()::text) with check (id = auth.uid()::text);

drop policy if exists users_write_admin on public.users;
create policy users_write_admin on public.users
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists access_list_select_admin on public.access_list;
create policy access_list_select_admin on public.access_list
  for select to authenticated using (public.is_admin());

drop policy if exists access_list_write_admin on public.access_list;
create policy access_list_write_admin on public.access_list
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists test_stats_select on public.test_stats;
create policy test_stats_select on public.test_stats
  for select to authenticated using (true);

drop policy if exists test_stats_insert_own on public.test_stats;
create policy test_stats_insert_own on public.test_stats
  for insert to authenticated with check (user_id = auth.uid()::text);

drop policy if exists test_stats_update_own on public.test_stats;
create policy test_stats_update_own on public.test_stats
  for update to authenticated using (user_id = auth.uid()::text) with check (user_id = auth.uid()::text);

drop policy if exists test_stats_write_admin on public.test_stats;
create policy test_stats_write_admin on public.test_stats
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists maintenance_select on public.maintenance_settings;
create policy maintenance_select on public.maintenance_settings
  for select to authenticated using (true);

-- Trang login.html và maintenance.html cần đọc trạng thái bảo trì khi CHƯA đăng nhập (anon).
drop policy if exists maintenance_select_anon on public.maintenance_settings;
create policy maintenance_select_anon on public.maintenance_settings
  for select to anon using (true);

drop policy if exists maintenance_write_admin on public.maintenance_settings;
create policy maintenance_write_admin on public.maintenance_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Registration toggle: admin bật/tắt đăng ký, login.html đọc khi chưa login (anon).
drop policy if exists registration_select on public.registration_settings;
create policy registration_select on public.registration_settings
  for select to authenticated using (true);

drop policy if exists registration_select_anon on public.registration_settings;
create policy registration_select_anon on public.registration_settings
  for select to anon using (true);

drop policy if exists registration_write_admin on public.registration_settings;
create policy registration_write_admin on public.registration_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists weekly_reset_select on public.weekly_reset;
create policy weekly_reset_select on public.weekly_reset
  for select to authenticated using (true);

drop policy if exists weekly_reset_write_admin on public.weekly_reset;
create policy weekly_reset_write_admin on public.weekly_reset
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Ghi nhận lần reset tự động của tuần mới (kích hoạt bởi user đầu tiên đăng nhập/làm bài
-- trong tuần mới — điểm cũ tự reset qua week_key). Chỉ ghi 1 lần/tuần: nếu week_key đã
-- khớp tuần hiện tại thì bỏ qua. Security definer để user thường ghi được dù RLS chỉ cho admin.
-- Reset toàn bộ online_timer về 0 và gắn online_week_key tuần mới.
-- online_start_time = 0: users_begin_online thấy start=0 → nhánh fresh-start set start=now.
-- KHÔNG set = weekStart vì gây race condition: begin_online (chạy cùng page load) set
-- start=now rồi reset ghi đè lại weekStart → leaderboard tính (now - weekStart) = sai số giờ.
create or replace function public.record_auto_weekly_reset(p_week_key text)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_count int;
begin
  update public.users
     set online_timer      = 0,
         online_start_time = 0,
         online_week_key   = p_week_key
   where (online_week_key is distinct from p_week_key);

  select reset_count into v_count from public.weekly_reset where id = true;
  if v_count is null then
    insert into public.weekly_reset (id, last_reset_at, last_reset_by, week_key, reset_count, users_reset, reset_targets)
    values (true, now(), 'Hệ thống', p_week_key, 1, 1, 'Điểm số & Thời gian online (tự động theo tuần)');
    return;
  end if;
  update public.weekly_reset
     set last_reset_at = now(),
         last_reset_by = 'Hệ thống',
         week_key      = p_week_key,
         reset_count   = v_count + 1,
         users_reset   = coalesce(users_reset, 0) + 1,
         reset_targets = 'Điểm số & Thời gian online (tự động theo tuần)'
   where id = true
     and (week_key is distinct from p_week_key);
end;
$$;

revoke execute on function public.record_auto_weekly_reset(text) from public;
grant execute on function public.record_auto_weekly_reset(text) to authenticated;

drop policy if exists broadcast_current_select on public.broadcast_current;
create policy broadcast_current_select on public.broadcast_current
  for select to authenticated using (true);

drop policy if exists broadcast_current_write_admin on public.broadcast_current;
create policy broadcast_current_write_admin on public.broadcast_current
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists broadcast_welcome_select on public.broadcast_welcome;
create policy broadcast_welcome_select on public.broadcast_welcome
  for select to authenticated using (true);

drop policy if exists broadcast_welcome_write_admin on public.broadcast_welcome;
create policy broadcast_welcome_write_admin on public.broadcast_welcome
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists mailbox_select on public.mailbox_messages;
create policy mailbox_select on public.mailbox_messages
  for select to authenticated using (true);

drop policy if exists mailbox_insert_admin on public.mailbox_messages;
create policy mailbox_insert_admin on public.mailbox_messages
  for insert to authenticated with check (public.is_admin());

drop policy if exists mailbox_update_admin on public.mailbox_messages;
create policy mailbox_update_admin on public.mailbox_messages
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists mailbox_delete_admin on public.mailbox_messages;
create policy mailbox_delete_admin on public.mailbox_messages
  for delete to authenticated using (public.is_admin());

drop policy if exists ticker_select on public.ticker_settings;
create policy ticker_select on public.ticker_settings
  for select to authenticated using (true);

drop policy if exists ticker_select_anon on public.ticker_settings;
create policy ticker_select_anon on public.ticker_settings
  for select to anon using (true);

drop policy if exists ticker_write_admin on public.ticker_settings;
create policy ticker_write_admin on public.ticker_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists forum_posts_select on public.forum_posts;
create policy forum_posts_select on public.forum_posts
  for select to authenticated using (true);

drop policy if exists forum_posts_insert on public.forum_posts;
create policy forum_posts_insert on public.forum_posts
  for insert to authenticated with check (user_id = auth.uid()::text);

drop policy if exists forum_posts_update_owner on public.forum_posts;
create policy forum_posts_update_owner on public.forum_posts
  for update to authenticated using (user_id = auth.uid()::text) with check (user_id = auth.uid()::text);

drop policy if exists forum_posts_update_admin on public.forum_posts;
create policy forum_posts_update_admin on public.forum_posts
  for update to authenticated using (public.is_admin()) with check (true);

drop policy if exists forum_posts_delete_owner on public.forum_posts;
create policy forum_posts_delete_owner on public.forum_posts
  for delete to authenticated using (user_id = auth.uid()::text);

drop policy if exists forum_posts_delete_admin on public.forum_posts;
create policy forum_posts_delete_admin on public.forum_posts
  for delete to authenticated using (public.is_admin());

drop policy if exists forum_events_select on public.forum_events;
create policy forum_events_select on public.forum_events
  for select to authenticated using (true);

drop policy if exists forum_events_insert on public.forum_events;
create policy forum_events_insert on public.forum_events
  for insert to authenticated with check (true);

drop policy if exists forum_events_delete_admin on public.forum_events;
create policy forum_events_delete_admin on public.forum_events
  for delete to authenticated using (public.is_admin());

-- Lịch học & thi: mọi người (kể cả anon) đọc được — phong-hoc/lich-hoc hiển thị
-- khi chưa đăng nhập. Chỉ admin mới ghi được.
drop policy if exists schedule_settings_select_policy on public.schedule_settings;
drop policy if exists schedule_settings_insert_policy on public.schedule_settings;
drop policy if exists schedule_settings_update_policy on public.schedule_settings;
drop policy if exists schedule_select on public.schedule_settings;
create policy schedule_select on public.schedule_settings
  for select using (true);

drop policy if exists schedule_write_admin on public.schedule_settings;
create policy schedule_write_admin on public.schedule_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Video đã xem: mỗi user chỉ đọc/ghi dòng của chính mình.
drop policy if exists watched_videos_select_own on public.watched_videos;
create policy watched_videos_select_own on public.watched_videos
  for select to authenticated using (user_id = auth.uid()::text);

drop policy if exists watched_videos_insert_own on public.watched_videos;
create policy watched_videos_insert_own on public.watched_videos
  for insert to authenticated with check (user_id = auth.uid()::text);

-- LỚP HỌC: chặn truy cập trực tiếp của mọi user — MỌI thao tác đều qua RPC security definer
-- (để không lộ invite_code / danh sách lớp khi chưa được phép, không cho đọc bảng trực tiếp).
drop policy if exists classes_no_direct on public.classes;
create policy classes_no_direct on public.classes
  for all to authenticated using (false) with check (false);

drop policy if exists class_members_no_direct on public.class_members;
create policy class_members_no_direct on public.class_members
  for all to authenticated using (false) with check (false);

-- ============================== LỚP HỌC — RPC ==============================

-- Giáo viên tạo lớp: tự sinh mã mời 6 ký tự duy nhất, check role teacher/admin.
create or replace function public.create_class(p_name text, p_block text)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid text := auth.uid()::text;
  v_code text;
  v_id uuid;
begin
  if v_uid is null or not public.is_teacher() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if btrim(coalesce(p_name,'')) = '' then
    return jsonb_build_object('ok', false, 'error', 'empty_name');
  end if;
  loop
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when not exists (select 1 from public.classes where invite_code = v_code);
  end loop;
  insert into public.classes (teacher_id, name, block, invite_code)
    values (v_uid, btrim(p_name), btrim(coalesce(p_block,'')), v_code)
    returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id, 'invite_code', v_code);
end;
$$;
revoke execute on function public.create_class(text, text) from public;
grant execute on function public.create_class(text, text) to authenticated;

-- Liệt kê các khối có lớp (để học sinh chọn khối). Không lộ mã.
create or replace function public.list_blocks()
returns table(block text)
language sql stable security definer
set search_path = public
as $$
  select distinct c.block from public.classes c where btrim(coalesce(c.block,'')) <> '' order by c.block;
$$;
revoke execute on function public.list_blocks() from public;
grant execute on function public.list_blocks() to authenticated;

-- Liệt kê các lớp trong 1 khối (id + tên, không lộ mã).
create or replace function public.list_classes_in_block(p_block text)
returns table(class_id uuid, name text)
language sql stable security definer
set search_path = public
as $$
  select c.id, c.name from public.classes c where c.block = p_block order by c.name;
$$;
revoke execute on function public.list_classes_in_block(text) from public;
grant execute on function public.list_classes_in_block(text) to authenticated;

-- Tham gia bằng mã mời: đúng mã → vào ngay (approved).
create or replace function public.join_class_by_code(p_code text)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid text := auth.uid()::text;
  v_class uuid;
  v_exist uuid;
begin
  if v_uid is null or btrim(coalesce(p_code,'')) = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  select c.id into v_class from public.classes c where c.invite_code = upper(btrim(p_code));
  if v_class is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  select cm.id into v_exist from public.class_members cm
    where cm.class_id = v_class and cm.user_id = v_uid;
  if v_exist is not null then
    return jsonb_build_object('ok', false, 'error', 'already');
  end if;
  insert into public.class_members (class_id, user_id, status) values (v_class, v_uid, 'approved');
  return jsonb_build_object('ok', true, 'class_id', v_class, 'status', 'approved');
end;
$$;
revoke execute on function public.join_class_by_code(text) from public;
grant execute on function public.join_class_by_code(text) to authenticated;

-- Gửi yêu cầu vào lớp (chọn khối + lớp): pending chờ giáo viên duyệt.
create or replace function public.request_join_class(p_class_id uuid)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid text := auth.uid()::text;
  v_owner text;
  v_exist uuid;
begin
  if v_uid is null or p_class_id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  select teacher_id into v_owner from public.classes where id = p_class_id;
  if v_owner is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if v_owner = v_uid then
    return jsonb_build_object('ok', false, 'error', 'self');
  end if;
  select cm.id into v_exist from public.class_members cm
    where cm.class_id = p_class_id and cm.user_id = v_uid;
  if v_exist is not null then
    return jsonb_build_object('ok', false, 'error', 'already');
  end if;
  insert into public.class_members (class_id, user_id, status) values (p_class_id, v_uid, 'pending');
  return jsonb_build_object('ok', true, 'class_id', p_class_id, 'status', 'pending');
end;
$$;
revoke execute on function public.request_join_class(uuid) from public;
grant execute on function public.request_join_class(uuid) to authenticated;

-- Lớp của USER hiện tại (profile hiển thị).
create or replace function public.my_classes()
returns table(class_name text, block text, status text, joined_at timestamptz, teacher_name text)
language sql stable security definer
set search_path = public
as $$
  select c.name, c.block, cm.status, cm.joined_at, coalesce(u.name,'') as teacher_name
    from public.class_members cm
    join public.classes c on c.id = cm.class_id
    left join public.users u on u.id = c.teacher_id
   where cm.user_id = auth.uid()::text
   order by cm.joined_at desc;
$$;
revoke execute on function public.my_classes() from public;
grant execute on function public.my_classes() to authenticated;

-- Lớp của GIÁO VIÊN hiện tại (web giáo viên).
create or replace function public.teacher_classes()
returns table(class_id uuid, name text, block text, invite_code text, member_count bigint, pending_count bigint)
language sql stable security definer
set search_path = public
as $$
  select c.id, c.name, c.block, c.invite_code,
         (select count(*) from public.class_members cm where cm.class_id = c.id and cm.status = 'approved'),
         (select count(*) from public.class_members cm where cm.class_id = c.id and cm.status = 'pending')
    from public.classes c
   where c.teacher_id = auth.uid()::text
   order by c.created_at desc;
$$;
revoke execute on function public.teacher_classes() from public;
grant execute on function public.teacher_classes() to authenticated;

-- Thành viên + yêu cầu của 1 lớp (chỉ giáo viên lớp đó).
create or replace function public.class_members_of(p_class_id uuid)
returns table(member_id uuid, user_id text, name text, email text, status text, joined_at timestamptz)
language sql stable security definer
set search_path = public
as $$
  select cm.id, cm.user_id, coalesce(u.name,''), coalesce(u.email,''), cm.status, cm.joined_at
    from public.class_members cm
    left join public.users u on u.id = cm.user_id
   where cm.class_id = p_class_id
     and exists (select 1 from public.classes c where c.id = p_class_id and c.teacher_id = auth.uid()::text)
   order by (cm.status = 'pending') desc, cm.joined_at asc;
$$;
revoke execute on function public.class_members_of(uuid) from public;
grant execute on function public.class_members_of(uuid) to authenticated;

-- Duyệt / từ chối (gỡ) thành viên. p_action: 'approve' | 'remove'. Chỉ giáo viên lớp đó.
create or replace function public.set_class_member(p_member_id uuid, p_action text)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_class uuid;
begin
  select cm.class_id into v_class from public.class_members cm where cm.id = p_member_id;
  if v_class is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if not exists (select 1 from public.classes c where c.id = v_class and c.teacher_id = auth.uid()::text) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if p_action = 'approve' then
    update public.class_members set status = 'approved' where id = p_member_id;
    return jsonb_build_object('ok', true);
  elsif p_action = 'remove' then
    delete from public.class_members where id = p_member_id;
    return jsonb_build_object('ok', true);
  else
    return jsonb_build_object('ok', false, 'error', 'bad_action');
  end if;
end;
$$;
revoke execute on function public.set_class_member(uuid, text) from public;
grant execute on function public.set_class_member(uuid, text) to authenticated;

-- Log lỗi: chỉ admin đọc/xoá/sửa; việc ghi đi qua RPC log_app_error (security definer).
drop policy if exists error_logs_admin on public.error_logs;
create policy error_logs_admin on public.error_logs
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============================== REACTIONS ==============================

-- Thả cảm xúc: cho phép mọi user đã đăng nhập update cảm xúc trên BẤT KỲ bài viết nào
-- (kể cả bài của người khác) mà không phá RLS. Security definer + chỉ sửa 3 cột
-- reactions/likes/dislikes, dùng auth.uid() làm key → user chỉ đổi cảm xúc của chính mình.
create or replace function public.toggle_forum_reaction(p_post_id uuid, p_type text)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid text := auth.uid()::text;
  v_reactions jsonb;
begin
  if v_uid is null or p_post_id is null or p_type is null then
    return;
  end if;
  if p_type not in ('like', 'love', 'care', 'haha', 'wow', 'sad', 'angry', 'dislike') then
    return;
  end if;

  select coalesce(reactions, '{}'::jsonb) into v_reactions
    from public.forum_posts
   where id = p_post_id;
  if v_reactions is null then
    return;
  end if;

  if v_reactions->>v_uid = p_type then
    v_reactions := v_reactions - v_uid;
  else
    v_reactions := v_reactions || jsonb_build_object(v_uid, p_type);
  end if;

  update public.forum_posts
     set reactions = v_reactions,
         likes     = coalesce(likes, '{}'::jsonb) - v_uid,
         dislikes  = coalesce(dislikes, '{}'::jsonb) - v_uid
   where id = p_post_id;
end;
$$;

revoke execute on function public.toggle_forum_reaction(uuid, text) from public;
grant execute on function public.toggle_forum_reaction(uuid, text) to authenticated;

-- Đăng bài / phản hồi: security definer lấy user_id = auth.uid() phía server nên
-- luôn pass RLS insert dù uid client có bị lệch đi nữa. user_name/role lấy từ bảng users
-- (không cho client tự khai). parent_id null = bài mới, có giá trị = phản hồi.
create or replace function public.create_forum_post(p_text text, p_image_url text, p_parent_id uuid)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid  text := auth.uid()::text;
  v_name text;
  v_role text;
  v_id   uuid;
begin
  if v_uid is null or coalesce(btrim(p_text), '') = '' then
    return null;
  end if;

  select coalesce(nullif(btrim(name), ''), 'Người dùng'), coalesce(nullif(role, ''), 'member')
    into v_name, v_role
    from public.users
   where id = v_uid;

  insert into public.forum_posts (user_id, user_name, role, text, image_url, parent_id, time)
  values (
    v_uid,
    coalesce(v_name, 'Người dùng'),
    coalesce(v_role, 'member'),
    btrim(p_text),
    p_image_url,
    p_parent_id,
    extract(epoch from now())::bigint * 1000
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.create_forum_post(text, text, uuid) from public;
grant execute on function public.create_forum_post(text, text, uuid) to authenticated;

-- Ghim / bỏ ghim bài viết (chỉ admin). Security definer nên không phụ thuộc vào
-- RLS update từng dòng — đúng admin (is_admin) mới chạy được. Cùng pattern với
-- create_forum_post / toggle_forum_reaction.
create or replace function public.set_forum_post_pinned(p_post_id uuid, p_pinned boolean)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if p_post_id is null or not public.is_admin() then
    return;
  end if;
  update public.forum_posts
     set pinned   = coalesce(p_pinned, false),
         pin_time = case
                      when coalesce(p_pinned, false)
                      then extract(epoch from now())::bigint * 1000
                      else null
                    end
   where id = p_post_id;
end;
$$;

revoke execute on function public.set_forum_post_pinned(uuid, boolean) from public;
grant execute on function public.set_forum_post_pinned(uuid, boolean) to authenticated;

-- ============================== GRANTS ==============================

grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
grant usage on all sequences in schema public to authenticated;

-- ============================== REALTIME ==============================

do $$
declare
  t text;
begin
  foreach t in array array[
    'public.forum_posts',
    'public.forum_events',
    'public.users',
    'public.access_list',
    'public.broadcast_current',
    'public.broadcast_welcome',
    'public.maintenance_settings',
    'public.ticker_settings',
    'public.schedule_settings',
    'public.error_logs',
    'public.mailbox_messages'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = split_part(t, '.', 1)
        and tablename = split_part(t, '.', 2)
    ) then
      execute format('alter publication supabase_realtime add table %s', t);
    end if;
  end loop;
end $$;

-- ============================== FIX C1: chặn tự đổi role/email/id ==============================
-- User chỉ được phép update các cột thường (name, photo, bio, phone, online, ...).
-- Mọi đổi id/email bị từ chối; đổi role chỉ admin thật (public.is_admin()) được phép.
-- Trigger security definer chạy với quyền owner nên không bị RLS cản,
-- public.is_admin() bên trong vẫn dùng auth.uid() nên chuẩn.
create or replace function public.users_prevent_privilege_update()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if (new.id is distinct from old.id) then
    raise exception 'Không được tự đổi id.';
  end if;
  if (new.email is distinct from old.email) then
    raise exception 'Không được tự đổi email.';
  end if;
  if (new.role is distinct from old.role) then
    if not public.is_admin() then
      raise exception 'Không được tự đổi quyền (role).';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_users_prevent_privilege_update on public.users;
create trigger trg_users_prevent_privilege_update
  before update on public.users
  for each row execute function public.users_prevent_privilege_update();

-- ============================== FIX C1 (INSERT): chặn leo quyền khi tạo lại dòng users ==============================
-- Trước đây chỉ chặn UPDATE (trigger C1 ở trên). Nhưng admin xóa user chỉ xóa dòng users
-- (không xóa auth user), user vẫn còn session và có thể INSERT lại dòng của chính mình
-- với role='Admin' (policy users_insert_own chỉ check id, không check role). Trigger này
-- buộc user thường phải tạo dòng với role='Thành viên' và email lấy từ JWT (không tự khai).
-- Admin thật (public.is_admin()) không bị giới hạn.
create or replace function public.users_prevent_privilege_insert()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    new.role  := 'Thành viên';
    new.email := lower(btrim(coalesce(auth.jwt()->>'email', new.email)));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_users_prevent_privilege_insert on public.users;
create trigger trg_users_prevent_privilege_insert
  before insert on public.users
  for each row execute function public.users_prevent_privilege_insert();

-- ============================== ONLINE TIMER FIX (atomic, chống giờ ảo) ==============================
-- Lỗi cũ: client "đọc rồi ghi" online_start_time/online_timer không atomic → 2 tab cùng ghi
-- double-count; login cộng bù (now - start) vô điều kiện → session chết (crash) bị cộng cả
-- khoảng offline → thời gian online bị thổi phồng ("40 tiếng").
-- Cách mới: mọi thay đổi start/timer nằm trong function atomic (SELECT ... FOR UPDATE).
--   users_begin_online:   claim/bắt đầu phiên; KHÔNG cộng khoảng offline, chỉ cộng phần
--                         online thật (start -> last_active) nếu phiên cũ bị gián đoạn.
--   users_finalize_online: kết thúc phiên, cộng dồn đúng (now - start), reset start.
--   users_cleanup_stale_online: admin quét user online hết hạn (crash) → finalize thay thế.
create or replace function public.users_begin_online(p_uid text)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  now_ms bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  r record;
begin
  if auth.uid()::text <> p_uid and not public.is_admin() then
    raise exception 'Forbidden';
  end if;

  select online_start_time, last_active into r
    from public.users where id = p_uid for update;

  if r.online_start_time is null or r.online_start_time = 0 then
    -- Phiên mới: bắt đầu đếm từ bây giờ
    update public.users
      set online = true, last_active = now_ms, online_start_time = now_ms
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
  now_ms bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  r record;
begin
  if auth.uid()::text <> p_uid and not public.is_admin() then
    raise exception 'Forbidden';
  end if;

  select online_start_time into r from public.users where id = p_uid for update;

  update public.users
    set online = false,
        last_active = now_ms,
        online_start_time = 0,
        online_timer = online_timer + case
          when coalesce(r.online_start_time,0) > 0
            then greatest(0, (now_ms - r.online_start_time)) / 1000
          else 0 end
    where id = p_uid;
end;
$$;

create or replace function public.users_cleanup_stale_online(p_stale_ms bigint default 120000)
returns integer
language plpgsql security definer
set search_path = public
as $$
declare
  now_ms bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  n integer;
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;

  update public.users
    set online = false,
        online_start_time = 0,
        online_timer = online_timer + case
          when coalesce(online_start_time,0) > 0 and last_active is not null
            then greatest(0, (least(last_active, now_ms) - online_start_time)) / 1000
          else 0 end
    where online = true
      and (last_active is null or (now_ms - last_active) > p_stale_ms);

  get diagnostics n = row_count;
  return n;
end;
$$;

-- Heartbeat nhẹ: chỉ cập nhật last_active + online, KHÔNG đếm thời gian.
-- Dùng thay cho update trực tiếp từ client → tất cả writes đi qua server,
-- dùng clock_timestamp() (server time) chống gian lận chỉnh giờ máy.
create or replace function public.users_heartbeat(p_uid text)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  now_ms bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
begin
  if auth.uid()::text <> p_uid and not public.is_admin() then
    raise exception 'Forbidden';
  end if;

  update public.users
    set last_active = now_ms,
        online = true
    where id = p_uid
      and not coalesce(disabled, false)
      and online = true;
end;
$$;

revoke execute on function public.users_heartbeat(text) from public;
grant execute on function public.users_heartbeat(text) to authenticated;

revoke execute on function public.users_begin_online(text) from public;
revoke execute on function public.users_finalize_online(text) from public;
revoke execute on function public.users_cleanup_stale_online(bigint) from public;
grant execute on function public.users_begin_online(text) to authenticated;
grant execute on function public.users_finalize_online(text) to authenticated;
grant execute on function public.users_cleanup_stale_online(bigint) to authenticated;

-- Reset tuần: reset điểm số / thời gian online của tất cả user trong 1 RPC call duy nhất.
-- Thay thế loop N+1 requests trên client.
create or replace function public.admin_bulk_reset_weekly(
  p_week_key    text,
  p_reset_score boolean,
  p_reset_time  boolean,
  p_admin_email text
) returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  v_prev  integer;
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;

  if p_reset_score then
    update public.test_stats
       set total_tests = 0,
           total_score = 0,
           best_score  = 0,
           week_key    = p_week_key,
           updated_at  = now();
    get diagnostics v_count = row_count;
  end if;

  if p_reset_time then
    update public.users
       set online_timer      = 0,
           online_start_time = 0,
           online_week_key   = p_week_key;
    if not p_reset_score then
      get diagnostics v_count = row_count;
    end if;
  end if;

  select coalesce(reset_count, 0) into v_prev
    from public.weekly_reset where id = true;

  insert into public.weekly_reset (id, last_reset_at, last_reset_by, week_key, reset_count, users_reset, reset_targets)
  values (
    true,
    now(),
    p_admin_email,
    p_week_key,
    coalesce(v_prev, 0) + 1,
    v_count,
    case when p_reset_score and p_reset_time then 'điểm số & thời gian online'
         when p_reset_score then 'điểm số'
         else 'thời gian online' end
  )
  on conflict (id) do update
    set last_reset_at  = excluded.last_reset_at,
        last_reset_by  = excluded.last_reset_by,
        week_key       = excluded.week_key,
        reset_count    = public.weekly_reset.reset_count + 1,
        users_reset    = excluded.users_reset,
        reset_targets  = excluded.reset_targets;

  return jsonb_build_object('count', v_count);
end;
$$;

revoke execute on function public.admin_bulk_reset_weekly(text, boolean, boolean, text) from public;
grant execute on function public.admin_bulk_reset_weekly(text, boolean, boolean, text) to authenticated;

-- ============================================================
-- Migration: Append signature to existing mailbox messages
-- ============================================================
update public.mailbox_messages
set message = message || '<p style="margin-top:24px">Trân trọng,<br><strong>Đội ngũ phát triển!</strong></p>'
where message not like '%Trân trọng%Đội ngũ phát triển%';
