# Lộ trình — Tính năng "Tạo bài kiểm tra"

> Phiên bản lộ trình chi tiết cho tính năng giáo viên tự tạo bài kiểm tra (đề trắc nghiệm / đúng-sai / tự luận / nghe) và đưa lên Phòng Học cho học sinh làm, kèm lưu điểm.
> Dựa trên hiện trạng code tại `C:\Users\admin\Documents\LearnHub`.

---

## 1. Hiện trạng

### 1.1. Đề hiện tại là file JSON tĩnh
- Ngân hàng đề nằm trong `cauhoi/*.json` (`questions.json`, `vatli.json`, `toanhoc.json`, `sinhhoc.json`, `hoahoc.json`, `anh-demo.json`, `english.json` ...).
- Card "Làm bài" trong Phòng Học trỏ tới engine qua URL `?de=<tên file, không đuôi .json>`, ví dụ:
  - `element/phonghoc-data.js` → `action: { type: "quiz", url: "../cauhoi/filetest.html?de=vatli.json" }`.
- Muốn thêm/đổi đề, phải sửa JSON bằng tay → giáo viên không tự làm được.

### 1.2. Engine đã đầy đủ (giữ nguyên, chỉ nạp nguồn khác)
- `cauhoi/filetest.html` và `cauhoi/questionenglish.html` tự render, xáo trộn đáp án, đếm giờ, chấm và hiện kết quả.
- **Format dữ liệu đề engine đọc** được ghi chi tiết tại `docs/FORMAT-DE-THI.md` — mọi đề (file JSON lẫn `test_sets.content`) phải đúng spec này.
- Hỗ trợ sẵn các loại câu: `multiple` (trắc nghiệm), `true_false` (đúng/sai, cộng điểm từng ý), `short_answer` (tự luận, so khớp không phân biệt hoa thường), `listening` (nghe: `listenTitle` + `audio` URL) và `passage` (đọc hiểu).
- Chấm theo **thang 10** bất kể số câu. Kết quả gửi qua postMessage:
  ```js
  window.parent.postMessage({ type: "LEARNHUB_TEST_RESULT", requestId, score }, "*");
  ```

### 1.3. Lưu điểm
- `index.html` nhận `LEARNHUB_TEST_RESULT` → `createUserStats(u)` + `updateUserStats(u.uid, score)` → ghi thẳng vào `test_stats` (RLS cho phép học sinh ghi dòng của mình).
- `element/leaderboard.html`, `profile.html` đọc `test_stats` theo `week_key`.
- **Chưa** lưu từng câu trả lời → chưa có dữ liệu cho báo cáo "câu sai nhiều".

### 1.4. Chưa có gì cho giáo viên
- Sidebar `teacher/shell.js`: `{ key: "quiz", icon: "fa-file-circle-check", label: "Bài kiểm tra", soon: true }`.
- Trang chủ `teacher/index.html`: card "Soạn bài kiểm tra" mang nhãn "Sắp ra mắt".

### 1.5. Pattern để tái sử dụng
- `supabase/flashcards.sql`: bảng jsonb + RLS "no direct" (`using(false)`) + RPC `security definer` + kiểm tra `public.is_teacher()` + `{ok:true,...}` / `{ok:false, error:'forbidden'|...}`.
- `teacher/newflashcard.html`: danh sách → editor → lưu qua RPC → toasts tiếng Việt.

---

## 2. Kiến trúc đích

```
teacher/index.html (#tcQuizView - soạn đề)
        │  RPC create/update/delete/list (is_teacher)
        ▼
  supabase: public.test_sets  (jsonb content)
        │  RPC get_test_content(p_de)  (anon + authenticated)
        ▼
cauhoi/filetest.html + questionenglish.html  (engine cũ, thêm nhánh de=DB)
        │  LEARNHUB_TEST_RESULT (+ test_id, answers)  [GĐ2]
        ▼
index.html → test_attempts + test_stats
        ▼
teacher report (GĐ3)
```

Nguyên tắc:
1. **Engine giữ nguyên** — chỉ thay nguồn nạp đề: file → DB.
2. **DB là nguồn duy nhất** cho đề giáo viên tạo; format JSON lưu đúng định dạng engine đang đọc.
3. **Giữ giao thức điểm** thang 10 để không phá `test_stats`, leaderboard, profile.
4. **RLS no-direct + RPC security definer** theo đúng pattern flashcard.

