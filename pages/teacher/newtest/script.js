"use strict";

/* ============================================================
   Tạo đề: Text/JSON → Render preview → Xuất bản (kết nối Supabase)
   Chạy bằng cách mở index.html (hoặc ?edit=t:<id> để sửa đề).
   ============================================================ */

var testData = [];            // array section (đúng format docs/FORMAT-DE-THI.md)
var userAnswers = {};         // gi (number) → {multiple: index, tf: map, short: text}
var graded = false;
var jsonAreaDirty = false;    // true nếu người dùng sửa tay ô JSON (tránh ghi đè)

/* SỬA ĐỀ CÓ SẴN (?edit=t:<id>): nếu đang chỉnh 1 bài đã có thì lưu lại đúng bài đó */
var currentEditId = null;         // uuid bài đang sửa (null = tạo mới)
var currentEditComplete = true;   // trạng thái hoàn thành của bài đang sửa

/* Môn trong Phòng Học (nguồn global: element/subjects-data.js) — chọn môn khi xuất bản */
var TEST_SUBJECTS = (window.LH_SUBJECTS || [
  { id: "toan", name: "Toán Học" },
  { id: "ly", name: "Vật Lý" },
  { id: "hoa", name: "Hoá Học" },
  { id: "sinh", name: "Sinh Học" },
  { id: "anh", name: "Anh Văn" },
  { id: "su", name: "Lịch Sử" },
  { id: "tin", name: "Tin Học" },
  { id: "khac", name: "Khác" }
]).map(function (s) { return { id: s.id, name: s.name }; });

/* Thiết lập đề (nút "Tiếp tục" trên topbar) */
var testMeta = {
  subject: "",         // môn học (tên hiển thị trong Phòng Học)
  name: "",            // tên đề
  desc: "",            // mô tả
  minutes: 0,          // thời gian làm bài (0 = không giới hạn)
  score: 10,           // điểm tối đa (chia đều cho từng câu khi chấm)
  shuffleQ: true,      // xáo trộn thứ tự câu
  shuffleA: true,      // xáo trộn thứ tự đáp án trong câu (mặc định bật)
  showScore: "always", // 'always' hiện điểm bình thường | 'none' ẩn điểm, hiện "Đã nộp bài"
  showAnswers: "always", // 'always' luôn cho xem đáp án | 'perfect' chỉ khi đạt tối đa | 'none' không cho xem
  subtestEnabled: false, // tạo đề con: mỗi lần mở đề bốc ngẫu nhiên N câu
  subtestCount: null,     // số câu của đề con (null khi tắt)
  maxAttempts: 0,         // số lần làm tối đa của mỗi HS (0 = không giới hạn)
  password: "",           // mật khẩu mở đề ("" = không đặt)
  timeEnabled: false,     // bật giới hạn thời gian mở đề
  startAt: null,          // ISO thời gian bắt đầu mở đề (null khi tắt)
  endAt: null             // ISO thời gian kết thúc mở đề (null khi tắt)
};

var LETTERS = "ABCDEFGH";
var isEnglishMode = false;
/* Nhãn "Câu" ↔ "Question" theo toggle Tiếng Anh */
function qWord() {
  var t = document.getElementById("englishModeToggle");
  return (t ? !!t.checked : isEnglishMode) ? "Question" : "Câu";
}
function letter(i) { return LETTERS[i] || String(i + 1); }

var $ = function (id) { return document.getElementById(id); };

function notifyToast(html, type) {
  var msg = textOf(html);
  if (!msg) return;
  if (typeof lhToast === "function") {
    lhToast(msg, type || "info");
  }
}

function setNote(html, isError, toastType) {
  var type = toastType || (isError ? "error" : "info");
  notifyToast(html, type);
}

/* Ghi giá trị vào ô JSON (đánh dấu chưa bị người dùng sửa tay) */
function writeJson(txt) {
  $("jsonArea").value = txt;
  jsonAreaDirty = false;
}

/* Tên file bỏ phần mở rộng → dùng làm tên đề mặc định */
function baseName(name) {
  return String(name || "").replace(/\.[^.]+$/, "");
}

/* Hiển thị trên topbar — tải file thì hiện tên kèm đuôi, nhập tay thì "Chưa có tiêu đề" */
function setFileLabel(name) {
  var el = $("fileLabel");
  if (!el) return;
  if (!name) {
    el.textContent = "Chưa có tiêu đề";
    el.title = "";
    return;
  }
  el.textContent = "";
  var icon = document.createElement("i");
  icon.className = "fa-solid fa-file-lines";
  el.appendChild(icon);
  el.appendChild(document.createTextNode(" " + name));   // giữ nguyên đuôi mở rộng
  el.title = name;
}

var maxStage = 1;

function showStage(n) {
  if (n > maxStage) maxStage = n;
  $("p1").hidden = n !== 1;
  $("p2").hidden = n !== 2;
  $("p3").hidden = n !== 3;
  $("p4").hidden = n !== 4;
  var setupBtn = $("btnSetup");
  if (setupBtn) setupBtn.hidden = n !== 2;   // "Tiếp tục" chỉ hiện ở màn 2
  document.body.classList.toggle("stage2", n === 2);
  document.body.classList.toggle("stage3", n === 3);
  document.body.classList.toggle("stage4", n === 4);
  document.documentElement.classList.toggle("stage2", n === 2);
  document.documentElement.classList.toggle("stage3", n === 3);
  document.documentElement.classList.toggle("stage4", n === 4);
  updateSteps(n);
  if (n !== 1) {
    try { window.scrollTo({ top: 0, behavior: "smooth" }); }
    catch (e) { window.scrollTo(0, 0); }
  }
  if (n === 3) syncSetupForm();
  if (n === 4) renderReview();
}

function updateSteps(n) {
  var steps = document.querySelectorAll("#steps .step");
  for (var i = 0; i < steps.length; i++) {
    var st = steps[i];
    var s = Number(st.getAttribute("data-s"));
    st.classList.toggle("done", s < n);
    st.classList.toggle("active", s === n);
    st.classList.toggle("locked", s > maxStage);
  }
}

(function () {
  var nav = $("steps");
  if (!nav) return;
  nav.addEventListener("click", function (e) {
    var st = e.target && e.target.closest ? e.target.closest(".step") : null;
    if (!st) return;
    var n = Number(st.getAttribute("data-s"));
    if (n && n <= maxStage) showStage(n);
  });
})();

/* ============ 1) PARSE TEXT → JSON (heuristic) ============ */

function parseTextToJson(text) { return parseToSections(textToLines(text)); }

function textToLines(text) {
  return String(text || "").split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean).map(function (t) { return { t: t, h: t }; });
}

function htmlBlocksToLines(html) {
  var div = document.createElement("div");
  div.innerHTML = html;
  var arr = [];
  var BLOCK = "p, li, h1, h2, h3, h4, h5, h6, td, th";
  var nodes = div.querySelectorAll(BLOCK);
  nodes.forEach(function (el) {
    /* Chỉ lấy khối "lá": bỏ td/li/p đang chứa khối con (tránh lặp dòng với file Word có bảng) */
    if (el.querySelector(BLOCK)) return;
    var t = (el.textContent || "").replace(/\u00a0/g, " ");
    var h = (el.innerHTML || "").replace(/\u00a0/g, " ");
    if (!t.trim()) return;
    arr.push({ t: t, h: h });
  });
  if (!arr.length) {
    Array.prototype.forEach.call(div.childNodes, function (n) {
      var t = (n.textContent || "").replace(/\u00a0/g, " ");
      var h = (n.outerHTML || t).replace(/\u00a0/g, " ");
      if (!t.trim()) return;
      arr.push({ t: t, h: h });
    });
  }
  return arr;
}

function balanceHtml(x) {
  if (!/<[a-zA-Z/]/.test(x)) return x;
  var re = /<(\/?)\s*([a-zA-Z][\w:-]*)((?:\s[^>]*)?)(\/)?>/g;
  var stack = [], out = "", last = 0, m;
  while ((m = re.exec(x)) !== null) {
    var close = m[1] === "/", name = m[2].toLowerCase(), selfClose = m[4] === "/";
    if (selfClose || /^(br|img|hr|input|meta|link|area|source|col|embed)$/i.test(name)) {
      out += x.slice(last, m.index + m[0].length);
      last = m.index + m[0].length;
      continue;
    }
    out += x.slice(last, m.index);
    if (close) {
      var found = stack.lastIndexOf(name);
      if (found >= 0) {
        for (var k = stack.length - 1; k > found; k--) out += "</" + stack[k] + ">";
        stack.length = found;
        out += m[0];
      }
      last = m.index + m[0].length;
    } else {
      out += m[0];
      stack.push(name);
      last = m.index + m[0].length;
    }
  }
  out += x.slice(last);
  for (var j = stack.length - 1; j >= 0; j--) out += "</" + stack[j] + ">";
  return out;
}

function fixInlineHtml(x) {
  var out = balanceHtml(x);
  out = out.replace(/<(b|strong|em|i|u|span)(\s[^>]*)?>[ \t]*<\/\1>/g, "");
  out = out.replace(/\s+(?=<\/)/g, "");
  return out.trim();
}

function trimHtmlText(h, left, right) {
  if (left <= 0 && right <= 0) return fixInlineHtml(h);
  var nchars = 0, i = 0;
  while (i < h.length) {
    if (h[i] === "<") { var e = h.indexOf(">", i); i = (e < 0) ? h.length : e + 1; continue; }
    nchars++; i++;
  }
  var trimL = Math.min(left, nchars);
  var keepR = nchars - Math.min(right, nchars - trimL);
  var out = "", si = 0;
  i = 0;
  while (i < h.length) {
    if (h[i] === "<") {
      var e2 = h.indexOf(">", i);
      var tag = h.slice(i, (e2 < 0) ? h.length : e2 + 1);
      out += tag;
      i += tag.length;
      continue;
    }
    if (si >= trimL && si < keepR) out += h[i];
    si++; i++;
  }
  return fixInlineHtml(out);
}

function splitInlineOpts(t, h) {
  /* Cho phép tiền tố "Question 24." / "Câu 24:" đứng trước dãy phương án cùng dòng */
  var pm = /^\s*(?:câu|question)\s*\d{1,3}\s*[\.\):]\s*/i.exec(t);
  var pl = pm ? pm[0].length : 0;
  /* A-D hoa: cho phép dính liền chữ ("A.charges"); a-d thường phải có khoảng trắng */
  var re = /(^|[ \t])(\*)?(?:[A-D][\.\)](?=[A-Za-z0-9])|[A-Da-d][\.\)][ \t]+)/g;
  re.lastIndex = pl > 0 ? pl - 1 : 0;
  var starts = [];
  var m;
  while ((m = re.exec(t)) !== null) starts.push(m.index);
  if (starts.length < 2 || starts[0] > pl + 1) return [];
  function htmlSlice(a, b) {
    if (h === t) return t.slice(a, b);
    if (b === undefined) b = t.length;
    var ai = -1, bi = -1, si = 0, i = 0;
    while (i < h.length && (ai < 0 || bi < 0)) {
      if (h[i] === "<") { var e = h.indexOf(">", i); i = e < 0 ? h.length : e + 1; continue; }
      if (si === a) ai = i;
      if (si === b) bi = i;
      si++; i++;
    }
    if (ai < 0) ai = a;
    if (bi < 0) bi = h.length;
    return h.slice(ai, bi);
  }
  var segs = [];
  if (pl > 0) {
    var head = t.slice(0, starts[0]);
    if (head.trim()) segs.push({ t: head.trim(), h: (h === t) ? head.trim() : fixInlineHtml(htmlSlice(0, starts[0])) });
  }
  for (var k = 0; k < starts.length; k++) {
    var a = starts[k], b = (k + 1 < starts.length) ? starts[k + 1] : undefined;
    var st = t.slice(a, b);
    var left = st.length - st.replace(/^\s+/, "").length;
    var right = st.length - st.replace(/\s+$/, "").length;
    var sh = htmlSlice(a, b);
    segs.push({ t: st.trim(), h: (h === t) ? st.trim() : trimHtmlText(sh, left, right) });
  }
  return segs;
}

function cleanOptionHtml(line, h, txt) {
  if (!h || h === line) return txt;
  var tcs = [];
  var i = 0;
  while (i < h.length) {
    if (h[i] === "<") {
      var e = h.indexOf(">", i);
      i = (e < 0) ? h.length : e + 1;
      continue;
    }
    tcs.push(h[i]);
    i++;
  }
  var ti = tcs.join("").indexOf(txt);
  if (ti < 0) {
    var s0 = line.indexOf(txt);
    if (s0 < 0) return txt;
    ti = s0;
  }
  var out = "", si = 0;
  i = 0;
  while (i < h.length) {
    if (h[i] === "<") {
      var t2 = (h.indexOf(">", i) < 0) ? h.length : h.indexOf(">", i) + 1;
      out += h.slice(i, t2);
      i = t2;
      continue;
    }
    if (si < ti) { si++; i++; continue; }
    out += h[i]; si++; i++;
  }
  return fixInlineHtml(out);
}

/* ============ NHẬN DIỆN TIÊU ĐỀ PHẦN ============ */

var SECTION_KINDS = [
  { re: /(trắc\s*nghiệm|multiple\s*choice|mcq)/i, key: "TN", name: "TRẮC NGHIỆM" },
  { re: /(đúng[\s\/\-–—]*sai|true[\s\/\-–—]*false)/i, key: "DS", name: "ĐÚNG / SAI" },
  { re: /(tự\s*luận|short\s*answer)/i, key: "TL", name: "TỰ LUẬN" },
  { re: /(nghe\s*hiểu|listening|nghe)/i, key: "NGHE", name: "NGHE" },
  { re: /(đọc\s*hiểu|passage|reading)/i, key: "DOC", name: "ĐỌC HIỂU" }
];

var SECTION_DESC = {
  "TN":   "Mỗi câu hỏi thí sinh chỉ chọn một phương án.",
  "DS":   "Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.",
  "TL":   "Thí sinh trả lời các câu hỏi trong phần này.",
  "NGHE": "Nghe nội dung và trả lời các câu hỏi.",
  "DOC":  "Đọc đoạn văn và trả lời các câu hỏi."
};

var ROMAN_NUMS = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
var ROMAN_STRS = ["M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"];
function romanToNum(s) {
  var map = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 }, total = 0, prev = 0;
  String(s).toLowerCase().split("").reverse().forEach(function (ch) {
    var v = map[ch] || 0;
    total += v >= prev ? v : -v;
    prev = v;
  });
  return total;
}
function numToRoman(n) {
  var out = "";
  for (var i = 0; i < ROMAN_NUMS.length; i++) {
    while (n >= ROMAN_NUMS[i]) { out += ROMAN_STRS[i]; n -= ROMAN_NUMS[i]; }
  }
  return out;
}

var TITLE_RE = /^(?:phần\s*)?(\d{1,2}|[ivxlcdm]{1,6})\s*[:.\-–—)\]]\s*(.+)$/i;

