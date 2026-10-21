const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => localStorage.setItem('kapi-marketing-consent-v1', JSON.stringify({ version: 1, marketing: false, updatedAt: Date.now() })));
});

for (const width of [390, 1440]) {
  test(`destaques animam uma vez, preservam espaço e chegam aos valores finais em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    await page.locator('[data-entry-skip]').click();
    await page.evaluate(() => document.fonts.ready);
    const strip = page.locator('.trust-strip');
    const before = await strip.boundingBox();
    await page.evaluate(() => {
      window.statFrames = { year: [], clients: [], conversation: [] };
      new MutationObserver(() => {
        document.querySelectorAll('[data-trust]').forEach(element => {
          const value = element.querySelector('.trust-value');
          if (value) window.statFrames[element.dataset.trust].push(value.textContent);
        });
      }).observe(document.querySelector('.trust-strip'), { subtree: true, childList: true, characterData: true });
    });
    await strip.scrollIntoViewIfNeeded();
    await expect(strip.locator('.is-counting')).toHaveCount(3);
    const during = await strip.boundingBox();
    expect(during.height).toBeCloseTo(before.height, 1);
    await expect(strip.locator('.is-counting')).toHaveCount(0);
    await expect(strip.locator('.trust-final')).toHaveText(['Desde 2019', '+1000', 'Conversa direta']);
    await expect(strip.locator('[data-trust="conversation"]')).toBeVisible();
    const after = await strip.boundingBox();
    expect(after.height).toBeCloseTo(before.height, 1);
    const frames = await page.evaluate(() => window.statFrames);
    const years = frames.year.map(text => Number(text.replace('Desde ', '')));
    const clients = frames.clients.map(text => Number(text.replace('+', '')));
    expect(years[0]).toBe(2026);
    expect(years).toContain(2019);
    expect(years.every((value, index) => !index || value <= years[index - 1])).toBe(true);
    expect(clients[0]).toBe(0);
    expect(clients.some(value => value > 0 && value < 1000)).toBe(true);
    expect(clients.every((value, index) => !index || value >= clients[index - 1])).toBe(true);
    expect(frames.conversation.some(text => text.length > 0 && text.length < 14)).toBe(true);
    expect(frames.conversation.every(text => 'Conversa direta'.startsWith(text))).toBe(true);
    await page.evaluate(() => scrollTo(0, 0));
    await strip.scrollIntoViewIfNeeded();
    await expect(strip.locator('.trust-value')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('movimento reduzido mantém os valores finais sem iniciar contagem', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.locator('.trust-strip').scrollIntoViewIfNeeded();
  await expect(page.locator('.trust-final')).toHaveText(['Desde 2019', '+1000', 'Conversa direta']);
  await expect(page.locator('.trust-value')).toHaveCount(0);
});

test('ativar movimento reduzido durante a contagem encerra todos os efeitos', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-entry-skip]').click();
  await page.locator('.trust-strip').scrollIntoViewIfNeeded();
  await expect(page.locator('.trust-strip .is-counting')).toHaveCount(3);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.trust-value')).toHaveCount(0);
  await expect(page.locator('.trust-final')).toHaveText(['Desde 2019', '+1000', 'Conversa direta']);
});
