import { enter } from "./motion.js";
import config from "./config.mjs";
import { initTracking } from "./tracking.js";

const attribution = {};
const params = new URLSearchParams(location.search);
for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content"]) {
  if (params.get(key)) attribution[key] = params.get(key).slice(0, 120);
}
window.dataLayer = window.dataLayer || [];
function record(event, fields = {}) {
  // Eventos locais; o clique não comprova conversa ou venda.
  if (typeof window.dataLayer.push === "function") {
    window.dataLayer.push({
      event,
      page_version: config.pageVersion,
      ...attribution,
      ...fields,
    });
  }
}
window.KAPI_EVENTS = { record };

initTracking({
  onContact: (link) => record("kapi_whatsapp_click", { cta_position: link.dataset.whatsapp }),
});
document.querySelectorAll("[data-preview]").forEach((link) => {
  const project = config.projects[link.dataset.preview];
  if (project) link.href = project.url;
  link.addEventListener("click", () =>
    record("kapi_portfolio_open", { project_name: link.dataset.preview }),
  );
});
document.querySelectorAll("[data-year]").forEach((element) => {
  element.textContent = String(new Date().getFullYear());
});

const privacy = document.getElementById("privacy-dialog");
let privacyTrigger;
if (privacy && typeof privacy.showModal === "function") {
  document.querySelectorAll("[data-privacy]").forEach((link) =>
    link.addEventListener("click", (event) => {
      if (
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey ||
        event.button > 0
      )
        return;
      event.preventDefault();
      privacyTrigger = link;
      privacy.showModal();
      document.body.classList.add("dialog-is-open");
      enter([privacy], { distance: 8, duration: 200 });
    }),
  );
  privacy
    .querySelector("[data-close-dialog]")
    .addEventListener("click", () => privacy.close());
  privacy.addEventListener("close", () => {
    document.body.classList.remove("dialog-is-open");
    const next = privacyTrigger?.getClientRects().length
      ? privacyTrigger
      : document.querySelector('.hero-cta');
    next?.focus({ preventScroll: true });
  });
  privacy.addEventListener("click", (event) => {
    if (event.target !== privacy) return;
    const rect = privacy.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      privacy.close();
  });
}

const toggle = document.querySelector(".menu-toggle");
const menu = document.getElementById("mobile-menu");
function closeMenu(restoreFocus = false) {
  if (!menu || !toggle) return;
  menu.hidden = true;
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-label", "Abrir menu");
  if (restoreFocus) toggle.focus({ preventScroll: true });
}
if (toggle && menu) {
  toggle.hidden = false;
  toggle.addEventListener("click", () => {
    if (!menu.hidden) return closeMenu();
    menu.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Fechar menu");
    enter([menu], { distance: -6, duration: 180 });
  });
  menu.addEventListener("click", (event) => {
    if (event.target.closest("a")) closeMenu();
  });
  document.addEventListener("click", (event) => {
    if (!menu.hidden && !event.target.closest(".site-header")) closeMenu();
  });
  document.addEventListener("focusin", (event) => {
    if (!menu.hidden && !event.target.closest(".site-header")) closeMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !menu.hidden) closeMenu(true);
  });
  matchMedia("(min-width: 768px)").addEventListener("change", (event) => {
    if (event.matches) closeMenu();
  });
}

// O navegador observa os primeiros 32 px; não há leitura/escrita de layout em cada scroll.
const quote = document.querySelector(".mobile-cta");
const header = document.querySelector(".site-header");
const headerQuote = document.querySelector(".header-quote");
const sentinel = document.querySelector("[data-top-sentinel]");
if (quote && sentinel && "IntersectionObserver" in window) {
  new IntersectionObserver(([entry]) => {
    const scrolled = !entry.isIntersecting;
    quote.classList.toggle("is-scrolled", scrolled);
    header?.classList.toggle("is-scrolled", scrolled);
    if (headerQuote) {
      headerQuote.hidden = !scrolled;
      if (scrolled) enter([headerQuote], { distance: -4, duration: 180 });
    }
  }).observe(sentinel);
}

document.querySelectorAll("[data-faq]").forEach((details) =>
  details.addEventListener("toggle", () => {
    if (details.open)
      record("kapi_faq_open", { question_id: details.dataset.faq });
  }),
);
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          record("kapi_section_view", {
            section_name: entry.target.dataset.section,
          });
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 },
  );
  document
    .querySelectorAll("[data-section]")
    .forEach((section) => observer.observe(section));
}
record("kapi_page_view");
