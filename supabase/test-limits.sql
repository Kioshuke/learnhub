-- ============================================================================
-- test-limits.sql — GIỚI HẠN SỐ LẦN LÀM + MẬT KHẨU BÀI LÀM
-- ----------------------------------------------------------------------------
-- 2 CỘT MỚI cho public.test_sets (chạy độc lập, giống test-sets.sql,
-- KHÔNG sửa schema.sql):
--
--   max_attempts → số lần làm tối đa của MỖI học sinh.
--                  0 = KHÔNG giới hạn (mặc định — giữ nguyên hành vi cũ).
--   password     → mật khẩu để mở đề. '' (chuỗi rỗng) = không đặt mật khẩu.
--                  Cột này KHÔNG BAO GIỜ trả về cho học sinh: get_test_content
--                  chỉ trả 'has_password' cho mọi người, còn giá trị thật chỉ
--                  trả khi người gọi là giáo viên/admin (để mở form sửa đề).
--
-- Lượt làm được đếm bằng số DÒNG trong public.test_attempts của chính user đó
-- với test_id = 't:<uuid>' (mỗi lần NỘP BÀI = 1 lượt; mở đề rồi thoát không tính).
--
-- RPC mới:
--   test_attempt_status(p_de)              → trạng thái lượt làm + có mật khẩu hay không
--   verify_test_password(p_de, p_password) → kiểm tra mật khẩu (so sánh ở server)
--
-- RPC cập nhật (giữ nguyên tên, thêm cột trả về / tham số):
--   teacher_upsert_test_set  (+ p_max_attempts, p_password)
--   teacher_list_test_sets   (+ max_attempts, has_password)
--   list_published_test_sets (+ max_attempts, has_password)
--   get_test_content         (+ max_attempts, has_password, password[chỉ GV])
--
-- Idempotent: chạy lại nhiều lần an toàn.
-- ============================================================================

-- ============ 1. CỘT MỚI ============

alter table public.test_sets add column if not exists max_attempts int not null default 0;
alter table public.test_sets add column if not exists password     text not null default '';

-- Dữ liệu cũ: đảm bảo không âm / không NULL
update public.test_sets set max_attempts = 0 where max_attempts is null or max_attempts < 0;
update public.test_sets set password = '' where password is null;

-- ============ 2. teacher_upsert_test_set (+ giới hạn lượt + mật khẩu) ============

drop function if exists public.teacher_upsert_test_set(uuid, text, text, text, jsonb, int, int, boolean, boolean, boolean, text, text, boolean, int, timestamptz, timestamptz);
drop function if exists public.teacher_upsert_test_set(uuid, text, text, text, jsonb, int, int, boolean, boolean, boolean, text, text, boolean, int, timestamptz, timestamptz, int, text);

create or replace function public.teacher_upsert_test_set(
  p_id              uuid default null,
  p_subject         text default '',
  p_name            text default '',
  p_description     text default '',
  p_content         jsonb default '[]'::jsonb,
  p_minutes         int default null,
  p_score           int default null,
  p_shuffle_q       boolean default null,
  p_shuffle_a       boolean default null,
  p_is_complete     boolean default null,
  p_show_score      text default null,
  p_show_answers    text default null,
  p_subtest_enabled boolean default null,
  p_subtest_count   int default null,
  p_start_at        timestamptz default null,
  p_end_at          timestamptz default null,
  p_max_attempts    int default null,
  p_password        text default null
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_total_questions int;
  v_subtest_enabled boolean := coalesce(p_subtest_enabled, false);
  v_subtest_count   int;
  v_max_attempts    int;
  v_password        text;
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

  -- Đề con: chỉ lưu số câu khi bật; số câu phải nằm trong 1..tổng số câu của đề.
  select coalesce(sum(coalesce(jsonb_array_length(sec->'questions'), 0)), 0)::int
    into v_total_questions
    from jsonb_array_elements(p_content) sec;
  if v_subtest_enabled then
    if p_subtest_count is null or p_subtest_count < 1 or p_subtest_count > v_total_questions then
      return jsonb_build_object('ok', false, 'error', 'invalid_subtest_count',
                                'total', v_total_questions);
    end if;
    v_subtest_count := p_subtest_count;
  else
    v_subtest_count := null;
  end if;

  -- Khoảng thời gian mở đề: nếu có đủ 2 mốc thì mốc kết thúc phải SAU mốc bắt đầu.
  if p_start_at is not null and p_end_at is not null and p_end_at <= p_start_at then
    return jsonb_build_object('ok', false, 'error', 'invalid_time_range');
  end if;

  -- [Số lần làm] 0 = không giới hạn; không cho số âm.
  v_max_attempts := greatest(0, coalesce(p_max_attempts, 0));
  -- [Mật khẩu] '' = không đặt mật khẩu. Truyền NULL = giữ nguyên mật khẩu cũ.
  v_password := btrim(coalesce(p_password, ''));

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
    insert into public.test_sets (teacher_id, subject, name, description, content, minutes, score, shuffle_q, shuffle_a, is_complete, show_score, show_answers, subtest_enabled, subtest_count, start_at, end_at, max_attempts, password)
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
      coalesce(p_is_complete, false),
      coalesce(p_show_score, 'always'),
      coalesce(p_show_answers, 'always'),
      v_subtest_enabled,
      v_subtest_count,
      p_start_at,
      p_end_at,
      v_max_attempts,
      v_password
    )
    returning id into p_id;
    return jsonb_build_object('ok', true, 'id', p_id);
  end if;
  update public.test_sets
     set subject         = btrim(p_subject),
         name            = btrim(p_name),
         description     = btrim(coalesce(p_description, '')),
         content         = p_content,
         minutes         = coalesce(p_minutes, minutes),
         score           = coalesce(p_score, score),
         shuffle_q       = coalesce(p_shuffle_q, shuffle_q),
         shuffle_a       = coalesce(p_shuffle_a, shuffle_a),
         is_complete     = coalesce(p_is_complete, is_complete),
         show_score      = coalesce(p_show_score, show_score),
         show_answers    = coalesce(p_show_answers, show_answers),
         subtest_enabled = v_subtest_enabled,
         subtest_count   = v_subtest_count,
         start_at        = p_start_at,
         end_at          = p_end_at,
         max_attempts    = case when p_max_attempts is null then max_attempts else v_max_attempts end,
         password        = case when p_password is null then password else v_password end,
         updated_at      = now()
   where id = p_id
     and (teacher_id = auth.uid()::text or public.is_teacher());
  return jsonb_build_object('ok', true, 'id', p_id);
