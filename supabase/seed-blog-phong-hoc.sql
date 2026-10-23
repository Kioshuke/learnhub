-- ============================================================================
-- Seed: bài blog giới thiệu chi tiết tính năng Phòng học (LearnHub)
-- ----------------------------------------------------------------------------
-- Cách dùng: dán vào Supabase Dashboard -> SQL Editor -> Run.
-- An toàn khi chạy lại: nếu đã có bài cùng tiêu đề thì KHÔNG tạo thêm.
-- Chạy bằng SQL Editor (quyền cao) nên không cần đăng nhập admin.
-- ============================================================================

insert into public.blog_posts
  (title, excerpt, content, cover_url, category, tags, author, published, pinned)
select
  'Phòng học LearnHub: Học, xem bài giảng và làm bài kiểm tra trong một nơi',
  'Phòng học LearnHub gom lịch học – lịch thi, bài giảng video theo từng môn và hệ thống bài kiểm tra trực tuyến có bấm giờ, chấm điểm tự động, lưu kết quả và xếp hạng tuần. Cùng khám phá cách dùng hiệu quả.',
  $body$
<p><strong>Phòng học</strong> là không gian học tập theo môn trong LearnHub. Thay vì mở lịch ở một tab, video bài giảng ở tab khác và đề kiểm tra ở tab thứ ba, bạn có thể theo dõi toàn bộ việc học của một môn tại cùng một chỗ: xem lịch học – lịch thi, đọc thông báo của giáo viên, xem bài giảng và làm bài kiểm tra ngay trong trang.</p>
<p>Bài viết này hướng dẫn chi tiết cách Phòng học được tổ chức, từng khối chức năng hoạt động ra sao và cách dùng nó để việc ôn tập mỗi ngày gọn gàng hơn.</p>

<h2>Phòng học có gì?</h2>
<p>Mỗi môn học trong Phòng học gồm ba phần chính, được sắp xếp từ trên xuống theo đúng thứ tự bạn thường cần khi học:</p>
<ol>
  <li><strong>Lịch học &amp; lịch thi</strong> — khung lịch ở đầu trang, giúp bạn biết hôm nay có tiết gì, sắp tới có bài kiểm tra nào.</li>
  <li><strong>Bài giảng video</strong> — các khóa video do giáo viên biên soạn, chia theo chủ đề và có mục lục để chọn bài.</li>
  <li><strong>Bài kiểm tra</strong> — đề trắc nghiệm, đúng/sai, tự luận hoặc bài nghe, có đồng hồ đếm ngược và chấm điểm tự động.</li>
</ol>
<p>Ngoài ra, đầu mỗi tab môn có thể có <strong>thông báo môn học</strong> do giáo viên cập nhật — ví dụ nhắc lịch nộp bài, dặn dò nội dung cần chuẩn bị hoặc thay đổi về đề kiểm tra.</p>

<h2>Bắt đầu sử dụng Phòng học</h2>
<ol>
  <li>Trên trang chủ LearnHub, bấm thẻ <strong>Phòng học ảo</strong> (hoặc mục <strong>Phòng học</strong> trên thanh menu).</li>
  <li>Chọn tab môn bạn muốn học. Hiện tại Phòng học có 8 nhóm môn: <strong>Toán Học, Vật Lý, Hoá Học, Sinh Học, Anh Văn, Tin Học, Lịch Sử</strong> và <strong>Khác</strong>.</li>
  <li>Đọc thông báo môn (nếu có) để nắm yêu cầu mới nhất.</li>
  <li>Chọn một card <strong>bài giảng video</strong> để xem, hoặc card <strong>bài kiểm tra</strong> rồi bấm <strong>Làm bài</strong>.</li>
  <li>Khi làm bài xong, xem kết quả và đóng bài để quay lại danh sách môn.</li>
</ol>

