-- ============================================================================
-- LearnHub Blog (blog.sql)
-- ----------------------------------------------------------------------------
-- Cách dùng: dán toàn bộ file này vào Supabase Dashboard -> SQL Editor -> Run
-- Idempotent: chạy lại nhiều lần vẫn an toàn.
--
-- Mô hình:
--   • blog_posts  — bài viết do ADMIN soạn từ Dashboard (tab "Blog").
--   • Nội dung lưu dạng HTML (rich text editor), ảnh chỉ dán URL.
--   • Đọc công khai: ai cũng xem được bài đã publish (kể cả khách chưa đăng nhập).
--   • Ghi: chỉ admin (theo public.is_admin() trong schema.sql).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ============================== TABLE ==============================
create table if not exists public.blog_posts (
  id          uuid primary key default gen_random_uuid(),
  title       text not null default '',
  excerpt     text not null default '',
  content     text not null default '',
  cover_url   text,
  category    text not null default 'Tin tức',
  tags        text[] not null default '{}',
  author      text not null default 'Ban Quản Trị LearnHub',
  author_id   text,
  published   boolean not null default true,
  pinned      boolean not null default false,
  views       int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists blog_posts_created_idx     on public.blog_posts (created_at desc);
create index if not exists blog_posts_published_idx   on public.blog_posts (published, pinned desc, created_at desc);
create index if not exists blog_posts_category_idx    on public.blog_posts (category);

-- ============================== RLS ==============================
alter table public.blog_posts enable row level security;

-- Đọc công khai: mọi người (kể cả anon) xem bài đã publish.
drop policy if exists blog_posts_select_public on public.blog_posts;
create policy blog_posts_select_public on public.blog_posts
  for select to anon, authenticated using (published = true);

-- Admin xem được cả bản nháp.
drop policy if exists blog_posts_select_admin on public.blog_posts;
create policy blog_posts_select_admin on public.blog_posts
  for select to authenticated using (public.is_admin());

-- Chỉ admin được thêm / sửa / xoá.
drop policy if exists blog_posts_write_admin on public.blog_posts;
create policy blog_posts_write_admin on public.blog_posts
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============================== TRIGGER: updated_at ==============================
-- Chỉ coi là "cập nhật" khi các cột NỘI DUNG đổi. Riêng lượt xem (views) tăng lên
-- KHÔNG làm đổi updated_at (nếu không, mỗi lượt xem lại đụng updated_at + phát realtime).
create or replace function public.blog_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  if (new.title, new.excerpt, new.content, new.cover_url, new.category, new.tags,
      new.author, new.author_id, new.published, new.pinned)
     is distinct from
     (old.title, old.excerpt, old.content, old.cover_url, old.category, old.tags,
      old.author, old.author_id, old.published, old.pinned)
  then
    new.updated_at := now();
  else
    new.updated_at := old.updated_at;
  end if;
  return new;
end;
$$;

drop trigger if exists blog_posts_touch on public.blog_posts;
create trigger blog_posts_touch
  before update on public.blog_posts
  for each row execute function public.blog_touch_updated_at();

-- ============================== RPC: tăng lượt xem ==============================
-- Công khai (anon + authenticated), chỉ tăng cho bài đã publish.
create or replace function public.blog_increment_views(p_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if p_id is null then
    return;
  end if;
  update public.blog_posts
     set views = views + 1
   where id = p_id
     and published = true;
end;
$$;

revoke execute on function public.blog_increment_views(uuid) from public;
grant execute on function public.blog_increment_views(uuid) to anon, authenticated;

-- Tăng lượt xem cho NHIỀU bài trong 1 request (gộp nhiều lượt mở bài lại).
-- Trùng id trong mảng = cộng bấy nhiêu lần (giữ đúng nghĩa "mỗi lần mở +1").
-- Dùng cho khách (không có heartbeat) hoặc khi rời trang, để đỡ số request.
create or replace function public.blog_increment_views_many(p_ids uuid[])
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if p_ids is null or array_length(p_ids, 1) is null then
    return;
  end if;
  update public.blog_posts b
     set views = b.views + c.cnt
    from (
      select t.id, count(*)::int as cnt
        from unnest(p_ids) as t(id)
       group by t.id
    ) c
   where b.id = c.id
     and b.published = true;
end;
$$;

revoke execute on function public.blog_increment_views_many(uuid[]) from public;
grant execute on function public.blog_increment_views_many(uuid[]) to anon, authenticated;

-- ==================== RPC: heartbeat "online" + lượt xem (gộp 1 request) ====================
-- Y HỆT public.users_heartbeat trong schema.sql, chỉ thêm phần cộng lượt xem cho
-- các bài trong p_view_ids. Nhờ vậy mỗi nhịp online 5 giây vừa cập nhật "đang online"
-- vừa đếm lượt xem trong CÙNG 1 request (không tạo thêm lượt gửi riêng).
-- Gọi với p_view_ids rỗng/null thì chỉ cập nhật online như cũ.
create or replace function public.users_heartbeat_views(p_uid text, p_view_ids uuid[] default '{}'::uuid[])
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

  if p_view_ids is not null and array_length(p_view_ids, 1) is not null then
    update public.blog_posts b
       set views = b.views + c.cnt
      from (
        select t.id, count(*)::int as cnt
          from unnest(p_view_ids) as t(id)
         group by t.id
      ) c
     where b.id = c.id
       and b.published = true;
  end if;
end;
$$;

revoke execute on function public.users_heartbeat_views(text, uuid[]) from public;
grant execute on function public.users_heartbeat_views(text, uuid[]) to authenticated;

-- ==================== RPC: hồ sơ tác giả (đồng bộ avatar) ====================
-- Ảnh đại diện tác giả lấy TRỰC TIẾP từ public.users.photo (đồng bộ "sống" theo
-- user trong DB: user đổi avatar -> bài viết cũ cũng tự hiển thị avatar mới).
-- Vì anon KHÔNG đọc được public.users (RLS users_select chỉ cho authenticated),
-- ta mở một đường công khai bằng function security definer — chỉ trả về những
-- user CÓ bài blog đã publish (không lộ toàn bộ bảng users).
create or replace function public.blog_authors()
returns table (id text, name text, photo text)
language sql
security definer
stable
set search_path = public
as $$
  select u.id::text, u.name, u.photo
  from public.users u
  where exists (
    select 1 from public.blog_posts b
    where b.author_id = u.id
      and b.published = true
  );
$$;

revoke execute on function public.blog_authors() from public;
grant execute on function public.blog_authors() to anon, authenticated;

-- ============================== GRANTS ==============================
-- Bảng tạo sau schema.sql nên phải cấp quyền lại (RLS vẫn là lớp chặn chính).
grant select on public.blog_posts to anon, authenticated;
grant insert, update, delete on public.blog_posts to authenticated;

-- ============================== REALTIME ==============================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'blog_posts'
  ) then
    alter publication supabase_realtime add table public.blog_posts;
  end if;
end $$;
