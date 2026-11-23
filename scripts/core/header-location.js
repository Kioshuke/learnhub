/* ============================================================
   LearnHub HEADER LOCATION — vị trí hiện tại trên header
   ------------------------------------------------------------
   Thứ tự lấy vị trí: GPS -> IP -> cache -> text mặc định trong HTML.

   - Chỉ GHI LOG KHI THẤT BẠI Ở CẢ 2 NGUỒN ĐẦU (GPS + IP):
       + còn cache  -> warning LOCATION_USING_CACHE
       + hết cache  -> error   LOCATION_DEFAULT
     Không log thành công, không log từng lần GPS denied.
   - Cache vẫn được sơn ngay lúc load để header khỏi giật, nhưng chỉ là
     "hiện tạm"; GPS/IP thành công sẽ ghi đè.
   - Nếu span vị trí đang bị ẩn (CSS <=700px) thì KHÔNG gọi GPS, không hỏi
     quyền, không tốn request IP. Khi nào span hiện ra (xoay ngang, kéo rộng
     cửa sổ, hoặc header fetch xong mới chèn vào) thì mới resolve 1 lần.
   - Header được fetch bất đồng bộ ở 28 trang nên dùng MutationObserver:
     "chưa có span" khác với "có span nhưng đang ẩn".
   ============================================================ */
