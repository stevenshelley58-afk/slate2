import { randomUUID } from "crypto";
import { RunStateMachine } from "@slate/state-machine";
import type { RunContext, RunStage, RunStateSnapshot } from "@slate/state-machine";
import { logger } from "./logger.js";

type RunRecord = {
  context: RunContext;
  machine: RunStateMachine;
};

export class InMemoryRunStore {
  private readonly runs = new Map<string, RunRecord>();

  constructor(private readonly machineFactory: () => RunStateMachine) {}

  createRun(params: {
    tenantId: string;
    url: string;
    anchorSetVersion: string;
    modelRevision: string;
    locale: string;
    currency: string;
    autopilotEnabled?: boolean;
  }): RunStateSnapshot {
    const runId = randomUUID();
    const machine = this.machineFactory();
    const context = machine.initializeContext({
      runId,
      tenantId: params.tenantId,
      sourceUrl: params.url,
      anchorSetVersion: params.anchorSetVersion,
      modelRevision: params.modelRevision,
      locale: params.locale,
      currency: params.currency,
      autopilotEnabled: params.autopilotEnabled,
    });

    this.attachLogging(machine);

    this.runs.set(runId, { context, machine });
    void machine.start(context);
    return machine.snapshot(context);
  }

  getRun(runId: string): RunStateSnapshot | undefined {
    const record = this.runs.get(runId);
    return record?.machine.snapshot(record.context);
  }

  async resume(runId: string, stage: RunStage): Promise<RunStateSnapshot> {
    const record = this.runs.get(runId);
    if (!record) {
      throw new Error(`Run ${runId} not found`);
    }
    await record.machine.resumeFromBlocked(record.context, stage);
    return record.machine.snapshot(record.context);
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
