// ===== DÁN DATA Ở ĐÂY =====
window.TOPIC_NAME = "Series Từ Vựng Nhập Môn P6";

const rawData = `
bill - hoá đơn
suit - bộ com lê
factory - nhà máy
family - gia đình
shoe - giày
contest - cuộc thi
cold - lạnh
fresh - tươi, mới
close - gần, gần gũi
late - muộn
abroad - nước ngoài
chat - tán gẫu
fix - sửa chữa
stop - dừng lại
arrive - đến
change - thay, thay đổi
follow - lắng nghe, theo dõi
bicycle - xe đạp
accident - vụ tai nạn
police - cảnh sát
clothes - quần áo
game - trò chơi
receive - nhận được
search - tìm kiếm
marry - kết hôn
lose - mất
paint - sơn
smoke - hút thuốc
match - trận đấu
song - bài hát
essay - bài luận
minute - phút
key - chìa khoá
message - tin nhắn
time - lần
watch - đồng hồ
return - quay trở lại
check - kiểm tra
lend - cho vay, cho mượn
look - trông có vẻ
cancel - huỷ bỏ
carry - mang, vác
turn on - bật lên
suitcase - va li
drink - đồ uống
juice - nước ép
heater - máy sưởi
partner - bạn đời, bạn đồng hành
tired - mệt mỏi
hungry - đói
better - tốt hơn, khoẻ hơn
perfect - hoàn hảo
today - hôm nay
tomorrow - ngày mai
tonight - tối nay
soon - sớm
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
