import { describe, it, expect } from "vitest";
import { generateQaReport } from "./index.js";
import type { HookRecord } from "@slate/schemas";

describe("QA Service", () => {
  const mockHooks: HookRecord[] = [
    {
      schema_version: "0.1.0",
      hook_id: "hook-1",
      segment_id: "segment-1",
      device: "mobile",
      hook_text: "Save money on groceries today",
      proof_ref: "proof-1",
      novelty: 0.8,
      min_distance: 0.3,
      legal_risk: [],
    },
    {
      schema_version: "0.1.0",
      hook_id: "hook-2",
      segment_id: "segment-1",
      device: "desktop",
      hook_text: "Click here to save money on groceries today and find out more about our amazing deals",
      proof_ref: "proof-2",
      novelty: 0.7,
      min_distance: 0.4,
      legal_risk: ["health-claim"],
    },
    {
      schema_version: "0.1.0",
      hook_id: "hook-3",
      segment_id: "segment-2",
      device: "mobile",
      hook_text: "This innovative premium solution will transform your life with our ultimate game changer technology",
      proof_ref: "proof-3",
      novelty: 0.6,
      min_distance: 0.2,
      legal_risk: [],
    },
    {
      schema_version: "0.1.0",
      hook_id: "hook-4",
      segment_id: "segment-2",
      device: "desktop",
      hook_text: "This line has way too many words and should fail the accessibility check because it exceeds the maximum word count per line limit",
      proof_ref: "proof-4",
      novelty: 0.5,
      min_distance: 0.1,
      legal_risk: [],
    },
  ];

  it("should generate QA report with all checks", () => {
    const result = generateQaReport({
      runId: "test-run-123",
      hooks: mockHooks,
    });

    expect(result.filename).toBe("test-run-123-qa_report.json");
    
    const report = JSON.parse(result.body);
    expect(report.schema_version).toBeDefined();
    expect(report.run_id).toBe("test-run-123");
    expect(report.generated_at).toBeDefined();
    expect(report.summary).toBeDefined();
    expect(report.checks).toBeDefined();
    expect(Array.isArray(report.checks)).toBe(true);
  });

  it("should detect atomicity violations", () => {
    const result = generateQaReport({
      runId: "test-run-atomicity",
      hooks: [mockHooks[1]], // Contains "click here" and "find out"
    });

    const report = JSON.parse(result.body);
    const atomicityCheck = report.checks.find((check: any) => 
      check.check_id === "hook-2-atomicity"
    );
    
    expect(atomicityCheck).toBeDefined();
    expect(atomicityCheck.status).toBe("fail");
    expect(atomicityCheck.message).toContain("external references");
  });

  it("should detect accessibility violations", () => {
    const result = generateQaReport({
      runId: "test-run-accessibility",
      hooks: [mockHooks[3]], // Long line with many words
    });

    const report = JSON.parse(result.body);
    const accessibilityCheck = report.checks.find((check: any) => 
      check.check_id === "hook-4-accessibility"
    );
    
    expect(accessibilityCheck).toBeDefined();
    expect(accessibilityCheck.status).toBe("fail");
    expect(accessibilityCheck.message).toContain("words (max 12)");
  });

  it("should detect banlist violations", () => {
    const result = generateQaReport({
      runId: "test-run-banlist",
      hooks: [mockHooks[2]], // Contains multiple banlist terms
    });

    const report = JSON.parse(result.body);
    const banlistCheck = report.checks.find((check: any) => 
      check.check_id === "hook-3-banlist"
    );
    
    expect(banlistCheck).toBeDefined();
    expect(banlistCheck.status).toBe("fail");
    expect(banlistCheck.message).toContain("Banlist terms detected");
  });

  it("should detect legal risk violations", () => {
    const result = generateQaReport({
      runId: "test-run-legal",
      hooks: [mockHooks[1]], // Has legal_risk
    });

    const report = JSON.parse(result.body);
    const legalCheck = report.checks.find((check: any) => 
      check.check_id === "hook-2-legal-tags"
    );
    
    expect(legalCheck).toBeDefined();
    expect(legalCheck.status).toBe("fail");
    expect(legalCheck.message).toContain("Legal risks identified");
  });

  it("should pass all checks for clean hooks", () => {
    const result = generateQaReport({
      runId: "test-run-clean",
      hooks: [mockHooks[0]], // Clean hook
    });

    const report = JSON.parse(result.body);
    const checks = report.checks.filter((check: any) => 
      check.check_id.startsWith("hook-1-")
    );
    
    // Should have atomicity, accessibility, banlist, legal-tags, thin-site-fallback, and similarity checks
    expect(checks.length).toBe(6);
    
    // All individual checks should pass
    checks.forEach((check: any) => {
      expect(check.status).toBe("pass");
    });
  });

  it("should calculate token similarity correctly", () => {
    const similarHooks: HookRecord[] = [
      {
        schema_version: "0.1.0",
        hook_id: "similar-1",
        segment_id: "segment-1",
        device: "mobile",
        hook_text: "Save money on groceries today",
        proof_ref: "proof-1",
        novelty: 0.8,
        min_distance: 0.3,
        legal_risk: [],
      },
      {
        schema_version: "0.1.0",
        hook_id: "similar-2",
        segment_id: "segment-1",
        device: "desktop",
        hook_text: "Save money on groceries today with deals",
        proof_ref: "proof-2",
        novelty: 0.7,
        min_distance: 0.4,
        legal_risk: [],
      },
    ];

    const result = generateQaReport({
      runId: "test-run-similarity",
      hooks: similarHooks,
    });

    const report = JSON.parse(result.body);
    const similarityChecks = report.checks.filter((check: any) => 
      check.check_id.includes("near-duplicate-similarity")
    );
    
    expect(similarityChecks.length).toBe(2);
    // Check that similarity checks exist and have proper messages
    similarityChecks.forEach((check: any) => {
      expect(check.message).toContain("similarity");
    });
  });
});
