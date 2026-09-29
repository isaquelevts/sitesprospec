/* =========================================================
   Carrossel de resultados — versão em JS puro do "Halo Reel".
   Card i fica no ângulo θ = i·passo + rotação, numa elipse de raios (rx, ry):
     x = rx·cos θ    y = ry·sin θ    escala = min + (1 − min)·(cos(θ − frente) + 1)/2
   O mesmo número posiciona, dimensiona e empilha o card, então o card que
   parece mais perto sempre está por cima. Um único valor de rotação move o anel
   inteiro (autoplay, arrasto e encaixe), sem recriar nada no DOM.
   ========================================================= */
(() => {
  const stage = document.querySelector('[data-reel]');
  if (!stage) return;

  const TAU = Math.PI * 2;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 820px)');

  // Anel centralizado, card da frente embaixo. `spread` é a distância mínima entre
  // vizinhos na frente do anel, em larguras de card: acima de 1 eles nunca se sobrepõem,
  // então a troca de camada na hora do giro não aparece.
  const configs = {
    desktop: { cx: 0.5, rx: 0.36, ry: 0.2, front: Math.PI / 2, w: 260, h: 347, min: 0.42, spread: 1.18 },
    mobile: { cx: 0.5, rx: 0.42, ry: 0.22, front: Math.PI / 2, w: 170, h: 227, min: 0.45, spread: 1.3 }
  };

  const HOLD = 1100;   // tempo parado com um card na frente (ms)
  const STEP = 650;    // duração de um passo (ms)

  const originals = [...stage.querySelectorAll('.reel__card')];
  const count = originals.length;
  if (!count) return;

  let cfg, W = 0, H = 0, rx = 0, ry = 0, step = 0, slots = count, cardW = 0, cardH = 0;
  let cards = originals.slice();
  let rotation = 0;

  /* ---------- layout ---------- */
  const layout = () => {
    cfg = mobile.matches ? configs.mobile : configs.desktop;
    W = stage.offsetWidth; H = stage.offsetHeight;
    rx = W * cfg.rx; ry = H * cfg.ry;

    // tamanho do card primeiro (cabe na altura do palco)
    const fit = clamp(H / (2 * ry + cfg.h), 0.5, 1);
    cardW = cfg.w * fit; cardH = cfg.h * fit;

    // Quantos cards cabem no anel sem encostar um no outro na frente. Se as fotos
    // não cabem, o anel cresce (no mobile os vizinhos "espiam" pelas bordas da tela)
    // em vez de empilhar cards — era isso que causava a sobreposição estranha.
    const gap = cardW * cfg.spread;
    const next = clamp(Math.floor((TAU * rx) / gap), count, Math.max(count, 24));
    rx = Math.max(rx, (next * gap) / TAU);
    if (next !== slots || cards.length !== next) {
      cards.slice(count).forEach((c) => c.remove());
      cards = originals.slice();
      for (let i = count; i < next; i++) {
        const clone = originals[i % count].cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');   // leitor de tela ouve cada foto uma vez só
        clone.querySelector('img').alt = '';
        stage.appendChild(clone);
        cards.push(clone);
      }
      slots = next;
    }
    step = TAU / slots;

    cards.forEach((c) => {
      c.style.width = cardW + 'px';
      c.style.height = cardH + 'px';
      c.style.left = cfg.cx * 100 + '%';
      c.style.marginLeft = -cardW / 2 + 'px';
      c.style.marginTop = -cardH / 2 + 'px';
    });
    rotation = snapValue(rotation);
    render();
  };

  const render = () => {
    for (let i = 0; i < cards.length; i++) {
      const t = i * step + rotation;
      const depth = Math.cos(t - cfg.front);
      const s = cfg.min + (1 - cfg.min) * ((depth + 1) / 2);
      const c = cards[i];
      c.style.transform = `translate3d(${rx * Math.cos(t)}px, ${ry * Math.sin(t)}px, 0) scale(${s})`;
      c.style.zIndex = Math.round(s * 1000);
      c.style.setProperty('--depth', ((depth + 1) / 2).toFixed(3));
    }
  };

  // card 0 começa na frente; o encaixe é sempre relativo à frente
  const snapValue = (r) => cfg.front + Math.round((r - cfg.front) / step) * step;

  /* ---------- tween (rAF, sem dependências) ---------- */
  let raf = 0;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const tweenTo = (target, ms, done) => {
    cancelAnimationFrame(raf);
    if (reduce.matches || ms <= 0) { rotation = target; render(); done && done(); return; }
    const from = rotation, t0 = performance.now();
    const frame = (now) => {
      const p = Math.min(1, (now - t0) / ms);
      rotation = from + (target - from) * ease(p);
      render();
      if (p < 1) raf = requestAnimationFrame(frame); else done && done();
    };
    raf = requestAnimationFrame(frame);
  };

  /* ---------- autoplay ---------- */
  let timer = 0, hovering = false, dragging = false, visible = false;
  const schedule = () => {
    clearTimeout(timer);
    if (reduce.matches) return;
    timer = setTimeout(() => {
      if (hovering || dragging || !visible) return schedule();
      tweenTo(snapValue(rotation) - step, STEP, schedule);
    }, HOLD);
  };

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.15 }).observe(stage);
  stage.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hovering = true; });
  stage.addEventListener('pointerleave', () => { hovering = false; });

  /* ---------- arrasto ---------- */
  let lastAngle = 0, rect;
  const pointerAngle = (e) =>
    // normalizar pelos raios "desachata" a elipse: arrastar no lado plano gira igual ao lado alto
    Math.atan2((e.clientY - rect.top - H / 2) / (ry || 1), (e.clientX - rect.left - W * cfg.cx) / (rx || 1));

  stage.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    cancelAnimationFrame(raf);
    rect = stage.getBoundingClientRect();
    lastAngle = pointerAngle(e);
    dragging = true;
    stage.classList.add('is-dragging');
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const a = pointerAngle(e);
    // embrulha em (−π, π] para cruzar a "costura" atrás do anel sem dar uma volta inteira
    const delta = ((a - lastAngle + Math.PI * 3) % TAU) - Math.PI;
    lastAngle = a;
    rotation += delta;
    render();
  });
  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    stage.classList.remove('is-dragging');
    if (stage.hasPointerCapture(e.pointerId)) stage.releasePointerCapture(e.pointerId);
    tweenTo(snapValue(rotation), 500, schedule);   // nunca para entre dois cards
  };
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);

  /* ---------- teclado e botões ---------- */
  const spin = (dir) => tweenTo(snapValue(rotation) - dir * step, STEP, schedule);
  stage.addEventListener('keydown', (e) => {
    const dir = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!dir) return;
    e.preventDefault();
    spin(dir);
  });
  document.querySelectorAll('[data-reel-step]').forEach((b) =>
    b.addEventListener('click', () => spin(Number(b.dataset.reelStep))));

  new ResizeObserver(() => layout()).observe(stage);
  mobile.addEventListener('change', () => { rotation = configs[mobile.matches ? 'mobile' : 'desktop'].front; layout(); });
  cfg = mobile.matches ? configs.mobile : configs.desktop;
  rotation = cfg.front;
  layout();
  schedule();
})();
