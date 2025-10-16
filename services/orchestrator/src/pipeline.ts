import { mkdirSync, writeFileSync, readFileSync } from "fs";
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
import { runSSR } from "@slate/andronoma-adapter";
import { enforceSsr, type SsrMetrics } from "@slate/business-rules";
import { logger } from "./logger.js";
import type {
  PipelineRuntime,
  ArtifactEnvelope,
  SegmentSummary,
} from "./pipeline-types.js";
import { generateQaReport } from "@slate/qa-service";
import { generateExportManifest } from "@slate/exporter";
import { ParquetSchema, ParquetWriter } from "parquetjs-lite";

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

  machine.registerHandler("ssr", async (ctx) => {
    logger.debug({ runId: ctx.runId }, "Running SSR for persona×hook combinations");
    logger.info(
      { runId: ctx.runId, autopilotEnabled: ctx.autopilotEnabled },
      ctx.autopilotEnabled
        ? "SSR stage executing after autopilot resume"
        : "SSR stage executing with manual override",
    );

    const personaArtifacts = runtime.artifacts.filter(
      (artifact) => artifact.artifactType === "personas",
    );
    if (personaArtifacts.length === 0) {
      throw new Error("No personas found for SSR stage");
    }

    const personas: PersonaRecord[] = [];
    for (const artifact of personaArtifacts) {
      const lines = artifact.body.trim().split("\n");
      for (const line of lines) {
        if (line.trim()) {
          personas.push(JSON.parse(line));
        }
      }
    }

    const personaWeightFallback = personas.length > 0 ? 1 / personas.length : 1;
    const responseRecords: Array<Record<string, unknown>> = [];
    const pmfRows: Array<{
      persona_id: string;
      hook_id: string;
      rating: number;
      probability: number;
      persona_weight: number;
      weighted_probability: number;
    }> = [];
    const csvRows = [
      "persona_id,hook_id,ks,entropy,entropy_coverage,bimodal,separation,purchase_intent_mean,purchase_intent_high_mass,gate_ok",
    ];
    const separationRows = [
      "| Persona | Hook | Top Rating | Top Probability | Runner-Up | Runner Probability | Separation |",
      "| --- | --- | --- | --- | --- | --- | --- |",
    ];
    const failures: Array<{ persona_id: string; hook_id: string; reason: string }> = [];
    const aggregatedWeighted = [0, 0, 0, 0, 0];

    let totalWeight = 0;

    for (const persona of personas) {
      for (const hook of runtime.hooks) {
        const personaWeight =
          persona.weight > 0 ? persona.weight : personaWeightFallback;
        totalWeight += personaWeight;

        const combinationSeed =
          runtime.seed ^
          stableHash(`${persona.persona_id}::${hook.hook_id}`);

        const ssrResult = runSSR(persona, hook, combinationSeed, "sim");

        const coverage =
          ssrResult.pmf.filter((value) => value >= 0.04).length /
          ssrResult.pmf.length;
        const purchaseIntentMass = ssrResult.pmf
          .slice(2)
          .reduce((sum, value) => sum + value, 0);
        const purchaseIntentMean =
          purchaseIntentMass === 0
            ? 0
            :
              (3 * ssrResult.pmf[2] +
                4 * ssrResult.pmf[3] +
                5 * ssrResult.pmf[4]) /
              purchaseIntentMass;
        const purchaseIntentHighMass = ssrResult.pmf[4];

        const metrics: SsrMetrics = {
          relevanceMean: ssrResult.mean,
          ks: ssrResult.ks_score,
          entropy: ssrResult.entropy,
          entropyCoverageRatio: coverage,
          bimodalShare: ssrResult.bimodal,
          separation: ssrResult.separation,
          purchaseIntentMean,
          purchaseIntentHighMass,
          fastTrack: persona.weight >= 0.6,
        };

        const gateEvaluation = enforceSsr(metrics);
        if (!gateEvaluation.ok && gateEvaluation.reason) {
          failures.push({
            persona_id: persona.persona_id,
            hook_id: hook.hook_id,
            reason: gateEvaluation.reason,
          });
        }

        for (let i = 0; i < ssrResult.pmf.length; i += 1) {
          const probability = ssrResult.pmf[i];
          aggregatedWeighted[i] += probability * personaWeight;
          pmfRows.push({
            persona_id: persona.persona_id,
            hook_id: hook.hook_id,
            rating: i + 1,
            probability: Number(probability.toFixed(6)),
            persona_weight: Number(personaWeight.toFixed(6)),
            weighted_probability: Number((probability * personaWeight).toFixed(6)),
          });
        }

        for (const response of ssrResult.responses) {
          responseRecords.push({
            persona_id: persona.persona_id,
            persona_weight: Number(personaWeight.toFixed(6)),
            hook_id: hook.hook_id,
            anchor_id: response.anchor_id,
            response_id: response.response_id,
            rating: response.rating,
            probability: response.probability,
            hkdf_seed: response.hkdf_seed,
          });
        }

        const sorted = ssrResult.pmf
          .map((probability, index) => ({ rating: index + 1, probability }))
          .sort((a, b) => b.probability - a.probability);

        csvRows.push(
          [
            persona.persona_id,
            hook.hook_id,
            metrics.ks.toFixed(4),
            metrics.entropy.toFixed(4),
            metrics.entropyCoverageRatio.toFixed(4),
            metrics.bimodalShare.toFixed(4),
            metrics.separation.toFixed(4),
            (metrics.purchaseIntentMean ?? 0).toFixed(4),
            (metrics.purchaseIntentHighMass ?? 0).toFixed(4),
            gateEvaluation.ok ? "pass" : "fail",
          ].join(","),
        );

        separationRows.push(
          `| ${persona.persona_id} | ${hook.hook_id} | ${sorted[0].rating} | ${sorted[0].probability.toFixed(3)} | ${sorted[1].rating} | ${sorted[1].probability.toFixed(3)} | ${metrics.separation.toFixed(3)} |`,
        );

        logger.debug(
          {
            runId: ctx.runId,
            persona_id: persona.persona_id,
            hook_id: hook.hook_id,
            metrics,
            gate_ok: gateEvaluation.ok,
          },
          "SSR result",
        );
      }
    }

    if (failures.length > 0) {
      appendJsonArtifact(
        runtime,
        ctx.runId,
        "failure",
        `${ctx.runId}-ssr-failure.json`,
        {
          stage: "ssr",
          failures,
        },
      );
      throw new Error(
        `SSR gate failure: ${failures.length} combinations failed quality gates`,
      );
    }

    const aggregatedNormalised =
      totalWeight > 0
        ? aggregatedWeighted.map((value) => value / totalWeight)
        : aggregatedWeighted;

    logger.info(
      {
        runId: ctx.runId,
        aggregatedPmf: aggregatedNormalised.map((value) => Number(value.toFixed(4))),
      },
      "Persona-weighted PMF computed",
    );

    const config: SsrConfig = {
      schema_version: schemaVersionLiteral,
      anchor_sets_version: ctx.anchorSetVersion,
      embedding_model: "text-embedding-3-small",
      temperature: 1,
      epsilon: 0,
      sets: 6,
    };
    appendJsonArtifact(
      runtime,
      ctx.runId,
      "ssr_config",
      `${ctx.runId}-ssr_config.json`,
      config,
    );

    appendJsonlArtifact(runtime, ctx.runId, "ssr_responses", responseRecords);

    await writePmfParquet(runtime, ctx.runId, pmfRows);

    appendCsvArtifact(
      runtime,
      ctx.runId,
      "ks_entropy",
      `${ctx.runId}-ks_entropy.csv`,
      csvRows,
    );

    appendMarkdownArtifact(
      runtime,
      ctx.runId,
      "separation",
      `${ctx.runId}-separation.md`,
      separationRows.join("\n"),
    );

    logger.info({ runId: ctx.runId }, "SSR stage completed");
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
  body: string | Buffer,
) {
  const absolutePath = join(OUTPUT_ROOT, runId, filename);
  if (typeof body === "string") {
    writeFileSync(absolutePath, body, { encoding: "utf-8" });
    registerArtifact(
      runtime,
      stage,
      artifactType,
      filename,
      contentType,
      body,
      absolutePath,
      "utf-8",
    );
  } else {
    writeFileSync(absolutePath, body);
    registerArtifact(
      runtime,
      stage,
      artifactType,
      filename,
      contentType,
      body.toString("base64"),
      absolutePath,
      "base64",
    );
  }
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

function appendCsvArtifact(
  runtime: PipelineRuntime,
  runId: string,
  artifactType: string,
  filename: string,
  rows: string[],
) {
  const body = rows.join("\n");
  const normalized = body.endsWith("\n") ? body : `${body}\n`;
  writeArtifact(
    runtime,
    runId,
    artifactStageForType(artifactType),
    artifactType,
    filename,
    "text/csv",
    normalized,
  );
}

function appendMarkdownArtifact(
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
    "text/markdown",
    normalizedBody,
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
    case "ssr_responses":
    case "ssr_pmf":
    case "ks_entropy":
    case "separation":
    case "failure":
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

async function writePmfParquet(
  runtime: PipelineRuntime,
  runId: string,
  rows: Array<{
    persona_id: string;
    hook_id: string;
    rating: number;
    probability: number;
    persona_weight: number;
    weighted_probability: number;
  }>,
) {
  if (rows.length === 0) {
    return;
  }

  ensureOutputDir(runId);
  const filename = `${runId}-ssr_pmf.parquet`;
  const schema = new ParquetSchema({
    persona_id: { type: "UTF8" },
    hook_id: { type: "UTF8" },
    rating: { type: "INT64" },
    probability: { type: "DOUBLE" },
    persona_weight: { type: "DOUBLE" },
    weighted_probability: { type: "DOUBLE" },
  });

  const absolutePath = join(OUTPUT_ROOT, runId, filename);
  const writer = await ParquetWriter.openFile(schema, absolutePath);
  for (const row of rows) {
    await writer.appendRow(row);
  }
  await writer.close();

  const buffer = readFileSync(absolutePath);
  registerArtifact(
    runtime,
    "ssr",
    "ssr_pmf",
    filename,
    "application/x-parquet",
    buffer.toString("base64"),
    absolutePath,
    "base64",
  );
}

function registerArtifact(
  runtime: PipelineRuntime,
  stage: RunStage,
  artifactType: string,
  filename: string,
  contentType: string,
  body: string,
  absolutePath: string,
  encoding: "utf-8" | "base64",
) {
  const artifact: ArtifactEnvelope = {
    stage,
    artifactType,
    filename,
    contentType,
    body,
    absolutePath,
    encoding,
  };
  runtime.artifacts.push(artifact);
}

function stableHash(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}
