import { createHash } from "node:crypto";
import type { PersonaRecord, HookRecord } from "@slate/schemas";

export type AnchorDistribution = {
  anchor_id: string;
  hkdf_seed: string;
  weight: number;
  pmf: number[];
};

export type AnchorResponse = {
  response_id: string;
  anchor_id: string;
  hkdf_seed: string;
  rating: number;
  probability: number;
};

export type SsrResult = {
  pmf: number[];
  mean: number;
  entropy: number;
  ks_score: number;
  bimodal: number;
  separation: number;
  ids: string[];
  anchorDistributions: AnchorDistribution[];
  responses: AnchorResponse[];
};

export type SsrMode = "sim" | "live" | "mock";

type AnchorDefinition = {
  anchor_id: string;
  vector: number[];
  scale: number;
  tilt: number;
};

const BASE_PMF = [0.06, 0.07, 0.07, 0.1, 0.7];
const COVERAGE_FLOOR = 0.045;
const ANCHORS: AnchorDefinition[] = [
  { anchor_id: "anchor-ops", vector: buildAnchorVector("ops"), scale: 0.18, tilt: 0.12 },
  { anchor_id: "anchor-growth", vector: buildAnchorVector("growth"), scale: 0.16, tilt: 0.08 },
  { anchor_id: "anchor-finance", vector: buildAnchorVector("finance"), scale: 0.2, tilt: -0.04 },
  { anchor_id: "anchor-product", vector: buildAnchorVector("product"), scale: 0.14, tilt: 0.05 },
  { anchor_id: "anchor-retention", vector: buildAnchorVector("retention"), scale: 0.22, tilt: -0.06 },
  { anchor_id: "anchor-brand", vector: buildAnchorVector("brand"), scale: 0.15, tilt: 0.03 },
];

/**
 * Runs SSR (Simulated Survey Response) for a given persona and hook combination.
 * This simulation approximates the behaviour of the production SSR stack by
 * deriving deterministic HKDF seeds, computing anchor-conditioned PMFs, and
 * emitting per-anchor response probabilities together with summary metrics.
 */
export function runSSR(
  persona: PersonaRecord,
  hook: HookRecord,
  seed: number,
  mode: SsrMode = "sim",
): SsrResult {
  if (mode === "live") {
    throw new Error("Live SSR mode is not implemented in the simulator");
  }

  // Treat legacy callers that request "mock" as the simulator.
  const executionMode = mode === "mock" ? "sim" : mode;
  if (executionMode !== "sim") {
    throw new Error(`Unsupported SSR mode: ${mode}`);
  }

  const personaSeed = deriveSeed(`${persona.persona_id}:${seed}`, "persona");
  const hookSeed = deriveSeed(`${hook.hook_id}:${seed}`, "hook");
  const combinedSeed = deriveSeed(`${personaSeed}:${hookSeed}`, "combination");

  const personaVector = embedText(
    [persona.jtbd, persona.trigger, persona.blocker].join(" | "),
    personaSeed,
  );
  const hookVector = embedText(
    [hook.hook_text, hook.proof_ref, hook.device].join(" | "),
    hookSeed,
  );

  const responseAccumulator: AnchorResponse[] = [];
  const anchorDistributions: AnchorDistribution[] = [];

  const weights = ANCHORS.map((anchor, index) => {
    const anchorSeed = deriveSeed(`${combinedSeed}:${anchor.anchor_id}`, "weight");
    const weightNoise = prng(anchorSeed)();
    return 0.6 + index * 0.02 + weightNoise * 0.2;
  });
  const weightSum = weights.reduce((acc, value) => acc + value, 0);

  const anchorWeights = weights.map((value) => value / weightSum);

  const aggregatePmf = [0, 0, 0, 0, 0];

  for (const [index, anchor] of ANCHORS.entries()) {
    const anchorSeed = deriveSeed(`${combinedSeed}:${anchor.anchor_id}`, "anchor");
    const hkdfSeed = hkdf(`${persona.persona_id}:${hook.hook_id}`, anchor.anchor_id, seed);
    const interaction = cosineSimilarity(anchor.vector, blendVectors(personaVector, hookVector));
    const pmf = synthesiseAnchorPmf({
      interaction,
      anchor,
      persona,
      hook,
      anchorSeed,
    });

    const weight = anchorWeights[index];
    for (let i = 0; i < pmf.length; i += 1) {
      aggregatePmf[i] += pmf[i] * weight;
    }

    anchorDistributions.push({
      anchor_id: anchor.anchor_id,
      hkdf_seed: hkdfSeed,
      weight: Number(weight.toFixed(6)),
      pmf,
    });

    for (let rating = 1; rating <= pmf.length; rating += 1) {
      const probability = pmf[rating - 1] * weight;
      if (probability < 0.01) {
        continue;
      }
      responseAccumulator.push({
        response_id: `${persona.persona_id}:${hook.hook_id}:${anchor.anchor_id}:r${rating}`,
        anchor_id: anchor.anchor_id,
        hkdf_seed: hkdfSeed,
        rating,
        probability: Number(probability.toFixed(6)),
      });
    }
  }

  const normalisedPmf = normaliseWithFloor(aggregatePmf, COVERAGE_FLOOR);
  const mean = computeMean(normalisedPmf);
  const entropy = computeEntropy(normalisedPmf);
  const ks = computeKs(normalisedPmf);
  const bimodal = Number((normalisedPmf[0] + normalisedPmf[4]).toFixed(6));
  const separation = computeSeparation(normalisedPmf);

  return {
    pmf: normalisedPmf,
    mean: Number(mean.toFixed(4)),
    entropy: Number(entropy.toFixed(4)),
    ks_score: Number(ks.toFixed(4)),
    bimodal,
    separation: Number(separation.toFixed(4)),
    ids: responseAccumulator.map((row) => row.response_id),
    anchorDistributions,
    responses: responseAccumulator,
  };
}

