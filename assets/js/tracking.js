import config from "./config.mjs";

const instanceKey = Symbol.for("kapi.tracking.v1");

export function initTracking({ onContact } = {}) {
  if (window[instanceKey]) return window[instanceKey];
  const settings = config.tracking;
  let consent = readConsent();
  let noticeRequested = false;
  let noticeTrigger;
  let initialized = false;
  let pageViewSent = false;
  let scriptRequested = false;
  const handledClicks = new WeakSet();

  function readConsent() {
    try {
      const value = JSON.parse(localStorage.getItem(settings.consentKey));
      if (
        value?.version === settings.consentVersion &&
        typeof value.marketing === "boolean" &&
        Number.isFinite(value.updatedAt) &&
        value.updatedAt <= Date.now() &&
        Date.now() - value.updatedAt < settings.consentLifetimeMs
      ) return value;
    } catch { /* Armazenamento indisponível: publicidade desligada. */ }
    return null;
  }

  function granted() {
    return consent?.marketing === true &&
      Date.now() - consent.updatedAt < settings.consentLifetimeMs;
  }

  function callPixel(...args) {
    try { window.fbq?.(...args); } catch { /* O contato não depende da Meta. */ }
  }

  function ensurePixel() {
    // Prévias, localhost e outros domínios não alimentam o Pixel de produção.
    if (!granted() || location.hostname !== settings.productionHostname) return false;
    if (!window.fbq) {
      const queue = function () {
        if (queue.callMethod) queue.callMethod.apply(queue, arguments);
        else queue.queue.push(arguments);
      };
      queue.push = queue;
      queue.loaded = true;
      queue.version = "2.0";
      queue.queue = [];
      window.fbq = queue;
      if (!window._fbq) window._fbq = queue;
    }
    if (!initialized) {
      callPixel("consent", "grant");
      // Eventos explícitos, sem reconhecimento automático de cliques/formulários.
      callPixel("set", "autoConfig", false, settings.pixelId);
      callPixel("init", settings.pixelId);
      initialized = true;
    }
    if (!scriptRequested) {
      scriptRequested = true;
      const script = document.createElement("script");
      script.async = true;
      script.src = settings.scriptUrl;
      script.dataset.kapiPixel = settings.pixelId;
      document.head.append(script);
    }
    return true;
  }

  function pageView() {
    if (pageViewSent || !ensurePixel()) return;
    pageViewSent = true;
    callPixel("track", "PageView");
  }

  function revokePixel() {
    // Não enviar eventos enfileirados caso a pessoa revogue antes de o SDK carregar.
    if (window.fbq && !window.fbq.callMethod && Array.isArray(window.fbq.queue)) {
      window.fbq.queue.length = 0;
      initialized = false;
      pageViewSent = false;
    }
    if (window.fbq) callPixel("consent", "revoke");
    for (const name of ["_fbp", "_fbc"]) {
      for (const domain of new Set(["", location.hostname, `.${location.hostname}`])) {
        document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${domain ? `; Domain=${domain}` : ""}`;
      }
    }
  }

  function renderConsent() {
    const allowed = granted();
    const notice = document.querySelector("[data-consent-notice]");
    if (notice) notice.hidden = consent !== null && !noticeRequested;
    document.querySelectorAll("[data-consent-status]").forEach((element) => {
      element.textContent = allowed
        ? "Publicidade autorizada. Você pode revogar sua escolha a qualquer momento."
        : consent
          ? "Publicidade recusada. O site e o WhatsApp continuam funcionando normalmente."
          : "Publicidade desativada. O Meta Pixel só será carregado se você aceitar.";
    });
    document.querySelectorAll('[data-consent-controls] [data-consent-action="grant"]').forEach((button) => { button.hidden = allowed; });
    document.querySelectorAll('[data-consent-controls] [data-consent-action="deny"]').forEach((button) => { button.hidden = allowed; });
    document.querySelectorAll('[data-consent-action="revoke"]').forEach((button) => { button.hidden = !allowed; });
  }

  function chooseConsent(marketing) {
    noticeRequested = false;
    consent = { version: settings.consentVersion, marketing, updatedAt: Date.now() };
    try { localStorage.setItem(settings.consentKey, JSON.stringify(consent)); }
    catch { /* A escolha vale nesta página, sem impedir a navegação. */ }
    if (marketing) {
      if (initialized) callPixel("consent", "grant");
      pageView();
    }
    else revokePixel();
    renderConsent();
  }

  if (!document.querySelector(".privacy-page")) {
    const notice = document.createElement("aside");
    notice.className = "consent-card";
    notice.classList.toggle("consent-card--above-quote", Boolean(document.querySelector(".mobile-cta")));
    notice.dataset.consentNotice = "";
    notice.setAttribute("aria-label", "Preferências de privacidade");
    notice.hidden = true;
    notice.innerHTML = `
      <a class="consent-title" href="/privacidade.html" data-privacy>Sua privacidade</a>
      <p>Podemos usar cookies da Meta para medir visitas, cliques no WhatsApp e nossos anúncios?</p>
      <div class="consent-choices">
        <button type="button" data-consent-action="deny">Não permitir</button>
        <button type="button" data-consent-action="grant">Permitir</button>
      </div>`;
    document.body.append(notice);
  }
  document.querySelectorAll("[data-consent-controls]").forEach((element) => {
    element.innerHTML = `
      <p data-consent-status role="status" aria-live="polite"></p>
      <div class="consent-actions">
        <button class="button" type="button" data-consent-action="deny">Recusar publicidade</button>
        <button class="button" type="button" data-consent-action="grant">Aceitar publicidade</button>
        <button class="button" type="button" data-consent-action="revoke" hidden>Revogar consentimento</button>
      </div>`;
  });
  document.querySelectorAll("[data-open-consent]").forEach((link) => {
    link.addEventListener("click", (event) => {
      const notice = document.querySelector("[data-consent-notice]");
      if (!notice || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      noticeRequested = true;
      noticeTrigger = link;
      renderConsent();
      notice.querySelector(".consent-title").focus({ preventScroll: true });
    });
  });
  document.addEventListener("click", (event) => {
    const button = event.target.closest?.("[data-consent-action]");
    if (!button || !event.isTrusted) return;
    chooseConsent(button.dataset.consentAction === "grant");
    if (button.closest("[data-consent-notice]")) {
      noticeTrigger?.focus({ preventScroll: true });
      noticeTrigger = null;
    }
  });

  function whatsappLink(element) {
    if (!element?.matches("a[href]")) return false;
    try {
      const url = new URL(element.href);
      return url.protocol === "https:" && ["wa.me", "api.whatsapp.com", "web.whatsapp.com"].includes(url.hostname);
    } catch { return false; }
  }

  document.querySelectorAll("a[href]").forEach((link) => {
    if (whatsappLink(link)) link.href = config.whatsappUrl;
  });

  function buttonLocation(link) {
    const configured = settings.buttonLocations[link.dataset.whatsapp];
    if (configured) return configured;
    for (const [selector, name] of [
      [".site-header", "header"], [".hero", "hero"],
      ["#seu-site", "services"], ["#investimento", "pricing"],
      [".site-footer", "footer"], [".mobile-cta", "floating_button"],
    ]) if (link.closest(selector)) return name;
    return "other";
  }

  function contact(event) {
    if (!event.isTrusted || event.defaultPrevented || handledClicks.has(event)) return;
    if ((event.type === "click" && event.button !== 0) ||
        (event.type === "auxclick" && event.button !== 1)) return;
    const link = event.target.closest?.("a[href]");
    if (!whatsappLink(link)) return;
    handledClicks.add(event);
    link.href = config.whatsappUrl;
    const location = buttonLocation(link);
    try { onContact?.(link, location); } catch { /* Analytics não interrompe o link. */ }
    if (!ensurePixel()) return;
    callPixel("track", "Contact", {
      content_name: "WhatsApp Kapi Digital",
      contact_method: "whatsapp",
      button_location: location,
    });
    // Sem preventDefault, window.open ou espera de rede: navegação nativa intacta.
  }
  document.addEventListener("click", contact, true);
  document.addEventListener("auxclick", contact, true);

  window.addEventListener("storage", (event) => {
    if (event.key !== settings.consentKey && event.key !== null) return;
    consent = readConsent();
    if (granted()) {
      if (initialized) callPixel("consent", "grant");
      pageView();
    }
    else revokePixel();
    renderConsent();
  });
  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    consent = readConsent();
    pageViewSent = false;
    if (granted()) {
      if (initialized) callPixel("consent", "grant");
      pageView();
    }
    else revokePixel();
    renderConsent();
  });
  renderConsent();
  if (granted()) pageView();
  const instance = Object.freeze({ getConsent: () => granted() });
  window[instanceKey] = instance;
  return instance;
}
