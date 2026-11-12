const SAFE_TEXT_TAGS = ["b", "i", "u", "em", "strong", "br", "span", "code", "sub", "sup"];
/* Text câu hỏi: bỏ in đậm (khung câu hỏi đã đậm sẵn), giữ in nghiêng/gạch chân/... */
const QUESTION_TEXT_TAGS = SAFE_TEXT_TAGS.filter((tag) => tag !== "b" && tag !== "strong");

/* Nhãn giao diện theo ngôn ngữ đề (đề tiếng Anh → hiển thị tiếng Anh) */
const LABELS = {
  vi: {
    question: "Câu", listening: "Phần Nghe", listenDefault: "Bấm play, nghe và trả lời các câu hỏi bên dưới",
    track: "Bài nghe", passageHead: "Đọc đoạn văn và trả lời các câu hỏi bên dưới", clozeHead: "Điền từ thích hợp vào chỗ trống",
    shortHead: "Tự luận", yes: "Đ", no: "S", yesFull: "Đúng", noFull: "Sai", answer: "Đáp án", answerAlt: "Đáp án",
    typeHere: "Nhập câu trả lời của bạn...", correctAnswer: "Đáp án chuẩn", showExp: "Hiện giải thích",
    review: "Cần xem lại", reviewTitle: "Cần xem lại", end: "Hết"
  },
  en: {
    question: "Question", listening: "Listening", listenDefault: "Press play, listen and answer the questions below",
    track: "Track", passageHead: "Read the passage and answer the questions below", clozeHead: "Fill in each blank with a suitable word",
    shortHead: "Written answer", yes: "T", no: "F", yesFull: "True", noFull: "False", answer: "Answer", answerAlt: "Option",
    typeHere: "Type your answer...", correctAnswer: "Correct answer", showExp: "Show explanation",
    review: "Review later", reviewTitle: "Flag for review", end: "End"
  }
};
export function quizLabels(english) { return english ? LABELS.en : LABELS.vi; }
/* listenTitle mặc định do trình tạo đề sinh ra bằng tiếng Việt → đổi sang tiếng Anh khi đề tiếng Anh */
const VI_LISTEN_DEFAULTS = /^(?:nghe nội dung|đọc \/ nghe|nghe)$/i;

