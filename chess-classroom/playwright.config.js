// Browser smoke tests (dev-only: nothing here ships). `npm run test:e2e`.
// Unit tests stay on `node --test`; its default patterns don't match *.spec.js.
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  use: { baseURL: "http://localhost:8123" },
  webServer: {
    command: "python3 -m http.server 8123",
    url: "http://localhost:8123/index.html",
    reuseExistingServer: true,
  },
});
