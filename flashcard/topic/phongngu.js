window.TOPIC_NAME = "Từ vựng về phòng ngủ";

const rawData = `
Lamp - Đèn
Pillowcase - Bao gối
Curtain - Rèm
Bed - Giường
Mirror - Gương
Cushion - Đệm
Wardrobe - Tủ quần áo
Fitted carpet - Thảm lót sàn
Dressing table - Bàn trang điểm
Wallpaper - Giấy dán tường
Pillow - Gối
Carpet - Tấm thảm
Blind - Mành, rèm che
Mattress - Nệm
Bedspread - Khăn trải giường
Blanket - Tấm chăn, mền
Jewelry - Trang sức
Alarm clock - Đồng hồ báo thức
Air conditioner - Máy điều hòa
Box spring - Khung lò xo nâng nệm
Comforter - Chăn bông
Hanger - Móc treo (quần áo)
Closet - Tủ đóng trong tường
Comb - Lược
Light switch - Công tắc điện
Chest of drawers - Tủ kéo
`;

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
