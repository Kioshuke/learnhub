/* ============================================================
   DỮ LIỆU PHÒNG HỌC  (element/phong-hoc.html)
   ------------------------------------------------------------
   ⭐ 8 MÔN HỌC + MÀU SẮC giờ đọc từ ELEMENT/subjects-data.js
      (window.LH_SUBJECTS) — KHÔNG khai báo màu ở đây nữa.
      Sửa môn/màu → sửa file subjects-data.js là đủ.
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
   - { label: "...", vimeo: "..." }  : video Vimeo
   - { label: "...", tiktok: "..." } : video TikTok
   - { label: "...", pending: true } : mục chưa có video ("Chưa có video")
   * Lưu ý: chỉ video YouTube được track tiến độ "đã xem" (tick xanh,
     xem >= 75% mới tính và lưu ID xuống database); Google Drive và PDF
     mở xem trực tiếp, không tính tick.

   ── KHÓA VIDEO - các trường ──
   - id     : phải khớp action.course của card
   - math   : true -> dùng style mục lục kiểu môn Toán (tuỳ chọn)
   - items  : danh sách mục lục, mục ĐẦU TIÊN sẽ tự động phát
   ============================================================ */

/* Dựng 8 môn từ nguồn global (subjects-data.js). Nếu thiếu file đó thì
   tự fallback ra danh sách cơ bản để trang không vỡ. */
(function () {
  var fallback = [
    { id: "ly",   name: "Vật Lý",   short: "Lý",   icon: "fa-atom",               color: "#2563eb" },
    { id: "sinh", name: "Sinh Học", short: "Sinh", icon: "fa-leaf",               color: "#16a34a" },
    { id: "tin",  name: "Tin Học",  short: "Tin",  icon: "fa-laptop-code",        color: "#7c3aed" },
    { id: "su",   name: "Lịch Sử",  short: "Sử",   icon: "fa-landmark",           color: "#ea580c" },
    { id: "hoa",  name: "Hoá Học",  short: "Hoá",  icon: "fa-flask",              color: "#dc2626" },
    { id: "anh",  name: "Anh Văn",  short: "Anh",  icon: "fa-language",           color: "#db2777" },
    { id: "toan", name: "Toán Học", short: "Toán", icon: "fa-square-root-variable", color: "#06b6d4" },
    { id: "khac", name: "Khác",     short: "Khác", icon: "fa-shapes",             color: "#0d9488" }
  ];

  var source = (window.LH_SUBJECTS && window.LH_SUBJECTS.length) ? window.LH_SUBJECTS : fallback;

  /* Nếu có card tĩnh bổ sung (mẫu video) thì khai báo ở đây theo môn */
  var EXTRA_CARDS = {};

  window.PHONGHOC_SUBJECTS = source.map(function (s) {
    return {
      id: s.id,
      name: s.name,
      short: s.short,
      icon: s.icon,
      tabColor: s.color,
      cardColor: s.color,
      /* Card tĩnh (nếu có EXTRA_CARDS) + các card test/video GV tự đổ từ database */
      cards: EXTRA_CARDS[s.id] || []
    };
  });
})();

/* ============================================================
   NỘI DUNG CÁC KHÓA VIDEO ĐÃ CHUYỂN SANG SUPABASE.
   Import hàng loạt vào bảng video_cards: xem supabase/bulk-videos.sql
   Graduate: "Tổng ôn ngữ pháp", "Giải tích 1", "Ma trận",
   MOS Word/Excel/PowerPoint — chạy script SQL là dữ liệu hiện lên.
   ============================================================ */