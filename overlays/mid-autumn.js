(function(){
  const css = document.createElement('style');
  css.textContent = `
    #event-overlay{position:fixed;inset:0;z-index:9998;pointer-events:none;overflow:hidden}

    .evt-corner{position:absolute;width:140px;height:140px}
    .evt-corner svg{width:100%;height:100%;filter:drop-shadow(0 0 6px rgba(251,191,36,.35))}
    .evt-corner-tl{top:0;left:0}
    .evt-corner-tr{top:0;right:0;transform:scaleX(-1)}
    .evt-corner-bl{bottom:48px;left:0;transform:scaleY(-1)}
    .evt-corner-br{bottom:48px;right:0;transform:scale(-1,-1)}

    .evt-cloud{position:absolute;background:rgba(255,255,255,.12);border-radius:50%;filter:blur(8px)}
    .evt-cloud.c1{width:220px;height:55px;top:60px;left:-220px;animation:evtCloud 28s linear infinite}
    .evt-cloud.c2{width:180px;height:45px;top:110px;left:-180px;animation:evtCloud 35s 10s linear infinite}
    .evt-cloud.c3{width:250px;height:50px;top:160px;left:-250px;animation:evtCloud 32s 20s linear infinite}
    @keyframes evtCloud{from{transform:translateX(0)}to{transform:translateX(calc(100vw + 500px))}}

    .evt-lantern{position:absolute;animation:evtLf 4s ease-in-out infinite alternate}
    .evt-lantern svg{width:38px;height:52px;filter:drop-shadow(0 2px 8px rgba(239,68,68,.35))}
    @keyframes evtLf{from{transform:translateY(0) rotate(-3deg)}to{transform:translateY(-12px) rotate(3deg)}}

    .evt-star{position:absolute;width:4px;height:4px;background:#fde68a;border-radius:50%;animation:evtS 2s ease-in-out infinite alternate}
    @keyframes evtS{from{opacity:.25;transform:scale(1)}to{opacity:1;transform:scale(1.8)}}

    .evt-petal{position:absolute;border-radius:50% 0 50% 0;animation:evtP fall linear infinite;opacity:.7}
    @keyframes evtP{0%{transform:translateY(-30px) rotate(0) scale(1)}50%{opacity:.8}100%{transform:translateY(calc(100vh + 30px)) rotate(600deg) scale(.6);opacity:0}}

    .evt-bottom-bar{position:fixed;bottom:0;left:0;right:0;height:44px;overflow:hidden;z-index:9998;pointer-events:none;background:linear-gradient(90deg,rgba(185,28,28,.85),rgba(220,38,38,.9),rgba(185,28,28,.85));backdrop-filter:blur(4px)}
    .evt-scroll-track{display:flex;gap:80px;position:absolute;bottom:10px;white-space:nowrap;animation:evtScroll 22s linear infinite}
    .evt-scroll-item{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:800;color:#fef3c7;text-shadow:0 1px 3px rgba(0,0,0,.4);flex-shrink:0;letter-spacing:.02em}
    .evt-scroll-item .emoji{font-size:18px}
    @keyframes evtScroll{from{transform:translateX(100vw)}to{transform:translateX(-100%)}}

    .evt-glow{position:absolute;border-radius:50%;background:radial-gradient(circle,rgba(251,191,36,.18),transparent 70%);animation:evtG 3s ease-in-out infinite alternate}
    @keyframes evtG{from{opacity:.3;transform:scale(1)}to{opacity:.7;transform:scale(1.15)}}
  `;
  document.head.appendChild(css);

  const overlay = document.createElement('div');
  overlay.id = 'event-overlay';

  // ── Corner SVGs ──
  const cornerSvg = `<svg viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M0 0 C40 10, 60 40, 50 90 C45 110, 20 125, 0 140" stroke="#f59e0b" stroke-width="2.5" fill="none" opacity=".5"/>
    <path d="M0 20 C30 28, 45 50, 38 80" stroke="#fbbf24" stroke-width="1.5" fill="none" opacity=".35"/>
    <path d="M20 0 C28 30, 50 45, 80 38" stroke="#fbbf24" stroke-width="1.5" fill="none" opacity=".35"/>
    <circle cx="18" cy="18" r="10" fill="#fde68a" opacity=".7"/>
    <circle cx="18" cy="18" r="6" fill="#fbbf24" opacity=".5"/>
    <circle cx="10" cy="40" r="5" fill="#fcd34d" opacity=".5"/>
    <circle cx="40" cy="10" r="5" fill="#fcd34d" opacity=".5"/>
    <path d="M6 6 L15 0 L15 15 L0 15 Z" fill="#f59e0b" opacity=".45"/>
    <path d="M32 4 L36 -2 L40 4 L36 10 Z" fill="#fbbf24" opacity=".4"/>
    <path d="M4 32 L10 26 L10 38 Z" fill="#fcd34d" opacity=".4"/>
    <circle cx="60" cy="6" r="2.5" fill="#fde68a" opacity=".4"/>
    <circle cx="6" cy="60" r="2.5" fill="#fde68a" opacity=".4"/>
    <circle cx="28" cy="28" r="2" fill="#fef3c7" opacity=".6"/>
    <path d="M0 0 L8 8" stroke="#f59e0b" stroke-width="1" opacity=".3"/>
  </svg>`;

  let cornersHTML = '';
  ['tl','tr','bl','br'].forEach(pos => {
    cornersHTML += `<div class="evt-corner evt-corner-${pos}">${cornerSvg}</div>`;
  });

  // ── Clouds ──
  let cloudsHTML = '';
  [{c:'c1'},{c:'c2'},{c:'c3'}].forEach(cl => {
    cloudsHTML += `<div class="evt-cloud ${cl.c}"></div>`;
  });

  // ── Lanterns ──
  const lanternSvg = `<svg viewBox="0 0 38 52" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="14" y="0" width="10" height="7" rx="2" fill="#fbbf24"/>
    <line x1="19" y1="7" x2="19" y2="12" stroke="#fbbf24" stroke-width="1.5"/>
    <ellipse cx="19" cy="32" rx="15" ry="18" fill="#dc2626"/>
    <ellipse cx="19" cy="32" rx="15" ry="18" fill="url(#lg)" opacity=".6"/>
    <line x1="19" y1="12" x2="19" y2="50" stroke="#fbbf24" stroke-width="1"/>
    <path d="M11 50 Q19 54 27 50" stroke="#fbbf24" stroke-width="1.5" fill="none"/>
    <text x="19" y="36" text-anchor="middle" fill="#fef3c7" font-size="10" font-weight="bold">福</text>
  </svg>`;
  const gradSvg = `<svg width="0" height="0"><defs><radialGradient id="lg" cx="50%" cy="40%"><stop offset="0%" stop-color="#fbbf24" stop-opacity=".5"/><stop offset="100%" stop-color="#dc2626" stop-opacity="0"/></radialGradient></defs></svg>`;
  document.body.insertAdjacentHTML('beforeend', gradSvg);

  const lanternData = [
    {l:'50px',t:'20px',d:'0s'},{l:'18px',t:'100px',d:'1.5s'},
    {r:'50px',t:'25px',d:'0.8s'},{r:'20px',t:'95px',d:'2s'},
    {l:'70px',b:'65px',d:'0.5s'},{r:'65px',b:'60px',d:'1.2s'}
  ];
  let lanternsHTML = '';
  lanternData.forEach(p => {
    const s = `left:${p.l||'auto'};right:${p.r||'auto'};top:${p.t||'auto'};bottom:${p.b||'auto'};animation-delay:${p.d}`;
    lanternsHTML += `<div class="evt-lantern" style="${s}">${lanternSvg}</div>`;
  });

  // ── Stars ──
  let starsHTML = '';
  for(let i=0;i<18;i++){
    const x=3+Math.random()*94, y=3+Math.random()*45;
    const dur=1.5+Math.random()*2, del=Math.random()*3;
    starsHTML += `<div class="evt-star" style="left:${x}%;top:${y}%;animation-duration:${dur}s;animation-delay:${del}s"></div>`;
  }

  // ── Falling petals ──
  let petalsHTML = '';
  for(let i=0;i<14;i++){
    const x=Math.random()*100;
    const dur=6+Math.random()*7, del=Math.random()*8;
    const sz=7+Math.random()*8;
    const colors = ['rgba(251,191,36,.6)','rgba(239,68,68,.4)','rgba(252,211,77,.5)','rgba(245,158,11,.5)'];
    const c = colors[Math.floor(Math.random()*colors.length)];
    petalsHTML += `<div class="evt-petal" style="left:${x}%;width:${sz}px;height:${sz*1.4}px;background:${c};animation-duration:${dur}s;animation-delay:${del}s"></div>`;
  }

  // ── Glows ──
  let glowsHTML = '';
  [{l:'3%',t:'8%',s:90},{r:'5%',t:'12%',s:70},{l:'12%',b:'18%',s:75},{r:'10%',b:'16%',s:55}].forEach(g => {
    glowsHTML += `<div class="evt-glow" style="left:${g.l||'auto'};right:${g.r||'auto'};top:${g.t||'auto'};bottom:${g.b||'auto'};width:${g.s}px;height:${g.s}px"></div>`;
  });

  // ── Bottom scroll ──
  const msgs = [
    {e:'🏮',t:'Trung Thu Vui Vẻ'},
    {e:'🌙',t:'Vui Trung Thu - Học Hay Mỗi Ngày'},
    {e:'🐇',t:'LearnHub Chúc Bạn Trung Thu An Lành'},
    {e:'🌕',t:'Đêm Trung Thu - Đom Đóm Chiếu Sáng'},
    {e:'🏮',t:'Học Hay Mỗi Ngày - Trung Thu An Lành'},
    {e:'🐇',t:'LearnHub - Học Để Thay Đổi Cuộc Sống'}
  ];
  const scrollItems = msgs.map(m => `<span class="evt-scroll-item"><span class="emoji">${m.e}</span>${m.t}</span>`).join('');
  const scrollHTML = `<div class="evt-bottom-bar"><div class="evt-scroll-track">${scrollItems}${scrollItems}</div></div>`;

  overlay.innerHTML = cornersHTML + cloudsHTML + lanternsHTML + starsHTML + petalsHTML + glowsHTML + scrollHTML;
  document.body.appendChild(overlay);
})();
