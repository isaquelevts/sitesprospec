/* =====================================================================
   APLICAÇÃO PARA CONSULTORIA — popup sequencial (uma pergunta por vez)
   ---------------------------------------------------------------------
   • Abre em qualquer botão com a classe .js-cta
   • Respostas ficam salvas na sessão (se fechar e abrir, continua de onde parou)
   • Para receber as respostas, coloque a URL do seu webhook em QUIZ_ENDPOINT
     (n8n, Make, Zapier, planilha…). Elas chegam em JSON via POST.
   ===================================================================== */
(() => {
  const QUIZ_ENDPOINT = ""; // ex.: "https://seu-n8n.com/webhook/aplicacao-caio"
  const STORE_KEY = "quiz-caio-v1";
  const THANKS_URL = "obrigado.html"; // para onde vai quem é aprovado

  /* ---------- Textos dinâmicos ([META] e [renda]) ---------- */
  const metaTxt = a => (a.meta ? a.meta.replace(/\s*líquido/i, "").replace(/^Acima/, "acima") + " por mês" : "a sua meta");
  const rendaTxt = a => (a.renda ? a.renda.replace(/^(Menos|Mais)/, m => m.toLowerCase()) : "o que ganha hoje");

  /* ---------- Perguntas ---------- */
  const QUESTIONS = [
    { id: "nome", type: "text", title: "Qual seu nome e sobrenome?", placeholder: "Seu nome completo", autocomplete: "name",
      validate: v => v.trim().split(/\s+/).length >= 2 || "Digite seu nome e sobrenome." },
    { id: "contato", type: "fields", title: "Qual seu WhatsApp e e-mail?",
      fields: [
        { id: "whatsapp", label: "WhatsApp", type: "tel", placeholder: "(11) 99999-9999", autocomplete: "tel", mask: "phone",
          validate: v => [10, 11].includes(v.replace(/\D/g, "").length) || "Digite um WhatsApp válido com DDD." },
        { id: "email", label: "E-mail", type: "email", placeholder: "voce@email.com", autocomplete: "email",
          validate: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || "Digite um e-mail válido." },
      ] },
    { id: "instagram", type: "text", prefix: "@", title: "Qual seu Instagram?", placeholder: "seuperfil", autocomplete: "off",
      clean: v => v.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").replace(/\/.*$/, ""),
      validate: v => v.trim().length >= 2 || "Digite seu @ do Instagram." },
    { id: "momento", type: "choice", title: "Qual dessas opções descreve melhor seu momento atual?", options: [
      "Tenho um negócio lucrativo mas quero escalar no digital",
      "Sou profissional autônomo e quero parar de vender meu tempo",
      "Já trabalho com internet e quero criar e escalar micro-SaaS feito com IA",
      "Já tenho um micro-SaaS mas não consigo escalar",
      "Sou CLT, ganho bem, mas quero ter liberdade e controlar meu tempo",
    ] },
    { id: "prioridade", type: "textarea", title: "Por que criar e escalar micro-SaaS com IA talvez seja prioridade pra você agora?",
      placeholder: "Conta pra gente com suas palavras…", validate: v => v.trim().length >= 10 || "Escreve um pouquinho mais pra gente te conhecer." },
    { id: "meta", type: "choice", title: "Depois de escalar uma operação de Micro-SaaS, quanto você quer ganhar por mês?", options: [
      "Acima de R$50 mil líquido", "Acima de R$100 mil líquido", "Acima de R$250 mil líquido", "Acima de R$500 mil líquido",
    ] },
    { id: "renda", type: "choice",
      title: a => `Pra gente saber a distância de onde você tá pra chegar a ganhar <em>${metaTxt(a)}</em>, responde aqui: qual sua renda mensal atualmente?`,
      options: ["Menos de R$5.000", "R$5.000 a R$10.000", "R$10.000 a R$25.000", "R$25.000 a R$50.000", "R$50.000 a R$100.000", "R$100.000 a R$250.000", "Mais de R$250.000"] },
    { id: "limite", type: "choice", title: "Quanto você tem de limite disponível no cartão de crédito?",
      note: "Esse valor não é requisito de aprovação, apenas ajuda a montar o melhor plano de ação possível pra você, tendo em vista que crédito pode facilitar muitas coisas.",
      options: ["Menos de R$5.000", "R$5.000 a R$10.000", "R$10.000 a R$25.000", "R$25.000 a R$50.000", "R$50.000 ou mais"] },
    { id: "experiencia", type: "choice", title: "Você já tentou criar algum micro-SaaS ou negócio digital?", options: [
      "Nunca tentei nenhum dos dois",
      "Tentei no digital mas não foi pra frente",
      "Ganhei dinheiro no digital mas nunca tentei com micro-SaaS",
      "Tentei criar micro-SaaS mas não tive resultado",
      "Já tenho micro-SaaS vendendo e quero escalar",
    ] },
    { id: "ideia", type: "choice", title: "Você já tem ideia de micro-SaaS em mente?", options: [
      "Já tenho micro-SaaS vendendo bem", "Tenho ideia clara", "Tenho ideia mas não sei qual escolher", "Ainda não tenho ideia", "Não sei nem por onde começar",
    ] },
    { id: "decisao", type: "choice", title: "Tem sócio ou cônjuge que participa das decisões financeiras?", options: [
      "Não, decido sozinho", "Sim, meu sócio precisa participar", "Sim, meu cônjuge participa",
    ] },
    { id: "porque_voce", type: "textarea", title: "Milhares querem minha ajuda para escalar micro-SaaS com IA. Por que eu deveria te escolher ao invés de outras pessoas?",
      placeholder: "Capricha aqui 😉", validate: v => v.trim().length >= 10 || "Escreve um pouquinho mais — essa resposta pesa bastante." },
    { id: "investimento", type: "choice",
      intro: "Caso a gente realmente sinta que possa te ajudar, ao final da call podemos te apresentar algum dos nossos programas de aceleração.",
      title: a => `Se você for selecionado, está disposto a investir até quanto pra sair de ganhar <em>${rendaTxt(a)}</em> para ganhar <em>${metaTxt(a)}</em>?`,
      options: ["Até R$3K", "Entre R$3K e R$5K", "Entre R$5K e R$10K", "Entre R$10K e R$25K", "Entre R$25K e R$50K", "Acima de R$50K"] },
    { id: "compromisso", type: "choice", title: "Se for selecionado pra call, você se compromete a comparecer no horário agendado?", options: [
      "Sim, me comprometo!", "Não é prioridade",
    ] },
  ];

  /* ---------- Resultado final ----------
     Aqui entram as regras de "FINAIS" (quais respostas desqualificam o lead).
     Devolva "aprovado" ou "nao-qualificado". Por enquanto, todo mundo é aprovado. */
  const resultado = a => {
    // Exemplo: if (a.compromisso === "Não é prioridade") return "nao-qualificado";
    return "aprovado";
  };
  const FINAL = {
    aprovado: {
      icon: "✓",
      title: "Aplicação recebida!",
      text: "Nossa equipe vai analisar suas respostas e, se você for selecionado, vai entrar em contato pelo WhatsApp para agendar sua reunião estratégica.",
    },
    "nao-qualificado": {
      icon: "→",
      title: "Obrigado pelas respostas!",
      text: "Pelo seu momento atual, a mentoria individual ainda não é o melhor caminho. Continue acompanhando o Caio nas redes — logo tem novidade pra você.",
    },
  };

  /* ================= Estado ================= */
  let answers = {}, step = 0, isOpen = false, busy = false, lastFocus = null;
  try { const s = JSON.parse(sessionStorage.getItem(STORE_KEY) || "null"); if (s) ({ answers, step } = s); } catch {}
  const save = () => { try { sessionStorage.setItem(STORE_KEY, JSON.stringify({ answers, step })); } catch {} };
  const TOTAL = QUESTIONS.length;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const maskPhone = v => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 2) return d ? `(${d}` : "";
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  };

  /* ================= Estrutura do popup ================= */
  const root = document.createElement("div");
  root.className = "quiz";
  root.hidden = true;
  root.innerHTML = `
    <div class="quiz__backdrop" data-close></div>
    <div class="quiz__dialog" data-lenis-prevent role="dialog" aria-modal="true" aria-labelledby="quiz-title" tabindex="-1">
      <div class="quiz__top">
        <img class="quiz__logo" src="assets/opt/logo.svg" alt="Mentoria Caio Martins" width="150" height="29">
        <span class="quiz__count" aria-live="polite"></span>
        <button class="quiz__close" type="button" aria-label="Fechar" data-close>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>
      <div class="quiz__progress"><span></span></div>
      <form class="quiz__body" data-lenis-prevent novalidate></form>
    </div>`;
  document.body.appendChild(root);
  const dialog = root.querySelector(".quiz__dialog");
  const form = root.querySelector(".quiz__body");
  const bar = root.querySelector(".quiz__progress span");
  const count = root.querySelector(".quiz__count");

  /* ================= Renderização ================= */
  const keyFor = i => String.fromCharCode(65 + i); // A, B, C…

  function renderStep() {
    const q = QUESTIONS[step];
    const title = typeof q.title === "function" ? q.title(answers) : esc(q.title);
    // sem mostrar o total: o contador diz só a etapa e a barra anda mais rápido no começo
    // (curva raiz), pra dar sensação de avanço e não assustar com a quantidade de perguntas
    const pct = Math.sqrt((step + 1) / (TOTAL + 1)) * 100;
    bar.style.width = `${Math.max(pct, 6)}%`;
    count.textContent = step >= TOTAL - 2 ? "Quase lá" : `Etapa ${step + 1}`;

    let field = "";
    if (q.type === "text") {
      field = `<label class="quiz__input${q.prefix ? " has-prefix" : ""}">${q.prefix ? `<span class="quiz__prefix">${q.prefix}</span>` : ""}
        <input name="${q.id}" type="text" placeholder="${esc(q.placeholder || "")}" autocomplete="${q.autocomplete || "on"}" value="${esc(answers[q.id] || "")}"></label>`;
    } else if (q.type === "fields") {
      field = q.fields.map(f => `<label class="quiz__field"><span class="quiz__label">${f.label}</span>
        <span class="quiz__input"><input name="${f.id}" type="${f.type}" inputmode="${f.type === "tel" ? "tel" : "email"}" placeholder="${esc(f.placeholder)}" autocomplete="${f.autocomplete}" value="${esc(answers[f.id] || "")}"></span></label>`).join("");
    } else if (q.type === "textarea") {
      field = `<label class="quiz__input quiz__input--area"><textarea name="${q.id}" rows="4" placeholder="${esc(q.placeholder || "")}">${esc(answers[q.id] || "")}</textarea></label>`;
    } else if (q.type === "choice") {
      field = `<div class="quiz__options" role="radiogroup" aria-labelledby="quiz-title">${q.options.map((o, i) => `
        <button type="button" class="quiz__opt${answers[q.id] === o ? " is-selected" : ""}" role="radio" aria-checked="${answers[q.id] === o}" data-value="${esc(o)}">
          <span class="quiz__key">${keyFor(i)}</span><span class="quiz__opt-text">${esc(o)}</span>
          <svg class="quiz__check" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>
        </button>`).join("")}</div>`;
    }

    const isText = q.type !== "choice";
    form.innerHTML = `
      <div class="quiz__step">
        <span class="quiz__eyebrow">Aplicação para consultoria</span>
        ${q.intro ? `<p class="quiz__intro">${esc(q.intro)}</p>` : ""}
        <h2 class="quiz__title" id="quiz-title">${title}</h2>
        ${q.note ? `<p class="quiz__note">${esc(q.note)}</p>` : ""}
        <div class="quiz__fieldwrap">${field}</div>
        <p class="quiz__error" role="alert"></p>
      </div>
      <div class="quiz__nav">
        <button type="button" class="quiz__back" ${step === 0 ? "disabled" : ""}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>Voltar
        </button>
        ${isText || answers[q.id] ? `<button type="submit" class="quiz__next"><span>${step === TOTAL - 1 ? "Enviar aplicação" : "Continuar"}</span></button>` : ""}
      </div>
      ${isText ? `<p class="quiz__hint">pressione <b>Enter ↵</b>${q.type === "textarea" ? " · <b>Shift + Enter</b> quebra linha" : ""}</p>` : `<p class="quiz__hint">ou use as teclas <b>A</b>–<b>${keyFor(q.options.length - 1)}</b></p>`}`;

    // máscara do telefone
    form.querySelectorAll('input[type="tel"]').forEach(inp => {
      inp.value = maskPhone(inp.value);
      inp.addEventListener("input", () => (inp.value = maskPhone(inp.value)));
    });
    // foco no primeiro campo (desktop) ou no diálogo
    const first = form.querySelector("input, textarea");
    if (first && matchMedia("(pointer: fine)").matches) setTimeout(() => first.focus({ preventScroll: true }), 60);
    else dialog.focus({ preventScroll: true });
  }

  /* ================= Validação e avanço ================= */
  function collect() {
    const q = QUESTIONS[step];
    const err = form.querySelector(".quiz__error");
    const fail = (msg, el) => { err.textContent = msg; el && el.closest(".quiz__input")?.classList.add("is-invalid"); el?.focus(); shake(); return false; };
    form.querySelectorAll(".is-invalid").forEach(e => e.classList.remove("is-invalid"));

    if (q.type === "choice") {
      if (!answers[q.id]) return fail("Escolha uma das opções.");
      return true;
    }
    if (q.type === "fields") {
      for (const f of q.fields) {
        const el = form.elements[f.id];
        const ok = f.validate ? f.validate(el.value) : true;
        if (ok !== true) return fail(ok, el);
        answers[f.id] = el.value.trim();
      }
      return true;
    }
    const el = form.elements[q.id];
    const val = q.clean ? q.clean(el.value) : el.value.trim();
    const ok = q.validate ? q.validate(val) : true;
    if (ok !== true) return fail(ok, el);
    answers[q.id] = val;
    return true;
  }

  function shake() {
    if (window.gsap) gsap.fromTo(form.querySelector(".quiz__fieldwrap"), { x: -8 }, { x: 0, duration: 0.45, ease: "elastic.out(1, 0.35)" });
  }

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function transition(dir, render) {
    if (!window.gsap || reduce) { render(); return; }
    busy = true;
    const parts = () => form.querySelectorAll(".quiz__step > *, .quiz__nav, .quiz__hint");
    gsap.to(parts(), { opacity: 0, y: -16 * dir, duration: 0.2, stagger: 0.015, ease: "power2.in", onComplete: () => {
      render();
      busy = false; // a nova pergunta já pode ser respondida enquanto ainda entra
      gsap.fromTo(parts(), { opacity: 0, y: 22 * dir }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.04, ease: "power3.out" });
    } });
  }

  function go(delta) {
    if (busy) return;
    const target = step + delta;
    if (target < 0) return;
    if (target >= TOTAL) return submit();
    step = target; save();
    transition(delta > 0 ? 1 : -1, renderStep);
  }

  /* ================= Envio ================= */
  async function submit() {
    busy = true;
    const res = resultado(answers);
    const params = Object.fromEntries(new URLSearchParams(location.search));
    const payload = {
      ...answers,
      resultado: res,
      enviado_em: new Date().toISOString(),
      pagina: location.href.split("?")[0],
      utm: Object.fromEntries(Object.entries(params).filter(([k]) => k.startsWith("utm_"))),
    };
    const nextBtn = form.querySelector(".quiz__next");
    if (nextBtn) { nextBtn.disabled = true; nextBtn.querySelector("span").textContent = "Enviando…"; }

    if (QUIZ_ENDPOINT) {
      try {
        const r = await fetch(QUIZ_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), keepalive: true });
        if (!r.ok) throw new Error(r.status);
      } catch (e) {
        busy = false;
        form.querySelector(".quiz__error").textContent = "Não conseguimos enviar agora. Confira sua internet e tente de novo.";
        if (nextBtn) { nextBtn.disabled = false; nextBtn.querySelector("span").textContent = "Tentar de novo"; }
        return;
      }
    } else {
      console.info("[quiz] QUIZ_ENDPOINT vazio — respostas não foram enviadas:", payload);
    }
    window.dispatchEvent(new CustomEvent("quiz:enviado", { detail: payload })); // gancho p/ pixel/analytics
    try { sessionStorage.removeItem(STORE_KEY); } catch {}
    if (res === "aprovado" && THANKS_URL) {
      // aprovado → página de obrigado (vídeo + confirmar agendamento)
      bar.style.width = "100%";
      count.textContent = "Enviado";
      setTimeout(() => (location.href = THANKS_URL), 250);
      return;
    }
    busy = false;
    transition(1, () => renderFinal(res));
  }

  function renderFinal(res) {
    const f = FINAL[res] || FINAL.aprovado;
    bar.style.width = "100%";
    count.textContent = "Concluído";
    form.innerHTML = `
      <div class="quiz__step quiz__final">
        <span class="quiz__badge${res === "aprovado" ? "" : " is-muted"}">${f.icon}</span>
        <h2 class="quiz__title" id="quiz-title">${f.title}</h2>
        <p class="quiz__note">${f.text}</p>
      </div>
      <div class="quiz__nav quiz__nav--center"><button type="button" class="quiz__next" data-close><span>Voltar para a página</span></button></div>`;
    answers = {}; step = 0;
  }

  /* ================= Teclado no celular =================
     No iOS o teclado cobre a parte de baixo sem redimensionar a página, então o botão "Continuar"
     ficava escondido. Aqui o popup passa a ter exatamente a altura da área visível. */
  const vv = window.visualViewport;
  function syncViewport() {
    if (!vv) return;
    root.style.setProperty("--qh", Math.round(vv.height) + "px");
    root.style.setProperty("--qt", Math.round(vv.offsetTop) + "px");
  }
  if (vv) { vv.addEventListener("resize", syncViewport); vv.addEventListener("scroll", syncViewport); }
  root.addEventListener("focusin", e => {
    if (!/INPUT|TEXTAREA/.test(e.target.tagName)) return;
    setTimeout(() => { syncViewport(); e.target.scrollIntoView({ block: "center", behavior: "smooth" }); }, 320);
  });

  /* ================= Abrir / fechar ================= */
  function open() {
    if (isOpen) return;
    isOpen = true; lastFocus = document.activeElement;
    root.hidden = false;
    document.documentElement.classList.add("quiz-open");
    syncViewport();
    window.__lenis && window.__lenis.stop();
    renderStep();
    if (window.gsap && !reduce) {
      gsap.fromTo(root.querySelector(".quiz__backdrop"), { opacity: 0 }, { opacity: 1, duration: 0.35 });
      gsap.fromTo(dialog, { opacity: 0, y: 40, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: "power3.out" });
      gsap.fromTo(form.querySelectorAll(".quiz__step > *, .quiz__nav"), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.05, delay: 0.15, ease: "power3.out" });
    }
  }
  function close() {
    if (!isOpen) return;
    const done = () => {
      root.hidden = true; isOpen = false; busy = false;
      document.documentElement.classList.remove("quiz-open");
      window.__lenis && window.__lenis.start();
      lastFocus && lastFocus.focus && lastFocus.focus({ preventScroll: true });
    };
    if (window.gsap && !reduce) {
      gsap.to(dialog, { opacity: 0, y: 24, scale: 0.97, duration: 0.3, ease: "power2.in" });
      gsap.to(root.querySelector(".quiz__backdrop"), { opacity: 0, duration: 0.3, onComplete: done });
    } else done();
  }
  window.openQuiz = open;

  /* ================= Eventos ================= */
  document.querySelectorAll(".js-cta").forEach(a => a.addEventListener("click", e => { e.preventDefault(); open(); }));
  root.addEventListener("click", e => {
    if (e.target.closest("[data-close]")) return close();
    if (e.target.closest(".quiz__back")) return go(-1);
    const opt = e.target.closest(".quiz__opt");
    if (opt && !busy) {
      const q = QUESTIONS[step];
      answers[q.id] = opt.dataset.value; save();
      form.querySelectorAll(".quiz__opt").forEach(b => { const on = b === opt; b.classList.toggle("is-selected", on); b.setAttribute("aria-checked", on); });
      form.querySelector(".quiz__error").textContent = "";
      setTimeout(() => go(1), 320); // avança sozinho depois de escolher
    }
  });
  form.addEventListener("submit", e => { e.preventDefault(); if (!busy && collect()) { save(); go(1); } });
  root.addEventListener("keydown", e => {
    if (e.key === "Escape") return close();
    const q = QUESTIONS[step];
    if (!q || busy) return;
    if (e.key === "Enter" && e.target.tagName === "TEXTAREA" && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); }
    if (q.type === "choice" && !/INPUT|TEXTAREA/.test(e.target.tagName) && /^[a-z]$/i.test(e.key)) {
      const idx = e.key.toUpperCase().charCodeAt(0) - 65;
      const btn = form.querySelectorAll(".quiz__opt")[idx];
      if (btn) { e.preventDefault(); btn.click(); }
    }
    // mantém o foco dentro do popup
    if (e.key === "Tab") {
      const f = [...dialog.querySelectorAll("button:not([disabled]), input, textarea")];
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
})();
