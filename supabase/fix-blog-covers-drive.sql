-- ============================================================================
-- Chuyển ảnh bìa blog đã đăng từ pictures/loading*.jpg sang Google Drive
-- ----------------------------------------------------------------------------
-- Ảnh dùng link trực tiếp (lh3) để thẻ <img>/CSS hiển thị được.
-- Cách dùng: dán vào Supabase Dashboard -> SQL Editor -> Run (chạy 1 lần).
-- An toàn khi chạy lại: chỉ thay đúng các link cũ, không đụng ảnh khác.
-- ============================================================================

update public.blog_posts
   set cover_url = replace(
                     replace(
                       replace(
                         replace(cover_url,
                           'pictures/loading1.jpg',
                           'https://lh3.googleusercontent.com/d/1f3rEeg-z1nOk7uo8q4L_iT58Lj7u_LgK'),
                         'pictures/loading2.jpg',
                         'https://lh3.googleusercontent.com/d/1XZPTLHhFprawMWYCqRKeMbX_8uRcnffd'),
                       'pictures/loading3.jpg',
                       'https://lh3.googleusercontent.com/d/1MHymxXGWpJDsZZo_RSED_7v7pA3kvEJ8'),
                     'pictures/loading4.jpg',
                     'https://lh3.googleusercontent.com/d/17FJKkeKnybZs4oqB51ub5hY4nRXG59Li')
 where cover_url like '%pictures/loading1.jpg%'
    or cover_url like '%pictures/loading2.jpg%'
    or cover_url like '%pictures/loading3.jpg%'
    or cover_url like '%pictures/loading4.jpg%';

-- Xem lại: con_link_cu = false là đã chuyển xong
select id,
       title,
       cover_url,
       (cover_url like '%pictures/loading%.jpg%') as con_link_cu
from public.blog_posts
order by pinned desc, created_at desc;
