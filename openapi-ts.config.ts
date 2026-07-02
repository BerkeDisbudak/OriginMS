import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "./backend/openapi.json",
  output: "frontend/src/api/generated",
  plugins: [
    "@hey-api/client-fetch",
    "@hey-api/typescript",
    "@hey-api/sdk",
    {
      name: "@tanstack/react-query",
      queryKeys: true,
      queryOptions: true,
    },
  ],
});
