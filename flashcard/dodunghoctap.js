window.TOPIC_NAME = "Từ vựng về đồ dùng học tập";

const rawData = `
Watercolour - Màu nước
Thumbtack - Đinh ghim
Textbook - Sách giáo khoa
Test Tube - Ống nghiệm
Tape measure - Thước dây
Stencil - Giấy nến
Stapler - Đồ dập ghim
Staple remover - Cái gỡ ghim bấm
Set Square - Ê-ke
Scotch Tape - Băng dính trong suốt
Scissors - Kéo
Ruler - Thước
Ribbon - Ruy-băng
Protractor - Thước đo góc
Post-it note - Giấy nhớ
Pin - Đinh ghim, kẹp
Pencil - Bút chì
Pencil Sharpener - Đồ gọt bút chì
Pencil Case - Hộp bút
Pen - Bút mực
Paper - Giấy
Paper fastener - Dụng cụ kẹp giấy
Paper Clip - Kẹp giấy
Palette - Bảng màu
Paint - Sơn, màu
Paintbrush - Chổi sơn
Notebook - Cuốn sổ, vở
Map - Bản đồ
Magnifying Glass - Kính lúp
Index card - Phiếu làm mục lục
Highlighter - Bút đánh dấu màu
Glue - Keo
Globe - Quả địa cầu
Flash card - Thẻ ghi nhớ
File Holder - Tập hồ sơ
File cabinet - Tủ đựng tài liệu
Felt pen - Bút dạ
Rubber - Cục tẩy
Duster - Khăn lau bảng
Dossier - Hồ sơ
Dictionary - Từ điển
Desk - Bàn học
Crayon - Bút chì màu
Computer - Máy tính bàn
Compass - Com-pa
Coloured Pencil - Bút chì màu
Clock - Đồng hồ treo tường
Clamp - Kẹp
Chalk - Phấn
Chair - Ghế
Carbon paper - Giấy than
Calculator - Máy tính cầm tay
Bookcase - Giá sách
Book - Sách
Board - Bảng
Blackboard - Bảng đen
Binder - Bìa rời
Beaker - Cốc bêse
Ballpoint pen - Bút bi
Bag - Cặp sách
Backpack - Ba lô
Funnel - Cái phễu
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