function detectSectionTitle(line) {
  var raw = String(line || "").trim();
  if (isEnglishMode && /^(reading|listening|passage|notice|leaflet|announcement)$/i.test(raw)) {
    var desc = "";
    if (/listening/i.test(raw)) desc = "Nghe nội dung và trả lời các câu hỏi.";
    else if (/passage|reading|notice|leaflet|announcement/i.test(raw)) desc = "Đọc đoạn văn / thông báo và trả lời các câu hỏi.";
    return { title: raw.toUpperCase(), desc: desc };
  }
  // English-mode: "Part 1. Mark the letter..." / "Section II. Read the passage..."
  if (isEnglishMode) {
    var mPart = /^(part|section)\s*(\d{1,2}|[ivxlcdm]{1,6})\s*[.:)\-–—]\s*(.+)$/i.exec(raw);
    if (mPart) {
      var titlePart = (mPart[1].toUpperCase() + " " + mPart[2].toUpperCase()).trim();
      var descPart = mPart[3].trim();
      if (descPart && descPart.length <= 800) {
        return { title: titlePart, desc: descPart };
      }
    }
    // standalone Part/Section
    if (/^(part|section)\s*(\d{1,2}|[ivxlcdm]{1,6})$/i.test(raw)) {
      return { title: raw.toUpperCase(), desc: "" };
    }
  }
  var m = TITLE_RE.exec(raw);
  if (!m) return null;
  var text = m[2].trim();
  if (!text || /[?!]$/.test(text) || text.length > 60) return null;
  var kind = null, kindIdx = -1;
  for (var i = 0; i < SECTION_KINDS.length; i++) {
    if (SECTION_KINDS[i].re.test(text)) { kind = SECTION_KINDS[i]; kindIdx = i; break; }
  }
  if (!kind) return null;
  var isBareDigit = /^\d+$/.test(m[1]);
  if ((kind.key === "NGHE" || kind.key === "DOC") && isBareDigit && !/^(?:phần\s*)/i.test(raw)) return null;
  var num = isBareDigit ? parseInt(m[1], 10) : romanToNum(m[1]);
  if (!num) num = kindIdx + 1;
  return { title: "PHẦN " + numToRoman(num) + ". " + kind.name, desc: SECTION_DESC[kind.key] || "" };
}

/* Câu hỏi hợp lệ = có đủ dữ liệu để làm bài (tránh nhận nhầm đề mục / gạch đầu dòng thành câu hỏi) */
function hasValidQuestions(res) {
  if (!res || res.error || !res.sections) return false;
  return res.sections.some(function (sec) {
    return (sec.questions || []).some(function (q) {
      /* câu hỏi thật thường ngắn; đoạn văn dài nhiều dòng bị nuốt vào "câu hỏi" là nhận nhầm */
      var qt = String(q.question || "");
      if (qt.replace(/<[^>]*>/g, "").length > 500 || (qt.match(/<br\s*\/?>/gi) || []).length > 5) return false;
      if (q.type === "multiple") return (q.answers || []).length >= 2;
      if (q.type === "true_false") return (q.subQuestions || []).length >= 1;
      if (q.type === "short_answer") return !!String(q.correctAnswer || "").trim();
      return false;
    });
  });
}

/* English mode: file Word dạng tài liệu/bài đọc (không có "Question 1 / A. B. C. D.") → nạp thành 1 phần đọc hiểu
   để vẫn đọc được nội dung, người dùng thêm câu hỏi sau trong phần xem trước. */
function docToReadingSection(lines) {
  var parts = [];
  (lines || []).forEach(function (L) {
    if (!L || !L.t || !String(L.t).trim()) return;
    var h = (L.h && L.h !== L.t) ? L.h : escapeC(L.t);
    if (/^(?:chương|chapter|part|section|[ivxlcdm]{1,6}[.)])\s*/i.test(String(L.t).trim()) && !/<(?:b|strong)\b/i.test(h)) {
      h = "<b>" + h + "</b>";
    }
    parts.push(h);
  });
  if (!parts.length) return { sections: [], warnings: [], error: "File không có nội dung để đọc." };
  return {
    sections: [{
      sectionTitle: "READING MATERIAL",
      sectionDesc: "Nội dung đọc từ file Word. Chưa nhận dạng được câu hỏi — hãy thêm / sửa câu hỏi bên dưới.",
      timeLimit: 0,
      passage: parts.join("<br>"),
      questions: [{ type: "short_answer", question: "(Nhập câu hỏi cho nội dung trên)", correctAnswer: "" }]
    }],
    warnings: ["Không thấy cấu trúc câu hỏi trong file → đã nạp toàn bộ file thành bài đọc (" + parts.length + " dòng)."],
    error: null
  };
}

function parseToSections(lines) {
  var toggleEl = $("englishModeToggle");
  if (toggleEl) isEnglishMode = !!toggleEl.checked;
  var res = parseToSectionsCore(lines);
  if (isEnglishMode && !hasValidQuestions(res)) return docToReadingSection(lines);
  return res;
}

function parseToSectionsCore(lines) {
  var toggleEl = $("englishModeToggle");
  if (toggleEl) isEnglishMode = !!toggleEl.checked;

  lines = lines || [];
  var groups = [], cur = null;

  lines.forEach(function (L) {
    if (!L || !L.t) return;
    var dt = detectSectionTitle(L.t);
    // English mode: reading instruction starts a new section
    if (isEnglishMode && !dt) {
      var isReadingInstr = /^read\s+the\s+(?:following\s+)?(?:passage|notice|leaflet|announcement|text|article)/i.test(L.t)
        || /^(?:passage|notice|leaflet|announcement|reading)$/i.test(L.t.trim());
      if (isReadingInstr) {
        if (cur && cur.lines.length) groups.push(cur);
        var secNum = groups.length + 1;
        var roman = (typeof numToRoman === "function") ? numToRoman(secNum) : secNum;
        cur = { section: { title: "PHẦN " + roman + ". ĐỌC HIỂU", desc: "Đọc đoạn văn / thông báo và trả lời các câu hỏi." }, lines: [L] };
        return;
      }
    }
    if (dt) {
      if (cur && cur.lines.length) groups.push(cur);
      cur = { section: dt, lines: [] };
    } else if (cur) {
      cur.lines.push(L);
    }
  });
  if (cur && cur.lines.length) groups.push(cur);

  if (!groups.length) return parseLines(lines);

  var sections = [], warnings = [];
  groups.forEach(function (g) {
    var extra = { passage: null, audio: null, listenTitle: null };
    var qlines = (g.lines || []).filter(function (L) {
      if (!L || !L.t) return false;
      var t = String(L.t || "").trim();
      if (/^passage\s*:\s*/i.test(t)) {
        extra.passage = t.replace(/^passage\s*:\s*/i, "").trim();
        return false;
      }
      if (/^https?:\/\/\S+\.(?:mp3|m4a|wav|ogg)(?:\?\S*)?$/i.test(t)) {
        extra.audio = t;
        extra.listenTitle = isEnglishMode
        ? (/listen/i.test(g.section.title + " " + (g.section.desc || "")) ? "Listen to the recording" : "Read / Listen")
        : ((/^PHẦN\s+(?:[IVXLCDM1-9]+)\s*\.\s*NGHE/i.test(g.section.title) || /^NGHE/i.test(g.section.title)) ? "Nghe nội dung" : "Đọc / Nghe");
        return false;
      }
      return true;
    });
    /* English mode: đoạn văn nằm giữa tiêu đề Part/Section và câu hỏi đầu tiên → gom thành bài đọc của phần */
    if (isEnglishMode && !extra.passage) {
      var QSTART = /^(?:câu|question)\s*\d{1,3}\s*[\.\):]|^\d{1,3}\s*[\.\)]\s+\S/i;
      var INSTR = /^(?:read\s+the|mark\s+the|choose\s+the|circle\s+the|answer\s+the|listen\s+to|(?:part|section)\s*\w+\s*[.:)])/i;
      var qi = -1;
      for (var pi = 0; pi < qlines.length; pi++) {
        if (QSTART.test(String(qlines[pi].t || "").trim())) { qi = pi; break; }
      }
      if (qi > 0) {
        var pre = qlines.slice(0, qi).filter(function (L) { return !INSTR.test(String(L.t || "").trim()); });
        var preLen = pre.reduce(function (n, L) { return n + String(L.t || "").length; }, 0);
        var looksReading = /read|passage|text|notice|leaflet|announcement|article|đọc/i.test(g.section.title + " " + (g.section.desc || ""));
        if (pre.length && (looksReading || preLen > 200)) {
          extra.passage = pre.map(function (L) { return (L.h && L.h !== L.t) ? L.h : escapeC(L.t); }).join("<br>");
          qlines = qlines.slice(qi);
        }
      }
    }
    var r = parseLines(qlines);
    (r.warnings || []).forEach(function (w) { warnings.push(w); });
    if (r.error || !r.sections || !r.sections.length) {
      warnings.push("Bỏ phần “" + g.section.title + "” (không nhận dạng được câu hỏi nào).");
      return;
    }
    var s = r.sections[0];
    if (extra.passage) s.passage = extra.passage;
    else if (r.passage) s.passage = r.passage;
    if (!s.passage && s.questions && s.questions[0] && s.questions[0].passage) {
      s.passage = s.questions[0].passage;
      s.questions.forEach(function (q) { if (q.passage === s.passage) delete q.passage; });
    }
    if (extra.audio) { s.audio = extra.audio; s.listenTitle = extra.listenTitle; }
    s.sectionTitle = g.section.title;
    s.sectionDesc = g.section.desc;
    sections.push(s);
  });

  if (!sections.length) {
    return { sections: [], warnings: warnings, error: "Không nhận dạng được câu nào trong các phần đã tách." };
  }
  return { sections: sections, warnings: warnings, error: null };
}

/* ============ NHẬN DIỆN ẢNH ============ */
var IMG_MARKER_SRC = "(?:ảnh(?:\\s*minh\\s*họa)?|hình(?:\\s*ảnh)?|link\\s*ảnh|image|img)";

