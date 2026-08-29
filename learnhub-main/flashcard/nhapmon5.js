// ===== DÁN DATA Ở ĐÂY =====
window.TOPIC_NAME = "Series Từ Vựng Nhập Môn P5";

const rawData = `
rest - nghỉ ngơi
close - đóng lại
type - gõ
give - đưa cho
talk - nói chuyện
fly - bay
stand - đứng
wait - đợi
gate - cổng
living room - phòng khách
dentist - nha sĩ
letter - lá thư
keyboard - bàn phím
yard - sân
attend - tham dự
make - làm
mop - lau, chùi
shop - mua sắm
sit - ngồi
build - xây dựng
love - yêu thích
know - biết
think - nghĩ rằng
believe - tin rằng
radio - đài phát thanh
meeting - cuộc họp
answer - câu trả lời
skirt - váy
begin - bắt đầu
break - làm vỡ
bring - mang theo
come - đến
cost - trị giá
cut - cắt
draw - vẽ
find - tìm thấy
get - có được
hear - nghe
hold - tổ chức, cầm, nắm
keep - giữ
pay - trả tiền
say - nói
sell - bán
send - gửi
spend - dành thời gian, tiền bạc
take - cầm, mang
tell - kể, bảo
win - chiến thắng
hour - giờ
day - ngày
story - câu chuyện
vase - cái bình
movie - bộ phim
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
