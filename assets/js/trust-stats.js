// Uma passagem por destaque, um único RAF e nenhuma leitura de layout por quadro.
export function initTrustStats() {
  const elements = [...document.querySelectorAll("[data-trust]")];
  const preference = matchMedia("(prefers-reduced-motion: reduce)");
  if (!elements.length || preference.matches || !("IntersectionObserver" in window)) return;
  const pending = new Set(elements);
  const active = new Map();
  let frame = 0;
  let lastPaint = 0;

  function finish(element) {
    active.get(element)?.output.remove();
    active.delete(element);
    pending.delete(element);
    element.classList.remove("is-counting");
    observer.unobserve(element);
    if (!active.size) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
    if (!active.size && !pending.size) {
      observer.disconnect();
      preference.removeEventListener("change", onPreference);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", finishAll);
      window.removeEventListener("beforeprint", finishAll);
    }
  }

  function paint(now) {
    // No máximo 30 atualizações de texto por segundo, só enquanto estiver ativo.
    if (now - lastPaint >= 32) {
      lastPaint = now;
      active.forEach((state, element) => {
        const progress = Math.min(1, (now - state.start) / state.duration);
        if (progress >= 1) return finish(element);
        const text = element.dataset.trust === "year"
          ? `Desde ${2026 - Math.floor(progress * 8)}`
          : element.dataset.trust === "clients"
            ? `+${Math.floor(1000 * (1 - (1 - progress) ** 3))}`
            : state.final.slice(0, Math.floor(progress * (state.final.length + 1)));
        if (state.output.textContent !== text) state.output.textContent = text;
      });
    }
    frame = active.size ? requestAnimationFrame(paint) : 0;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting, intersectionRatio }) => {
      if (!isIntersecting) {
        if (active.has(target)) finish(target);
        return;
      }
      if (intersectionRatio < 0.7 || !pending.delete(target)) return;
      const final = target.querySelector(".trust-final").textContent;
      const output = document.createElement("span");
      output.className = "trust-value";
      output.setAttribute("aria-hidden", "true");
      output.textContent = target.dataset.trust === "year" ? "Desde 2026" : target.dataset.trust === "clients" ? "+0" : "";
      target.append(output);
      target.classList.add("is-counting");
      active.set(target, { output, final, start: performance.now(), duration: target.dataset.trust === "conversation" ? 1200 : 1500 });
      if (!frame) frame = requestAnimationFrame(paint);
    });
  }, { threshold: 0.7 });

  function finishAll() { elements.forEach(finish); }
  function onPreference() { if (preference.matches) finishAll(); }
  function onVisibility() { if (document.hidden) finishAll(); }
  preference.addEventListener("change", onPreference);
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", finishAll);
  window.addEventListener("beforeprint", finishAll);
  elements.forEach((element) => observer.observe(element));
}
