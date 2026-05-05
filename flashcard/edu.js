// ===== DÁN DATA Ở ĐÂY =====
window.TOPIC_NAME = "Education";

const rawData = `
Dưới đây là danh sách toàn bộ từ vựng từ tài liệu CD6: EDUCATION, đã được lọc sạch và chuyển sang định dạng Từ tiếng Anh - Nghĩa tiếng Việt (không đánh số) để bạn tiện học:

Educate - Giáo dục
Educated - Có giáo dục
Education - Giáo dục
Educator - Nhà giáo dục
Graduate - Tốt nghiệp/Sinh viên tốt nghiệp
Graduation - Lễ tốt nghiệp
Undergraduate - Sinh viên chưa tốt nghiệp
Postgraduate - Học viên sau đại học
Learn - Học
Learner - Người học
Learning - Việc học tập
Study - Học/Nghiên cứu
Student - Học sinh, sinh viên
Studious - Chăm chỉ học tập
Train - Đào tạo
Trainer - Người đào tạo
Training - Sự đào tạo
Trainee - Người được đào tạo
Develop - Phát triển
Development - Sự phát triển
Developer - Người phát triển
Developmental - Mang tính phát triển
Teach - Dạy
Teacher - Giáo viên
Teaching - Việc giảng dạy
Examine - Kiểm tra
Examiner - Giám khảo
Examination - Kỳ thi
Exam - Bài thi
Assess - Đánh giá
Assessment - Sự đánh giá
Assessor - Người đánh giá
Achieve - Đạt được
Achievement - Thành tích
Achiever - Người đạt được thành công
Motivate - Thúc đẩy, động viên
Motivation - Động lực
Motivational - Mang tính động viên
Literate - Có khả năng đọc viết
Literacy - Khả năng đọc viết
Illiterate - Mù chữ
Innovate - Đổi mới
Innovation - Sự đổi mới
Innovator - Người đổi mới
Innovative - Mang tính đổi mới
Specialize - Chuyên môn hóa
Specialization - Sự chuyên môn hóa
Specialist - Chuyên gia
Specialized - Chuyên ngành
Participate - Tham gia
Participation - Sự tham gia
Participant - Người tham gia
Knowledge - Kiến thức
Knowledgeable - Hiểu biết rộng
Perform - Thực hiện
Performance - Sự thể hiện, thành tích
Performer - Người biểu diễn
Discipline - Kỷ luật, rèn luyện
Disciplined - Có kỷ luật
Disciplinary - Thuộc về kỷ luật
Memorize - Ghi nhớ
Memory - Trí nhớ
Memorable - Đáng nhớ
Collaborate - Hợp tác
Collaboration - Sự hợp tác
Collaborator - Người hợp tác
Collaborative - Mang tính hợp tác
Enroll - Đăng ký, ghi danh
Enrollment - Sự đăng ký, ghi danh
Organize - Tổ chức
Organization - Tổ chức
Organizer - Người tổ chức
Organized - Có tổ chức
Analyze - Phân tích
Analysis - Sự phân tích
Analyst - Nhà phân tích
Analytical - Mang tính phân tích
Focus - Tập trung
Focused - Có sự tập trung
Review - Ôn tập, đánh giá
Reviewer - Người đánh giá
Research - Nghiên cứu
Researcher - Nhà nghiên cứu
Compete - Cạnh tranh, thi đấu
Competition - Cuộc thi, sự cạnh tranh
Competitor - Đối thủ, thí sinh
Competitive - Mang tính cạnh tranh
Apply - Nộp đơn, áp dụng
Application - Sự áp dụng, đơn xin
Applicant - Người nộp đơn
Applicable - Có thể áp dụng
Adapt - Thích nghi
Adaptation - Sự thích nghi
Adaptable - Có thể thích nghi
Encourage - Khuyến khích, động viên
Encouragement - Sự khích lệ
Encouraging - Mang tính khích lệ
Understand - Hiểu
Understanding - Sự thấu hiểu
Understandable - Có thể hiểu được
Improve - Cải thiện
Improvement - Sự cải thiện
Improved - Được cải thiện
Communicate - Giao tiếp
Communication - Sự giao tiếp
Communicative - Mang tính giao tiếp
Inspire - Truyền cảm hứng
Inspiration - Nguồn cảm hứng
Inspirational - Mang tính truyền cảm hứng
Evaluate - Đánh giá
Evaluation - Sự đánh giá
Evaluator - Người đánh giá
Inform - Thông báo, cung cấp thông tin
Information - Thông tin
Informative - Cung cấp nhiều thông tin
Procrastinate - Trì hoãn
Procrastination - Sự trì hoãn
Procrastinator - Người trì hoãn
Require - Yêu cầu
Requirement - Yêu cầu
Required - Bắt buộc
Practice - Thực hành
Practical - Thực tế
Practitioner - Người thực hành
Pedagogy - Sư phạm
Pedagogical - Thuộc về sư phạm
Pedagogue - Nhà giáo dục, người dạy học
Cognitive - Liên quan đến nhận thức
Cognition - Nhận thức
Cognitively - Một cách nhận thức
Curriculum - Chương trình học
Curricular - Thuộc chương trình học
Facilitate - Hỗ trợ
Facilitation - Sự hỗ trợ
Facilitator - Người hỗ trợ học tập
Proficiency - Sự thành thạo
Proficient - Thành thạo
Proficiently - Một cách thành thạo
Accomplish - Hoàn thành
Accomplishment - Thành tựu
Accomplished - Xuất sắc, tài năng
Comprehensive - Toàn diện
Comprehensiveness - Sự toàn diện
Comprehensively - Một cách toàn diện
Synthesize - Tổng hợp
Synthesis - Sự tổng hợp
Synthetic - Thuộc tổng hợp
Autonomous - Tự chủ
Autonomy - Sự tự chủ
Autonomously - Một cách tự chủ
Methodology - Phương pháp học
Methodological - Thuộc phương pháp học
Methodologically - Một cách có phương pháp
Evaluative - Mang tính đánh giá
Inquiry - Sự tìm hiểu, điều tra
Inquisitive - Tò mò, ham học hỏi
Inquisitively - Một cách tò mò
Critique - Bài phê bình/phê bình
Critical - Phê phán, mang tính phân tích
Critically - Một cách phê phán
Immersive - Mang tính đắm mình
Immersion - Sự đắm mình
Intellect - Trí tuệ
Intellectual - Thuộc trí tuệ
Intellectually - Một cách trí tuệ
Prioritize - Ưu tiên
Priority - Sự ưu tiên
Prioritization - Sự sắp xếp ưu tiên
Integrate - Hội nhập, tích hợp
Integration - Sự hội nhập
Integrated - Được tích hợp
Reflect - Phản chiếu, phản ánh
Reflection - Sự phản chiếu, phản ánh
Reflective - Mang tính suy ngẫm
Interdisciplinary - Liên ngành
Abstract - Trừu tượng
Abstraction - Sự trừu tượng
Abstractly - Một cách trừu tượng
Applicability - Tính áp dụng
Conceptualize - Hình thành khái niệm
Concept - Khái niệm
Conceptual - Thuộc khái niệm
Deductive - Mang tính suy diễn
Deduction - Sự suy diễn
Deductively - Một cách suy diễn
Inductive - Mang tính quy nạp
Induction - Sự quy nạp
Inductively - Một cách quy nạp
Pragmatic - Thực dụng
Pragmatism - Chủ nghĩa thực dụng
Pragmatically - Một cách thực dụng
Standardize - Chuẩn hóa
Standardization - Sự chuẩn hóa
Standardized - Được chuẩn hóa
Assimilate - Đồng hóa
Assimilation - Sự đồng hóa
Assimilative - Thuộc về sự đồng hóa
Diversify - Đa dạng hóa
Diversity - Sự đa dạng
Diverse - Đa dạng
Empower - Trao quyền, làm chủ
Empowerment - Sự trao quyền
Empowered - Được trao quyền
Expand - Mở rộng
Expansion - Sự mở rộng
Expansive - Rộng lớn
Formulate - Hình thành, xây dựng
Formulation - Sự hình thành
Formulated - Được hình thành
Interpret - Giải thích, diễn giải
Interpretation - Sự giải thích
Interpretative - Mang tính giải thích
Optimize - Tối ưu hóa
Optimization - Sự tối ưu hóa
Optimal - Tối ưu
Diversification - Sự đa dạng hóa
Validate - Công nhận, xác nhận
Validation - Sự công nhận
Valid - Hợp lệ
Theorize - Đưa ra lý thuyết
Theory - Lý thuyết
Theoretical - Mang tính lý thuyết
Retain - Duy trì, giữ lại
Retention - Sự duy trì
Retentive - Có khả năng ghi nhớ tốt
Competence - Năng lực, khả năng
Competent - Có năng lực
Competently - Một cách thành thạo
Accreditation - Sự chứng nhận
Accredit - Chứng nhận
Accredited - Được chứng nhận
Allocate - Phân bổ
Allocation - Sự phân bổ
Allocated - Được phân bổ
Benchmark - Tiêu chuẩn, đo chuẩn
Benchmarking - Sự đo chuẩn
Contextualize - Đặt vào bối cảnh
Context - Bối cảnh
Contextual - Thuộc về bối cảnh
Illustrate - Minh họa
Illustration - Sự minh họa
Illustrative - Mang tính minh họa
Collaboratively - Một cách hợp tác
Intervene - Can thiệp
Intervention - Sự can thiệp
Interventional - Thuộc về sự can thiệp
Negotiate - Thương lượng
Negotiation - Sự thương lượng
Negotiable - Có thể thương lượng
Revise - Chỉnh sửa, ôn tập
Revision - Sự chỉnh sửa, ôn tập
Revised - Đã chỉnh sửa
Streamline - Tinh giản, hợp lý hóa
Streamlining - Sự tinh giản
Articulate - Diễn đạt rõ ràng
Articulation - Sự diễn đạt rõ ràng
Cater - Phục vụ, đáp ứng nhu cầu
Catering - Sự phục vụ, cung cấp
Differentiate - Phân biệt
Differentiation - Sự phân biệt
Differentiated - Được phân biệt
Disseminate - Truyền bá, phổ biến
Dissemination - Sự truyền bá, phổ biến
Elucidate - Làm sáng tỏ
Elucidation - Sự làm sáng tỏ
Facilitative - Mang tính hỗ trợ
Hypothesize - Đưa ra giả thuyết
Hypothesis - Giả thuyết
Hypothetical - Mang tính giả thuyết
In-depth - Chi tiết, chuyên sâu
Depth - Chiều sâu
Deepen - Làm sâu thêm
Intellectualize - Trí thức hóa
Intellectualism - Chủ nghĩa trí thức
Justify - Biện minh, chứng minh
Justification - Sự biện minh
Justifiable - Có thể biện minh
Modular - Theo mô-đun, học phần
Module - Học phần, mô-đun
Outperform - Vượt trội hơn
Quantify - Định lượng
Quantification - Sự định lượng
Quantifiable - Có thể định lượng
Scaffold - Hỗ trợ, khung hỗ trợ
Scaffolding - Sự hỗ trợ trong học tập
Stimulate - Kích thích
Stimulation - Sự kích thích
Stimulative - Mang tính kích thích
Substantiate - Chứng minh
Substantiation - Sự chứng minh
Substantial - Quan trọng, lớn lao
Tailor - Điều chỉnh theo yêu cầu
Tailored - Được tùy chỉnh
Tailoring - Sự tùy chỉnh
Utilize - Sử dụng
Utilization - Sự sử dụng
Utilizable - Có thể sử dụng
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