---

## 3. Giai đoạn 1 — Kho đề + trình soạn đề (làm trước)

Mục tiêu: giáo viên tạo/sửa/xoá đề trên web, engine đọc được đề từ DB, làm và chấm đúng ngay trên `?de=t:<id>`.

> ✅ **Bản demo độc lập** (đã duyệt thao tác) để thử parse text/.docx → JSON → render/chấm → rà soát/xuất bản: mở `docs/demo-tao-de/index.html`.
> **Giao diện hiện tại (3 màn)**: (1) **Nhập đề** (dán text / tải `.docx`/`.json` / đề mẫu); (2) **JSON + Xem trước** chia 2 khung cố định (trái: JSON — **sửa tay → render live bên phải ngay** sau ~0.35s, không còn nút "Áp dụng & Render"/"Tạo JSON mẫu"; phải: render preview thuần — **đã bỏ nút Chấm điểm/Làm lại, bỏ dòng "Tổng N câu · điểm mỗi câu", bỏ block thiết lập**, chỉ giữ trạng thái gán đáp án khi click phương án chưa có đáp án đúng), khung cao theo viewport, nội dung dài cuộn trong khung, toàn màn hình ngang (không max-width); (3) **Rà soát & Xuất bản** — **trái: rà soát đề** (từng phần + danh sách câu + thống kê), **phải: cột thiết lập cố định** (môn học, tên đề, mô tả, thời gian, điểm tối đa, trạng thái xáo trộn + nút **"🚀 Xuất bản đề"**), nút xuất bản **chỉ mô phỏng** (chờ giả lập → thông báo thành công + id giả trong cột trái), chưa ghi database thật. Tự động nhảy sang màn 2 khi đọc text/tải file; nút "▶ Tiếp tục" trên topbar **chỉ hiện ở màn 2** (ẩn ở màn 1 và màn 3 — muốn sửa thiết lập thì ở màn 3 bấm "← Sửa lại đề" về màn 2), mở modal thiết lập (dropdown môn học 7 môn giống `PHONGHOC_SUBJECTS`, tên đề, mô tả [không bắt buộc], thời gian, **điểm tối đa mặc định 10**, xáo trộn câu/đáp án mặc định bật); **4 mục Môn học / Tên đề / Thời gian / Điểm tối đa bắt buộc nhập** (dấu `*`, viền đỏ + thông báo lỗi nếu thiếu) mới cho **Áp dụng** → nhảy sang màn 3; **chấm điểm không còn trong demo** — mục "Điểm tối đa" chỉ là thiết lập hiển thị ở màn 3, engine thật (`filetest.html`) sẽ chia điểm = điểm tối đa ÷ tổng câu; **tên hiển thị trên topbar**: tải file → hiện tên **kèm đuôi** `📄 x.docx` còn **tên đề tự render = tên file bỏ đuôi** (đổi được trong cài đặt), nhập/paste text tay hay bấm "Nạp đề mẫu" → topbar hiện **"Chưa có tiêu đề"** và ở cài đặt đề **bắt buộc tự nhập tên**; **preview/review render đúng theo engine `filetest.html`**: Đúng/Sai thành dãy mệnh đề chip `a.`/`b.` + nút **Đ/S** (tô xanh/đỏ + ghi `(Đáp án: Đúng/Sai)` khi chấm), tự luận là ô nhập + hiện "Đáp án mẫu" ở màn rà soát, hỗ trợ `image` minh họa mọi loại câu; **dán JSON trực tiếp vào ô nhập đề (màn 1) tự nhận dạng → vào thẳng màn 2** (không cần tải file .json); **màn 2 có 2 cách sửa đáp án**: sửa JSON bên trái (live-render) hoặc **bấm trực tiếp bên preview** — trắc nghiệm bấm phương án nào là gán `correct` đó, đúng/sai bấm Đ/S là lưu đáp án mệnh đề, tự luận có nút **💾 Lưu làm đáp án mẫu** lấy nội dung ô nhập, JSON tự cập nhật tương ứng; cache-buster `script.js?v=26`.
> **Làm lại giao diện theo ngôn ngữ thiết kế LearnHub** (giống `filetest.html`): nền chấm nhạt + thẻ trắng gradient bo 20px + xanh `#1a73e8`, topbar thành thẻ trắng nổi (tiêu đề "LearnHub · Tạo đề 📝" + tên file bên trái, thanh bước canh giữa), **thanh bước 1·2·3** (bước đang làm tô xanh, bước đã xong tô xanh), nút gradient + hover nhấc lên, phương án trắc nghiệm **lưới 2 cột** dạng thẻ bo tròn (ẩn radio, chỉ ký tự A/B + chip đáp án), chip Đ/S + ô đúng có ✓, modal thiết lập có **đầu gradient xanh**, cột JSON/Xem trước có **thanh tiêu đề** ("🧾 JSON" / "👁️ Xem trước" + đếm "N phần · M câu"); cache-buster `style.css?v=40`, `script.js?v=32`.
> ✅ **CƠ CHẾ TẠO ĐỀ — ĐÃ CHỐT (theo demo)**: **Màn 1 — Nhập đề**: ô nhập đề kéo dãn vừa màn hình; thanh công cụ **trái = "📖 Đọc text → JSON" + "Nạp đề mẫu"**, **phải = "Giữ định dạng chữ (.docx)" + "⬆️ Tải tệp lên"** (một nút chung nhận `.docx`/`.txt`/`.json` — `.json` vào thẳng màn 2, còn lại parse text); **Màn 2 — JSON + Xem trước**: trái sửa tay JSON → phải render live sau ~0.35s, khung 2 cột co vừa 1 màn hình (khoá scroll trang); **sửa đáp án 2 cách**: sửa JSON trái HOẶC **bấm trực tiếp preview phải** — trắc nghiệm bấm phương án là gán `correct` đó, Đ/S bấm chip là lưu đáp án mệnh đề, tự luận bấm **"💾 Lưu làm đáp án mẫu"**, JSON trái tự cập nhật theo; phương án trắc nghiệm ngắn xếp **lưới 2 cột**, câu nào có đáp án dài (>38 ký tự) tự **xếp 1 cột dọc**; **Màn 3 — Rà soát & Xuất bản**: trái rà soát đề (khối tiêu đề phần gọn 11-12px), phải cột thiết lập cố định + nút **"🚀 Xuất bản đề"** mô phỏng `{subject, name, description, content}` — chưa ghi DB; **header**: "← Quay lại" + "LearnHub · Tạo đề 📝" + tên file bên trái, **"▶ Tiếp tục" dí góc phải**, **thanh bước 1·2·3 nằm gọn trong header** (bước đang làm sáng xanh, bước xong tô xanh); **popup thiết lập**: ẩn thanh scroll, **4 mục bắt buộc** (`*` — Môn học/Tên đề/Thời gian/Điểm tối đa, thiếu → viền đỏ + báo lỗi, không đóng), **thời gian mặc định 0** (0 = không giới hạn), điểm tối đa mặc định 10, xáo trộn câu/đáp án mặc định bật; tên đề mặc định = tên file bỏ đuôi, thay được trong cài đặt; giao diện theo ngôn ngữ thiết kế LearnHub (nền chấm + thẻ trắng gradient + xanh `#1a73e8`).
> **Khả năng parse đã kiểm chứng**: text dán; `.docx` giữ đậm/nghiêng/gạch chân (4 cách đánh dấu đáp án: dòng `Đáp án: X`, `*C.`, hậu tố `(B)`, heuristic in đậm/màu 1 phương án); 4 phương án ngang **cùng 1 đoạn tách Tab** tự tách; đáp án bắt đầu bằng **chữ in hoa + dấu chấm** (`B. Franklin`) giữ nguyên nhờ quyết định "đúng format nhãn" theo từng câu; fix lệch index khi nhãn bôi đậm riêng (`<strong>B.</strong>Cortana`). Đã test thật với file `demo.docx` (10 câu trắc nghiệm → JSON chuẩn, đáp án đúng từng câu). **Tự tách section** theo tiêu đề phần (`Phần I.`, `1. Trắc nghiệm`, `I: Đọc hiểu`… — số La Mã/số thường + keyword loại phần), gán `sectionTitle` chuẩn hoá + `sectionDesc` cố định; riêng `1. Nghe/Đọc` dạng số thường bị bỏ để tránh nhầm câu hỏi (chi tiết ở `FORMAT-DE-THI.md` mục 2.6). Sửa tay JSON bên trái được bảo vệ chống ghi đè (`jsonAreaDirty`): click gán đáp án bên preview tự đồng bộ JSON nhưng không đè phần người dùng đang sửa.
> **Bản demo xuất bản (mô phỏng) → khớp với bản thật**: payload giả có dạng `{subject, name, description, content}` — đúng cột bảng `test_sets` (mục 3.1); môn học chọn theo dropdown 7 môn trong `PHONGHOC_SUBJECTS` để bản thật hiện card đúng môn trong Phòng Học (như `test_cards` — GĐ2 Option B). Chưa đặt tên đề thì nút Xuất bản bị khoá (giống `create_test_set` trả `empty_name`).
> **Chuyển sang GĐ1**: giữ nguyên bộ parse (`parseLines`/`splitInlineOpts`/`cleanOptionHtml`/`normalize`) + layout 2 khung (danh sách section JSON trái, preview render phải) + luồng "Tiếp tục → thiết lập → rà soát" để dựng `#tcQuizView` trên `teacher/index.html`; phần form thiết lập (môn/tên/mô tả/thời gian/xáo trộn) và màn rà soát dựng thẳng thành phần "Thông tin đề" + nút Lưu trong editor.

