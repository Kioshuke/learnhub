// ===== DÁN DATA Ở ĐÂY =====
window.TOPIC_NAME = "800 Từ Vựng Nền Tảng P7";

const rawData = `
coincide - trùng hợp, xảy ra đồng thời
comprise - bao gồm
comprehensive - toàn diện, bao quát
compromise - thoả hiệp
mandatory - bắt buộc
conceal - che giấu, giấu giếm
concede - thừa nhận
concurrent - đồng thời
conclude - kết luận
conduct - tiến hành/hạnh kiểm
confine - hạn chế, giam cầm
confirm - xác nhận
conform - tuân thủ, làm cho phù hợp
consent - sự bằng lòng/cho phép
considerable - đáng kể, to lớn
consistent - nhất quán, kiên định
constitute - cấu thành, tạo nên
constraint - sự hạn chế, ràng buộc
consult - tham khảo, hỏi ý kiến
contemporary - đương đại, cùng thời
context - ngữ cảnh, bối cảnh
contradict - mâu thuẫn, phủ nhận
contrary - trái ngược
contrast - đối chiếu/sự tương phản
controversial - gây tranh cãi
convene - triệu tập, họp lại
conventional - thông thường, truyền thống
converse - trò chuyện/trái ngược
convert - chuyển đổi
convince - thuyết phục
cooperate - hợp tác
coordinate - điều phối, phối hợp
core - cốt lõi, trọng tâm
corporate - thuộc về doanh nghiệp
correspond - tương ứng, trao đổi thư từ
criteria - tiêu chuẩn
curb - kiềm chế, nén lại
currency - tiền tệ
cycle - chu kỳ, vòng đời
debate - tranh luận
decade - thập kỷ
dedicate - cống hiến, tận tâm
deduce - suy luận
definite - rõ ràng
deny - phủ nhận
depict - mô tả, khắc hoạ
derive - bắt nguồn từ
designate - chỉ định, bổ nhiệm
despite - mặc dù
detect - phát hiện, tìm ra
deviate - chệch hướng, làm khác đi
differentiate - phân biệt
diffusion - sự khuếch tán, lan truyền
dilemma - thế tiến thoái lưỡng nan
disclose - tiết lộ, vạch trần
discard - loại bỏ, vứt bỏ
discern - nhận thức, phân biệt rõ
discipline - kỷ luật, môn học
discriminate - phân biệt đối xử
displace - thay thế
disposal - sự vứt bỏ, xử lý rác
dispute - tranh chấp, tranh luận
distinct - riêng biệt, dễ nhận thấy
distort - bóp méo, xuyên tạc
distract - làm xao nhãng
diverse - đa dạng
domain - lĩnh vực, phạm vi
draft - bản phác thảo/phác thảo
drastic - quyết liệt, mạnh mẽ
durable - bền
duration - khoảng thời gian tồn tại
dynamic - năng động, biến đổi
echo - tiếng vang/vang vọng
ecological - thuộc sinh thái
edition - phiên bản, ấn bản
elaborate - tỉ mỉ/giải thích chi tiết
elegant - thanh lịch
element - yếu tố
eligible - đủ điều kiện, phù hợp
elite - nhóm tinh hoa/ưu tú
embark - bắt đầu, lên tàu
emerge - nổi lên, xuất hiện
emission - sự phát thải
emphasize - nhấn mạnh
empirical - thực tế
enable - cho phép, làm cho có thể
enforce - thực thi, bắt tuân thủ
engage - tham gia, thu hút
enlighten - làm sáng tỏ, khai sáng
enormous - khổng lồ
enthusiasm - sự nhiệt tình
entitle - cho quyền làm gì
entity - thực thể
entrepreneur - doanh nhân
envisage - hình dung, tưởng tượng
equation - phương trình, sự cân bằng
eradicate - diệt trừ, xoá sổ
erosion - sự xói mòn
ethical - thuộc đạo đức
evaluation - sự đánh giá
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
