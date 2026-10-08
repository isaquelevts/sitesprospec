/* Big Bang v2 · conteúdo programático (GSAP 3.13 + ScrollTrigger) — inspirado no showreel da GSAP
 *
 * Desktop (fixado): a rolagem vertical empurra a coluna de texto da direita para cima, em ritmo constante.
 *   - o módulo no centro fica em destaque, os vizinhos apagam;
 *   - a cada módulo, a imagem seguinte nasce como um retângulo pequeno no centro do quadro e cresce até cobri-lo,
 *     com um zoom de saída — enquanto o texto continua subindo;
 *   - o fundo (a mesma imagem, desfocada e com baixa opacidade) faz um crossfade junto com a imagem da frente.
 *   - o conteúdo de cada módulo (contador, título, tópicos) entra com text reveal quando ele chega ao centro;
 *   - "travadinha" suave: ao parar de rolar, a página completa sozinha até o módulo seguinte (ou volta ao atual),
 *     na direção em que você estava indo; perto das pontas deixa você sair da seção normalmente.
 * Celular / menos movimento: pilha vertical com a imagem dentro de cada módulo.
 *
 * Imagens: assets/mod-01.webp … mod-09.webp, usadas no quadro ([data-pf]) e no fundo ([data-bg]), na mesma ordem.
 * Recorte opcional por imagem: --pos, --zoom, --origin no style da <figure>.
 */