### 3.1. SQL — `supabase/test-sets.sql` (đã tạo ✅)

> ✅ **ĐÃ CHỐT + ĐÃ TẠO FILE** (cập nhật theo cơ chế thêm card giống video card): mỗi dòng `test_sets` = 1 bài kiểm tra = 1 card "Làm bài" đúng tab môn trong Phòng Học. **`subject`** → card hiện ở tab môn đó (khớp tên môn trong `PHONGHOC_SUBJECTS`); **`name`** = tiêu đề card; **`description`** = mô tả card. **Bảng BỎ `attempts` và `sort_order`** — thứ tự hiển thị theo **thời gian tạo** (`created_at ASC`: ai up trước xếp trước); thống kê lượt làm sau này đọc qua `test_attempts` (GĐ2). **`is_complete`** = bật/tắt "hiện trong Phòng Học": `false` (draft) ẩn, `true` mới hiện card. Trạng thái badge trên card dùng sẵn CSS `.status.done` ("Hoàn thành") của phong-hoc.

Tối giản theo pattern `flashcard_sets`:
```sql
create table if not exists public.test_sets (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  text not null,
  subject     text not null default '',
  name        text not null default '',
  description text not null default '',
  content     jsonb not null default '[]',   -- phải đúng spec docs/FORMAT-DE-THI.md
  minutes     int not null default 0,
  score       int not null default 10,
  shuffle_q   boolean not null default true,
  shuffle_a   boolean not null default true,
  is_complete boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
```
- RLS: `alter table ... enable row level security;` + policy **no direct** `for all to authenticated using (false) with check (false)`.
- Thêm vào realtime publication (giống `subject_notices`) nếu cần (tham khảo, có thể bỏ).

