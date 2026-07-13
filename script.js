// --- Performance optimized script.js ---
const auth = window.auth;
const db = window.db;
const provider = window.provider;
const onAuthStateChanged = window.onAuthStateChanged;
const signInWithPopup = window.signInWithPopup;
const signOut = window.signOut;
const doc = window.doc;
const getDoc = window.getDoc;
const setDoc = window.setDoc;
const collection = window.collection;
const getDocs = window.getDocs;

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
  <div class="quiz-box">

    <div class="quiz-header">
      <button class="quiz-btn close-btn" onclick="closeQuiz();" style="pointer-events: all !important;">Đóng bài</button>
    </div>

    <div class="loader" id="loader">
      <div class="skel-quiz-topbar">
        <div class="skel-bar" style="width:90px;height:24px;border-radius:8px;"></div>
        <div class="skel-bar" style="width:60px;height:24px;border-radius:8px;"></div>
      </div>
      <div class="skel-bar" style="width:100%;height:16px;margin-bottom:8px;"></div>
      <div class="skel-bar" style="width:70%;height:16px;margin-bottom:16px;"></div>
      <div class="skel-bar skel-quiz-card"></div>
      <div class="skel-quiz-row">
        <div class="skel-bar" style="width:90px;height:42px;border-radius:12px;"></div>
        <div class="skel-bar" style="width:90px;height:42px;border-radius:12px;"></div>
        <div class="skel-bar" style="width:90px;height:42px;border-radius:12px;"></div>
      </div>
    </div>

    <iframe id="quizFrame" src="${link}" style="display:none;"></iframe>

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

  iframe.onload = function(){
  loader.style.display="none";
  iframe.style.display="block";

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
}
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
function show(id){
currentTab = id;

// 🔥 XÓA bài + scroll
const quizEl = document.getElementById("quiz");
if(quizEl) quizEl.innerHTML = "";
if(id !== "flash"){
window.scrollTo({ top:0, behavior:"smooth" });
}

// Active nav link
const navMap = {'home':'index.html','flash':'flashcard/hub.html','bxh':'forum.html'};
document.querySelectorAll('.nav-link').forEach(a => {
  a.classList.toggle('active', a.getAttribute('href') === navMap[id]);
});

const tabs = ["home"];

tabs.forEach(t=>{
let el = document.getElementById(t);
el.classList.remove("fade-in");
el.classList.add("fade-out");

setTimeout(()=>{
el.style.display="none";
},200);
});

setTimeout(()=>{
let active = document.getElementById(id);
active.style.display="block";

setTimeout(()=>{
active.classList.remove("fade-out");
active.classList.add("fade-in");
},10);

if(id === "flash"){
  const flashSection = document.getElementById("flash");
  const flashFrame = document.getElementById("flashHubFrame");
  if(flashSection){
    flashSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  if(flashFrame){
    setTimeout(() => {
      try { flashFrame.focus(); } catch (e) {}
    }, 450);
  }
}

},200);
updateTabScrollTopBtn();
}
// Nav links giờ là <a> tags, không cần JS handler

function updateTabScrollTopBtn(){
  const btn = document.getElementById("tabScrollTopBtn");
  if(!btn) return;
  const canShowOnTab = currentTab === "flash" || currentTab === "bxh";
  if(!canShowOnTab){
    btn.style.display = "none";
    return;
  }

  const frameId = currentTab === "flash" ? "flashHubFrame" : "forumFrame";
  const frame = document.getElementById(frameId);
  let scrolled = window.scrollY > 20;

  if(frame && frame.contentWindow){
    try {
      scrolled = frame.contentWindow.scrollY > 20 || window.scrollY > 20;
    } catch (e) {
      scrolled = window.scrollY > 20;
    }
  }

  btn.style.display = scrolled ? "flex" : "none";
}

window.addEventListener("scroll", updateTabScrollTopBtn, { passive: true });

const tabScrollTopBtn = document.getElementById("tabScrollTopBtn");
if(tabScrollTopBtn){
  tabScrollTopBtn.addEventListener("click", () => {
    const frameId = currentTab === "flash" ? "flashHubFrame" : (currentTab === "bxh" ? "forumFrame" : "");
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

        const maxScrollTop = Math.max(0, root.scrollHeight - root.clientHeight);
        const atTop = root.scrollTop <= 0;
        const atBottom = root.scrollTop >= maxScrollTop - 1;
        const dy = e.deltaY;

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

const popup = document.getElementById("popup");
const box = document.querySelector(".popup-box");
const closeBtn = document.querySelector(".close");
const mainPopupTitleEl = document.getElementById("mainPopupTitle");
const mainPopupMessageEl = document.getElementById("mainPopupMessage");

function closeMainPopup(){
  if(popup){
    popup.style.display = "none";
  }
  if(window.lastWelcomePopupVersion){
    localStorage.setItem("learnhub_welcome_popup_seen", window.lastWelcomePopupVersion);
  }
}

function showMainPopup(title, message){
  if(mainPopupTitleEl){
    mainPopupTitleEl.textContent = title || "📢 Thông báo";
  }
  if(mainPopupMessageEl){
    mainPopupMessageEl.innerHTML = message || "";
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

const authSlideData = [
  {
    title: "LearnHub – Nâng cấp cách bạn học",
    desc: "Ôn thi nhanh • Giao diện hiện đại • Tối ưu trải nghiệm"
  },
  {
    title: "Giao diện chính - Hubie AI",
    desc: "Trợ lý AI thông minh hỗ trợ học tập"
  },
  {
    title: "LearnHub Forum",
    desc: "Trao đổi • Hỏi đáp • Kết nối học sinh như một trang MXH"
  },
  {
    title: "Tính năng Smart FlashCard",
    desc: "Học từ vựng thông minh với nhiều thể loại học tập, từ vựng đa dạng"
  }
];

let authSlideIndex = 0;
let authSlideTimer = null;
let authNoticeTimer = null;

function switchAuthTab(type){
  const login = document.getElementById("authLoginPanel");
  const register = document.getElementById("authRegisterPanel");
  const tabs = document.querySelectorAll("#loginBox .auth-tab");

  tabs.forEach((tab) => tab.classList.remove("active"));

  if(type === "login"){
    if(login) login.style.display = "block";
    if(register) register.style.display = "none";
  }else{
    if(login) login.style.display = "none";
    if(register) register.style.display = "block";
  }

  const activeTab = document.querySelector(`#loginBox .auth-tab[data-auth-tab="${type}"]`);
  if(activeTab) activeTab.classList.add("active");
}

function updateAuthSlideText(index){
  const titleEl = document.getElementById("authSlideTitle");
  const descEl = document.getElementById("authSlideDesc");
  const mobileTitleEl = document.getElementById("authMobileTitle");
  const mobileDescEl = document.getElementById("authMobileDesc");
  if(!titleEl || !descEl) return;

  // Staggered text reveal - wrap each char in span
  const title = authSlideData[index].title;
  const desc = authSlideData[index].desc;
  
  // Clear content and prepare for animation
  titleEl.innerHTML = '';
  descEl.innerHTML = '';
  
  // Create staggered title animation
  title.split('').forEach((char, i) => {
    const span = document.createElement('span');
    span.className = 'char';
    span.textContent = char === ' ' ? '\u00A0' : char;
    span.style.animationDelay = `${i * 0.03}s`;
    titleEl.appendChild(span);
  });
  
  // Create description with reveal animation
  const descSpan = document.createElement('span');
  descSpan.className = 'desc-reveal';
  descSpan.textContent = desc;
  descEl.appendChild(descSpan);
  
  // Mobile version - simple fade for performance
  if(mobileTitleEl){
    mobileTitleEl.style.opacity = "0";
    setTimeout(() => {
      mobileTitleEl.textContent = title;
      mobileTitleEl.style.opacity = "1";
    }, 150);
  }
  if(mobileDescEl){
    mobileDescEl.style.opacity = "0";
    setTimeout(() => {
      mobileDescEl.textContent = desc;
      mobileDescEl.style.opacity = "1";
    }, 250);
  }
}

function initAuthSlides(){
  const desktopSlides = document.querySelectorAll("#loginBox .auth-right .auth-slide");
  const mobileSlides = document.querySelectorAll("#loginBox .auth-mobile-slide");
  if(!desktopSlides.length && !mobileSlides.length) return;

  if(desktopSlides.length){
    desktopSlides[0].classList.add("active");
  }
  if(mobileSlides.length){
    mobileSlides[0].classList.add("active");
  }
  updateAuthSlideText(0);

  if(authSlideTimer) clearInterval(authSlideTimer);

  authSlideTimer = setInterval(() => {
    const totalSlides = desktopSlides.length || mobileSlides.length;
    if(!totalSlides) return;

    const prevIndex = authSlideIndex;
    authSlideIndex = (authSlideIndex + 1) % totalSlides;

    // Simple fade transition for all slides (no image effects)
    if(desktopSlides.length){
      desktopSlides[prevIndex].classList.remove("active");
      desktopSlides[authSlideIndex].classList.add("active");
    }
    if(mobileSlides.length){
      mobileSlides[prevIndex].classList.remove("active");
      mobileSlides[authSlideIndex].classList.add("active");
    }
    
    updateAuthSlideText(authSlideIndex);
  }, 4000);
}

function playNotificationSound(soundId = "thongbaoSound"){
  const audio = document.getElementById(soundId);
  if(!audio) return;

  // Reset audio to start
  audio.currentTime = 0;
  
  // Play with error handling for autoplay restrictions
  audio.play().catch(() => {
    // Nếu trình duyệt chặn tự động phát, bỏ qua (không cần thông báo lỗi)
  });
}

function showAuthNotice(message, type = "info", title = "", durationMs = 2600, soundId = "thongbaoSound"){
  const notice = document.getElementById("authNotice");
  const noticeTitle = document.getElementById("authNoticeTitle");
  const noticeMessage = document.getElementById("authNoticeMessage");
  const noticeIcon = document.getElementById("authNoticeIcon");

  if(!notice || !noticeTitle || !noticeMessage || !noticeIcon) return;

  if(authNoticeTimer){
    clearTimeout(authNoticeTimer);
    authNoticeTimer = null;
  }

  notice.classList.remove("hide", "show", "notice-error", "notice-info", "notice-success", "notice-warning");

  // Set class and icon based on type
  let icon = "i";
  let defaultTitle = "Thông báo";
  if (type === "error") {
    notice.classList.add("notice-error");
    icon = "✕";
    defaultTitle = "Lỗi";
  } else if (type === "warning") {
    notice.classList.add("notice-warning");
    icon = "!";
    defaultTitle = "Chú ý";
  } else if (type === "success") {
    notice.classList.add("notice-success");
    icon = "✓";
    defaultTitle = "Thành công";
  } else {
    notice.classList.add("notice-info");
    icon = "i";
    defaultTitle = "Thông báo";
  }

  noticeIcon.innerText = icon;
  noticeTitle.innerText = title || defaultTitle;
  noticeMessage.textContent = message;

  notice.style.display = "flex";
  void notice.offsetWidth;
  notice.classList.add("show");

  // Play notification sound when popup appears
  playNotificationSound(soundId);

  authNoticeTimer = setTimeout(() => {
    notice.classList.remove("show");
    notice.classList.add("hide");

    setTimeout(() => {
      notice.classList.remove("hide");
      notice.style.display = "none";
    }, 220);
  }, Math.max(1200, Number(durationMs) || 2600));
}

function authComingSoon(){
  showAuthNotice(
    "Tính năng này đang phát triển. Hiện tại bạn vẫn đăng nhập bằng Google như cũ.",
    "info",
    "Tính năng sắp ra mắt"
  );
}

window.switchAuthTab = switchAuthTab;
window.authComingSoon = authComingSoon;
window.showAuthNotice = showAuthNotice;
initAuthSlides();

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

if(getComputedStyle(pop).display === "none"){
pop.style.display = "block";
} else {
closePopupActions();
pop.style.display = "none";
}
}
function togglePopupActions(event){
if(event) event.stopPropagation();
const menu = document.getElementById("popupActionsMenu");
const btn = document.getElementById("popupMoreBtn");
if(!menu || !btn) return;
const isOpen = menu.classList.toggle("show");
btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
}
function closePopupActions(){
const menu = document.getElementById("popupActionsMenu");
const btn = document.getElementById("popupMoreBtn");
if(menu) menu.classList.remove("show");
if(btn) btn.setAttribute("aria-expanded", "false");
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
    document.getElementById("chatbotFrame")
].filter(Boolean); // loại bỏ frame null nếu DOM chưa có

// Hàm gửi tín hiệu sang các iframe cần đồng bộ dark mode
function sendDarkModeToIframe(isDark) {
    darkModeFrames.forEach((frame) => {
        if (frame && frame.contentWindow) {
            frame.contentWindow.postMessage({ type: 'DARK_MODE', value: isDark }, '*');
        }
    });
}

// 1. Load lại trạng thái cũ khi vừa mở web
if(localStorage.getItem("darkMode") === "on"){
    document.body.classList.add("dark-mode");
    toggle.checked = true;
    darkModeFrames.forEach((frame) => {
        if (frame) {
            frame.onload = () => sendDarkModeToIframe(true);
        }
    });
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
});
// Gán sự kiện click cho tất cả các nút trong Menu
/* ================= TỐI ƯU CHO PAGESPEED ================= */
let isFirstLoad = true;

// Hàm phát nhạc thông minh hơn
function playSound(id) {
    const audio = document.getElementById(id);
    if (audio) {
        audio.currentTime = 0;
        // Thêm .catch để PSI không báo lỗi khi trình duyệt chặn tự phát
        audio.play().catch(() => {}); 
    }
}

// Gom tất cả click vào một chỗ để trình duyệt xử lý mượt hơn
document.addEventListener('click', function(e) {
    const target = e.target;

    // Nút Menu môn học
    if (target.closest('.menu button')) playSound("clickSound");
    
    // Nút Làm bài
    if (target.closest('.btn')) playSound("dotest");
    
    // Nút Đóng bài (Check chữ hoặc class)
    if (target.classList.contains('close-btn') || target.innerText === "Đóng bài") playSound("offtest");
    
    // Nút mở Popup Avatar
    if (target.closest('.avatar-box')) playSound("openpopup");
});

// Nghe sự kiện Firebase (Chặn tiếng kêu lúc mới load)
if (typeof db !== 'undefined') {
    db.ref("events").limitToLast(1).on("child_added", (snap) => {
        if (isFirstLoad) {
            isFirstLoad = false;
            return;
        }
        
        const ev = snap.val();
        if (ev && (Date.now() - ev.time < 5000)) { // Chỉ phát nếu sự kiện mới trong 5s
            let sId = ev.type === "post" ? "soundPost" : (ev.type === "like" ? "soundLike" : "soundDislike");
            playSound(sId);
        }
    });
}
const chatBtn = document.getElementById("chatButton");
const frame = document.getElementById("chatbotFrame");
const overlay = document.getElementById("chatOverlay");

let isDragging = false;
let startX, startY;
let currentX = 0;
let currentY = 0;
let xOffset = 0;
let yOffset = 0;
let hasMoved = false;

// Tối ưu hóa bằng requestAnimationFrame
let rafId = null;

chatBtn.addEventListener("pointerdown", dragStart);
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

  if (!rafId) {
    rafId = requestAnimationFrame(updatePosition);
  }
}

function updatePosition() {
  // Sử dụng translate3d để cực kỳ mượt mà
  chatBtn.style.transform = `translate3d(${xOffset}px, ${yOffset}px, 0)`;
  rafId = null;
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
  
  updatePosition();
}

chatBtn.addEventListener("click", () => {
  if (hasMoved) return;

  const isHidden = frame.style.display === "none";
  frame.style.display = isHidden ? "block" : "none";
  overlay.style.display = isHidden ? "block" : "none";

  if (isHidden) {
    // Gửi thông tin user (giữ nguyên logic của bạn)
    const nameEl = document.getElementById("userName");
    const avatarEl = document.getElementById("userAvatar");
    let name = nameEl ? nameEl.innerText : "Bạn học";
    const avatar = avatarEl ? avatarEl.src : "https://i.imgur.com/6VBx3io.png";

    frame.contentWindow.postMessage({
      type: "USER_INFO",
      name: name,
      avatar: avatar
    }, "*");
  }
});

overlay.addEventListener("click", () => {
  frame.style.display = "none";
  overlay.style.display = "none";
  document.body.classList.remove("no-scroll");
});
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
    
    // Hiển thị popup góc và lớp overlay
    frame.style.display = "block";
    overlay.style.display = "block";
    document.body.classList.add("no-scroll");
  } else {
    // Ẩn khung chat khi đóng
    frame.style.display = "none";
    overlay.style.display = "none";
    document.body.classList.remove("no-scroll");
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