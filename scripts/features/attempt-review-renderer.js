import { escapeHtml, escapeUrl } from "../core/supabase-config.js";

function formatDateTime(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function formatDurationMs(ms) {
  const n = Number(ms); if (!Number.isFinite(n) || n <= 0) return "";
  const total = Math.round(n / 1000), h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  if (h > 0) return `${h}g ${m}p`; if (m > 0) return `${m}p ${s}s`; return `${s}s`;
}
function attemptScoreStyle(score) {
  const s = Number(score); if (s >= 8) return { bg: "rgba(16,185,129,.14)", fg: "#059669" };
  if (s >= 5) return { bg: "rgba(245,158,11,.16)", fg: "#d97706" }; return { bg: "rgba(239,68,68,.12)", fg: "#dc2626" };
}
function answerTextOf(ans) {
  if (ans == null) return ""; if (typeof ans === "string") return ans;
  if (typeof ans === "object") return String(ans.text ?? ans.content ?? ans.value ?? ""); return String(ans);
}
function imgUrlOf(value) {
  if (!value) return ""; if (typeof value === "string") return escapeUrl(value) || "";
  if (typeof value === "object") return escapeUrl(value.url || value.src || "") || ""; return "";
}
function audioListHtml(audio) {
  if (!audio) return ""; const tracks = Array.isArray(audio) ? audio : [audio];
  return tracks.map((track) => {
    const url = escapeUrl(typeof track === "string" ? track : (track && track.url) || ""); if (!url) return "";
    const label = typeof track === "string" ? "" : (track.title || "");
    return `<div style="margin:6px 0;">${label ? `<div style="font-size:.78rem;font-weight:600;color:var(--text-sub);margin-bottom:4px;">${escapeHtml(label)}</div>` : ""}<audio controls preload="none" style="width:100%;height:42px"><source src="${url}" type="audio/mpeg"></audio></div>`;
  }).join("");
}
function miniStat(label, value, color, bg) {
  return `<div class="lh-stat p-2.5" style="background:${bg};border-color:transparent"><div class="text-[10px] font-bold uppercase tracking-wider" style="color:${color}">${escapeHtml(label)}</div><div class="text-sm font-extrabold mt-0.5" style="color:${color}">${escapeHtml(value)}</div></div>`;
}
        // Sanitize rich-text cho sectionDesc (giữ <b>/<i>/<u>... như trang quiz, gỡ thẻ lạ + mọi attribute)
        const SAFE_TEXT_TAGS = ["b", "i", "u", "em", "strong", "br", "span", "code"];
        function sanitizeHtml(html) {
            const body = new DOMParser().parseFromString(String(html || ""), "text/html").body;
            (function clean(parent) {
                Array.from(parent.children).forEach(function (el) {
                    const tag = el.tagName.toLowerCase();
                    if (SAFE_TEXT_TAGS.indexOf(tag) === -1) {
                        clean(el);
                        el.replaceWith(...el.childNodes);
                    } else {
                        Array.from(el.attributes).forEach(function (a) { el.removeAttribute(a.name); });
                        clean(el);
                    }
                });
            })(body);
            return body.innerHTML;
        }

        function renderOptionsHtml(answers, chosenIdx, correctIdx, canReveal) {
            const list = Array.isArray(answers) ? answers : [];
            if (!list.length) return "";
            return `<div class="answers-grid">` + list.map((ans, idx) => {
                const isCorrect = idx === Number(correctIdx);
                const isChosen = chosenIdx !== null && chosenIdx !== undefined && idx === Number(chosenIdx);
                let cls = "ans-label";
                if (canReveal) {
                    if (isCorrect) cls += " true-answer-highlight";
                    else if (isChosen) cls += " review-wrong";
                } else if (isChosen) {
                    cls += " selected";
                }
                const imgUrl = imgUrlOf(ans);
                const innerHtml = imgUrl
                    ? `<img class="ans-img" src="${imgUrl}" alt="Đáp án ${String.fromCharCode(65 + idx)}" loading="lazy" onerror="this.style.display='none'">`
                    : `<span>${sanitizeHtml(answerTextOf(ans))}</span>`;
                return `<div class="${cls}"><input type="radio" disabled ${isChosen ? "checked" : ""}>${innerHtml}</div>`;
            }).join("") + `</div>`;
        }

        function renderQuestionHtml(q, qNo, canReveal) {
            const type = q.type || "multiple";
            const idx = qNo - 1;
            let title = q.title || "";
            if (!title) {
                if (type === "passage") title = "Đọc đoạn văn và trả lời các câu hỏi bên dưới";
                else if (type === "cloze") title = "Điền từ thích hợp vào chỗ trống";
                else if (type === "short_answer") title = "Tự luận";
                else if (type === "true_false") title = q.question || "Đúng hay Sai";
                else title = q.question || "";
            }

            let inner = "";
            const imgUrl = imgUrlOf(q.image);
            if (imgUrl) inner += `<div class="q-image" style="text-align:center;margin:10px 0;"><img src="${imgUrl}" alt="" onerror="this.parentElement.style.display='none'" style="max-width:100%;max-height:250px;border-radius:10px;"></div>`;
            // Đề bài riêng (khi câu vừa có title vừa có question) hiển thị ở thân card — giống trang quiz
            if (q.title && q.question && q.question !== q.title) {
                inner += `<div style="margin-bottom:12px;font-size:0.95rem;line-height:1.6;font-weight:600;color:var(--text);">${sanitizeHtml(q.question)}</div>`;
            }

            let ok = null; // true/false khi xác định được, null khi ẩn đáp án

            if (type === "multiple") {
                const chosen = q.chosen === null || q.chosen === undefined ? null : Number(q.chosen);
                if (chosen !== null) ok = chosen === Number(q.correct);
                inner += renderOptionsHtml(q.answers, q.chosen, q.correct, canReveal);
            } else if (type === "true_false") {
                const subs = Array.isArray(q.subQuestions) ? q.subQuestions : [];
                const chosenArr = Array.isArray(q.chosen) ? q.chosen : [];
                let allOk = true;
                const optStyle = "cursor:pointer;display:flex;align-items:center;gap:3px;background:transparent;padding:4px 10px;border-radius:6px;border:1.2px solid var(--tf-border);font-size:0.85rem;";
                inner += `<div class="tf-wrapper" style="background:var(--card);border:1px solid var(--tf-border);border-radius:10px;overflow:hidden;">` + subs.map((sub, i) => {
                    const has = chosenArr[i] !== null && chosenArr[i] !== undefined;
                    const userVal = has ? Number(chosenArr[i]) : null;
                    const correctVal = Number(sub.correct);
                    const subOk = has && userVal === correctVal;
                    if (!subOk) allOk = false;
                    const bg = canReveal ? `background:${subOk ? "var(--success-light)" : "var(--danger-light)"};` : "";
                    const tip = canReveal ? `<span class="tf-answer-tip ${subOk ? "true-text" : "false-text"}"> (Đáp án: ${correctVal === 1 ? "Đúng" : "Sai"})</span>` : "";
                    return `<div class="tf-row" style="display:flex;align-items:center;justify-content:space-between;padding:10px;border-bottom:1px solid var(--tf-border);gap:10px;${bg}">
                        <div class="tf-question-text" style="flex:1;font-size:0.9rem;"><strong style="color:var(--primary)">${String.fromCharCode(97 + i)}.</strong> <span>${sanitizeHtml(sub.text || "")}</span>${tip}</div>
                        <div class="tf-options" style="display:flex;gap:5px;flex-shrink:0;">
                            <label style="${optStyle}"><input type="radio" disabled ${userVal === 1 ? "checked" : ""}> <b>Đ</b></label>
                            <label style="${optStyle}"><input type="radio" disabled ${userVal === 0 ? "checked" : ""}> <b>S</b></label>
                        </div>
                    </div>`;
                }).join("") + `</div>`;
                if (canReveal) ok = allOk;
            } else if (type === "short_answer") {
                const chosen = q.chosen == null ? "" : String(q.chosen);
                const correct = q.correctAnswer == null ? "" : String(q.correctAnswer);
                const subOk = chosen.trim().toLowerCase() === correct.trim().toLowerCase();
                const border = canReveal ? (subOk ? "var(--success)" : "var(--danger)") : "#e2e8f0";
                inner += `<textarea class="short-input writing-input" disabled rows="${q.rows || 3}" style="width:100%;box-sizing:border-box;padding:12px;border:2px solid ${border};border-radius:10px;outline:none;font-size:0.95rem;resize:vertical;font-family:inherit;line-height:1.6;color:var(--text);background:var(--card);">${escapeHtml(chosen)}</textarea>`;
                if (canReveal) {
                    ok = subOk;
                    inner += `<div class="true-text" style="margin-top:10px;">✓ Đáp án chuẩn: ${sanitizeHtml(correct)}</div>`;
                }
            } else if (type === "passage") {
                const subs = Array.isArray(q.subQuestions) ? q.subQuestions : [];
                const chosenArr = Array.isArray(q.chosen) ? q.chosen : [];
                let allOk = true;
                const subsHtml = subs.map((sub, i) => {
                    const chosen = chosenArr[i] === null || chosenArr[i] === undefined ? null : Number(chosenArr[i]);
                    const subOk = chosen !== null && chosen === Number(sub.correct);
                    if (!subOk) allOk = false;
                    const border = canReveal ? ` style="border-color:${subOk ? "var(--success)" : "var(--danger)"};"` : "";
                    return `<div class="sub-q-block"${border}>
                        <div class="sub-q-text" style="font-weight:600;font-size:0.92rem;margin-bottom:10px;"><strong style="color:var(--primary)">${String.fromCharCode(97 + i)}.</strong> ${sanitizeHtml(sub.question || "")}</div>
                        ${renderOptionsHtml(sub.answers, chosenArr[i], sub.correct, canReveal)}
                    </div>`;
                }).join("");
                const passageContent = q.passage ? `<div class="passage-left"><div class="passage-left-inner">${sanitizeHtml(q.passage)}</div></div>` : "";
                inner += `<div class="passage-layout">${passageContent}<div class="passage-right sub-questions">${subsHtml}</div></div>`;
                if (canReveal) ok = allOk;
            } else if (type === "cloze") {
                const chosenArr = Array.isArray(q.chosen) ? q.chosen : [];
                const blanks = Array.isArray(q.blanks) ? q.blanks : [];
                let allOk = true;
                let text = sanitizeHtml(String(q.question || ""));
                text = text.replace(/\{\{(\d+)\}\}/g, (m, n) => {
                    const i = parseInt(n, 10) - 1;
                    const val = chosenArr[i];
                    const correctVal = blanks[i] === undefined ? "" : String(blanks[i]);
                    const has = val !== undefined && val !== null && String(val).trim() !== "";
                    const subOk = has && String(val).trim().toLowerCase() === correctVal.trim().toLowerCase();
                    if (!subOk) allOk = false;
                    const w = Math.max(80, ((correctVal.length || (has ? String(val).length : 0) || 8)) * 10);
                    const style = canReveal
                        ? `border-color:${subOk ? "var(--success)" : "var(--danger)"};background:${subOk ? "var(--success-light)" : "var(--danger-light)"};`
                        : "";
                    let out = `<input type="text" class="cloze-input short-input" disabled value="${has ? escapeHtml(String(val)) : ""}" style="width:${w}px;min-width:80px;box-sizing:border-box;padding:6px 8px;border:2px solid #e2e8f0;border-radius:8px;font-size:0.9rem;text-align:center;${style}">`;
                    if (canReveal && !subOk) out += `<span class="cloze-answer-tip true-text" style="margin-left:6px;font-size:0.8rem;">(${sanitizeHtml(correctVal)})</span>`;
                    return out;
                });
                if (canReveal) ok = allOk;
                inner += `<div style="background:var(--card);padding:14px;border-radius:10px;border:1px solid var(--tf-border);line-height:2.1;font-size:1rem;color:var(--text);">${text}</div>`;
            }

            let cardCls = "question-card";
            if (canReveal && ok !== null) cardCls += ok ? " review-true" : " review-false";
            const html = `<div class="${cardCls}" id="card-${idx}" style="margin-bottom:20px;padding:15px;">
                <div class="q-header" style="margin-bottom:12px;font-size:0.95rem;">
                    <span class="q-badge" style="background:var(--primary);color:white;padding:2px 8px;border-radius:15px;font-size:0.75rem;font-weight:bold;margin-right:5px;">Câu ${qNo}</span> 
                    <span>${sanitizeHtml(title)}</span>
                </div>
                ${inner}
            </div>`;
            return { html, ok: canReveal ? ok : null };
        }

        export function renderAttemptDetail(a, studentName = "") {
            const paper = (a && a.paper) || {};
            const meta = paper.meta || {};
            const result = paper.result || {};
            const sections = Array.isArray(paper.sections) ? paper.sections : [];

            const showAnswers = meta.showAnswers || "always";
            const showScore = meta.showScore || "always";
            const scoreHidden = String(showScore).toLowerCase() === "none";
            const score = Number(result.score != null ? result.score : (a.score || 0));
            const canReveal = showAnswers === "always" || (showAnswers === "perfect" && score >= 10);

            const st = scoreHidden ? { bg: "rgba(148,163,184,.14)", fg: "#64748b" } : attemptScoreStyle(score);
            const dur = formatDurationMs(result.durationMs != null ? result.durationMs : a.duration_ms);
            const correct = result.correctCount != null ? result.correctCount : (a.correct_count ?? 0);
            const total = result.totalQuestions != null ? result.totalQuestions : (a.total_questions ?? 0);
            const autoSub = result.autoSubmitted != null ? result.autoSubmitted : a.auto_submitted;
            const title = meta.name || a.test_name || "Bài kiểm tra";
            const subject = meta.subject || a.subject || "";
            const maxScore = meta.maxScore != null ? meta.maxScore : (a.max_score ?? 10);

            let qNo = 0;
            let body = "";
            let nav = "";
            if (sections.length) {
                sections.forEach((sec) => {
                    // Tiêu đề phần — inline giống hệt trang quiz
                    if (sec.sectionTitle) {
                        nav += `<div class="nav-section-label" style="grid-column:1/-1;font-weight:bold;margin:10px 0 5px;font-size:0.7rem;color:#64748b;text-transform:uppercase;">${escapeHtml(sec.sectionTitle)}</div>`;
                        const descHtml = (sec.sectionDesc && String(sec.sectionDesc).trim() !== "")
                            ? `<div style="margin-top:4px;font-size:0.78rem;color:var(--text-sub);font-weight:normal;font-style:italic;line-height:1.4;">${sanitizeHtml(sec.sectionDesc)}</div>`
                            : "";
                        body += `<div style="margin:25px 0 15px;padding:12px 15px;background:#eff6ff;color:#1a73e8;border-radius:8px;border-left:5px solid #1a73e8;">
                            <div style="font-weight:bold;text-transform:uppercase;font-size:0.95rem;display:block !important;">${escapeHtml(sec.sectionTitle)}</div>
                            ${descHtml}
                        </div>`;
                    }
                    if (sec.passage && sec.type !== "passage") {
                        body += `<div style="background:var(--card);padding:14px 18px;border-radius:12px;border:1px solid var(--tf-border);line-height:1.75;margin-bottom:14px;color:var(--text);">${sanitizeHtml(sec.passage)}</div>`;
                    }
                    const aHtml = audioListHtml(sec.audio);
                    if (aHtml) {
                        body += `<div style="background:var(--primary-light);border:1px solid var(--primary);border-radius:12px;padding:12px;margin-bottom:14px;">
                            <div style="font-weight:700;color:var(--primary);margin-bottom:8px;display:flex;align-items:center;gap:6px;"><i class="fas fa-headphones"></i> Phần Nghe${sec.listenTitle ? " · " + escapeHtml(sec.listenTitle) : ""}</div>
                            ${aHtml}
                        </div>`;
                    }
                    (sec.questions || []).forEach((q) => {
                        const r = renderQuestionHtml(q, qNo + 1, canReveal);
                        body += r.html;
                        const navStyle = (r.ok === null) ? "" : ` style="background:${r.ok ? "var(--success)" : "var(--danger)"};color:white;"`;
                        nav += `<div class="nav-item" id="nav-${qNo}" onclick="scrollToQuestion(${qNo})"${navStyle}>${qNo + 1}</div>`;
                        qNo++;
                    });
                });
            } else {
                body = `<p class="at-empty-note">Không có dữ liệu bài làm chi tiết cho lần nộp này.</p>`;
            }

            const progressHtml = scoreHidden
                ? `<span id="progressText" style="color:var(--primary);font-size:0.9rem;">Đã nộp bài</span>`
                : `<span id="progressText" style="color:var(--success);font-size:0.9rem;">${score.toFixed(2)} / ${maxScore}</span>`;

            return `<div class="space-y-3">
                <div class="lh-card p-4 sm:p-5 space-y-3">
                    <div class="flex items-center gap-3">
                        <button id="attempt-back" type="button" class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors" style="background:#f1f5f9;color:#475569" title="Quay lại"><i class="fas fa-arrow-left"></i></button>
                        <div style="flex:1;min-width:0">
                            <h3 class="text-base sm:text-lg font-extrabold truncate" style="color:var(--text-main)">${escapeHtml(title)}</h3>
                            <p class="text-xs font-semibold truncate" style="color:var(--text-sub)">${escapeHtml(studentName)} · ${subject ? escapeHtml(subject) + " · " : ""}${formatDateTime(a.created_at)}</p>
                        </div>
                        ${scoreHidden ? "" : `<div class="attempt-score" style="background:${st.bg};color:${st.fg};min-width:56px;font-size:20px">${score}</div>`}
                    </div>
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        ${miniStat("Đúng", scoreHidden ? "Ẩn" : `${correct}/${total}`, "#2563eb", "rgba(37,99,235,.08)")}
                        ${miniStat("Thời gian", dur || "—", "#8b5cf6", "rgba(139,92,246,.08)")}
                        ${miniStat("Thang điểm", String(maxScore), "#f59e0b", "rgba(245,158,11,.1)")}
                        ${miniStat("Trạng thái", autoSub ? "Tự động nộp" : "Đã nộp", autoSub ? "#ef4444" : "#10b981", autoSub ? "rgba(239,68,68,.08)" : "rgba(16,185,129,.08)")}
                    </div>
                    ${canReveal ? "" : `<div class="at-notice"><i class="fas fa-lock"></i> Đề này không cho phép xem đáp án chi tiết${showAnswers === "perfect" ? " (chỉ mở khi đạt điểm tối đa)" : ""}.</div>`}
                </div>
                <div class="main-layout">
                    <div class="quiz-section quiz-locked" id="quiz-container">${body}</div>
                    <aside class="sidebar" id="sidebarNav">
                        <div class="sidebar-header"><span>MỤC LỤC</span>${progressHtml}</div>
                        <div class="nav-grid" id="navGrid">${nav}</div>
                    </aside>
                </div>
            </div>
            <button class="mobile-nav-btn" onclick="toggleSidebar()"><i class="fa-solid fa-list"></i></button>
            <div id="sidebarOverlay" onclick="toggleSidebar()" style="display:none;position:fixed;inset:0;background:rgba(15,23,42,0.7);z-index:2050;"></div>`;
        }


