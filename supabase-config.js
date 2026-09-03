// ============================================================================
// supabase-config.js
// ----------------------------------------------------------------------------
// File DUY NHẤT chứa toàn bộ phần Supabase của LearnHub:
//   1) Khởi tạo client   (supabase, createLearnHubClient, SUPABASE_URL)
//   2) Helpers dùng chung (trước đây là supabase-helpers.js: maintenance,
//      whitelist email, session, hồ sơ, online session, escape...)
//   3) Ghi log lỗi        (logAppError — trước đây là log-errors.js)
//
// Cách dùng:
//   import { supabase, escapeHtml, logAppError, ... } from "./supabase-config.js";
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://hyuzukvxulwouaexatqv.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_cFWEQ0SQuM8SSrOgbkQ8Kg_tJb3Qw9J";

// Client mặc định của web chính — dùng storage key chuẩn của Supabase
// (giữ nguyên session đang có của user trên web chính).
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Tạo client với storage key riêng — dùng để tách session độc lập
// (vd: administrator.html dùng storageKey "learnhub-admin-auth" để không
// đánh lộn account với web chính).
export function createLearnHubClient(options = {}) {
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storageKey: options.storageKey || "learnhub-auth",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
}

export { SUPABASE_URL };

// ============================================================================
// HELPERS DÙNG CHUNG (gộp từ supabase-helpers.js)
// Các hàm dùng chung cho mọi trang LearnHub sau khi migrate sang Supabase:
// maintenance (get + realtime), whitelist email, session, đồng bộ hồ sơ.
// ============================================================================

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

// ---------- ESCAPE (chống XSS khi render dữ liệu user vào innerHTML) ----------

