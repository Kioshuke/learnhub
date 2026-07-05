// ===== DÁN DATA Ở ĐÂY =====
window.TOPIC_NAME = "Series Từ Vựng Nhập Môn P3";

const rawData = `
work - làm việc
swim - bơi lội
drive - lái xe
share - dùng chung, ở chung
phone - gọi điện
get up - thức dậy
teach - dạy học
jog - chạy bộ
buy - mua
water - tưới nước
meat - thịt
plant - cây trồng
weekend - cuối tuần
flat - căn hộ
café - quán cà phê
free time - thời gian rảnh
ice cream - kem
gym - phòng tập thể hình
food - đồ ăn
hospital - bệnh viện
rain - mưa
snow - rơi tuyết
wear - mặc, đội
finish - hoàn thành
sleep - ngủ
understand - hiểu
rent - thuê
clean - lau dọn
feed - cho ăn
want - muốn
bank - ngân hàng
fruit - quả
vegetable - rau củ
tea - trà
cinema - rạp chiếu phim
question - câu hỏi
pie - bánh
toy - đồ chơi
violin - vi-ô-lông
window - cửa sổ
summer - mùa hè
winter - mùa đông
rise - mọc
set - lặn
leave - rời
start - bắt đầu
boil - sôi
see - ghé thăm
hate - ghét
have - ăn sáng/ trưa/ tối
tidy - dọn dẹp
meet - gặp gỡ
cycle - đạp xe
run - chạy
turn - biến thành
cry - khóc
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
