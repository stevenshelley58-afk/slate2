import { schemaVersionLiteral } from "@slate/schemas";
import {
  BANLIST_TERMS,
  DISTANCE_THRESHOLDS,
  NOVELTY_FLOORS,
  STYLE_RULES,
} from "@slate/business-rules";

import {
  createRng,
  deriveSeed,
  randomInt,
  shuffleInPlace,
} from "./random.js";
import type {
  DeviceMixSummary,
  HookGeneration,
  MessageMapGeneration,
  SegmentInput,
} from "./types.js";

const NOVELTY_SPREAD = 0.28;

const DEVICES: HookGeneration["device"][] = [
  "mobile",
  "desktop",
  "story",
  "square",
];

type SegmentDeviceState = {
  device: HookGeneration["device"];
  count: number;
};

const DISTANCE_RANGE: [number, number] = [0.2, 0.9];

export function generateHooks(
  segments: SegmentInput[],
  maps: MessageMapGeneration[],
  seed: number,
): HookGeneration[] {
  const baseSeed = deriveSeed(seed, "hooks");
  const records: HookGeneration[] = [];

  for (const segment of segments) {
    const segmentSeed = deriveSeed(baseSeed, segment.segment_id);
    const segmentRng = createRng(segmentSeed);
    const map = maps.find((candidate) => candidate.segment_id === segment.segment_id);
    if (!map) {
      throw new Error(`Missing message map for segment ${segment.segment_id}`);
    }

    const deviceCycle = buildDeviceCycle(segmentRng);

    for (let hookIndex = 0; hookIndex < 5; hookIndex += 1) {
      const device = rotateDevice(deviceCycle);
      const hookSeed = deriveSeed(segmentSeed, `${segment.segment_id}-${hookIndex}`);
      const hookRng = createRng(hookSeed);

      const proofRef = map.proof.source_ref;
      const novelty = generateNovelty(hookRng);
      const minDistance = generateDistance(hookRng);
      const legal_risk = sliceLegalRisk(map.legal_risk, hookRng);

      const hookText = buildHookText({
        segmentName: segment.name,
        map,
        device,
        rng: hookRng,
      });

      enforceStyle(hookText);
      enforceBanlist(hookText);

      const record: HookGeneration = {
        schema_version: schemaVersionLiteral,
        hook_id: `${segment.segment_id}-hook-${hookIndex + 1}`,
        segment_id: segment.segment_id,
        device,
        hook_text: hookText,
        proof_ref: proofRef,
        novelty,
        min_distance: minDistance,
        legal_risk,
      };

      records.push(record);
    }
  }

  return records;
}

function buildDeviceCycle(rng: ReturnType<typeof createRng>): SegmentDeviceState[] {
  const order = shuffleInPlace(rng, [...DEVICES]);
  return order.map((device) => ({ device, count: 0 }));
}

export function summarizeDeviceMix(hooks: HookGeneration[]): DeviceMixSummary[] {
  const bySegment = new Map<string, Record<HookGeneration["device"], number>>();
  for (const hook of hooks) {
    let counts = bySegment.get(hook.segment_id);
    if (!counts) {
      counts = { mobile: 0, desktop: 0, story: 0, square: 0 };
      bySegment.set(hook.segment_id, counts);
    }
    counts[hook.device] += 1;
  }
  return Array.from(bySegment.entries()).map(([segment_id, counts]) => ({
    segment_id,
    counts,
  }));
}

function rotateDevice(states: SegmentDeviceState[]): HookGeneration["device"] {
  const next = states.reduce((least, current) =>
    current.count < least.count ? current : least,
  states[0]);
  next.count += 1;
  return next.device;
}

function generateNovelty(rng: ReturnType<typeof createRng>): number {
  const floor = NOVELTY_FLOORS.copy + 0.02;
  const ceiling = Math.min(1, floor + NOVELTY_SPREAD);
  return roundTwoDecimals(floor + rng() * (ceiling - floor));
}

function generateDistance(rng: ReturnType<typeof createRng>): number {
  const minimum = Math.max(DISTANCE_THRESHOLDS.hook, DISTANCE_RANGE[0]);
  const value = minimum + rng() * (DISTANCE_RANGE[1] - minimum);
  return roundTwoDecimals(value);
}

function sliceLegalRisk(flags: string[], rng: ReturnType<typeof createRng>) {
  if (flags.length === 0) {
    return [] as string[];
  }
  const count = randomInt(rng, 0, Math.min(2, flags.length));
  if (count === 0) {
    return [] as string[];
  }
  return shuffleInPlace(rng, [...flags]).slice(0, count);
}

function buildHookText(params: {
  segmentName: string;
  map: MessageMapGeneration;
  device: HookGeneration["device"];
  rng: ReturnType<typeof createRng>;
}): string {
  const { segmentName, map, device, rng } = params;
  const opening = deriveOpeningLine(segmentName, map.problem, device, rng);
  const proofLine = `Proof: ${map.proof.source_ref}`;
  const ctaLine = map.cta;
  return `${opening}\n${proofLine}\n${ctaLine}`;
}

function deriveOpeningLine(
  segmentName: string,
  problem: string,
  device: HookGeneration["device"],
  rng: ReturnType<typeof createRng>,
): string {
  const segmentLabel = segmentName.replace(/[^a-z0-9]+/gi, " ").trim() || "Segment";
  const prefixOptions: Record<HookGeneration["device"], string[]> = {
    mobile: ["Hey", "Quick", "Tap"],
    desktop: ["Note", "Fix", "Try"],
    story: ["Story", "Quick", "Tap"],
    square: ["Square", "Tip", "Check"],
  };
  const vocab = prefixOptions[device];
  const prefix = vocab[randomInt(rng, 0, vocab.length - 1)];
  const core = problem
    .replace("%segment%", segmentLabel)
    .replace("%obstacle%", "gaps");
  const line = `${prefix} ${segmentLabel}: ${core}`;
  const trimmed = line.replace(/\s+/g, " ").trim();
  const result = capitalizeFirst(trimmed);
  
  // Ensure first line meets style requirements
  const words = result.split(" ");
  if (words.length > STYLE_RULES.firstLineMaxWords) {
    const shortPrefix = ["Hey", "Fix", "Try", "Tap"][randomInt(rng, 0, 3)];
    return `${shortPrefix} ${segmentLabel}: Fix ${core.split(" ").slice(0, 4).join(" ")}`;
  }
  
  return result;
}

function capitalizeFirst(text: string): string {
  if (!text) {
    return text;
  }
  return text[0].toUpperCase() + text.slice(1);
}

function enforceStyle(text: string) {
  const [firstLine] = text.split("\n");
  const wordCount = firstLine
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  if (wordCount > STYLE_RULES.firstLineMaxWords) {
    throw new Error("Hook violates style rule: first line too long");
  }
}

function enforceBanlist(text: string) {
  const lower = text.toLowerCase();
  for (const term of BANLIST_TERMS) {
    if (lower.includes(term)) {
      throw new Error(`Hook violates banlist term: ${term}`);
    }
  }
}


function roundTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

