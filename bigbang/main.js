/* Big Bang v2 · interações da página (GSAP 3.13 + ScrollTrigger + SplitText)
 * - Seção 2: feixes de luz subindo no fundo
 * - Transição hero → seção 2 (tablet/desktop): a hero fica parada; depois de um respiro,
 *   uma "tela" abre no meio dela e cresce com a rolagem até revelar a seção 2
 * - Text reveal (igual ao da Helios): título palavra por palavra e parágrafo em bloco, saindo do
 *   desfoque; só entram quando a tela passa de 45% aberta e recolhem se voltar
 * - Card: entrada em camadas (sobe, brilho cresce, luz varre a borda, frases entram)
 * - Seção "Assim nasceu…": texto no reveal da Helios + astronauta que chega e flutua
 * - Seção "Quem é Sérgio Sacani": foto revelada de baixo para cima + parallax, texto no reveal da Helios
 * - Transição branco → escuro: o horizonte de um planeta sobe e cobre a tela (seção do Sérgio fixada)
 * - Seção "Para quem é" (escuro, cards): reveal da Helios + cards em cascata + luz que segue o mouse
 * - Seção STEM (fundo branco): título e textos no reveal da Helios + cards S·T·E·M em cascata
 */
(() => {
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  if (window.SplitText) gsap.registerPlugin(SplitText);
  if (window.CustomEase) { gsap.registerPlugin(CustomEase); CustomEase.create("helios", "0.2, 0.7, 0.2, 1"); }
  const EASE = window.CustomEase ? "helios" : "power3.out";   // mesma curva do reveal da Helios

  /* ---------- rolagem suave (Lenis) sincronizada com o ScrollTrigger ---------- */
  const root = document.documentElement;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (window.Lenis && !reduceMotion) {
    // lerp (amortecimento contínuo) em vez de duration+expo: a curva expo arrancava rápido demais a cada
    // rolada (o "tranco" do primeiro movimento). 0.09 é o mesmo valor do forgeautomotive.co.uk
    const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    window.__lenis = lenis;
    lenis.on("scroll", ScrollTrigger.update);
    // os pins mudam a altura da página depois do Lenis medir: avisa-o a cada recálculo do ScrollTrigger
    ScrollTrigger.addEventListener("refresh", () => lenis.resize());
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    // durante o loader a página não rola; libera quando ele termina
    if (root.classList.contains("is-loading")) {
      lenis.stop();
      new MutationObserver((_, obs) => {
        if (!root.classList.contains("is-loading")) { lenis.start(); obs.disconnect(); }
      }).observe(root, { attributes: true, attributeFilter: ["class"] });
    }
  }

  /* ---------- feixes de luz (posição, altura e ritmo aleatórios) ---------- */
  document.querySelectorAll(".s2__beams").forEach((beams) => {
    for (let i = 0; i < 16; i++) {
      const b = document.createElement("i");
      b.style.left = (Math.random() * 100).toFixed(2) + "%";
      b.style.height = (80 + Math.random() * 110).toFixed(0) + "px";
      b.style.animationDuration = (7.5 + Math.random() * 4.5).toFixed(2) + "s";
      b.style.animationDelay = (-Math.random() * 8).toFixed(2) + "s";
      beams.appendChild(b);
    }
  });

  const stack = document.querySelector(".stack");
  const hero = stack?.querySelector(".hero");
  const s2 = stack?.querySelector(".s2");
  if (!stack || !hero || !s2) return;

  const introText = s2.querySelectorAll("[data-reveal-text]");
  const cardTextEls = s2.querySelectorAll("[data-card-text]");
  /* elementos DENTRO do .stack (card, seção do astronauta) são medidos pelo ScrollTrigger como se o pin não
   * existisse, mas depois que o pin solta eles descem exatamente a duração dele — sem somar isso, os efeitos
   * tocariam ~1,5 tela antes de você chegar neles */
  let pinST = null;
  const pinOffset = () => (pinST ? Math.round(pinST.end - pinST.start) : 0);
  const OPEN_AT = 0.45;                                     // fração da tela aberta para o texto entrar

  /* ---------- text reveal no estilo da Helios ----------
   * data-*="words": palavra por palavra — sobe 0,45em, sai de blur(10px), 0,9s, 0,07s entre palavras
   * data-*="block": o bloco inteiro — sobe 28px, sai de blur(6px), 0,9s
   * sem máscara (igual à Helios). Devolve { play, reverse }. */
  function heliosReveal(targets, { delay = 0 } = {}) {
    // o atraso é um deslocamento DENTRO do timeline (não a opção delay): assim o estado inicial
    // (invisível) é aplicado na hora e as palavras não aparecem antes do reveal começar
    const tl = gsap.timeline({ paused: true });
    let at = delay;
    [...targets].forEach((el) => {
      const mode = el.dataset.revealText || el.dataset.cardText || el.dataset.bornText || el.dataset.stemText || el.dataset.whoText || el.dataset.fitText || el.dataset.progText || el.dataset.tx || "words";
      if (mode === "words" && window.SplitText) {
        const split = SplitText.create(el, { type: "words", wordsClass: "wd" });
        // degradê: aplicado em cada palavra (o do pai quebra quando os filhos se movem)
        el.querySelectorAll(".grad").forEach((g) => g.classList.add("grad--split"));
        if (el.classList.contains("grad")) el.classList.add("grad--split");
        gsap.set(split.words, { autoAlpha: 0, y: "0.45em", filter: "blur(10px)" });          // estado inicial aplicado já
        tl.to(split.words,
          { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 0.9, ease: EASE, stagger: 0.07, clearProps: "filter" },   // sem filtro parado depois: cada palavra deixa de ser uma camada pesada
          at);
        at += 0.15 + split.words.length * 0.07 * 0.6;            // o próximo entra antes do último terminar
      } else {
        gsap.set(el, { autoAlpha: 0, y: 28, filter: "blur(6px)" });                           // estado inicial aplicado já
        tl.to(el,
          { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 0.9, ease: EASE, clearProps: "filter" },
          at);
        at += 0.25;
      }
    });
    return {
      play: () => tl.timeScale(1).play(),
      reverse: () => tl.timeScale(1.8).reverse(),
    };
  }

  /* gatilho "entrou/saiu" que se corrige sozinho: se a página abrir (ou for recalculada) já além do
   * ponto de entrada — recarregar no meio, âncora, resize — o efeito toca em vez de ficar travado escondido */
  function arm(trigger, start, onIn, onOut) {
    let isIn = false;
    const enter = () => { if (!isIn) { isIn = true; onIn(); } };
    const leave = () => { if (isIn) { isIn = false; onOut(); } };
    ScrollTrigger.create({
      trigger, start,                                          // start pode ser função (recalculada a cada refresh)
      onEnter: enter,
      onLeaveBack: leave,
      onRefresh: (self) => { if (self.scroll() >= self.start) enter(); else leave(); },
    });
  }

  window.__fx = { heliosReveal, arm, EASE };                // usado por programa.js (conteúdo programático)

  const mm = gsap.matchMedia();

  /* ---------- tablet/desktop: hero parada + tela abrindo no meio ---------- */
  mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
    stack.classList.add("is-stacked");
    const intro = heliosReveal(introText);
    let isOpen = false;

    // a "tela" é um proxy (fração da largura/altura + raio); o clip-path é montado à mão a cada quadro
    // (interpolar a string do inset() quebra quando o navegador encurta os valores)
    const win = { w: 0, h: 0, r: 22 };

    // medidas em cache: ler offsetWidth/Height a cada quadro, logo depois de escrever o clip-path,
    // força o navegador a recalcular o layout em todo frame — era a principal causa da travada
    let VW = 0, VH = 0, H = 0, lastClip = "";
    const measure = () => { VW = s2.offsetWidth; VH = innerHeight; H = s2.offsetHeight; lastClip = ""; };

    const applyClip = () => {
      const open = Math.min(win.w, win.h);
      if (intro && open >= OPEN_AT && !isOpen) { isOpen = true; intro.play(); }
      if (intro && open < OPEN_AT && isOpen) { isOpen = false; intro.reverse(); }

      let clip;
      if (win.w >= 0.999 && win.h >= 0.999) clip = "none";                    // aberta: libera a seção inteira
      else if (win.w <= 0.001) clip = "inset(50% 50% round 0px)";             // fechada
      else {
        const x = (VW * (1 - win.w)) / 2;
        const top = (VH * (1 - win.h)) / 2;
        const bottom = H - (top + VH * win.h);
        clip = `inset(${top.toFixed(1)}px ${x.toFixed(1)}px ${bottom.toFixed(1)}px ${x.toFixed(1)}px round ${win.r.toFixed(1)}px)`;
      }
      if (clip !== lastClip) { s2.style.clipPath = clip; lastClip = clip; }  // só escreve se mudou
    };
    measure();
    applyClip();

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: stack,
        start: "top top",
        end: "+=180%",
        pin: true,
        anticipatePin: 1,                                  // evita o "pulo" ao prender/soltar
        scrub: 0.35,                                       // o Lenis já suaviza a rolagem
        invalidateOnRefresh: true,
        onRefresh: () => { measure(); applyClip(); },
      },
    });

    pinST = tl.scrollTrigger;

    tl
      // 1 · respiro: só a hero recua um pouco — nada da próxima seção ainda
      .to(hero, { scale: 0.97, ease: "none", duration: 0.22, force3D: true }, 0)
      // 2 · a tela abre do centro e cresce até tomar a tela inteira (só o recorte muda — barato)
      .to(win, { w: 1, h: 1, r: 0, ease: "power2.inOut", duration: 0.78, onUpdate: applyClip }, 0.22)
      .to(hero, { scale: 0.9, autoAlpha: 0.3, ease: "power1.in", duration: 0.78, force3D: true }, 0.22);

    return () => {
      pinST = null;
      stack.classList.remove("is-stacked");
      gsap.set([s2, hero], { clearProps: "all" });
    };
  });

  /* ---------- celular: sem tela fixa — o texto entra quando chega na tela ---------- */
  mm.add("(max-width: 767px) and (prefers-reduced-motion: no-preference)", () => {
    const intro = heliosReveal(introText);
    ScrollTrigger.create({
      trigger: s2.querySelector(".s2__intro"),
      start: "top 75%",
      onEnter: () => intro.play(),
      onLeaveBack: () => intro.reverse(),
    });
  });

  /* ---------- card: entrada em camadas (todos os tamanhos) ----------
   * 1) o card sobe e escala; 2) o brilho cresce da base; 3) uma faixa de luz varre a borda de cima;
   * 4) as frases entram por cima (reveal da Helios) */
  mm.add("(prefers-reduced-motion: no-preference)", () => {
    const cardEl = s2.querySelector(".s2__card");
    const glow = cardEl.querySelector(".card-fx__glow");
    const sides = cardEl.querySelector(".card-fx__sides");
    const sweep = cardEl.querySelector(".card-fx__sweep");

    gsap.set(cardEl, { autoAlpha: 0, y: 90, scale: 0.93, transformOrigin: "50% 100%" });
    gsap.set(glow, { autoAlpha: 0, scaleY: 0.15, transformOrigin: "50% 100%" });
    gsap.set(sides, { autoAlpha: 0 });

    const cardIn = gsap.timeline({ paused: true })
      .to(cardEl, { autoAlpha: 1, y: 0, scale: 1, duration: 1.15, ease: "expo.out", force3D: true }, 0)
      .to(glow, { autoAlpha: 1, scaleY: 1, duration: 1.6, ease: "power3.out" }, 0.25)
      .to(sides, { autoAlpha: 1, duration: 1.2, ease: "power2.out" }, 0.45)
      .fromTo(sweep, { x: "-100%", autoAlpha: 1 }, { x: "260%", duration: 1.5, ease: "power2.inOut" }, 0.2)
      .to(sweep, { autoAlpha: 0, duration: 0.3, ease: "none" }, 1.4);

    const cardText = heliosReveal(cardTextEls, { delay: 0.5 });
    arm(cardEl, () => `top+=${pinOffset()} 84%`,
      () => { cardIn.timeScale(1).play(); cardText.play(); },
      () => { cardIn.timeScale(1.6).reverse(); cardText.reverse(); });
  });

  /* ---------- "Assim nasceu o Big Bang…": texto + astronauta flutuando ---------- */
  mm.add("(prefers-reduced-motion: no-preference)", () => {
    const born = s2.querySelector(".born");
    const figure = born.querySelector(".born__figure");
    const floater = born.querySelector(".born__float");
    const bornText = heliosReveal(born.querySelectorAll("[data-born-text]"), { delay: 0.2 });

    // entrada do astronauta: chega girado e desfocado, assenta e passa a flutuar
    gsap.set(figure, { autoAlpha: 0, y: 70, scale: 0.84, rotation: -14, filter: "blur(10px)", transformOrigin: "50% 60%" });
    const figIn = gsap.timeline({ paused: true })
      .to(figure, { autoAlpha: 1, y: 0, scale: 1, rotation: 0, filter: "blur(0px)", duration: 1.5, ease: EASE, clearProps: "filter" }, 0);

    // flutuação contínua: sobe/desce, balança e deriva de lado em ritmos diferentes (nunca repete igual)
    const float = gsap.timeline({ paused: true });
    float.fromTo(floater, { y: 8, rotation: -2.5 }, { y: -18, rotation: 3, duration: 3.4, ease: "sine.inOut", repeat: -1, yoyo: true }, 0)
         .fromTo(floater, { x: -6 }, { x: 8, duration: 5.1, ease: "sine.inOut", repeat: -1, yoyo: true }, 0);

    arm(born, () => `top+=${pinOffset()} 78%`,
      () => { figIn.timeScale(1).play(); bornText.play(); },
      () => { figIn.timeScale(1.6).reverse(); bornText.reverse(); });
    // só flutua enquanto está na tela
    ScrollTrigger.create({
      trigger: figure,
      start: () => `top+=${pinOffset()} bottom`,
      end: () => `bottom+=${pinOffset()} top`,
      onToggle: (self) => (self.isActive ? float.play() : float.pause()),
      onRefresh: (self) => (self.isActive ? float.play() : float.pause()),
    });
  });

  /* ---------- MÉTODO STEM (fundo branco) ----------
   * título palavra por palavra + texto em bloco (reveal da Helios); os quatro cards S·T·E·M sobem em cascata,
   * saindo do desfoque; as letras "acendem" um instante depois do card */
  mm.add("(prefers-reduced-motion: no-preference)", () => {
    const stem = document.querySelector(".stem");
    if (!stem) return;
    const cards = stem.querySelectorAll("[data-stem-card]");
    const head = heliosReveal(stem.querySelectorAll(".stem__head [data-stem-text]"));
    const facts = heliosReveal(stem.querySelectorAll(".stem__facts [data-stem-text], .stem__cta[data-stem-text]"), { delay: 0.1 });

    gsap.set(cards, { autoAlpha: 0, y: 70, scale: 0.94, filter: "blur(8px)" });
    gsap.set(stem.querySelectorAll(".stem__letter"), { yPercent: 18 });
    const cardsIn = gsap.timeline({ paused: true });
    cardsIn.to(cards, { autoAlpha: 1, y: 0, scale: 1, filter: "blur(0px)", duration: 1.1, ease: EASE, stagger: 0.12, clearProps: "filter" }, 0.35)
           .to(stem.querySelectorAll(".stem__letter"), { yPercent: 0, duration: 1.3, ease: "expo.out", stagger: 0.12 }, 0.5);

    // o texto de baixo (argumentos + botão) entra quando a linha de cards já está na tela
    arm(stem, "top 72%",
      () => { head.play(); cardsIn.timeScale(1).play(); },
      () => { head.reverse(); cardsIn.timeScale(1.6).reverse(); });
    arm(stem.querySelector(".stem__facts"), "top 82%",
      () => facts.play(),
      () => facts.reverse());
  });

  /* ---------- QUEM É SÉRGIO SACANI ----------
   * texto no reveal da Helios; a foto é revelada de baixo para cima (recorte) com zoom de saída,
   * o cartão de 1986 sobe depois, e a foto ganha um parallax suave enquanto a seção passa */
  mm.add("(prefers-reduced-motion: no-preference)", () => {
    const who = document.querySelector(".who");
    if (!who) return;
    const figure = who.querySelector("[data-who-photo]");
    const frame = who.querySelector(".who__frame");
    const img = frame.querySelector("img");
    const halley = who.querySelector("[data-who-halley]");
    const text = heliosReveal(who.querySelectorAll(".who__text [data-who-text]"), { delay: 0.15 });

    gsap.set(frame, { clipPath: "inset(100% 0% 0% 0% round 28px)" });
    gsap.set(img, { scale: 1.22, transformOrigin: "50% 100%" });
    gsap.set(halley, { autoAlpha: 0, y: 40, filter: "blur(8px)" });
    const photoIn = gsap.timeline({ paused: true });
    photoIn.to(frame, { clipPath: "inset(0% 0% 0% 0% round 28px)", duration: 1.5, ease: "expo.inOut" }, 0)
           .to(img, { scale: 1, duration: 2, ease: "expo.out" }, 0.1)
           .to(halley, { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 1, ease: EASE, clearProps: "filter" }, 1.0);

    arm(figure, "top 80%",
      () => photoIn.timeScale(1).play(),
      () => photoIn.timeScale(1.8).reverse());
    arm(who.querySelector(".who__text"), "top 72%",
      () => text.play(),
      () => text.reverse());

    // parallax: a foto desliza um pouco mais devagar que a página (dentro da sobra de 6% da moldura)
    gsap.fromTo(img, { yPercent: -4.5 }, {
      yPercent: 4.5, ease: "none",
      scrollTrigger: { trigger: figure, start: "top bottom", end: "bottom top", scrub: true },
    });
  });

  /* ---------- transição branco → escuro (tablet/desktop) ----------
   * a seção do Sérgio fica fixada no fim e o horizonte de um planeta (borda azul acesa) sobe do centro
   * de baixo até cobrir a tela inteira, já na cor da seção seguinte — o scroll sai do branco para o escuro */
  mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
    const who = document.querySelector(".who");
    const fit = document.querySelector(".fit");
    const eclipse = who?.querySelector(".who__eclipse");
    if (!who || !fit || !eclipse) return;
    who.classList.add("has-eclipse");
    fit.classList.add("has-eclipse");

    const horizon = { r: 0 };
    const maxR = () => Math.hypot(innerWidth / 2, innerHeight) + 300;   // cobre o canto mais distante + a luz da borda
    const paint = () => {
      eclipse.style.setProperty("--r", horizon.r.toFixed(1) + "px");
      eclipse.style.opacity = Math.min(1, horizon.r / 90).toFixed(2);    // nasce do nada, sem ponto de luz parado
    };
    paint();

    gsap.timeline({
      scrollTrigger: {
        trigger: who,
        start: "bottom bottom",
        end: "+=110%",
        pin: true,
        anticipatePin: 1,
        scrub: 0.5,
        invalidateOnRefresh: true,
      },
    })
      // ease de entrada E de saída: o horizonte nasce devagar e assenta devagar — com "in" puro ele chegava no
      // fim na velocidade máxima e parava de uma vez ao soltar o pin (a "travada" depois da seção do Sérgio)
      .fromTo(horizon, { r: 0 }, { r: () => maxR(), ease: "power2.inOut", duration: 0.88, onUpdate: paint }, 0)
      .to({}, { duration: 0.12 }, 0.88);                                   // respiro final com a tela já escura

    return () => {
      who.classList.remove("has-eclipse");
      fit.classList.remove("has-eclipse");
      eclipse.style.removeProperty("--r");
      eclipse.style.opacity = "";
    };
  });

  /* ---------- PARA QUEM É (lista editorial) ----------
   * título palavra por palavra + texto em bloco (reveal da Helios); cada linha da lista entra quando chega
   * na tela: o fio de cima se desenha da esquerda e número/nome/complemento saem do desfoque em cascata;
   * a frase final entra palavra por palavra */
  mm.add("(prefers-reduced-motion: no-preference)", () => {
    const fit = document.querySelector(".fit");
    if (!fit) return;
    const head = heliosReveal(fit.querySelectorAll(".fit__head [data-fit-text]"));
    const all = fit.querySelector("[data-fit-all]");
    const closing = all ? heliosReveal([all]) : null;

    arm(fit, "top 70%", () => head.play(), () => head.reverse());

    const rows = [...fit.querySelectorAll("[data-fit-row]")];
    rows.forEach((row) => {
      const bits = row.querySelectorAll(".fit__n, .fit__name, .fit__desc");
      gsap.set(bits, { autoAlpha: 0, y: 18, filter: "blur(8px)" });
      const tl = gsap.timeline({ paused: true })
        .to(bits, { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 0.9, ease: EASE, stagger: 0.08, clearProps: "filter" }, 0);
      arm(row, "top 92%", () => tl.timeScale(1).play(), () => tl.timeScale(1.8).reverse());
    });

    /* timeline: o fio liga o centro do 1º nó ao do último e se enche de luz na linha de 55% da tela;
     * cada nó acende (e o texto da linha clareia) quando o fio chega nele */
    const rail = fit.querySelector(".fit__rail"), list = fit.querySelector(".fit__list");
    const nodeYs = () => rows.map((r) => { const n = r.querySelector(".fit__n"); return r.offsetTop + n.offsetTop + n.offsetHeight / 2; });
    const prog = { p: 0 };
    let ys = nodeYs();
    const apply = () => {
      const pos = ys[0] + prog.p * (ys[ys.length - 1] - ys[0]);
      rail.style.setProperty("--p", prog.p.toFixed(4));
      rail.classList.toggle("is-live", prog.p > 0.002 && prog.p < 0.998);
      rows.forEach((r, i) => r.classList.toggle("is-on", pos >= ys[i] - 1));
    };
    gsap.to(prog, {
      p: 1, ease: "none", onUpdate: apply,
      scrollTrigger: {
        trigger: list, scrub: 0.5, invalidateOnRefresh: true,
        start: () => { ys = nodeYs(); list.style.setProperty("--rail-bot", (list.offsetHeight - ys[ys.length - 1]) + "px"); rail.style.setProperty("--rail-top", ys[0] + "px"); return `top+=${ys[0]} 55%`; },
        end: () => `top+=${ys[ys.length - 1]} 55%`,
        onRefresh: apply,
      },
    });

    if (closing) arm(all, "top 85%", () => closing.play(), () => closing.reverse());
  });

  // recalcula depois que fontes e imagens assentam
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  addEventListener("load", () => ScrollTrigger.refresh());
})();
