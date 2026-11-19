/* ============================================================
   Thanh ticker trang chủ: thay chữ chào mừng tĩnh bằng 5 đề thi
   mới nhất từ RPC public.list_published_test_sets có sẵn.
   Không tạo bảng/cột mới trong Supabase.
   ============================================================ */

import { escapeHtml } from "../core/supabase-config.js";

const MAX_ITEMS = 5;
const REFRESH_MS = 30000;
const PX_PER_SECOND = 130;   // chạy nhanh hơn một chút so với bản trước

const VN_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Ho_Chi_Minh",
  hourCycle: "h23",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit"
});

function formatTimestamp(value) {
  const date = new Date(value);
  if (isNaN(date.getTime())) return null;
  const parts = {};
  VN_FORMAT.formatToParts(date).forEach(function (p) {
    if (p.type !== "literal") parts[p.type] = p.value;
  });
  return {
    time: parts.hour + ":" + parts.minute + ":" + parts.second,
    date: parts.day + "/" + parts.month + "/" + parts.year
  };
}

/* Trả về chuỗi HTML của tối đa 5 đề, mỗi đề là 1 .lh-ticker-text,
   nối nhau bằng <span class="sep">&lt;--&gt;</span>. */
export function formatLatestTestItems(rows) {
  const items = (rows || []).map(function (row) {
    if (!row) return null;
    const stamp = formatTimestamp(row.created_at);
    if (!stamp) return null;
    const name = String(row.name || "").trim() || "(Chưa có tên đề)";
    return '<span class="lh-ticker-text">Đã tải lên đề <strong class="test-name">' +
      escapeHtml(name) + "</strong> vào lúc " + stamp.time + " ngày " + stamp.date +
      "</span>";
  }).filter(Boolean);

  return items.map(function (item, i) {
    return item + (i < items.length - 1 ? '<span class="sep">&lt;--&gt;</span>' : "");
  }).join("");
}

export function initTestUpdateTicker(supabaseClient) {
  const el = document.querySelector(".ticker-text");
  const container = el ? el.closest(".ticker-container") : null;
  if (!el || !supabaseClient) return;

  /* Không có đề nào thì ẩn luôn thanh ticker (không hiện lại chữ chào mừng cũ). */
  let requestId = 0;
  let refreshTimer = null;
  let resizeTimer = null;
  let channel = null;

  function setDuration() {
    const width = el.scrollWidth || el.offsetWidth || 1700;
    const secs = Math.min(90, Math.max(15, Math.round(width / PX_PER_SECOND)));
    el.style.animationDuration = secs + "s";
    el.style.setProperty("--ticker-dur", secs + "s");
  }

  function apply(html) {
    el.innerHTML = html || "";
    if (container) container.style.display = html ? "" : "none";
    if (html) requestAnimationFrame(setDuration);
  }

  async function refresh() {
    if (document.hidden) return;
    const id = ++requestId;
    try {
      const { data, error } = await supabaseClient.rpc("list_published_test_sets");
      if (error) throw error;
      if (id !== requestId) return;
      const latest = (data || [])
        .filter(function (row) { return row && row.is_complete === true; })
        .sort(function (a, b) {
          return (Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0);
        })
        .slice(0, MAX_ITEMS);
      apply(formatLatestTestItems(latest));
    } catch (e) {
      console.warn("[test-update-ticker]", e && e.message ? e.message : e);
    }
  }

  window.addEventListener("resize", function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(setDuration, 250);
  });

  /* Realtime: nhận INSERT/UPDATE/DELETE khi bảng có trong publication.
     RLS có thể chặn event → vẫn giữ focus + polling dự phòng. */
  if (typeof supabaseClient.channel === "function") {
    try {
      channel = supabaseClient
        .channel("home-test-update-ticker")
        .on("postgres_changes", { event: "*", schema: "public", table: "test_sets" }, refresh)
        .subscribe();
    } catch (e) {
      channel = null;
    }
  }

  window.addEventListener("focus", refresh);
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) refresh();
  });
  refreshTimer = window.setInterval(refresh, REFRESH_MS);
  window.addEventListener("pagehide", function () {
    window.clearInterval(refreshTimer);
    window.clearTimeout(resizeTimer);
    if (channel) {
      try { supabaseClient.removeChannel(channel); } catch (e) {}
      channel = null;
    }
  });

  refresh();
}
