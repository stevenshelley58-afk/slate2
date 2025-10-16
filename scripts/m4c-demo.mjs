#!/usr/bin/env node

import { runSSR } from "../services/andronoma-adapter/dist/index.js";
import { SSR_GATES } from "../packages/business-rules/dist/constants.js";

// Mock persona and hook for testing
const mockPersona = {
  schema_version: "0.1.0",
  persona_id: "demo-persona-1",
  name: "Ops Manager Mia",
  jtbd: "Keep refill inventory stable without overbuying.",
  context: "Runs weekly restocks for a wellness subscription brand.",
  trigger: "Upcoming seasonal promotion spikes demand forecasts.",
  blocker: "Manual spreadsheets hide low-stock variants.",
  price_sensitivity: "medium",
  confidence_level: 0.75,
  evidence_refs: ["pdp#logistics", "faq#restock-window"],
  weight: 0.4
};

const mockHook = {
  schema_version: "0.1.0",
  hook_id: "demo-hook-1",
  segment_id: "demo-segment-1",
  device: "mobile",
  hook_text: "Inventory alerts prevent stockouts 87% faster than manual tracking",
  proof_ref: "analytics#inventory-tracking",
  novelty: 0.65,
  min_distance: 0.78,
  legal_risk: []
};

console.log("M4C Demo: SSR Stage + Gates");
console.log("==========================");
console.log();

// Test SSR with gates enforcement
const seed = 12345;
const ssrResult = runSSR(mockPersona, mockHook, seed, "mock");

console.log("SSR Result:");
console.log(`  Mean: ${ssrResult.mean}`);
console.log(`  Entropy: ${ssrResult.entropy}`);
console.log(`  KS Score: ${ssrResult.ks_score}`);
console.log(`  Bimodal: ${ssrResult.bimodal}`);
console.log(`  Separation: ${ssrResult.separation}`);
console.log();

console.log("SSR Gates from business-rules:");
console.log(`  Relevance Mean Min: ${SSR_GATES.relevanceMeanMin}`);
console.log(`  KS Min: ${SSR_GATES.ksMin}`);
console.log(`  Entropy Min: ${SSR_GATES.entropyMin}`);
console.log(`  Entropy Coverage: ${SSR_GATES.entropyCoverage}`);
console.log(`  Bimodal Share: ${SSR_GATES.bimodalShare}`);
console.log(`  Separation Min: ${SSR_GATES.separationMin}`);
console.log();

// Manual gate evaluation
const gateResults = [];
gateResults.push({
  name: "Relevance Mean",
  passed: ssrResult.mean >= SSR_GATES.relevanceMeanMin,
  actual: ssrResult.mean,
  threshold: SSR_GATES.relevanceMeanMin
});

gateResults.push({
  name: "KS Score",
  passed: ssrResult.ks_score >= SSR_GATES.ksMin,
  actual: ssrResult.ks_score,
  threshold: SSR_GATES.ksMin
});

gateResults.push({
  name: "Entropy",
  passed: ssrResult.entropy >= SSR_GATES.entropyMin,
  actual: ssrResult.entropy,
  threshold: SSR_GATES.entropyMin
});

gateResults.push({
  name: "Bimodal Share",
  passed: ssrResult.bimodal >= SSR_GATES.bimodalShare,
  actual: ssrResult.bimodal,
  threshold: SSR_GATES.bimodalShare
});

gateResults.push({
  name: "Separation",
  passed: ssrResult.separation >= SSR_GATES.separationMin,
  actual: ssrResult.separation,
  threshold: SSR_GATES.separationMin
});

console.log("Gate Evaluation:");
gateResults.forEach(gate => {
  const status = gate.passed ? "✓ PASS" : "✗ FAIL";
  console.log(`  ${gate.name}: ${status} (${gate.actual} vs ${gate.threshold})`);
});

const passedGates = gateResults.filter(g => g.passed).length;
const totalGates = gateResults.length;
const passRate = passedGates / totalGates;

console.log();
console.log(`Overall: ${passedGates}/${totalGates} gates passed (${(passRate * 100).toFixed(1)}%)`);

if (passRate >= 0.7) {
  console.log("✓ SSR would pass stage gates");
} else {
  console.log("✗ SSR would fail stage gates");
}

console.log();
console.log("API Response Format (mock):");
console.log(JSON.stringify({
  run_id: "demo-run-123",
  thresholds: {
    relevance_mean_min: SSR_GATES.relevanceMeanMin,
    ks_min: SSR_GATES.ksMin,
    entropy_min: SSR_GATES.entropyMin,
    entropy_coverage: SSR_GATES.entropyCoverage,
    bimodal_share: SSR_GATES.bimodalShare,
    separation_min: SSR_GATES.separationMin,
  },
  summary: {
    total_combinations: 1,
    passed_gates: passedGates,
    pass_rate: passRate,
  },
  results: [{
    persona_id: mockPersona.persona_id,
    hook_id: mockHook.hook_id,
    result: ssrResult,
    gate_evaluation: {
      ok: passRate >= 0.7,
      reason: passRate < 0.7 ? "Pass rate below 70%" : undefined
    }
  }]
}, null, 2));

console.log();
console.log("Demo completed successfully! ✓");
