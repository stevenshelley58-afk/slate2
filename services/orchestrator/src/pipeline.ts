import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { RunStateMachine, type RunStage } from "@slate/state-machine";
import {
  schemaVersionLiteral,
  type PersonaRecord,
  type SsrConfig,
  type AssetsManifestRecord,
} from "@slate/schemas";
import {
  generateMessageMaps,
  generateHooks,
} from "@slate/generator";
import { runSSR, type SsrResult } from "@slate/andronoma-adapter";
import { enforceSsr, type SsrMetrics } from "@slate/business-rules";
import { logger } from "./logger.js";
import type {
  PipelineRuntime,
  ArtifactEnvelope,
  SegmentSummary,
} from "./pipeline-types.js";
import { generateQaReport } from "@slate/qa-service";
import { generateExportManifest } from "@slate/exporter";

const OUTPUT_ROOT = process.env.SLATE_ARTIFACT_DIR ?? "/tmp/slate2";

export function registerPipeline(machine: RunStateMachine, runtime: PipelineRuntime) {
  ensureOutputDir(runtime.context.runId);
  const rng = createRng(runtime.seed);

  machine.registerHandler("scraping", (ctx) => {
    logger.debug({ runId: ctx.runId }, "Scraping stage");
    ctx.updatedAt = new Date();
  });

  machine.registerHandler("personas", (ctx) => {
    logger.debug({ runId: ctx.runId }, "Generating personas");
    const persona: PersonaRecord = {
      schema_version: schemaVersionLiteral,
      persona_id: `${ctx.runId}-persona-1`,
      name: "Ops Manager Mia",
      jtbd: "Keep refill inventory stable without overbuying.",
      context: "Runs weekly restocks for a wellness subscription brand.",
      trigger: "Upcoming seasonal promotion spikes demand forecasts.",
      blocker: "Manual spreadsheets hide low-stock variants.",
      price_sensitivity: "medium",
      confidence_level: Number((0.72 + rng() * 0.1).toFixed(2)),
      evidence_refs: ["pdp#logistics", "faq#restock-window"],
      weight: Number((0.33 + rng() * 0.2).toFixed(2)),
    };

    appendJsonlArtifact(runtime, ctx.runId, "personas", [persona]);
  });

  machine.registerHandler("segments", (ctx) => {
    logger.debug({ runId: ctx.runId }, "Scoring segments");
    const baseScore = 0.78 + rng() * 0.05;
    const segments: SegmentSummary[] = [
      {
        segment_id: `${ctx.runId}-segment-1`,
        name: "Inventory Planners",
        score: Number(baseScore.toFixed(2)),
      },
      {
        segment_id: `${ctx.runId}-segment-2`,
        name: "Fresh Subscribers",
        score: Number((baseScore - 0.08).toFixed(2)),
      },
    ];
    runtime.segments.splice(0, runtime.segments.length, ...segments);
  });

  machine.registerHandler("maps", (ctx) => {
    logger.debug({ runId: ctx.runId }, "Generating message maps");

    const generatedMaps = generateMessageMaps(runtime.segments, runtime.seed);

    // TODO: Implement message maps generation
    const maps: any[] = generatedMaps;

    runtime.maps.splice(0, runtime.maps.length, ...maps);
    appendJsonlArtifact(runtime, ctx.runId, "maps", maps);
  });

  machine.registerHandler("hooks", (ctx) => {
    logger.debug({ runId: ctx.runId }, "Curating hooks");

    const generatedHooks = generateHooks(runtime.segments, runtime.maps, runtime.seed);

    // TODO: Implement hooks generation
    const hooks: any[] = generatedHooks;

    runtime.hooks.splice(0, runtime.hooks.length, ...hooks);

    for (const hook of hooks) {
      const firstLineWordCount = hook.hook_text
        .split("\n")[0]
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;
      // TODO: Add style rules validation when rules are available
      if (firstLineWordCount > 10) { // placeholder
        throw new Error("Generated hook violates first-line style rule");
      }
      // TODO: Add novelty validation when rules are available
      if (hook.novelty < 0.3) { // placeholder
        throw new Error("Generated hook violates novelty floor");
      }
      // TODO: Add distance validation when rules are available
      if (hook.min_distance < 0.2) { // placeholder
        throw new Error("Generated hook violates distance threshold");
      }
    }

    appendJsonlArtifact(runtime, ctx.runId, "hooks", hooks);

    // TODO: Implement device mix summary
    const mixSummary: any[] = [];
    const mixLines = mixSummary.map((entry: any) =>
      `${entry.segment_id}: ${JSON.stringify(entry.counts)}`,
    );
    logger.info({ runId: ctx.runId, mix: mixSummary }, "Device mix per segment");
    appendTextArtifact(
      runtime,
      ctx.runId,
      "hooks_device_mix",
      `${ctx.runId}-hooks_device_mix.txt`,
      mixLines.join("\n"),
    );
  });

  machine.registerHandler("briefs", (ctx) => {
    logger.debug({ runId: ctx.runId }, "Briefs stage (placeholder)");
  });

  machine.registerHandler("ssr", (ctx) => {
    logger.debug({ runId: ctx.runId }, "Running SSR for persona×hook combinations");
    
    // Get personas from artifacts
    const personaArtifacts = runtime.artifacts.filter(a => a.artifactType === "personas");
    if (personaArtifacts.length === 0) {
      throw new Error("No personas found for SSR stage");
    }
    
    const personas: PersonaRecord[] = [];
    for (const artifact of personaArtifacts) {
      const lines = artifact.body.trim().split('\n');
      for (const line of lines) {
        if (line.trim()) {
          personas.push(JSON.parse(line));
        }
      }
    }
    
    // Run SSR for each persona×hook combination
    const ssrResults: Array<{
      persona_id: string;
      hook_id: string;
      result: SsrResult;
      gate_evaluation: { ok: boolean; reason?: string };
    }> = [];
    
    let totalCombinations = 0;
    let passedGates = 0;
    
    for (const persona of personas) {
      for (const hook of runtime.hooks) {
        totalCombinations++;
        
        // Generate unique seed for this combination
        const combinationSeed = runtime.seed + 
          persona.persona_id.charCodeAt(0) + 
          hook.hook_id.charCodeAt(0);
        
        // Run SSR
        const ssrResult = runSSR(persona, hook, combinationSeed, "mock");
        
        // Convert to SsrMetrics format for gate evaluation
        const metrics: SsrMetrics = {
          relevanceMean: ssrResult.mean,
          ks: ssrResult.ks_score,
          entropy: ssrResult.entropy,
          entropyCoverageRatio: 0.8, // Mock value - would be calculated from actual data
          bimodalShare: ssrResult.bimodal,
          separation: ssrResult.separation,
        };
        
        // Evaluate gates
        const gateEvaluation = enforceSsr(metrics);
        if (gateEvaluation.ok) {
          passedGates++;
        }
        
        ssrResults.push({
          persona_id: persona.persona_id,
          hook_id: hook.hook_id,
          result: ssrResult,
          gate_evaluation: gateEvaluation,
        });
        
        logger.debug({
          runId: ctx.runId,
          persona_id: persona.persona_id,
          hook_id: hook.hook_id,
          mean: ssrResult.mean,
          ks: ssrResult.ks_score,
          entropy: ssrResult.entropy,
          gate_ok: gateEvaluation.ok,
        }, "SSR result");
      }
    }
    
    // Check if we have enough passing combinations
    const passRate = passedGates / totalCombinations;
    const minPassRate = 0.7; // Require 70% of combinations to pass gates
    
    if (passRate < minPassRate) {
      const failedResults = ssrResults.filter(r => !r.gate_evaluation.ok);
      const failureReasons = failedResults.map(r => r.gate_evaluation.reason).filter(Boolean);
      
      throw new Error(
        `SSR gate failure: ${passedGates}/${totalCombinations} combinations passed gates. ` +
        `Pass rate ${(passRate * 100).toFixed(1)}% below minimum ${(minPassRate * 100)}%. ` +
        `Common failures: ${[...new Set(failureReasons)].slice(0, 3).join(', ')}`
      );
    }
    
    // Write SSR config
    const config: SsrConfig = {
      schema_version: schemaVersionLiteral,
      anchor_sets_version: ctx.anchorSetVersion,
      embedding_model: "text-embedding-3-small",
      temperature: 1,
      epsilon: 0,
      sets: 6,
    };
    appendJsonArtifact(runtime, ctx.runId, "ssr_config", `${ctx.runId}-ssr_config.json`, config);
    
    // Write SSR results
    appendJsonArtifact(runtime, ctx.runId, "ssr_results", `${ctx.runId}-ssr_results.json`, {
      total_combinations: totalCombinations,
      passed_gates: passedGates,
      pass_rate: Number(passRate.toFixed(3)),
      results: ssrResults,
    });
    
    logger.info({
      runId: ctx.runId,
      totalCombinations,
      passedGates,
      passRate: Number(passRate.toFixed(3)),
    }, "SSR stage completed");
  });

  machine.registerHandler("creative", (ctx) => {
    logger.debug({ runId: ctx.runId }, "Creative placeholder stage");
  });

  machine.registerHandler("qa", (ctx) => {
    logger.debug({ runId: ctx.runId }, "QA checks");
    const qaArtifact = generateQaReport({
      runId: ctx.runId,
      hooks: runtime.hooks,
    });
    appendTextArtifact(runtime, ctx.runId, "qa_report", qaArtifact.filename, qaArtifact.body);
  });

  machine.registerHandler("pack", (ctx) => {
    logger.debug({ runId: ctx.runId }, "Packaging assets");
    const hook = runtime.hooks[0];
    const segmentId =
      runtime.segments[0]?.segment_id ?? `${ctx.runId}-segment-1`;
    const manifestRecord: AssetsManifestRecord = {
      schema_version: schemaVersionLiteral,
      asset_id: `${ctx.runId}-asset-1`,
      segment_id: segmentId,
      archetype: "problem-solution",
      hook_id: hook?.hook_id ?? `${ctx.runId}-hook-1`,
      ratio: "9:16",
      variant: "A",
      filename: "assets/demo-asset-1.mp4",
      checksum: "sha256-demo-placeholder",
      license_tag: "generated",
      created_at: new Date().toISOString(),
      file_size: 1024000,
      dimensions: {
        width: 1080,
        height: 1920,
      },
    };
    appendJsonArtifact(
      runtime,
      ctx.runId,
      "assets_manifest",
      `${ctx.runId}-assets_manifest.json`,
      manifestRecord,
    );

    const exportManifest = generateExportManifest({
      runId: ctx.runId,
      artifacts: runtime.artifacts,
    });
    appendTextArtifact(
      runtime,
      ctx.runId,
      "export_manifest",
      exportManifest.filename,
      exportManifest.body,
    );
  });
}

