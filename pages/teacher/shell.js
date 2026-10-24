/*
  shell.js — Thanh bên trái (sidebar) + thanh đầu (topbar) dùng chung
  cho toàn bộ khu vực Giáo viên.

  Cách dùng (mọi trang con):
    <div id="tcApp" class="teacher-app" style="display:none">
      <div class="teacher-canvas">
        <div class="tc-wrap">
          ... nội dung trang ...
        </div>
      </div>
    </div>
    <script src="shell.js"></script>   <!-- đặt SAU markup trên -->
    <script type="module"> ... logic trang ... </script>

  File này sẽ tự chèn aside.teacher-rail + div.tc-topbar kèm toàn bộ CSS
  của 2 phần đó. Khi trang con muốn được báo khi bấm menu, gán:
    window.onTeacherNav = function(key){ ... };
  key nhận: home | manage | fc | video | schedule | quiz | report.
  Người dùng cũng có thể gọi TeacherShell.setActive(key) sau khi đổi view.
*/
(function () {
  "use strict";

  var SCRIPT = (document.currentScript && document.currentScript.src) || "";
  var BASE = "";
  /* BASE là thư mục chứa file này: .../LearnHub/teacher/ */
  if (SCRIPT) {
    try { BASE = new URL(".", SCRIPT).href; } catch (e) {}
  }

  function toUrl(path) {
    if (BASE) {
      try { return new URL(path, BASE).href; } catch (e) {}
    }
    return path;
  }

  /* gốc LearnHub (1 cấp lên từ teacher/) */
  var ROOT = toUrl("..");
  var PICTURES = toUrl("../../assets/images/");
  var HOME_URL = toUrl("../../index.html");

  /* ===== DANH SÁCH MENU =====
     group: "main" = nhóm điều hướng chính, "sec" = nhóm phụ (sau đường phân cách) */
  var NAV = [
    { key: "home",    icon: "fa-table-cells-large",    label: "Tổng quan",             group: "main" },
    { key: "manage",  icon: "fa-chalkboard-user",      label: "Lớp học",               group: "main" },
    { key: "fc",      icon: "fa-layer-group",          label: "Flashcard",             group: "main" },
    { key: "video",   icon: "fa-door-open",            label: "Quản lý Phòng học",     group: "main" },
    { key: "docs",    icon: "fa-book-open",            label: "Quản lý Tài liệu",      group: "main" },
    { key: "quiz",    icon: "fa-file-circle-check",    label: "Bài kiểm tra",          group: "main" },
    { key: "schedule", icon: "fa-calendar-days",       label: "Lịch học & thi",        group: "sec" },
    { key: "notice",   icon: "fa-bell",                label: "Thông báo môn học",     group: "sec" },
    { key: "report",  icon: "fa-chart-line",           label: "Báo cáo",    soon: true, group: "sec" }
  ];

  /* ===== CSS CỦA SIDEBAR + TOPBAR ===== */
  var SHELL_CSS = [
    "",
    "#tcApp.teacher-app {",
    "  display: grid !important;",
    "  grid-template-columns: 256px minmax(0, 1fr);",
    "  min-height: 100vh;",
    "  background: #f8fafc;",
    "  transition: grid-template-columns 0.25s ease;",
    "}",
    "#tcApp.teacher-app[style*=\"display:none\"] { display: none !important; }",
    "",
    ".teacher-rail {",
    "  position: sticky;",
    "  top: 0;",
    "  height: 100vh;",
    "  display: flex;",
    "  flex-direction: column;",
    "  background: #fff;",
    "  border-right: 1px solid #e5e7eb;",
    "  padding: 24px 16px;",
    "  overflow-y: auto;",
    "  scrollbar-width: none;",
    "  -ms-overflow-style: none;",
    "  z-index: 40;",
    "  transition: padding 0.25s ease;",
    "}",
    ".teacher-rail::-webkit-scrollbar { display: none; width: 0; height: 0; }",
    ".teacher-identity {",
    "  display: flex;",
    "  align-items: center;",
    "  gap: 12px;",
    "  padding: 0 8px 24px;",
    "  border-bottom: 1px solid #f1f5f9;",
    "  margin-bottom: 8px;",
    "  transition: padding 0.25s ease, gap 0.25s ease;",
    "}",
    ".teacher-identity img {",
    "  width: 40px;",
    "  height: 40px;",
    "  border-radius: 11px;",
    "  object-fit: cover;",
    "  background: #f1f5f9;",
    "}",
    ".teacher-identity strong {",
    "  display: block;",
    "  font-size: 15px;",
    "  font-weight: 700;",
    "  color: #111827;",
    "  line-height: 1.2;",
    "}",
    ".teacher-identity span {",
    "  display: block;",
    "  font-size: 11px;",
    "  color: #9ca3af;",
    "  font-weight: 500;",
    "  margin-top: 1px;",
    "}",
    ".teacher-identity-text { flex: 1; min-width: 0; }",
    "",
    /* --- 2. Nút thu gọn / mở rộng thanh bên --- */
    ".rail-toggle {",
    "  flex-shrink: 0;",
    "  width: 30px;",
    "  height: 30px;",
    "  display: grid;",
    "  place-items: center;",
    "  border: 1px solid #e5e7eb;",
    "  border-radius: 9px;",
    "  background: #fff;",
    "  color: #64748b;",
    "  cursor: pointer;",
    "  transition: background 0.15s, color 0.15s, border-color 0.15s;",
    "}",
    ".rail-toggle:hover { background: #f1f5f9; color: #111827; border-color: #d1d5db; }",
    ".rail-toggle i { font-size: 11px; transition: transform 0.22s ease; }",
    "",
    ".sidebar-search {",
    "  position: relative;",
    "  margin: 8px 0 20px;",
    "}",
    ".sidebar-search input {",
    "  width: 100%;",
    "  padding: 10px 14px 10px 38px;",
    "  border: 1px solid #e5e7eb;",
    "  border-radius: 12px;",
    "  font-size: 13px;",
    "  font-family: inherit;",
    "  background: #f9fafb;",
    "  color: #111827;",
    "  outline: none;",
    "  transition: border-color 0.15s, box-shadow 0.15s;",
    "}",
    ".sidebar-search input::placeholder { color: #9ca3af; }",
    ".sidebar-search input:focus {",
    "  border-color: #3b82f6;",
    "  box-shadow: 0 0 0 3px rgba(59,130,246,0.1);",
    "  background: #fff;",
    "}",
    ".sidebar-search i {",
    "  position: absolute;",
    "  left: 13px;",
    "  top: 50%;",
    "  transform: translateY(-50%);",
    "  color: #9ca3af;",
    "  font-size: 13px;",
    "  pointer-events: none;",
    "}",
    "",
    ".teacher-nav {",
    "  display: flex;",
    "  flex-direction: column;",
    "  gap: 2px;",
    "  flex: 1;",
    "}",
    ".teacher-nav-label {",
    "  padding: 0 12px 8px;",
    "  font-size: 10px;",
    "  font-weight: 700;",
    "  letter-spacing: 0.08em;",
    "  text-transform: uppercase;",
    "  color: #9ca3af;",
    "}",
    ".teacher-nav button {",
    "  display: flex;",
    "  align-items: center;",
    "  gap: 12px;",
    "  width: 100%;",
    "  padding: 11px 14px;",
    "  border: none;",
    "  border-radius: 12px;",
    "  background: transparent;",
    "  color: #64748b;",
    "  font: 500 13.5px/1 'Inter', sans-serif;",
    "  text-align: left;",
    "  cursor: pointer;",
    "  transition: background 0.15s, color 0.15s, width 0.25s ease, height 0.25s ease, padding 0.25s ease, gap 0.25s ease;",
    "}",
    ".teacher-nav button i {",
    "  width: 18px;",
    "  text-align: center;",
    "  font-size: 14px;",
    "  flex-shrink: 0;",
    "}",
    ".teacher-nav button:hover {",
    "  background: #f1f5f9;",
    "  color: #111827;",
    "}",
    ".teacher-nav button.active {",
    "  background: #eef2ff;",
    "  color: #4f46e5;",
    "  font-weight: 600;",
    "}",
    ".teacher-nav button.active[data-nav=\"manage\"] { background: #dbeafe; color: #1d4ed8; }",
    ".teacher-nav button.active[data-nav=\"fc\"] { background: #dcfce7; color: #15803d; }",
    ".teacher-nav button.active[data-nav=\"video\"] { background: #cffafe; color: #0e7490; }",
    ".teacher-nav button.active[data-nav=\"docs\"] { background: #ffedd5; color: #c2410c; }",
    ".teacher-nav button.active[data-nav=\"schedule\"] { background: #ffe4e6; color: #be123c; }",
    ".teacher-nav button.active[data-nav=\"notice\"] { background: #fef3c7; color: #b45309; }",
    ".teacher-nav button.active[data-nav=\"quiz\"] { background: #ede9fe; color: #6d28d9; }",
    ".teacher-nav button.active[data-nav=\"report\"] { background: #f1f5f9; color: #475569; }",
    "",
    /* --- 7. Đường phân cách giữa nhóm chính và nhóm phụ --- */
    ".teacher-nav-divider {",
    "  height: 1px;",
    "  background: #eef1f6;",
    "  margin: 10px 12px;",
    "}",
    "",
    /* --- 8. Workspace settings (ghim đáy thanh bên) --- */
    ".teacher-rail-foot {",
    "  margin-top: auto;",
    "  padding: 14px 0 0;",
    "  border-top: 1px solid #eef1f6;",
    "}",
    ".rail-foot-item {",
    "  display: flex;",
    "  align-items: center;",
    "  gap: 12px;",
    "  width: 100%;",
    "  padding: 11px 14px;",
    "  border-radius: 12px;",
    "  color: #64748b;",
    "  font-size: 13px;",
    "  font-weight: 600;",
    "  transition: width 0.25s ease, height 0.25s ease, padding 0.25s ease, gap 0.25s ease;",
    "}",
    ".rail-foot-item i {",
    "  width: 18px;",
    "  text-align: center;",
    "  font-size: 14px;",
    "  flex-shrink: 0;",
    "}",
    ".rail-foot-item em {",
    "  display: block;",
    "  font-style: normal;",
    "  font-size: 11px;",
    "  font-weight: 500;",
    "  color: #9ca3af;",
    "}",
    "",
    /* --- Chuyển động mượt cho chữ khi thu gọn / mở rộng --- */
    ".teacher-identity img,",
    ".teacher-identity-text,",
    ".teacher-nav button span,",
    ".rail-foot-item span {",
    "  overflow: hidden;",
    "  white-space: nowrap;",
    "  opacity: 1;",
    "  max-width: 260px;",
    "  transition: opacity 0.18s ease, max-width 0.25s ease;",
    "}",
    ".teacher-nav-label { overflow: hidden; opacity: 1; max-height: 40px; transition: opacity 0.15s ease, max-height 0.25s ease, padding 0.25s ease; }",
    ".teacher-nav-divider { overflow: hidden; opacity: 1; max-height: 20px; transition: opacity 0.15s ease, max-height 0.25s ease, margin 0.25s ease; }",
    ".sidebar-search { overflow: hidden; opacity: 1; max-height: 80px; transition: opacity 0.18s ease, max-height 0.25s ease, margin 0.25s ease; }",
    "",
    /* --- Trạng thái thu gọn (icon-only) --- */
    "#tcApp.teacher-app.rail-collapsed { grid-template-columns: 72px minmax(0, 1fr); }",
    ".teacher-rail.collapsed { padding: 20px 12px; }",
    ".teacher-rail.collapsed .teacher-identity { padding: 0 0 16px; justify-content: center; gap: 0; }",
    ".teacher-rail.collapsed .teacher-identity img,",
    ".teacher-rail.collapsed .teacher-identity-text,",
    ".teacher-rail.collapsed .teacher-nav button span,",
    ".teacher-rail.collapsed .rail-foot-item span { opacity: 0; max-width: 0; }",
    ".teacher-rail.collapsed .sidebar-search { opacity: 0; max-height: 0; margin-top: 0; margin-bottom: 0; }",
    ".teacher-rail.collapsed .teacher-nav-label { opacity: 0; max-height: 0; padding-top: 0; padding-bottom: 0; }",
    ".teacher-rail.collapsed .teacher-nav-divider { opacity: 0; max-height: 0; margin-top: 0; margin-bottom: 0; }",
    ".teacher-rail.collapsed .teacher-nav { align-items: center; }",
    ".teacher-rail.collapsed .teacher-nav button { width: 44px; height: 44px; padding: 0; justify-content: center; gap: 0; }",
    ".teacher-rail.collapsed .teacher-rail-foot { display: flex; justify-content: center; padding: 14px 0 0; }",
    ".teacher-rail.collapsed .rail-foot-item { width: 44px; height: 44px; padding: 0; justify-content: center; gap: 0; }",
    ".teacher-rail.collapsed .rail-toggle i { transform: rotate(180deg); }",
    "",
    ".teacher-canvas {",
    "  min-width: 0;",
    "  display: flex;",
    "  flex-direction: column;",
    "}",
    "",
    ".teacher-app .tc-topbar {",
    "  display: flex;",
    "  align-items: center;",
    "  gap: 16px;",
    "  min-height: 68px;",
    "  padding: 0 36px;",
    "  background: #fff;",
    "  border-bottom: 1px solid #e5e7eb;",
    "  position: sticky;",
    "  top: 0;",
    "  z-index: 30;",
    "}",
    ".teacher-app .tc-topbar .tc-brand { display: none; }",
    ".teacher-app .tc-topbar .tc-spacer { margin-left: auto; }",
    ".tc-topbar-user {",
    "  display: flex;",
    "  align-items: center;",
    "  gap: 10px;",
    "  margin-left: auto;",
    "}",
    ".tc-topbar-avatar {",
    "  width: 36px;",
    "  height: 36px;",
    "  border-radius: 50%;",
    "  background: linear-gradient(135deg, #3b82f6, #2563eb);",
    "  color: #fff;",
    "  display: grid;",
    "  place-items: center;",
    "  font-weight: 700;",
    "  font-size: 14px;",
    "  flex-shrink: 0;",
    "}",
    ".tc-topbar-avatar-img {",
    "  width: 38px;",
    "  height: 38px;",
    "  border-radius: 50%;",
    "  object-fit: cover;",
    "  flex-shrink: 0;",
    "  border: 2px solid #fff;",
    "  box-shadow: 0 1px 3px rgba(0,0,0,0.12);",
    "}",
    ".tc-topbar-name {",
    "  font-size: 13px;",
    "  font-weight: 600;",
    "  color: #111827;",
    "}",
    ".tc-badge {",
    "  display: inline-flex;",
    "  align-items: center;",
    "  gap: 6px;",
    "  background: #f1f5f9;",
    "  color: #475569;",
    "  border: 1px solid #e5e7eb;",
    "  border-radius: 10px;",
    "  padding: 7px 14px;",
    "  font-size: 12px;",
    "  font-weight: 600;",
    "}",
    ".tc-badge i { font-size: 11px; }",
    "a.btn-home {",
    "  display: inline-flex;",
    "  align-items: center;",
    "  gap: 7px;",
    "  background: #f1f5f9;",
    "  color: #475569;",
    "  border: 1px solid #e5e7eb;",
    "  border-radius: 10px;",
    "  padding: 9px 16px;",
    "  text-decoration: none;",
    "  font-weight: 600;",
    "  font-size: 12.5px;",
    "  transition: background 0.15s, border-color 0.15s;",
    "}",
    "a.btn-home:hover {",
    "  background: #e5e7eb;",
    "  border-color: #d1d5db;",
    "}",
    "",
    "@media (max-width: 1024px) {",
    "  #tcApp.teacher-app {",
    "    grid-template-columns: 72px minmax(0, 1fr);",
    "  }",
    "  .teacher-identity img,",
    "  .teacher-identity-text,",
    "  .teacher-nav button span,",
    "  .rail-foot-item span { opacity: 0; max-width: 0; }",
    "  .sidebar-search { opacity: 0; max-height: 0; margin-top: 0; margin-bottom: 0; }",
    "  .teacher-nav-label { opacity: 0; max-height: 0; padding-top: 0; padding-bottom: 0; }",
    "  .teacher-nav-divider { opacity: 0; max-height: 0; margin-top: 0; margin-bottom: 0; }",
    "  .rail-toggle { display: none; }",
    "  .teacher-rail {",
    "    padding: 20px 12px;",
    "    align-items: center;",
    "  }",
    "  .teacher-identity {",
    "    padding: 0 0 20px;",
    "    justify-content: center;",
    "    gap: 0;",
    "  }",
    "  .teacher-nav button {",
    "    width: 44px;",
    "    height: 44px;",
    "    padding: 0;",
    "    justify-content: center;",
    "    gap: 0;",
    "  }",
    "  .teacher-rail-foot { display: flex; justify-content: center; }",
    "  .rail-foot-item { width: 44px; height: 44px; padding: 0; justify-content: center; gap: 0; }",
    "}",
    "@media (max-width: 720px) {",
    "  #tcApp.teacher-app { display: block !important; }",
    "  .teacher-rail { display: none !important; }",
    "  .teacher-app .tc-topbar { padding: 0 18px; min-height: 60px; }",
    "}"
  ].join("\n");

  function noop() {}

  function callGlobal(fn) {
    if (fn && typeof window[fn] === "function") return window[fn]();
    return undefined;
  }

  function navItemsHtml(group) {
    return NAV.filter(function (n) { return n.group === group; }).map(function (n) {
      var attrs = ' type="button" data-nav="' + n.key + '"' +
        (n.soon ? ' title="Sắp ra mắt"' : "");
      return '<button' + attrs + '><i class="fa-solid ' + n.icon + '"></i><span>' +
        n.label + "</span></button>";
    }).join("");
  }

  /* Thứ tự thanh bên:
     brand logo > thu gọn/mở rộng > nhóm điều hướng chính > nhóm phụ > phân cách > cài đặt không gian làm việc */
  function railHtml() {
    return [
      '<div class="teacher-identity">',
      '  <img src="' + PICTURES + 'logoweb.webp" alt="LearnHub">',
      '  <div class="teacher-identity-text"><strong>LearnHub</strong><span>Giáo viên</span></div>',
      '  <button type="button" class="rail-toggle" id="railToggle" aria-label="Thu gọn thanh bên" title="Thu gọn / mở rộng">',
      '    <i class="fa-solid fa-angles-left"></i>',
      "  </button>",
      "</div>",
      '<div class="sidebar-search">',
      '  <i class="fa-solid fa-magnifying-glass"></i>',
      '  <input type="text" placeholder="Tìm kiếm...">',
      "</div>",
      '<nav class="teacher-nav">',
      '  <div class="teacher-nav-label">Không gian làm việc</div>',
      navItemsHtml("main"),
      '  <div class="teacher-nav-divider"></div>',
      '  <div class="teacher-nav-label">Khác</div>',
      navItemsHtml("sec"),
      "</nav>",
      '<div class="teacher-rail-foot">',
      '  <div class="rail-foot-item"><i class="fa-solid fa-gear"></i><span>Cài đặt không gian làm việc<em>Giáo viên LearnHub</em></span></div>',
      "</div>"
    ].join("");
  }

  function topbarHtml() {
    return [
      '<div class="tc-brand">',
      '  <img class="tc-logo" src="' + PICTURES + 'logoweb.webp" alt="LearnHub">',
      '  <div class="tc-title"><h1>Khu vực Giáo viên</h1><div class="tc-sub">LearnHub · Quản lý lớp học &amp; nội dung giảng dạy</div></div>',
      "</div>",
      '<div class="tc-spacer"></div>',
      '<span id="tcUserBadge"></span>',
      '<a class="btn-home" href="' + HOME_URL + '"><i class="fa-solid fa-arrow-left"></i> Về trang chính</a>'
    ].join("");
  }

  function setActive(key) {
    var btns = document.querySelectorAll(".teacher-rail .teacher-nav button");
    Array.prototype.forEach.call(btns, function (b) {
      b.classList.toggle("active", b.getAttribute("data-nav") === key);
    });
  }

  function navigate(key) {
    if (key === "schedule") {
      if (typeof window.tcOpenSchedule === "function") { window.tcOpenSchedule(); return; }
      window.location.href = toUrl("index.html?view=schedule");
      return;
    }
    if (key === "notice") {
      if (typeof window.tcOpenNotices === "function") { window.tcOpenNotices(); return; }
      window.location.href = toUrl("index.html?view=notice");
      return;
    }
    if (key === "quiz") {
      if (typeof window.tcOpenQuizzes === "function") { window.tcOpenQuizzes(); return; }
      window.location.href = toUrl("index.html?view=quiz");
      return;
    }
    if (typeof window.onTeacherNav === "function") {
      window.onTeacherNav(key);
      return;
    }
    if (key === "home") callGlobal("tcBackHome");
    else if (key === "manage") callGlobal("tcOpenManage");
    else if (key === "fc") callGlobal("tcOpenFc");
  }

  function mount() {
    var app = document.getElementById("tcApp");
    if (!app || app.hasAttribute("data-shell")) return;

    /* CSS dùng chung: chỉ chèn 1 lần */
    if (!document.getElementById("tc-shell-css")) {
      var style = document.createElement("style");
      style.id = "tc-shell-css";
      style.textContent = SHELL_CSS;
      document.head.appendChild(style);
    }

    app.setAttribute("data-shell", "1");

    var rail = document.createElement("aside");
    rail.className = "teacher-rail";
    rail.setAttribute("aria-label", "Điều hướng giáo viên");
    rail.innerHTML = railHtml();
    app.insertBefore(rail, app.firstChild);

    var canvas = app.querySelector(".teacher-canvas");
    if (canvas) {
      var top = document.createElement("div");
      top.className = "tc-topbar";
      top.innerHTML = topbarHtml();
      canvas.insertBefore(top, canvas.firstChild);
    }

    rail.addEventListener("click", function (e) {
      var btn = e.target.closest(".teacher-nav button");
      if (!btn) return;
      var key = btn.getAttribute("data-nav");
      if (btn.hasAttribute("title")) return;
      setActive(key);
      navigate(key);
    });

    /* Thu gọn / mở rộng thanh bên (ghi nhớ lựa chọn) */
    function applyCollapsed(on) {
      rail.classList.toggle("collapsed", on);
      app.classList.toggle("rail-collapsed", on);
      try { localStorage.setItem("lh-teacher-rail", on ? "1" : "0"); } catch (e) {}
    }
    var toggle = rail.querySelector(".rail-toggle");
    if (toggle) {
      toggle.addEventListener("click", function () {
        applyCollapsed(!rail.classList.contains("collapsed"));
      });
    }
    try {
      if (localStorage.getItem("lh-teacher-rail") === "1") applyCollapsed(true);
    } catch (e) {}

    setActive("home");
  }

  function init() {
    mount();
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", mount);
    }
  }

  init();

  window.TeacherShell = {
    mount: mount,
    setActive: setActive,
    navigate: navigate,
    NAV: NAV
  };
})();