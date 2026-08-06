(function(){
  const css = document.createElement('style');
  css.textContent = `
    #event-overlay{position:fixed;inset:0;z-index:9998;pointer-events:none;overflow:hidden}
    .evt-moon{position:absolute;top:30px;left:50%;transform:translateX(-50%);width:120px;height:120px;border-radius:50%;background:radial-gradient(circle,#fde68a 0%,#f59e0b 50%,#b45309 100%);box-shadow:0 0 60px rgba(251,191,36,.5),0 0 120px rgba(251,191,36,.25);animation:evtMoonGlow 4s ease-in-out infinite alternate}
    @keyframes evtMoonGlow{from{box-shadow:0 0 60px rgba(251,191,36,.5),0 0 120px rgba(251,191,36,.25)}to{box-shadow:0 0 80px rgba(251,191,36,.7),0 0 160px rgba(251,191,36,.35)}}
    .evt-cloud{position:absolute;background:rgba(255,255,255,.15);border-radius:50%;filter:blur(2px)}
    .evt-cloud.c1{width:200px;height:60px;top:80px;left:-200px;animation:evtCloudDrift 25s linear infinite}
    .evt-cloud.c2{width:160px;height:50px;top:130px;left:-160px;animation:evtCloudDrift 30s 8s linear infinite}
    @keyframes evtCloudDrift{from{transform:translateX(0)}to{transform:translateX(calc(100vw + 400px))}}
    .evt-lantern{position:absolute;animation:evtLanternFloat 5s ease-in-out infinite alternate}
    .evt-lantern-body{width:40px;height:55px;background:linear-gradient(180deg,#ef4444 0%,#dc2626 40%,#b91c1c 100%);border-radius:50% 50% 45% 45%;position:relative;box-shadow:0 0 20px rgba(239,68,68,.4)}
    .evt-lantern-body::before{content:'';position:absolute;top:-8px;left:50%;transform:translateX(-50%);width:20px;height:10px;background:#fbbf24;border-radius:4px 4px 0 0}
    .evt-lantern-body::after{content:'';position:absolute;bottom:-12px;left:50%;transform:translateX(-50%);width:2px;height:12px;background:#fbbf24}
    .evt-lantern-glow{position:absolute;bottom:-20px;left:50%;transform:translateX(-50%);width:60px;height:60px;background:radial-gradient(circle,rgba(251,191,36,.3),transparent 70%);border-radius:50%;animation:evtGlowPulse 2s ease-in-out infinite alternate}
    @keyframes evtLanternFloat{from{transform:translateY(0) rotate(-2deg)}to{transform:translateY(-15px) rotate(2deg)}}
    @keyframes evtGlowPulse{from{opacity:.6;transform:translateX(-50%) scale(1)}to{opacity:1;transform:translateX(-50%) scale(1.15)}}
    .evt-star{position:absolute;width:4px;height:4px;background:#fde68a;border-radius:50%;animation:evtStarTwinkle 2s ease-in-out infinite alternate}
    @keyframes evtStarTwinkle{from{opacity:.3;transform:scale(1)}to{opacity:1;transform:scale(1.5)}}
    .evt-rabbit{position:absolute;bottom:0;font-size:40px;animation:evtRabbitHop 3s ease-in-out infinite}
    @keyframes evtRabbitHop{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
    .evt-petal{position:absolute;width:10px;height:14px;background:rgba(251,191,36,.6);border-radius:50% 0 50% 0;animation:evtPetalFall linear infinite;opacity:.7}
    @keyframes evtPetalFall{0%{transform:translateY(-20px) rotate(0deg);opacity:.8}100%{transform:translateY(100vh) rotate(720deg);opacity:0}}
  `;
  document.head.appendChild(css);

  const overlay = document.createElement('div');
  overlay.id = 'event-overlay';

  let starsHTML = '';
  for(let i=0;i<20;i++){
    const x = Math.random()*100, y = Math.random()*40+5;
    const delay = Math.random()*3, dur = 1.5+Math.random()*2;
    starsHTML += `<div class="evt-star" style="left:${x}%;top:${y}%;animation-delay:${delay}s;animation-duration:${dur}s"></div>`;
  }

  let petalsHTML = '';
  for(let i=0;i<12;i++){
    const x = Math.random()*100;
    const delay = Math.random()*8, dur = 6+Math.random()*6;
    const size = 8+Math.random()*8;
    petalsHTML += `<div class="evt-petal" style="left:${x}%;width:${size}px;height:${size*1.4}px;animation-delay:${delay}s;animation-duration:${dur}s"></div>`;
  }

  overlay.innerHTML = `
    <div class="evt-moon"></div>
    <div class="evt-cloud c1"></div>
    <div class="evt-cloud c2"></div>
    ${starsHTML}
    <div class="evt-lantern" style="left:8%;top:15%;animation-delay:0s">
      <div class="evt-lantern-body"></div><div class="evt-lantern-glow"></div>
    </div>
    <div class="evt-lantern" style="left:20%;top:25%;animation-delay:1.2s">
      <div class="evt-lantern-body"></div><div class="evt-lantern-glow"></div>
    </div>
    <div class="evt-lantern" style="right:8%;top:18%;animation-delay:0.5s">
      <div class="evt-lantern-body"></div><div class="evt-lantern-glow"></div>
    </div>
    <div class="evt-lantern" style="right:22%;top:28%;animation-delay:1.8s">
      <div class="evt-lantern-body"></div><div class="evt-lantern-glow"></div>
    </div>
    <div class="evt-rabbit" style="left:12%;bottom:20px">🐰</div>
    <div class="evt-rabbit" style="right:14%;bottom:30px;animation-delay:0.8s">🐇</div>
    ${petalsHTML}
  `;
  document.body.appendChild(overlay);
})();
