import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  use: {
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    baseURL: process.env.E2E_URL || "http://127.0.0.1:5173",
    trace: "retain-on-failure",
    ...(process.env.E2E_TOUCH === "1"
      ? {
          isMobile: true,
          hasTouch: true,
          viewport: { width: 390, height: 844 },
        }
      : {}),
  },
  reporter: [["list"]],
  outputDir: "test-results",
});
