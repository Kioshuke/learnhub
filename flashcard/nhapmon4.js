// ===== DÁN DATA Ở ĐÂY =====
window.TOPIC_NAME = "Series Từ Vựng Nhập Môn P4";

const rawData = `
Sun - mặt trời
world - thế giới
East - phía Đông
West - phía Tây
spring - mùa xuân
autumn/fall - mùa thu
people - mọi người
park - công viên
student - học sinh, sinh viên
water - nước
brother-in-law - anh/ em rể
sister-in-law - chị/ em dâu
breakfast - bữa sáng
dinner - bữa tối
bedroom - phòng ngủ
cartoon - hoạt hình
novel - tiểu thuyết
tree - cây cối
hot - nóng
active - năng động
cute - đáng yêu
clean - sạch sẽ
tidy - gọn gàng
neat - ngăn nắp
yellow - màu vàng
careful - cẩn thận
always - luôn luôn
usually - thường thường
often - thường
sometimes - thỉnh thoảng
hardly - hiếm khi
never - không bao giờ
flower - hoa
girl - cô gái
teacher - giáo viên
actor - diễn viên
moment - khoảnh khắc
boy - chàng trai
happiness - niềm vui
city - thành phố
artist - nghệ sĩ
weather - thời tiết
nice - tốt, đẹp
good - tốt, khoẻ
great - tuyệt vời
easy - dễ dàng
beautiful - đẹp
suitable - phù hợp
active - năng động
careless - bất cẩn
quickly - nhanh chóng
carefully - đầy cẩn thận
carelessly - đầy bất cẩn
fast - nhanh
well - tốt, giỏi
hard - chăm chỉ
very - rất
quite - khá
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