function normalizeImageUrl(u) {
  u = String(u == null ? "" : u).trim().replace(/[.,;]+$/, "");
  var m = u.match(/^https?:\/\/(?:drive|docs)\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:[^#]*&)?id=)([^/?#&]+)/i);
  if (m) return "https://drive.google.com/thumbnail?id=" + m[1] + "&sz=w1200";
  return u;
}

function isImageUrl(u) {
  u = normalizeImageUrl(u);
  if (!/^https?:\/\//i.test(u)) return false;
  if (/\.(?:jpe?g|png|webp|gif|avif|svg)(?:[?#][^\s]*)?$/i.test(u)) return true;
  if (/^https?:\/\/(?:placehold\.co|picsum\.photos|images\.unsplash\.com)\//i.test(u)) return true;
  if (/^https?:\/\/lh3\.googleusercontent\.com\/d\/[^/?#]+/i.test(u)) return true;
  if (/^https?:\/\/drive\.google\.com\/thumbnail\?[^#]*\bid=/i.test(u)) return true;
  if (/^https?:\/\/[^/]*googleusercontent\.com\//i.test(u)) return true;
  return false;
}

function driveAltUrl(value) {
  var url = String(value == null ? "" : value);
  var m = url.match(/drive\.google\.com\/thumbnail\?[^#]*?\bid=([^&#]+)/i)
    || url.match(/drive\.google\.com\/file\/d\/([^\/?#&]+)/i);
  return m ? "https://lh3.googleusercontent.com/d/" + m[1] : "";
}

window.lhImageError = window.lhImageError || function (img) {
  if (!img) return;
  var fb = img.getAttribute("data-fb");
  if (fb && img.src !== fb) { img.removeAttribute("data-fb"); img.src = fb; return; }
  var box = img.parentElement;
  var src = img.getAttribute("data-src") || img.src;
  if (box) {
    box.className = "q-image q-image-error";
    box.innerHTML = 'Không tải được ảnh — <a href="' + escAttr(src) + '" target="_blank" rel="noopener noreferrer">mở link</a>';
  }
};

function imgErrorAttrs(url) {
  var alt = driveAltUrl(url);
  return ' loading="lazy"' + (alt ? ' data-fb="' + escAttr(alt) + '"' : "") +
    ' data-src="' + escAttr(url) + '" onerror="lhImageError(this)"';
}

function answerImageUrl(ans) {
  var s = String(ans == null ? "" : ans).trim();
  if (!s) return "";
  s = s.replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
  s = s.replace(/^([A-Za-z])\s*[.、)]\s+/, "");
  var m = s.match(new RegExp("^" + IMG_MARKER_SRC + "\\s*[:：]\\s*(https?:\\/\\/\\S+)\\s*$", "i"));
  if (m) return normalizeImageUrl(m[1]);
  var u = s.replace(/[.,;]+$/, "");
  if (/^https?:\/\//i.test(u) && isImageUrl(u)) return normalizeImageUrl(u);
  return "";
}

function extractImageMarker(text) {
  var s = String(text == null ? "" : text);
  var re = new RegExp("(?:^|[\\s;,(?!])(" + IMG_MARKER_SRC + "\\s*[:：]\\s*(https?:\\/\\/[^\\s<>\"']+))", "i");
  var m = re.exec(s);
  if (!m) return null;
  var url = normalizeImageUrl(m[2]);
  if (!/^https?:\/\//i.test(url)) return null;
  var out = (s.slice(0, m.index) + " " + s.slice(m.index + m[0].length))
    .replace(/\s+/g, " ").trim();
  return { text: out, url: url };
}

function stripImageMarkerHtml(html) {
  var re = new RegExp("(?:<[^>]*>\\s*)*" + IMG_MARKER_SRC + "\\s*(?:<[^>]*>\\s*)*[:：]\\s*(?:<[^>]*>\\s*)*https?:\\/\\/[^\\s<>\"']+", "gi");
  return String(html == null ? "" : html).replace(re, "").replace(/\s{2,}/g, " ").trim();
}

function imageFieldUrl(v) {
  var s = String(v == null ? "" : v).trim();
  if (!s) return "";
  var m = extractImageMarker(s);
  return (m && !m.text) ? m.url : normalizeImageUrl(s);
}

function parseLines(lines) {
  lines = lines || [];
  var toggleEl = $("englishModeToggle");
  if (toggleEl) isEnglishMode = !!toggleEl.checked;

  var warnings = [];
  var questions = [];
  var cur = null;
  var answerMark = null;
  var pendingShort = null;
  var pendingImage = null;
  var explanationMode = false;

  var inPassageBlock = false;
  var passageLines = [];
  var pendingPassage = null;

  function closeCur() {
    if (!cur) return;
    if (cur.type === "multiple" && cur.opts && cur.opts.length) {
      var pat = 0, pos = 0;
      cur.opts.forEach(function (op, i) {
        if (op.star) return;
        pat++;
        if (op.lett === letter(i)) pos++;
      });
      var labeled = pat >= 2 && pos === pat;
      cur.answers = cur.opts.map(function (op) {
        return (labeled || op.star) ? cleanOptionHtml(op.line, op.html, op.txt) : op.html;
      });
      cur.opts.forEach(function (op, i) {
        if (op.star || (cur.answerLetter && cur.answerLetter === op.lett)) {
          cur.correctIndex = i;
        } else if (/<strong>|<b\b|<i>|<em>|<u>|<span[^>]*style="[^"]*color:/i.test(op.html)) {
          cur._fmt = cur._fmt || [];
          cur._fmt.push(i);
        }
      });
      if (cur.answerLetter && cur.correctIndex === null) {
        var li = cur.answerLetter.charCodeAt(0) - 65;
        if (li >= 0 && li < cur.answers.length) cur.correctIndex = li;
      }
      if (cur.correctIndex === null) {
        var fmtIdx = -1, nFmt = 0;
        cur.answers.forEach(function (a, i) {
          var hit = (cur._fmt && cur._fmt.indexOf(i) >= 0);
          if (!hit) hit = /<strong>|<b\b|<i>|<em>|<u>|<span[^>]*style="[^"]*color:\s*(red|#f00|#ff0000|rgb\(255,\s*0,\s*0\))/i.test(a);
          if (hit) { nFmt++; fmtIdx = i; }
        });
        if (nFmt === 1) { cur.correctIndex = fmtIdx; cur.answerLetter = String.fromCharCode(65 + fmtIdx); }
      }
      questions.push(cur);
    } else if (cur.type === "true_false" && cur.subQuestions.length) {
      questions.push(cur);
    } else if (cur.type === "short_answer") {
      questions.push(cur);
    }
    cur = null;
    explanationMode = false;
  }

  function appendExplanationLine(text, html) {
    var detail = String(text || "").match(/^\s*([a-z])\s*[\)\.]\s*\[(đúng|sai)\]\s*(?:[-–—:]\s*)?(.*)$/i);
    if (detail) {
      var subIndex = detail[1].toLowerCase().charCodeAt(0) - 97;
      var isCorrect = /^đúng$/i.test(detail[2]);
      var label = detail[1].toLowerCase();
      if (cur.type === "true_false" && cur.subQuestions[subIndex]) {
        cur.subQuestions[subIndex].correct = isCorrect ? 1 : 0;
      } else if (cur.type === "multiple" && isCorrect) {
        cur.correctIndex = subIndex;
        cur.answerLetter = String.fromCharCode(65 + subIndex);
      }
      var tone = isCorrect ? "is-correct" : "is-wrong";
      var rationale = String(detail[3] || "").trim();
      var lineHtml = '<div class="answer-rationale"><b class="answer-rationale-status ' + tone + '">' +
        label + ') [' + (isCorrect ? "ĐÚNG" : "SAI") + ']</b>' +
        (rationale ? ' - <i>' + escapeC(rationale) + '</i>' : '') + '</div>';
      cur.explanation = (cur.explanation || "") + lineHtml;
      return;
    }
    var safeHtml = sanitizeC(html || escapeC(text || ""));
    if (safeHtml) cur.explanation = (cur.explanation ? cur.explanation + "<br>" : "") + safeHtml;
  }

  function handleLine(L, lineIdx) {
    var line = L.t;
    var html = L.h || L.t;

    var inline = splitInlineOpts(line, html);
    if (inline.length > 1) {
      for (var k = 0; k < inline.length; k++) handleLine(inline[k], lineIdx);
      return;
    }

    /* Đơn giản hóa bỏ các dòng rác chung của đề thi */
    if (/^(?:------------------\s*THE\s*END\s*------------------|thí\s*sinh\s*không|giám\s*thị\s*không|THE\s*END)/i.test(line)) {
      return;
    }
    // Junk filter for English exams
    if (isEnglishMode && /(?:THE\s*END|Thí sinh không được sử dụng tài liệu|Giám thị không giải thích gì thêm)/i.test(line)) {
      return;
    }

    /* Nhận diện Hướng dẫn đọc hiểu trong English Mode */
    if (isEnglishMode && /^(?:read\s+the\s+passage|mark\s+the\s+letter|read\s+the\s+following)/i.test(line)) {
      inPassageBlock = true;
      passageLines = [];
      return;
    }

    /* Thu thập nội dung bài đọc nếu đang trong Block bài đọc cho đến khi gặp Question X */
    if (inPassageBlock) {
      var isQNext = /^(?:câu|question)\s*\d{1,3}\s*[\.\):]/i.test(line) || /^\d{1,3}\s*[\.\)]\s+/.test(line);
      if (!isQNext) {
        passageLines.push(html);
        return;
      } else {
        inPassageBlock = false;
        var fullPassage = passageLines.join("<br>");
        if (cur) cur.passage = fullPassage;
        else pendingPassage = fullPassage;
      }
    }

    var loneImg = extractImageMarker(line);
    if (loneImg && !loneImg.text) {
      var nextIsQuestion = false;
      if (typeof lineIdx === "number") {
        for (var ni = lineIdx + 1; ni < lines.length; ni++) {
          var nt = String((lines[ni] && lines[ni].t) || "").trim();
          if (!nt) continue;
          nextIsQuestion = /^(?:câu|question)\s*\d{1,3}\s*[\.\):]|\d{1,3}\s*[\.\)]\s+/i.test(nt);
          break;
        }
      }
      if (!cur || nextIsQuestion) pendingImage = loneImg.url;
      else cur.image = loneImg.url;
      return;
    }

    if (loneImg && loneImg.text && /^(?:câu|question)\s*\d{1,3}\s*[\.\):]|\d{1,3}\s*[\.\)]\s+/i.test(loneImg.text)) {
      pendingImage = loneImg.url;
      line = loneImg.text;
      html = stripImageMarkerHtml(html);
    }

    var explanationHead = line.match(/^\s*(giải\s*thích\s*\/\s*đáp\s*án|đáp\s*án\s*\/\s*giải\s*thích|lời\s*giải|giải\s*thích|explanation)\s*[:：]\s*(.*)$/i);
    if (explanationHead && cur) {
      explanationMode = true;
      cur.explanationTitle = /\//.test(explanationHead[1]) ? "Đáp án" : "Giải thích";
      if (explanationHead[2].trim()) appendExplanationLine(explanationHead[2].trim(), explanationHead[2].trim());
      return;
    }

    if (explanationMode && cur) {
      var startsNextQuestion = /^(?:câu|question)\s*\d{1,3}\s*[\.\):]|\d{1,3}\s*[\.\)]\s+/i.test(line);
      if (!startsNextQuestion) {
        appendExplanationLine(line, html);
        return;
      }
      explanationMode = false;
    }

    /* Bắt dòng đáp án */
    var ansM = line.match(/^(?:đáp\s*án|answer|key|correct\s*answer)[^:]{0,15}:\s*(.+)$/i);
    if (ansM) {
      var v = ansM[1].trim();
      var letterParenM = v.match(/^([A-Za-z])\s*[\(\[](.+)[\)\]]\s*$/);
      if (letterParenM) {
        answerMark = letterParenM[1].toUpperCase();
        if (cur && cur.type === "multiple" && cur.correctIndex === null) cur.answerLetter = answerMark;
        var parenContent = letterParenM[2].trim();
        if (cur) {
          cur.explanation = cur.explanation ? (cur.explanation + " " + parenContent) : parenContent;
        }
        return;
      }
      var letterM = v.match(/^([A-Za-z])$/);
      if (letterM) {
        answerMark = letterM[1].toUpperCase();
        if (cur && cur.type === "multiple" && cur.correctIndex === null) cur.answerLetter = answerMark;
      } else {
        var parenM = v.match(/\(([^)]+)\)/);
        if (parenM && cur) {
          var stripped = v.replace(/\s*\([^)]*\)\s*$/, "").trim();
          var lm2 = stripped.match(/^([A-Za-z])$/);
          if (lm2) {
            answerMark = lm2[1].toUpperCase();
            if (cur.type === "multiple" && cur.correctIndex === null) cur.answerLetter = answerMark;
            cur.explanation = cur.explanation ? (cur.explanation + " " + parenM[1].trim()) : parenM[1].trim();
            return;
          }
        }
        if (cur && cur.type === "multiple" && !cur.answers.length) {
          cur.type = "short_answer";
          cur.correctAnswer = v;
        }
        pendingShort = { t: v };
        answerMark = null;
      }
      return;
    }

    var expM = line.match(/^\[?\s*(?:lời\s*giải|giải\s*thích|explanation)\s*\]?\s*[:：]\s*\]?\s*(.+)$/i);
    if (expM && cur) {
      var expText = expM[1].trim();
      var startTextIdx = line.indexOf(expText);
      if (startTextIdx < 0) startTextIdx = line.length - expText.length;
      var hi = 0, si = 0;
      while (hi < html.length && si < startTextIdx) {
        if (html[hi] === "<") { var e2 = html.indexOf(">", hi); hi = (e2 < 0) ? html.length : e2 + 1; continue; }
        si++; hi++;
      }
      var expHtml = fixInlineHtml(html.slice(hi));
      cur.explanation = expHtml || expText;
      return;
    }

    /* Dòng phương án A., B., C., D. */
    /* English Mode: các nhãn thường a), b), c), d), e) trước các phương án in hoa
       A., B., C., D. được gom vào thân câu hỏi (không phải phương án trắc nghiệm) */
    if (isEnglishMode && cur && (!cur.opts || cur.opts.length === 0)) {
      var lowerOptM = line.match(/^\s*\*?\s*([a-z])\s*[\.\)]\s*(.+)$/);
      if (lowerOptM) {
        cur.question = (cur.question ? cur.question + "<br>" : "") + (html || line);
        return;
      }
    }

    var optM = line.match(/^(\*)?\s*([A-Za-z])\s*([\.\)\:])\s*(.+)$/);
    if (optM && cur && (cur.type === "multiple" || cur.type === "true_false")) {
      var sep = optM[3];
      var letterChar = optM[2];

      if (sep === ")" && /^[a-z]$/.test(letterChar) && cur.type === "multiple" && !isEnglishMode) {
        cur.type = "true_false";
        cur.subQuestions = [];
      }
      cur.opts = cur.opts || [];
      cur.opts.push({ line: line, html: html, lett: letterChar.toUpperCase(), star: Boolean(optM[1]), txt: optM[4].trim() });
      if (cur.type === "true_false") {
        var txt = optM[4].trim();
        var vv = -1;
        if (optM[1]) vv = 1;
        else {
          var tfm = txt.match(/\(?\s*(Đ|đúng)\s*\)?\s*$/i);
          if (tfm) vv = 1;
          else {
            tfm = txt.match(/\(?\s*(S|sai)\s*\)?\s*$/i);
            if (tfm) vv = 0;
          }
        }
        if (vv < 0) vv = null;
        var cleanTxt = txt.replace(/\(?\s*(Đ|S|đúng|sai)\s*\)?\s*$/i, "").trim();
        var subHtml = cleanOptionHtml(line, html, txt);
        if (cleanTxt !== txt) subHtml = trimHtmlText(subHtml, 0, txt.length - cleanTxt.length);
        if (cleanTxt) cur.subQuestions.push({ text: cleanTxt, html: subHtml, correct: vv });
      }
      return;
    }

    /* Bắt dòng câu hỏi dạng: Question 1. / Câu 1: / 1. */
    var numM = line.match(/^(?:câu|question)\s*(\d{1,3})\s*[\.\):]\s*(.*)$/i)
            || line.match(/^(\d{1,3})\s*[\.\)]\s+(.*)$/);
    if (numM && !/^[A-Da-d]$/.test(numM[1])) {
      closeCur();
      var qtextRaw = numM[2].trim();
      var inlineImg = extractImageMarker(qtextRaw);
      var qtext = inlineImg ? inlineImg.text : qtextRaw;
      var qhtml = cleanOptionHtml(line, html, qtextRaw);
      if (inlineImg) qhtml = stripImageMarkerHtml(qhtml);
      var tf = qtext.match(/\(?\s*(Đ|S|đúng|sai|true|false)\s*\)?\s*$/i);
      if (tf) {
        cur = { type: "true_false", question: qhtml.replace(/\(?\s*(Đ|S|đúng|sai|true|false)\s*\)?\s*$/i, "").trim(), subQuestions: [] };
        cur.subQuestions.push({ text: cur.question, correct: /^đ|^true/i.test(tf[1]) ? 1 : 0 });
      } else if (pendingShort) {
        cur = { type: "short_answer", question: qhtml.trim(), correctAnswer: pendingShort.t };
        pendingShort = null;
      } else {
        cur = { type: "multiple", question: qhtml.trim(), answers: [], correctIndex: null, opts: [] };
      }
      cur.answerLetter = answerMark || null;
      if (pendingPassage) { cur.passage = pendingPassage; pendingPassage = null; }
      answerMark = null;
      if (inlineImg) cur.image = inlineImg.url;
      else if (pendingImage) cur.image = pendingImage;
      pendingImage = null;
      var pm = qtext.match(/\(([A-Da-d])\)\s*$/);
      if (pm && cur.type === "multiple") {
        cur.answerLetter = pm[1].toUpperCase();
        cur.question = cur.question.replace(/\([A-Da-d]\)\s*$/, "").trim();
      }
      return;
    }

    /* Gom các dòng text tự do / lời dẫn (Dear Dr Cheetah, a. Critics...) vào thân câu hỏi hiện tại */
    if (cur && cur.opts.length === 0 && !/^(?:đáp\s*án|answer|key)/i.test(line)) {
      cur.question += "<br>" + (html || line);
      return;
    }

    if (String(line || "").trim()) warnings.push("Bỏ qua (không nhận dạng): “" + line + "”");
  }

  (lines || []).forEach(function (L, i) { handleLine(L, i); });
  closeCur();

  if (!questions.length) {
    return { sections: [], warnings: warnings, error: "Không nhận dạng được câu nào. Kiểm tra có đánh số '1.', 'Câu 2:' hoặc 'Question 1:' + dòng đáp án 'A.', 'B.', ..." };
  }

  var multipleNoAns = questions.filter(function (q) { return q.type === "multiple" && q.correctIndex === null; }).length;
  if (multipleNoAns) {
    warnings.push(multipleNoAns + " câu chưa gán đáp án đúng → bấm vào đáp án trong phần xem trước để gán.");
  }

  var tfUnset = 0;
  questions.forEach(function (q) {
    if (q.type === "true_false") (q.subQuestions || []).forEach(function (sq) { if (sq.correct !== 0 && sq.correct !== 1) tfUnset++; });
  });
  if (tfUnset) {
    warnings.push(tfUnset + " mệnh đề Đúng/Sai chưa đánh dấu (Đ)/(S) → bấm Đ hoặc S trong phần xem trước để gán.");
  }

  return {
    sections: [{
      sectionTitle: isEnglishMode ? "SECTION I — IDENTIFIED QUESTIONS" : "PHẦN I — ĐỀ ĐÃ NHẬN DẠNG",
      sectionDesc: "Tự động từ văn bản: <b>" + questions.length + "</b> câu (" +
        questions.filter(function (q) { return q.type === "multiple"; }).length + " trắc nghiệm, " +
        questions.filter(function (q) { return q.type === "true_false"; }).length + " đúng/sai, " +
        questions.filter(function (q) { return q.type === "short_answer"; }).length + " tự luận).",
      timeLimit: 0,
      questions: questions
    }],
    warnings: warnings,
    error: null
  };
}

function escAttr(s) { return String(s == null ? "" : s).replace(/"/g, "&quot;"); }

function stripQuestionNo(s) {
  s = String(s == null ? "" : s);
  var m = /^(\s*)((?:<[^>]+>\s*)*)((?:câu|câu\s+hỏi|question)\s+)?(\d{1,3})\s*[.:)]\s*/i.exec(s);
  if (!m) return s;
  var rest = s.slice(m[0].length);
  if (/^[\d.]/.test(rest.replace(/\s+/g, "").charAt(0) || "")) return s;
  return fixInlineHtml(rest);
}

function bindSectionEdit(el, section, field, placeholder) {
  if (!el) return;
  var snapshot = "";
  var label = field === "sectionTitle" ? "tiêu đề" : "mô tả";
  el.title = "Bấm để sửa " + label + " phần";
  el.addEventListener("click", function () {
    if (el.isContentEditable) return;
    snapshot = el.textContent;
    el.classList.add("is-editing");
    el.classList.remove("is-empty");
    el.setAttribute("contenteditable", "true");
    el.setAttribute("spellcheck", "false");
    el.focus();
    var range = document.createRange();
    range.selectNodeContents(el);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  });
  el.addEventListener("keydown", function (e) {
    if (!el.isContentEditable) return;
    if (e.key === "Enter") { e.preventDefault(); el.blur(); }
    else if (e.key === "Escape") { e.preventDefault(); commitSectionEdit(el, section, field, placeholder, snapshot, false); el.blur(); }
  });
  el.addEventListener("blur", function () {
    if (!el.isContentEditable) return;
    commitSectionEdit(el, section, field, placeholder, snapshot, true);
  });
}

function commitSectionEdit(el, section, field, placeholder, snapshot, save) {
  el.removeAttribute("contenteditable");
  el.classList.remove("is-editing");
  var val = (save ? el.textContent : snapshot).replace(/\s+/g, " ").trim();
  if (field === "sectionTitle") {
    if (val) section.sectionTitle = val; else delete section.sectionTitle;
  } else {
    if (val) section.sectionDesc = val; else delete section.sectionDesc;
  }
  el.textContent = val || placeholder;
  el.classList.toggle("is-empty", !val);
  syncJson();
}

function stripBoldTags(html) {
  return String(html == null ? "" : html).replace(/<\/?(?:b|strong)(?:\s[^>]*)?>/gi, "");
}

function render() {
  var area = $("renderArea");
  area.innerHTML = "";
  if (!testData || !testData.length) {
    area.innerHTML = '<div class="placeholder">Chưa có đề. Dán text rồi bấm "Đọc text → JSON" hoặc tạo JSON mẫu.</div>';
    return;
  }

  var gi = 0;
  var qCount = 0;
  var imgCount = 0;

  testData.forEach(function (section, si) {
    if (!section || !Array.isArray(section.questions)) return;
    var sec = document.createElement("div");
    sec.className = "rd-section";

    var head = document.createElement("div");
    head.className = "rd-section-head";
    head.innerHTML =
      "<h3>" + sanitizeC(section.sectionTitle || ("PHẦN " + (si + 1))) + "</h3>" +
      '<div class="desc' + (section.sectionDesc ? "" : " is-empty") + '">' +
        (section.sectionDesc ? sanitizeC(section.sectionDesc) : "Thêm mô tả phần…") + "</div>";

    bindSectionEdit(head.querySelector("h3"), section, "sectionTitle", "PHẦN " + (si + 1));
    bindSectionEdit(head.querySelector(".desc"), section, "sectionDesc", "Thêm mô tả phần…");

    if (section.audio) {
      head.insertAdjacentHTML("beforeend",
        '<div class="rd-listen"><span class="muted"><i class="fa-solid fa-headphones"></i> ' + escapeC(section.listenTitle || "Nghe") + ': </span>' +
        '<audio controls preload="none" src="' + escAttr(section.audio) + '"></audio></div>');
    }
    sec.appendChild(head);

    if (section.passage && String(section.passage).trim()) {
      var pg = document.createElement("div");
      pg.className = "rd-passage";
      pg.innerHTML = sanitizeC(section.passage);
      sec.appendChild(pg);
    }

    section.questions.forEach(function (item) {
      var idx = gi;
      var card = document.createElement("div");
      card.className = "q-card";
      if (item.type === "true_false" && (item.explanationTitle === "Đáp án" || item.explanationTitle === "Giải thích/Đáp án")) {
        card.classList.add("q-answer-key");
      }
      var type = item.type === "true_false" ? "tf" : (item.type === "short_answer" ? "short" : "multiple");
      var tagTxt = item.type === "true_false" ? "Đúng/Sai" : (item.type === "short_answer" ? "Tự luận" : "Trắc nghiệm");

      var qMarker = extractImageMarker(item.question);
      var qText = qMarker ? qMarker.text : (item.question || "");

      var headQ = document.createElement("div");
      headQ.className = "q-head";
      headQ.innerHTML = '<span class="num">' + qWord() + ' ' + (idx + 1) + "</span>" +
        '<div class="q-q">' + stripBoldTags(stripQuestionNo(qText)) +
        '<span class="tag tag-' + type + '">' + tagTxt + "</span></div>";
      card.appendChild(headQ);

      /* Nút tách phần từ câu này trở xuống (ẩn, hiện khi hover) */
      var splitBtn = document.createElement("button");
      splitBtn.type = "button";
      splitBtn.className = "btn btn-ghost";
      splitBtn.style.cssText = "display:none;margin:6px 0 0;font-size:12px;padding:4px 8px;";
      splitBtn.innerHTML = '<i class="fa-solid fa-scissors"></i> Tách từ đây';
      splitBtn.addEventListener("click", function () { splitSectionFromQuestion(idx); });
      card.appendChild(splitBtn);
      card.addEventListener("mouseenter", function () { splitBtn.style.display = "inline-block"; });
      card.addEventListener("mouseleave", function () { splitBtn.style.display = "none"; });

      var qImgUrl = imageFieldUrl(item.image) || (qMarker ? qMarker.url : "");
      if (qImgUrl && /^https?:\/\//i.test(qImgUrl)) {
        imgCount++;
        var imgBox = document.createElement("div");
        imgBox.className = "q-image";
        imgBox.innerHTML = '<img src="' + escAttr(qImgUrl) + '" alt=""' + imgErrorAttrs(qImgUrl) + '>';
        card.appendChild(imgBox);
      }

      if (type === "multiple") {
        var list = document.createElement("div");
        var ansArr = item.answers || [];
        var stacked = ansArr.some(function (aa) {
          return !answerImageUrl(aa) && String(aa == null ? "" : aa).length > 38;
        });
        list.className = "opt-list" + (stacked ? " stacked" : "");
        var lblPat = 0, lblPos = 0;
        ansArr.forEach(function (a, i) {
          var m = /^([A-Za-z])\s*[.、)]\s+/.exec(String(a == null ? "" : a));
          if (!m) return;
          lblPat++;
          if (m[1].toUpperCase() === letter(i)) lblPos++;
        });
        var labeled = lblPat >= 2 && lblPat === lblPos;
        ansArr.forEach(function (a, i) {
          var dispA = String(a == null ? "" : a);
          if (labeled) dispA = dispA.replace(/^([A-Za-z])\s*[.、)]\s+/, "");
          var o = document.createElement("div");
          o.className = "opt";
          if (graded) {
            var chosen = userAnswers[idx] === i;
            if (i === item.correct) o.classList.add("correct");
            else if (chosen) o.classList.add("wrong");
          } else {
            o.classList.add("pickable");
            if (item.correct === i) o.classList.add("sel-correct");
          }
          var checked = (!graded && userAnswers[idx] === i) ? " checked" : "";
          var imgA = answerImageUrl(dispA);
          var answerHtml = imgA
            ? '<img class="opt-img" src="' + escAttr(imgA) + '" alt="Đáp án ' + letter(i) + '" loading="lazy" onerror="this.style.display=\'none\'">'
            : dispA;
          o.innerHTML = '<span class="lett">' + letter(i) + "</span>" +
            '<input type="radio" name="q' + idx + '" value="' + i + '"' + checked + ">" +
            "<label>" + answerHtml + "</label>" +
            '<span class="setcard">' + (item.correct === i ? "Đáp án ✔" : "bấm → gán đáp án") + "</span>";
          o.addEventListener("click", function () {
            if (graded) return;
            var oldCorrect = item.correct;
            item.correct = i;
            if (oldCorrect !== i) {
              var oldL = (oldCorrect === null || oldCorrect === undefined || oldCorrect === "") ? "—" : letter(oldCorrect);
              notifyToast("Thay đổi đáp án - " + qWord() + " " + (idx + 1) + ": " + oldL + " → " + letter(i), "info");
            }
            var scAll = list.querySelectorAll(".opt .setcard");
            for (var k2 = 0; k2 < scAll.length; k2++) scAll[k2].textContent = "bấm → gán đáp án";
            list.querySelectorAll(".opt").forEach(function (x) { x.classList.remove("sel-correct"); });
            o.classList.add("sel-correct");
            var sc2 = o.querySelector(".setcard");
            if (sc2) sc2.textContent = "Đáp án ✔";
            var inp = o.querySelector("input");
            if (inp) { inp.checked = true; userAnswers[idx] = i; }
            var noAnsHint = card.querySelector(".no-ans-hint");
            if (noAnsHint) noAnsHint.remove();
            syncJson();
          });
          list.appendChild(o);
        });
        card.appendChild(list);
        if (!graded && (item.correct === null || item.correct === undefined || item.correct === "")) {
          var hint = document.createElement("div");
          hint.className = "note no-ans-hint";
          hint.style.marginTop = "8px";
          hint.textContent = "Chưa có đáp án đúng — bấm vào một phương án bên trên để gán.";
          card.appendChild(hint);
        }
      } else if (type === "tf" && (item.explanationTitle === "Đáp án" || item.explanationTitle === "Giải thích/Đáp án")) {
        var answerKeyList = document.createElement("div");
        answerKeyList.className = "tf-answer-key";
        answerKeyList.innerHTML = (item.subQuestions || []).map(function (sq, subIndex) {
          return '<div class="answer-key-statement"><span>' + String.fromCharCode(97 + subIndex) + ')</span> ' +
            sanitizeC(stripBoldTags(sq.html || sq.text || "")) + '</div>';
        }).join("");
        card.appendChild(answerKeyList);
      } else if (type === "tf") {
        var tfl = document.createElement("div");
        tfl.className = "tf-list";
        if (!item.subQuestions || !item.subQuestions.length) {
          var tfnote = document.createElement("div");
          tfnote.className = "note error";
          tfnote.style.marginTop = "8px";
          tfnote.textContent = "Chưa có mệnh đề — bổ sung mảng subQuestions trong JSON.";
          card.appendChild(tfnote);
        }
        (item.subQuestions || []).forEach(function (sq, si) {
          var row = document.createElement("div");
          row.className = "tf-row";
          var val = userAnswers["tf_" + idx + "_" + si];
          var kv = (sq.correct === 0 || sq.correct === 1) ? sq.correct : -1;
          if (graded) row.classList.add(val === kv ? "good" : "bad");
          var answerClass = graded ? (val === kv ? "ans-good" : "ans-bad") : (kv === 1 ? "ans-good" : "ans-bad");
          row.innerHTML = '<span class="tf-lett">' + String.fromCharCode(97 + si) + "</span>" +
            '<span class="txt">' + stripBoldTags(sq.text) +
              (!graded && kv < 0 ? '<span class="ans ans-bad">(chưa chọn Đ/S)</span>' : "") +
              (kv >= 0 ? '<span class="ans ' + answerClass + '">(Đáp án: ' + (kv === 1 ? "Đúng" : "Sai") + ")</span>" : "") +
            "</span>" +
            '<div class="tf-opts">' +
            '<label' + (kv === 1 ? ' class="cor"' : "") + '><input type="radio" name="tf' + idx + "_" + si + '" value="1"' + (val === 1 ? " checked" : "") + "><b>Đ</b></label>" +
            '<label' + (kv === 0 ? ' class="cor"' : "") + '><input type="radio" name="tf' + idx + "_" + si + '" value="0"' + (val === 0 ? " checked" : "") + "><b>S</b></label>" +
            "</div>";
          row.querySelectorAll("input").forEach(function (inp) {
            inp.addEventListener("change", function () {
              if (graded) return;
              var __oldTf = (sq.correct === 0 || sq.correct === 1) ? (sq.correct === 1 ? "Đúng" : "Sai") : "—";
              var __newTf = (Number(inp.value) === 1) ? "Đúng" : "Sai";
              sq.correct = Number(inp.value);
              var r2 = this.closest(".tf-row");
              if (!r2) return;
              r2.querySelectorAll(".tf-opts label").forEach(function (l) {
                l.classList.remove("cor");
                l.classList.remove("on");
              });
              this.parentElement.classList.add("cor");
              var un = r2.querySelector(".ans-bad");
              if (un && /chưa chọn/.test(un.textContent)) un.remove();
              syncJson();
              if (__oldTf !== __newTf) notifyToast("Thay đổi đáp án - " + qWord() + " " + (idx + 1) + " (" + String.fromCharCode(97 + si) + "): " + __oldTf + " → " + __newTf, "info");
            });
          });
          tfl.appendChild(row);
        });
        card.appendChild(tfl);
      } else if (type === "short") {
        var ta = document.createElement("textarea");
        ta.className = "short-input";
        ta.rows = item.rows || 3;
        ta.placeholder = "Nhập câu trả lời của bạn...";
        ta.value = userAnswers["short_" + idx] || "";
        ta.addEventListener("input", function () { userAnswers["short_" + idx] = ta.value; });
        card.appendChild(ta);
        if (!graded) {
          var sv = document.createElement("button");
          sv.type = "button";
          sv.className = "btn btn-ghost";
          sv.style.marginTop = "8px";
          sv.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Lưu làm đáp án mẫu';
          sv.addEventListener("click", function () {
            var v = ta.value.trim();
            item.correctAnswer = v;
            var anOld = card.querySelector(".short-ans, .no-ans-hint");
            if (anOld) {
              if (v) {
                anOld.className = "short-ans";
                anOld.style.margin = "";
                anOld.innerHTML = "Đáp án: \u201C" + escapeC(v) + "\u201D";
              } else {
                anOld.className = "note error no-ans-hint";
                anOld.style.margin = "8px 0 0";
                anOld.textContent = "Chưa có đáp án mẫu — thêm correctAnswer trong JSON.";
              }
            }
            syncJson();
            setNote(v ? ("Đã lưu \u201C" + escapeC(v) + "\u201D làm đáp án mẫu.") : "Đã xóa đáp án mẫu.", false, "success");
          });
          card.appendChild(sv);
        }
        if (!graded) {
          var an = document.createElement("div");
          if (item.correctAnswer && String(item.correctAnswer).trim()) {
            an.className = "short-ans";
            an.innerHTML = "Đáp án: \u201C" + escapeC(item.correctAnswer) + "\u201D";
          } else {
            an.className = "note error no-ans-hint";
            an.style.margin = "8px 0 0";
            an.textContent = "Chưa có đáp án mẫu — thêm correctAnswer trong JSON.";
          }
          card.appendChild(an);
        }
        if (graded) {
          var ok = norm(userAnswers["short_" + idx]) === norm(item.correctAnswer);
          var rev = document.createElement("div");
          rev.className = "note " + (ok ? "" : "error");
          rev.style.margin = "8px 0 0";
          var caSafe = escapeC(item.correctAnswer);
          rev.innerHTML = ok ? "✓ Đáp án chuẩn: " + caSafe : "✗ Đáp án chuẩn: <b>" + caSafe + "</b>";
          card.appendChild(rev);
        }
      }
      if (item.explanation) {
        var expBox = document.createElement("div");
        var detailedExplanation = item.explanationTitle === "Đáp án" || item.explanationTitle === "Giải thích/Đáp án";
        expBox.className = "q-explanation" + (detailedExplanation ? " q-explanation-detailed" : "");
        expBox.innerHTML = "<b class=\"exp-label\">" + sanitizeC(item.explanationTitle || "Giải thích") + ":</b> " + item.explanation;
        card.appendChild(expBox);
      }
      sec.appendChild(card);
      qCount++;
      gi++;
    });

    var foot = document.createElement("div");
    foot.className = "rd-foot";
    foot.innerHTML = "Phần này có " + section.questions.length + " câu" +
      (section.timeLimit ? " · giới hạn " + section.timeLimit + " phút" : " · không giới hạn thời gian");
    sec.appendChild(foot);

    area.appendChild(sec);
  });

  var rcEl = $("renderCount");
  if (rcEl) rcEl.textContent = testData.length + " phần - " + imgCount + " ảnh - " + qCount + " câu";
  var jumpEl = $("jumpQ");
  if (jumpEl) { jumpEl.max = qCount || 1; if (Number(jumpEl.value) > qCount) jumpEl.value = qCount || ""; }
}

