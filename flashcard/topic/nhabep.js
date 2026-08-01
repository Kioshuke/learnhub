window.TOPIC_NAME = "Từ vựng về nhà bếp";

const rawData = `
Dishwasher - Máy rửa chén
Dish drainer - Kệ để chén bát
Steamer - Nồi hấp
Colander - Cái chao
Lid - Nắp, vung
Blender - Máy xay sinh tố
Pot - Nồi
Toaster - Lò nướng bánh
Dishtowel - Khăn lau chén
Refrigerator - Tủ lạnh
Freezer - Tủ đông
Cabinet - Tủ (có nhiều ngăn)
Microwave - Lò vi sóng
Bowl - Bát, chén
Cutting board - Thớt
Stove - Bếp lò
Coffee maker - Máy pha cà phê
Oven - Lò, lò nướng
Oven cleaner - Nước tẩy rửa lò
Jar - Lọ
Sink - Bồn rửa bát
Dish rack - Khay để ráo chén đĩa
Sponge - Bọt biển
Chopstick - Đũa
Pan - Chảo
Cooker - Bếp, nồi nấu
Mug - Cốc lớn
Kettle - Ấm đun nước
Glass - Ly
Teapot - Ấm pha trà
Grill - Vỉ nướng
Tray - Cái khay, cái mâm
Whisk - Máy đánh trứng
Knife - Dao
Spoon - Muỗng, thìa
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
