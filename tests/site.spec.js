const { test, expect } = require("@playwright/test");

for (const width of [320, 360, 390, 600, 767, 768, 1024, 1440]) {
  test(`layout e demonstração em ${width}px`, async ({ page }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    await expect(page.locator(".web-workspace")).toHaveAttribute(
      "data-ready",
      "true",
    );
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator(".project")).toHaveCount(4);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const start = await page.locator(".hero-showcase").boundingBox();
    for (const device of ["mobile", "desktop"]) {
      await page.locator(`[data-device-button="${device}"]`).click();
      await expect(page.locator(".web-workspace")).toHaveAttribute(
        "data-device",
        device,
      );
      const end = await page.locator(".hero-showcase").boundingBox();
      expect(Math.abs(end.height - start.height)).toBeLessThan(1);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    for (let i = 0; i < 4; i++) await page.locator("[data-web-next]").click();
    await expect(
      page.locator('[data-web-slide][data-active="true"]'),
    ).toHaveCount(1);
    const failures = await page.evaluate(() =>
      [...document.querySelectorAll(".web-photo")]
        .filter((image) => !image.complete || !image.naturalWidth)
        .map((image) => image.currentSrc),
    );
    expect(failures).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test("busca com #inicio, digitação, saída e recarregamento", async ({
  page,
}) => {
  await page.goto("/index.html#inicio", { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-entry-search]")).toBeVisible();
  await expect(page.locator("[data-entry-domain]")).toHaveText("kapi.digital");
  await expect(page.locator("[data-entry-search]")).toBeHidden();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-entry-search]")).toBeVisible();
  await page.locator("[data-entry-skip]").click();
  await expect(page.locator("[data-entry-search]")).toBeHidden();
});

test("abertura curta preserva a busca e o subtítulo suave", async ({ page }) => {
  await page.addInitScript(() => {
    window.addEventListener("kapi:entry-complete", () => {
      window.entryDuration = performance.now() - window.entryStart;
    });
    new MutationObserver(() => {
      if (!window.entryStart && document.querySelector('[data-entry-search][data-phase="typing"]')) {
        window.entryStart = performance.now();
      }
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ["data-phase"] });
  });
  await page.goto("/");
  await expect(page.locator("[data-entry-domain]")).toHaveText("kapi.digital");
  await expect(page.locator("[data-entry-search]")).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.entryDuration)).toBeLessThan(1500);
  await expect(page.locator(".hero-title-secondary")).toHaveCSS("opacity", "0.68");
});

for (const width of [390, 1440]) {
  test(`entradas ao rolar não piscam nem se repetem em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    await page.locator("[data-entry-skip]").click();
    const result = await page.evaluate(async () => {
      const elements = [...document.querySelectorAll(".section-heading, .project, .benefits-grid article, .investment-copy, .investment-offer, .process-grid li, .faq-intro, .faq-list, .closing h2, .closing-action")];
      const motions = new Map(elements.map(element => [element, new Set()]));
      const previousOpacity = new Map(elements.map(element => [element, Number(getComputedStyle(element).opacity)]));
      const flashes = new Set();
      const end = document.documentElement.scrollHeight - innerHeight;
      for (let frame = 0; frame < 200; frame++) {
        const progress = frame < 100 ? frame / 99 : (199 - frame) / 99;
        scrollTo({ top: end * progress, behavior: "instant" });
        await new Promise(requestAnimationFrame);
        for (const element of elements) {
          const opacity = Number(getComputedStyle(element).opacity);
          if (opacity + 0.001 < previousOpacity.get(element)) flashes.add(element.className);
          previousOpacity.set(element, opacity);
          for (const animation of element.getAnimations()) motions.get(element).add(animation);
        }
      }
      return { flashes: [...flashes], counts: [...motions.values()].map(set => set.size) };
    });
    expect(result.flashes).toEqual([]);
    expect(result.counts.some(count => count === 1)).toBe(true);
    expect(Math.max(...result.counts)).toBe(1);
    await expect(page.locator(".reveal-pending")).toHaveCount(0);
  });

  test(`entrada direcional de menu, título, oferta e ilustração em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    const selectors = [".nav-pill", ".hero h1", ".hero-offer", ".hero-showcase .web-scene"];
    for (const selector of selectors) {
      await expect(page.locator(selector)).toHaveCSS("opacity", "0");
    }
    await page.locator("[data-entry-skip]").click();
    const motion = await page.evaluate((selectors) => selectors.map(selector => {
      const element = document.querySelector(selector);
      const animation = element.getAnimations()[0];
      return { frames: animation.effect.getKeyframes(), timing: animation.effect.getTiming() };
    }), selectors);
    expect(motion.map(item => item.frames[0].transform)).toEqual([
      "translateY(-24px)", "translateX(-40px)", "translateX(40px)", "translateY(40px)",
    ]);
    expect(motion.map(item => item.timing.delay)).toEqual([100, 160, 220, 280]);
    for (const selector of selectors) {
      await expect(page.locator(selector)).toHaveCSS("opacity", "1");
      await expect(page.locator(selector)).toHaveCSS("transform", "none");
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test("mobile: menu, WhatsApp, orçamento ao rolar e retorno ao topo", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".nav-cta")).toBeHidden();
  await page.locator(".menu-toggle").click();
  await expect(page.locator(".mobile-menu-contact")).toBeVisible();
  await expect(page.locator(".mobile-menu-contact")).toHaveAttribute(
    "href",
    "https://wa.me/message/3DBMZ5ZZHD4NC1",
  );
  await page.keyboard.press("Escape");
  await expect(page.locator("#mobile-menu")).toBeHidden();
  await expect(page.locator(".menu-toggle")).toBeFocused();
  await expect(page.locator(".mobile-cta")).toBeVisible();
  await expect(page.locator(".header-quote")).toBeHidden();
  await page.evaluate(() => scrollTo({ top: 900, behavior: "instant" }));
  await expect(page.locator(".mobile-cta")).toBeHidden();
  expect(
    await page
      .locator(".site-header")
      .evaluate((element) => element.getBoundingClientRect().top),
  ).toBe(12);
  await expect(page.locator(".header-quote")).toBeVisible();
  await expect(page.locator(".header-quote-button")).toHaveAttribute(
    "href", "https://wa.me/message/3DBMZ5ZZHD4NC1",
  );
  await page.locator(".menu-toggle").click();
  await expect(page.locator(".mobile-menu-contact")).toBeInViewport();
  await page.keyboard.press("Escape");
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await expect(page.locator(".mobile-cta")).toBeVisible();
  await expect(page.locator(".header-quote")).toBeHidden();
});

for (const width of [320, 360, 390, 600, 767]) {
  test(`orçamento no cabeçalho sem sobreposição em ${width}px`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const initial = await page.locator(".nav-pill").boundingBox();
    const initialLogo = await page.locator(".nav-pill .wordmark").boundingBox();
    await page.evaluate(() => scrollTo({ top: 900, behavior: "instant" }));
    await expect(page.locator(".header-quote")).toBeVisible();
    await expect(page.locator(".mobile-cta")).toBeHidden();
    const pill = await page.locator(".nav-pill").boundingBox();
    expect(pill.height).toBe(initial.height);
    expect(pill.height).toBe(58);
    const boxes = await Promise.all(
      [".nav-pill .wordmark", ".header-quote-price", ".header-quote-button", ".menu-toggle"]
        .map((selector) => page.locator(selector).boundingBox()),
    );
    expect(boxes[0].width).toBe(initialLogo.width);
    expect(boxes[0].height).toBe(initialLogo.height);
    expect(boxes[0].x).toBe(initialLogo.x);
    for (let i = 0; i < boxes.length; i++) {
      expect(boxes[i].x).toBeGreaterThanOrEqual(pill.x);
      expect(boxes[i].x + boxes[i].width).toBeLessThanOrEqual(pill.x + pill.width);
      if (i) expect(boxes[i].x).toBeGreaterThanOrEqual(boxes[i - 1].x + boxes[i - 1].width);
    }
    await expect(page.locator(".header-quote-price")).toHaveText("A partir deR$ 297");
    await page.setViewportSize({ width: 1024, height: 844 });
    await expect(page.locator(".header-quote")).toBeHidden();
    await expect(page.locator(".nav-cta")).toBeVisible();
  });
}

