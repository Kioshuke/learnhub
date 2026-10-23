-- ============================================================================
-- Seed: bài blog giới thiệu các tính năng bổ trợ của LearnHub
--        (Hubie AI, Forum, Thư viện tài liệu, Hồ sơ, Bảng xếp hạng, Trợ giúp)
-- ----------------------------------------------------------------------------
-- Cách dùng: dán vào Supabase Dashboard -> SQL Editor -> Run.
-- An toàn khi chạy lại: nếu đã có bài cùng tiêu đề thì KHÔNG tạo thêm.
-- Chạy bằng SQL Editor (quyền cao) nên không cần đăng nhập admin.
-- ============================================================================

insert into public.blog_posts
  (title, excerpt, content, cover_url, category, tags, author, published, pinned)
select
  'Các tính năng bổ trợ của LearnHub: Hubie AI, Forum, Tài liệu và Hồ sơ học viên',
  'Ngoài Phòng học và Flashcard, LearnHub còn có Hubie AI, Forum, Thư viện tài liệu, Hồ sơ học viên, Bảng xếp hạng và Trung tâm trợ giúp. Cùng khám phá cách dùng từng tính năng để việc học thuận tiện hơn.',
  $body$
<p>Phòng học và Flashcard là hai tính năng học tập chính của LearnHub. Nhưng để việc học diễn ra liền mạch, nền tảng còn có một bộ <strong>tính năng bổ trợ</strong>: hỏi đáp với trợ lý AI, trao đổi cùng cộng đồng, tra cứu tài liệu, theo dõi tiến độ cá nhân và tìm sự hỗ trợ khi cần. Bài viết này giới thiệu từng tính năng và cách dùng chúng hiệu quả.</p>

<h2>1. Hubie AI — trợ lý học tập 24/7</h2>
<p>Hubie là trợ lý ảo AI của LearnHub, xuất hiện dưới dạng bong bóng chat ở góc màn hình trên các trang chính. Bạn có thể mở Hubie ngay khi đang học để hỏi bài mà không phải rời khỏi nội dung.</p>

<h3>Chat hỏi đáp bài vở</h3>
<ul>
  <li><strong>Hỏi trực tiếp</strong> các môn như Toán, Lý, Hoá, Sinh, Văn, Sử, Địa, Tiếng Anh… Hubie trả lời ngay trong khung chat, kèm giải thích từng bước khi cần.</li>
  <li><strong>Gửi ảnh bài tập</strong> bằng nút đính kèm hoặc dán trực tiếp bằng <em>Ctrl + V</em>. Hubie đọc nội dung trong ảnh và hướng dẫn cách giải.</li>
  <li><strong>Sao chép câu trả lời</strong> bằng một cú bấm để dán vào vở hoặc ghi chú.</li>
  <li><strong>Lưu lịch sử trò chuyện</strong> trên trình duyệt, nên khi mở lại bạn vẫn xem được các câu hỏi trước đó.</li>
  <li><strong>Gợi ý ôn tập</strong> — Hubie có thể chỉ bạn sang Flashcard hoặc bài kiểm tra phù hợp với nội dung đang hỏi.</li>
</ul>

<h3>Tab Tra từ</h3>
<p>Ngoài chat, Hubie có thêm tab <strong>Tra từ</strong> chuyên để tra từ vựng tiếng Anh. Bạn nhập một từ và nhận về:</p>
<ul>
  <li><strong>Phiên âm</strong> và nút phát <strong>âm thanh</strong> để nghe cách đọc.</li>
  <li><strong>Nghĩa tiếng Việt</strong> của cả từ.</li>
  <li><strong>Định nghĩa tiếng Anh</strong> theo từng từ loại, kèm <strong>ví dụ</strong> sử dụng thực tế.</li>
</ul>
<p>Phần nghĩa tiếng Việt được dịch tự động nên chỉ mang tính tham khảo; với từ quan trọng, bạn nên đối chiếu thêm từ điển chuyên dụng.</p>

<h3>Mẹo dùng Hubie hiệu quả</h3>
<ul>
  <li><strong>Hỏi cụ thể</strong> — nêu rõ môn, dạng bài và phần đang vướng thay vì chỉ dán đề rồi hỏi "giải giúp".</li>
  <li><strong>Chụp ảnh rõ nét</strong> — đủ sáng, không nghiêng, không cắt mất đề bài.</li>
  <li><strong>Kiểm chứng lại</strong> — coi Hubie như người hướng dẫn, không phải đáp án tuyệt đối.</li>
  <li><strong>Tra từ bằng tab riêng</strong> khi chỉ cần nghĩa hoặc phát âm, vừa nhanh hơn vừa không tốn lượt chat.</li>
