import { createHash } from "crypto";
import {
  STYLE_RULES,
  NOVELTY_FLOORS,
  DISTANCE_THRESHOLDS,
  SSR_GATES,
} from "@slate/business-rules";

export const THRESHOLD_SNAPSHOT = Object.freeze({
  style_rules: Object.freeze({
    first_line_max_words: STYLE_RULES.firstLineMaxWords,
  }),
  novelty: Object.freeze({
    idea_floor: NOVELTY_FLOORS.idea,
    copy_floor: NOVELTY_FLOORS.copy,
  }),
  distance: Object.freeze({
    hook: DISTANCE_THRESHOLDS.hook,
    cross_run: DISTANCE_THRESHOLDS.cross_run,
  }),
  ssr: Object.freeze({
    relevance_mean_min: SSR_GATES.relevanceMeanMin,
    ks_min: SSR_GATES.ksMin,
    entropy_min: SSR_GATES.entropyMin,
    entropy_coverage: SSR_GATES.entropyCoverage,
    bimodal_share: SSR_GATES.bimodalShare,
    separation_min: SSR_GATES.separationMin,
    purchase_intent_mean_min: SSR_GATES.purchaseIntentMeanMin,
    purchase_intent_high_mass: SSR_GATES.purchaseIntentHighMass,
    fast_track_mean: SSR_GATES.fastTrackMean,
    fast_track_entropy_max: SSR_GATES.fastTrackEntropyMax,
  }),
} as const);

export type ThresholdSnapshot = typeof THRESHOLD_SNAPSHOT;

export const THRESHOLD_HASH = createHash("sha256")
  .update(JSON.stringify(THRESHOLD_SNAPSHOT))
  .digest("hex");