<h2>Khối 1 — Lịch học và lịch thi</h2>
<p>Khung lịch nằm ngay đầu trang Phòng học và có thể thu gọn để nhường chỗ cho nội dung môn học. Lịch được hiển thị theo tuần, với ba nút điều hướng: <strong>Tuần trước</strong>, <strong>Tuần này</strong> và <strong>Tuần sau</strong>.</p>
<ul>
  <li><strong>Nhãn đếm ngược</strong> — mỗi sự kiện cho biết còn bao nhiêu ngày nữa diễn ra; sự kiện trong hôm nay được làm nổi bật, sự kiện đã qua sẽ mờ đi để bạn dễ nhìn về phía trước.</li>
  <li><strong>Đầy đủ thông tin</strong> — tên sự kiện, môn học, ngày, giờ bắt đầu và giờ kết thúc.</li>
  <li><strong>Cập nhật trực tiếp</strong> — khi Ban Quản Trị hoặc giáo viên thay đổi lịch, khung lịch tự làm mới mà bạn không cần tải lại trang.</li>
</ul>
<p>Mẹo nhỏ: mỗi đầu tuần, hãy dành 1 phút mở tab <strong>Tuần này</strong> để ghi lại các mốc quan trọng. Biết trước lịch thi sẽ giúp bạn chia thời gian ôn tập hợp lý hơn nhiều so với việc học dồn vào hôm trước.</p>

<h2>Khối 2 — Bài giảng video</h2>
<p>Các bài giảng được đóng gói thành từng <strong>card khóa học</strong> theo môn. Bấm <strong>Xem video</strong> để mở trình phát ngay trong trang, không cần chuyển sang tab khác.</p>

<h3>Nhiều nguồn video, một giao diện</h3>
<p>Giáo viên có thể đăng bài giảng từ nhiều nền tảng khác nhau. Hệ thống tự nhận diện loại link và hiển thị phù hợp:</p>
<ul>
  <li><strong>YouTube</strong> — trình phát 16:9, có theo dõi tiến độ xem.</li>
  <li><strong>Vimeo</strong> và <strong>TikTok</strong> — mở trình phát tương ứng.</li>
  <li><strong>Google Drive</strong> — xem video, mở thư mục hoặc tài liệu trực tiếp.</li>
  <li><strong>Tài liệu</strong> — link PDF, DOC hoặc thư mục Drive được mở để xem, không tính là video.</li>
</ul>

<h3>Mục lục chia theo chủ đề</h3>
<p>Mỗi khóa video có danh sách bài giảng ở cạnh trình phát, được nhóm theo chủ đề và có thể đóng/mở như một mục lục. Bài đầu tiên tự động phát khi bạn mở khóa học, các bài sau chỉ cần bấm vào tên là chuyển ngay. Nhờ vậy bạn có thể học liền mạch cả một chuỗi bài mà không phải quay lại trang danh sách.</p>

<h3>Đánh dấu bài đã xem</h3>
<p>Với video YouTube, khi bạn xem từ <strong>75% thời lượng</strong> trở lên, bài giảng sẽ được đánh dấu đã xem và lưu lại vào tài khoản. Lần sau mở lại, bạn nhìn tick xanh là biết mình đã học đến đâu. Video từ Google Drive, tài liệu và các nền tảng khác mở xem trực tiếp nhưng không tự đánh dấu — bạn có thể chủ động ghi chú lại để không bỏ sót.</p>

<h2>Khối 3 — Bài kiểm tra trực tuyến</h2>
<p>Đây là phần được học sinh dùng nhiều nhất. Mỗi đề kiểm tra là một card riêng trong tab môn, hiển thị tên đề, mô tả, thời gian làm bài và trạng thái.</p>
<ul>
  <li><strong>Hoàn thành</strong> — đề đã sẵn sàng, bấm <strong>Làm bài</strong> để bắt đầu.</li>
  <li><strong>Chưa hoàn thành / Sắp ra mắt</strong> — giáo viên đang soạn hoặc cập nhật đề; bạn chưa thể mở.</li>
  <li><strong>Sao chép link</strong> — biểu tượng dây xích cho phép copy link bài kiểm tra để gửi cho bạn học.</li>
</ul>

