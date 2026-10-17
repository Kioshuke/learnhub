-- ============================================================================
-- [FIX BUG #12]  DUMP object "schema drift"  —  CHỈ ĐỌC, KHÔNG thay đổi gì.
-- ----------------------------------------------------------------------------
-- Mục đích: lấy ĐÚNG định nghĩa thật của các object có trên DB live nhưng
-- không có CREATE trong repo, để chốt (idempotent) vào supabase/schema.sql.
--
-- CÁCH DÙNG: Supabase Dashboard -> SQL Editor -> dán TOÀN BỘ file này -> Run.
--            Copy kết quả của TẤT CẢ các tab trả về và gửi lại.
-- KHÔNG có câu lệnh nào ghi/xóa — chạy an toàn.
-- ============================================================================

-- 1) Cột của 3 bảng bị thiếu --------------------------------------------------
select '1_columns' as phan, table_name, ordinal_position, column_name,
       data_type, udt_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('whitelist_settings','video_cards','tailieu_docs')
order by table_name, ordinal_position;

-- 2) Ràng buộc PK / FK / UNIQUE / CHECK -------------------------------------
select '2_constraints' as phan, conrelid::regclass::text as table_name,
       conname, contype, pg_get_constraintdef(oid) as definition
from pg_constraint
where connamespace = 'public'::regnamespace
  and conrelid::regclass::text in ('whitelist_settings','video_cards','tailieu_docs')
order by 2, 3;

-- 3) Index -------------------------------------------------------------------
select '3_indexes' as phan, tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('whitelist_settings','video_cards','tailieu_docs')
order by 2, 3;

-- 4) RLS: bảng nào bật + policy ---------------------------------------------
select '4_rls_enabled' as phan, c.relname as table_name,
       c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
from pg_class c
where c.relnamespace = 'public'::regnamespace
  and c.relname in ('whitelist_settings','video_cards','tailieu_docs');

select '4_rls_policies' as phan, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('whitelist_settings','video_cards','tailieu_docs')
order by 2, 3;

-- 5) Định nghĩa ĐẦY ĐỦ các function bị thiếu (copy nguyên văn) ----------------
select '5_functions' as phan, p.proname,
       pg_get_function_identity_arguments(p.oid) as args,
       pg_get_functiondef(p.oid) as definition
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname in ('store_otp','verify_otp',
                    'list_tailieu_docs','teacher_upsert_tailieu_doc','teacher_delete_tailieu_doc')
order by p.proname;

-- 6) Bảng / view nào liên quan OTP (nếu hàm lưu vào bảng riêng) ---------------
select '6_otp_objects' as phan, table_name, table_type
from information_schema.tables
where table_schema = 'public'
  and (table_name ilike '%otp%' or table_name ilike '%code%')
order by 1, 2;
