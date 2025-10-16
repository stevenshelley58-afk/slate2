#!/usr/bin/env node

import { generateQaReport } from "./dist/index.js";
import type { HookRecord } from "@slate/schemas";

// Demo hooks with various issues
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
  {
    schema_version: "0.1.0",
    hook_id: "demo-banlist-fail",
    segment_id: "segment-2",
    device: "mobile",
    hook_text: "This innovative premium solution will transform your life",
    proof_ref: "proof-banlist",
    novelty: 0.6,
    min_distance: 0.2,
    legal_risk: [],
  },
  {
    schema_version: "0.1.0",
    hook_id: "demo-accessibility-fail",
    segment_id: "segment-2",
    device: "desktop",
    hook_text: "This line has way too many words and should fail the accessibility check because it exceeds the maximum word count per line limit",
    proof_ref: "proof-accessibility",
    novelty: 0.5,
    min_distance: 0.1,
    legal_risk: [],
  },
  {
    schema_version: "0.1.0",
    hook_id: "demo-legal-fail",
    segment_id: "segment-3",
    device: "mobile",
    hook_text: "Amazing health benefits guaranteed",
    proof_ref: "proof-legal",
    novelty: 0.4,
    min_distance: 0.2,
    legal_risk: ["health-claim", "guarantee"],
  },
];

console.log("🔍 QA Service Demo");
console.log("==================");
console.log();

const result = generateQaReport({
  runId: "demo-run-001",
  hooks: demoHooks,
});

console.log(`📄 Generated report: ${result.filename}`);
console.log();

const report = JSON.parse(result.body);
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
console.log("📋 Full Report:");
console.log("===============");
console.log(result.body);
