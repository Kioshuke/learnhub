// --- Performance optimized script.js ---
// (mọi logic realtime dùng window.supabaseClient)

// Cache DOM elements
let currentTab = "home";

function loadQuiz(btn, link){

  // ❌ xoá active cũ
  document.querySelectorAll(".card").forEach(c=>{
    c.classList.remove("active-card");
  });

  // ✅ set card đang bấm
  const card = btn.closest(".card");
  if(card){
    card.classList.add("active-card");
  }

  document.getElementById("quiz").innerHTML =
  `
  <div class="quiz-box" style="position:relative;">

    <div class="quiz-header" style="position:relative; z-index:6000;">
      <button class="quiz-btn close-btn" onclick="closeQuiz();" style="pointer-events: all !important;">Đóng bài</button>
    </div>

    <div class="loader" id="loader" style="display:none;"></div>

    <iframe id="quizFrame" src="${link}" style="width:100%;height:100vh;border:none;"></iframe>

  </div>
  `;
setTimeout(() => {
  const quizEl = document.getElementById("quiz");
  if(quizEl){
    quizEl.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}, 50);
  let iframe = document.getElementById("quizFrame");
  let loader = document.getElementById("loader");
  window.__quizLoadOk = false;

  iframe.onload = function(){
  window.__quizLoadOk = true;
  if(loader) loader.style.display="none";

  // 🆕 [LearnHub Test - Giai đoạn 1] Gửi user sang iframe vừa load (nếu đã đăng nhập)
  // Hàm này được định nghĩa trong index.html, tự kiểm tra null nếu chưa có user.
  if(typeof window.sendUserToQuizFrame === "function"){
    window.sendUserToQuizFrame();
  }

  // 🔥 SCROLL SAU KHI LOAD XONG
  document.getElementById("quiz").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

  // hiệu ứng glow
  iframe.style.boxShadow = "0 0 25px rgba(26,115,232,0.6)";
  setTimeout(()=>{
    iframe.style.boxShadow = "none";
  },1000);

  clearTimeout(window.__quizLoadTimer);
}
  // 🕐 Watchdog: nếu iframe bài test không tải được trong 20s thì thông báo user
  window.__quizLoadTimer = setTimeout(() => {
    const fr = document.getElementById("quizFrame");
    if (fr && !window.__quizLoadOk) {
      if (window.logAppError) {
        window.logAppError({
          source: "quiz",
          category: "feature",
          level: "error",
          code: "QUIZ_FRAME_LOAD_TIMEOUT",
          message: "Iframe bài test không tải được trong 20s (trang test không hiển thị).",
          detail: { link: String(link || "").slice(0, 200) }
        });
      }
      const loader = document.getElementById("loader");
      if(loader){
        loader.innerHTML = '<div style="text-align:center;padding:30px 16px"><div style="font-size:36px;margin-bottom:12px">&#9888;&#65039;</div><div style="font-size:15px;font-weight:700;color:#1e293b;margin-bottom:6px">Không thể tải bài test</div><div style="font-size:13px;color:#64748b;margin-bottom:16px;line-height:1.5">Trang bài test không phản hồi. Vui lòng thử lại.</div><button onclick="closeQuiz()" style="padding:10px 24px;border:none;border-radius:10px;background:#4f46e5;color:#fff;font-size:13px;font-weight:600;cursor:pointer">Đóng</button></div>';
        loader.style.display = "flex";
      }
    }
  }, 20000);
}

function closeQuiz(){

  document.getElementById("quiz").innerHTML = "";

  document.querySelectorAll(".card").forEach(c=>{
    c.classList.remove("active-card");
  });

  setTimeout(()=>{
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }, 100); // delay nhẹ cho mượt
}
const allTabs = ["home", "flash", "forum", "blog", "tai-lieu", "phong-hoc"];
const iframeTabIds = {"flash":"flashHubFrame","forum":"forumFrame","blog":"blogFrame","tai-lieu":"taiLieuFrame","phong-hoc":"phongHocFrame"};
const navMap = {'home':'/index.html','flash':'flashcard/hub.html','forum':'element/forum.html','blog':'element/blog.html','tai-lieu':'element/hubfile.html','phong-hoc':'element/phong-hoc.html'};
const reverseNavMap = {'/index.html':'home','flashcard/hub.html':'flash','element/forum.html':'forum','element/blog.html':'blog','element/hubfile.html':'tai-lieu','element/phong-hoc.html':'phong-hoc'};

/* ==== Iframe tự giãn theo chiều cao nội dung (Blog, Forum, Tài liệu) ====
   Các trang con (element/blog.html, bai-viet.html, forum.html, hubfile.html) đo chiều cao
   nội dung rồi gửi {type:"IFRAME_HEIGHT", height}. Trang chính set lại height cho iframe để
   thanh cuộn nằm ở TRANG CHÍNH thay vì cuộn lồng bên trong iframe.
   Vì iframe cao bằng cả nội dung nên 100vh/position:fixed bên trong bị "cao theo cả trang";
   trang chính gửi {type:"FRAME_VIEW", top, vh} để phía con đặt modal đúng vùng đang nhìn thấy. */
const autoHeightFrameIds = ["blogFrame", "forumFrame", "taiLieuFrame"];

function findFrameBySource(src){
  const ids = Object.values(iframeTabIds).concat(["chatbotFrame", "quizFrame"]);
  for(let i = 0; i < ids.length; i++){
    const f = document.getElementById(ids[i]);
    if(f && f.contentWindow === src) return f;
  }
  return null;
}

function requestFrameHeight(frameId){
  const f = document.getElementById(frameId);
  if(!f || !f.contentWindow) return;
  try { f.contentWindow.postMessage({ type:"REQUEST_HEIGHT" }, "*"); } catch(e){}
}
window.requestFrameHeight = requestFrameHeight;

function syncAutoHeightOnShow(frameId){
  requestFrameHeight(frameId);
  setTimeout(function(){ requestFrameHeight(frameId); }, 150);
  setTimeout(function(){ requestFrameHeight(frameId); }, 520);
}

/* Gửi cho iframe biết nó đang nằm ở đâu / vùng nhìn thấy của trang chính cao bao nhiêu,
   để phía con đặt modal (position:fixed) đúng chỗ khi iframe bị kéo cao bằng cả nội dung. */
function sendFrameView(frame){
  if(!frame || !frame.contentWindow) return;
  const r = frame.getBoundingClientRect();
  // Chiều cao header đang GHIM (tab home/forum/blog/tài liệu) — header z-index 1000 đè lên
  // iframe nên modal bên trong phải chừa đúng khoảng này, nếu không sẽ bị header che mất đỉnh.
  let menuH = 0;
  if(document.body.classList.contains("sticky-header")){
    const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--lh-menu-h"));
    if(Number.isFinite(v) && v > 0) menuH = Math.round(v);
  }
  try {
    frame.contentWindow.postMessage({
      type: "FRAME_VIEW",
      top: Math.round(r.top),
      vh: window.innerHeight,
      menuH: menuH
    }, "*");
  } catch(e){}
}

let __frameViewRaf = null;
function broadcastFrameView(){
  if(__frameViewRaf) return;
  __frameViewRaf = requestAnimationFrame(function(){
    __frameViewRaf = null;
    autoHeightFrameIds.forEach(function(id){
      const f = document.getElementById(id);
      if(f && f.offsetParent !== null) sendFrameView(f); // chỉ iframe đang hiển thị
    });
  });
}
window.broadcastFrameView = broadcastFrameView;

// Giữ iframe tối thiểu 1 màn hình khi cửa sổ đổi kích thước.
function reapplyFrameHeightMin(){
  autoHeightFrameIds.forEach(function(id){
    const f = document.getElementById(id);
    if(!f || f.offsetParent === null) return;
    const ch = parseFloat(f.dataset.contentH);
    if(!Number.isFinite(ch)) return;
    f.style.height = Math.max(ch, window.innerHeight) + "px";
  });
}

window.addEventListener("scroll", broadcastFrameView, { passive:true });
window.addEventListener("resize", function(){ reapplyFrameHeightMin(); broadcastFrameView(); }, { passive:true });

/* ==== Lượt xem blog: gom lại rồi gửi KÈM nhịp heartbeat "online" ====
   - Iframe blog gửi {type:"BLOG_VIEW", id} khi có người mở một bài viết.
   - Đang đăng nhập: hàng đợi được gửi CHUNG với heartbeat (users_heartbeat_views)
     nên KHÔNG tốn thêm request nào.
   - Khách (không có heartbeat) hoặc heartbeat tạm dừng: watchdog tự gửi gộp sau 7s.
   - Rời trang: gửi nốt bằng fetch keepalive để không mất lượt xem. */
let __pendingBlogViews = [];
let __viewWatchdog = null;

function armViewWatchdog(){
  if(__viewWatchdog) return;
  __viewWatchdog = setTimeout(function(){
    __viewWatchdog = null;
    flushPendingBlogViews();
  }, 7000);
}

function clearViewWatchdog(){
  if(__viewWatchdog){ clearTimeout(__viewWatchdog); __viewWatchdog = null; }
}

function queueBlogView(id){
  if(!id) return;
  if(__pendingBlogViews.length >= 200) __pendingBlogViews.shift(); // chặn phình vô hạn
  __pendingBlogViews.push(id);
  armViewWatchdog();
}

// Trang chính (index.html) lấy hàng đợi để gửi kèm heartbeat.
window.takePendingBlogViews = function(){
  clearViewWatchdog();
  const ids = __pendingBlogViews;
  __pendingBlogViews = [];
  return ids;
};

// Trả lại lượt xem khi gửi kèm thất bại -> watchdog gửi riêng ở nhịp sau.
window.pushPendingBlogViews = function(ids){
  if(!ids || !ids.length) return;
  __pendingBlogViews = ids.concat(__pendingBlogViews);
  armViewWatchdog();
};

async function flushPendingBlogViews(){
  clearViewWatchdog();
  const ids = window.takePendingBlogViews();
  if(!ids.length) return;
  if(!window.supabaseClient){ window.pushPendingBlogViews(ids); return; }
  try {
    const { error } = await window.supabaseClient.rpc("blog_increment_views_many", { p_ids: ids });
    if(error) throw error;
  } catch(e){
    // Chưa có RPC gộp -> quay lại gọi từng bài (luôn hoạt động).
    ids.forEach(function(id){
      try { window.supabaseClient.rpc("blog_increment_views", { p_id: id }).then(function(){}, function(){}); } catch(_e){}
    });
  }
}
window.flushPendingBlogViews = flushPendingBlogViews;

window.addEventListener("pagehide", function(){
  const ids = __pendingBlogViews;
  if(!ids || !ids.length) return;
  __pendingBlogViews = [];
  clearViewWatchdog();
  try {
    const c = window.supabaseClient;
    const url = c && c.supabaseUrl;
    const key = c && c.supabaseKey;
    if(!url || !key) return;
    fetch(url + "/rest/v1/rpc/blog_increment_views_many", {
      method: "POST",
      keepalive: true,
      headers: { "apikey": key, "Authorization": "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({ p_ids: ids })
    }).catch(function(){});
  } catch(e){}
});

window.addEventListener("message", function(ev){
  const d = ev.data;
  if(!d || !d.type) return;

  // Iframe blog: có người vừa mở một bài viết -> gom lượt xem lại.
  if(d.type === "BLOG_VIEW"){
    const bf = findFrameBySource(ev.source);
    if(bf && bf.id === "blogFrame") queueBlogView(d.id);
    return;
  }

  // Phía con xin thông tin vùng nhìn thấy (khi mở modal).
  if(d.type === "REQUEST_FRAME_VIEW"){
    const reqFrame = findFrameBySource(ev.source);
    if(reqFrame) sendFrameView(reqFrame);
    return;
  }

  // Trang con (element/hubfile.html) yêu cầu mở popup review tài liệu Ở TRANG CHÍNH.
  if(d.type === "OPEN_DOC_REVIEW"){
    openDocReview(d.doc, ev.source);
    return;
  }

  // Trang con báo đóng (vd: user bấm Esc khi focus còn trong iframe) -> đóng popup ở đây.
  if(d.type === "CLOSE_DOC_REVIEW"){
    closeDocReview();
    return;
  }

  if(d.type !== "IFRAME_HEIGHT" && d.type !== "IFRAME_SCROLL_TOP") return;
  const frame = findFrameBySource(ev.source);
  if(!frame || autoHeightFrameIds.indexOf(frame.id) === -1) return;
  if(frame.offsetParent === null) return; // tab đang ẩn -> số đo không đáng tin, bỏ qua

  if(d.type === "IFRAME_SCROLL_TOP"){
    const wrap = frame.parentElement || frame;
    try { wrap.scrollIntoView({ behavior:"auto", block:"start" }); } catch(e){}
    return;
  }

  const h = Math.ceil(Number(d.height));
  if(!Number.isFinite(h) || h < 80) return;
  frame.dataset.contentH = String(h);
  // Ít nhất bằng 1 màn hình -> modal (position:fixed) bên trong luôn đủ chỗ hiển thị.
  const target = Math.max(h, window.innerHeight);
  const cur = parseInt(frame.style.height, 10);
  if(Number.isFinite(cur) && Math.abs(cur - target) < 2) return;
  frame.style.height = target + "px";
});

autoHeightFrameIds.forEach(function(id){
  const f = document.getElementById(id);
  if(!f) return;
  f.addEventListener("load", function(){
    setTimeout(function(){ requestFrameHeight(id); }, 120);
    setTimeout(function(){ requestFrameHeight(id); }, 600);
  });
});

/* ============================================================================
   POPUP REVIEW TÀI LIỆU — RENDER Ở TRANG CHÍNH (top-level document)
   ----------------------------------------------------------------------------
   VÌ SAO KHÔNG render trong iframe:
     Iframe tab "Tài liệu" (taiLieuFrame) được trang chính nới cao = TOÀN BỘ nội dung
     (mục đích để thanh cuộn nằm ở trang chính). Bên trong một iframe cao hơn viewport,
     `position:fixed` neo theo KHUNG IFRAME chứ không phải màn hình thật -> popup bị
     trôi theo khi người dùng cuộn, dễ bị header ghim / đối tượng khác đè lên, và
     `--lh-frame-top` chỉ bù lại được khoảng nửa nhịp khung hình nên hay bị lệch.

   CÁCH SỬA:
     Trang con (element/hubfile.html) gửi {type:"OPEN_DOC_REVIEW", doc:{...}} lên đây.
     Popup được dựng ở document gốc:
       - `position:fixed` neo đúng viewport thật -> không bao giờ trôi theo cuộn
       - `z-index: 99999` -> nằm TRÊN mọi đối tượng (header ghim, chat bubble, toast...)
     Nếu user mở trực tiếp element/hubfile.html (không qua iframe) thì trang con tự
     dùng modal cục bộ, không gửi message nào lên.
   ============================================================================ */
(function () {
  var STYLE_ID = "lh-doc-review-style";
  var overlay = null;
  var srcWin = null;          // window của iframe gửi yêu cầu (để báo đóng lại)
  var lastFocus = null;

  function fmtDate(v) {
    if (!v) return "—";
    var m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return m[3] + "/" + m[2] + "/" + m[1];
    var d = new Date(v);
    if (isNaN(d.getTime())) return v;
    return ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear();
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var css = [
      "#lhDocReview{position:fixed;inset:0;z-index:99999;display:none;align-items:center;justify-content:center;",
      "padding:24px;background:rgba(10,15,25,.55);",
      "backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);}",
      "#lhDocReview.show{display:flex;}",
      "#lhDocReview .dr-modal{position:relative;width:100%;max-width:1280px;",
      "max-height:calc(100vh - 48px);display:flex;flex-direction:column;",
      "background:rgba(255,255,255,.94);border-radius:22px;overflow:hidden;",
      "box-shadow:0 30px 80px rgba(15,23,42,.38);animation:lhDrIn .3s ease both;}",
      "@keyframes lhDrIn{from{opacity:0;}to{opacity:1;}}",
      "#lhDocReview .dr-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 16px;",
      "border-bottom:1px solid rgba(148,163,184,.35);background:#f8fbff;flex-shrink:0;}",
      "#lhDocReview .dr-ico{width:38px;height:38px;border-radius:11px;display:grid;place-items:center;font-size:17px;",
      "color:#fff;flex-shrink:0;box-shadow:0 6px 14px rgba(15,23,42,.18);}",
      "#lhDocReview .dr-head h2{margin:0;font-size:16px;font-weight:800;line-height:1.35;overflow-wrap:anywhere;}",
      "#lhDocReview .dr-close{width:36px;height:36px;border-radius:50%;border:1px solid rgba(148,163,184,.35);",
      "background:#fff;color:#0f172a;font-size:17px;cursor:pointer;display:grid;place-items:center;flex-shrink:0;",
      "transition:all .15s ease;line-height:1;}",
      "#lhDocReview .dr-close:hover{background:#fee2e2;border-color:#f87171;color:#b91c1c;}",
      "#lhDocReview .dr-body{display:grid;grid-template-columns:1fr 360px;flex:1;min-height:0;}",
      "#lhDocReview .dr-preview{position:relative;background:#0f172a;border-right:1px solid rgba(148,163,184,.35);min-height:300px;}",
      "#lhDocReview .dr-preview iframe{position:absolute;inset:0;width:100%;height:100%;border:none;background:#fff;}",
      "#lhDocReview .dr-spinner{position:absolute;inset:0;display:grid;place-items:center;color:#94a3b8;font-size:14px;gap:10px;}",
      "#lhDocReview .dr-spinner .sp{width:40px;height:40px;border-radius:50%;border:4px solid rgba(148,163,184,.3);",
      "border-top-color:#0891b2;animation:lhDrSpin .8s linear infinite;}",
      "@keyframes lhDrSpin{to{transform:rotate(360deg)}}",
      "#lhDocReview .dr-fallback{position:absolute;inset:0;display:none;place-items:center;text-align:center;color:#e2e8f0;padding:30px;}",
      "#lhDocReview .dr-fallback i{font-size:56px;margin-bottom:14px;color:#38bdf8;}",
      "#lhDocReview .dr-fallback p{max-width:380px;line-height:1.6;}",
      "#lhDocReview .dr-info{padding:20px 22px;background:#f8fbff;display:flex;flex-direction:column;gap:18px;",
      "overflow-y:auto;min-height:0;}",
      "#lhDocReview .dr-desc{margin:0;color:#475569;font-size:14px;line-height:1.65;}",
      "#lhDocReview .dr-meta{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px;}",
      "#lhDocReview .dr-meta li{display:flex;align-items:center;gap:12px;font-size:13.5px;}",
      "#lhDocReview .dr-meta .mi{width:34px;height:34px;border-radius:10px;background:rgba(8,145,178,.12);color:#0891b2;",
      "display:grid;place-items:center;font-size:15px;flex-shrink:0;}",
      "#lhDocReview .dr-meta .ml{color:#475569;font-weight:600;min-width:74px;}",
      "#lhDocReview .dr-meta .mv{font-weight:600;word-break:break-word;}",
      "#lhDocReview .dr-actions{margin-top:auto;display:flex;flex-direction:column;gap:10px;}",
      "#lhDocReview .dr-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;border-radius:12px;",
      "padding:12px 16px;font-size:14.5px;font-weight:700;font-family:inherit;text-decoration:none;cursor:pointer;",
      "border:1px solid transparent;transition:all .15s ease;}",
      "#lhDocReview .dr-btn-primary{background:#0891b2;color:#fff;box-shadow:0 8px 18px rgba(8,145,178,.2);}",
      "#lhDocReview .dr-btn-primary:hover{background:#0e7490;transform:translateY(-2px);}",
      "#lhDocReview .dr-btn-ghost{background:#fff;border-color:rgba(148,163,184,.35);color:#0f172a;}",
      "#lhDocReview .dr-btn-ghost:hover{border-color:#0891b2;color:#0891b2;}",
      "#lhDocReview .dr-mobile-note{display:none;align-items:flex-start;gap:10px;position:relative;z-index:2;margin:12px;",
      "padding:13px 14px;border-radius:12px;background:#fff;border:1px solid rgba(148,163,184,.35);color:#0f172a;",
      "font-size:13.5px;line-height:1.55;box-shadow:0 12px 30px rgba(8,47,73,.08);}",
      "@media (min-width:901px){#lhDocReview .dr-modal{height:min(760px,calc(100vh - 48px));}}",
      "@media (min-width:901px) and (max-width:1180px){#lhDocReview .dr-body{grid-template-columns:1fr 300px;}}",
      "@media (max-width:900px){",
      "#lhDocReview .dr-body{grid-template-columns:1fr;overflow-y:auto;}",
      "#lhDocReview .dr-preview{border-right:none;border-bottom:1px solid rgba(148,163,184,.35);min-height:46vh;}",
      "#lhDocReview .dr-preview iframe{position:static;display:block;height:46vh;}}",
      "@media (max-width:768px){",
      "#lhDocReview .dr-mobile-note{display:flex;}",
      "#lhDocReview .dr-preview{min-height:0;}",
      "#lhDocReview .dr-preview iframe,#lhDocReview .dr-spinner,#lhDocReview .dr-fallback{display:none !important;}}",
      "@media (prefers-reduced-motion:reduce){#lhDocReview .dr-modal{animation:none;}}",
      "html.lh-doc-review-open,html.lh-doc-review-open body{overflow:hidden !important;}"
    ].join("");
    var st = document.createElement("style");
    st.id = STYLE_ID;
    st.textContent = css;
    document.head.appendChild(st);
  }

  function build() {
    if (overlay) return;
    ensureStyle();
    overlay = document.createElement("div");
    overlay.id = "lhDocReview";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.innerHTML =
      '<div class="dr-modal">' +
        '<div class="dr-head">' +
          '<div style="display:flex;align-items:center;gap:12px;min-width:0;">' +
            '<span class="dr-ico" id="lhDrIco"><i class="fa-solid fa-file"></i></span>' +
            '<h2 id="lhDrName"></h2>' +
          '</div>' +
          '<button class="dr-close" type="button" id="lhDrClose" title="Đóng chi tiết" aria-label="Đóng">✕</button>' +
        '</div>' +
        '<div class="dr-body">' +
          '<div class="dr-preview">' +
            '<div class="dr-mobile-note">' +
              '<i class="fa-solid fa-triangle-exclamation"></i>' +
              '<span><b>Chế độ xem trước chỉ có thể được sử dụng trên desktop</b><br>' +
              'Để xem file trên điện thoại, vui lòng bấm nút <b>Mở file gốc</b> hoặc <b>Tải xuống</b> bên dưới.</span>' +
            '</div>' +
            '<div class="dr-spinner" id="lhDrSpinner"><div class="sp"></div><span>Đang tải file...</span></div>' +
            '<iframe id="lhDrFrame" title="Xem trước tài liệu" allowfullscreen></iframe>' +
            '<div class="dr-fallback" id="lhDrFallback"><div>' +
              '<i class="fa-solid fa-file"></i>' +
              '<h3 style="margin:0 0 8px;">Không thể xem trước trong trình duyệt</h3>' +
              '<p>Loại file này không hỗ trợ nhúng xem trước. Vui lòng nhấn <b>Mở file gốc</b> ở khung bên phải.</p>' +
            '</div></div>' +
          '</div>' +
          '<aside class="dr-info">' +
            '<p class="dr-desc" id="lhDrDesc"></p>' +
            '<ul class="dr-meta">' +
              '<li><span class="mi" id="lhDrCatIco"><i class="fa-solid fa-tag"></i></span><span class="ml">Nhóm</span><span class="mv" id="lhDrCat"></span></li>' +
              '<li><span class="mi"><i class="fa-solid fa-link"></i></span><span class="ml">Nguồn</span><span class="mv" id="lhDrSrc"></span></li>' +
              '<li><span class="mi"><i class="fa-solid fa-file-arrow-down"></i></span><span class="ml">Kích thước</span><span class="mv" id="lhDrSize"></span></li>' +
              '<li><span class="mi"><i class="fa-solid fa-calendar-days"></i></span><span class="ml">Ngày đăng</span><span class="mv" id="lhDrDate"></span></li>' +
              '<li><span class="mi"><i class="fa-solid fa-user"></i></span><span class="ml">Người đăng</span><span class="mv" id="lhDrAuthor"></span></li>' +
            '</ul>' +
            '<div class="dr-actions">' +
              '<a class="dr-btn dr-btn-primary" id="lhDrOpen" target="_blank" rel="noopener"><i class="fa-solid fa-up-right-from-square"></i> Mở file gốc</a>' +
              '<a class="dr-btn dr-btn-ghost" id="lhDrDl" target="_blank" rel="noopener"><i class="fa-solid fa-download"></i> Tải xuống</a>' +
            '</div>' +
          '</aside>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeDocReview();
    });
    document.getElementById("lhDrClose").addEventListener("click", function () { closeDocReview(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlay && overlay.classList.contains("show")) closeDocReview();
    });
  }

  function openDocReview(doc, source) {
    if (!doc) return;
    build();
    srcWin = source || null;
    lastFocus = document.activeElement;

    var ico = document.getElementById("lhDrIco");
    ico.style.background = doc.iconBg || "#64748b";
    ico.innerHTML = '<i class="' + (doc.iconClass || "fa-solid fa-file") + '"></i>';

    document.getElementById("lhDrName").textContent = doc.name || "";
    document.getElementById("lhDrDesc").textContent = doc.description || "Chưa có mô tả.";

    var catEl = document.getElementById("lhDrCat");
    catEl.textContent = doc.category || "Chung";
    catEl.style.color = doc.catColor || "";
    var catIco = document.getElementById("lhDrCatIco");
    if (catIco) {
      catIco.style.background = doc.catColor ? "color-mix(in srgb, " + doc.catColor + " 15%, transparent)" : "";
      catIco.style.color = doc.catColor || "";
    }

    document.getElementById("lhDrSrc").textContent = doc.sourceLabel || "Khác";
    document.getElementById("lhDrSize").textContent = doc.size || "—";
    document.getElementById("lhDrDate").textContent = fmtDate(doc.date);
    document.getElementById("lhDrAuthor").textContent = doc.author || "—";

    var openBtn = document.getElementById("lhDrOpen");
    openBtn.href = doc.url || "#";
    var dlBtn = document.getElementById("lhDrDl");
    dlBtn.href = doc.downloadUrl || doc.url || "#";
    if (/^\.\.?\//.test(doc.url) || String(doc.url || "").indexOf(location.origin) === 0) {
      dlBtn.setAttribute("download", "");
    } else {
      dlBtn.removeAttribute("download");
    }

    var f = document.getElementById("lhDrFrame");
    var sp = document.getElementById("lhDrSpinner");
    var fb = document.getElementById("lhDrFallback");
    f.removeAttribute("src");
    sp.style.display = "grid";
    fb.style.display = "none";

    if (doc.embeddable && doc.embedUrl) {
      f.style.display = "block";
      f.onload = function () { sp.style.display = "none"; };
      f.setAttribute("src", doc.embedUrl);
      setTimeout(function () { sp.style.display = "none"; }, 12000);
    } else {
      f.style.display = "none";
      sp.style.display = "none";
      fb.style.display = "grid";
    }

    overlay.classList.add("show");
    // Khoá cuộn trang chính trong lúc mở popup để nền không nhảy theo.
    document.documentElement.classList.add("lh-doc-review-open");
  }

  function closeDocReview() {
    if (!overlay) return;
    overlay.classList.remove("show");
    var f = document.getElementByById("lhDrFrame");
    if (f) f.removeAttribute("src");
    document.documentElement.classList.remove("lh-doc-review-open");
    // Báo iframe nguồn bỏ trạng thái active của thẻ tài liệu.
    if (srcWin) {
      try { srcWin.postMessage({ type: "CLOSE_DOC_REVIEW" }, "*"); } catch (e) {}
    }
    srcWin = null;
    if (lastFocus && typeof lastFocus.focus === "function") {
      try { lastFocus.focus({ preventScroll: true }); } catch (e) {}
    }
    lastFocus = null;
  }

  window.openDocReview = openDocReview;
  window.closeDocReview = closeDocReview;
})();