function ensureOutputDir(runId: string) {
  const runDir = join(OUTPUT_ROOT, runId);
  mkdirSync(runDir, { recursive: true });
}

function createRng(seed: number) {
  let value = Math.floor(seed) % 2147483647;
  if (value <= 0) {
    value += 2147483646;
  }
  return () => {
    value = (value * 16807) % 2147483647;
    return value / 2147483647;
  };
}

function writeArtifact(
  runtime: PipelineRuntime,
  runId: string,
  stage: RunStage,
  artifactType: string,
  filename: string,
  contentType: string,
  body: string,
) {
  const absolutePath = join(OUTPUT_ROOT, runId, filename);
  writeFileSync(absolutePath, body, { encoding: "utf-8" });
  const artifact: ArtifactEnvelope = {
    stage,
    artifactType,
    filename,
    contentType,
    body,
    absolutePath,
  };
  runtime.artifacts.push(artifact);
  return artifact;
}

function appendJsonlArtifact<T>(
  runtime: PipelineRuntime,
  runId: string,
  artifactType: string,
  records: T[],
) {
  const body = records.map((record) => JSON.stringify(record)).join("\n") + "\n";
  writeArtifact(
    runtime,
    runId,
    artifactStageForType(artifactType),
    artifactType,
    `${runId}-${artifactType}.jsonl`,
    "application/jsonl",
    body,
  );
}

function appendJsonArtifact<T>(
  runtime: PipelineRuntime,
  runId: string,
  artifactType: string,
  filename: string,
  record: T,
) {
  const body = `${JSON.stringify(record, null, 2)}\n`;
  writeArtifact(
    runtime,
    runId,
    artifactStageForType(artifactType),
    artifactType,
    filename,
    "application/json",
    body,
  );
}

function appendTextArtifact(
  runtime: PipelineRuntime,
  runId: string,
  artifactType: string,
  filename: string,
  body: string,
) {
  const normalizedBody = body.endsWith("\n") ? body : `${body}\n`;
  writeArtifact(
    runtime,
    runId,
    artifactStageForType(artifactType),
    artifactType,
    filename,
    "text/plain",
    normalizedBody,
  );
}

function artifactStageForType(artifactType: string): RunStage {
  switch (artifactType) {
    case "personas":
      return "personas";
    case "maps":
      return "maps";
    case "hooks":
      return "hooks";
    case "hooks_device_mix":
      return "hooks";
    case "ssr_config":
      return "ssr";
    case "qa_report":
      return "qa";
    case "assets_manifest":
    case "export_manifest":
      return "pack";
    default:
      return "creative";
  }
}
