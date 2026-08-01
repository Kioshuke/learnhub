window.TOPIC_NAME = "Từ vựng về tình bạn";

const rawData = `
Classmate - Bạn cùng lớp
Schoolmate - Bạn cùng trường
Roommate - Bạn cùng phòng
Soulmate - Tri kỷ
Colleague - Đồng nghiệp
Comradeship - Tình bạn, tình đồng chí
Partner - Cộng sự
Associate - Bạn đồng liêu, đồng minh
Buddy - Bạn thân
Ally - Đồng minh
Companion - Bạn đồng hành
Pal - Bạn (từ lóng)
Friendship - Tình bạn
Close - Thân thiết
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