**RPC (tất cả `security definer`; `revoke from public`, `grant ... to authenticated`):**
| RPC | Tham số | Trả về | Ghi chú |
|---|---|---|---|
| `teacher_upsert_test_set` | `p_id`, `p_subject`, `p_name`, `p_description`, `p_content jsonb`, `p_minutes`, `p_score`, `p_shuffle_q`, `p_shuffle_a`, `p_is_complete` | `{ok, id}` | cơ chế upsert như `teacher_upsert_video_card`; kiểm tra `is_teacher()`, `empty_subject`, `empty_name`, `empty_content`; sửa chỉ chủ sở hữu hoặc teacher |
| `teacher_list_test_sets` | — | danh sách đề (kèm `question_count`), sắp `subject, created_at asc` | cho màn hình teacher |
| `teacher_delete_test_set` | `p_id` | `{ok}` | |
| `teacher_set_test_complete` | `p_id`, `p_is_complete` | `{ok}` | bật/tắt hiện card trong Phòng Học |
| `get_test_content` | `p_de` (`t:<uuid>`) | `{ok, content, subject, name, description, minutes, score}` hoặc `{ok:false}` | cho engine + preview, grant `anon, authenticated`; chỉ đọc được bài đã hiện |
| `list_published_test_sets` | — | meta bài ĐÃ HIỆN (kèm `question_count`), sắp `subject, created_at asc` | cho Phòng Học, grant `anon, authenticated` |

