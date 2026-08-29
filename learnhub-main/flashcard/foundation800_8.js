// ===== DÁN DATA Ở ĐÂY =====
window.TOPIC_NAME = "800 Từ Vựng Nền Tảng P8";

const rawData = `
evidence - bằng chứng
evolution - sự tiến hoá, sự phát triển
exaggerate - phóng đại, thổi phồng
exceedingly - cực kỳ, rất nhiều
exclusive - riêng biệt, độc quyền
exert - áp dụng, nỗ lực
exhaustive - thấu đáo, toàn diện
adolescent - thanh thiếu niên
expansion - sự mở rộng
expertise - sự thành thạo, kỹ năng chuyên môn
explicit - rõ ràng, dứt khoát
exploit - khai thác, bóc lột
exposure - sự phơi nhiễm
external - bên ngoài, ngoại lai
extract - chiết xuất, trích dẫn
fabricate - thêu dệt, bịa đặt
advertise - quảng cáo
factor - nhân tố, yếu tố
faculty - khả năng/khoa
fascinating - lôi cuốn, quyến rũ
feasible - khả thi
feature - đặc điểm/mô tả đặc điểm
feedback - ý kiến phản hồi
finite - có hạn, có chừng mực
afford - có đủ khả năng chi trả
fluctuate - biến động, dao động
focus - tiêu điểm/tập trung
format - định dạng, hình thức
formula - công thức
forthcoming - sắp tới, sắp xuất hiện
foundation - sự thành lập, nền móng
fraction - phân số, phần nhỏ
framework - khuôn khổ, cơ cấu
frequency - tần suất
fulfill - hoàn thành, đáp ứng
function - chức năng/hoạt động
aggressive - hung hãn, quyết liệt
furthermore - hơn nữa
gender - giới tính
appoint - bổ nhiệm, chỉ định
genuine - thật, thành thật
global - toàn cầu
goal - mục tiêu
grant - ban cho/tiền trợ cấp
candidate - ứng cử viên
guideline - nguyên tắc chỉ đạo
hence - do đó, vì thế
hierarchy - hệ thống cấp bậc
highlight - làm nổi bật/điểm nhấn
automation - sự tự động hoá
identical - giống hệt nhau
ideology - hệ tư tưởng
ignorance - sự thiếu hiểu biết
desperate - tuyệt vọng, liều mạng
impact - tác động, ảnh hưởng
implement - thực hiện, triển khai
implication - sự ngụ ý, hệ quả
implicit - ngầm hiểu, tiềm ẩn
imply - ngụ ý, ám chỉ
impose - áp đặt, đánh thuế
incentive - sự khuyến khích, động lực
incidence - tỷ lệ mắc phải, sự rơi vào
incline - có xu hướng, nghiêng về
incorporate - sát nhập, kết hợp
index - chỉ số, mục lục
indicate - chỉ ra, cho biết
indispensable - không thể thiếu
induce - gây ra, xui khiến
deliberate - cố ý, có chủ tâm
infer - suy luận
conscious - có ý thức, tỉnh táo
inherent - vốn có, cố hữu
inhibit - ngăn chặn, ức chế
initial - ban đầu
initiative - sáng kiến, sự chủ động
innovate - đổi mới, sáng tạo
input - đầu vào, ý kiến đóng góp
insight - sự hiểu biết sâu sắc
inspect - thanh tra, kiểm tra
instance - ví dụ, trường hợp
institute - học viện/thiết lập
instruct - hướng dẫn, chỉ thị
instrument - nhạc cụ, công cụ
insufficient - không đủ, thiếu
integrity - chính trực, tính nguyên vẹn
complain - phàn nàn, khiếu nại
intense - mãnh liệt, cường độ cao
interact - tương tác
intermediate - trung cấp, trung gian
internal - nội bộ, bên trong
interpret - giải thích, phiên dịch
interval - khoảng thời gian, khoảng không
intervene - can thiệp
intrinsic - thuộc bản chất, nội tại
invest - đầu tư
invoke - cầu khẩn
involve - liên quan, bao gồm
isolate - cô lập, cách ly
issue - vấn đề/phát hành
item - món đồ, khoản, mục
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