(() => {
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  const fx = window.__fx || {};
  const EASE = fx.EASE || "power3.out";

  const prog = document.querySelector(".prog");
  if (!prog) return;
  const pin = prog.querySelector(".prog__pin");
  const stage = prog.querySelector(".prog__stage");
  const texts = prog.querySelector(".prog__texts");
  const track = prog.querySelector(".prog__track");
  const head = prog.querySelector(".prog__head");
  const pfs = [...prog.querySelectorAll("[data-pf]")];
  const bgs = [...prog.querySelectorAll("[data-bg]")];
  const pts = [...prog.querySelectorAll("[data-pt]")];
  const bar = prog.querySelector(".prog__bar span");
  const n = pts.length;

  const BG_OPACITY = 0.24;        // opacidade do fundo desfocado
  const HOLD = 0.12;             // folga (em "módulos") parada no começo e no fim do trecho fixado (curta: não vira "rolada perdida")
  const GROW = 0.7;              // duração (em "módulos") do crescimento da imagem
  const clamp = gsap.utils.clamp;

  const mm = gsap.matchMedia();
  mm.add({
    pinned: "(min-width: 900px) and (prefers-reduced-motion: no-preference)",
    stacked: "(max-width: 899px) and (prefers-reduced-motion: no-preference)",
    still: "(prefers-reduced-motion: reduce)",
  }, (ctx) => {
    const { pinned, stacked } = ctx.conditions;
    const headReveal = (pinned || stacked) && fx.heliosReveal ? fx.heliosReveal(head.querySelectorAll("[data-prog-text]")) : null;
    const clones = [], cleanups = [];

    /* ---------- celular / menos movimento: imagem dentro de cada módulo ---------- */
    if (!pinned) {
      pts.forEach((pt, i) => {
        const fig = document.createElement("div");
        fig.className = "pt__fig";
        const pf = pfs[i].cloneNode(true);
        pf.removeAttribute("data-pf");
        fig.appendChild(pf);
        pt.prepend(fig);
        clones.push(fig);
      });
    }

    if (pinned) {
      prog.classList.add("is-pinned");

      const stepPx = () => Math.round(Math.min(Math.max(innerHeight * 0.6, 400), 600));    // altura de cada bloco de texto = distância entre módulos
      const applyStep = () => prog.style.setProperty("--step", stepPx() + "px");
      applyStep();
      const y0 = () => (texts.clientHeight - stepPx()) / 2;                                // bloco 0 centralizado na coluna
      const total = n - 1 + 2 * HOLD;

      // decodifica as imagens com folga (~1,5 tela antes): a 1ª troca não engasga carregando/decodificando
      ScrollTrigger.create({
        trigger: prog, start: "top bottom+=150%", once: true,
        onEnter: () => pfs.forEach((pf) => { const img = pf.querySelector("img"); img.loading = "eager"; img.decode?.().catch(() => {}); }),
      });

      // estados iniciais
      gsap.set(pfs.slice(1), { clipPath: "inset(50% 50% 50% 50%)" });                 // fechadas: nada aparece até chegar a hora
      gsap.set(bgs, { opacity: 0 });
      gsap.set(bgs[0], { opacity: BG_OPACITY });
      gsap.set(stage, { autoAlpha: 0, y: 50 });

      const dim = (pos) => pts.forEach((pt, i) => {                                         // destaque do módulo mais próximo do centro
        pt.style.opacity = Math.max(0.12, 1 - Math.abs(i - pos) * 0.9).toFixed(3);
      });
      const setBar = gsap.quickSetter(bar, "scaleX");

      /* ----- text reveal de cada módulo: contador, título (palavra por palavra) e tópicos ----- */
      let enabled = false, cur = -1;
      const splits = pts.map((pt) => SplitText.create(pt.querySelector(".pt__title"), { type: "words", wordsClass: "wd" }));
      cleanups.push(() => splits.forEach((sp) => sp.revert()));
      const reveals = pts.map((pt, i) => {
        const count = pt.querySelector(".pt__count"), words = splits[i].words, lis = pt.querySelectorAll(".pt__list li");
        gsap.set([count, ...words, ...lis], { autoAlpha: 0 });
        gsap.set(count, { y: 14 });
        gsap.set(words, { y: "0.45em", filter: "blur(10px)" });
        gsap.set(lis, { y: 18, filter: "blur(6px)" });
        return gsap.timeline({ paused: true })
          .to(count, { autoAlpha: 1, y: 0, duration: 0.7, ease: EASE }, 0)
          .to(words, { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 0.9, ease: EASE, stagger: 0.07 }, 0.08)
          .to(lis, { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 0.85, ease: EASE, stagger: 0.08 }, 0.4);
      });
      const setCurrent = (i) => {
        if (!enabled || i === cur) return;
        if (cur >= 0) reveals[cur].timeScale(2.4).reverse();             // o anterior sai rápido
        cur = i;
        reveals[i].timeScale(1).play();
      };

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: prog,
          start: "top top",
          end: () => "+=" + Math.round(total * stepPx()),
          pin,
          anticipatePin: 1,
          scrub: 0.2,                                                                       // o encaixe já é suave; isto só dá o "peso"
          invalidateOnRefresh: true,
          onRefresh: (self) => { applyStep(); dim(clamp(0, n - 1, self.progress * total - HOLD)); },
          onUpdate: (self) => {
            const pos = clamp(0, n - 1, self.progress * total - HOLD);
            dim(pos);
            setBar(self.progress);
            if (cur < 0 || Math.abs(pos - cur) > 0.6) setCurrent(Math.round(pos));      // histerese: só troca ao passar do meio
          },
        },
      });

      // texto sobe em ritmo constante
      tl.fromTo(track, { y: () => y0() }, { y: () => y0() - (n - 1) * stepPx(), duration: n - 1 }, HOLD);

      for (let i = 1; i < n; i++) {
        const at = HOLD + i - GROW - 0.15;                                                  // termina um pouco antes do texto i chegar ao centro
        tl.fromTo(pfs[i], { clipPath: "inset(50% 50% 50% 50%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: GROW, ease: "power3.inOut" }, at)
          .fromTo(pfs[i].querySelector("img"), { scale: 1.5 }, { scale: 1, duration: GROW + 0.25, ease: "power2.out" }, at)
          .to(pfs[i - 1].querySelector("img"), { scale: 1.12, duration: GROW, ease: "power1.in" }, at)
          .fromTo(bgs[i], { opacity: 0 }, { opacity: BG_OPACITY, duration: GROW, ease: "power1.inOut" }, at)
          .to(bgs[i - 1], { opacity: 0, duration: GROW, ease: "power1.inOut" }, at);
      }
      tl.to({}, { duration: 0.0001 }, total);                                                // fixa a duração total (inclui a folga do fim)
      dim(0);

      // entrada: cabeçalho no reveal da Helios, quadro e texto sobem
      const st = tl.scrollTrigger;
      if (fx.arm) fx.arm(prog, "top 72%",
        () => {
          headReveal?.play();
          gsap.to(stage, { autoAlpha: 1, y: 0, duration: 1.1, ease: EASE });
          enabled = true;
          setCurrent(Math.round(clamp(0, n - 1, st.progress * total - HOLD)));
        },
        () => {
          headReveal?.reverse();
          gsap.to(stage, { autoAlpha: 0, y: 50, duration: 0.6, ease: "power2.in" });
          if (cur >= 0) reveals[cur].timeScale(2.4).reverse();
          cur = -1; enabled = false;
        });

      /* ----- "travadinha": cada gesto de rolagem leva exatamente ao módulo seguinte ----- *
       * O gesto é interceptado no Lenis (virtualScroll) e vira UM movimento suave até o módulo, na hora —
       * sem esperar a rolagem parar. A inércia do trackpad que sobra é absorvida. Entrando na seção (de cima
       * ou de baixo), um gesto só já leva ao 1º/último módulo; gestos rápidos em sequência encadeiam um módulo
       * cada. Saindo pelas pontas a rolagem passa direto. Teclado/barra/toque: encaixe ao parar (fallback). */
      const lenis = window.__lenis;
      const SNAP_DUR = 1.1;                                                               // segundos por módulo
      // curva de Hermite: começa na velocidade em que a página já estava (s = inclinação inicial) e assenta
      // com velocidade zero — sem freada nem arranque quando o encaixe assume a rolagem
      const hermite = (s) => (t) => s * (t * t * t - 2 * t * t + t) + (3 * t * t - 2 * t * t * t);
      let vel = 0, lastY = 0, lastYT = 0;                                                 // velocidade real da rolagem (px/s)
      const yOf = (m) => st.start + ((m + HOLD) / total) * (st.end - st.start);
      const rawAt = (y) => ((y - st.start) / (st.end - st.start)) * total - HOLD;       // posição em "módulos"; 0 = 1º centralizado
      const entry = () => Math.round(innerHeight * 0.6);                                 // a partir de quando a seção "puxa" o gesto
      let moving = false, absorbing = false, moveEnd = 0, lastT = 0, lastAbs = 0, acc = 0, guard = 0, idleTimer = 0;
      let curTo = 0, moveDir = 1, fromY = 0, toY = 1;

      const go = (m) => {
        moving = true; absorbing = true; acc = 0;
        clearTimeout(guard);
        const done = () => { if (!moving) return; moving = false; moveEnd = performance.now(); };
        const from = lenis.animatedScroll, to = yOf(m), dist = to - from;
        curTo = m; fromY = from; toY = to; moveDir = Math.sign(dist) || 1;
        const fresh = performance.now() - lastYT < 100;
        const v = fresh && Math.sign(dist) === Math.sign(vel) ? Math.abs(vel) : 0;     // só aproveita velocidade no mesmo sentido
        const dur = v > 0 ? clamp(0.6, SNAP_DUR, (3 * Math.abs(dist)) / v) : SNAP_DUR;
        const sl = clamp(1.3, 3, Math.abs(dist) > 1 ? (v * dur) / Math.abs(dist) : 1.3);
        guard = setTimeout(done, dur * 1000 + 300);                                      // trava de segurança
        lenis.scrollTo(to, { duration: dur, easing: hermite(sl), lock: true, force: true, onComplete: done });
      };
      const swallow = (e) => { if (e.cancelable) e.preventDefault(); return false; };

      const onVirtual = ({ deltaY, event }) => {
        if (!event.type.includes("wheel") || event.ctrlKey) return true;               // toque/zoom: comportamento normal
        const now = performance.now(), abs = Math.abs(deltaY), gap = now - lastT;
        // gesto novo (não é rabo de inércia): pausa, aceleração, ou um "clique" de roda de mouse (delta grande e isolado)
        const fresh = gap > 180 || abs > lastAbs * 1.7 + 6 || (abs >= 90 && gap >= 60);
        lastT = now; lastAbs = abs;
        const dir = Math.sign(deltaY);
        if (!dir) return true;
        if (fresh) { acc = 0; absorbing = false; }
        acc += abs;

        if (moving) {                                                                      // já indo para um módulo
          const pr = toY !== fromY ? (lenis.animatedScroll - fromY) / (toY - fromY) : 1;
          if (fresh && acc >= 18 && dir === moveDir && pr > 0.12) {                        // outro clique: encadeia o próximo
            const nxt = curTo + dir;
            if (nxt >= 0 && nxt <= n - 1) go(nxt);
          }
          return swallow(event);
        }
        const y = lenis.targetScroll, E = entry();
        if (y < st.start - E || y > st.end + E) return true;                              // longe da seção
        if (absorbing && (abs < 40 || now - moveEnd < 250)) return swallow(event);        // inércia do gesto que já encaixou
        const raw = rawAt(y);
        const target = dir > 0 ? (raw < 0 ? 0 : Math.floor(raw + 0.1) + 1) : (raw > n - 1 ? n - 1 : Math.ceil(raw - 0.1) - 1);
        if (target < 0 || target > n - 1) return true;                                    // saindo pela ponta: não prende
        if (acc < 18) return swallow(event);                                              // ignora micro-toques do trackpad
        go(target);
        return swallow(event);
      };

      const onIdle = () => {                                                              // teclado, barra de rolagem, toque
        const now = performance.now(), y = lenis.animatedScroll;
        if (now - lastYT > 0 && now - lastYT < 100) vel = vel * 0.5 + ((y - lastY) / (now - lastYT)) * 1000 * 0.5;
        else vel = 0;
        lastY = y; lastYT = now;
        clearTimeout(idleTimer);
        if (moving || performance.now() - lastT < 400) return;
        idleTimer = setTimeout(() => {
          if (moving || !st.isActive) return;
          const raw = rawAt(lenis.animatedScroll);
          if (raw < -0.15 || raw > n - 1 + 0.15) return;
          const m = clamp(0, n - 1, Math.round(raw));
          if (Math.abs(raw - m) > 0.01) go(m);
        }, 160);
      };

      if (lenis) {
        const prevVirtual = lenis.options.virtualScroll;
        lenis.options.virtualScroll = onVirtual;
        lenis.on("scroll", onIdle);
        cleanups.push(() => { lenis.options.virtualScroll = prevVirtual; lenis.off("scroll", onIdle); clearTimeout(idleTimer); clearTimeout(guard); });
      }
    } else if (stacked) {
      gsap.set(pts, { autoAlpha: 0, y: 44 });
      if (fx.arm) {
        fx.arm(head, "top 85%", () => headReveal?.play(), () => headReveal?.reverse());
        pts.forEach((pt) => fx.arm(pt, "top 86%",
          () => gsap.to(pt, { autoAlpha: 1, y: 0, duration: 0.9, ease: EASE }),
          () => gsap.to(pt, { autoAlpha: 0, y: 44, duration: 0.5, ease: "power2.in" })));
      }
    }

    return () => {
      cleanups.forEach((fn) => fn());
      prog.classList.remove("is-pinned");
      prog.style.removeProperty("--step");
      clones.forEach((c) => c.remove());
      pts.forEach((pt) => { pt.style.opacity = ""; });
      gsap.set([stage, track, bar, ...pts, ...pfs, ...bgs, ...pfs.map((p) => p.querySelector("img"))], { clearProps: "all" });
    };
  });

  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  addEventListener("load", () => ScrollTrigger.refresh());
})();