(function () {
  "use strict";

  if (window.__lhHeaderLocationReady) return;
  window.__lhHeaderLocationReady = true;

  var STORAGE_KEY = "lhHeaderLocationV1";
  var CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
  var GEO_TIMEOUT = 8000;
  var GEO_MAX_AGE = 15 * 60 * 1000;
  var REVERSE_BASE = "https://api.bigdatacloud.net/data/reverse-geocode-client";
  var IP_ENDPOINT = "/api/location";

  var currentText = "";
  var fallbackText = "";
  var resolved = false;   // mỗi lần load trang chỉ resolve một lần
  var resizeTimer = null;

  function log(level, code, message, detail) {
    try {
      if (typeof window.lhLogEvent !== "function") return;
      window.lhLogEvent({
        source: "header-location",
        category: "location",
        level: level,
        code: code,
        message: message,
        detail: detail || {},
        url: location.href
      });
    } catch (e) {}
  }

  function findSpan() {
    return document.getElementById("lhHeaderLocation") || document.querySelector(".header-location");
  }

  /* Ghi đè bằng text node để không làm mất <i> icon location. */
  function paint(text) {
    var span = findSpan();
    if (!span || !text) return false;
    var icon = span.querySelector("i");
    while (span.firstChild) span.removeChild(span.firstChild);
    if (icon) span.appendChild(icon);
    span.appendChild(document.createTextNode(" " + text));
    span.setAttribute("title", "Vị trí hiện tại");
    return true;
  }

  function readCache() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return "";
      var data = JSON.parse(raw);
      if (!data || typeof data.text !== "string" || !data.text) return "";
      var age = Date.now() - Number(data.ts);
      if (!isFinite(age) || age < 0 || age > CACHE_TTL) return "";
      return data.text;
    } catch (e) {
      return "";
    }
  }

  function writeCache(text) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ text: text, ts: Date.now() }));
    } catch (e) {}
  }

  /* persist = true chỉ khi text đến từ mạng (GPS/IP). Cache thì không ghi lại. */
  function settle(text, persist) {
    if (!text) return;
    currentText = text;
    paint(text);
    if (persist) writeCache(text);
  }

  /* Đây là ĐIỂM DUY NHẤT ghi log location — chỉ chạy khi GPS + IP đều hỏng. */
  function finishWithFallback(reason) {
    var cached = readCache() || currentText;
    if (cached) {
      settle(cached, false);
      log("warning", "LOCATION_USING_CACHE",
        "Không có vị trí hiện tại, đang lấy vị trí từ cache: " + cached,
        { reason: reason || "" });
    } else {
      log("error", "LOCATION_DEFAULT",
        "Không lấy được vị trí, đang hiện vị trí mặc định.",
        { reason: reason || "" });
    }
  }

  function fetchJson(url, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      var opts = { credentials: "omit", cache: "no-store" };
      if (controller) opts.signal = controller.signal;
      var timer = setTimeout(function () {
        if (controller) controller.abort();
        reject(new Error("timeout"));
      }, timeoutMs || 8000);

      fetch(url, opts)
        .then(function (res) {
          if (!res || !res.ok) throw new Error("http " + (res && res.status));
          return res.json();
        })
        .then(function (json) {
          clearTimeout(timer);
          resolve(json);
        })
        .catch(function (err) {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  function cleanName(value) {
    return String(value || "")
      .trim()
      .replace(/^(Thành phố|TP\.?|Tỉnh|Huyện|Quận|Xã|Thị xã)\s+/i, "");
  }

  /* BigDataCloud trả locality + principalSubdivision (localityLanguage=vi). */
  function normalizePlace(json) {
    if (!json || typeof json !== "object") return "";
    var province = cleanName(json.principalSubdivision || json.region || json.state);
    var ward = "";
    var candidates = [json.locality, json.city, json.town, json.village];
    for (var i = 0; i < candidates.length; i++) {
      ward = cleanName(candidates[i]);
      if (ward && ward !== province) break;
      ward = "";
    }
    if (!ward && json.localityInfo && json.localityInfo.administrative) {
      var adm = json.localityInfo.administrative;
      for (var j = adm.length - 1; j >= 0; j--) {
        var name = cleanName(adm[j] && adm[j].name);
        if (name && name !== province) {
          ward = name;
          break;
        }
      }
    }
    if (ward && province && ward !== province) return ward + " - " + province;
    return province || ward || "";
  }

  function reverseGeocode(lat, lon) {
    var url = REVERSE_BASE +
      "?latitude=" + encodeURIComponent(lat) +
      "&longitude=" + encodeURIComponent(lon) +
      "&localityLanguage=vi";
    return fetchJson(url, 8000).then(normalizePlace);
  }

  /* Nguồn 2: IP. Hỏng thì mới nhường cho cache/text mặc định. */
  function ipFallback(reason) {
    return fetchJson(IP_ENDPOINT + "?t=" + Date.now(), 6000)
      .then(function (geo) {
        var lat = Number(geo && geo.latitude);
        var lon = Number(geo && geo.longitude);
        if (!isFinite(lat) || !isFinite(lon) || (lat === 0 && lon === 0)) {
          throw new Error("không có tọa độ từ IP");
        }
        return reverseGeocode(lat, lon);
      })
      .then(function (text) {
        if (!text) throw new Error("không xác định được tên địa phương");
        settle(text, true);
      })
      .catch(function (err) {
        finishWithFallback(reason + " -> ip: " + String((err && err.message) || err));
      });
  }

  /* Nguồn 1: GPS. Không log deny ở đây, chỉ đẩy sang IP rồi log 1 lần ở cuối. */
  function resolveFresh() {
    if (!navigator.geolocation || window.isSecureContext === false) {
      ipFallback("geolocation-unavailable");
      return;
    }
    try {
      navigator.geolocation.getCurrentPosition(function (pos) {
        var lat = pos && pos.coords && pos.coords.latitude;
        var lon = pos && pos.coords && pos.coords.longitude;
        if (typeof lat !== "number" || typeof lon !== "number") {
          ipFallback("bad-position");
          return;
        }
        reverseGeocode(lat, lon)
          .then(function (text) {
            if (text) settle(text, true);
            else ipFallback("empty-place");
          })
          .catch(function () {
            ipFallback("reverse-geocode-fail");
          });
      }, function (err) {
        var code = err && err.code === 1 ? "GEO_DENIED" : "GEO_UNAVAILABLE";
        ipFallback(code);
      }, {
        enableHighAccuracy: false,
        timeout: GEO_TIMEOUT,
        maximumAge: GEO_MAX_AGE
      });
    } catch (e) {
      ipFallback("geolocation-throw");
    }
  }

  /* null = span chưa tồn tại (header đang fetch) -> chưa quyết định gì. */
  function checkVisibility() {
    var span = findSpan();
    if (!span) return null;
    try {
      var st = window.getComputedStyle(span);
      if (st.display === "none" || st.visibility === "hidden" || st.opacity === "0") return false;
      return span.getClientRects().length > 0;
    } catch (e) {
      return true;
    }
  }

  function maybeResolve() {
    if (resolved) return;
    var visible = checkVisibility();
    if (visible === null) return;  // đợi MutationObserver thấy span xuất hiện
    if (!visible) return;          // đang ẩn -> đợi resize/xoay ngang
    resolved = true;
    resolveFresh();
  }

  function onViewportChange() {
    if (resolved) return;
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(maybeResolve, 200);
  }

  function watchHeader() {
    var span = findSpan();
    if (span) fallbackText = String(span.textContent || "").replace(/\s+/g, " ").trim();

    if (!("MutationObserver" in window)) {
      window.addEventListener("resize", onViewportChange, { passive: true });
      return;
    }
    var observer = new MutationObserver(function () {
      var el = findSpan();
      if (!el) return;
      if (currentText) {
        if (String(el.textContent || "").indexOf(currentText) === -1) paint(currentText);
      } else {
        var text = String(el.textContent || "").replace(/\s+/g, " ").trim();
        if (text) fallbackText = text;
      }
      maybeResolve();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener("resize", onViewportChange, { passive: true });
    window.addEventListener("orientationchange", onViewportChange, { passive: true });
  }

  function start() {
    watchHeader();
    // Sơn cache trước cho header khỏi nhảy (không log), rồi mới resolve thật.
    var cached = readCache();
    if (cached) settle(cached, false);
    maybeResolve();
  }

  start();
})();
