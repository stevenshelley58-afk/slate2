import { describe, expect, it, vi } from "vitest";
import type { PipelineRuntime } from "./pipeline-types.js";

vi.mock("@slate/generator", async () => {
  const { schemaVersionLiteral } = await import("../../packages/schemas/src/index.ts");
  return {
    generateMessageMaps: () => [
      {
        schema_version: schemaVersionLiteral,
        map_id: "map-1",
        segment_id: "segment-1",
        copy: "Test map",
      },
    ],
    generateHooks: () => [
      {
        schema_version: schemaVersionLiteral,
        hook_id: "hook-fixed",
        segment_id: "segment-1",
        device: "mobile",
        hook_text: "Reduce restock delays by 48% now.",
        proof_ref: "case-study#sku-alerts",
        novelty: 0.5,
        min_distance: 0.4,
        legal_risk: [],
      },
    ],
  };
});

const { RunStateMachine } = await import("../../packages/state-machine/src/index.ts");
const { registerPipeline } = await import("./pipeline.js");
const { schemaVersionLiteral } = await import("../../packages/schemas/src/index.ts");
const { SSR_GATES } = await import("../../packages/business-rules/src/constants.ts");

function setupPipeline(): { runtime: PipelineRuntime; machine: RunStateMachine } {
  const machine = new RunStateMachine();
  const context = machine.initializeContext({
    runId: "run-ssr-test",
    tenantId: "tenant-test",
    sourceUrl: "https://example.com/listing",
    anchorSetVersion: "andronoma-sim-v1",
    modelRevision: "2024-10-01",
    locale: "en-US",
    currency: "USD",
    autopilotEnabled: false,
  });

  const runtime: PipelineRuntime = {
    context,
    seed: 4242,
    artifacts: [],
    segments: [],
    maps: [],
    hooks: [],
  };

  registerPipeline(machine, runtime);

  return { runtime, machine };
}

describe("pipeline SSR stage", () => {
  it("produces required artifacts and passes KS/entropy gates", async () => {
    const { runtime, machine } = setupPipeline();

    await machine.start(runtime.context);

    const artifacts = runtime.artifacts;
    const configArtifact = artifacts.find((artifact) => artifact.artifactType === "ssr_config");
    expect(configArtifact).toBeDefined();

    const config = JSON.parse(configArtifact!.body);
    expect(config.schema_version).toBe(schemaVersionLiteral);
    expect(typeof config.anchor_sets_version).toBe("string");
    expect(config.embedding_model).toBe("text-embedding-3-small");

    const responsesArtifact = artifacts.find((artifact) => artifact.artifactType === "ssr_responses");
    expect(responsesArtifact).toBeDefined();

    const responseLines = responsesArtifact!.body.trim().split("\n").filter(Boolean);
    expect(responseLines.length).toBeGreaterThan(0);

    const ksArtifact = artifacts.find((artifact) => artifact.artifactType === "ks_entropy");
    expect(ksArtifact).toBeDefined();

    const csvLines = ksArtifact!.body.trim().split("\n");
    const dataLines = csvLines.slice(1); // drop header
    expect(dataLines.length).toBeGreaterThan(0);

    for (const line of dataLines) {
      const [personaId, hookId, ks, entropy] = line.split(",");
      expect(personaId).toBeTruthy();
      expect(hookId).toBeTruthy();
      expect(Number(ks)).toBeGreaterThanOrEqual(SSR_GATES.ksMin);
      expect(Number(entropy)).toBeGreaterThanOrEqual(SSR_GATES.entropyMin);
    }

    const pmfArtifact = artifacts.find((artifact) => artifact.artifactType === "ssr_pmf");
    expect(pmfArtifact).toBeDefined();
    expect(pmfArtifact!.encoding).toBe("base64");
    expect(pmfArtifact!.body.length).toBeGreaterThan(0);

    const separationArtifact = artifacts.find((artifact) => artifact.artifactType === "separation");
    expect(separationArtifact).toBeDefined();

    const failureArtifact = artifacts.find((artifact) => artifact.artifactType === "failure");
    expect(failureArtifact).toBeUndefined();
  });
});