/* ==== Ghim (sticky) header cho các tab: home, forum, blog, tài liệu ====
   CSS dùng body.sticky-header để ghim .menu và body.header-scrolled để thu gọn
   dòng chữ chạy (ticker) khi đã cuộn. Các tab khác giữ nguyên như cũ. */
const stickyHeaderTabs = ["home", "forum", "blog", "tai-lieu"];
let __stickyOn = null;
let __stickyScrolled = null;
let __menuHeight = 0;

function measureMenuHeight(){
  const menu = document.getElementById("lhMenu");
  if(!menu) return;
  const h = menu.offsetHeight;
  if(h && h !== __menuHeight){
    __menuHeight = h;
    document.documentElement.style.setProperty("--lh-menu-h", h + "px");
  }
}

function applyStickyHeader(){
  const on = stickyHeaderTabs.indexOf(currentTab) !== -1;
  if(on !== __stickyOn){
    __stickyOn = on;
    document.body.classList.toggle("sticky-header", on);
    if(on) measureMenuHeight();
  }
  const scrolled = on && window.scrollY > 4;
  if(scrolled !== __stickyScrolled){
    __stickyScrolled = scrolled;
    document.body.classList.toggle("header-scrolled", scrolled);
  }
}
window.applyStickyHeader = applyStickyHeader;

