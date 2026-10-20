const { defineConfig } = require("@playwright/test");
module.exports = defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: process.env.KAPI_TEST_URL || "http://127.0.0.1:3100",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    },
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "node tools/server.mjs",
    env: { PORT: "3100" },
    url: "http://127.0.0.1:3100",
    reuseExistingServer: true,
  },
});
