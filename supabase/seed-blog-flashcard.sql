-- ============================================================================
-- Seed: bài blog giới thiệu chi tiết tính năng LearnHub Flashcard
-- ----------------------------------------------------------------------------
-- Cách dùng: dán vào Supabase Dashboard -> SQL Editor -> Run.
-- An toàn khi chạy lại: nếu đã có bài cùng tiêu đề thì KHÔNG tạo thêm.
-- Chạy bằng SQL Editor (quyền cao) nên không cần đăng nhập admin.
-- ============================================================================

insert into public.blog_posts
  (title, excerpt, content, cover_url, category, tags, author, published, pinned)
select
  'LearnHub Flashcard: 6 chế độ học từ vựng giúp bạn nhớ nhanh, nhớ lâu',
  'Khám phá LearnHub Flashcard — từ lật thẻ, nghe phát âm, tra từ điển đến 6 chế độ luyện tập như Ghép đôi, Quiz nhanh, Điền từ, Phòng thủ và Giải ô chữ. Tất cả miễn phí trong cùng một nền tảng.',
  $body$
<p><strong>LearnHub Flashcard</strong> (còn gọi là <em>Smart Flashcard</em>) là công cụ học từ vựng tiếng Anh theo phương pháp lật thẻ, được tích hợp sẵn trong LearnHub. Thay vì đọc đi đọc lại một danh sách từ dài, bạn vừa lật thẻ, vừa nghe phát âm, vừa chơi những trò chơi ngắn để tự kiểm tra trí nhớ. Nhờ vậy việc học trở nên nhẹ nhàng, có tiến trình rõ ràng và dễ duy trì hơn rất nhiều.</p>

<h2>Vì sao nên học từ vựng bằng flashcard?</h2>
<p>Học từ vựng hiệu quả không nằm ở việc nhìn một từ bao nhiêu lần, mà ở số lần bạn <strong>tự gợi nhớ</strong> ra nó. Flashcard tận dụng đúng nguyên tắc đó:</p>
<ul>
  <li><strong>Chủ động gợi nhớ (active recall)</strong> — mỗi lần lật thẻ là một lần não bộ phải lục lại đáp án, thay vì đọc thụ động.</li>
  <li><strong>Ôn tập ngắt quãng</strong> — những từ bạn đánh dấu <em>Chưa thuộc</em> sẽ được đưa lại để ôn, còn từ đã thuộc thì bớt lặp lại.</li>
  <li><strong>Chia nhỏ để không quá tải</strong> — nội dung được chia theo nhóm và theo bộ, mỗi phiên học chỉ vài chục từ.</li>
  <li><strong>Có phản hồi ngay</strong> — đúng/sai được báo tức thì, kèm điểm, chuỗi streak và thanh tiến độ.</li>
</ul>

<h2>Bắt đầu chỉ trong 30 giây</h2>
<ol>
  <li>Mở mục <strong>Flashcard</strong> trên thanh menu, hoặc bấm thẻ <strong>Smart Flashcard</strong> ngay trên trang chủ LearnHub.</li>
  <li>Chọn nhóm nội dung bạn muốn học ở bộ lọc phía trên (hoặc để <em>Hiện tất cả nhóm</em>).</li>
  <li>Chọn một bộ thẻ — mỗi bộ hiển thị số lượng từ, cấp độ và trạng thái <em>Đã hoàn thành</em> / <em>Đang được cập nhật</em>.</li>
  <li>Nhấn <strong>Tham gia</strong>, sau đó bấm vào thẻ để lật xem nghĩa.</li>
  <li>Đánh dấu <strong>Đã thuộc</strong> hoặc <strong>Chưa thuộc</strong> để hệ thống tính tiến độ và nhắc bạn ôn lại.</li>
</ol>

