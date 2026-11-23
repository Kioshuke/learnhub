/* Dark mode khởi tạo cho các trang KHÔNG có toggle riêng.
   Dùng chung body.dark-mode + localStorage.darkMode của LearnHub.
   Nhận thêm lệnh DARK_MODE từ trang cha (khi trang được nhúng trong iframe). */
(function () {
  "use strict";

  if (window.__lhDarkModeInitReady) return;
  window.__lhDarkModeInitReady = true;

  function stored() {
    try { return localStorage.getItem("darkMode") === "on"; }
    catch (e) { return false; }
  }

  function apply(on) {
    if (!document.body) return;
    document.body.classList.toggle("dark-mode", !!on);
    document.documentElement.style.colorScheme = on ? "dark" : "light";
  }

  // Chạy ngay sau thẻ <body> nên chưa có nội dung nào được vẽ → không giật trắng.
  apply(stored());

  // Đổi tab / đổi từ trang khác cùng origin
  window.addEventListener("storage", function (e) {
    if (e.key === "darkMode") apply(e.newValue === "on");
  });

  // Trang cha (index.html) bắn sang khi bật/tắt switch
  window.addEventListener("message", function (e) {
    if (e.data && e.data.type === "DARK_MODE") apply(e.data.value === true);
  });
})();
