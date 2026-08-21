/*!
 * LearnHub Toast System — lhToast / lhConfirm
 * Self-contained: tu inject CSS + Font Awesome (neu thieu).
 * API:
 *   lhToast(message, type)                     -> handle { update(msg), close() }
 *   lhToast(message, {type,title,durationMs})  -> handle
 *   lhConfirm(message)                         -> Promise<boolean>
 */
(function () {
  "use strict";

  var TYPES = {
    info:    { color: "#3b82f6", icon: "fa-circle-info",         title: "Thông tin" },
    success: { color: "#22c55e", icon: "fa-circle-check",        title: "Thành công" },
    warning: { color: "#eab308", icon: "fa-circle-exclamation",  title: "Cảnh báo" },
    error:   { color: "#ef4444", icon: "fa-circle-xmark",        title: "Lỗi" }
  };
  var DURATION = { info: 3500, success: 3500, warning: 4000, error: 5000 };

  /* ---- Sound engine (volume thong nhat toan site) ---- */
  var SOUND_VOLUME = 1;
  var ROOT_URL = (function () {
    try {
      var s = document.currentScript && document.currentScript.src;
      return s ? s.replace(/toast\.js.*$/, "") : "./";
    } catch (e) { return "./"; }
  })();
  var SOUNDS = {
    realtime: new URL("sound/realtimesound.mp3", ROOT_URL).href,
    thongbao: new URL("sound/thongbao.mp3", ROOT_URL).href
  };
  var baseAudio = {};
  function playToastSound(name) {
    try {
      var src = SOUNDS[name] || SOUNDS.realtime;
      var base = baseAudio[src];
      if (!base) {
        base = new Audio(src);
        base.preload = "auto";
        baseAudio[src] = base;
      }
      var a = (!base.paused && !base.ended && base.currentTime > 0) ? base.cloneNode() : base;
      try { a.currentTime = 0; } catch (e) {}
      a.muted = false;
      a.volume = SOUND_VOLUME;
      var p = a.play();
      if (p && p.catch) p.catch(function () {});
    } catch (e) {}
  }

  /* ---- Font Awesome fallback ---- */
  function ensureFontAwesome() {
    if (document.querySelector('link[href*="font-awesome"]')) return;
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css";
    document.head.appendChild(link);
  }

  /* ---- CSS ---- */
  var CSS = [
    ".lh-toast-container{position:fixed;top:20px;right:20px;z-index:2147483400;display:flex;flex-direction:column;gap:12px;pointer-events:none;max-width:calc(100vw - 40px)}",
    ".lh-toast{position:relative;display:flex;align-items:center;background:#fff;border-radius:4px;box-shadow:0 4px 15px rgba(0,0,0,0.05),0 1px 3px rgba(0,0,0,0.02);padding:16px 20px;width:100%;max-width:400px;overflow:hidden;pointer-events:auto;transform:translateX(120%);opacity:0;transition:transform .3s ease,opacity .3s ease}",
    ".lh-toast.lh-in{transform:translateX(0);opacity:1}",
    ".lh-toast.lh-out{transform:translateX(40%);opacity:0}",
    ".lh-toast::before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px}",
    ".lh-toast-info::before{background-color:#3b82f6}",
    ".lh-toast-success::before{background-color:#22c55e}",
    ".lh-toast-warning::before{background-color:#eab308}",
    ".lh-toast-error::before{background-color:#ef4444}",
    ".lh-toast-icon{font-size:20px;margin-right:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0}",
    ".lh-toast-info .lh-toast-icon{color:#3b82f6}",
    ".lh-toast-success .lh-toast-icon{color:#22c55e}",
    ".lh-toast-warning .lh-toast-icon{color:#eab308}",
    ".lh-toast-error .lh-toast-icon{color:#ef4444}",
    ".lh-toast-icon .lh-wave{display:inline-block;transform-origin:75% 80%;animation:lhWave 1.2s ease-in-out infinite}",
    "@keyframes lhWave{0%,100%{transform:rotate(0deg)}25%{transform:rotate(16deg)}55%{transform:rotate(-10deg)}75%{transform:rotate(10deg)}}",
    ".lh-toast-content{flex:1;min-width:0}",
    ".lh-toast-title{margin:0 0 2px 0;font-size:14px;font-weight:700;color:#1f2937}",
    ".lh-toast-message{margin:0;font-size:13px;color:#6b7280;word-wrap:break-word}",
    ".lh-toast-close{background:transparent;border:none;font-size:16px;color:#9ca3af;cursor:pointer;padding:4px;margin-left:12px;transition:color .2s;flex-shrink:0}",
    ".lh-toast-close:hover{color:#374151}",
    ".lh-toast-progress{position:absolute;left:0;bottom:0;height:3px;width:100%;transform-origin:left;background-color:#3b82f6}",
    ".lh-toast:hover .lh-toast-progress{animation-play-state:paused!important}",
    "@keyframes lh-progress-shrink{from{transform:scaleX(1)}to{transform:scaleX(0)}}",
    /* Confirm modal */
    ".lh-confirm-overlay{position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:2147483500;display:flex;align-items:center;justify-content:center;padding:20px;opacity:0;transition:opacity .2s ease}",
    ".lh-confirm-overlay.lh-in{opacity:1}",
    ".lh-confirm-card{position:relative;background:#fff;border-radius:8px;box-shadow:0 20px 60px rgba(15,23,42,.25);padding:24px 24px 20px;width:100%;max-width:380px;overflow:hidden;transform:scale(.95);transition:transform .2s ease}",
    ".lh-confirm-overlay.lh-in .lh-confirm-card{transform:scale(1)}",
    ".lh-confirm-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;background-color:#ef4444}",
    ".lh-confirm-title{margin:0 0 8px 0;font-size:16px;font-weight:700;color:#1f2937}",
    ".lh-confirm-message{margin:0 0 20px 0;font-size:14px;color:#6b7280;line-height:1.5;word-wrap:break-word}",
    ".lh-confirm-actions{display:flex;justify-content:flex-end;gap:10px}",
    ".lh-btn-cancel{background:#f1f5f9;color:#475569;border:none;border-radius:8px;padding:9px 18px;font-size:14px;font-weight:600;cursor:pointer;transition:background .2s}",
    ".lh-btn-cancel:hover{background:#e2e8f0}",
    ".lh-btn-danger{background:#ef4444;color:#fff;border:none;border-radius:8px;padding:9px 18px;font-size:14px;font-weight:600;cursor:pointer;transition:background .2s}",
    ".lh-btn-danger:hover{background:#dc2626}",
    "@media(max-width:768px){.lh-toast-container{top:92px;right:14px;left:auto}.lh-toast{max-width:min(400px,calc(100vw - 28px))}}"
  ].join("\n");

  var booted = false;
  function boot() {
    if (booted) return;
    booted = true;
    ensureFontAwesome();
    var style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  function getContainer() {
    boot();
    var c = document.querySelector(".lh-toast-container");
    if (!c) {
      c = document.createElement("div");
      c.className = "lh-toast-container";
      document.body.appendChild(c);
    }
    return c;
  }

  function normalizeOptions(message, opts) {
    if (typeof opts === "string") opts = { type: opts };
    opts = opts || {};
    var type = TYPES[opts.type] ? opts.type : "info";
    return {
      type: type,
      title: typeof opts.title === "string" && opts.title ? opts.title : TYPES[type].title,
      durationMs: typeof opts.durationMs === "number" && opts.durationMs > 0 ? opts.durationMs : DURATION[type],
      icon: typeof opts.icon === "string" && opts.icon ? opts.icon : "",
      sound: opts.sound === false ? false : (typeof opts.sound === "string" && opts.sound ? opts.sound : "realtime"),
      message: String(message == null ? "" : message)
    };
  }

  function iconMarkup(o) {
    var ic = o.icon;
    if (!ic) return '<i class="fa-solid ' + TYPES[o.type].icon + '"></i>';
    if (ic.indexOf(" ") !== -1 || ic.indexOf("<") === 0) return ic.charAt(0) === "<" ? ic : '<i class="' + ic + '"></i>';
    if (ic.indexOf("fa-") === 0) return '<i class="fa-solid ' + ic + '"></i>';
    return "<span>" + ic + "</span>";
  }

  function lhToast(message, opts) {
    var o = normalizeOptions(message, opts);
    if (o.sound) playToastSound(o.sound);
    var container = getContainer();

    var toast = document.createElement("div");
    toast.className = "lh-toast lh-toast-" + o.type;
    toast.setAttribute("role", "status");

    var icon = document.createElement("div");
    icon.className = "lh-toast-icon";
    icon.innerHTML = iconMarkup(o);

    var content = document.createElement("div");
    content.className = "lh-toast-content";
    var title = document.createElement("p");
    title.className = "lh-toast-title";
    title.textContent = o.title;
    var msg = document.createElement("p");
    msg.className = "lh-toast-message";
    msg.textContent = o.message;
    content.appendChild(title);
    content.appendChild(msg);

    var close = document.createElement("button");
    close.className = "lh-toast-close";
    close.setAttribute("aria-label", "Đóng");
    close.innerHTML = '<i class="fa-solid fa-xmark"></i>';

    var progress = document.createElement("div");
    progress.className = "lh-toast-progress";
    progress.style.backgroundColor = TYPES[o.type].color;
    progress.style.setProperty("--lh-toast-dur", o.durationMs + "ms");
    progress.style.animation = "lh-progress-shrink " + o.durationMs + "ms linear forwards";

    toast.appendChild(icon);
    toast.appendChild(content);
    toast.appendChild(close);
    toast.appendChild(progress);
    container.appendChild(toast);

    requestAnimationFrame(function () {
      requestAnimationFrame(function () { toast.classList.add("lh-in"); });
    });

    var closed = false;
    var backupTimer = null;

    function dismiss() {
      if (closed) return;
      closed = true;
      if (backupTimer) clearTimeout(backupTimer);
      toast.classList.remove("lh-in");
      toast.classList.add("lh-out");
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }

    close.addEventListener("click", dismiss);
    /* Chế độ giảm chuyển động có thể rút ngắn animation -> animationend bắn sớm
       làm toast nháy một cái rồi mất. Chỉ chấp nhận kết thúc đúng hạn. */
    var shownAt = Date.now();
    progress.addEventListener("animationend", function () {
      if (Date.now() - shownAt < o.durationMs * 0.5) return;
      dismiss();
    });
    backupTimer = setTimeout(dismiss, o.durationMs + 2500);

    return {
      update: function (newMessage) { msg.textContent = String(newMessage == null ? "" : newMessage); },
      close: dismiss,
      el: toast
    };
  }

  function lhConfirm(message) {
    boot();
    return new Promise(function (resolve) {
      var overlay = document.createElement("div");
      overlay.className = "lh-confirm-overlay";

      var card = document.createElement("div");
      card.className = "lh-confirm-card";

      var title = document.createElement("p");
      title.className = "lh-confirm-title";
      title.textContent = "Xác nhận";

      var msg = document.createElement("p");
      msg.className = "lh-confirm-message";
      msg.textContent = String(message == null ? "" : message);

      var actions = document.createElement("div");
      actions.className = "lh-confirm-actions";

      var cancelBtn = document.createElement("button");
      cancelBtn.className = "lh-btn-cancel";
      cancelBtn.textContent = "Hủy";

      var okBtn = document.createElement("button");
      okBtn.className = "lh-btn-danger";
      okBtn.textContent = "Xóa";

      actions.appendChild(cancelBtn);
      actions.appendChild(okBtn);
      card.appendChild(title);
      card.appendChild(msg);
      card.appendChild(actions);
      overlay.appendChild(card);
      document.body.appendChild(overlay);

      requestAnimationFrame(function () { overlay.classList.add("lh-in"); });
      okBtn.focus();

      function finish(result) {
        document.removeEventListener("keydown", onKey);
        overlay.classList.remove("lh-in");
        setTimeout(function () {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }, 200);
        resolve(result);
      }
      function onKey(e) { if (e.key === "Escape") finish(false); }

      cancelBtn.addEventListener("click", function () { finish(false); });
      okBtn.addEventListener("click", function () { finish(true); });
      overlay.addEventListener("click", function (e) { if (e.target === overlay) finish(false); });
      document.addEventListener("keydown", onKey);
    });
  }

  window.lhToast = lhToast;
  window.lhConfirm = lhConfirm;
})();