end;
$$;
revoke execute on function public.teacher_upsert_test_set(uuid, text, text, text, jsonb, int, int, boolean, boolean, boolean, text, text, boolean, int, timestamptz, timestamptz, int, text) from public;
grant execute on function public.teacher_upsert_test_set(uuid, text, text, text, jsonb, int, int, boolean, boolean, boolean, text, text, boolean, int, timestamptz, timestamptz, int, text) to authenticated;

-- ============ 3. teacher_list_test_sets (+ 2 cột) ============
-- create or replace không đổi được kiểu trả về → drop rồi tạo lại.

drop function if exists public.teacher_list_test_sets();
create or replace function public.teacher_list_test_sets()
returns table (
  set_id uuid, subject text, name text, description text, minutes int, score int,
  shuffle_q boolean, shuffle_a boolean, is_complete boolean,
  show_score text, show_answers text, subtest_enabled boolean, subtest_count int,
  question_count bigint, start_at timestamptz, end_at timestamptz,
  created_at timestamptz, updated_at timestamptz,
  max_attempts int, has_password boolean
)
language sql stable security definer
set search_path = public
as $$
  select s.id,
         btrim(coalesce(s.subject, '')),
         btrim(coalesce(s.name, '')),
         btrim(coalesce(s.description, '')),
         s.minutes, s.score, s.shuffle_q, s.shuffle_a, s.is_complete,
         s.show_score, s.show_answers, s.subtest_enabled, s.subtest_count,
         (select coalesce(sum(coalesce(jsonb_array_length(x->'questions'), 0)), 0)::bigint
            from jsonb_array_elements(s.content) x),
         s.start_at, s.end_at,
         s.created_at, s.updated_at,
         greatest(0, coalesce(s.max_attempts, 0)),
         (btrim(coalesce(s.password, '')) <> '')
    from public.test_sets s
   order by s.subject, s.created_at asc;
$$;
revoke execute on function public.teacher_list_test_sets() from public;
grant execute on function public.teacher_list_test_sets() to authenticated;

-- ============ 4. list_published_test_sets (+ 2 cột) ============
-- Phòng Học dùng để vẽ card: chỉ cần biết có giới hạn lượt / có mật khẩu hay không.

drop function if exists public.list_published_test_sets();
create or replace function public.list_published_test_sets()
returns table (
  set_id uuid, subject text, name text, description text, minutes int, score int,
  question_count bigint, is_complete boolean, start_at timestamptz, end_at timestamptz,
  created_at timestamptz, max_attempts int, has_password boolean
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
         s.start_at, s.end_at,
         s.created_at,
         greatest(0, coalesce(s.max_attempts, 0)),
         (btrim(coalesce(s.password, '')) <> '')
    from public.test_sets s
   order by s.subject, s.created_at asc;
$$;
revoke execute on function public.list_published_test_sets() from public;
grant execute on function public.list_published_test_sets() to anon, authenticated;

-- ============ 5. get_test_content (+ max_attempts / has_password / password) ============
-- password CHỈ trả khi người gọi là giáo viên (mở form sửa đề).
-- Học sinh chỉ nhận has_password (true/false) để hiện ô nhập mật khẩu.

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
  v_is_teacher boolean := public.is_teacher();
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
    'shuffle_a', v_row.shuffle_a,
    'show_score', v_row.show_score,
    'show_answers', v_row.show_answers,
    'subtest_enabled', v_row.subtest_enabled,
    'subtest_count', v_row.subtest_count,
    'start_at', v_row.start_at,
    'end_at', v_row.end_at,
    'max_attempts', greatest(0, coalesce(v_row.max_attempts, 0)),
    'has_password', (btrim(coalesce(v_row.password, '')) <> ''),
    -- Chỉ giáo viên/admin nhận được mật khẩu thật (để hiện lại trong form sửa đề).
    'password', case when v_is_teacher then coalesce(v_row.password, '') else null end
  );
