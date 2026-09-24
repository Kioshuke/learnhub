/* ============================================================================
   taileu-manage.js — QUẢN LÝ THƯ VIỆN TÀI LIỆU (tailieu_docs)
   ----------------------------------------------------------------------------
   Component dùng chung cho 2 nơi:
     • teacher/taileu.html            → import { mountTaiLieuManage } from "../element/taileu-manage.js"
     • administrator.html (admin tab) → import("./element/taileu-manage.js") rồi gọi mountTaiLieuManage

   Cách dùng:
     mountTaiLieuManage(rootEl, { supabase?, escapeHtml?, logAppError? })
       - supabase / escapeHtml / logAppError: cho phép truyền client & helper của trang chủ
         (để trống → dùng mặc định từ supabase-config.js). QUAN TRỌNG với admin:
         truyền client có storage key learnhub-admin-auth mới có session.

   Tính năng:
     - Dán link → TỰ NHẬN nguồn: drive.google.com → "drive" | đường dẫn trong web/repo
       → "direct" | URL ngoài → "storage".
     - ICON: theo đuôi file (pdf đỏ, docx xanh, xlsx xanh lá, pptx cam...) — link không
       có đuôi thấy được thì hiện dropdown chọn tay (pdf/docx/xlsx/pptx/png/mp4/mp3/zip/bỏ trống).
     - SIZE: Drive → Google Drive API v3 (điền DRIVE_API_KEY bên dưới); web/repo → HEAD
       Content-Length; không lấy được → để trống nhập tay.
     - author + date TỰ set ở server (admin → "Admin", giáo viên → "Giáo viên", ngày = hôm nay).
   ============================================================================ */

import { supabase as defaultSupabase, escapeHtml as defaultEscapeHtml, logAppError as defaultLogAppError } from "../supabase-config.js";

/* ===== Lấy dung lượng file Google Drive =====
   Key Drive đặt ở Cloudflare Worker (hubie-proxy) dưới tên biến môi trường
   DRIVE_API_KEY — website chỉ gọi worker, KHÔNG đụng key trực tiếp.
   Nếu worker chưa cấu hình key → trả về lỗi, ô size để trống nhập tay. */
const DRIVE_SIZE_ENDPOINT = "https://hubie-proxy.quanhao678.workers.dev/drive-size";

/* ===== Icon theo đuôi file (giống trang xem hub) ===== */
const EXT_ICON = {
  pdf:  { icon: "fa-solid fa-file-pdf",   bg: "#ef4444", label: "PDF" },
  doc:  { icon: "fa-solid fa-file-word",  bg: "#2563eb", label: "Word" },
  docx: { icon: "fa-solid fa-file-word",  bg: "#2563eb", label: "Word" },
  xls:  { icon: "fa-solid fa-file-excel", bg: "#16a34a", label: "Excel" },
  xlsx: { icon: "fa-solid fa-file-excel", bg: "#16a34a", label: "Excel" },
  ppt:  { icon: "fa-solid fa-file-powerpoint", bg: "#ea580c", label: "PowerPoint" },
  pptx: { icon: "fa-solid fa-file-powerpoint", bg: "#ea580c", label: "PowerPoint" },
  mp4:  { icon: "fa-solid fa-file-video", bg: "#7c3aed", label: "Video" },
  webm: { icon: "fa-solid fa-file-video", bg: "#7c3aed", label: "Video" },
  mov:  { icon: "fa-solid fa-file-video", bg: "#7c3aed", label: "Video" },
  mp3:  { icon: "fa-solid fa-file-audio", bg: "#0891b2", label: "Âm thanh" },
  wav:  { icon: "fa-solid fa-file-audio", bg: "#0891b2", label: "Âm thanh" },
  png:  { icon: "fa-solid fa-file-image", bg: "#d97706", label: "Ảnh" },
  jpg:  { icon: "fa-solid fa-file-image", bg: "#d97706", label: "Ảnh" },
  jpeg: { icon: "fa-solid fa-file-image", bg: "#d97706", label: "Ảnh" },
  gif:  { icon: "fa-solid fa-file-image", bg: "#d97706", label: "Ảnh" },
  webp: { icon: "fa-solid fa-file-image", bg: "#d97706", label: "Ảnh" },
  svg:  { icon: "fa-solid fa-file-image", bg: "#d97706", label: "Ảnh" },
  zip:  { icon: "fa-solid fa-file-zipper", bg: "#475569", label: "Nén ZIP" },
  rar:  { icon: "fa-solid fa-file-zipper", bg: "#475569", label: "Nén RAR" }
};

/* Dropdown chọn icon tay (loại không tự nhận được qua đuôi link — vd Google Drive). */
const ICON_OPTIONS = [
  { value: "pdf",  label: "PDF (đỏ)" },
  { value: "docx", label: "Word (xanh dương)" },
  { value: "xlsx", label: "Excel (xanh lá)" },
  { value: "pptx", label: "PowerPoint (cam)" },
  { value: "png",  label: "Ảnh / PNG" },
  { value: "mp4",  label: "Video / MP4" },
  { value: "mp3",  label: "Âm thanh / MP3" },
  { value: "zip",  label: "Thư mục nén / ZIP" }
];

