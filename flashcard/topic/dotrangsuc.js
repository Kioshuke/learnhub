window.TOPIC_NAME = "Từ vựng về đồ trang sức";

const rawData = `
Earring - Bông tai
Necklace - Dây chuyền
Bracelet - Vòng tay
Brooch - Trâm cài
Hair clip - Kẹp tóc
Wedding ring - Nhẫn cưới
Jeweler - Thợ kim hoàn
Jewelry store - Cửa hàng trang sức
Anklet - Vòng chân
Noble - Quý
Luxurious - Sang trọng, xa hoa
Modern - Hiện đại
Suitable - Phù hợp, thích hợp
Twinkle - Lấp lánh
Bead - Hạt (của chuỗi hạt)
Hair tie - Dây buộc tóc
Pocket watch - Đồng hồ bỏ túi
Tiepin - Ghim cà vạt
Precious stone - Đá quý
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
