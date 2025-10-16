#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { once } from "node:events";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { Value } from "@sinclair/typebox/value";
import {
  PersonaRecordSchema,
  HookRecordSchema,
  SsrConfigSchema,
  AssetsManifestRecordSchema,
} from "@slate/schemas";
import {
  STYLE_RULES,
  NOVELTY_FLOORS,
  DISTANCE_THRESHOLDS,
  SSR_GATES,
} from "@slate/business-rules";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const orchestratorDist = path.join(
  rootDir,
  "services",
  "orchestrator",
  "dist",
  "server.js",
);
const PORT = Number(process.env.SLATE_ORCHESTRATOR_PORT ?? 3333);
const BASE_URL = `http://127.0.0.1:${PORT}`;

async function main() {
  const serverControl = await ensureServer();
  try {
    const runSummary = await createRun();
    await waitForStage(runSummary.run_id, "done");

    const artifacts = await fetchArtifacts(runSummary.run_id);
    validateArtifacts(artifacts);

    await validateSegments(runSummary.run_id);

    console.log("✅ Vertical slice smoke test passed.");
  } finally {
    if (serverControl.started && serverControl.process) {
      await shutdownProcess(serverControl.process);
    }
  }
}

async function ensureServer() {
  if (await isServerResponsive()) {
    return { started: false, process: null };
  }

  if (!fs.existsSync(orchestratorDist)) {
    await runCommand(getPnpmCommand(), [
      "--filter",
      "@slate/orchestrator",
      "build",
    ]);
  }

  const proc = spawn(process.execPath, [orchestratorDist], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: "inherit",
  });

  await waitForServerReady();
  return { started: true, process: proc };
}

async function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve(undefined);
      } else {
        reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
      }
    });
  });
}

function getPnpmCommand() {
  return process.platform === "win32" ? "pnpm.cmd" : "pnpm";
}

async function isServerResponsive() {
  try {
    const res = await fetch(`${BASE_URL}/runs/not-real`);
    return res.status === 404 || res.ok;
  } catch {
    return false;
  }
}

async function waitForServerReady() {
  const timeoutMs = 15000;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isServerResponsive()) {
      return;
    }
    await sleep(250);
  }
  throw new Error("Server did not become ready in time");
}

async function createRun() {
  const res = await fetch(`${BASE_URL}/runs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      url: "https://example.com/product",
      seed: 42,
    }),
  });
  assert.equal(res.ok, true, "Failed to create run");
  const body = await res.json();
  assert.equal(body.autopilot_enabled, false);
  assert.ok(body.run_id, "Run id missing");
  return body;
}

async function waitForStage(runId, targetStage) {
  const timeoutMs = 10000;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`${BASE_URL}/runs/${runId}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch run ${runId}`);
    }
    const summary = await res.json();
    if (summary.current_stage === targetStage) {
      return;
    }
    await sleep(250);
  }
  throw new Error(`Run ${runId} did not reach stage ${targetStage}`);
}

async function fetchArtifacts(runId) {
  const res = await fetch(`${BASE_URL}/runs/${runId}/artifacts`);
  assert.equal(res.ok, true, "Failed to fetch artifacts");
  const payload = await res.json();
  assert.ok(Array.isArray(payload.artifacts), "Artifacts payload malformed");
  return payload.artifacts;
}

function parseJsonl(body) {
  return body
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function validateArtifacts(artifacts) {
  const personas = artifacts.find((a) => a.artifact_type === "personas");
  assert.ok(personas, "Personas artifact missing");
  const personaRecords = parseJsonl(personas.body);
  assert.ok(personaRecords.length > 0, "Expected at least one persona");
  for (const record of personaRecords) {
    assert.equal(
      Value.Check(PersonaRecordSchema, record),
      true,
      "Persona schema validation failed",
    );
  }

  const hooks = artifacts.find((a) => a.artifact_type === "hooks");
  assert.ok(hooks, "Hooks artifact missing");
  const hookRecords = parseJsonl(hooks.body);
  assert.ok(hookRecords.length > 0, "Expected at least one hook");
  for (const hook of hookRecords) {
    assert.equal(Value.Check(HookRecordSchema, hook), true, "Hook invalid");
    const firstLineWordCount = hook.hook_text
      .split("\n")[0]
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
    assert.ok(
      firstLineWordCount <= STYLE_RULES.firstLineMaxWords,
      "Hook first line violates style rule",
    );
  }

  const ssr = artifacts.find((a) => a.artifact_type === "ssr_config");
  assert.ok(ssr, "SSR config artifact missing");
  const ssrRecord = JSON.parse(ssr.body);
  assert.equal(Value.Check(SsrConfigSchema, ssrRecord), true, "SSR invalid");

  const manifest = artifacts.find((a) => a.artifact_type === "assets_manifest");
  assert.ok(manifest, "Assets manifest missing");
  const manifestRecord = JSON.parse(manifest.body);
  assert.equal(
    Value.Check(AssetsManifestRecordSchema, manifestRecord),
    true,
    "Assets manifest invalid",
  );
}

async function validateSegments(runId) {
  const res = await fetch(`${BASE_URL}/segments?run_id=${runId}`);
  assert.equal(res.ok, true, "Failed to fetch segments");
  const payload = await res.json();

  assert.equal(
    payload.thresholds.style_rules.first_line_max_words,
    STYLE_RULES.firstLineMaxWords,
  );
  assert.equal(
    payload.thresholds.novelty.copy_floor,
    NOVELTY_FLOORS.copy,
  );
  assert.equal(
    payload.thresholds.distance.hook,
    DISTANCE_THRESHOLDS.hook,
  );
  assert.equal(payload.thresholds.ssr.ks_min, SSR_GATES.ksMin);

  assert.ok(Array.isArray(payload.segments), "Segments payload malformed");
  assert.ok(payload.segments.length > 0, "Expected at least one segment");
}

async function shutdownProcess(proc) {
  proc.kill();
  try {
    await Promise.race([once(proc, "exit"), sleep(2000)]);
  } catch {
    // best effort
  }
}

await main().catch((error) => {
  console.error("❌ Vertical slice smoke test failed.");
  console.error(error);
  process.exitCode = 1;
});
