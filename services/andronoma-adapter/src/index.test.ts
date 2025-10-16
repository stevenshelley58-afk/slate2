import { describe, expect, it } from "vitest";
import type { PersonaRecord, HookRecord } from "@slate/schemas";
import { runSSR } from "./index.js";

const SSR_GATES = {
  ksMin: 0.85,
  entropyMin: 1.2,
  bimodalShare: 0.3,
  separationMin: 0.15,
  purchaseIntentHighMass: 0.7,
};

const persona: PersonaRecord = {
  schema_version: "0.1.0",
  persona_id: "persona-test",
  name: "Ops Manager Mia",
  jtbd: "Keep refill inventory stable without overbuying.",
  context: "Runs weekly restocks for a wellness subscription brand.",
  trigger: "Upcoming seasonal promotion spikes demand forecasts.",
  blocker: "Manual spreadsheets hide low-stock variants.",
  price_sensitivity: "medium",
  confidence_level: 0.76,
  evidence_refs: ["pdp#logistics", "faq#restock-window"],
  weight: 0.42,
};

const hook: HookRecord = {
  schema_version: "0.1.0",
  hook_id: "hook-test",
  segment_id: "segment-test",
  device: "mobile",
  hook_text: "Cut manual restocks by 62% with live SKU alerts.",
  proof_ref: "case-study#sku-alerts",
  novelty: 0.62,
  min_distance: 0.24,
  legal_risk: [],
};

describe("runSSR simulator", () => {
  it("produces deterministic anchor-conditioned pmfs above gating thresholds", () => {
    const resultA = runSSR(persona, hook, 1234, "sim");
    const resultB = runSSR(persona, hook, 1234, "sim");

    expect(resultA).toEqual(resultB);

    const pmfTotal = resultA.pmf.reduce((sum, value) => sum + value, 0);
    expect(pmfTotal).toBeCloseTo(1, 5);

    expect(resultA.ks_score).toBeGreaterThanOrEqual(SSR_GATES.ksMin);
    expect(resultA.entropy).toBeGreaterThanOrEqual(SSR_GATES.entropyMin);
    expect(resultA.bimodal).toBeGreaterThanOrEqual(SSR_GATES.bimodalShare);
    expect(resultA.separation).toBeGreaterThanOrEqual(SSR_GATES.separationMin);
    expect(resultA.pmf[4]).toBeGreaterThanOrEqual(SSR_GATES.purchaseIntentHighMass);

    expect(resultA.anchorDistributions).toHaveLength(6);
    for (const distribution of resultA.anchorDistributions) {
      const anchorSum = distribution.pmf.reduce((sum, value) => sum + value, 0);
      expect(anchorSum).toBeCloseTo(1, 5);
      expect(distribution.hkdf_seed).toHaveLength(32);
    }

    expect(resultA.responses.length).toBeGreaterThan(0);
    for (const response of resultA.responses) {
      expect(response.probability).toBeGreaterThan(0);
      expect(response.rating).toBeGreaterThanOrEqual(1);
      expect(response.rating).toBeLessThanOrEqual(5);
    }
  });
});
