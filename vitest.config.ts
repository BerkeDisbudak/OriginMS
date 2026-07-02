import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./frontend/src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    include: ["frontend/tests/**/*.spec.ts", "frontend/tests/**/*.spec.tsx"],
  },
});
