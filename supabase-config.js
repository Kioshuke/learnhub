// ============================================================================
// supabase-config.js
// ----------------------------------------------------------------------------
// File DUY NHẤT chịu trách nhiệm khởi tạo Supabase cho toàn bộ hệ thống LearnHub.
//
// Cách dùng:
//   import { supabase } from "./supabase-config.js";
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://hyuzukvxulwouaexatqv.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_cFWEQ0SQuM8SSrOgbkQ8Kg_tJb3Qw9J";

// Client mặc định của web chính — dùng storage key chuẩn của Supabase
// (giữ nguyên session đang có của user trên web chính).
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Tạo client với storage key riêng — dùng để tách session độc lập
// (vd: admin-dashboard dùng storageKey "learnhub-admin-auth" để không
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
