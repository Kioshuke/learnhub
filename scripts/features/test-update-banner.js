/* ============================================================
   Thông báo 5 đề thi mới nhất trên trang chủ.
   Dùng RPC public.list_published_test_sets có sẵn (bảng test_sets bị RLS
   chặn select trực tiếp) → lọc is_complete, sort created_at giảm dần, lấy 5.
   Không tạo bảng/cột mới trong Supabase.
   ============================================================ */

import { escapeHtml } from "../core/supabase-config.js";

const MAX_ITEMS = 5;
const SEPARATOR = " <--> ";
const REFRESH_MS = 30000;
const PX_PER_SECOND = 55;

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

/* Trả về chuỗi HTML của tối đa 5 đề, nối nhau bằng " <--> ". */
export function formatLatestTestItems(rows) {
  return (rows || []).map(function (row) {
    if (!row) return "";
    const stamp = formatTimestamp(row.created_at);
    if (!stamp) return "";
    const name = String(row.name || "").trim() || "(Chưa có tên đề)";
    return "Đã tải lên đề <b>" + escapeHtml(name) + "</b> vào lúc " +
      stamp.time + " ngày " + stamp.date;
  }).filter(Boolean).join(SEPARATOR);
}

export function initTestUpdateBanner(supabaseClient) {
  const banner = document.getElementById("testUpdateBanner");
  const track = document.getElementById("testUpdateTrack");
  const action = document.getElementById("testUpdateAction");
  if (!banner || !track || !action || !supabaseClient) return;

  let requestId = 0;
  let refreshTimer = null;
  let channel = null;

  function applySegments(html) {
    if (!html) {
      banner.hidden = true;
      track.innerHTML = "";
      track.style.removeProperty("--test-update-duration");
      return;
    }
    /* Nhân đôi nội dung để animation translateX(-50%) lặp lại không bị giật. */
    const segment = '<div class="test-update-segment">' + html + "</div>";
    const clone = '<div class="test-update-segment" aria-hidden="true">' + html + "</div>";
    track.innerHTML = segment + clone;
    banner.hidden = false;
    requestAnimationFrame(function () {
      const first = track.firstElementChild;
      if (!first) return;
      const width = first.getBoundingClientRect().width || first.scrollWidth;
      if (width > 0) {
        track.style.setProperty("--test-update-duration",
          Math.max(24, Math.round(width / PX_PER_SECOND)) + "s");
      }
    });
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
      applySegments(formatLatestTestItems(latest));
    } catch (e) {
      /* Giữ nội dung cũ nếu lỗi; không làm ồn giao diện trang chủ. */
      console.warn("[test-update-banner]", e && e.message ? e.message : e);
    }
  }

  action.addEventListener("click", function () {
    /* Chỉ mở tab Phòng học — không mở thẳng một đề cụ thể. */
    if (typeof window.show === "function") {
      window.show("phong-hoc");
      return;
    }
    window.location.assign(new URL("/index.html?open=phong-hoc", window.location.origin).href);
  });

  /* Realtime: nhận INSERT/UPDATE/DELETE ngay khi bảng có trong publication.
     RLS của test_sets có thể chặn event → vẫn giữ focus + polling dự phòng. */
  if (typeof supabaseClient.channel === "function") {
    try {
      channel = supabaseClient
        .channel("home-test-update-banner")
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
    if (channel) {
      try { supabaseClient.removeChannel(channel); } catch (e) {}
      channel = null;
    }
  });

  refresh();
}
