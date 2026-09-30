/* =========================================================
   Cards de Tratamentos no mobile: carrossel automático infinito.
   Os cards ficam numa faixa que desliza sem parar; uma cópia da faixa
   vem logo atrás, então quando a primeira sai pela esquerda a posição
   volta uma "volta" inteira e o movimento nunca tem emenda.
   Dá para arrastar com o dedo; ao soltar o giro retoma suave.
   No desktop o layout em escada continua igual (a faixa vira display: contents).
   ========================================================= */
(() => {
  const deck = document.querySelector('.classes__deck');
  if (!deck) return;

  const mq = matchMedia('(max-width: 900px)');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const SPEED = 38;   // px por segundo

  // faixa + uma cópia dos cards (cópias escondidas do leitor de tela e do teclado)
  const originals = [...deck.querySelectorAll('.classes__card')];
  const track = document.createElement('div');
  track.className = 'classes__track';
  originals.forEach((c) => track.appendChild(c));
  originals.forEach((c) => {
    const k = c.cloneNode(true);
    k.setAttribute('aria-hidden', 'true');
    k.tabIndex = -1;
    k.dataset.clone = '';
    k.querySelector('img').alt = '';
    track.appendChild(k);
  });
  deck.appendChild(track);

  let active = false, visible = false, dragging = false;
  let x = 0, setW = 0, velocity = 0, last = 0, lastX = 0, moved = 0;

  const measure = () => {
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    setW = originals.reduce((sum, c) => sum + c.offsetWidth + gap, 0);
  };
  const wrap = () => {
    if (!setW) return;
    while (x <= -setW) x += setW;
    while (x > 0) x -= setW;
  };
  const apply = () => { track.style.transform = `translate3d(${x}px, 0, 0)`; };

  const setup = () => {
    active = mq.matches && !reduce.matches;
    deck.classList.toggle('is-marquee', active);
    if (active) { measure(); wrap(); apply(); }
    else { x = 0; track.style.transform = ''; }
  };

  const loop = (now) => {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    const target = active && visible && !dragging ? SPEED : 0;
    velocity += (target - velocity) * Math.min(1, dt * 3);   // acelera/desacelera suave
    if (active && !dragging && velocity > 0.01) {
      x -= velocity * dt;
      wrap();
      apply();
    }
    requestAnimationFrame(loop);
  };

  /* ---------- arrasto com o dedo ---------- */
  deck.addEventListener('pointerdown', (e) => {
    if (!active || (e.pointerType === 'mouse' && e.button !== 0)) return;
    dragging = true; moved = 0; lastX = e.clientX;
  });
  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    moved += Math.abs(dx);
    x += dx;
    wrap();
    apply();
  });
  const end = () => { dragging = false; };
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);
  // arrastou? então não abre o link do card ao soltar
  deck.addEventListener('click', (e) => { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } moved = 0; }, true);
  deck.addEventListener('dragstart', (e) => e.preventDefault());

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.05 }).observe(deck);
  new ResizeObserver(() => { if (active) { measure(); wrap(); apply(); } }).observe(deck);
  mq.addEventListener('change', setup);
  reduce.addEventListener('change', setup);

  setup();
  requestAnimationFrame(loop);
})();
