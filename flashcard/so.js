window.TOPIC_NAME = "Từ vựng về số";

const rawData = `
Cardinal number - Số đếm
Ordinal number - Số thứ tự
Decimal - Số thập phân
Fraction - Phân số
Percentage - Phần trăm
Arithmetic - Số học
Divide - Chia
Plus - Cộng
Minus - Trừ
Multiply - Nhân
Equal - Ngang bằng, bằng
Total - Tổng, tổng số
Dozen - Tá (12 đơn vị)
Around - Khoảng
Zero - Số không
Hundred - Một trăm
Thousand - Một nghìn
Million - Một triệu
Billion - Một tỷ
Half - Một nửa
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
