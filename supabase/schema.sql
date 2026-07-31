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

create table if not exists public.weekly_winners (
  week_key   text primary key,
  top        jsonb,
  updated_at timestamptz
);

create table if not exists public.forum_posts (
  id         uuid primary key default gen_random_uuid(),
  legacy_id  text,
  user_id    text,
  user_name  text,
  role       text not null default 'member',
  text       text not null,
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
alter table public.weekly_winners enable row level security;
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
      and (role = 'Admin' or email = 'learnhubadmin@gmail.com')
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;

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

-- Nhận lại dữ liệu cũ: khi user cũ đăng nhập lại lần đầu (cùng email),
-- chuyển hồ sơ + điểm + bài viết forum từ uid Firebase cũ sang uid Supabase mới.
-- Xóa dòng cũ trước (giải phóng email để khỏi trùng unique index), rồi upsert
-- dòng mới theo auth uid — kể cả khi trigger handle_new_user đã bỏ qua insert
-- vì trùng email.
create or replace function public.claim_legacy_data(p_email text)
returns text
language plpgsql security definer
set search_path = public
as $$
declare
  v_new_uid text := auth.uid()::text;
  v_old_uid text;
  v_legacy public.users%rowtype;
begin
  if v_new_uid is null or p_email is null or btrim(p_email) = '' then
    return null;
  end if;

  select firebase_uid into v_old_uid
    from public.legacy_uid_map
   where email = lower(btrim(p_email))
   limit 1;

  if v_old_uid is null then
    return null;
  end if;

  select * into v_legacy from public.users where id = v_old_uid;
  if v_legacy.id is null then
    return null;
  end if;

  delete from public.users where id = v_old_uid;

  insert into public.users (
    id, email, name, photo, role, bio, phone, birthdate, gender, school,
    created_at, last_login, updated_at
  )
  values (
    v_new_uid,
    lower(btrim(p_email)),
    coalesce(nullif(btrim(coalesce(v_legacy.name, '')), ''), split_part(lower(btrim(p_email)), '@', 1)),
    v_legacy.photo,
    coalesce(nullif(v_legacy.role, ''), 'Thành viên'),
    v_legacy.bio, v_legacy.phone, v_legacy.birthdate, v_legacy.gender, v_legacy.school,
    coalesce(v_legacy.created_at, now()),
    coalesce(v_legacy.last_login, now()),
    now()
  )
  on conflict (id) do update set
    email       = excluded.email,
    name        = coalesce(nullif(btrim(coalesce(public.users.name, '')), ''), excluded.name),
    photo       = coalesce(public.users.photo, excluded.photo),
    role        = coalesce(nullif(excluded.role, ''), public.users.role),
    bio         = coalesce(public.users.bio, excluded.bio),
    phone       = coalesce(public.users.phone, excluded.phone),
    birthdate   = coalesce(public.users.birthdate, excluded.birthdate),
    gender      = coalesce(public.users.gender, excluded.gender),
    school      = coalesce(public.users.school, excluded.school),
    created_at  = coalesce(public.users.created_at, excluded.created_at),
    last_login  = coalesce(public.users.last_login, excluded.last_login),
    updated_at  = now();

  update public.test_stats set user_id = v_new_uid where user_id = v_old_uid;
  update public.forum_posts set user_id = v_new_uid where user_id = v_old_uid;

  delete from public.legacy_uid_map where firebase_uid = v_old_uid;

  return v_old_uid;
end;
$$;

grant execute on function public.claim_legacy_data(text) to authenticated;

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

drop policy if exists weekly_winners_select on public.weekly_winners;
create policy weekly_winners_select on public.weekly_winners
  for select to authenticated using (true);

drop policy if exists weekly_winners_write_admin on public.weekly_winners;
create policy weekly_winners_write_admin on public.weekly_winners
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
    'public.ticker_settings',
    'public.weekly_winners'
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
