/* ============================================================
   DỮ LIỆU PHÒNG HỌC  (element/phong-hoc.html)
   ------------------------------------------------------------
   ⭐ Bài TEST giờ đọc 100% từ database (bảng test_sets), card tự đổ qua
      list_published_test_sets — KHÔNG khai báo card test ở đây nữa.
   ⭐ Muốn THÊM KHÓA VIDEO → copy 1 object "MẪU VIDEO" trong cards[],
                            rồi thêm nội dung mục lục vào VIDEO_COURSES
   Không cần sửa gì trong phong-hoc.html — trang tự render từ file này.

   ── CARD - các trường ──
   - id          : định danh duy nhất (không trùng nhau)
   - title       : TÊN hiển thị trên card
   - description : Mô tả ngắn
   - icon        : icon Font Awesome, vd "fa-pen-fancy", "fa-play"...
   - iconBg      : (tùy chọn) ép màu nền icon, vd "#a78bfa"
   - status      : "done"    -> badge xanh "Hoàn thành"
                   "pending" -> badge vàng "Chưa hoàn thành"
   - disabled    : true -> nút xám "Sắp ra mắt" (không bấm được)
   - btnLabel    : (tùy chọn) chữ trên nút. Mặc định:
                   quiz = "Làm bài", video = "Xem video"
   - action      : hành vi khi bấm nút:
       { type: "quiz",  url: "..." }          -> nhúng trang làm bài (iframe)
       { type: "video", course: "id-khoa" }   -> mở trình phát video,
                                                 id-khoa trỏ tới VIDEO_COURSES

   ── ITEM TRONG MỤC LỤC VIDEO (VIDEO_COURSES.items) ──
   - { label: "...", video: "..." }  : video YouTube (ID hoặc link đầy đủ)
   - { label: "...", drive: "..." }  : video Google Drive (link /file/d/.../view,
                                       link ?id=..., hoặc ID trần đều được)
   - { label: "...", pdf: "..." }    : tài liệu PDF (Drive/repo đều được)
   - { label: "...", pending: true } : mục chưa có video ("Chưa có video")
   * Lưu ý: chỉ video YouTube được track tiến độ "đã xem" (tick xanh,
     xem >= 75% mới tính và lưu ID xuống database); Google Drive và PDF
     mở xem trực tiếp, không tính tick.

   ── KHÓA VIDEO - các trường ──
   - id     : phải khớp action.course của card
   - math   : true -> dùng style mục lục kiểu môn Toán (tuỳ chọn)
   - items  : danh sách mục lục, mục ĐẦU TIÊN sẽ tự động phát
   ============================================================ */

window.PHONGHOC_SUBJECTS = [

  /* ════════════════════ MÔN VẬT LÝ ════════════════════ */
  {
    id: "ly",
    name: "Vật Lý",
    short: "Lý",
    icon: "fa-atom",
    tabColor: "#2563eb",
    cardColor: "#3b82f6",
    cards: [
      /* ── 📄 Card bài test tĩnh đã gỡ: đề giờ đọc từ database (test_sets), Phòng Học tự đổ card qua list_published_test_sets ── */
      /* ── ▶️ MẪU VIDEO (bỏ comment & điền khi cần) ──
      {
        id: "ly-video-1",
        title: "Tên khóa video",
        description: "Mô tả khóa video.",
        icon: "fa-play",
        status: "done",
        action: { type: "video", course: "id-khoa" }
      },
      */
    ]
  },

  /* ════════════════════ MÔN SINH HỌC ════════════════════ */
  {
    id: "sinh",
    name: "Sinh Học",
    short: "Sinh",
    icon: "fa-leaf",
    tabColor: "#16a34a",
    cardColor: "#16a34a",
    cards: [
      /* Card bài test tĩnh đã gỡ: đề đọc từ database (test_sets) */
    ]
  },

  /* ════════════════════ MÔN TIN HỌC ════════════════════ */
  {
    id: "tin",
    name: "Tin Học",
    short: "Tin",
    icon: "fa-laptop-code",
    tabColor: "#7c3aed",
    cardColor: "#7c3aed",
    cards: [
      /* Các card video MOS Word/Excel/PowerPoint đã chuyển sang Supabase
         (bảng video_cards) — xem supabase/bulk-videos.sql */
    ]
  },

  /* ════════════════════ MÔN LỊCH SỬ ════════════════════ */
  {
    id: "su",
    name: "Lịch Sử",
    short: "Sử",
    icon: "fa-landmark",
    tabColor: "#ea580c",
    cardColor: "#ea580c",
    cards: [
      /* Card bài test tĩnh đã gỡ: đề đọc từ database (test_sets) */
    ]
  },

  /* ════════════════════ MÔN HOÁ HỌC ════════════════════ */
  {
    id: "hoa",
    name: "Hoá Học",
    short: "Hoá",
    icon: "fa-flask",
    tabColor: "#dc2626",
    cardColor: "#dc2626",
    cards: [
      /* Card bài test tĩnh đã gỡ: đề đọc từ database (test_sets) */
    ]
  },

  /* ════════════════════ MÔN ANH VĂN ════════════════════ */
  {
    id: "anh",
    name: "Anh Văn",
    short: "Anh",
    icon: "fa-language",
    tabColor: "#db2777",
    cardColor: "#db2777",
    cards: [
      /* Card bài test tĩnh (đề demo ANH) đã gỡ: đề đọc từ database (test_sets) */
      /* Card video Tổng ôn ngữ pháp đã chuyển sang Supabase
         (bảng video_cards) — xem supabase/bulk-videos.sql */
    ]
  },

  /* ════════════════════ MÔN TOÁN HỌC ════════════════════ */
  {
    id: "toan",
    name: "Toán Học",
    short: "Toán",
    icon: "fa-square-root-variable",
    tabColor: "#06b6d4",
    cardColor: "#06b6d4",
    cards: [
      /* Card bài test tĩnh đã gỡ: đề đọc từ database (test_sets) */
      /* Cards video Tổng ôn Giải tích 1 & Toán ma trận đã chuyển sang
         Supabase (bảng video_cards) — xem supabase/bulk-videos.sql */
    ]
  },
];

/* ============================================================
   NỘI DUNG CÁC KHÓA VIDEO ĐÃ CHUYỂN SANG SUPABASE.
   Import hàng loạt vào bảng video_cards: xem supabase/bulk-videos.sql
   Graduate: "Tổng ôn ngữ pháp", "Giải tích 1", "Ma trận",
   MOS Word/Excel/PowerPoint — chạy script SQL là dữ liệu hiện lên.
   ============================================================ */
