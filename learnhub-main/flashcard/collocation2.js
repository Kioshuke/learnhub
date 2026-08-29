// ===== DÁN DATA Ở ĐÂY =====
window.TOPIC_NAME = "Tổng hợp 296 cụm từ cố định Phần 2";

const rawData = `
give one's scores - cho ai đó điểm
give rise to sth - gây ra cái gì
give sb a call - gọi cho ai đó
give sb a compliment - khen ngợi ai
give sb an advice on sth - cho ai lời khuyên về điều gì
give sb an injection - tiêm cho ai một mũi
give voice to sth - bày tỏ quan điểm, suy nghĩ về điều gì
give/ make/ deliver a welcome speech - phát biểu chào mừng
give/ offer sb a chance to do sth - cho ai một cơ hội để làm gì
give/ offer sb a hand = do sb a favor = help - giúp ai đó một tay
go blank - tạm thời quên một điều gì đó mà bạn biết
go for a walk - đi dạo
go green - sống xanh
go on a demonstration/ a march - đi biểu tình/điều hành
go on a detox - đi giải độc
go on a diet - ăn kiêng
go on an ecotour - đi du lịch sinh thái
go online - truy cập trực tuyến
go vertical - đi theo chiều dọc, theo chiều thẳng đứng
go viral - được lan truyền rộng rãi
go/ become extinct - tuyệt chủng
gut feeling/ reaction - có linh cảm
have + time + off - có .... được nghỉ
have a discussion (with sb) about sth - thảo luận với ai về điều gì
have a good/ bad influence/ effect/ impact on sb/ sth - có ảnh hưởng tốt/xấu đến ai/cái gì
have a habit of doing sth - có thói quen làm điều gì
have a hope of doing sth - có hy vọng làm được điều gì đó
have a moment to spare - có một chút thời gian rảnh rỗi
have a nosebleed - bị chảy máu cam
have a passion for sth - có niềm đam mê với cái gì đó
have a sharp eye for sth - có con mắt tinh tường về cái gì
have a strong/ keen interest in sth - có sự quan tâm sâu sắc tới cái gì
have a word with sb - nói một lời với ai đó
have an opinion of sb/ sth - có ý kiến về ai/cái gì
have arguments over/ about sth with sb - tranh luận về điều gì với ai
have breakfast/ lunch/ dinner - ăn sáng/trưa/tối
make breakfast/ lunch/ dinner - làm, nấu bữa sáng/trưa/tối
have confidence in sb/ oneself - có niềm tin vào ai/chính mình
have conversations with sb - nói chuyện với ai
have difficulty/ trouble doing sth - gặp khó khăn/rắc rối khi làm điều gì
have lots of/ no common sense - có nhiều/không có ý thức chung
have sth in common - có điểm gì chung
have natural ability to do sth - có tài năng thiên bẩm để làm gì
have no idea - không biết, không có ý kiến gì
have the time of your life - tận hưởng thời gian của cuộc đời bạn
have the wish to do sth - có mong muốn làm điều gì
have/ gain an advantage over sb - có lợi thế hơn ai đó
hold one's breath - nín thở
hold out of breath - thở hổn hển, thở không ra hơi
hold views about sth - giữ quan điểm về điều gì
hurt one's feeling - làm tổn thương ai
hustle and bustle - hối hả và nhộn nhịp
join hands = work together - chung tay
keep in mind - ghi nhớ
keep in shape - giữ dáng
keep one's identity secret - giữ bí mật danh tính của ai đó
keep one's mind sharp - giữ đầu óc minh mẫn
keep one's promise/ word - giữ lời hứa
break one's promise/ word - thất hứa
make a promise - thực hiện một lời hứa
keep sb updated - cập nhật thông tin cho ai
keep track of sth - theo dõi cái gì
land the job - tìm được công việc
lay the foundation for sth - đặt nền móng cho cái gì
lead a/ an + adj + lifestyle/ life - có lối sống/cuộc đời như thế nào
lead sb by the nose - dắt mũi ai đó
learn by heart - học thuộc lòng
leave sb/ sth alone - để ai/cái gì yên
leave/ make an impression on sb - để lại ấn tượng cho ai
lend/ give sb a hand - giúp đỡ ai đó
lose one's temper - mất bình tĩnh, nổi nóng
keep one's temper - giữ bình tĩnh
make a contribution to sth - đóng góp cho cái gì
make a decision to do sth/ on sth - đưa ra quyết định làm gì/về cái gì
make a difference to sth/ sb - tạo ra sự khác biệt cho cái gì/ai
make a discovery - khám phá, tìm ra
make a fuss about sth - làm rối lên, làm om sòm về cái gì
make a good/ bad impression on sb - tạo ấn tượng tốt/xấu với ai
make a list of sth - lập danh sách cái gì
make a living - kiếm sống
make a mess of sth - làm hỏng cái gì, làm lộn xộn cái gì
make a mistake/ many mistakes - phạm sai lầm/nhiều sai lầm
make a move - rời đi, di chuyển
make a noise - làm ồn
make a phone call to sb - gọi điện thoại cho ai
make a plan for sth/ to do sth - lập kế hoạch cho cái gì/để làm gì
make a point of doing sth - coi việc làm gì là quan trọng
make a profit >< make a loss - tạo ra lợi nhuận >< thua lỗ
make a progress - có tiến bộ
make a sacrifice to do sth - hy sinh để làm gì
make a speech - phát biểu
make a start on sth - bắt đầu làm gì
make a suggestion for sth/ to do sth - đưa ra gợi ý cho cái gì/để làm gì
make a threat to do sth - đe dọa làm gì
make an announcement about sth - thông báo về cái gì
make an appointment with sb - hẹn gặp ai
make an attempt to do sth - cố gắng làm gì
make an effort to do sth - nỗ lực làm gì
make an excuse - viện cớ, bào chữa
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
