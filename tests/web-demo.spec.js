const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => localStorage.setItem("kapi-marketing-consent-v1", JSON.stringify({
    version: 1, marketing: false, updatedAt: Date.now(),
  })));
});

async function openDemo(page) {
  await page.goto("/");
  await page.locator("[data-entry-skip]").click();
  await page.locator(".web-scene").scrollIntoViewIfNeeded();
  await expect(page.locator(".web-scene")).toHaveCSS("transform", "none");
}

for (const touch of [false, true]) {
  test(`carrossel continua após trocar os dois formatos com ${touch ? "toque" : "mouse"}`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({
      baseURL,
      viewport: { width: touch ? 390 : 1440, height: 900 },
      hasTouch: touch,
      isMobile: touch,
    });
    await context.addInitScript(() => localStorage.setItem("kapi-marketing-consent-v1", JSON.stringify({
      version: 1, marketing: false, updatedAt: Date.now(),
    })));
    const page = await context.newPage();
    try {
      await openDemo(page);
      const stage = page.locator(".web-workspace");
      for (const device of touch ? ["desktop", "mobile"] : ["mobile", "desktop"]) {
        const button = page.locator(`[data-device-button="${device}"]`);
        const before = await stage.getAttribute("data-site");
        if (touch) await button.tap();
        else await button.click();
        // O ponteiro e o foco continuam no botão, como no uso real.
        await expect(button).toBeFocused();
        await expect(stage).toHaveAttribute("data-device", device);
        await expect(stage).not.toHaveAttribute("data-site", before, { timeout: 8000 });
        await expect(stage).toHaveAttribute("data-transitioning", "false");
        await expect(page.locator('[data-web-slide][data-active="true"]')).toHaveCount(1);
      }
    } finally {
      await context.close();
    }
  });
}

test("pausa escolhida permanece após trocar de dispositivo; retomar volta a animar", async ({ page }) => {
  await openDemo(page);
  const stage = page.locator(".web-workspace");
  const before = await stage.getAttribute("data-site");
  await page.locator("[data-web-pause]").click();
  await page.locator('[data-device-button="mobile"]').click();
  await page.waitForTimeout(6000);
  await expect(stage).toHaveAttribute("data-site", before);
  await expect(page.locator("[data-web-pause]")).toHaveAttribute("aria-pressed", "true");
  await page.locator("[data-web-pause]").click();
  await page.mouse.move(0, 0);
  await expect(stage).not.toHaveAttribute("data-site", before, { timeout: 8000 });
});

test("foco por teclado pausa a apresentação até sair da ilustração", async ({ page }) => {
  await openDemo(page);
  await page.locator('[data-device-button="desktop"]').click();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  const button = page.locator('[data-device-button="mobile"]');
  await expect(button).toBeFocused();
  expect(await button.evaluate(element => element.matches(":focus-visible"))).toBe(true);
  const stage = page.locator(".web-workspace");
  const before = await stage.getAttribute("data-site");
  await page.waitForTimeout(6000);
  await expect(stage).toHaveAttribute("data-site", before);
  await page.keyboard.press("Tab");
  await page.locator(".web-scene").scrollIntoViewIfNeeded();
  await expect(stage).not.toHaveAttribute("data-site", before, { timeout: 8000 });
});

for (const width of [390, 1440]) {
  test(`troca de formato sem deformação nem deslocamento da página em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openDemo(page);
    const result = await page.evaluate(async () => {
      const stage = document.querySelector(".web-workspace");
      const frame = stage.querySelector(".web-browser");
      const canvas = stage.querySelector(".web-canvas");
      const initialHeight = stage.offsetHeight;
      let maxDistortion = 0;
      let maxStageShift = 0;
      let maxEmptySpace = 0;
      for (const device of ["mobile", "desktop", "mobile", "desktop"]) {
        document.querySelector(`[data-device-button="${device}"]`).click();
        for (let i = 0; i < 6; i++) {
          await new Promise(requestAnimationFrame);
          for (const element of [frame, canvas]) {
            const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform);
            maxDistortion = Math.max(maxDistortion, Math.abs(matrix.a - matrix.d));
          }
          maxStageShift = Math.max(maxStageShift, Math.abs(stage.offsetHeight - initialHeight));
          const surface = frame.getBoundingClientRect();
          const content = canvas.getBoundingClientRect();
          maxEmptySpace = Math.max(maxEmptySpace, surface.width - content.width, surface.bottom - content.bottom);
        }
      }
      return { maxDistortion, maxStageShift, maxEmptySpace };
    });
    expect(result.maxDistortion).toBeLessThan(0.001);
    expect(result.maxStageShift).toBe(0);
    expect(result.maxEmptySpace).toBeLessThan(1);
    await expect(page.locator(".web-workspace")).toHaveAttribute("data-resizing", "false");
    expect(await page.locator(".web-browser").evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0);
    const frame = await page.locator(".web-browser").boundingBox();
    const canvas = await page.locator(".web-canvas").boundingBox();
    expect(Math.abs(frame.x - canvas.x)).toBeLessThan(1);
    expect(Math.abs(frame.width - canvas.width)).toBeLessThan(1);
  });
}

test("clique durante a entrada não desloca o controle entre pressionar e soltar", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.locator("[data-entry-skip]").click();
  await page.evaluate(() => {
    const scene = document.querySelector(".web-scene");
    const entrance = scene.getAnimations()[0];
    entrance.pause();
    entrance.currentTime = 310;
    scene.scrollIntoView({ block: "center", behavior: "instant" });
  });
  const button = page.locator('[data-device-button="mobile"]');
  const box = await button.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(button).toHaveAttribute("aria-pressed", "true");
  await page.evaluate(() => document.querySelector(".web-scene").getAnimations().forEach(animation => animation.finish()));
});
