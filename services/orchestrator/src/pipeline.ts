import { createHash } from "crypto";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { RunStateMachine, type RunStage } from "@slate/state-machine";
import {
  schemaVersionLiteral,
  type PersonaRecord,
  type SsrConfig,
  type AssetsManifestRecord,
  type PromptRecord,
  type ImagePromptRecord,
} from "@slate/schemas";
import { generateMessageMaps, generateHooks } from "@slate/generator";
import { runSSR, type SsrResult } from "@slate/andronoma-adapter";
import { enforceSsr, type SsrMetrics } from "@slate/business-rules";
import { logger } from "./logger.js";
import type {
  PipelineRuntime,
  ArtifactEnvelope,
  SegmentSummary,
} from "./pipeline-types.js";
import { generateQaArtifacts, type StoryboardRecord } from "@slate/qa-service";
import { prepareExportArtifacts } from "@slate/exporter";

const OUTPUT_ROOT = process.env.SLATE_ARTIFACT_DIR ?? "/tmp/slate2";
const TARGET_ARCHETYPES = ["photorealistic", "illustration", "modern"] as const;
const TARGET_FORMATS = ["9:16", "1:1"] as const;

const FORMAT_DIMENSIONS: Record<string, { width: number; height: number }> = {
  "9:16": { width: 1080, height: 1920 },
  "1:1": { width: 1080, height: 1080 },
};

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
    runtime.maps.splice(0, runtime.maps.length, ...generatedMaps);
    appendJsonlArtifact(runtime, ctx.runId, "maps", generatedMaps);
  });

  machine.registerHandler("hooks", (ctx) => {
    logger.debug({ runId: ctx.runId }, "Curating hooks");

    const generatedHooks = generateHooks(runtime.segments, runtime.maps, runtime.seed);
    runtime.hooks.splice(0, runtime.hooks.length, ...generatedHooks);

    for (const hook of runtime.hooks) {
      const firstLineWordCount = hook.hook_text
        .split("\n")[0]
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;
      if (firstLineWordCount > 10) {
        throw new Error("Generated hook violates first-line style rule");
      }
      if (hook.novelty < 0.3) {
        throw new Error("Generated hook violates novelty floor");
      }
      if (hook.min_distance < 0.2) {
        throw new Error("Generated hook violates distance threshold");
      }
    }

    appendJsonlArtifact(runtime, ctx.runId, "hooks", runtime.hooks);

    const mixSummary: Array<{ segment_id: string; counts: Record<string, number> }> = [];
    const mixLines = mixSummary.map((entry) => `${entry.segment_id}: ${JSON.stringify(entry.counts)}`);
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

    const personaArtifacts = runtime.artifacts.filter((artifact) => artifact.artifactType === "personas");
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
        totalCombinations += 1;
        const combinationSeed =
          runtime.seed + persona.persona_id.charCodeAt(0) + hook.hook_id.charCodeAt(0);
        const ssrResult = runSSR(persona, hook, combinationSeed, "mock");
        const metrics: SsrMetrics = {
          relevanceMean: ssrResult.mean,
          ks: ssrResult.ks_score,
          entropy: ssrResult.entropy,
          entropyCoverageRatio: 0.8,
          bimodalShare: ssrResult.bimodal,
          separation: ssrResult.separation,
        };
        const gateEvaluation = enforceSsr(metrics);
        if (gateEvaluation.ok) {
          passedGates += 1;
        }

        ssrResults.push({
          persona_id: persona.persona_id,
          hook_id: hook.hook_id,
          result: ssrResult,
          gate_evaluation: gateEvaluation,
        });

        logger.debug(
          {
            runId: ctx.runId,
            persona_id: persona.persona_id,
            hook_id: hook.hook_id,
            mean: ssrResult.mean,
            ks: ssrResult.ks_score,
            entropy: ssrResult.entropy,
            gate_ok: gateEvaluation.ok,
          },
          "SSR result",
        );
      }
    }

    const passRate = passedGates / totalCombinations;
    const minPassRate = 0.7;

    if (passRate < minPassRate) {
      const failedResults = ssrResults.filter((result) => !result.gate_evaluation.ok);
      const failureReasons = failedResults.map((result) => result.gate_evaluation.reason).filter(Boolean);
      throw new Error(
        `SSR gate failure: ${passedGates}/${totalCombinations} combinations passed gates. ` +
          `Pass rate ${(passRate * 100).toFixed(1)}% below minimum ${minPassRate * 100}%. ` +
          `Common failures: ${[...new Set(failureReasons)].slice(0, 3).join(", ")}`,
      );
    }

    const config: SsrConfig = {
      schema_version: schemaVersionLiteral,
      anchor_sets_version: ctx.anchorSetVersion,
      embedding_model: "text-embedding-3-small",
      temperature: 1,
      epsilon: 0,
      sets: 6,
    };
    appendJsonArtifact(runtime, ctx.runId, "ssr_config", `${ctx.runId}-ssr_config.json`, config);

    appendJsonArtifact(runtime, ctx.runId, "ssr_results", `${ctx.runId}-ssr_results.json`, {
      total_combinations: totalCombinations,
      passed_gates: passedGates,
      pass_rate: Number(passRate.toFixed(3)),
      results: ssrResults,
    });

    logger.info(
      {
        runId: ctx.runId,
        totalCombinations,
        passedGates,
        passRate: Number(passRate.toFixed(3)),
      },
      "SSR stage completed",
    );
  });

  machine.registerHandler("creative", (ctx) => {
    logger.debug({ runId: ctx.runId }, "Synthesising creative assets");

    const prompts = buildPromptRecords(runtime);
    runtime.prompts.splice(0, runtime.prompts.length, ...prompts);
    appendJsonlArtifact(runtime, ctx.runId, "prompts", prompts);

    const imagePrompts = buildImagePromptRecords(runtime);
    runtime.imagePrompts.splice(0, runtime.imagePrompts.length, ...imagePrompts);
    appendJsonlArtifact(runtime, ctx.runId, "image_prompts", imagePrompts);

    const storyboards = buildStoryboards(runtime);
    runtime.storyboards.splice(0, runtime.storyboards.length, ...storyboards);
    appendJsonArtifact(runtime, ctx.runId, "storyboards", `${ctx.runId}-storyboards.json`, {
      schema_version: schemaVersionLiteral,
      storyboards,
    });
  });

  machine.registerHandler("qa", (ctx) => {
    logger.debug({ runId: ctx.runId }, "QA checks");

    const qaArtifacts = generateQaArtifacts({
      runId: ctx.runId,
      copy: runtime.hooks,
      prompts: runtime.prompts,
      imagePrompts: runtime.imagePrompts,
      storyboards: runtime.storyboards,
    });

    runtime.qaReport = qaArtifacts.summary;
    runtime.accessibilityReport = qaArtifacts.accessibility;

    appendTextArtifact(
      runtime,
      ctx.runId,
      "qa_report",
      qaArtifacts.qaReport.filename,
      qaArtifacts.qaReport.body,
      "application/json",
    );
    appendTextArtifact(
      runtime,
      ctx.runId,
      "near_duplicate_report",
      qaArtifacts.nearDuplicateReport.filename,
      qaArtifacts.nearDuplicateReport.body,
      "text/csv",
    );
    appendTextArtifact(
      runtime,
      ctx.runId,
      "accessibility_report",
      qaArtifacts.accessibilityReport.filename,
      qaArtifacts.accessibilityReport.body,
      "application/json",
    );
  });

  machine.registerHandler("pack", (ctx) => {
    logger.debug({ runId: ctx.runId }, "Packaging assets");

    if (!runtime.qaReport || !runtime.accessibilityReport) {
      throw new Error("QA artifacts missing before pack stage");
    }

    const manifest = assembleManifest(runtime, ctx.runId);
    const expectedSegments = runtime.segments.map((segment) => segment.segment_id);
    const expectedArchetypes = Array.from(
      new Set(runtime.imagePrompts.map((prompt) => prompt.archetype)),
    );

    const exportArtifacts = prepareExportArtifacts({
      runId: ctx.runId,
      manifest,
      expectedSegments,
      expectedArchetypes,
      expectedFormats: TARGET_FORMATS,
      qaReport: runtime.qaReport,
      accessibility: runtime.accessibilityReport,
    });

    appendTextArtifact(
      runtime,
      ctx.runId,
      "assets_manifest",
      exportArtifacts.assetsManifest.filename,
      exportArtifacts.assetsManifest.body,
      "application/json",
    );
    appendTextArtifact(
      runtime,
      ctx.runId,
      "filenames_csv",
      exportArtifacts.filenamesCsv.filename,
      exportArtifacts.filenamesCsv.body,
      "text/csv",
    );
    appendTextArtifact(
      runtime,
      ctx.runId,
      "taxonomy",
      exportArtifacts.taxonomy.filename,
      exportArtifacts.taxonomy.body,
      "text/markdown",
    );
    appendTextArtifact(
      runtime,
      ctx.runId,
      "export_manifest",
      exportArtifacts.exportManifest.filename,
      exportArtifacts.exportManifest.body,
      "application/json",
    );

    logger.info(
      {
        runId: ctx.runId,
        assets: manifest.length,
        coverage: Number(exportArtifacts.coverage.overallCoverage.toFixed(3)),
        cap_ok: exportArtifacts.caps.ok,
        batches: exportArtifacts.batches.length,
      },
      "Pack stage completed",
    );
  });
}

