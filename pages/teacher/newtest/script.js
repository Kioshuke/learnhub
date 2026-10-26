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
  timeEnabled: false,     // bật giới hạn thời gian mở đề
  startAt: null,          // ISO thời gian bắt đầu mở đề (null khi tắt)
  endAt: null             // ISO thời gian kết thúc mở đề (null khi tắt)
};

var LETTERS = "ABCDEFGH";
function letter(i) { return LETTERS[i] || String(i + 1); }

var $ = function (id) { return document.getElementById(id); };

function setCopyLinkStatus(message, isError) {
  var status = $("copy-link-status");
  if (!status) return;
  status.textContent = message || "";
  status.classList.toggle("is-error", !!isError);
}

function setNote(html, isError) {
  var n = $("p2") && !$("p2").hidden ? $("outNote") : $("inputNote");
  n.innerHTML = html;
  n.className = "note" + (isError ? " error" : "");
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

/* Bước cao nhất đã từng đạt — chỉ cho phép quay lại bước đã qua,
   KHÔNG cho bấm nhảy tới bước chưa tới (vd: chưa nhập đề mà bấm "Rà soát"). */
var maxStage = 1;

/* Chuyển màn hình: 1 (nhập đề) / 2 (JSON + xem trước) / 3 (thiết lập đề) / 4 (rà soát & xuất bản) */
function showStage(n) {
  if (n > maxStage) maxStage = n;
  $("p1").hidden = n !== 1;
  $("p2").hidden = n !== 2;
  $("p3").hidden = n !== 3;
  $("p4").hidden = n !== 4;
  var setupBtn = $("btnSetup");
  if (setupBtn) setupBtn.hidden = n !== 2;   // "Tiếp tục" chỉ hiện ở màn 2
  document.body.classList.toggle("stage2", n === 2);
  updateSteps(n);
  if (n !== 1) {
    /* Cuộn về đầu trang để header dính trên, khung màn 2/3/4 không bị che */
    try { window.scrollTo({ top: 0, behavior: "smooth" }); }
    catch (e) { window.scrollTo(0, 0); }
  }
  if (n === 3) syncSetupForm();
  if (n === 4) renderReview();
}

/* Đánh dấu bước đang làm + bước đã xong trên thanh 1·2·3·4.
   Bước chưa tới (vượt quá maxStage) bị khoá, không bấm được. */
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

/* Bấm vào ô bước trên thanh 1·2·3·4 → mở bước tương ứng.
   Chỉ cho phép với bước đã đạt (<= maxStage); bước chưa tới bị chặn. */
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

/* Chuyển HTML của mammoth (extractHtml) thành từng dòng {t: text thô, h: html giữ định dạng} */
function htmlBlocksToLines(html) {
  var div = document.createElement("div");
  div.innerHTML = html;
  var arr = [];
  var nodes = div.querySelectorAll("p, li, h1, h2, h3, h4, h5, td");
  nodes.forEach(function (el) {
    /* GIỮ thẳng hàng t và h (cùng số ký tự text, chỉ khác phần TAG) để việc
       tách vị trí không bị lệch → không mất ký tự. Không được co \s+. */
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

/* Cân bằng thẻ HTML cho 1 đoạn cắt ra: bỏ thẻ đóng thừa, tự đóng thẻ mở còn lỏng.
   VD "<strong>B. Cortana \t\t" → "<strong>B. Cortana \t\t</strong>". */
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

/* Dọn thẻ inline: cân bằng thẻ; bỏ thẻ rỗng/whitespace; bỏ space trước thẻ đóng */
function fixInlineHtml(x) {
  var out = balanceHtml(x);
  out = out.replace(/<(b|strong|em|i|u|span)(\s[^>]*)?>[ \t]*<\/\1>/g, "");
  out = out.replace(/\s+(?=<\/)/g, "");
  return out.trim();
}

/* Trim đồng bộ LEFT/RIGHT ký tự TEXT (bỏ qua thẻ) — giữ t và h thẳng hàng */
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

/* Tách nhiều phương án nằm trên CÙNG 1 dòng (VD: "A. Siri\t\tB. Cortana\t\tC. Alexa\t\tD. Bixby")
   → thành nhiều dòng phương án. Chỉ tách khi dòng BẮT ĐẦU bằng phương án và có ≥ 2 phương án. */
function splitInlineOpts(t, h) {
  var re = /(^|[ \t])(\*)?[A-Da-d][\.\)][ \t]+/g;
  var starts = [];
  var m;
  while ((m = re.exec(t)) !== null) starts.push(m.index);
  if (starts.length < 2 || starts[0] > 1) return [];
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

/* Bóc chữ cái A/B/C/D đầu phương án khỏi HTML, kể cả khi bị bọc trong thẻ định dạng.
   Cắt theo vị trí TÌM ĐƯỢC của nội dung txt trong html (bỏ qua thẻ) — chống lệch index
   khi nhãn bị trim thiếu space (VD "<strong>B.</strong>Cortana" → "Cortana"). */
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
  /* Walk giữ nguyên thẻ, chỉ bỏ <ti> ký tự text đứng trước nội dung */
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

/* ============ NHẬN DIỆN TIÊU ĐỀ PHẦN → tự tách section + mô tả cố định ============ */

var SECTION_KINDS = [
  { re: /(trắc\s*nghiệm|multiple\s*choice|mcq)/i, key: "TN", name: "TRẮC NGHIỆM" },
  { re: /(đúng[\s\/\-–—]*sai|true[\s\/\-–—]*false)/i, key: "DS", name: "ĐÚNG / SAI" },
  { re: /(tự\s*luận|short\s*answer)/i, key: "TL", name: "TỰ LUẬN" },
  { re: /(nghe\s*hiểu|listening|nghe)/i, key: "NGHE", name: "NGHE" },
  { re: /(đọc\s*hiểu|passage|reading)/i, key: "DOC", name: "ĐỌC HIỂU" }
];

/* Mô tả cố định theo từng loại phần — sửa text tại đây nếu muốn đổi */
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

/* Nhận diện dòng tiêu đề phần kiểu:
   "Phần 1: Trắc nghiệm" / "I. Trắc Nghiệm" / "Phần I. Trắc nghiệm" / "1. Trắc nghiệm"
   → { title, desc } hoặc null nếu không phải tiêu đề. */
function detectSectionTitle(line) {
  var raw = String(line || "").trim();
  var m = TITLE_RE.exec(raw);
  if (!m) return null;
  var text = m[2].trim();
  if (!text || /[?!]$/.test(text) || text.length > 60) return null;   // tránh nhầm câu hỏi
  var kind = null, kindIdx = -1;
  for (var i = 0; i < SECTION_KINDS.length; i++) {
    if (SECTION_KINDS[i].re.test(text)) { kind = SECTION_KINDS[i]; kindIdx = i; break; }
  }
  if (!kind) return null;
  /* "nghe"/"đọc hiểu" dạng số thường ("1. Nghe...") dễ nhầm câu hỏi → chỉ nhận khi có "Phần" hoặc số La Mã */
  var isBareDigit = /^\d+$/.test(m[1]);
  if ((kind.key === "NGHE" || kind.key === "DOC") && isBareDigit && !/^(?:phần\s*)/i.test(raw)) return null;
  var num = isBareDigit ? parseInt(m[1], 10) : romanToNum(m[1]);
  if (!num) num = kindIdx + 1;
  return { title: "PHẦN " + numToRoman(num) + ". " + kind.name, desc: SECTION_DESC[kind.key] || "" };
}

/* Chia dòng theo tiêu đề phần → parse từng phần thành section riêng, mô tả tự động */
function parseToSections(lines) {
  var groups = [], cur = null;
  (lines || []).forEach(function (L) {
    var dt = detectSectionTitle(L.t);
    if (dt) {
      if (cur && cur.lines.length) groups.push(cur);
      cur = { section: dt, lines: [] };
    } else if (cur) {
      cur.lines.push(L);
    }
  });
  if (cur && cur.lines.length) groups.push(cur);

  if (!groups.length) return parseLines(lines);   // không có tiêu đề → giữ hành vi cũ (1 section)

  var sections = [], warnings = [];
  groups.forEach(function (g) {
    /* Tách dòng passage (`Passage: ...`) và dòng link nghe (http...mp3) ra khỏi
       luồng câu hỏi → gắn section.passage / section.audio, tránh "Bỏ qua (không nhận dạng)". */
    var extra = { passage: null, audio: null, listenTitle: null };
    var qlines = g.lines.filter(function (L) {
      var t = String(L.t || "").trim();
      if (/^passage\s*:\s*/i.test(t)) {
        extra.passage = t.replace(/^passage\s*:\s*/i, "").trim();
        return false;
      }
      if (/^https?:\/\/\S+\.(?:mp3|m4a|wav|ogg)(?:\?\S*)?$/i.test(t)) {
        extra.audio = t;
        extra.listenTitle = (/^PHẦN\s+(?:[IVXLCDM1-9]+)\s*\.\s*NGHE/i.test(g.section.title) || /^NGHE/i.test(g.section.title)) ? "Nghe nội dung" : "Đọc / Nghe";
        return false;
      }
      return true;
    });
    var r = parseLines(qlines);
    (r.warnings || []).forEach(function (w) { warnings.push(w); });
    if (r.error || !r.sections || !r.sections.length) {
      warnings.push("Bỏ phần “" + g.section.title + "” (không nhận dạng được câu hỏi nào).");
      return;
    }
    var s = r.sections[0];
    if (extra.passage) s.passage = extra.passage;
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

/* Chuẩn hoá link Google Drive dạng share thành link xem ảnh trực tiếp */
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

/* Trả về URL nếu đáp án CHỈ là một link ảnh (hoặc có tiền tố Ảnh:/Link ảnh:) */
function answerImageUrl(ans) {
  var s = String(ans == null ? "" : ans).trim();
  if (!s) return "";
  /* Bỏ thẻ HTML (VD nhãn A. bị bọc <strong>...</strong>) để nhận diện link ảnh */
  s = s.replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
  s = s.replace(/^([A-Za-z])\s*[.、)]\s+/, "");         // bỏ nhãn A./B) nếu còn sót
  var m = s.match(new RegExp("^" + IMG_MARKER_SRC + "\\s*[:：]\\s*(https?:\\/\\/\\S+)\\s*$", "i"));
  if (m) return normalizeImageUrl(m[1]);
  var u = s.replace(/[.,;]+$/, "");
  if (/^https?:\/\//i.test(u) && isImageUrl(u)) return normalizeImageUrl(u);
  return "";
}

/* Tách dòng "Ảnh: <link>" / "Link ảnh: <link>" khỏi câu hỏi (đầu hoặc cuối đều được) */
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

/* Bỏ marker ảnh khỏi HTML (kể cả khi chữ "Ảnh:" bị bọc trong <b>, <span>...) */
function stripImageMarkerHtml(html) {
  var re = new RegExp("(?:<[^>]*>\\s*)*" + IMG_MARKER_SRC + "\\s*(?:<[^>]*>\\s*)*[:：]\\s*(?:<[^>]*>\\s*)*https?:\\/\\/[^\\s<>\"']+", "gi");
  return String(html == null ? "" : html).replace(re, "").replace(/\s{2,}/g, " ").trim();
}

/* URL ảnh của câu hỏi: nhận cả trường "image" thuần link hoặc chuỗi "Ảnh: <link>" */
function imageFieldUrl(v) {
  var s = String(v == null ? "" : v).trim();
  if (!s) return "";
  var m = extractImageMarker(s);
  return (m && !m.text) ? m.url : normalizeImageUrl(s);
}

function parseLines(lines) {
  var warnings = [];
  var questions = [];
  var cur = null;
  var answerMark = null;        // đáp án từ dòng "Đáp án: A"
  var pendingShort = null;      // đáp án dạng chữ từ dòng "Đáp án: html"
  var pendingImage = null;      // link ảnh gặp trước khi câu hỏi được tạo

  function closeCur() {
    if (!cur) return;
    if (cur.type === "multiple" && cur.opts && cur.opts.length) {
      /* Quyết định theo CẢ CÂU: câu có format nhãn "A. .... B. .... C. ...." (mọi dòng
         không-phải-sao đều khớp đúng vị trí A,B,C,D...) thì BÓC nhãn. Ngược lại đáp án
         chỉ bắt đầu bằng chữ in hoa (VD "B. Franklin", "G. Washington") thì GIỮ NGUYÊN. */
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
      /* Heuristic Word: đáp án đúng tô đậm (hoặc màu đỏ) — chỉ đúng 1 phương án thì auto gán */
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
  }

  function handleLine(L, lineIdx) {
    var line = L.t;             // text thô để nhận dạng
    var html = L.h || L.t;      // html (giữ đậm/nghiêng/gạch chân nếu có)

    /* Đáp án nằm ngang cùng dòng (tách bằng tab): chia nhỏ rồi xử lý từng cái */
    var inline = splitInlineOpts(line, html);
    if (inline.length > 1) {
      for (var k = 0; k < inline.length; k++) handleLine(inline[k], lineIdx);
      return;
    }

    /* Dòng ảnh câu hỏi (đứng riêng):
       Ảnh: https://... | Link ảnh: https://... | Hình ảnh: ... | Image: ...
       Nếu dòng kế tiếp là câu hỏi mới → ảnh thuộc câu hỏi đó (ảnh đặt đầu câu).
       Ngược lại → ảnh thuộc câu hỏi hiện tại (ảnh đặt cuối câu). */
    var loneImg = extractImageMarker(line);
    if (loneImg && !loneImg.text) {
      var nextIsQuestion = false;
      if (typeof lineIdx === "number") {
        for (var ni = lineIdx + 1; ni < lines.length; ni++) {
          var nt = String((lines[ni] && lines[ni].t) || "").trim();
          if (!nt) continue;
          nextIsQuestion = /^(?:câu\s*\d{1,3}\s*[\.\):]|\d{1,3}\s*[\.\)]\s+)/i.test(nt);
          break;
        }
      }
      if (!cur || nextIsQuestion) pendingImage = loneImg.url;
      else cur.image = loneImg.url;
      return;
    }

    /* Ảnh đặt cùng dòng với câu hỏi: "Link ảnh: <url> 1. Câu hỏi..." */
    if (loneImg && loneImg.text && /^(?:câu\s*\d{1,3}\s*[\.\):]|\d{1,3}\s*[\.\)]\s+)/i.test(loneImg.text)) {
      pendingImage = loneImg.url;
      line = loneImg.text;
      html = stripImageMarkerHtml(html);
    }

    /* Dòng đáp án: Đáp án A | Đáp án đúng: B | Đáp án: html */
    var ansM = line.match(/^đáp\s*án[^:]{0,10}:\s*(.+)$/i);
    if (ansM) {
      var v = ansM[1].trim();
      var letterM = v.match(/^([A-Da-d])$/);
      if (letterM) {
        answerMark = letterM[1].toUpperCase();
        if (cur && cur.type === "multiple" && cur.correctIndex === null) cur.answerLetter = answerMark;
      } else {
        if (cur && cur.type === "multiple" && !cur.answers.length) {
          cur.type = "short_answer";
          cur.correctAnswer = v;
        }
        pendingShort = { t: v };
        answerMark = null;
      }
      return;
    }

    /* Dòng phương án: A. / B) / *C. ... — chấp nhận MỌI chữ cái (không bó hẹp A-D) để
       không vứt bỏ dòng nào. Bóc nhãn hay giữ nguyên cả dòng quyết định ở closeCur()
       theo format của cả câu (xem chú thích ở đó).
       QUY ƯỚC ĐÚNG/SAI (bắt buộc): mệnh đề con dùng NHÃN CHỮ THƯỜNG + dấu ")" (a) b) c) d)).
       Khi gặp dấu ")" → câu đó là Đúng/Sai; đáp án đánh dấu bằng dấu * đầu dòng (*c))
       hoặc hậu tố (Đ)/(S) (hoặc đúng/sai) cuối câu. */
    var optM = line.match(/^(\*)?\s*([A-Za-z])\s*([\.\)])\s*(.+)$/);
    if (optM && cur && (cur.type === "multiple" || cur.type === "true_false")) {
      var sep = optM[3];
      if (sep === ")" && cur.type === "multiple") {
        cur.type = "true_false";
        cur.subQuestions = [];
      }
      cur.opts = cur.opts || [];
      cur.opts.push({ line: line, html: html, lett: optM[2].toUpperCase(), star: Boolean(optM[1]), txt: optM[4].trim() });
      if (cur.type === "true_false") {
        var txt = optM[4].trim();
        var vv = -1;
        if (optM[1]) vv = 1;                        // * đầu dòng = Đúng
        else {
          var tfm = txt.match(/\(?\s*(Đ|đúng)\s*\)?\s*$/i);
          if (tfm) vv = 1;                          // (Đ)/(đúng) cuối câu = Đúng
          else {
            tfm = txt.match(/\(?\s*(S|sai)\s*\)?\s*$/i);
            if (tfm) vv = 0;                        // (S)/(sai) cuối câu = Sai
          }
        }
        if (vv < 0) vv = 0;                         // không đánh dấu → mặc định Sai
        var cleanTxt = txt.replace(/\(?\s*(Đ|S|đúng|sai)\s*\)?\s*$/i, "").trim();
        if (cleanTxt) cur.subQuestions.push({ text: cleanTxt, correct: vv });
      }
      return;
    }

    /* Dòng câu hỏi số: 1. / Câu 2: / 3) ... */
    var numM = line.match(/^câu\s*(\d{1,3})\s*[\.\):]\s*(.+)$/i)
            || line.match(/^(\d{1,3})\s*[\.\)]\s+(.+)$/);
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

    /* Dòng lẻ thừa (bỏ dòng trống để tránh warning rác) */
    if (String(line || "").trim()) warnings.push("Bỏ qua (không nhận dạng): “" + line + "”");
  }

  (lines || []).forEach(function (L, i) { handleLine(L, i); });
  closeCur();

  if (!questions.length) {
    return { sections: [], warnings: warnings, error: "Không nhận dạng được câu nào. Kiểm tra có đánh số '1.', 'Câu 2:' + dòng đáp án 'A.', 'B.', ..." };
  }

  var multipleNoAns = questions.filter(function (q) { return q.type === "multiple" && q.correctIndex === null; }).length;
  if (multipleNoAns) {
    warnings.push(multipleNoAns + " câu chưa gán đáp án đúng → bấm vào đáp án trong phần xem trước để gán.");
  }

  return {
    sections: [{
      sectionTitle: "PHẦN I — ĐỀ ĐÃ NHẬN DẠNG",
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

/* ============ RENDER (giống engine filetest) ============ */

function escAttr(s) { return String(s == null ? "" : s).replace(/"/g, "&quot;"); }

/* Bỏ số thứ tự / "Câu N:" đứng đầu câu hỏi khi render (render đã tự đánh số) */
function stripQuestionNo(s) {
  s = String(s == null ? "" : s);
  var m = /^(\s*)((?:<[^>]+>\s*)*)((?:câu|câu\s+hỏi)\s+)?(\d{1,3})\s*[.:)]\s*/i.exec(s);
  if (!m) return s;
  var rest = s.slice(m[0].length);
  if (/^[\d.]/.test(rest.replace(/\s+/g, "").charAt(0) || "")) return s;   // "2.5..." không phải số thứ tự
  return fixInlineHtml(rest);
}

function render() {
  var area = $("renderArea");
  area.innerHTML = "";
  if (!testData || !testData.length) {
    area.innerHTML = '<div class="placeholder">Chưa có đề. Dán text rồi bấm "Đọc text → JSON" hoặc tạo JSON mẫu.</div>';
    return;
  }

  var gi = 0;          // chỉ số toàn cục cho câu trả lời
  var qCount = 0;

  testData.forEach(function (section, si) {
    if (!section || !Array.isArray(section.questions)) return;
    var sec = document.createElement("div");
    sec.className = "rd-section";

    var head = document.createElement("div");
    head.className = "rd-section-head";
    head.innerHTML =
      "<h3>" + sanitizeC(section.sectionTitle || ("PHẦN " + (si + 1))) + "</h3>" +
      (section.sectionDesc ? '<div class="desc">' + sanitizeC(section.sectionDesc) + "</div>" : "");

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
      var type = item.type === "true_false" ? "tf" : (item.type === "short_answer" ? "short" : "multiple");
      var tagTxt = item.type === "true_false" ? "Đúng/Sai" : (item.type === "short_answer" ? "Tự luận" : "Trắc nghiệm");

      var qMarker = extractImageMarker(item.question);
      var qText = qMarker ? qMarker.text : (item.question || "");

      var headQ = document.createElement("div");
      headQ.className = "q-head";
      headQ.innerHTML = '<span class="num">Câu ' + (idx + 1) + "</span>" +
        '<div class="q-q">' + stripQuestionNo(qText) +
        '<span class="tag tag-' + type + '">' + tagTxt + "</span></div>";
      card.appendChild(headQ);

      var qImgUrl = imageFieldUrl(item.image) || (qMarker ? qMarker.url : "");
      if (qImgUrl && /^https?:\/\//i.test(qImgUrl)) {
        var imgBox = document.createElement("div");
        imgBox.className = "q-image";
        imgBox.innerHTML = '<img src="' + escAttr(qImgUrl) + '" loading="lazy" onerror="this.parentElement.style.display=\'none\'">';
        card.appendChild(imgBox);
      }

      if (type === "multiple") {
        var list = document.createElement("div");
        var ansArr = item.answers || [];
        /* Câu có đáp án chữ dài → xếp 1 cột dọc (nếu cứ 2x2 sẽ chật/xấu).
           Đáp án ảnh vẫn để 2 cột cho gọn. */
        var stacked = ansArr.some(function (aa) {
          return !answerImageUrl(aa) && String(aa == null ? "" : aa).length > 38;
        });
        list.className = "opt-list" + (stacked ? " stacked" : "");
        /* Chỉ bóc nhãn "A." "B."... khi cả câu theo format nhãn (khớp đúng vị trí);
           đáp án bắt đầu bằng chữ in hoa như "B. Franklin" thì giữ nguyên. */
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
            item.correct = i;                                  // lưu làm đáp án đúng
            var scAll = list.querySelectorAll(".opt .setcard");
            for (var k2 = 0; k2 < scAll.length; k2++) scAll[k2].textContent = "bấm → gán đáp án";
            list.querySelectorAll(".opt").forEach(function (x) { x.classList.remove("sel-correct"); });
            o.classList.add("sel-correct");
            var sc2 = o.querySelector(".setcard");
            if (sc2) sc2.textContent = "Đáp án ✔";
            var inp = o.querySelector("input");
            if (inp) { inp.checked = true; userAnswers[idx] = i; }
            syncJson();                                        // tự cập nhật JSON bên trái
          });
          list.appendChild(o);
        });
        card.appendChild(list);
        if (!graded && (item.correct === null || item.correct === undefined)) {
          var hint = document.createElement("div");
          hint.className = "note";
          hint.style.marginTop = "8px";
          hint.textContent = "Chưa có đáp án đúng — bấm vào một phương án bên trên để gán.";
          card.appendChild(hint);
        }
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
          var kv = sq.correct ? 1 : 0;     // 1 = Đúng, 0 = Sai (giống filetest)
          if (graded) row.classList.add(val === kv ? "good" : "bad");
          row.innerHTML = '<span class="tf-lett">' + String.fromCharCode(97 + si) + "</span>" +
            '<span class="txt">' + sq.text +
              (graded ? '<span class="ans ' + (val === kv ? "ans-good" : "ans-bad") + '">(Đáp án: ' + (kv ? "Đúng" : "Sai") + ")</span>" : "") +
            "</span>" +
            '<div class="tf-opts">' +
            '<label' + (kv === 1 ? ' class="cor"' : "") + '><input type="radio" name="tf' + idx + "_" + si + '" value="1"' + (val === 1 ? " checked" : "") + "><b>Đ</b></label>" +
            '<label' + (kv === 0 ? ' class="cor"' : "") + '><input type="radio" name="tf' + idx + "_" + si + '" value="0"' + (val === 0 ? " checked" : "") + "><b>S</b></label>" +
            "</div>";
          row.querySelectorAll("input").forEach(function (inp) {
            inp.addEventListener("change", function () {
              if (graded) return;
              sq.correct = Number(inp.value);                  // lưu làm đáp án đúng (0/1)
              var r2 = this.closest(".tf-row");
              if (!r2) return;
              r2.querySelectorAll(".tf-opts label").forEach(function (l) {
                l.classList.remove("cor");
                l.classList.remove("on");
              });
              this.parentElement.classList.add("cor");
              syncJson();                                      // tự cập nhật JSON bên trái
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
            var anOld = card.querySelector(".short-ans");
            if (anOld) anOld.innerHTML = v ? "Đáp án: \u201C" + escapeC(v) + "\u201D" : "Chưa có đáp án mẫu — thêm correctAnswer trong JSON.";
            syncJson();
            setNote(v ? ("Đã lưu \u201C" + escapeC(v) + "\u201D làm đáp án mẫu.") : "Đã xóa đáp án mẫu.", false);
          });
          card.appendChild(sv);
        }
        if (!graded) {
          var an = document.createElement("div");
          if (item.correctAnswer && String(item.correctAnswer).trim()) {
            an.className = "short-ans";
            an.innerHTML = "Đáp án: \u201C" + escapeC(item.correctAnswer) + "\u201D";
          } else {
            an.className = "note error";
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
  if (rcEl) rcEl.textContent = testData.length + " phần · " + qCount + " câu";
}

function norm(v) {
  return String(v == null ? "" : v).trim().toLowerCase().replace(/\s+/g, " ");
}

/* ============ ĐỀ MẪU ============ */

/* CÁCH ĐÁNH DẤU ĐÁP ÁN (xem helper bên dưới để note):
   - Trắc nghiệm: dòng "Đáp án: A" sau phương án  HOẶC dấu * trước phương án (*D. ...)
   - Đúng/Sai: hậu tố (Đ)/(S) cuối câu  HOẶC dấu * trước chữ (a)/b)/c)/d)) = Đúng
   - Tự luận: dòng "Đáp án: nội_dung" sau câu hỏi
   - Ảnh câu hỏi: dòng "Ảnh: https://..." hoặc "Link ảnh: https://..." ngay dưới câu hỏi
   - Đáp án ảnh: phương án chỉ là link ảnh (hoặc "Ảnh: <link>") → tự render thành ảnh
   Muốn sửa đáp án → đổi chữ ở dòng "Đáp án:" hoặc chuyển dấu * sang phương án khác. */
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

/* Đề mẫu TIẾNG ANH — ngắn gọn: trắc nghiệm + đọc hiểu (passage) + nghe (listening).
   Đáp án đánh dấu: dòng "Đáp án: X" hoặc dấu * trước phương án. */
function sampleTextEN() {
  return [
    "PHẦN I. TRẮC NGHIỆM",
    "1. Chọn đáp án đúng dưới dạng hình ảnh:",
    "A. https://placehold.co/420x280/png?text=Go+A",
    "B. Ảnh: https://placehold.co/420x280/png?text=Go+B",
    "*C. Link ảnh: https://placehold.co/420x280/png?text=Go+C",
    "D. https://placehold.co/420x280/png?text=Go+D",
    "",
    "2. What is the past tense of <b>go</b>?",
    "A. goed",
    "B. gone",
    "C. went",
    "D. goed",
    "Đáp án: C",
    "",
    "3. Choose the correct word: She ___ to school every day.",
    "A. go",
    "B. goes",
    "C. going",
    "D. gone",
    "Đáp án: B",
    "",
    "4. Which of these is a winter month?",
    "A. June",
    "B. July",
    "*C. January",
    "D. August",
    "",
    "PHẦN II. ĐỌC HIỂU",
    "Passage: <b>My family is small.</b> There are four people in it: my father, my mother, my brother and me. My father is a doctor. My mother is a teacher.",
    "5. How many people are in the family?",
    "A. Three",
    "B. Four",
    "C. Five",
    "D. Six",
    "Đáp án: B",
    "",
    "6. What is the mother's job?",
    "A. A doctor",
    "B. A teacher",
    "C. A nurse",
    "D. A farmer",
    "Đáp án: B",
    "",
    "PHẦN III. NGHE",
    "https://static-assets.prepcdn.com/content-management-system/Part_1_Listening_87386e8c4b.mp3",
    "7. Listen and choose: What time is the meeting?",
    "A. 7:00 AM",
    "B. 8:00 AM",
    "C. 9:00 AM",
    "D. 10:00 AM",
    "Đáp án: B",
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

/* ============ THIẾT LẬP ĐỀ (Tiếp tục) ============ */

function shuffleArr(arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return arr;
}

/* Áp dụng thiết lập: thời gian + xáo trộn câu/đáp án lên testData (mỗi đối tượng 1 lần) */
function applyMeta(goNext) {
  if (!testData || !testData.length) { setNote("Chưa có đề để áp dụng thiết lập.", true); return; }
  testData.forEach(function (s) {
    if (!s || !Array.isArray(s.questions)) return;
    if (testMeta.minutes > 0) s.timeLimit = testMeta.minutes;
    else if (s.timeLimit === 0) delete s.timeLimit;
    if (testMeta.shuffleQ && !s.__shfQ) {
      shuffleArr(s.questions);
      Object.defineProperty(s, "__shfQ", { value: true, enumerable: false });
    }
    s.questions.forEach(function (q) {
      if (testMeta.shuffleA && q.type === "multiple" && Array.isArray(q.answers) && q.answers.length > 1 && !q.__shfA) {
        var map = q.answers.map(function (_, i) { return i; });
        shuffleArr(map);
        var nc = q.correct;
        q.answers = map.map(function (i) { return q.answers[i]; });
        q.correct = (typeof nc === "number") ? map.indexOf(nc) : nc;
        Object.defineProperty(q, "__shfA", { value: true, enumerable: false });
      }
    });
  });
  graded = false;
  userAnswers = {};
  $("resultBox").hidden = true;
  if (!jsonAreaDirty) writeJson(JSON.stringify(testData, null, 2));
  render();
  if (goNext) showStage(4);   // áp dụng thiết lập → sang bước 4 (rà soát & xuất bản)
}

/* Lấy text thật (bỏ thẻ) của 1 chuỗi HTML — dùng cho danh sách câu ở màn rà soát */
function textOf(x) {
  var s = String(x == null ? "" : x);
  if (!/<[a-zA-Z/]/.test(s)) return s.replace(/\s+/g, " ").trim();
  var d = document.createElement("div");
  d.innerHTML = s;
  return (d.textContent || "").replace(/\s+/g, " ").trim();
}

/* ============ MÀN 3: RÀ SOÁT & XUẤT BẢN (demo — xuất bản chỉ mô phỏng) ============ */
/* Layout: TRÁI = rà soát đề (từng phần + danh sách câu); PHẢI = thông tin thiết lập + Xuất bản. */

function renderReview() {
  var area = $("revArea");
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

  /* ---- Cột trái: rà soát đề ---- */
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
          return String.fromCharCode(97 + k) + "=" + (sq.correct ? "Đúng" : "Sai");
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
  left += '<div class="rev-total">Tổng <b>' + qn + "</b> câu - " + nSec + " phần - Thang điểm:" + testMeta.score +
    (subtestOn ? ' · <b style="color:#7c3aed">đề con ' + subtestN + " câu</b>" : "") +
    " (mỗi câu " + (scoreBase > 0 ? (testMeta.score / scoreBase).toFixed(2) : "0.00") + " điểm)</div>";

  /* ---- Cột phải: thiết lập + xuất bản ---- */
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
        (testMeta.shuffleQ ? "Bật" : "Tắt") + "</b> · Đáp án: <b>" + (testMeta.shuffleA ? "Bật" : "Tắt") +
      "</b></span></div>" +
      '<div class="rev-meta-row"><span class="rev-k"><i class="fa-solid fa-dice" style="color:#7c3aed"></i> Đề con</span><span class="rev-v">' +
        (subtestOn ? "<b>" + subtestN + "</b> câu · bốc ngẫu nhiên mỗi lần mở" : "Tắt") +
      "</span></div>" +
      '<div class="rev-meta-row"><span class="rev-k"><i class="fa-solid fa-chart-column" style="color:#16a34a"></i> Xem điểm</span><span class="rev-v"><b>' +
        (testMeta.showScore === "none" ? "Bị Ẩn" : "Có") +
      "</b></span></div>" +
      '<div class="rev-meta-row"><span class="rev-k"><i class="fa-solid fa-eye" style="color:#db2777"></i> Xem đáp án</span><span class="rev-v"><b>' +
        (testMeta.showAnswers === "none" ? "Không cho phép" : testMeta.showAnswers === "perfect" ? "Chỉ khi tối đa" : "Luôn hiện") +
      "</b></span></div>" +
      '<div class="rev-meta-row"><span class="rev-k"><i class="fa-solid fa-folder-open" style="color:#065f46"></i> Thống kê</span><span class="rev-v">' + qn + " câu · " + nSec + " phần</span></div>" +
    "</div>" +
    '<div class="note" id="revNote" hidden></div>' +
    '<div class="rev-actions">' +
      '<button type="button" class="btn btn-ghost" id="btnRevBack">← Sửa lại đề</button>' +
      '<button type="button" class="btn btn-success" id="btnPublish">' + (currentEditId ? '<i class="fa-solid fa-floppy-disk"></i> Cập nhật đề' : '<i class="fa-solid fa-rocket"></i> Xuất bản đề') + '</button>' +
    "</div>";

  area.innerHTML = '<div class="rev-split"><div class="rev-left" id="revLeft">' + left + "</div>" +
    '<div class="rev-right">' + right + "</div></div>";

  var pub = $("btnPublish");
  var warns = [];
  if (!testMeta.name) warns.push("Chưa đặt <b>tên đề</b> — mở <b>bước 3 Thiết lập đề</b> để điền trước khi xuất bản.");
  if (!testMeta.subject) warns.push("Chưa chọn <b>môn học</b> — đề sẽ xuất hiện ở Phòng Học theo môn.");
  if (subtestInvalid) warns.push("Số câu <b>đề con</b> không hợp lệ — mở <b>Thiết lập đề</b> và nhập lại trong khoảng 1–" + qn + ".");
  var ne = $("revNote");
  if (ne) {
    ne.innerHTML = warns.join("<br>");
    ne.hidden = warns.length === 0;
  }
  if (pub) pub.disabled = !testMeta.name || subtestInvalid;
}

/* Xuất bản đề — GHI DATABASE THẬT qua RPC teacher_upsert_test_set.
   Lưu vào bảng test_sets (is_complete = true) → hiện card "Làm bài"
   đúng môn trong Phòng Học. Người chơi mở bằng ?de=t:<id>, engine
   cauhoi/filetest.html đọc nội dung + cấu hình (minutes/score/shuffle_*) từ DB. */
async function publishTest() {
  var b = $("btnPublish");
  if (!b || b.disabled || !testData || !testData.length) return;
  if (!testMeta.name) { renderReview(); return; }
  var isEdit = Boolean(currentEditId);
  var isNewTest = !isEdit;
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
    p_start_at: testMeta.timeEnabled ? (testMeta.startAt || null) : null,
    p_end_at: testMeta.timeEnabled ? (testMeta.endAt || null) : null
  };
  var left = $("revLeft");
  var rn = $("revNote");
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
        : code === "structure_locked" ? "Đề đã xuất bản — không thể thay đổi cấu trúc (thêm/bớt câu/section/đáp án). Chỉ được sửa nội dung/đáp án hoặc điểm."
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
            '<button type="button" class="btn btn-primary" id="download-qr-btn" style="display:none;margin:8px auto">Tải ảnh QR</button>' +
            '<p id="qr-status" class="qr-status" role="status"></p>' +
          '</section>' +
          '<section class="publish-details">' +
          '<div class="publish-success-check" aria-hidden="true"><i class="fa-solid fa-check"></i></div>' +
          "<h3>" + (isEdit ? "Cập nhật thành công" : "Tạo đề thành công") + "</h3>" +
          "<p>Đề <b>" + escapeC(testMeta.name) + "</b>" +
            (subject ? " - Môn <b>" + escapeC(subject) + "</b>" : "") +
            (isEdit ? " đã lưu lại bản cập nhật, card trong <b>Phòng Học</b> dùng nội dung mới ngay.</p>" : " đã đưa lên DB, hiện card <b>Làm bài</b> đúng môn trong <b>Phòng Học</b>.</p>") +
          '<div class="publish-link-row">' +
            '<input id="publishedTestLink" type="text" readonly aria-label="Link đề thi" style="flex:1;min-width:0;padding:10px 12px;border:1px solid #b9e6d2;border-radius:9px;background:#fff;color:#047857;font-size:13px">' +
            '<div class="publish-copy-wrap"><button type="button" class="btn btn-primary" id="btnCopyTestLink">Copy</button><span id="copy-link-status" class="copy-link-status" aria-live="polite"></span></div>' +
          '</div>' +
          '<p class="pub-id">' + realId + "</p>" +
          '<p class="muted publish-settings-summary">Điểm tối đa <b>' + payload.p_score + "</b> - Trộn câu: <b>" +
            (payload.p_shuffle_q ? "Bật" : "Tắt") + "</b> - Trộn đáp án: <b>" +
            (payload.p_shuffle_a ? "Bật" : "Tắt") + "</b> - Điểm: <b>" +
            (payload.p_show_score === "none" ? "Ẩn" : "Hiện") + "</b> - đáp án: <b>" +
            (payload.p_show_answers === "none" ? "Không" : payload.p_show_answers === "perfect" ? "Khi tối đa" : "Luôn") + "</b> - Đề con: <b>" +
            (payload.p_subtest_enabled ? payload.p_subtest_count + "/" + countQ(testData) + " câu" : "Tắt") + "</b>" +
            (testMeta.timeEnabled && testMeta.startAt && testMeta.endAt ? " - Mở đề: <b>" + fmtDateTime(testMeta.startAt) + " → " + fmtDateTime(testMeta.endAt) + "</b>" : "") +
          "</p>" +
          '</section>' +
          '<aside class="publish-settings-aside">' + setupCardHtml + '</aside>' +
          '<div class="publish-result-actions"><button type="button" class="btn btn-primary" id="btnPublishAgain">＋ Xuất bản đề mới</button></div>' +
        '</div>';
      var linkInput = $("publishedTestLink");
      if (linkInput) linkInput.value = link;
      generateCustomQRCode(link);
    }
    if (isNewTest) {
      try {
        await navigator.clipboard.writeText(link);
        setCopyLinkStatus("Sao chép link thành công!");
      } catch (_copyError) {}
    }
    if (rn) rn.hidden = true;
    b.disabled = false;
    b.innerHTML = currentEditId ? '<i class="fa-solid fa-floppy-disk"></i> Đã lưu ✓' : '<i class="fa-solid fa-rocket"></i> Đã xuất bản ✓';
    b.style.opacity = ".55";
    if (typeof mod.logAppError === "function") {
      mod.logAppError({ source: "newtest", category: "feature", level: "info", code: currentEditId ? "TEST_UPDATED" : "TEST_PUBLISHED", message: (currentEditId ? "Cập nhật đề: " : "Xuất bản đề: ") + realId });
    }
  } catch (e) {
    var errMsg = (e && e.message) || "Lỗi không xác định.";
    console.error("[PUBLISH] " + errMsg);
    if (typeof mod !== "undefined" && mod && typeof mod.logAppError === "function") {
      mod.logAppError({ source: "newtest", category: "feature", level: "error", code: "TEST_PUBLISH_FAIL", message: errMsg });
    }
    if (left) {
      left.innerHTML =
        '<div style="border:1px solid #fecaca;background:#fef2f2;border-radius:18px;padding:24px;text-align:center">' +
          '<div style="font-size:36px"><i class="fa-solid fa-triangle-exclamation" style="color:#ef4444"></i></div>' +
          "<h3 style=\"color:#b91c1c;margin:6px 0 4px;font-size:17px\">Xuất bản thất bại</h3>" +
          "<p style=\"margin:4px 0;font-size:13.5px;color:#7f1d1d\">" + escapeC(errMsg) + "</p>" +
          '<button type="button" class="btn btn-primary" id="btnPublishAgain">Thử lại</button>' +
        "</div>";
    }
    if (rn) rn.hidden = true;
    b.disabled = false;
    b.innerHTML = currentEditId ? '<i class="fa-solid fa-floppy-disk"></i> Lưu lại' : '<i class="fa-solid fa-rocket"></i> Xuất bản';
    b.style.opacity = "1";
  }
}

/* Delegation cho màn 4 (nút dựng lại mỗi lần render nên không bind trực tiếp) */
$("p4").addEventListener("click", function (e) {
  var el = e.target && e.target.closest ? e.target.closest("#btnPublish, #btnRevBack, #btnPublishAgain, #btnCopyTestLink, #download-qr-btn") : null;
  if (!el) return;
  if (el.id === "btnPublish") publishTest();
  else if (el.id === "btnRevBack") showStage(2);
  else if (el.id === "btnPublishAgain") { maxStage = 1; showStage(1); }
  else if (el.id === "btnCopyTestLink") {
    var input = $("publishedTestLink");
    if (!input) return;
    var copyPromise = navigator.clipboard && navigator.clipboard.writeText
      ? navigator.clipboard.writeText(input.value)
      : Promise.reject(new Error("Clipboard API không khả dụng."));
    copyPromise.then(function () {
      setCopyLinkStatus("Sao chép link thành công!");
    }).catch(function () {
      input.focus();
      input.select();
      try {
        if (document.execCommand("copy")) setCopyLinkStatus("Sao chép link thành công!");
        else setCopyLinkStatus("Không sao chép được link.", true);
      } catch (_copyError) {
        setCopyLinkStatus("Không sao chép được link.", true);
      }
    });
  } else if (el.id === "download-qr-btn") {
    var canvas = $("qr-canvas");
    if (!canvas || !canvas.width || !canvas.height) return;
    var downloadLink = document.createElement("a");
    downloadLink.href = canvas.toDataURL("image/png");
    downloadLink.download = "LearnHub_QR.png";
    downloadLink.click();
  }
});

/* Tạo QR trên canvas với khung đơn giản bằng code để tải thành PNG. */
function generateCustomQRCode(linkDeThi) {
  var canvas = $("qr-canvas");
  var downloadButton = $("download-qr-btn");
  if (!canvas || !downloadButton || typeof QRCode !== "function") return;

  canvas.style.display = "none";
  downloadButton.style.display = "none";

  const qrSize = 256;
  const padding = 20;
  const frameRadius = 22;
  const frameSize = qrSize + padding * 2;
  const offsetX = (frameSize - qrSize) / 2;
  const offsetY = (frameSize - qrSize) / 2;
  canvas.width = frameSize;
  canvas.height = frameSize;

  var qrHost = document.createElement("div");
  qrHost.setAttribute("aria-hidden", "true");
  qrHost.style.cssText = "position:fixed;left:-10000px;top:0;width:" + qrSize + "px;height:" + qrSize + "px;overflow:hidden";
  document.body.appendChild(qrHost);

  try {
    new QRCode(qrHost, {
      text: linkDeThi,
      width: qrSize,
      height: qrSize,
      correctLevel: QRCode.CorrectLevel.M
    });
    var qrCanvas = qrHost.querySelector("canvas");
    if (!qrCanvas) throw new Error("Không tạo được mã QR.");

    var ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Trình duyệt không hỗ trợ canvas.");
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(frameRadius, 2);
    ctx.lineTo(frameSize - frameRadius, 2);
    ctx.quadraticCurveTo(frameSize - 2, 2, frameSize - 2, frameRadius);
    ctx.lineTo(frameSize - 2, frameSize - frameRadius);
    ctx.quadraticCurveTo(frameSize - 2, frameSize - 2, frameSize - frameRadius, frameSize - 2);
    ctx.lineTo(frameRadius, frameSize - 2);
    ctx.quadraticCurveTo(2, frameSize - 2, 2, frameSize - frameRadius);
    ctx.lineTo(2, frameRadius);
    ctx.quadraticCurveTo(2, 2, frameRadius, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(qrCanvas, offsetX, offsetY, qrSize, qrSize);

    canvas.style.display = "block";
    downloadButton.style.display = "block";
  } catch (error) {
    console.error("[QR] Không thể tạo ảnh QR:", error);
    var qrStatus = $("qr-status");
    if (qrStatus) qrStatus.textContent = "Không tạo được ảnh QR.";
  } finally {
    qrHost.remove();
  }
}

/* Cập nhật nhãn nút "Tiếp tục" theo tên đề đã đặt */
function updateSetupBtn() {
  var b = $("btnSetup");
  if (!b) return;
  b.textContent = "▶ Tiếp tục";
  b.title = "";
}

/* Đồng bộ khối "đề con": chỉ hiện ô số câu khi bật, kèm tổng số câu hiện có */
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
        (cur > 0 ? Math.min(cur, total) : "N") + "</b> câu; điểm và thời gian giữ nguyên."
      : "Chưa có câu hỏi — hãy đọc/nạp đề trước khi bật đề con.";
  }
}

/* Định dạng Date → giá trị cho <input type="datetime-local"> (giờ địa phương) */
function toLocalInput(d) {
  var p = function (n) { return (n < 10 ? "0" : "") + n; };
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) +
    "T" + p(d.getHours()) + ":" + p(d.getMinutes());
}

/* Định dạng dd/mm/yyyy HH:mm để hiển thị */
function fmtDateTime(v) {
  var d = (v instanceof Date) ? v : new Date(v);
  if (isNaN(d.getTime())) return "";
  var p = function (n) { return (n < 10 ? "0" : "") + n; };
  return p(d.getDate()) + "/" + p(d.getMonth() + 1) + "/" + d.getFullYear() +
    " " + p(d.getHours()) + ":" + p(d.getMinutes());
}

/* Đồng bộ khối "thời gian mở đề": mặc định bắt đầu = bây giờ, kết thúc = +7 ngày */
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
      ? "Học sinh làm được từ " + fmtDateTime(s) + " đến " + fmtDateTime(e) + " — vẫn phải bật công tắc Hoàn thành."
      : "Mặc định: bắt đầu là bây giờ, kết thúc sau 7 ngày. Kết thúc phải sau bắt đầu.";
  }
}

/* Nạp trạng thái hiện tại vào form thiết lập (bước 3) */
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
  $("setTimeEnabled").checked = !!testMeta.timeEnabled;
  $("setStartAt").value = testMeta.startAt ? toLocalInput(new Date(testMeta.startAt)) : "";
  $("setEndAt").value = testMeta.endAt ? toLocalInput(new Date(testMeta.endAt)) : "";
  syncTimeUI();
  $("setupError").hidden = true;
  clearInvalidSetup();
}

/* Nút "▶ Tiếp tục" ở màn 2 → sang bước 3 (thiết lập đề) */
$("btnSetup").addEventListener("click", function () { showStage(3); });

/* Nút "← Quay lại" ở bước 3 → về màn 2 */
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

/* 4 mục bắt buộc: môn học, tên đề, thời gian, điểm tối đa */
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

  if (!subjEl.value) { errs.push("chọn <b>môn học</b>"); bad.push(subjEl); }
  if (!nameEl.value.trim()) { errs.push("nhập <b>tên đề</b>"); bad.push(nameEl); }
  if (String(minEl.value).trim() === "" || Number(minEl.value) < 0) { errs.push("nhập <b>thời gian làm bài</b> (0 = không giới hạn)"); bad.push(minEl); }
  if (String(scoreEl.value).trim() === "" || Number(scoreEl.value) < 1) { errs.push("nhập <b>điểm tối đa</b> (≥ 1)"); bad.push(scoreEl); }

  var subtestEnabled = !!(subtestChk && subtestChk.checked);
  var subtestCount = null;
  if (subtestEnabled) {
    var total = countQ(testData);
    var raw = String(subtestEl.value).trim();
    var n = Number(raw);
    if (!total) {
      errs.push("nạp đề có câu hỏi trước khi bật <b>đề con</b>");
      bad.push(subtestEl);
    } else if (raw === "" || !isFinite(n) || n < 1 || n > total || Math.floor(n) !== n) {
      errs.push("nhập <b>số câu đề con</b> từ 1 đến " + total);
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
    if (!sv) { errs.push("chọn <b>thời gian bắt đầu</b>"); bad.push(stEl); }
    if (!ev) { errs.push("chọn <b>thời gian kết thúc</b>"); bad.push(enEl); }
    if (sv && ev) {
      var sd = new Date(sv), ed = new Date(ev);
      if (isNaN(sd.getTime()) || isNaN(ed.getTime())) {
        errs.push("<b>thời gian mở đề</b> không hợp lệ"); bad.push(stEl);
      } else if (ed <= sd) {
        errs.push("<b>thời gian kết thúc</b> phải sau thời gian bắt đầu"); bad.push(enEl);
      } else {
        startAtIso = sd.toISOString();
        endAtIso = ed.toISOString();
      }
    }
  }

  clearInvalidSetup();
  var se = $("setupError");
  if (errs.length) {
    bad.forEach(function (el) { el.classList.add("invalid"); });
    se.innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="color:#d97706"></i> Vui lòng ' + errs.join(", ") + " để tiếp tục.";
    se.hidden = false;
    return;
  }
  se.hidden = true;

  testMeta.subject = subjEl.value || "";
  testMeta.name = nameEl.value.trim();
  testMeta.desc = $("setDesc").value.trim();
  testMeta.minutes = Math.max(0, parseInt(minEl.value, 10) || 0);
  testMeta.score = Math.max(1, parseInt(scoreEl.value, 10) || 10);
  testMeta.shuffleQ = (document.querySelector('input[name="setShuffleQ"]:checked') || {}).value === "1";
  testMeta.shuffleA = (document.querySelector('input[name="setShuffleA"]:checked') || {}).value === "1";
  testMeta.showScore = (document.querySelector('input[name="setShowScore"]:checked') || {}).value || "always";
  testMeta.showAnswers = (document.querySelector('input[name="setShowAnswers"]:checked') || {}).value || "always";
  testMeta.subtestEnabled = subtestEnabled;
  testMeta.subtestCount = subtestEnabled ? subtestCount : null;
  testMeta.timeEnabled = timeEnabled;
  testMeta.startAt = timeEnabled ? startAtIso : null;
  testMeta.endAt = timeEnabled ? endAtIso : null;
  updateSetupBtn();
  applyMeta(true);   // applyMeta(true) → nhảy sang bước 4 (rà soát & xuất bản)
});

/* Nạp dropdown môn học (8 môn trong Phòng Học) — đề xuất bản sẽ hiện đúng môn này */
(function () {
  var sel = $("setSubject");
  if (!sel) return;
  sel.innerHTML = '<option value="">— Chưa chọn —</option>' +
    TEST_SUBJECTS.map(function (s) {
      return '<option value="' + escAttr(s.name) + '">' + s.name + " (" + s.id + ")</option>";
    }).join("");
  sel.value = testMeta.subject || "";
})();

/* ============ EVENTS ============ */

$("btnSample").addEventListener("click", function () {
  $("inputText").value = sampleText();
  setFileLabel(null);
  setNote("Đã nạp đề mẫu → bấm <b>Đọc text → JSON</b>.", false);
});

$("btnSampleEN").addEventListener("click", function () {
  $("inputText").value = sampleTextEN();
  setFileLabel(null);
  setNote("Đã nạp đề mẫu tiếng Anh → bấm <b>Đọc text → JSON</b>.", false);
});

$("btnParse").addEventListener("click", function () {
  var txt = $("inputText").value.trim();
  /* Dán JSON trực tiếp vào ô text (màn 1) → parse thẳng thay vì đọc như văn bản Word */
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
      setNote("Đã nhận dạng <b>JSON dán trực tiếp</b>: " + countQ(testData) + " câu.", false);
      showStage(2);
    } catch (e) {
      setNote("Bắt đầu giống JSON nhưng parse lỗi: " + escapeC(e.message), true);
    }
    return;
  }
  applyParseResult(parseTextToJson($("inputText").value), "");
});

