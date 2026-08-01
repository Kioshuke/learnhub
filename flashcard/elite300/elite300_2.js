// ===== DÁN DATA Ở ĐÂY =====
window.TOPIC_NAME = "300 Từ Vựng Tủ Chuyên Sâu P2";

const rawData = `
Abrupt - Đột ngột, bất ngờ
Accommodate - Đáp ứng, cung cấp chỗ ở
Accumulate - Tích trữ, tích lũy
Advocate - Ủng hộ, người tán thành
Alleviate - Làm giảm bớt (nỗi đau, áp lực)
Ambiguous - Mơ hồ, nhập nhằng
Anticipate - Dự đoán, mong đợi
Apprenticeship - Thời gian học việc
Arbitrary - Tùy tiện, độc đoán
Articulate - Có khả năng ăn nói lưu loát
Ascertain - Xác minh, tìm hiểu chắc chắn
Attribute - Quy cho là/Đặc tính
Augment - Làm tăng lên, tăng thêm
Authenticity - Tính xác thực
Benevolent - Nhân từ, nhân hậu
Catastrophe - Thảm họa
Chronological - Theo thứ tự thời gian
Cognitive - Liên quan đến nhận thức
Coherent - Chặt chẽ, mạch lạc
Collaborate - Hợp tác
Commemorate - Kỷ niệm, tưởng niệm
Compelling - Thuyết phục, hấp dẫn
Competent - Có năng lực, thành thạo
Complement - Bổ sung cho nhau
Comprehensive - Toàn diện, bao quát
Concede - Thừa nhận (sau khi phủ nhận)
Conducive - Có lợi cho, dẫn đến
Conscientious - Tận tâm, chu đáo
Consensus - Sự đồng lòng, nhất trí
Contemplate - Suy ngẫm, dự tính
Controversial - Gây tranh cãi
Conventional - Truyền thống, thông thường
Crucial - Cốt yếu, quyết định
Cumulative - Tích lũy dồn lại
Curiosity - Sự tò mò
Deduce - Suy luận
Deficiency - Sự thiếu hụt
Democracy - Nền dân chủ
Depict - Mô tả, khắc họa
Deteriorate - Trở nên tồi tệ hơn
Diminish - Làm giảm bớt
Discrepancy - Sự khác biệt, không thống nhất
Disseminate - Phổ biến, gieo rắc (tin tức)
Distinguish - Phân biệt
Dominant - Chiếm ưu thế
Dwindling - Đang cạn dần, sụt giảm
Elaborate - Tỉ mỉ, chi tiết
Eloquent - Có tài hùng biện
Embody - Là hiện thân của
Emphasize - Nhấn mạnh
Empower - Trao quyền
Endeavor - Sự nỗ lực, cố gắng
Enhance - Nâng cao, cải thiện
Envisage - Hình dung, mường tượng
Equivalent - Tương đương
Eradicate - Diệt trừ, xóa sổ
Evolve - Tiến hóa, phát triển
Exacerbate - Làm trầm trọng thêm
Exceed - Vượt quá
Excessive - Quá mức, thừa thãi
Explicit - Rõ ràng, dứt khoát
Exploit - Khai thác, bóc lột
Extinguish - Dập tắt
Facilitate - Tạo điều kiện thuận lợi
Feasible - Khả thi
Fluctuate - Biến động, dao động
Formidable - Đáng gờm, kinh khủng
Foster - Nuôi dưỡng, thúc đẩy
Fundamental - Cơ bản, nền tảng
Gratification - Sự hài lòng, thỏa mãn
Humble - Khiêm tốn
Hypothesis - Giả thuyết
Impeccable - Hoàn hảo, không tì vết
Implement - Thực hiện, thi hành
Implicit - Ngầm định, không nói rõ
Incentive - Sự khuyến khích, khích lệ
Incorporate - Kết hợp, sát nhập
Indigenous - Bản địa
Inevitable - Không thể tránh khỏi
Infrastructure - Cơ sở hạ tầng
Inherent - Vốn có, cố hữu
Innovation - Sự đổi mới
Insight - Sự hiểu biết sâu sắc
Integrate - Tích hợp, hòa nhập
Interpretation - Sự giải thích, thông dịch
Justify - Bào chữa, thanh minh
Legitimate - Hợp pháp, chính đáng
Manifest - Biểu lộ, rõ ràng
Mitigate - Giảm nhẹ, làm dịu
Negligible - Không đáng kể
Nurture - Nuôi dưỡng
Obscure - Tối tăm, làm mờ mịt
Optimal - Tối ưu
Outweigh - Nặng hơn, quan trọng hơn
Paradigm - Mô hình, kiểu mẫu
Phenomenon - Hiện tượng
Plausible - Hợp lý, có vẻ đúng
Pragmatic - Thực dụng, thực tế
Prevalent - Phổ biến, thịnh hành
Resilience - Khả năng phục hồi
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
