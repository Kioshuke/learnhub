-- ============================================================================
-- Dọn dẹp sau khi chuyển ảnh sang link Google Drive MỚI (lh3)
-- ----------------------------------------------------------------------------
-- Bối cảnh:
--   - index.html, login.html và 3 file seed SQL đã dùng link Drive mới.
--   - Các bài blog trên DB đã được sửa tay (bước UPDATE bên dưới chỉ là
--     "lưới an toàn": chạy lại không đổi gì nếu không còn link cũ).
--   - Cần xóa file cũ trong Storage: bucket 'asset', thư mục 'pictures'.
--
-- Cách dùng: dán từng bước vào Supabase Dashboard -> SQL Editor -> Run.
-- BƯỚC 0: xác nhận bucket trước khi xóa file:
--   select id from storage.buckets;  -- bucket ảnh phải có id = 'asset'
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) (An toàn - có thể bỏ qua nếu DB đã sửa) Thay link cũ còn sót trong blog.
--    Quét cả cover_url lẫn content; khớp cả đường dẫn Storage cũ và
--    link lh3 cũ (4 ID loading1-4 + pictures/phonghoc.png).
-- ----------------------------------------------------------------------------
update public.blog_posts
   set cover_url = replace(
                     replace(
                       replace(
                         replace(
                           replace(
                             replace(
                               replace(
                                 replace(
                                   replace(cover_url,
                                     'pictures/loading1.jpg',
                                     'https://lh3.googleusercontent.com/d/1KXu3PtUSBqDufWnGy-m94xfpSAUkhCTB'),
                                   'pictures/loading2.jpg',
                                   'https://lh3.googleusercontent.com/d/1p3S5RZxOpH4MKnjqfZ_5yy1S_AULVYwr'),
                                 'pictures/loading3.jpg',
                                 'https://lh3.googleusercontent.com/d/18Ys0pOX7BV3zp4-hR4JWfuqi2r5cW-rT'),
                               'pictures/loading4.jpg',
                               'https://lh3.googleusercontent.com/d/1Frk1a3nQ4zoZLglAUfI2UCFY2m9cue9N'),
                             'pictures/phonghoc.png',
                             'https://lh3.googleusercontent.com/d/1U816Th98bG1m7HGfZNDgHEA7fyT-o8E7'),
                           'https://lh3.googleusercontent.com/d/1f3rEeg-z1nOk7uo8q4L_iT58Lj7u_LgK',
                           'https://lh3.googleusercontent.com/d/1KXu3PtUSBqDufWnGy-m94xfpSAUkhCTB'),
                         'https://lh3.googleusercontent.com/d/1XZPTLHhFprawMWYCqRKeMbX_8uRcnffd',
                         'https://lh3.googleusercontent.com/d/1p3S5RZxOpH4MKnjqfZ_5yy1S_AULVYwr'),
                       'https://lh3.googleusercontent.com/d/1MHymxXGWpJDsZZo_RSED_7v7pA3kvEJ8',
                       'https://lh3.googleusercontent.com/d/18Ys0pOX7BV3zp4-hR4JWfuqi2r5cW-rT'),
                     'https://lh3.googleusercontent.com/d/17FJKkeKnybZs4oqB51ub5hY4nRXG59Li',
                     'https://lh3.googleusercontent.com/d/1Frk1a3nQ4zoZLglAUfI2UCFY2m9cue9N'),
       content = replace(
                   replace(
                     replace(
                       replace(
                         replace(
                           replace(
                             replace(
                               replace(
                                 replace(content,
                                   'pictures/loading1.jpg',
                                   'https://lh3.googleusercontent.com/d/1KXu3PtUSBqDufWnGy-m94xfpSAUkhCTB'),
                                 'pictures/loading2.jpg',
                                 'https://lh3.googleusercontent.com/d/1p3S5RZxOpH4MKnjqfZ_5yy1S_AULVYwr'),
                               'pictures/loading3.jpg',
                               'https://lh3.googleusercontent.com/d/18Ys0pOX7BV3zp4-hR4JWfuqi2r5cW-rT'),
                             'pictures/loading4.jpg',
                             'https://lh3.googleusercontent.com/d/1Frk1a3nQ4zoZLglAUfI2UCFY2m9cue9N'),
                           'pictures/phonghoc.png',
                           'https://lh3.googleusercontent.com/d/1U816Th98bG1m7HGfZNDgHEA7fyT-o8E7'),
                         'https://lh3.googleusercontent.com/d/1f3rEeg-z1nOk7uo8q4L_iT58Lj7u_LgK',
                         'https://lh3.googleusercontent.com/d/1KXu3PtUSBqDufWnGy-m94xfpSAUkhCTB'),
                       'https://lh3.googleusercontent.com/d/1XZPTLHhFprawMWYCqRKeMbX_8uRcnffd',
                       'https://lh3.googleusercontent.com/d/1p3S5RZxOpH4MKnjqfZ_5yy1S_AULVYwr'),
                     'https://lh3.googleusercontent.com/d/1MHymxXGWpJDsZZo_RSED_7v7pA3kvEJ8',
                     'https://lh3.googleusercontent.com/d/18Ys0pOX7BV3zp4-hR4JWfuqi2r5cW-rT'),
                   'https://lh3.googleusercontent.com/d/17FJKkeKnybZs4oqB51ub5hY4nRXG59Li',
                   'https://lh3.googleusercontent.com/d/1Frk1a3nQ4zoZLglAUfI2UCFY2m9cue9N')
 where cover_url like '%pictures/loading%.jpg%'
    or cover_url like '%pictures/phonghoc.png%'
    or cover_url like '%lh3.googleusercontent.com/d/1f3rEeg-z1nOk7uo8q4L_iT58Lj7u_LgK%'
    or cover_url like '%lh3.googleusercontent.com/d/1XZPTLHhFprawMWYCqRKeMbX_8uRcnffd%'
    or cover_url like '%lh3.googleusercontent.com/d/1MHymxXGWpJDsZZo_RSED_7v7pA3kvEJ8%'
    or cover_url like '%lh3.googleusercontent.com/d/17FJKkeKnybZs4oqB51ub5hY4nRXG59Li%'
    or content like '%pictures/loading%.jpg%'
    or content like '%pictures/phonghoc.png%'
    or content like '%lh3.googleusercontent.com/d/1f3rEeg-z1nOk7uo8q4L_iT58Lj7u_LgK%'
    or content like '%lh3.googleusercontent.com/d/1XZPTLHhFprawMWYCqRKeMbX_8uRcnffd%'
    or content like '%lh3.googleusercontent.com/d/1MHymxXGWpJDsZZo_RSED_7v7pA3kvEJ8%'
    or content like '%lh3.googleusercontent.com/d/17FJKkeKnybZs4oqB51ub5hY4nRXG59Li%';