- Lỗi trả về ngắn: `forbidden | empty_subject | empty_name | empty_content | not_found | bad_args`.
- Không sửa `supabase/schema.sql` — chạy độc lập như `subject-notices.sql`.

### 3.2. Engine DB-mode — `cauhoi/filetest.html` (+ `questionenglish.html`)

- Ở `loadQuestions()`:
  ```js
  let JSON_FILE = urlParams.get('de') || 'questions.json';
  if (JSON_FILE.startsWith("cauhoi/")) JSON_FILE = JSON_FILE.slice(7);
  const DB_DE = JSON_FILE.startsWith("t:");   // prefix phân biệt đề DB / file
  ```
- Nhánh DB: gọi `supabase.rpc("get_test_content", { p_de: JSON_FILE })` (import từ `../supabase-config.js`), ánh xạ lỗi → cùng giao diện lỗi đỏ hiện có.
- Nhánh file: giữ nguyên `fetch(${JSON_FILE}?v=...)`.
- Đảm bảo `?de=t:uuid` vẫn không bị `stripJsonExt` làm hỏng (chỉ strip đúng hậu tố `.json`).
- `jsonv` cache buster không áp dụng cho nhánh DB (DB là bản mới nhất).

### 3.3. Teacher web — `teacher/index.html`

- **Sidebar** `teacher/shell.js`: bỏ `soon: true` ở key `quiz`; thêm màu active cho `[data-nav="quiz"]`.
- **Liên kết (các trang con)**: `cardphonghoc.html`, `newflashcard.html` thêm `else if (key === "quiz") window.location.href = "./index.html?view=quiz";`.
- **`index.html`:**
  - `onTeacherNav`: `key === "quiz"` → `setMainView("quiz"); tcLoadQuizzes();`
  - `guard()`: hỗ trợ `?view=quiz`.
  - View `#tcQuizView` (ẩn/`display:none`) + thêm vào `setMainView`.
  - Feature card "Soạn bài kiểm tra" chuyển `data-ready="0"` → `1` + `onclick="tcOpenQuizzes()"`.
  - Updating trang chủ: đếm đề "Đã có" (như class count).

**Màn hình làm việc (mô phỏng `newflashcard.html`):**
1. **Danh sách đề**: lọc theo môn (7 môn trong `NOTICE_SUBJECTS`/`PHONGHOC_SUBJECTS`), nút "Tạo đề mới", thẻ đề: tên, mô tả, số câu, ngày cập nhật, nút Sửa/Xoá/Nhân bản.
2. **Editor đề**:
   - Thông tin: `name`, `subject` (dropdown), `description`, công tắc `is_complete`.
   - Danh sách **Section**: `sectionTitle`, `sectionDesc` (HTML), `timeLimit` (phút, 0 = vô hạn), thêm/xoá section, kéo thả sắp xếp.
   - Trong mỗi section thêm câu hỏi theo 4 loại:
     - **Trắc nghiệm** (`multiple`): câu hỏi (HTML), 2–6 đáp án, đánh dấu đáp án đúng.
     - **Đúng/Sai** (`true_false`): câu dẫn + danh sách các mệnh đề `{text, correct 0/1}`.
     - **Tự luận** (`short_answer`): câu hỏi + `correctAnswer` (so khớp chuẩn hoá, không phân biệt hoa thường), `rows`.
     - **Nghe** (`listening`): `listenTitle`, `audio` URL (paste link như prepcdn.com), kèm câu trắc nghiệm phía dưới.
   - Options section: `passage` (HTML đọc hiểu), kèm câu hỏi.
   - **Chấm thử**: mở `?de=t:<id>` sau khi lưu (hoặc preview ngay bằng cách render thử).
   - **Lưu**: gọi `create_test_set` / `update_test_set`, toast kết quả, reload danh sách.
3. Import nhanh (đề xuất): nút "Nhập từ file JSON" đọc `cauhoi/*.json` có sẵn → đưa thành 1 đề trong DB để soạn tiếp.

