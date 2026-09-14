-- ============================================================================
-- test-sets.sql — BÀI KIỂM TRA (test_sets) — kho đề + card trong Phòng Học.
-- ----------------------------------------------------------------------------
-- BẢNG MỚI, chạy độc lập (giống subject-notices.sql), không sửa schema.sql.
-- Mỗi dòng = 1 bài kiểm tra = 1 card "Làm bài" đúng tab môn trong Phòng Học:
--   subject     → hiện card ở tab môn đó (khớp tên môn trong PHONGHOC_SUBJECTS)
--   name        → tiêu đề card
--   description → mô tả card
--   content     → nội dung đề (đúng docs/FORMAT-DE-THI.md), đã xáo trộn nếu có
--   minutes     → thời gian làm bài (0 = không giới hạn)
--   score       → điểm tối đa (thang 10 mặc định)
--   shuffle_q/A → cấu hình để mở lại sửa không mất thiết lập
--   is_complete → trạng thái "Chưa hoàn thành"/"Hoàn thành" (badge trên card
--                 Phòng Học + web giáo viên). MỌI bài đều HIỆN trong Phòng Học —
--                 không còn trạng thái ẩn.
-- Thứ tự hiển thị: THEO THỜI GIAN TẠO (created_at ASC) — ai up trước xếp trước.
-- Không có cột attempts (sẽ thống kê qua test_attempts ở GĐ2) và sort_order.
-- Idempotent: chạy lại nhiều lần an toàn.
-- ============================================================================

-- ============ 1. BẢNG ============

