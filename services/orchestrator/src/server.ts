import Fastify from "fastify";
import {
  RunStateMachine,
  RUN_STAGES,
  type StageProgress,
  type RunStateSnapshot,
} from "@slate/state-machine";
import { RunSummarySchema, RunStageLiteral } from "@slate/api-types";
import { registerDefaultHandlers } from "./pipeline.js";
import { InMemoryRunStore } from "./run-store.js";
import { logger } from "./logger.js";

const fastify = Fastify({
  logger,
});

const runStore = new InMemoryRunStore(() => {
  const machine = new RunStateMachine();
  registerDefaultHandlers(machine);
  return machine;
});

fastify.post("/runs", async (request, reply) => {
  const body = request.body as {
    url: string;
    tenant_id?: string;
    locale?: string;
    currency?: string;
    autopilot_enabled?: boolean;
  };

  if (!body?.url) {
    reply.status(400);
    return { error: "url is required" };
  }

  const snapshot = runStore.createRun({
    tenantId: body.tenant_id ?? "demo-tenant",
    url: body.url,
    anchorSetVersion: process.env.ANCHOR_SET_VERSION ?? "andronoma-2024-10-01",
    modelRevision: process.env.MODEL_REVISION ?? "responses-2024-09-30",
    locale: body.locale ?? "en-US",
    currency: body.currency ?? "USD",
    autopilotEnabled: body.autopilot_enabled ?? true,
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

fastify.post("/runs/:runId/resume", async (request, reply) => {
  const { runId } = request.params as { runId: string };
  const body = request.body as { stage: RunStageLiteral };

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
