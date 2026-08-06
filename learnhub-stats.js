// ============================================================================
// LearnHub Stats Module (learnhub-stats.js)
// ----------------------------------------------------------------------------
// Module thao tác Supabase cho thống kê cơ bản.
// Giữ nguyên tên hàm và kiểu trả về để index.html / filetest.html không đổi.
// ============================================================================

import { supabase } from "./supabase-config.js";

function getCurrentWeekKey() {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function nowIso() {
  return new Date().toISOString();
}

// Ghi nhận lần reset tự động đầu tiên của tuần mới (lần reset thứ 2+ trong tuần sẽ bị bỏ qua ở DB)
function recordAutoWeeklyReset(weekKey) {
  supabase.rpc("record_auto_weekly_reset", { p_week_key: weekKey })
    .then(() => {})
    .catch((e) => console.log("[learnhub-stats] Ghi nhận auto reset lỗi:", e));
}

function camelStats(row) {
  if (!row) return null;
  return {
    uid: row.user_id,
    totalTests: Number(row.total_tests || 0),
    totalScore: Number(row.total_score || 0),
    bestScore: Number(row.best_score || 0),
    weekKey: row.week_key ?? null,
    createdAt: row.created_at,
    lastPlayed: row.last_played,
    updatedAt: row.updated_at
  };
}

export async function createUserStats(user) {
  if (!user || !user.uid) return null;

  try {
    const uid = user.uid;
    const currentWeek = getCurrentWeekKey();

    const { data: existing } = await supabase
      .from("test_stats")
      .select("*")
      .eq("user_id", uid)
      .maybeSingle();

    if (existing) {
      const isNewWeek = existing.week_key && existing.week_key !== currentWeek;
      if (isNewWeek) recordAutoWeeklyReset(currentWeek);
      const payload = {
        total_tests: isNewWeek ? 0 : Number(existing.total_tests || 0),
        total_score: isNewWeek ? 0 : Number(existing.total_score || 0),
        best_score: isNewWeek ? 0 : Number(existing.best_score || 0),
        week_key: currentWeek,
        updated_at: nowIso()
      };
      await supabase.from("test_stats").update(payload).eq("user_id", uid);
      return { ...camelStats(existing), ...payload };
    }

    const defaultStats = {
      user_id: uid,
      total_tests: 0,
      total_score: 0,
      best_score: 0,
      week_key: currentWeek,
      created_at: nowIso(),
      last_played: nowIso(),
      updated_at: nowIso()
    };

    await supabase.from("test_stats").insert(defaultStats);
    return camelStats(defaultStats);
  } catch (e) {
    console.log("[learnhub-stats] createUserStats lỗi:", e);
    throw e;
  }
}

export async function updateUserStats(uid, score, options = {}) {
  if (!uid) {
    console.log("[learnhub-stats] updateUserStats: thiếu uid");
    return false;
  }

  const numericScore = Number(score);
  if (!Number.isFinite(numericScore)) {
    console.log("[learnhub-stats] updateUserStats: score không hợp lệ:", score);
    return false;
  }

  // countAsTest=false (chế độ video): chỉ cộng điểm, không tính là "bài đã làm",
  // không đụng best_score (chỉ áp cho điểm bài thi).
  const countAsTest = options.countAsTest !== false;

  try {
    const currentWeek = getCurrentWeekKey();

    const { data: existing } = await supabase
      .from("test_stats")
      .select("*")
      .eq("user_id", uid)
      .maybeSingle();

    const currentData = existing || {};
    const isNewWeek = currentData.week_key && currentData.week_key !== currentWeek;
    if (isNewWeek) recordAutoWeeklyReset(currentWeek);

    const totalTests = (isNewWeek ? 0 : Number(currentData.total_tests || 0)) + (countAsTest ? 1 : 0);
    const totalScore = (isNewWeek ? 0 : Number(currentData.total_score || 0)) + numericScore;
    const bestScore = countAsTest
      ? (isNewWeek ? numericScore : Math.max(Number(currentData.best_score || 0), numericScore))
      : (isNewWeek ? 0 : Number(currentData.best_score || 0));

    const payload = {
      total_tests: totalTests,
      total_score: totalScore,
      best_score: bestScore,
      week_key: currentWeek,
      updated_at: nowIso()
    };
    if (countAsTest) payload.last_played = nowIso();

    if (!existing) {
      payload.created_at = nowIso();
      await supabase.from("test_stats").insert({ user_id: uid, ...payload });
    } else {
      await supabase.from("test_stats").update(payload).eq("user_id", uid);
    }
    return true;
  } catch (e) {
    console.log("[learnhub-stats] updateUserStats lỗi:", e);
    return false;
  }
}

export async function loadUserStats(uid, fallbackUser = null) {
  if (!uid) return null;

  try {
    const { data: userRow } = await supabase
      .from("users")
      .select("*")
      .eq("id", uid)
      .maybeSingle();
    const { data: statsRow } = await supabase
      .from("test_stats")
      .select("*")
      .eq("user_id", uid)
      .maybeSingle();

    if (!userRow && !statsRow && !fallbackUser) {
      return null;
    }

    const u = userRow || {};
    const fb = fallbackUser || {};

    return {
      uid,
      name: u.name ?? fb.name ?? fb.displayName ?? null,
      email: u.email ?? fb.email ?? null,
      photo: u.photo ?? fb.photo ?? fb.photoURL ?? null,
      totalTests: statsRow ? Number(statsRow.total_tests || 0) : 0,
      totalScore: statsRow ? Number(statsRow.total_score || 0) : 0,
      bestScore: statsRow ? Number(statsRow.best_score || 0) : 0,
      weekKey: statsRow ? (statsRow.week_key ?? null) : null
    };
  } catch (e) {
    console.log("[learnhub-stats] loadUserStats lỗi:", e);
    throw e;
  }
}

export async function loadLeaderboard(options = {}) {
  const {
    orderByField = "totalScore",
    limitCount = 10
  } = options;

  try {
    const fieldMap = {
      totalScore: "total_score",
      totalTests: "total_tests",
      bestScore: "best_score"
    };
    const orderField = fieldMap[orderByField] || "total_score";
    const currentWeek = getCurrentWeekKey();

    const { data } = await supabase
      .from("test_stats")
      .select("*")
      .eq("week_key", currentWeek)
      .order(orderField, { ascending: false })
      .limit(limitCount);

    return (data || []).map(camelStats);
  } catch (e) {
    console.log("[learnhub-stats] loadLeaderboard lỗi:", e);
    throw e;
  }
}