/* Áp dụng text JSON ở ô jsonArea vào testData + render (đã bỏ nút "Áp dụng & Render")
   — dùng cho tải file .json và live-render khi sửa tay. */
function applyJsonString(txt) {
  try {
    var j = JSON.parse(txt);
    testData = Array.isArray(j) ? j : (j && Array.isArray(j.sections) ? j.sections : []);
    graded = false;
    userAnswers = {};
    $("resultBox").hidden = true;
    render();
    setNote("Đã áp dụng JSON: " + countQ(testData) + " câu.", false);
  } catch (e) {
    setNote("JSON không hợp lệ: " + escapeC(e.message), true);
  }
}

/* Ghi testData hiện tại vào ô JSON (dùng khi bấm chọn đáp án bên preview)
   — writeJson tự đặt jsonAreaDirty=false nên live-render không ghi đè lại */
function syncJson() {
  writeJson(JSON.stringify(testData, null, 2));
}

/* Live-render: mỗi lần user gõ JSON sẽ chờ 350ms rồi áp dụng lại preview */
var jsonRenderTimer = null;
function scheduleJsonRender() {
  if (jsonRenderTimer) clearTimeout(jsonRenderTimer);
  jsonRenderTimer = setTimeout(function () {
    jsonRenderTimer = null;
    applyJsonString($("jsonArea").value);
  }, 350);
}

