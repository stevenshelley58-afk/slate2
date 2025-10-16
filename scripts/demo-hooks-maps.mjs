#!/usr/bin/env node
import { generateMessageMaps, generateHooks, summarizeDeviceMix } from "../services/generator/dist/index.js";

const segments = [
  { segment_id: "test-seg-1", name: "Inventory Planners" },
  { segment_id: "test-seg-2", name: "Fresh Subscribers" },
];

const seed = 42;

console.log("=== Message Maps ===");
const maps = generateMessageMaps(segments, seed);
for (const map of maps) {
  console.log(`\nSegment: ${map.segment_id}`);
  console.log(`Problem: ${map.problem}`);
  console.log(`Objection: ${map.objection}`);
  console.log(`Outcome: ${map.outcome}`);
  console.log(`CTA: ${map.cta}`);
  console.log(`Proof: ${map.proof.source_ref}`);
}

console.log("\n=== Hooks ===");
const hooks = generateHooks(segments, maps, seed);
for (const hook of hooks) {
  console.log(`\nHook: ${hook.hook_id} (${hook.device})`);
  console.log(`Text: ${hook.hook_text}`);
  console.log(`Novelty: ${hook.novelty}, Distance: ${hook.min_distance}`);
}

console.log("\n=== Device Mix ===");
const mix = summarizeDeviceMix(hooks);
for (const entry of mix) {
  console.log(`${entry.segment_id}: ${JSON.stringify(entry.counts)}`);
}

console.log("\n✅ Demo completed successfully");
