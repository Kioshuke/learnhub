// ===== DÁN DATA Ở ĐÂY =====
window.TOPIC_NAME = "Tổng hợp 296 cụm từ cố định Phần 1";

const rawData = `
achieve/ accomplish/ reach a goal - đạt được mục tiêu
meet one's goals - thực hiện được mục tiêu
set yourself a goal - đặt ra mục tiêu cho bản thân
alter/ change one's behavior - thay đổi hành vi
answer the door - mở cửa khi nghe ai đó gõ cửa hoặc bấm chuông
ask permission to do sth - xin phép để làm điều gì
be at fault for sth/ doing sth - chịu trách nhiệm hoặc có lỗi về (làm) điều gì đó
break a record - phá vỡ kỷ lục
hold a record - nắm giữ kỉ lục
set a new record - lập kỉ lục
break a rule - phá luật
break the habit - từ bỏ thói quen
break the/ one's curfew - phá vỡ quy định giờ nghiêm của ai
bridge the gap - thu hẹp khoảng cách
broaden one's horizon - mở rộng tầm nhìn của ai
burst into flames - bừng cháy
by chance/ mistake/ accident/ coincidence - một cách tình cờ >< có chủ định
catch a bus/train... - bắt xe buýt/tàu hỏa...
miss a bus/train... - nhỡ xe buýt/tàu hỏa...
catch the disease - mắc bệnh
cause/ do damage to sth - gây thiệt hại cho cái gì
challenge one's beliefs - thách thức niềm tin của ai đó
change one's mind about sth - thay đổi suy nghĩ của một người/về điều gì đó
clear the table - dọn dẹp bàn ăn (sau khi ăn xong)
set/ lay the table - bày bàn ăn (trước khi ăn)
come into contact with sb/ sth - tiếp xúc, gặp gỡ ai/cái gì
disguise the truth - che đậy sự thật
distort the truth - xuyên tạc, bóp méo sự thật
tell the truth >< tell a lie - nói sự thật >< nói dối
do (the) chores - làm việc nhà
do (the) grocery shopping - đi mua hàng tạp hóa, thực phẩm
do a degree - học lấy một tấm bằng
get a degree - nhận bằng cấp
have a degree in sth - có bằng cấp về thứ gì
do a good deed for sb - làm một việc tốt cho ai
do babysitting - trông trẻ
do crossword puzzles - giải câu đố ô chữ
do drama - đóng kịch
do harm to sb/ sth - gây hại cho ai/cái gì
do internship - đi thực tập
do one's revision - ôn tập
do one's/ the laundry - giặt quần áo
do push-ups - chống đẩy
do research - làm nghiên cứu
do sports - tập thể thao
do sth for fun - làm điều gì cho vui
do the gardening - làm vườn
do the housework/ homework - làm việc nhà/bài tập về nhà
do the shopping/ cooking/ ironing - đi mua sắm/nấu ăn/giặt/ủi quần áo
do the washing-up - rửa bát
do training - tập luyện, đào tạo
do weights - tập tạ
do yoga - tập yoga
do/ conduct/ carry out a project - làm dự án
do/ conduct/ carry out a survey - thực hiện một cuộc khảo sát
do/ perform an operation on sb - thực hiện phẫu thuật cho ai
do/ take exercise - tập thể dục
do/ try one's best (to do sth) - cố gắng hết sức (làm việc gì đó)
dos and don'ts/ do's and don'ts - những điều nên và không nên làm
draw/make inferences from sth - rút ra suy luận từ cái gì
drive sb mad/ crazy - khiến ai đó phát điên
earn one's trust - giành được lòng tin của ai
earn/ make a living - kiếm sống
earn/ make money - kiếm tiền
fall asleep - buồn ngủ, ngủ thiếp đi
fall ill with sth - bị bệnh gì
follow in one's footsteps - theo bước, tiếp bước ai
follow one's advice - nghe theo lời khuyên của ai
follow one's dream - theo đuổi ước mơ
follow the rules - theo quy tắc
set rules - đặt ra quy tắc
follow/ pursue one's passions - theo đuổi đam mê
for the time being - trong lúc này
gain a new skill - đạt được một kỹ năng mới
gain confidence - đạt được sự tự tin
gain employment = find a job - có được việc làm
gain popularity - đạt được sự nổi tiếng
gain the recognition of sb for sth - nhận được sự công nhận của ai đó vì điều gì
gain the respect of sb - nhận được sự tôn trọng của ai
gain/ have insights into/ on/ about sth - có được cái nhìn sâu sắc về điều gì
give/ provide insights into/ on/ about sth - cung cấp cái nhìn sâu sắc hoặc hiểu biết về điều gì đó
gain/ put on weight - tăng cân
lose weight - giảm cân
get a fine - bị phạt tiền
get a grasp of sth - nắm bắt được điều gì
get good/ bad marks - đạt điểm cao/kém
get into debt - dính vào nợ nần
get into shape - lấy lại vóc dáng
get into the habit of sth - thói quen làm việc gì đó
get into trouble for doing sth - gặp rắc rối vì làm việc gì
get into university - đậu vào đại học
get left behind - bị bỏ lại phía sau
get lost - bị lạc
get one's permission to do sth - được ai đó cho phép làm gì
get rid of sth - loại bỏ cái gì
get together - gặp gỡ, gặp mặt
get/ have access to sth - có quyền truy cập vào cái gì
get/ keep in touch with sb - liên lạc với ai đó
give a talk - nói chuyện
give birth to sb - sinh con
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
