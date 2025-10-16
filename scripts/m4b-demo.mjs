#!/usr/bin/env node

import { runSSR } from "../services/andronoma-adapter/dist/index.js";

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

console.log("M4B Demo: Andronoma Adapter SSR");
console.log("=================================");
console.log();

// Test deterministic behavior with same seed
const seed = 12345;
console.log(`Testing with seed: ${seed}`);
console.log();

const results1 = runSSR(mockPersona, mockHook, seed, "mock");
const results2 = runSSR(mockPersona, mockHook, seed, "mock");

console.log("First run:");
console.log(`  Mean: ${results1.mean}`);
console.log(`  Entropy: ${results1.entropy}`);
console.log(`  KS Score: ${results1.ks_score}`);
console.log(`  Bimodal: ${results1.bimodal}`);
console.log(`  Separation: ${results1.separation}`);
console.log();

console.log("Second run (should be identical):");
console.log(`  Mean: ${results2.mean}`);
console.log(`  Entropy: ${results2.entropy}`);
console.log(`  KS Score: ${results2.ks_score}`);
console.log(`  Bimodal: ${results2.bimodal}`);
console.log(`  Separation: ${results2.separation}`);
console.log();

// Verify deterministic behavior
const isDeterministic = 
  results1.mean === results2.mean &&
  results1.entropy === results2.entropy &&
  results1.ks_score === results2.ks_score &&
  results1.bimodal === results2.bimodal &&
  results1.separation === results2.separation;

console.log(`Deterministic: ${isDeterministic ? "✓ PASS" : "✗ FAIL"}`);
console.log();

// Test with different seed
const seed2 = 67890;
const results3 = runSSR(mockPersona, mockHook, seed2, "mock");

console.log(`Testing with different seed: ${seed2}`);
console.log(`  Mean: ${results3.mean}`);
console.log(`  Entropy: ${results3.entropy}`);
console.log(`  KS Score: ${results3.ks_score}`);
console.log(`  Bimodal: ${results3.bimodal}`);
console.log(`  Separation: ${results3.separation}`);
console.log();

// Test with different persona/hook
const mockPersona2 = { ...mockPersona, persona_id: "demo-persona-2" };
const mockHook2 = { ...mockHook, hook_id: "demo-hook-2" };
const results4 = runSSR(mockPersona2, mockHook2, seed, "mock");

console.log("Testing with different persona/hook:");
console.log(`  Mean: ${results4.mean}`);
console.log(`  Entropy: ${results4.entropy}`);
console.log(`  KS Score: ${results4.ks_score}`);
console.log(`  Bimodal: ${results4.bimodal}`);
console.log(`  Separation: ${results4.separation}`);
console.log();

console.log("PMF (Probability Mass Function):");
console.log(`  [1]: ${results1.pmf[0].toFixed(3)}`);
console.log(`  [2]: ${results1.pmf[1].toFixed(3)}`);
console.log(`  [3]: ${results1.pmf[2].toFixed(3)}`);
console.log(`  [4]: ${results1.pmf[3].toFixed(3)}`);
console.log(`  [5]: ${results1.pmf[4].toFixed(3)}`);
console.log(`  Sum: ${results1.pmf.reduce((sum, val) => sum + val, 0).toFixed(3)}`);
console.log();

console.log("Response IDs:");
results1.ids.forEach((id, idx) => {
  console.log(`  ${idx + 1}: ${id}`);
});

console.log();
console.log("Demo completed successfully! ✓");