<h2>Kho thẻ học tập được tổ chức ra sao?</h2>
<p>Trang Hub Flashcard gom toàn bộ bộ thẻ vào một nơi, có bộ lọc theo nhóm, hiển thị số từ và trạng thái hoàn thành của từng nhóm. Nội dung hiện tại gồm các nhóm chính:</p>
<h3>800 Từ Vựng Nền Tảng</h3>
<p>Bộ từ vựng cốt lõi dành cho người mới bắt đầu và người cần lấy lại gốc. Học đều nhóm này sẽ giúp bạn đọc hiểu, nghe hiểu và tự tin hơn trong các tình huống giao tiếp thường ngày.</p>
<h3>300 Từ Vựng Tủ 9+</h3>
<p>Nhóm từ nâng cao, chọn lọc dành cho học sinh muốn chinh phục điểm cao trong các kỳ thi. Từ vựng ở đây thường xuất hiện trong đề đọc hiểu, viết luận và các câu hỏi phân loại.</p>
<h3>Từ Vựng Theo Chủ Đề</h3>
<p>Các bộ thẻ được chia theo chủ đề gần gũi như học tập, công việc, du lịch, công nghệ, sức khỏe… Học theo chủ đề giúp bạn ghi nhớ thành cụm và dùng từ tự nhiên hơn trong ngữ cảnh.</p>
<h3>Từ Vựng Nhập Môn</h3>
<p>Nhóm từ nhập môn, phù hợp để làm quen với cách học flashcard trước khi chuyển sang các bộ dài hơn.</p>
<h3>Bộ thẻ do giáo viên soạn</h3>
<p>Giáo viên có thể tạo bộ thẻ riêng cho lớp mình. Những bộ này xuất hiện ngay trên Hub theo đúng nhóm đã chọn, kèm mô tả và số lượng từ, để học sinh mở học mà không cần tìm link.</p>

<h2>6 chế độ học trong LearnHub Flashcard</h2>
<p>Mỗi chế độ luyện một kỹ năng khác nhau. Bạn không cần dùng hết trong một ngày — hãy đổi chế độ để buổi học bớt nhàm chán.</p>

<h3>1. Flashcard — lật thẻ ghi nhớ</h3>
<p>Đây là chế độ chính và cũng là nơi bạn bắt đầu. Mặt trước là từ tiếng Anh, mặt sau là nghĩa, ví dụ và mô tả chi tiết.</p>
<ul>
  <li><strong>Lật thẻ</strong> bằng cách bấm vào thẻ; hiệu ứng lật 3D giúp bạn tập trung vào một từ tại một thời điểm.</li>
  <li><strong>Nghe phát âm</strong> — bấm biểu tượng loa (hoặc nhấn <em>Enter</em>) để nghe giọng đọc tiếng Anh của từ.</li>
  <li><strong>Tra từ điển</strong> — bấm biểu tượng sách để tra nhanh trên Cambridge Dictionary, xem phiên âm và ví dụ.</li>
  <li><strong>Đánh dấu Đã thuộc / Chưa thuộc</strong> — thanh tiến độ chạy theo số từ bạn đã xử lý; các từ <em>Chưa thuộc</em> được gom lại để ôn tập riêng.</li>
  <li><strong>Cấp độ từ</strong> — mỗi thẻ có nhãn Dễ, Trung bình, Khó hoặc Nâng cao để bạn biết mình đang học phần nào.</li>
  <li><strong>Lưu tiến độ</strong> — khi quay lại bộ thẻ, bạn tiếp tục đúng vị trí đã dừng thay vì học lại từ đầu.</li>
</ul>

<h3>2. Ghép đôi — nối từ với nghĩa</h3>
<p>Bạn ghép từ tiếng Anh với nghĩa tiếng Việt tương ứng. Mỗi lần ghép đúng, một phần của màn hình được mở khóa; hết một mẻ, hệ thống chuyển sang mẻ tiếp theo. Chế độ này luyện phản xạ nhận diện mặt chữ và rất hợp để khởi động buổi học.</p>

<h3>3. Quiz nhanh — giữ chuỗi streak</h3>
<p>Mỗi câu hỏi có nhiều lựa chọn, bạn chọn đáp án đúng trước khi hết thời gian. Điểm số tăng theo chuỗi trả lời đúng liên tiếp, với các mốc hiệu ứng từ lửa, vàng, neon đến điện quang và vũ trụ.</p>
<ul>
  <li><strong>Chế độ Hardcore</strong> — chỉ cần sai một câu là mất toàn bộ streak và phải làm lại từ đầu. Chỉ nên bật khi bạn đã quen bộ từ.</li>
  <li><strong>Streak</strong> giúp bạn thấy mình đang tập trung đến đâu; đừng quá tiếc streak, mục tiêu vẫn là nhớ từ.</li>
