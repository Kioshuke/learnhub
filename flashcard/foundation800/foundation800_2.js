// ===== DÁN DATA Ở ĐÂY =====
window.TOPIC_NAME = "800 Từ Vựng Nền Tảng P2";

const rawData = `
Desert - Rời bỏ, bỏ trốn khỏi
Abstract - Trừu tượng
Accommodate - Cung cấp chỗ ở, đáp ứng
Accurate - Chính xác
Adhere - Tuân theo, dính chặt
Adverse - Bất lợi, có hại
Advocacy - Sự vận động, ủng hộ
Allocate - Phân bổ, chỉ định
Ambiguous - Mơ hồ, nhập nhằng
Amend - Sửa đổi, hiệu chỉnh (văn bản)
Apparent - Rõ ràng, hiển nhiên
Arbitrary - Tùy tiện, độc đoán
Aspire - Khao khát, thiết tha
Assess - Đánh giá, định mức
Assistance - Sự trợ giúp
Premise - Tiền đề, giả thuyết ban đầu
Attain - Đạt được
Accuse - Buộc tội, cáo buộc ai đó làm gì
Behalf - Thay mặt cho
Bias - Thành kiến, thiên vị
Brief - Ngắn gọn
Bulk - Số lượng lớn
Capability - Khả năng, năng lực
Cease - Chấm dứt, ngừng
Challenge - Thử thách
Chronological - Theo thứ tự thời gian
Cite - Trích dẫn
Clarify - Làm cho rõ ràng
Coherent - Chặt chẽ, mạch lạc
Coincide - Trùng hợp
Collaborate - Cộng tác
Collapse - Sụp đổ
Commence - Bắt đầu
Commodity - Hàng hóa
Compensate - Đền bù, bồi thường
Compile - Biên soạn, tập hợp
Complement - Bổ sung cho nhau
Complex - Phức tạp
Comply - Tuân thủ
Component - Thành phần
Compound - Hợp chất
Conceal - Che giấu
Concede - Thừa nhận (thất bại)
Conceive - Hình thành ý tưởng
Concurrent - Đồng thời
Confine - Hạn chế, giam giữ
Confirm - Xác nhận
Friction - Sự ma sát/Sự bất đồng, xích mích
Conform - Làm cho phù hợp
Consent - Sự đồng ý, bằng lòng
Accommodating - Sẵn lòng giúp đỡ
Accumulation - Sự tích tụ
Accustomed - Quen với
Acquisition - Sự giành được
Alleviate - Làm nhẹ bớt
Ambitious - Có nhiều tham vọng
Analogous - Tương tự
Anticipate - Dự đoán
Artificial - Nhân tạo
Assertion - Sự khẳng định
Assimilate - Đồng hóa
Plausible - Hợp lý, đáng tin cậy
Attainable - Có thể đạt được
Attitude - Thái độ
Trait - Đặc điểm, đặc tính
Authority - Thẩm quyền
Beneficial - Có lợi
Capability - Khả năng
Causal - Có quan hệ nhân quả
Chaos - Sự hỗn loạn
Characteristic - Đặc điểm
Coincidental - Trùng hợp ngẫu nhiên
Scarcity - Sự khan hiếm, sự thiếu hụt
Commemorate - Kỷ niệm
Compelling - Hấp dẫn, thuyết phục
Competent - Có đủ khả năng
Complementary - Bổ sung cho nhau
Compulsory - Bắt buộc
Conclusive - Xác đáng
Condense - Ngưng tụ, súc tích
Confidential - Bí mật
Confront - Đối mặt
Consecutive - Liên tục
Consensus - Sự đồng lòng
Considerable - Đáng kể
Consistency - Sự nhất quán
Consolidate - Củng cố
Conspicuous - Dễ thấy
Constituent - Thành phần cấu tạo
Constraint - Sự hạn chế
Consultation - Sự tham khảo
Consumption - Sự tiêu thụ
Contradict - Mâu thuẫn
Contribution - Sự đóng góp
Conventional - Thông thường
Converge - Hội tụ
Convey - Truyền đạt
Conviction - Niềm tin/Sự kết án
Correlate - Có tương quan
Credible - Đáng tin
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
