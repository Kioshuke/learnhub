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
    notice: { icon: "fa-bell", html: "<strong>Thông báo môn Vật Lý:</strong> Đã thi xong" },
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
    notice: { icon: "fa-bell", html: "<strong>Thông báo môn Sinh Học:</strong> Chuẩn bị ôn tập" },
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
    notice: { icon: "fa-bell", html: "<strong>Thông báo môn Tin Học:</strong> Ôn tập chứng chỉ MOS. Lưu ý đây chỉ là khoá A1, để xem khoá A2 vui lòng liên hệ admin" },
    cards: [
      {
        id: "mos-word",
        title: "MOS Word",
        description: "Luyện tập kỹ năng Microsoft Word nâng cao theo từng buổi.",
        icon: "fa-file-word",
        iconBg: "#185abd",
        status: "done",
        action: { type: "video", course: "mos-word" }
      },
      {
        id: "mos-excel",
        title: "MOS Excel",
        description: "Luyện tập kỹ năng Microsoft Excel nâng cao theo từng buổi.",
        icon: "fa-file-excel",
        iconBg: "#107c41",
        status: "done",
        action: { type: "video", course: "mos-excel" }
      },
      {
        id: "mos-powerpoint",
        title: "MOS PowerPoint",
        description: "Luyện tập kỹ năng Microsoft PowerPoint nâng cao theo từng buổi.",
        icon: "fa-file-powerpoint",
        iconBg: "#c43e1c",
        status: "done",
        action: { type: "video", course: "mos-powerpoint" }
      },
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
    notice: { icon: "fa-bell", html: "<strong>Thông báo môn Lịch Sử:</strong> Chủ đề 8 &amp; 9" },
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
    notice: { icon: "fa-fire", html: "<strong>Thông báo môn Hoá Học:</strong> CHỐT ĐÁP ÁN 👊" },
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
    notice: { icon: "fa-bell", html: "<strong>Thông báo môn Anh Văn:</strong> Tổng ôn ngữ pháp" },
    cards: [
      {
        id: "anh-phan-1",
        title: "ĐỀ ĐÁNH GIÁ NĂNG LỰC ĐẦU VÀO 1",
        description: "Tiếng Anh · Đọc hiểu – Viết – Sử dụng ngôn ngữ",
        icon: "fa-language",
        status: "done",
        action: { type: "quiz", url: "../cauhoi/questionenglish.html?de=english.json" }
      },
      {
        id: "anh-dauvao-2",
        title: "ĐỀ ĐÁNH GIÁ NĂNG LỰC ĐẦU VÀO 2",
        description: "Tiếng Anh · Đọc hiểu – Viết – Sử dụng ngôn ngữ",
        icon: "fa-language",
        status: "done",
        action: { type: "quiz", url: "../cauhoi/questionenglish.html?de=dauvao2.json" }
      },
      {
        id: "anh-dauvao-3",
        title: "ĐỀ ĐÁNH GIÁ NĂNG LỰC ĐẦU VÀO 3",
        description: "Tiếng Anh · Đọc hiểu – Viết – Sử dụng ngôn ngữ",
        icon: "fa-language",
        status: "done",
        action: { type: "quiz", url: "../cauhoi/questionenglish.html?de=dauvao3.json" }
      },
      {
        id: "anh-ontap-phan1",
        title: "ÔN TẬP PHẦN 1",
        description: "Word Choice – Word Form – Collocation – Phrasal Verb",
        icon: "fa-language",
        status: "done",
        action: { type: "quiz", url: "../cauhoi/questionenglish.html?de=anh-van-ontap.json" }
      },
      {
        id: "anh-ontap-phan2",
        title: "ÔN TẬP PHẦN 2",
        description: "Tenses – Conditional – Inversion – Reduced Relative Clauses",
        icon: "fa-language",
        status: "done",
        action: { type: "quiz", url: "../cauhoi/questionenglish.html?de=anh-van-ontap2.json" }
      },
      {
        id: "anh-ontap-phan3",
        title: "ÔN TẬP PHẦN 3",
        description: "Sentence Construction – Communication",
        icon: "fa-language",
        status: "done",
        action: { type: "quiz", url: "../cauhoi/questionenglish.html?de=anh-van-ontap3.json" }
      },
      {
        id: "anh-ontap-phan4",
        title: "ÔN TẬP PHẦN 4",
        description: "Sentence Building – Sentence Ordering",
        icon: "fa-language",
        status: "done",
        action: { type: "quiz", url: "../cauhoi/questionenglish.html?de=anh-van-ontap4.json" }
      },
      {
        id: "anh-ngu-phap",
        title: "TỔNG ÔN NGỮ PHÁP",
        description: "Video tổng ôn ngữ pháp tiếng Anh.",
        icon: "fa-play",
        status: "done",
        action: { type: "video", course: "ngu-phap" }
      },
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
    notice: { icon: "fa-bell", html: "<strong>Thông báo môn Toán Học:</strong> Chuẩn bị ôn tập" },
    cards: [
      {
        id: "toan-trac-nghiem",
        title: "Trắc nghiệm",
        description: "Bài ôn tập trắc nghiệm môn Toán Học.",
        icon: "fa-square-root-variable",
        status: "pending",
        action: { type: "quiz", url: "../cauhoi/filetest.html?de=toanhoc.json" }
      },
      {
        id: "toan-giai-tich-1",
        title: "TỔNG ÔN GIẢI TÍCH 1",
        description: "Video tổng ôn Giải tích 1.",
        icon: "fa-play",
        status: "done",
        action: { type: "video", course: "giai-tich-1" }
      },
      {
        id: "toan-ma-tran",
        title: "TOÁN MA TRẬN",
        description: "Tổng hợp 5 buổi toán cao cấp: Ma trận, Định thức, Nghịch đảo, Hạng, Lũy thừa bậc cao.",
        icon: "fa-th",
        status: "done",
        action: { type: "video", course: "ma-tran" }
      },
    ]
  },
];