</ul>

<h3>4. Điền từ — nhớ mặt chữ</h3>
<p>Bạn nhìn nghĩa tiếng Việt và tự gõ lại từ tiếng Anh. Đây là bước khó hơn nhận diện, vì bạn phải nhớ đúng chính tả.</p>
<ul>
  <li>Có nút <strong>Gợi ý</strong> khi bạn bí — hãy thử nhớ trước, chỉ mở gợi ý khi thật sự cần.</li>
  <li>Không phân biệt chữ hoa và chữ thường, nhưng vẫn cần đúng chính tả.</li>
  <li>Phù hợp để kiểm tra lại sau khi đã học qua chế độ Flashcard.</li>
</ul>

<h3>5. Phòng thủ — Chiến Thần Vũ Trụ</h3>
<p>Một chế độ game nhập vai nhẹ: quái vật xuất hiện, bạn chọn đáp án đúng để bắn hạ chúng và bảo vệ căn cứ. Bạn có 3 trái tim; mất hết tim là thua.</p>
<ul>
  <li>Có nút <strong>Tạm dừng</strong> khi cần nghỉ, và chơi lại ngay khi thua.</li>
  <li>Thanh tiến độ hiển thị số đợt đã vượt qua, giúp bạn biết mình còn bao xa.</li>
  <li>Vì áp lực thời gian cao hơn, chế độ này rất hợp để ôn lại bộ từ đã học khá chắc.</li>
</ul>

<h3>6. Giải ô chữ — tìm từ trong ma trận</h3>
<p>Các từ tiếng Anh được giấu trong một ma trận chữ cái. Bạn kéo chuột (hoặc vuốt trên điện thoại) từ chữ cái đầu đến chữ cái cuối để chọn từ.</p>
<ul>
  <li>Chọn độ khó theo số từ mỗi đợt: <strong>Nhỏ (3 từ)</strong>, <strong>Vừa (6 từ)</strong> hoặc <strong>Nhiều (9 từ)</strong>.</li>
  <li>Tìm đúng, ô chữ chuyển xanh và hiện nghĩa; chọn sai, ô chuyển đỏ.</li>
  <li>Nội dung được chia theo đợt giống chế độ Ghép đôi, nên bạn luôn biết mình đang ở đâu.</li>
</ul>

<h2>Phím tắt và cài đặt</h2>
<p>Khi học trên máy tính, bạn có thể thao tác nhanh hơn bằng bàn phím:</p>
<ul>
  <li><strong>Space</strong> hoặc <strong>↑</strong> — lật thẻ.</li>
  <li><strong>Enter</strong> — nghe phát âm từ đang hiện.</li>
  <li><strong>→</strong> hoặc <strong>1</strong> — đánh dấu đã thuộc.</li>
  <li><strong>←</strong> hoặc <strong>2</strong> — đánh dấu chưa thuộc.</li>
</ul>
<p>Bấm biểu tượng bánh răng để mở <strong>Cài đặt</strong> và điều chỉnh ba mức âm lượng độc lập: nhạc nền, hiệu ứng âm thanh và giọng đọc. Nếu đang ở nơi yên tĩnh, bạn có thể tắt nhạc nền mà vẫn giữ giọng đọc để luyện nghe.</p>

<h2>Gợi ý lộ trình 15 phút mỗi ngày</h2>
<ol>
  <li><strong>5 phút — Flashcard:</strong> học từ mới, lật thẻ và đánh dấu đã/chưa thuộc.</li>
  <li><strong>4 phút — Ghép đôi hoặc Quiz nhanh:</strong> kiểm tra nhận diện và phản xạ với chính bộ từ vừa học.</li>
  <li><strong>4 phút — Ôn tập từ chưa thuộc:</strong> quay lại phần ôn tập để xử lý nốt những từ còn vướng.</li>
  <li><strong>2 phút — Điền từ hoặc Giải ô chữ:</strong> kết thúc nhẹ nhàng, tập trung vào chính tả và ghi nhớ mặt chữ.</li>
</ol>

