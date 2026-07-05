// ===== DÁN DATA Ở ĐÂY =====
window.TOPIC_NAME = "Artificial Intelligence (AI)";

const rawData = `
Algorithm - Thuật toán
Automate - Tự động hóa
Data mining - Khai thác dữ liệu
Machine learning - Học máy
Neural network - Mạng thần kinh
Big data - Dữ liệu lớn
Predictive - Dự đoán
Generative AI - AI tạo sinh
Chatbot - Trợ lý ảo
Algorithm bias - Định kiến thuật toán
Facial recognition - Nhận diện khuôn mặt
Natural Language - Ngôn ngữ tự nhiên
Virtual reality - Thực tế ảo
Augmented reality - Thực tế tăng cường
Deep learning - Học sâu
Autonomy - Tính tự chủ
Dataset - Bộ dữ liệu
Efficiency - Sự hiệu quả
Integrate - Tích hợp
Revolutionize - Cách mạng hóa
Redundant - Dư thừa/Bị sa thải
Surveillance - Sự giám sát
Ethical - Thuộc về đạo đức
Deployment - Sự triển khai
Innovation - Sự đổi mới
State-of-the-art - Hiện đại nhất
Simulate - Mô phỏng
Cybersecurity - An ninh mạng
Robotics - Rô-bốt học
User interface - Giao diện người dùng
Prompt - Câu lệnh/Nhắc
Hallucination - Sự ảo tưởng (của AI)
Technological singularity - Điểm kỳ dị công nghệ
Human-centric - Lấy con người làm gốc
Displace - Thay thế/Chiếm chỗ
Pervasive - Phổ biến rộng khắp
Streamline - Tối ưu hóa
Black box - Hộp đen (bí ẩn)
Transparency - Sự minh bạch
Obsolete - Lỗi thời
Keep up with - Theo kịp
Phased out - Loại bỏ dần dần
Take over - Tiếp quản/Thay thế
Turn out - Hóa ra
Work out - Tìm ra cách giải quyết
A double-edged sword - Con dao hai lưỡi
The cutting edge - Sự tiên phong
High-tech - Công nghệ cao
Breakthrough - Bước đột phá
Era - Kỷ nguyên
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
