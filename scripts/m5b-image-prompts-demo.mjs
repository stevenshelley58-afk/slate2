#!/usr/bin/env node

import { 
  generateImagePrompts, 
  validateImagePromptVariants, 
  generateVarianceMetrics, 
  printValidationReport 
} from "../services/generator/dist/index.js";

// Mock hook data for testing
const mockHooks = [
  {
    schema_version: "0.1.0",
    hook_id: "segment-1-hook-1",
    segment_id: "segment-1",
    device: "mobile",
    hook_text: "Hey Tech Enthusiasts: Fix performance gaps in your apps",
    proof_ref: "proof-123",
    novelty: 0.75,
    min_distance: 0.3,
    legal_risk: []
  },
  {
    schema_version: "0.1.0", 
    hook_id: "segment-1-hook-2",
    segment_id: "segment-1",
    device: "desktop",
    hook_text: "Note Developers: Try optimizing your code for better results",
    proof_ref: "proof-124",
    novelty: 0.68,
    min_distance: 0.4,
    legal_risk: []
  },
  {
    schema_version: "0.1.0",
    hook_id: "segment-2-hook-1", 
    segment_id: "segment-2",
    device: "story",
    hook_text: "Story Creators: Quick tips for engaging content",
    proof_ref: "proof-125",
    novelty: 0.82,
    min_distance: 0.25,
    legal_risk: []
  }
];

console.log("🎨 M5B Image Prompts Demo");
console.log("========================\n");

// Generate image prompts
console.log("Generating image prompts for hooks...");
const imagePrompts = generateImagePrompts(mockHooks, 12345);

console.log(`Generated ${imagePrompts.length} hook prompt sets\n`);

// Display generated prompts
imagePrompts.forEach((promptSet, index) => {
  console.log(`📱 Hook ${index + 1}: ${promptSet.hook_id}`);
  promptSet.variants.forEach((variant, variantIndex) => {
    console.log(`  Variant ${variantIndex + 1} (${variant.variant_type}):`);
    console.log(`    🎯 Prompt: ${variant.prompt}`);
    console.log(`    💡 Lighting: ${variant.lighting}`);
    console.log(`    📐 Negative Space: ${variant.negative_space}%`);
    console.log(`    🎨 Style Tokens: [${variant.style_tokens.join(", ")}]`);
    console.log("");
  });
});

// Validate the generated prompts
console.log("🔍 Validating image prompt variants...");
const validationResult = validateImagePromptVariants(imagePrompts);
const metrics = generateVarianceMetrics(imagePrompts);

// Print validation report
printValidationReport(validationResult, metrics);

// Test deterministic behavior
console.log("\n🔄 Testing deterministic behavior...");
const imagePrompts2 = generateImagePrompts(mockHooks, 12345);
const validationResult2 = validateImagePromptVariants(imagePrompts2);

const isDeterministic = JSON.stringify(imagePrompts) === JSON.stringify(imagePrompts2);
console.log(`Deterministic output: ${isDeterministic ? "✅ YES" : "❌ NO"}`);

if (!isDeterministic) {
  console.log("❌ Output is not deterministic - this violates requirements!");
} else {
  console.log("✅ Output is deterministic as required");
}

console.log("\n🎯 Demo completed successfully!");