<h2>Mẹo để nhớ từ lâu hơn</h2>
<ul>
  <li><strong>Đọc to</strong> từ và ví dụ thay vì chỉ đọc thầm — vừa luyện phát âm, vừa tạo ấn tượng với não bộ.</li>
  <li><strong>Đặt một câu riêng</strong> với mỗi từ mới, càng gắn với đời sống của bạn càng dễ nhớ.</li>
  <li><strong>Học theo cụm từ</strong> (collocation) thay vì từ đơn lẻ, ví dụ <em>make a decision</em> thay vì chỉ <em>decision</em>.</li>
  <li><strong>Không nhồi quá nhiều</strong> — khoảng 15–25 từ mỗi phiên là đủ để não tiếp thu mà không quá tải.</li>
  <li><strong>Quay lại sau 1–2 ngày</strong> — ôn lại đúng lúc gần quên sẽ giúp từ đi vào trí nhớ dài hạn.</li>
  <li><strong>Tận dụng nút tra từ điển</strong> để xem thêm phiên âm, ví dụ và cách dùng thật của từ.</li>
</ul>

<h2>Dành cho giáo viên</h2>
<p>Trong trang giáo viên, mục <strong>Soạn Flashcard</strong> cho phép tạo bộ thẻ mới, chọn nhóm hiển thị trên Hub, thêm từng thẻ với từ khóa, nghĩa, ví dụ, mô tả và cấp độ, rồi sắp xếp thứ tự bộ thẻ. Khi một nhóm đã soạn xong, giáo viên có thể bật trạng thái <em>Đã hoàn thành</em> để học sinh nhìn thấy ngay trên Hub. Nhờ vậy nội dung học luôn bám sát bài giảng trên lớp thay vì chỉ dùng kho từ vựng chung.</p>

<h2>Bắt đầu ngay hôm nay</h2>
<p>Mở <a href="https://learnhubpf.pages.dev/?open=flash">LearnHub Flashcard</a>, chọn một bộ thẻ phù hợp với trình độ và bắt đầu lật thẻ. Bạn có thể bắt đầu với nhóm <strong>800 Từ Vựng Nền Tảng</strong> nếu đang xây gốc, hoặc nhóm <strong>300 Từ Vựng Tủ 9+</strong> nếu đang ôn thi.</p>

<blockquote>Học từ vựng không cần những buổi học dài. Chỉ 10–15 phút mỗi ngày, đều đặn và đúng cách, sẽ tạo ra khác biệt rất lớn sau vài tháng. LearnHub Flashcard được làm ra để giúp bạn duy trì thói quen đó.</blockquote>

<p><em>Lưu ý:</em> tiến độ học flashcard hiện được lưu ngay trên trình duyệt và thiết bị bạn đang dùng. Nếu xóa dữ liệu trình duyệt hoặc đổi thiết bị, tiến độ có thể không còn — hãy học đều đặn thay vì phụ thuộc hoàn toàn vào thanh tiến độ. Nếu gặp lỗi hoặc có góp ý cho tính năng, bạn hãy gửi cho Ban Quản Trị qua trang <strong>Góp ý</strong> nhé.</p>
$body$,
  'https://learnhubpf.pages.dev/pictures/loading4.jpg',
  'Học tập',
  array['Flashcard','Smart Flashcard','từ vựng','tiếng Anh','hướng dẫn'],
  'Ban Quản Trị LearnHub',
  true,
  false
where not exists (
  select 1 from public.blog_posts
  where title = 'LearnHub Flashcard: 6 chế độ học từ vựng giúp bạn nhớ nhanh, nhớ lâu'
);

-- ----------------------------------------------------------------------------
-- Muốn SỬA nội dung sau này? Chạy khối dưới (bỏ comment) với nội dung mới.
-- ----------------------------------------------------------------------------
-- update public.blog_posts
--    set content = $new$ ... $new$,
--        excerpt = '...',
--        updated_at = now()
--  where title = 'LearnHub Flashcard: 6 chế độ học từ vựng giúp bạn nhớ nhanh, nhớ lâu';

-- Xem lại kết quả
select id, title, category, tags, published, pinned, views, created_at
from public.blog_posts
order by pinned desc, created_at desc;
