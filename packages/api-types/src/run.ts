import { z } from "zod";
import {
  RUN_STAGES,
  AUTOPILOT_GATES,
  type RunStage,
} from "@slate/state-machine";

const runStages = [...RUN_STAGES] as [RunStage, ...RunStage[]];
export const RunStageLiteral = z.enum(runStages);

export type RunStageLiteral = z.infer<typeof RunStageLiteral>;

const autopilotGates = [...AUTOPILOT_GATES] as [RunStage, ...RunStage[]];
export const RunGateLiteral = z.enum(autopilotGates);
export type RunGateLiteral = z.infer<typeof RunGateLiteral>;

export const RunStageStatusSchema = z.object({
  stage: RunStageLiteral,
  entered_at: z.string().datetime().nullable(),
  exited_at: z.string().datetime().nullable(),
  status: z.enum(["pending", "active", "blocked", "completed", "failed"]),
  gate: RunGateLiteral.optional(),
  blocking_reason: z.string().optional(),
});

export type RunStageStatus = z.infer<typeof RunStageStatusSchema>;

export const RunSummarySchema = z.object({
  run_id: z.string().uuid(),
  tenant_id: z.string(),
  anchor_set_version: z.string(),
  model_revision: z.string(),
  url: z.string().url(),
  locale: z.string().default("en-US"),
  currency: z.string().default("USD"),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  current_stage: RunStageLiteral,
  stages: z.array(RunStageStatusSchema),
  autopilot_enabled: z.boolean(),
});

export type RunSummary = z.infer<typeof RunSummarySchema>;

