(() => {
  const root = document.documentElement;

  /* ---------- Botões "APLICAR PARA CONSULTORIA" ----------
     Eles abrem o popup de aplicação (assets/js/quiz.js). O CTA_URL só é usado se o quiz não carregar. */
  const CTA_URL = "#aplicar";
  document.querySelectorAll(".js-cta").forEach(a => {
    a.href = CTA_URL;
    if (/^https?:/.test(CTA_URL)) { a.target = "_blank"; a.rel = "noopener"; }
  });
  document.querySelectorAll("[data-year]").forEach(el => (el.textContent = new Date().getFullYear()));

  /* ---------- Faixas de notificação ---------- */
  const vals = ["37,90", "67,41", "37,90", "94,58", "37,90", "67,41"];
  const notif = v =>
    `<div class="notif"><img class="notif__icon" src="assets/opt/notif-icon.webp" width="58" height="58" alt="" decoding="async"><div class="notif__body"><div class="notif__top"><span class="notif__title">Venda aprovada</span><span class="notif__time">agora</span></div><div class="notif__text">Sua comissão: R$ ${v}</div></div></div>`;
  // cada faixa = duas metades iguais (loop sem emenda). Metade só um pouco maior que a tela:
  // faixas muito largas passam do limite de camada do Safari no iPhone e simplesmente não aparecem.
  const half = Math.max(3, Math.ceil((window.innerWidth / (window.innerWidth <= 640 ? 0.6 : 1)) / 480) + 1);
  document.querySelectorAll("[data-notifs]").forEach(el => {
    const row = Array.from({ length: half }, (_, i) => notif(vals[i % vals.length])).join("");
    el.innerHTML = row + row;
    el.style.animationDuration = half * (el.closest(".notifs__row--back") ? 9 : 6.5) + "s"; // mesma velocidade em qualquer tela; a de trás mais lenta
  });

  /* ---------- Notificações sobre a capa do hero (desktop) ---------- */
  const heroN = document.querySelector("[data-hero-notifs]");
  const heroVals = ["37,90", "67,90", "47,90", "94,58", "67,41", "128,00", "57,30", "37,90"];
  const STEP = 112.5; // distância entre notificações, em % da altura de uma (76,25 / 67,78 no Figma)
  const hNotif = v =>
    `<div class="h-notif"><img class="h-notif__icon" src="assets/opt/notif-icon.webp" width="45" height="45" alt="" decoding="async"><div class="h-notif__body"><div class="h-notif__top"><span class="h-notif__title">Venda aprovada</span><span class="h-notif__time">agora</span></div><div class="h-notif__text">Sua comissão: R$ ${v}</div></div></div>`;
  if (heroN) {
    heroN.innerHTML = heroVals.slice(0, 3).map(hNotif).join("");
    [...heroN.children].forEach((n, i) => (n.style.transform = `translateY(${i * STEP}%)`));
  }

  /* ---------- Sem GSAP ou com "menos movimento": mostra tudo e sai ---------- */
  if (!window.gsap || !window.ScrollTrigger || !root.classList.contains("anim")) {
    root.classList.remove("anim");
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // posição salva antes do F5: começamos do topo e voltamos pra ela depois que as animações existem
  let restoreY = 0;
  try { restoreY = sessionStorage.getItem("lp-scroll-y"); sessionStorage.removeItem("lp-scroll-y"); } catch {}
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  if (restoreY > 0) window.scrollTo(0, 0);
  window.addEventListener("pagehide", () => { try { sessionStorage.setItem("lp-scroll-y", String(Math.round(window.scrollY))); } catch {} });
  gsap.defaults({ ease: "power3.out", duration: 0.9 });
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => gsap.utils.toArray(s, c);
  const hidden = { opacity: 0 };
  // roda a função quando o loader sair (ou na hora, se ele já saiu)
  const afterLoader = fn => {
    if (!document.getElementById("loader") || root.classList.contains("is-loaded")) fn();
    else window.addEventListener("loader:done", fn, { once: true });
  };

  /* ===== 0. Scroll suave (Lenis) sincronizado com o ScrollTrigger ===== */
  if (window.Lenis) {
    const lenis = new Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 1 });
    window.__lenis = lenis; // o popup de aplicação pausa o scroll enquanto está aberto
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    // links internos (#aplicar etc.) também rolam suave
    document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener("click", e => {
      if (a.classList.contains("js-cta") && window.openQuiz) return; // com o popup de aplicação, ele cuida do clique
      const id = a.getAttribute("href");
      const target = id.length > 1 && document.querySelector(id);
      if (target) { e.preventDefault(); lenis.scrollTo(target, { duration: 1.4 }); }
    }));
  }

  /* ===== 1. HERO — entrada ===== */
  const intro = gsap.timeline({ delay: 0.05, paused: true });
  afterLoader(() => intro.play());
  intro
    .from(".hero__media img", { scale: 1.12, duration: 2.2, ease: "power2.out" }, 0)
    .fromTo(".hero__logo", { y: 24, ...hidden }, { y: 0, opacity: 1, duration: 0.8 }, 0.15)
    .fromTo(".hero h1",
      { y: 40, opacity: 0, clipPath: "inset(0 0 100% 0)" },
      { y: 0, opacity: 1, clipPath: "inset(0 0 -15% 0)", duration: 1.2 }, 0.3)
    .fromTo(".hero__sub", { y: 24, ...hidden }, { y: 0, opacity: 1, duration: 0.9 }, 0.65)
    .fromTo(".hero .btn", { y: 20, scale: 0.94, ...hidden }, { y: 0, scale: 1, opacity: 1, duration: 0.9, ease: "back.out(1.7)" }, 0.85);

  /* ===== 2. Cabeçalhos de seção (rótulo abre + título sobe com máscara) ===== */
  $$("[data-head]").forEach(head => {
    const [eyebrow, title] = head.children;
    const ls = getComputedStyle(eyebrow).letterSpacing;
    gsap.timeline({ scrollTrigger: { trigger: head, start: "top 85%", once: true } })
      .fromTo(eyebrow, { letterSpacing: "0.5em", ...hidden }, { letterSpacing: ls, opacity: 1, duration: 1.1 })
      .fromTo(title,
        { y: 50, opacity: 0, clipPath: "inset(0 0 100% 0)" },
        { y: 0, opacity: 1, clipPath: "inset(0 0 -15% 0)", duration: 1.1 }, 0.15);
  });

  /* ===== 3. Elementos simples: sobem em sequência quando aparecem ===== */
  const plain = $$('[data-a=""]').filter(el => !el.closest("[data-head]") && !el.classList.contains("about__title"));
  ScrollTrigger.batch(plain, {
    start: "top 88%", once: true,
    onEnter: b => gsap.fromTo(b, { y: 36, ...hidden }, { y: 0, opacity: 1, stagger: 0.1, overwrite: true }),
  });

  /* ===== 4. Cards (personas e "por que") — sobem, crescem e o ícone "salta" ===== */
  ScrollTrigger.batch('[data-a="card"]', {
    start: "top 85%", once: true,
    onEnter: b => {
      gsap.fromTo(b, { y: 70, scale: 0.96, ...hidden }, { y: 0, scale: 1, opacity: 1, duration: 1.1, stagger: 0.12 });
      const icons = b.map(c => c.querySelector(".icon-box, .why-card__icon")).filter(Boolean);
      gsap.fromTo(icons, { scale: 0.4, rotate: -25, opacity: 0 }, { scale: 1, rotate: 0, opacity: 1, duration: 0.9, stagger: 0.12, delay: 0.25, ease: "back.out(2.2)" });
    },
  });

  /* ===== 5. Depoimentos — surgem e "flutuam" em direções opostas ===== */
  const track = $("[data-proof]");
  if (track) {
    gsap.set(track, { xPercent: -50 });
    const cards = $$('[data-a="proof"]');
    gsap.fromTo(cards, { scale: 0.9, ...hidden }, {
      scale: 1, opacity: 1, duration: 1, stagger: 0.08,
      scrollTrigger: { trigger: track, start: "top 85%", once: true },
    });
    gsap.fromTo(track, { x: 140 }, { x: -140, ease: "none", scrollTrigger: { trigger: ".proof", start: "top bottom", end: "bottom top", scrub: 1 } });
    cards.forEach((c, i) => gsap.fromTo(c, { y: i % 2 ? 50 : -30 }, { y: i % 2 ? -50 : 30, ease: "none", scrollTrigger: { trigger: ".proof", start: "top bottom", end: "bottom top", scrub: 1 } }));
  }

  /* ===== 6. Timeline "não é para quem" — linha se desenha e cada X acende quando a linha chega nele ===== */
  const tlWrap = $("[data-timeline]");
  if (tlWrap) {
    const line = $(".timeline__line", tlWrap);
    const items = $$('[data-a="tl"]');
    // a linha vai do centro do 1º X ao centro do último; devolve a posição de cada X nela (0 → 1)
    const stops = () => {
      const centers = items.map(it => it.offsetTop + it.offsetHeight / 2);
      const top = centers[0], len = centers[centers.length - 1] - top;
      gsap.set(line, { top, bottom: "auto", height: len });
      return centers.map(c => (c - top) / len);
    };
    let marks = stops();
    gsap.fromTo(line, { scaleY: 0 }, {
      scaleY: 1, ease: "none",
      // roda a cada quadro da linha (inclusive no "atraso" do scrub e ao rolar de volta)
      onUpdate() {
        const p = this.progress();
        items.forEach((it, i) => it.classList.toggle("is-on", p > 0.001 && p >= marks[i] - 0.01));
      },
      scrollTrigger: { trigger: tlWrap, start: "top 70%", end: "bottom 60%", scrub: 0.6, onRefresh: () => (marks = stops()) },
    });
    items.forEach(item => {
      gsap.timeline({ scrollTrigger: { trigger: item, start: "top 85%", once: true } })
        .fromTo(item, { x: 60, ...hidden }, { x: 0, opacity: 1, duration: 0.9 })
        .fromTo($(".tl-dot", item), { scale: 0 }, { scale: 1, duration: 0.7, ease: "back.out(2.5)" }, 0.1);
    });
  }

  /* ===== 7. Método PCT — card entra, imagem "abre" e texto em cascata ===== */
  const mm = gsap.matchMedia();
  $$('[data-a="step"]').forEach(step => {
    const img = $(".step__media img", step);
    const text = $(".step__text", step).children;
    gsap.timeline({ scrollTrigger: { trigger: step, start: "top 82%", once: true } })
      .fromTo(step, { y: 80, ...hidden }, { y: 0, opacity: 1, duration: 1 })
      .fromTo(img, { scale: 1.25, x: 60 }, { scale: 1, x: 0, duration: 1.6, ease: "power2.out" }, 0)
      .fromTo(text, { y: 30, ...hidden }, { y: 0, opacity: 1, stagger: 0.09, duration: 0.8 }, 0.25);
  });
  // empilhamento: quando o próximo card sobe por cima, o anterior encolhe e escurece
  const stepEls = $$(".step");
  // card mais alto que a tela (celular) só "gruda" quando está inteiro visível, pra dar tempo de ler tudo
  const fitStackTops = () => stepEls.forEach(s => {
    s.style.top = "";
    const base = parseFloat(getComputedStyle(s).top);
    s.style.top = Math.min(base, window.innerHeight - s.offsetHeight - 16) + "px";
  });
  fitStackTops();
  ScrollTrigger.addEventListener("refreshInit", fitStackTops);
  stepEls.forEach((step, i) => {
    const next = stepEls[i + 1];
    if (!next) return;
    gsap.set(step, { "--dim": 0 });
    gsap.to(step, {
      scale: 0.94, "--dim": 0.55, ease: "none",
      scrollTrigger: {
        trigger: next, start: "top bottom",
        end: () => "top " + parseFloat(getComputedStyle(next).top) + "px",
        scrub: true, invalidateOnRefresh: true,
      },
    });
  });

  // notificações do hero: entram uma a uma e depois ficam "chegando" em loop (só desktop)
  mm.add("(min-width: 901px)", () => {
    if (!heroN) return;
    const first = $$(".h-notif", heroN);
    first.forEach((n, i) => { n.style.transform = ""; gsap.set(n, { yPercent: i * STEP }); });
    gsap.set(first, { opacity: 0 });
    afterLoader(() => gsap.fromTo(first,
      { opacity: 0, scale: 0.85, y: 30, filter: "blur(8px)" },
      { opacity: 1, scale: 1, y: 0, filter: "blur(0px)", duration: 0.8, ease: "back.out(1.6)", stagger: 0.35, delay: 1.1 }));

    let next = 3, timer;
    const cycle = () => {
      const list = $$(".h-notif", heroN);
      const wrap = document.createElement("div");
      wrap.innerHTML = hNotif(heroVals[next++ % heroVals.length]);
      const incoming = wrap.firstElementChild;
      heroN.appendChild(incoming);
      gsap.set(incoming, { yPercent: 3 * STEP, y: 20, opacity: 0, scale: 0.85, filter: "blur(6px)" });
      gsap.timeline({ onComplete: () => list[0].remove() })
        .to(list[0], { opacity: 0, scale: 0.9, y: -18, filter: "blur(6px)", duration: 0.5, ease: "power2.in" })
        .to(list.slice(1), { yPercent: i => i * STEP, duration: 0.75, ease: "power3.inOut" }, 0.2)
        .to(incoming, { yPercent: 2 * STEP, y: 0, opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.8, ease: "back.out(1.5)" }, 0.45);
    };
    const schedule = d => (timer = gsap.delayedCall(d, () => { cycle(); schedule(3.5); }));
    afterLoader(() => schedule(4.2));
    return () => timer && timer.kill();
  });

  mm.add("(min-width: 901px)", () => {
    // parallax leve da imagem dentro de cada card (só no desktop)
    $$(".step").forEach(step => {
      gsap.fromTo($(".step__media", step), { yPercent: -5 }, { yPercent: 5, ease: "none", scrollTrigger: { trigger: step, start: "top bottom", end: "bottom top", scrub: true } });
    });
    // hero: foto desce mais devagar e o texto some ao rolar
    gsap.to(".hero__media img", { yPercent: 10, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    gsap.to(".hero__inner", { y: -90, opacity: 0.15, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
  });

  /* ===== 8. "Por que Micro-SaaS" — letreiro gigante desliza + frase acende palavra por palavra ===== */
  gsap.fromTo(".why__wm--1", { xPercent: -10 }, { xPercent: 6, ease: "none", scrollTrigger: { trigger: ".why", start: "top bottom", end: "bottom top", scrub: true } });
  gsap.fromTo(".why__wm--2", { xPercent: 8 }, { xPercent: -8, ease: "none", scrollTrigger: { trigger: ".why", start: "top bottom", end: "bottom top", scrub: true } });

  const quote = $("[data-words]");
  if (quote) {
    const wrap = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(part));
            else { const s = document.createElement("span"); s.className = "w"; s.textContent = part; frag.appendChild(s); }
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) wrap(n);
      });
    };
    wrap(quote);
    gsap.fromTo($$(".w", quote), { opacity: 0.12 }, {
      opacity: 1, stagger: 0.1, ease: "none",
      scrollTrigger: { trigger: quote, start: "top 80%", end: "bottom 50%", scrub: true },
    });
  }

  /* ===== 9. Quem sou eu — título cresce, foto abre como uma janela ===== */
  const aboutTitle = $(".about__title");
  if (aboutTitle) {
    const ls = getComputedStyle(aboutTitle).letterSpacing;
    gsap.fromTo(aboutTitle, { scale: 0.82, letterSpacing: "0.08em", ...hidden }, {
      scale: 1, letterSpacing: ls, opacity: 1, duration: 1.3,
      scrollTrigger: { trigger: aboutTitle, start: "top 85%", once: true },
    });
  }
  const photo = $('[data-a="photo"]');
  if (photo) {
    gsap.timeline({ scrollTrigger: { trigger: photo, start: "top 80%", once: true } })
      .fromTo(photo, { clipPath: "inset(14% 14% 14% 14% round 28px)", ...hidden }, { clipPath: "inset(0% 0% 0% 0% round 28px)", opacity: 1, duration: 1.4, ease: "expo.out" })
      .fromTo($("img", photo), { scale: 1.3 }, { scale: 1, duration: 1.8, ease: "expo.out" }, 0);
  }

  /* ===== 10. CTA final — foto aproxima devagar enquanto rola ===== */
  gsap.fromTo(".final__media img", { scale: 1.15 }, { scale: 1, ease: "none", scrollTrigger: { trigger: ".final", start: "top bottom", end: "center center", scrub: true } });

  // Recalcula posições depois que fontes e imagens carregam
  window.addEventListener("load", () => ScrollTrigger.refresh());
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());

  /* ===== Recarregar no meio da página (F5) =====
     O navegador devolvia a posição antes das animações existirem, e os elementos ficavam invisíveis.
     Agora a posição é restaurada por nós, depois que tudo está pronto, e uma rede de segurança
     revela qualquer elemento que tenha ficado escondido acima ou dentro da tela. */
  const revealStuck = () => {
    const vh = window.innerHeight;
    $$('[data-a], .step__text > *, .hero__content > *').forEach(el => {
      if (+getComputedStyle(el).opacity > 0.5) return;
      if (el.getBoundingClientRect().top < vh * 0.95) gsap.to(el, { opacity: 1, x: 0, y: 0, scale: 1, clipPath: "none", duration: 0.6, ease: "power2.out", overwrite: "auto" });
    });
  };
  afterLoader(() => {
    const saved = +(restoreY || 0);
    ScrollTrigger.refresh();
    if (saved > 0) {
      if (window.__lenis) window.__lenis.scrollTo(saved, { immediate: true, force: true });
      else window.scrollTo(0, saved);
      ScrollTrigger.update();
    }
    setTimeout(revealStuck, 450);
  });
  ScrollTrigger.addEventListener("scrollEnd", revealStuck);
})();
