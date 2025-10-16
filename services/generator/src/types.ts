import type {
  HookRecord,
  MessageMapRecord,
  PersonaRecord,
  SegmentScoreRecord,
} from "@slate/schemas";

export type {
  HookRecord,
  MessageMapRecord,
  PersonaRecord,
  SegmentScoreRecord,
} from "@slate/schemas";

export type EvidenceRecord = {
  id: string;
  weight?: number;
  summary?: string;
  source?: string;
};

export type PriceSensitivitySignal = {
  tier: "low" | "medium" | "high";
  weight?: number;
};

export type ScrapeAttributes = {
  productName: string;
  primaryNeeds: string[];
  contexts?: string[];
  triggers?: string[];
  blockers?: string[];
  sentiments?: string[];
  priceSignals?: PriceSensitivitySignal[];
  evidence: EvidenceRecord[];
  personaHints?: Array<PartialPersonaHint>;
};

export type PartialPersonaHint = {
  name?: string;
  jtbd?: string;
  context?: string;
  trigger?: string;
  blocker?: string;
  price_sensitivity?: "low" | "medium" | "high";
  confidence_level?: number;
  evidence_refs?: string[];
  weight?: number;
};

export type PersonaBlueprint = PartialPersonaHint;

export type PersonaGenerationOptions = {
  minCount?: number;
  maxCount?: number;
};

export type PersonaGenerationResult = PersonaRecord[];

export type PersonaSupport = {
  persona_id: string;
  weight: number;
};

export type SegmentCandidate = {
  segment_id: string;
  name: string;
  centroid: number[];
  demand: number;
  margin: number;
  proof: number;
  novelty: number;
  evidence: number;
  risk: number;
  coverage?: number;
  personaSupport: PersonaSupport[];
};

export type ScoredSegment = SegmentScoreRecord & {
  name: string;
  centroid: number[];
  persona_support: PersonaSupport[];
  coverage_contribution: number;
};

export type SegmentSelection = {
  scores: SegmentScoreRecord[];
  selected: ScoredSegment[];
};

export type SegmentInput = {
  segment_id: string;
  name: string;
  score?: number;
};

export type MessageMapGeneration = MessageMapRecord;
export type HookGeneration = HookRecord;

export type DeviceMixSummary = {
  segment_id: string;
  counts: Record<HookRecord["device"], number>;
};

