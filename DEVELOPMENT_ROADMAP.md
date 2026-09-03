# LEARNHUB — LỘ TRÌNH PHÁT TRIỂN TƯƠNG LAI

> Tài liệu này mô tả **những thứ sẽ làm** trong tương lai cho đồ án tốt nghiệp
> ngành Sư phạm Tin học. Mỗi tính năng đều có: mục tiêu, mô tả cách hoạt động,
> bảng dữ liệu cần thêm, và lý do vì sao cần (gắn với chấm điểm sư phạm).
> Dùng làm định hướng cho các phiên làm việc sau với trợ lý AI.

---

## 🎯 ĐỊNH HƯỚNG CHUNG

LearnHub hiện là nền tảng học tập tốt về mặt kỹ thuật, nhưng đang nặng tính
"công cụ học cá nhân". Với đồ án **Sư phạm Tin học**, cần đưa về đúng quy trình
**DẠY – HỌC – ĐÁNH GIÁ**: có **giáo viên chủ động**, có **lớp học**, có **theo dõi
kết quả**. Toàn bộ lộ trình dưới đây xoay quanh việc bổ sung khối này.

**3 trụ cột chính:**
1. **Vai trò Giáo viên** — soạn nội dung, giao bài, theo dõi lớp.
2. **Quản lý Lớp học** — lớp + mã mời + giao bài theo lớp.
3. **Phân tích học tập (Learning Analytics)** — biểu đồ tiến bộ + báo cáo cho giáo viên + AI.

---

## GIAI ĐOẠN 1 — CỐT LÕI: GIÁO VIÊN & LỚP HỌC (ưu tiên cao nhất)

### 1.1 Thêm vai trò GIÁO VIÊN (teacher) — ✅ ĐÃ LÀM

**Mô tả:** Bảng `users` hiện chỉ có `Thành viên`/`Admin`. Thêm giá trị **`Giáo viên`**
vào cột `role`, là vai trò trung gian: có nhiều quyền hơn học sinh nhưng không phải admin toàn hệ thống.

**Cách hoạt động:**
- Admin gán role `Giáo viên` cho tài khoản qua trang administrator (đã có dropdown role sẵn).
- Tạo hàm `is_teacher()` (giống `is_admin()`) để kiểm tra quyền.
- Giáo viên đăng nhập như thường → được hiển thị nút/liên kết vào web giáo viên.
- Trigger chống leo quyền giữ nguyên: user **không tự đổi** role; chỉ admin đổi được.

**Lý do:** Đây là điều ban giám khảo sư phạm tìm kiếm — thể hiện "ứng dụng CNTT
phục vụ người DẠY", không chỉ người học.

**Đã thực hiện:**
  - ✅ `supabase/schema.sql`: thêm hàm `public.is_teacher()` (check `role='giáo viên'` hoặc admin) + revoke/grant cho authenticated.
  - ✅ `index.html`: thêm nút "Giáo viên" trong Control Center nav (`id="ccNavTeacher"`, ẩn mặc định).
  - ✅ `script.js`:
    - Thêm `TEACHER_PANEL_URL = "/teacher.html"` + màu tab `teacher`.
    - `switchPane("teacher")` → mở `TEACHER_PANEL_URL` ở tab mới.
    - `checkAdmin()` → hiện nút Giáo viên nếu role teacher (nút Administrator giữ nguyên hiện với mọi user như cũ).
  - ✅ `teacher.html`: tạo file (nền cho 1.2) — dùng client `supabase` thường (giữ session
    của user hiện tại), check role `Giáo viên`/`Admin` mới vào; nếu không → báo "Không có quyền truy cập".

**Lưu ý:** Vai trò `Giáo viên` đã có sẵn trong dropdown admin (administrator.js:229) — phần
admin gán role **không cần sửa gì thêm**.

**Đổi tên file (đã làm):** `admin-dashboard.html` → `administrator.html`, `admin-dashboard.js` → `administrator.js`,
`teacher-dashboard.html` → `teacher.html`. Cập nhật `ADMIN_PANEL_URL="administrator.html"`, `TEACHER_PANEL_URL="teacher.html"`,
nhãn nút "Admin Panel" → "Administrator".

