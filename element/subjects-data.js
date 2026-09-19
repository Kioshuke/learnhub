/* ============================================================
   DỮ LIỆU MÔN HỌC + MÀU TOÀN CỤC (LearnHub)
   ------------------------------------------------------------
   ⭐ 1 NGUỒN DUY NHẤT cho danh sách môn học + màu sắc (8 môn:
   7 sắc cầu vồng + 1 màu riêng cho "Khác"). Mọi trang — Phòng
   Học, Lịch Học, Teacher, Admin — phải đọc màu/môn từ file này,
   KHÔNG khai báo màu ở từng file nữa.

   Cách dùng:
   - window.LH_SUBJECTS            : danh sách 8 môn (id, name, short, color, icon)
   - window.LH_SUBJECT_INFO(id)    : { short, color, icon, name } theo id môn
   - window.LH_SUBJECT_COLOR(id)   : màu của môn (hex)
   - window.LH_SUBJECT_BY_NAME(ten): thông tin môn theo TÊN (dữ liệu DB lưu tên)

   File này cũng TỰ SINH các rule CSS màu môn (tab môn, card thông
   báo, nút menu) nên không cần khai báo từng màu trong CSS nữa.
   Nhớ nạp file này bằng <script src> TRƯỚC khi dùng.
   ============================================================ */

(function () {
  "use strict";

  window.LH_SUBJECTS = [
    /* 7 sắc cầu vồng */
    { id: "hoa",  name: "Hoá Học",  short: "Hoá",  color: "#dc2626", icon: "fa-flask" },             /* 🔴 Đỏ    */
    { id: "su",   name: "Lịch Sử",  short: "Sử",   color: "#ea580c", icon: "fa-landmark" },           /* 🟠 Cam   */
    { id: "sinh", name: "Sinh Học", short: "Sinh", color: "#16a34a", icon: "fa-leaf" },               /* 🟢 Xanh lá */
    { id: "toan", name: "Toán Học", short: "Toán", color: "#06b6d4", icon: "fa-square-root-variable" },/* 🩵 Lơ     */
    { id: "ly",   name: "Vật Lý",   short: "Lý",   color: "#2563eb", icon: "fa-atom" },               /* 🔵 Xanh dương */
    { id: "tin",  name: "Tin Học",  short: "Tin",  color: "#7c3aed", icon: "fa-laptop-code" },        /* 🟣 Tím    */
    { id: "anh",  name: "Anh Văn",  short: "Anh",  color: "#db2777", icon: "fa-language" },           /* 🌸 Hồng   */
    /* Môn Khác — màu riêng, KHÔNG dùng xám */
    { id: "khac", name: "Khác",     short: "Khác", color: "#0d9488", icon: "fa-shapes" }              /* 🦚 Ngọc lam */
  ];

  var DEFAULT_COLOR = "#2563eb";

  function findById(id) {
    var list = window.LH_SUBJECTS || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  window.LH_SUBJECT_INFO = function (id) {
    return findById(id);
  };

  window.LH_SUBJECT_COLOR = function (id) {
    var s = findById(id);
    return s ? s.color : DEFAULT_COLOR;
  };

  window.LH_SUBJECT_BY_NAME = function (name) {
    var n = String(name == null ? "" : name).trim();
    var list = window.LH_SUBJECTS || [];
    for (var i = 0; i < list.length; i++) if (list[i].name === n) return list[i];
    return null;
  };

  /* ===== TỰ SINH CSS MÀU MÔN (để không file nào khai báo màu thủ công) ===== */
  function injectStyle() {
    var st = document.getElementById("lh-subject-colors");
    if (st) return;
    var rules = [];
    (window.LH_SUBJECTS || []).forEach(function (s) {
      rules.push('.subject-tab[data-subject="' + s.id + '"]{--tab:' + s.color + ';}');
      rules.push('.subject-tab[data-subject="' + s.id + '"].active{background:' + s.color + ';}');
      rules.push('#' + s.id + ' .subject-notice{--subject-color:' + s.color + ';}');
      rules.push('.menu button[data-subject="' + s.id + '"]{--btn-color:' + s.color + ';}');
    });
    st = document.createElement("style");
    st.id = "lh-subject-colors";
    st.textContent = rules.join("\n");
    (document.head || document.documentElement).appendChild(st);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectStyle);
  } else {
    injectStyle();
  }
})();