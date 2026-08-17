// ===== DÁN DATA Ở ĐÂY =====
window.TOPIC_NAME = "Series Từ Vựng Nhập Môn P10";

const rawData = `
demanding - đòi hỏi cao, khắt khe (adj) — /dɪˈmændɪŋ/
reliable - đáng tin cậy (adj) — /rɪˈlaɪəbəl/
ability - khả năng (n) — /əˈbɪləti/
quickly - nhanh chóng (adv) — /ˈkwɪkli/
inspire - truyền cảm hứng (v) — /ɪnˈspaɪər/
react - phản ứng (v) — /riˈækt/
impress - gây ấn tượng (v) — /ɪmˈpres/
train - đào tạo, huấn luyện (v); tàu hỏa (n) — /treɪn/
situation - tình huống, tình hình (n) — /ˌsɪtʃuˈeɪʃən/
professionalism - sự chuyên nghiệp (n) — /prəˈfeʃənəlɪzəm/
demeanour - thái độ, phong thái (n) — /dɪˈmiːnər/
socialise - giao tiếp xã hội (v) — /ˈsoʊʃəlaɪz/
motivate - động viên (v) — /ˈmoʊtɪveɪt/
investigative - có tính điều tra (adj) — /ɪnˈvestɪɡətɪv/
amazed - kinh ngạc (adj) — /əˈmeɪzd/
complimentary - miễn phí, tặng kèm (adj) — /ˌkɒmplɪˈmentəri/
discreet - kín đáo, thận trọng (adj) — /dɪˈskriːt/
overjoyed - cực kỳ vui mừng (adj) — /ˌoʊvərˈdʒɔɪd/
unpaid - không trả lương (adj) — /ʌnˈpeɪd/
patient - kiên nhẫn (adj) — /ˈpeɪʃənt/
confident - tự tin (adj) — /ˈkɒnfɪdənt/
casual - thời vụ, không thường xuyên (adj) — /ˈkæʒuəl/
documentary - phim tài liệu (n); thuộc về tài liệu (adj) — /ˌdɑːkjəˈmentəri/
aim - nhắm đến (v); mục tiêu (n) — /eɪm/
harsh - khắc nghiệt, gay gắt (adj) — /hɑːrʃ/
reality - thực tế (n) — /riˈæləti/
remote - xa xôi, hẻo lánh (adj) — /rɪˈmoʊt/
village - làng (n) — /ˈvɪlɪdʒ/
reject - từ chối, bác bỏ (v); đồ bị loại, người bị loại (n) — /rɪˈdʒekt/
expose - phơi bày, tiết lộ (v) — /ɪkˈspoʊz/
mentality - tâm lý, tư duy (n) — /menˈtæləti/
network - mạng lưới (n) — /ˈnetwɜːrk/
résumé - sơ yếu lý lịch, CV (n) — /ˈrezjumeɪ/
editor - biên tập viên (n) — /ˈedɪtər/
manuscript - bản thảo (n) — /ˈmænjəskrɪpt/
ensure - đảm bảo (v) — /ɪnˈʃʊr/
error - lỗi, sai sót (n) — /ˈerər/
publication - sự xuất bản, ấn phẩm (n) — /ˌpʌblɪˈkeɪʃən/
crucial - quan trọng (adj) — /ˈkruːʃəl/
rapidly - nhanh chóng (adv) — /ˈræpɪdli/
environment - môi trường (n) — /ɪnˈvaɪrənmənt/
technology - công nghệ (n) — /tekˈnɑːlədʒi/
explain - giải thích (v) — /ɪkˈspleɪn/
smooth - mượt mà, trơn tru (adj) — /smuːð/
snatch - chộp lấy, giật lấy (v) — /snætʃ/
operate - vận hành (v) — /ˈɒpəreɪt/
swipe - quẹt (thẻ), vuốt (v) — /swaɪp/
growth - sự tăng trưởng, phát triển (n) — /ɡroʊθ/
mindset - tư duy, cách suy nghĩ (n) — /ˈmaɪndset/
reward - phần thưởng (n); thưởng (v) — /rɪˈwɔːrd/
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
