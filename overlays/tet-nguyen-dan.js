(function(){
  const css = document.createElement('style');
  css.textContent = `
    #event-overlay{position:fixed;inset:0;z-index:9998;pointer-events:none;overflow:hidden}
    .evt-corner{position:absolute;width:120px;height:120px}
    .evt-corner svg{width:100%;height:100%;filter:drop-shadow(0 0 8px rgba(239,68,68,.35))}
    .evt-corner-tl{top:0;left:0}
    .evt-corner-tr{top:0;right:0;transform:scaleX(-1)}
    .evt-corner-bl{bottom:0;left:0;transform:scaleY(-1)}
    .evt-corner-br{bottom:0;right:0;transform:scale(-1,-1)}
    .evt-lantern{position:absolute;animation:evtLf 4s ease-in-out infinite alternate}
    .evt-lantern svg{width:32px;height:44px;filter:drop-shadow(0 2px 8px rgba(239,68,68,.4))}
    @keyframes evtLf{from{transform:translateY(0) rotate(-3deg)}to{transform:translateY(-10px) rotate(3deg)}}
    .evt-star{position:absolute;width:3px;height:3px;background:#fde68a;border-radius:50%;animation:evtS 2s ease-in-out infinite alternate}
    @keyframes evtS{from{opacity:.2;transform:scale(1)}to{opacity:1;transform:scale(1.8)}}
    .evt-petal{position:absolute;animation:evtPetalFall linear infinite}
    @keyframes evtPetalFall{0%{transform:translateY(-20px) translateX(0) rotate(0);opacity:.8}50%{transform:translateY(50vh) translateX(12px) rotate(180deg);opacity:.5}100%{transform:translateY(105vh) translateX(-8px) rotate(360deg);opacity:0}}
    .evt-blossom{position:absolute;animation:evtBlossomFall linear infinite}
    @keyframes evtBlossomFall{0%{transform:translateY(-15px) translateX(0) rotate(0) scale(1);opacity:.9}100%{transform:translateY(105vh) translateX(20px) rotate(540deg) scale(.5);opacity:0}}
    .evt-glow{position:absolute;border-radius:50%;background:radial-gradient(circle,rgba(239,68,68,.12),transparent 70%);animation:evtG 3s ease-in-out infinite alternate}
    @keyframes evtG{from{opacity:.3;transform:scale(1)}to{opacity:.7;transform:scale(1.15)}}
    .evt-bottom-bar{position:fixed;bottom:0;left:0;right:0;height:40px;overflow:hidden;z-index:9998;pointer-events:none;background:linear-gradient(90deg,rgba(185,28,28,.85),rgba(220,38,38,.9),rgba(185,28,28,.85));backdrop-filter:blur(4px)}
    .evt-scroll-track{display:flex;gap:70px;position:absolute;bottom:10px;white-space:nowrap;animation:evtScroll 20s linear infinite}
    .evt-scroll-item{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:800;color:#fef3c7;text-shadow:0 1px 3px rgba(0,0,0,.4);flex-shrink:0}
    @keyframes evtScroll{from{transform:translateX(100vw)}to{transform:translateX(-100%)}}
  `;
  document.head.appendChild(css);

  document.body.insertAdjacentHTML('beforeend', `<svg width="0" height="0" style="position:absolute"><defs><radialGradient id="lg2" cx="50%" cy="40%"><stop offset="0%" stop-color="#fbbf24" stop-opacity=".5"/><stop offset="100%" stop-color="#dc2626" stop-opacity="0"/></radialGradient></defs></svg>`);

  const overlay = document.createElement('div');
  overlay.id = 'event-overlay';

  // Corners
  const cornerSvg = `<svg viewBox="0 0 120 120" fill="none"><path d="M0 0 C35 8,50 35,42 75 C38 95,18 110,0 120" stroke="#dc2626" stroke-width="2.5" fill="none" opacity=".5"/><path d="M0 18 C25 24,38 42,32 70" stroke="#ef4444" stroke-width="1.5" fill="none" opacity=".35"/><path d="M18 0 C24 25,42 38,70 32" stroke="#ef4444" stroke-width="1.5" fill="none" opacity=".35"/><circle cx="16" cy="16" r="9" fill="#fde68a" opacity=".7"/><circle cx="16" cy="16" r="5.5" fill="#fbbf24" opacity=".5"/><circle cx="9" cy="35" r="4" fill="#fcd34d" opacity=".5"/><circle cx="35" cy="9" r="4" fill="#fcd34d" opacity=".5"/><path d="M5 5 L13 0 L13 13 L0 13 Z" fill="#dc2626" opacity=".4"/><circle cx="50" cy="5" r="2" fill="#fde68a" opacity=".4"/><circle cx="5" cy="50" r="2" fill="#fde68a" opacity=".4"/></svg>`;
  let cornersHTML = '';
  ['tl','tr','bl','br'].forEach(pos => { cornersHTML += `<div class="evt-corner evt-corner-${pos}">${cornerSvg}</div>`; });

  // Lanterns
  const lanternSvg = `<svg viewBox="0 0 32 44" fill="none"><rect x="11" y="0" width="10" height="6" rx="2" fill="#fbbf24"/><line x1="16" y1="6" x2="16" y2="10" stroke="#fbbf24" stroke-width="1.5"/><ellipse cx="16" cy="27" rx="13" ry="15" fill="#dc2626"/><ellipse cx="16" cy="27" rx="13" ry="15" fill="url(#lg2)" opacity=".5"/><line x1="16" y1="10" x2="16" y2="42" stroke="#fbbf24" stroke-width="1"/><path d="M9 42 Q16 46 23 42" stroke="#fbbf24" stroke-width="1.5" fill="none"/><text x="16" y="31" text-anchor="middle" fill="#fef3c7" font-size="9" font-weight="bold">福</text></svg>`;
  const lp = [{l:'40px',t:'15px',d:'0s'},{l:'12px',t:'85px',d:'1.3s'},{r:'140px',t:'20px',d:'0.6s'},{r:'35px',t:'95px',d:'1.8s'}];
  let lanternsHTML = '';
  lp.forEach(p => {
    lanternsHTML += `<div class="evt-lantern" style="left:${p.l||'auto'};right:${p.r||'auto'};top:${p.t};animation-delay:${p.d}">${lanternSvg}</div>`;
  });

  // Stars
  let starsHTML = '';
  for(let i=0;i<18;i++){
    const x=4+Math.random()*92, y=5+Math.random()*50;
    const dur=1.5+Math.random()*2, del=Math.random()*3;
    starsHTML += `<div class="evt-star" style="left:${x}%;top:${y}%;animation-duration:${dur}s;animation-delay:${del}s"></div>`;
  }

  // Falling petals (hoa mai/hoa dao)
  let petalsHTML = '';
  const petalColors = ['#fde68a','#fbbf24','#fca5a5','#fecdd3','#fef3c7'];
  for(let i=0;i<18;i++){
    const x=Math.random()*100, dur=7+Math.random()*7, del=Math.random()*10, sz=5+Math.random()*7;
    const c = petalColors[Math.floor(Math.random()*petalColors.length)];
    petalsHTML += `<div class="evt-petal" style="left:${x}%;width:${sz}px;height:${sz*1.3}px;background:${c};border-radius:50% 0 50% 0;animation-duration:${dur}s;animation-delay:${del}s"></div>`;
  }

  // Blossoms (hoa mai)
  let blossomHTML = '';
  for(let i=0;i<10;i++){
    const x=Math.random()*100, dur=9+Math.random()*6, del=Math.random()*8, sz=8+Math.random()*6;
    blossomHTML += `<div class="evt-blossom" style="left:${x}%;font-size:${sz}px;animation-duration:${dur}s;animation-delay:${del}s">🌸</div>`;
  }

  // Glows
  let glowsHTML = '';
  [{l:'4%',t:'10%',s:80},{r:'6%',t:'14%',s:65},{l:'14%',b:'20%',s:70},{r:'12%',b:'18%',s:50}].forEach(g => {
    glowsHTML += `<div class="evt-glow" style="left:${g.l||'auto'};right:${g.r||'auto'};top:${g.t||'auto'};bottom:${g.b||'auto'};width:${g.s}px;height:${g.s}px"></div>`;
  });

  // Bottom scroll
  const msgs = [
    {e:'🧧',t:'Chúc Mừng Năm Mới - An Khang Thịnh Vượng'},
    {e:'🏮',t:'Năm Mới Vạn Sự Như Ý'},
    {e:'🎊',t:'LearnHub chúc bạn Năm Mới bình an'},
    {e:'🌸',t:'Hoa Mài Nở - Năm Mới Đến'}
  ];
  const scrollItems = msgs.map(m => `<span class="evt-scroll-item"><span class="emoji">${m.e}</span>${m.t}</span>`).join('');

  overlay.innerHTML = cornersHTML + lanternsHTML + starsHTML + petalsHTML + blossomHTML + glowsHTML + `<div class="evt-bottom-bar"><div class="evt-scroll-track">${scrollItems}${scrollItems}</div></div>`;
  document.body.appendChild(overlay);
})();
