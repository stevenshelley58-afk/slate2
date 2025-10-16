import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const rootDir = dirname(fileURLToPath(new URL(import.meta.url)));

export default defineConfig({
  test: {
    alias: {
      "@slate/state-machine": resolve(rootDir, "../../packages/state-machine/src/index.ts"),
      "@slate/schemas": resolve(rootDir, "../../packages/schemas/src/index.ts"),
      "@slate/business-rules": resolve(rootDir, "../../packages/business-rules/src/index.ts"),
      "@slate/generator": resolve(rootDir, "../generator/src/index.ts"),
      "@slate/andronoma-adapter": resolve(rootDir, "../andronoma-adapter/src/index.ts"),
      "@slate/qa-service": resolve(rootDir, "../qa/src/index.ts"),
      "@slate/exporter": resolve(rootDir, "../exporter/src/index.ts"),
    },
  },
});
