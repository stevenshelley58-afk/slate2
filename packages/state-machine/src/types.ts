export const RUN_STAGES = [
  "queued",
  "scraping",
  "personas",
  "segments",
  "maps",
  "hooks",
  "briefs",
  "ssr",
  "creative",
  "qa",
  "pack",
  "done",
  "failed",
] as const;

export type RunStage = (typeof RUN_STAGES)[number];

export type StageStatus = "pending" | "active" | "blocked" | "completed" | "failed";

export type StageDefinition = {
  name: RunStage;
  autopilotPause?: boolean;
};

export type StageProgress = {
  stage: RunStage;
  enteredAt?: Date;
  exitedAt?: Date;
  status: StageStatus;
  blockingReason?: string;
};

export type ScrapeRunStats = {
  pagesCrawled: number;
  totalTextBytes: number;
  mediaCount: number;
  blockedByRobots: number;
  maxDepthReached: number;
  durationMs: number;
};

export type ScrapeRunMetadata = {
  thinSite: boolean;
  stats: ScrapeRunStats;
};

export type RunContext = {
  runId: string;
  tenantId: string;
  sourceUrl: string;
  anchorSetVersion: string;
  modelRevision: string;
  locale: string;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
  currentStage: RunStage;
  autopilotEnabled: boolean;
  stages: Map<RunStage, StageProgress>;
  scrape?: ScrapeRunMetadata;
};

export type StageHandler = (
  context: RunContext,
) => Promise<void> | void;

export type RunStateSnapshot = {
  runId: string;
  tenantId: string;
  anchorSetVersion: string;
  modelRevision: string;
  url: string;
  locale: string;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
  currentStage: RunStage;
  stages: StageProgress[];
  autopilotEnabled: boolean;
  scrape?: ScrapeRunMetadata;
};