function norm(v) {
  return String(v == null ? "" : v).trim().toLowerCase().replace(/\s+/g, " ");
}

function splitSectionFromQuestion(globalIdx) {
  var gi = 0, secIdx = -1, localIdx = -1;
  for (var s = 0; s < testData.length; s++) {
    var qs = testData[s].questions || [];
    if (globalIdx >= gi && globalIdx < gi + qs.length) { secIdx = s; localIdx = globalIdx - gi; break; }
    gi += qs.length;
  }
  if (secIdx < 0) return;
  var sec = testData[secIdx];
  var qs = sec.questions || [];
  if (localIdx >= qs.length) return;
  if (qs.length - localIdx < 1) return;
  var moved = qs.slice(localIdx);
  var kept = qs.slice(0, localIdx);
  sec.questions = kept;
  var newSec = {
    sectionTitle: "PHẦN " + (testData.length + 1) + ". (Mới tách)",
    sectionDesc: sec.sectionDesc || "",
    questions: moved
  };
  testData.splice(secIdx + 1, 0, newSec);
  if (!kept.length) testData.splice(secIdx, 1);
  if (typeof syncJson === "function") syncJson();
  if (typeof render === "function") render();
}

function jumpToQuestion(n) {
  var area = $("renderArea");
  var input = $("jumpQ");
  if (!area) return;
  var cards = area.querySelectorAll(".q-card");
  var total = cards.length;
  if (!total) return;
  n = Math.floor(Number(n));
  if (!isFinite(n) || n < 1) n = 1;
  if (n > total) n = total;
  if (input) input.value = n;
  var card = cards[n - 1];
  var top = card.getBoundingClientRect().top - area.getBoundingClientRect().top + area.scrollTop - 10;
  area.scrollTo({ top: top < 0 ? 0 : top, behavior: "smooth" });
  card.classList.remove("q-jump-flash");
  void card.offsetWidth;
  card.classList.add("q-jump-flash");
  setTimeout(function () { card.classList.remove("q-jump-flash"); }, 1300);
}