$("btnBack").addEventListener("click", function () {
  /* Mở từ khu vực Giáo viên (shell sidebar / cardphonghoc / trang chủ) →
     quay về tab "Bài kiểm tra" (view=quiz), không về trang chủ.
     Mở độc lập (demo) → giữ luồng bước 1. */
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

/* Tải tệp lên: một nút chung cho .docx / .txt / .json */
$("fileUpload").addEventListener("change", function () {
  var f = this.files && this.files[0];
  if (!f) return;
  this.value = "";
  var name = f.name || "";

  /* --- .json: đọc thẳng thành JSON --- */
  if (/\.json$/i.test(name)) {
    var frJ = new FileReader();
    frJ.onload = function () {
      try {
        var j = JSON.parse(String(frJ.result || ""));
        setFileLabel(f.name);
        testMeta.name = baseName(f.name);        // tên file bỏ đuôi → tên đề
        updateSetupBtn();
        writeJson(JSON.stringify(Array.isArray(j) ? j : (j.sections || []), null, 2));
        applyJsonString($("jsonArea").value);
        showStage(2);
      } catch (e) {
        setNote("File JSON không hợp lệ: " + escapeC(e.message), true);
      }
    };
    frJ.readAsText(f, "utf-8");
    return;
  }

  /* --- .docx / .txt: parse text --- */
  var isDocx = /\.docx$/i.test(name);
  var fr = new FileReader();
  fr.onload = function () {
    setFileLabel(f.name);
    testMeta.name = baseName(f.name);          // tên file bỏ đuôi → tên đề
    updateSetupBtn();
    if (!isDocx) {
      $("inputText").value = String(fr.result || "");
      setNote("Đã tải <b>" + escapeC(f.name) + "</b>. Bấm <b>Đọc text → JSON</b>.", false);
      return;
    }
    if (typeof window.mammoth === "undefined") {
      setNote("Thư viện mammoth chưa tải được (cần Internet). Hãy dùng chế độ dán text.", true);
      return;
    }
    var keep = $("keepFmt") ? Boolean($("keepFmt").checked) : false;
    var wrap = function (promise, useHtml) {
      promise.then(function (res) {
        var extra = res.messages && res.messages.length ? " Lưu ý: " + escapeC(res.messages.map(function (m) { return m.message; }).slice(0, 3).join(" • ")) : "";
        if (useHtml) {
          var r = parseToSections(htmlBlocksToLines(res.value));
          applyParseResult(r, "Giữ định dạng chữ (đậm/nghiêng/gạch chân) từ .docx.<br>" + extra + "<br>");
        } else {
          $("inputText").value = String(res.value || "");
          setNote("Đã parse <b>" + escapeC(f.name) + "</b> → dán vào ô text." + extra +
            " Bấm <b>Đọc text → JSON</b>; nhớ rà đáp án đúng nhé.", false);
        }
      }).catch(function (e) {
        setNote("Không đọc được file .docx: " + escapeC(e && e.message ? e.message : e), true);
      });
    };
    try {
      if (keep) wrap(mammoth.convertToHtml({ arrayBuffer: fr.result }), true);
      else wrap(mammoth.extractRawText({ arrayBuffer: fr.result }), false);
    } catch (e) {
      setNote("Lỗi đọc file .docx: " + escapeC(e && e.message ? e.message : e), true);
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
  if (r.warnings && r.warnings.length) note.push("<b>" + r.warnings.length + " dòng ghi chú:</b> " + escapeC(r.warnings.slice(0, 5).join(" • ")));
  if (r.error) { setNote(escapeC(r.error), true); return; }
  testData = normalize(r.sections);
  writeJson(JSON.stringify(testData, null, 2));
  graded = false;
  userAnswers = {};
  $("resultBox").hidden = true;
  render();
  var msg = note.length ? note.join("<br>") + "<br>" : "";
  setNote(msg + (okNote || "") + " Đã đọc <b>" + countQ(testData) + "</b> câu.", false);
  if (!stay) showStage(2);
}

/* Làm sạch JSON xuất ra: bỏ trường nội bộ, dùng `correct` đúng spec */
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

/* Sanitize HTML do giáo viên nhập: chỉ giữ thẻ định dạng an toàn, gỡ thuộc tính nguy hiểm
   (on*, href/src javascript:...), loại bỏ hẳn script/iframe/object...
   Dùng cho sectionDesc / passage / sectionTitle (nội dung cố ý cho phép HTML). */
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

/* Khởi tạo: chỉ hiện bước 1 với placeholder hướng dẫn — không tự nạp đề mẫu.
   Khi muốn xem demo, bấm "Nạp đề mẫu" hoặc "Nạp đề mẫu Anh".
   Nếu đang SỬA (?edit=...) thì nhảy thẳng màn 2 (initEditMode() ở dưới). */
if (testData && testData.length) { applyMeta(); }
updateSetupBtn();
showStage(1);

/* ============ SỬA ĐỀ CÓ SẴN (?edit=t:<id>) → vào thẳng màn 2 ============
   Nạp content + thiết lập từ DB (get_test_content), tô ô JSON + render preview
   giống như vừa parse xong, rồi nhảy ngay đến màn 2 (JSON & Xem trước). */
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
        /* Lấy trạng thái "hoàn thành" hiện tại (get_test_content không trả cột này) */
        var listRes = await mod.supabase.rpc("teacher_list_test_sets");
        if (listRes.error) throw listRes.error;
        var row = (listRes.data || []).filter(function (r) { return String(r.set_id) === id; })[0];
        currentEditId = id;
        currentEditComplete = row ? !!row.is_complete : true;
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
        testMeta.startAt = (row && row.start_at) ? row.start_at : null;
        testMeta.endAt = (row && row.end_at) ? row.end_at : null;
        testMeta.timeEnabled = !!(testMeta.startAt || testMeta.endAt);
        graded = false;
        userAnswers = {};
        $("resultBox").hidden = true;
        writeJson(JSON.stringify(testData, null, 2));
        render();
        setFileLabel(d.name || "Chưa có tiêu đề");
        var lockNote = currentEditComplete
          ? '<br><b style="color:#b45309"><i class="fa-solid fa-lock"></i> Đề đã xuất bản</b> — được sửa nội dung/đáp án/điểm/mô tả, nhưng <b>KHÔNG</b> được thêm/bớt câu, section, đáp án hay mệnh đề. Muốn đổi cấu trúc hãy tạo đề mới.'
          : "";
        setNote("Đã nạp sẵn đề <b>" + escapeC(d.name || "chưa đặt tên") + "</b> để sửa (bước 2). Sửa xong bấm <b>▶ Tiếp tục</b> để sang bước 3 (thiết lập) rồi bước 4 (rà soát & lưu lại)." + lockNote, false);
        showStage(2);
      } catch (e) {
        console.error("[SỬA ĐỀ]", e);
        var msg = (e && e.message) || "Lỗi không xác định.";
        setNote("Không tải được đề để sửa: " + escapeC(msg), true);
        showStage(1);
      }
    })();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bodyLoaded);
  else bodyLoaded();
})();
