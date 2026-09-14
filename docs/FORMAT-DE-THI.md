# Format dữ liệu đề thi (data contract) — LearnHub

Đây là định dạng mà `cauhoi/filetest.html` và `cauhoi/questionenglish.html` **đọc được và render/chấm đúng**.
Cả hai nguồn đều phải tuân đúng spec này:

- File JSON tĩnh trong `cauhoi/*.json`
- `test_sets.content` (jsonb) khi tạo đề từ web giáo viên (GĐ1)

---

## 1. Cấu trúc tổng thể

**JSON là một MẢNG các section** — không phải object bao ngoài:

```json
[
  { "sectionTitle": "...", "sectionDesc": "...", "timeLimit": 5, "questions": [ ... ] },
  { "sectionTitle": "...", "questions": [ ... ] }
]
```

Mỗi phần tử = 1 **section**. Mỗi section chứa danh sách `questions`. Toàn bộ đề bọc trong `[]`.

### Các trường của SECTION

| Trường | Bắt buộc | Kiểu | Ý nghĩa |
|---|---|---|---|
| `sectionTitle` | ✔ | string | Tiêu đề phần (VD: "PHẦN I. TRẮC NGHIỆM") |
| `sectionDesc` | ✖ | string (HTML) | Mô tả/ghi chú hướng dẫn phần (cho phép `<b>`, `<i>`...) |
| `timeLimit` | ✖ | số (phút) | Thời gian làm phần này. `0`/bỏ trống = không giới hạn. `0.5` = 30 giây. Engine lấy tổng của các phần có timeLimit > 0 làm giới hạn chung |
| `type` | ✖ | string | `"listening"` = phần NGHE (chỉ engine tiếng Anh phân biệt) |
| `listenTitle` | ✖ | string | Tiêu đề trước nút play audio |
| `audio` | ✖ | string (URL) | Link file âm thanh mp3 (VD: `https://static-assets.prepcdn.com/...mp3`) |
| `passage` | ✖ | string (HTML) | Bài đọc hiểu (được hiển thị cột trái) |
| `questions` | ✔ | array | Danh sách câu hỏi (xem mục 2) |

`type:"listening"` và `audio` hỗ trợ độc lập: chỉ cần có `audio` là engine tự render phần nghe, không cần `type`.

---

## 2. Các loại câu hỏi (question object)

### 2.1 Trắc nghiệm — `multiple`
```json
{
  "type": "multiple",
  "question": "Thủ đô của <b>Việt Nam</b> là thành phố nào?",
  "answers": ["Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng", "Cần Thơ"],
  "correct": 0
}
```
- `answers`: mảng đáp án (2–6 phương án).
- `correct`: **chỉ số (bắt đầu từ 0)** của đáp án đúng trong `answers`. **KHÔNG phải chuỗi**.
- Trường hợp đặc biệt: trong phần nghe/đọc, `question` vẫn giữ `type:"multiple"` (không đổi tên loại).

### 2.2 Đúng / Sai — `true_false`
```json
{
  "type": "true_false",
  "question": "Cho biết mỗi câu sau đúng hay sai:",
  "subQuestions": [
    { "text": "Trái Đất quay quanh Mặt Trời.", "correct": 1 },
    { "text": "1 + 1 = 3.", "correct": 0 }
  ]
}
```
- `subQuestions`: mảng mệnh đề; `correct: 1` = Đúng, `correct: 0` = Sai.
- **Chấm**: cộng điểm theo TỪNG mệnh đề (mỗi mệnh đề đúng = chia đều điểm của câu). Câu này tính là "đúng hoàn toàn" chỉ khi làm đúng 100% số mệnh đề.

### 2.3 Tự luận — `short_answer`
```json
{
  "type": "short_answer",
  "question": "Ngôn ngữ dùng tạo cấu trúc web là gì? (viết tắt 4 chữ cái)",
  "correctAnswer": "html",
  "rows": 3
}
```
- `correctAnswer`: đáp án chuẩn. **Chấm so khớp sau khi loại bỏ hoa/thường + trim 2 đầu** (viết "HTML" hay "html" đều đúng, dấu thừa sẽ sai).
- `rows` (tùy chọn): chiều cao ô nhập.

### 2.4 Phần NGHE — `type:"listening"` (là một SECTION, không phải question)
```json
{
  "sectionTitle": "PHẦN: KỸ NĂNG NGHE",
  "type": "listening",
  "listenTitle": "Part 1 — Short talks",
  "timeLimit": 0,
  "audio": "https://static-assets.prepcdn.com/content-management-system/xxx.mp3",
  "questions": [
    { "type": "multiple", "question": "What is the new closing time?", "answers": ["6 PM","7 PM","8 PM"], "correct": 2 }
  ]
}
```
Câu bên trong phần nghe là `type:"multiple"` như thường.

### 2.5 Trường dùng chung cho mọi câu hỏi
```json
"image": "https://...anh-minh-hoa.png"
```
- `image` (tùy chọn): URL ảnh minh họa hiển thị phía trên câu hỏi (mọi loại đều chấp nhận).

### 2.6 Cách đánh dấu "đáp án đúng" khi soạn đề từ VĂN BẢN / FILE WORD

Trong JSON chuẩn, đáp án được khai báo bằng `correct` (chỉ số 0-based) / `correctAnswer`. Khi soạn đề bằng **văn bản hoặc file .docx** (tool tạo đề parse để sinh JSON), đáp án trắc nghiệm được nhận diện theo **1 trong 4 cách** sau:

