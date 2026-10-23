/* ============================================================================
   blog-manage.js — QUẢN LÝ BLOG (blog_posts)
   ----------------------------------------------------------------------------
   Component dùng cho admin dashboard (tab "Blog"):
     import { mountBlogManage } from "./element/blog-manage.js"
     mountBlogManage(rootEl, { supabase, escapeHtml, logAppError })

   Giao diện kiểu BLOG (khác hẳn trình quản lý tài liệu):
     • Nút "Viết bài mới" + ô tìm kiếm trên thanh công cụ.
     • Danh sách bài viết dạng LƯỚI THẺ (cover, danh mục, trạng thái, meta).
     • Trình soạn bài mở ra trong một OVERLAY lớn (rich text) — không còn
       bố cục 2 cột form-trái / danh sách-phải giống thư viện tài liệu.

   Tính năng:
     - Soạn bài kiểu bài báo: tiêu đề, danh mục, thẻ, tóm tắt, ảnh bìa (URL).
     - Người đăng = user đang đăng nhập (đọc tên từ bảng public.users),
       lưu kèm author_id — không còn nhập tay tên tác giả.
     - Rich text (đậm/nghiêng/gạch chân, tiêu đề, danh sách, trích dẫn, link,
       ảnh, căn lề, hoàn tác) — lưu dạng HTML.
     - Xuất bản / ẩn nháp, ghim lên đầu.
     - Tìm kiếm, sửa, xoá, phân trang.
   ============================================================================ */

import {
  supabase as defaultSupabase,
  escapeHtml as defaultEscapeHtml,
  logAppError as defaultLogAppError,
  escapeUrl as defaultEscapeUrl
} from "../supabase-config.js";

const CATEGORY_SUGGESTIONS = [
  "Tin tức", "Học tập", "Kinh nghiệm", "Sự kiện", "Thông báo",
  "Kiến thức", "Công nghệ", "Tuyển sinh", "Khác"
];

