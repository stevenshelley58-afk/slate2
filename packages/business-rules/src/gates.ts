import type {
  HookRecord,
  BriefRecord,
  AssetsManifestRecord,
} from "@slate/schemas";
import {
  BANLIST_TERMS,
  DISTANCE_THRESHOLDS,
  NOVELTY_FLOORS,
  STYLE_RULES,
  COVERAGE_TARGET,
  SEGMENT_CAPS,
  SSR_GATES,
} from "./constants.js";

export type GateEvaluation = {
  ok: boolean;
  reason?: string;
};

export function enforceBanlist(text: string): GateEvaluation {
  const normalized = text.toLowerCase();
  for (const term of BANLIST_TERMS) {
    if (normalized.includes(term)) {
      return {
        ok: false,
        reason: `Banlist term detected: ${term}`,
      };
    }
  }
  return { ok: true };
}

export function enforceHookStructure(hook: HookRecord): GateEvaluation {
  const [firstLine, ...rest] = hook.hook_text.split("\n");
  const firstLineWords = firstLine.trim().split(/\s+/);

  if (firstLineWords.length > STYLE_RULES.firstLineMaxWords) {
    return {
      ok: false,
      reason: `Line 1 exceeds ${STYLE_RULES.firstLineMaxWords}-word cap`,
    };
  }

  const remainingWords =
    rest.join(" ").trim().length === 0
      ? 0
      : rest
          .join(" ")
          .trim()
          .split(/\s+/).length;

  if (firstLineWords.length + remainingWords > 30) {
    return { ok: false, reason: "Hook copy too long for mute readability" };
  }

  if (!/\b\d+(?:[.,]\d+)?\b/.test(hook.hook_text)) {
    return {
      ok: false,
      reason: "Hook must contain a concrete number or detail",
    };
  }

  return enforceBanlist(hook.hook_text);
}

export function enforceDistance(novelty: number, minDistance: number) {
  if (novelty < NOVELTY_FLOORS.copy) {
    return {
      ok: false,
      reason: `Novelty ${novelty.toFixed(2)} below floor ${NOVELTY_FLOORS.copy}`,
    };
  }

  if (minDistance >= DISTANCE_THRESHOLDS.hook) {
    return { ok: false, reason: "Hook too similar to existing corpus" };
  }

  return { ok: true };
}

export function enforceBrief(brief: BriefRecord): GateEvaluation {
  if (brief.placements.length < 3) {
    return { ok: false, reason: "Brief must cover all placement ratios" };
  }

  for (const placement of brief.placements) {
    if (placement.frames.some((frame) => frame.split(/\s+/).length > 12)) {
      return {
        ok: false,
        reason: "One or more placement frames exceed 12 words",
      };
    }
  }

  return enforceBanlist(brief.single_claim);
}

export function enforceCoverage(coverage: number): GateEvaluation {
  if (coverage < COVERAGE_TARGET) {
    return {
      ok: false,
      reason: `Coverage ${coverage.toFixed(2)} below target ${COVERAGE_TARGET}`,
    };
  }
  return { ok: true };
}

export function enforceSegmentCaps(manifest: AssetsManifestRecord[]): GateEvaluation {
  const bySegment = new Map<string, number>();
  const bySegmentArchetype = new Map<string, number>();

  for (const asset of manifest) {
    bySegment.set(asset.segment_id, (bySegment.get(asset.segment_id) ?? 0) + 1);
    const key = `${asset.segment_id}:${asset.archetype}`;
    bySegmentArchetype.set(key, (bySegmentArchetype.get(key) ?? 0) + 1);
  }

  for (const [segment, count] of bySegment) {
    if (count > SEGMENT_CAPS.perSegment) {
      return {
        ok: false,
        reason: `Segment ${segment} exceeds cap ${SEGMENT_CAPS.perSegment}`,
      };
    }
  }

  for (const [key, count] of bySegmentArchetype) {
    if (count > SEGMENT_CAPS.perArchetype) {
      return {
        ok: false,
        reason: `Archetype allocation ${key} exceeds cap ${SEGMENT_CAPS.perArchetype}`,
      };
    }
  }

  return { ok: true };
}

export type SsrMetrics = {
  relevanceMean: number;
  ks: number;
  entropy: number;
  entropyCoverageRatio: number;
  bimodalShare: number;
  separation: number;
  purchaseIntentMean?: number;
  purchaseIntentHighMass?: number;
  fastTrack?: boolean;
};

export function enforceSsr(metrics: SsrMetrics): GateEvaluation {
  if (metrics.relevanceMean < SSR_GATES.relevanceMeanMin) {
    return {
      ok: false,
      reason: `Relevance mean ${metrics.relevanceMean.toFixed(
        2,
      )} below ${SSR_GATES.relevanceMeanMin}`,
    };
  }

  if (metrics.ks < SSR_GATES.ksMin) {
    return {
      ok: false,
      reason: `KS ${metrics.ks.toFixed(2)} below ${SSR_GATES.ksMin}`,
    };
  }

  if (metrics.entropy < SSR_GATES.entropyMin) {
    return {
      ok: false,
      reason: `Entropy ${metrics.entropy.toFixed(
        2,
      )} below ${SSR_GATES.entropyMin}`,
    };
  }

  if (metrics.entropyCoverageRatio < SSR_GATES.entropyCoverage) {
    return {
      ok: false,
      reason: `Entropy coverage ${metrics.entropyCoverageRatio.toFixed(
        2,
      )} below ${SSR_GATES.entropyCoverage}`,
    };
  }

  if (metrics.bimodalShare < SSR_GATES.bimodalShare) {
    return {
      ok: false,
      reason: `Bimodal share ${metrics.bimodalShare.toFixed(
        2,
      )} below ${SSR_GATES.bimodalShare}`,
    };
  }

  if (metrics.separation < SSR_GATES.separationMin) {
    return {
      ok: false,
      reason: `Top-2 separation ${metrics.separation.toFixed(
        2,
      )} below ${SSR_GATES.separationMin}`,
    };
  }

  if (
    metrics.purchaseIntentMean !== undefined &&
    metrics.purchaseIntentMean < SSR_GATES.purchaseIntentMeanMin
  ) {
    return {
      ok: false,
      reason: `PI mean ${metrics.purchaseIntentMean.toFixed(
        2,
      )} below ${SSR_GATES.purchaseIntentMeanMin}`,
    };
  }

  if (
    metrics.purchaseIntentHighMass !== undefined &&
    metrics.purchaseIntentHighMass < SSR_GATES.purchaseIntentHighMass
  ) {
    return {
      ok: false,
      reason: `PI high-mass ${metrics.purchaseIntentHighMass.toFixed(
        2,
      )} below ${SSR_GATES.purchaseIntentHighMass}`,
    };
  }

  if (metrics.fastTrack && metrics.entropy > SSR_GATES.fastTrackEntropyMax) {
    return {
      ok: false,
      reason: `Fast-track entropy ${metrics.entropy.toFixed(
        2,
      )} exceeds ${SSR_GATES.fastTrackEntropyMax}`,
    };
  }

  if (
    metrics.fastTrack &&
    metrics.purchaseIntentMean !== undefined &&
    metrics.purchaseIntentMean < SSR_GATES.fastTrackMean
  ) {
    return {
      ok: false,
      reason: `Fast-track PI mean ${metrics.purchaseIntentMean.toFixed(
        2,
      )} below ${SSR_GATES.fastTrackMean}`,
    };
  }

  return { ok: true };
}