### 3.4. Xác nhận GĐ1
- Đăng nhập teacher → Tạo đề mới (đủ 4 loại câu) → Lưu.
- Mở `element/phong-hoc.html` tạm thời qua URL `?de=t:<id>` (hoặc dán vào card) → làm → thấy điểm thang 10, đếm giờ đúng.

---

## 4. Giai đoạn 2 — Gán đề lên Phòng Học + lưu từng lần làm

### 4.1. Bảng `test_attempts`
```sql
create table if not exists public.test_attempts (
  id         bigint generated always as identity primary key,
  user_id    text not null,
  test_id    text not null,          -- id test_sets
  score      double precision not null,
  answers    jsonb not null default '[]',   -- từng câu trả lời (loại câu + đúng/sai)
  seconds    int not null default 0,
  created_at timestamptz not null default now()
);
```
- RLS: select cho teacher (`is_teacher()`) + bản thân user; insert bởi chính user (`user_id = auth.uid()::text`).
- RPC: `save_test_attempt` (security definer, validate user + test tồn tại), `teacher_test_attempts(p_test_id)` cho báo cáo.

### 4.2. Engine gửi chi tiết
- Mở rộng payload:
  ```js
  { type: "LEARNHUB_TEST_RESULT", requestId, score, testId, answers, seconds }
  ```
  (giữ các trường cũ, thêm trường mới → không phá `index.html` cũ).
- `filetest.html`/`questionenglish.html`: thu thập `answers` ngay tại `handleFinalSubmit` (đã có sẵn các đáp án người dùng chọn).

### 4.3. `index.html` lưu attempt
- Trong handler `LEARNHUB_TEST_RESULT`: nếu có `testId` hợp lệ → gọi `save_test_attempt`; vẫn gọi `createUserStats`/`updateUserStats` như cũ.

### 4.4. Hiển thị đề trên Phòng Học
- Option A (đơn giản): tái dùng card tĩnh — teacher copy URL `de=t:<id>` vào `phonghoc-data.js` (không tự động).
- Option B (khuyến nghị, ✅ đã làm phần cơ chế): **KHÔNG cần bảng `test_cards` riêng** — mỗi dòng `test_sets` (có `is_complete = true`) chính là 1 card. `phong-hoc.html` đã có:
  - `initTestCards()` gọi RPC `list_published_test_sets` → `mergeDbTestCards()` đổ card "Làm bài" vào grid đúng môn, dùng sẵn CSS `.status.done`/`.status.up`, badge "Hoàn thành"/"Đang cập nhật", kèm đếm câu/phút.
  - Mỗi card mở bằng `loadQuiz` với `?de=t:<uuid>`; `openQuizByDe` đã biết tìm trong `window.__testCardMap` nên deep-link `?open=phong-hoc&de=t:<id>` mở được (sau khi engine DB-mode xong).
  - Realtime cập nhật card chưa làm (ban đầu tải 1 lần; thêm channel `postgres_changes` như `subject_notices` nếu muốn).
- Còn lại: engine `?de=t:` (3.2) để nút "Làm bài" thật sự mở được bài.

---

## 5. Giai đoạn 3 — Báo cáo giáo viên

- RPC `teacher_test_report(p_test_id)`:
  - Danh sách học viên + điểm + thời gian làm.
  - Số lần làm, điểm TBC, điểm cao nhất.
  - Tỉ lệ đúng từng câu (từ `test_attempts.answers`) → xác định "câu sai nhiều".
- View `#tcReportView` trong `teacher/index.html` hoặc trang riêng `quiz-report.html` (theo ý bạn).
- Sidebar `report` bỏ `soon` khi xong.

---

## 6. Cấu trúc thư mục (dự kiến)

