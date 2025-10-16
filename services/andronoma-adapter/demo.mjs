#!/usr/bin/env node

import { runSSR } from "./dist/index.js";

// Create test persona and hook
const testPersona = {
  schema_version: "0.1.0",
  persona_id: "test-persona-001",
  name: "Test Persona",
  jtbd: "Test job to be done",
  context: "Test context",
  trigger: "Test trigger",
  blocker: "Test blocker",
  price_sensitivity: "medium",
  confidence_level: 0.75,
  evidence_refs: ["evidence-1", "evidence-2"],
  weight: 0.5,
};

const testHook = {
  schema_version: "0.1.0",
  hook_id: "test-hook-001",
  segment_id: "test-segment",
  device: "mobile",
  hook_text: "Test hook text for mobile device",
  proof_ref: "proof-001",
  novelty: 0.8,
  min_distance: 0.2,
  legal_risk: [],
};

console.log("🔍 M4B Adapter Demo - Testing Deterministic Output");
console.log("=" .repeat(50));

const seed = 12345;
console.log(`Using seed: ${seed}`);
console.log();

// Run multiple times with same inputs to verify determinism
console.log("Running SSR 3 times with identical inputs...");
const results = [];
for (let i = 0; i < 3; i++) {
  const result = runSSR(testPersona, testHook, seed, "mock");
  results.push(result);
  console.log(`Run ${i + 1}:`);
  console.log(`  Mean: ${result.mean.toFixed(6)}`);
  console.log(`  Entropy: ${result.entropy.toFixed(6)}`);
  console.log(`  KS Score: ${result.ks_score.toFixed(6)}`);
  console.log(`  Bimodal: ${result.bimodal}`);
  console.log(`  Separation: ${result.separation.toFixed(6)}`);
  console.log(`  PMF length: ${result.pmf.length}`);
  console.log(`  IDs count: ${result.ids.length}`);
  console.log();
}

// Verify all results are identical
const allIdentical = results.every((result, i) => {
  if (i === 0) return true;
  const prev = results[i - 1];
  return (
    result.mean === prev.mean &&
    result.entropy === prev.entropy &&
    result.ks_score === prev.ks_score &&
    result.bimodal === prev.bimodal &&
    result.separation === prev.separation &&
    result.pmf.length === prev.pmf.length &&
    result.ids.length === prev.ids.length
  );
});

console.log(allIdentical ? "✅ All results are identical - Deterministic!" : "❌ Results differ - Not deterministic!");
console.log();

// Test with different seed
console.log("Testing with different seed (67890)...");
const differentResult = runSSR(testPersona, testHook, 67890, "mock");
console.log(`Different seed result:`);
console.log(`  Mean: ${differentResult.mean.toFixed(6)}`);
console.log(`  Entropy: ${differentResult.entropy.toFixed(6)}`);
console.log(`  KS Score: ${differentResult.ks_score.toFixed(6)}`);
console.log(`  Bimodal: ${differentResult.bimodal}`);
console.log();

// Verify different seed produces different results
const differentFromOriginal = (
  differentResult.mean !== results[0].mean ||
  differentResult.entropy !== results[0].entropy ||
  differentResult.ks_score !== results[0].ks_score
);

console.log(differentFromOriginal ? "✅ Different seed produces different results!" : "❌ Different seed produces same results!");

console.log();
console.log("🎯 Demo completed successfully!");
