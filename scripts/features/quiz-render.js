const SAFE_TEXT_TAGS = ["b", "i", "u", "em", "strong", "br", "span", "code"];

export function esc(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

export function safeUrl(value) {
  const url = String(value || "").trim();
  return /^https?:\/\//i.test(url) ? url : "";
}

export function sanitizeHtml(html) {
  const body = new DOMParser().parseFromString(String(html || ""), "text/html").body;
  (function clean(parent) {
    Array.from(parent.children).forEach((element) => {
      const tag = element.tagName.toLowerCase();
      if (!SAFE_TEXT_TAGS.includes(tag)) {
        clean(element);
        element.replaceWith(...element.childNodes);
      } else {
        Array.from(element.attributes).forEach((attribute) => element.removeAttribute(attribute.name));
        clean(element);
      }
    });
  })(body);
  return body.innerHTML;
}

export function normalizeImageUrl(value) {
  const url = String(value == null ? "" : value).trim().replace(/[.,;]+$/, "");
  const drive = url.match(/^https?:\/\/(?:drive|docs)\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:[^#]*&)?id=)([^/?#&]+)/i);
  return drive ? `https://drive.google.com/thumbnail?id=${drive[1]}&sz=w1200` : url;
}

export function isImageUrl(value) {
  const url = normalizeImageUrl(value);
  if (!/^https?:\/\//i.test(url)) return false;
  return /\.(?:jpe?g|png|webp|gif|avif|svg)(?:[?#][^\s]*)?$/i.test(url)
    || /^https?:\/\/(?:placehold\.co|picsum\.photos|images\.unsplash\.com)\//i.test(url)
    || /^https?:\/\/lh3\.googleusercontent\.com\/d\/[^/?#]+/i.test(url)
    || /^https?:\/\/drive\.google\.com\/thumbnail\?[^#]*\bid=/i.test(url)
    || /^https?:\/\/[^/]*googleusercontent\.com\//i.test(url);
}

const IMG_MARKER_SRC = "(?:ảnh(?:\\s*minh\\s*họa)?|hình(?:\\s*ảnh)?|link\\s*ảnh|image|img)";

export function extractImageMarker(value) {
  const source = String(value == null ? "" : value);
  const expression = new RegExp("(?:^|[\\s;,(?!])(" + IMG_MARKER_SRC + "\\s*[:：]\\s*(https?:\\/\\/[^\\s<>\"']+))", "i");
  const match = expression.exec(source);
  if (!match) return null;
  const url = safeUrl(normalizeImageUrl(match[2]));
  if (!url) return null;
  const text = (source.slice(0, match.index) + " " + source.slice(match.index + match[0].length)).replace(/\s+/g, " ").trim();
  return { text, url };
}

export function imageFieldUrl(value) {
  const source = String(value == null ? "" : value).trim();
  if (!source) return "";
  const marker = extractImageMarker(source);
  return safeUrl(normalizeImageUrl(marker && !marker.text ? marker.url : source));
}

function answerText(answer) {
  if (answer == null) return "";
  if (typeof answer === "string") return answer;
  if (typeof answer === "object") return String(answer.text ?? answer.content ?? answer.value ?? "");
  return String(answer);
}

export function answerImageUrl(answer) {
  let text = answerText(answer).replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
  text = text.replace(/^([A-Za-z])\s*[.、)]\s+/, "");
  const marker = text.match(new RegExp("^" + IMG_MARKER_SRC + "\\s*[:：]\\s*(https?:\\/\\/\\S+)\\s*$", "i"));
  if (marker) return safeUrl(normalizeImageUrl(marker[1]));
  const url = normalizeImageUrl(text.replace(/[.,;]+$/, ""));
  return isImageUrl(url) ? safeUrl(url) : "";
}

export function answerInnerHtml(answer, index) {
  const url = answerImageUrl(answer);
  return url
    ? `<img class="ans-img" src="${esc(url)}" alt="Đáp án ${String.fromCharCode(65 + index)}" loading="lazy" onerror="this.style.display='none'">`
    : `<span>${sanitizeHtml(answerText(answer))}</span>`;
}

function sectionTitleHtml(section) {
  if (!section.sectionTitle) return "";
  const description = String(section.sectionDesc || "").trim();
  return `<div class="quiz-section-title"><div class="quiz-section-title-text">${esc(section.sectionTitle)}</div>${description ? `<div class="quiz-section-description">${sanitizeHtml(description)}</div>` : ""}</div>`;
}

function sectionAudioHtml(section) {
  const audio = section.audio;
  if (!audio || !(section.type === "listening" || String(audio).length > 0)) return "";
  const tracks = Array.isArray(audio) ? audio : [audio];
  const players = tracks.map((track, index) => {
    const url = safeUrl(typeof track === "string" ? track : track && track.url);
    if (!url) return "";
    const label = typeof track === "string"
      ? (tracks.length > 1 ? `Bài nghe ${index + 1}` : "")
      : (track.title || (tracks.length > 1 ? `Bài nghe ${index + 1}` : ""));
    return `<div class="listening-track">${label ? `<div class="listening-track-title">${esc(label)}</div>` : ""}<audio data-src="${esc(url)}" controls preload="none"><source src="${esc(url)}" type="audio/mpeg"></audio></div>`;
  }).join("");
  if (!players) return "";
  return `<div class="listening-player"><div class="listening-player-heading"><span class="listening-badge"><i class="fa-solid fa-headphones"></i> Phần Nghe</span><span>${esc(section.listenTitle || "Bấm play, nghe và trả lời các câu hỏi bên dưới")}</span></div>${players}</div>`;
}

function optionsHtml({ answers, chosen, correct, mode, canReveal, questionIndex, subIndex, prefix = "" }) {
  const list = Array.isArray(answers) ? answers : [];
  let isCorrect = false;
  const html = `<div class="answers-grid">${list.map((answer, answerIndex) => {
    const selected = mode === "review" && chosen != null && Number(chosen) === answerIndex;
    const correctAnswer = Number(correct) === answerIndex;
    if (selected && correctAnswer) isCorrect = true;
    let classes = "ans-label";
    if (selected) classes += " selected";
    if (mode === "review" && canReveal && correctAnswer) classes += " true-answer-highlight";
    if (mode === "review" && canReveal && selected && !correctAnswer) classes += " review-wrong";
    const name = subIndex == null ? `question-${questionIndex}` : `q-${questionIndex}-${subIndex}`;
    const onclick = mode === "take"
      ? ` onclick="selectAnswer(this, ${questionIndex}${subIndex == null ? "" : `, ${subIndex}`})"`
      : "";
    return `<label class="${classes}" id="label-${questionIndex}${subIndex == null ? "" : `-${subIndex}`}-${answerIndex}"${onclick}><input type="radio" name="${name}" value="${answerIndex}"${selected ? " checked" : ""}${mode === "review" ? " disabled" : ""}>${prefix ? `<span class="ans-prefix">${esc(prefix(answerIndex))}</span>` : ""}${answerInnerHtml(answer, answerIndex)}</label>`;
  }).join("")}</div>`;
  return { html, result: mode === "review" && canReveal ? isCorrect : null };
}

function renderQuestion(question, questionIndex, { mode, canReveal }) {
  const type = question.type || "multiple";
  const marker = extractImageMarker(question.question);
  const questionText = marker ? marker.text : String(question.question || "");
  const imageUrl = imageFieldUrl(question.image) || (marker ? marker.url : "");
  const imageHtml = imageUrl ? `<div class="q-image"><img src="${esc(imageUrl)}" alt="" loading="lazy" onerror="this.parentElement.style.display='none'"></div>` : "";
  const heading = question.title || (type === "passage" ? "Đọc đoạn văn và trả lời các câu hỏi bên dưới" : type === "cloze" ? "Điền từ thích hợp vào chỗ trống" : type === "short_answer" ? "Tự luận" : questionText || "");
  let content = "";
  let result = null;

  if (type === "multiple") {
    if (question.title && questionText && questionText !== question.title) content += `<div class="question-prompt">${esc(questionText)}</div>`;
    const options = optionsHtml({ answers: question.answers, chosen: question.chosen, correct: question.correct, mode, canReveal, questionIndex });
    content += options.html;
    result = options.result;
  } else if (type === "true_false") {
    const subs = Array.isArray(question.subQuestions) ? question.subQuestions : [];
    const chosen = Array.isArray(question.chosen) ? question.chosen : [];
    let allCorrect = subs.length > 0;
    content += `<div class="tf-wrapper">${subs.map((sub, subIndex) => {
      const hasAnswer = mode === "review" && chosen[subIndex] != null;
      const value = hasAnswer ? Number(chosen[subIndex]) : null;
      const expected = Number(sub.correct);
      const correctRow = hasAnswer && value === expected;
      if (!correctRow) allCorrect = false;
      const rowClass = mode === "review" && canReveal ? (correctRow ? " tf-review-correct" : " tf-review-wrong") : "";
      const answerTip = mode === "review" && canReveal ? `<span class="tf-answer-tip ${correctRow ? "true-text" : "false-text"}"> (Đáp án: ${expected === 1 ? "Đúng" : "Sai"})</span>` : "";
      const trueClass = mode === "review" && value === 1 ? " selected" : "";
      const falseClass = mode === "review" && value === 0 ? " selected" : "";
      return `<div class="tf-row${rowClass}"><div class="tf-question-text"><strong>${String.fromCharCode(97 + subIndex)}.</strong> <span>${esc(sub.text || "")}</span>${answerTip}</div><div class="tf-options"><label class="${trueClass.trim()}"><input type="radio" name="tf-${questionIndex}-${subIndex}" value="1"${value === 1 ? " checked" : ""}${mode === "review" ? " disabled" : ""}${mode === "take" ? ` onclick="checkTFDone(${questionIndex}, this)"` : ""}> <b>Đ</b></label><label class="${falseClass.trim()}"><input type="radio" name="tf-${questionIndex}-${subIndex}" value="0"${value === 0 ? " checked" : ""}${mode === "review" ? " disabled" : ""}${mode === "take" ? ` onclick="checkTFDone(${questionIndex}, this)"` : ""}> <b>S</b></label></div></div>`;
    }).join("")}</div>`;
    result = mode === "review" && canReveal ? allCorrect : null;
  } else if (type === "short_answer") {
    const chosen = mode === "review" ? String(question.chosen == null ? "" : question.chosen) : "";
    const expected = String(question.correctAnswer == null ? "" : question.correctAnswer);
    const isCorrect = chosen.trim().toLowerCase() === expected.trim().toLowerCase();
    const stateClass = mode === "review" && canReveal ? (isCorrect ? " review-input-correct" : " review-input-wrong") : "";
    if (questionText) content += `<div class="question-prompt">${esc(questionText)}</div>`;
    content += `<textarea class="short-input writing-input${stateClass}" ${mode === "take" ? "placeholder=\"Nhập câu trả lời của bạn...\"" : "disabled"} ${mode === "take" ? `oninput="markDone(${questionIndex})" onblur="shortToast(${questionIndex})"` : ""} data-qidx="${questionIndex}" rows="${Math.max(1, Number(question.rows) || 3)}">${esc(chosen)}</textarea>`;
    if (mode === "review" && canReveal) content += `<div class="true-text answer-key">✓ Đáp án chuẩn: ${esc(expected)}</div>`;
    result = mode === "review" && canReveal ? isCorrect : null;
  } else if (type === "passage") {
    const subs = Array.isArray(question.subQuestions) ? question.subQuestions : [];
    const chosen = Array.isArray(question.chosen) ? question.chosen : [];
    let allCorrect = subs.length > 0;
    const passage = question.passage ? `<div class="passage-left"><div class="passage-left-inner">${esc(question.passage)}</div></div>` : "";
    const subHtml = subs.map((sub, subIndex) => {
      const options = optionsHtml({ answers: sub.answers, chosen: chosen[subIndex], correct: sub.correct, mode, canReveal, questionIndex, subIndex, prefix: (index) => `${String.fromCharCode(65 + index)}.` });
      const selectedCorrect = chosen[subIndex] != null && Number(chosen[subIndex]) === Number(sub.correct);
      if (!selectedCorrect) allCorrect = false;
      return `<div class="sub-q-block${mode === "review" && canReveal ? (selectedCorrect ? " review-correct" : " review-wrong") : ""}"><div class="sub-q-text"><strong>${String.fromCharCode(97 + subIndex)}.</strong> ${esc(sub.question || "")}</div>${options.html}</div>`;
    }).join("");
    content += `<div class="passage-layout">${passage}<div class="passage-right sub-questions">${subHtml}</div></div>`;
    result = mode === "review" && canReveal ? allCorrect : null;
  } else if (type === "cloze") {
    const chosen = Array.isArray(question.chosen) ? question.chosen : [];
    const blanks = Array.isArray(question.blanks) ? question.blanks : [];
    let allCorrect = true;
    const text = esc(questionText).replace(/\{\{(\d+)\}\}/g, (_match, number) => {
      const index = Number(number) - 1;
      const value = mode === "review" && chosen[index] != null ? String(chosen[index]) : "";
      const expected = String(blanks[index] == null ? "" : blanks[index]);
      const hasAnswer = value.trim() !== "";
      const correctBlank = hasAnswer && value.trim().toLowerCase() === expected.trim().toLowerCase();
      if (!correctBlank) allCorrect = false;
      const width = Math.max(8, Math.ceil((expected || value || "        ").length));
      const classes = mode === "review" && canReveal ? (correctBlank ? " cloze-review-correct" : " cloze-review-wrong") : "";
      const input = `<input class="cloze-input short-input${classes}" type="text" size="${width}" data-qidx="${questionIndex}" data-blank="${index}" value="${esc(value)}"${mode === "take" ? ` oninput="markDone(${questionIndex})"` : " disabled"}>`;
      const tip = mode === "review" && canReveal && !correctBlank ? `<span class="cloze-answer-tip true-text">(${esc(expected)})</span>` : "";
      return input + tip;
    });
    content += `<div class="cloze-text">${text}</div>`;
    result = mode === "review" && canReveal ? allCorrect : null;
  }

  let cardClass = "question-card";
  if (mode === "review" && canReveal && result !== null) cardClass += result ? " review-true" : " review-false";
  const html = `<div class="${cardClass}" id="card-${questionIndex}"><div class="q-header"><span class="q-badge">Câu ${questionIndex + 1}</span><span>${esc(heading)}</span></div>${imageHtml}${content}</div>`;
  return { html, result };
}

export function renderQuizHtml(sections, { mode = "take", canReveal = false, startIndex = 0 } = {}) {
  const renderMode = mode === "review" ? "review" : "take";
  const list = Array.isArray(sections) ? sections : [];
  let questionIndex = Math.max(0, Number(startIndex) || 0);
  const results = [];
  let html = "";
  let navHtml = "";

  list.forEach((section) => {
    html += sectionTitleHtml(section);
    if (section.passage && String(section.passage).trim()) html += `<div class="section-passage">${esc(section.passage)}</div>`;
    html += sectionAudioHtml(section);
    if (section.sectionTitle) navHtml += `<div class="nav-section-label">${esc(section.sectionTitle)}</div>`;
    (Array.isArray(section.questions) ? section.questions : []).forEach((question) => {
      const rendered = renderQuestion(question || {}, questionIndex, { mode: renderMode, canReveal: !!canReveal });
      html += rendered.html;
      results.push(rendered.result);
      const navResult = rendered.result;
      const navClass = renderMode === "review" && canReveal && navResult !== null ? (navResult ? " nav-correct" : " nav-wrong") : "";
      navHtml += `<div class="nav-item${navClass}" id="nav-${questionIndex}" onclick="scrollToQuestion(${questionIndex})">${questionIndex + 1}</div>`;
      questionIndex += 1;
    });
  });

  html += `<div class="quiz-end-marker"><span></span><b>Hết</b><span></span></div>`;
  return { html, navHtml, results };
}
