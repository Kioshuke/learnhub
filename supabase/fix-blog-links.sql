-- ============================================================================
-- Sửa link trong các bài blog ĐÃ ĐĂNG
-- ----------------------------------------------------------------------------
-- Đổi link mở thẳng file riêng (bị lỗi đăng nhập) sang deep link của web chính:
--   https://learnhubpf.pages.dev/?open=...
-- Cách dùng: dán vào Supabase Dashboard -> SQL Editor -> Run (chạy 1 lần).
-- An toàn khi chạy lại: sau lần đầu sẽ không còn link cũ để thay.
-- ============================================================================

update public.blog_posts
   set content = replace(
                   replace(
                     replace(
                       replace(content,
                         'https://learnhubpf.pages.dev/element/forum.html',
                         'https://learnhubpf.pages.dev/?open=forum'),
                       'https://learnhubpf.pages.dev/element/hubfile.html',
                       'https://learnhubpf.pages.dev/?open=tai-lieu'),
                     'https://learnhubpf.pages.dev/element/phong-hoc.html',
                     'https://learnhubpf.pages.dev/?open=phong-hoc'),
                   'https://learnhubpf.pages.dev/flashcard/hub.html',
                   'https://learnhubpf.pages.dev/?open=flash')
 where content like '%learnhubpf.pages.dev/element/%'
    or content like '%learnhubpf.pages.dev/flashcard/hub.html%';

-- Xem lại: con_link_cu = false là đã sửa xong
select id,
       title,
       (content like '%learnhubpf.pages.dev/element/%'
        or content like '%learnhubpf.pages.dev/flashcard/hub.html%') as con_link_cu,
       (content ~ '\?open=(flash|forum|tai-lieu|phong-hoc)') as co_deep_link
from public.blog_posts
order by pinned desc, created_at desc;