window.addEventListener("scroll", applyStickyHeader, { passive:true });
window.addEventListener("resize", function(){ if(__stickyOn) measureMenuHeight(); }, { passive:true });

// Header được nhúng bất đồng bộ (fetch header.html) -> đo lại chiều cao khi .menu xuất hiện.
(function watchMenuHeight(){
  const ph = document.getElementById("lh-header-placeholder");
  if(!ph || typeof MutationObserver === "undefined") return;
  const mo = new MutationObserver(function(){ measureMenuHeight(); });
  mo.observe(ph, { childList:true, subtree:true });
  if(document.getElementById("lhMenu")) measureMenuHeight();
})();

function sendUserToFrame(frame){
  if(!frame || !frame.contentWindow) return;
  const u = window.currentLearnHubUser;
  if(!u) return;
  try {
    frame.contentWindow.postMessage({ type:"LEARNHUB_USER", user:u }, "*");
  } catch(e){}
}

function show(id){
currentTab = id;
applyStickyHeader();

// Đổi tab -> đóng popup review tài liệu (tránh popup treo lỗi sang tab khác).
if(typeof window.closeDocReview === "function") window.closeDocReview();

const quizEl = document.getElementById("quiz");
if(quizEl) quizEl.innerHTML = "";

document.querySelectorAll('.nav-link').forEach(a => {
  a.classList.toggle('active', a.getAttribute('href') === navMap[id]);
});

allTabs.forEach(t => {
  const el = document.getElementById(t);
  if(!el) return;
  if(t === id){
    el.style.display = "block";
    if(iframeTabIds[t]){
      const frame = document.getElementById(iframeTabIds[t]);
      if(frame) sendUserToFrame(frame);
      if(autoHeightFrameIds.indexOf(iframeTabIds[t]) !== -1){
        syncAutoHeightOnShow(iframeTabIds[t]);
        setTimeout(broadcastFrameView, 60);
        setTimeout(broadcastFrameView, 400);
      }
    }
  } else {
    el.style.display = "none";
  }
});

if(id === "home"){
  window.scrollTo({ top:0, behavior:"smooth" });
} else if(stickyHeaderTabs.indexOf(id) !== -1 && iframeTabIds[id]){
  // Tab ghim header có iframe (forum/blog/tài liệu): KHÔNG tự cuộn trang, chỉ focus vào iframe.
  setTimeout(function(){
    const frame = document.getElementById(iframeTabIds[id]);
    if(!frame) return;
    try { frame.focus({ preventScroll: true }); } catch(e){ try { frame.focus(); } catch(_e){} }
  }, 50);
} else {
  setTimeout(function(){
    var el = document.getElementById(id);
    if(el) el.scrollIntoView({ behavior:"smooth", block:"start" });
  }, 50);
}

updateTabScrollTopBtn();
}

/* === NAV LINK INTERCEPTION === */
document.addEventListener('DOMContentLoaded', function(){
  document.querySelectorAll('.nav-link').forEach(function(a){
    a.addEventListener('click', function(e){
      var href = this.getAttribute('href');
      var tab = reverseNavMap[href];
      if(tab){
        e.preventDefault();
        show(tab);
      }
    });
  });
});

/* === FEATURE CARD INTERCEPTION (chuyển tab / mở chat / mở leaderboard, không nhảy trang) === */
document.addEventListener('DOMContentLoaded', function(){
  document.querySelectorAll('.feature-card[data-open]').forEach(function(card){
    card.addEventListener('click', function(e){
      e.preventDefault();
      var open = card.getAttribute('data-open');
      if(open === 'chat'){
        if(typeof toggleHubieChat === 'function') toggleHubieChat();
        return;
      }
      if(open === 'leaderboard'){
        if(typeof openLeaderboardModal === 'function') openLeaderboardModal();
        return;
      }
      if(open === 'phong-hoc' || open === 'flash' || open === 'forum' || open === 'tai-lieu'){
        if(typeof show === 'function') show(open);
      }
    });
  });
});

/* === PWA SHORTCUT DEEP LINK (?open=...) — mở tab nội bộ như bấm card tính năng === */
document.addEventListener('DOMContentLoaded', function(){
  try {
    var params = new URLSearchParams(window.location.search);
    var open = params.get("open");
    if(!open) return;
    var validTabs = ["phong-hoc", "flash", "forum", "blog", "tai-lieu", "leaderboard"];
    if(validTabs.indexOf(open) === -1) return;
    var openQuizDe = params.get("de");
    history.replaceState(null, "", window.location.pathname);
    var tries = 0;
    var iv = setInterval(function(){
      tries++;
      // Khách chưa đăng nhập: không vào tab tính năng, đẩy qua login (Blog cho đọc tự do)
      if(window.__lhGuest && open !== "blog"){
        clearInterval(iv);
        window.location.href = "login.html";
        return;
      }
      if(!window.__lhGuest && !window.currentLearnHubUser && tries < 32) return;
      clearInterval(iv);
      // Hiện màn che ngay khi user đã đăng nhập (trước khi chuyển tab phòng học) để chặn bấm lung tung
      if(open === "phong-hoc" && openQuizDe){
        if(typeof showDeepLinkOverlay === "function") showDeepLinkOverlay(true);
      }
      setTimeout(function(){
        if(open === "leaderboard"){
          if(typeof openLeaderboardModal === "function") openLeaderboardModal();
          return;
        }
        if(typeof show === "function") show(open);
        if(open === "phong-hoc" && openQuizDe){
          requestOpenQuiz(openQuizDe);
        }
      }, 300);
    }, 250);
  } catch(e){}
});

/* === Màn che loading khi mở bài test qua deep link (?open=phong-hoc&de=...) === */
var _dlOverlay = null;
var _dlOverlayTimer = null;
function showDeepLinkOverlay(on){
  if(!_dlOverlay){
    var dv = document.createElement("div");
    dv.id = "deepLinkOverlay";
    dv.innerHTML =
      '<div class="deep-link-box">' +
        '<div class="loading-dots">' +
          '<span class="loading-dot"></span>' +
          '<span class="loading-dot"></span>' +
          '<span class="loading-dot"></span>' +
          '<span class="loading-dot"></span>' +
        '</div>' +
        '<p id="deepLinkText">Đang mở bài test...</p>' +
      '</div>';
    document.body.appendChild(dv);
    _dlOverlay = dv;
  }
  if(on){
    _dlOverlay.style.display = "flex";
    if(_dlOverlayTimer) { clearTimeout(_dlOverlayTimer); _dlOverlayTimer = null; }
    // An toàn: nếu mở lỗi vẫn tự ẩn sau 6s để không kẹt màn che
    _dlOverlayTimer = setTimeout(function(){ showDeepLinkOverlay(false); }, 6000);
  } else {
    _dlOverlay.style.display = "none";
    if(_dlOverlayTimer) { clearTimeout(_dlOverlayTimer); _dlOverlayTimer = null; }
  }
}