1. **Dòng đáp án riêng**: `Đáp án: A` hoặc `Đáp án đúng: B` ngay sau phương án — rõ và an toàn nhất, **khuyên dùng**:
   ```
   Câu 1: Thủ đô của Việt Nam là thành phố nào?
   A. Hà Nội
   B. TP. Hồ Chí Minh
   C. Đà Nẵng
   D. Cần Thơ
   Đáp án: A
   ```
2. **Dấu `*` trước phương án đúng**: `*C. Đà Nẵng`
3. **Hậu tố `(A)` cuối dòng câu hỏi**: `Câu 2: 2 + 3 = ? (B)`
4. **Chỉ tô đậm/nghiêng/gạch chân/tô màu ĐÚNG 1 phương án** (hay gặp ở Word): `B. **5**` → tự gán. Nếu ≥ 2 phương án cùng được định dạng → **không** gán (tránh hiểu nhầm).

Quy tắc chung khi soạn trong Word: **mỗi đoạn (paragraph) = 1 dòng nhận dạng**; câu hỏi và từng phương án nên nằm riêng từng đoạn, đánh số `1.` / `Câu 2:` ở đầu. **Ngoại lệ:** nhiều phương án nằm ngang trên CÙNG một đoạn tách nhau bằng phím Tab (VD: `A. Siri⇥B. Cortana⇥C. Alexa⇥D. Bixby`) vẫn nhận được — hệ thống tự tách thành từng phương án. Ưu tiên xử lý: dòng `Đáp án:` > hậu tố `(X)` > dấu `*` > heuristic định dạng.

Các loại khác:
- **Đúng/Sai:** hậu tố `(Đ)`/`(S)` (hoặc `(đúng)`/`(sai)`) cuối câu → sinh `subQuestions[].correct` (1=Đúng, 0=Sai).
- **Tự luận:** dòng `Đáp án: html` → sinh `correctAnswer: "html"`.
- Không nhận diện được → để trống `correct` → giáo viên **bấm chọn lại** ở chế độ xem trước (JSON đã sinh thì `correct` sẽ bị ẩn — xoá để hợp lệ).

> Bản demo thử các quy tắc trên: mở `docs/demo-tao-de/index.html` (nạp đề mẫu / tải .docx).

---

## 3. Quy tắc chấm điểm (engine tự làm, cần biết để soạn đúng)

- **Thang điểm luôn là 10**, không phụ thuộc số câu: `điểm mỗi câu = 10 / tổng số câu`.
- Trắc nghiệm: sai/không chọn = 0.
- Đúng/sai: phần điểm theo tỉ lệ mệnh đề đúng.
- Tự luận: so khớp chuẩn hóa (bỏ khoảng trắng 2 đầu, chữ thường).
- Kết quả gửi về `index.html` = số `score` (thang 10) → `test_stats`.

---

## 4. Quy ước `?de=`

- `?de=<tên file không đuôi>.json` → engine fetch file trong `cauhoi/` (hiện tại).
- `?de=t:<uuid>` → (GĐ1) engine gọi RPC `get_test_content` để lấy đề từ `test_sets`.
- Ký tự `t:` là prefix bắt buộc để phân biệt đề DB với file `.json` (tránh trùng tên).

---

## 5. File mẫu đầy đủ (gồm đủ loại mới)

```json
[
  {
    "sectionTitle": "PHẦN I. TRẮC NGHIỆM",
    "sectionDesc": "Chọn <b>một</b> đáp án chính xác nhất:",
    "timeLimit": 5,
    "questions": [
      {
        "type": "multiple",
        "question": "Công thức tính vận tốc là:",
        "answers": ["v = s/t", "v = s*t", "v = a*t", "v = s^2"],
        "correct": 0
      }
    ]
  },
  {
    "sectionTitle": "PHẦN II. ĐÚNG / SAI",
    "questions": [
      {
        "type": "true_false",
        "question": "Cho biết đúng hay sai:",
        "subQuestions": [
          { "text": "Nước sôi ở 100°C tại mực nước biển.", "correct": 1 },
          { "text": "1 + 1 = 3.", "correct": 0 }
        ]
      }
    ]
  },
  {
    "sectionTitle": "PHẦN III. TỰ LUẬN",
    "questions": [
      {
        "type": "short_answer",
        "question": "Viết tắt của HyperText Markup Language là gì?",
        "correctAnswer": "html",
        "rows": 3
      }
    ]
  },
  {
    "sectionTitle": "PHẦN IV. NGHE",
    "type": "listening",
    "listenTitle": "Đoạn hội thoại ngắn",
    "audio": "https://static-assets.prepcdn.com/content-management-system/xxx.mp3",
    "questions": [
      {
        "type": "multiple",
        "question": "Người nói đang muốn hẹn giờ mấy giờ?",
        "answers": ["7:00", "7:30", "8:00"],
        "correct": 1
      }
    ]
  },
  {
    "sectionTitle": "PHẦN V. ĐỌC HIỂU",
    "passage": "Đoạn văn dài... <b>nội dung</b> (hỗ trợ HTML).",
    "timeLimit": 10,
    "questions": [
      {
        "type": "multiple",
        "question": "Ý chính của đoạn văn là gì?",
        "answers": ["A", "B", "C", "D"],
        "correct": 2
      }
    ]
  }
]
```

---

## 6. Kiểm chứng nhanh
- Dán JSON trên thành file tạm `cauhoi/mau-moi.json` rồi mở:
  `element/phong-hoc.html` card `ly-trac-nghiem` (hoặc mở thẳng `cauhoi/filetest.html?de=mau-moi.json`).
- Đúng format → render đủ 4 loại, đồng hồ chạy (tổng 15 phút), chấm thang 10 chính xác.