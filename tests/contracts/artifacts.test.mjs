#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import Ajv from "../../packages/schemas/node_modules/ajv/dist/ajv.js";
import addFormats from "../../packages/schemas/node_modules/ajv-formats/dist/index.js";
import {
  PersonaRecordSchema,
  ClusterRecordSchema,
  AssetsManifestRecordSchema,
  PromptRecordSchema,
} from "../../packages/schemas/dist/artifacts/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FIXTURES = [
  {
    name: "persona",
    file: "persona.json",
    schema: PersonaRecordSchema,
  },
  {
    name: "cluster",
    file: "cluster.json",
    schema: ClusterRecordSchema,
  },
  {
    name: "assets-manifest",
    file: "assets-manifest.json",
    schema: AssetsManifestRecordSchema,
  },
  {
    name: "prompt",
    file: "prompt.json",
    schema: PromptRecordSchema,
  },
];

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

let failures = 0;

for (const fixture of FIXTURES) {
  const path = join(__dirname, "fixtures", fixture.file);
  const raw = readFileSync(path, "utf-8");
  const payload = JSON.parse(raw);

  const validate = ajv.compile(fixture.schema);
  const ok = validate(payload);

  if (!ok) {
    console.error(`❌ ${fixture.name} fixture failed schema validation`);
    for (const error of validate.errors ?? []) {
      console.error(`   → ${error.instancePath || "/"}: ${error.message}`);
    }
    failures += 1;
    continue;
  }

  console.log(`✅ ${fixture.name} fixture validated (${path})`);
}

if (failures > 0) {
  process.exitCode = 1;
  console.error(`\n${failures} fixture(s) failed validation.`);
} else {
  console.log("\nAll fixture artifacts validated successfully.");
}
