-- ============================================================================
-- LEARNHUB — QUẢN LÝ LỚP HỌC (SQL duy nhất, chạy 1 lần trên SQL Editor)
-- YÊU CẦU: đã chạy hàm public.is_teacher() trước (bước 1.1).
-- ============================================================================

-- ============ 1. BẢNG ============

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

alter table public.classes enable row level security;
alter table public.class_members enable row level security;

-- ============ 2. RLS: chặn truy cập trực tiếp (mọi thao tác qua RPC) ============

drop policy if exists classes_no_direct on public.classes;
create policy classes_no_direct on public.classes
  for all to authenticated using (false) with check (false);

drop policy if exists class_members_no_direct on public.class_members;
create policy class_members_no_direct on public.class_members
  for all to authenticated using (false) with check (false);

-- ============ 3. RPC ============

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
