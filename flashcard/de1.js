// ===== DÁN DATA Ở ĐÂY =====
window.TOPIC_NAME = "Đề tổng hợp 1";

const rawData = `
Pioneer / Trailblazer - Người tiên phong
Nurture - Nuôi dưỡng
Support - Hỗ trợ
Pave the way for - Dọn đường cho, mở đường cho
Expatriate - Người sống ở nước ngoài, ngoại quốc
Prospect - Triển vọng, tiềm năng
Chain - Chuỗi
Optimal - Tối ưu
Optimize - Tối ưu hóa
Optimization - Sự tối ưu hóa
Prowess - Kỹ năng điêu luyện, sự thành thạo
Entrepreneur / Businessman - Doanh nhân
Leverage - Tận dụng, khai thác
Hesitate - Do dự, lưỡng lự
Emerge - Xuất hiện, 
Appear - Nổi lên
Emergence - Sự xuất hiện, sự nổi lên
Distinct - Khác biệt, riêng biệt
Rivalry - Sự kình địch, sự đối đầu
Char - Nướng cháy, đốt thành than
Artisan - Nghệ nhân
Exclusive - Dành riêng, độc quyền
Be committed to / Be dedicated to - Quyết tâm, tâm huyết, tận tụy
Superior - Cao cấp hơn, tốt hơn
Impose on - Áp đặt lên ai đó
Vessel - Mạch máu, tàu lớn
Guideline - Chỉ dẫn, hướng dẫn
Transparent - Rõ ràng, minh bạch
Transparency - Sự minh bạch, sự rõ ràng
Fishing log - Nhật ký đánh bắt
Operate - Vận hành, phẫu thuật
Operation - Sự vận hành, ca phẫu thuật
Inspection - Cuộc thanh tra
Examination - Sự kiểm tra
Result from - Có nguyên nhân từ
Result in / Lead to - Dẫn đến kết quả
Penalty - Án phạt, hình phạt
Penalize - Xử phạt, phạt
Lead in - Dẫn dắt vào
Immune system - Hệ miễn dịch
Mechanism - Cơ chế, cơ quan
Internal - Bên trong
Bring on - Mang lại, gây ra
Look up - Tra cứu, cải thiện
Put on - Mặc vào, tổ chức (sự kiện)
Strain / Stress - Sự căng thẳng, áp lực
Strenuous - Nặng nhọc, vất vả
Insight - Cái nhìn sâu sắc
Gain insight - Có được cái nhìn sâu sắc
Profound / Substantial - Sâu sắc, đáng kể, quan trọng
Fragmentation - Sự tan vỡ, sự phân mảnh
Integrate - Tích hợp, ứng dụng vào
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