<h3>Bốn dạng câu hỏi</h3>
<ul>
  <li><strong>Trắc nghiệm</strong> — chọn một đáp án đúng trong các lựa chọn.</li>
  <li><strong>Đúng / Sai</strong> — mỗi ý được tính điểm riêng, phù hợp với dạng câu hỏi nhận định.</li>
  <li><strong>Tự luận</strong> — nhập câu trả lời dài; nội dung được lưu lại trong quá trình làm bài để tránh mất khi lỡ tay.</li>
  <li><strong>Phần nghe</strong> — dành cho môn Anh Văn, có trình phát audio ngay trên đề; bạn có thể nghe lại và tua đến vị trí cần thiết.</li>
</ul>

<h3>Đồng hồ và cách tính điểm</h3>
<p>Khi bắt đầu, đồng hồ đếm ngược hiện ở đầu trang. Khi gần hết giờ, đồng hồ đổi màu để cảnh báo; hết thời gian, bài sẽ tự động được nộp. Nếu đề không đặt giới hạn thời gian, đồng hồ hiển thị <em>Vô hạn</em> và bạn thoải mái làm bài.</p>
<p>Điểm được chấm tự động theo thang điểm giáo viên cấu hình cho đề. Tùy đề, thứ tự câu hỏi và thứ tự đáp án có thể được trộn — riêng phần nghe vẫn giữ đúng thứ tự để bạn theo dõi audio.</p>

<h3>Nộp bài, xem kết quả và làm lại</h3>
<ul>
  <li>Trước khi nộp, hệ thống hiện hộp xác nhận để bạn kiểm tra lại.</li>
  <li>Sau khi nộp, popup kết quả hiển thị điểm số, số câu đúng và thống kê bài làm.</li>
  <li><strong>Xem đáp án</strong> phụ thuộc vào cấu hình của từng đề: luôn cho xem, chỉ cho xem khi đạt điểm tối đa, hoặc chặn hoàn toàn.</li>
  <li>Bạn có thể <strong>làm lại</strong> đề để cải thiện điểm; kết quả mới sẽ được ghi nhận.</li>
  <li>Điểm và số bài đã làm được gửi về LearnHub, hiển thị trên <strong>Bảng xếp hạng tuần</strong> cùng số video đã xem.</li>
</ul>

<h2>Một buổi học 45 phút mẫu</h2>
<ol>
  <li><strong>2 phút — Xem lịch:</strong> mở khung lịch, xác định mốc gần nhất trong tuần.</li>
  <li><strong>3 phút — Đọc thông báo môn:</strong> nắm nội dung giáo viên dặn, đặc biệt là hạn nộp bài.</li>
  <li><strong>20 phút — Xem bài giảng:</strong> chọn một chủ đề trong mục lục, xem hết và ghi chú lại 3 ý chính.</li>
  <li><strong>15 phút — Làm bài kiểm tra:</strong> chọn đề tương ứng để kiểm tra ngay những gì vừa học.</li>
  <li><strong>5 phút — Xem lại đáp án:</strong> tập trung vào câu sai, ghi lại lỗi để lần sau không lặp lại.</li>
</ol>

<h2>Mẹo dùng Phòng học hiệu quả</h2>
<ul>
  <li><strong>Học video trước, làm bài sau:</strong> làm bài ngay khi kiến thức còn mới giúp bạn nhớ lâu hơn.</li>
  <li><strong>Không tua quá nhiều:</strong> xem đủ 75% để được ghi nhận tiến độ, đồng thời tránh bỏ sót ý quan trọng.</li>
  <li><strong>Dùng mục lục thay vì xem lại cả khóa:</strong> khi cần ôn một chủ đề, bấm thẳng vào bài trong mục lục sẽ nhanh hơn nhiều.</li>
  <li><strong>Xem kỹ câu sai:</strong> nếu đề cho phép xem đáp án, hãy đọc phần giải thích và tự viết lại lý do mình chọn sai.</li>
  <li><strong>Làm lại đề:</strong> lần thứ hai thường là lúc bạn thật sự hiểu, vì đã biết mình vướng ở đâu.</li>
  <li><strong>Chia sẻ link bài kiểm tra:</strong> dùng nút copy link để cùng bạn học làm chung một đề và so sánh kết quả.</li>