/* === Mở thẳng một bài test trong phòng học qua deep link (?open=phong-hoc&de=...) === */
function requestOpenQuiz(de){
  var frame = document.getElementById("phongHocFrame");
  if(!frame || !frame.contentWindow){ showDeepLinkOverlay(false); return; }
  var acked = false;
  window.addEventListener("message", function handler(ev){
    if(!ev.data || ev.data.type !== "OPEN_QUIZ_ACK") return;
    acked = true;
    clearInterval(rv);
    window.removeEventListener("message", handler);
    showDeepLinkOverlay(false);
    if(ev.data.ok === false){
      var missingDe = ev.data.de || de;
      window.location.href = "/404.html?open=phong-hoc&de=" + encodeURIComponent(missingDe);
    }
  });
  var rv = setInterval(function(){
    if(acked) { clearInterval(rv); return; }
    try { if(frame.contentWindow) frame.contentWindow.postMessage({ type: "OPEN_QUIZ", de: de }, "*"); } catch(e){}
  }, 250);
  setTimeout(function(){ if(!acked) { clearInterval(rv); showDeepLinkOverlay(false); } }, 12000);
  try { if(frame.contentWindow) frame.contentWindow.postMessage({ type: "OPEN_QUIZ", de: de }, "*"); } catch(e){}
}

function updateTabScrollTopBtn(){
  const btn = document.getElementById("tabScrollTopBtn");
  if(!btn) return;
  const isHome = currentTab === "home";
  if(!isHome && currentTab !== "flash" && currentTab !== "forum" && currentTab !== "blog" && currentTab !== "tai-lieu"){
    btn.style.display = "none";
    return;
  }

  let scrolled = isHome ? window.scrollY > 200 : window.scrollY > 20;

  if(!isHome){
    const frameId = iframeTabIds[currentTab] || "";
    const frame = frameId ? document.getElementById(frameId) : null;
    if(frame && frame.contentWindow){
      try {
        scrolled = frame.contentWindow.scrollY > 20 || window.scrollY > 20;
      } catch (e) {
        scrolled = window.scrollY > 20;
      }
    }
  }

  btn.style.display = scrolled ? "flex" : "none";
}

window.addEventListener("scroll", updateTabScrollTopBtn, { passive: true });

