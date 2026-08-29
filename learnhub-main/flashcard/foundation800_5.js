// ===== DÁN DATA Ở ĐÂY =====
window.TOPIC_NAME = "800 Từ Vựng Nền Tảng P5";

const rawData = `
sustainable - bền vững
significant - quan trọng, đáng kể
contribution - sự đóng góp
innovative - đổi mới, sáng tạo
preserve - bảo tồn, giữ gìn
concentrate - tập trung
diversity - sự đang dạng
efficient - hiệu quả
enhance - nâng cao, cải thiện
opportunity - cơ hội
pollution - sự ô nhiễm
responsibility - trách nhiệm
benefit - lợi ích/có lợi
challenge - thách thức
consequence - hậu quả
eliminate - loại bỏ
flexible - linh hoạt
identify - xác định, nhận diện
impact - tác động, ảnh hưởng
motivation - động lực
participate - tham gia
potential - tiềm năng
reduce - cắt giảm
solution - giải pháp
traditional - truyền thống
advantage - ưu điểm
awareness - nhận thức
campaign - chiến dịch
demand - nhu cầu/yêu cầu
essential - thiết yếu, cần thiết
global - toàn cầu
improvement - sự cải thiện
lack - sự thiếu hụt
necessary - cần thiết
outcome - kết quả, đầu ra
promote - thúc đẩy, quảng bá
resource - tài nguyên
strategy - chiến lược
trend - xu hướng
valuable - có giá trị
volunteer - tình nguyện viên
waste - chất thải/lãng phí
admire - ngưỡng mộ
alternative - thay thế
consume - tiêu thụ
disaster - thảm hoạ
environment - môi trường
generation - thế hệ
influence - ảnh hưởng
priority - sự ưu tiên
accessible - có thể tiếp cận
accurate - chính xác
acquire - đạt được, thu nhận
advocate - ủng hộ/người ủng hộ
biodiversity - đa dạng sinh học
capacity - sức chứa, năng lực
collaboration - sự cộng tác
committed - cam kết, tận tâm
compulsory - bắt buộc
conservation - sự bảo tồn
crucial - cốt yếu
curriculum - chương trình học
distinction - sự khác biệt, ưu tú
dominant - chiếm ưu thế
economic - thuộc về kinh tế
emphasis - sự nhấn mạnh
encounter - chạm trán, bắt gặp
ensure - đảm bảo
establish - thiết lập
estimate - ước tính
evidence - bằng chứng
evolutionary - thuộc tiến hoá
exhibit - triển lãm, trưng bày
expansion - sự mở rộng
expertise - sự thành thạo
feature - đặc điểm/mô tả đặc điểm
financial - thuộc tài chính
function - chức năng
generate - tạo ra
implementation - sự thực hiện
independent - độc lập
infrastructure - cơ sở hạ tầng
initiative - sáng kiến
institution - tổ chức, học viện
interaction - sự tương tác
investigate - điều tra, nghiên cứu
maintain - duy trì
majority - đa số
objective - mục tiêu/khách quan
obstacle - trở ngại
occurrence - sự xảy ra, sự việc
perspective - góc nhìn, quan điểm
phenomenon - hiện tượng
precise - tỉ mỉ, chính xác
recognition - sự công nhận
relevant - liên quan, thích hợp
resistance - sự kháng cự
sufficient - đầy đủ
transformation - sự biến đổi
unique - độc nhất, duy nhất
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
