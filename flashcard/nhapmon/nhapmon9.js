// ===== DÁN DATA Ở ĐÂY =====
window.TOPIC_NAME = "Series Từ Vựng Nhập Môn P9";

const rawData = `
credit card - thẻ tín dụng (n) — /ˈkredɪt kɑːrd/
dry cleaning - dịch vụ giặt khô (n) — /ˌdraɪ ˈkliːnɪŋ/
room service - dịch vụ phòng (n) — /ˈruːm ˈservɪs/
cable car - cáp treo (n) — /ˈkeɪbəl kɑːr/
homestay - ở nhà dân, nhà trọ (n) — /ˈhoʊmsteɪ/
college - trường cao đẳng hoặc đại học (n) — /ˈkɑːlɪdʒ/
professional - chuyên nghiệp (adj); chuyên gia (n) — /prəˈfeʃənəl/
field - lĩnh vực, cánh đồng (n) — /fiːld/
network - tạo mối quan hệ, kết nối (v) — /ˈnetwerk/
maintain - duy trì (v) — /meɪnˈteɪn/
handle - xử lý (v) — /ˈhændl/
narrow - thu hẹp (v) — /ˈnærəʊ/
deeply - sâu, một cách sâu sắc (adv) — /ˈdiːpli/
relieved - nhẹ nhõm (adj) — /rɪˈliːvd/
depressed - chán nản, suy sụp (adj) — /dɪˈprest/
inspiring - truyền cảm hứng (adj) — /ɪnˈspaɪərɪŋ/
struggle - đấu tranh (v) — /ˈstrʌɡəl/
motivation - động lực, sự thúc đẩy (n) — /ˌmoʊtɪˈveɪʃən/
review - xem xét lại, đánh giá, phê bình (v) — /rɪˈvjuː/
regularly - thường xuyên, đều đặn (adv) — /ˈreɡjələrli/
efficiently - một cách hiệu quả (adv) — /ɪˈfɪʃəntli/
retain - giữ được, nhớ được (v) — /rɪˈteɪn/
pursue - theo đuổi (v) — /pərˈsuː/
offer - đề nghị, cung cấp (v); lời đề nghị (n) — /ˈɔːfər/
adaptable - có thể thích nghi, linh hoạt (adj) — /əˈdæptəbl/
position - vị trí (n); đặt vào vị trí (v) — /pəˈzɪʃən/
temporary - tạm thời (adj) — /ˈtempəreri/
season - mùa (n); nêm gia vị (v) — /ˈsiːzən/
pace - nhịp độ, tốc độ (n); bước đi, đi tới đi lui (v) — /peɪs/
demand - nhu cầu, sự đòi hỏi (n); yêu cầu, đòi hỏi (v) — /dɪˈmænd/
passion - đam mê (n) — /ˈpæʃən/
aid - sự trợ giúp (n); giúp đỡ, hỗ trợ (v) — /eɪd/
figure out - tìm ra (pv) — /ˈfɪɡjər aʊt/
carry out - thực hiện, tiến hành (pv) — /ˈkæri aʊt/
deal with - giải quyết, xử lý, đối phó với (pv) — /diːl wɪð/
fill out - điền vào (biểu mẫu) (pv) — /fɪl aʊt/
exchange - trao đổi; sự trao đổi (v) — /ɪksˈtʃeɪndʒ/
belongings - đồ dùng cá nhân (n) — /bɪˈlɒŋɪŋz/
insurance - bảo hiểm (n) — /ɪnˈʃʊərəns/
currency - tiền tệ (n) — /ˈkʌrənsi/
jellyfish - con sứa (n) — /ˈdʒelifɪʃ/
tutorial - phần hướng dẫn (n) — /tjuːˈtɔːriəl/
satisfaction - sự hài lòng (n) — /ˌsætɪsˈfækʃən/
promotion - sự thăng tiến; khuyến mãi (n) — /prəˈmoʊʃən/
progress - tiến độ, sự tiến triển (n) — /ˈprəʊɡres/
step-by-step - từng bước một, tuần tự (phrase) — /step baɪ step/
instruction - sự hướng dẫn, chỉ dẫn (n) — /ɪnˈstrʌkʃən/
complex - phức tạp (adj); khu phức hợp (n) — /kəmˈpleks/, /ˈkɑːmpleks/
software - phần mềm (n) — /ˈsɔːftweər/
preferable - đáng thích hơn, thích hợp hơn (adj) — /ˈprefərəbəl/
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