---

### 1.2 Web riêng cho GIÁO VIÊN (`teacher.html`) — ⏳ CHƯA LÀM

**Mô tả:** Tạo trang web riêng (tương tự administrator nhưng gọn hơn) chỉ dành
cho giáo viên. Có auth riêng (storage key riêng), chỉ người role `Giáo viên`/`Admin` vào được.

**Các phần (tab) trong web giáo viên:**

**a) Soạn bài kiểm tra (trắc nghiệm)**
- Giáo viên tạo đề: nhập tiêu đề, chọn môn, thêm từng câu hỏi (nội dung, 4 đáp án, đáp án đúng, độ khó), sửa/xóa.
- Dữ liệu lưu vào DB thay vì sửa file JSON.
- Từ đề này, học sinh làm bài qua engine `filetest.html` (cải tiến để đọc từ DB).

**b) Soạn flashcard**
- Giáo viên tạo bộ thẻ từ vựng theo chủ đề (từ – nghĩa – ví dụ), gán cho lớp/môn.
- Học sinh học bằng các chế độ game flashcard hiện có.

**c) Tổng quan lớp**
- Danh sách lớp giáo viên đang quản lý, số học sinh, số bài đã giao, ngày giao.

**d) Giao bài cho lớp**
- Chọn lớp → chọn đề đã soạn → ấn giao, đặt hạn nộp.
- Học sinh thấy bài được giao ở trang học sinh, làm và gửi kết quả.

**e) Kết quả & ôn tập (nối GĐ2)**
- Xem học sinh nào đã làm/chưa, điểm từng người, bài nào sai nhiều.
- AI gợi ý câu hỏi ôn tập cho học sinh yếu.

**Lý do:** Giáo viên chủ động tạo và giao nội dung chính là phần "demo sư phạm"
sống động nhất khi bảo vệ.

---

### 1.3 Quản lý LỚP HỌC

**Mô tả:** Cho phép giáo viên tạo lớp, sinh **mã mời**, học sinh nhập mã để tham gia.
Từ đó giao bài và theo dõi kết quả theo từng lớp.

**Cách hoạt động:**
- Giáo viên tạo lớp: đặt tên, hệ thống sinh **mã mời 6 ký tự**.
- Học sinh ở trang học sinh nhập mã → vào lớp.
- Giáo viên xem danh sách thành viên lớp, giao bài cho lớp.

**Bảng dữ liệu mới cần thêm:**
```
classes          (id, teacher_id, name, invite_code, created_at)
class_members    (class_id, user_id, joined_at)
class_assignments(class_id, quiz_set_id, due_date)
quiz_sets        (id, teacher_id, title, subject, created_at)
quiz_questions   (id, quiz_set_id, question, options jsonb, correct_index, difficulty)
submissions      (id, user_id, quiz_set_id, score, answers jsonb, submitted_at)
```

**Lý do:** Mô hình "lớp học" là khái niệm rất thân thuộc với giảng viên sư phạm,
cho thấy bạn hiểu thực tế giảng dạy (theo lớp, theo mã mời giống Google Classroom).

---

## GIAI ĐOẠN 2 — PHÂN TÍCH HỌC TẬP (màu sắc "nghiên cứu sư phạm")

### 2.1 Dashboard tiến bộ cho HỌC SINH

**Mô tả:** Trang hồ sơ/trang chủ học sinh hiển thị:
- **Biểu đồ tiến bộ điểm** theo tuần/tháng (từ `test_stats`).
- **Độ chính xác theo từng môn** (Lý, Hóa, Sinh, Toán, Anh, Tin...).
- **Thời gian học** tổng và theo ngày (`online_timer` + `watched_videos`).
- **Những môn yếu** → gợi ý nên ôn gì.

**Lý do:** "Phản hồi việc học" là chủ đề chuẩn của giáo dục; giúp học sinh tự
nhìn thấy tiến bộ.

### 2.2 Báo cáo cho GIÁO VIÊN theo lớp

**Mô tả:** Với mỗi lớp + mỗi đề đã giao, giáo viên xem:
- Điểm trung bình lớp, điểm cao/thấp, số người nộp.
- **Câu hỏi nào cả lớp sai nhiều nhất** → giáo viên biết cần giảng lại phần đó.
- Danh sách học sinh yếu cần quan tâm.