function buildPromptRecords(runtime: PipelineRuntime): PromptRecord[] {
  const createdAt = new Date().toISOString();
  return runtime.hooks.map((hook, index) => ({
    schema_version: schemaVersionLiteral,
    prompt_id: `${hook.hook_id}-prompt-${index + 1}`,
    stage: "creative",
    model: "gpt-creative-1",
    model_revision: "2024.05",
    input_tokens: 320 + index * 16,
    output_tokens: 180 + index * 12,
    prompt_text: `Develop supporting narration for ${hook.hook_text.split("\n")[0]}`,
    response_ref: `${hook.hook_id}-prompt-response-${index + 1}`,
    created_at: createdAt,
  }));
}

function buildImagePromptRecords(runtime: PipelineRuntime): ImagePromptRecord[] {
  const prompts: ImagePromptRecord[] = [];
  const now = new Date().toISOString();

  for (const segment of runtime.segments) {
    const hooksForSegment = runtime.hooks.filter((hook) => hook.segment_id === segment.segment_id);
    if (hooksForSegment.length === 0) {
      continue;
    }

    TARGET_ARCHETYPES.forEach((archetype, archetypeIndex) => {
      const hook = hooksForSegment[archetypeIndex % hooksForSegment.length];
      TARGET_FORMATS.forEach((ratio, formatIndex) => {
        const promptId = `${segment.segment_id}-${archetype}-${ratio}`;
        prompts.push({
          schema_version: schemaVersionLiteral,
          prompt_id: promptId,
          segment_id: segment.segment_id,
          archetype,
          hook_id: hook.hook_id,
          variant: formatIndex === 0 ? "A" : "B",
          aspect_ratio: ratio,
          prompt_text: `Create a ${archetype} depiction for ${segment.name} highlighting "${hook.hook_text
            .split("\n")[0]
            .slice(0, 60)}" in ${ratio} framing`,
          style_category: archetype,
          color_scheme: formatIndex % 2 === 0 ? "complementary" : "analogous",
          composition_type: formatIndex % 2 === 0 ? "centered" : "rule-of-thirds",
          visual_elements: ["product", "text-overlay", "background"],
          model: "omni-image-1",
          model_revision: "2024-05-01",
          input_tokens: 240 + formatIndex * 12,
          output_tokens: 520 + archetypeIndex * 10,
          generated_image_ref: `${slugify(segment.segment_id)}-${slugify(archetype)}-${ratio}.png`,
          created_at: now,
          metadata: {
            seed: runtime.seed + archetypeIndex * 31 + formatIndex * 17,
            guidance_scale: 7.5,
            steps: 30,
          },
        });
      });
    });
  }

  return prompts;
}