</ul>
<p><em>Lưu ý:</em> Hubie dùng hạn mức miễn phí của các mô hình AI, nên có thể tạm hết lượt trong ngày. Hệ thống đã tự động chuyển sang mô hình dự phòng, nhưng nếu vẫn không dùng được, bạn hãy quay lại sau.</p>

<h2>2. Forum — mạng xã hội học tập nội bộ</h2>
<p>Forum là nơi học sinh trao đổi bài vở, đặt câu hỏi và chia sẻ kinh nghiệm. Khung đăng bài nằm ngay đầu trang, thao tác gần giống một mạng xã hội quen thuộc.</p>

<h3>Đăng bài và đính kèm ảnh</h3>
<ul>
  <li>Nội dung tối đa <strong>500 ký tự</strong>, có bộ đếm ngay dưới khung soạn.</li>
  <li>Đính kèm <strong>một ảnh</strong> định dạng PNG, JPG, GIF hoặc WEBP, dung lượng tối đa <strong>5MB</strong>.</li>
  <li>Có thể <strong>dán ảnh trực tiếp</strong> bằng Ctrl + V — rất tiện khi chụp đề bằng điện thoại.</li>
  <li>Ảnh trong bài và trong câu trả lời đều bấm được để xem lớn.</li>
</ul>

<h3>Tương tác và thảo luận</h3>
<ul>
  <li><strong>Bảy kiểu cảm xúc</strong>: Thích, Yêu thích, Haha, Wow, Buồn, Giận và Không thích. Bấm vào số lượng để xem ai đã thả cảm xúc.</li>
  <li><strong>Trả lời theo luồng</strong> — bạn có thể trả lời một bài hoặc trả lời lại một phản hồi, tạo thành các nhánh thảo luận có thể đóng/mở.</li>
  <li><strong>Sửa và xoá</strong> bài của mình; bài đã sửa sẽ có ghi chú <em>(đã chỉnh sửa)</em>.</li>
  <li><strong>Bài ghim</strong> do Admin đặt luôn nằm trên đầu; câu trả lời của Admin được làm nổi bật kèm nhãn riêng.</li>
  <li><strong>Tìm kiếm</strong> theo nội dung hoặc tên người đăng, sắp xếp theo <em>Mới nhất</em>, <em>Cũ nhất</em> hoặc <em>Nhiều phản hồi</em>.</li>
  <li><strong>Cập nhật trực tiếp</strong> — bài mới và cảm xúc mới hiện ra mà không cần tải lại trang, kèm âm thanh thông báo có thể tắt bằng nút <em>Âm thanh</em>.</li>
</ul>

<h3>Cách hỏi bài để được giúp nhanh</h3>
<ul>
  <li>Ghi rõ môn và dạng bài trong nội dung, ví dụ "Toán 11 — tìm giới hạn dạng vô định".</li>
  <li>Đính kèm ảnh đề bài, nhưng ghi lại phần bạn đã làm được và chỗ đang vướng.</li>
  <li>Trả lời đúng trọng tâm, tránh lan sang chuyện khác để luồng thảo luận dễ theo dõi.</li>
</ul>

<h2>3. Thư viện Tài liệu — tra cứu nhanh mọi tài liệu học tập</h2>
<p>Thư viện Tài liệu gom đề kiểm tra, bài giảng và tài liệu tham khảo về một chỗ. Tên tài liệu, mô tả, danh mục và nguồn đều được hiển thị ngay trên thẻ để bạn chọn đúng thứ mình cần.</p>

<h3>Tìm và lọc</h3>
<ul>
  <li><strong>Tìm theo tên file</strong> bằng ô tìm kiếm phía trên danh sách.</li>
  <li><strong>Lọc theo danh mục</strong> bằng các chip danh mục; mỗi tài liệu có nhãn danh mục riêng.</li>
  <li><strong>Nhãn nguồn</strong> cho biết tài liệu đến từ Google Drive, file trực tiếp hay kho lưu trữ.</li>
  <li><strong>Phân trang</strong> giúp danh sách dài vẫn tải nhanh.</li>
