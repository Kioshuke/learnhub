-- ============================================================================
-- LEARNHUB — BỔ SUNG/SỬA RPC LỚP HỌC (04/09)
-- Chạy 1 lần trên Supabase SQL Editor, CHÍNH XÁC theo thứ tự dưới đây.
-- YÊU CẦU: đã có public.is_teacher() (bước 1.1) và đã chạy classes.sql trước đó.
-- ============================================================================

-- ============ 1. SỬA join_class_by_code: chặn giáo viên tự vào lớp mình ============
create or replace function public.join_class_by_code(p_code text)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid text := auth.uid()::text;
  v_class uuid;
  v_owner text;
  v_exist uuid;
begin
  if v_uid is null or btrim(coalesce(p_code,'')) = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  select c.id into v_class from public.classes c where c.invite_code = upper(btrim(p_code));
  if v_class is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  select teacher_id into v_owner from public.classes where id = v_class;
  if v_owner = v_uid then
    return jsonb_build_object('ok', false, 'error', 'self');
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

-- ============ 2. THÊM delete_class: giáo viên xoá lớp (cascade xoá thành viên) ============
create or replace function public.delete_class(p_class_id uuid)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
begin
  if p_class_id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  if not exists (select 1 from public.classes c where c.id = p_class_id and c.teacher_id = auth.uid()::text) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  delete from public.classes where id = p_class_id;
  return jsonb_build_object('ok', true);
end;
$$;
revoke execute on function public.delete_class(uuid) from public;
grant execute on function public.delete_class(uuid) to authenticated;

-- ============ 3. THÊM user_classes: lớp của 1 user cụ thể (Hồ Sơ Chi Tiết) ============
-- Chỉ user đó tự xem, hoặc giáo viên/admin xem (để theo dõi học sinh trong lớp).
create or replace function public.user_classes(p_user_id text)
returns table(class_name text, block text, status text, joined_at timestamptz, teacher_name text)
language sql stable security definer
set search_path = public
as $$
  select c.name, c.block, cm.status, cm.joined_at, coalesce(u.name,'') as teacher_name
    from public.class_members cm
    join public.classes c on c.id = cm.class_id
    left join public.users u on u.id = c.teacher_id
   where cm.user_id = p_user_id and p_user_id is not null
     and (p_user_id = auth.uid()::text or public.is_teacher())
   order by cm.joined_at desc;
$$;
revoke execute on function public.user_classes(text) from public;
grant execute on function public.user_classes(text) to authenticated;
