window.TOPIC_NAME = "Từ vựng về hoạt động thường ngày";

const rawData = `
Brush your teeth - Đánh răng
Buy - Mua
Comb the hair - Chải đầu
Cook - Nấu ăn
Do exercise - Tập thể dục
Do your homework - Làm bài tập về nhà
Eat out - Đi ăn ở ngoài
Feed the dog - Cho chó ăn
Finish working - Kết thúc công việc
Gardening - Làm vườn
Get dressed - Mặc quần áo
Get up - Thức dậy
Go home - Về nhà
Go shopping - Đi mua sắm
Go to bed - Đi ngủ
Go to the movies - Đi xem phim
Have a bath - Đi tắm
Have a nap - Ngủ ngắn
Have breakfast - Ăn sáng
Have dinner - Ăn tối
Have lunch - Ăn trưa
Have a shower - Tắm vòi hoa sen
Listen to music - Nghe nhạc
Make breakfast - Làm bữa ăn sáng
Make up - Trang điểm
Meditation - Thiền
Play an instrument - Chơi nhạc cụ
Play outside - Đi ra ngoài chơi
Play sports - Chơi thể thao
Play video games - Chơi trò chơi điện tử
Read books - Đọc sách
Read newspapers - Đọc báo
Relax - Thư giãn
Set the alarm - Đặt chuông báo thức
Shave - Cạo râu
Sleep - Ngủ
Study - Học tập, nghiên cứu
Surf the internet - Lướt mạng
Take the rubbish out - Đi đổ rác
Drink - Uống
Turn off - Tắt
Visit your friend - Thăm bạn bè
Wake up - Tỉnh giấc
Wash your face - Rửa mặt
Wash the dishes - Rửa chén
Watch television - Xem tivi
Work - Làm việc
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