const tabScrollTopBtn = document.getElementById("tabScrollTopBtn");
if(tabScrollTopBtn){
  tabScrollTopBtn.addEventListener("click", () => {
  const frameId = iframeTabIds[currentTab] || "";
  const frame = frameId ? document.getElementById(frameId) : null;

    if (frame && frame.contentWindow) {
      try {
        frame.contentWindow.scrollTo({ top: 0, behavior: "smooth" });
      } catch (e) {
        // Ignore và cuộn trang ngoài nếu không truy cập được
      }
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

function bindFrameScrollWatcher(frameId){
  const frame = document.getElementById(frameId);
  if(!frame) return;

  const attach = () => {
    try {
      if (frame.contentWindow) {
        frame.contentWindow.addEventListener("scroll", updateTabScrollTopBtn, { passive: true });
      }
    } catch (e) {
      // Cross-origin thì bỏ qua, vẫn còn scroll listener của window
    }
  };

  frame.addEventListener("load", attach);
  attach();
}

bindFrameScrollWatcher("flashHubFrame");
bindFrameScrollWatcher("forumFrame");
bindFrameScrollWatcher("blogFrame");
bindFrameScrollWatcher("taiLieuFrame");
bindFrameScrollWatcher("phongHocFrame");

function attachFrameWheelHandoff(frameId){
  const frame = document.getElementById(frameId);
  if(!frame) return;

  const attach = () => {
    try {
      const frameWindow = frame.contentWindow;
      const frameDoc = frame.contentDocument || (frameWindow && frameWindow.document);
      if(!frameWindow || !frameDoc) return;
      if(frame.dataset.wheelHandoffBound === "true") return;

      frame.dataset.wheelHandoffBound = "true";

      const handoffWheel = (e) => {
        if(window.innerWidth <= 900) return;
        if(e.ctrlKey) return;

        const root = frameDoc.scrollingElement || frameDoc.documentElement || frameDoc.body;
        if(!root) return;

        const dy = e.deltaY;

        // [FIX BUG #5] Nếu con trỏ đang nằm trong một phần tử cuộn được bên trong iframe
        // (modal/detail/panel có overflow) và phần tử đó còn cuộn được theo hướng lăn,
        // thì để nó tự cuộn — KHÔNG chuyển wheel ra window (trước đây bị chặn khi iframe
        // được resize full-height nên root không có scrollbar -> maxScrollTop <= 0).
        let node = e.target;
        let guard = 0;
        while (node && node.nodeType === 1 && node !== frameDoc.body && node !== frameDoc.documentElement && guard++ < 50) {
          let style = null;
          try { style = frameDoc.defaultView.getComputedStyle(node); } catch (_) {}
          if (style) {
            const oy = style.overflowY;
            const ox = style.overflowX;
            const scrollable = (oy === "auto" || oy === "scroll" || ox === "auto" || ox === "scroll");
            if (scrollable && node.scrollHeight > node.clientHeight + 1) {
              const canScrollDown = node.scrollTop < (node.scrollHeight - node.clientHeight - 2);
              const canScrollUp = node.scrollTop > 2;
              if ((dy > 0 && canScrollDown) || (dy < 0 && canScrollUp)) {
                return; // để phần tử bên trong tự cuộn
              }
            }
          }
          node = node.parentElement;
        }

        const maxScrollTop = Math.max(0, root.scrollHeight - root.clientHeight);
        const atTop = root.scrollTop <= 0;
        const atBottom = root.scrollTop >= maxScrollTop - 1;

        const shouldHandoff =
          maxScrollTop <= 0 ||
          (dy < 0 && atTop) ||
          (dy > 0 && atBottom);

        if(shouldHandoff){
          window.scrollBy({ top: dy, behavior: "auto" });
          e.preventDefault();
          updateTabScrollTopBtn();
        }
      };

      frameDoc.addEventListener("wheel", handoffWheel, { passive: false });
    } catch (e) {}
  };

  frame.addEventListener("load", () => {
    frame.dataset.wheelHandoffBound = "false";
    attach();
  });

  attach();
}

attachFrameWheelHandoff("forumFrame");
attachFrameWheelHandoff("flashHubFrame");
attachFrameWheelHandoff("blogFrame");
attachFrameWheelHandoff("taiLieuFrame");
attachFrameWheelHandoff("phongHocFrame");

const popup = document.getElementById("popup");
const box = document.querySelector(".popup-box");
const closeBtn = document.querySelector(".close");
const mainPopupTitleEl = document.getElementById("mainPopupTitle");
const mainPopupMessageEl = document.getElementById("mainPopupMessage");

function closeMainPopup(){
  if(popup){
    popup.style.display = "none";
  }
  const mode = window.lastWelcomePopupShowMode;
  if(mode === "daily"){
    const now = new Date();
    const todayStr = now.getFullYear() + "-" + String(now.getMonth()+1).padStart(2,"0") + "-" + String(now.getDate()).padStart(2,"0");
    localStorage.setItem("learnhub_welcome_popup_daily", todayStr);
  } else {
    if(window.lastWelcomePopupVersion){
      localStorage.setItem("learnhub_welcome_popup_seen", window.lastWelcomePopupVersion);
    }
  }
}

function safeHtml(html) {
  if (window.DOMPurify && typeof window.DOMPurify.sanitize === "function") {
    return window.DOMPurify.sanitize(html);
  }
  return String(html ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function showMainPopup(title, message){
  if(mainPopupTitleEl){
    mainPopupTitleEl.textContent = title || "📢 Thông báo";
  }
  if(mainPopupMessageEl){
    mainPopupMessageEl.innerHTML = safeHtml(message || "");
  }
  if(popup){
    popup.style.display = "flex";
  }
  playNotificationSound();
}

window.showMainPopup = showMainPopup;
window.closeMainPopup = closeMainPopup;

if(closeBtn && popup){
  closeBtn.addEventListener("click", closeMainPopup);
}

if(popup && box){
  popup.addEventListener("click", (e) => {
    if(e.target === popup){
      closeMainPopup();
    }
  });
}

document.addEventListener("keydown", (e) => {
  if(e.key === "Escape" && popup && getComputedStyle(popup).display !== "none"){
    closeMainPopup();
  }
});

if(box){
  box.addEventListener("click", (e) => {
    e.stopPropagation();
  });
}

function playNotificationSound(soundId = "thongbaoSound"){
  const audio = document.getElementById(soundId);
  if(!audio) return;

  // Reset audio to start
  audio.currentTime = 0;
audio.muted = false;
audio.volume = 1;

  // Play with error handling for autoplay restrictions
  audio.play().catch(() => {
    // Nếu trình duyệt chặn tự động phát, bỏ qua (không cần thông báo lỗi).
    // Lần tương tác đầu tiên của user sẽ chạy unlockAudio để mở khoá cho các lần sau.
  });
}

// Mở khoá autoplay sau lần tương tác đầu tiên của người dùng.
// Không có bước này, thông báo realtime đến mà chưa bấm gì sẽ bị trình duyệt chặn tiếng.
// Dùng play() ở volume 0 (không gây tiếng "bùm" khi unlock) để load + mở khoá element,
// sau đó các lần play thật sẽ phát bình thường.
(function unlockAudio(){
  const ids = ["realtimeSound", "thongbaoSound", "openpopup", "offtest"];
  function tryUnlock(){
    let loaded = false;
    ids.forEach(function(id){
      const a = document.getElementById(id);
      if(!a) return;
      a.muted = true;
      a.volume = 0;
      try {
        const p = a.play();
        if(p && p.then){
          p.then(function(){
            // Nếu có một play() thật (có tiếng) đang chạy trong cùng lượt click
            // (vd: bấm avatar mở popup), KHÔNG pause để tránh nuốt mất tiếng.
            if (a.muted === true) {
              a.pause();
              a.currentTime = 0;
            }
a.muted = false;
a.volume = 1;
loaded = true;
          }).catch(function(){});
        }
      } catch(e) {}
    });
    if(loaded){
      document.removeEventListener("click", tryUnlock);
      document.removeEventListener("touchstart", tryUnlock);
      document.removeEventListener("pointerdown", tryUnlock);
      document.removeEventListener("keydown", tryUnlock);
    }
  }
  document.addEventListener("click", tryUnlock);
  document.addEventListener("touchstart", tryUnlock);
  document.addEventListener("pointerdown", tryUnlock);
  document.addEventListener("keydown", tryUnlock);
})();

function showAuthNotice(message, type = "info", title = "", durationMs = 2600, soundId = "thongbaoSound", icon){
  if(window.lhToast){
    lhToast(message, {
      type: type === "warn" ? "warning" : type,
      title: title || undefined,
      durationMs: Math.max(1200, Number(durationMs) || 2600),
      icon: icon || undefined,
      sound: /realtime/i.test(soundId || "") ? "realtime" : "thongbao"
    });
  }
}

window.showAuthNotice = showAuthNotice;

// Hiển thị tab mặc định khi trang load
document.addEventListener("DOMContentLoaded", () => {
  show('home');
});
  const feedbackOverlay = document.getElementById('lh-feedback-overlay');

  // Hàm mở popup
  function openFeedbackModal() {
    feedbackOverlay.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Khóa cuộn trang chính để tập trung điền form
  }

  // Hàm đóng popup
  function closeFeedbackModal() {
    feedbackOverlay.style.display = 'none';
    document.body.style.overflow = ''; // Mở khóa cuộn trang
    
    // Reset lại iframe về trạng thái ban đầu để xóa dữ liệu cũ khi mở lại lần sau
    const iframe = feedbackOverlay.querySelector('iframe');
    if (iframe) iframe.src = iframe.src;
  }

  // Đóng khi click ra vùng vùng trống ngoài rìa popup
  function closeFeedbackModalByOverlay(event) {
    if (event.target === feedbackOverlay) {
      closeFeedbackModal();
    }
  }
function updateTime(){
const now = new Date();
const time = now.toLocaleTimeString("vi-VN");
const el = document.getElementById("currentTime");
if(el) el.innerText = time;
}

setInterval(updateTime,1000);
updateTime();
function toggleUserPopup(){
let pop = document.getElementById("userPopup");
if(!pop) return;

const willOpen = getComputedStyle(pop).display === "none";
pop.style.display = willOpen ? "block" : "none";
const ov = document.getElementById("ccOverlay");
if(ov) ov.classList.toggle("cc-overlay-open", willOpen);
if(willOpen && !document.body.classList.contains("cc-reduced")){
  pop.classList.remove("cc-pop");
  void pop.offsetWidth;
  pop.classList.add("cc-pop");
  const stopPopAnim = () => {
    pop.classList.remove("cc-pop");
    pop.removeEventListener("animationend", stopPopAnim);
  };
  pop.addEventListener("animationend", stopPopAnim);
  setTimeout(stopPopAnim, 400);
}
}
function updateProgress(percent){
  const fill = document.getElementById("progressFill");
  const text = document.getElementById("progressText");

  fill.style.width = percent + "%";
  text.textContent = percent + "%";

  if(percent >= 100){
    fill.classList.add("complete");

    setTimeout(() => {
      document.getElementById("mainContent").classList.add("show");
    }, 800);
  }
}
const toggle = document.getElementById("darkModeToggle");

// 🔥 Danh sách các iframe cần đồng bộ dark mode (bị thiếu trước đây -> gây lỗi khi tắt dark mode)
const darkModeFrames = [
    document.getElementById("forumFrame"),
    document.getElementById("flashHubFrame"),
    document.getElementById("blogFrame"),
    document.getElementById("taiLieuFrame"),
    document.getElementById("phongHocFrame"),
    document.getElementById("chatbotFrame")
].filter(Boolean);

// Hàm gửi tín hiệu sang các iframe cần đồng bộ dark mode
function sendDarkModeToIframe(isDark) {
    darkModeFrames.forEach((frame) => {
        if (frame && frame.contentWindow) {
            frame.contentWindow.postMessage({ type: 'DARK_MODE', value: isDark }, '*');
        }
    });
}

// Đồng bộ trạng thái "giảm chuyển động" sang iframe
const reducedMotionFrames = [
    document.getElementById("forumFrame"),
    document.getElementById("blogFrame"),
    document.getElementById("taiLieuFrame"),
    document.getElementById("chatbotFrame")
].filter(Boolean);

function sendReducedMotionToIframe(isReduced) {
    reducedMotionFrames.forEach((frame) => {
        if (frame && frame.contentWindow) {
            frame.contentWindow.postMessage({ type: 'REDUCED_MOTION', value: isReduced }, '*');
        }
    });
}

window.syncReducedMotionToIframes = function () {
    const isReduced = document.body.classList.contains("cc-reduced");
    sendReducedMotionToIframe(isReduced);
};

// 1. Load lại trạng thái cũ khi vừa mở web — luôn sync dark mode + reduced motion khi iframe reload
if(toggle){
    const syncOnLoad = (frame) => {
        if(!frame) return;
        frame.addEventListener("load", () => {
            const isDark = document.body.classList.contains("dark-mode");
            if(isDark) sendDarkModeToIframe(true);
            const isReduced = document.body.classList.contains("cc-reduced");
            if(isReduced) sendReducedMotionToIframe(true);
            if(typeof sendUserToAllFrames === "function") sendUserToAllFrames();
        }, { once: false });
    };

    if(localStorage.getItem("darkMode") === "on"){
        document.body.classList.add("dark-mode");
        toggle.checked = true;
        darkModeFrames.forEach(syncOnLoad);
    } else {
        darkModeFrames.forEach(syncOnLoad);
    }

    // 2. Khi bấm nút gạt
    toggle.addEventListener("change", () => {
        const isDark = toggle.checked;
        
        if(isDark){
            document.body.classList.add("dark-mode");
            localStorage.setItem("darkMode", "on");
        } else {
            document.body.classList.remove("dark-mode");
            localStorage.setItem("darkMode", "off");
        }
        
        // Gửi tín hiệu ngay lập tức sang iframe
        sendDarkModeToIframe(isDark);
        try {
          lhToast(isDark ? "Đã bật chế độ tối." : "Đã tắt chế độ tối — quay lại giao diện sáng.", {
            type: "info",
            title: isDark ? "Chế độ tối" : "Chế độ sáng",
            durationMs: 2500
          });
        } catch (e) {}
    });
}
// Gán sự kiện click cho tất cả các nút trong Menu
/* ================= TỐI ƯU CHO PAGESPEED ================= */
// Hàm phát nhạc thông minh hơn
function playSound(id) {
    const audio = document.getElementById(id);
    if (audio) {
        // Bỏ mute/volume 0 nếu unlockAudio từng đặt (tránh phát ra tiếng nhưng bị câm)
audio.muted = false;
audio.volume = 1;
audio.currentTime = 0;
        // Thêm .catch để PSI không báo lỗi khi trình duyệt chặn tự phát
        audio.play().catch(() => {}); 
    }
}

// Gom tất cả click vào một chỗ để trình duyệt xử lý mượt hơn
document.addEventListener('click', function(e) {
    const target = e.target;

    // Nút Đóng bài (Check chữ hoặc class)
    if (target.classList.contains('close-btn') || target.innerText === "Đóng bài") playSound("offtest");
    
    // Nút mở Popup Avatar
    if (target.closest('.avatar-box')) playSound("openpopup");
});

// Nghe sự kiện Supabase realtime (forum_events) — Chặn tiếng kêu lúc mới load
if (typeof window.supabaseClient !== 'undefined') {
  let isFirstLoad = true;
  const supabaseEvents = window.supabaseClient.channel('events-sound');
  let _evtBound = false;
  const _bindEvt = () => {
    if (_evtBound) return;
    _evtBound = true;
    supabaseEvents
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "forum_events" }, (payload) => {
        if (isFirstLoad) {
          isFirstLoad = false;
          return;
        }
        const ev = payload.new;
        if (ev && ev.time && (Date.now() - ev.time < 5000)) { // Chỉ phát nếu sự kiện mới trong 5s
          let sId = ev.type === "post" ? "soundPost" : (ev.type === "like" ? "soundLike" : "soundDislike");
          playSound(sId);
        }
      })
      .subscribe();
  };
  document.addEventListener('DOMContentLoaded', _bindEvt);
  _bindEvt();
}
// ==================== SCROLL LOCK GIỮ VỊ TRÍ CUỘN ====================
// Khóa cuộn bằng overflow:hidden trên html/body (KHÔNG dời body bằng
// position:fixed như trước). Cách này giữ nguyên vị trí cuộn khi mở popup
// -> không làm ẩn giao diện chính và không mất nội dung phía dưới.
function lhLockBodyScroll() {
  if (document.documentElement.dataset.lhChatScrollLock === "1") return;
  const y = window.scrollY || document.documentElement.scrollTop || 0;
  document.documentElement.dataset.lhChatScrollLock = "1";
  document.body.dataset.scrollLockY = String(y);
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
}
function lhUnlockBodyScroll() {
  if (document.documentElement.dataset.lhChatScrollLock !== "1") return;
  delete document.documentElement.dataset.lhChatScrollLock;
  document.documentElement.style.overflow = "";
  document.body.style.overflow = "";
  const y = parseInt(document.body.dataset.scrollLockY || "", 10);
  delete document.body.dataset.scrollLockY;
  if (Number.isFinite(y) && y > 0) window.scrollTo(0, y);
}

let chatBtn, frame, overlay;

function initAccessibilityButton() {
  chatBtn = document.getElementById("accessibilityButton");
  frame = document.getElementById("chatbotFrame");
  overlay = document.getElementById("chatOverlay");

  if (!chatBtn) return;

  chatBtn.addEventListener("click", () => {
    if (hasMoved) return;
    toggleHubieChat();
  });

  chatBtn.addEventListener("pointerdown", dragStart);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAccessibilityButton);
} else {
  initAccessibilityButton();
}

let isDragging = false;
let startX, startY;
let currentX = 0;
let currentY = 0;
let xOffset = 0;
let yOffset = 0;
let hasMoved = false;

// Tối ưu hóa bằng requestAnimationFrame
let rafId = null;

document.addEventListener("pointermove", drag);
document.addEventListener("pointerup", dragEnd);

function dragStart(e) {
  if (e.button !== 0) return;
  
  e.preventDefault();
  isDragging = true;
  hasMoved = false;
  chatBtn.style.transition = "none";
  chatBtn.style.cursor = "grabbing";

  startX = e.clientX - xOffset;
  startY = e.clientY - yOffset;
  
  chatBtn.setPointerCapture(e.pointerId);
}

// Giới hạn trục dọc: không cho kéo bong bóng ra ngoài màn hình (trên/dưới)
function clampYOffset() {
  const height = chatBtn.offsetHeight || 56;
  const baseBottom = 20; // offset gốc bottom: 20px
  const margin = 4; // chừa lề an toàn
  const baseTop = window.innerHeight - baseBottom - height;
  yOffset = Math.max(margin - baseTop, Math.min(yOffset, baseBottom - margin));
}

function drag(e) {
  if (!isDragging) return;
  e.preventDefault();

  currentX = e.clientX - startX;
  currentY = e.clientY - startY;

  // Kiểm tra nếu thực sự có di chuyển
  if (Math.abs(currentX - xOffset) > 2 || Math.abs(currentY - yOffset) > 2) {
    hasMoved = true;
  }

  xOffset = currentX;
  yOffset = currentY;
  clampYOffset();

  if (!rafId) {
    rafId = requestAnimationFrame(updatePosition);
  }
}

function updatePosition() {
  // Sử dụng translate3d để cực kỳ mượt mà
  chatBtn.style.transform = `translate3d(${xOffset}px, ${yOffset}px, 0)`;
  rafId = null;
  repositionPopupIfOpen();
}

// Đặt popup sát bên bong bóng Hubie, luôn nằm gọn trong màn hình
function positionPopupNearBubble() {
  if (!chatBtn) return;
  const bubble = chatBtn.getBoundingClientRect();
  const frame = document.getElementById("chatbotFrame");
  if (!frame) return;

  const margin = 8;
  const gap = 10;
  const frameW = Math.min(window.innerWidth * 0.9, 380);
  const frameH = Math.min(window.innerHeight * 0.7, 520);

  // Ngang: mở về bên phải nếu đủ chỗ, không thì trồi sang trái, luôn giữ trong màn hình
  let left = bubble.left;
  if (left + frameW > window.innerWidth - margin) {
    left = bubble.right - frameW;
  }
  left = Math.max(margin, Math.min(left, window.innerWidth - frameW - margin));

  // Dọc: ưu tiên mở phía trên bong bóng, thiếu chỗ thì mở phía dưới
  let top = bubble.top - frameH - gap;
  if (top < margin) {
    top = bubble.bottom + gap;
  }
  top = Math.max(margin, Math.min(top, window.innerHeight - frameH - margin));

  frame.style.left = left + "px";
  frame.style.top = top + "px";
  frame.style.bottom = "auto";
  frame.style.width = frameW + "px";
  frame.style.height = frameH + "px";
}

// Chỉ chạy khi popup đang mở (không ảnh hưởng khi đóng)
function repositionPopupIfOpen() {
  const fr = document.getElementById("chatbotFrame");
  if (fr && fr.style.display !== "none") {
    positionPopupNearBubble();
  }
}

function dragEnd() {
  if (!isDragging) return;

  isDragging = false;
  chatBtn.style.cursor = "grab";

  // Hiệu ứng "hít" vào cạnh gần nhất (trái hoặc phải)
  chatBtn.style.transition = "transform 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28)";

  const rect = chatBtn.getBoundingClientRect();
  const middle = window.innerWidth / 2;

  if (rect.left + rect.width / 2 > middle) {
    // Hít lề phải
    xOffset = window.innerWidth - rect.width - 40;
  } else {
    // Hít lề trái
    xOffset = 0;
  }

  clampYOffset();
  updatePosition();
}

// Khi đổi kích thước cửa sổ, giữ bong bóng nằm gọn trong màn hình
if (chatBtn) {
  window.addEventListener("resize", () => {
    clampYOffset();
    updatePosition();
  });
}

if (overlay) {
  overlay.addEventListener("click", () => {
    frame.style.display = "none";
    overlay.style.display = "none";
    lhUnlockBodyScroll();
  });
}
// ==================== CODE ĐIỀU KHIỂN SLIDESHOW TRANG CHỦ ====================
let currentHomeSlide = 0;
let homeSlideshowInterval = null;

function startHomeSlideshow() {
  const images = document.querySelectorAll('.slide-img');
  const texts = document.querySelectorAll('.slide-text-block');

  // Nếu không ở tab home hoặc không tìm thấy slide thì dừng lại không chạy lỗi code
  if (!images.length || !texts.length) return;

  // Xóa interval cũ nếu có để tránh bị nhảy nhanh dồn dập
  if (homeSlideshowInterval) clearInterval(homeSlideshowInterval);

  homeSlideshowInterval = setInterval(() => {
    // Gỡ class active của slide hiện tại
    images[currentHomeSlide].classList.remove('active');
    texts[currentHomeSlide].classList.remove('active');
    
    // Tăng chỉ số slide (vòng lặp)
    currentHomeSlide = (currentHomeSlide + 1) % images.length;
    
    // Thêm class active cho slide kế tiếp
    images[currentHomeSlide].classList.add('active');
    texts[currentHomeSlide].classList.add('active');
  }, 4000); // 4 giây tự chuyển ảnh một lần
}

// Gọi kích hoạt slideshow khi trang web vừa hoàn thành việc render (Hết loading screen)
// Bạn có thể kích hoạt nó bằng cách gọi hàm `startHomeSlideshow()` ngay sau khi ứng dụng sẵn sàng.
document.addEventListener('DOMContentLoaded', () => {
    // Có thể check thêm điều kiện tùy thuộc logic định tuyến của bạn
    startHomeSlideshow();
});
// ==================== LOGIC ĐIỀU KHIỂN POPUP GÓC HUBIE AI ====================
function toggleHubieChat() {
  const frame = document.getElementById("chatbotFrame");
  const overlay = document.getElementById("chatOverlay");
  if (!frame || !overlay) return;

  if (frame.style.display === "none" || frame.style.display === "") {
    // Ép iframe nạp/gọi lại file AI.html trực tiếp để trị dứt điểm lỗi trắng màn hình
    frame.src = "AI.html";
    positionPopupNearBubble();

    // Hiển thị popup góc và lớp overlay
    frame.style.display = "block";
    overlay.style.display = "block";
    lhLockBodyScroll();
  } else {
    // Ẩn khung chat khi đóng
    frame.style.display = "none";
    overlay.style.display = "none";
    lhUnlockBodyScroll();
  }
}

// Gắn sự kiện kích hoạt mượt mà vào nút chatButton
const chatBtnEl = document.getElementById("chatButton");
if (chatBtnEl) {
  chatBtnEl.addEventListener("pointerup", (e) => {
    if (typeof isDragging !== "undefined" && isDragging) {
      return; // Đang kéo thả nút đi chỗ khác thì không mở chat
    }
    toggleHubieChat(); // Click/Chạm cố định thì bung chatbox
  });
}

/*
 * ============================================================================
 * GỘP TỪ account-popup.js (11/2024: gộp 2 file JS của index.html thành 1)
 * Trước đây index.html load hai file: script.js rồi account-popup.js
 * (cùng thứ tự defer). Thứ tự code giữ nguyên -> hành vi không đổi.
 * ============================================================================
 */
(function () {
  const STORE_KEYS = {
    glass: "cc_glass",
    reduce: "cc_reduce",
    volume: "cc_volume",
    focus: "cc_focus_min"
  };

  const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function loadReducePref() {
    const v = localStorage.getItem(STORE_KEYS.reduce);
    if (v === "on") return true;
    if (v === "off") return false;
    return prefersReduced || (window.matchMedia && window.matchMedia("(max-width: 768px)").matches);
  }

  const prefs = {
    glass: localStorage.getItem(STORE_KEYS.glass) !== "off",
    reduce: loadReducePref()
  };

  const TRACKS = [
    { id: "7NOSDKb0HlU", name: "Lofi Beats", sub: "Radio 24/7 · Chillhop", icon: "🎧" },
    { id: "F9YF5gYj7so", name: "Piano", sub: "Piano du dương, dễ tập trung", icon: "🎹" },
    { id: "4bskZYoO0N0", name: "Thiên nhiên", sub: "Mưa & suối rừng, thư giãn", icon: "🌿" },
    { id: "LTFEmIIOvNQ", name: "Cafe", sub: "Không gian quán cà phê", icon: "☕" },
    { id: "PRAGLqfNK1o", name: "Jazz", sub: "Bossa nova ngọt ngào, ấm áp", icon: "🎷" }
  ];

  const ADMIN_PANEL_URL = "/administrator.html";
  const TEACHER_PANEL_URL = "/teacher/";

  let popup = document.getElementById("userPopup");
  let rail = document.getElementById("ccRail");
  let pill = document.getElementById("ccPill");
  let bodyEl = document.getElementById("ccBody");

  const TAB_COLORS = {
    home: "#2563eb",
    profile: "#16a34a",
    appearance: "#7c3aed",
    focus: "#d97706",
    music: "#db2777",
    install: "#0ea5e9",
    admin: "#dc2626",
    teacher: "#0891b2",
    logout: "#ef4444"
  };

  const navButtons = Array.prototype.slice.call(document.querySelectorAll(".cc-nav"));
  const paneEls = {};
  Array.prototype.slice.call(document.querySelectorAll(".cc-pane")).forEach(function (p) {
    paneEls[p.getAttribute("data-pane")] = p;
  });

  function applyPrefs() {
    document.body.classList.toggle("cc-glass-off", !prefs.glass);
    document.body.classList.toggle("cc-reduced", prefs.reduce);
    const glass = document.getElementById("ccGlassToggle");
    const reduce = document.getElementById("ccReduceToggle");
    if (glass) glass.checked = prefs.glass;
    if (reduce) reduce.checked = prefs.reduce;
  }

  function placePill() {
    if (!pill || !rail) return;
    const active = rail.querySelector(".cc-nav.cc-active");
    if (!active) { pill.style.display = "none"; return; }
    pill.style.display = "";
    pill.style.transform = "translateY(" + (active.offsetTop - pill.offsetTop) + "px)";
  }

  function setNavActive(name) {
    navButtons.forEach(function (b) {
      b.classList.toggle("cc-active", b.getAttribute("data-tab") === name);
    });
    applyPillColor(name);
    placePill();
  }

  function applyPillColor(name) {
    if (!rail) return;
    const c = TAB_COLORS[name];
    if (c) {
      rail.style.setProperty("--cc-pill-color", c);
    } else {
      rail.style.removeProperty("--cc-pill-color");
    }
  }

  function switchPane(name) {
    if (name === "profile") {
      window.location.href = "profile.html";
      return;
    }
    if (name === "admin") {
      window.open(ADMIN_PANEL_URL, "_blank");
      if (popup) popup.style.display = "none";
      return;
    }
    if (name === "teacher") {
      window.open(TEACHER_PANEL_URL, "_blank");
      if (popup) popup.style.display = "none";
      return;
    }
    if (name === "logout") {
      openLogoutConfirm();
      return;
    }
    if (name === "install") {
      doInstallApp();
      return;
    }
    const target = paneEls[name];
    if (!target) return;
    const current = bodyEl ? bodyEl.querySelector(".cc-pane-active") : null;
    if (current === target) return;

    if (current) {
      if (document.body.classList.contains("cc-reduced")) {
        current.classList.remove("cc-pane-active");
      } else {
        current.classList.add("cc-leave");
        setTimeout(function () {
          current.classList.remove("cc-pane-active", "cc-leave");
        }, 300);
      }
    }
    target.classList.add("cc-pane-active");
    setNavActive(name);
  }

  if (navButtons.length) {
    navButtons.forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        switchPane(btn.getAttribute("data-tab"));
      });
    });
  }

  function notifyPrefChange(message) {
    try { lhToast(message, { type: "info", title: "Giao diện", durationMs: 2500 }); } catch (e) {}
  }

  function bindPrefs() {
    const glass = document.getElementById("ccGlassToggle");
    if (glass) {
      glass.addEventListener("change", function () {
        prefs.glass = glass.checked;
        localStorage.setItem(STORE_KEYS.glass, prefs.glass ? "on" : "off");
        document.body.classList.toggle("cc-glass-off", !prefs.glass);
        notifyPrefChange(prefs.glass ? "Đã bật hiệu ứng kính mờ." : "Đã tắt hiệu ứng kính mờ.");
      });
    }
    const reduce = document.getElementById("ccReduceToggle");
    if (reduce) {
      reduce.addEventListener("change", function () {
        prefs.reduce = reduce.checked;
        localStorage.setItem(STORE_KEYS.reduce, prefs.reduce ? "on" : "off");
        document.body.classList.toggle("cc-reduced", prefs.reduce);
        notifyPrefChange(prefs.reduce
          ? "Đã bật giảm chuyển động — giao diện nhẹ hơn."
          : "Đã tắt giảm chuyển động — đầy đủ hiệu ứng.");
        try { if (typeof window.syncReducedMotionToIframes === "function") window.syncReducedMotionToIframes(); } catch (e) {}
      });
    }
  }

  if (popup && "MutationObserver" in window) {
    new MutationObserver(function () {
      const open = popup.style.display !== "none";
      if (open) placePill();
      const ov = document.getElementById("ccOverlay");
      if (ov) ov.classList.toggle("cc-overlay-open", open);
    }).observe(popup, { attributes: true, attributeFilter: ["style"] });
  }

  const ccOverlayEl = document.getElementById("ccOverlay");
  if (ccOverlayEl) {
    ccOverlayEl.addEventListener("click", function () {
      if (popup) popup.style.display = "none";
      ccOverlayEl.classList.remove("cc-overlay-open");
    });
  }

  window.addEventListener("resize", function () {
    placePill();
    clampFocusPos();
  });

  const focus = {
    total: 25 * 60,
    remaining: 0,
    endTs: 0,
    paused: false,
    running: false,
    timer: null,
    selected: 25
  };

  function fmtTime(sec) {
    sec = Math.max(0, Math.floor(sec));
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return m + ":" + s;
  }

  function renderFocus() {
    const time = document.getElementById("ccFocusTime");
    const bar = document.getElementById("ccFocusBar");
    const mode = document.getElementById("ccFocusMode");
    const pct = focus.total > 0 ? Math.round((focus.remaining / focus.total) * 100) : 0;
    if (time) time.textContent = fmtTime(focus.remaining);
    if (bar) bar.style.width = pct + "%";
    if (mode) {
      if (focus.remaining <= 0 && focus.running === false && focus.total > 0) {
        mode.textContent = "Hoàn tất 🎉";
      } else {
        mode.textContent = focus.paused ? "Tạm dừng" : "Đang bật";
      }
    }
  }

  function startFocusTimer() {
    focus.endTs = Date.now() + focus.remaining * 1000;
    focus.timer = setInterval(function () {
      focus.remaining = Math.max(0, Math.round((focus.endTs - Date.now()) / 1000));
      renderFocus();
      if (focus.remaining <= 0) finishFocus();
    }, 250);
  }

  function playTone() {
    if (typeof window.playSound === "function") {
      try { window.playSound("thongbaoSound"); return; } catch (e) {}
    }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
      osc.start();
      osc.stop(ctx.currentTime + 1);
    } catch (e) {}
  }

  function notifyDone() {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      try { new Notification("LearnHub Focus", { body: "Đã hoàn thành phiên Focus! 🎉" }); } catch (e) {}
    }
  }

  function enterFullscreen() {
    const el = document.documentElement;
    if (document.fullscreenElement) return;
    const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
    if (req) {
      try {
        const p = req.call(el);
        if (p && typeof p.catch === "function") p.catch(function () {});
      } catch (e) {}
    }
  }

  function exitFullscreen() {
    if (!document.fullscreenElement) return;
    const ex = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
    if (ex) {
      try { ex.call(document); } catch (e) {}
    }
  }

  function startFocus() {
    if (focus.running) return;
    if (!Number.isFinite(focus.selected) || focus.selected <= 0) focus.selected = 25;
    focus.total = focus.selected * 60;
    focus.remaining = focus.total;
    focus.running = true;
    focus.paused = false;
    enterFullscreen();
    showFocusWidget();
    if (popup) popup.style.display = "none";
    renderFocus();
    startFocusTimer();
    try {
      lhToast("Focus Mode đã bật! Tập trung hết mình trong " + focus.selected + " phút nhé 💪", { type: "success", title: "Focus Mode", durationMs: 4500 });
    } catch (e) {}
    if ("Notification" in window && Notification.permission === "default") {
      try { Notification.requestPermission(); } catch (e) {}
    }
  }

  function pauseFocus() {
    if (!focus.running || focus.paused) return;
    clearInterval(focus.timer);
    focus.timer = null;
    focus.remaining = Math.max(0, Math.round((focus.endTs - Date.now()) / 1000));
    focus.paused = true;
    renderFocus();
  }

  function resumeFocus() {
    if (!focus.running || !focus.paused) return;
    focus.paused = false;
    startFocusTimer();
    renderFocus();
  }

  function finishFocus() {
    if (focus.timer) { clearInterval(focus.timer); focus.timer = null; }
    focus.running = false;
    focus.remaining = 0;
    renderFocus();
    playTone();
    notifyDone();
    hideFocusWidget();
    const pill = document.getElementById("ccFocusPill");
    if (pill) pill.style.display = "none";
    exitFullscreen();
    const done = document.getElementById("ccDoneOverlay");
    if (done) done.classList.add("cc-open");
  }

  function stopFocus() {
    if (focus.timer) { clearInterval(focus.timer); focus.timer = null; }
    focus.running = false;
    focus.paused = false;
    hideFocusWidget();
    const pill = document.getElementById("ccFocusPill");
    if (pill) pill.style.display = "none";
    exitFullscreen();
  }

  function hideFocusWidget(showPill) {
    const w = document.getElementById("ccFocusWidget");
    if (w) w.classList.remove("cc-open");
    if (showPill) {
      const pill = document.getElementById("ccFocusPill");
      if (pill) pill.style.display = "flex";
    }
  }

  function showFocusWidget() {
    const pill = document.getElementById("ccFocusPill");
    if (pill) pill.style.display = "none";
    const w = document.getElementById("ccFocusWidget");
    if (w) {
      applyFocusPos();
      w.classList.add("cc-open");
    }
  }

  const FOCUS_POS_KEY = "ccFocusPos";

  function clampFocusPos() {
    const w = document.getElementById("ccFocusWidget");
    if (!w) return;
    if (!(w.style.left || w.style.top)) return;
    const r = w.getBoundingClientRect();
    const maxL = Math.max(8, window.innerWidth - r.width - 8);
    const maxT = Math.max(8, window.innerHeight - r.height - 8);
    let x = parseInt(w.style.left, 10);
    let y = parseInt(w.style.top, 10);
    if (!isFinite(x)) x = Math.min(20, maxL);
    if (!isFinite(y)) y = 96;
    x = Math.max(8, Math.min(x, maxL));
    y = Math.max(8, Math.min(y, maxT));
    w.style.left = x + "px";
    w.style.top = y + "px";
    w.style.right = "auto";
    w.style.bottom = "auto";
  }

  function saveFocusPos() {
    try {
      const w = document.getElementById("ccFocusWidget");
      if (!w) return;
      localStorage.setItem(FOCUS_POS_KEY, JSON.stringify({ x: w.style.left, y: w.style.top }));
    } catch (e) {}
  }

  function applyFocusPos() {
    const w = document.getElementById("ccFocusWidget");
    if (!w) return;
    try {
      const saved = JSON.parse(localStorage.getItem(FOCUS_POS_KEY) || "null");
      if (saved && isFinite(Number(saved.x)) && isFinite(Number(saved.y))) {
        w.style.left = saved.x + "px";
        w.style.top = saved.y + "px";
        w.style.right = "auto";
        w.style.bottom = "auto";
      } else {
        w.style.left = "";
        w.style.top = "";
        w.style.right = "";
        w.style.bottom = "";
      }
      clampFocusPos();
    } catch (e) {}
  }

  function enableFocusDrag() {
    const w = document.getElementById("ccFocusWidget");
    if (!w) return;
    let dragging = false;
    let sx = 0, sy = 0, ox = 0, oy = 0;
    w.addEventListener("pointerdown", function (e) {
      if (e.button !== 0) return;
      if (!e.target.closest(".cc-fw-head")) return;
      if (e.target.closest("button")) return;
      const r = w.getBoundingClientRect();
      ox = r.left; oy = r.top;
      sx = e.clientX; sy = e.clientY;
      dragging = true;
      w.classList.add("cc-dragging");
      try { w.setPointerCapture(e.pointerId); } catch (err) {}
      e.preventDefault();
    });
    w.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      const x = ox + (e.clientX - sx);
      const y = oy + (e.clientY - sy);
      w.style.left = x + "px";
      w.style.top = y + "px";
      w.style.right = "auto";
      w.style.bottom = "auto";
    });
    function endDrag() {
      if (!dragging) return;
      dragging = false;
      w.classList.remove("cc-dragging");
      clampFocusPos();
      saveFocusPos();
    }
    w.addEventListener("pointerup", endDrag);
    w.addEventListener("pointercancel", endDrag);
  }

  function initFocus() {
    const presets = document.querySelectorAll(".cc-chip[data-min]");
    const customInput = document.getElementById("ccFocusCustom");
    const setBtn = document.getElementById("ccFocusSet");
    const startBtn = document.getElementById("ccFocusStart");
    const saved = Number(localStorage.getItem(STORE_KEYS.focus)) || 25;
    focus.selected = saved;

    function applySelect(min) {
      focus.selected = min;
      localStorage.setItem(STORE_KEYS.focus, String(min));
      presets.forEach(function (c) {
        c.classList.toggle("cc-active", Number(c.getAttribute("data-min")) === min);
      });
    }

    presets.forEach(function (c) {
      c.addEventListener("click", function () { applySelect(Number(c.getAttribute("data-min"))); });
    });

    if (setBtn && customInput) {
      setBtn.addEventListener("click", function () {
        const v = parseInt(customInput.value, 10);
        if (!Number.isFinite(v) || v <= 0 || v > 180) { customInput.value = ""; return; }
        customInput.value = "";
        applySelect(v);
      });
    }

    if (startBtn) {
      startBtn.addEventListener("click", function () {
        if (customInput && customInput.value) {
          const v = parseInt(customInput.value, 10);
          if (Number.isFinite(v) && v > 0 && v <= 180) applySelect(v);
        }
        startFocus();
      });
    }

    applySelect(focus.selected);

    const pauseBtn = document.getElementById("ccFocusPause");
    const exitBtn = document.getElementById("ccFocusExit");
    if (pauseBtn) {
      pauseBtn.addEventListener("click", function () {
        if (focus.paused) {
          pauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i> Tạm dừng';
          resumeFocus();
        } else if (focus.running) {
          pauseBtn.innerHTML = '<i class="fa-solid fa-play"></i> Tiếp tục';
          pauseFocus();
        }
      });
    }
    if (exitBtn) exitBtn.addEventListener("click", stopFocus);

    const hideBtn = document.getElementById("ccFocusHide");
    const pill = document.getElementById("ccFocusPill");
    if (hideBtn) hideBtn.addEventListener("click", function () { hideFocusWidget(true); });
    if (pill) pill.addEventListener("click", showFocusWidget);

    const doneOk = document.getElementById("ccDoneOk");
    if (doneOk) {
      doneOk.addEventListener("click", function () {
        const done = document.getElementById("ccDoneOverlay");
        if (done) done.classList.remove("cc-open");
      });
    }
  }

  const music = {
    index: 0,
    playing: false,
    player: null,
    apiError: false,
    sourceType: "yt",
    isCustom: false,
    customName: "",
    audio: document.getElementById("ccCustomAudio"),
    volume: Number(localStorage.getItem(STORE_KEYS.volume)) || 70
  };

  function loadYoutubeApi() {
    return new Promise(function (resolve, reject) {
      if (window.YT && window.YT.Player) { resolve(); return; }
      let done = false;
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () {
        if (done) return;
        done = true;
        if (prev) prev();
        resolve();
      };
      const old = document.getElementById("cc-yt-api");
      if (old && old.parentNode) old.parentNode.removeChild(old);
      const s = document.createElement("script");
      s.id = "cc-yt-api";
      s.src = "https://www.youtube.com/iframe_api";
      let timer = null;
      function finish(err) {
        if (done) return;
        done = true;
        if (timer) clearTimeout(timer);
        const node = document.getElementById("cc-yt-api");
        if (node && node.parentNode) node.parentNode.removeChild(node);
        reject(err);
      }
      s.onerror = function () { finish(new Error("load")); };
      timer = setTimeout(function () { finish(new Error("timeout")); }, 15000);
      document.head.appendChild(s);
    });
  }

  function ensurePlayer() {
    return loadYoutubeApi().then(function () {
      if (music.player) return true;
      const holder = document.getElementById("ccYtPlayer");
      if (!holder) return false;
      const track = TRACKS[music.index];
      music.player = new YT.Player("ccYtPlayer", {
        height: "200",
        width: "200",
        videoId: track.id,
        playerVars: { autoplay: 0, rel: 0, playsinline: 1 },
        events: {
          onReady: function (e) {
            e.target.setVolume(music.volume);
            if (music.playing) e.target.playVideo();
          },
          onStateChange: function (e) {
            music.playing = e.data === YT.PlayerState.PLAYING;
            if (music.isCustom && e.data === YT.PlayerState.PLAYING) {
              try {
                const d = e.target.getVideoData();
                if (d && d.title && !music.customName) music.customName = d.title;
              } catch (err) {}
            }
            updateMusicUI();
            if (e.data === YT.PlayerState.ENDED) nextTrack();
          },
          onError: function () {
            music.playing = false;
            updateMusicUI();
            const err = document.getElementById("ccYtError");
            if (err) err.textContent = "Video không khả dụng. Bạn có thể thử nguồn khác.";
            if (music.isCustom) notifyMusic("Video không khả dụng. Hãy thử link khác nhé!", "error");
          }
        }
      });
      return true;
    }).catch(function () {
      music.apiError = true;
      return false;
    });
  }

  function togglePlay() {
    const err = document.getElementById("ccYtError");
    if (err) err.textContent = "";
    if (music.sourceType === "audio" && music.audio && music.audio.src) {
      if (music.playing) {
        music.audio.pause();
      } else {
        music.audio.play().catch(function () {});
      }
      return;
    }
    if (music.player) {
      if (music.playing) {
        music.player.pauseVideo();
      } else {
        music.player.playVideo();
      }
      return;
    }
    ensurePlayer().then(function (ok) {
      if (!ok) {
        music.playing = false;
        updateMusicUI();
        if (err) {
          err.textContent = location.protocol === "file:"
            ? "YouTube chỉ chạy trên bản đã deploy (https). Mở learnhubpf.pages.dev để nghe nhạc."
            : "Không thể kết nối YouTube. Hãy mở trực tiếp trên YouTube.";
        }
        window.open("https://www.youtube.com/watch?v=" + TRACKS[music.index].id, "_blank");
      } else {
        music.playing = true;
        if (music.player) music.player.playVideo();
        updateMusicUI();
      }
    });
  }

  function selectTrack(i, autoPlay) {
    if (i < 0) i = TRACKS.length - 1;
    if (i >= TRACKS.length) i = 0;
    music.index = i;
    music.isCustom = false;
    music.customName = "";
    music.sourceType = "yt";
    music.playing = false;
    stopCustomAudio();
    const err = document.getElementById("ccYtError");
    if (err) err.textContent = "";
    updateMusicUI();
    if (music.player) {
      if (autoPlay) music.player.loadVideoById(TRACKS[i].id);
      else music.player.cueVideoById(TRACKS[i].id);
    } else if (autoPlay) {
      ensurePlayer().then(function (ok) {
        if (ok && music.player && !music.isCustom && music.index === i) {
          music.player.loadVideoById(TRACKS[music.index].id);
          music.playing = true;
          music.player.playVideo();
          updateMusicUI();
        }
      });
    }
  }

  function nextTrack() { selectTrack(music.index + 1, true); }
  function prevTrack() { selectTrack(music.index - 1, true); }

  function stopCustomAudio() {
    if (!music.audio) return;
    music.audio.pause();
    music.audio.removeAttribute("src");
    try { music.audio.load(); } catch (e) {}
  }

  function extractYoutubeId(url) {
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([\w-]{11})/);
    return m ? m[1] : null;
  }

  function titleFromUrl(url) {
    try {
      const u = new URL(url);
      let name = decodeURIComponent((u.pathname.split("/").pop() || "").trim());
      if (!name && u.hostname) name = u.hostname;
      name = name.replace(/\.[a-z0-9]{2,5}$/i, "").replace(/[-_]+/g, " ").trim();
      if (name) return name;
    } catch (e) {}
    return "Nhạc tùy chỉnh";
  }

  function notifyMusic(message, type) {
    try { lhToast(message, { type: type || "info", title: "Âm nhạc" }); } catch (e) {}
  }

  function playCustom() {
    const input = document.getElementById("ccCustomUrl");
    const err = document.getElementById("ccYtError");
    const url = input ? input.value.trim() : "";
    if (err) err.textContent = "";
    if (!url) {
      if (input) input.focus();
      notifyMusic("Bạn chưa dán link nào cả! Hãy dán link YouTube hoặc link nhạc vào ô trên.", "warning");
      return;
    }
    const id = extractYoutubeId(url);
    if (id) {
      stopCustomAudio();
      music.sourceType = "yt";
      music.isCustom = true;
      music.customName = "";
      const run = function () {
        if (music.player) {
          music.player.loadVideoById(id, 0);
          music.player.playVideo();
          music.playing = true;
          try {
            const d = music.player.getVideoData();
            if (d && d.title) music.customName = d.title;
          } catch (e) {}
          updateMusicUI();
          notifyMusic('Đang phát từ link của bạn: "' + (music.customName || "Nhạc tùy chỉnh") + '"', "success");
          setTimeout(function () {
            if (music.isCustom && !music.customName) {
              try {
                const d = music.player.getVideoData();
                if (d && d.title) music.customName = d.title;
                updateMusicUI();
              } catch (e) {}
            }
          }, 1200);
        }
      };
      if (music.player) {
        run();
      } else {
        ensurePlayer().then(function (ok) {
          if (!ok) {
            music.playing = false;
            updateMusicUI();
            notifyMusic("Không thể kết nối YouTube. Kiểm tra mạng rồi thử lại nhé!", "error");
          } else {
            run();
          }
        });
      }
      return;
    }
    if (music.audio) {
      if (music.player) music.player.pauseVideo();
      music.sourceType = "audio";
      music.isCustom = true;
      music.customName = titleFromUrl(url);
      music.audio.src = url;
      music.audio.volume = music.volume / 100;
      music.audio.play().then(function () {
        music.playing = true;
        updateMusicUI();
        notifyMusic('Đang phát từ link của bạn: "' + music.customName + '"', "success");
      }).catch(function () {
        music.playing = false;
        updateMusicUI();
        notifyMusic("Không phát được link này. Hãy thử link YouTube nhé!", "error");
      });
      return;
    }
    notifyMusic("Không nhận diện được link. Hãy kiểm tra lại đường dẫn nhé!", "error");
  }

  function updateMusicUI() {
    const nowTitle = document.getElementById("ccNowTitle");
    const nowSub = document.getElementById("ccNowSub");
    const nowIcon = document.getElementById("ccNowIcon");
    const playBtn = document.getElementById("ccPlayBtn");
    const tracks = document.querySelectorAll(".cc-track");

    if (music.isCustom) {
      if (nowTitle) nowTitle.textContent = music.customName || "Nhạc tùy chỉnh";
      var sourceIcons = { yt: '<i class="fa-brands fa-youtube" style="color:#ff0000"></i>', audio: "🎵" };
      var sourceLabels = { yt: "Đang phát từ YouTube", audio: "Đang phát link trực tiếp" };
      if (nowSub) nowSub.textContent = sourceLabels[music.sourceType] || "Nhạc tùy chỉnh";
      if (nowIcon) nowIcon.innerHTML = sourceIcons[music.sourceType] || "🎵";
    } else {
      const track = TRACKS[music.index];
      if (nowTitle) nowTitle.textContent = track.name;
      if (nowSub) nowSub.textContent = track.sub;
      if (nowIcon) nowIcon.textContent = track.icon;
    }
    if (playBtn) playBtn.innerHTML = music.playing ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>';

    tracks.forEach(function (t, i) {
      t.classList.toggle("cc-active", !music.isCustom && i === music.index);
    });
  }

  function initMusic() {
    const listWrap = document.getElementById("ccTrackList");
    if (!listWrap) return;
    listWrap.innerHTML = "";
    TRACKS.forEach(function (track, i) {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "cc-track";
      row.innerHTML =
        '<span class="cc-track-icon">' + track.icon + '</span>' +
        '<span><span class="cc-track-name">' + track.name + '</span><br><span class="cc-track-sub">' + track.sub + '</span></span>' +
        '<span class="cc-track-eq"><span></span><span></span><span></span></span>';
      row.addEventListener("click", function () { selectTrack(i, music.player ? true : true); });
      listWrap.appendChild(row);
    });

    const playBtn = document.getElementById("ccPlayBtn");
    const nextBtn = document.getElementById("ccNextBtn");
    const prevBtn = document.getElementById("ccPrevBtn");
    const vol = document.getElementById("ccVolume");
    const progress = document.getElementById("ccProgress");

    if (playBtn) playBtn.addEventListener("click", togglePlay);
    if (nextBtn) nextBtn.addEventListener("click", nextTrack);
    if (prevBtn) prevBtn.addEventListener("click", prevTrack);

    if (vol) {
      vol.value = music.volume;

      var volIcon = document.getElementById("ccVolumeIcon");
      function updateVolumeIcon(v) {
        if (!volIcon) return;
        var cls = v <= 0 ? "fa-volume-xmark"
          : v <= 33 ? "fa-volume-off"
          : v <= 66 ? "fa-volume-low"
          : "fa-volume-high";
        volIcon.className = "fa-solid " + cls;
        volIcon.style.color = v <= 0 ? "#ef4444" : "";
      }
      updateVolumeIcon(music.volume);

      vol.addEventListener("input", function () {
        music.volume = Number(vol.value);
        localStorage.setItem(STORE_KEYS.volume, String(music.volume));
        if (music.player) music.player.setVolume(music.volume);
        if (music.audio && music.audio.src) music.audio.volume = music.volume / 100;
        updateVolumeIcon(music.volume);
      });
    }

    if (progress) {
      progress.addEventListener("click", function (e) {
        const rect = progress.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        if (music.sourceType === "audio" && music.audio && music.audio.src) {
          const dur = music.audio.duration;
          if (isFinite(dur) && dur > 0) music.audio.currentTime = ratio * dur;
          return;
        }
        if (!music.player) return;
        const duration = music.player.getDuration();
        if (Number.isFinite(duration) && duration > 0) {
          music.player.seekTo(ratio * duration, true);
        }
      });
    }

    setInterval(function () {
      let cur, dur;
      if (music.sourceType === "audio" && music.audio && music.audio.src) {
        if (music.audio.paused) return;
        cur = music.audio.currentTime;
        dur = isFinite(music.audio.duration) ? music.audio.duration : 0;
      } else if (music.player && music.playing) {
        cur = music.player.getCurrentTime();
        dur = music.player.getDuration();
      } else {
        return;
      }
      if (!Number.isFinite(cur)) return;
      const fill = document.getElementById("ccProgressFill");
      const curEl = document.getElementById("ccCurTime");
      const durEl = document.getElementById("ccDurTime");
      if (fill) fill.style.width = (dur > 0 ? (cur / dur) * 100 : 0) + "%";
      if (curEl) curEl.textContent = fmtTime(cur);
      if (durEl) durEl.textContent = Number.isFinite(dur) && dur > 0 ? fmtTime(dur) : "--:--";
    }, 500);

    const customPlay = document.getElementById("ccCustomPlay");
    const customUrl = document.getElementById("ccCustomUrl");
    const customClear = document.getElementById("ccCustomClear");
    if (customPlay) customPlay.addEventListener("click", playCustom);
    if (customUrl) {
      customUrl.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          playCustom();
        }
      });
    }
    if (customClear && customUrl) {
      customClear.addEventListener("click", function () {
        customUrl.value = "";
        customClear.style.display = "none";
        customUrl.focus();
      });
      customUrl.addEventListener("input", function () {
        customClear.style.display = customUrl.value ? "flex" : "none";
      });
    }
    if (music.audio) {
      music.audio.addEventListener("play", function () { music.playing = true; updateMusicUI(); });
      music.audio.addEventListener("pause", function () { music.playing = false; updateMusicUI(); });
      music.audio.addEventListener("ended", function () { nextTrack(); });
    }

    updateMusicUI();
  }

  function openLogoutConfirm() {
    const overlay = document.getElementById("ccLogoutOverlay");
    if (overlay) overlay.classList.add("cc-open");
  }

  function closeLogoutConfirm() {
    const overlay = document.getElementById("ccLogoutOverlay");
    if (overlay) overlay.classList.remove("cc-open");
  }

  function initLogout() {
    const cancelBtn = document.getElementById("ccLogoutCancel");
    const okBtn = document.getElementById("ccLogoutOk");
    if (cancelBtn) cancelBtn.addEventListener("click", closeLogoutConfirm);
    if (okBtn) {
      okBtn.addEventListener("click", function () {
        closeLogoutConfirm();
        if (typeof window.logout === "function") {
          window.logout();
        } else {
          window.location.href = "login.html";
        }
      });
    }
  }

  // [FIX BUG #3][NOTE - KHÔNG SỬA NỮA] Hiện nút Admin cho MỌI user đã đăng nhập là CHỦ ĐÍCH.
  // Lý do: trang administrator.html có bước đăng nhập/kiểm tra quyền riêng (ensureAdmin +
  // is_admin() ở RLS) nên truy cập thực tế đã bị chặn. Ẩn nút chỉ là UX, không tăng bảo mật.
  // Không lọc theo role như nút Giáo viên.
  function checkAdmin() {
    const u = window.currentLearnHubUser;
    if (!u || !u.uid) return;
    if (!window.supabaseClient) return;
    window.supabaseClient.from("users")
      .select("role")
      .eq("id", u.uid)
      .maybeSingle()
      .then(function (res) {
        const role = res && res.data ? res.data.role : null;
        const adminBtn = document.getElementById("ccNavAdmin");
        if (adminBtn) {
          adminBtn.style.display = "";
        }
        const teachBtn = document.getElementById("ccNavTeacher");
        if (teachBtn) {
          const rl = String(role || "").trim().toLowerCase();
          teachBtn.style.display = (rl === "giáo viên" || rl === "giao vien") ? "" : "none";
        }
        if (window.currentLearnHubUser) {
          window.currentLearnHubUser.role = role;
        }
        placePill();
      })
      .catch(function () {});
  }

  function waitForUser() {
    if (window.currentLearnHubUser) { checkAdmin(); return; }
    let tries = 0;
    const iv = setInterval(function () {
      tries++;
      if (window.currentLearnHubUser) {
        clearInterval(iv);
        checkAdmin();
      } else if (tries >= 40) {
        clearInterval(iv);
      }
    }, 250);
  }

  function initVersion() {
    const el = document.getElementById("ccVersionText");
    if (el) el.textContent = "© 2026 LearnHub Platform · Control Center v2.0";
  }

  /* ===== Icon cài ứng dụng (PWA) trên rail menu ===== */
  function isStandaloneDisplay() {
    return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches)
      || window.navigator.standalone === true;
  }

  function isIosSafari() {
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  }

  function updateInstallVisibility() {
    const btn = document.getElementById("ccNavInstall");
    if (!btn) return;
    if (isStandaloneDisplay()) { btn.style.display = "none"; return; }
    const canPrompt = !!window.__lhInstallPrompt;
    btn.style.display = (canPrompt || isIosSafari()) ? "" : "none";
  }

  function doInstallApp() {
    const promptEvent = window.__lhInstallPrompt;
    if (promptEvent) {
      promptEvent.prompt();
      promptEvent.userChoice.then(function (choice) {
        window.__lhInstallPrompt = null;
        if (choice && choice.outcome === "accepted") {
          try { lhToast("Đã cài LearnHub lên thiết bị 🎉", { type: "success", title: "Cài đặt thành công" }); } catch (e) {}
        }
        updateInstallVisibility();
      }).catch(function () { updateInstallVisibility(); });
      return;
    }
    if (isIosSafari()) {
      try {
        lhToast('Trên iPhone: nhấn nút Chia sẻ ⬆️ rồi chọn "Thêm vào Màn hình chính".', { type: "info", title: "Cài ứng dụng", durationMs: 6000 });
      } catch (e) {}
      return;
    }
    updateInstallVisibility();
  }

  function initInstallApp() {
    window.addEventListener("beforeinstallprompt", function (e) {
      e.preventDefault();
      window.__lhInstallPrompt = e;
      updateInstallVisibility();
    });

    window.addEventListener("appinstalled", function () {
      window.__lhInstallPrompt = null;
      const b = document.getElementById("ccNavInstall");
      if (b) b.style.display = "none";
      try { lhToast("LearnHub đã được cài lên thiết bị 🎉", { type: "success" }); } catch (e) {}
    });

    updateInstallVisibility();
  }

  applyPrefs();
  bindPrefs();
  initFocus();
  enableFocusDrag();
  initMusic();
  initLogout();
  initVersion();
  initInstallApp();
  waitForUser();
  applyPillColor("home");
  placePill();
  applyStickyHeader();
})();
