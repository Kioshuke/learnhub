(function () {
  'use strict';

  // Prevent duplicate instances
  const EXISTING_OVERLAY = document.getElementById('ma-overlay');
  if (EXISTING_OVERLAY) {
    EXISTING_OVERLAY.remove();
  }

  // Inject Styles
  const style = document.createElement('style');
  style.id = 'ma-styles';
  style.textContent = `
    /* Root Overlay Container */
    #ma-overlay {
      position: fixed;
      inset: 0;
      z-index: 99999;
      pointer-events: none;
      overflow: hidden;
      will-change: transform;
    }

    /* --- 1. MOON --- */
    .ma-moon-wrap {
      position: absolute;
      top: 20px;
      right: 28px;
      width: 76px;
      height: 76px;
      border-radius: 50%;
      will-change: transform, opacity;
      animation: maMoonPulse 8s ease-in-out infinite alternate;
    }

    .ma-moon {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: radial-gradient(circle at 35% 35%, #fffde7 0%, #fef08a 40%, #f59e0b 85%, #d97706 100%);
      box-shadow:
        0 0 25px rgba(245, 158, 11, 0.4),
        0 0 50px rgba(245, 158, 11, 0.2),
        inset -4px -4px 12px rgba(180, 83, 9, 0.3);
      position: relative;
      overflow: hidden;
    }

    .ma-moon::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background: radial-gradient(circle at 60% 40%, rgba(180, 83, 9, 0.12) 0%, transparent 20%),
                  radial-gradient(circle at 40% 70%, rgba(180, 83, 9, 0.08) 0%, transparent 25%);
    }

    @keyframes maMoonPulse {
      0% { transform: scale(1); opacity: 0.9; }
      100% { transform: scale(1.05); opacity: 1; }
    }

    /* --- 2. SOFT CLOUDS --- */
    .ma-cloud-wrap {
      position: absolute;
      will-change: transform;
      pointer-events: none;
      filter: drop-shadow(0 4px 12px rgba(217, 119, 6, 0.15));
    }

    .ma-cloud-1 {
      top: 35px;
      left: -240px;
      opacity: 0.85;
      animation: maCloudFloat1 48s linear infinite;
    }

    .ma-cloud-2 {
      top: 80px;
      left: -300px;
      opacity: 0.65;
      animation: maCloudFloat2 68s linear infinite 12s;
    }

    @keyframes maCloudFloat1 {
      0% { transform: translate3d(0, 0, 0); }
      100% { transform: translate3d(calc(100vw + 480px), 0, 0); }
    }

    @keyframes maCloudFloat2 {
      0% { transform: translate3d(0, 0, 0); }
      100% { transform: translate3d(calc(100vw + 600px), 0, 0); }
    }

    /* --- 3. LANTERNS TOP --- */
    .ma-lantern {
      position: absolute;
      top: 0;
      will-change: transform;
      transform-origin: top center;
      filter: drop-shadow(0 8px 16px rgba(220, 38, 38, 0.3));
    }

    .ma-lantern-left-1 {
      left: 24px;
      animation: maSwing 3.5s ease-in-out infinite alternate;
    }

    .ma-lantern-left-2 {
      left: 80px;
      animation: maSwing 4.2s ease-in-out infinite alternate-reverse;
      transform: scale(0.85);
    }

    .ma-lantern-right-1 {
      right: 130px;
      animation: maSwing 3.8s ease-in-out infinite alternate-reverse;
    }

    .ma-lantern-right-2 {
      right: 185px;
      animation: maSwing 4.5s ease-in-out infinite alternate;
      transform: scale(0.8);
    }

    @keyframes maSwing {
      0% { transform: rotate(-5deg); }
      100% { transform: rotate(5deg); }
    }

    /* --- 4. BOTTOM CORNERS (Cụm tiểu cảnh Đèn Ông Sao, Đèn Cá Chép, Thỏ & Bánh Trung Thu) --- */
    .ma-bottom-corner {
      position: absolute;
      bottom: 0;
      width: 260px;
      height: 200px;
      pointer-events: none;
      filter: drop-shadow(0 6px 16px rgba(180, 83, 9, 0.22));
    }

    .ma-corner-left {
      left: 0;
    }

    .ma-corner-right {
      right: 0;
      transform: scaleX(-1);
    }

    /* --- 5. LEAVES / PETALS --- */
    .ma-leaf {
      position: absolute;
      top: -30px;
      will-change: transform, opacity;
      opacity: 0;
      filter: drop-shadow(0 2px 4px rgba(217, 119, 6, 0.2));
      animation: maLeafFall var(--fall-duration, 10s) linear infinite var(--fall-delay, 0s);
    }

    @keyframes maLeafFall {
      0% {
        transform: translate3d(0, 0, 0) rotate(0deg);
        opacity: 0;
      }
      10% {
        opacity: 0.85;
      }
      85% {
        opacity: 0.7;
      }
      100% {
        transform: translate3d(var(--sway-x, 60px), 105vh, 0) rotate(var(--rot-deg, 360deg));
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);

  // Overlay Root Element
  const overlay = document.createElement('div');
  overlay.id = 'ma-overlay';

  // --- 1. MOON ---
  const moonHTML = `
    <div class="ma-moon-wrap">
      <div class="ma-moon"></div>
    </div>
  `;

  // --- 2. CLOUDS SVG ---
  const createCloudSVG = (width, height) => `
    <div class="ma-cloud-wrap ${width === 220 ? 'ma-cloud-1' : 'ma-cloud-2'}">
      <svg width="${width}" height="${height}" viewBox="0 0 240 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M30 65 C10 65 0 50 10 35 C18 22 38 20 48 28 C58 10 88 5 108 20 C120 8 150 5 168 22 C185 10 215 18 222 35 C238 42 238 65 215 65 Z" 
              fill="url(#maCloudGrad)" 
              fill-opacity="0.85"/>
        <defs>
          <linearGradient id="maCloudGrad" x1="120" y1="5" x2="120" y2="65" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="70%" stop-color="#fef3c7"/>
            <stop offset="100%" stop-color="#fde68a"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
  `;

  const cloudsHTML = createCloudSVG(220, 75) + createCloudSVG(270, 90);

  // --- 3. LANTERNS TOP SVG ---
  const createLanternSVG = (height = 110) => `
    <svg width="44" height="${height}" viewBox="0 0 44 110" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="22" y1="0" x2="22" y2="30" stroke="#d97706" stroke-width="1.2"/>
      <rect x="15" y="30" width="14" height="4" rx="1.5" fill="#b45309"/>
      <path d="M7 42 C7 34, 37 34, 37 42 L39 70 C39 78, 5 78, 5 70 Z" 
            fill="url(#maLanternGrad)" 
            stroke="#f59e0b" 
            stroke-width="1.2"/>
      <ellipse cx="22" cy="56" rx="8" ry="12" fill="#fef08a" fill-opacity="0.7" filter="blur(2px)"/>
      <path d="M15 34 C13 50, 13 62, 15 76" stroke="#fbbf24" stroke-width="1" stroke-opacity="0.6"/>
      <path d="M29 34 C31 50, 31 62, 29 76" stroke="#fbbf24" stroke-width="1" stroke-opacity="0.6"/>
      <rect x="15" y="76" width="14" height="4" rx="1.5" fill="#b45309"/>
      <line x1="22" y1="80" x2="22" y2="92" stroke="#dc2626" stroke-width="1.5"/>
      <rect x="20" y="92" width="4" height="14" rx="1" fill="#dc2626"/>
      <defs>
        <linearGradient id="maLanternGrad" x1="22" y1="34" x2="22" y2="78" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#ef4444"/>
          <stop offset="60%" stop-color="#dc2626"/>
          <stop offset="100%" stop-color="#991b1b"/>
        </linearGradient>
      </defs>
    </svg>
  `;

  const lanternsHTML = `
    <div class="ma-lantern ma-lantern-left-1">${createLanternSVG(120)}</div>
    <div class="ma-lantern ma-lantern-left-2">${createLanternSVG(90)}</div>
    <div class="ma-lantern ma-lantern-right-1">${createLanternSVG(110)}</div>
    <div class="ma-lantern ma-lantern-right-2">${createLanternSVG(85)}</div>
  `;

  // --- 4. TRADITIONAL FULL SCENE (Đèn Ông Sao + Đèn Cá Chép + Thỏ Ngọc & Bánh + Mây Cổ Điển) ---
  const cornerSceneSVG = `
    <svg viewBox="0 0 260 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Viền hoa văn / Khung mây vàng gốm -->
        <linearGradient id="maCornerGold" x1="0" y1="200" x2="260" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#d97706" stop-opacity="0.9"/>
          <stop offset="50%" stop-color="#f59e0b" stop-opacity="0.7"/>
          <stop offset="100%" stop-color="#fbbf24" stop-opacity="0"/>
        </linearGradient>
        
        <!-- Mây cổ điển chìm ở góc -->
        <linearGradient id="maCloudBase" x1="0" y1="200" x2="180" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#fef3c7" stop-opacity="0.95"/>
          <stop offset="100%" stop-color="#fde68a" stop-opacity="0.35"/>
        </linearGradient>

        <!-- Gradient Cá Chép -->
        <linearGradient id="maCarpGrad" x1="0" y1="0" x2="45" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#ef4444"/>
          <stop offset="60%" stop-color="#f59e0b"/>
          <stop offset="100%" stop-color="#fbbf24"/>
        </linearGradient>
      </defs>

      <!-- 1. Đường viền góc hoa văn Trung Thu uốn lượn -->
      <path d="M 0 200 C 0 110, 70 35, 190 12 C 215 8, 235 4, 260 0" stroke="url(#maCornerGold)" stroke-width="2.5" fill="none" stroke-dasharray="8 4"/>
      <path d="M 0 200 C 0 130, 50 55, 150 28" stroke="#f59e0b" stroke-width="1" stroke-opacity="0.5" fill="none"/>
      
      <!-- Hoa văn mây cuộn cổ điển ở sát góc -->
      <path d="M 0 165 C 30 165, 45 150, 35 125 C 25 100, 60 90, 85 112 C 100 130, 85 160, 55 155" stroke="#d97706" stroke-width="1.5" stroke-opacity="0.6" fill="none"/>
      <circle cx="32" cy="128" r="3" fill="#d97706" fill-opacity="0.7"/>

      <!-- 2. Thảm mây nền nâng đỡ cụm tiểu cảnh -->
      <path d="M -10 210 C 20 145, 90 145, 130 168 C 165 188, 210 168, 240 210 Z" fill="url(#maCloudBase)"/>

      <!-- 3. ĐÈN ÔNG SAO (Star Lantern) - Cắm cán tre tựa góc -->
      <g transform="translate(18, 55)">
        <!-- Cán tre -->
        <line x1="25" y1="85" x2="25" y2="45" stroke="#78350f" stroke-width="2.5"/>
        <!-- Vòng tròn giấy bóng kính bao quanh -->
        <circle cx="25" cy="25" r="24" stroke="#dc2626" stroke-width="1.2" fill="#ef4444" fill-opacity="0.15"/>
        <circle cx="25" cy="25" r="20" stroke="#f59e0b" stroke-width="0.8" stroke-dasharray="3 2" fill="none"/>
        <!-- Ngôi sao 5 cánh đỏ kiếng -->
        <polygon points="25,3 31,18 47,18 34,28 39,43 25,33 11,43 16,28 3,18 19,18" fill="#dc2626" stroke="#fbbf24" stroke-width="1.2"/>
        <!-- Tâm sao tỏa sáng -->
        <circle cx="25" cy="25" r="5" fill="#fef08a"/>
        <!-- Tua rua trang trí -->
        <path d="M 25 49 L 25 65" stroke="#dc2626" stroke-width="1.5"/>
        <path d="M 21 48 L 17 62" stroke="#f59e0b" stroke-width="1.2"/>
        <path d="M 29 48 L 33 62" stroke="#f59e0b" stroke-width="1.2"/>
      </g>

      <!-- 4. ĐÈN CÁ CHÉP (Carp Lantern) - Nằm ngẩng đầu vui tươi -->
      <g transform="translate(75, 105) rotate(-12)">
        <!-- Cán tre dựng cá -->
        <line x1="28" y1="35" x2="28" y2="55" stroke="#78350f" stroke-width="2"/>
        <!-- Thân cá chép -->
        <path d="M 2 20 C 10 8, 32 8, 45 18 C 38 32, 12 34, 2 20 Z" fill="url(#maCarpGrad)" stroke="#b45309" stroke-width="1"/>
        <!-- Vây cá & Đuôi xòe -->
        <path d="M 45 18 C 55 10, 58 20, 56 26 C 50 24, 47 22, 45 18 Z" fill="#ef4444" stroke="#b45309" stroke-width="0.8"/>
        <path d="M 20 8 C 25 2, 30 4, 28 9 Z" fill="#f59e0b"/>
        <!-- Vảy cá uốn sóng -->
        <path d="M 18 16 C 22 20, 22 24, 18 28" stroke="#ffffff" stroke-width="0.8" stroke-opacity="0.7" fill="none"/>
        <path d="M 26 14 C 30 18, 30 22, 26 26" stroke="#ffffff" stroke-width="0.8" stroke-opacity="0.7" fill="none"/>
        <!-- Mắt cá tròn xoe -->
        <circle cx="10" cy="17" r="3.5" fill="#ffffff"/>
        <circle cx="9" cy="17" r="1.8" fill="#000000"/>
      </g>

      <!-- 5. THỎ NGỌC & BÁNH TRUNG THU (Trọng tâm tiểu cảnh) -->
      <g transform="translate(100, 108)">
        <!-- Đĩa bánh Trung Thu -->
        <ellipse cx="65" cy="62" rx="28" ry="8" fill="#d97706" fill-opacity="0.25"/>
        <!-- Bánh Trung Thu lớn (Họa tiết dập nổi) -->
        <path d="M 42 50 C 42 42, 86 42, 86 50 L 84 60 C 84 65, 44 65, 44 60 Z" fill="#d97706" stroke="#b45309" stroke-width="1.2"/>
        <ellipse cx="64" cy="48" rx="21" ry="8" fill="#f59e0b" stroke="#b45309" stroke-width="1.2"/>
        <ellipse cx="64" cy="48" rx="13" ry="5" fill="#fbbf24" stroke="#d97706" stroke-width="1"/>
        <circle cx="64" cy="48" r="2.5" fill="#b45309"/>

        <!-- Bánh Trung Thu nhỏ tựa bên cạnh -->
        <path d="M 28 54 C 28 48, 56 48, 56 54 L 55 61 C 55 64, 29 64, 29 61 Z" fill="#b45309" opacity="0.9"/>
        <ellipse cx="42" cy="53" rx="13" ry="5" fill="#f59e0b"/>

        <!-- Thỏ Ngọc -->
        <!-- Đuôi thỏ -->
        <circle cx="12" cy="46" r="5" fill="#ffffff" stroke="#f59e0b" stroke-width="0.8"/>
        <!-- Thân thỏ -->
        <ellipse cx="28" cy="44" rx="18" ry="14" fill="#ffffff" stroke="#f59e0b" stroke-width="1.2"/>
        <!-- Đầu thỏ -->
        <circle cx="38" cy="28" r="12" fill="#ffffff" stroke="#f59e0b" stroke-width="1.2"/>
        <!-- Tai thỏ vểnh -->
        <ellipse cx="33" cy="11" rx="4" ry="11" fill="#ffffff" stroke="#f59e0b" stroke-width="1.2" transform="rotate(-12 33 11)"/>
        <ellipse cx="33" cy="11" rx="2" ry="8" fill="#fca5a5" transform="rotate(-12 33 11)"/>
        <ellipse cx="42" cy="13" rx="3.5" ry="10" fill="#ffffff" stroke="#f59e0b" stroke-width="1.2" transform="rotate(10 42 13)"/>
        <ellipse cx="42" cy="13" rx="1.8" ry="7" fill="#fca5a5" transform="rotate(10 42 13)"/>
        <!-- Mắt & Mũi -->
        <circle cx="43" cy="26" r="1.8" fill="#dc2626"/>
        <circle cx="47" cy="29" r="1.2" fill="#fca5a5"/>
        <!-- Tay thỏ ôm bánh -->
        <ellipse cx="44" cy="40" rx="5" ry="3" fill="#ffffff" stroke="#f59e0b" stroke-width="1" transform="rotate(-20 44 40)"/>
      </g>
    </svg>
  `;

  const cornersHTML = `
    <div class="ma-bottom-corner ma-corner-left">${cornerSceneSVG}</div>
    <div class="ma-bottom-corner ma-corner-right">${cornerSceneSVG}</div>
  `;

  // --- 5. LEAVES / PETALS ---
  let leavesHTML = '';
  const leafConfigs = [
    { left: 6, duration: 10, delay: 0, sway: 50, rot: 280, size: 11, color: '#d97706' },
    { left: 16, duration: 13, delay: 3, sway: -40, rot: 320, size: 9, color: '#dc2626' },
    { left: 26, duration: 11, delay: 1, sway: 60, rot: 210, size: 12, color: '#f59e0b' },
    { left: 36, duration: 14, delay: 5, sway: -50, rot: 350, size: 10, color: '#d97706' },
    { left: 46, duration: 9, delay: 2, sway: 45, rot: 190, size: 13, color: '#dc2626' },
    { left: 56, duration: 12, delay: 4, sway: -60, rot: 270, size: 9, color: '#f59e0b' },
    { left: 66, duration: 10, delay: 1.5, sway: 55, rot: 300, size: 11, color: '#d97706' },
    { left: 76, duration: 15, delay: 6, sway: -45, rot: 240, size: 10, color: '#dc2626' },
    { left: 86, duration: 11, delay: 0.5, sway: 40, rot: 330, size: 12, color: '#f59e0b' },
    { left: 94, duration: 13, delay: 3.5, sway: -35, rot: 200, size: 9, color: '#d97706' },
    { left: 12, duration: 12, delay: 7, sway: 65, rot: 310, size: 11, color: '#dc2626' },
    { left: 30, duration: 10, delay: 4.5, sway: -55, rot: 260, size: 10, color: '#f59e0b' },
    { left: 50, duration: 14, delay: 8, sway: 50, rot: 220, size: 12, color: '#d97706' },
    { left: 70, duration: 9, delay: 2.5, sway: -40, rot: 340, size: 9, color: '#dc2626' },
    { left: 80, duration: 13, delay: 5.5, sway: 60, rot: 180, size: 11, color: '#f59e0b' },
    { left: 90, duration: 11, delay: 9, sway: -50, rot: 290, size: 10, color: '#d97706' }
  ];

  leafConfigs.forEach(l => {
    leavesHTML += `
      <div class="ma-leaf" style="left:${l.left}%; --fall-duration:${l.duration}s; --fall-delay:${l.delay}s; --sway-x:${l.sway}px; --rot-deg:${l.rot}deg;">
        <svg width="${l.size}" height="${l.size * 1.5}" viewBox="0 0 12 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 0 C12 5, 11 13, 6 18 C1 13, 0 5, 6 0 Z" fill="${l.color}" fill-opacity="0.75"/>
          <path d="M6 2 V16" stroke="#fef08a" stroke-width="0.8" stroke-opacity="0.8"/>
        </svg>
      </div>
    `;
  });

  // Assemble HTML
  overlay.innerHTML = moonHTML + cloudsHTML + lanternsHTML + cornersHTML + leavesHTML;
  document.body.appendChild(overlay);
})();