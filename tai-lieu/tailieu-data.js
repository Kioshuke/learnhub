/* ============================================================
   DỮ LIỆU THƯ VIỆN TÀI LIỆU  (tai-lieu/hub.html)
   ------------------------------------------------------------
   Cách thêm 1 tài liệu: thêm 1 object vào mảng TAI_LIEU_DATA.

   Các trường:
   - id          : định danh duy nhất (không trùng nhau)
   - name        : TÊN FILE hiển thị (dùng cho ô tìm kiếm)
   - description : Mô tả file
   - category    : Nhóm / môn học (dùng cho bộ lọc)
   - type        : NGUỒN NHÚNG FILE
       * "drive"   -> Link Google Drive (nhận cả 2 dạng:
                       https://drive.google.com/file/d/<ID>/view...
                       https://drive.google.com/open?id=<ID>)
       * "direct"  -> File trực tiếp (PDF, ảnh, video...) hoặc file
                       nằm trong repo (vd: "../cauhoi/ten-file.pdf")
       * "storage" -> Kho lưu trữ khác / URL bất kỳ
                       (OneDrive, Dropbox, S3, CDN...)
   - url         : Đường dẫn file (bắt buộc)
   - size        : (tùy chọn) kích thước file
   - date        : (tùy chọn) ngày đăng, dạng YYYY-MM-DD
   - author      : (tùy chọn) người đăng tài liệu
   ============================================================ */
window.TAI_LIEU_DATA = [
  {
    id: "toan-gioi-han-buoi-1",
    name: "Giới hạn hàm số - Nhập môn buổi 1 (Live - đã gộp)",
    description: "PDF bài giảng buổi 1 về giới hạn hàm số: định nghĩa, các định lý cơ bản và ví dụ minh họa chi tiết, được gộp từ buổi học live.",
    category: "Toán",
    type: "direct",
    url: "../cauhoi/Giới hạn hàm số - Nhập môn buổi 1 - Live-đã gộp.pdf",
    size: "3.0 MB",
    date: "2026-01-10",
    author: "Ban quản trị"
  },
  {
    id: "toan-cao-cap-ma-tran",
    name: "10 buổi toán cao cấp - Ma trận (Dãn Dòng)",
    description: "Chuỗi 10 buổi ôn tập toán cao cấp chuyên đề ma trận: khái niệm, phép toán, hạng ma trận và ứng dụng, kèm bài tập tự luyện.",
    category: "Toán",
    type: "direct",
    url: "../cauhoi/[Dãn Dòng] - 10 buổi toán cao cấp ma trận.pdf",
    size: "9.4 MB",
    date: "2026-02-02",
    author: "Dãn Dòng"
  },
  {
    id: "tong-on-ngu-phap",
    name: "Tổng ôn ngữ pháp (Toàn tập)",
    description: "Tài liệu tổng hợp toàn bộ ngữ pháp tiếng Anh trọng tâm dùng cho ôn thi, hệ thống hóa theo từng chuyên đề kèm bài tập áp dụng.",
    category: "Tiếng Anh",
    type: "direct",
    url: "../cauhoi/tongonav.pdf",
    size: "24.8 MB",
    date: "2026-01-20",
    author: "Ban quản trị"
  },
  {
    id: "vi-du-drive",
    name: "Ví dụ nhúng Google Drive (thay ID bằng file thật)",
    description: "File mẫu minh họa cách nhúng tài liệu từ Google Drive. Mở file tailieu-data.js và thay giá trị url bằng link Drive của bạn.",
    category: "Hướng dẫn",
    type: "drive",
    url: "https://drive.google.com/file/d/THAY_FILE_ID_O_DAY/view?usp=sharing",
    size: "—",
    date: "2026-01-01",
    author: "Admin"
  }
];