**Lý do:** Đây chính là "phân tích kết quả kiểm tra – đánh giá" giáo viên cần hàng ngày.

### 2.3 AI hỗ trợ GIÁO VIÊN (nối từ chatbot Hubie có sẵn)

**Mô tả:** Dùng model AI (đã có qua Cloudflare Worker):
- AI **gợi ý sinh câu hỏi** theo chủ đề/môn (giáo viên nhập chủ đề → AI ra câu hỏi trắc nghiệm).
- AI **gợi ý nội dung ôn tập** cho từng học sinh dựa trên điểm yếu.

**Lý do:** Nổi bật xu hướng "AI trong giáo dục", tăng tính thuyết phục.

---

## GIAI ĐOẠN 3 — HOÀN THIỆN & KHAI THÁC CHO ĐIỂM

### 3.1 Giáo viên tải bài giảng cho lớp
- Giáo viên upload PDF/video bài giảng → gắn vào lớp.
- Cần bucket storage mới (vd `class-materials`) + policy riêng chiếu vào `classes`.

### 3.2 Ngân hàng câu hỏi dùng chung
- Giáo viên chia sẻ đề/câu hỏi với giáo viên khác trong trường.
- Xây thêm trang duyệt đề chung.

### 3.3 Đảm bảo hệ thống ổn định khi demo thực tế
- Đảm bảo chạy mượt khi 1 lớp (~30-40 học sinh) dùng thử cùng lúc.
- (Đã tối ưu hiệu suất: heartbeat, realtime, forum deletion, v.v.)

### 3.4 Thực nghiệm sư phạm (cho báo cáo)
- Cho 1 lớp dùng thử thật, thu số liệu trước/sau, đánh giá hiệu quả.
- Viết phần đánh giá trong bài báo cáo tốt nghiệp.

---

## BẢNG TÓM TẮT MỨC ƯU TIÊN & CHI PHÍ

| Ưu tiên | Tính năng | Giá trị sư phạm | Chi phí triển khai |
|---|---|---|---|
| 1 | Vai trò Giáo viên + soạn nội dung từ UI | ⭐⭐⭐⭐⭐ | Cao |
| 2 | Quản lý Lớp học (mã mời, giao bài) | ⭐⭐⭐⭐⭐ | Trung bình |
| 3 | Dashboard tiến bộ học sinh | ⭐⭐⭐⭐ | Thấp |
| 4 | Báo cáo giáo viên theo lớp | ⭐⭐⭐⭐ | Trung bình |
| 5 | AI gợi ý câu hỏi / ôn tập | ⭐⭐⭐⭐ | Thấp |
| 6 | Giáo viên tải bài giảng cho lớp | ⭐⭐⭐ | Trung bình |
| 7 | Ngân hàng câu hỏi chia sẻ | ⭐⭐⭐ | Trung bình |

---

## QUYẾT ĐỊNH ĐANG CHỜ CHỐT (cần trả lời để bắt đầu)

- [ ] **Làm phạm vi nào trước?** Chỉ GĐ1, hay GĐ1 + GĐ2, hay cả 3.
- [ ] **Giao diện giáo viên:** web riêng `teacher.html` (đã nghiêng về hướng này).
- [ ] **Kho câu hỏi hiện tại (JSON tĩnh `cauhoi/*.json`):**
      chuyển hẳn sang DB, hay hybrid (giữ JSON cũ + thêm DB cho nội dung giáo viên tạo mới).

---

## GH CHÚ KỸ THUẬT (tránh làm hỏng code cũ)

- **Không tự đổi role**: trigger chặn; mọi đổi role chỉ qua admin.
- **Hàm quyền mới** (`is_teacher()`) phải tự kiểm tra bên trong, không tin client.
- **`is_admin()`** chỉ nhận `role='admin'` hoặc email `learnhubadmin@gmail.com`.
- **`filetest.html`** hiện đọc JSON tĩnh — nếu chuyển DB phải giữ tương thích.
- **Bucket `forum-images`** public 5MB — nếu upload bài giảng cần bucket riêng + policy.
