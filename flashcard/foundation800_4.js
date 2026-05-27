// ===== DÁN DATA Ở ĐÂY =====
window.TOPIC_NAME = "800 Từ Vựng Nền Tảng P4";

const rawData = `
Existence - Sự tồn tại
Exotic - Kỳ lạ
Expansion - Sự mở rộng
Expectancy - Tình trạng mong chờ
Expertise - Sự tinh thông
Exploit - Khai thác
Exposure - Sự tiếp xúc
Extension - Sự gia hạn
Extensive - Rộng rãi
Extinct - Tuyệt chủng
Extinguish - Dập tắt
Extract - Chiết xuất
Extravagant - Phung phí
Fabricate - Bịa đặt
Expedite - Tạo thuận lợi
Factual - Thực tế
Faculty - Khoa/Khả năng
Fascinate - Mê hoặc
Fatal - Tử vong
Feasible - Khả thi
Feature - Đặc điểm
Fertilizer - Phân bón
Flaw - Thiếu sót
Flee - Chạy trốn
Fleet - Đội tàu/xe
Versatile - Linh hoạt
Flourish - Phát triển rực rỡ
Fluid - Chất lỏng
Forbid - Cấm
Forecast - Dự báo
Foreigner - Người nước ngoài
Formalize - Chính thức hóa
Formation - Sự hình thành
Formulate - Đề ra
Fortunate - May mắn
Foster - Nuôi dưỡng
Fragment - Mảnh vỡ
Framework - Cơ cấu
Franchise - Nhượng quyền
Fraud - Gian lận
Frequent - Thường xuyên
Friction - Sự ma sát
Fringe - Rìa, mép
Frustrated - Bực bội
Fuel - Nhiên liệu
Fulfill - Hoàn thành
Function - Chức năng
Rudimentary - Nền tảng
Furious - Giận dữ
Furthermore - Hơn nữa
Gather - Thu thập
Generalize - Khái quát hóa
Manufacture - Sản xuất, chế tạo
Generous - Hào phóng
Genuine - Chân thành/Thật
Gesture - Cử chỉ
Gigantic - Khổng lồ
Glamorous - Hào nhoáng
Globalize - Toàn cầu hóa
Govern - Quản lý
Graceful - Duyên dáng
Gradual - Dần dần
Grant - Trợ cấp/Ban cho
Grasp - Nắm bắt
Gratitude - Lòng biết ơn
Gravity - Trọng lực
Grief - Nỗi đau buồn
Gross - Tổng cộng
Groundbreaking - Đột phá
Warranty - Phiếu bảo hành
Guideline - Nguyên tắc
Habitual - Thói quen
Halt - Tạm dừng
Handicap - Sự cản trở
Harass - Quấy rầy
Hardship - Gian nan
Harmony - Sự hài hòa
Harsh - Khắc nghiệt
Harvest - Thu hoạch
Hasty - Vội vàng
Hazard - Nguy hiểm
Hectic - Bận rộn
Heredity - Di truyền
Hesitate - Do dự
Hierarchy - Cấp bậc
Highlight - Làm nổi bật
Hinder - Cản trở
Hitherto - Cho đến nay
Horizontal - Nằm ngang
Hospitable - Hiếu khách
Hostile - Thù địch
Humiliate - Làm nhục
Conjecture - Sự phỏng đoán, đưa ra giả thiết
Identical - Giống hệt
Identify - Xác định
Ideology - Hệ tư tưởng
Ignorance - Thiếu hiểu biết
Illegal - Bất hợp pháp
Illusion - Ảo tưởng
Undertake - Đảm nhận, cam kết thực hiện
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
