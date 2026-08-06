(function(){
  const css = document.createElement('style');
  css.textContent = `
    #event-overlay{position:fixed;inset:0;z-index:9998;pointer-events:none;overflow:hidden}
    .evt-corner{position:absolute;width:120px;height:120px}
    .evt-corner svg{width:100%;height:100%;filter:drop-shadow(0 0 8px rgba(168,85,247,.3))}
    .evt-corner-tl{top:0;left:0}
    .evt-corner-tr{top:0;right:0;transform:scaleX(-1)}
    .evt-corner-bl{bottom:0;left:0;transform:scaleY(-1)}
    .evt-corner-br{bottom:0;right:0;transform:scale(-1,-1)}
    .evt-pumpkin{position:absolute;animation:evtPumpkinGlow 3s ease-in-out infinite alternate}
    .evt-pumpkin svg{filter:drop-shadow(0 4px 10px rgba(249,115,22,.4))}
    @keyframes evtPumpkinGlow{from{filter:drop-shadow(0 0 8px rgba(249,115,22,.3))}to{filter:drop-shadow(0 0 18px rgba(249,115,22,.6))}}
    .evt-bat{position:absolute;animation:evtBatFly linear infinite}
    @keyframes evtBatFly{0%{transform:translateY(0) translateX(0) scaleX(1)}25%{transform:translateY(-15px) translateX(30px) scaleX(1)}50%{transform:translateY(5px) translateX(60px) scaleX(-1)}75%{transform:translateY(-10px) translateX(30px) scaleX(1)}100%{transform:translateY(0) translateX(0) scaleX(1)}}
    .evt-bat svg{width:28px;height:20px;animation:evtBatWing .3s ease-in-out infinite alternate}
    @keyframes evtBatWing{from{transform:scaleX(1)}to{transform:scaleX(.85)}}
    .evt-ghost{position:absolute;animation:evtGhostFloat 5s ease-in-out infinite}
    @keyframes evtGhostFloat{0%,100%{transform:translateY(0) translateX(0);opacity:.6}50%{transform:translateY(-20px) translateX(10px);opacity:.9}}
    .evt-ghost svg{width:30px;height:36px}
    .evt-star{position:absolute;width:3px;height:3px;background:#a78bfa;border-radius:50%;animation:evtS 2s ease-in-out infinite alternate}
    @keyframes evtS{from{opacity:.2;transform:scale(1)}to{opacity:1;transform:scale(1.8)}}
    .evt-candy{position:absolute;animation:evtCandyFall linear infinite}
    @keyframes evtCandyFall{0%{transform:translateY(-20px) rotate(0)}100%{transform:translateY(105vh) rotate(360deg)}}
    .evt-glow{position:absolute;border-radius:50%;background:radial-gradient(circle,rgba(168,85,247,.12),transparent 70%);animation:evtG 3s ease-in-out infinite alternate}
    @keyframes evtG{from{opacity:.3;transform:scale(1)}to{opacity:.7;transform:scale(1.15)}}
    .evt-bottom-bar{position:fixed;bottom:0;left:0;right:0;height:40px;overflow:hidden;z-index:9998;pointer-events:none;background:linear-gradient(90deg,rgba(88,28,135,.85),rgba(168,85,247,.85),rgba(88,28,135,.85));backdrop-filter:blur(4px)}
    .evt-scroll-track{display:flex;gap:70px;position:absolute;bottom:10px;white-space:nowrap;animation:evtScroll 20s linear infinite}
    .evt-scroll-item{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:800;color:#fde68a;text-shadow:0 1px 3px rgba(0,0,0,.4);flex-shrink:0}
    @keyframes evtScroll{from{transform:translateX(100vw)}to{transform:translateX(-100%)}}
  `;
  document.head.appendChild(css);

  document.body.insertAdjacentHTML('beforeend', `<svg width="0" height="0" style="position:absolute"><defs><radialGradient id="pg" cx="50%" cy="40%"><stop offset="0%" stop-color="#fbbf24" stop-opacity=".4"/><stop offset="100%" stop-color="#f97316" stop-opacity="0"/></radialGradient></defs></svg>`);

  const overlay = document.createElement('div');
  overlay.id = 'event-overlay';

  // Corners
  const cornerSvg = `<svg viewBox="0 0 120 120" fill="none"><path d="M0 0 C35 8,50 35,42 75 C38 95,18 110,0 120" stroke="#7c3aed" stroke-width="2.5" fill="none" opacity=".5"/><path d="M0 18 C25 24,38 42,32 70" stroke="#a78bfa" stroke-width="1.5" fill="none" opacity=".35"/><path d="M18 0 C24 25,42 38,70 32" stroke="#a78bfa" stroke-width="1.5" fill="none" opacity=".35"/><circle cx="16" cy="16" r="8" fill="#f97316" opacity=".6"/><circle cx="16" cy="16" r="4.5" fill="#fbbf24" opacity=".5"/><circle cx="9" cy="35" r="4" fill="#a78bfa" opacity=".5"/><circle cx="35" cy="9" r="4" fill="#a78bfa" opacity=".5"/><path d="M5 5 L13 0 L13 13 L0 13 Z" fill="#7c3aed" opacity=".4"/><circle cx="50" cy="5" r="2" fill="#fde68a" opacity=".4"/><circle cx="5" cy="50" r="2" fill="#fde68a" opacity=".4"/></svg>`;
  let cornersHTML = '';
  ['tl','tr','bl','br'].forEach(pos => { cornersHTML += `<div class="evt-corner evt-corner-${pos}">${cornerSvg}</div>`; });

  // Pumpkins
  const pumpkinSvg = `<svg viewBox="0 0 36 36" fill="none"><ellipse cx="18" cy="22" rx="14" ry="12" fill="#f97316"/><ellipse cx="18" cy="22" rx="14" ry="12" fill="url(#pg)" opacity=".4"/><path d="M18 10 Q16 4,18 2 Q20 4,18 10" fill="#16a34a"/><polygon points="12,18 14,14 16,18" fill="#fde68a"/><polygon points="20,18 22,14 24,18" fill="#fde68a"/><path d="M13,24 Q18,28 23,24" stroke="#92400e" stroke-width="1.5" fill="none"/></svg>`;
  let pumpkinsHTML = `<div class="evt-pumpkin" style="left:30px;bottom:0">${pumpkinSvg}</div>`;
  pumpkinsHTML += `<div class="evt-pumpkin" style="right:35px;bottom:0;transform:scale(.8);animation-delay:1s">${pumpkinSvg}</div>`;

  // Bats
  const batSvg = `<svg viewBox="0 0 28 20" fill="none"><path d="M14 8 C10 2,2 0,0 6 C2 4,6 6,8 10 C4 8,0 10,0 14 C4 10,8 10,14 14 C20 10,24 10,28 14 C28 10,24 8,20 10 C22 6,26 4,28 6 C26 0,18 2,14 8Z" fill="#1e1b4b"/><circle cx="11" cy="7" r="1.2" fill="#fde68a"/><circle cx="17" cy="7" r="1.2" fill="#fde68a"/></svg>`;
  let batsHTML = '';
  for(let i=0;i<4;i++){
    const x=10+Math.random()*70, y=15+Math.random()*35;
    const dur=8+Math.random()*6, del=Math.random()*5;
    batsHTML += `<div class="evt-bat" style="left:${x}%;top:${y}%;animation-duration:${dur}s;animation-delay:${del}s">${batSvg}</div>`;
  }

  // Ghosts
  const ghostSvg = `<svg viewBox="0 0 30 36" fill="none"><path d="M5 18 C5 8,10 2,15 2 C20 2,25 8,25 18 L25 30 C23 28,21 30,19 28 C17 30,15 28,13 30 C11 28,9 30,7 28 L5 30 Z" fill="#f5f5f4" opacity=".7"/><circle cx="12" cy="14" r="2" fill="#1e1b4b"/><circle cx="18" cy="14" r="2" fill="#1e1b4b"/><ellipse cx="15" cy="20" rx="3" ry="2" fill="#1e1b4b" opacity=".5"/></svg>`;
  let ghostsHTML = `<div class="evt-ghost" style="left:15%;top:25%">${ghostSvg}</div>`;
  ghostsHTML += `<div class="evt-ghost" style="right:12%;top:30%;animation-delay:2s;transform:scale(.85)">${ghostSvg}</div>`;

  // Stars
  let starsHTML = '';
  for(let i=0;i<18;i++){
    const x=4+Math.random()*92, y=5+Math.random()*50;
    const dur=1.5+Math.random()*2, del=Math.random()*3;
    starsHTML += `<div class="evt-star" style="left:${x}%;top:${y}%;animation-duration:${dur}s;animation-delay:${del}s"></div>`;
  }

  // Candy
  let candyHTML = '';
  const candyEmojis = ['🍬','🍭','🍫','🎃'];
  for(let i=0;i<8;i++){
    const x=Math.random()*100, dur=8+Math.random()*6, del=Math.random()*8, sz=14+Math.random()*8;
    const e = candyEmojis[Math.floor(Math.random()*candyEmojis.length)];
    candyHTML += `<div class="evt-candy" style="left:${x}%;font-size:${sz}px;animation-duration:${dur}s;animation-delay:${del}s">${e}</div>`;
  }

  // Glows
  let glowsHTML = '';
  [{l:'4%',t:'10%',s:80},{r:'6%',t:'14%',s:65},{l:'14%',b:'20%',s:70},{r:'12%',b:'18%',s:50}].forEach(g => {
    glowsHTML += `<div class="evt-glow" style="left:${g.l||'auto'};right:${g.r||'auto'};top:${g.t||'auto'};bottom:${g.b||'auto'};width:${g.s}px;height:${g.s}px"></div>`;
  });

  // Bottom scroll
  const msgs = [
    {e:'🎃',t:'Happy Halloween - Halloween Vui Vẻ'},
    {e:'👻',t:'Chúc bạn Halloween đáng nhớ'},
    {e:'🦇',t:'LearnHub chúc bạn mùa Halloween an toàn'},
    {e:'🍬',t:'Trick or Treat - Bánh kẹo nào'}
  ];
  const scrollItems = msgs.map(m => `<span class="evt-scroll-item"><span class="emoji">${m.e}</span>${m.t}</span>`).join('');

  overlay.innerHTML = cornersHTML + pumpkinsHTML + batsHTML + ghostsHTML + starsHTML + candyHTML + glowsHTML + `<div class="evt-bottom-bar"><div class="evt-scroll-track">${scrollItems}${scrollItems}</div></div>`;
  document.body.appendChild(overlay);
})();