-- ----------------------------------------------------------------------------
-- 2) Kiểm tra: không bài nào còn link cũ (kết quả phải rỗng)
-- ----------------------------------------------------------------------------
select id, title, cover_url
from public.blog_posts
where cover_url like '%pictures/loading%.jpg%'
   or cover_url like '%pictures/phonghoc.png%'
   or cover_url like '%lh3.googleusercontent.com/d/1f3rEeg-z1nOk7uo8q4L_iT58Lj7u_LgK%'
   or cover_url like '%lh3.googleusercontent.com/d/1XZPTLHhFprawMWYCqRKeMbX_8uRcnffd%'
   or cover_url like '%lh3.googleusercontent.com/d/1MHymxXGWpJDsZZo_RSED_7v7pA3kvEJ8%'
   or cover_url like '%lh3.googleusercontent.com/d/17FJKkeKnybZs4oqB51ub5hY4nRXG59Li%'
   or content like '%pictures/loading%.jpg%'
   or content like '%pictures/phonghoc.png%'
   or content like '%lh3.googleusercontent.com/d/1f3rEeg-z1nOk7uo8q4L_iT58Lj7u_LgK%'
   or content like '%lh3.googleusercontent.com/d/1XZPTLHhFprawMWYCqRKeMbX_8uRcnffd%'
   or content like '%lh3.googleusercontent.com/d/1MHymxXGWpJDsZZo_RSED_7v7pA3kvEJ8%'
   or content like '%lh3.googleusercontent.com/d/17FJKkeKnybZs4oqB51ub5hY4nRXG59Li%';

-- ----------------------------------------------------------------------------
-- 3) Xem trước file sẽ xóa trong Storage (bucket 'asset', thư mục 'pictures')
--    Chạy và đối chiếu: chỉ đúng 4 file loading*.jpg + phonghoc.png.
-- ----------------------------------------------------------------------------
select name, created_at, metadata->>'size' as size_bytes
from storage.objects
where bucket_id = 'asset'
  and (name like 'pictures/loading%.jpg' or name = 'pictures/phonghoc.png');

-- ----------------------------------------------------------------------------
-- 4) Xóa file cũ trong Storage (CHỈ chạy sau khi bước 2 rỗng và đã
--    kiểm tra bước 3, và các trang đã hiển thị tốt bằng link Drive mới).
--    Lưu ý: xóa bản ghi này không giải phóng dung lượng object thật;
--    nếu muốn chắc chắn, xóa qua Storage UI (Dashboard) cũng được.
-- ----------------------------------------------------------------------------
delete from storage.objects
where bucket_id = 'asset'
  and (name like 'pictures/loading%.jpg' or name = 'pictures/phonghoc.png');