end;
$$;
revoke execute on function public.get_test_content(text) from public;
grant execute on function public.get_test_content(text) to anon, authenticated;

-- ============ 6. test_attempt_status — trạng thái lượt làm của CHÍNH người gọi ============
-- Dùng auth.uid() (không tin tham số từ client) để đếm số lần đã nộp.

drop function if exists public.test_attempt_status(text);
create or replace function public.test_attempt_status(p_de text)
returns jsonb
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_key  text := btrim(coalesce(p_de, ''));
  v_id   uuid;
  v_row  public.test_sets%rowtype;
  v_uid  text := auth.uid()::text;
  v_used int := 0;
  v_max  int;
begin
  if v_key like 't:%' then
    v_key := substr(v_key, 3);
  end if;
  begin
    v_id := v_key::uuid;
  exception when others then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end;

  select * into v_row from public.test_sets where id = v_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_uid is not null and to_regclass('public.test_attempts') is not null then
    select count(*)::int
      into v_used
      from public.test_attempts a
     where a.user_id = v_uid
       and (a.test_id = v_row.id::text or a.test_id = 't:' || v_row.id::text);
  end if;

  v_max := greatest(0, coalesce(v_row.max_attempts, 0));

  return jsonb_build_object(
    'ok', true,
    'authenticated', (v_uid is not null),
    'max_attempts', v_max,
    'attempts_used', v_used,
    'remaining', case when v_max > 0 then greatest(0, v_max - v_used) else null end,
    'has_password', (btrim(coalesce(v_row.password, '')) <> '')
  );
end;
$$;
revoke execute on function public.test_attempt_status(text) from public;
grant execute on function public.test_attempt_status(text) to anon, authenticated;

-- ============ 7. verify_test_password — so mật khẩu ở server ============
-- Luôn trả ok=true (để client phân biệt "sai mật khẩu" với "lỗi mạng"),
-- valid=true/false là kết quả so sánh.

drop function if exists public.verify_test_password(text, text);
create or replace function public.verify_test_password(p_de text, p_password text)
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

  select * into v_row from public.test_sets where id = v_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  -- Đề không đặt mật khẩu → luôn hợp lệ (tránh chặn nhầm)
  if btrim(coalesce(v_row.password, '')) = '' then
    return jsonb_build_object('ok', true, 'valid', true, 'required', false);
  end if;

  return jsonb_build_object(
    'ok', true,
    'valid', (btrim(coalesce(p_password, '')) = btrim(v_row.password)),
    'required', true
  );
end;
$$;
revoke execute on function public.verify_test_password(text, text) from public;
grant execute on function public.verify_test_password(text, text) to anon, authenticated;

-- ============ 8. CHẶN NỘP VƯỢT SỐ LƯỢT (tầng cuối ở DB) ============
-- Cổng ở client đã chặn trước khi vào làm, nhưng vẫn có thể lách bằng nhiều tab
-- hoặc devtools. Trigger này chặn insert khi học sinh đã đủ số lần nộp.
-- Bảng test_attempts cũ / đề không phải 't:<uuid>' → bỏ qua, không chặn.

create or replace function public.test_attempts_enforce_limit()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_test_id uuid;
  v_max int;
  v_used int;
begin
  begin
    v_test_id := regexp_replace(coalesce(new.test_id, ''), '^t:', '')::uuid;
  exception when others then
    return new;  -- test_id không phải đề trong DB → không áp giới hạn
  end;

  select greatest(0, coalesce(max_attempts, 0))
    into v_max
    from public.test_sets
   where id = v_test_id;
  if not found or v_max = 0 then
    return new;  -- đề không giới hạn
  end if;

  select count(*)::int
    into v_used
    from public.test_attempts a
   where a.user_id = new.user_id
     and (a.test_id = v_test_id::text or a.test_id = 't:' || v_test_id::text);

  if v_used >= v_max then
    raise exception 'attempt_limit_reached' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke execute on function public.test_attempts_enforce_limit() from public;

-- Gắn trigger (bỏ qua nếu bảng test_attempts chưa được tạo — chạy test-attempts.sql trước).
do $$
begin
  if to_regclass('public.test_attempts') is null then
    raise notice 'Bỏ qua trigger giới hạn lượt: bảng public.test_attempts chưa tồn tại.';
  else
    execute 'drop trigger if exists trg_test_attempts_enforce_limit on public.test_attempts';
    execute 'create trigger trg_test_attempts_enforce_limit before insert on public.test_attempts '
         || 'for each row execute function public.test_attempts_enforce_limit()';
  end if;
end $$;

-- ============ 9. Nạp lại schema cache cho PostgREST ============
-- Để API thấy ngay 2 cột mới + các RPC vừa tạo/đổi.
notify pgrst, 'reload schema';