function sampleText() {
  return [
    "PHẦN I. TRẮC NGHIỆM",
    "1. Thủ đô của Việt Nam là thành phố nào?",
    "Ảnh: https://placehold.co/640x320/png?text=Hinh+cau+hoi",
    "A. Hà Nội",
    "B. TP. Hồ Chí Minh",
    "C. Đà Nẵng",
    "D. Cần Thơ",
    "Đáp án: A",
    "",
    "2. Công thức tính vận tốc là:",
    "A. v = s/t",
    "B. v = s × t",
    "C. v = a × t",
    "*D. v = s²",
    "",
    "3. Chọn hình minh họa đúng cho khái niệm trên?",
    "A. https://placehold.co/420x280/png?text=Hinh+A",
    "B. Ảnh: https://placehold.co/420x280/png?text=Hinh+B",
    "C. Link ảnh: https://placehold.co/420x280/png?text=Hinh+C",
    "*D. https://placehold.co/420x280/png?text=Hinh+D",
    "",
    "PHẦN II. ĐÚNG / SAI",
    "4. Cho biết mỗi nhận định sau đúng hay sai?",
    "a) Trái Đất quay quanh Mặt Trời. (Đ)",
    "b) 1 + 1 = 3. (S)",
    "*c) Mặt Trời mọc ở hướng Đông.",
    "d) Việt Nam nằm ở châu Á. (Đ)",
    "",
    "PHẦN III. TỰ LUẬN",
    "5. Ngôn ngữ dùng tạo cấu trúc web là gì? (viết tắt 4 chữ cái)",
    "Đáp án: html"
  ].join("\n");
}

function sampleTextEN() {
  return [
    "Part 1. Mark the letter A, B, C or D on your answer sheet to indicate the best arrangement of utterances or sentences to make a cohesive and coherent exchange or text in each of the following questions from 1 to 2.",
    "Question 1.",
    "a. Hi Mai, how was your weekend?",
    "b. It was great! I went hiking with my cousins.",
    "c. That sounds fun. Which mountain did you climb?",
    "A. a – b – c        B. b – a – c        C. c – a – b        D. a – c – b",
    "Answer: A",
    "Question 2.",
    "a. However, many schools still lack the equipment needed for online lessons.",
    "b. Online learning has become increasingly popular among students worldwide.",
    "c. Therefore, governments should invest more in digital infrastructure.",
    "A. a – b – c        B. b – a – c        C. b – c – a        D. c – b – a",
    "Answer: B",
    "",
    "Part 2. Read the following advertisement and mark the letter A, B, C or D on your answer sheet to indicate the correct option that best fits each of the numbered blanks from 3 to 5.",
    "GIVE BLOOD, GIVE HOPE",
    "If it were not for regular donors, blood banks nationwide (3)_____ struggling to meet demand within weeks. This is especially true during holidays when donation (4)_____ typically fall.",
    "Each blood unit donated can save up to three lives. The sooner patients receive the blood they need, the more chances of (5)_____ they will have.",
    "Question 3. A.are B.is C.were D.be",
    "Answer: C",
    "Question 4. A.charges B.duties C.rates D.price",
    "Answer: C",
    "Question 5. A. recover B. recovery C. recovering D. recovered",
    "Answer: B",
    "",
    "Part 3. Read the following passage and mark the letter A, B, C or D on your answer sheet to indicate the correct answer to each of the questions from 6 to 7.",
    "My family is small. There are four people in it: my father, my mother, my brother and me. My father is a doctor. My mother is a teacher.",
    "Question 6. How many people are in the family?",
    "A. Three",
    "B. Four",
    "C. Five",
    "D. Six",
    "Answer: B",
    "Question 7. What is the mother's job?",
    "A. A doctor",
    "B. A teacher",
    "C. A nurse",
    "D. A farmer",
    "Answer: B",
    "",
    "Part 4. Listen to the recording and mark the letter A, B, C or D on your answer sheet to indicate the correct answer to each of the questions.",
    "https://static-assets.prepcdn.com/content-management-system/Part_1_Listening_87386e8c4b.mp3",
    "Question 8. What time is the meeting?",
    "A. 7:00 AM",
    "B. 8:00 AM",
    "C. 9:00 AM",
    "D. 10:00 AM",
    "Answer: B",
    ""
  ].join("\n");
}

function jsonSample() {
  return JSON.stringify([
    {
      "sectionTitle": "PHẦN I. TRẮC NGHIỆM",
      "sectionDesc": "Chọn <b>một</b> đáp án chính xác nhất:",
      "timeLimit": 5,
      "questions": [
        { "type": "multiple", "image": "https://placehold.co/640x320/png?text=Hinh+cau+hoi", "question": "Công thức tính vận tốc là:", "answers": ["v = s/t", "v = s*t", "v = a*t", "v = s^2"], "correct": 0 },
        { "type": "multiple", "question": "Biểu thức <i>2 + 2 × 2</i> bằng:", "answers": ["4", "8", "6", "0"], "correct": 2 },
        { "type": "multiple", "question": "Chọn hình đúng (đáp án dạng ảnh):", "answers": ["https://placehold.co/420x280/png?text=JSON+A", "Ảnh: https://placehold.co/420x280/png?text=JSON+B", "https://placehold.co/420x280/png?text=JSON+C", "https://placehold.co/420x280/png?text=JSON+D"], "correct": 1 }
      ]
    },
    {
      "sectionTitle": "PHẦN II. ĐÚNG / SAI",
      "questions": [
        {
          "type": "true_false",
          "question": "Cho biết đúng hay sai:",
          "subQuestions": [
            { "text": "Nước sôi ở 100°C tại mực nước biển.", "correct": 1 },
            { "text": "1 + 1 = 3.", "correct": 0 }
          ]
        }
      ]
    },
    {
      "sectionTitle": "PHẦN III. TỰ LUẬN",
      "questions": [
        { "type": "short_answer", "question": "Viết tắt của HyperText Markup Language là gì?", "correctAnswer": "html", "rows": 2 }
      ]
    },
    {
      "sectionTitle": "PHẦN IV. NGHE",
      "type": "listening",
      "listenTitle": "Đoạn thông báo ngắn",
      "audio": "https://static-assets.prepcdn.com/content-management-system/Part_1_Listening_87386e8c4b.mp3",
      "questions": [
        { "type": "multiple", "question": "What is the new closing time on Fridays?", "answers": ["6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM"], "correct": 3 }
      ]
    },
    {
      "sectionTitle": "PHẦN V. ĐỌC HIỂU",
      "passage": "Học tập kết hợp (<b>blended learning</b>) là mô hình... <br><br>" +
        "Ưu điểm: <b>học theo tốc độ của mình</b>, xem lại bài giảng, diễn đàn thảo luận.",
      "timeLimit": 10,
      "questions": [
        { "type": "multiple", "question": "Ý chính của đoạn văn là gì?", "answers": ["Lịch sử trường học", "Ưu điểm của mô hình học kết hợp", "Chi phí học phí", "Cách nấu ăn"], "correct": 1 }
      ]
    }
  ], null, 2);
}

function showEditDiffModal(onConfirm) {
  var snap = window.__originalEditSnapshot;
  var body = $("editDiffBody");
  if (!snap || !snap.meta || !body) { if (typeof onConfirm === "function") onConfirm(); return; }
  var oldM = snap.meta;
  var newM = testMeta;
  var fields = [
    ["Tên đề", "name"],
    ["Môn", "subject"],
    ["Thời gian (phút)", "minutes"],
    ["Điểm tối đa", "score"],
    ["Trộn câu", "shuffleQ"],
    ["Trộn đáp án", "shuffleA"],
    ["Hiện điểm", "showScore"],
    ["Hiện đáp án", "showAnswers"],
    ["Đề con", "subtestEnabled"],
    ["Số câu đề con", "subtestCount"],
    ["Số lần làm tối đa", "maxAttempts"],
    ["Mật khẩu", "password"],
    ["Giới hạn thời gian", "timeEnabled"],
    ["Bắt đầu", "startAt"],
    ["Kết thúc", "endAt"]
  ];
  var html = "";
  fields.forEach(function (f) {
    var k = f[1], label = f[0];
    var ov = oldM[k], nv = newM[k];
    if (JSON.stringify(ov) !== JSON.stringify(nv)) {
      html += '<div><b>' + escapeC(label) + ':</b> <span style="text-decoration:line-through;color:#94a3b8">' + escapeC(String(ov === null ? "—" : ov)) + '</span> → <b>' + escapeC(String(nv === null ? "—" : nv)) + '</b></div>';
    }
  });
  var oldData = snap.data;
  var newData = JSON.stringify(testData);
  if (oldData !== newData) {
    var oldSections = [];
    try { oldSections = JSON.parse(oldData || "[]"); } catch (e) { oldSections = []; }
    var changes = [];
    var textFields = ["title", "question", "text", "prompt", "passage", "explanation", "name", "desc", "description", "sectionTitle", "questionText", "answer", "correctAnswer", "shortAnswer", "sampleAnswer"];
    function diffTextFields(o, n, label) {
      textFields.forEach(function (f) {
        if (o && n && Object.prototype.hasOwnProperty.call(o, f) && Object.prototype.hasOwnProperty.call(n, f)) {
          var ov = o[f], nv = n[f];
          if (ov !== nv && String(ov||"").trim() !== String(nv||"").trim()) {
            var oShort = String(ov == null ? "" : ov).slice(0, 60);
            var nShort = String(nv == null ? "" : nv).slice(0, 60);
            changes.push(label + " – " + f + ": " + (oShort || "∅") + " → " + (nShort || "∅"));
          }
        }
      });
    }
    function flatten(sections) {
      var out = [];
      (sections || []).forEach(function (s) {
        out.push({ type: "section", node: s });
        (s.questions || []).forEach(function (q, qi) { out.push({ type: "question", node: q, qi: qi }); });
      });
      return out;
    }
    var oldQs = flatten(oldSections);
    var newQs = flatten(testData);
    var n = Math.max(oldQs.length, newQs.length);
    for (var i = 0; i < n; i++) {
      var oq = oldQs[i] ? oldQs[i].node : null;
      var nq = newQs[i] ? newQs[i].node : null;
      var num = i + 1;
      if (!oq && nq) { changes.push(qWord() + " " + num + ": thêm mới"); continue; }
      if (oq && !nq) { changes.push(qWord() + " " + num + ": đã xóa"); continue; }
      if (!oq || !nq) continue;
      diffTextFields(oq, nq, qWord() + " " + num);
      var oldC = oq.correct, newC = nq.correct;
      if (oldC !== newC && (oldC !== null || newC !== null) && (oldC !== undefined || newC !== undefined)) {
        var oldL = (oldC === null || oldC === undefined) ? "—" : letter(oldC);
        var newL = (newC === null || newC === undefined) ? "—" : letter(newC);
        if (oldL !== newL) changes.push(qWord() + " " + num + ": đáp án " + oldL + " → " + newL);
      }
      if (Array.isArray(oq.subQuestions) && Array.isArray(nq.subQuestions)) {
        var m = Math.max(oq.subQuestions.length, nq.subQuestions.length);
        for (var si = 0; si < m; si++) {
          var osq = oq.subQuestions[si] || {};
          var nsq = nq.subQuestions[si] || {};
          diffTextFields(osq, nsq, qWord() + " " + num + " (" + String.fromCharCode(97 + si) + ")");
          if (osq.correct !== nsq.correct) {
            var ol = (osq.correct === 1) ? "Đ" : (osq.correct === 0) ? "S" : "—";
            var nl = (nsq.correct === 1) ? "Đ" : (nsq.correct === 0) ? "S" : "—";
            if (ol !== nl) changes.push(qWord() + " " + num + " (" + String.fromCharCode(97 + si) + "): đáp án " + ol + " → " + nl);
          }
        }
      }
      if (Array.isArray(oq.options) && Array.isArray(nq.options)) {
        var mo = Math.max(oq.options.length, nq.options.length);
        for (var oi = 0; oi < mo; oi++) {
          var oo = oq.options[oi], no = nq.options[oi];
          if (oo !== no) {
            changes.push(qWord() + " " + num + " - đáp án " + letter(oi) + ": " + String(oo == null ? "—" : oo).slice(0,40) + " → " + String(no == null ? "—" : no).slice(0,40));
          }
        }
      }
    }
    if (changes.length) {
      html += '<div><b>Thay đổi nội dung:</b><br>' + changes.map(function (c) { return '<div style="margin-left:12px">• ' + escapeC(c) + '</div>'; }).join("") + '</div>';
    } else if (oldData !== newData) {
      html += '<div><b>Nội dung đề:</b> đã chỉnh sửa (số câu: ' + countQ(oldSections) + ' → ' + countQ(testData) + ')</div>';
    }
  }
  if (!html) html = '<div class="muted">Không có thay đổi nào.</div>';
  body.innerHTML = html;
  var modal = $("editDiffModal");
  if (modal) modal.style.display = "flex";
  var btn = $("editDiffConfirm");
  if (btn) {
    btn.onclick = function () {
      if (modal) modal.style.display = "none";
      if (typeof onConfirm === "function") onConfirm();
    };
  }
}

