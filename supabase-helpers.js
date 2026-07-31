// ============================================================================
// supabase-helpers.js
// ----------------------------------------------------------------------------
// Các hàm dùng chung cho mọi trang LearnHub sau khi migrate sang Supabase:
// maintenance (get + realtime), whitelist email, session, đồng bộ hồ sơ,
// nhận lại dữ liệu cũ (claim_legacy_data).
// ============================================================================

import { supabase } from "./supabase-config.js";

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
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

export async function emailAllowed(email) {
  if (!email) return false;
  try {
    const { data, error } = await supabase.rpc("is_email_allowed", {
      p_email: email
    });
    if (error) throw error;
    return data === true;
  } catch (e) {
    console.error("[supabase-helpers] emailAllowed lỗi:", e);
    return false;
  }
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

// Sau khi đăng nhập: nhận lại dữ liệu Firebase cũ (nếu có) + cập nhật hồ sơ.
export async function finalizeSession(user) {
  if (!user || !user.id) return null;
  const email = user.email;
  const nowIso = new Date().toISOString();

  try {
    await supabase.rpc("claim_legacy_data", { p_email: email });
  } catch (e) {
    console.warn("[supabase-helpers] claim_legacy_data:", e);
  }

  const patch = {
    last_login: nowIso,
    last_active: Date.now(),
    online: true
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

  try {
    const { error } = await supabase
      .from("users")
      .upsert({ id: user.id, email, ...patch }, { onConflict: "id" });
    if (error) throw error;
  } catch (e) {
    console.error("[supabase-helpers] finalizeSession upsert lỗi:", e);
  }

  return { ...user, name, photo };
}