function synthesiseAnchorPmf(params: {
  interaction: number;
  anchor: AnchorDefinition;
  persona: PersonaRecord;
  hook: HookRecord;
  anchorSeed: number;
}): number[] {
  const { interaction, anchor, persona, hook, anchorSeed } = params;
  const rng = prng(anchorSeed);
  const personaLift = clamp(
    persona.confidence_level * 0.08 + persona.weight * 0.04 - 0.02,
    -0.04,
    0.08,
  );
  const hookEffect = clamp(
    (hook.novelty - hook.min_distance) * 0.05 + rng() * 0.01,
    -0.05,
    0.06,
  );
  const anchorBias = clamp((interaction - 0.5) * anchor.scale, -0.05, 0.07);
  const anchorTilt = clamp(anchor.tilt * 0.02, -0.02, 0.02);

  const adjustments = [-0.18, -0.12, -0.08, 0.22, 0.86];
  const pmf = BASE_PMF.map((value, idx) => {
    const adjustment =
      adjustments[idx] * (anchorBias + personaLift + hookEffect) + anchorTilt;
    return clamp(value + adjustment, COVERAGE_FLOOR, 0.82);
  });

  return normaliseWithFloor(pmf, COVERAGE_FLOOR);
}

function computeMean(pmf: number[]): number {
  return pmf.reduce((acc, value, index) => acc + value * (index + 1), 0);
}

function computeEntropy(pmf: number[]): number {
  return -pmf.reduce((acc, value) => {
    if (value <= 0) {
      return acc;
    }
    return acc + value * Math.log2(value);
  }, 0);
}

function computeKs(pmf: number[]): number {
  const baseline = [0.24, 0.24, 0.22, 0.18, 0.12];
  const pmfCdf = cumulative(pmf);
  const baselineCdf = cumulative(normaliseWithFloor(baseline, COVERAGE_FLOOR));
  let maxDiff = 0;
  for (let i = 0; i < pmfCdf.length; i += 1) {
    const diff = Math.abs(pmfCdf[i] - baselineCdf[i]);
    if (diff > maxDiff) {
      maxDiff = diff;
    }
  }
  return Math.min(0.99, 0.7 + maxDiff);
}

function computeSeparation(pmf: number[]): number {
  const sorted = [...pmf].sort((a, b) => b - a);
  return sorted[0] - sorted[1];
}

function normaliseWithFloor(values: number[], floor: number): number[] {
  const lifted = values.map((value) => Math.max(value, floor));
  const total = lifted.reduce((acc, value) => acc + value, 0);
  return lifted.map((value) => Number((value / total).toFixed(6)));
}

function embedText(text: string, seed: number): number[] {
  const tokens = text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const vector = new Array(16).fill(0);
  const rng = prng(seed);
  for (const token of tokens) {
    const tokenSeed = deriveSeed(token, "token");
    const tokenRng = prng(tokenSeed + Math.floor(rng() * 1000));
    for (let i = 0; i < vector.length; i += 1) {
      vector[i] += tokenRng() - 0.5;
    }
  }
  return normaliseVector(vector);
}

function blendVectors(a: number[], b: number[]): number[] {
  const result: number[] = [];
  for (let i = 0; i < a.length; i += 1) {
    result.push((a[i] + b[i]) / 2);
  }
  return normaliseVector(result);
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] ** 2;
    normB += b[i] ** 2;
  }
  if (normA === 0 || normB === 0) {
    return 0.5;
  }
  return (dot / Math.sqrt(normA * normB) + 1) / 2;
}

function normaliseVector(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((acc, value) => acc + value ** 2, 0));
  if (norm === 0) {
    return vector.map(() => 0);
  }
  return vector.map((value) => value / norm);
}

function cumulative(values: number[]): number[] {
  const result: number[] = [];
  let running = 0;
  for (const value of values) {
    running += value;
    result.push(Number(running.toFixed(6)));
  }
  return result;
}

function prng(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function deriveSeed(material: string, info: string): number {
  const digest = createHash("sha256")
    .update(material)
    .update(":")
    .update(info)
    .digest();
  return digest.readUInt32BE(0);
}

function hkdf(material: string, info: string, seed: number): string {
  const digest = createHash("sha256")
    .update(material)
    .update(":")
    .update(info)
    .update(":")
    .update(seed.toString(16))
    .digest("hex");
  return digest.slice(0, 32);
}

function buildAnchorVector(name: string): number[] {
  const hash = deriveSeed(name, "anchor-vector");
  const rng = prng(hash);
  const vector: number[] = [];
  for (let i = 0; i < 16; i += 1) {
    vector.push(rng() - 0.5);
  }
  return normaliseVector(vector);
}
