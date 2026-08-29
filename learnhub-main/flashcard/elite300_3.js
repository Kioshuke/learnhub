// ===== DÁN DATA Ở ĐÂY =====
window.TOPIC_NAME = "300 Từ Vựng Tủ Chuyên Sâu P3";

const rawData = `
Whodunnit - Tiểu thuyết trinh thám có cốt truyện phức tạp
Trilogy - Tác phẩm bộ ba liên hoàn
Proofread - Đọc và sửa chữa lỗi sai văn bản
Alliteration - Phép điệp âm
Epithet - Tính ngữ (thường để tán dương/chỉ trích)
Exegesis - Chú giải, bình luận
Onomatopoeia - Từ tượng thanh
Soliloquy - Đoạn độc thoại (trong kịch)
Paradigmatic - Kiểu mẫu, khuôn mẫu
Skyscraper - Nhà chọc trời
Insurmountable - Không thể vượt qua
Clearcutting - Sự phát quang, chặt hạ toàn bộ cây
Chauvinism - Thành kiến mù quáng, chủ nghĩa bá quyền
Supremacism - Thuyết ưu thế (chủng tộc/giới tính)
Denominationalism - Thái độ bè phái, chia rẽ tôn giáo
Enculturation - Sự hội nhập văn hóa
Intellectualism - Thuyết duy lý trí
Depreciation - Sự khấu hao, sụt giá
Stagnant - Trì trệ
Subsidy - Tiền trợ cấp
Scrumptious - Hảo hạng, cực kỳ ngon
Potluck - Bữa ăn thân mật (mỗi người mang 1 món)
Trafficking - Nạn buôn bán trái phép
Archery - Môn bắn cung
Fencing - Môn đấu kiếm
Endocrine - Thuộc nội tiết
Excretion - Sự bài tiết
Homeostasis - Cân bằng nội môi
Metabolism - Sự trao đổi chất
Pathogen - Tác nhân gây bệnh
Chatterbox - Người nói nhiều
Bossyboots - Người hống hách, thích sai bảo
Scrooge - Kẻ hà tiện, bủn xỉn
Hypocrite - Kẻ đạo đức giả
Affable - Niềm nở, ân cần
Aloof - Xa cách, lạnh lùng
Amicable - Thân tình, hòa giải
Apathetic - Thờ ơ, lãnh đạm
Boisterous - Ồn ào, cộc cằn
Cantankerous - Hay gắt gỏng, hay cãi nhau
Capricious - Thất thường
Cynical - Hoài nghi, hay chỉ trích
Dogmatic - Giáo điều, độc đoán
Eccentric - Lập dị
Extremist - Người cực đoan
Fastidious - Cầu kỳ, kiểu cách, khó tính
Flamboyant - Lòe loẹt, phô trương
Impetuous - Bốc đồng, thiếu suy nghĩ
Indolent - Lười biếng, biếng nhác
Meddlesome - Hay xen vào chuyện người khác
Obstinate - Ngoan cố, ương ngạnh
Osmosis - Hiện tượng thẩm thấu
Transpiration - Sự thoát hơi nước (ở thực vật)
Chlorophyll - Chất diệp lục
Empirical - Thuộc thực nghiệm
Autotrophic - Tự dưỡng
Precipitate - Kết tủa
Constellation - Chòm sao
Eclipse - Nhật thực/Nguyệt thực
Astrobiology - Sinh học vũ trụ
Freak - Quái dị, bất thường
Unbroken - Không gợn mây, liên tục
Scorching - Nóng thiêu đốt
Run-down - Xuống cấp, tồi tàn
Uninterrupted - Thoáng đãng, không bị che khuất
Secluded - Hẻo lánh, vắng vẻ
Cobbled - Trải đá cuội
Quaint - Cổ kính, cuốn hút
Make ends meet - Làm vừa đủ sống
On the verge of - Bên bờ vực
On the tip of my tongue - Sắp nhớ ra (nhưng chưa thể thốt lên)
Out of order - Bị hỏng
A nod and a wink - Nói ít hiểu nhiều, ra hiệu ngầm
Lend someone a hand - Giúp ai đó một tay
On the go - Luôn bận rộn, tất bật
Jump to conclusions - Vội vã kết luận
Grow in popularity - Ngày càng được ưa chuộng
Fall back on - Dựa vào, trông cậy (khi khó khăn)
Put up with - Chịu đựng
Stand in for - Thay thế (tạm thời)
Keep pace with - Bắt kịp với
Get by - Xoay xở, đương đầu
Make out - Hiểu ra, nhận ra
Get across - Làm ai đó hiểu/tin
Make allowance for - Chiếu cố, châm chước
See through - Nhìn thấu, thấu hiểu
Stand up for - Hỗ trợ, đứng lên bảo vệ
Pull through - Hồi phục (sau phẫu thuật/bạo bệnh)
Come in for - Phải hứng chịu (chỉ trích)
Go down with - Mắc phải (bệnh)
Go back on - Nuốt lời
Tell apart - Phân biệt
Catch on - Trở nên phổ biến
Take in - Lừa gạt
Out of the blue - Bất ngờ, không báo trước
Allusion - Sự ám chỉ (dễ nhầm với Illusion)
Illusion - Ảo tưởng (dễ nhầm với Allusion)
Hallucination - Ảo giác (thấy thứ không tồn tại)
Complementary - Bổ sung cho nhau (dễ nhầm với Complimentary)
Complimentary - Khen ngợi, hoặc miễn phí
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