```
supabase/test-sets.sql           (GĐ1 - ✅ đã tạo: bảng + RPC)
supabase/test-attempts.sql       (GĐ2 - mới)
cauhoi/filetest.html             (GĐ1 - sửa loadQuestions + GĐ2 answers)
cauhoi/questionenglish.html      (GĐ1 - sửa tương tự, GĐ2 - answers)
teacher/index.html               (GĐ1 - #tcQuizView + nav + card)
teacher/shell.js                 (GĐ1 - bỏ soon quiz)
teacher/cardphonghoc.html        (GĐ1 - onTeacherNav quiz)
teacher/newflashcard.html        (GĐ1 - onTeacherNav quiz)
teacher/newtest/                 (GĐ1 - soạn đề, publish → chưa nối DB)
element/phong-hoc.html           (GĐ1 - ✅ card test từ DB: mergeDbTestCards + openQuizByDe tìm card DB)
element/phonghoc-data.js         (GĐ1 - giữ card tĩnh, kết hợp với DB)
index.html                       (GĐ2 - lưu test_attempts)
docs/ROADMAP-TAO-BAI-KIEM-TRA.md (file này)
```

---

## 7. Rủi ro & lưu ý

1. **Trùng tên `de`**: JSON file có thể trùng id DB — dùng prefix `t:` bắt buộc để phân biệt rõ.
2. **Không phá giao thức**: `LEARNHUB_TEST_RESULT` cũ vẫn phải chạy (thêm trường, không sửa trường).
3. **`questions.json` mặc định**: nếu thiếu `de` engine vẫn nạp file mặc định — giữ hành vi đó.
4. **Kích thước đề**: jsonb trên DB không nên quá lớn (mỗi đề < ~100KB). Nếu cần đề khổng lồ → xem lại.
5. **Imports**: `cauhoi/*.html` hiện chưa import `supabase-config.js` → thêm import sẽ chạy ở chế độ module, cẩn thận phạm vi biến (giữ nguyên `var`/`function` toàn cục hiện có).
6. **CORS/static**: hosting tĩnh không ghi file được → không hướng tới phương án "ghi JSON".
7. **Dữ liệu cũ**: spread câu hỏi sau này vẫn đọc được từ `test_sets.content`; không cần migrate file cũ ngay (import nhanh ở GĐ1 xử lý).

---

## 8. Tiêu chí hoàn thành (Definition of Done)

### Tổng kết 3 giai đoạn

| # | Giai đoạn | Trạng thái | Đã xong | Còn lại |
|---|---|---|---|---|
| **GĐ1** | Kho đề + trình soạn + engine đọc DB | 🟢 Gần xong | `test-sets.sql` (đã chạy), Phòng Học nhận card từ DB, teacher tạo/sửa/xoá đề, `filetest.html` + `questionenglish.html` nhánh `?de=t:`, xác nhận xoá bằng `lhConfirm` chuẩn tiếng Việt | Kiểm chứng end-to-end trên project thật (tạo đề → làm bài → điểm thang 10) |
| **GĐ2** | Gán đề + lưu từng lần làm | ⚪ Chưa làm | — | `test_attempts` SQL, engine gửi `testId/answers/seconds`, `index.html` gọi `save_test_attempt` |
| **GĐ3** | Báo cáo giáo viên | ⚪ Chưa làm | — | RPC `teacher_test_report`, view `#tcReportView`, "câu sai nhiều", bỏ `soon` sidebar report |

### GĐ1 — Kho đề + trình soạn + engine đọc DB (🟢 Gần xong)

