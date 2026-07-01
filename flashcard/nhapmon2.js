// ===== DÁN DATA Ở ĐÂY =====
window.TOPIC_NAME = "Series Từ Vựng Nhập Môn P2";

const rawData = `
park - công viên
garden - vườn
wardrobe - tủ quần áo
shopping centre - trung tâm mua sắm
table - cái bàn
wall - tường
floor - sàn nhà
sofa - ghế sô pha
school - trường học
work - nơi làm việc
home - nhà
supermarket - siêu thị
party - bữa tiệc
airport - sân bay
train station - nhà ga tàu
clock - đồng hồ
class - lớp học
English - tiếng Anh
maths - toán
exam - kỳ thi
birthday - ngày sinh nhật
morning - buổi sáng
afternoon - buổi chiều
evening - buổi tối
lunchtime - giờ ăn trưa
noon - 12 giờ trưa
midday - 12 giờ trưa
night - ban đêm
midnight - nửa đêm
Monday - thứ 2
Tuesday - thứ 3
Wednesday - thứ 4
Thursday - thứ 5
Friday - thứ 6
Saturday - thứ 7
Sunday - chủ nhật
play - chơi
watch - xem
read - đọc
write - viết
listen - nghe
speak - nói
ride - đạp, cưỡi
live - sống
like - thích
enjoy - thích
sing - hát
dance - nhảy
walk - đi bộ
learn - học
visit - ghé thăm
wash - rửa
study - học
have - có
do - làm
eat - ăn
go - đi
travel - đi lại, du lịch
help - giúp đỡ
drink - uống
chess - cờ vua
candy - kẹo
football - bóng đá
volleyball - bóng chuyền
badminton - cầu lông
tennis - quần vợt
guitar - đàn ghi-ta
dishes - bát đĩa
homework - bài tập về nhà
housework - công việc nhà
bike - xe đạp
bus - xe buýt
coffee - cà phê
university - đại học
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
