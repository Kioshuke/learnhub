(function () {
  'use strict';

  // Nếu đã có overlay sẵn (script load lại) thì gỡ cũ trước
  const EXISTING = document.getElementById('event-overlay');
  if (EXISTING) EXISTING.remove();

  // Inject Styles
  const style = document.createElement('style');
  style.textContent = `
    #event-overlay{position:fixed;inset:0;z-index:9998;pointer-events:none;overflow:hidden}

    /* ---------- 1. DÂY CỜ ĐỎ SAO VÀNG (hình chữ nhật, treo dọc) ---------- */
    .qk-bunting{position:absolute;top:0;left:0;width:100%;display:flex;justify-content:space-between;align-items:flex-start;padding:0 1.5%;filter:drop-shadow(0 4px 8px rgba(153,27,27,.28))}
    .qk-flag{flex:none;transform-origin:top center;animation:qkSway 3.4s ease-in-out infinite alternate}
    .qk-flag:nth-child(odd){animation-duration:2.8s}
    .qk-flag:nth-child(3n){animation-duration:4s;animation-delay:.5s}
    .qk-flag:nth-child(4n){animation-delay:.9s}
    .qk-flag:nth-child(5n){animation-duration:3s;animation-delay:.3s}
    @keyframes qkSway{0%{transform:rotate(-5deg)}100%{transform:rotate(5deg)}}

    /* ---------- 2. PHÁO HOA ---------- */
    .qk-fw{position:absolute;opacity:0;will-change:transform,opacity;animation:qkBurst var(--d,2.8s) ease-out infinite var(--delay,0s)}
    .qk-fw .qk-fw-ring{animation:qkRingSpin var(--spin,12s) linear infinite;transform-origin:50% 50%}
    @keyframes qkBurst{
      0%{opacity:0;transform:scale(.18)}
      10%{opacity:1}
      55%{transform:scale(1.12);opacity:.95}
      100%{transform:scale(1.55);opacity:0}
    }
    @keyframes qkRingSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}

    /* ---------- 3. SAO VÀNG RƠI TỪ TRÊN TRỜI ---------- */
    .qk-star{position:absolute;top:-30px;will-change:transform,opacity;opacity:0;filter:drop-shadow(0 2px 4px rgba(218,37,29,.25));animation:qkStarFall var(--fall-duration,10s) linear infinite var(--fall-delay,0s)}
    @keyframes qkStarFall{
      0%{transform:translate3d(0,0,0) rotate(0deg);opacity:0}
      10%{opacity:.9}
      85%{opacity:.65}
      100%{transform:translate3d(var(--sway-x,60px),105vh,0) rotate(var(--rot-deg,360deg));opacity:0}
    }

    /* ---------- 4. VẦNG SÁNG LƠ LỬNG ---------- */
    .qk-glow{position:absolute;border-radius:50%;background:radial-gradient(circle,rgba(218,37,29,.14),transparent 70%);animation:qkGlow 4s ease-in-out infinite alternate}
    @keyframes qkGlow{from{opacity:.35;transform:scale(1)}to{opacity:.75;transform:scale(1.18)}}

    /* ---------- 5. GÓC DƯỚI: BÔNG LÚA VÀNG ÔM NGÔI SAO ---------- */
    .qk-corner{position:absolute;bottom:0;width:170px;height:150px;pointer-events:none;filter:drop-shadow(0 6px 14px rgba(122,20,15,.25))}
    .qk-corner svg{display:block;width:100%;height:100%}
    .qk-corner-left{left:-6px}
    .qk-corner-right{right:-6px;transform:scaleX(-1)}
    .qk-corner-wheat{animation:qkWheat 4.5s ease-in-out infinite alternate;transform-origin:10% 96%}
    @keyframes qkWheat{0%{transform:rotate(-1.4deg)}100%{transform:rotate(1.4deg)}}
    .qk-corner-star{transform-origin:center;animation:qkStarPulse 2.4s ease-in-out infinite alternate}
    @keyframes qkStarPulse{from{opacity:.75;transform:scale(.95)}to{opacity:1;transform:scale(1.08)}}
  `;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.id = 'event-overlay';

  // ---------- 1. DÂY CỜ ĐỎ SAO VÀNG (hình chữ nhật, treo dọc) ----------
  const flagSVG = (w) => `
    <svg width="${w}" height="${Math.round(w * 1.45)}" viewBox="0 0 24 34" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="12" y1="0" x2="12" y2="4" stroke="#78350f" stroke-width="1.2"/>
      <rect x="1" y="4" width="22" height="29" rx="1" fill="#da251d" stroke="#7f1d1d" stroke-width="0.8"/>
      <polygon points="12,9.5 13.5,14.8 19,14.8 14.6,18.1 15.9,23.4 12,20.2 8.1,23.4 9.4,18.1 5,14.8 10.5,14.8" fill="#ffcd00"/>
    </svg>`;

  let buntingHTML = '<div class="qk-bunting">';
  const count = 16;
  for (let i = 0; i < count; i++) {
    const w = 26 - (i % 4) * 2;
    buntingHTML += `<div class="qk-flag" style="animation-delay:${(i % 7) * 0.35}s">${flagSVG(w)}</div>`;
  }
  buntingHTML += '</div>';

  // ---------- 2. PHÁO HOA ----------
  const fireworkSVG = (color, size) => `
    <svg class="qk-fw-ring" width="${size}" height="${size}" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g stroke="${color}" stroke-width="2.4" stroke-linecap="round">
        <line x1="60" y1="60" x2="60" y2="10"/>
        <line x1="60" y1="60" x2="60" y2="110"/>
        <line x1="60" y1="60" x2="10" y2="60"/>
        <line x1="60" y1="60" x2="110" y2="60"/>
        <line x1="60" y1="60" x2="25" y2="25"/>
        <line x1="60" y1="60" x2="95" y2="25"/>
        <line x1="60" y1="60" x2="25" y2="95"/>
        <line x1="60" y1="60" x2="95" y2="95"/>
        <line x1="60" y1="60" x2="17" y2="38"/>
        <line x1="60" y1="60" x2="103" y2="38"/>
        <line x1="60" y1="60" x2="17" y2="82"/>
        <line x1="60" y1="60" x2="103" y2="82"/>
        <line x1="60" y1="60" x2="38" y2="17"/>
        <line x1="60" y1="60" x2="38" y2="103"/>
        <line x1="60" y1="60" x2="82" y2="17"/>
        <line x1="60" y1="60" x2="82" y2="103"/>
      </g>
      <g fill="${color}">
        <circle cx="60" cy="10" r="3.2"/><circle cx="60" cy="110" r="3.2"/>
        <circle cx="10" cy="60" r="3.2"/><circle cx="110" cy="60" r="3.2"/>
        <circle cx="25" cy="25" r="2.6"/><circle cx="95" cy="25" r="2.6"/>
        <circle cx="25" cy="95" r="2.6"/><circle cx="95" cy="95" r="2.6"/>
        <circle cx="17" cy="38" r="2.2"/><circle cx="103" cy="38" r="2.2"/>
        <circle cx="17" cy="82" r="2.2"/><circle cx="103" cy="82" r="2.2"/>
        <circle cx="38" cy="17" r="2.2"/><circle cx="38" cy="103" r="2.2"/>
        <circle cx="82" cy="17" r="2.2"/><circle cx="82" cy="103" r="2.2"/>
      </g>
      <circle cx="60" cy="60" r="5" fill="#fff7cc"/>
      <circle cx="60" cy="60" r="2.6" fill="#ffffff"/>
    </svg>`;

  const fws = [
    { top: '24%', left: '10%', color: '#ffcd00', size: 90, d: 3.4, delay: 0,  spin: 14 },
    { top: '20%', left: '50%', color: '#ffffff', size: 66, d: 2.7, delay: 1.6, spin: 10 },
    { top: '30%', left: '88%', color: '#da251d', size: 74, d: 3.0, delay: 0.8, spin: 12 },
    { top: '42%', left: '30%', color: '#da251d', size: 56, d: 2.4, delay: 2.4, spin: 9 },
    { top: '16%', left: '68%', color: '#ffcd00', size: 62, d: 2.9, delay: 3.2, spin: 11 }
  ];
  let fwHTML = '';
  fws.forEach(f => {
    fwHTML += `
      <div class="qk-fw" style="top:${f.top};left:${f.left};--d:${f.d}s;--delay:${f.delay}s;--spin:${f.spin}s">
        ${fireworkSVG(f.color, f.size)}
      </div>`;
  });

  // ---------- 3. SAO VÀNG RƠI ----------
  const starPos = [
    { l: 6,  d: 11,   dl: 0,   sway: 45, rot: 260, s: 12, c: '#ffcd00' },
    { l: 14, d: 9,    dl: 2.5, sway: -35, rot: 300, s: 10, c: '#f59e0b' },
    { l: 22, d: 13,   dl: 1,   sway: 55, rot: 220, s: 11, c: '#ffcd00' },
    { l: 30, d: 10,   dl: 4,   sway: -50, rot: 330, s: 9,  c: '#f59e0b' },
    { l: 38, d: 12,   dl: 1.8, sway: 40, rot: 190, s: 12, c: '#ffcd00' },
    { l: 46, d: 9.5,  dl: 3.2, sway: -60, rot: 280, s: 10, c: '#f59e0b' },
    { l: 54, d: 11.5, dl: 0.8, sway: 50, rot: 310, s: 11, c: '#ffcd00' },
    { l: 62, d: 14,   dl: 5,   sway: -40, rot: 240, s: 9,  c: '#f59e0b' },
    { l: 70, d: 10.5, dl: 2,   sway: 35, rot: 340, s: 12, c: '#ffcd00' },
    { l: 78, d: 12.5, dl: 3.6, sway: -30, rot: 200, s: 10, c: '#f59e0b' },
    { l: 86, d: 13,   dl: 6,   sway: 60, rot: 300, s: 11, c: '#ffcd00' },
    { l: 93, d: 10,   dl: 4.4, sway: -55, rot: 250, s: 9,  c: '#f59e0b' },
    { l: 10, d: 12,   dl: 7,   sway: 45, rot: 210, s: 10, c: '#ffcd00' },
    { l: 34, d: 9,    dl: 2.2, sway: -45, rot: 350, s: 9,  c: '#f59e0b' },
    { l: 58, d: 11,   dl: 5.5, sway: 55, rot: 170, s: 11, c: '#ffcd00' },
    { l: 82, d: 12,   dl: 8,   sway: -35, rot: 290, s: 10, c: '#f59e0b' }
  ];
  const starSVG = (size, color) => `
    <svg width="${size}" height="${size}" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="10,0 12.5,7 20,7 14,11.5 16,19 10,14.5 4,19 6,11.5 0,7 7.5,7" fill="${color}"/>
    </svg>`;
  let starsHTML = '';
  starPos.forEach(s => {
    starsHTML += `
      <div class="qk-star" style="left:${s.l}%;--fall-duration:${s.d}s;--fall-delay:${s.dl}s;--sway-x:${s.sway}px;--rot-deg:${s.rot}deg">${starSVG(s.s, s.c)}</div>`;
  });

  // ---------- 4. VẦNG SÁNG ----------
  let glowHTML = '';
  [{ l: '4%',  t: '12%', s: 140 }, { r: '5%', t: '16%', s: 120 }, { l: '42%', t: '6%', s: 100 }, { r: '30%', t: '70%', s: 90 }].forEach(g => {
    glowHTML += `<div class="qk-glow" style="left:${g.l||'auto'};right:${g.r||'auto'};top:${g.t};width:${g.s}px;height:${g.s}px"></div>`;
  });

  // ---------- 5. BÔNG LÚA GÓC DƯỚI ----------
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
      grains += `
        <ellipse cx="${pos.x}" cy="${pos.y}" rx="${size}" ry="${size * 0.42}" fill="url(#qkWheatGrain)" stroke="#a45c0a" stroke-width="0.4" transform="rotate(${angle - 55} ${pos.x} ${pos.y})"/>
        <ellipse cx="${pos.x}" cy="${pos.y}" rx="${size}" ry="${size * 0.42}" fill="url(#qkWheatGrain)" stroke="#a45c0a" stroke-width="0.4" transform="rotate(${angle + 55} ${pos.x} ${pos.y})"/>`;
    }
    return `<path d="${stemPath}" stroke="#e0a52e" stroke-width="1.6" fill="none" stroke-linecap="round"/>${grains}`;
  };

  const cornerSceneSVG = `
    <svg width="170" height="150" viewBox="0 0 170 150" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="qkWheatGrain" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ffe580"/>
          <stop offset="60%" stop-color="#ffcd00"/>
          <stop offset="100%" stop-color="#e0a52e"/>
        </linearGradient>
        <radialGradient id="qkCornerGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#fff3c4" stop-opacity="0.8"/>
          <stop offset="100%" stop-color="#ffcd00" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <path d="M 8 142 C 28 130, 52 130, 66 142 L 70 154 C 50 145, 26 145, 6 154 Z" fill="#da251d" stroke="#7f1d1d" stroke-width="0.8"/>
      <g class="qk-corner-wheat">
        ${buildWheatStalk({ x: 14, y: 146 }, { x: 20, y: 52 }, { x: 132, y: 16 }, 9, 9.5)}
      </g>
      <circle cx="26" cy="126" r="30" fill="url(#qkCornerGlow)"/>
      <g class="qk-corner-star" transform="translate(26,126)">
        <polygon points="0,-15 4.5,-4.8 15.6,-4.8 6.7,1.9 10.3,12.8 0,6.3 -10.3,12.8 -6.7,1.9 -15.6,-4.8 -4.5,-4.8" fill="#ffcd00" stroke="#a45c0a" stroke-width="0.6"/>
      </g>
    </svg>`;

  const cornersHTML = `
    <div class="qk-corner qk-corner-left">${cornerSceneSVG}</div>
    <div class="qk-corner qk-corner-right">${cornerSceneSVG}</div>`;

  overlay.innerHTML = buntingHTML + fwHTML + starsHTML + glowHTML + cornersHTML;
  document.body.appendChild(overlay);
})();
