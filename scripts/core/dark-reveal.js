/* Lucian UX/UI Prompt #219 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#219 */
/* Dùng lại switch "Chế độ tối" có sẵn (#darkModeToggle); chỉ thêm hiệu ứng loang tròn. */
(function () {
  "use strict";

  if (window.__lhDarkRevealReady) return;
  window.__lhDarkRevealReady = true;

  var toggle = document.getElementById("darkModeToggle");
  if (!toggle) return;
  var label = toggle.closest ? toggle.closest("label") : null;
  if (!label) return;

  var DURATION = 700; // .7s — giữ đúng duration của mẫu #219
  var FADE = 160;
  var busy = false;

  /* Map token mẫu -> biến theme LearnHub:
     --ux-page   -> --bg-main (#f6f8ff / #0f172a)
     --ux-accent -> --accent / --blue-accent */
  var style = document.createElement("style");
  style.textContent = [
    ".u219-reveal{",
    "  --u219-light:#f6f8ff;",
    "  --u219-dark:#0f172a;",
    "  --u219-accent:var(--accent,var(--blue-accent,#2563eb));",
    "  position:fixed;inset:0;z-index:2147483500;pointer-events:auto;",
    "  background:var(--u219-light);",
    "  clip-path:circle(0px at var(--cx,50%) var(--cy,50%));",
    "  transition:clip-path .7s cubic-bezier(.65,0,.35,1);",
    "  will-change:clip-path;",
    "}",
    ".u219-reveal[data-to=dark]{background:var(--u219-dark)}",
    ".u219-reveal[data-to=light]{background:var(--u219-light)}",
    ".u219-reveal.is-spreading{clip-path:circle(var(--r,120vmax) at var(--cx,50%) var(--cy,50%))}",
    ".u219-reveal.is-clearing{pointer-events:none;opacity:0;transition:opacity .16s linear}",
    /* View Transitions: ảnh thật của trang mới loang ra từ tâm switch (đúng mẫu #219). */
    "::view-transition-old(root),::view-transition-new(root){animation:none;mix-blend-mode:normal}",
    "::view-transition-old(root){z-index:1}",
    "::view-transition-new(root){z-index:2;clip-path:circle(0px at var(--u219-cx,50%) var(--u219-cy,50%));animation:u219Reveal .7s cubic-bezier(.65,0,.35,1) forwards}",
    "@keyframes u219Reveal{to{clip-path:circle(var(--u219-r,120vmax) at var(--u219-cx,50%) var(--u219-cy,50%))}}",
    "@media(prefers-reduced-motion:reduce){",
    "  .u219-reveal{transition:none}",
    "  .u219-reveal.is-clearing{transition:none}",
    "  ::view-transition-old(root),::view-transition-new(root){animation:none!important}",
    "}"
  ].join("");
  document.head.appendChild(style);

  function isDarkStored() {
    try { return localStorage.getItem("darkMode") === "on"; } catch (e) { return false; }
  }

  function reducedMotion() {
    return (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) ||
      document.body.classList.contains("cc-reduced");
  }

  /* Gọi đúng handler cũ trong script.js để giữ localStorage, iframe sync và toast. */
  function applyTarget(toDark) {
    toggle.checked = toDark;
    toggle.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function revealRadius(x, y) {
    var w = window.innerWidth;
    var h = window.innerHeight;
    return Math.sqrt(
      Math.pow(Math.max(x, w - x), 2) + Math.pow(Math.max(y, h - y), 2)
    ) + 8;
  }

  /* Fallback cho trình duyệt chưa có View Transitions (Firefox...): vòng tròn màu đặc. */
  function legacyReveal(x, y, toDark) {
    var radius = revealRadius(x, y);

    var overlay = document.createElement("div");
    overlay.className = "u219-reveal";
    overlay.setAttribute("data-to", toDark ? "dark" : "light");
    overlay.setAttribute("aria-hidden", "true");
    overlay.style.setProperty("--cx", Math.round(x) + "px");
    overlay.style.setProperty("--cy", Math.round(y) + "px");
    overlay.style.setProperty("--r", Math.ceil(radius) + "px");
    document.body.appendChild(overlay);

    void overlay.offsetWidth; // force reflow để transition chạy từ 0
    overlay.classList.add("is-spreading");

    var finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      applyTarget(toDark);
      overlay.classList.add("is-clearing");
      setTimeout(function () {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        busy = false;
      }, FADE);
    }

    var fallback = setTimeout(finish, DURATION + 60);
    overlay.addEventListener("transitionend", function (e) {
      if (String(e.propertyName || "").indexOf("clip-path") !== -1) {
        clearTimeout(fallback);
        finish();
      }
    });
  }

  /* Chrome/Edge/Safari: reveal đúng nội dung trang mới như mẫu. */
  function viewTransition(x, y, toDark) {
    var root = document.documentElement;
    root.style.setProperty("--u219-cx", Math.round(x) + "px");
    root.style.setProperty("--u219-cy", Math.round(y) + "px");
    root.style.setProperty("--u219-r", Math.ceil(revealRadius(x, y)) + "px");
    try {
      var transition = document.startViewTransition(function () {
        applyTarget(toDark);
      });
      transition.finished.then(function () { busy = false; })
        .catch(function () { busy = false; });
    } catch (e) {
      legacyReveal(x, y, toDark);
    }
  }

  label.addEventListener("click", function (e) {
    e.preventDefault();   // chặn browser tự toggle checkbox
    e.stopPropagation();  // không để click chạm vào input / handler cũ ngay lập tức
    if (busy) return;

    var toDark = !(document.body.classList.contains("dark-mode") || isDarkStored());

    if (reducedMotion()) {
      applyTarget(toDark);
      return;
    }

    var rect = toggle.getBoundingClientRect();
    var x = rect.left + rect.width / 2;
    var y = rect.top + rect.height / 2;
    busy = true;
    if (typeof document.startViewTransition === "function") viewTransition(x, y, toDark);
    else legacyReveal(x, y, toDark);
  }, true);
})();
