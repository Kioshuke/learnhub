// ============================================================================
// LearnHub Stats Module (learnhub-stats.js)
// ----------------------------------------------------------------------------
// Module thao tác Supabase cho thống kê cơ bản.
// Giữ nguyên tên hàm và kiểu trả về để index.html / cauhoi/filetest.html không đổi.
// ============================================================================

import { supabase } from "../core/supabase-config.js";
import { getWeekKey } from "./week-math.js";

function getCurrentWeekKey() {
  return getWeekKey();
}

function nowIso() {
  return new Date().toISOString();
}

// Ghi nhận lần reset tự động đầu tiên của tuần mới
// FIX: Bây giờ throw error thay vì 묵묵ly bỏ qua, caller phải xử lý
async function recordAutoWeeklyReset(weekKey) {
  try {
    const { error } = await supabase
      .rpc("record_auto_weekly_reset", { p_week_key: weekKey });
    if (error) throw error;
  } catch (e) {
    console.error("[learnhub-stats] Auto weekly reset lỗi:", e);
    throw e;
  }
}

async function resetUserOnlineWeek(uid, weekKey) {
  try {
    const { error } = await supabase.from("users").update({
      online_timer: 0,
      online_start_time: 0,
      online_week_key: weekKey
    }).eq("id", uid)
      .or(`online_week_key.is.null,online_week_key.neq.${weekKey}`);
    if (error) {
      console.error("[learnhub-stats] Reset online week lỗi:", error);
    }
  } catch (error) {
    console.error("[learnhub-stats] Reset online week lỗi:", error);
  }
}

function camelStats(row) {
  if (!row) return null;
  return {
    uid: row.user_id,
    totalTests: Number(row.total_tests || 0),
    totalScore: Number(row.total_score || 0),
    bestScore: Number(row.best_score || 0),
    totalVideos: Number(row.total_videos || 0),
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
      if (isNewWeek) {
        await recordAutoWeeklyReset(currentWeek);
        await resetUserOnlineWeek(uid, currentWeek);
      }
      const payload = {
        total_tests: isNewWeek ? 0 : Number(existing.total_tests || 0),
        total_score: isNewWeek ? 0 : Number(existing.total_score || 0),
        best_score: isNewWeek ? 0 : Number(existing.best_score || 0),
        total_videos: isNewWeek ? 0 : Number(existing.total_videos || 0),
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
      total_videos: 0,
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

  // countAsTest=false (chế độ video): chỉ cộng điểm và tăng số video đã xem,
  // không tính là "bài đã làm", không đụng best_score (chỉ áp cho điểm bài thi).
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
    if (isNewWeek) {
      await recordAutoWeeklyReset(currentWeek);
      await resetUserOnlineWeek(uid, currentWeek);
    }

    const totalTests = (isNewWeek ? 0 : Number(currentData.total_tests || 0)) + (countAsTest ? 1 : 0);
    const totalScore = (isNewWeek ? 0 : Number(currentData.total_score || 0)) + numericScore;
    // Tính totalVideos: 
    // - countAsTest=false (video mode): cộng 1 vào totalVideos mỗi khi xem video trong tuần cùng
    // - countAsTest=true (test mode): không đổi totalVideos (biến này chỉ theo dõi lượt xem video)
    const totalVideos = (isNewWeek ? 0 : Number(currentData.total_videos || 0)) + (countAsTest ? 0 : 1);
    const bestScore = countAsTest
      ? (isNewWeek ? numericScore : Math.max(Number(currentData.best_score || 0), numericScore))
      : (isNewWeek ? 0 : Number(currentData.best_score || 0));

    const payload = {
      total_tests: totalTests,
      total_score: totalScore,
      best_score: bestScore,
      total_videos: totalVideos,
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
      totalVideos: statsRow ? Number(statsRow.total_videos || 0) : 0,
      weekKey: statsRow ? (statsRow.week_key ?? null) : null
    };
  } catch (e) {
    console.log("[learnhub-stats] loadUserStats lỗi:", e);
    throw e;
  }
}

// ============================================================================
// LỊCH SỬ LÀM BÀI (bảng test_attempts) — Giai đoạn 1: chỉ học sinh xem bài mình
// ============================================================================

// Lưu 1 lần nộp bài (kèm snapshot toàn bộ đề + bài làm trong cột paper).
// payload: { testId, subject, name, score, rawScore, maxScore, correctCount,
//            totalQuestions, durationMs, autoSubmitted, paper }
export async function insertTestAttempt(uid, payload = {}) {
  if (!uid) return false;

  const num = (v) => (v === null || v === undefined || v === "" ? null : Number(v));

  // [FIX điểm = 0] Điểm có thể bị thất lạc ở payload ngoài (index.html/iframe cũ không truyền
  // trường 'score'). paper.result.score là nguồn chuẩn nhất vì do chính trang thi ghi khi chấm điểm
  // → ưu tiên dùng; chỉ khi paper không có mới lấy payload.score.
  const paperResult = (payload.paper && payload.paper.result) || {};
  const scoreFromPaper = Number(paperResult.score);
  const finalScore = Number.isFinite(scoreFromPaper) ? scoreFromPaper : (Number(payload.score) || 0);

  try {
    const row = {
      user_id: uid,
      test_id: String(payload.testId || ""),
      subject: String(payload.subject || ""),
      test_name: String(payload.name || ""),
      score: finalScore,
      raw_score: num(payload.rawScore),
      max_score: num(payload.maxScore),
      correct_count: num(payload.correctCount),
      total_questions: num(payload.totalQuestions),
      duration_ms: num(payload.durationMs),
      auto_submitted: !!payload.autoSubmitted,
      paper: payload.paper || {},
      created_at: nowIso()
    };
    const { error } = await supabase.from("test_attempts").insert(row);
    if (error) throw error;
    return true;
  } catch (e) {
    console.log("[learnhub-stats] insertTestAttempt lỗi:", e);
    return false;
  }
}

// Lấy lịch sử gọn theo từng lô để trang hồ sơ có thể nhóm đủ lần nộp theo đề.
// Không kéo toàn bộ paper; chỉ đọc mô tả và thiết lập ẩn điểm từ snapshot.
export async function loadTestAttempts(uid) {
  if (!uid) return [];

  try {
    const rows = [];
    const batchSize = 1000;
    let offset = 0;
    while (true) {
      const { data, error } = await supabase
        .from("test_attempts")
        .select("id,test_id,subject,test_name,score,raw_score,max_score,correct_count,total_questions,duration_ms,auto_submitted,created_at,show_score:paper->meta->>showScore,test_description:paper->meta->>description")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(offset, offset + batchSize - 1);
      if (error) throw error;
      const batch = data || [];
      rows.push(...batch);
      if (batch.length < batchSize) break;
      offset += batch.length;
    }
    return rows;
  } catch (e) {
    console.log("[learnhub-stats] loadTestAttempts lỗi:", e);
    throw e;
  }
}

// Chi tiết 1 lần nộp (kèm paper để dựng lại bài làm).
export async function loadTestAttempt(id) {
  if (!id) return null;

  try {
    const { data, error } = await supabase
      .from("test_attempts")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  } catch (e) {
    console.log("[learnhub-stats] loadTestAttempt lỗi:", e);
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