export function escapeHtml(v) {
  return String(v ?? "").replace(/[&<>"'`=\/]/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "`": "&#96;", "=": "&#61;", "/": "&#47;"
  }[c]));
}

// Chỉ cho phép URL http/https (chặn javascript:, data:text/html, sai scheme).
export function escapeUrl(u) {
  const s = String(u ?? "").trim();
  if (!s) return "";
  try {
    const p = new URL(s);
    if (p.protocol === "http:" || p.protocol === "https:") return s;
  } catch (e) { /* bỏ qua */ }
  return "";
}

// ---------- MAINTENANCE ----------

export async function getMaintenance() {
  try {
    const { data, error } = await supabase
      .from("maintenance_settings")
      .select("enabled, message")
      .eq("id", true)
      .maybeSingle();
    if (error) throw error;
    return {
      enabled: !!(data && data.enabled),
      message: String((data && data.message) || ""),
      ok: true
    };
  } catch (e) {
    console.error("[supabase-helpers] getMaintenance lỗi:", e);
    return { enabled: false, message: "", ok: false };
  }
}

// Lắng nghe realtime trạng thái bảo trì. Trả về channel (có thể remove()).
export function subscribeMaintenance(cb) {
  const channel = supabase
    .channel("maintenance-settings")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "maintenance_settings" },
      (payload) => {
        const data = payload.new || payload.old || {};
        cb({ enabled: !!data.enabled, message: String(data.message || "") });
      }
    )
    .subscribe();
  return channel;
}

// ---------- WHITELIST EMAIL ----------
// Cache: { result: boolean, ts: number }
let _whitelistCache = { result: null, ts: 0 };
const WHITELIST_CACHE_TTL = 5000; // 5s

// Cơ chế bật/tắt whitelist toàn cục (admin dashboard).
// - BẬT (mặc định): phải nằm trong whitelist mới đăng nhập/đăng ký được.
// - TẮT: ai cũng đăng nhập Google được; đăng ký tùy theo nút "Cho phép đăng ký".
// Lưu ở bảng whitelist_settings { id=true, enabled, updated_at, updated_by }.
let _wlEnabledCache = { result: null, ts: 0, inflight: null };
const WL_ENABLED_TTL = 5000; // 5s

export async function isWhitelistEnabled() {
  const now = Date.now();
  if (_wlEnabledCache.result !== null && (now - _wlEnabledCache.ts) < WL_ENABLED_TTL) {
    return _wlEnabledCache.result;
  }
  if (_wlEnabledCache.inflight) return _wlEnabledCache.inflight;
  _wlEnabledCache.inflight = (async () => {
    try {
      const { data, error } = await supabase
        .from("whitelist_settings")
        .select("enabled")
        .eq("id", true)
        .maybeSingle();
      if (error) throw error;
      // Mặc định BẬT nếu chưa từng lưu (giữ hành vi cũ an toàn)
      const ok = data ? data.enabled !== false : true;
      _wlEnabledCache = { result: ok, ts: Date.now(), inflight: null };
      return ok;
    } catch (e) {
      console.warn("[supabase-helpers] isWhitelistEnabled lỗi:", e && e.message || e);
      _wlEnabledCache.inflight = null;
      // Mặc định an toàn: vẫn bật whitelist nếu không đọc được setting
      return true;
    }
  })();
  try { return await _wlEnabledCache.inflight; } finally { _wlEnabledCache.inflight = null; }
}

export async function emailAllowed(email) {
  if (!email) return false;
  // Nếu whitelist toàn cục ĐANG TẮT -> cho phép mọi email (không cần check RPC)
  const wl = await isWhitelistEnabled();
  if (wl === false) return true;
  const now = Date.now();
  // Dùng cache nếu < TTL
  if (_whitelistCache.result !== null && (now - _whitelistCache.ts) < WHITELIST_CACHE_TTL) {
    return _whitelistCache.result;
  }
  // Thử 2 lần (retry 1 lần nếu lỗi mạng)
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { data, error } = await supabase.rpc("is_email_allowed", { p_email: email });
      if (error) throw error;
      const ok = data === true;
      _whitelistCache = { result: ok, ts: now };
      return ok;
    } catch (e) {
      console.warn("[supabase-helpers] emailAllowed retry " + (attempt + 1) + ":", e.message || e);
      if (attempt === 0) await new Promise(r => setTimeout(r, 1500)); // chờ 1.5s rồi thử lại
    }
  }
  // Cả 2 lần đều lỗi → dùng cache nếu còn hạn, nếu không → return false (an toàn)
  if (_whitelistCache.result !== null && (now - _whitelistCache.ts) < WHITELIST_CACHE_TTL) {
    console.warn("[supabase-helpers] emailAllowed: dùng cache do RPC lỗi");
    return _whitelistCache.result;
  }
  console.error("[supabase-helpers] emailAllowed: RPC lỗi cả 2 lần, không có cache");
  return false;
}

// ---------- REGISTRATION TOGGLE ----------
let _regCache = { result: null, ts: 0 };
const REG_CACHE_TTL = 30000;

export async function isRegistrationOpen() {
  const now = Date.now();
  if (_regCache.result !== null && (now - _regCache.ts) < REG_CACHE_TTL) {
    return _regCache.result;
  }
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { data, error } = await supabase.rpc("is_registration_open");
      if (error) throw error;
      const ok = data === true;
      _regCache = { result: ok, ts: now };
      return ok;
    } catch (e) {
      console.warn("[supabase-helpers] isRegistrationOpen retry " + (attempt + 1) + ":", e.message || e);
      if (attempt === 0) await new Promise(r => setTimeout(r, 1500));
    }
  }
  if (_regCache.result !== null && (now - _regCache.ts) < REG_CACHE_TTL) {
    return _regCache.result;
  }
  return true; // default: open
}

// ---------- SESSION ----------

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export function onAuthChange(cb) {
  return supabase.auth.onAuthStateChange(cb);
}

// ---------- HỒ SƠ NGƯỜI DÙNG ----------

export async function getUserRow(uid) {
  if (!uid) return null;
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", uid)
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch (e) {
    console.error("[supabase-helpers] getUserRow lỗi:", e);
    return null;
  }
}

// Sau khi đăng nhập: cập nhật hồ sơ vào bảng users (user tạo mới nằm thẳng trên Supabase).
export async function finalizeSession(user) {
  if (!user || !user.id) return null;
  const email = user.email;
  const nowIso = new Date().toISOString();

  const patch = {
    last_login: nowIso
    // KHÔNG set online/last_active ở đây: để users_begin_online (RPC) là nguồn duy nhất
    // quyết định phiên online. Nếu login ghi last_active=now sẽ "che" phiên cũ chết (crash),
    // khiến begin tưởng phiên vẫn liên tục → vẫn cộng cả khoảng offline (giờ ảo).
  };
  const name =
    user.user_metadata?.name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.display_name;
  const photo =
    user.user_metadata?.avatar_url ||
    user.user_metadata?.picture ||
    user.user_metadata?.avatar;
  if (name) patch.name = name;
  if (photo) patch.photo = photo;

  const payload = { id: user.id, ...patch };
  const normEmail = normalizeEmail(email);
  if (normEmail) payload.email = normEmail;

  try {
    const { error } = await supabase
      .from("users")
      .upsert(payload, { onConflict: "id" });
    if (error) throw error;
  } catch (e) {
    console.error("[supabase-helpers] finalizeSession upsert lỗi:", e);
  }

  return { ...user, name, photo };
}

// ---------- ONLINE SESSION (atomic qua RPC, chống giờ ảo / double-count) ----------
// Toàn bộ thay đổi online_start_time / online_timer được thực hiện trong DB bằng
// function atomic (SELECT ... FOR UPDATE) nên 2 tab/pages cùng ghi không thể double-count.

// Bắt đầu/claim phiên online: giữ start nếu phiên liên tục; nếu phiên cũ chết (crash)
// chỉ cộng phần online thật (start -> last_active), KHÔNG cộng khoảng offline.
export async function beginOnlineSession(uid) {
  if (!uid) return;
  try {
    const { error } = await supabase.rpc("users_begin_online", { p_uid: uid });
    if (error) throw error;
  } catch (e) {
    console.error("[supabase-helpers] beginOnlineSession lỗi:", e);
  }
}

// Kết thúc phiên online (ẩn tab / logout / rời trang): cộng dồn đúng (now - start) rồi reset.
// Idempotent: gọi trùng (visibilitychange + pagehide + beforeunload) vẫn an toàn.
export async function finalizeOnlineSession(uid) {
  if (!uid) return;
  try {
    const { error } = await supabase.rpc("users_finalize_online", { p_uid: uid });
    if (error) throw error;
  } catch (e) {
    console.error("[supabase-helpers] finalizeOnlineSession lỗi:", e);
  }
}

// Admin: quét user đang online nhưng hết hạn (crash/browser kill) → tự finalize,
// chống báo online ảo trên DB. Chỉ admin mới được chạy (chặn trong function).
export async function cleanupStaleOnline(staleMs = 120000) {
  try {
    const { data, error } = await supabase.rpc("users_cleanup_stale_online", { p_stale_ms: staleMs });
    if (error) throw error;
    return Number(data || 0);
  } catch (e) {
    console.error("[supabase-helpers] cleanupStaleOnline lỗi:", e);
    return 0;
  }
}

// ============================================================================
// GHI LOG LỖI HỆ THỐNG (gộp từ log-errors.js)
// Ghi log lỗi hệ thống lên Supabase (bảng error_logs) qua RPC log_app_error.
// Dùng chung cho mọi trang: login, index (guard), AI (chatbot), test, quiz...
// Cho phép ghi cả trước khi đăng nhập (RPC cấp cho anon).
// Tự dedup: cùng source+category+code+message trong 30s sẽ bỏ qua để tránh spam.
// ============================================================================

const lastKey = {};
const DEDUP_MS = 30000;

export async function logAppError({
  source = "",
  level = "warning",
  category = "feature",
  code = "",
  message = "",
  url = "",
  email = "",
  detail = {}
} = {}) {
  const key = `${source}|${category}|${code}|${message}`;
  const now = Date.now();
  if (lastKey[key] && now - lastKey[key] < DEDUP_MS) return;
  lastKey[key] = now;

  try {
    await supabase.rpc("log_app_error", {
      p_source: String(source || "").slice(0, 60),
      p_level: String(level || "warning").slice(0, 20),
      p_category: String(category || "feature").slice(0, 30),
      p_code: String(code || "").slice(0, 40),
      p_message: String(message || "").slice(0, 600),
      p_url: String(url || (typeof location !== "undefined" ? location.href : "")).slice(0, 300),
      p_email: String(email || "").slice(0, 150),
      p_detail: (detail && typeof detail === "object") ? detail : {}
    });
  } catch (e) {
    console.error("[logAppError] ghi log lỗi thất bại:", e);
  }
}