export const BANLIST_TERMS = new Set([
  "innovative",
  "next level",
  "elevate",
  "premium",
  "crafted",
  "perfect",
  "ultimate",
  "powerful",
  "unlock",
  "transform",
  "boost",
  "game changer",
]);

export const DISTANCE_THRESHOLDS = {
  hook: 0.82,
  cross_run: 0.78,
  cluster_min: 0.22,
};

export const NOVELTY_FLOORS = {
  idea: 0.25,
  copy: 0.18,
};

export const STYLE_RULES = {
  firstLineMaxWords: 9,
};

export const COVERAGE_TARGET = 0.8;

export const SEGMENT_CAPS = {
  perSegment: 12,
  perArchetype: 2,
};

export const SSR_GATES = {
  relevanceMeanMin: 3.8,
  ksMin: 0.85,
  entropyMin: 1.2,
  entropyCoverage: 0.7,
  bimodalShare: 0.3,
  separationMin: 0.15,
  purchaseIntentMeanMin: 4.1,
  purchaseIntentHighMass: 0.7,
  fastTrackMean: 4.3,
  fastTrackEntropyMax: 1.2,
};

export const SEGMENT_RULES = {
  MIN_SELECTED: 3,
  MAX_SELECTED: 5,
  MIN_CENTROID_GAP: 0.22,
} as const;

export const HOOK_RULES = {
  MIN_PER_SEGMENT: 5,
  DEVICES: [
    "contrast",
    "statistic",
    "command",
    "micro-story",
    "objection-flip",
  ] as const,
} as const;
