(function(){
  const css = document.createElement('style');
  css.textContent = `
    #event-overlay{position:fixed;inset:0;z-index:9998;pointer-events:none;overflow:hidden}
    .evt-corner{position:absolute;width:120px;height:120px}
    .evt-corner svg{width:100%;height:100%;filter:drop-shadow(0 0 6px rgba(34,197,94,.3))}
    .evt-corner-tl{top:0;left:0}
    .evt-corner-tr{top:0;right:0;transform:scaleX(-1)}
    .evt-corner-bl{bottom:0;left:0;transform:scaleY(-1)}
    .evt-corner-br{bottom:0;right:0;transform:scale(-1,-1)}
    .evt-tree{position:absolute;bottom:0}
    .evt-tree svg{filter:drop-shadow(0 2px 6px rgba(0,0,0,.15))}
    .evt-snow{position:absolute;width:5px;height:5px;background:#fff;border-radius:50%;animation:evtSnowFall linear infinite;opacity:.7}
    @keyframes evtSnowFall{0%{transform:translateY(-10px) translateX(0) rotate(0)}25%{transform:translateY(25vh) translateX(10px) rotate(90deg)}50%{transform:translateY(50vh) translateX(-8px) rotate(180deg)}75%{transform:translateY(75vh) translateX(12px) rotate(270deg)}100%{transform:translateY(105vh) translateX(5px) rotate(360deg)}}
    .evt-star{position:absolute;width:3px;height:3px;background:#fde68a;border-radius:50%;animation:evtS 2s ease-in-out infinite alternate}
    @keyframes evtS{from{opacity:.2;transform:scale(1)}to{opacity:1;transform:scale(1.8)}}
    .evt-bell{position:absolute;animation:evtBellSwing 2s ease-in-out infinite}
    .evt-bell svg{width:30px;height:36px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.15))}
    @keyframes evtBellSwing{0%,100%{transform:rotate(-8deg)}50%{transform:rotate(8deg)}}
    .evt-glow{position:absolute;border-radius:50%;background:radial-gradient(circle,rgba(34,197,94,.12),transparent 70%);animation:evtG 3s ease-in-out infinite alternate}
    @keyframes evtG{from{opacity:.3;transform:scale(1)}to{opacity:.7;transform:scale(1.15)}}
    .evt-candy{position:absolute;animation:evtCandyFall linear infinite}
    @keyframes evtCandyFall{0%{transform:translateY(-20px) rotate(0)}100%{transform:translateY(105vh) rotate(360deg)}}
    .evt-bottom-bar{position:fixed;bottom:0;left:0;right:0;height:40px;overflow:hidden;z-index:9998;pointer-events:none;background:linear-gradient(90deg,rgba(22,101,52,.85),rgba(34,197,94,.85),rgba(22,101,52,.85));backdrop-filter:blur(4px)}
    .evt-scroll-track{display:flex;gap:70px;position:absolute;bottom:10px;white-space:nowrap;animation:evtScroll 20s linear infinite}
    .evt-scroll-item{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:800;color:#fef3c7;text-shadow:0 1px 3px rgba(0,0,0,.4);flex-shrink:0}
    @keyframes evtScroll{from{transform:translateX(100vw)}to{transform:translateX(-100%)}}
  `;
  document.head.appendChild(css);

  const overlay = document.createElement('div');
  overlay.id = 'event-overlay';

  // Corner SVGs
  const cornerSvg = `<svg viewBox="0 0 120 120" fill="none"><path d="M0 0 C35 8,50 35,42 75 C38 95,18 110,0 120" stroke="#22c55e" stroke-width="2.5" fill="none" opacity=".5"/><path d="M0 18 C25 24,38 42,32 70" stroke="#16a34a" stroke-width="1.5" fill="none" opacity=".35"/><path d="M18 0 C24 25,42 38,70 32" stroke="#16a34a" stroke-width="1.5" fill="none" opacity=".35"/><circle cx="16" cy="16" r="8" fill="#ef4444" opacity=".6"/><circle cx="16" cy="16" r="4.5" fill="#dc2626" opacity=".5"/><circle cx="9" cy="35" r="4" fill="#fde68a" opacity=".5"/><circle cx="35" cy="9" r="4" fill="#fde68a" opacity=".5"/><path d="M5 5 L13 0 L13 13 L0 13 Z" fill="#22c55e" opacity=".4"/><circle cx="50" cy="5" r="2" fill="#fff" opacity=".5"/><circle cx="5" cy="50" r="2" fill="#fff" opacity=".5"/></svg>`;
  let cornersHTML = '';
  ['tl','tr','bl','br'].forEach(pos => { cornersHTML += `<div class="evt-corner evt-corner-${pos}">${cornerSvg}</div>`; });

  // Christmas trees
  const treeSvg = `<svg viewBox="0 0 40 70" fill="none"><polygon points="20,5 5,30 15,30 3,50 13,50 0,70 40,70 27,50 37,50 25,30 35,30" fill="#166534"/><rect x="17" y="65" width="6" height="8" fill="#92400e"/><circle cx="15" cy="35" r="2.5" fill="#ef4444"/><circle cx="25" cy="40" r="2" fill="#fde68a"/><circle cx="12" cy="50" r="2" fill="#3b82f6"/><circle cx="28" cy="48" r="2.5" fill="#fde68a"/><circle cx="20" cy="28" r="2" fill="#ef4444"/><polygon points="20,2 18,8 22,8" fill="#fde68a"/></svg>`;
  let treesHTML = `<div class="evt-tree" style="left:20px;bottom:0">${treeSvg}</div>`;
  treesHTML += `<div class="evt-tree" style="right:25px;bottom:0;transform:scale(.85)">${treeSvg}</div>`;
  treesHTML += `<div class="evt-tree" style="left:50%;transform:translateX(-50%) scale(.7);bottom:0">${treeSvg}</div>`;

  // Bells
  const bellSvg = `<svg viewBox="0 0 30 36" fill="none"><path d="M15 2 C15 2,5 8,5 20 C5 28,10 32,15 32 C20 32,25 28,25 20 C25 8,15 2,15 2Z" fill="#fbbf24"/><ellipse cx="15" cy="33" rx="4" ry="3" fill="#f59e0b"/><circle cx="15" cy="2" r="3" fill="#f59e0b"/><path d="M8 16 Q15 12 22 16" stroke="#f59e0b" stroke-width="1.5" fill="none"/></svg>`;
  let bellsHTML = `<div class="evt-bell" style="left:60px;top:30px;transform-origin:top center">${bellSvg}</div>`;
  bellsHTML += `<div class="evt-bell" style="right:55px;top:35px;transform-origin:top center;animation-delay:.8s">${bellSvg}</div>`;

  // Stars
  let starsHTML = '';
  for(let i=0;i<15;i++){
    const x=4+Math.random()*92, y=5+Math.random()*50;
    const dur=1.5+Math.random()*2, del=Math.random()*3;
    starsHTML += `<div class="evt-star" style="left:${x}%;top:${y}%;animation-duration:${dur}s;animation-delay:${del}s"></div>`;
  }

  // Snow
  let snowHTML = '';
  for(let i=0;i<25;i++){
    const x=Math.random()*100, dur=5+Math.random()*8, del=Math.random()*10, sz=3+Math.random()*5;
    snowHTML += `<div class="evt-snow" style="left:${x}%;width:${sz}px;height:${sz}px;animation-duration:${dur}s;animation-delay:${del}s"></div>`;
  }

  // Candy canes
  let candyHTML = '';
  const candySvg = `<svg viewBox="0 0 16 30" fill="none"><path d="M8 30 L8 8 C8 4,4 0,8 0 C12 0,12 4,8 8" stroke="#ef4444" stroke-width="4" fill="none"/><path d="M8 30 L8 8 C8 4,4 0,8 0 C12 0,12 4,8 8" stroke="#fff" stroke-width="4" stroke-dasharray="4 4" fill="none"/></svg>`;
  for(let i=0;i<6;i++){
    const x=Math.random()*100, dur=8+Math.random()*6, del=Math.random()*8;
    candyHTML += `<div class="evt-candy" style="left:${x}%;animation-duration:${dur}s;animation-delay:${del}s">${candySvg}</div>`;
  }

  // Glows
  let glowsHTML = '';
  [{l:'4%',t:'10%',s:80},{r:'6%',t:'14%',s:65}].forEach(g => {
    glowsHTML += `<div class="evt-glow" style="left:${g.l||'auto'};right:${g.r||'auto'};top:${g.t};width:${g.s}px;height:${g.s}px"></div>`;
  });

  // Bottom scroll
  const msgs = [
    {e:'🎄',t:'Merry Christmas - Giáng Sinh An Lành'},
    {e:'⭐',t:'Chúc bạn Giáng Sinh vui vẻ và ấm áp'},
    {e:'🎅',t:'LearnHub chúc bạn mùa Giáng Sinh hạnh phúc'},
    {e:'🔔',t:'Jingle Bells - Giáng Sinh đến rồi'}
  ];
  const scrollItems = msgs.map(m => `<span class="evt-scroll-item"><span class="emoji">${m.e}</span>${m.t}</span>`).join('');

  overlay.innerHTML = cornersHTML + treesHTML + bellsHTML + starsHTML + snowHTML + candyHTML + glowsHTML + `<div class="evt-bottom-bar"><div class="evt-scroll-track">${scrollItems}${scrollItems}</div></div>`;
  document.body.appendChild(overlay);
})();
