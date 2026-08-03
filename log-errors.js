// ============================================================================
// log-errors.js
// ----------------------------------------------------------------------------
// Ghi log lỗi hệ thống lên Supabase (bảng error_logs) qua RPC log_app_error.
// Dùng chung cho mọi trang: login, index (guard), AI (chatbot), test, quiz...
// Cho phép ghi cả trước khi đăng nhập (RPC cấp cho anon).
// Tự dedup: cùng source+category+code+message trong 30s sẽ bỏ qua để tránh spam.
// ============================================================================

import { supabase } from "./supabase-config.js";

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
