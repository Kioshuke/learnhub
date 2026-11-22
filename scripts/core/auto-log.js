/* ============================================================
   LearnHub AUTO LOG — gắn cho MỌI trang (kể cả 404.html)
   ------------------------------------------------------------
   - Ghi lỗi JS chưa được bắt, promise lỗi, lỗi tải script/iframe.
   - Ghi riêng trường hợp mở phải trang không tồn tại (404).
   - Gọi log_app_error qua supabase-config.js (có sẵn, dedup 30s).
   - Expose window.lhLogEvent(opts) để các trang ghi log success/lỗi
     có chủ đích mà không cần import module.
   ============================================================ */
(function () {
  "use strict";

  if (window.__lhAutoLogReady) return;
  window.__lhAutoLogReady = true;

  var scriptUrl = (function () {
    try { return (document.currentScript && document.currentScript.src) || ""; }
    catch (e) { return ""; }
  })();
  var moduleUrl = (function () {
    try { return new URL("./supabase-config.js", scriptUrl || location.href).href; }
    catch (e) { return "/scripts/core/supabase-config.js"; }
  })();

  var logger = null;
  var queue = [];

  function send(opts) {
    if (!opts || typeof opts !== "object") return;
    var payload = {};
    Object.keys(opts).forEach(function (k) { payload[k] = opts[k]; });
    if (!payload.source) payload.source = "global";
    if (!payload.category) payload.category = "feature";
    if (!payload.level) payload.level = "warning";
    if (logger) {
      try { logger(payload); } catch (e) {}
      return;
    }
    queue.push(payload);
    if (queue.length > 40) queue.shift();
  }

  function loadLogger() {
    try {
      import(moduleUrl).then(function (mod) {
        if (!mod || typeof mod.logAppError !== "function") return;
        logger = mod.logAppError;
        window.logAppError = logger;
        var pending = queue.splice(0);
        pending.forEach(function (p) { try { logger(p); } catch (e) {} });
      }).catch(function () {});
    } catch (e) {}
  }
  loadLogger();

  /* API công khai cho mọi trang (dùng window nên không cần import) */
  window.lhLogEvent = send;
  window.logAppEvent = send;

  /* Trang 404 / deep link trỏ tới đề không tồn tại */
  function isNotFoundPage() {
    return /(^|\/)404\.html$/i.test(location.pathname) || /\b404\b/.test(document.title || "");
  }
  if (isNotFoundPage()) {
    send({
      source: "router",
      category: "feature",
      level: "warning",
      code: "PAGE_NOT_FOUND",
      message: "Trang không tồn tại: " + location.pathname + location.search,
      detail: { path: location.pathname, query: location.search, ref: document.referrer || "" }
    });
  }

  /* Lỗi JS chưa bắt + lỗi tải tài nguyên quan trọng (chỉ script/link/iframe,
     bỏ qua img để khỏi spam khi ảnh avatar lỗi) */
  window.addEventListener("error", function (e) {
    try {
      var t = e && e.target;
      if (t && t !== window && t !== document) {
        var tag = String(t.tagName || "").toLowerCase();
        if (tag !== "script" && tag !== "link" && tag !== "iframe") return;
        var src = String(t.src || t.href || "");
        if (!src) return;
        send({
          source: "resource:" + tag,
          category: "feature",
          level: "warning",
          code: "RESOURCE_LOAD_FAIL",
          message: tag + " tải thất bại: " + src.slice(0, 180),
          detail: { tag: tag, src: src.slice(0, 300) }
        });
        return;
      }
      send({
        source: "runtime",
        category: "feature",
        level: "error",
        code: "JS_RUNTIME_ERROR",
        message: String((e && e.message) || "JavaScript error").slice(0, 400),
        detail: {
          file: String((e && e.filename) || "").slice(0, 300),
          line: (e && e.lineno) || 0,
          col: (e && e.colno) || 0
        }
      });
    } catch (_) {}
  }, true);

  /* Promise lỗi không ai bắt */
  window.addEventListener("unhandledrejection", function (e) {
    try {
      var reason = e && e.reason;
      if (reason && typeof reason === "object" && reason.message) reason = reason.message;
      var text = String(reason == null ? "Unhandled rejection" : reason);
      send({
        source: "runtime",
        category: "feature",
        level: "error",
        code: "UNHANDLED_REJECTION",
        message: text.slice(0, 400),
        detail: { value: text.slice(0, 300) }
      });
    } catch (_) {}
  });
})();