const SOURCE_LABEL = { drive: "Google Drive", direct: "File trực tiếp", storage: "Kho lưu trữ" };

/* Môn gợi ý (datalist) — thứ tự & danh sách theo đúng subjects-data.js như Phòng Học. */
const FALLBACK_SUBJECTS = [
  "Hoá Học", "Lịch Sử", "Sinh Học", "Toán Học", "Vật Lý", "Tin Học", "Anh Văn", "Khác"
];

/* ===== Tiện ích ===== */
function extOf(url) {
  const u = String(url || "");
  let name = "";
  try { name = decodeURIComponent(u.split("?")[0].split("#")[0]); } catch (e) { name = u.split("?")[0]; }
  const m = name.match(/\.([a-zA-Z0-9]+)$/);
  return m ? m[1].toLowerCase() : "";
}

function styleFor(icon, url) {
  const key = String(icon || extOf(url) || "").toLowerCase();
  return EXT_ICON[key] || { icon: "fa-solid fa-file", bg: "#64748b", label: "File" };
}

function detectType(url) {
  const u = String(url || "").trim();
  if (!u) return "direct";
  if (/drive\.google\.com/i.test(u)) return "drive";
  if (/^\/\//.test(u)) return "storage";
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(u)) {
    try { if (new URL(u).origin === location.origin) return "direct"; } catch (e) { /* bỏ */ }
    return "storage";
  }
  return "direct"; // đường dẫn tương đối trong web/repo (../cauhoi/... , /...)
}