export function esc(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

export function safeUrl(value) {
  const url = String(value || "").trim();
  return /^https?:\/\//i.test(url) ? url : "";
}

export function sanitizeHtml(html, allowedTags = SAFE_TEXT_TAGS) {
  const source = String(html || "").replace(/\n/g, "<br>");
  const body = new DOMParser().parseFromString(source, "text/html").body;
  (function clean(parent) {
    Array.from(parent.children).forEach((element) => {
      const tag = element.tagName.toLowerCase();
      if (!allowedTags.includes(tag)) {
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

/* Nội dung câu hỏi: làm sạch HTML nhưng loại luôn thẻ in đậm (<strong>/<b>) */
export function sanitizeQuestionText(html) {
  return sanitizeHtml(html, QUESTION_TEXT_TAGS);
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

export function driveAltUrl(value) {
  const url = String(value == null ? "" : value);
  const match = url.match(/drive\.google\.com\/thumbnail\?[^#]*?\bid=([^&#]+)/i)
    || url.match(/drive\.google\.com\/file\/d\/([^\/?#&]+)/i);
  return match ? `https://lh3.googleusercontent.com/d/${match[1]}` : "";
}

export function imageErrorAttrs(url) {
  const alt = driveAltUrl(url);
  return ` loading="lazy"${alt ? ` data-fb="${esc(alt)}"` : ""} data-src="${esc(url)}" onerror="lhImageError(this)"`;
}

/* Hàm toàn cục cho onerror: lần lỗi đầu đổi sang nguồn dự phòng, lần sau hiện khung báo lỗi */
if (typeof window !== "undefined" && !window.lhImageError) {
  window.lhImageError = function (img) {
    if (!img) return;
    const fb = img.getAttribute("data-fb");
    if (fb && img.src !== fb) { img.removeAttribute("data-fb"); img.src = fb; return; }
    const box = img.parentElement;
    const src = img.getAttribute("data-src") || img.src;
    if (box) {
      box.className = "q-image q-image-error";
      box.innerHTML = 'Không tải được ảnh — <a href="' + esc(src) + '" target="_blank" rel="noopener noreferrer">mở link</a>';
    }
  };
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

export function answerInnerHtml(answer, index, english = false) {
  const url = answerImageUrl(answer);
  return url
    ? `<img class="ans-img" src="${esc(url)}" alt="${quizLabels(english).answerAlt} ${String.fromCharCode(65 + index)}" loading="lazy" onerror="this.style.display='none'">`
    : `<span>${sanitizeHtml(answerText(answer))}</span>`;
}

function sectionTitleHtml(section) {
  if (!section.sectionTitle) return "";
  const description = String(section.sectionDesc || "").trim();
  return `<div class="quiz-section-title"><div class="quiz-section-title-text">${sanitizeHtml(section.sectionTitle)}</div>${description ? `<div class="quiz-section-description">${sanitizeHtml(description)}</div>` : ""}</div>`;
}

function sectionAudioHtml(section, english = false) {
  const L = quizLabels(english);
  const audio = section.audio;
  if (!audio || !(section.type === "listening" || String(audio).length > 0)) return "";
  const tracks = Array.isArray(audio) ? audio : [audio];
  const players = tracks.map((track, index) => {
    const url = safeUrl(typeof track === "string" ? track : track && track.url);
    if (!url) return "";
    const label = typeof track === "string"
      ? (tracks.length > 1 ? `${L.track} ${index + 1}` : "")
      : (track.title || (tracks.length > 1 ? `${L.track} ${index + 1}` : ""));
    return `<div class="listening-track">${label ? `<div class="listening-track-title">${esc(label)}</div>` : ""}<audio data-src="${esc(url)}" controls preload="none"><source src="${esc(url)}" type="audio/mpeg"></audio></div>`;
  }).join("");
  if (!players) return "";
  return `<div class="listening-player"><div class="listening-player-heading"><span class="listening-badge"><i class="fa-solid fa-headphones"></i> ${esc(L.listening)}</span><span>${esc(english && (!section.listenTitle || VI_LISTEN_DEFAULTS.test(String(section.listenTitle).trim())) ? L.listenDefault : (section.listenTitle || L.listenDefault))}</span></div>${players}</div>`;
}

function optionsHtml({ answers, chosen, correct, mode, canReveal, questionIndex, subIndex, prefix = "", english = false }) {
  const list = Array.isArray(answers) ? answers : [];
  const evaluate = mode === "review" && canReveal;
  const showAnswer = canReveal && (mode === "review" || mode === "preview");
  let isCorrect = false;
  const html = `<div class="answers-grid">${list.map((answer, answerIndex) => {
    const selected = mode === "review" && chosen != null && Number(chosen) === answerIndex;
    const correctAnswer = Number(correct) === answerIndex;
    if (selected && correctAnswer) isCorrect = true;
    let classes = "ans-label";
    if (selected) classes += " selected";
    if (showAnswer && correctAnswer) classes += " true-answer-highlight";
    if (mode === "review" && canReveal && selected && !correctAnswer) classes += " review-wrong";
    const name = subIndex == null ? `question-${questionIndex}` : `q-${questionIndex}-${subIndex}`;
    const onclick = mode === "take"
      ? ` onclick="selectAnswer(this, ${questionIndex}${subIndex == null ? "" : `, ${subIndex}`})"`
      : "";
    return `<label class="${classes}" id="label-${questionIndex}${subIndex == null ? "" : `-${subIndex}`}-${answerIndex}"${onclick}><input type="radio" name="${name}" value="${answerIndex}"${selected ? " checked" : ""}${(mode === "review" || mode === "preview") ? " disabled" : ""}>${prefix ? `<span class="ans-prefix">${esc(prefix(answerIndex))}</span>` : ""}${answerInnerHtml(answer, answerIndex, english)}</label>`;
  }).join("")}</div>`;
  return { html, result: evaluate ? isCorrect : null };
}

function renderQuestion(question, questionIndex, { mode = "take", canReveal = false, english = false }) {
  const type = question.type || "multiple";
  const marker = extractImageMarker(question.question);
  const questionText = marker ? marker.text : String(question.question || "");
  const imageUrl = imageFieldUrl(question.image) || (marker ? marker.url : "");
  const imageHtml = imageUrl ? `<div class="q-image"><img src="${esc(imageUrl)}" alt=""${imageErrorAttrs(imageUrl)}></div>` : "";
  const L = quizLabels(english);
  const heading = question.title || (type === "passage" ? L.passageHead : type === "cloze" ? L.clozeHead : type === "short_answer" ? L.shortHead : questionText || "");
  let content = "";
  let result = null;

  if (type === "multiple") {
    if (question.title && questionText && questionText !== question.title) {
      content += `<div class="question-prompt">${sanitizeQuestionText(questionText)}</div>`;
    }
    const options = optionsHtml({ answers: question.answers, chosen: question.chosen, correct: question.correct, mode, canReveal, questionIndex, english });
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
      const canShowAnswer = canReveal && (mode === "review" || mode === "preview");
      const rowClass = mode === "review" && canReveal ? (correctRow ? " tf-review-correct" : " tf-review-wrong") : "";
      const tipTone = (mode === "preview" ? expected === 1 : correctRow) ? "true-text" : "false-text";
      const answerTip = canShowAnswer ? `<span class="tf-answer-tip ${tipTone}"> (${L.answer}: ${expected === 1 ? L.yesFull : L.noFull})</span>` : "";
      const trueClass = mode === "review" && value === 1 ? " selected" : (mode === "preview" && expected === 1 ? " selected" : "");
      const falseClass = mode === "review" && value === 0 ? " selected" : (mode === "preview" && expected === 0 ? " selected" : "");
      return `<div class="tf-row${rowClass}"><div class="tf-question-text"><strong>${String.fromCharCode(97 + subIndex)}.</strong> <span>${sanitizeQuestionText(sub.text || "")}</span>${answerTip}</div><div class="tf-options"><label class="${trueClass.trim()}"><input type="radio" name="tf-${questionIndex}-${subIndex}" value="1"${(value === 1 || (mode === "preview" && expected === 1)) ? " checked" : ""}${(mode === "review" || mode === "preview") ? " disabled" : ""}${mode === "take" ? ` onclick="checkTFDone(${questionIndex}, this)"` : ""}> <b>${L.yes}</b></label><label class="${falseClass.trim()}"><input type="radio" name="tf-${questionIndex}-${subIndex}" value="0"${(value === 0 || (mode === "preview" && expected === 0)) ? " checked" : ""}${(mode === "review" || mode === "preview") ? " disabled" : ""}${mode === "take" ? ` onclick="checkTFDone(${questionIndex}, this)"` : ""}> <b>${L.no}</b></label></div></div>`;
    }).join("")}</div>`;
    result = mode === "review" && canReveal ? allCorrect : null;
  } else if (type === "short_answer") {
    const chosen = mode === "review" ? String(question.chosen == null ? "" : question.chosen) : "";
    const expected = String(question.correctAnswer == null ? "" : question.correctAnswer);
    const isCorrect = chosen.trim().toLowerCase() === expected.trim().toLowerCase();
    const canShowAnswer = canReveal && (mode === "review" || mode === "preview");
    const stateClass = mode === "review" && canShowAnswer ? (isCorrect ? " review-input-correct" : " review-input-wrong") : "";
    if (questionText) content += `<div class="question-prompt">${sanitizeQuestionText(questionText)}</div>`;
    content += `<textarea class="short-input writing-input${stateClass}" ${mode === "take" ? "placeholder=\"${esc(L.typeHere)}\"" : "disabled"} ${mode === "take" ? `oninput="markDone(${questionIndex})" onblur="shortToast(${questionIndex})"` : ""} data-qidx="${questionIndex}" rows="${Math.max(1, Number(question.rows) || 3)}">${esc(chosen)}</textarea>`;
    if (canShowAnswer) content += `<div class="true-text answer-key">✓ ${L.correctAnswer}: ${esc(expected)}</div>`;
    result = mode === "review" && canShowAnswer ? isCorrect : null;
  } else if (type === "passage") {
    const subs = Array.isArray(question.subQuestions) ? question.subQuestions : [];
    const chosen = Array.isArray(question.chosen) ? question.chosen : [];
    let allCorrect = subs.length > 0;
    const passage = question.passage ? `<div class="passage-left"><div class="passage-left-inner">${sanitizeHtml(question.passage)}</div></div>` : "";
    const subHtml = subs.map((sub, subIndex) => {
      const options = optionsHtml({ answers: sub.answers, chosen: chosen[subIndex], correct: sub.correct, mode, canReveal, questionIndex, subIndex, english, prefix: (index) => `${String.fromCharCode(65 + index)}.` });
      const selectedCorrect = chosen[subIndex] != null && Number(chosen[subIndex]) === Number(sub.correct);
      if (!selectedCorrect) allCorrect = false;
      return `<div class="sub-q-block${mode === "review" && canReveal ? (selectedCorrect ? " review-correct" : " review-wrong") : ""}"><div class="sub-q-text"><strong>${String.fromCharCode(97 + subIndex)}.</strong> ${sanitizeQuestionText(sub.question || "")}</div>${options.html}</div>`;
    }).join("");
    content += `<div class="passage-layout">${passage}<div class="passage-right sub-questions">${subHtml}</div></div>`;
    result = mode === "review" && canReveal ? allCorrect : null;
  } else if (type === "cloze") {
    const chosen = Array.isArray(question.chosen) ? question.chosen : [];
    const blanks = Array.isArray(question.blanks) ? question.blanks : [];
    let allCorrect = true;
    const text = sanitizeQuestionText(questionText).replace(/\{\{(\d+)\}\}/g, (_match, number) => {
      const index = Number(number) - 1;
      const value = mode === "review" && chosen[index] != null ? String(chosen[index]) : "";
      const expected = String(blanks[index] == null ? "" : blanks[index]);
      const hasAnswer = value.trim() !== "";
      const correctBlank = hasAnswer && value.trim().toLowerCase() === expected.trim().toLowerCase();
      if (!correctBlank) allCorrect = false;
      const width = Math.max(8, Math.ceil((expected || value || "        ").length));
      const classes = mode === "review" && canReveal ? (correctBlank ? " cloze-review-correct" : " cloze-review-wrong") : "";
      const input = `<input class="cloze-input short-input${classes}" type="text" size="${width}" data-qidx="${questionIndex}" data-blank="${index}" value="${esc(value)}"${mode === "take" ? ` oninput="markDone(${questionIndex})"` : " disabled"}>`;
      const canShowAnswer = canReveal && (mode === "review" || mode === "preview");
      const tip = canShowAnswer && !correctBlank ? `<span class="cloze-answer-tip true-text">(${esc(expected)})</span>` : "";
      return input + tip;
    });
    content += `<div class="cloze-text">${text}</div>`;
    result = mode === "review" && canReveal ? allCorrect : null;
  }

  let cardClass = "question-card";
  if (mode === "review" && canReveal && result !== null) cardClass += result ? " review-true" : " review-false";
  const canShowExplanation = (mode === "review" || mode === "preview") && !!canReveal && question.explanation;
  const explanationHtml = canShowExplanation ? `<details class="q-explanation"><summary class="exp-label">${L.showExp}</summary><div class="exp-body">${sanitizeHtml(question.explanation)}</div></details>` : "";
  const badgeLabel = L.question;
  const html = `<div class="${cardClass}" id="card-${questionIndex}"><button type="button" class="q-flag" onclick="toggleFlag(this)" title="${L.reviewTitle}" aria-label="${L.reviewTitle}"><i class="fas fa-flag"></i><span class="q-flag-text">${L.review}</span></button><div class="q-header"><span class="q-badge">${badgeLabel} ${questionIndex + 1}</span><span>${sanitizeQuestionText(heading)}</span></div>${imageHtml}${content}${explanationHtml}</div>`;
  return { html, result };
}

export function isEnglishTest(sections) {
  const list = Array.isArray(sections) ? sections : [];
  return list.some((section) => {
    if (!section || typeof section !== "object") return false;
    if (section.type === "listening") return true;
    if (section.english === true) return true;
    const title = String(section.sectionTitle || section.title || "");
    if (/^(part|section|listening|reading|mark the letter|read the passage|read the following)/i.test(title.trim())) return true;
    const questions = Array.isArray(section.questions) ? section.questions : [];
    return questions.some((q) => {
      const text = String((q && (q.question || q.title)) || "");
      return /^(question)\s*\d/i.test(text.trim());
    });
  });
}

export function renderQuizHtml(sections, { mode = "take", canReveal = false, startIndex = 0 } = {}) {
  const english = isEnglishTest(sections);
  const list = Array.isArray(sections) ? sections : [];
  let questionIndex = Math.max(0, Number(startIndex) || 0);
  const results = [];
  let html = "";
  let navHtml = "";

  list.forEach((section) => {
    html += sectionTitleHtml(section);
    if (section.passage && String(section.passage).trim()) html += `<div class="section-passage">${sanitizeHtml(section.passage)}</div>`;
    html += sectionAudioHtml(section, english);
    if (section.sectionTitle) navHtml += `<div class="nav-section-label">${sanitizeHtml(section.sectionTitle)}</div>`;
    (Array.isArray(section.questions) ? section.questions : []).forEach((question) => {
      const rendered = renderQuestion(question || {}, questionIndex, { mode, canReveal: !!canReveal, english });
      html += rendered.html;
      results.push(rendered.result);
      const navResult = rendered.result;
      const navClass = mode === "review" && canReveal && navResult !== null ? (navResult ? " nav-correct" : " nav-wrong") : "";
      navHtml += `<div class="nav-item${navClass}" id="nav-${questionIndex}" onclick="scrollToQuestion(${questionIndex})">${questionIndex + 1}</div>`;
      questionIndex += 1;
    });
  });

  html += `<div class="quiz-end-marker"><span></span><b>${quizLabels(english).end}</b><span></span></div>`;
  return { html, navHtml, results };
}

/* Đánh dấu lá cờ "Cần xem lại" + expose inline handlers to global scope (ES Module safe) */
if (typeof window !== "undefined") {
  window.toggleFlag = window.toggleFlag || function (btn) {
    if (!btn) return;
    var flagged = btn.classList.toggle("flagged");
    try {
      var card = btn.closest ? btn.closest(".question-card") : null;
      var idx = null;
      if (card && card.id) {
        var m = card.id.match(/card-(\d+)/);
        if (m) idx = m[1];
      }
      if (idx !== null) {
        var nav = document.getElementById("nav-" + idx);
        if (nav) nav.classList.toggle("nav-flagged", flagged);
      }
    } catch (e) {}
  };

  const inlineHandlers = ["selectAnswer", "checkTFDone", "markDone", "shortToast", "scrollToQuestion"];
  inlineHandlers.forEach((name) => {
    if (typeof window[name] !== "function") {
      window[name] = function () { /* safe fallback until page handlers load */ };
    }
  });
  if (typeof window.lhImageError !== "function") {
    window.lhImageError = function (img) {
      if (!img) return;
      const box = img.parentElement;
      const src = img.getAttribute && (img.getAttribute("data-src") || img.src);
      if (box) {
        box.className = "q-image q-image-error";
        box.innerHTML = 'Không tải được ảnh — <a href="' + esc(src || "") + '" target="_blank" rel="noopener noreferrer">mở link</a>';
      }
    };
  }
}