test("FAQ e privacidade com restauração de foco", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const faq = page.locator("[data-faq]").first();
  await faq.locator("summary").click();
  await expect(faq).toHaveAttribute("open", "");
  await expect(faq.locator("p")).toBeVisible();
  const link = page.locator("[data-privacy]").first();
  await link.click();
  await expect(page.locator("#privacy-dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#privacy-dialog")).toBeHidden();
  await expect(link).toBeFocused();
});

test("alternância rápida de animações e movimento reduzido", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.locator("[data-entry-skip]").click();
  await page.locator(".hero-showcase").scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    for (let i = 0; i < 8; i++) {
      document
        .querySelector(`[data-device-button="${i % 2 ? "desktop" : "mobile"}"]`)
        .click();
      document.querySelector("[data-web-next]").click();
    }
  });
  await expect(page.locator(".web-workspace")).toHaveAttribute(
    "data-transitioning",
    "false",
  );
  await expect(
    page.locator('[data-web-slide][data-active="true"]'),
  ).toHaveCount(1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("[data-web-pause]")).toBeDisabled();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.getAnimations().filter((a) => a.playState === "running")
            .length,
      ),
    )
    .toBe(0);
  expect(errors).toEqual([]);
});

test("carrossel pausa fora da tela e as entradas liberam as animações", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("[data-entry-skip]").click();
  await page.locator("#projetos").scrollIntoViewIfNeeded();
  const current = await page
    .locator(".web-workspace")
    .getAttribute("data-site");
  await page.waitForTimeout(5700);
  await expect(page.locator(".web-workspace")).toHaveAttribute(
    "data-site",
    current,
  );
  for (const section of [
    "#seu-site",
    "#investimento",
    "#como-funciona",
    "#duvidas",
  ]) {
    await page.locator(section).scrollIntoViewIfNeeded();
    await expect(page.locator(section + " h2")).toBeVisible();
  }
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.getAnimations().filter((a) => a.playState === "running")
            .length,
      ),
    )
    .toBe(0);
});

