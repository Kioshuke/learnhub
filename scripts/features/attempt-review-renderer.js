import { esc, renderQuizHtml } from "./quiz-render.js";

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
  });
}

function formatDurationMs(value) {
  const milliseconds = Number(value);
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return "";
  const totalSeconds = Math.round(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}g ${minutes}p`;
  if (minutes > 0) return `${minutes}p ${seconds}s`;
  return `${seconds}s`;
}

function miniStat(label, value, color, background) {
  return `<div class="lh-stat p-2.5" style="background:${background};border-color:transparent"><div class="text-[10px] font-bold uppercase tracking-wider" style="color:${color}">${esc(label)}</div><div class="text-sm font-extrabold mt-0.5" style="color:${color}">${esc(value)}</div></div>`;
}

function countTestQuestions(sections) {
  const list = Array.isArray(sections) ? sections : [];
  return list.reduce((total, section) => total + (Array.isArray(section && section.questions) ? section.questions.length : 0), 0);
}

// [Xem chi tiết bài] — Dựng giao diện xem chi tiết 1 bài kiểm tra (không có kết quả nộp).
// Dùng cho giáo viên/Admin mở đề theo UUID (?de=t:<uuid>) để xem trước nội dung đề.
export function renderTestDetail(test = {}, options = {}) {
  const subject = String((test && test.subject) || "");
  const name = String((test && test.name) || "Bài kiểm tra");
  const description = String((test && test.description) || "");
  const maxScore = Number((test && test.score) > 0 ? test.score : 10) || 10;
  const minutes = Math.max(0, Number((test && test.minutes) || 0) || 0);
  const sections = Array.isArray(test && test.content) ? test.content : [];
  const showAnswers = String((test && test.show_answers) || "always");
  const canReveal = showAnswers !== "none";
  const rendered = renderQuizHtml(sections, { mode: "preview", canReveal });
  const questionCount = countTestQuestions(sections);
  const duration = minutes > 0 ? `${minutes} phút` : "Không giới hạn";

  return `<div class="review-content">
    <div class="main-layout">
      <div class="quiz-section review-question-column">
        <div class="lh-card review-summary-card p-4 sm:p-5 space-y-3">
      <div class="flex items-center gap-3">
        <button id="attempt-back" type="button" class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors" style="padding:0" title="Quay lại"><i class="fas fa-arrow-left"></i></button>
        <div style="flex:1;min-width:0">
          <h3 class="text-base sm:text-lg font-extrabold truncate" style="color:var(--text)">${esc(name)}</h3>
          <p class="text-xs font-semibold truncate" style="color:var(--text-sub)">${subject ? `${esc(subject)} · ` : ""}${questionCount} câu · ${duration}</p>
        </div>
      </div>
      ${description ? `<p class="text-sm leading-relaxed" style="color:var(--text-sub)">${esc(description)}</p>` : ""}
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
        ${miniStat("Số câu", String(questionCount), "#2563eb", "rgba(37,99,235,.08)")}
        ${miniStat("Thời gian", duration, "#8b5cf6", "rgba(139,92,246,.08)")}
        ${miniStat("Điểm tối đa", String(maxScore), "#f59e0b", "rgba(245,158,11,.1)")}
        ${miniStat("Đáp án", canReveal ? "Hiện" : "Ẩn", "#10b981", "rgba(16,185,129,.08)")}
      </div>
        </div>
        <div class="quiz-locked" id="quiz-container">${rendered.html}</div>
      </div>
      <aside class="sidebar" id="sidebarNav">
        <div class="sidebar-header"><span>MỤC LỤC</span></div>
        <div class="nav-grid" id="navGrid">${rendered.navHtml}</div>
      </aside>
    </div>
  </div>
  <button class="mobile-nav-btn" onclick="toggleSidebar()"><i class="fa-solid fa-list"></i></button>
  <div id="sidebarOverlay" onclick="toggleSidebar()" style="display:none;position:fixed;inset:0;background:rgba(15,23,42,.7);z-index:2050"></div>`;
}

export function renderAttemptDetail(attempt, studentName = "") {
  const paper = (attempt && attempt.paper) || {};
  const meta = paper.meta || {};
  const result = paper.result || {};
  const sections = Array.isArray(paper.sections) ? paper.sections : [];
  const showAnswers = meta.showAnswers || "always";
  const showScore = meta.showScore || "always";
  const scoreHidden = String(showScore).toLowerCase() === "none";
  const score = Number(result.score != null ? result.score : (attempt.score || 0));
  const canReveal = showAnswers === "always" || (showAnswers === "perfect" && score >= 10);
  const duration = formatDurationMs(result.durationMs != null ? result.durationMs : attempt.duration_ms);
  const correct = result.correctCount != null ? result.correctCount : (attempt.correct_count ?? 0);
  const total = result.totalQuestions != null ? result.totalQuestions : (attempt.total_questions ?? 0);
  const autoSubmitted = result.autoSubmitted != null ? result.autoSubmitted : attempt.auto_submitted;
  const title = meta.name || attempt.test_name || "Bài kiểm tra";
  const subject = meta.subject || attempt.subject || "";
  const maxScore = meta.maxScore != null ? meta.maxScore : (attempt.max_score ?? 10);
  const rendered = renderQuizHtml(sections, { mode: "review", canReveal });
  const scoreStyle = score >= 8
    ? { bg: "rgba(16,185,129,.14)", fg: "#059669" }
    : score >= 5
      ? { bg: "rgba(245,158,11,.16)", fg: "#d97706" }
      : { bg: "rgba(239,68,68,.12)", fg: "#dc2626" };
  const displayedScore = Number.isFinite(score) ? score.toFixed(2) : "0.00";
  const progress = scoreHidden
    ? `<span id="progressText" style="color:var(--primary);font-size:.9rem">Đã nộp bài</span>`
    : `<span id="progressText" style="color:var(--success);font-size:.9rem">${displayedScore} / 10</span>`;

  return `<div class="review-content">
    <div class="main-layout">
      <div class="quiz-section review-question-column">
        <div class="lh-card review-summary-card p-4 sm:p-5 space-y-3">
      <div class="flex items-center gap-3">
        <button id="attempt-back" type="button" class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors" style="padding:0" title="Quay lại"><i class="fas fa-arrow-left"></i></button>
        <div style="flex:1;min-width:0">
          <h3 class="text-base sm:text-lg font-extrabold truncate" style="color:var(--text)">${esc(title)}</h3>
          <p class="text-xs font-semibold truncate" style="color:var(--text-sub)">${esc(studentName)} · ${subject ? `${esc(subject)} · ` : ""}${formatDateTime(attempt.created_at)}</p>
        </div>
        ${scoreHidden ? "" : `<div class="attempt-score" style="background:${scoreStyle.bg};color:${scoreStyle.fg};min-width:56px;font-size:20px">${displayedScore}</div>`}
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
        ${miniStat("Đúng", scoreHidden ? "Ẩn" : `${correct}/${total}`, "#2563eb", "rgba(37,99,235,.08)")}
        ${miniStat("Thời gian", duration || "—", "#8b5cf6", "rgba(139,92,246,.08)")}
        ${miniStat("Thang điểm", String(maxScore), "#f59e0b", "rgba(245,158,11,.1)")}
        ${miniStat("Trạng thái", autoSubmitted ? "Tự động nộp" : "Đã nộp", autoSubmitted ? "#ef4444" : "#10b981", autoSubmitted ? "rgba(239,68,68,.08)" : "rgba(16,185,129,.08)")}
      </div>
      ${canReveal ? "" : `<div class="at-notice"><i class="fas fa-lock"></i> Đề này không cho phép xem đáp án chi tiết${showAnswers === "perfect" ? " (chỉ mở khi đạt điểm tối đa)" : ""}.</div>`}
        </div>
        <div class="quiz-locked" id="quiz-container">${rendered.html}</div>
      </div>
      <aside class="sidebar" id="sidebarNav">
        <div class="sidebar-header"><span>MỤC LỤC</span>${progress}</div>
        <div class="nav-grid" id="navGrid">${rendered.navHtml}</div>
      </aside>
    </div>
  </div>
  <button class="mobile-nav-btn" onclick="toggleSidebar()"><i class="fa-solid fa-list"></i></button>
  <div id="sidebarOverlay" onclick="toggleSidebar()" style="display:none;position:fixed;inset:0;background:rgba(15,23,42,.7);z-index:2050"></div>`;
}