create table if not exists public.test_sets (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  text not null,
  subject     text not null default '',
  name        text not null default '',
  description text not null default '',
  content     jsonb not null default '[]'::jsonb,
  minutes     int not null default 0,
  score       int not null default 10,
  shuffle_q   boolean not null default true,
  shuffle_a   boolean not null default true,
  is_complete boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.test_sets add column if not exists minutes int not null default 0;
alter table public.test_sets add column if not exists score int not null default 10;
alter table public.test_sets add column if not exists shuffle_q boolean not null default true;
alter table public.test_sets add column if not exists shuffle_a boolean not null default true;
alter table public.test_sets add column if not exists is_complete boolean not null default false;

create index if not exists test_sets_teacher_idx on public.test_sets (teacher_id);
create index if not exists test_sets_subject_idx on public.test_sets (subject);

alter table public.test_sets enable row level security;

-- ============ 2. RLS: chặn truy cập trực tiếp (mọi thao tác qua RPC) ============

drop policy if exists test_sets_no_direct on public.test_sets;
create policy test_sets_no_direct on public.test_sets
  for all to authenticated using (false) with check (false);

-- ============ 3. RPC ============

-- Xoá các hàm BẢN CŨ (chữ ký khác) trước khi tạo lại —
-- create or replace function không cho đổi kiểu trả về.
drop function if exists public.create_test_set(text, text, text, text, jsonb);
drop function if exists public.create_test_set(text, text, text, text, jsonb, boolean);
drop function if exists public.update_test_set(uuid, text, text, text, text, jsonb);
drop function if exists public.update_test_set(uuid, text, text, text, text, jsonb, boolean);
drop function if exists public.delete_test_set(uuid);
drop function if exists public.teacher_test_sets();
drop function if exists public.reorder_test_sets(jsonb);

-- Tạo mới hoặc cập nhật 1 bài kiểm tra (cơ chế upsert như teacher_upsert_video_card).
-- Lấy teacher_id từ auth.uid(); sửa chỉ chủ sở hữu hoặc giáo viên.
drop function if exists public.teacher_upsert_test_set(uuid, text, text, text, jsonb, int, int, boolean, boolean, boolean);
create or replace function public.teacher_upsert_test_set(
  p_id          uuid default null,
  p_subject     text default '',
  p_name        text default '',
  p_description text default '',
  p_content     jsonb default '[]'::jsonb,
  p_minutes     int default null,
  p_score       int default null,
  p_shuffle_q   boolean default null,
  p_shuffle_a   boolean default null,
  p_is_complete boolean default null
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_teacher() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if btrim(coalesce(p_subject, '')) = '' then
    return jsonb_build_object('ok', false, 'error', 'empty_subject');
  end if;
  if btrim(coalesce(p_name, '')) = '' then
    return jsonb_build_object('ok', false, 'error', 'empty_name');
  end if;
  if p_content is null or jsonb_typeof(p_content) <> 'array' or jsonb_array_length(p_content) = 0 then
    return jsonb_build_object('ok', false, 'error', 'empty_content');
  end if;

  -- [Chặn cấu trúc] Khi đề đã xuất bản (is_complete=true), không cho phép thay đổi cấu trúc.
  if p_id is not null then
    perform 1 from public.test_sets
     where id = p_id
       and is_complete = true
       and public.test_structure_signature(content) <> public.test_structure_signature(p_content);
    if found then
      return jsonb_build_object('ok', false, 'error', 'structure_locked');
    end if;
  end if;

  if p_id is null then
    insert into public.test_sets (teacher_id, subject, name, description, content, minutes, score, shuffle_q, shuffle_a, is_complete)
    values (
      auth.uid()::text,
      btrim(p_subject),
      btrim(p_name),
      btrim(coalesce(p_description, '')),
      p_content,
      coalesce(p_minutes, 0),
      coalesce(p_score, 10),
      coalesce(p_shuffle_q, true),
      coalesce(p_shuffle_a, true),
      coalesce(p_is_complete, false)
    )
    returning id into p_id;
    return jsonb_build_object('ok', true, 'id', p_id);
  end if;
  update public.test_sets
     set subject     = btrim(p_subject),
         name        = btrim(p_name),
         description = btrim(coalesce(p_description, '')),
         content     = p_content,
         minutes     = coalesce(p_minutes, minutes),
         score       = coalesce(p_score, score),
         shuffle_q   = coalesce(p_shuffle_q, shuffle_q),
         shuffle_a   = coalesce(p_shuffle_a, shuffle_a),
         is_complete = coalesce(p_is_complete, is_complete),
         updated_at  = now()
   where id = p_id
     and (teacher_id = auth.uid()::text or public.is_teacher());
  return jsonb_build_object('ok', true, 'id', p_id);
end;
$$;
revoke execute on function public.teacher_upsert_test_set(uuid, text, text, text, jsonb, int, int, boolean, boolean, boolean) from public;
grant execute on function public.teacher_upsert_test_set(uuid, text, text, text, jsonb, int, int, boolean, boolean, boolean) to authenticated;

-- Danh sách bài kiểm tra cho trang giáo viên (kèm question_count).
-- Sắp xếp theo thời gian tạo — ai up trước xếp trước.
create or replace function public.teacher_list_test_sets()
returns table (
  set_id uuid, subject text, name text, description text, minutes int, score int,
  shuffle_q boolean, shuffle_a boolean, is_complete boolean,
  question_count bigint, created_at timestamptz, updated_at timestamptz
)
language sql stable security definer
set search_path = public
as $$
  select s.id,
         btrim(coalesce(s.subject, '')),
         btrim(coalesce(s.name, '')),
         btrim(coalesce(s.description, '')),
         s.minutes, s.score, s.shuffle_q, s.shuffle_a, s.is_complete,
         (select coalesce(sum(coalesce(jsonb_array_length(x->'questions'), 0)), 0)::bigint
            from jsonb_array_elements(s.content) x),
         s.created_at, s.updated_at
    from public.test_sets s
   order by s.subject, s.created_at asc;
$$;
grant execute on function public.teacher_list_test_sets() to authenticated;

-- Xoá 1 bài kiểm tra (chỉ chủ sở hữu hoặc giáo viên).
create or replace function public.teacher_delete_test_set(p_id uuid)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_teacher() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  delete from public.test_sets
   where id = p_id
     and (teacher_id = auth.uid()::text or public.is_teacher());
  return jsonb_build_object('ok', true);
end;
$$;
revoke execute on function public.teacher_delete_test_set(uuid) from public;
grant execute on function public.teacher_delete_test_set(uuid) to authenticated;

-- Đổi trạng thái "Chưa hoàn thành"/"Hoàn thành" (không ảnh hưởng hiển thị —
-- bài nào cũng hiện card trong Phòng Học).
create or replace function public.teacher_set_test_complete(p_id uuid, p_is_complete boolean)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_teacher() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  update public.test_sets
     set is_complete = coalesce(p_is_complete, false),
         updated_at  = now()
   where id = p_id
     and (teacher_id = auth.uid()::text or public.is_teacher());
  return jsonb_build_object('ok', true);
end;
$$;
revoke execute on function public.teacher_set_test_complete(uuid, boolean) from public;
grant execute on function public.teacher_set_test_complete(uuid, boolean) to authenticated;

-- ============ Hàm tính chữ ký cấu trúc đề (chỉ đếm số lượng, không phụ thuộc nội dung text) ============
-- Chặn thay đổi cấu trúc (thêm/bớt câu/section/đáp án/mệnh đề/ô trống) khi đề ĐÃ XUẤT BẢN.
-- Không nhìn vào text → sửa nội dung câu hỏi/đáp án/điểm/đúng-sai vẫn pass.
-- Mỗi section sinh 1 dòng "q=<số câu>;<danh sách loại_câu:slồ_mục_con>" rồi SẮP XẾP toàn bộ,
-- nên ĐỔI CHỖ section/câu không làm đổi chữ ký (không tính là đổi cấu trúc).
drop function if exists public.test_structure_signature(jsonb);
create or replace function public.test_structure_signature(p_content jsonb)
returns text
language sql stable security definer
set search_path = public
as $$
  select coalesce(string_agg(sec_sig, e'\n' order by sec_sig), '[]')
  from (
    select
      ('q=' || coalesce(jsonb_array_length(s.sec->'questions'), 0) || ';') ||
      coalesce((
        select string_agg(q_sig, ',' order by q_sig)
        from (
          select
            case coalesce(q->>'type', '?')
              when 'multiple'   then 'multiple:' || coalesce(jsonb_array_length(q->'answers'), 0)
              when 'true_false' then 'true_false:' || coalesce(jsonb_array_length(q->'subQuestions'), 0)
              when 'passage'    then 'passage:' || coalesce(jsonb_array_length(q->'subQuestions'), 0)
              when 'cloze'      then 'cloze:' || coalesce(jsonb_array_length(q->'blanks'), 0)
              else coalesce(q->>'type', '?') || ':0'
            end as q_sig
          from jsonb_array_elements(s.sec->'questions') q
        ) t
      ), '') as sec_sig
    from jsonb_array_elements(p_content) s(sec)
  ) x;
$$;
grant execute on function public.test_structure_signature(jsonb) to authenticated;

-- Danh sách bài kiểm tra cho Phòng Học (chỉ meta, không gửi nội dung đề).
-- TRẢ TẤT CẢ bài — không ẩn; is_complete chỉ là trạng thái "Hoàn thành"/"Chưa hoàn thành"
-- (front-end hiện nhãn + khoá nút Làm bài cho bài chưa hoàn thành).
-- Thứ tự theo thời gian tạo (up trước xếp trước).
drop function if exists public.list_published_test_sets();
create or replace function public.list_published_test_sets()
returns table (
  set_id uuid, subject text, name text, description text, minutes int, score int,
  question_count bigint, is_complete boolean, created_at timestamptz
)
language sql stable security definer
set search_path = public
as $$
  select s.id,
         btrim(coalesce(s.subject, '')),
         btrim(coalesce(s.name, '')),
         btrim(coalesce(s.description, '')),
         s.minutes, s.score,
         (select coalesce(sum(coalesce(jsonb_array_length(x->'questions'), 0)), 0)::bigint
            from jsonb_array_elements(s.content) x),
         s.is_complete,
         s.created_at
    from public.test_sets s
   order by s.subject, s.created_at asc;
$$;
revoke execute on function public.list_published_test_sets() from public;
grant execute on function public.list_published_test_sets() to anon, authenticated;

-- Lấy nội dung 1 đề cho engine. p_de có dạng "t:<uuid>" (prefix t: phân biệt DB/file).
-- Mọi bài đều đọc được — không còn filter ẩn/hiện. anon + authenticated đều đọc được.
drop function if exists public.get_test_content(text);
create or replace function public.get_test_content(p_de text)
returns jsonb
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_key text := btrim(coalesce(p_de, ''));
  v_id  uuid;
  v_row public.test_sets%rowtype;
begin
  if v_key like 't:%' then
    v_key := substr(v_key, 3);
  end if;
  begin
    v_id := v_key::uuid;
  exception when others then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end;
  select * into v_row
    from public.test_sets
   where id = v_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  return jsonb_build_object(
    'ok', true,
    'content', v_row.content,
    'subject', v_row.subject,
    'name', v_row.name,
    'description', v_row.description,
    'minutes', v_row.minutes,
    'score', v_row.score,
    'shuffle_q', v_row.shuffle_q,
    'shuffle_a', v_row.shuffle_a
  );
end;
$$;
revoke execute on function public.get_test_content(text) from public;
grant execute on function public.get_test_content(text) to anon, authenticated;