| # | Công việc | File / Thành phần | Trạng thái | Ghi chú |
|---|---|---|---|---|
| 1 | SQL: bảng `test_sets` + RLS no-direct + RPC (`teacher_upsert_test_set`, `teacher_list_test_sets`, `teacher_delete_test_set`, `teacher_set_test_complete`, `get_test_content`, `list_published_test_sets`) | `supabase/test-sets.sql` | ✅ Hoàn thành | **Đã chạy trên project thật** |
| 2 | Phòng Học nhận card đề từ DB | `element/phong-hoc.html` (`initTestCards` → `mergeDbTestCards`, `openQuizByDe` tìm card DB) | ✅ Hoàn thành | Cần engine `?de=t:` để mở được bài |
| 3 | Sidebar bỏ `soon` + liên kết trang con + nav `?view=quiz` | `teacher/shell.js`, `teacher/cardphonghoc.html`, `teacher/newflashcard.html`, `teacher/index.html` (`onTeacherNav`, `guard`, `setMainView`) | ✅ Hoàn thành | — |
| 4 | Feature card "Soạn bài kiểm tra" mở + đếm đề trên trang chủ | `teacher/index.html` | ✅ Hoàn thành | — |
| 5 | Màn danh sách đề `#tcQuizView` (lọc môn, tạo mới, thẻ đề: tên/mô tả/câu/cập nhật, menu ⋮: Sao chép liên kết / Xoá, toggle hoàn thành) | `teacher/index.html` | ✅ Hoàn thành | Xoá đề dùng `lhConfirm`, không crash |
| 6 | Trình soạn đề `teacher/newtest` (Nhập đề text/.docx/.json → JSON+Preview live → Thiết lập môn/tên/mô tả/thời gian/điểm/xáo trộn → Xuất bản) | `teacher/newtest/` | ✅ Hoàn thành (cần E2E) | Publish → `teacher_upsert_test_set`, `is_complete=true`, đúng `minutes`/`score`/`shuffle_q`/`shuffle_a` |
| 7 | Engine DB-mode | `cauhoi/filetest.html` | ✅ Hoàn thành (cần E2E) | Nhánh `?de=t:` qua `get_test_content`; áp dụng `score`/`shuffle_q`/`shuffle_a`/`minutes`; điểm ngoài chuẩn thang 10 |
| 8 | Engine DB-mode | `cauhoi/questionenglish.html` | ✅ Hoàn thành (cần E2E) | Mở rộng 4 loại câu (`multiple`/`true_false`/`passage`/`cloze`); **`listening` luôn giữ thứ tự theo audio**; chấm theo thang DB → chuẩn hoá thang 10 |
| 9 | Xác nhận xoá chuẩn tiếng Việt | `teacher/index.html` + `toast.js` (`lhConfirm`) | ✅ Hoàn thành | Fallback `confirm` khi thiếu `lhConfirm` |
| 10 | Kiểm chứng end-to-end: tạo đề → card Phòng Học → làm `?de=t:<id>` → điểm đúng thang 10 | tất cả | ⬜ Chưa làm | Cần dữ liệu thật trên DB |

### GĐ2 — Gán đề + lưu từng lần làm (⚪ Chưa làm)

| # | Công việc | File / Thành phần | Trạng thái | Ghi chú |
|---|---|---|---|---|
| 1 | SQL: bảng `test_attempts` + RLS (select teacher + chính user; insert user) + RPC `save_test_attempt`, `teacher_test_attempts(p_test_id)` | `supabase/test-attempts.sql` | ⬜ Chưa làm | Trường: `user_id, test_id, score, answers jsonb, seconds, created_at` |
| 2 | Engine thu thập `answers` ngay tại `handleFinalSubmit` | `cauhoi/filetest.html`, `cauhoi/questionenglish.html` | ⬜ Chưa làm | — |
| 3 | Mở rộng payload giữ trường cũ (không phá `index.html` cũ) | `filetest.html`, `questionenglish.html` | ⬜ Chưa làm | `{ type:"LEARNHUB_TEST_RESULT", requestId, score, testId, answers, seconds }` |
| 4 | `index.html` lưu attempt khi có `testId` hợp lệ | `index.html` | ⬜ Chưa làm | Vẫn gọi `createUserStats`/`updateUserStats` như cũ |
| 5 | Học viên thấy card đề đúng môn trong Phòng Học | `element/phong-hoc.html` (`list_published_test_sets` + `mergeDbTestCards`) | ✅ Hoàn thành (cơ chế) | Real-time khi teacher gán card chưa làm |

### GĐ3 — Báo cáo giáo viên (⚪ Chưa làm)

| # | Công việc | File / Thành phần | Trạng thái | Ghi chú |
|---|---|---|---|---|
| 1 | RPC `teacher_test_report(p_test_id)`: danh sách HV (điểm + thời gian), số lần làm, điểm TBC, cao nhất | `supabase/test-attempts.sql` | ⬜ Chưa làm | — |
| 2 | Tỉ lệ đúng từng câu từ `test_attempts.answers` → "câu sai nhiều" | RPC report | ⬜ Chưa làm | — |
| 3 | View báo cáo `#tcReportView` (hoặc trang riêng `quiz-report.html`) | `teacher/index.html` | ⬜ Chưa làm | Theo ý bạn |
| 4 | Sidebar `report` bỏ `soon` | `teacher/shell.js` | ⬜ Chưa làm | Khi GĐ3 xong |