function applyMeta(goNext) {
  if (!testData || !testData.length) { setNote("Chưa có đề để áp dụng thiết lập.", true); return; }
  testData.forEach(function (s) {
    if (!s || !Array.isArray(s.questions)) return;
    if (testMeta.minutes > 0) s.timeLimit = testMeta.minutes;
    else delete s.timeLimit;
  });
  graded = false;
  userAnswers = {};
  $("resultBox").hidden = true;
  if (!jsonAreaDirty) writeJson(JSON.stringify(testData, null, 2));
  render();
  if (goNext) showStage(4);
}

function textOf(x) {
  var s = String(x == null ? "" : x);
  if (!/<[a-zA-Z/]/.test(s)) return s.replace(/\s+/g, " ").trim();
  var d = document.createElement("div");
  d.innerHTML = s;
  return (d.textContent || "").replace(/\s+/g, " ").trim();
}

function renderReview() {
  var area = $("revArea");
  var headActions = $("revHeadActions");
  if (headActions) headActions.innerHTML = "";
  if (!testData || !testData.length) {
    area.innerHTML = '<div class="placeholder">Chưa có đề để rà soát.</div>';
    return;
  }
  var qn = countQ(testData);
  var nSec = testData.filter(function (s) { return s && Array.isArray(s.questions); }).length;
  var subtestOn = !!testMeta.subtestEnabled;
  var subtestRaw = parseInt(testMeta.subtestCount, 10) || 0;
  var subtestInvalid = subtestOn && (subtestRaw < 1 || subtestRaw > qn);
  var subtestN = subtestOn ? Math.min(Math.max(subtestRaw, 0), qn) : 0;
  var tfUnset = 0;
  testData.forEach(function (s) {
    (s && s.questions || []).forEach(function (it) {
      if (it.type === "true_false") (it.subQuestions || []).forEach(function (sq) { if (sq.correct !== 0 && sq.correct !== 1) tfUnset++; });
    });
  });

  var left = "";
  testData.forEach(function (s, si) {
    var cnt = (s && Array.isArray(s.questions)) ? s.questions.length : 0;
    left += '<div class="rev-sec">' +
      '<div class="rev-sec-head"><h3>' + sanitizeC(s.sectionTitle || ("PHẦN " + (si + 1))) + "</h3>" +
        '<span class="rev-sec-meta">' + cnt + " câu" + (s.timeLimit ? ' · <i class="fa-solid fa-clock"></i> ' + s.timeLimit + " phút" : "") + "</span>" +
      "</div>";
    if (s.sectionDesc) left += '<div class="rev-sec-desc">' + sanitizeC(s.sectionDesc) + "</div>";
    if (s.audio) left += '<div class="rev-extra"><i class="fa-solid fa-headphones"></i> ' + escapeC(s.listenTitle || "Nghe") + "</div>";
    if (s.passage && String(s.passage).trim()) left += '<div class="rev-extra"><i class="fa-solid fa-book-open"></i> Có đoạn đọc hiểu kèm câu hỏi</div>';
    left += '<ol class="rev-qs">';
    (s.questions || []).forEach(function (item) {
      var cls = item.type === "true_false" ? "tf" : (item.type === "short_answer" ? "short" : "multiple");
      var tagTxt = item.type === "true_false" ? "Đúng/Sai" : (item.type === "short_answer" ? "Tự luận" : "Trắc nghiệm");
      var revMarker = extractImageMarker(item.question);
      var revQ = revMarker ? revMarker.text : (item.question || "");
      left += "<li><span class='q-tag tag tag-" + cls + "'>" + tagTxt + "</span> " +
        escapeC(textOf(stripQuestionNo(revQ)));
      if (item.image || revMarker) left += ' <span class="muted"><i class="fa-regular fa-image"></i> có ảnh</span>';
      if (item.type === "true_false") {
        var subs = (item.subQuestions || []).map(function (sq, k) {
          return String.fromCharCode(97 + k) + "=" + (sq.correct === 1 ? "Đúng" : sq.correct === 0 ? "Sai" : "chưa chọn");
        });
        left += ' <span class="muted">(' + (subs.length ? subs.join(" · ") : "chưa có mệnh đề") + ")</span>";
      } else if (item.type === "short_answer") {
        var ca = textOf(item.correctAnswer);
        left += ca ? ' <span class="muted">(Đáp án mẫu: “' + escapeC(ca) + "”)</span>" :
          ' <span class="muted" style="color:#b91c1c">(chưa có đáp án — thêm correctAnswer trong JSON)</span>';
      }
      left += "</li>";
    });
    left += "</ol></div>";
  });
  var scoreBase = subtestOn ? subtestN : qn;
  left += '<div class="rev-total">Tổng: <b>' + qn + "</b> câu - " + nSec + " phần - Thang điểm: " + testMeta.score +
    (subtestOn ? ' · <b style="color:#7c3aed">đề con ' + subtestN + " câu</b>" : "") +
    " (mỗi câu " + (scoreBase > 0 ? (testMeta.score / scoreBase).toFixed(2) : "0.00") + " điểm)</div>";

  var right =
    '<div class="rev-meta">' +
      '<div class="rev-meta-hd" style="background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#ffffff"><i class="fa-solid fa-gear" style="color:#ffffff"></i> Thiết lập đề</div>' +
      '<div class="rev-meta-row"><span class="rev-k"><i class="fa-solid fa-book-open" style="color:#2563eb"></i> Môn học</span><span class="rev-v">' +
        (testMeta.subject ? escapeC(testMeta.subject) : '<i class="muted">Chưa chọn</i>') +
      "</span></div>" +
      '<div class="rev-meta-row"><span class="rev-k"><i class="fa-solid fa-pen-to-square" style="color:#7c3aed"></i> Tên đề</span><span class="rev-v">' +
        (testMeta.name ? escapeC(testMeta.name) : '<b style="color:#b91c1c">Chưa đặt tên</b>') +
      "</span></div>" +
      '<div class="rev-meta-row"><span class="rev-k"><i class="fa-solid fa-file-lines" style="color:#0d9488"></i> Mô tả</span><span class="rev-v">' +
        (testMeta.desc ? escapeC(testMeta.desc) : '<i class="muted">(trống)</i>') +
      "</span></div>" +
      '<div class="rev-meta-row"><span class="rev-k"><i class="fa-solid fa-stopwatch" style="color:#ea580c"></i> Thời gian</span><span class="rev-v">' +
        (testMeta.minutes > 0 ? "<b>" + testMeta.minutes + " phút</b>" : "Không giới hạn") +
      "</span></div>" +
      '<div class="rev-meta-row"><span class="rev-k"><i class="fa-solid fa-bullseye" style="color:#e11d48"></i> Điểm tối đa</span><span class="rev-v"><b>' + testMeta.score + "</b> điểm</span></div>" +
      '<div class="rev-meta-row"><span class="rev-k"><i class="fa-solid fa-shuffle" style="color:#0284c7"></i> Xáo trộn</span><span class="rev-v">Câu: <b>' +
        (testMeta.shuffleQ ? "Bật" : "Tắt") + "</b> - Đáp án: <b>" + (testMeta.shuffleA ? "Bật" : "Tắt") +
      "</b></span></div>" +
      '<div class="rev-meta-row"><span class="rev-k"><i class="fa-solid fa-dice" style="color:#7c3aed"></i> Đề con</span><span class="rev-v">' +
        (subtestOn ? "<b>" + subtestN + "</b> câu - ngẫu nhiên" : "Tắt") +
      "</span></div>" +
      '<div class="rev-meta-row"><span class="rev-k"><i class="fa-solid fa-chart-column" style="color:#16a34a"></i> Xem điểm</span><span class="rev-v"><b>' +
        (testMeta.showScore === "none" ? "Bị Ẩn" : "Có") +
      "</b></span></div>" +
      '<div class="rev-meta-row"><span class="rev-k"><i class="fa-solid fa-eye" style="color:#db2777"></i> Xem đáp án</span><span class="rev-v"><b>' +
        (testMeta.showAnswers === "none" ? "Không cho phép" : testMeta.showAnswers === "perfect" ? "Điểm tối đa" : "Luôn hiện") +
      "</b></span></div>" +
      '<div class="rev-meta-row"><span class="rev-k"><i class="fa-solid fa-repeat" style="color:#2563eb"></i> Số lần làm</span><span class="rev-v">' +
        (Number(testMeta.maxAttempts) > 0 ? "<b>" + Number(testMeta.maxAttempts) + "</b> lượt / học sinh" : "Không giới hạn") +
      "</span></div>" +
      '<div class="rev-meta-row"><span class="rev-k"><i class="fa-solid fa-lock" style="color:#f59e0b"></i> Mật khẩu</span><span class="rev-v"><b>' +
        (String(testMeta.password || "").trim() ? "Đã đặt" : "Không đặt") +
      "</b></span></div>" +
      '<div class="rev-meta-row"><span class="rev-k"><i class="fa-solid fa-folder-open" style="color:#065f46"></i> Thống kê</span><span class="rev-v">' + qn + " câu - " + nSec + " phần</span></div>" +
    "</div>";

  if (headActions) {
    headActions.innerHTML =
      '<button type="button" class="btn btn-ghost" id="btnRevBack">← Sửa lại đề</button>' +
      '<button type="button" class="btn btn-success" id="btnPublish">' + (currentEditId ? '<i class="fa-solid fa-floppy-disk"></i> Cập nhật đề' : '<i class="fa-solid fa-rocket"></i> Xuất bản đề') + "</button>";
  }

  area.innerHTML = '<div class="rev-split"><div class="rev-left" id="revLeft">' + left + "</div>" +
    '<div class="rev-right">' + right + "</div></div>";

  var pub = $("btnPublish");
  var warns = [];
  if (!testMeta.name) warns.push("Chưa đặt tên đề — mở bước 3 Thiết lập đề để điền trước khi xuất bản.");
  if (!testMeta.subject) warns.push("Chưa chọn môn học — đề sẽ xuất hiện ở Phòng Học theo môn.");
  if (subtestInvalid) warns.push("Số câu đề con không hợp lệ — mở Thiết lập đề và nhập lại trong khoảng 1–" + qn + ".");
  if (tfUnset) warns.push("Còn " + tfUnset + " mệnh đề Đúng/Sai chưa chọn đáp án — quay lại bước 2 bấm Đ hoặc S cho từng mệnh đề.");
  if (warns.length) {
    notifyToast(warns.join(" • "), (!testMeta.name || subtestInvalid || tfUnset > 0) ? "error" : "warning");
  }
  if (pub) pub.disabled = !testMeta.name || subtestInvalid || tfUnset > 0;
}

async function publishTest() {
  var b = $("btnPublish");
  if (!b || b.disabled || b.dataset.done === "1" || !testData || !testData.length) return;
  if (!testMeta.name) { renderReview(); return; }
  var isEdit = Boolean(currentEditId);
  var isNewTest = !isEdit;
  if (isEnglishContext()) { testMeta.shuffleQ = false; if (!testMeta.subject) testMeta.subject = englishSubjectName(); }
  var subject = testMeta.subject || "";
  b.disabled = true;
  b.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xuất bản…';
  var payload = {
    p_id: currentEditId || null,
    p_subject: subject,
    p_name: testMeta.name,
    p_description: testMeta.desc,
    p_content: testData,
    p_minutes: testMeta.minutes || 0,
    p_score: Math.max(1, parseInt(testMeta.score, 10) || 10),
    p_shuffle_q: !!testMeta.shuffleQ,
    p_shuffle_a: !!testMeta.shuffleA,
    p_is_complete: currentEditId ? currentEditComplete : true,
    p_show_score: testMeta.showScore || "always",
    p_show_answers: testMeta.showAnswers || "always",
    p_subtest_enabled: !!testMeta.subtestEnabled,
    p_subtest_count: testMeta.subtestEnabled ? (parseInt(testMeta.subtestCount, 10) || null) : null,
    p_max_attempts: Math.max(0, parseInt(testMeta.maxAttempts, 10) || 0),
    p_password: (testMeta.password || "").trim(),
    p_start_at: testMeta.timeEnabled ? (testMeta.startAt || null) : null,
    p_end_at: testMeta.timeEnabled ? (testMeta.endAt || null) : null
  };
  var left = $("revLeft");
  try {
    var mod = await import("../../../scripts/core/supabase-config.js");
    var res = await mod.supabase.rpc("teacher_upsert_test_set", payload);
    if (res.error) throw res.error;
    if (!res.data || res.data.ok !== true) {
      var code = res.data && res.data.error;
      var msg = code === "forbidden" ? "Bạn không có quyền tạo bài kiểm tra."
        : code === "empty_subject" ? "Chưa chọn môn học."
        : code === "empty_name" ? "Chưa đặt tên đề."
        : code === "empty_content" ? "Đề trống — không thể xuất bản."
        : code === "structure_locked" ? "Đề đã xuất bản — không thể thay đổi cấu trúc."
        : code === "invalid_subtest_count" ? "Số câu đề con phải từ 1 đến " + ((res.data && res.data.total) || countQ(testData)) + "."
        : code === "invalid_time_range" ? "Thời gian kết thúc phải sau thời gian bắt đầu."
        : "Không xuất bản được bài kiểm tra.";
      throw { message: msg };
    }
    var realId = "t:" + res.data.id;
    var link = location.origin + "/?open=phong-hoc&de=" + realId;
    if (left) {
      var resultArea = $("revArea");
      var setupCard = resultArea && resultArea.querySelector(".rev-meta");
      var setupCardHtml = setupCard ? setupCard.outerHTML : "";
      if (resultArea) resultArea.innerHTML =
        '<div class="publish-result">' +
          '<section class="publish-qr-panel" aria-label="Mã QR đề thi">' +
            '<h3>QR Test</h3>' +
            '<canvas id="qr-canvas" aria-label="Mã QR đề thi" style="max-width:100%;height:auto;border-radius:8px;box-shadow:0 4px 6px rgba(0,0,0,0.1);display:none"></canvas>' +
            '<button type="button" class="btn btn-primary" id="download-qr-btn" style="display:none"><i class="fa-solid fa-download"></i> Tải ảnh QR</button>' +
          '</section>' +
          '<section class="publish-details">' +
            '<div class="publish-success-check" aria-hidden="true"><i class="fa-solid fa-check"></i></div>' +
            "<h3>" + (isEdit ? "Cập nhật thành công" : "Tạo đề thành công") + "</h3>" +
            "<p>Đề <b>" + escapeC(testMeta.name) + "</b>" +
              (subject ? " - Môn <b>" + escapeC(subject) + "</b>" : "") +
              (isEdit ? " đã lưu lại bản cập nhật.</p>" : " đã đưa lên DB.</p>") +
            '<div class="publish-link-row">' +
              '<input id="publishedTestLink" type="text" readonly aria-label="Link đề thi">' +
              '<button type="button" class="btn btn-primary" id="btnCopyTestLink"><i class="fa-regular fa-copy"></i> Copy</button>' +
            '</div>' +
            '<p class="pub-id">' + realId + "</p>" +
          '</section>' +
          '<aside class="publish-settings-aside">' + setupCardHtml + '</aside>' +
        '</div>';
      var headActions = $("revHeadActions");
      if (headActions && !$("btnPublishAgain")) {
        headActions.insertAdjacentHTML("beforeend",
          '<button type="button" class="btn btn-primary" id="btnPublishAgain">＋ Xuất bản đề mới</button>');
      }
      var linkInput = $("publishedTestLink");
      if (linkInput) linkInput.value = link;
      generateCustomQRCode(link);
    }
    if (isNewTest) {
      try {
        await navigator.clipboard.writeText(link);
        notifyToast("Đã xuất bản và sao chép link đề thi", "success");
      } catch (_copyError) {
        notifyToast("Xuất bản đề thành công", "success");
      }
    } else {
      notifyToast("Cập nhật đề thành công", "success");
    }
    b.disabled = true;
    b.dataset.done = "1";
    b.title = "Đề đã xuất bản — bấm “← Sửa lại đề” nếu muốn chỉnh sửa.";
    b.innerHTML = currentEditId ? '<i class="fa-solid fa-floppy-disk"></i> Đã lưu ✓' : '<i class="fa-solid fa-rocket"></i> Đã xuất bản ✓';
    b.style.opacity = ".55";
    currentEditId = res.data.id;
    currentEditComplete = true;
  } catch (e) {
    var errMsg = (e && e.message) || "Lỗi không xác định.";
    console.error("[PUBLISH] " + errMsg);
    notifyToast("Xuất bản thất bại: " + errMsg, "error");
    if (left) {
      left.innerHTML =
        '<div style="border:1px solid #fecaca;background:#fef2f2;border-radius:18px;padding:24px;text-align:center">' +
          '<div style="font-size:36px"><i class="fa-solid fa-triangle-exclamation" style="color:#ef4444"></i></div>' +
          "<h3 style=\"color:#b91c1c;margin:6px 0 4px;font-size:17px\">Xuất bản thất bại</h3>" +
          "<p style=\"margin:4px 0;font-size:13.5px;color:#7f1d1d\">" + escapeC(errMsg) + "</p>" +
          '<button type="button" class="btn btn-primary" id="btnPublishRetry">Thử lại</button>' +
        "</div>";
    }
    b.disabled = false;
    b.innerHTML = currentEditId ? '<i class="fa-solid fa-floppy-disk"></i> Lưu lại' : '<i class="fa-solid fa-rocket"></i> Xuất bản';
    b.style.opacity = "1";
  }
}

