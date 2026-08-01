window.TOPIC_NAME = "Từ vựng về chủ đề biển";

const rawData = `
Sea - Biển
Ocean - Đại dương
Wave - Sóng
Island - Hòn đảo
Harbor - Cảng biển
Lighthouse - Hải đăng
Submarine - Tàu ngầm
Ship - Tàu thuỷ
Boat - Thuyền
Captain - Thuyền trưởng
Fisherman - Ngư dân
Lifeguard - Người cứu hộ
Seashore - Bờ biển
Beach - Bãi biển
Coast - Bờ biển
Seagull - Mòng biển
Whale - Cá voi
Shark - Cá mập
Dolphin - Cá heo
Octopus - Bạch tuộc
Fish - Cá
Jellyfish - Sứa
Sea horse - Cá ngựa
Seaweed - Rong biển
Coral - San hô
Coral reef - Rạn san hô
Shellfish - Động vật có vỏ
Clam - Nghêu
Starfish - Sao biển
Seal - Hải cẩu
Turtle - Rùa biển
Crab - Cua
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
