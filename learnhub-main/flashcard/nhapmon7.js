// ===== DÁN DATA Ở ĐÂY =====
window.TOPIC_NAME = "Series Từ Vựng Nhập Môn P7";

const rawData = `
complete - hoàn thành
graduate - tốt nghiệp
pass - vượt qua, thi đỗ
retire - nghỉ hưu
film - bộ phim
guest - khách
report - báo cáo
project - dự án
one hundred - 100
one hundred and one - 101
one thousand - 1000
ten thousand - 10,000
one hundred thousand - 100,000
one million - 1,000,000
one billion - 1,000,000,000
touch - chạm vào
enter - tiến vào, đi vào
exercise - tập thể dục
borrow - mượn
park - đậu xe
sentence - câu
area - khu vực
wine - rượu
rule - quy định
pencil - bút chì
long - dài
hard - cứng
free - miễn phí
alone - một mình
here - ở đây
catch - bắt xe
laugh - cười
prefer - thích gì hơn
rich - giàu có
unhappy - không vui
sick - ốm
ill - ốm
chocolate - sô cô la
plane - máy bay
basketball - bóng rổ
fan - quạt
jacket - áo khoác
pizza - bánh pizza
black - màu đen
white - màu trắng
heavily - nặng hạt, lớn
extremely - cực kỳ
brush - rửa, đánh
go out - ra ngoài
move - chuyển
visit - ghé thăm
get home - về nhà
shopping mall - trung tâm mua sắm
bed - giường
job - công việc
office - văn phòng
bridge - cây cầu
college - trường đại học
phone - điện thoại
pagoda - ngôi chùa
young - trẻ
bad - tồi tệ
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
