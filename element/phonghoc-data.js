/* ============================================================
   DỮ LIỆU PHÒNG HỌC  (element/phong-hoc.html)
   ------------------------------------------------------------
   ⭐ Muốn THÊM BÀI TEST  → copy 1 object "MẪU FILE TEST" trong cards[]
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
      /* ── 📄 MẪU FILE TEST (copy & sửa khi thêm bài mới) ── */
      {
        id: "ly-trac-nghiem",
        title: "Trắc nghiệm",
        description: "Bài ôn tập trắc nghiệm môn Vật Lý.",
        icon: "fa-pen-fancy",
        status: "done",
        action: { type: "quiz", url: "../cauhoi/filetest.html?de=vatli.json" }
      },
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
      {
        id: "sinh-trac-nghiem",
        title: "Trắc nghiệm",
        description: "Bài ôn tập trắc nghiệm môn Sinh Học.",
        icon: "fa-dna",
        status: "done",
        action: { type: "quiz", url: "../cauhoi/filetest.html?de=sinhhoc.json" }
      },
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
      /* ── CARD DEMO chưa hoàn thành — xóa khi dùng thật ── */
      {
        id: "demo-card-pending",
        title: "Card Demo",
        description: "Mô tả ngắn nội dung card. Badge vàng 'Chưa hoàn thành' + nút xám không bấm được.",
        icon: "fa-flask",
        iconBg: "#64748b",
        status: "pending",
        disabled: true
      },
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
      {
        id: "su-trac-nghiem",
        title: "Trắc nghiệm",
        description: "Chủ đề 8. LỊCH SỬ ĐỐI NGOẠI CỦA VIỆT NAM THỜI CẬN – HIỆN ĐẠI",
        icon: "fa-scroll",
        status: "done",
        action: { type: "quiz", url: "../cauhoi/filetest.html?de=questions.json" }
      },
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
      {
        id: "hoa-trac-nghiem-p1",
        title: "Trắc nghiệm P1",
        description: "Bài ôn tập trắc nghiệm môn Hoá Học.",
        icon: "fa-flask",
        status: "done",
        action: { type: "quiz", url: "../cauhoi/filetest.html?de=hoahoc.json" }
      },
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
      {
        id: "anh-demo",
        title: "ĐỀ THI MẪU DEMO",
        description: "Bản demo 3 câu hỏi lấy từ file json mẫu tiếng Anh.",
        icon: "fa-language",
        status: "done",
        action: { type: "quiz", url: "../cauhoi/questionenglish.html?de=anh-demo.json" }
      },
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
      {
        id: "toan-trac-nghiem",
        title: "Trắc nghiệm",
        description: "Bài ôn tập trắc nghiệm môn Toán Học.",
        icon: "fa-square-root-variable",
        status: "pending",
        action: { type: "quiz", url: "../cauhoi/filetest.html?de=toanhoc.json" }
      },
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