</ul>

<h3>Xem trước và tải về</h3>
<p>Bấm vào một tài liệu để mở khung xem chi tiết. Với file hỗ trợ nhúng, bạn xem trước ngay trong trang — kể cả file Google Drive. Với định dạng không xem trước được, hệ thống hiện hướng dẫn thay vì một khung trắng. Từ khung chi tiết, bạn có thể <strong>mở file gốc</strong> hoặc <strong>tải xuống</strong>.</p>
<p>Giáo viên và Admin quản lý thư viện trong trang giáo viên: thêm, sửa, xoá tài liệu; hệ thống tự nhận diện loại file để chọn icon và hiển thị dung lượng phù hợp.</p>

<h2>4. Hồ sơ học viên — biết mình đang ở đâu</h2>
<p>Trang Hồ sơ không chỉ để đổi ảnh đại diện. Đây là nơi tổng hợp toàn bộ hoạt động học tập của bạn trong tuần và là điểm bắt đầu để tham gia lớp học.</p>

<h3>Thông tin cá nhân</h3>
<ul>
  <li>Ảnh đại diện, tên hiển thị, châm ngôn học tập và vai trò (Học sinh, Giáo viên, Admin).</li>
  <li>Email, số điện thoại, ngày sinh, giới tính, trường học.</li>
  <li><strong>Trạng thái hoạt động</strong> và tổng thời gian online trong tuần.</li>
  <li><strong>Các lớp đang tham gia</strong> — nhập <strong>mã mời</strong> do giáo viên cấp để vào lớp ngay.</li>
</ul>

<h3>Thống kê hiệu suất tuần</h3>
<p>Bốn chỉ số được cập nhật theo tuần, giúp bạn thấy tiến bộ mà không cần tự ghi chép:</p>
<ul>
  <li><strong>Bài đã làm</strong> — số bài kiểm tra đã hoàn thành.</li>
  <li><strong>Tổng điểm</strong> — tổng điểm tích lũy trong tuần.</li>
  <li><strong>Điểm trung bình</strong> — mức ổn định của kết quả học tập.</li>
  <li><strong>Điểm cao nhất</strong> — kỷ lục cá nhân trong tuần.</li>
</ul>

<h3>Kết nối và thiết lập tài khoản</h3>
<ul>
  <li><strong>Danh sách người dùng</strong> — xem hồ sơ của các thành viên khác, ưu tiên người đang online.</li>
  <li><strong>Bảng xếp hạng tuần</strong> thu nhỏ ngay trong trang, bấm mở rộng để xem đầy đủ.</li>
  <li><strong>Thiết lập tài khoản</strong>: đổi ảnh đại diện bằng URL, cập nhật châm ngôn, số điện thoại, trường học và đổi mật khẩu.</li>
  <li><strong>Xoá tài khoản</strong> — thao tác không thể hoàn tác; dữ liệu được xử lý xoá vĩnh viễn trong vòng 7 ngày.</li>
</ul>
<p>Hồ sơ hiển thị trong danh sách nội bộ của nền tảng, nên bạn chỉ nên điền những thông tin mình sẵn sàng chia sẻ với các thành viên khác.</p>

<h2>5. Bảng xếp hạng — thi đua theo tuần</h2>
<p>Bảng xếp hạng có hai chế độ xem:</p>
<ul>
  <li><strong>Điểm số</strong> — xếp theo điểm, số bài thi và số video đã xem trong tuần; vinh danh Top 3 trên bục và hiển thị đầy đủ phần còn lại.</li>
  <li><strong>Online</strong> — xếp theo thời gian học tập trực tuyến trong tuần, dành cho những bạn duy trì thói quen đều đặn.</li>
</ul>
<p>Bảng được làm mới theo tuần, nên ai cũng có cơ hội bắt đầu lại từ đầu. Vị trí của bạn được làm nổi bật để dễ tìm trong danh sách dài.</p>

<h2>6. Trung tâm trợ giúp và Góp ý</h2>
<p>Khi có thắc mắc về cách dùng nền tảng, hãy mở <strong>Trung tâm trợ giúp</strong> — các câu hỏi thường gặp được chia theo nhóm và trình bày dạng mở/đóng để tra nhanh.</p>
<p>Nếu cần báo lỗi hoặc đề xuất điều mới, trang <strong>Góp ý</strong> cho phép chọn đúng loại phản hồi:</p>
<ul>
  <li><strong>Báo lỗi tính năng / Hệ thống.</strong></li>
  <li><strong>Góp ý giao diện / UI-UX.</strong></li>
  <li><strong>Đề xuất nội dung học tập.</strong></li>
  <li><strong>Ý kiến đóng góp khác.</strong></li>