</ul>

<h2>Dành cho giáo viên</h2>
<p>Phần <strong>Quản lý phòng học</strong> trong trang giáo viên gồm hai khu vực chính:</p>
<ul>
  <li><strong>Quản lý video:</strong> tạo card khóa học theo môn, đặt tên và mô tả, chia bài giảng theo chủ đề, dán link YouTube / Vimeo / TikTok / Google Drive để hệ thống tự nhận diện. Giáo viên có thể sửa tên khóa, đổi chủ đề, sắp xếp lại và đánh dấu hoàn thành khi khóa đã đủ bài.</li>
  <li><strong>Soạn đề kiểm tra:</strong> tạo đề với bốn dạng câu hỏi, cấu hình thời gian làm bài, thang điểm, bật/tắt trộn câu hỏi và trộn đáp án, chọn chế độ xem đáp án, rồi công khai đề để học sinh thấy trong tab môn.</li>
</ul>
<p>Giáo viên cũng có thể chỉnh <strong>thông báo môn học</strong> hiển thị đầu mỗi tab, giúp việc trao đổi với học sinh diễn ra ngay trong không gian học thay vì rải rác ở nhiều kênh khác.</p>

<h2>Vài lưu ý khi sử dụng</h2>
<ul>
  <li>Kết quả bài kiểm tra chỉ được lưu khi bạn làm bài <strong>trong Phòng học của LearnHub</strong> (hoặc mở bằng link chia sẻ của Phòng học). Mở thẳng file đề bên ngoài sẽ không ghi nhận kết quả.</li>
  <li>Chỉ video YouTube được tự động đánh dấu đã xem; video Drive và tài liệu không tính vào tiến độ video.</li>
  <li>Đề có trạng thái <em>Chưa hoàn thành</em> là đề đang được soạn; hãy quay lại sau khi giáo viên cập nhật.</li>
</ul>

<h2>Bắt đầu ngay</h2>
<p>Truy cập <a href="https://learnhubpf.pages.dev/?open=phong-hoc">Phòng học LearnHub</a>, chọn môn đang học và bắt đầu từ khung lịch. Chỉ cần mỗi ngày một chặng nhỏ — một bài giảng, một đề luyện — bạn sẽ thấy tiến bộ rõ rệt sau vài tuần.</p>

<blockquote>Học tốt không đến từ những buổi học dài, mà từ những buổi học đều. Phòng học được thiết kế để bạn luôn biết mình cần học gì tiếp theo: lịch đã có, bài giảng đã có, đề luyện đã có — việc còn lại chỉ là bắt đầu.</blockquote>

<p>Nếu gặp lỗi khi xem video, làm bài hoặc thấy lịch chưa đúng, bạn hãy gửi phản hồi cho Ban Quản Trị qua trang <strong>Góp ý</strong> để được hỗ trợ sớm nhất.</p>
$body$,
  'https://learnhubpf.pages.dev/pictures/loading1.jpg',
  'Học tập',
  array['Phòng học','LearnHub Test','bài kiểm tra','video bài giảng','lịch học'],
  'Ban Quản Trị LearnHub',
  true,
  false
where not exists (
  select 1 from public.blog_posts
  where title = 'Phòng học LearnHub: Học, xem bài giảng và làm bài kiểm tra trong một nơi'
);

-- ----------------------------------------------------------------------------
-- Muốn SỬA nội dung sau này? Chạy khối dưới (bỏ comment) với nội dung mới.
-- ----------------------------------------------------------------------------
-- update public.blog_posts
--    set content = $new$ ... $new$,
--        excerpt = '...',
--        updated_at = now()
--  where title = 'Phòng học LearnHub: Học, xem bài giảng và làm bài kiểm tra trong một nơi';

-- Xem lại kết quả
select id, title, category, tags, published, pinned, views, created_at
from public.blog_posts
order by pinned desc, created_at desc;
