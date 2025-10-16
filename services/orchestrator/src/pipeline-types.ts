import type { RunContext, RunStage } from "@slate/state-machine";
import type { HookRecord, MessageMapRecord } from "@slate/schemas";

export type ArtifactEnvelope = {
  stage: RunStage;
  artifactType: string;
  filename: string;
  contentType: string;
  body: string;
  absolutePath: string;
  encoding: "utf-8" | "base64";
};

export type SegmentSummary = {
  segment_id: string;
  name: string;
  score: number;
};

export type PipelineRuntime = {
  context: RunContext;
  seed: number;
  artifacts: ArtifactEnvelope[];
  segments: SegmentSummary[];
  maps: MessageMapRecord[];
  hooks: HookRecord[];
};
