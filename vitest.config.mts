import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "happy-dom",
    include: [
      "tests/unit/**/*.test.{ts,tsx}",
      "lib/**/*.test.{ts,tsx}",
      "features/**/*.test.{ts,tsx}",
    ],
    globals: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
