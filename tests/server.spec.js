const { test, expect } = require("@playwright/test");
test("arquivos comprimidos, fonte local e revalidação", async ({ request }) => {
  const page = await request.get("/index.html", {
    headers: { "Accept-Encoding": "gzip" },
  });
  expect(page.status()).toBe(200);
  expect(page.headers()["content-encoding"]).toBe("gzip");
  const again = await request.get("/index.html", {
    headers: { "If-None-Match": page.headers().etag },
  });
  expect(again.status()).toBe(304);
  const font = await request.get("/assets/fonts/inter-latin-variable.woff2");
  expect(font.headers()["content-type"]).toBe("font/woff2");
  const missing = await request.get("/arquivo-inexistente");
  expect(missing.status()).toBe(404);
});
test("vídeos suportam busca sem transferir o arquivo inteiro", async ({
  request,
}) => {
  const video = await request.get(
    "/projetos/gear-seo/website/background_video.mp4",
    { headers: { Range: "bytes=0-99" } },
  );
  expect(video.status()).toBe(206);
  expect((await video.body()).length).toBe(100);
  expect(video.headers()["content-range"]).toMatch(/^bytes 0-99\/\d+$/);
  const invalid = await request.get(
    "/projetos/gear-seo/website/background_video.mp4",
    { headers: { Range: "bytes=999999999-" } },
  );
  expect(invalid.status()).toBe(416);
});
