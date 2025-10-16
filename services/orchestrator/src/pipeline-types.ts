import type { RunContext, RunStage } from "@slate/state-machine";
import type {
  HookRecord,
  MessageMapRecord,
  PromptRecord,
  ImagePromptRecord,
  QaReport,
} from "@slate/schemas";
import type { AccessibilityReport, StoryboardRecord } from "@slate/qa-service";

export type ArtifactEnvelope = {
  stage: RunStage;
  artifactType: string;
  filename: string;
  contentType: string;
  body: string;
  absolutePath: string;
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
  prompts: PromptRecord[];
  imagePrompts: ImagePromptRecord[];
  storyboards: StoryboardRecord[];
  qaReport?: QaReport;
  accessibilityReport?: AccessibilityReport;
};
