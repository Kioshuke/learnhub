// ============================================================================
// version-check.js — Kiểm tra phiên bản mới kiểu app mobile (LearnHub Platform)
// ----------------------------------------------------------------------------
// - Server:  version.json  (nguồn sự thật, release.bat tự sinh)
// - Client:  window.LH_VERSION bên dưới (release.bat tự vá khi phát hành)
// - Khác phiên bản → banner góc màn hình: "Tải lại ngay" / "Để sau"
// - Không đụng database, chỉ GET 1 file tĩnh mỗi 2 phút.
// ============================================================================

window.LH_VERSION = "1.26.8.2.22.3"; // ← release.bat tự thay giá trị này, KHÔNG sửa tay

(function () {
  "use strict";

  // Chỉ chạy ở trang gốc, bỏ qua iframe (AI.html chatbot...)
  try { if (window.top !== window.self) return; } catch (e) { return; }

  // Tự suy ra thư mục chứa script (…/version/) — version.json nằm cùng chỗ
  var ROOT = "./";
  try {
    if (document.currentScript && document.currentScript.src) {
      ROOT = document.currentScript.src.substring(0, document.currentScript.src.lastIndexOf("/") + 1);
    }
  } catch (e) {}

  var CHECK_INTERVAL_MS = 2 * 60 * 1000; // 2 phút
  var FIRST_CHECK_DELAY_MS = 5000;       // đợi 5s sau load, tránh giành tải với tài nguyên chính
  var AUTO_HIDE_MS = 30000;              // toast hiện 30s (đồng bộ thanh chạy thời gian) rồi tự co
  var RESHOW_IDLE_MS = 60 * 1000;        // không bấm gì → 1 phút sau nhắc lại
  var SNOOZE_MS = 15 * 60 * 1000;        // bấm "Để sau" → 15 phút sau mới nhắc lại
  var DISMISS_KEY = "lh_version_dismissed"; // lưu timestamp lần bấm "Để sau"
  var SOUND_REL = "../sound/version notification.mp3"; // so với thư mục version/ → phát khi toast hiện

  var bannerEl = null;
  var shownVersion = null;
  var hideTimer = null;
  var reshowTimer = null;
  var checking = false;

  // ---------- ÂM THANH ----------
  // Trình duyệt chặn autoplay nếu chưa có tương tác → cố gắng phát, bị chặn thì im lặng
  function playNotifySound() {
    try {
      var a = new Audio(ROOT + SOUND_REL.split("/").map(encodeURIComponent).join("/"));
      a.volume = 1;
      var p = a.play();
      if (p && p.catch) p.catch(function () {});
    } catch (e) {}
  }

  // ---------- FETCH ----------
  function fetchServerData() {
    return fetch(ROOT + "version.json?t=" + Date.now(), { cache: "no-store" })
      .then(function (r) { return r && r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  // ---------- SO SÁNH SEMVER MỞ RỘNG (hỗ trợ 4-6 đoạn số) ----------
  function compareVersions(a, b) {
    var pa = String(a || "").split(".");
    var pb = String(b || "").split(".");
    var n = Math.max(pa.length, pb.length);
    for (var i = 0; i < n; i++) {
      var x = parseInt(pa[i], 10) || 0;
      var y = parseInt(pb[i], 10) || 0;
      if (x !== y) return x < y ? -1 : 1;
    }
    return 0;
  }

  // "Để sau" = tạm im lặng 15 phút (lưu timestamp), hết hạn lại nhắc bình thường
  function isSnoozed() {
    try {
      var t = parseInt(localStorage.getItem(DISMISS_KEY), 10);
      return !isNaN(t) && t > 1e12 && Date.now() - t < SNOOZE_MS; // chỉ nhận timestamp hợp lệ
    } catch (e) { return false; }
  }

  // ---------- ĐỒNG BỘ PHIÊN BẢN Ở FOOTER (nút + popup) ----------
  function syncFooterVersion(updatedDate) {
    var v = window.LH_VERSION;
    var btns = document.querySelectorAll(".lh-version-btn");
    for (var i = 0; i < btns.length; i++) btns[i].textContent = "Phiên bản v" + v;

    var badges = document.querySelectorAll(".lh-version-badge");
    for (var j = 0; j < badges.length; j++) {
      var b = badges[j];
      var icon = b.querySelector("i");
      b.textContent = "";
      if (icon) b.appendChild(icon);
      b.appendChild(document.createTextNode(" v" + v));
    }
    if (updatedDate) {
      var dates = document.querySelectorAll(".lh-version-date");
      for (var k = 0; k < dates.length; k++) {
        var d = dates[k];
        var di = d.querySelector("i");
        d.textContent = "";
        if (di) d.appendChild(di);
        d.appendChild(document.createTextNode(" Cập nhật ngày " + updatedDate));
      }
    }
  }

  // ---------- TOAST UI (góc phải dưới + thanh chạy thời gian) ----------
  function ensureStyles() {
    if (document.getElementById("lh-vcheck-style")) return;
    var st = document.createElement("style");
    st.id = "lh-vcheck-style";
    st.textContent =
      ".lh-vcheck{position:fixed;right:18px;bottom:18px;z-index:2147483400;display:flex;align-items:center;gap:12px;" +
      "max-width:380px;padding:14px 16px 17px;border-radius:16px;background:#fff;border:1px solid #e2e8f0;" +
      "box-shadow:0 12px 40px rgba(15,23,42,.18);font-family:inherit;overflow:hidden;" +
      "transform:translateY(24px);opacity:0;animation:lhVcheckIn .35s cubic-bezier(.2,.7,.3,1) forwards}" +
      "@keyframes lhVcheckIn{to{transform:translateY(0);opacity:1}}" +
      ".lh-vcheck--hide{animation:lhVcheckOut .3s ease forwards}" +
      "@keyframes lhVcheckOut{from{transform:translateY(0);opacity:1}to{transform:translateX(80px);opacity:0}}" +
      ".lh-vcheck-icon{font-size:26px;line-height:1;flex-shrink:0}" +
      ".lh-vcheck-body{display:flex;flex-direction:column;gap:2px;min-width:0}" +
      ".lh-vcheck-body strong{font-size:13.5px;color:#0f172a;font-weight:800;letter-spacing:-.1px}" +
      ".lh-vcheck-body span{font-size:12px;color:#64748b;line-height:1.45}" +
      ".lh-vcheck-actions{display:flex;flex-direction:column;gap:6px;flex-shrink:0}" +
      ".lh-vcheck-reload{border:none;border-radius:10px;padding:8px 14px;" +
      "background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff;font-size:12.5px;font-weight:700;" +
      "cursor:pointer;font-family:inherit;white-space:nowrap;transition:filter .2s ease,transform .2s ease}" +
      ".lh-vcheck-reload:hover{filter:brightness(1.08);transform:translateY(-1px)}" +
      ".lh-vcheck-later{border:none;background:none;color:#94a3b8;font-size:11.5px;font-weight:600;" +
      "cursor:pointer;font-family:inherit;padding:2px}" +
      ".lh-vcheck-later:hover{color:#475569;text-decoration:underline}" +
      ".lh-vcheck-progress{position:absolute;left:0;right:0;bottom:0;height:3px;background:#e2e8f0}" +
      ".lh-vcheck-bar{display:block;height:100%;width:100%;background:linear-gradient(90deg,#2563eb,#7c3aed);" +
      "animation:lhVcheckBar " + (AUTO_HIDE_MS / 1000) + "s linear forwards}" +
      "@keyframes lhVcheckBar{from{width:100%}to{width:0}}" +
      "body.dark-mode .lh-vcheck{background:#1e293b;border-color:#334155;box-shadow:0 12px 40px rgba(0,0,0,.5)}" +
      "body.dark-mode .lh-vcheck-body strong{color:#f1f5f9}" +
      "body.dark-mode .lh-vcheck-body span{color:#94a3b8}" +
      "body.dark-mode .lh-vcheck-progress{background:#334155}" +
      "@media (max-width:560px){.lh-vcheck{left:12px;right:12px;bottom:12px;max-width:none}}" +
      "@media (prefers-reduced-motion:reduce){.lh-vcheck{animation:none;opacity:1;transform:none}" +
      ".lh-vcheck--hide{animation:none;display:none}.lh-vcheck-bar{animation:none;width:50%}}";
    document.head.appendChild(st);
  }

  function clearTimers() {
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    if (reshowTimer) { clearTimeout(reshowTimer); reshowTimer = null; }
  }

  // scheduleNextMs: hẹn check lại sau khoảng này (1 phút nếu hết giờ, 15 phút nếu bấm Để sau)
  function hideBanner(scheduleNextMs) {
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    if (!bannerEl) return;
    var el = bannerEl;
    bannerEl = null;
    shownVersion = null;
    el.classList.add("lh-vcheck--hide");
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 350);
    if (scheduleNextMs && !reshowTimer) {
      reshowTimer = setTimeout(function () { reshowTimer = null; check(); }, scheduleNextMs);
    }
  }

  function showBanner(version) {
    ensureStyles();
    if (bannerEl && shownVersion === version) return; // đang hiện đúng bản này → giữ nguyên nhịp 30s
    clearTimers();
    if (bannerEl) hideBanner();

    var wrap = document.createElement("div");
    wrap.className = "lh-vcheck";
    wrap.setAttribute("role", "alert");

    var icon = document.createElement("div");
    icon.className = "lh-vcheck-icon";
    icon.textContent = "\uD83C\uDF89"; // 🎉

    var body = document.createElement("div");
    body.className = "lh-vcheck-body";
    var strong = document.createElement("strong");
    strong.textContent = "Phiên bản mới đã sẵn sàng!";
    var desc = document.createElement("span");
    desc.textContent = "Tải lại trang để dùng phiên bản " + version + " mới nhất nhé.";
    body.appendChild(strong);
    body.appendChild(desc);

    var actions = document.createElement("div");
    actions.className = "lh-vcheck-actions";

    var reloadBtn = document.createElement("button");
    reloadBtn.type = "button";
    reloadBtn.className = "lh-vcheck-reload";
    reloadBtn.textContent = "Tải lại ngay";
    reloadBtn.addEventListener("click", function () { location.reload(); });

    var laterBtn = document.createElement("button");
    laterBtn.type = "button";
    laterBtn.className = "lh-vcheck-later";
    laterBtn.textContent = "Để sau";
    laterBtn.addEventListener("click", function () {
      try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch (e) {}
      hideBanner(SNOOZE_MS);
    });

    var progress = document.createElement("div");
    progress.className = "lh-vcheck-progress";
    var bar = document.createElement("i");
    bar.className = "lh-vcheck-bar";
    progress.appendChild(bar);

    actions.appendChild(reloadBtn);
    actions.appendChild(laterBtn);
    wrap.appendChild(icon);
    wrap.appendChild(body);
    wrap.appendChild(actions);
    wrap.appendChild(progress);
    document.body.appendChild(wrap);
    playNotifySound();

    bannerEl = wrap;
    shownVersion = version;

    // Hết 30s → tự co, hẹn nhắc lại sau 1 phút
    hideTimer = setTimeout(function () { hideBanner(RESHOW_IDLE_MS); }, AUTO_HIDE_MS);
  }

  // ---------- VÒNG LẶP KIỂM TRA ----------
  function check() {
    if (checking) return;
    checking = true;
    fetchServerData().then(function (data) {
      checking = false;
      if (!data || !data.version) return; // offline / JSON lỗi → im lặng
      syncFooterVersion(data.updated);
      var cmp = compareVersions(data.version, window.LH_VERSION);
      if (cmp > 0) {
        if (!isSnoozed()) showBanner(data.version);
      } else {
        // Đã cập nhật xong → dọn key dismiss cũ
        try { localStorage.removeItem(DISMISS_KEY); } catch (e) {}
        if (bannerEl) hideBanner();
      }
    });
  }

  setTimeout(check, FIRST_CHECK_DELAY_MS);
  setInterval(check, CHECK_INTERVAL_MS);
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) check();
  });
})();