function buildStoryboards(runtime: PipelineRuntime): StoryboardRecord[] {
  return runtime.hooks.map((hook) => {
    const segmentName = runtime.segments.find((segment) => segment.segment_id === hook.segment_id)?.name ?? "Segment";
    const overlayBase = hook.hook_text.split("\n")[0];
    return {
      storyboard_id: `${hook.hook_id}-storyboard`,
      hook_id: hook.hook_id,
      frames: [
        {
          frame_id: `${hook.hook_id}-frame-1`,
          sequence: 1,
          overlay_text: `${segmentName}: ${overlayBase.slice(0, 28)}`,
          voiceover: overlayBase,
          accessibility: { safe_area: true, captions: true, contrast_ratio: 4.9 },
        },
        {
          frame_id: `${hook.hook_id}-frame-2`,
          sequence: 2,
          overlay_text: "See the gaps disappear",
          voiceover: "Show the workflow win",
          accessibility: { safe_area: true, captions: true, contrast_ratio: 4.7 },
        },
        {
          frame_id: `${hook.hook_id}-frame-3`,
          sequence: 3,
          overlay_text: "Act on live insights now",
          voiceover: "Deliver the CTA",
          accessibility: { safe_area: true, captions: true, contrast_ratio: 4.8 },
        },
      ],
    } satisfies StoryboardRecord;
  });
}

