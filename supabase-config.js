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

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

export { SUPABASE_URL };
