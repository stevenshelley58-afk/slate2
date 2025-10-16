import { schemaVersionLiteral } from "@slate/schemas";

import { deriveSeed, createRng, randomInt, shuffleInPlace } from "./random.js";
import type { MessageMapGeneration, SegmentInput } from "./types.js";

const PROBLEM_TEMPLATES = [
  "When %segment% face %obstacle%, ops stall.",
  "%segment% lose time to %obstacle% at launch.",
  "%segment% teams misread %obstacle% and miss goals.",
  "%segment% scramble because %obstacle% hides margin leaks.",
];

const OBJECTION_TEMPLATES = [
  "%segment% worry this takes quarters, not weeks.",
  "%segment% assume legacy tools already cover %obstacle%.",
  "Budget owners cite sunk costs and delay fixing %obstacle%.",
  "%segment% doubt the data stays clean enough to tame %obstacle%.",
];

const OUTCOME_TEMPLATES = [
  "%segment% align teams in under 30 days with %benefit%.",
  "%segment% refocus spend and surface %benefit% fast.",
  "%segment% catch leaks early and unlock %benefit%.",
  "%segment% forecast confidently thanks to %benefit%.",
];

const CTA_TEMPLATES = [
  "Schedule a 20-minute walkthrough.",
  "See the scorecard on live data.",
  "Audit last quarter's promos with a specialist.",
  "Start a guided trial with ops coaching.",
];

const PROOF_SOURCES = [
  "faq#sla",
  "case#inventory",
  "case#automation",
  "pdp#ops",
  "review#buyer-insight",
];

const LEGAL_FLAGS = ["claims-review", "pricing", "testimonial", "copy-review"];

const OBSTACLES = [
  "inventory blind spots",
  "manual bundle tracking",
  "promo attribution gaps",
  "stale margin reports",
  "slow vendor approvals",
];

const BENEFITS = [
  "predictive replenishment",
  "live margin guardrails",
  "campaign-ready insights",
  "single source of ops truth",
  "collaborative launch checklists",
];

export function generateMessageMaps(
  segments: SegmentInput[],
  seed: number,
): MessageMapGeneration[] {
  const baseSeed = deriveSeed(seed, "message-maps");
  const records: MessageMapGeneration[] = [];

  for (const segment of segments) {
    const segmentSeed = deriveSeed(baseSeed, segment.segment_id);
    const segmentRng = createRng(segmentSeed);
    const obstacle = pick(segmentRng, OBSTACLES);
    const benefit = pick(segmentRng, BENEFITS);
    const problem = fillTemplate(segmentRng, PROBLEM_TEMPLATES, segment.name, {
      obstacle,
      benefit,
    });
    const objection = fillTemplate(segmentRng, OBJECTION_TEMPLATES, segment.name, {
      obstacle,
      benefit,
    });
    const outcome = fillTemplate(segmentRng, OUTCOME_TEMPLATES, segment.name, {
      obstacle,
      benefit,
    });
    const cta = pick(segmentRng, CTA_TEMPLATES);
    const proofRef = pick(segmentRng, PROOF_SOURCES);

    const legalCount = randomInt(segmentRng, 0, 1) === 0 ? 0 : 1;
    const legal_risk =
      legalCount === 0
        ? []
        : shuffleInPlace(segmentRng, [...LEGAL_FLAGS]).slice(0, legalCount);

    const record = {
      schema_version: schemaVersionLiteral,
      segment_id: segment.segment_id,
      problem,
      objection,
      outcome,
      proof: {
        type: proofRef.startsWith("case") ? "case-study" : "primary",
        source_ref: proofRef,
      },
      cta,
      legal_risk,
    };

    records.push(record as MessageMapGeneration);
  }

  return records;
}

function fillTemplate(
  rng: ReturnType<typeof createRng>,
  templates: string[],
  segmentName: string,
  tokens: { obstacle: string; benefit: string },
): string {
  const template = pick(rng, templates);
  return applyTokens(template, {
    segment: normalizeSegmentName(segmentName),
    obstacle: tokens.obstacle,
    benefit: tokens.benefit,
  });
}

function pick<T>(rng: ReturnType<typeof createRng>, values: readonly T[]): T {
  const index = randomInt(rng, 0, values.length - 1);
  return values[index];
}

function normalizeSegmentName(name: string): string {
  return name.replace(/[^a-z0-9]+/gi, " ").trim() || "Segment";
}

function applyTokens(template: string, values: Record<string, string>): string {
  return template.replace(/%([a-z]+)%/gi, (_, key: string) => {
    const resolved = values[key.toLowerCase()];
    return resolved ?? `%${key}%`;
  });
}

