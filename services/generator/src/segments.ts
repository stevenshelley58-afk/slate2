import { schemaVersionLiteral } from "@slate/schemas";
import { SEGMENT_RULES } from "@slate/business-rules";

import { createRng, randomInt, type Rng } from "./random.js";
import type {
  SegmentCandidate,
  ScoredSegment,
  SegmentSelection,
} from "./types.js";

const DEFAULT_MIN_SELECTED = SEGMENT_RULES.MIN_SELECTED;
const DEFAULT_MAX_SELECTED = SEGMENT_RULES.MAX_SELECTED;
const MIN_CENTROID_GAP = SEGMENT_RULES.MIN_CENTROID_GAP;

export function selectSegments(
  candidates: SegmentCandidate[],
  seed: number,
): SegmentSelection {
  const rng = createRng(seed);
  
  if (candidates.length === 0) {
    return { scores: [], selected: [] };
  }

  const scored = scoreSegments(candidates, rng);
  const selected = selectTopSegments(scored, rng);
  
  return {
    scores: scored.map(s => ({
      schema_version: schemaVersionLiteral,
      segment_id: s.segment_id,
      intent: s.intent,
      margin: s.margin,
      proof: s.proof,
      novelty: s.novelty,
      evidence_weight: s.evidence_weight,
      claim_risk: s.claim_risk,
      total: s.total,
    })),
    selected,
  };
}

function scoreSegments(candidates: SegmentCandidate[], rng: Rng): ScoredSegment[] {
  return candidates.map(candidate => {
    const score = scoreSegment(candidate, rng);
    
    const scored: ScoredSegment = {
      schema_version: schemaVersionLiteral,
      segment_id: candidate.segment_id,
      intent: score.intent,
      margin: score.margin,
      proof: score.proof,
      novelty: score.novelty,
      evidence_weight: score.evidence_weight,
      claim_risk: score.claim_risk,
      total: score.total,
      name: candidate.name,
      centroid: candidate.centroid,
      persona_support: candidate.personaSupport,
      coverage_contribution: candidate.coverage ?? 0,
    };

    // Schema validation removed; assume contracts validated upstream

    return scored;
  });
}

function scoreSegment(candidate: SegmentCandidate, _rng: Rng) {
  // Base scores from candidate data
  const intent = clamp(candidate.demand, 0, 1);
  const margin = clamp(candidate.margin, 0, 1);
  const proof = clamp(candidate.proof, 0, 1);
  const novelty = clamp(candidate.novelty, 0, 1);
  const evidence_weight = clamp(candidate.evidence, 0, 1);
  const claim_risk = clamp(1 - candidate.risk, 0, 1); // Invert risk to get safety score

  // Calculate weighted total with persona support
  const personaWeight = candidate.personaSupport.reduce((sum, support) => sum + support.weight, 0);
  const total = clamp(
    (intent * 0.25 + margin * 0.2 + proof * 0.2 + novelty * 0.15 + evidence_weight * 0.1 + claim_risk * 0.1) +
    (personaWeight * 0.05),
    0,
    1
  );

  return {
    intent,
    margin,
    proof,
    novelty,
    evidence_weight,
    claim_risk,
    total,
  };
}

function selectTopSegments(scored: ScoredSegment[], rng: Rng): ScoredSegment[] {
  // Sort by total score descending
  const sorted = [...scored].sort((a, b) => b.total - a.total);
  
  const minSelected = Math.min(DEFAULT_MIN_SELECTED, sorted.length);
  const maxSelected = Math.min(DEFAULT_MAX_SELECTED, sorted.length);
  const targetCount = randomInt(rng, minSelected, maxSelected);
  
  const selected: ScoredSegment[] = [];
  const usedCentroids: number[][] = [];
  
  for (const segment of sorted) {
    if (selected.length >= targetCount) break;
    
    // Check centroid distance constraint
    const tooClose = usedCentroids.some(centroid => 
      calculateDistance(segment.centroid, centroid) < MIN_CENTROID_GAP
    );
    
    if (!tooClose) {
      selected.push(segment);
      usedCentroids.push(segment.centroid);
    }
  }
  
  // If we don't have enough segments due to centroid constraints, fill with remaining top scores
  if (selected.length < minSelected) {
    const remaining = sorted.filter(s => !selected.includes(s));
    const needed = minSelected - selected.length;
    selected.push(...remaining.slice(0, needed));
  }
  
  return selected;
}

function calculateDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) return 1; // Max distance for mismatched dimensions
  
  const sumSquaredDiffs = a.reduce((sum, val, i) => {
    const diff = val - b[i];
    return sum + diff * diff;
  }, 0);
  
  return Math.sqrt(sumSquaredDiffs);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