/* ===== Tiện ích ===== */
function formatDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function readingMinutes(html) {
  const text = String(html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const words = text ? text.split(" ").length : 0;
  return Math.max(1, Math.round(words / 200));
}

function safeUrl(u, escapeUrl) {
  const s = String(u || "").trim();
  if (!s) return "";
  return escapeUrl(s) || "";
}

/* Link chia sẻ Google Drive -> link ảnh trực tiếp (lh3) để thẻ <img> hiển thị được. */
function normalizeImageUrl(u) {
  const s = String(u || "").trim();
  if (!s) return "";
  let m = s.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]{10,})/);
  if (!m) m = s.match(/drive\.google\.com\/(?:open|uc)\?(?:[^#]*&)?id=([A-Za-z0-9_-]{10,})/);
  if (!m) m = s.match(/drive\.google\.com\/thumbnail\?id=([A-Za-z0-9_-]{10,})/);
  return m ? "https://lh3.googleusercontent.com/d/" + m[1] : s;
}

function stripTags(html) {
  return String(html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/* ===== CSS (chỉ chèn 1 lần) ===== */
const CSS = `
.blm,.blm-overlay{--blm-pink:#db2777; --blm-violet:#7c3aed; --blm-border:#e6e9f2; --blm-soft:#f8fafc; --blm-sub:#64748b; --blm-text:#0f172a}
.blm{min-width:0}
.blm,.blm *,.blm-overlay,.blm-overlay *{box-sizing:border-box}

/* ===== Toolbar ===== */
.blm-bar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:16px}
.blm-bar-info{display:flex;align-items:center;gap:10px;min-width:0}
.blm-bar-title{margin:0;font-size:15px;font-weight:800;color:var(--blm-text)}
.blm-count{font-size:11px;font-weight:800;color:#6d28d9;background:#f5f3ff;border-radius:999px;padding:3px 10px;flex:none}
.blm-search{position:relative;flex:1 1 240px;min-width:180px}
.blm-search i{position:absolute;left:13px;top:50%;transform:translateY(-50%);color:#94a3b8;pointer-events:none;font-size:13px}
.blm-input{width:100%;border:1px solid var(--blm-border);border-radius:12px;padding:11px 14px 11px 36px;font-size:14px;outline:none;background:#fff;transition:all .15s ease;font-family:inherit;color:var(--blm-text)}
.blm-input:focus{border-color:var(--blm-pink);box-shadow:0 0 0 4px rgba(219,39,119,.1)}
.blm-btn{display:inline-flex;align-items:center;gap:8px;border:0;border-radius:12px;padding:11px 20px;font-weight:700;font-size:14px;cursor:pointer;font-family:inherit;transition:transform .15s ease,box-shadow .15s ease,filter .15s ease;white-space:nowrap}
.blm-btn:hover{transform:translateY(-2px)}
.blm-btn-new{background:linear-gradient(135deg,var(--blm-pink),var(--blm-violet));color:#fff;box-shadow:0 6px 16px rgba(219,39,119,.3);flex:none}

/* ===== Lưới thẻ bài viết ===== */
.blm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(268px,1fr));gap:18px}
.blm-post{display:flex;flex-direction:column;background:#fff;border:1px solid var(--blm-border);border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(15,23,42,.06);transition:transform .16s ease,box-shadow .16s ease;animation:blmIn .3s ease both}
.blm-post:hover{transform:translateY(-4px);box-shadow:0 18px 40px rgba(15,23,42,.14)}
@keyframes blmIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.blm-post-cover{position:relative;aspect-ratio:16/9;background:linear-gradient(135deg,#fce7f3,#ede9fe);overflow:hidden}
.blm-post-cover img{width:100%;height:100%;object-fit:cover;display:block}
.blm-post-cover .noimg{position:absolute;inset:0;display:grid;place-items:center;color:#c98bb0;font-size:30px}
.blm-post-badges{position:absolute;top:10px;left:10px;display:flex;gap:5px;flex-wrap:wrap}
.blm-chip{font-size:10.5px;font-weight:800;border-radius:999px;padding:4px 9px;line-height:1.3;backdrop-filter:blur(4px)}
.blm-chip-draft{background:rgba(254,243,199,.95);color:#b45309}
.blm-chip-live{background:rgba(220,252,231,.95);color:#166534}
.blm-chip-pin{background:rgba(237,233,254,.95);color:#6d28d9}
.blm-post-body{padding:14px 16px 6px;display:flex;flex-direction:column;gap:8px;flex:1;min-width:0}
.blm-post-cat{align-self:flex-start;font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:var(--blm-violet);background:#f5f3ff;border-radius:999px;padding:3px 9px}
.blm-post-title{margin:0;font-size:15px;font-weight:800;line-height:1.4;color:var(--blm-text);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.blm-post-excerpt{margin:0;font-size:12.5px;line-height:1.55;color:var(--blm-sub);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.blm-post-meta{margin-top:auto;display:flex;align-items:center;gap:12px;flex-wrap:wrap;color:#94a3b8;font-size:11.5px;font-weight:700;padding-top:8px}
.blm-post-meta i{color:var(--blm-pink)}
.blm-post-actions{display:flex;border-top:1px solid var(--blm-border);margin-top:10px}
.blm-post-actions button{flex:1;border:0;background:transparent;padding:11px;font-weight:800;font-size:12.5px;cursor:pointer;font-family:inherit;transition:background .15s ease;display:inline-flex;align-items:center;justify-content:center;gap:7px}
.blm-rbtn-edit{color:#9d174d}.blm-rbtn-edit:hover{background:#fce7f3}
.blm-rbtn-del{color:#dc2626;border-left:1px solid var(--blm-border)!important}.blm-rbtn-del:hover{background:#fee2e2}

/* ===== Rỗng / phân trang ===== */
.blm-empty{grid-column:1/-1;background:var(--blm-soft);border:1px dashed #dbe3f0;border-radius:16px;padding:52px 20px;text-align:center;color:#94a3b8;font-size:13.5px;line-height:1.6}
.blm-empty i{display:block;font-size:30px;margin-bottom:10px;color:#c7d2e8}
.blm-pager{display:flex;align-items:center;justify-content:center;gap:6px;padding-top:20px;flex-wrap:wrap}
.blm-pager:empty{display:none}
.blm-pager button{min-width:32px;height:32px;border-radius:9px;border:1px solid var(--blm-border);background:#fff;color:#475569;font-size:12.5px;font-weight:700;cursor:pointer;font-family:inherit}
.blm-pager button.pg-active{background:var(--blm-pink);color:#fff;border-color:var(--blm-pink)}
.blm-pager button:disabled{opacity:.4;cursor:not-allowed}

/* ===== OVERLAY soạn bài ===== */
.blm-overlay{position:fixed;inset:0;z-index:2147483200;display:none;align-items:flex-start;justify-content:center;padding:22px 16px;background:rgba(15,23,42,.55);backdrop-filter:blur(5px);overflow:auto}
.blm-overlay.show{display:flex;animation:blmFade .18s ease both}
@keyframes blmFade{from{opacity:0}to{opacity:1}}
.blm-modal{position:relative;width:100%;max-width:940px;background:#fff;border-radius:20px;box-shadow:0 30px 80px rgba(15,23,42,.4);overflow:hidden;margin:auto;animation:blmRise .22s cubic-bezier(.22,1,.36,1) both}
@keyframes blmRise{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
.blm-modal-head{display:flex;align-items:center;gap:13px;padding:20px 22px;border-bottom:1px solid var(--blm-border);background:linear-gradient(135deg,rgba(252,231,243,.55),rgba(237,233,254,.55))}
.blm-head-ico{width:42px;height:42px;border-radius:13px;display:grid;place-items:center;font-size:17px;flex:none;background:linear-gradient(135deg,#fce7f3,#fbcfe8);color:#9d174d}
.blm-head-txt{min-width:0;flex:1}
.blm-head-txt h3{margin:0;font-size:16.5px;font-weight:800;color:var(--blm-text)}
.blm-mode{display:block;color:var(--blm-sub);font-size:12.5px;font-weight:600;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.blm-x{width:38px;height:38px;border-radius:50%;border:1px solid var(--blm-border);background:#fff;color:#475569;font-size:17px;cursor:pointer;display:grid;place-items:center;flex:none;transition:all .15s ease}
.blm-x:hover{background:#fee2e2;border-color:#f87171;color:#b91c1c}
.blm-modal-body{padding:22px}
.blm-field{margin-bottom:14px}
.blm-field label{display:block;font-size:12.5px;font-weight:600;color:#475569;margin-bottom:6px}
.blm-field label b{color:#dc2626}
.blm input[type=text],.blm textarea,.blm-overlay input[type=text],.blm-overlay textarea{width:100%;border:1px solid var(--blm-border);border-radius:12px;padding:11px 14px;font-size:14px;outline:none;background:var(--blm-soft);transition:all .15s ease;font-family:inherit;color:var(--blm-text)}
.blm input[type=text]:focus,.blm textarea:focus,.blm-overlay input[type=text]:focus,.blm-overlay textarea:focus{border-color:var(--blm-pink);background:#fff;box-shadow:0 0 0 4px rgba(219,39,119,.1)}
.blm textarea,.blm-overlay textarea{resize:vertical;line-height:1.55}
.blm-row2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.blm-hint{font-size:12.5px;color:var(--blm-sub);line-height:1.5;margin-top:5px}
.blm-cover-preview{margin-top:8px;border-radius:12px;overflow:hidden;border:1px solid var(--blm-border);background:var(--blm-soft);display:none}
.blm-cover-preview.show{display:block}
.blm-cover-preview img{display:block;width:100%;max-height:200px;object-fit:cover}
.blm-editor-wrap{border:1px solid var(--blm-border);border-radius:12px;overflow:hidden;background:#fff}
.blm-editor-wrap.focus{border-color:var(--blm-pink);box-shadow:0 0 0 4px rgba(219,39,119,.1)}
.blm-toolbar{display:flex;flex-wrap:wrap;gap:4px;padding:8px;background:var(--blm-soft);border-bottom:1px solid var(--blm-border)}
.blm-tb{width:32px;height:32px;border:0;border-radius:8px;background:transparent;color:#475569;cursor:pointer;font-size:13px;display:grid;place-items:center;transition:all .12s ease}
.blm-tb:hover{background:#eef2f7;color:var(--blm-pink)}
.blm-tb.wide{width:auto;padding:0 10px;font-size:12px;font-weight:700}
.blm-tb-sep{width:1px;background:var(--blm-border);margin:4px 3px}
.blm-editor{min-height:300px;max-height:56vh;overflow:auto;padding:16px 18px;font-size:15px;line-height:1.75;color:#1e293b;outline:none}
.blm-editor:empty::before{content:attr(data-placeholder);color:#94a3b8}
.blm-editor h2{font-size:22px;margin:16px 0 8px;font-weight:800;line-height:1.3}
.blm-editor h3{font-size:18px;margin:14px 0 6px;font-weight:800;line-height:1.35}
.blm-editor p{margin:0 0 12px}
.blm-editor ul,.blm-editor ol{margin:0 0 12px;padding-left:26px}
.blm-editor li{margin:4px 0}
.blm-editor blockquote{margin:12px 0;padding:10px 16px;border-left:4px solid var(--blm-pink);background:#fdf2f8;border-radius:0 10px 10px 0;color:#831843}
.blm-editor a{color:var(--blm-pink);text-decoration:underline}
.blm-editor img{max-width:100%;border-radius:10px;margin:8px 0}
.blm-editor hr{border:0;border-top:1px solid var(--blm-border);margin:16px 0}
.blm-toggles{display:flex;gap:18px;flex-wrap:wrap;margin:6px 0 4px}
.blm-toggle{display:inline-flex;align-items:center;gap:9px;cursor:pointer;font-size:13.5px;font-weight:600;color:#334155;user-select:none}
.blm-toggle input{position:absolute;opacity:0;width:0;height:0}
.blm-track{position:relative;width:42px;height:24px;border-radius:999px;background:#cbd5e1;transition:background .2s;flex:none}
.blm-track::after{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.2);transition:transform .2s}
.blm-toggle input:checked + .blm-track{background:linear-gradient(135deg,var(--blm-pink),var(--blm-violet))}
.blm-toggle input:checked + .blm-track::after{transform:translateX(18px)}
.blm-modal-foot{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:16px 22px;border-top:1px solid var(--blm-border);background:var(--blm-soft)}
.blm-status{font-size:13px;font-weight:700;color:var(--blm-sub);margin-right:auto}
.blm-status.error{color:#b91c1c}.blm-status.success{color:#059669}
.blm-author-tag{font-size:12.5px;font-weight:700;color:var(--blm-violet);display:inline-flex;align-items:center;gap:6px}
.blm-author-tag b{color:var(--blm-text)}
.blm-btn-save{background:linear-gradient(135deg,var(--blm-pink),var(--blm-violet));color:#fff;box-shadow:0 6px 16px rgba(219,39,119,.3)}
.blm-btn-save:disabled{opacity:.55;cursor:not-allowed;transform:none}
.blm-btn-cancel{background:#fff;color:#334155;border:1px solid var(--blm-border)}

/* ===== Popup nhập URL (ảnh / liên kết) ===== */
.blm-url-dlg{position:fixed;inset:0;z-index:9;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(15,23,42,.5)}
.blm-url-dlg.show{display:flex;animation:blmFade .16s ease both}
.blm-url-box{width:100%;max-width:460px;background:#fff;border-radius:16px;box-shadow:0 24px 60px rgba(15,23,42,.35);padding:20px;animation:blmRise .18s cubic-bezier(.22,1,.36,1) both}
.blm-url-box h4{margin:0 0 4px;font-size:16px;font-weight:800;color:var(--blm-text)}
.blm-url-box .blm-url-desc{margin:0 0 12px;font-size:12.5px;color:var(--blm-sub);line-height:1.5}
.blm-url-input{width:100%;border:1px solid var(--blm-border);border-radius:12px;padding:11px 14px;font-size:14px;outline:none;background:var(--blm-soft);transition:all .15s ease;font-family:inherit;color:var(--blm-text)}
.blm-url-input:focus{border-color:var(--blm-pink);background:#fff;box-shadow:0 0 0 4px rgba(219,39,119,.1)}
.blm-url-preview{display:none;margin-top:10px;border:1px solid var(--blm-border);border-radius:12px;overflow:hidden;background:var(--blm-soft)}
.blm-url-preview.show{display:block}
.blm-url-preview img{display:block;width:100%;max-height:190px;object-fit:contain}
.blm-url-err{display:none;margin-top:6px;font-size:12px;font-weight:600;color:#dc2626}
.blm-url-err.show{display:block}
.blm-url-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}
@media (max-width:560px){.blm-row2{grid-template-columns:1fr}.blm-modal-body{padding:16px}.blm-modal-head,.blm-modal-foot{padding:14px 16px}}
`;

let cssInjected = false;
function ensureCss() {
  if (cssInjected || document.getElementById("blm-manage-css")) { cssInjected = true; return; }
  const st = document.createElement("style");
  st.id = "blm-manage-css";
  st.textContent = CSS;
  (document.head || document.documentElement).appendChild(st);
  cssInjected = true;
}

const TB = [
  { cmd: "formatBlock", val: "<h2>", icon: "fa-heading", label: "H2", wide: true, title: "Tiêu đề lớn" },
  { cmd: "formatBlock", val: "<h3>", icon: "fa-heading", label: "H3", wide: true, title: "Tiêu đề nhỏ" },
  { cmd: "bold", icon: "fa-bold", title: "Đậm" },
  { cmd: "italic", icon: "fa-italic", title: "Nghiêng" },
  { cmd: "underline", icon: "fa-underline", title: "Gạch chân" },
  { sep: true },
  { cmd: "insertUnorderedList", icon: "fa-list-ul", title: "Danh sách" },
  { cmd: "insertOrderedList", icon: "fa-list-ol", title: "Danh sách số" },
  { cmd: "formatBlock", val: "<blockquote>", icon: "fa-quote-left", title: "Trích dẫn" },
  { sep: true },
  { cmd: "justifyLeft", icon: "fa-align-left", title: "Căn trái" },
  { cmd: "justifyCenter", icon: "fa-align-center", title: "Căn giữa" },
  { sep: true },
  { cmd: "createLink", icon: "fa-link", title: "Chèn liên kết" },
  { cmd: "insertImage", icon: "fa-image", title: "Chèn ảnh (URL)" },
  { cmd: "insertHorizontalRule", icon: "fa-minus", title: "Đường kẻ" },
  { cmd: "removeFormat", icon: "fa-eraser", title: "Xoá định dạng" },
  { sep: true },
  { cmd: "undo", icon: "fa-rotate-left", title: "Hoàn tác" },
  { cmd: "redo", icon: "fa-rotate-right", title: "Làm lại" }
];

let instanceSeq = 0;

export function mountBlogManage(root, opts = {}) {
  if (!root || root.dataset.blmMounted) return;
  root.dataset.blmMounted = "1";
  const sb = opts.supabase || defaultSupabase;
  const esc = opts.escapeHtml || defaultEscapeHtml;
  const log = opts.logAppError || defaultLogAppError;
  const escUrl = opts.escapeUrl || defaultEscapeUrl;

  ensureCss();
  const uid = "blm" + (++instanceSeq);

  let editId = null;
  let allPosts = [];
  let listPage = 1;
  const PAGE_SIZE = 9;
  /* Tác giả = user đang đăng nhập (đọc từ bảng public.users) */
  const currentUser = { id: null, name: "Ban Quản Trị LearnHub", photo: "" };

  const toolbarHtml = TB.map(b => b.sep
    ? '<span class="blm-tb-sep"></span>'
    : '<button type="button" class="blm-tb' + (b.wide ? " wide" : "") + '" data-cmd="' + b.cmd + '"' +
      (b.val ? ' data-val="' + esc(b.val) + '"' : "") +
      ' title="' + esc(b.title) + '">' +
      (b.icon ? '<i class="fa-solid ' + b.icon + '"></i>' : "") + (b.label ? " " + b.label : "") + '</button>'
  ).join("");

  /* ===== Thanh công cụ + lưới bài viết (trong root) ===== */
  root.innerHTML =
    '<div class="blm">' +
      '<div class="blm-bar">' +
        '<div class="blm-bar-info"><h3 class="blm-bar-title">Bài viết</h3><span class="blm-count">0</span></div>' +
        '<div class="blm-search"><i class="fa-solid fa-magnifying-glass"></i><input class="blm-input blm-search-input" type="search" placeholder="Tìm theo tiêu đề / danh mục..." autocomplete="off"></div>' +
        '<button type="button" class="blm-btn blm-btn-new"><i class="fa-solid fa-plus"></i> Viết bài mới</button>' +
      '</div>' +
      '<div class="blm-grid"></div>' +
      '<div class="blm-pager"></div>' +
    '</div>';

  /* ===== Overlay soạn bài (gắn vào body để không bị ảnh hưởng bởi layout admin) ===== */
  const overlay = document.createElement("div");
  overlay.className = "blm-overlay";
  overlay.innerHTML =
    '<div class="blm-modal" role="dialog" aria-modal="true" aria-label="Soạn bài viết">' +
      '<div class="blm-modal-head">' +
        '<span class="blm-head-ico"><i class="fa-solid fa-newspaper"></i></span>' +
        '<div class="blm-head-txt"><h3>Soạn bài viết</h3><span class="blm-mode">Bài mới</span></div>' +
        '<button type="button" class="blm-x" title="Đóng" aria-label="Đóng"><i class="fa-solid fa-xmark"></i></button>' +
      '</div>' +
      '<div class="blm-modal-body">' +
        '<div class="blm-field"><label>Tiêu đề <b>*</b></label><input class="blm-title" type="text" placeholder="vd: 5 cách học từ vựng hiệu quả cho học sinh" autocomplete="off"></div>' +
        '<div class="blm-row2">' +
          '<div class="blm-field"><label>Danh mục</label><input class="blm-category" type="text" list="' + uid + '-cats" placeholder="vd: Tin tức" autocomplete="off"><datalist id="' + uid + '-cats">' + CATEGORY_SUGGESTIONS.map(c => "<option value=\"" + esc(c) + "\">").join("") + '</datalist></div>' +
          '<div class="blm-field"><label>Thẻ (phân tách bằng dấu phẩy)</label><input class="blm-tags" type="text" placeholder="vd: tiếng anh, từ vựng" autocomplete="off"></div>' +
        '</div>' +
        '<div class="blm-field"><label>Ảnh bìa (URL ảnh)</label><input class="blm-cover" type="text" placeholder="https://.../anh-bia.jpg" autocomplete="off"><div class="blm-cover-preview"></div><span class="blm-hint">Dán link ảnh trực tiếp hoặc link Google Drive đã bật chia sẻ “Anyone with the link” — hệ thống tự đổi sang link ảnh.</span></div>' +
        '<div class="blm-field"><label>Tóm tắt</label><textarea class="blm-excerpt" rows="2" placeholder="1-2 câu mô tả ngắn hiển thị trên thẻ bài viết..."></textarea></div>' +
        '<div class="blm-field"><label>Nội dung <b>*</b></label>' +
          '<div class="blm-editor-wrap"><div class="blm-toolbar">' + toolbarHtml + '</div>' +
          '<div class="blm-editor" contenteditable="true" data-placeholder="Bắt đầu viết bài..."></div></div>' +
        '</div>' +
        '<div class="blm-toggles">' +
          '<label class="blm-toggle"><input type="checkbox" class="blm-published" checked><span class="blm-track"></span> Xuất bản</label>' +
          '<label class="blm-toggle"><input type="checkbox" class="blm-pinned"><span class="blm-track"></span> Ghim lên đầu</label>' +
        '</div>' +
      '</div>' +
      '<div class="blm-modal-foot">' +
        '<span class="blm-author-tag"></span>' +
        '<span class="blm-status"></span>' +
        '<button type="button" class="blm-btn blm-btn-cancel">Đóng</button>' +
        '<button type="button" class="blm-btn blm-btn-save"><i class="fa-solid fa-paper-plane"></i> Đăng bài</button>' +
      '</div>' +
    '</div>' +
    '<div class="blm-url-dlg">' +
      '<div class="blm-url-box" role="dialog" aria-modal="true" aria-labelledby="' + uid + '-urltitle">' +
        '<h4 id="' + uid + '-urltitle">Chèn ảnh vào bài</h4>' +
        '<p class="blm-url-desc">Dán URL ảnh trực tiếp (https://...).</p>' +
        '<input class="blm-url-input" type="url" placeholder="https://.../anh.jpg" autocomplete="off" spellcheck="false">' +
        '<div class="blm-url-preview"><img alt="Xem trước ảnh"></div>' +
        '<div class="blm-url-err"></div>' +
        '<div class="blm-url-actions">' +
          '<button type="button" class="blm-btn blm-btn-cancel blm-url-cancel">Huỷ</button>' +
          '<button type="button" class="blm-btn blm-btn-save blm-url-ok">Chèn ảnh</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);

  const q = (sel) => root.querySelector(sel);
  const oq = (sel) => overlay.querySelector(sel);
  const titleEl = oq(".blm-title");
  const catEl = oq(".blm-category");
  const tagsEl = oq(".blm-tags");
  const coverEl = oq(".blm-cover");
  const coverPrev = oq(".blm-cover-preview");
  const excerptEl = oq(".blm-excerpt");
  const editorWrap = oq(".blm-editor-wrap");
  const editor = oq(".blm-editor");
  const publishedEl = oq(".blm-published");
  const pinnedEl = oq(".blm-pinned");
  const saveBtn = oq(".blm-modal-foot .blm-btn-save");
  const cancelBtn = oq(".blm-modal-foot .blm-btn-cancel");
  const closeBtn = oq(".blm-x");
  const statusEl = oq(".blm-status");
  const modeEl = oq(".blm-mode");
  const gridEl = q(".blm-grid");
  const pagerEl = q(".blm-pager");
  const countEl = q(".blm-count");
  const searchEl = q(".blm-search-input");
  const newBtn = q(".blm-btn-new");
  const urlDlg = oq(".blm-url-dlg");
  const urlTitle = oq(".blm-url-box h4");
  const urlDesc = oq(".blm-url-desc");
  const urlInput = oq(".blm-url-input");
  const urlPreview = oq(".blm-url-preview");
  const urlPreviewImg = urlPreview.querySelector("img");
  const urlErr = oq(".blm-url-err");
  const urlOkBtn = oq(".blm-url-ok");
  const urlCancelBtn = oq(".blm-url-cancel");

  function toast(msg, type) {
    if (typeof window.lhToast === "function") { window.lhToast(msg, { type: type || "info" }); return; }
    statusEl.textContent = msg;
    statusEl.className = "blm-status " + (type === "error" ? "error" : type === "success" ? "success" : "");
  }

  /* ===== Lấy tác giả = user đang đăng nhập (bảng public.users) ===== */
  const authorTagEl = oq(".blm-author-tag");
  function updateAuthorTag() {
    if (!authorTagEl) return;
    authorTagEl.innerHTML = '<i class="fa-solid fa-user-pen"></i> Đăng với tên: <b>' + esc(currentUser.name) + '</b>';
  }
  async function resolveCurrentUser() {
    try {
      const { data } = await sb.auth.getUser();
      const u = data && data.user;
      if (u) {
        currentUser.id = u.id;
        const { data: row } = await sb.from("users").select("id,name,photo").eq("id", u.id).maybeSingle();
        if (row && row.name && row.name.trim()) currentUser.name = row.name.trim();
        if (row && row.photo) currentUser.photo = row.photo;
      }
    } catch (e) { /* giữ mặc định */ }
    updateAuthorTag();
    return currentUser;
  }
  resolveCurrentUser();

  /* ===== Ảnh bìa preview ===== */
  function renderCover() {
    const u = safeUrl(normalizeImageUrl(coverEl.value), escUrl);
    if (!u) { coverPrev.classList.remove("show"); coverPrev.innerHTML = ""; return; }
    coverPrev.classList.add("show");
    coverPrev.innerHTML = '<img src="' + esc(u) + '" alt="Ảnh bìa" onerror="this.parentNode.classList.remove(\'show\')">';
  }
  let coverTimer = null;
  coverEl.addEventListener("input", () => { clearTimeout(coverTimer); coverTimer = setTimeout(renderCover, 400); });

  /* ===== Toolbar editor ===== */
  overlay.querySelectorAll(".blm-tb").forEach(btn => {
    btn.addEventListener("mousedown", (e) => e.preventDefault()); // giữ vùng chọn
    btn.addEventListener("click", () => {
      const cmd = btn.getAttribute("data-cmd");
      let val = btn.getAttribute("data-val") || null;
      if (cmd === "createLink" || cmd === "insertImage") {
        openUrlDialog(cmd === "insertImage" ? "image" : "link");
        return;
      }
      editor.focus();
      try { document.execCommand(cmd, false, val); } catch (e) { /* bỏ qua */ }
    });
  });
  /* ===== Popup nhập URL cho ảnh / liên kết (thay prompt mặc định của trình duyệt) ===== */
  let urlMode = "";
  let savedRange = null;

  function saveEditorSelection() {
    try {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      if (editor.contains(range.commonAncestorContainer)) savedRange = range.cloneRange();
    } catch (e) { /* bỏ qua */ }
  }

  function restoreEditorSelection() {
    editor.focus();
    if (!savedRange) return;
    try {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedRange);
    } catch (e) { /* bỏ qua */ }
  }

  function updateUrlPreview() {
    const u = safeUrl(urlMode === "image" ? normalizeImageUrl(urlInput.value) : urlInput.value, escUrl);
    urlErr.classList.remove("show");
    if (urlMode === "image" && u) {
      urlPreviewImg.src = u;
      urlPreview.classList.add("show");
    } else {
      urlPreview.classList.remove("show");
      urlPreviewImg.removeAttribute("src");
    }
  }

  function openUrlDialog(mode) {
    saveEditorSelection();
    urlMode = mode;
    const isImg = mode === "image";
    urlTitle.textContent = isImg ? "Chèn ảnh vào bài" : "Chèn liên kết";
    urlDesc.textContent = isImg
      ? "Dán URL ảnh trực tiếp hoặc link Google Drive đã chia sẻ công khai. Ảnh sẽ nằm đúng vị trí con trỏ."
      : "Dán URL liên kết (https://...). Nếu đang bôi đen chữ, liên kết sẽ gắn vào phần đó.";
    urlInput.value = "";
    urlInput.placeholder = isImg ? "https://.../anh.jpg" : "https://...";
    urlErr.classList.remove("show");
    urlPreview.classList.remove("show");
    urlPreviewImg.removeAttribute("src");
    urlOkBtn.innerHTML = isImg
      ? '<i class="fa-solid fa-image"></i> Chèn ảnh'
      : '<i class="fa-solid fa-link"></i> Chèn link';
    urlDlg.classList.add("show");
    setTimeout(function () { urlInput.focus(); }, 30);
  }

  function closeUrlDialog(restoreSel) {
    urlDlg.classList.remove("show");
    urlMode = "";
    if (restoreSel) restoreEditorSelection();
    savedRange = null;
  }

  function submitUrlDialog() {
    const url = safeUrl(urlMode === "image" ? normalizeImageUrl(urlInput.value) : urlInput.value, escUrl);
    if (!url) {
      urlErr.textContent = urlMode === "image"
        ? "URL ảnh không hợp lệ. Chỉ nhận link http/https."
        : "URL không hợp lệ. Chỉ nhận link http/https.";
      urlErr.classList.add("show");
      urlInput.focus();
      return;
    }
    const cmd = urlMode === "image" ? "insertImage" : "createLink";
    urlDlg.classList.remove("show");
    urlMode = "";
    restoreEditorSelection();
    try { document.execCommand(cmd, false, url); } catch (e) { /* bỏ qua */ }
    savedRange = null;
    editor.focus();
  }

  urlOkBtn.addEventListener("click", submitUrlDialog);
  urlCancelBtn.addEventListener("click", function () { closeUrlDialog(true); });
  urlDlg.addEventListener("mousedown", function (e) {
    if (e.target === urlDlg) closeUrlDialog(true);
  });
  urlInput.addEventListener("input", updateUrlPreview);
  urlInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); submitUrlDialog(); }
    else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closeUrlDialog(true); }
  });
  urlPreviewImg.addEventListener("error", function () {
    urlPreview.classList.remove("show");
    urlPreviewImg.removeAttribute("src");
    if (urlMode === "image") {
      urlErr.textContent = "Không tải được ảnh. Nếu là Google Drive, hãy đặt quyền “Anyone with the link”.";
      urlErr.classList.add("show");
    }
  });

  editor.addEventListener("focus", () => editorWrap.classList.add("focus"));
  editor.addEventListener("blur", () => editorWrap.classList.remove("focus"));

  /* ===== Reset / fill ===== */
  function resetForm() {
    editId = null;
    titleEl.value = "";
    catEl.value = "";
    tagsEl.value = "";
    coverEl.value = "";
    excerptEl.value = "";
    editor.innerHTML = "";
    publishedEl.checked = true;
    pinnedEl.checked = false;
    renderCover();
    modeEl.textContent = "Bài mới";
    saveBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Đăng bài';
    statusEl.textContent = "";
    statusEl.className = "blm-status";
  }

  function fillForm(p) {
    editId = p.id || null;
    titleEl.value = p.title || "";
    catEl.value = p.category || "";
    tagsEl.value = Array.isArray(p.tags) ? p.tags.join(", ") : (p.tags || "");
    coverEl.value = p.cover_url || "";
    excerptEl.value = p.excerpt || "";
    editor.innerHTML = p.content || "";
    publishedEl.checked = p.published !== false;
    pinnedEl.checked = !!p.pinned;
    renderCover();
    modeEl.textContent = "Đang sửa · " + String(p.title || "").slice(0, 48);
    saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Cập nhật bài';
    statusEl.textContent = "";
    statusEl.className = "blm-status";
  }

  /* ===== Mở / đóng overlay ===== */
  function openEditor() {
    overlay.classList.add("show");
    document.documentElement.style.overflow = "hidden";
    setTimeout(() => { try { titleEl.focus(); } catch (e) {} }, 60);
  }
  function closeEditor() {
    overlay.classList.remove("show");
    document.documentElement.style.overflow = "";
  }

  newBtn.addEventListener("click", () => { resetForm(); openEditor(); });
  cancelBtn.addEventListener("click", closeEditor);
  closeBtn.addEventListener("click", closeEditor);
  overlay.addEventListener("mousedown", (e) => { if (e.target === overlay) closeEditor(); });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (urlDlg.classList.contains("show")) { closeUrlDialog(true); return; }
    if (overlay.classList.contains("show")) closeEditor();
  });

  /* ===== Lưu ===== */
  saveBtn.addEventListener("click", async () => {
    const title = titleEl.value.trim();
    const content = editor.innerHTML.trim();
    const plain = editor.textContent.replace(/\u00a0/g, " ").trim();
    if (!title) { toast("Thiếu tiêu đề bài viết", "error"); titleEl.focus(); return; }
    if (!plain && !/<img|<hr/i.test(content)) { toast("Nội dung bài viết đang trống", "error"); editor.focus(); return; }

    const author = await resolveCurrentUser();
    const payload = {
      title,
      category: catEl.value.trim() || "Tin tức",
      tags: tagsEl.value.split(",").map(s => s.trim()).filter(Boolean),
      cover_url: safeUrl(normalizeImageUrl(coverEl.value), escUrl) || null,
      excerpt: excerptEl.value.trim(),
      content: content || "",
      published: !!publishedEl.checked,
      pinned: !!pinnedEl.checked
    };
    // Người đăng = user đang đăng nhập. Chỉ gán khi TẠO MỚI;
    // khi sửa thì giữ nguyên tác giả gốc của bài viết.
    if (!editId) {
      payload.author = author.name || "Ban Quản Trị LearnHub";
      payload.author_id = author.id || null;
    }

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Đang lưu...';
    try {
      let res;
      if (editId) res = await sb.from("blog_posts").update(payload).eq("id", editId);
      else res = await sb.from("blog_posts").insert(payload);
      if (res.error) throw res.error;
      toast(editId ? "Đã cập nhật bài viết" : "Đã đăng bài viết", "success");
      resetForm();
      closeEditor();
      listPage = 1;
      await loadList();
    } catch (err) {
      console.error("[blog-manage] lưu lỗi:", err);
      toast("Không lưu được: " + ((err && (err.message || err.error_description)) || err), "error");
      log({ source: "blog-manage", category: "feature", level: "error", code: "BLOG_SAVE_FAIL", message: String((err && (err.message || err.error_description)) || err), url: location.href });
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = editId ? '<i class="fa-solid fa-floppy-disk"></i> Cập nhật bài' : '<i class="fa-solid fa-paper-plane"></i> Đăng bài';
    }
  });

  /* ===== Danh sách ===== */
  async function loadList() {
    gridEl.innerHTML = '<div class="blm-empty"><i class="fa-solid fa-spinner fa-spin"></i>Đang tải danh sách bài viết...</div>';
    try {
      const { data, error } = await sb
        .from("blog_posts")
        .select("id,title,category,tags,cover_url,excerpt,content,published,pinned,views,created_at,updated_at,author")
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      allPosts = data || [];
      renderList();
    } catch (err) {
      console.error("[blog-manage] list lỗi:", err);
      gridEl.innerHTML = '<div class="blm-empty"><i class="fa-solid fa-triangle-exclamation" style="color:#f59e0b"></i>Không tải được danh sách bài viết</div>';
      log({ source: "blog-manage", category: "feature", level: "error", code: "BLOG_LIST_FAIL", message: String((err && (err.message || err.error_description)) || err), url: location.href });
    }
  }

  function renderList() {
    const kw = searchEl.value.trim().toLowerCase();
    const list = allPosts.filter(p => !kw ||
      String(p.title || "").toLowerCase().indexOf(kw) !== -1 ||
      String(p.category || "").toLowerCase().indexOf(kw) !== -1);
    countEl.textContent = allPosts.length;

    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    if (listPage > totalPages) listPage = totalPages;
    if (listPage < 1) listPage = 1;
    pagerEl.innerHTML = "";

    if (!list.length) {
      gridEl.innerHTML = '<div class="blm-empty"><i class="fa-solid fa-newspaper"></i>' +
        (kw ? "Không tìm thấy bài viết phù hợp." : "Chưa có bài viết nào.<br>Bấm “Viết bài mới” để tạo bài đầu tiên.") + '</div>';
      return;
    }

    const pageList = list.slice((listPage - 1) * PAGE_SIZE, listPage * PAGE_SIZE);
    gridEl.innerHTML = pageList.map(p => {
      const cover = safeUrl(p.cover_url, escUrl);
      const coverHtml = cover
        ? '<img src="' + esc(cover) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">'
        : '<span class="noimg"><i class="fa-regular fa-newspaper"></i></span>';
      const statusChip = p.published
        ? '<span class="blm-chip blm-chip-live">Đã đăng</span>'
        : '<span class="blm-chip blm-chip-draft">Bản nháp</span>';
      const pinChip = p.pinned ? '<span class="blm-chip blm-chip-pin"><i class="fa-solid fa-thumbtack"></i> Ghim</span>' : '';
      const dek = String(p.excerpt || "").trim() || stripTags(p.content || "").slice(0, 140);
      return '<article class="blm-post" data-id="' + esc(p.id) + '">' +
        '<div class="blm-post-cover">' + coverHtml +
          '<div class="blm-post-badges">' + statusChip + pinChip + '</div>' +
        '</div>' +
        '<div class="blm-post-body">' +
          '<span class="blm-post-cat">' + esc(p.category || "Tin tức") + '</span>' +
          '<h4 class="blm-post-title">' + esc(p.title || "(không tiêu đề)") + '</h4>' +
          '<p class="blm-post-excerpt">' + esc(dek) + '</p>' +
          '<div class="blm-post-meta">' +
            '<span><i class="fa-regular fa-user"></i> ' + esc(p.author || "Ban Quản Trị LearnHub") + '</span>' +
            '<span><i class="fa-regular fa-calendar"></i> ' + esc(formatDate(p.created_at)) + '</span>' +
            '<span><i class="fa-regular fa-eye"></i> ' + esc(p.views || 0) + '</span>' +
            '<span><i class="fa-regular fa-clock"></i> ' + readingMinutes(p.content) + ' phút</span>' +
          '</div>' +
        '</div>' +
        '<div class="blm-post-actions">' +
          '<button type="button" class="blm-rbtn-edit" data-edit="' + esc(p.id) + '"><i class="fa-solid fa-pen"></i> Sửa</button>' +
          '<button type="button" class="blm-rbtn-del" data-del="' + esc(p.id) + '"><i class="fa-solid fa-trash-can"></i> Xoá</button>' +
        '</div>' +
      '</article>';
    }).join("");

    gridEl.querySelectorAll("[data-edit]").forEach(btn => {
      btn.addEventListener("click", () => {
        const p = allPosts.find(x => String(x.id) === String(btn.getAttribute("data-edit")));
        if (p) { fillForm(p); openEditor(); }
      });
    });
    gridEl.querySelectorAll("[data-del]").forEach(btn => {
      btn.addEventListener("click", () => removePost(btn.getAttribute("data-del")));
    });

    renderPager(totalPages, list.length);
  }

  function renderPager(totalPages, total) {
    if (totalPages <= 1) return;
    const pageBtn = p => '<button type="button" data-pg="' + p + '"' + (p === listPage ? ' class="pg-active"' : "") + '>' + p + '</button>';
    let h = "";
    h += '<button type="button" data-pg="' + (listPage - 1) + '"' + (listPage === 1 ? " disabled" : "") + '><i class="fa-solid fa-chevron-left"></i></button>';
    for (let p = 1; p <= totalPages; p++) h += pageBtn(p);
    h += '<button type="button" data-pg="' + (listPage + 1) + '"' + (listPage === totalPages ? " disabled" : "") + '><i class="fa-solid fa-chevron-right"></i></button>';
    pagerEl.innerHTML = h;
    pagerEl.querySelectorAll("[data-pg]").forEach(b => {
      b.addEventListener("click", () => {
        listPage = Math.max(1, Math.min(Number(b.getAttribute("data-pg")), totalPages));
        renderList();
        root.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  async function removePost(id) {
    if (!window.confirm("Xoá bài viết này? Không thể hoàn tác.")) return;
    try {
      const { error } = await sb.from("blog_posts").delete().eq("id", id);
      if (error) throw error;
      toast("Đã xoá bài viết", "success");
      if (editId === id) resetForm();
      await loadList();
    } catch (err) {
      console.error("[blog-manage] delete lỗi:", err);
      toast("Không xoá được: " + ((err && (err.message || err.error_description)) || err), "error");
      log({ source: "blog-manage", category: "feature", level: "error", code: "BLOG_DELETE_FAIL", message: String((err && (err.message || err.error_description)) || err), url: location.href });
    }
  }

  let searchTimer = null;
  searchEl.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { listPage = 1; renderList(); }, 200);
  });

  resetForm();
  loadList();
}

export const blogManageUtils = { CATEGORY_SUGGESTIONS };
