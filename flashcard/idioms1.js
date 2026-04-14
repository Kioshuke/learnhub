// ===== DÁN DATA Ở ĐÂY =====
window.TOPIC_NAME = "50 Idioms";

const rawData = `
Burn the midnight oil - Thức khuya làm việc, học bài
Go the extra mile - Nỗ lực nhiều hơn mức mong đợi
Pull out all the stops - Nỗ lực hết sức, dùng mọi cách để đạt mục tiêu
Hit the books - Bắt đầu học tập một cách nghiêm túc
Back to the drawing board - Bắt đầu lại từ đầu (vì kế hoạch trước thất bại)
Pass with flying colors - Vượt qua (kỳ thi) với kết quả rực rỡ
Keep one's chin up - Giữ vững can đảm, không nản chí
Practice makes perfect - Có công mài sắt có ngày nên kim
Carry the day - Chiến thắng, thành công sau một cuộc tranh luận/thi đấu
The sky is the limit - Không có giới hạn cho sự thành công
Under the weather - Cảm thấy không khỏe
A hot potato - Một vấn đề nan giải, nóng hổi và gây tranh cãi
Between a rock and a hard place - Tiến thoái lưỡng nan
The last straw - Giọt nước tràn ly
Barking up the wrong tree - Tìm kiếm giải pháp sai chỗ/Hiểu lầm vấn đề
Beat around the bush - Nói vòng vo tam quốc
A blessing in disguise - Trong cái rủi có cái may
Face the music - Chấp nhận hình phạt/đối mặt với thực tế phũ phàng
In the same boat - Cùng chung cảnh ngộ
Get out of hand - Mất kiểm soát
A couch potato - Người lười biếng, chỉ thích xem TV
A big fish in a small pond - Người quan trọng trong một tổ chức nhỏ
The black sheep of the family - Nghịch tử/Người khác biệt trong gia đình
A wet blanket - Người làm mất hứng, phá đám
Have a heart of gold - Có tấm lòng nhân hậu
Down-to-earth - Thực tế, khiêm tốn
As keen as mustard - Rất nhiệt huyết, hăng hái
A pain in the neck - Người hoặc vật gây phiền phức
A Jack of all trades - Người có thể làm nhiều việc nhưng không giỏi hẳn việc nào
An eager beaver - Người làm việc rất chăm chỉ, sốt sắng
Once in a blue moon - Rất hiếm khi xảy ra
Against the clock - Chạy đua với thời gian
At the eleventh hour - Vào phút chót
Time and tide wait for no man - Thời gian không chờ đợi ai
Make ends meet - Trang trải cuộc sống, kiếm đủ tiền để sống
Cost an arm and a leg - Rất đắt đỏ
Money doesn't grow on trees - Tiền không phải tự nhiên mà có
From scratch - Bắt đầu từ con số không
In the long run - Về lâu về dài
Call it a day - Nghỉ tay, kết thúc một ngày làm việc
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