function resetForNewTest() {
  testData = [];
  userAnswers = {};
  graded = false;
  jsonAreaDirty = false;
  currentEditId = null;
  currentEditComplete = true;
  testMeta = {
    subject: "", name: "", desc: "", minutes: 0, score: 10,
    shuffleQ: true, shuffleA: true, showScore: "always", showAnswers: "always",
    subtestEnabled: false, subtestCount: null,
    maxAttempts: 0, password: "",
    timeEnabled: false, startAt: null, endAt: null
  };
  $("inputText").value = "";
  $("jsonArea").value = "";
  $("resultBox").hidden = true;
  setFileLabel(null);
  updateSetupBtn();
  render();
  maxStage = 1;
  showStage(1);
}

$("p4").addEventListener("click", function (e) {
  var el = e.target && e.target.closest ? e.target.closest("#btnPublish, #btnRevBack, #btnPublishAgain, #btnPublishRetry, #btnCopyTestLink, #download-qr-btn") : null;
  if (!el) return;
  if (el.id === "btnPublish") publishTest();
  else if (el.id === "btnRevBack") showStage(2);
  else if (el.id === "btnPublishRetry") renderReview();
  else if (el.id === "btnPublishAgain") { resetForNewTest(); }
  else if (el.id === "btnCopyTestLink") {
    var input = $("publishedTestLink");
    if (!input) return;
    var copyPromise = navigator.clipboard && navigator.clipboard.writeText
      ? navigator.clipboard.writeText(input.value)
      : Promise.reject(new Error("Clipboard API không khả dụng."));
    copyPromise.then(function () {
      notifyToast("Đã sao chép link đề thi", "success");
    }).catch(function () {
      input.focus();
      input.select();
      try {
        if (document.execCommand("copy")) {
          notifyToast("Đã sao chép link đề thi", "success");
        } else {
          notifyToast("Không sao chép được link.", "error");
        }
      } catch (_copyError) {
        notifyToast("Không sao chép được link.", "error");
      }
    });
  } else if (el.id === "download-qr-btn") {
    var canvas = $("qr-canvas");
    if (!canvas || !canvas.width || !canvas.height) return;
    var downloadLink = document.createElement("a");
    downloadLink.href = canvas.toDataURL("image/png");
    var qrFileName = String(testMeta.name || "Bai_kiem_tra")
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_")
      .trim();
    downloadLink.download = (qrFileName || "Bai_kiem_tra") + ".png";
    downloadLink.click();
    notifyToast("Đã tải ảnh QR", "success");
  }
});

function generateCustomQRCode(linkDeThi) {
  var canvas = $("qr-canvas");
  var downloadButton = $("download-qr-btn");
  if (!canvas || !downloadButton || !window.LearnHubTestQR) return;

  canvas.style.display = "none";
  downloadButton.style.display = "none";
  try {
    window.LearnHubTestQR.render(canvas, linkDeThi);
    canvas.style.display = "block";
    downloadButton.style.display = "inline-flex";
  } catch (error) {
    console.error("[QR] Không thể tạo ảnh QR:", error);
    notifyToast("Không tạo được ảnh QR", "error");
  }
}

function updateSetupBtn() {
  var b = $("btnSetup");
  if (!b) return;
  b.textContent = "▶ Tiếp tục";
  b.title = "";
}

function syncSubtestUI() {
  var chk = $("setSubtestEnabled"), box = $("subtestBox"), inp = $("setSubtestCount"), hint = $("subtestHint");
  if (!chk || !box || !inp) return;
  var total = countQ(testData);
  box.hidden = !chk.checked;
  inp.max = total > 0 ? String(total) : "";
  if (hint) {
    var cur = parseInt(inp.value, 10);
    hint.innerHTML = total > 0
      ? "Tổng đề có <b>" + total + "</b> câu. Mỗi lần mở đề sẽ bốc ngẫu nhiên <b>" +
        (cur > 0 ? Math.min(cur, total) : "N") + "</b> câu."
      : "Chưa có câu hỏi — hãy đọc/nạp đề trước khi bật đề con.";
  }
}

function toLocalInput(d) {
  var p = function (n) { return (n < 10 ? "0" : "") + n; };
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) +
    "T" + p(d.getHours()) + ":" + p(d.getMinutes());
}

function fmtDateTime(v) {
  var d = (v instanceof Date) ? v : new Date(v);
  if (isNaN(d.getTime())) return "";
  var p = function (n) { return (n < 10 ? "0" : "") + n; };
  return p(d.getDate()) + "/" + p(d.getMonth() + 1) + "/" + d.getFullYear() +
    " " + p(d.getHours()) + ":" + p(d.getMinutes());
}

function syncTimeUI() {
  var chk = $("setTimeEnabled"), box = $("timeBox"), st = $("setStartAt"), en = $("setEndAt"), hint = $("timeHint");
  if (!chk || !box || !st || !en) return;
  box.hidden = !chk.checked;
  if (box.hidden) return;
  if (!st.value) st.value = toLocalInput(new Date());
  if (!en.value) en.value = toLocalInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  if (hint) {
    var s = st.value ? new Date(st.value) : null, e = en.value ? new Date(en.value) : null;
    hint.textContent = (s && e && !isNaN(s.getTime()) && !isNaN(e.getTime()) && e > s)
      ? "Học sinh làm được từ " + fmtDateTime(s) + " đến " + fmtDateTime(e) + "."
      : "Thời gian kết thúc phải sau bắt đầu.";
  }
}

/* Đề tiếng Anh (toggle bật): tự chọn môn Anh Văn + tắt xáo trộn câu hỏi + ẩn tuỳ chọn đó */
function englishToggleOn() {
  var t = $("englishModeToggle");
  return !!(t && t.checked);
}

/* Ngữ cảnh đề tiếng Anh: toggle bật HOẶC môn đang chọn là Anh Văn (vd mở lại đề cũ để sửa) */
function isEnglishContext() {
  if (englishToggleOn()) return true;
  var name = englishSubjectName();
  if (!name) return false;
  var sel = $("setSubject");
  var cur = (sel && sel.value) ? sel.value : testMeta.subject;
  return cur === name;
}

function englishSubjectName() {
  for (var i = 0; i < TEST_SUBJECTS.length; i++) {
    if (TEST_SUBJECTS[i].id === "anh") return TEST_SUBJECTS[i].name;
  }
  for (var j = 0; j < TEST_SUBJECTS.length; j++) {
    if (/anh|english/i.test(TEST_SUBJECTS[j].name)) return TEST_SUBJECTS[j].name;
  }
  return "";
}

function setShuffleQRowHidden(hide) {
  var grid = null;
  var qr = document.querySelector('input[name="setShuffleQ"]');
  var ar = document.querySelector('input[name="setShuffleA"]');
  if (!qr) return;
  /* Tìm "hàng" chứa nhãn + nút radio của Trộn câu: tổ tiên cao nhất vẫn chưa chứa Trộn đáp án */
  var row = qr;
  while (row.parentElement && !(ar && row.parentElement.contains(ar))) row = row.parentElement;
  if (row === qr || row === document.body) row = qr.parentElement || qr;
  row.hidden = !!hide;
  row.style.display = hide ? "none" : "";
  /* Lưới 4 ô → 3 ô: để CSS chia lại cột (tránh "Xem đáp án" bị rớt dòng) */
  grid = row.parentElement;
  if (grid) grid.classList.toggle("no-shuffleq", !!hide);
}

function applyEnglishDefaults() {
  var on = isEnglishContext();
  if (englishToggleOn()) {
    var name = englishSubjectName();
    if (name) testMeta.subject = name;
  }
  if (on) testMeta.shuffleQ = false;
  var sel = $("setSubject");
  if (on && sel && testMeta.subject) sel.value = testMeta.subject;
  var off = document.querySelector('input[name="setShuffleQ"][value="0"]');
  if (on && off) off.checked = true;
  setShuffleQRowHidden(on);
  if (typeof updateSetupBtn === "function") updateSetupBtn();
}

function syncSetupForm() {
  $("setSubject").value = testMeta.subject || "";
  $("setName").value = testMeta.name;
  $("setDesc").value = testMeta.desc;
  $("setMinutes").value = testMeta.minutes == null ? "" : String(testMeta.minutes);
  $("setScore").value = testMeta.score || 10;
  var setRadio = function(name, val) {
    var r = document.querySelector('input[name="' + name + '"][value="' + val + '"]');
    if (r) r.checked = true;
  };
  setRadio("setShuffleQ", testMeta.shuffleQ ? "1" : "0");
  setRadio("setShuffleA", testMeta.shuffleA ? "1" : "0");
  setRadio("setShowScore", testMeta.showScore || "always");
  setRadio("setShowAnswers", testMeta.showAnswers || "always");
  $("setSubtestEnabled").checked = !!testMeta.subtestEnabled;
  $("setSubtestCount").value = testMeta.subtestCount == null ? "" : String(testMeta.subtestCount);
  syncSubtestUI();
  $("setMaxAttempts").value = String(Math.max(0, parseInt(testMeta.maxAttempts, 10) || 0));
  $("setPassword").value = testMeta.password || "";
  $("setTimeEnabled").checked = !!testMeta.timeEnabled;
  $("setStartAt").value = testMeta.startAt ? toLocalInput(new Date(testMeta.startAt)) : "";
  $("setEndAt").value = testMeta.endAt ? toLocalInput(new Date(testMeta.endAt)) : "";
  syncTimeUI();
  clearInvalidSetup();
  applyEnglishDefaults();
}

$("btnSetup").addEventListener("click", function () { showStage(3); });
$("btnSetupBack").addEventListener("click", function () { showStage(2); });

$("setSubtestEnabled").addEventListener("change", function () {
  $("setSubtestCount").classList.remove("invalid");
  syncSubtestUI();
});
$("setSubtestCount").addEventListener("input", function () {
  this.classList.remove("invalid");
  syncSubtestUI();
});

$("setTimeEnabled").addEventListener("change", function () {
  if (!this.checked) { $("setStartAt").value = ""; $("setEndAt").value = ""; }
  syncTimeUI();
});
$("setStartAt").addEventListener("input", syncTimeUI);
$("setEndAt").addEventListener("input", syncTimeUI);

var SETUP_REQUIRED = ["setSubject", "setName", "setMinutes", "setScore"];
function clearInvalidSetup() {
  SETUP_REQUIRED.forEach(function (id) { var el = $(id); if (el) el.classList.remove("invalid"); });
}
SETUP_REQUIRED.forEach(function (id) {
  var el = $(id);
  if (!el) return;
  ["input", "change"].forEach(function (ev) {
    el.addEventListener(ev, function () { el.classList.remove("invalid"); });
  });
});

$("btnSetupApply").addEventListener("click", function () {
  var subjEl = $("setSubject"), nameEl = $("setName"), minEl = $("setMinutes"), scoreEl = $("setScore");
  var subtestChk = $("setSubtestEnabled"), subtestEl = $("setSubtestCount");
  var errs = [], bad = [];

  if (!subjEl.value) { errs.push("chọn môn học"); bad.push(subjEl); }
  if (!nameEl.value.trim()) { errs.push("nhập tên đề"); bad.push(nameEl); }
  if (String(minEl.value).trim() === "" || Number(minEl.value) < 0) { errs.push("nhập thời gian làm bài (0 = không giới hạn)"); bad.push(minEl); }
  if (String(scoreEl.value).trim() === "" || Number(scoreEl.value) < 1) { errs.push("nhập điểm tối đa (≥ 1)"); bad.push(scoreEl); }

  var subtestEnabled = !!(subtestChk && subtestChk.checked);
  var subtestCount = null;
  if (subtestEnabled) {
    var total = countQ(testData);
    var raw = String(subtestEl.value).trim();
    var n = Number(raw);
    if (!total) {
      errs.push("nạp đề có câu hỏi trước khi bật đề con");
      bad.push(subtestEl);
    } else if (raw === "" || !isFinite(n) || n < 1 || n > total || Math.floor(n) !== n) {
      errs.push("nhập số câu đề con từ 1 đến " + total);
      bad.push(subtestEl);
    } else {
      subtestCount = n;
    }
  }

  var timeEnabled = !!($("setTimeEnabled") && $("setTimeEnabled").checked);
  var startAtIso = null, endAtIso = null;
  if (timeEnabled) {
    var stEl = $("setStartAt"), enEl = $("setEndAt");
    var sv = stEl.value, ev = enEl.value;
    if (!sv) { errs.push("chọn thời gian bắt đầu"); bad.push(stEl); }
    if (!ev) { errs.push("chọn thời gian kết thúc"); bad.push(enEl); }
    if (sv && ev) {
      var sd = new Date(sv), ed = new Date(ev);
      if (isNaN(sd.getTime()) || isNaN(ed.getTime())) {
        errs.push("thời gian mở đề không hợp lệ"); bad.push(stEl);
      } else if (ed <= sd) {
        errs.push("thời gian kết thúc phải sau thời gian bắt đầu"); bad.push(enEl);
      } else {
        startAtIso = sd.toISOString();
        endAtIso = ed.toISOString();
      }
    }
  }

  clearInvalidSetup();
  if (errs.length) {
    bad.forEach(function (el) { el.classList.add("invalid"); });
    notifyToast("Vui lòng " + errs.join(", ") + " để tiếp tục.", "error");
    return;
  }

  testMeta.subject = subjEl.value || "";
  testMeta.name = nameEl.value.trim();
  testMeta.desc = $("setDesc").value.trim();
  testMeta.minutes = Math.max(0, parseInt(minEl.value, 10) || 0);
  testMeta.score = Math.max(1, parseInt(scoreEl.value, 10) || 10);
  testMeta.shuffleQ = isEnglishContext() ? false : (document.querySelector('input[name="setShuffleQ"]:checked') || {}).value === "1";
  testMeta.shuffleA = (document.querySelector('input[name="setShuffleA"]:checked') || {}).value === "1";
  testMeta.showScore = (document.querySelector('input[name="setShowScore"]:checked') || {}).value || "always";
  testMeta.showAnswers = (document.querySelector('input[name="setShowAnswers"]:checked') || {}).value || "always";
  testMeta.subtestEnabled = subtestEnabled;
  testMeta.subtestCount = subtestEnabled ? subtestCount : null;
  var maxAttemptsEl = $("setMaxAttempts"), passwordEl = $("setPassword");
  testMeta.maxAttempts = maxAttemptsEl ? Math.max(0, parseInt(maxAttemptsEl.value, 10) || 0) : 0;
  testMeta.password = passwordEl ? passwordEl.value.trim() : "";
  testMeta.timeEnabled = timeEnabled;
  testMeta.startAt = timeEnabled ? startAtIso : null;
  testMeta.endAt = timeEnabled ? endAtIso : null;
  updateSetupBtn();
  if (currentEditId && window.__originalEditSnapshot) {
    showEditDiffModal(function () { applyMeta(true); });
  } else {
    applyMeta(true);
  }
});