</ul>
<p>Sau khi gửi, hệ thống ghi nhận và gửi email phản hồi tự động. Mô tả càng cụ thể — kèm ảnh chụp màn hình nếu có — càng dễ được xử lý nhanh.</p>

<h2>Kết hợp các tính năng trong một buổi học</h2>
<ol>
  <li><strong>Vướng bài tập</strong> → mở Hubie, gửi ảnh đề và hỏi đúng chỗ chưa hiểu.</li>
  <li><strong>Cần tài liệu luyện thêm</strong> → vào Thư viện Tài liệu, tìm theo tên hoặc danh mục rồi xem trước.</li>
  <li><strong>Muốn nghe cách giải khác</strong> → đăng câu hỏi lên Forum, đính kèm đề bài và phần đã làm.</li>
  <li><strong>Theo dõi kết quả</strong> → mở Hồ sơ xem thống kê tuần, rồi so vị trí của mình trên Bảng xếp hạng.</li>
  <li><strong>Có gì chưa ổn</strong> → tra Trung tâm trợ giúp trước, sau đó gửi Góp ý nếu vẫn cần hỗ trợ.</li>
</ol>

<h2>Vài lưu ý chung</h2>
<ul>
  <li>Hubie là công cụ hỗ trợ, không thay thế việc tự học; hãy kiểm chứng lại những chỗ quan trọng.</li>
  <li>Nghĩa tiếng Việt trong tab Tra từ là dịch máy, có thể chưa sát ngữ cảnh chuyên ngành.</li>
  <li>Ảnh đính kèm Forum nên được nén lại để tải nhanh hơn và không vượt giới hạn 5MB.</li>
  <li>Thông tin trong Hồ sơ là nội bộ, nhưng bạn vẫn nên cân nhắc trước khi điền số điện thoại hay trường học.</li>
</ul>

<h2>Khám phá ngay</h2>
<p>Từ trang chủ LearnHub, bạn có thể mở nhanh Hubie ở góc màn hình, vào <a href="https://learnhubpf.pages.dev/?open=forum">Forum</a>, xem <a href="https://learnhubpf.pages.dev/?open=tai-lieu">Thư viện Tài liệu</a> hoặc mở <a href="https://learnhubpf.pages.dev/profile.html">Hồ sơ học viên</a>. Mỗi tính năng đều miễn phí và dùng chung một tài khoản.</p>

<blockquote>Một nền tảng học tốt không chỉ có bài giảng và bài kiểm tra, mà còn có người để hỏi, tài liệu để tra và một nơi để nhìn lại mình đã tiến bộ đến đâu. LearnHub gom những điều đó lại để bạn chỉ cần tập trung vào việc học.</blockquote>

<p>Nếu bạn phát hiện lỗi hoặc có ý tưởng cho một tính năng mới, đừng ngần ngại gửi qua trang <strong>Góp ý</strong>. Ban Quản Trị luôn đọc và ghi nhận mọi phản hồi.</p>
$body$,
  'https://learnhubpf.pages.dev/pictures/loading2.jpg',
  'Học tập',
  array['Hubie AI','Forum','Thư viện tài liệu','Hồ sơ học viên','Bảng xếp hạng','tính năng'],
  'Ban Quản Trị LearnHub',
  true,
  false
where not exists (
  select 1 from public.blog_posts
  where title = 'Các tính năng bổ trợ của LearnHub: Hubie AI, Forum, Tài liệu và Hồ sơ học viên'
);

-- ----------------------------------------------------------------------------
-- Muốn SỬA nội dung sau này? Chạy khối dưới (bỏ comment) với nội dung mới.
-- ----------------------------------------------------------------------------
-- update public.blog_posts
--    set content = $new$ ... $new$,
--        excerpt = '...',
--        updated_at = now()
--  where title = 'Các tính năng bổ trợ của LearnHub: Hubie AI, Forum, Tài liệu và Hồ sơ học viên';

-- Xem lại kết quả
select id, title, category, tags, published, pinned, views, created_at
from public.blog_posts
order by pinned desc, created_at desc;
