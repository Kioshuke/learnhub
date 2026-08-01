// ===== DÁN DATA Ở ĐÂY =====
window.TOPIC_NAME = "800 Từ Vựng Nền Tảng P6";

const rawData = `
abundant - dồi dào, phong phú
accommodate - đáp ứng, cung cấp chỗ ở
accumulate - tích luỹ, gom góp
adapt - thích nghi
adequate - đầy đủ, thoả đáng
ambition - tham vọng
analyze - phân tích
appreciate - trân trọng, cảm kích
approach - cách tiếp cận/tiếp cận
artificial - nhân tạo
assessment - sự đánh giá
assumption - giả định, giả thiết
authority - chính quyền
barrier - rào cản
component - thành phần
comprehend - lĩnh hội
conflict - xung đột
constructive - có tính xây dựng
controversy - sự tranh cãi
critical - nguy cấp/quan trọng/chỉ trích
decline - sự suy giảm/từ chối
demonstrate - chức minh, minh hoạ
distribute - phân phối, phân phát
diminish - giảm bớt, làm yếu đi
domestic - trong nước
equivalent - tương đương
evident - hiển nhiên, rõ ràng
exceed - vượt quá
exclude - loại trừ
exposure - sự tiếp xúc, phơi bày
facilitate - tạo điều kiện thuận lợi
fundamental - cơ bản, cốt lõi
guarantee - cam kết/bảo hành
hypothesis - giả thuyết
illustrate - minh hoạ
implication - hệ quả, sự ngụ ý
indicate - chỉ ra
inevitable - không thể tránh khỏi
inherent - vốn có, cố hữu
integrate - tích hợp, hoà nhập
justify - biện minh, giải trình
landscape - phong cảnh
legislation - pháp luật, việc lập pháp
manipulate - thao túng, điều khiển
modify - sửa đổi
notion - khái niệm, ý niệm
obligation - nghĩa vụ, bổn phận
output - sản lượng, đầu ra
parallel - song song, tương đồng
perception - sự nhận thức, cảm nhận
abandon - từ bỏ, bỏ rơi
abstract - trừu tượng
acknowledge - thừa nhận, công nhận
adaptable - có thể thích nghi
adjacent - liền kề, kế bên
adjust - điều chỉnh
aggregate - tổng hợp
albeit - mặc dù, dẫu cho
allocate - phân bổ, chỉ định
alter - thay đổi, biến đổi
ambiguous - mơ hồ
amend - sửa đổi (văn bản, luật)
analogy - sự tương phản, phép ẩn dụ
annual - hàng năm
anticipate - dự đoán, mong đợi
apparent - rõ ràng, hiển nhiên
append - viết thêm, đính kèm
appropriate - phù hợp, thích đáng
arbitrary - tuỳ hứng, độc đoán
aspect - khía cạnh
assemble - lắp ráp, tập hợp
assign - phân công, ấn định
assist - hỗ trợ, giúp đỡ
assume - giả định, cho rằng
assure - cam đoan, bảo đảm
attach - đính kèm, gắn bó
attain - đạt được
attitude - thái độ
attribute - quy cho/đặc tính
automate - tự động hoá
aware - nhận thức
behalf - thay mặt, nhân danh
bias - sự thiên vị, thành kiến
bond - sự gắn kết/liên kết
brief - ngắn gọn, tóm tắt
bulk - số lượng lớn, phần lớn
capable - có khả năng
category - danh mục, loại
cease - ngừng, chấm dứt
channel - kênh
chapter - chương, giai đoạn
chart - biểu đồ/lập biểu đồ
chemical - thuộc hoá học/hoá chất
circumstance - hoàn cảnh, tình huống
cite - trích dẫn
civil - thuộc dân sự
clarify - làm cho rõ ràng
classic - kinh điển, cổ điển
clause - điều khoản, mệnh đề
`;

// ===== AUTO PARSE =====
const cards = rawData
  .trim()
  .split("\n")
  .map((line, index) => {
    if (!line.includes(" - ")) return null;

    const [front, back] = line.split(" - ");

    return {
      id: index + 1,
      front: front.trim(),
      back: back.trim()
    };
  })
  .filter(card => card && card.front && card.back);
