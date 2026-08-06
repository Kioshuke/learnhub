(function () {
  'use strict';

  // Prevent duplicate instances
  const EXISTING_OVERLAY = document.getElementById('qk-overlay');
  if (EXISTING_OVERLAY) {
    EXISTING_OVERLAY.remove();
  }
  const EXISTING_STYLE = document.getElementById('qk-styles');
  if (EXISTING_STYLE) {
    EXISTING_STYLE.remove();
  }

  // Inject Styles
  const style = document.createElement('style');
  style.id = 'qk-styles';
  style.textContent = `
    /* Root Overlay Container */
    #qk-overlay {
      position: fixed;
      inset: 0;
      z-index: 99999;
      pointer-events: none;
      overflow: hidden;
      will-change: transform;
    }

    /* --- 1. BUNTING / DÂY CỜ TỔ QUỐC HÌNH CHỮ NHẬT NGANG ĐỈNH --- */
    .qk-bunting-wrap {
      position: absolute;
      top: -2px;
      left: 0;
      width: 100%;
      display: flex;
      justify-content: space-between;
      padding: 0 4%;
      filter: drop-shadow(0 4px 8px rgba(153, 27, 27, 0.25));
    }

    .qk-flag-pennant {
      will-change: transform;
      transform-origin: top center;
      animation: qkPennantSway 3.2s ease-in-out infinite alternate;
    }

    .qk-flag-pennant:nth-child(odd) {
      animation-duration: 2.8s;
    }
    .qk-flag-pennant:nth-child(3n) {
      animation-duration: 3.6s;
      animation-delay: 0.4s;
    }
    .qk-flag-pennant:nth-child(4n) {
      animation-delay: 0.8s;
    }

    @keyframes qkPennantSway {
      0% { transform: rotate(-4deg); }
      100% { transform: rotate(4deg); }
    }

    /* --- 2. FIREWORKS --- */
    .qk-firework {
      position: absolute;
      will-change: transform, opacity;
      opacity: 0;
      animation: qkFireworkBurst var(--fw-duration, 2.6s) ease-out infinite var(--fw-delay, 0s);
    }

    @keyframes qkFireworkBurst {
      0% {
        transform: scale(0.15);
        opacity: 0;
      }
      8% {
        opacity: 1;
      }
      45% {
        transform: scale(1);
        opacity: 0.9;
      }
      75% {
        opacity: 0.4;
      }
      100% {
        transform: scale(1.25);
        opacity: 0;
      }
    }

    /* --- 3. FALLING STARS --- */
    .qk-star {
      position: absolute;
      top: -30px;
      will-change: transform, opacity;
      opacity: 0;
      filter: drop-shadow(0 2px 4px rgba(153, 27, 27, 0.2));
      animation: qkStarFall var(--fall-duration, 10s) linear infinite var(--fall-delay, 0s);
    }

    @keyframes qkStarFall {
      0% {
        transform: translate3d(0, 0, 0) rotate(0deg);
        opacity: 0;
      }
      10% {
        opacity: 0.9;
      }
      85% {
        opacity: 0.65;
      }
      100% {
        transform: translate3d(var(--sway-x, 60px), 105vh, 0) rotate(var(--rot-deg, 360deg));
        opacity: 0;
      }
    }

    /* --- 4. BOTTOM CORNERS: BÔNG LÚA VÀNG ÔM NGÔI SAO (mô-típ Quốc huy) --- */
    .qk-bottom-corner {
      position: absolute;
      bottom: 0;
      width: 150px;
      height: 128px;
      pointer-events: none;
      filter: drop-shadow(0 5px 12px rgba(122, 20, 15, 0.22));
    }

    .qk-bottom-corner svg {
      display: block;
      width: 100%;
      height: 100%;
    }

    .qk-corner-left {
      left: 0;
    }

    .qk-corner-right {
      right: 0;
      transform: scaleX(-1);
    }

    .qk-corner-star {
      transform-origin: center;
      animation: qkCornerStarGlow 3.2s ease-in-out infinite alternate;
    }

    @keyframes qkCornerStarGlow {
      0% { opacity: 0.85; }
      100% { opacity: 1; }
    }

    .qk-corner-wheat {
      animation: qkWheatSway 4.5s ease-in-out infinite alternate;
      transform-origin: 8% 96%;
    }

    @keyframes qkWheatSway {
      0% { transform: rotate(-1.2deg); }
      100% { transform: rotate(1.2deg); }
    }
  `;
  document.head.appendChild(style);

  // Overlay Root Element
  const overlay = document.createElement('div');
  overlay.id = 'qk-overlay';

  // --- 1. BUNTING: CỜ TỔ QUỐC HÌNH CHỮ NHẬT (không còn cờ tam giác) ---
  const createFlagSVG = () => `
    <svg class="qk-flag-pennant" width="28" height="21" viewBox="0 0 28 21" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="14" y1="0" x2="14" y2="3" stroke="#78350f" stroke-width="1.1"/>
      <rect x="1" y="3" width="26" height="16" rx="0.5" fill="#da251d" stroke="#7f1d1d" stroke-width="0.8"/>
      <polygon points="14,6 15.6,10.1 20,10.1 16.5,12.7 17.8,16.8 14,14.3 10.2,16.8 11.5,12.7 8,10.1 12.4,10.1"
               fill="#ffcd00"/>
    </svg>
  `;

  let buntingHTML = '<div class="qk-bunting-wrap">';
  for (let i = 0; i < 14; i++) {
    buntingHTML += createFlagSVG();
  }
  buntingHTML += '</div>';

  // --- 2. FIREWORKS ---
  const createFireworkSVG = (color, size) => `
    <svg width="${size}" height="${size}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g stroke="${color}" stroke-width="2.5" stroke-linecap="round">
        <line x1="50" y1="50" x2="50" y2="8" />
        <line x1="50" y1="50" x2="50" y2="92" />
        <line x1="50" y1="50" x2="8" y2="50" />
        <line x1="50" y1="50" x2="92" y2="50" />
        <line x1="50" y1="50" x2="20" y2="20" />
        <line x1="50" y1="50" x2="80" y2="20" />
        <line x1="50" y1="50" x2="20" y2="80" />
        <line x1="50" y1="50" x2="80" y2="80" />
      </g>
      <g fill="${color}">
        <circle cx="50" cy="8" r="3" />
        <circle cx="50" cy="92" r="3" />
        <circle cx="8" cy="50" r="3" />
        <circle cx="92" cy="50" r="3" />
        <circle cx="20" cy="20" r="2.4" />
        <circle cx="80" cy="20" r="2.4" />
        <circle cx="20" cy="80" r="2.4" />
        <circle cx="80" cy="80" r="2.4" />
      </g>
      <circle cx="50" cy="50" r="4" fill="#fff7cc" />
    </svg>
  `;

  const fireworkConfigs = [
    { top: '22%', left: '12%', color: '#ffcd00', size: 80, duration: 3.2, delay: 0 },
    { top: '28%', left: '82%', color: '#da251d', size: 65, duration: 2.6, delay: 1.1 },
    { top: '18%', left: '48%', color: '#ffffff', size: 55, duration: 2.9, delay: 2.2 },
    { top: '35%', left: '68%', color: '#ffcd00', size: 60, duration: 3.4, delay: 0.6 },
    { top: '32%', left: '28%', color: '#da251d', size: 50, duration: 2.4, delay: 1.8 }
  ];

  let fireworksHTML = '';
  fireworkConfigs.forEach(f => {
    fireworksHTML += `
      <div class="qk-firework" style="top:${f.top}; left:${f.left}; --fw-duration:${f.duration}s; --fw-delay:${f.delay}s;">
        ${createFireworkSVG(f.color, f.size)}
      </div>
    `;
  });

  // --- 3. FALLING STARS ---
  const starConfigs = [
    { left: 5, duration: 11, delay: 0, sway: 45, rot: 260, size: 10, color: '#ffcd00' },
    { left: 15, duration: 9, delay: 2.5, sway: -35, rot: 300, size: 8, color: '#da251d' },
    { left: 25, duration: 13, delay: 1, sway: 55, rot: 220, size: 11, color: '#ffcd00' },
    { left: 35, duration: 10, delay: 4, sway: -50, rot: 330, size: 9, color: '#da251d' },
    { left: 45, duration: 12, delay: 1.8, sway: 40, rot: 190, size: 10, color: '#ffcd00' },
    { left: 55, duration: 9.5, delay: 3.2, sway: -60, rot: 280, size: 8, color: '#da251d' },
    { left: 65, duration: 11.5, delay: 0.8, sway: 50, rot: 310, size: 10, color: '#ffcd00' },
    { left: 75, duration: 14, delay: 5, sway: -40, rot: 240, size: 9, color: '#da251d' },
    { left: 85, duration: 10.5, delay: 2, sway: 35, rot: 340, size: 11, color: '#ffcd00' },
    { left: 92, duration: 12.5, delay: 3.6, sway: -30, rot: 200, size: 8, color: '#da251d' },
    { left: 10, duration: 13, delay: 6, sway: 60, rot: 300, size: 9, color: '#ffcd00' },
    { left: 30, duration: 10, delay: 4.4, sway: -55, rot: 250, size: 10, color: '#da251d' },
    { left: 50, duration: 12, delay: 7, sway: 45, rot: 210, size: 9, color: '#ffcd00' },
    { left: 70, duration: 9, delay: 2.2, sway: -45, rot: 350, size: 8, color: '#da251d' },
    { left: 80, duration: 11, delay: 5.5, sway: 55, rot: 170, size: 10, color: '#ffcd00' }
  ];

  let starsHTML = '';
  starConfigs.forEach(s => {
    starsHTML += `
      <div class="qk-star" style="left:${s.left}%; --fall-duration:${s.duration}s; --fall-delay:${s.delay}s; --sway-x:${s.sway}px; --rot-deg:${s.rot}deg;">
        <svg width="${s.size}" height="${s.size}" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="10,0 12.5,7 20,7 14,11.5 16,19 10,14.5 4,19 6,11.5 0,7 7.5,7"
                   fill="${s.color}" fill-opacity="0.85"/>
        </svg>
      </div>
    `;
  });

  // --- 4. BOTTOM CORNERS: BÔNG LÚA VÀNG (mô-típ Quốc huy Việt Nam) ---
  // Sinh hạt lúa dọc theo một đường cong bezier bậc 2 để tạo dáng bông lúa uốn tự nhiên
  const quadPoint = (p0, p1, p2, t) => ({
    x: (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x,
    y: (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y
  });
  const quadTangentAngle = (p0, p1, p2, t) => {
    const dx = 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
    const dy = 2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);
    return (Math.atan2(dy, dx) * 180) / Math.PI;
  };

  const buildWheatStalk = (p0, p1, p2, grainCount, baseSize) => {
    let stemPath = `M ${p0.x} ${p0.y} Q ${p1.x} ${p1.y} ${p2.x} ${p2.y}`;
    let grains = '';
    for (let i = 0; i < grainCount; i++) {
      const t = 0.14 + (i / (grainCount - 1)) * 0.78;
      const pos = quadPoint(p0, p1, p2, t);
      const angle = quadTangentAngle(p0, p1, p2, t);
      const size = baseSize * (1 - t * 0.55);
      // Hai hạt lúa đối xứng hai bên thân, góc nghiêng theo tiếp tuyến đường cong
      grains += `
        <ellipse cx="${pos.x}" cy="${pos.y}" rx="${size}" ry="${size * 0.42}"
                 fill="url(#qkWheatGrain)" stroke="#a45c0a" stroke-width="0.4"
                 transform="rotate(${angle - 55} ${pos.x} ${pos.y})"/>
        <ellipse cx="${pos.x}" cy="${pos.y}" rx="${size}" ry="${size * 0.42}"
                 fill="url(#qkWheatGrain)" stroke="#a45c0a" stroke-width="0.4"
                 transform="rotate(${angle + 55} ${pos.x} ${pos.y})"/>
      `;
    }
    return `
      <path d="${stemPath}" stroke="#e0a52e" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      ${grains}
    `;
  };

  const wheatStalkSVG = buildWheatStalk(
    { x: 10, y: 126 },
    { x: 14, y: 46 },
    { x: 118, y: 14 },
    8,
    8.5
  );

  const cornerSceneSVG = `
    <svg width="150" height="128" viewBox="0 0 150 128" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="qkWheatGrain" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ffe580"/>
          <stop offset="60%" stop-color="#ffcd00"/>
          <stop offset="100%" stop-color="#e0a52e"/>
        </linearGradient>
        <radialGradient id="qkCornerGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#fff3c4" stop-opacity="0.85"/>
          <stop offset="100%" stop-color="#ffcd00" stop-opacity="0"/>
        </radialGradient>
      </defs>

      <!-- Dải ruy băng đỏ buộc gốc bông lúa -->
      <path d="M 4 122 C 20 112, 42 112, 56 122 L 60 132 C 42 124, 20 124, 2 132 Z"
            fill="#da251d" stroke="#7f1d1d" stroke-width="0.8"/>

      <g class="qk-corner-wheat">
        ${wheatStalkSVG}
      </g>

      <!-- Vầng sáng + ngôi sao vàng nhỏ tựa vào gốc bông lúa -->
      <circle cx="22" cy="108" r="26" fill="url(#qkCornerGlow)"/>
      <g class="qk-corner-star" transform="translate(22,108)">
        <polygon points="0,-13 3.9,-4.2 13.5,-4.2 5.8,1.8 8.9,11 0,5.4 -8.9,11 -5.8,1.8 -13.5,-4.2 -3.9,-4.2"
                 fill="#ffcd00" stroke="#a45c0a" stroke-width="0.6"/>
      </g>
    </svg>
  `;

  const cornersHTML = `
    <div class="qk-bottom-corner qk-corner-left">${cornerSceneSVG}</div>
    <div class="qk-bottom-corner qk-corner-right">${cornerSceneSVG}</div>
  `;

  // Assemble HTML
  overlay.innerHTML = buntingHTML + fireworksHTML + starsHTML + cornersHTML;
  document.body.appendChild(overlay);
})();