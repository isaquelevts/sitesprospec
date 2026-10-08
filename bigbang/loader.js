/* Big Bang v2 · loader de entrada — foguete decolando, a chama revela a página (GSAP 3.13)
 *
 * A cortina escura é um SVG com <mask>: o furo da máscara é o desenho da chama.
 * A página aparece só por dentro do fogo.
 *  1) ignição ~0,6s: o foguete sobe até a base; a chama azul acende e tremula; a abertura nasce no bocal
 *  2) decolagem ~1,15s: ele acelera e sai pelo topo; a chama se abre e se alonga até engolir a tela
 *  3) o resto da cortina desaparece; a hero assenta e o texto entra
 * A decolagem só acontece depois que a imagem da hero carregou. Trava de segurança no <head>.
 * (Versões anteriores: loader-buraco-negro.js)
 */
(() => {
  const root = document.documentElement;
  if (!root.classList.contains("is-loading")) return;             // reduzir movimento → sem loader
  if (!window.gsap) { root.classList.remove("is-loading"); return; }
  clearTimeout(window.__bhFailsafe);                               // o GSAP assume daqui
  const failsafe = setTimeout(() => finish(), 6500);               // nunca prende a página

  const loader = document.querySelector(".loader");
  const svg = loader.querySelector(".loader__svg");
  const mask = svg.querySelector("#flame-mask");
  const fills = svg.querySelectorAll(".loader__fill");
  const curtain = svg.querySelector(".loader__curtain");
  const starsG = svg.querySelector(".loader__stars");
  const rim = svg.querySelector(".loader__rim");
  const flames = svg.querySelectorAll(".flame:not(.flame--core)");  // máscara + contorno
  const core = svg.querySelector(".flame--core");
  const rocket = loader.querySelector(".loader__rocket");
  const heroImg = document.querySelector(".hero__media img");
  const heroBits = document.querySelectorAll(".hero__title, .hero__quote, .hero__cta");
  const NS = "http://www.w3.org/2000/svg";

  let W = innerWidth, H = innerHeight;
  let rocketH = rocket.offsetHeight;

  /* ---------- tela ---------- */
  const fit = () => {
    W = innerWidth; H = innerHeight; rocketH = rocket.offsetHeight;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    mask.setAttribute("x", 0); mask.setAttribute("y", 0);
    mask.setAttribute("width", W); mask.setAttribute("height", H);
    fills.forEach((r) => { r.setAttribute("width", W); r.setAttribute("height", H); });
  };
  fit();
  addEventListener("resize", fit);

  /* estrelas dentro da cortina */
  for (let i = 0; i < 90; i++) {
    const c = document.createElementNS(NS, "circle");
    c.setAttribute("cx", (Math.random() * W).toFixed(1));
    c.setAttribute("cy", (Math.random() * H * 1.4 - H * 0.4).toFixed(1));
    c.setAttribute("r", (0.4 + Math.random() * 0.9).toFixed(2));
    c.setAttribute("opacity", (0.25 + Math.random() * 0.6).toFixed(2));
    starsG.appendChild(c);
  }

  /* ---------- formato da abertura (máscara) ----------
   * ponta fina no bocal, laterais côncavas e base reta — sem ondulação.
   * unidade: ponta em (0,0), base de (−0,5, 1) a (0,5, 1); devolve em px de tela. */
  const cuspD = (ox, oy, sx, sy) => {
    const P = (x, y) => `${(ox + x * sx).toFixed(2)} ${(oy + y * sy).toFixed(2)}`;
    return `M${P(0, 0)} C${P(0.025, 0.42)} ${P(0.2, 0.86)} ${P(0.5, 1)} L${P(-0.5, 1)} C${P(-0.2, 0.86)} ${P(-0.025, 0.42)} ${P(0, 0)}Z`;
  };

  /* ---------- formato da chama azul (núcleo de fogo) ----------
   * coordenadas de unidade: bocal em (0,0), ponta em (0,1), meia-largura ~0,42.
   * as "línguas" laterais oscilam com o tempo → fogo tremulando de forma orgânica. */
  const fireD = (t, ox, oy, sx, sy) => {
    const w = (a, f, ph) => a * Math.sin(t * f + ph);
    const tA = 0.30 + w(0.025, 23, 0.0), tB = 0.40 + w(0.02, 19, 1.3);   // língua de cima
    const mA = 0.42 + w(0.03, 17, 2.1), mB = 0.62 + w(0.025, 21, 0.7);   // barriga
    const kL = w(0.02, 29, 0.4), kR = w(0.02, 31, 2.6);                  // assimetria
    const tip = 1 + w(0.04, 25, 1.9);
    // lado direito: pescoço → língua → reentrância → barriga → ponta (o esquerdo espelha)
    // P(x, y) converte da unidade para pixels de tela (sem transform → o blur do brilho fica em px reais)
    const P = (x, y) => `${(ox + x * sx).toFixed(2)} ${(oy + y * sy).toFixed(2)}`;
    return [
      `M${P(0, 0)}`,
      `C${P(0.09, 0.02)} ${P(0.15, 0.09)} ${P(0.19 + kR, 0.19)}`,
      `C${P(0.23, 0.26)} ${P(tA + 0.02, 0.28)} ${P(tA + 0.03, tB)}`,        // língua de cima
      `C${P(tA + 0.02, 0.45)} ${P(0.25, 0.47)} ${P(0.26, 0.50)}`,           // reentrância
      `C${P(0.29, 0.55)} ${P(mA, 0.54)} ${P(mA + 0.02, mB)}`,               // barriga
      `C${P(mA + 0.03, 0.74)} ${P(0.30, 0.80)} ${P(0.17, 0.86)}`,           // língua de baixo
      `C${P(0.11, 0.89)} ${P(0.06, 0.92)} ${P(0, tip)}`,
      `C${P(-0.06, 0.92)} ${P(-0.11, 0.89)} ${P(-0.17, 0.86)}`,
      `C${P(-0.30, 0.80)} ${P(-mA - 0.03 + kL, 0.74)} ${P(-mA - 0.02 + kL, mB)}`,
      `C${P(-mA + kL, 0.54)} ${P(-0.29, 0.55)} ${P(-0.26, 0.50)}`,
      `C${P(-0.25, 0.47)} ${P(-tA - 0.02, 0.45)} ${P(-tA - 0.03, tB)}`,
      `C${P(-tA - 0.02, 0.28)} ${P(-0.23, 0.26)} ${P(-0.19 + kL, 0.19)}`,
      `C${P(-0.15, 0.09)} ${P(-0.09, 0.02)} ${P(0, 0)}Z`,
    ].join(" ");
  };

  /* ---------- estado único que dirige a cena ---------- */
  const s = {
    lift: -rocketH * 1.05,   // altura da base do foguete acima do chão (px)
    ign: 0,                  // 0→1 chama da ignição
    len: 0,                  // fator de alongamento até o chão
    wide: 0.6,               // largura da abertura em relação ao comprimento
    core: 1,                 // opacidade do núcleo de fogo
    time: 0,
  };
  gsap.set(rocket, { xPercent: -50 });
  const setRocketY = gsap.quickSetter(rocket, "y", "px");

  const draw = (_t, delta) => {
    s.time += (delta || 16) / 1000;
    setRocketY(-s.lift);
    const nx = W / 2;
    const ny = H - s.lift - rocketH * 0.05;                        // bocal = base do corpo do foguete
    const L = Math.max(rocketH * 1.1 * s.ign, (H - ny + 40) * s.len, 0.001);
    const flick = 1 + 0.06 * Math.sin(s.time * 37) + 0.04 * Math.sin(s.time * 53);
    const d = cuspD(nx, ny, L * s.wide, L);                         // abertura: lisa, sem tremor
    flames.forEach((f) => f.setAttribute("d", d));
    core.setAttribute("d", fireD(s.time, nx, ny, rocketH * 0.42 * s.ign, rocketH * 1.15 * s.ign * flick));
    core.setAttribute("opacity", s.core);
  };
  gsap.ticker.add(draw);

  /* 1 · ignição */
  const intro = gsap.timeline()
    .to(s, { lift: H * 0.14, duration: 0.6, ease: "power3.out" }, 0)
    .to(s, { ign: 1, duration: 0.45, ease: "back.out(2)" }, 0.2)
    .to(rocket, { x: "+=1.2", duration: 0.035, repeat: 7, yoyo: true, ease: "none" }, 0.4);

  const imgReady = heroImg.complete && heroImg.naturalWidth
    ? Promise.resolve()
    : new Promise((res) => { heroImg.addEventListener("load", res, { once: true }); heroImg.addEventListener("error", res, { once: true }); });
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
  const introDone = new Promise((res) => intro.eventCallback("onComplete", res));
  Promise.all([imgReady, fontsReady, introDone]).then(launch);

  /* 2 · decolagem: a chama se abre e engole a tela */
  function launch() {
    gsap.set(loader, { pointerEvents: "none" });                   // a página já é clicável
    gsap.set(heroImg, { scale: 1.08, transformOrigin: "50% 100%" });
    const textIn = prepHeroText();

    gsap.timeline({ onComplete: finish })
      .to(s, { lift: H + rocketH + 80, duration: 1.15, ease: "power2.in" }, 0)
      .to(s, { len: 1.35, duration: 0.5, ease: "power2.out" }, 0)
      .to(s, { wide: 7, duration: 1.15, ease: "power3.in" }, 0)
      .to(s, { core: 0, duration: 0.35, ease: "power1.in" }, 0.35)
      .to(starsG, { y: H * 0.3, duration: 1.15, ease: "power2.in" }, 0)
      .to([curtain, rim], { opacity: 0, duration: 0.3, ease: "power1.in" }, 1.0)
      .to(heroImg, { scale: 1, duration: 1.4, ease: "expo.out" }, 0.35)
      ;
    textIn();                                                      // o texto tem a própria linha do tempo: não segura a liberação da rolagem
  }

  /* entrada do texto da hero (começa quando a chama já abriu a tela):
   *  título palavra por palavra — sobe da base, sai de um desfoque forte e assenta com "expo";
   *  a citação entra linha por linha; o botão e o preço sobem por último, com um leve "pop" */
  function prepHeroText() {
    const title = document.querySelector(".hero__title"), quote = document.querySelector(".hero__quote");
    const extras = [...document.querySelectorAll(".hero__cta .btn, .hero__price")];
    if (!window.SplitText || !title || !quote) {
      gsap.set(heroBits, { y: 24, autoAlpha: 0 });
      return () => gsap.to(heroBits, { y: 0, autoAlpha: 1, duration: 0.9, ease: "power3.out", stagger: 0.09, delay: 0.75, clearProps: "transform,opacity,visibility" });
    }
    const tSplit = SplitText.create(title, { type: "words", wordsClass: "wd" });
    const qSplit = SplitText.create(quote, { type: "lines", linesClass: "ln" });
    title.querySelector(".hero__title-accent")?.classList.add("grad--split");   // o degradê passa a valer em cada palavra
    gsap.set(tSplit.words, { autoAlpha: 0, y: "0.6em", scale: 0.94, filter: "blur(14px)", transformOrigin: "0% 100%" });
    gsap.set(qSplit.lines, { autoAlpha: 0, y: 16, filter: "blur(8px)" });
    gsap.set(extras, { autoAlpha: 0, y: 22, scale: 0.95, filter: "blur(6px)" });
    return () => gsap.timeline({
      delay: 0.55,
      onComplete: () => { tSplit.revert(); qSplit.revert(); title.querySelector(".hero__title-accent")?.classList.remove("grad--split"); gsap.set(extras, { clearProps: "all" }); },
    })
      .to(tSplit.words, { autoAlpha: 1, y: 0, scale: 1, filter: "blur(0px)", duration: 1.15, ease: "expo.out", stagger: 0.1 }, 0)
      .to(qSplit.lines, { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 1, ease: "power3.out", stagger: 0.1 }, 0.5)
      .to(extras, { autoAlpha: 1, y: 0, scale: 1, filter: "blur(0px)", duration: 1, ease: "expo.out", stagger: 0.12 }, 0.8);
  }

  function finish() {
    clearTimeout(failsafe);
    gsap.ticker.remove(draw);
    removeEventListener("resize", fit);
    root.classList.remove("is-loading");
    loader.remove();
    window.ScrollTrigger?.refresh();                                 // a página voltou a rolar: recalcula o pin da transição
  }
})();
