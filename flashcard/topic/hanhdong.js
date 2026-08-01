window.TOPIC_NAME = "Từ vựng về hành động";

const rawData = `
Pack - Bó, gói
Paint - Quét sơn
Paste - Dán
Pick - Hái, nhổ
Plant - Trồng
Play - Chơi
Point - Chỉ
Pour - Rót, đổ
Pull - Lôi, kéo
Push - Xô, đẩy
Rake - Cào, cời
Read - Đọc
Ride - Đi, cưỡi
Row - Chèo thuyền
Run - Chạy
Sail - Lái (thuyền buồm)
Scrub - Lau, chùi, cọ rửa
See - Thấy, xem
Set - Để, đặt
Sew - May, khâu
Shout - La hét, reo hò
Show - Cho xem, cho thấy, trưng bày
Sing - Hát, hót
Sit - Ngồi
Skate - Trượt băng
Skip - Nhảy
Sleep - Ngủ
Slide - Trượt
Sneeze - Hắt hơi
Spin - Quay
Stand - Đứng
Stop - Ngừng
Sweep - Quét qua; lan ra
Swim - Bơi
Swing - Đu đưa
Take - Cầm, nắm, lấy
Talk - Nói chuyện
Tell - Nói
Throw - Ném, quăng
Tie - Buộc, cột, trói
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
