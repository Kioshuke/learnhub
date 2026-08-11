// ===== DÁN DATA Ở ĐÂY =====
window.TOPIC_NAME = "Series Từ Vựng Nhập Môn P8";

const rawData = `
important - quan trọng
possible - có thể
different - khác nhau
necessary - cần thiết
available - có sẵn
successful - thành công
recent - gần đây
public - công cộng
private - riêng tư
local - địa phương
international - quốc tế
customer - khách hàng
company - công ty
office - văn phòng
manager - quản lý
employee - nhân viên
meeting - cuộc họp
project - dự án
schedule - lịch trình
report - báo cáo
information - thông tin
message - tin nhắn
problem - vấn đề
solution - giải pháp
reason - lý do
result - kết quả
opportunity - cơ hội
experience - kinh nghiệm
decision - quyết định
service - dịch vụ
product - sản phẩm
price - giá cả
order - đơn hàng
delivery - giao hàng
payment - thanh toán
travel - du lịch
airport - sân bay
ticket - vé
reservation - đặt chỗ
hotel - khách sạn
improve - cải thiện
increase - tăng lên
reduce - giảm xuống
provide - cung cấp
require - yêu cầu
receive - nhận được
develop - phát triển
discuss - thảo luận
explain - giải thích
recommend - đề xuất
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
