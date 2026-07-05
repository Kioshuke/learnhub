// ===== DÁN DATA Ở ĐÂY =====
window.TOPIC_NAME = "Tổng hợp 296 cụm từ cố định Phần 3";

const rawData = `
make an improvement - cải thiện
make an offer - đưa ra lời đề nghị
make arrangements for sth - sắp xếp cho cái gì
make changes - thay đổi
make comparison between... - so sánh giữa...
make ends meet - trang trải cuộc sống
make preparations for sth - chuẩn bị cho cái gì
make sense - có lý, dễ hiểu
make the bed - dọn giường
make use of sth - tận dụng cái gì
manage a/ the budget - quản lý ngân sách
meet a deadline - hoàn thành đúng hạn
miss a deadline - quá hạn, lỡ hạn
meet a requirement/ need/ demand - đáp ứng yêu cầu/nhu cầu
meet one's expectations - đáp ứng mong đợi của ai
on a regular basis = regularly - một cách thường xuyên
on purpose - có mục đích, cố ý
overcome one's fear - vượt qua nỗi sợ hãi
pay attention to sth - chú ý đến cái gì
pay sb a compliment - khen ngợi ai đó
pay sb a visit = visit sb - thăm ai đó
perform a task - thực hiện nhiệm vụ
pick one's brain about sth - hỏi ý kiến ai đó về điều gì
play a role/ part in sth - đóng vai trò trong cái gì
pose a threat/ risk/ challenge to sb/ sth - gây ra mối đe dọa/rủi ro/thách thức cho ai/cái gì
put a stop/ an end to sth - chấm dứt cái gì
put blame on sb for sth - đổ lỗi cho ai về việc gì
put pressure on sb/ sth - gây áp lực lên ai/cái gì
raise awareness of sth - nâng cao nhận thức về cái gì
raise money for sth - quyên góp tiền cho cái gì
reach a compromise - đạt được sự thỏa hiệp
reach an agreement/ a decision - đạt được thỏa thuận/quyết định
read one's mind - đọc được suy nghĩ của ai
realize one's dream - thực hiện ước mơ
save one's life - cứu mạng ai đó
save space/ time/ money/ energy - tiết kiệm không gian/thời gian/tiền bạc/năng lượng
save the environment - bảo vệ môi trường
set a good/ bad example for sb - nêu gương tốt/xấu cho ai
set a target/ goal - đặt ra mục tiêu
set foot in/ on sth - đặt chân đến đâu
set free - giải phóng, trả tự do
settle a dispute/ argument - giải quyết tranh chấp/tranh luận
shake hands with sb - bắt tay với ai
share a viewpoint on sth - có cùng quan điểm về cái gì
show respect for/ to sb/ sth - thể hiện sự tôn trọng đối với ai/cái gì
solve a problem - giải quyết vấn đề
spare one's feelings - tránh làm tổn thương tình cảm của ai
spread the disease - lây lan bệnh tật
stand a chance of doing sth - có cơ hội làm gì
stay awake - thức, không ngủ
stay calm - giữ bình tĩnh
stay healthy/ fit - giữ sức khỏe/vóc dáng
stay in shape - giữ dáng
stick to the rules - tuân thủ các quy tắc
study abroad - du học
suit one's taste/ needs - phù hợp với khẩu vị/nhu cầu của ai
take a break - nghỉ giải lao
take a deep breath - hít thở sâu
take a nap - ngủ trưa, chợp mắt
take a photo/ picture of sb/ sth - chụp ảnh ai/cái gì
take a risk/ risks - mạo hiểm
take a seat - ngồi xuống
take a shower/ bath - đi tắm
take action - hành động
take advantage of sth/ sb - tận dụng/lợi dụng cái gì/ai
take an exam/ test - đi thi, làm bài kiểm tra
take care of sb/ sth = look after - chăm sóc ai/cái gì
take measures - thực hiện các biện pháp
take notes - ghi chú
take notice of sth/ sb - chú ý đến cái gì/ai
take one's advice - nghe theo lời khuyên của ai
take part in sth = join = participate in - tham gia vào cái gì
take pity on sb - thương hại ai đó
take pride in sb/ sth = be proud of - tự hào về ai/cái gì
take responsibility for sth/ doing sth - chịu trách nhiệm về cái gì
take sb/ sth for granted - coi nhẹ ai/cái gì (coi là hiển nhiên)
take sth into account/ consideration - cân nhắc/xem xét điều gì
take tablets - uống thuốc
take temperature - đo nhiệt độ
take/ do a course - tham gia một khóa học
take/ have a look at sth - nhìn vào, chú ý vào cái gì
have/ throw/ give a party - tổ chức một bữa tiệc
travel light - du lịch nhẹ (mang ít đồ)
upset the balance of the ecosystem - làm mất cân bằng hệ sinh thái
walk on air - cực kỳ hạnh phúc
waste time/ money doing sth - lãng phí thời gian/tiền bạc làm gì
win a scholarship - giành được học bổng
win a victory - giành chiến thắng
work overtime - làm thêm giờ
work part-time/ full-time - làm việc bán thời gian/toàn thời gian
keep a secret - giữ bí mật
tell a secret - tiết lộ bí mật
break a heart - làm tổn thương trái tim ai
lose a heart - đem lòng yêu ai
win a heart - chiếm được tình cảm của ai
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