/* ============================================================
   NỘI DUNG MỤC LỤC TỪNG KHÓA VIDEO
   Thêm video YouTube : copy dòng  { label, video: "..." }
   Thêm video Drive   : copy dòng  { label, drive: "link-drive" }
   Thêm PDF           : copy dòng  { label, pdf: "đường-dẫn" }
   ============================================================ */
window.VIDEO_COURSES = [

  /* ── ANH VĂN · Tổng ôn ngữ pháp ── */
  {
    id: "ngu-phap",
    items: [
      { label: "So sánh", video: "H8Fcn9XpDic" },
      { label: "Thì của động từ", video: "RQb4H9iBup0" },
      { label: "Câu bị động", video: "K8743i3Lx6E" },
      { label: "Mệnh đề quan hệ", video: "xmL6XgE2xE0" },
      { label: "Động từ khuyết thiếu", video: "dh06Qd5uPRI" },
      { label: "Từ loại", video: "_Ce2kBuivNA" },
      { label: "Câu điều kiện", video: "G7TBLDeFIuM" },
      { label: "Liên từ", video: "3Q6MtuYtc00" },
      { label: "Lượng từ", video: "fW3j-JhEHzE" },
      { label: "Word Form", video: "BtXJGT_6efk" },
      { label: "Câu tường thuật", video: "XwvUbIkt1ZQ" },
      { label: "Mạo từ", video: "Q8kKYTVKa4c" },
      { label: "Sự phối thì", video: "r1lvjKxSyTk" },
      { label: "Word Order", video: "5IHP4GYrDpw" },
      /* ── ▶️ MẪU THÊM VIDEO GOOGLE DRIVE (bỏ comment & thay ID) ──
      { label: "Video Drive mẫu", drive: "https://drive.google.com/file/d/THAY_ID_DRIVE/view" },
      */
      { label: "Tài liệu tổng ôn", pdf: "../cauhoi/tongonav.pdf" },
    ]
  },

  /* ── TOÁN · Tổng ôn Giải tích 1 ── */
  {
    id: "giai-tich-1",
    math: true,
    items: [
      { label: "B1: Giới hạn hàm số", video: "2H-XDZ3lB6g" },
      { label: "B2: Giới hạn hàm số (tiếp)", video: "_cljZgXg2WM" },
      { label: "Luyện tập giới hạn hàm số", video: "ZRYN2Bhi6p4" },
      { label: "B3: Một số dạng hàm số quan trọng", video: "uxFFDiWAOYQ" },
      { label: "B4: Đại lượng vô cùng bé - vô cùng lớn", video: "ZfaqXVhJEh4" },
      { label: "B5: Các tiêu chuẩn tồn tại giới hạn dãy số", video: "RUbMStw8tJs" },
      { label: "B6: Dãy số theo kiểu quy nạp", video: "w7ME28JrHuA" },
      { label: "B7: Dãy số - Giới hạn dãy số", video: "n6VxD511CLM" },
      { label: "Luyện tập dãy số", video: "z9IXS93zAjg" },
      { label: "B8: Mệnh đề và các phép toán mệnh đề", pending: true },
      { label: "B9: PP L'Hospital - giới hạn hàm số mũ", video: "VuFcNmS4myw" },
      { label: "Tài liệu giải tích 1", pdf: "../cauhoi/Giới hạn hàm số - Nhập môn buổi 1 - Live-đã gộp.pdf" },
    ]
  },

  /* ── TOÁN · Ma trận ── */
  {
    id: "ma-tran",
    math: true,
    items: [
      { label: "B1: Ma trận - Các phép toán", video: "WqmuR6hhzIo" },
      { label: "B2: Định thức ma trận", video: "vLS9UWTIE6U" },
      { label: "B3: Ma trận nghịch đảo", video: "ti61DhllUnE" },
      { label: "B4: Hạng ma trận", video: "KMSsoeCds7E" },
      { label: "B5: Nâng cao - Lũy thừa bậc cao ma trận", video: "gwJaJ_5AU0Q" },
      { label: "Tài liệu", pdf: "../cauhoi/[Dãn Dòng] - 10 buổi toán cao cấp ma trận.pdf" },
    ]
  },

  /* ── TIN · MOS Word ── */
  {
    id: "mos-word",
    items: [
      { label: "Buổi 1", drive: "https://drive.google.com/file/d/1T2l-jfuQKz7LHPy0Ook46pW6bwRT4jSA/view?usp=drive_link" },
      { label: "Buổi 2", drive: "https://drive.google.com/file/d/1J6arqsJju23wZlmPwbW77EE9ZPGaMv4U/view?usp=drive_link" },
      { label: "Buổi 3", drive: "https://drive.google.com/file/d/1egQYJ3OI0JFsvXm2uSue-GB0aGMP4ZCi/view?usp=drive_link" },
      { label: "Buổi 4", drive: "https://drive.google.com/file/d/14wBvhKC92W05e25R_uaiA2xniGyhldSX/view?usp=drive_link" },
      { label: "Buổi 5", drive: "https://drive.google.com/file/d/1ubgj-7nUstTh0jNQNKXMtX6XZJBLLUjn/view?usp=drive_link" },
      { label: "Tài liệu Word", drive: "https://drive.google.com/drive/folders/181rUF1_PNQrpqiTJt4mDAWU8HuZgy_Sp?usp=sharing" },
    ]
  },

  /* ── TIN · MOS Excel ── */
  {
    id: "mos-excel",
    items: [
      { label: "Buổi 1", drive: "https://drive.google.com/file/d/1ngkgtRbhW74BO0B9daBqVkh2RK5ZtW8q/view?usp=sharing" },
      { label: "Buổi 2", drive: "https://drive.google.com/file/d/1nuxuwBQuKt19uuVbW_bcxgJtd7DDRTW6/view?usp=drive_link" },
      { label: "Buổi 3", drive: "https://drive.google.com/file/d/1UUeRuiqk-GmvKmNyAGcdLAcJL7XwKAFp/view?usp=drive_link" },
      { label: "Buổi 4", drive: "https://drive.google.com/file/d/1_fujRFfhBWuqUg_JmZtxJ9O56GD4svIZ/view?usp=drive_link" },
      { label: "Buổi 5", drive: "https://drive.google.com/file/d/1cJtzhxxSu6BDzL7rSWRRbrPzehtoGcTt/view?usp=drive_link" },
      { label: "Buổi 6", drive: "https://drive.google.com/file/d/1Y9YEQ7oNdUERDKn0KThta-jMEIkbHli8/view?usp=drive_link" },
      { label: "Buổi 7", drive: "https://drive.google.com/file/d/1D-rPXB1vFiLvu97qvPn5ExmMwhXueZ4j/view?usp=drive_link" },
      { label: "Buổi 8", drive: "https://drive.google.com/file/d/1Ts4tMbg2rnXF5KnlfaIRgLyP4W_XsDMo/view?usp=drive_link" },
      { label: "Tài liệu Excel", drive: "https://drive.google.com/drive/folders/1cvIG5_0JvvHEwt6pFTgJC9LHTH6vebXB?usp=drive_link" },
    ]
  },

  /* ── TIN · MOS PowerPoint ── */
  {
    id: "mos-powerpoint",
    items: [
      { label: "Buổi 1", drive: "https://drive.google.com/file/d/1SjowPuXIqOCg4pwac4aqmULNes4G7iML/view?usp=drive_link" },
      { label: "Buổi 2", drive: "https://drive.google.com/file/d/1rN-t0Hsw8Eh9OogYszs6rpsnLTqvQPbi/view?usp=drive_link" },
      { label: "Buổi 3", drive: "https://drive.google.com/file/d/1c1TtlBRsXHphB8oWnvzyKqWr5Twux6Sa/view?usp=drive_link" },
      { label: "Buổi 4", drive: "https://drive.google.com/file/d/17vXpQfbnRbyOJqvQwTfY3h0B9qZkkLc6/view?usp=drive_link" },
      { label: "Buổi 5", drive: "https://drive.google.com/file/d/1Ks2xqFIvruXRmYp2KhKoB6AwBzgSGxVa/view?usp=drive_link" },
      { label: "Tài liệu PowerPoint", drive: "https://drive.google.com/drive/folders/1_vgYUYyKpk-kLfoSEQcPFz7ukpI50sRd?usp=sharing" },
    ]
  },
];
