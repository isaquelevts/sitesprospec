/* =========================================================
   Animações — GSAP 3.13 (core + ScrollTrigger + SplitText) + Lenis
   Segue as práticas do greensock/gsap-skills:
   - timelines para sequências, ScrollTrigger só em tweens/timelines de topo
   - SplitText com autoSplit + onSplit (re-split em resize/fontes)
   - só transform / opacity / filter; matchMedia para reduced-motion
   ========================================================= */
(() => {
  const root = document.documentElement;
  const release = () => root.classList.remove('motion-pending');

  if (!window.gsap || !window.ScrollTrigger || !window.SplitText) { release(); return; }
  gsap.registerPlugin(ScrollTrigger, SplitText);
  root.classList.add('has-gsap');

  const EASE = 'expo.out';
  const SOFT = 'power3.out';
  gsap.defaults({ ease: EASE, duration: 1.1 });

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  const mm = gsap.matchMedia();

  mm.add({
    motion: '(prefers-reduced-motion: no-preference)',
    desktop: '(min-width: 901px)',
    fine: '(hover: hover) and (pointer: fine)'
  }, (ctx) => {
    const { motion, desktop, fine } = ctx.conditions;
    if (!motion) { release(); return; }

    // A intro do hero precisa começar do topo
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    if (!location.hash) window.scrollTo(0, 0);

    /* ---------- Smooth scroll (Lenis) sincronizado com ScrollTrigger ---------- */
    let lenis = null;
    let cleanupLenis = null;
    if (window.Lenis) {
      lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
      lenis.on('scroll', ScrollTrigger.update);
      const raf = (t) => lenis.raf(t * 1000);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);

      const onAnchor = (e) => {
        const a = e.target.closest('a[href^="#"]');
        if (!a) return;
        const id = a.getAttribute('href');
        const target = id === '#top' || id === '#' ? 0 : $(id);
        if (target === null) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: target === 0 ? 0 : -80, duration: 1.4 });
      };
      document.addEventListener('click', onAnchor);

      // limpeza quando a media query deixar de valer
      cleanupLenis = () => {
        document.removeEventListener('click', onAnchor);
        gsap.ticker.remove(raf);
        lenis.destroy();
      };
    }

    /* ---------- Helpers de texto ---------- */
    // Palavras surgindo do blur (assinatura da referência)
    const blurWords = (el, { scroll = true, delay = 0, ignore } = {}) =>
      SplitText.create(el, {
        type: 'words',
        ignore,
        autoSplit: true,
        onSplit(self) {
          return gsap.fromTo(self.words,
            { autoAlpha: 0, filter: 'blur(10px)', yPercent: 30 },
            {
              autoAlpha: 1, filter: 'blur(0px)', yPercent: 0,
              duration: 1.2, delay, stagger: 0.06, ease: SOFT,
              scrollTrigger: scroll ? { trigger: el, start: 'top 85%', once: true } : undefined
            });
        }
      });

    // Linhas subindo por trás de uma máscara
    const maskLines = (el, { scroll = true, delay = 0 } = {}) =>
      SplitText.create(el, {
        type: 'lines',
        mask: 'lines',
        linesClass: 'line',
        autoSplit: true,
        onSplit(self) {
          return gsap.from(self.lines, {
            yPercent: 110, duration: 1.1, delay, stagger: 0.09,
            scrollTrigger: scroll ? { trigger: el, start: 'top 88%', once: true } : undefined
          });
        }
      });

    const riseIn = (targets, trigger, vars = {}) =>
      gsap.from(targets, {
        y: 40, autoAlpha: 0, duration: 1, stagger: 0.08, ...vars,
        scrollTrigger: { trigger: trigger || targets, start: 'top 90%', once: true }
      });

    /* ---------- 1. Intro do hero (timeline de entrada) ---------- */
    const panel = $('.hero__panel');
    const radius = getComputedStyle(panel).borderRadius || '28px';

    const heroTitle = SplitText.create('.hero__heading', { type: 'words' });
    const heroBody = SplitText.create('.hero__body', { type: 'lines', mask: 'lines', linesClass: 'line' });

    const intro = gsap.timeline({ defaults: { ease: EASE } });
    intro
      .fromTo(panel,
        { clipPath: 'inset(50% 50% 50% 50% round 200px)' },
        { clipPath: `inset(0% 0% 0% 0% round ${radius})`, duration: 1.6, ease: 'expo.inOut', clearProps: 'clipPath' })
      .from('.hero__photo', { scale: 1.25, duration: 2.2 }, '<')
      .add(release, 0)
      .from('.nav', { yPercent: -160, autoAlpha: 0, duration: 1.2 }, '-=0.7')
      .fromTo(heroTitle.words,
        { autoAlpha: 0, filter: 'blur(12px)', yPercent: 40 },
        { autoAlpha: 1, filter: 'blur(0px)', yPercent: 0, duration: 1.3, stagger: 0.07, ease: SOFT }, '<0.1')
      .from(heroBody.lines, { yPercent: 110, duration: 1, stagger: 0.08 }, '<0.6')
      .from('.hero__cta', { y: 24, autoAlpha: 0, duration: 1 }, '<0.2')
      .from('.wa', { scale: 0, autoAlpha: 0, duration: 0.8, ease: 'back.out(2)' }, '<0.2');

    // Hero ao sair da tela: foto desce levemente, conteúdo sobe e some
    gsap.to('.hero__photo', {
      yPercent: 12, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
    });
    gsap.to('.hero__content', {
      y: -80, autoAlpha: 0, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: '40% top', end: 'bottom top', scrub: true }
    });

    /* ---------- 2. Intro / Sobre ---------- */
    maskLines('.intro__aside p');

    gsap.fromTo('.intro__frame',
      { clipPath: 'inset(100% 0% 0% 0%)' },
      { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.inOut',
        scrollTrigger: { trigger: '.intro__frame', start: 'top 90%', once: true } });
    gsap.fromTo('.intro__thumb', { scale: 1.3 }, {
      scale: 1, ease: 'none',
      scrollTrigger: { trigger: '.intro', start: 'top bottom', end: 'bottom top', scrub: true }
    });

    // Título que "acende" palavra por palavra conforme o scroll
    SplitText.create('.intro__heading', {
      type: 'words',
      autoSplit: true,
      onSplit(self) {
        return gsap.fromTo(self.words, { opacity: 0.12 }, {
          opacity: 1, stagger: 0.1, ease: 'none',
          scrollTrigger: { trigger: '.intro__heading', start: 'top 80%', end: 'bottom 45%', scrub: true }
        });
      }
    });

    // Contadores
    $$('.intro__figure').forEach((el) => {
      const final = el.textContent.trim();
      const target = Number(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      if (!target) return;
      const state = { v: 0 };
      el.textContent = '0' + suffix;
      gsap.to(state, {
        v: target, duration: 2.2, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        onUpdate: () => { el.textContent = Math.round(state.v).toLocaleString('pt-BR') + suffix; },
        onComplete: () => { el.textContent = final; }
      });
    });
    riseIn('.intro__label', '.intro__stats', { y: 16 });

    /* ---------- 3. Tratamentos ---------- */
    blurWords('.classes__heading');
    maskLines('.classes__intro p');
    riseIn('.classes__cta', '.classes__intro', { y: 20 });

    const cards = $$('.classes__card');
    if (desktop) {
      cards.forEach((card, i) => {
        // entrada: sobe girando levemente e assenta
        gsap.from(card, {
          yPercent: 40, rotation: (i - 1) * -5, autoAlpha: 0, duration: 1.4,
          scrollTrigger: { trigger: card, start: 'top 95%', once: true }
        });
        // profundidade: cada card anda num ritmo diferente
        gsap.fromTo(card, { y: 40 * i }, {
          y: -40 * i, ease: 'none',
          scrollTrigger: { trigger: '.classes__deck', start: 'top bottom', end: 'bottom top', scrub: 1 }
        });
      });
    } else {
      riseIn(cards, '.classes__deck', { x: 60, y: 0, stagger: 0.12 });
    }
    cards.forEach((card) => {
      gsap.fromTo($('img', card), { scale: 1.2 }, {
        scale: 1, ease: 'none',
        scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true }
      });
      gsap.from($('.classes__go', card), {
        scale: 0, rotation: -90, duration: 0.9, ease: 'back.out(2)',
        scrollTrigger: { trigger: card, start: 'top 80%', once: true }
      });
    });

    /* ---------- 3a. O espaço (carrossel) ---------- */
    blurWords('.space__heading');
    maskLines('.space__text');
    // o anel sobe e "abre" de leve ao entrar na tela
    gsap.from('.reel', {
      yPercent: 8, scale: 0.94, autoAlpha: 0, duration: 1.6, ease: 'expo.out',
      scrollTrigger: { trigger: '.reel', start: 'top 85%', once: true }
    });
    riseIn('.space__controls', '.reel', { y: 16 });

    /* ---------- 3b. Como funciona ---------- */
    blurWords('.steps__heading');
    maskLines('.steps__intro p');
    riseIn('.steps__cta', '.steps__intro', { y: 20 });

    const stepEls = $$('.step');
    const accent = getComputedStyle(root).getPropertyValue('--c-accent').trim();
    const paper = getComputedStyle(root).getPropertyValue('--c-paper').trim();

    // estado inicial: etapas "apagadas", aguardando a linha chegar
    gsap.set('.steps__fill', { '--p': 0 });
    stepEls.forEach((step) => {
      gsap.set($('.step__dot', step), { backgroundColor: paper, color: 'rgba(22,20,18,.35)' });
      gsap.set($$('.step__title, .step__body, .step__tag', step), { autoAlpha: 0.15, y: 24 });
    });

    // A linha avança e acende cada etapa quando passa por ela.
    // Desktop: seção fica fixa (pin) enquanto a linha percorre as 4 etapas.
    const stepsTl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: desktop
        ? { trigger: '.steps', start: 'center center', end: '+=140%', pin: true, scrub: 1 }
        : { trigger: '.steps__track', start: 'top 75%', end: 'bottom 55%', scrub: 1 }
    });
    stepsTl.to('.steps__fill', { '--p': 1, duration: stepEls.length }, 0);
    stepEls.forEach((step, i) => {
      const at = i * 0.92;
      stepsTl
        .to($('.step__dot', step), { backgroundColor: accent, color: '#161412', duration: 0.3 }, at)
        .fromTo($('.step__dot', step), { scale: 0.85 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' }, at)
        .to($$('.step__title, .step__body, .step__tag', step), { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.08, ease: 'power2.out' }, at);
    });

    /* ---------- 4. A Doutora ---------- */
    blurWords('.teachers__heading');
    maskLines('.teachers__intro p');
    riseIn('.teachers__cta', '.teachers__intro', { y: 20 });

    const bar = $('.teachers__namebar');
    gsap.fromTo(bar, { '--rule': 0 }, {
      '--rule': 1, duration: 1.4, ease: 'expo.inOut',
      scrollTrigger: { trigger: bar, start: 'top 85%', once: true }
    });
    maskLines('.teachers__name');
    riseIn(['.teachers__cro', '.teachers__bios'], bar, { y: 16 });
    gsap.from('.teachers__panel .go', {
      scale: 0, rotation: -90, duration: 1, ease: 'back.out(2)',
      scrollTrigger: { trigger: bar, start: 'top 85%', once: true }
    });
    riseIn('.teachers__list li', '.teachers__list', { x: -30, y: 0, stagger: 0.1 });

    const stage = $('.teachers__stage');
    gsap.fromTo(stage,
      { clipPath: 'inset(0% 0% 100% 0%)' },
      { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'expo.inOut',
        scrollTrigger: { trigger: stage, start: 'top 85%', once: true } });
    gsap.from(stage, {
      scale: 1.15, duration: 2.2,
      scrollTrigger: { trigger: stage, start: 'top 85%', once: true }
    });

    // Troca de foto: blur + zoom (mesma lógica da referência)
    let shotNow = 0;
    const shots = $$('[data-shot]');
    const swap = (btn) => {
      const next = Number(btn.dataset.pick);
      if (next === shotNow) return;
      const out = shots[shotNow], inn = shots[next];
      gsap.fromTo(out, { scale: 1, filter: 'blur(0px)' },
        { scale: 1.15, filter: 'blur(10px)', duration: 0.7, ease: SOFT, overwrite: true,
          onComplete: () => gsap.set(out, { clearProps: 'transform,filter' }) });
      gsap.fromTo(inn, { scale: 1.2, filter: 'blur(10px)' },
        { scale: 1, filter: 'blur(0px)', duration: 1.1, ease: EASE, delay: 0.1, overwrite: true,
          onComplete: () => gsap.set(inn, { clearProps: 'transform,filter' }) });
      const bio = $(`[data-bio="${next}"]`);
      gsap.fromTo(bio, { y: 12, filter: 'blur(4px)' }, { y: 0, filter: 'blur(0px)', duration: 0.8, clearProps: 'transform,filter' });
      shotNow = next;
    };
    const onPick = (e) => { const b = e.target.closest('[data-pick]'); if (b) swap(b); };
    $('.teachers__list').addEventListener('click', onPick);

    /* ---------- 5. Depoimentos ---------- */
    const quoteSplits = $$('.quotes__text').map((el) =>
      SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'line', autoSplit: true }));

    const firstQuote = $('.quotes__item[aria-hidden="false"]');
    gsap.from([
      ...$$('.line', firstQuote),
      $('.quotes__source', firstQuote), $('.quotes__by', firstQuote)
    ], {
      yPercent: 110, autoAlpha: 0, duration: 1.1, stagger: 0.08,
      scrollTrigger: { trigger: '.quotes', start: 'top 75%', once: true }
    });
    riseIn('.quotes__controls', '.quotes', { y: 16 });

    const frame = $('.quotes__frame');
    gsap.fromTo(frame, { clipPath: 'inset(100% 0% 0% 0% round 16px)' }, {
      clipPath: 'inset(0% 0% 0% 0% round 16px)', duration: 1.5, ease: 'expo.inOut', clearProps: 'clipPath',
      scrollTrigger: { trigger: frame, start: 'top 90%', once: true }
    });
    gsap.fromTo('.quotes__thumb', { yPercent: -8, scale: 1.2 }, {
      yPercent: 8, scale: 1.2, ease: 'none',
      scrollTrigger: { trigger: '.quotes', start: 'top bottom', end: 'bottom top', scrub: true }
    });

    const onQuote = (e) => {
      if (!e.target.closest('.quotes__controls button')) return;
      const item = $('.quotes__item[aria-hidden="false"]');
      if (!item) return;
      gsap.fromTo($$('.line', item), { yPercent: 110 }, { yPercent: 0, duration: 1, stagger: 0.07, overwrite: true });
      gsap.fromTo($('.quotes__by', item), { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8, delay: 0.2 });
      gsap.fromTo('.quotes__thumb', { filter: 'blur(6px)' }, { filter: 'blur(0px)', duration: 0.9, clearProps: 'filter' });
    };
    $('.quotes__controls').addEventListener('click', onQuote);

    /* ---------- 6. FAQ ---------- */
    blurWords('.faq__heading');
    ScrollTrigger.batch('.faq__item', {
      start: 'top 92%', once: true,
      onEnter: (items) => gsap.from(items, { y: 50, autoAlpha: 0, duration: 1, stagger: 0.09, overwrite: true })
    });

    /* ---------- 6b. Localização ---------- */
    blurWords('.visit__heading');
    maskLines('.visit__intro');
    maskLines('.visit__address p:last-child');
    riseIn('.visit__label', '.visit__address', { y: 12 });

    const rows = $$('.visit__row');
    const rowsTl = gsap.timeline({ scrollTrigger: { trigger: '.visit__hours', start: 'top 85%', once: true } });
    rowsTl
      .fromTo(rows, { '--rule': 0 }, { '--rule': 1, duration: 1.2, stagger: 0.12, ease: 'expo.inOut' }, 0)
      .from(rows.flatMap((r) => [...r.children]), { y: 18, autoAlpha: 0, duration: 0.9, stagger: 0.06 }, 0.2);
    riseIn('.visit__actions > *', '.visit__actions', { y: 20, stagger: 0.1 });

    const map = $('.visit__map');
    gsap.fromTo(map, { clipPath: 'inset(0% 0% 100% 0% round 28px)' }, {
      clipPath: `inset(0% 0% 0% 0% round ${radius})`, duration: 1.6, ease: 'expo.inOut', clearProps: 'clipPath',
      scrollTrigger: { trigger: map, start: 'top 85%', once: true }
    });
    gsap.from('.visit__map iframe', {
      scale: 1.15, duration: 2.2,
      scrollTrigger: { trigger: map, start: 'top 85%', once: true }
    });
    gsap.from('.visit__card', {
      y: 40, autoAlpha: 0, duration: 1.1, delay: 0.9,
      scrollTrigger: { trigger: map, start: 'top 85%', once: true }
    });

    /* ---------- 7. CTA ---------- */
    const cta = $('.cta__panel');
    gsap.fromTo(cta, { clipPath: 'inset(12% 6% 12% 6% round 60px)' }, {
      clipPath: `inset(0% 0% 0% 0% round ${radius})`, ease: 'none',
      scrollTrigger: { trigger: '.cta', start: 'top bottom', end: 'top 30%', scrub: true }
    });
    // só desce (nunca sobe) para não cortar a cabeça da Dra. no topo do painel
    gsap.fromTo('.cta__photo', { yPercent: 2 }, {
      yPercent: 10, ease: 'none',
      scrollTrigger: { trigger: '.cta', start: 'top bottom', end: 'bottom top', scrub: true }
    });
    SplitText.create('.cta__heading', {
      type: 'words', ignore: '.badge', autoSplit: true,
      onSplit(self) {
        const tl = gsap.timeline({ scrollTrigger: { trigger: '.cta__heading', start: 'top 85%', once: true } });
        tl.fromTo(self.words,
            { autoAlpha: 0, filter: 'blur(10px)', yPercent: 30 },
            { autoAlpha: 1, filter: 'blur(0px)', yPercent: 0, duration: 1.2, stagger: 0.06, ease: SOFT })
          .from('.cta .badge', { scale: 0, rotation: -120, duration: 1.1, ease: 'back.out(2)' }, '<0.3');
        return tl;
      }
    });
    maskLines('.cta__body');
    riseIn('.cta__button', '.cta__content', { y: 20 });

    /* ---------- 8. Rodapé ---------- */
    riseIn(['.foot__mark', '.foot__blurb', '.foot__copy'], '.foot', { y: 24 });
    riseIn('.foot__links > div', '.foot__links', { y: 30, stagger: 0.1 });

    SplitText.create('.foot__wordmark', {
      type: 'chars',
      onSplit(self) {
        return gsap.from(self.chars, {
          yPercent: 110, rotation: 8, duration: 1.4, stagger: 0.06, ease: 'expo.out',
          scrollTrigger: { trigger: '.foot', start: 'top 70%', once: true }
        });
      }
    });
    if (desktop) {
      gsap.from('.foot__card', {
        y: 260, rotation: (i) => [16, 8, -6][i], autoAlpha: 0, duration: 1.4, stagger: 0.12,
        scrollTrigger: { trigger: '.foot', start: 'top 60%', once: true }
      });
    }

    /* ---------- 9. Botões magnéticos (quickTo — recomendado p/ updates frequentes) ---------- */
    const magnets = [];
    if (fine) {
      $$('.go:is(a), .wa, .quotes__controls button').forEach((el) => {
        const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' });
        const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
        const move = (e) => {
          const r = el.getBoundingClientRect();
          xTo((e.clientX - (r.left + r.width / 2)) * 0.35);
          yTo((e.clientY - (r.top + r.height / 2)) * 0.35);
        };
        const leave = () => { xTo(0); yTo(0); };
        el.addEventListener('pointermove', move);
        el.addEventListener('pointerleave', leave);
        magnets.push([el, move, leave]);
      });
    }

    // Recalcula posições quando as fontes e imagens terminarem de carregar
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
    window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });

    return () => {
      $('.teachers__list').removeEventListener('click', onPick);
      $('.quotes__controls').removeEventListener('click', onQuote);
      magnets.forEach(([el, m, l]) => { el.removeEventListener('pointermove', m); el.removeEventListener('pointerleave', l); });
      quoteSplits.forEach((s) => s.revert());
      heroTitle.revert(); heroBody.revert();
      if (cleanupLenis) cleanupLenis();
    };
  });
})();