function driveIdOf(url) {
  const u = String(url || "");
  let m = u.match(/\/(?:file\/d|document\/d|spreadsheets\/d|presentation\/d)\/([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  m = u.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return m ? m[1] : "";
}

function fmtBytes(n) {
  const v = Number(n);
  if (!isFinite(v) || v <= 0) return "";
  if (v < 1024) return v + " B";
  if (v < 1024 * 1024) return (v / 1024).toFixed(1).replace(/\.0$/, "") + " KB";
  if (v < 1024 * 1024 * 1024) return (v / (1024 * 1024)).toFixed(1).replace(/\.0$/, "") + " MB";
  return (v / (1024 * 1024 * 1024)).toFixed(2) + " GB";
}

function formatDate(v) {
  if (!v) return "—";
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[3] + "/" + m[2] + "/" + m[1];
  return "—";
}

/* ===== Tự lấy dung lượng ===== */
async function fetchSize(url, type) {
  try {
    if (type === "drive") {
      const id = driveIdOf(url);
      if (!id || !DRIVE_SIZE_ENDPOINT) return { ok: false };
      const r = await fetch(DRIVE_SIZE_ENDPOINT + "?fileId=" + encodeURIComponent(id));
      if (!r.ok) return { ok: false };
      const j = await r.json();
      const label = fmtBytes(j && j.size);
      return label ? { ok: true, size: label } : { ok: false };
    }
    const abs = new URL(url, location.href).href;
    const r = await fetch(abs, { method: "HEAD" });
    if (!r.ok) return { ok: false };
    const cl = r.headers.get("content-length");
    const label = fmtBytes(cl);
    return label ? { ok: true, size: label } : { ok: false };
  } catch (e) {
    return { ok: false };
  }
}

/* ===== CSS (chỉ chèn 1 lần) ===== */
const CSS = [
  "",
  ".tml { --tml-blue:#2563eb; --tml-green:#0891b2; --tml-green-d:#0e7490; --tml-border:#e6e9f2; --tml-bg:#fff; --tml-sub:#64748b; --tml-text:#0f172a; --tml-soft:#f8fafc; min-width:0; }",
  ".tml,.tml *{box-sizing:border-box}",
  ".tml-layout{display:grid;grid-template-columns:minmax(0,4fr) minmax(0,6fr);gap:18px;align-items:start;max-width:1400px}",
  ".tml-layout>div{min-width:0;max-width:100%}",
  ".tml-card{position:relative;background:var(--tml-bg);border:1px solid var(--tml-border);border-radius:16px;box-shadow:0 10px 30px rgba(15,23,42,.05);overflow:hidden}",
  ".tml-card::before{content:\"\";position:absolute;top:0;left:16px;right:16px;height:5px;border-radius:0 0 8px 8px}",
  ".tml-card.tml-form-card::before{background:linear-gradient(90deg,var(--tml-blue),var(--tml-green))}",
  ".tml-card.tml-list-card::before{background:linear-gradient(90deg,var(--tml-green),var(--tml-blue))}",
  ".tml-form-card{overflow:visible}",
  ".tml-head{display:flex;align-items:center;gap:12px;padding:22px 22px 0;flex-wrap:nowrap}",
  ".tml-head-ico{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;font-size:16px;flex:none}",
  ".tml-form-card .tml-head-ico{background:linear-gradient(135deg,#ecfeff,#cffafe);color:var(--tml-green-d)}",
  ".tml-list-card .tml-head-ico{background:linear-gradient(135deg,#eff6ff,#dbeafe);color:var(--tml-blue)}",
  ".tml-head-txt{min-width:0;flex:1}",
  ".tml-head-txt h3{margin:0;font-size:16px;font-weight:800;color:var(--tml-text);letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
  ".tml-head-sub{display:block;color:var(--tml-sub);font-size:12.5px;font-weight:600;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
  ".tml-mode{margin-left:auto;font-size:12px;font-weight:700;color:var(--tml-sub);background:var(--tml-soft);border:1px solid var(--tml-border);border-radius:999px;padding:5px 12px;flex:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:40%}",
  ".tml-form{padding:22px}",
  ".tml-field{margin-bottom:14px}",
  ".tml-field label{display:block;font-size:12.5px;font-weight:600;color:#475569;margin-bottom:6px}",
  ".tml-field label b{color:#dc2626;font-weight:700}",
  ".tml input,.tml select,.tml textarea{width:100%;border:1px solid var(--tml-border);border-radius:12px;padding:11px 14px;font-size:14px;outline:none;background:var(--tml-soft);transition:all .15s ease;font-family:inherit;color:var(--tml-text)}",
  ".tml input:focus,.tml select:focus,.tml textarea:focus{border-color:var(--tml-blue);background:#fff;box-shadow:0 0 0 4px rgba(37,99,235,.1)}",
  ".tml textarea{resize:vertical;line-height:1.55}",
  ".tml-hint{font-size:12.5px;color:var(--tml-sub);line-height:1.5;margin-top:5px}",
  ".tml-combo{position:relative}",
  ".tml-combo input{padding-right:42px}",
  ".tml-combo-btn{position:absolute;right:6px;top:50%;transform:translateY(-50%);border:0;background:transparent;color:var(--tml-sub);cursor:pointer;width:30px;height:30px;border-radius:9px;display:grid;place-items:center;font-size:12px;transition:all .15s ease}",
  ".tml-combo-btn:hover{background:#eef2f7;color:var(--tml-blue)}",
  ".tml-combo-menu{position:absolute;top:calc(100% + 6px);left:0;right:0;background:#fff;border:1px solid var(--tml-border);border-radius:12px;box-shadow:0 12px 30px rgba(15,23,42,.14);z-index:40;max-height:230px;overflow:auto;padding:6px}",
  ".tml-combo-menu.hidden{display:none}",
  ".tml-combo-item{display:flex;align-items:center;gap:9px;padding:9px 11px;border-radius:10px;font-size:13.5px;font-weight:600;color:#334155;cursor:pointer;transition:background .12s ease}",
  ".tml-combo-item:hover{background:#f1f5f9}",
  ".tml-combo-item .fa-solid{width:16px;text-align:center;color:#94a3b8}",
  ".tml-combo-item:hover .fa-solid{color:var(--tml-green)}",
  ".tml-sc-dot{width:10px;height:10px;border-radius:50%;flex:none;box-shadow:inset 0 0 0 1px rgba(15,23,42,.08)}",
  ".tml-row2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}",
  ".tml-type-badge{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:4px 11px;font-size:11px;font-weight:800;font-family:inherit}",
  ".tml-type-badge.hidden{display:none}",
  ".tml-type-drive{background:#fffbeb;color:#b45309}",
  ".tml-type-direct{background:#ecfdf5;color:#059669}",
  ".tml-type-storage{background:#f5f3ff;color:#7c3aed}",
  ".tml-icon-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}",
  ".tml-icon-row select{flex:1;min-width:0}",
  ".tml-icon-preview{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;color:#fff;font-size:17px;flex:none;box-shadow:0 6px 14px rgba(15,23,42,.15)}",
  ".tml-size-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}",
  ".tml-size-row input{flex:1;min-width:0}",
  ".tml-size-status{font-size:12px;font-weight:700;color:var(--tml-sub);white-space:normal;word-break:break-word}",
  ".tml-size-status.ok{color:#059669}",
  ".tml-size-status.err{color:#b91c1c}",
  ".tml-actions{display:flex;align-items:center;justify-content:flex-end;gap:14px;flex-wrap:wrap;margin-top:16px;padding-top:14px;border-top:1px dashed var(--tml-border)}",
  ".tml-btn{display:inline-flex;align-items:center;gap:8px;border:0;border-radius:12px;padding:11px 20px;font-weight:700;font-size:14px;cursor:pointer;font-family:inherit;transition:all .2s ease}",
  ".tml-btn:hover{transform:translateY(-2px)}",
  ".tml-btn-save{background:linear-gradient(135deg,var(--tml-green),var(--tml-green-d));color:#fff;box-shadow:0 6px 16px rgba(8,145,178,.3)}",
  ".tml-btn-save:hover{box-shadow:0 10px 22px rgba(8,145,178,.38)}",
  ".tml-btn-save:disabled{opacity:.55;cursor:not-allowed;transform:none}",
  ".tml-btn-cancel{background:#f1f5f9;color:#334155}",
  ".tml-btn-cancel:hover{background:#e2e8f0}",
  ".tml-btn-cancel.hidden{display:none}",
  ".tml-status{font-size:13px;font-weight:700;color:var(--tml-sub)}",
  ".tml-status.error{color:#b91c1c}",
  ".tml-status.success{color:#059669}",
  ".tml-list{padding:22px}",
  ".tml-list-head{display:flex;align-items:center;gap:12px;margin-bottom:18px;flex-wrap:nowrap}",
  ".tml-list-head-txt{min-width:0;flex:1}",
  ".tml-list-head-txt h3{margin:0;font-size:16px;font-weight:800;color:var(--tml-text);letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
  ".tml-count{font-size:11px;font-weight:700;color:var(--tml-green);background:#ecfeff;border-radius:999px;padding:3px 10px;flex:none;white-space:nowrap}",
  ".tml-empty{background:var(--tml-soft);border:1px dashed #dbe3f0;border-radius:12px;padding:30px 16px;text-align:center;color:#94a3b8;font-size:13px;line-height:1.6}",
  ".tml-empty i{display:block;font-size:24px;margin-bottom:8px;color:#c7d2e8}",
  ".tml-row{display:flex;align-items:flex-start;gap:12px;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;margin-bottom:10px;background:#fff;transition:all .15s ease;min-width:0;flex-wrap:wrap}",
  ".tml-row:hover{box-shadow:0 8px 20px rgba(15,23,42,.08)}",
  ".tml-row-ico{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;color:#fff;font-size:17px;flex:none;box-shadow:0 6px 14px rgba(15,23,42,.15)}",
  ".tml-row-main{min-width:0;flex:1;max-width:100%}",
  ".tml-row-name{font-weight:800;font-size:14px;color:var(--tml-text);word-break:break-word;overflow-wrap:anywhere}",
  ".tml-row-desc{font-size:12px;color:var(--tml-sub);margin-top:3px;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word;overflow-wrap:anywhere}",
  ".tml-row-chips{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:8px}",
  ".tml-chip{font-size:11px;font-weight:700;border-radius:999px;padding:3px 10px;line-height:1.4;max-width:100%;overflow-wrap:anywhere}",
  ".tml-chip-cat{background:#eff6ff;color:#1d4ed8}",
  ".tml-chip-type{background:var(--tml-soft);border:1px solid var(--tml-border);color:#475569}",
  ".tml-chip-meta{color:var(--tml-sub);font-weight:600}",
  ".tml-row-actions{display:flex;gap:7px;flex:none;flex-wrap:wrap}",
  ".tml-rbtn{border:0;border-radius:10px;padding:8px 13px;font-weight:700;font-size:12.5px;cursor:pointer;font-family:inherit;transition:all .15s}",
  ".tml-rbtn:hover{transform:translateY(-1px)}",
  ".tml-rbtn-edit{background:#cffafe;color:#0e7490}",
  ".tml-rbtn-edit:hover{background:#a7f3d0}",
  ".tml-rbtn-del{background:#fee2e2;color:#dc2626}",
  ".tml-rbtn-del:hover{background:#fecaca}",
  ".tml-pager{display:flex;align-items:center;justify-content:center;gap:6px;padding:14px 22px 22px;flex-wrap:wrap}",
  ".tml-pager:empty{display:none}",
  ".tml-pager button{min-width:30px;height:30px;border-radius:9px;border:1px solid var(--tml-border);background:var(--tml-soft);color:#475569;font-size:12.5px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .15s}",
  ".tml-pager button:hover{background:#eef2f7}",
  ".tml-pager button:disabled{opacity:.4;cursor:not-allowed}",
  ".tml-pager button.pg-active{background:var(--tml-blue);color:#fff;border-color:var(--tml-blue)}",
  ".tml-pager .pg-info{font-size:12px;font-weight:600;color:var(--tml-sub);margin-left:6px}",
  "@media (max-width:1080px){.tml-layout{grid-template-columns:1fr}}",
  "@media (max-width:560px){.tml-row2,.tml-layout{grid-template-columns:1fr}}",
  ""
].join("\n");

let cssInjected = false;
function ensureCss() {
  if (cssInjected || document.getElementById("tml-manage-css")) {
    cssInjected = true;
    return;
  }
  const st = document.createElement("style");
  st.id = "tml-manage-css";
  st.textContent = CSS;
  (document.head || document.documentElement).appendChild(st);
  cssInjected = true;
}

function subjectSuggestions() {
  const out = [];
  (window.LH_SUBJECTS || []).forEach(s => { const n = s && s.name; if (n && out.indexOf(n) === -1) out.push(n); });
  return out.length ? out : [].concat(FALLBACK_SUBJECTS);
}

/* Màu môn — đọc thẳng từ LH_SUBJECTS (subjects-data.js), khớp name/short/alias. */
function subjectColor(name) {
  if (!name) return "";
  const list = window.LH_SUBJECTS || [];
  name = String(name).trim();
  for (let i = 0; i < list.length; i++) {
    const s = list[i];
    if (s.name === name || s.short === name) return s.color;
    if (s.alias && s.alias.indexOf(name) !== -1) return s.color;
  }
  return "";
}

/* ===== MẶC ĐỊNH: mount component ===== */
let instanceSeq = 0;

export function mountTaiLieuManage(root, opts = {}) {
  if (!root || root.dataset.tmlMounted) return;
  root.dataset.tmlMounted = "1";
  const sb = opts.supabase || defaultSupabase;
  const esc = opts.escapeHtml || defaultEscapeHtml;
  const log = opts.logAppError || defaultLogAppError;

  ensureCss();
  const uid = "tml" + (++instanceSeq);
  const subjects = subjectSuggestions();

  let editId = null;
  let sizeManual = false;
  let listPage = 1;
  const PAGE_SIZE = 6;

  root.innerHTML =
    '<div class="tml">' +
      '<div class="tml-layout">' +
        /* ===== FORM ===== */
        '<div class="tml-card tml-form-card">' +
          '<div class="tml-head"><span class="tml-head-ico"><i class="fa-solid fa-file-circle-plus"></i></span><div class="tml-head-txt"><h3>Thêm / sửa tài liệu</h3><span class="tml-head-sub">Dán link, tự nhận nguồn, icon & dung lượng</span></div><span class="tml-mode" id="' + uid + '-mode">Tài liệu mới</span></div>' +
          '<div class="tml-form">' +
            '<div class="tml-field"><label>Tên tài liệu <b>*</b></label><input type="text" class="tml-name" placeholder="vd: Giới hạn hàm số - Nhập môn buổi 1" autocomplete="off"></div>' +
            '<div class="tml-field"><label>Nhóm / môn học <b>*</b></label>' +
            '<div class="tml-combo">' +
              '<input type="text" class="tml-category" placeholder="vd: Toán Học" autocomplete="off">' +
              '<button type="button" class="tml-combo-btn" title="Chọn từ danh sách"><i class="fa-solid fa-chevron-down"></i></button>' +
              '<div class="tml-combo-menu hidden">' + subjects.map(s => {
                const c = subjectColor(s);
                const dot = '<span class="tml-sc-dot" style="background:' + (c || "#cbd5e1") + '"></span>';
                return '<div class="tml-combo-item" data-v="' + esc(s) + '"' + (c ? ' data-c="' + c + '"' : '') + '>' + dot + esc(s) + '</div>';
              }).join("") + '</div>' +
            '</div>' +
            '<span class="tml-hint">Bấm nút bên phải để chọn nhanh, hoặc gõ nhóm/môn tùy chỉnh.</span></div>' +
            '<div class="tml-field"><label>Link tài liệu <b>*</b></label><input type="text" class="tml-url" placeholder="Dán link Google Drive hoặc file (../cauhoi/..., https://...)" autocomplete="off"><span class="tml-hint"><i class="fa-solid fa-wand-magic-sparkles" style="color:#8b5cf6"></i> Tự nhận biết nguồn & icon theo link — kéo xuống, dán link từ Drive hoặc file trong web.</span></div>' +
            '<div class="tml-field"><span class="tml-type-badge hidden">—</span></div>' +
            '<div class="tml-row2">' +
              '<div class="tml-field"><label>Icon đại diện</label><div class="tml-icon-row"><span class="tml-icon-preview"><i class="fa-solid fa-file"></i></span><select class="tml-icon"><option value="">— Tự chọn theo link —</option>' + ICON_OPTIONS.map(o => '<option value="' + o.value + '">' + esc(o.label) + '</option>').join("") + '</select></div><span class="tml-hint">Link không có đuôi rõ ràng (vd Google Drive) thì chọn icon ở đây.</span></div>' +
              '<div class="tml-field"><label>Kích thước (tùy chọn)</label><div class="tml-size-row"><input type="text" class="tml-size" placeholder="vd: 3.0 MB" autocomplete="off"><span class="tml-size-status"></span></div><span class="tml-hint">Tự lấy tự động theo link; không lấy được thì gõ tay.</span></div>' +
            '</div>' +
            '<div class="tml-field"><label>Mô tả</label><textarea class="tml-desc" rows="3" placeholder="Tóm tắt nội dung tài liệu (hiện trên thẻ & khung chi tiết)"></textarea></div>' +
            '<div class="tml-actions">' +
              '<button type="button" class="tml-btn tml-btn-save"><i class="fa-solid fa-floppy-disk"></i> Lưu tài liệu</button>' +
              '<button type="button" class="tml-btn tml-btn-cancel hidden"><i class="fa-solid fa-xmark"></i> Hủy sửa</button>' +
              '<span class="tml-status"></span>' +
            '</div>' +
          '</div>' +
        '</div>' +
        /* ===== DANH SÁCH ===== */
        '<div class="tml-card tml-list-card"><div class="tml-list">' +
          '<div class="tml-list-head"><span class="tml-head-ico"><i class="fa-solid fa-folder-open"></i></span><div class="tml-list-head-txt"><h3>Tài liệu hiện có</h3><span class="tml-head-sub">Tác giả & ngày đăng tự động</span></div><span class="tml-count" id="' + uid + '-count">0</span></div>' +
          '<div class="tml-list-body"></div>' +
          '<div class="tml-pager"></div>' +
        '</div></div>' +
      '</div>' +
    '</div>';

  const q = (sel) => root.querySelector(sel);
  const formCard = q(".tml-form-card");
  const nameEl = q(".tml-name");
  const catEl = q(".tml-category");
  const urlEl = q(".tml-url");
  const typeBadge = q(".tml-type-badge");
  const iconSel = q(".tml-icon");
  const iconPrev = q(".tml-icon-preview");
  const sizeEl = q(".tml-size");
  const sizeStatus = q(".tml-size-status");
  const descEl = q(".tml-desc");
  const saveBtn = q(".tml-btn-save");
  const cancelBtn = q(".tml-btn-cancel");
  const statusEl = q(".tml-status");
  const listBody = q(".tml-list-body");
  const pagerEl = q(".tml-pager");
  const countEl = root.querySelector("#" + uid + "-count");
  const modeEl = root.querySelector("#" + uid + "-mode");

  function toast(msg, type) {
    if (typeof window.lhToast === "function") {
      window.lhToast(msg, { type: type || "info" });
      return;
    }
    statusEl.textContent = msg;
    statusEl.className = "tml-status " + (type === "error" ? "error" : type === "success" ? "success" : "");
  }
  function renderIconPreview(iconKey, url) {
    const st = styleFor(iconKey, url);
    iconPrev.style.background = st.bg;
    iconPrev.innerHTML = '<i class="' + st.icon + '"></i>';
  }
  function renderSizeStatus(text, cls) {
    sizeStatus.textContent = text || "";
    sizeStatus.className = "tml-size-status" + (cls ? " " + cls : "");
  }
  function typeLabel(k) {
    return SOURCE_LABEL[k] || "Khác";
  }

  function reflectUrl(value) {
    const u = String(value || "").trim();
    const t = detectType(u);
    typeBadge.className = "tml-type-badge hidden";
    if (u) {
      typeBadge.classList.remove("hidden");
      typeBadge.classList.remove("tml-type-drive", "tml-type-direct", "tml-type-storage");
      typeBadge.classList.add("tml-type-" + t);
      typeBadge.innerHTML = '<i class="fa-solid ' + (t === "drive" ? "fa-google-drive" : t === "direct" ? "fa-file" : "fa-cloud") + '"></i> ' + typeLabel(t);
    }
    /* icon: đuôi link thấy được → tự chọn; không → hiện icon mặc định, để user chọn */
    const ext = extOf(u);
    if (ext) {
      renderIconPreview("", u);
    } else {
      renderIconPreview(iconSel.value || "", u);
    }
    /* size: tự lấy khi đổi link (trừ khi user đang sửa tay) */
    if (!sizeManual && u) {
      renderSizeStatus("", "");
      sizeEl.value = "";
      fetchSize(u, t).then(res => {
        if (res && res.ok) {
          sizeEl.value = res.size;
          renderSizeStatus("Đã lấy", "ok");
        } else {
          renderSizeStatus("Không lấy được — gõ tay", "err");
        }
      });
    }
  }

  let urlTimer = null;
  urlEl.addEventListener("input", () => {
    clearTimeout(urlTimer);
    urlTimer = setTimeout(() => reflectUrl(urlEl.value), 300);
  });
  iconSel.addEventListener("change", () => {
    renderIconPreview(iconSel.value, urlEl.value);
    if (iconSel.value) modeEl.textContent = "Sửa";
  });
  sizeEl.addEventListener("input", () => { sizeManual = true; renderSizeStatus("", ""); });
  sizeEl.addEventListener("focus", () => { sizeManual = true; });

  /* dropdown chọn môn (custom — thay cho datalist hệ thống không style được) */
  const comboBtn = q(".tml-combo-btn");
  const comboMenu = q(".tml-combo-menu");
  comboBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = !comboMenu.classList.contains("hidden");
    closeAllCombos();
    if (!open) comboMenu.classList.remove("hidden");
  });
  comboMenu.querySelectorAll(".tml-combo-item").forEach(it => {
    it.addEventListener("click", () => {
      catEl.value = it.getAttribute("data-v") || it.textContent.trim();
      comboMenu.classList.add("hidden");
      const c = it.getAttribute("data-c") || subjectColor(catEl.value);
      if (c) {
        catEl.style.borderColor = c;
        catEl.style.background = "color-mix(in srgb, " + c + " 6%, var(--tml-soft))";
      } else {
        catEl.style.borderColor = "";
        catEl.style.background = "";
      }
      catEl.focus();
    });
  });
  catEl.addEventListener("input", () => {
    const c = subjectColor(catEl.value);
    catEl.style.borderColor = c ? c : "";
    catEl.style.background = c ? "color-mix(in srgb, " + c + " 6%, var(--tml-soft))" : "";
  });
  if (!window.__tmlComboCloseBound) {
    window.__tmlComboCloseBound = true;
    document.addEventListener("click", closeAllCombos);
  }

  function closeAllCombos() {
    document.querySelectorAll(".tml-combo-menu").forEach(m => m.classList.add("hidden"));
  }

  function resetForm() {
    editId = null;
    nameEl.value = "";
    catEl.value = "";
    catEl.style.borderColor = "";
    catEl.style.background = "";
    urlEl.value = "";
    sizeEl.value = "";
    descEl.value = "";
    iconSel.value = "";
    sizeManual = false;
    renderIconPreview("", "");
    renderSizeStatus("", "");
    reflectUrl("");
    typeBadge.classList.add("hidden");
    modeEl.textContent = "Tài liệu mới";
    cancelBtn.classList.add("hidden");
    formCard.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function fillForm(doc) {
    editId = doc.id || null;
    nameEl.value = doc.name || "";
    catEl.value = doc.category || "";
    const c0 = subjectColor(catEl.value);
    catEl.style.borderColor = c0 ? c0 : "";
    catEl.style.background = c0 ? "color-mix(in srgb, " + c0 + " 6%, var(--tml-soft))" : "";
    urlEl.value = doc.url || "";
    iconSel.value = doc.icon || "";
    sizeEl.value = doc.size || "";
    descEl.value = doc.description || "";
    sizeManual = false;
    modeEl.textContent = "Sửa · " + (doc.name || "").slice(0, 30);
    cancelBtn.classList.remove("hidden");
    renderIconPreview(doc.icon || "", doc.url || "");
    reflectUrl(doc.url || "");
    formCard.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  cancelBtn.addEventListener("click", () => { resetForm(); });

  /* ===== LƯU ===== */
  saveBtn.addEventListener("click", async () => {
    const name = nameEl.value.trim();
    const category = catEl.value.trim();
    const url = urlEl.value.trim();
    const typeT = detectType(url);
    const icon = iconSel.value || "";
    const size = sizeEl.value.trim();
    const desc = descEl.value.trim();

    if (!name) { toast("Thiếu tên tài liệu", "error"); nameEl.focus(); return; }
    if (!category) { toast("Thiếu nhóm / môn học", "error"); catEl.focus(); return; }
    if (!url) { toast("Thiếu link tài liệu", "error"); urlEl.focus(); return; }

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Đang lưu...';
    try {
      const { data, error } = await sb.rpc("teacher_upsert_tailieu_doc", {
        p_id: editId,
        p_name: name,
        p_description: desc,
        p_category: category,
        p_type: typeT,
        p_url: url,
        p_icon: icon,
        p_size: size
      });
      if (error) throw error;
      if (data && data.ok === true) {
        toast(editId ? "Đã cập nhật tài liệu" : "Đã thêm tài liệu", "success");
        listPage = 1;
        resetForm();
        await loadList();
        return;
      }
      if (data && data.error) {
        const map = {
          empty_name: "Thiếu tên tài liệu",
          empty_category: "Thiếu nhóm / môn học",
          empty_url: "Thiếu link tài liệu",
          forbidden: "Bạn không có quyền làm việc này"
        };
        toast(map[data.error] || "Không lưu được: " + data.error, "error");
      } else {
        toast("Không lưu được tài liệu", "error");
      }
    } catch (err) {
      console.error("[taileu-manage] upsert lỗi:", err);
      toast("Không lưu được: " + ((err && (err.message || err.error_description)) || err), "error");
      log({ source: "taileu-manage", category: "feature", level: "error", code: "TL_UPSERT_FAIL", message: String((err && (err.message || err.error_description)) || err), url: location.href });
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Lưu tài liệu';
    }
  });

  /* ===== DANH SÁCH ===== */
  async function loadList() {
    listBody.innerHTML = '<div class="tml-empty"><i class="fa-solid fa-spinner fa-spin"></i>Đang tải danh sách tài liệu...</div>';
    try {
      const { data, error } = await sb.rpc("list_tailieu_docs");
      if (error) throw error;
      renderList(data || []);
    } catch (err) {
      console.error("[taileu-manage] list lỗi:", err);
      listBody.innerHTML = '<div class="tml-empty"><i class="fa-solid fa-triangle-exclamation" style="color:#f59e0b"></i>Không tải được danh sách tài liệu</div>';
      log({ source: "taileu-manage", category: "feature", level: "error", code: "TL_LIST_FAIL", message: String((err && (err.message || err.error_description)) || err), url: location.href });
    }
  }

  function renderList(list) {
    countEl.textContent = list.length;
    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    if (listPage < 1) listPage = 1;
    if (listPage > totalPages) listPage = totalPages;
    if (!list.length) {
      listBody.innerHTML = '<div class="tml-empty"><i class="fa-solid fa-folder-open"></i>Chưa có tài liệu nào.<br>Thêm tài liệu đầu tiên ở form bên trái.</div>';
      pagerEl.innerHTML = "";
      return;
    }
    function catChip(cat) {
      const c = subjectColor(cat || "Chung");
      if (c) return '<span class="tml-chip" style="background:' + c + '1c;color:' + c + '">' + esc(cat || "Chung") + '</span>';
      return '<span class="tml-chip tml-chip-cat">' + esc(cat || "Chung") + '</span>';
    }
    const pageList = list.slice((listPage - 1) * PAGE_SIZE, listPage * PAGE_SIZE);
    listBody.innerHTML = pageList.map(doc => {
      const st = styleFor(doc.icon || "", doc.url || "");
      return '<div class="tml-row" data-id="' + esc(doc.id) + '">' +
        '<div class="tml-row-ico" style="background:' + st.bg + '"><i class="' + st.icon + '"></i></div>' +
        '<div class="tml-row-main">' +
          '<div class="tml-row-name">' + esc(doc.name) + '</div>' +
          (doc.description ? '<div class="tml-row-desc">' + esc(doc.description) + '</div>' : '') +
          '<div class="tml-row-chips">' +
            catChip(doc.category) +
            '<span class="tml-chip tml-chip-type">' + typeLabel(doc.type) + '</span>' +
            '<span class="tml-chip tml-chip-meta">' + esc(doc.size || "—") + '</span>' +
            '<span class="tml-chip tml-chip-meta">' + formatDate(doc.date) + '</span>' +
            '<span class="tml-chip tml-chip-meta">Bởi: ' + esc(doc.author || "—") + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="tml-row-actions">' +
          '<button type="button" class="tml-rbtn tml-rbtn-edit" data-edit="' + esc(doc.id) + '"><i class="fa-solid fa-pen"></i> Sửa</button>' +
          '<button type="button" class="tml-rbtn tml-rbtn-del" data-del="' + esc(doc.id) + '"><i class="fa-solid fa-trash-can"></i> Xóa</button>' +
        '</div>' +
      '</div>';
    }).join("");

    listBody.querySelectorAll("[data-edit]").forEach(btn => {
      btn.addEventListener("click", () => {
        const doc = list.find(d => String(d.id) === String(btn.getAttribute("data-edit")));
        if (doc) fillForm(doc);
      });
    });
    listBody.querySelectorAll("[data-del]").forEach(btn => {
      btn.addEventListener("click", () => removeDoc(btn.getAttribute("data-del")));
    });
    renderPager(totalPages, list);
  }

  function renderPager(totalPages, list) {
    if (totalPages <= 1) { pagerEl.innerHTML = ""; return; }
    const pageBtn = p => '<button type="button" data-pg="' + p + '"' + (p === listPage ? ' class="pg-active"' : "") + '>' + p + '</button>';
    const navBtn = (icon, p, disabled) => '<button type="button" data-pg="' + p + '"' + (disabled ? ' disabled' : "") + '>' + icon + '</button>';
    let h = "";
    h += navBtn('<i class="fa-solid fa-chevron-left"></i>', listPage - 1, listPage === 1);
    const start = Math.max(1, listPage - 2);
    const end = Math.min(totalPages, listPage + 2);
    if (start > 1) h += pageBtn(1);
    if (start > 2) h += '<span class="pg-info">…</span>';
    for (let p = start; p <= end; p++) h += pageBtn(p);
    if (end < totalPages - 1) h += '<span class="pg-info">…</span>';
    if (end < totalPages) h += pageBtn(totalPages);
    h += navBtn('<i class="fa-solid fa-chevron-right"></i>', listPage + 1, listPage === totalPages);
    h += '<span class="pg-info">' + ((listPage - 1) * PAGE_SIZE + 1) + "–" + Math.min(listPage * PAGE_SIZE, list.length) + " / " + list.length + "</span>";
    pagerEl.innerHTML = h;
    pagerEl.querySelectorAll("[data-pg]").forEach(b => {
      b.addEventListener("click", () => {
        listPage = Math.max(1, Math.min(Number(b.getAttribute("data-pg")), totalPages));
        renderList(list);
      });
    });
  }

  async function removeDoc(id) {
    const ok = window.confirm("Xóa tài liệu này khỏi thư viện?");
    if (!ok) return;
    try {
      const { data, error } = await sb.rpc("teacher_delete_tailieu_doc", { p_id: id });
      if (error) throw error;
      if (data && data.ok === true) {
        toast("Đã xóa tài liệu", "success");
        if (editId === id) resetForm();
        await loadList();
      } else {
        toast("Không xóa được tài liệu", "error");
      }
    } catch (err) {
      console.error("[taileu-manage] delete lỗi:", err);
      toast("Không xóa được: " + ((err && (err.message || err.error_description)) || err), "error");
      log({ source: "taileu-manage", category: "feature", level: "error", code: "TL_DELETE_FAIL", message: String((err && (err.message || err.error_description)) || err), url: location.href });
    }
  }

  renderIconPreview("", "");
  reflectUrl("");
  loadList();
}

/* Giá trị mô tả giúp front-end khác (nếu cần) biết danh sách icon có sẵn. */
export const tailieuManageUtils = { ICON_OPTIONS, EXT_ICON, detectType, extOf };