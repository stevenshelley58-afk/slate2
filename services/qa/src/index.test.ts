import { describe, it, expect } from "vitest";
import { generateQaArtifacts, type StoryboardRecord } from "./index.js";
import type { HookRecord, PromptRecord, ImagePromptRecord } from "@slate/schemas";

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
  ];

  const mockPrompts: PromptRecord[] = [
    {
      schema_version: "0.1.0",
      prompt_id: "prompt-1",
      stage: "creative",
      model: "gpt-test",
      model_revision: "v1",
      input_tokens: 128,
      output_tokens: 256,
      prompt_text: "Generate supporting copy for grocery savings",
      response_ref: "resp-1",
      created_at: new Date().toISOString(),
    },
    {
      schema_version: "0.1.0",
      prompt_id: "prompt-2",
      stage: "creative",
      model: "gpt-test",
      model_revision: "v1",
      input_tokens: 0,
      output_tokens: 0,
      prompt_text: "Craft celebrity inspired grocery tips",
      response_ref: "resp-2",
      created_at: new Date().toISOString(),
    },
  ];

  const mockImagePrompts: ImagePromptRecord[] = [
    {
      schema_version: "0.1.0",
      prompt_id: "img-1",
      segment_id: "segment-1",
      archetype: "photorealistic",
      hook_id: "hook-1",
      variant: "A",
      aspect_ratio: "9:16",
      prompt_text: "Photorealistic portrait of a celebrity chef holding groceries",
      style_category: "photorealistic",
      color_scheme: "complementary",
      composition_type: "centered",
      visual_elements: ["product", "text-overlay"],
      model: "image-test",
      model_revision: "v1",
      input_tokens: 120,
      output_tokens: 512,
      generated_image_ref: "segment-1-photorealistic-A.png",
      created_at: new Date().toISOString(),
      metadata: { seed: 42 },
    },
    {
      schema_version: "0.1.0",
      prompt_id: "img-2",
      segment_id: "segment-1",
      archetype: "illustration",
      hook_id: "hook-1",
      variant: "B",
      aspect_ratio: "1:1",
      prompt_text: "Playful illustrated basket of groceries",
      style_category: "illustration",
      color_scheme: "analogous",
      composition_type: "rule-of-thirds",
      visual_elements: ["product", "background"],
      model: "image-test",
      model_revision: "v1",
      input_tokens: 140,
      output_tokens: 480,
      generated_image_ref: "segment-1-illustration-B.png",
      created_at: new Date().toISOString(),
      metadata: { seed: 43 },
    },
  ];

  const mockStoryboards: StoryboardRecord[] = [
    {
      storyboard_id: "story-1",
      hook_id: "hook-1",
      frames: [
        {
          frame_id: "story-1-frame-1",
          sequence: 1,
          overlay_text: "Stretch every grocery dollar",
          voiceover: "Stretch every grocery dollar",
          accessibility: { safe_area: true, captions: true, contrast_ratio: 4.8 },
        },
        {
          frame_id: "story-1-frame-2",
          sequence: 2,
          overlay_text: "",
          voiceover: "See how",
          accessibility: { safe_area: false, captions: false, contrast_ratio: 4.1 },
        },
      ],
    },
  ];

  it("should generate QA artifacts with combined coverage", () => {
    const result = generateQaArtifacts({
      runId: "test-run-123",
      copy: mockHooks,
      prompts: mockPrompts,
      imagePrompts: mockImagePrompts,
      storyboards: mockStoryboards,
    });

    expect(result.qaReport.filename).toBe("test-run-123-qa_report.json");
    expect(result.nearDuplicateReport.filename).toBe("test-run-123-near_duplicate_report.csv");
    expect(result.accessibilityReport.filename).toBe("test-run-123-accessibility_report.json");

    const report = JSON.parse(result.qaReport.body);
    expect(report.schema_version).toBeDefined();
    expect(report.run_id).toBe("test-run-123");
    expect(report.checks.length).toBeGreaterThan(0);

    const accessibility = JSON.parse(result.accessibilityReport.body);
    expect(accessibility.totals.frames).toBe(2);
    expect(accessibility.totals.failing).toBe(1);
  });

  it("should detect atomicity and legal violations in copy", () => {
    const { summary } = generateQaArtifacts({
      runId: "test-run-atomic",
      copy: [mockHooks[1]],
      prompts: [],
      imagePrompts: [],
      storyboards: [],
    });

    const atomicityCheck = summary.checks.find((check) => check.check_id === "hook-2-atomicity");
    expect(atomicityCheck?.status).toBe("fail");

    const legalCheck = summary.checks.find((check) => check.check_id === "hook-2-legal");
    expect(legalCheck?.status).toBe("fail");
  });

  it("should mark likeness issues for photorealistic prompts", () => {
    const { summary } = generateQaArtifacts({
      runId: "test-run-likeness",
      copy: [],
      prompts: [],
      imagePrompts: [mockImagePrompts[0]],
      storyboards: [],
    });

    const likenessCheck = summary.checks.find((check) => check.check_id === "img-1-likeness");
    expect(likenessCheck?.status).toBe("fail");
  });
});
