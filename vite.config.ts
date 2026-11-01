import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // A relative base works both at the domain root and inside a deployment subfolder.
  base: "./",
  plugins: [react()],
  // Build the public Market as a second HTML entry so /market/ works on static hosting without rewrite rules.
  build: { rollupOptions: { input: ["index.html", "market/index.html"] } },
  server: { host: "0.0.0.0", allowedHosts: [".e2b.app"] },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"]
  }
});
