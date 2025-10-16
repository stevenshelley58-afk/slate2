import type { SegmentScoreRecord } from "@slate/schemas";

const SCORE_COMPONENT_KEYS = [
  "intent",
  "margin",
  "proof",
  "novelty",
  "evidence_weight",
] as const satisfies readonly (keyof SegmentScoreRecord)[];

export type SegmentScoreComponents = Pick<
  SegmentScoreRecord,
  "segment_id" | "intent" | "margin" | "proof" | "novelty" | "evidence_weight" | "claim_risk"
>;

function clampScore(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return Number(value.toFixed(4));
}

export function scoreSegment(record: SegmentScoreComponents): number {
  const base = SCORE_COMPONENT_KEYS.reduce((total, key) => total + record[key], 0);
  const mean = base / SCORE_COMPONENT_KEYS.length;
  const adjusted = mean * (1 - record.claim_risk * 0.5);
  return clampScore(adjusted);
}

export function scoreSegments(records: SegmentScoreComponents[]): number[] {
  return records.map((record) => scoreSegment(record));
}