function assembleManifest(runtime: PipelineRuntime, runId: string): AssetsManifestRecord[] {
  if (runtime.imagePrompts.length === 0) {
    throw new Error("No image prompts available for manifest assembly");
  }

  return runtime.imagePrompts.map((prompt, index) => {
    const dimensions = FORMAT_DIMENSIONS[prompt.aspect_ratio] ?? FORMAT_DIMENSIONS["9:16"];
    const assetId = `${runId}-asset-${index + 1}`;
    const filename = `${slugify(prompt.segment_id)}-${slugify(prompt.archetype)}-${prompt.variant}-${prompt.aspect_ratio}.png`;
    const checksum = createHash("sha256")
      .update(`${prompt.segment_id}|${prompt.archetype}|${prompt.variant}|${prompt.aspect_ratio}|${index}`)
      .digest("hex")
      .slice(0, 32);

    return {
      schema_version: schemaVersionLiteral,
      asset_id: assetId,
      segment_id: prompt.segment_id,
      archetype: prompt.archetype,
      hook_id: prompt.hook_id,
      ratio: prompt.aspect_ratio,
      variant: prompt.variant,
      filename,
      checksum,
      license_tag: "generated",
      created_at: new Date().toISOString(),
      file_size: 524288 + index * 2048,
      dimensions,
      prompt_id: prompt.prompt_id,
      style_category: prompt.style_category,
      color_scheme: prompt.color_scheme,
      composition_type: prompt.composition_type,
    } satisfies AssetsManifestRecord;
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
  contentType = "text/plain",
) {
  const normalizedBody = body.endsWith("\n") ? body : `${body}\n`;
  writeArtifact(
    runtime,
    runId,
    artifactStageForType(artifactType),
    artifactType,
    filename,
    contentType,
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
    case "hooks_device_mix":
      return "hooks";
    case "ssr_config":
    case "ssr_results":
      return "ssr";
    case "prompts":
    case "image_prompts":
    case "storyboards":
      return "creative";
    case "qa_report":
    case "near_duplicate_report":
    case "accessibility_report":
      return "qa";
    case "assets_manifest":
    case "filenames_csv":
    case "taxonomy":
    case "export_manifest":
      return "pack";
    default:
      return "creative";
  }
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}
