// ===== DÁN DATA Ở ĐÂY =====
window.TOPIC_NAME = "300 Từ Vựng Tủ Chuyên Sâu P1";

const rawData = `
Acknowledge - Thừa nhận, công nhận
Acquisition - Sự giành được, mua lại
Adolescence - Thời thanh thiếu niên
Adoption - Sự chấp nhận, thông qua
Advent - Sự xuất hiện, ra đời
Advancement - Sự tiến bộ, thăng tiến
Alienate - Làm cho xa lánh
Allegation - Sự cáo buộc
Ambivalent - Mâu thuẫn trong tư tưởng
Amplify - Khuếch đại, mở rộng
Analogous - Tương tự
Annihilate - Tiêu diệt hoàn toàn
Antagonistic - Đối kháng, thù địch
Apathy - Sự thờ ơ, vô cảm
Apex - Đỉnh cao, cực điểm
Appall - Làm kinh hãi
Apparatus - Thiết bị, bộ máy
Appease - Nhân nhượng, xoa dịu
Arbitrate - Phân xử, làm trọng tài
Archaic - Cổ xưa, lỗi thời
Assiduous - Siêng năng, chuyên cần
Assumption - Sự giả định
Astound - Làm kinh ngạc
Atrophy - Sự hao mòn, teo đi
Attain - Đạt được
Avert - Ngăn chặn, tránh được
Backlash - Sự phản đối dữ dội
Baffle - Làm khó hiểu
Barren - Cằn cỗi, trống rỗng
Belligerent - Hiếu chiến
Bias - Sự định kiến, thiên vị
Bleak - Ảm đạm, vô vọng
Blunder - Sai lầm ngớ ngẩn
Bolster - Ủng hộ, tăng cường
Bondage - Cảnh nô lệ, tù túng
Booming - Đang phát triển rầm rộ
Boycott - Tẩy chay
Breach - Sự vi phạm
Brink - Bờ vực
Bureaucracy - Chế độ quan liêu
Calamity - Tai ương, thiên tai
Camouflage - Ngụy trang
Capitulate - Đầu hàng
Captivate - Làm say đắm
Censor - Kiểm duyệt
Chastise - Trừng phạt, chỉ trích
Circumvent - Né tránh, lách luật
Clamor - Sự la hét, đòi hỏi
Clandestine - Bí mật, lén lút
Coalition - Sự liên minh
Coerce - Ép buộc
Cognizant - Nhận thức được
Collision - Sự va chạm, xung đột
Collusion - Sự câu kết bất chính
Comity - Sự lịch thiệp, hữu nghị
Commodity - Hàng hóa
Compassion - Lòng trắc ẩn
Complacent - Tự mãn
Concur - Đồng ý
Condone - Bỏ qua, tha thứ
Confide - Chia sẻ tâm sự
Conformity - Sự tuân thủ
Congenial - Hợp nhau, dễ chịu
Conjecture - Sự phỏng đoán
Connoisseur - Người sành sỏi
Consecrate - Thánh hóa, hiến dâng
Consolidate - Củng cố, hợp nhất
Conspicuous - Dễ thấy, đập vào mắt
Consummate - Tài ba, hoàn hảo
Contagious - Truyền nhiễm, lan tỏa
Contempt - Sự khinh rẻ
Contention - Sự tranh cãi, quan điểm
Contrive - Xoay xở, bày mưu
Conundrum - Câu đố hóc búa
Convergence - Sự hội tụ
Conviction - Sự tin tưởng mãnh liệt
Cordial - Thân ái, chân thành
Corroborate - Làm chứng, xác thực
Counterpart - Bên tương ứng
Covenant - Hiệp ước, lời thề
Covert - Che đậy, lén lút
Craving - Sự thèm khát
Credulity - Sự nhẹ dạ
Creed - Tín ngưỡng
Criterion - Tiêu chuẩn
Crude - Thô lỗ, thô sơ
Culmination - Điểm cao nhất
Culpable - Đáng bị khiển trách
Cultivate - Trau dồi, nuôi dưỡng
Cumbersome - Cồng kềnh, phức tạp
Curtail - Cắt bớt, rút ngắn
Database - Cơ sở dữ liệu
Daunting - Làm nản chí
Dearth - Sự khan hiếm
Debunk - Vạch trần
Decipher - Giải mã
Deem - Cho rằng, coi là
Defer - Trì hoãn
Deference - Sự tôn kính
Defiance - Sự thách thức
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
