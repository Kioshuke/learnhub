// ===== DÁN DATA Ở ĐÂY =====
window.TOPIC_NAME = "800 Từ Vựng Nền Tảng P3";

const rawData = `
Criteria - Tiêu chí
Cultivate - Trau dồi
Curiosity - Sự tò mò
Currency - Tiền tệ
Database - Cơ sở dữ liệu
Debate - Tranh luận
Dedicate - Cống hiến
Definition - Định nghĩa
Delegate - Giao phó/Đại biểu
Deliberate - Thận trọng, cố ý
Democracy - Nền dân chủ
Demographic - Thuộc nhân khẩu học
Denial - Sự phủ nhận
Density - Mật độ
Departure - Sự khởi hành
Dependable - Có thể tin cậy
Deprive - Tước đoạt
Descent - Sự đi xuống, nguồn gốc
Designate - Chỉ định
Desirable - Đáng khao khát
Destined - Được định sẵn
Detach - Tháo rời
Detection - Sự phát hiện
Deviate - Chệch hướng
Device - Thiết bị
Devote - Dành hết cho
Differentiate - Phân biệt
Diffusion - Sự lan truyền
Dignity - Phẩm giá
Dilemma - Thế lưỡng nan
Dimension - Kích thước, khía cạnh
Diminish - Giảm bớt
Diplomacy - Ngoại giao
Directive - Chỉ thị
Disclose - Tiết lộ
Discrepancy - Sự khác biệt
Discreet - Thận trọng, kín đáo
Discriminate - Phân biệt đối xử
Dismiss - Gạt bỏ, sa thải
Disorder - Sự rối loạn
Disposal - Sự vứt bỏ
Dispute - Tranh chấp
Disregard - Ngó lơ
Disrupt - Làm gián đoạn
Dissolve - Hòa tan, giải tán
Distant - Xa cách
Distinctive - Đặc biệt
Distortion - Sự bóp méo
Diversity - Sự đa dạng
Dividend - Cổ tức, lợi ích
Domestic - Trong nước
Dominance - Sự thống trị
Drainage - Hệ thống thoát nước
Drift - Trôi dạt
Durable - Bền
Dynamic - Năng động
Eager - Háo hức
Ecology - Sinh thái học
Economical - Tiết kiệm
Effectiveness - Tính hiệu quả
Eject - Tống ra
Elastic - Đàn hồi
Elegant - Thanh lịch
Element - Yếu tố
Eligible - Đủ tư cách
Embrace - Đón nhận
Emerge - Nổi lên
Emission - Sự phát thải
Empower - Trao quyền
Enclose - Đính kèm
Encounter - Chạm trán
Endanger - Gây nguy hiểm
Endeavor - Nỗ lực
Enforce - Thực thi
Engage - Tham gia
Enlighten - Khai sáng
Enrich - Làm giàu thêm
Enterprise - Doanh nghiệp
Enthusiastic - Nhiệt tình
Entitle - Cho phép
Envision - Hình dung
Epidemic - Dịch bệnh
Equation - Phương trình
Equip - Trang bị
Erode - Ăn mòn
Essence - Bản chất
Estimate - Ước tính
Eternal - Vĩnh cửu
Ethical - Thuộc đạo đức
Evident - Hiển nhiên
Evolution - Sự tiến hóa
Exceedingly - Cực kỳ
Excel - Xuất sắc
Exclusion - Sự loại trừ
Exclusive - Độc quyền
Excursion - Chuyến tham quan
Execute - Thi hành
Exemplify - Minh họa bằng ví dụ
Exertion - Sự nỗ lực
Exile - Sự lưu đày
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
