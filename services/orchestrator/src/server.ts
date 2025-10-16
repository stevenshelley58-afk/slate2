import Fastify from "fastify";
import {
  RUN_STAGES,
  type StageProgress,
  type RunStateSnapshot,
  type RunStage,
} from "@slate/state-machine";
import { RunSummarySchema, RunStageLiteral } from "@slate/api-types";
import {
  STYLE_RULES,
  NOVELTY_FLOORS,
  DISTANCE_THRESHOLDS,
  SSR_GATES,
} from "@slate/business-rules";
import { InMemoryRunStore } from "./run-store.js";
import { logger } from "./logger.js";

const fastify = Fastify({
  logger,
});

const runStore = new InMemoryRunStore();

fastify.post("/runs", async (request, reply) => {
  const body = request.body as {
    url: string;
    tenant_id?: string;
    locale?: string;
    currency?: string;
    autopilot_enabled?: boolean;
    seed?: number;
  };

  if (!body?.url) {
    reply.status(400);
    return { error: "url is required" };
  }

  const snapshot = await runStore.createRun({
    tenantId: body.tenant_id ?? "demo-tenant",
    url: body.url,
    anchorSetVersion: process.env.ANCHOR_SET_VERSION ?? "andronoma-2024-10-01",
    modelRevision: process.env.MODEL_REVISION ?? "responses-2024-09-30",
    locale: body.locale ?? "en-US",
    currency: body.currency ?? "USD",
    autopilotEnabled: body.autopilot_enabled ?? false,
    seed: body.seed,
  });

  return serializeRun(snapshot);
});

fastify.get("/runs/:runId", async (request, reply) => {
  const { runId } = request.params as { runId: string };
  const snapshot = runStore.getRun(runId);
  if (!snapshot) {
    reply.status(404);
    return { error: "Run not found" };
  }

  return serializeRun(snapshot);
});

fastify.get("/runs/:runId/stages", async (request, reply) => {
  const { runId } = request.params as { runId: string };
  const snapshot = runStore.getRun(runId);
  if (!snapshot) {
    reply.status(404);
    return { error: "Run not found" };
  }

  return {
    run_id: snapshot.runId,
    stages: snapshot.stages.map(serializeStage),
  };
});

fastify.get("/runs/:runId/artifacts", async (request, reply) => {
  const { runId } = request.params as { runId: string };
  const stageParam = (request.query as { stage?: string })?.stage;

  let stage: RunStage | undefined;
  if (stageParam) {
    const parsed = RunStageLiteral.safeParse(stageParam);
    if (!parsed.success) {
      reply.status(400);
      return { error: "Invalid stage parameter" };
    }
    stage = parsed.data;
  }

  try {
    const artifacts = runStore.listArtifacts(runId, stage);
    if (artifacts.length === 0) {
      reply.status(404);
      return { error: "No artifacts available for this run" };
    }
    return {
      run_id: runId,
      ...(stage ? { stage } : {}),
      artifacts: artifacts.map((artifact) => ({
        artifact_type: artifact.artifactType,
        filename: artifact.filename,
        content_type: artifact.contentType,
        body: artifact.body,
      })),
    };
  } catch (error) {
    reply.status(404);
    return { error: (error as Error).message };
  }
});

fastify.get("/segments", async (request, reply) => {
  const { run_id: runId } = request.query as { run_id?: string };
  if (!runId) {
    reply.status(400);
    return { error: "run_id is required" };
  }

  try {
    const segments = runStore.getSegments(runId);
    return {
      run_id: runId,
      thresholds: {
        style_rules: {
          first_line_max_words: STYLE_RULES.firstLineMaxWords,
        },
        novelty: {
          idea_floor: NOVELTY_FLOORS.idea,
          copy_floor: NOVELTY_FLOORS.copy,
        },
        distance: {
          hook: DISTANCE_THRESHOLDS.hook,
          cross_run: DISTANCE_THRESHOLDS.cross_run,
        },
        ssr: {
          relevance_mean_min: SSR_GATES.relevanceMeanMin,
          ks_min: SSR_GATES.ksMin,
          entropy_min: SSR_GATES.entropyMin,
          entropy_coverage: SSR_GATES.entropyCoverage,
          bimodal_share: SSR_GATES.bimodalShare,
          separation_min: SSR_GATES.separationMin,
        },
      },
      segments,
    };
  } catch (error) {
    reply.status(404);
    return { error: (error as Error).message };
  }
});

fastify.get("/runs/:runId/ssr", async (request, reply) => {
  const { runId } = request.params as { runId: string };
  
  try {
    const artifacts = runStore.listArtifacts(runId, "ssr");
    const ssrResults = artifacts.find(a => a.artifactType === "ssr_results");
    
    if (!ssrResults) {
      reply.status(404);
      return { error: "SSR results not found for this run" };
    }
    
    const ssrData = JSON.parse(ssrResults.body);
    
    return {
      run_id: runId,
      thresholds: {
        relevance_mean_min: SSR_GATES.relevanceMeanMin,
        ks_min: SSR_GATES.ksMin,
        entropy_min: SSR_GATES.entropyMin,
        entropy_coverage: SSR_GATES.entropyCoverage,
        bimodal_share: SSR_GATES.bimodalShare,
        separation_min: SSR_GATES.separationMin,
      },
      summary: {
        total_combinations: ssrData.total_combinations,
        passed_gates: ssrData.passed_gates,
        pass_rate: ssrData.pass_rate,
      },
      results: ssrData.results,
    };
  } catch (error) {
    request.log.error({ err: error }, "Failed to get SSR results");
    reply.status(404);
    return { error: (error as Error).message };
  }
});

fastify.post("/runs/:runId/resume", async (request, reply) => {
  const { runId } = request.params as { runId: string };
  const body = request.body as { stage: RunStage };

  if (!body?.stage || !RUN_STAGES.includes(body.stage)) {
    reply.status(400);
    return { error: "Valid stage is required" };
  }

  try {
    const snapshot = await runStore.resume(runId, body.stage);
    return serializeRun(snapshot);
  } catch (error) {
    request.log.error({ err: error }, "Failed to resume stage");
    reply.status(400);
    return { error: (error as Error).message };
  }
});

function serializeRun(snapshot: RunStateSnapshot) {
  const payload = {
    run_id: snapshot.runId,
    tenant_id: snapshot.tenantId,
    anchor_set_version: snapshot.anchorSetVersion,
    model_revision: snapshot.modelRevision,
    url: snapshot.url,
    locale: snapshot.locale,
    currency: snapshot.currency,
    created_at: snapshot.createdAt.toISOString(),
    updated_at: snapshot.updatedAt.toISOString(),
    current_stage: snapshot.currentStage,
    autopilot_enabled: snapshot.autopilotEnabled,
    stages: snapshot.stages.map(serializeStage),
  };

  return RunSummarySchema.parse(payload);
}

function serializeStage(stage: StageProgress) {
  return {
    stage: stage.stage,
    status: stage.status,
    entered_at: stage.enteredAt?.toISOString() ?? null,
    exited_at: stage.exitedAt?.toISOString() ?? null,
    gate: stage.status === "blocked" ? stage.stage : undefined,
    blocking_reason: stage.blockingReason ?? null,
  };
}

export async function start() {
  const port = Number(process.env.PORT ?? 3333);
  const host = process.env.HOST ?? "0.0.0.0";
  await fastify.listen({ port, host });
  logger.info({ port, host }, "Orchestrator listening");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  start().catch((error) => {
    logger.fatal({ err: error }, "Failed to start orchestrator");
    process.exitCode = 1;
  });
}
