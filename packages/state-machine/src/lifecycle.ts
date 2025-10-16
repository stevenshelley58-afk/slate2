import EventEmitter from "eventemitter3";
import {
  RUN_STAGES,
  type RunStage,
  type StageDefinition,
  type StageHandler,
  type RunContext,
  type StageProgress,
  type RunStateSnapshot,
} from "./types.js";

export type LifecycleEvents = {
  "stage:blocked": [RunContext, StageProgress];
  "stage:started": [RunContext, StageProgress];
  "stage:completed": [RunContext, StageProgress];
  "stage:failed": [RunContext, StageProgress, unknown];
};

export const DEFAULT_LIFECYCLE: StageDefinition[] = [
  { name: "queued" },
  { name: "scraping" },
  { name: "personas" },
  { name: "segments", autopilotPause: true },
  { name: "maps" },
  { name: "hooks" },
  { name: "briefs" },
  { name: "ssr", autopilotPause: true },
  { name: "creative" },
  { name: "qa", autopilotPause: true },
  { name: "pack" },
  { name: "done" },
];

export const AUTOPILOT_GATES: RunStage[] = DEFAULT_LIFECYCLE.filter(
  (stage) => stage.autopilotPause,
).map((stage) => stage.name);

export class RunStateMachine extends EventEmitter<LifecycleEvents> {
  private readonly handlers = new Map<RunStage, StageHandler>();

  constructor(
    private readonly lifecycle: StageDefinition[] = DEFAULT_LIFECYCLE,
  ) {
    super();
  }

  registerHandler(stage: RunStage, handler: StageHandler) {
    this.handlers.set(stage, handler);
  }

  initializeContext(params: {
    runId: string;
    tenantId: string;
    sourceUrl: string;
    anchorSetVersion: string;
    modelRevision: string;
    locale: string;
    currency: string;
    autopilotEnabled?: boolean;
  }): RunContext {
    const now = new Date();
    const stages = new Map<RunStage, StageProgress>();

    for (const stage of RUN_STAGES) {
      stages.set(stage, {
        stage,
        status: stage === "queued" ? "active" : "pending",
        enteredAt: stage === "queued" ? now : undefined,
      });
    }

    return {
      runId: params.runId,
      tenantId: params.tenantId,
      sourceUrl: params.sourceUrl,
      anchorSetVersion: params.anchorSetVersion,
      modelRevision: params.modelRevision,
      locale: params.locale,
      currency: params.currency,
      createdAt: now,
      updatedAt: now,
      currentStage: "queued",
      autopilotEnabled: params.autopilotEnabled ?? true,
      stages,
    };
  }

  async start(context: RunContext) {
    await this.advance(context, "queued");
  }

  async resumeFromBlocked(context: RunContext, stage: RunStage) {
    const progress = context.stages.get(stage);
    if (!progress || progress.status !== "blocked") {
      throw new Error(`Stage ${stage} is not blocked`);
    }
    progress.status = "active";
    progress.enteredAt = new Date();
    this.emit("stage:started", context, progress);
    await this.executeStageHandler(context, stage, progress);
    await this.advance(context, stage);
  }

  private async advance(context: RunContext, fromStage: RunStage) {
    const currentIndex = this.lifecycle.findIndex(
      (definition) => definition.name === fromStage,
    );

    if (currentIndex === -1) {
      throw new Error(`Stage ${fromStage} not found in lifecycle`);
    }

    for (let i = currentIndex; i < this.lifecycle.length; i += 1) {
      const definition = this.lifecycle[i];
      const progress = context.stages.get(definition.name);
      if (!progress) {
        continue;
      }

      if (progress.status === "completed") {
        continue;
      }

      progress.status = "active";
      progress.enteredAt ??= new Date();
      context.currentStage = definition.name;
      context.updatedAt = new Date();
      this.emit("stage:started", context, progress);

      if (definition.autopilotPause && context.autopilotEnabled) {
        progress.status = "blocked";
        progress.blockingReason = "autopilot_pause";
        progress.enteredAt = new Date();
        this.emit("stage:blocked", context, progress);
        return;
      }

      await this.executeStageHandler(context, definition.name, progress);
    }
  }

  private async executeStageHandler(
    context: RunContext,
    stage: RunStage,
    progress: StageProgress,
  ) {
    const handler = this.handlers.get(stage);
    try {
      if (handler) {
        await handler(context);
      }
      progress.status = "completed";
      progress.exitedAt = new Date();
      context.updatedAt = progress.exitedAt;
      this.emit("stage:completed", context, progress);
    } catch (error) {
      progress.status = "failed";
      progress.exitedAt = new Date();
      progress.blockingReason = (error as Error).message;
      context.currentStage = "failed";
      this.emit("stage:failed", context, progress, error);
      throw error;
    }
  }

  snapshot(context: RunContext): RunStateSnapshot {
    return {
      runId: context.runId,
      tenantId: context.tenantId,
      anchorSetVersion: context.anchorSetVersion,
      modelRevision: context.modelRevision,
      url: context.sourceUrl,
      locale: context.locale,
      currency: context.currency,
      createdAt: context.createdAt,
      updatedAt: context.updatedAt,
      currentStage: context.currentStage,
      autopilotEnabled: context.autopilotEnabled,
      stages: Array.from(context.stages.values()),
    };
  }
}
