// ============================================================================
// LearnHub Stats Module (learnhub-stats.js)
// ----------------------------------------------------------------------------
// Module thao tác Supabase cho LỊCH SỬ LÀM BÀI (bảng test_attempts).
// Thống kê điểm số cá nhân nay tính trực tiếp từ test_attempts qua RPC
// student_performance_stats — không còn bảng đếm sẵn test_stats và không còn
// cơ chế reset theo chu kỳ.
// ============================================================================

import { supabase } from "../core/supabase-config.js";

function nowIso() {
  return new Date().toISOString();
}

// ============================================================================
// LỊCH SỬ LÀM BÀI (bảng test_attempts)
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