(function () {
  var sel = $("setSubject");
  if (!sel) return;
  sel.innerHTML = '<option value="">— Chưa chọn —</option>' +
    TEST_SUBJECTS.map(function (s) {
      return '<option value="' + escAttr(s.name) + '">' + s.name + " (" + s.id + ")</option>";
    }).join("");
  sel.value = testMeta.subject || "";
  sel.addEventListener("change", function () {
    testMeta.subject = sel.value || "";
    applyEnglishDefaults();
  });
})();

/* ============ EVENTS ============ */

if ($("englishModeToggle")) {
  $("englishModeToggle").addEventListener("change", function () {
    isEnglishMode = !!this.checked;
    applyEnglishDefaults();
    if (testData && testData.length && typeof render === "function") render();
  });
}

$("btnSample").addEventListener("click", function () {
  $("inputText").value = sampleText();
  setFileLabel(null);
  setNote("Đã nạp đề mẫu → bấm Đọc text → JSON.", false, "info");
});

$("btnSampleEN").addEventListener("click", function () {
  /* Nạp đề mẫu tiếng Anh → tự bật chế độ đề tiếng Anh */
  var enT = $("englishModeToggle");
  if (enT) enT.checked = true;
  isEnglishMode = true;
  applyEnglishDefaults();
  $("inputText").value = sampleTextEN();
  setFileLabel(null);
  setNote("Đã nạp đề mẫu tiếng Anh → bấm Đọc text → JSON.", false, "info");
});

$("btnParse").addEventListener("click", function () {
  var toggleEl = $("englishModeToggle");
  if (toggleEl) isEnglishMode = !!toggleEl.checked;
  var txt = $("inputText").value.trim();

  if (/^\s*[\[{]/.test(txt)) {
    try {
      var j = JSON.parse(txt);
      var secs = Array.isArray(j) ? j : (j && Array.isArray(j.sections) ? j.sections : []);
      if (!secs.length) { setNote("JSON hợp lệ nhưng không có section nào.", true); return; }
      testData = normalize(secs);
      writeJson(JSON.stringify(testData, null, 2));
      graded = false;
      userAnswers = {};
      $("resultBox").hidden = true;
      render();
      setNote("Đã nhận dạng JSON dán trực tiếp: " + countQ(testData) + " câu.", false, "success");
      showStage(2);
    } catch (e) {
      setNote("Bắt đầu giống JSON nhưng parse lỗi: " + e.message, true);
    }
    return;
  }
  applyParseResult(parseTextToJson($("inputText").value), "");
});

function applyJsonString(txt, silent) {
  try {
    var j = JSON.parse(txt);
    testData = Array.isArray(j) ? j : (j && Array.isArray(j.sections) ? j.sections : []);
    graded = false;
    userAnswers = {};
    $("resultBox").hidden = true;
    render();
    if (!silent) setNote("Đã áp dụng JSON: " + countQ(testData) + " câu.", false, "success");
  } catch (e) {
    setNote("JSON không hợp lệ: " + e.message, true);
  }
}

function syncJson() {
  writeJson(JSON.stringify(testData, null, 2));
}

var jsonRenderTimer = null;
function scheduleJsonRender() {
  if (jsonRenderTimer) clearTimeout(jsonRenderTimer);
  jsonRenderTimer = setTimeout(function () {
    jsonRenderTimer = null;
    applyJsonString($("jsonArea").value, true);
  }, 450);
}

$("btnBack").addEventListener("click", function () {
  var ref = document.referrer || "";
  if (ref && ref.indexOf("/teacher/") >= 0) {
    window.location.href = "../index.html?view=quiz";
    return;
  }
  showStage(1);
});

$("inputText").addEventListener("input", function () { setFileLabel(null); });
$("jsonArea").addEventListener("input", function () {
  jsonAreaDirty = true;
  scheduleJsonRender();
});

$("jumpBtn").addEventListener("click", function () { jumpToQuestion($("jumpQ").value); });
$("jumpQ").addEventListener("keydown", function (e) {
  if (e.key === "Enter") { e.preventDefault(); jumpToQuestion(this.value); }
});

$("fileUpload").addEventListener("change", function () {
  var f = this.files && this.files[0];
  if (!f) return;
  this.value = "";
  var name = f.name || "";

  if (/\.json$/i.test(name)) {
    var frJ = new FileReader();
    frJ.onload = function () {
      try {
        var j = JSON.parse(String(frJ.result || ""));
        setFileLabel(f.name);
        testMeta.name = baseName(f.name);
        updateSetupBtn();
        writeJson(JSON.stringify(Array.isArray(j) ? j : (j.sections || []), null, 2));
        applyJsonString($("jsonArea").value);
        showStage(2);
      } catch (e) {
        setNote("File JSON không hợp lệ: " + e.message, true);
      }
    };
    frJ.readAsText(f, "utf-8");
    return;
  }

  var isDocx = /\.docx$/i.test(name);
  var fr = new FileReader();
  fr.onload = function () {
    setFileLabel(f.name);
    testMeta.name = baseName(f.name);
    updateSetupBtn();
    if (!isDocx) {
      $("inputText").value = String(fr.result || "");
      setNote("Đã tải " + f.name + ". Bấm Đọc text → JSON.", false, "success");
      return;
    }
    if (typeof window.mammoth === "undefined") {
      setNote("Thư viện mammoth chưa tải được (cần Internet). Hãy dùng chế độ dán text.", true);
      return;
    }
    var keep = $("keepFmt") ? Boolean($("keepFmt").checked) : false;
    var wrap = function (promise, useHtml) {
      promise.then(function (res) {
        var extra = res.messages && res.messages.length ? " Lưu ý: " + res.messages.map(function (m) { return m.message; }).slice(0, 3).join(" • ") : "";
        if (useHtml) {
          var r = parseToSections(htmlBlocksToLines(res.value));
          applyParseResult(r, "Giữ định dạng chữ từ .docx." + extra + " ");
        } else {
          $("inputText").value = String(res.value || "");
          setNote("Đã parse " + f.name + "." + extra + " Bấm Đọc text → JSON.", false, "success");
        }
      }).catch(function (e) {
        setNote("Không đọc được file .docx: " + (e && e.message ? e.message : e), true);
      });
    };
    try {
      if (keep) wrap(mammoth.convertToHtml({ arrayBuffer: fr.result }), true);
      else wrap(mammoth.extractRawText({ arrayBuffer: fr.result }), false);
    } catch (e) {
      setNote("Lỗi đọc file .docx: " + (e && e.message ? e.message : e), true);
    }
  };
  if (isDocx) fr.readAsArrayBuffer(f);
  else fr.readAsText(f, "utf-8");
});

function countQ(sections) {
  var n = 0;
  (sections || []).forEach(function (s) {
    if (s && Array.isArray(s.questions)) n += s.questions.length;
  });
  return n;
}

function applyParseResult(r, okNote, stay) {
  var note = [];
  if (r.warnings && r.warnings.length) note.push(r.warnings.length + " dòng ghi chú: " + r.warnings.slice(0, 3).join(" • "));
  if (r.error) { setNote(r.error, true); return; }
  testData = normalize(r.sections);
  writeJson(JSON.stringify(testData, null, 2));
  graded = false;
  userAnswers = {};
  $("resultBox").hidden = true;
  render();
  var msg = note.length ? note.join(" | ") + " — " : "";
  setNote(msg + (okNote || "") + "Đã đọc " + countQ(testData) + " câu.", false, note.length ? "warning" : "success");
  if (!stay) showStage(2);
}

function normalize(sections) {
  (sections || []).forEach(function (s) {
    if (!s || !Array.isArray(s.questions)) return;
    s.questions.forEach(function (q) {
      var c = q.correct;
      if (c === null || c === undefined) c = q.correctIndex;
      if (c !== null && c !== undefined) q.correct = c;
      delete q.correctIndex;
      delete q.answerLetter;
      delete q._fmt;
      delete q.opts;
      if (q.type !== "multiple") delete q.answers;
    });
  });
  return sections;
}

function escapeC(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function sanitizeC(html) {
  var ALLOW = ["B","STRONG","I","EM","U","S","STRIKE","DEL","INS","BR","P","DIV","SPAN","UL","OL","LI",
    "A","IMG","SMALL","MARK","H1","H2","H3","H4","H5","H6","BLOCKQUOTE","CODE","PRE","SUB","SUP","HR",
    "TABLE","THEAD","TBODY","TFOOT","TR","TH","TD","CAPTION"];
  var DROP = ["SCRIPT","STYLE","IFRAME","OBJECT","EMBED","LINK","META","BASE","FORM","INPUT","TEXTAREA","SELECT","BUTTON","SVG","MATH","AUDIO","VIDEO","SOURCE"];
  var SAFE = ["style","class","title","target","rel","href","src","alt","width","height","align","colspan","rowspan"];
  function unsafeUrl(v) {
    var s = String(v || "").replace(/[\u0000-\u0020]/g, "").toLowerCase();
    return s.indexOf("javascript:") === 0 || s.indexOf("vbscript:") === 0 ||
      (s.indexOf("data:") === 0 && s.indexOf("data:image/") !== 0);
  }
  var tpl = document.createElement("template");
  tpl.innerHTML = String(html == null ? "" : html);
  (function walk(node) {
    Array.prototype.slice.call(node.childNodes).forEach(function (child) {
      if (child.nodeType === 1) {
        var tag = child.tagName;
        if (DROP.indexOf(tag) !== -1) { child.remove(); return; }
        if (ALLOW.indexOf(tag) === -1) {
          node.replaceChild(document.createTextNode(child.textContent || ""), child); return;
        }
        Array.prototype.slice.call(child.attributes).forEach(function (a) {
          var n = a.name.toLowerCase();
          if (SAFE.indexOf(n) === -1 || n.indexOf("on") === 0) { child.removeAttribute(a.name); return; }
          if ((n === "href" || n === "src") && unsafeUrl(a.value)) { child.removeAttribute(a.name); }
        });
        if (tag === "A") child.setAttribute("rel", "noopener noreferrer");
        walk(child);
      } else if (child.nodeType === 8) {
        child.remove();
      }
    });
  })(tpl.content);
  return tpl.innerHTML;
}

if (testData && testData.length) { applyMeta(); }
updateSetupBtn();
showStage(1);

(function initEditMode() {
  var m = (window.location.search || "").match(/[?&]edit=([^&]+)/);
  if (!m) return;
  var id = decodeURIComponent(m[1]).replace(/^t:/i, "");
  if (!id) return;
  var bodyLoaded = function () {
    (async function () {
      try {
        var mod = await import("../../../scripts/core/supabase-config.js");
        var res = await mod.supabase.rpc("get_test_content", { p_de: "t:" + id });
        if (res.error) throw res.error;
        var d = res.data;
        if (!d || d.ok !== true) throw new Error(d && d.error === "not_found"
          ? "Không tìm thấy bài kiểm tra trong database."
          : "Không tải được bài kiểm tra để sửa.");
        var listRes = await mod.supabase.rpc("teacher_list_test_sets");
        if (listRes.error) throw listRes.error;
        var row = (listRes.data || []).filter(function (r) { return String(r.set_id) === id; })[0];
        currentEditId = id;
        currentEditComplete = row ? !!row.is_complete : true;
        window.__originalEditSnapshot = { meta: null, data: null };
        testData = Array.isArray(d.content) ? d.content : [];
        testMeta.subject = d.subject || "";
        testMeta.name = d.name || "";
        testMeta.desc = d.description || "";
        testMeta.minutes = Number(d.minutes) || 0;
        testMeta.score = Number(d.score) > 0 ? Number(d.score) : 10;
        testMeta.shuffleQ = d.shuffle_q !== false;
        testMeta.shuffleA = d.shuffle_a !== false;
        testMeta.showScore = d.show_score || "always";
        testMeta.showAnswers = d.show_answers || "always";
        testMeta.subtestEnabled = d.subtest_enabled === true || d.subtest_enabled === 1;
        var editSubtestCount = parseInt(d.subtest_count, 10);
        testMeta.subtestCount = testMeta.subtestEnabled && editSubtestCount > 0 ? editSubtestCount : null;
        testMeta.maxAttempts = Math.max(0, parseInt(d.max_attempts, 10) || 0);
        testMeta.password = typeof d.password === "string" ? d.password : "";
        testMeta.startAt = (row && row.start_at) ? row.start_at : null;
        testMeta.endAt = (row && row.end_at) ? row.end_at : null;
        testMeta.timeEnabled = !!(testMeta.startAt || testMeta.endAt);
        /* Đề môn Anh Văn: tự bật chế độ đề tiếng Anh + ẩn Trộn câu */
        if (englishSubjectName() && testMeta.subject === englishSubjectName()) {
          var enT = $("englishModeToggle");
          if (enT) enT.checked = true;
          isEnglishMode = true;
          applyEnglishDefaults();
        }
        graded = false;
        userAnswers = {};
        window.__originalEditSnapshot = { meta: JSON.parse(JSON.stringify(testMeta)), data: JSON.stringify(testData) };
        $("resultBox").hidden = true;
        writeJson(JSON.stringify(testData, null, 2));
        render();
        setFileLabel(d.name || "Chưa có tiêu đề");
        var lockNote = currentEditComplete
          ? " (Đề đã xuất bản — được sửa nội dung/đáp án/điểm/mô tả)"
          : "";
        setNote("Đã nạp sẵn đề “" + (d.name || "chưa đặt tên") + "” để sửa" + lockNote + ".", false, "info");
        showStage(2);
      } catch (e) {
        console.error("[SỬA ĐỀ]", e);
        var msg = (e && e.message) || "Lỗi không xác định.";
        setNote("Không tải được đề để sửa: " + msg, true);
        showStage(1);
      }
    })();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bodyLoaded);
  else bodyLoaded();
})();