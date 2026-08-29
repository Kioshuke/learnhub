// ===== DÁN DATA Ở ĐÂY =====
window.TOPIC_NAME = "SCIENCE AND TECHNOLOGY";

const rawData = `
Alternative - Sự lựa chọn thay thế
Alternately - Một cách thay thế
Consequence - Hậu quả
Consequent - Kết quả, tiếp theo
Consumption - Sự tiêu thụ
Consume - Tiêu thụ
Disadvantage - Nhược điểm
Disadvantageous - Có hại, bất lợi
Factor - Yếu tố
Factorial - Thuộc về yếu tố, thành phần
Framework - Khuôn khổ
Frameworks - Các khuôn khổ
Resource - Tài nguyên
Resourcing - Việc cung cấp tài nguyên
Contribute - Đóng góp
Contribution - Sự đóng góp
Contributory - Có tính đóng góp
Familiar - Quen thuộc
Familiarity - Sự quen thuộc
Emphasize - Nhấn mạnh
Emphasis - Sự nhấn mạnh
Emphatic - Nhấn mạnh, rõ ràng
Evaluate - Đánh giá
Evaluation - Sự đánh giá
Evaluative - Mang tính đánh giá
Impact - Tác động
Impacted - Bị tác động
Principle - Nguyên tắc
Principal - Quan trọng nhất
Principally - Chủ yếu, quan trọng
Method - Phương pháp
Methodology - Hệ thống phương pháp
Statistic - Số liệu thống kê
Statistical - Thuộc thống kê
Statistician - Nhà thống kê
Challenge - Thử thách
Challenging - Khó khăn, đầy thử thách
Approach - Phương pháp tiếp cận
Approachable - Dễ tiếp cận
Maintain - Duy trì
Maintenance - Sự duy trì, bảo trì
Technique - Kỹ thuật
Technician - Kỹ thuật viên
Technical - Kỹ thuật, chuyên môn
Policy - Chính sách
Political - Thuộc về chính trị
Politician - Nhà chính trị
Significant - Quan trọng, có ý nghĩa
Significance - Sự quan trọng, ý nghĩa
Significantly - Một cách quan trọng
Preserve - Bảo tồn
Preservation - Sự bảo tồn
Preservative - Chất bảo quản
Obtain - Đạt được
Obtainable - Có thể đạt được
Obtaining - Sự đạt được
Resourceful - Khéo léo, biết sử dụng tài nguyên
Resourcefulness - Sự khéo léo
Adapt - Thích ứng
Adaptation - Sự thích nghi
Adaptive - Có khả năng thích ứng
Involve - Liên quan, bao gồm
Involvement - Sự tham gia, sự liên quan
Available - Có sẵn
Availability - Tính sẵn có
Legal - Hợp pháp
Legality - Tính hợp pháp
Achieve - Đạt được
Achievement - Thành tựu
Achievable - Có thể đạt được
Beneficial - Có lợi
Benefit - Lợi ích / Mang lại lợi ích
Determine - Xác định
Determination - Sự xác định, quyết tâm
Determined - Quyết tâm
Prosper - Thịnh vượng
Prosperous - Thịnh vượng
Increase - Tăng lên
Increasing - Đang tăng lên
Increasingly - Một cách tăng dần
Establish - Thiết lập
Establishment - Sự thiết lập, tổ chức
Diverse - Đa dạng
Diversity - Sự đa dạng
Diversify - Đa dạng hóa
Survive - Sinh tồn, tồn tại
Survival - Sự sinh tồn
Survivor - Người sống sót
Regulate - Điều chỉnh
Regulation - Sự điều chỉnh, quy định
Tolerate - Chịu đựng, khoan dung
Tolerance - Sự khoan dung, chịu đựng
Tolerant - Khoan dung
Sustain - Duy trì
Sustainability - Sự bền vững
Sustainable - Bền vững
Alleviate - Giảm bớt, làm dịu đi
Alleviation - Sự giảm bớt, sự làm dịu
Complicate - Làm phức tạp
Complication - Sự phức tạp
Complicated - Phức tạp
Consolidate - Củng cố, hợp nhất
Consolidation - Sự củng cố
Embody - Biểu hiện, hiện thân
Embodiment - Hình mẫu, sự hiện thân
Mitigate - Giảm nhẹ, làm dịu bớt
Mitigation - Sự giảm nhẹ
Prioritize - Ưu tiên
Priority - Sự ưu tiên
Prioritized - Được ưu tiên
Advocate - Biện hộ, ủng hộ / Người ủng hộ
Advocacy - Sự ủng hộ, sự biện hộ
Contemplate - Suy ngẫm, cân nhắc
Contemplation - Sự suy ngẫm
Elicit - Kích thích, gợi ra
Elicitation - Sự gợi ra
Incorporate - Kết hợp, sáp nhập
Incorporation - Sự kết hợp
Exemplify - Minh họa, làm ví dụ
Exemplification - Sự minh họa
Substantiate - Cung cấp bằng chứng, chứng minh
Substantiation - Sự chứng minh, chứng thực
Reinforce - Củng cố, tăng cường
Reinforcement - Sự củng cố
Inhibit - Kìm hãm, ngăn chặn
Inhibition - Sự kìm hãm
Deter - Ngăn cản, làm nhụt chí
Deterrent - Biện pháp ngăn cản, sự ngăn cản
Coherent - Mạch lạc, hợp lý
Coherence - Sự mạch lạc
Controversial - Gây tranh cãi
Controversy - Cuộc tranh cãi, sự tranh luận
Perceive - Nhận thức
Perception - Sự nhận thức
Perceptive - Nhạy bén, sáng suốt
Distinguish - Phân biệt, nhận ra sự khác biệt
Distinction - Sự phân biệt
Distinguished - Xuất sắc, kiệt xuất
Interpret - Giải thích, thông dịch
Interpretation - Sự giải thích
Interpretable - Có thể giải thích được
Inevitable - Không thể tránh khỏi
Inevitability - Tính không thể tránh khỏi
Resilient - Kiên cường, bền bỉ
Resilience - Sự kiên cường
Evolve - Tiến hóa, phát triển
Evolution - Sự tiến hóa
Evolutive - Mang tính tiến hóa
Revolutionary - Cách mạng
Revolution - Cách mạng
Revolutionize - Cách mạng hóa
Plausible - Có vẻ hợp lý, có thể chấp nhận được
Plausibility - Tính hợp lý
Compensate - Bồi thường, đền bù
Compensation - Sự bồi thường
Compensatory - Mang tính bồi thường
Revoke - Hủy bỏ, thu hồi
Revocation - Sự hủy bỏ
Subtle - Tinh tế, tế nhị
Subtlety - Sự tinh tế, sự tế nhị
Notion - Khái niệm, ý tưởng
Notional - Mang tính khái niệm
Comprehensive - Toàn diện, bao quát
Comprehensiveness - Tính toàn diện
Adverse - Có hại, bất lợi
Adversity - Nỗi khó khăn, hoàn cảnh bất lợi
Viable - Khả thi, có thể thực hiện được
Viability - Tính khả thi
Prolific - Sản xuất nhiều, sinh sản nhanh
Prolificacy - Sự sinh sản nhanh
Facilitate - Tạo điều kiện, làm cho dễ dàng
Facilitation - Sự tạo điều kiện
Discern - Nhận thức rõ, phân biệt
Discernment - Sự nhận thức, khả năng phân biệt
Receptive - Dễ tiếp thu, dễ hiểu
Receptivity - Sự dễ tiếp thu
Impose - Áp đặt, bắt buộc
Imposition - Sự áp đặt
Cumulative - Tích lũy, dồn lại
Cumulatively - Một cách tích lũy
Deteriorate - Làm xấu đi, suy giảm
Deterioration - Sự suy giảm, sự xấu đi
Reiterate - Lặp lại, nhắc lại
Reiteration - Sự lặp lại
Concur - Đồng ý, tán thành
Concurrence - Sự đồng ý, sự tán thành
Imply - Ám chỉ, ngụ ý
Implication - Sự ám chỉ, hàm ý
Prevalent - Phổ biến, thịnh hành
Prevalence - Tính phổ biến, sự thịnh hành
Exacerbate - Làm trầm trọng thêm
Exacerbation - Sự làm trầm trọng thêm
Pioneer - Người tiên phong, dẫn đầu
Pioneering - Tiên phong, mở đường
Noteworthy - Đáng chú ý, đáng ghi nhận
Noteworthiness - Tính đáng chú ý
Refine - Tinh chỉnh, cải tiến
Refinement - Sự tinh chỉnh
Exemplary - Gương mẫu, đáng làm theo
Exemplarity - Sự gương mẫu
Corroborate - Xác nhận, làm chứng
Corroboration - Sự xác nhận
Perplexing - Gây bối rối, khó hiểu
Perplexity - Sự bối rối
Embrace - Ôm lấy, chấp nhận
Embracement - Sự ôm lấy, sự chấp nhận
Pursue - Theo đuổi, tiếp tục
Pursuit - Sự theo đuổi
Advantageous - Có lợi, thuận lợi
Advantage - Lợi thế, sự thuận lợi
Severe - Nghiêm trọng, gay gắt
Severity - Mức độ nghiêm trọng
Elusive - Khó nắm bắt, khó hiểu
Elusiveness - Tính khó nắm bắt
Coerce - Ép buộc, cưỡng chế
Coercion - Sự ép buộc
Doubtful - Nghi ngờ, không chắc chắn
Doubt - Sự nghi ngờ
Refute - Bác bỏ, phủ nhận
Refutation - Sự bác bỏ, sự phủ nhận
Quantum - Lượng tử
Quantum mechanics - Cơ học lượng tử
Synchronize - Đồng bộ hóa
Synchronization - Sự đồng bộ hóa
Degrade - Làm giảm chất lượng, hạ thấp
Degradation - Sự suy giảm chất lượng
Biodegradable - Có thể phân hủy sinh học
Biodegradability - Tính phân hủy sinh học
Futuristic - Mang tính tương lai
Futurism - Chủ nghĩa tương lai
Optimize - Tối ưu hóa
Optimization - Sự tối ưu hóa
Artificial - Nhân tạo
Artificial intelligence (AI) - Trí tuệ nhân tạo
Intricate - Phức tạp, rối rắm
Intricacy - Sự phức tạp
Nanotechnology - Công nghệ nano
Nanotechnological - Mang tính công nghệ nano
Exponential - Theo cấp số nhân
Exponentially - Một cách theo cấp số nhân
Invasive - Xâm lấn
Invasion - Sự xâm lấn
Disruptive - Gây gián đoạn
Disruption - Sự gián đoạn
Innovative - Mang tính sáng tạo, đổi mới
Innovation - Sự đổi mới, sáng tạo
Cognizant - Nhận thức, hiểu rõ
Cognizance - Sự nhận thức, hiểu biết
Simulate - Mô phỏng
Simulation - Mô phỏng
Biotechnology - Công nghệ sinh học
Biotechnological - Mang tính công nghệ sinh học
Preliminary - Mở đầu, sơ bộ
Preliminaries - Sự chuẩn bị, bước đầu
Accelerate - Tăng tốc, thúc đẩy
Acceleration - Sự tăng tốc
Augment - Tăng cường, gia tăng
Augmentation - Sự tăng cường
Extrapolate - Suy luận, ước đoán
Extrapolation - Sự suy luận, ước đoán
Dynamism - Động lực, tính năng động
Dynamic - Năng động, có tính chất động
Interdisciplinary - Liên ngành, đa ngành
Interdisciplinarity - Sự liên ngành
Emulate - Mô phỏng, bắt chước
Emulation - Sự mô phỏng
Convergence - Sự hội tụ
Converge - Hội tụ, hội nhập
Divergence - Sự phân kỳ
Diverge - Phân kỳ, khác biệt
Quantum leap - Bước nhảy vọt
Quantum computing - Máy tính lượng tử
Paradigm - Mô hình, mẫu hình
Paradigmatic - Mang tính mô hình
Disrupt - Làm gián đoạn, phá vỡ
Innovation-driven - Lái bởi đổi mới
Technological - Thuộc về công nghệ
Technological innovation - Đổi mới công nghệ
Efficiency - Hiệu quả
Efficient - Hiệu quả, tiết kiệm
Autonomous - Tự động, độc lập
Autonomy - Sự tự chủ, sự độc lập
Prognosis - Dự đoán, tiên đoán
Prognosticate - Dự đoán, tiên đoán
Integrate - Tích hợp, hợp nhất
Integration - Sự tích hợp
Hybrid - Lai, kết hợp
Hybridization - Sự lai tạo, kết hợp
Synergy - Tính cộng hưởng, hợp lực
Synergistic - Mang tính cộng hưởng
Prototype - Nguyên mẫu
Prototyping - Sự làm nguyên mẫu
Iterative - Lặp lại, theo chu trình
Iteration - Sự lặp lại, vòng lặp
Modular - Mô-đun, có thể tháo rời
Modularity - Tính mô-đun
Networked - Kết nối mạng
Networking - Mạng lưới
Connectivity - Tính kết nối
Connective - Liên kết, kết nối
Confluence - Sự hội tụ, sự gặp gỡ
Confluent - Hợp nhất, đồng nhất
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
