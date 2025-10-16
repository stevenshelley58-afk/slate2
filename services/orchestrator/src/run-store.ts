import { randomUUID } from "crypto";
import { RunStateMachine } from "@slate/state-machine";
import type { RunStage, RunStateSnapshot } from "@slate/state-machine";
import type { PipelineRuntime, ArtifactEnvelope, SegmentSummary } from "./pipeline-types.js";
import { registerPipeline } from "./pipeline.js";
import { logger } from "./logger.js";

type RunRecord = {
  machine: RunStateMachine;
  runtime: PipelineRuntime;
  seed: number;
};

export class InMemoryRunStore {
  private readonly runs = new Map<string, RunRecord>();

  async createRun(params: {
    tenantId: string;
    url: string;
    anchorSetVersion: string;
    modelRevision: string;
    locale: string;
    currency: string;
    autopilotEnabled?: boolean;
    seed?: number;
  }): Promise<RunStateSnapshot> {
    const runId = randomUUID();
    const machine = new RunStateMachine();
    const context = machine.initializeContext({
      runId,
      tenantId: params.tenantId,
      sourceUrl: params.url,
      anchorSetVersion: params.anchorSetVersion,
      modelRevision: params.modelRevision,
      locale: params.locale,
      currency: params.currency,
      autopilotEnabled: params.autopilotEnabled ?? false,
    });

    const runtime: PipelineRuntime = {
      context,
      seed: params.seed ?? Date.now(),
      artifacts: [],
      segments: [],
      maps: [],
      hooks: [],
    };

    registerPipeline(machine, runtime);
    this.attachLogging(machine);

    this.runs.set(runId, { machine, runtime, seed: runtime.seed });
    await machine.start(context);
    return machine.snapshot(context);
  }

  getRun(runId: string): RunStateSnapshot | undefined {
    const record = this.runs.get(runId);
    if (!record) {
      return undefined;
    }
    return record.machine.snapshot(record.runtime.context);
  }

  async resume(runId: string, stage: RunStage): Promise<RunStateSnapshot> {
    const record = this.runs.get(runId);
    if (!record) {
      throw new Error(`Run ${runId} not found`);
    }
    await record.machine.resumeFromBlocked(record.runtime.context, stage);
    return record.machine.snapshot(record.runtime.context);
  }

  listArtifacts(runId: string, stage?: RunStage): ArtifactEnvelope[] {
    const record = this.runs.get(runId);
    if (!record) {
      throw new Error(`Run ${runId} not found`);
    }
    const artifacts = record.runtime.artifacts;
    if (!stage) {
      return artifacts;
    }
    return artifacts.filter((artifact) => artifact.stage === stage);
  }

  getSegments(runId: string): SegmentSummary[] {
    const record = this.runs.get(runId);
    if (!record) {
      throw new Error(`Run ${runId} not found`);
    }
    return record.runtime.segments;
  }

  getSeed(runId: string): number {
    const record = this.runs.get(runId);
    if (!record) {
      throw new Error(`Run ${runId} not found`);
    }
    return record.seed;
  }

  private attachLogging(machine: RunStateMachine) {
    machine.on("stage:started", (ctx, progress) => {
      logger.info({ runId: ctx.runId, stage: progress.stage }, "Stage started");
    });

    machine.on("stage:completed", (ctx, progress) => {
      logger.info(
        { runId: ctx.runId, stage: progress.stage },
        "Stage completed",
      );
    });

    machine.on("stage:blocked", (ctx, progress) => {
      logger.warn(
        {
          runId: ctx.runId,
          stage: progress.stage,
          reason: progress.blockingReason,
        },
        "Stage blocked",
      );
    });

    machine.on("stage:failed", (ctx, progress, error) => {
      logger.error(
        {
          runId: ctx.runId,
          stage: progress.stage,
          reason: progress.blockingReason,
          error,
        },
        "Stage failed",
      );
    });
  }
}
