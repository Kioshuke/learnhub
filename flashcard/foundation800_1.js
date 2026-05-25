// ===== DÁN DATA Ở ĐÂY =====
window.TOPIC_NAME = "800 Từ Vựng Nền Tảng P1";

const rawData = `
Abandon - Từ bỏ, ruồng bỏ
Accompany - Đi cùng, hộ tống
Accumulate - Tích lũy, gom lại
Adapt - Thích nghi, điều chỉnh
Adequate - Đầy đủ, thỏa đáng
Adopt - Thông qua, nhận nuôi
Accelerate - Thúc đẩy, làm tăng tốc, tăng nhanh
Alternative - Sự thay thế/Mang tính thay thế
Ambition - Tham vọng, hoài bão
Analyze - Phân tích
Annual - Hàng năm
Approach - Tiếp cận, phương pháp
Appropriate - Thích hợp, phù hợp
Artificial - Nhân tạo
Aspect - Khía cạnh
Assess - Đánh giá
Abolish - Bãi bỏ, huỷ bỏ
Attitude - Thái độ
Awareness - Nhận thức
Benefit - Lợi ích/Được lợi
Capacity - Sức chứa, năng lực
Challenge - Thử thách
Collaborate - Cộng tác
Commitment - Sự cam kết
Compulsory - Bắt buộc
Concentrate - Tập trung
Compromise - Sự thoả hiệp, thoả hiệp
Consequence - Hậu quả, hệ quả
Conserve - Bảo tồn
Considerable - Đáng kể
Contribution - Sự đóng góp
Crucial - Quan trọng, cốt yếu
Decline - Suy giảm, từ chối
Demonstrate - Chứng minh, biểu diễn
Distinguish - Phân biệt
Dominate - Thống trị, áp đảo
Efficiency - Hiệu quả, năng suất
Eliminate - Loại bỏ
Encounter - Chạm trán, bắt gặp
Enormous - Khổng lồ, to lớn
Essential - Thiết yếu
Exhaust - Làm cạn kiệt, dùng hết sạch
Resilient - Kiên cường, có khả năng hồi phục nhanh
Assure - Bảo đảm, cam đoan
Implement - Thực thi, áp dụng
Innovation - Sự đổi mới, cách tân
Motivation - Động lực
Obstacle - Trở ngại
Priority - Sự ưu tiên
Sustainable - Bền vững
Accomplish - Hoàn thành, đạt được
Acknowledge - Công nhận, thừa nhận
Acquire - Giành được, đạt được
Adjust - Điều chỉnh
Advantageous - Có lợi
Endorse - Công khai ủng hộ, tán thành
Asign - Phân công, ấn định (nhiệm vụ)
Authentic - Đích thực, xác thực
Authority - Chính quyền, quyền lực
Boundary - Ranh giới, biên giới
Circumstance - Hoàn cảnh, trường hợp
Cognitive - Liên quan đến nhận thức
Component - Thành phần
Comprehensive - Toàn diện
Confidential - Bảo mật, bí mật
Controversy - Sự tranh cãi
Counterpart - Bên tương ứng, đối tác
Curriculum - Chương trình giảng dạy
Decade - Thập kỷ
Deficiency - Sự thiếu hụt
Depict - Mô tả, khắc họa
Derive - Bắt nguồn từ
Deteriorate - Tồi tệ đi, xuống cấp
Disaster - Thảm họa
Distribute - Phân phối
Diverse - Đa dạng
Dominant - Có ưu thế, thống trị
Drastic - Quyết liệt, mạnh mẽ
Elaborate - Tỉ mỉ/Giải thích chi tiết
Emphasize - Nhấn mạnh
Endure - Chịu đựng, tồn tại lâu
Enhance - Nâng cao, tăng cường
Equivalent - Tương đương
Establish - Thiết lập
Evaluate - Định giá, đánh giá
Exaggerate - Phóng đại
Exceed - Vượt quá
Strive - Cố gắng phấn đấu, nỗ lực hết mình
Cultivate - Trau dồi, vun đắp, canh tác
Fluctuate - Dao động, biến động
Underlying - Cơ bản, sâu xa, nằm dưới
Heritage - Di sản
Speculation - Sự suy đoán, sự dự đoán
Stimulus - Sự kích thích
Substantial - Đáng kể, lớn lao, có giá trị thực tế
Framework - Khuôn khổ, cơ cấu, khung sườn
Insight - Sự hiểu biết sâu sắc
Integrat - Tích hợp, hòa nhập
Justify - Thanh minh, bào chữa
Obligation - Nghĩa vụ, bổn phận
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
