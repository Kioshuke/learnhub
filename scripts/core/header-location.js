/* ============================================================
   LearnHub HEADER LOCATION — vị trí hiện tại trên header
   ------------------------------------------------------------
   - Ưu tiên GPS (navigator.geolocation) -> reverse geocode BigDataCloud.
   - Nếu từ chối/lỗi -> lấy lat/lon từ /api/location (Cloudflare) rồi
     reverse geocode tiếp -> vẫn ra tên xã/quận + tỉnh tiếng Việt.
   - Nếu vẫn lỗi -> giữ nguyên text tĩnh có sẵn trong HTML.
   - Cache localStorage 7 ngày: có cache thì không hỏi quyền lại.
   - Header được fetch bất đồng bộ nên dùng MutationObserver để ghi lại
     sau khi span xuất hiện (index.html thì có sẵn header inline).
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

  function settle(text, fromCache) {
    if (!text) return;
    currentText = text;
    paint(text);
    if (fromCache) {
      log("info", "LOCATION_CACHE_HIT", "Dùng vị trí đã lưu: " + text);
    } else {
      writeCache(text);
      log("info", "LOCATION_RESOLVED", "Vị trí hiện tại: " + text);
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
        settle(text, false);
      })
      .catch(function (err) {
        // Không đụng vào text tĩnh: người dùng vẫn thấy "Tân Hồng - Đồng Tháp".
        log("error", "LOCATION_FALLBACK_FAIL",
          "Không lấy được vị trí dự phòng: " + String((err && err.message) || err),
          { reason: reason || "" });
      });
  }

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
            if (text) settle(text, false);
            else ipFallback("empty-place");
          })
          .catch(function () {
            ipFallback("reverse-geocode-fail");
          });
      }, function (err) {
        var code = err && err.code === 1 ? "GEO_DENIED" : "GEO_UNAVAILABLE";
        log("error", code, "Không lấy được vị trí GPS: " + String((err && err.message) || "unknown"));
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

  function watchHeader() {
    var span = findSpan();
    if (span) fallbackText = String(span.textContent || "").replace(/\s+/g, " ").trim();

    if (!("MutationObserver" in window)) return;
    var observer = new MutationObserver(function () {
      var el = findSpan();
      if (!el) return;
      if (currentText) {
        if (String(el.textContent || "").indexOf(currentText) === -1) paint(currentText);
      } else {
        var text = String(el.textContent || "").replace(/\s+/g, " ").trim();
        if (text) fallbackText = text;
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function start() {
    var cached = readCache();
    if (cached) settle(cached, true);
    else resolveFresh();
  }

  watchHeader();
  start();
})();
