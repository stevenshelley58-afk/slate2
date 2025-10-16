#!/usr/bin/env node

import { generateQaArtifacts } from "./dist/index.js";
import type { HookRecord, PromptRecord, ImagePromptRecord } from "@slate/schemas";
import type { StoryboardRecord } from "./dist/index.js";

const demoHooks: HookRecord[] = [
  {
    schema_version: "0.1.0",
    hook_id: "demo-clean",
    segment_id: "segment-1",
    device: "mobile",
    hook_text: "Save money on groceries today",
    proof_ref: "proof-clean",
    novelty: 0.8,
    min_distance: 0.3,
    legal_risk: [],
  },
  {
    schema_version: "0.1.0",
    hook_id: "demo-atomicity-fail",
    segment_id: "segment-1",
    device: "desktop",
    hook_text: "Click here to save money and find out more about our deals",
    proof_ref: "proof-atomicity",
    novelty: 0.7,
    min_distance: 0.4,
    legal_risk: [],
  },
];

const demoPrompts: PromptRecord[] = [
  {
    schema_version: "0.1.0",
    prompt_id: "prompt-1",
    stage: "creative",
    model: "gpt-demo",
    model_revision: "v1",
    input_tokens: 128,
    output_tokens: 256,
    prompt_text: "Generate a helpful grocery saving prompt",
    response_ref: "resp-1",
    created_at: new Date().toISOString(),
  },
  {
    schema_version: "0.1.0",
    prompt_id: "prompt-2",
    stage: "creative",
    model: "gpt-demo",
    model_revision: "v1",
    input_tokens: 0,
    output_tokens: 0,
    prompt_text: "Craft celebrity inspired grocery tips",
    response_ref: "resp-2",
    created_at: new Date().toISOString(),
  },
];

const demoImagePrompts: ImagePromptRecord[] = [
  {
    schema_version: "0.1.0",
    prompt_id: "img-1",
    segment_id: "segment-1",
    archetype: "photorealistic",
    hook_id: "demo-clean",
    variant: "A",
    aspect_ratio: "9:16",
    prompt_text: "Photorealistic portrait of a celebrity chef holding groceries",
    style_category: "photorealistic",
    color_scheme: "complementary",
    composition_type: "centered",
    visual_elements: ["product", "text-overlay"],
    model: "image-demo",
    model_revision: "v1",
    input_tokens: 120,
    output_tokens: 400,
    generated_image_ref: "segment-1-photorealistic-9:16.png",
    created_at: new Date().toISOString(),
    metadata: { seed: 42 },
  },
];

const demoStoryboards: StoryboardRecord[] = [
  {
    storyboard_id: "story-1",
    hook_id: "demo-clean",
    frames: [
      {
        frame_id: "story-1-frame-1",
        sequence: 1,
        overlay_text: "Stretch every grocery dollar",
        voiceover: "Stretch every grocery dollar",
        accessibility: { safe_area: true, captions: true, contrast_ratio: 4.8 },
      },
    ],
  },
];

console.log("🔍 QA Service Demo");
console.log("==================");
console.log();

const result = generateQaArtifacts({
  runId: "demo-run-001",
  copy: demoHooks,
  prompts: demoPrompts,
  imagePrompts: demoImagePrompts,
  storyboards: demoStoryboards,
});

console.log(`📄 Generated report: ${result.qaReport.filename}`);
console.log();

const report = JSON.parse(result.qaReport.body);
console.log(`📊 Summary: ${report.summary.status.toUpperCase()}`);
console.log(`📝 Notes: ${report.summary.notes}`);
console.log();

console.log("🔍 Check Results:");
console.log("==================");

const failedChecks = report.checks.filter((check: any) => check.status === "fail");
const passedChecks = report.checks.filter((check: any) => check.status === "pass");

if (failedChecks.length > 0) {
  console.log(`❌ Failed Checks (${failedChecks.length}):`);
  failedChecks.forEach((check: any) => {
    console.log(`  • ${check.check_id}: ${check.message}`);
  });
  console.log();
}

if (passedChecks.length > 0) {
  console.log(`✅ Passed Checks (${passedChecks.length}):`);
  passedChecks.forEach((check: any) => {
    console.log(`  • ${check.check_id}: ${check.message}`);
  });
}

console.log();
console.log("📋 Accessibility Report:");
console.log("========================");
console.log(result.accessibilityReport.body);
