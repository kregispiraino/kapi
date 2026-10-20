const { test, expect } = require("@playwright/test");
const ORIGIN = "https://kapi.digital";
const KEY = "kapi-marketing-consent-v1";
const PIXEL = "3531138630396964";
const WHATSAPP = "https://wa.me/5511982252058?text=Ol%C3%A1%21%20Falo%20com%20a%20Kapi%20Digital%3F%20Gostaria%20de%20solicitar%20um%20or%C3%A7amento.";
const MESSAGE = "Olá! Falo com a Kapi Digital? Gostaria de solicitar um orçamento.";

async function setup(context, baseURL, { marketing, blocked = false } = {}) {
  let requests = 0;
  // Serve o build local no domínio de produção, sem enviar eventos à Meta.
  await context.route(`${ORIGIN}/**`, async route => {
    const url = new URL(route.request().url());
    const response = await route.fetch({ url: `${baseURL}${url.pathname}${url.search}` });
    await route.fulfill({ response });
  });
  await context.route("https://connect.facebook.net/**", async route => {
    requests++;
    if (blocked) return route.abort("blockedbyclient");
    await route.fulfill({ contentType: "application/javascript", body: `
      window.__metaCalls = [];
      fbq.callMethod = function() { window.__metaCalls.push(Array.from(arguments)); };
      fbq.queue.splice(0).forEach(args => fbq.callMethod.apply(fbq, args));
    ` });
  });
  await context.route(/https:\/\/([^/]+\.)?facebook\.com\//, route => route.abort());
  await context.route("https://wa.me/**", route => route.fulfill({ contentType: "text/html", body: "WhatsApp test" }));
  if (typeof marketing === "boolean") {
    await context.addInitScript(({ key, marketing }) => localStorage.setItem(key, JSON.stringify({ version: 1, marketing, updatedAt: Date.now() })), { key: KEY, marketing });
  }
  return { requests: () => requests };
}
async function events(page, name) {
  return page.evaluate(name => (window.__metaCalls || []).filter(args => args[0] === "track" && args[1] === name), name);
}
async function open(page, path = "/") {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${ORIGIN}${path}`);
  await expect(page.locator("html")).not.toHaveClass(/entry-active/);
}
async function grant(page) {
  await page.locator('[data-consent-notice] [data-consent-action="grant"]').click();
  await expect.poll(() => events(page, "PageView")).toHaveLength(1);
}
async function contact(page, locator) {
  const popupPromise = page.waitForEvent("popup");
  await locator.click();
  const popup = await popupPromise;
  await popup.waitForLoadState("domcontentloaded");
  expect(new URL(popup.url()).pathname).toBe("/5511982252058");
  expect(new URL(popup.url()).searchParams.get("text")).toBe(MESSAGE);
  await popup.close();
}

test("primeira visita mostra card independente, preserva orçamento e recusa não carrega Meta", async ({ page, context, baseURL }) => {
  const sdk = await setup(context, baseURL);
  await open(page);
  const slot = page.locator(".hero-offer");
  await expect(page.locator("[data-consent-notice]")).toBeVisible();
  await expect(slot.locator(".hero-price")).toBeVisible();
  const card = await page.locator("[data-consent-notice]").boundingBox();
  // O layout reserva 15 px para a barra de rolagem no desktop.
  const viewportWidth = await page.evaluate(() => document.body.getBoundingClientRect().width);
  expect(card.width).toBeLessThanOrEqual(320);
  expect(Math.abs(card.x + card.width / 2 - viewportWidth / 2)).toBeLessThan(1);
  expect(sdk.requests()).toBe(0);
  await page.locator('[data-consent-notice] [data-consent-action="deny"]').click();
  await expect(page.locator("[data-consent-notice]")).toBeHidden();
  await expect(slot.locator(".hero-price")).toBeVisible();
  await contact(page, slot.locator("[data-whatsapp]"));
  await page.reload();
  await expect(slot.locator(".hero-price")).toBeVisible();
  expect(sdk.requests()).toBe(0);
  expect(await events(page, "Contact")).toEqual([]);
});

test("aceite registra PageView uma vez, sem conversão por hover, hash, modal ou clique sintético", async ({ page, context, baseURL }) => {
  const sdk = await setup(context, baseURL);
  await open(page);
  await grant(page);
  await expect(page.locator(".hero-price")).toBeVisible();
  await page.locator('[data-whatsapp="abertura"]').hover();
  await page.evaluate(() => {
    location.hash = "inicio";
    const link = document.querySelector('[data-whatsapp="abertura"]');
    link.addEventListener("click", event => event.preventDefault(), { once: true });
    link.click();
  });
  await page.locator('.footer-bottom').scrollIntoViewIfNeeded();
  await page.locator('footer [data-privacy]').click();
  await expect(page.locator("#privacy-dialog")).toBeVisible();
  await page.locator("[data-close-dialog]").click();
  await page.addScriptTag({ url: "/assets/build/tracking.js?v=9" });
  expect(await events(page, "PageView")).toHaveLength(1);
  expect(await events(page, "Contact")).toHaveLength(0);
  expect(sdk.requests()).toBe(1);
  const calls = await page.evaluate(() => window.__metaCalls);
  expect(calls).toContainEqual(["init", PIXEL]);
  expect(calls).toContainEqual(["set", "autoConfig", false, PIXEL]);
});

test("todos os CTAs desktop têm URL padronizada e exatamente um Contact por clique", async ({ page, context, baseURL }) => {
  await setup(context, baseURL, { marketing: true });
  await open(page);
  const locations = { cabecalho: "header", abertura: "hero", "apos-portfolio": "portfolio", investimento: "pricing", duvidas: "faq", fechamento: "closing", rodape: "footer" };
  const hrefs = await page.locator("[data-whatsapp]").evaluateAll(links => links.map(a => a.href));
  expect(hrefs).toHaveLength(10);
  expect(hrefs.every(href => href === WHATSAPP)).toBe(true);
  let count = 0;
  for (const [cta, location] of Object.entries(locations)) {
    await contact(page, page.locator(`[data-whatsapp="${cta}"]`));
    const calls = await events(page, "Contact");
    expect(calls).toHaveLength(++count);
    expect(calls.at(-1)).toEqual(["track", "Contact", { content_name: "WhatsApp Kapi Digital", contact_method: "whatsapp", button_location: location }]);
  }
});

for (const width of [320, 390]) {
  test(`mobile ${width}: card acima da barra, orçamento preservado e CTAs do menu`, async ({ page, context, baseURL }) => {
    await page.setViewportSize({ width, height: 844 });
    const sdk = await setup(context, baseURL);
    await open(page);
    const bar = page.locator(".mobile-cta");
    const notice = page.locator("[data-consent-notice]");
    await expect(notice).toBeVisible();
    await expect(bar.locator("[data-whatsapp]")).toBeVisible();
    const cardBox = await notice.boundingBox();
    const barBox = await bar.boundingBox();
    expect(cardBox.y + cardBox.height).toBeLessThan(barBox.y);
    expect(Math.abs(cardBox.x + cardBox.width / 2 - width / 2)).toBeLessThan(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const logoBefore = await page.locator(".nav-pill .wordmark").boundingBox();
    await page.evaluate(() => scrollTo(0, 400));
    await expect(bar).toBeHidden();
    await notice.locator('[data-consent-action="grant"]').click();
    await expect(notice).toBeHidden();
    await expect.poll(() => events(page, "PageView")).toHaveLength(1);
    await contact(page, page.locator('[data-whatsapp="orcamento-menu-mobile"]'));
    await page.evaluate(() => scrollTo(0, 0));
    await expect(bar.locator("[data-whatsapp]")).toBeVisible();
    await contact(page, bar.locator("[data-whatsapp]"));
    await page.locator(".menu-toggle").click();
    await contact(page, page.locator('[data-whatsapp="menu-mobile"]'));
    const calls = await events(page, "Contact");
    expect(calls.map(call => call[2].button_location)).toEqual(["header", "floating_button", "header"]);
    const logoAfter = await page.locator(".nav-pill .wordmark").boundingBox();
    expect(logoAfter.width).toBeCloseTo(logoBefore.width, 1);
    expect(sdk.requests()).toBe(1);
  });
}

test("PageView em cada documento, incluindo demonstrações, e Contact da AML", async ({ page, context, baseURL }) => {
  const sdk = await setup(context, baseURL, { marketing: true });
  for (const path of ["/", "/privacidade.html", "/projetos/osler/website/index.html", "/projetos/gear-seo/website/index.html", "/projetos/aml/website/index.html"]) {
    await open(page, path);
    await expect.poll(() => events(page, "PageView")).toHaveLength(1);
  }
  expect(sdk.requests()).toBe(5);
  await contact(page, page.locator('[data-whatsapp="portfolio-aml"]'));
  expect((await events(page, "Contact"))[0][2].button_location).toBe("portfolio_demo");
});

test("revogar interrompe eventos, remove cookies e novo aceite reativa sem PageView duplicado", async ({ page, context, baseURL }) => {
  await setup(context, baseURL);
  await open(page);
  await grant(page);
  await page.evaluate(() => { document.cookie = "_fbp=test; Path=/"; document.cookie = "_fbc=test; Path=/"; });
  await page.locator("footer [data-privacy]").click();
  await page.locator('#privacy-dialog [data-consent-action="revoke"]').click();
  expect((await context.cookies()).filter(c => ["_fbp", "_fbc"].includes(c.name))).toHaveLength(0);
  await page.locator("[data-close-dialog]").click();
  await contact(page, page.locator('[data-whatsapp="rodape"]'));
  expect(await events(page, "Contact")).toHaveLength(0);
  await page.locator("footer [data-privacy]").click();
  await page.locator('#privacy-dialog [data-consent-action="grant"]').click();
  await page.locator("[data-close-dialog]").click();
  await contact(page, page.locator('[data-whatsapp="rodape"]'));
  expect(await events(page, "Contact")).toHaveLength(1);
  expect(await events(page, "PageView")).toHaveLength(1);
  const changes = await page.evaluate(() => window.__metaCalls.filter(c => c[0] === "consent").map(c => c[1]));
  expect(changes).toEqual(["grant", "revoke", "grant"]);
});

test("Pixel bloqueado ou com erro não impede WhatsApp; revogar limpa eventos pendentes", async ({ page, context, baseURL }) => {
  await setup(context, baseURL, { blocked: true });
  await open(page);
  await page.locator('[data-consent-notice] [data-consent-action="grant"]').click();
  await contact(page, page.locator('[data-whatsapp="abertura"]'));
  expect(await page.evaluate(() => fbq.queue.filter(c => c[0] === "track").length)).toBe(2);
  await page.locator("footer [data-privacy]").click();
  await page.locator('#privacy-dialog [data-consent-action="revoke"]').click();
  expect(await page.evaluate(() => fbq.queue.filter(c => c[0] === "track").length)).toBe(0);
  await page.locator('#privacy-dialog [data-consent-action="grant"]').click();
  await page.locator("[data-close-dialog]").click();
  await page.evaluate(() => { fbq.callMethod = () => { throw new Error("SDK indisponível"); }; });
  await contact(page, page.locator('[data-whatsapp="rodape"]'));
});

test("consentimento expirado e storage indisponível começam sem Pixel", async ({ page, context, baseURL }) => {
  const sdk = await setup(context, baseURL);
  await context.addInitScript(key => {
    localStorage.setItem(key, JSON.stringify({ version: 1, marketing: true, updatedAt: Date.now() - 181 * 86400000 }));
    Storage.prototype.setItem = () => { throw new Error("Storage bloqueado"); };
  }, KEY);
  await open(page);
  await expect(page.locator('[data-consent-notice]')).toBeVisible();
  expect(sdk.requests()).toBe(0);
  await grant(page);
  await contact(page, page.locator('[data-whatsapp="abertura"]'));
  expect(await events(page, "Contact")).toHaveLength(1);
});

test("teclado registra uma conversão e duplicar bundle não duplica listeners", async ({ page, context, baseURL }) => {
  await setup(context, baseURL, { marketing: true });
  await open(page);
  await page.addScriptTag({ url: "/assets/build/tracking.js" });
  await page.locator('[data-whatsapp="abertura"]').focus();
  const popupPromise = page.waitForEvent("popup");
  await page.keyboard.press("Enter");
  await (await popupPromise).close();
  expect(await events(page, "Contact")).toHaveLength(1);
  expect(await events(page, "PageView")).toHaveLength(1);
});

test("alteração de consentimento em outra aba é respeitada", async ({ page, context, baseURL }) => {
  await setup(context, baseURL);
  await open(page);
  await grant(page);
  const other = await context.newPage();
  await open(other, "/privacidade.html");
  await other.locator('[data-consent-action="revoke"]').click();
  await expect.poll(() => page.evaluate(() => window.__metaCalls.at(-1))).toEqual(["consent", "revoke"]);
  await contact(page, page.locator('[data-whatsapp="abertura"]'));
  expect(await events(page, "Contact")).toHaveLength(0);
});

test("sem JavaScript, todos os links estáticos mantêm a URL comercial", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  for (const path of ["/", "/projetos/aml/website/index.html"]) {
    await page.goto(baseURL + path);
    const links = page.locator('a[href*="wa.me/"]');
    expect(await links.count()).toBeGreaterThan(0);
    for (const link of await links.all()) await expect(link).toHaveAttribute("href", WHATSAPP);
  }
  await context.close();
});

for (const width of [390, 1440]) {
  test(`rodapé reabre card após permitir ou recusar em ${width}px`, async ({ page, context, baseURL }) => {
    await page.setViewportSize({ width, height: 900 });
    await setup(context, baseURL, { marketing: true });
    await open(page);
    const link = page.locator('.footer-bottom [data-open-consent]');
    const card = page.locator('[data-consent-notice]');
    await expect(link).toHaveText('Privacidade');
    await expect(card).toBeHidden();
    await expect.poll(() => events(page, 'PageView')).toHaveLength(1);
    await link.click();
    await expect(card).toBeVisible();
    await expect(card.locator('[data-consent-action="grant"]')).toBeVisible();
    await expect(card.locator('[data-consent-action="deny"]')).toBeVisible();
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).marketing, KEY)).toBe(true);
    expect(await events(page, 'PageView')).toHaveLength(1);
    expect(await events(page, 'Contact')).toHaveLength(0);
    await card.locator('[data-consent-action="deny"]').click();
    await expect(card).toBeHidden();
    await expect(link).toBeFocused();
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).marketing, KEY)).toBe(false);
    await link.click();
    await expect(card).toBeVisible();
    await card.locator('[data-consent-action="grant"]').click();
    await expect(card).toBeHidden();
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).marketing, KEY)).toBe(true);
    expect(await events(page, 'PageView')).toHaveLength(1);
  });
}