for (const path of [
  "privacidade.html",
  "projetos/osler/website/index.html",
  "projetos/aml/website/index.html",
  "projetos/gear-seo/website/index.html",
]) {
  test(`página ${path}: imagens, console, links e layout`, async ({ page }) => {
    const errors = [];
    const missing = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("response", (response) => {
      if (
        response.url().startsWith("http://127.0.0.1:3100") &&
        response.status() >= 400
      )
        missing.push(response.url());
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/" + path);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.evaluate(() =>
      scrollTo(0, document.documentElement.scrollHeight),
    );
    if (path.startsWith("projetos"))
      await expect(page.locator(".kapi-preview-back")).toHaveAttribute(
        "href",
        "../../../index.html#projetos",
      );
    expect(errors).toEqual([]);
    expect(missing).toEqual([]);
  });
}

test("conteúdo e navegação básica sem JavaScript", async ({ browser }) => {
  const page = await browser.newPage({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  await page.goto("http://127.0.0.1:3100/");
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator("[data-entry-search]")).toBeHidden();
  await expect(page.locator(".hero-cta")).toHaveAttribute(
    "href",
    "https://wa.me/message/3DBMZ5ZZHD4NC1",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.locator("[data-faq] summary").first().click();
  await expect(page.locator("[data-faq]").first()).toHaveAttribute("open", "");
  await page.close();
});

test("falha do script principal libera a abertura e o conteúdo", async ({
  page,
}) => {
  await page.route("**/assets/build/site.js*", (route) => route.abort());
  await page.goto("/index.html#inicio");
  await expect(page.locator("[data-entry-search]")).toBeHidden({
    timeout: 5000,
  });
  await expect(page.locator(".web-browser")).toBeVisible();
  await expect(page.locator(".hero-cta")).toBeVisible();
});

test("textos, âncoras e referências locais permanecem consistentes", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".footer-brand p")).toHaveText(
    "Sites, sistemas e soluções digitais.",
  );
  expect(
    await page.evaluate(() =>
      [...document.querySelectorAll('a[href^="#"]')]
        .map((a) => a.getAttribute("href").slice(1))
        .filter((id) => id && !document.getElementById(id)),
    ),
  ).toEqual([]);
  expect(
    await page
      .locator('link[rel="icon"][type="image/svg+xml"]')
      .getAttribute("href"),
  ).toContain("favicon.svg");
});

test("âncora inicio retorna ao topo sem cortar o cabeçalho mobile", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/index.html#inicio");
  expect(await page.evaluate(() => scrollY)).toBe(0);
  expect(
    await page
      .locator(".site-header")
      .evaluate((e) => e.getBoundingClientRect().top),
  ).toBeGreaterThanOrEqual(0);
  await expect(page.locator(".mobile-cta")).toBeVisible();
});
