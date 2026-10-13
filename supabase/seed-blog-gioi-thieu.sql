-- ============================================================================
-- Seed: đăng bài giới thiệu LearnHub
-- ----------------------------------------------------------------------------
-- Cách dùng: dán vào Supabase Dashboard -> SQL Editor -> Run.
-- An toàn khi chạy lại: nếu đã có bài cùng tiêu đề thì KHÔNG tạo thêm.
-- Chạy bằng SQL Editor (quyền cao) nên không cần đăng nhập admin.
-- ============================================================================

insert into public.blog_posts
  (title, excerpt, content, cover_url, category, tags, author, published, pinned)
select
  'Giới thiệu về LearnHub - Hệ sinh thái học tập trực tuyến',
  'LearnHub gom tài liệu, lớp học, diễn đàn, flashcard và nhiều tiện ích học tập vào một nền tảng duy nhất dành cho học sinh, sinh viên.',
  $body$
<p><strong>LearnHub</strong> là hệ sinh thái học tập trực tuyến được xây dựng dành cho học sinh và sinh viên. Thay vì phải mở nhiều ứng dụng rời rạc, bạn có thể tìm tài liệu, vào lớp học, thảo luận trên diễn đàn và ôn tập bằng flashcard — tất cả trong cùng một nền tảng.</p>

<h2>Vì sao có LearnHub?</h2>
<p>Việc học ngày nay cần nhiều hơn một kho tài liệu. Học sinh thường phải dùng đủ loại công cụ: nơi lưu đề thi, nơi trao đổi bài, nơi ghi chú, nơi ôn tập. LearnHub ra đời để gom những nhu cầu đó lại, giúp việc học trở nên liền mạch và dễ tiếp cận hơn với mọi người.</p>

<h2>Các tính năng chính</h2>
<ul>
  <li><strong>Phòng học</strong> — không gian học tập theo lớp, nơi thầy cô và học sinh tương tác, quản lý nội dung và hoạt động học tập.</li>
  <li><strong>Tài liệu</strong> — thư viện tài liệu phong phú, giúp tra cứu và tải về nhanh chóng theo môn học, chủ đề.</li>
  <li><strong>FlashCard</strong> — bộ thẻ ghi nhớ thông minh, hỗ trợ ôn tập từ vựng, công thức và kiến thức cần nhớ.</li>
  <li><strong>Forum</strong> — diễn đàn để đặt câu hỏi, chia sẻ kinh nghiệm và trao đổi bài học cùng cộng đồng.</li>
  <li><strong>Blog</strong> — nơi cập nhật tin tức, hướng dẫn học tập và các bài viết hữu ích.</li>
  <li><strong>Lịch học</strong> và <strong>Leaderboard</strong> — theo dõi thời khóa biểu và thi đua học tập giữa các thành viên.</li>
</ul>

<h2>Dành cho ai?</h2>
<p>LearnHub phù hợp cho học sinh phổ thông, sinh viên và cả thầy cô giáo. Bạn có thể tạo tài khoản để dùng đầy đủ tính năng, hoặc ghé thăm với tư cách khách để đọc tài liệu và các bài viết công khai.</p>

<h2>Bắt đầu như thế nào?</h2>
<ol>
  <li><strong>Đăng ký tài khoản</strong> để lưu tiến trình và tham gia các lớp học.</li>
  <li><strong>Khám phá Tài liệu và FlashCard</strong> để bổ sung kiến thức cho môn học của bạn.</li>
  <li><strong>Tham gia Forum</strong> khi cần hỏi đáp, và theo dõi <strong>Blog</strong> để cập nhật điều mới.</li>
</ol>

<blockquote>Học tập hiệu quả bắt đầu từ việc có đúng công cụ và đúng cộng đồng. LearnHub mong được đồng hành cùng bạn trên chặng đường đó.</blockquote>

<p>Nếu bạn có ý tưởng hay góp ý, đừng ngần ngại gửi cho Ban Quản Trị qua trang <strong>Góp ý</strong>. Chúc bạn học tốt cùng LearnHub!</p>
$body$,
  'https://learnhubpf.pages.dev/pictures/logoweb.webp',
  'Tin tức',
  array['LearnHub','giới thiệu','học tập'],
  'Ban Quản Trị LearnHub',
  true,
  true
where not exists (
  select 1 from public.blog_posts
  where title = 'Giới thiệu về LearnHub - Hệ sinh thái học tập trực tuyến'
);

-- Xem lại kết quả
select id, title, category, published, pinned, views, created_at
from public.blog_posts
order by pinned desc, created_at desc;
