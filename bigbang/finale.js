/* Big Bang v2 · seções finais (GSAP 3.13 + ScrollTrigger + SplitText)
 *  - pré-requisitos: entram como um bloco
 *  - missões: cada frase "acende" palavra por palavra amarrada à rolagem (scrub), o fio de baixo ganha luz
 *  - oferta: o card sobe, o conteúdo entra em cascata, o preço conta de 0 até o valor
 *  - depoimentos: carrossel infinito (CSS) com o vídeo do YouTube carregado só no clique
 *  - FAQ: acordeão de uma pergunta aberta por vez, altura animada
 *  - oferta final: horizonte que sobe + reveal; rodapé em cascata
 * Usa o heliosReveal / arm de main.js (window.__fx). */
(() => {
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  const fx = window.__fx || {};
  const { heliosReveal, arm } = fx;
  const EASE = fx.EASE || "power3.out";
  if (!heliosReveal || !arm) return;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- depoimentos: carrossel + YouTube (não precisa de movimento reduzido) ---------- */
  const rail = $("[data-voices]");
  if (rail) {
    const track = $(".voices__track", rail);
    // duplica a lista uma vez: o translateX(-50%) fecha o laço sem emenda
    $$("li", track).forEach((li) => { const c = li.cloneNode(true); c.setAttribute("aria-hidden", "true"); c.querySelector("button").tabIndex = -1; track.appendChild(c); });
    $$(".voice", track).forEach((btn) => {
      const id = (btn.dataset.yt || "").trim();
      if (id) btn.style.setProperty("--poster", `url(https://i.ytimg.com/vi/${id}/hqdefault.jpg)`);
      else btn.querySelector(".voice__meta i").textContent += " · em breve";
    });
    track.addEventListener("click", (e) => {
      const btn = e.target.closest(".voice");
      const id = btn?.dataset.yt?.trim();
      if (!btn || !id || btn.querySelector("iframe")) return;
      const f = document.createElement("iframe");
      f.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&modestbranding=1`;
      f.title = btn.getAttribute("aria-label") || "Depoimento";
      f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      f.allowFullscreen = true;
      btn.appendChild(f);
      rail.classList.add("is-playing");                                 // o carrossel para enquanto há vídeo tocando
    });
  }

  /* ---------- FAQ: acordeão ---------- */
  const faqItems = $$("[data-faq]");
  let refreshTimer = 0;
  const refreshLater = () => { clearTimeout(refreshTimer); refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 150); };   // as seções de baixo mudaram de lugar
  const setOpen = (item, open, instant) => {
    const q = $(".faq__q", item), a = $(".faq__a", item);
    item.classList.toggle("is-open", open);
    q.setAttribute("aria-expanded", String(open));
    gsap.killTweensOf(a);
    if (instant) { gsap.set(a, { height: open ? "auto" : 0, autoAlpha: open ? 1 : 0 }); return; }
    gsap.to(a, {
      height: open ? "auto" : 0, autoAlpha: open ? 1 : 0,
      duration: open ? 0.7 : 0.5, ease: open ? "power3.out" : "power3.inOut",
      onComplete: refreshLater,
    });
  };
  faqItems.forEach((item) => {
    gsap.set($(".faq__a", item), { height: 0, autoAlpha: 0 });
    $(".faq__q", item).addEventListener("click", () => {
      const open = !item.classList.contains("is-open");
      faqItems.forEach((o) => { if (o !== item && o.classList.contains("is-open")) setOpen(o, false); });
      setOpen(item, open);
    });
  });

  /* ---------- voltar ao topo ---------- */
  $("[data-top]")?.addEventListener("click", (e) => {
    e.preventDefault();
    if (window.__lenis) window.__lenis.scrollTo(0, { duration: 2.2, easing: (t) => 1 - Math.pow(1 - t, 4), force: true });
    else scrollTo({ top: 0, behavior: "smooth" });
  });

  /* ---------- animações de entrada ---------- */
  const mm = gsap.matchMedia();
  mm.add("(prefers-reduced-motion: no-preference)", () => {
    const cleanups = [];

    // pré-requisitos
    const pre = $("[data-fit-pre]");
    if (pre) {
      gsap.set(pre, { autoAlpha: 0, y: 40, filter: "blur(8px)" });
      arm(pre, "top 90%",
        () => gsap.to(pre, { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 1, ease: EASE, clearProps: "filter" }),
        () => gsap.to(pre, { autoAlpha: 0, y: 40, filter: "blur(8px)", duration: 0.5, ease: "power2.in" }));
    }

    // cabeçalhos (título por palavra + texto em bloco, estilo Helios)
    const heads = [[".mis", ".mis__head"], [".voices", ".voices__head"], [".faq", ".faq__head"], [".final", ".final__inner"]];
    heads.forEach(([sec, scope]) => {
      const s = $(sec); if (!s) return;
      const r = heliosReveal($$("[data-tx]", $(scope)));
      arm(s, sec === ".final" ? "top 55%" : "top 72%", () => r.play(), () => r.reverse());
    });

    // missões: palavra por palavra, amarrado à rolagem
    $$("[data-mis]").forEach((li) => {
      const text = $("[data-mis-text]", li);
      const split = SplitText.create(text, { type: "words", wordsClass: "wd" });
      cleanups.push(() => split.revert());
      gsap.set(split.words, { opacity: 0.16 });
      gsap.to(split.words, {
        opacity: 1, ease: "none", stagger: 0.12,
        scrollTrigger: { trigger: li, start: "top 80%", end: "bottom 56%", scrub: 0.4 },
      });
      ScrollTrigger.create({
        trigger: li, start: "top 72%",
        onEnter: () => li.classList.add("is-on"),
        onLeaveBack: () => li.classList.remove("is-on"),
        onRefresh: (self) => li.classList.toggle("is-on", self.scroll() >= self.start),
      });
    });

    // oferta
    const card = $("[data-offer]");
    if (card) {
      const bits = $$("[data-o]", card);
      const price = $("[data-count]", card);
      const target = price ? +price.dataset.count : 0;
      const counter = { v: 0 };
      gsap.set(card, { autoAlpha: 0, y: 90, scale: 0.95, transformOrigin: "50% 100%" });
      gsap.set(bits, { autoAlpha: 0, y: 26, filter: "blur(8px)" });
      const tl = gsap.timeline({ paused: true })
        .to(card, { autoAlpha: 1, y: 0, scale: 1, duration: 1.2, ease: "expo.out", force3D: true }, 0)
        .to(bits, { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 0.9, ease: EASE, stagger: 0.07, clearProps: "filter" }, 0.3);
      if (price) tl.to(counter, { v: target, duration: 1.5, ease: "expo.out", onUpdate: () => { price.textContent = Math.round(counter.v); } }, 0.55);
      arm(card, "top 84%", () => tl.timeScale(1).play(), () => tl.timeScale(1.6).reverse());
    }

    // depoimentos: o carrossel sobe depois do título
    if (rail) {
      gsap.set(rail, { autoAlpha: 0, y: 60 });
      arm(rail, "top 92%",
        () => gsap.to(rail, { autoAlpha: 1, y: 0, duration: 1.2, ease: EASE, delay: 0.25 }),
        () => gsap.to(rail, { autoAlpha: 0, y: 60, duration: 0.5, ease: "power2.in" }));
    }

    // FAQ: as perguntas sobem em cascata
    if (faqItems.length) {
      gsap.set(faqItems, { autoAlpha: 0, y: 34 });
      arm($(".faq__list"), "top 86%",
        () => gsap.to(faqItems, { autoAlpha: 1, y: 0, duration: 0.9, ease: EASE, stagger: 0.06 }),
        () => gsap.to(faqItems, { autoAlpha: 0, y: 34, duration: 0.4, ease: "power2.in", stagger: 0.02 }));
    }

    // oferta final: o horizonte sobe enquanto a seção chega
    const final = $(".final"), arc = final && $(".s2__arc", final);
    if (arc) gsap.fromTo(arc, { y: 200 }, { y: 0, ease: "none", scrollTrigger: { trigger: final, start: "top bottom", end: "top 25%", scrub: 0.6 } });

    // rodapé
    const foot = $(".foot");
    if (foot) {
      const cols = $$(".foot__brand, .foot__col", foot);
      gsap.set(cols, { autoAlpha: 0, y: 30 });
      arm(foot, "top 92%",
        () => gsap.to(cols, { autoAlpha: 1, y: 0, duration: 0.9, ease: EASE, stagger: 0.08 }),
        () => gsap.to(cols, { autoAlpha: 0, y: 30, duration: 0.4, ease: "power2.in" }));
    }

    return () => cleanups.forEach((fn) => fn());
  });

  // medidas mudam quando a fonte/imagens assentam
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  addEventListener("load", () => ScrollTrigger.refresh());
})();
