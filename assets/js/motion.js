// Entradas preparadas antes da exibição; somente opacity e transform por quadro.
const preference = matchMedia("(prefers-reduced-motion: reduce)");
const active = new Map();

export function enter(
  elements,
  {
    distance = 8,
    axis = "y",
    fade = false,
    delay = 0,
    stagger = 0,
    duration = 360,
  } = {},
) {
  elements.filter(Boolean).forEach((element, index) => {
    if (preference.matches || document.hidden) {
      element.classList.remove("reveal-pending");
      return;
    }
    // Não reinicia uma entrada em andamento (evita saltos em eventos próximos).
    if (active.has(element)) return;
    const animation = element.animate(
      [
        { transform: `translate${axis.toUpperCase()}(${distance}px)`, ...(fade ? { opacity: 0 } : {}) },
        { transform: "none", ...(fade ? { opacity: 1 } : {}) },
      ],
      {
        duration,
        delay: delay + Math.min(index * stagger, 140),
        easing: "cubic-bezier(.22,1,.36,1)",
        fill: "backwards",
      },
    );
    element.classList.remove("reveal-pending");
    active.set(element, animation);
    animation.finished
      .catch(() => {})
      .finally(() => {
        if (active.get(element) === animation) active.delete(element);
        animation.cancel();
      });
  });
}

function finishAll() {
  active.forEach((animation) => animation.cancel());
  active.clear();
}
preference.addEventListener("change", () => {
  if (preference.matches) finishAll();
});
window.addEventListener("pagehide", finishAll);
window.addEventListener("beforeprint", finishAll);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) finishAll();
});
// Um controle nunca permanece em movimento enquanto recebe foco ou um toque.
for (const event of ["focusin", "pointerdown"]) {
  document.addEventListener(
    event,
    (e) => {
      active.forEach((animation, element) => {
        if (element.contains(e.target)) animation.cancel();
      });
    },
    { passive: true },
  );
}

export function initScrollMotion() {
  if (preference.matches || !("IntersectionObserver" in window)) return;
  const elements = [
    ...document.querySelectorAll(
      ".section-heading, .project, .benefits-grid article, .investment-copy, .investment-offer, .process-grid li, .faq-intro, .faq-list, .closing h2, .closing-action, .privacy-page h1",
    ),
  ];
  const pending = new Set();
  const observer = new IntersectionObserver(
    (entries) => {
      const incoming = [];
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        if (pending.delete(entry.target)) incoming.push(entry.target);
      });
      enter(incoming, { distance: 24, fade: true, duration: 640, stagger: 60 });
    },
    { threshold: 0, rootMargin: "0px 0px -24px 0px" },
  );
  // Mede antes de escrever: conteúdo já visível nunca é apagado para animar.
  const belowViewport = elements.filter(
    (element) => element.getBoundingClientRect().top >= innerHeight,
  );
  belowViewport.forEach((element) => {
    pending.add(element);
    element.classList.add("reveal-pending");
    observer.observe(element);
  });
  function releasePending() {
    observer.disconnect();
    pending.forEach((element) => element.classList.remove("reveal-pending"));
    pending.clear();
  }
  preference.addEventListener("change", () => {
    if (preference.matches) releasePending();
  });
  window.addEventListener("pagehide", releasePending);
  window.addEventListener("beforeprint", releasePending);
  document.addEventListener("focusin", (event) => {
    pending.forEach((element) => {
      if (!element.contains(event.target)) return;
      observer.unobserve(element);
      pending.delete(element);
      element.classList.remove("reveal-pending");
    });
  });
}
