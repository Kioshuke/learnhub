// ===== DÁN DATA Ở ĐÂY =====
window.TOPIC_NAME = "Environment";

const rawData = `
Biodiversity - Đa dạng sinh học
Sustainability - Sự bền vững
Deforestation - Nạn phá rừng
Contamination - Sự ô nhiễm/nhiễm độc
Ecosystem - Hệ sinh thái
Global warming - Nóng lên toàn cầu
Greenhouse effect - Hiệu ứng nhà kính
Carbon footprint - Dấu chân carbon
Renewable energy - Năng lượng tái tạo
Fossil fuels - Nhiên liệu hóa thạch
Depletion - Sự cạn kiệt
Conservation - Sự bảo tồn
Habitat loss - Mất môi trường sống
Endangered species - Loài có nguy cơ tuyệt chủng
Extinction - Sự tuyệt chủng
Emission - Khí thải
Toxic waste - Chất thải độc hại
Landfill - Bãi rác
Biodegradable - Có thể phân hủy sinh học
Eco-friendly - Thân thiện với môi trường
Soil erosion - Xói mòn đất
Desertification - Hoang mạc hoá
Acid rain - Mưa axit
Ozone layer - Tầng ozone
Natural resources - Tài nguyên thiên nhiên
Solar power - Năng lượng mặt trời
Climate change - Biến đổi khí hậu
Water scarcity - Khan hiếm nước
Disposal - Sự vứt bỏ/xử lý (rác)
Recycle - Tái chế
Mitigate - Giảm nhẹ/làm dịu đi
Pristine - Nguyên sơ
Hazardous - Nguy hiểm
Drought - Hạn hán
Flash flood - Lũ quét
Poaching - Săn bắn trộm
Afforestation - Trồng rừng
Carbon-neutral - Trung hoà carbon
Microplastics - Các hạt vi nhựa
Single-use plastic - Nhựa dùng một lần
Overconsumption - Tiêu thụ quá mức
Go green - Thay đổi lối sống xanh
Die out - Dần tuyệt chủng
A drop in the ocean - Muối bỏ bể
Tip of the iceberg - Phần nổi của tảng băng
Combat pollution - Đấu tranh chống ô nhiễm
Enact laws - Ban hành luật pháp
Raise awareness - Nâng cao nhận thức
Irreversible - Không thể đảo ngược
Vulnerable - Dễ bị tổn thương
Harness - Khai thác (năng lượng)
Finite resources - Tài nguyên có hạn
Ecological balance - Cân bằng sinh thái
Environmentally conscious - Có ý thức về môi trường
Waste management - Quản lý rác thải
Pollutant - Chất gây ô nhiễm
Oil spill - Tràn dầu
Sanctuary - Khu bảo tồn thiên nhiên
Exhaust fumes - Khí thải từ xe cộ
Greenhouse gas - Khí nhà kính
Sort rubbish - Phân loại rác
Live a green life - Sống xanh
Wipe out - Quét sạch/hủy diệt
Cut down on - Cắt giảm
Precipitation - Lượng mưa
Solar panel - Tấm pin mặt trời
Wind turbine - Tua bin gió
Geothermal energy - Năng lượng địa nhiệt
Sustainable development - Phát triển bền vững
Energy-efficient - Tiết kiệm năng lượng
Anthropogenic - Do con người gây ra
Mass extinction - Tuyệt chủng hàng loạt
Flora and fauna - Hệ thực vật và động vật
Carbon capture - Thu giữ carbon
Offshore wind - Gió ngoài khơi
Tidal power - Năng lượng thủy triều
Non-renewable - Không thể tái tạo
Sewage treatment - Xử lý nước thải
Overfishing - Đánh bắt cá quá mức
Degradation - Sự suy thoái
Urban sprawl - Sự mở rộng đô thị
Extreme weather - Thời tiết cực đoan
Dispose of - Vứt bỏ
Phase out - Loại bỏ dần
Man-made - Nhân tạo
Atmospheric - Thuộc khí quyển
Compost - Phân hữu cơ/ủ phân
Fertilizer - Phân bón
Pesticide - Thuốc trừ sâu
Organic farming - Canh tác hữu cơ
Back to nature - Trở về với tự nhiên
Cloud on the horizon - Điềm xấu trong tương lai
Down to earth - Thực tế/gần gũi
Clear up - Dọn dẹp sạch sẽ
Log - Khai thác gỗ
Wildfire - Cháy rừng
Marine life - Đời sống dưới biển
Poacher - Kẻ săn trộm
On the brink of - Trên bờ vực
Zero-waste - Không rác thải
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
