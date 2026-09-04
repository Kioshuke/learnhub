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

### 1.3 Quản lý LỚP HỌC — ✅ LÕI ĐÃ LÀM (SQL + GIAO DIỆN)

**Mô tả:** Cho phép giáo viên tạo lớp, sinh **mã mời**, học sinh tham gia theo 2 cách.
Đây là nền để sau này **giao bài / theo dõi kết quả theo từng lớp** (1.2 d + 2.2).

**Cách hoạt động (phạm vi đã chốt — lõi lớp học):**
- **Giáo viên** (`teacher.html`): tạo lớp (tên + khối) → hệ thống sinh **mã mời 6 ký tự**.
  Xem danh sách lớp của mình (tên, khối, mã mời, số thành viên, số yêu cầu chờ).
  Mở chi tiết lớp → xem thành viên + yêu cầu tham gia, **duyệt / từ chối / gỡ** học sinh.
- **Học sinh** (tab "Lớp học" trong modal Thiết lập của `profile.html`):
  - Cách 1: nhập **mã mời** → vào lớp **ngay** (status `approved`).
  - Cách 2: chọn **khối** (10/11/12 — dòng tự do) → chọn **lớp** → gửi yêu cầu,
    status `pending`, chờ giáo viên duyệt.
  - Hiển thị "Lớp học của tôi" kèm trạng thái Đã vào / Đang chờ duyệt.

**Bảng dữ liệu ĐÃ THÊM** (tạo trong `supabase/classes.sql`, đã đưa vào `schema.sql`):
```
classes        (id, teacher_id, name, block, invite_code, created_at)
class_members  (id, class_id FK cascade, user_id, status approved|pending, joined_at,
                unique(class_id, user_id))
```
RLS: bật trên cả 2 bảng + policy `classes_no_direct` / `class_members_no_direct`
(`for all to authenticated using (false)`) — **mọi thao tác qua RPC security definer**
để không lộ mã mời / danh sách lớp khi chưa được phép.

**9 RPC đã tạo** (đều `security definer`, `revoke public; grant authenticated`):
- `create_class(name, block)` — GV tạo lớp, sinh mã 6 ký tự duy nhất.
- `list_blocks()` / `list_classes_in_block(block)` — học sinh duyệt khối+lớp (không lộ mã).
- `join_class_by_code(code)` — vào ngay (approved) khi đúng mã (chặn tự vào lớp của mình).
- `request_join_class(class_id)` — gửi yêu cầu (pending).
- `my_classes()` — lớp của học sinh (profile).
- `teacher_classes()` — lớp của GV + `member_count`/`pending_count`.
- `class_members_of(class_id)` — thành viên + yêu cầu (chỉ GV lớp đó).
- `set_class_member(member_id, 'approve'|'remove')` — duyệt/từ chối/gỡ (chỉ GV lớp đó).

**Bổ sung sau (04/09 theo review):**
- `delete_class(class_id)` — GV xoá lớp (cascade xoá thành viên), nút "Xoá lớp" trong chi tiết lớp ở `teacher.html`.
- `user_classes(user_id)` — lớp của 1 user cụ thể cho Hồ Sơ Chi Tiết (chỉ user đó tự xem hoặc GV/Admin xem).

**Đã thực hiện (frontend):**
- ✅ `supabase/classes.sql`: tạo bảng + RLS + 9 RPC (bản rút gọn; bỏ `delete_class`,
  `_is_class_teacher`, `approve_class_member`, `remove_class_member` — gộp vào `set_class_member`).
- ✅ `teacher.html`: thay placeholder bằng UI đầy đủ — tạo lớp, danh sách lớp, chi tiết + duyệt thành viên.
- ✅ `profile.html`: thêm tab "Lớp học" trong modal Thiết lập — xem lớp, nhập mã mời,
  chọn khối+lớp gửi yêu cầu; load danh sách khối khi mở modal.
- ✅ `profile.html`: Hồ Sơ Chi Tiết hiển thị "Các lớp đang tham gia" (gọi `user_classes`),
  chỉ hiện với role Thành viên/Học sinh, ẩn với Giáo viên/Admin.

**Lưu ý khi triển khai:** hàm RPC phụ thuộc `public.is_teacher()` → chạy 1.1 trước.
Để test: (1) admin gán 1 tài khoản role `Giáo viên`; (2) GV vào `teacher.html` tạo lớp;
(3) học sinh vào profile → tab Lớp học → nhập mã (vào ngay) hoặc chọn khối+lớp (chờ duyệt);
(4) GV duyệt trong chi tiết lớp.

**Chưa làm (nối tiếp sau):** giao bài cho lớp + theo dõi kết quả theo lớp (1.2 d, 2.2),
thuộc phần "đánh giá" của quy trình **DẠY – HỌC – ĐÁNH GIÁ**.

**Lý do:** Mô hình "lớp học" rất thân thuộc với giảng viên sư phạm, cho thấy bạn hiểu
thực tế giảng dạy (theo lớp, theo mã mời giống Google Classroom).

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
- **SQL lớp học** ở `supabase/classes.sql` (cũng đã được đưa vào `schema.sql`) — chỉ chạy RPC sau khi có `is_teacher()`.
- **Bảng lớp học** (`classes`, `class_members`) chặn RLS trực tiếp — mọi thao tác qua RPC security definer.
- **Hàm quyền mới** (`is_teacher()`) phải tự kiểm tra bên trong, không tin client.
- **`is_admin()`** chỉ nhận `role='admin'` hoặc email `learnhubadmin@gmail.com`.
- **`filetest.html`** hiện đọc JSON tĩnh — nếu chuyển DB phải giữ tương thích.
- **Bucket `forum-images`** public 5MB — nếu upload bài giảng cần bucket riêng + policy.
