// ===== DÁN DATA Ở ĐÂY =====
window.TOPIC_NAME = "Series Từ Vựng Nhập Môn P1";

const rawData = `
man - người đàn ông
woman - người phụ nữ
father - bố
mother - mẹ
teacher - giáo viên
student - học sinh
brother - anh trai / em trai
sister - chị gái / em gái
baby - đứa bé
child - đứa trẻ, đứa con
dog - chó
cat - mèo
book - sách
car - ô tô
orange - quả cam
apple - quả táo
tall - cao
short - thấp, ngắn
big - lớn
small - nhỏ
happy - vui vẻ
sad - buồn
uncle - chú, bác
aunt - dì, cô
parent - bố/ mẹ
children - con cái, trẻ em
room - phòng
kitchen - bếp
daughter - con gái
son - con trai
picture - bức tranh
box - cái hộp
doctor - bác sĩ
lawyer - luật sư
firefighter - lính cứu hoả
friend - bạn bè
lovely - đáng yêu
late - muộn
busy - bận rộn
kind - tốt bụng
new - mới
old - cũ
grandfather - ông
grandmother - bà
cousin - anh/chị/em họ
classmate - bạn cùng lớp
banana - quả chuối
cake - bánh
bag - cái túi, cái cặp
desk - cái bàn
chair - cái ghế
shirt - áo sơ mi
hat - cái mũ
jeans - quần bò
pillow - cái gối
sock - cái tất
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
