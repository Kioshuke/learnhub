-- ============================================================================
-- LearnHub Supabase Schema (schema.sql)
-- ----------------------------------------------------------------------------
-- Cách dùng: dán toàn bộ file này vào Supabase Dashboard -> SQL Editor -> Run
-- Idempotent: có thể chạy lại nhiều lần an toàn (dùng IF NOT EXISTS / OR REPLACE).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ============================== TABLES ==============================

-- users.id là TEXT (không phải uuid) để lưu được uid Firebase cũ khi import.
-- Khi user cũ đăng nhập lại lần đầu, RPC claim_legacy_data() sẽ đổi id sang uid Supabase.
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
  week_key    text,
  created_at  timestamptz,
  last_played timestamptz,
  updated_at  timestamptz
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

create table if not exists public.legacy_uid_map (
  firebase_uid text primary key,
  email        text not null unique
);

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
alter table public.legacy_uid_map enable row level security;

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

-- Tự tạo dòng users khi có user Supabase mới (Google / email) đăng nhập lần đầu.
-- Dùng `on conflict do nothing` (không chỉ định cột) để bỏ qua cả trường hợp trùng
-- email với dữ liệu Firebase cũ (unique index users_email_lower_idx). Khi đó auth vẫn
-- tạo user thành công, dữ liệu cũ sẽ được chuyển bởi claim_legacy_data() sau đó.
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

-- Nhận lại dữ liệu cũ: khi user cũ đăng nhập lại lần đầu (cùng email),
-- chuyển hồ sơ + điểm + bài viết forum từ uid Firebase cũ sang uid Supabase mới.
-- Email lấy từ JWT session (không tin tham số client). Xóa dòng cũ rồi xóa luôn
-- dòng mới (do handle_new_user tạo) để insert thuần theo auth uid — kể cả khi
-- handle_new_user đã bỏ qua insert vì trùng email.
create or replace function public.claim_legacy_data(p_email text)
returns text
language plpgsql security definer
set search_path = public
as $$
declare
  v_new_uid text := auth.uid()::text;
  v_session_email text;
  v_old_uid text;
  v_legacy public.users%rowtype;
begin
  if v_new_uid is null then
    return null;
  end if;

  -- Email QUYỀN LỰC lấy từ token JWT, KHÔNG tin tham số client (p_email bị bỏ qua).
  v_session_email := lower(btrim(coalesce(auth.jwt()->>'email', '')));
  if v_session_email = '' then
    return null;
  end if;

  select firebase_uid into v_old_uid
    from public.legacy_uid_map
   where email = v_session_email
   limit 1;

  if v_old_uid is null then
    return null;
  end if;

  select * into v_legacy from public.users where id = v_old_uid;
  if v_legacy.id is null then
    return null;
  end if;

  -- An toàn kép: user legacy phải có email trùng với session.
  if lower(btrim(coalesce(v_legacy.email, ''))) <> v_session_email then
    return null;
  end if;

  -- Xoá dòng legacy cũ, rồi xoá luôn dòng mới (do handle_new_user tạo) để insert thuần.
  -- KHÔNG dùng insert ... on conflict (id) do update vì nhánh update sẽ kích hoạt
  -- trigger trg_users_prevent_privilege_update (chặn tự đổi role/email/id).
  delete from public.users where id = v_old_uid;
  delete from public.users where id = v_new_uid;

  insert into public.users (
    id, email, name, photo, role, bio, phone, birthdate, gender, school,
    created_at, last_login, updated_at
  )
  values (
    v_new_uid,
    v_session_email,
    coalesce(nullif(btrim(coalesce(v_legacy.name, '')), ''), split_part(v_session_email, '@', 1)),
    v_legacy.photo,
    coalesce(nullif(v_legacy.role, ''), 'Thành viên'),
    v_legacy.bio, v_legacy.phone, v_legacy.birthdate, v_legacy.gender, v_legacy.school,
    coalesce(v_legacy.created_at, now()),
    coalesce(v_legacy.last_login, now()),
    now()
  );

  update public.test_stats set user_id = v_new_uid where user_id = v_old_uid;
  update public.forum_posts set user_id = v_new_uid where user_id = v_old_uid;

  delete from public.legacy_uid_map where firebase_uid = v_old_uid;

  return v_old_uid;
end;
$$;

-- claim_legacy_data: chỉ authenticated dùng (sau khi đăng nhập). anon/PUBLIC bị chặn.
revoke execute on function public.claim_legacy_data(text) from public;
grant execute on function public.claim_legacy_data(text) to authenticated;

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

drop policy if exists weekly_reset_select on public.weekly_reset;
create policy weekly_reset_select on public.weekly_reset
  for select to authenticated using (true);

drop policy if exists weekly_reset_write_admin on public.weekly_reset;
create policy weekly_reset_write_admin on public.weekly_reset
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Ghi nhận lần reset tự động của tuần mới (kích hoạt bởi user đầu tiên đăng nhập/làm bài
-- trong tuần mới — điểm cũ tự reset qua week_key). Chỉ ghi 1 lần/tuần: nếu week_key đã
-- khớp tuần hiện tại thì bỏ qua. Security definer để user thường ghi được dù RLS chỉ cho admin.
create or replace function public.record_auto_weekly_reset(p_week_key text)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_count int;
begin
  select reset_count into v_count from public.weekly_reset where id = true;
  if v_count is null then
    insert into public.weekly_reset (id, last_reset_at, last_reset_by, week_key, reset_count, users_reset, reset_targets)
    values (true, now(), 'Hệ thống', p_week_key, 1, 1, 'Điểm số (tự động theo tuần)');
    return;
  end if;
  update public.weekly_reset
     set last_reset_at = now(),
         last_reset_by = 'Hệ thống',
         week_key      = p_week_key,
         reset_count   = v_count + 1,
         users_reset   = coalesce(users_reset, 0) + 1,
         reset_targets = 'Điểm số (tự động theo tuần)'
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

drop policy if exists legacy_uid_map_deny on public.legacy_uid_map;
create policy legacy_uid_map_deny on public.legacy_uid_map
  for all to authenticated using (false) with check (false);

drop policy if exists legacy_uid_map_deny_anon on public.legacy_uid_map;
create policy legacy_uid_map_deny_anon on public.legacy_uid_map
  for all to anon using (false) with check (false);

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
    'public.ticker_settings'
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
