import {
  schemaVersionLiteral,
  type HookRecord,
  type PromptRecord,
  type ImagePromptRecord,
  type QaReport,
} from "@slate/schemas";
import { BANLIST_TERMS, DISTANCE_THRESHOLDS } from "@slate/business-rules";

export type QaArtifact = {
  filename: string;
  body: string;
};

export type StoryboardFrame = {
  frame_id: string;
  sequence: number;
  overlay_text: string;
  voiceover: string;
  accessibility: {
    safe_area: boolean;
    captions: boolean;
    contrast_ratio: number;
  };
};

export type StoryboardRecord = {
  storyboard_id: string;
  hook_id: string;
  frames: StoryboardFrame[];
};

export type AccessibilityReport = {
  schema_version: typeof schemaVersionLiteral;
  run_id: string;
  generated_at: string;
  totals: {
    frames: number;
    passing: number;
    failing: number;
    pass_rate: number;
  };
  frames: Array<{
    storyboard_id: string;
    frame_id: string;
    issues: string[];
    status: "pass" | "fail";
  }>;
};

export type QaCheckParams = {
  runId: string;
  copy: HookRecord[];
  prompts: PromptRecord[];
  imagePrompts: ImagePromptRecord[];
  storyboards: StoryboardRecord[];
};

export type QaArtifacts = {
  qaReport: QaArtifact;
  nearDuplicateReport: QaArtifact;
  accessibilityReport: QaArtifact;
  summary: QaReport;
  accessibility: AccessibilityReport;
};

const LEGIBILITY_MAX_LINE_WORDS = 12;
const OVERLAY_MAX_LENGTH = 42;
const CONTRAST_THRESHOLD = 4.5;

const LIKENESS_BANLIST = [
  "celebrity",
  "famous",
  "trademark",
  "brand logo",
  "lookalike",
];

function calculateTokenSimilarity(text1: string, text2: string): number {
  const tokens1 = new Set(text1.toLowerCase().split(/\s+/).filter(Boolean));
  const tokens2 = new Set(text2.toLowerCase().split(/\s+/).filter(Boolean));

  const intersection = new Set([...tokens1].filter((token) => tokens2.has(token)));
  const union = new Set([...tokens1, ...tokens2]);

  if (union.size === 0) {
    return 0;
  }

  return intersection.size / union.size;
}

function checkAtomicity(hook: HookRecord): { status: "pass" | "fail"; message: string } {
  const text = hook.hook_text.toLowerCase();
  const externalRefs = [
    "click here",
    "see more",
    "read more",
    "learn more",
    "find out",
    "check out",
    "visit",
    "go to",
    "link",
    "website",
    "page",
  ];

  const hasExternalRef = externalRefs.some((ref) => text.includes(ref));

  if (hasExternalRef) {
    return {
      status: "fail",
      message: "Copy contains external references that break atomicity",
    };
  }

  return {
    status: "pass",
    message: "Copy is self-contained and atomic",
  };
}

function checkCopyAccessibility(hook: HookRecord): { status: "pass" | "fail"; message: string } {
  const lines = hook.hook_text.split("\n");

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (line.length === 0) {
      continue;
    }

    const wordCount = line.split(/\s+/).filter(Boolean).length;
    if (wordCount > LEGIBILITY_MAX_LINE_WORDS) {
      return {
        status: "fail",
        message: `Line ${i + 1} has ${wordCount} words (max ${LEGIBILITY_MAX_LINE_WORDS})`,
      };
    }
  }

  return {
    status: "pass",
    message: "Copy meets accessibility word count guidance",
  };
}

function checkOverlayLegibility(frame: StoryboardFrame): { status: "pass" | "fail"; issues: string[] } {
  const issues: string[] = [];
  const overlay = frame.overlay_text.trim();

  if (overlay.length === 0) {
    issues.push("Overlay text missing for mute legibility");
  }

  if (overlay.split(/\s+/).length > LEGIBILITY_MAX_LINE_WORDS) {
    issues.push(`Overlay exceeds ${LEGIBILITY_MAX_LINE_WORDS} words`);
  }

  if (overlay.length > OVERLAY_MAX_LENGTH) {
    issues.push(`Overlay length ${overlay.length} exceeds limit ${OVERLAY_MAX_LENGTH}`);
  }

  const uppercaseRatio = overlay.replace(/[^A-Z]/g, "").length / Math.max(overlay.length, 1);
  if (uppercaseRatio > 0.6) {
    issues.push("Overlay relies on excessive uppercase characters");
  }

  if (!frame.accessibility.safe_area) {
    issues.push("Overlay not within safe area");
  }

  if (!frame.accessibility.captions) {
    issues.push("Captions missing for mute playback");
  }

  if (frame.accessibility.contrast_ratio < CONTRAST_THRESHOLD) {
    issues.push(`Contrast ratio ${frame.accessibility.contrast_ratio.toFixed(1)} below ${CONTRAST_THRESHOLD}`);
  }

  return {
    status: issues.length === 0 ? "pass" : "fail",
    issues,
  };
}

function checkBanlist(hook: HookRecord | PromptRecord): { status: "pass" | "fail"; message: string } {
  const text = "hook_text" in hook ? hook.hook_text : hook.prompt_text;
  const lowerHook = text.toLowerCase();
  const banHits = Array.from(BANLIST_TERMS).filter((term) => lowerHook.includes(term));

  if (banHits.length > 0) {
    return {
      status: "fail",
      message: `Banlist terms detected: ${banHits.join(", ")}`,
    };
  }

  return {
    status: "pass",
    message: "No banlist terms found",
  };
}

function checkNearDuplicateSimilarity(hooks: HookRecord[]): Array<{
  hookId: string;
  status: "pass" | "fail";
  message: string;
  similarity: number;
  similarHookId: string;
}> {
  const results: Array<{
    hookId: string;
    status: "pass" | "fail";
    message: string;
    similarity: number;
    similarHookId: string;
  }> = [];
  const threshold = DISTANCE_THRESHOLDS.hook;

  for (let i = 0; i < hooks.length; i += 1) {
    const hook = hooks[i];
    let maxSimilarity = 0;
    let similarHookId = "";

    for (let j = 0; j < hooks.length; j += 1) {
      if (i === j) continue;

      const similarity = calculateTokenSimilarity(hook.hook_text, hooks[j].hook_text);
      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
        similarHookId = hooks[j].hook_id;
      }
    }

    const status: "pass" | "fail" = maxSimilarity > threshold ? "fail" : "pass";
    const message =
      status === "fail"
        ? `High similarity (${(maxSimilarity * 100).toFixed(1)}%) with hook ${similarHookId}`
        : `Token similarity within acceptable range (${(maxSimilarity * 100).toFixed(1)}%)`;

    results.push({
      hookId: hook.hook_id,
      status,
      message,
      similarity: maxSimilarity,
      similarHookId,
    });
  }

  return results;
}

function checkLegalTags(hook: HookRecord): { status: "pass" | "fail"; message: string } {
  if (hook.legal_risk && hook.legal_risk.length > 0) {
    return {
      status: "fail",
      message: `Legal risks identified: ${hook.legal_risk.join(", ")}`,
    };
  }

  return {
    status: "pass",
    message: "No legal risks identified",
  };
}

function checkPromptTokens(prompt: PromptRecord): { status: "pass" | "fail"; message: string } {
  if (prompt.input_tokens === 0 && prompt.output_tokens === 0) {
    return {
      status: "fail",
      message: "Prompt has no token accounting",
    };
  }

  if (prompt.input_tokens > 4000 || prompt.output_tokens > 4000) {
    return {
      status: "fail",
      message: "Prompt token counts exceed policy limits",
    };
  }

  return {
    status: "pass",
    message: "Prompt token accounting valid",
  };
}

function checkLikenessAndLicensing(prompt: ImagePromptRecord): { status: "pass" | "fail"; message: string } {
  const lower = prompt.prompt_text.toLowerCase();
  const hits = LIKENESS_BANLIST.filter((term) => lower.includes(term));

  if (hits.length > 0) {
    return {
      status: "fail",
      message: `Prompt references likeness-restricted terms: ${hits.join(", ")}`,
    };
  }

  const hasProperName = /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/.test(prompt.prompt_text);
  if (prompt.style_category === "photorealistic" && hasProperName) {
    return {
      status: "fail",
      message: "Photorealistic prompt references a proper name without licensing",
    };
  }

  return {
    status: "pass",
    message: "Prompt meets likeness/licensing guidance",
  };
}

function checkThinSiteFallback(hook: HookRecord): { status: "pass" | "fail"; message: string } {
  const text = hook.hook_text.toLowerCase();
  const richContentIndicators = [
    "video",
    "animation",
    "interactive",
    "hover",
    "click",
    "scroll",
    "carousel",
    "slider",
    "modal",
    "popup",
    "overlay",
    "tooltip",
  ];

  const hasRichContent = richContentIndicators.some((indicator) => text.includes(indicator));

  if (hasRichContent) {
    return {
      status: "fail",
      message: "Copy references rich content features not suitable for thin sites",
    };
  }

  return {
    status: "pass",
    message: "Copy is suitable for thin-site fallback",
  };
}

function buildAccessibilityReport(params: {
  runId: string;
  storyboards: StoryboardRecord[];
}): AccessibilityReport {
  const frameSummaries: AccessibilityReport["frames"] = [];

  for (const storyboard of params.storyboards) {
    for (const frame of storyboard.frames) {
      const legibility = checkOverlayLegibility(frame);
      frameSummaries.push({
        storyboard_id: storyboard.storyboard_id,
        frame_id: frame.frame_id,
        issues: legibility.issues,
        status: legibility.status,
      });
    }
  }

  const failing = frameSummaries.filter((frame) => frame.status === "fail").length;
  const totals = {
    frames: frameSummaries.length,
    passing: frameSummaries.length - failing,
    failing,
    pass_rate: frameSummaries.length === 0 ? 1 : (frameSummaries.length - failing) / frameSummaries.length,
  };

  return {
    schema_version: schemaVersionLiteral,
    run_id: params.runId,
    generated_at: new Date().toISOString(),
    totals,
    frames: frameSummaries,
  };
}

function buildNearDuplicateCsv(results: ReturnType<typeof checkNearDuplicateSimilarity>): string {
  const header = ["hook_id", "similar_hook_id", "similarity"].join(",");
  const rows = results.map((result) =>
    [result.hookId, result.similarHookId || "", result.similarity.toFixed(4)].join(","),
  );
  return [header, ...rows].join("\n");
}

export function generateQaArtifacts(params: QaCheckParams): QaArtifacts {
  const checks: QaReport["checks"] = [];

  for (const hook of params.copy) {
    const atomicity = checkAtomicity(hook);
    checks.push({
      check_id: `${hook.hook_id}-atomicity`,
      category: "copy",
      status: atomicity.status,
      severity: atomicity.status === "fail" ? "high" : "low",
      message: atomicity.message,
      evidence_refs: [hook.proof_ref],
    });

    const accessibility = checkCopyAccessibility(hook);
    checks.push({
      check_id: `${hook.hook_id}-accessibility`,
      category: "accessibility",
      status: accessibility.status,
      severity: accessibility.status === "fail" ? "medium" : "low",
      message: accessibility.message,
      evidence_refs: [hook.proof_ref],
    });

    const banlist = checkBanlist(hook);
    checks.push({
      check_id: `${hook.hook_id}-banlist`,
      category: "compliance",
      status: banlist.status,
      severity: banlist.status === "fail" ? "high" : "low",
      message: banlist.message,
      evidence_refs: [hook.proof_ref],
    });

    const legal = checkLegalTags(hook);
    checks.push({
      check_id: `${hook.hook_id}-legal`,
      category: "compliance",
      status: legal.status,
      severity: legal.status === "fail" ? "high" : "low",
      message: legal.message,
      evidence_refs: [hook.proof_ref],
    });

    const thinSite = checkThinSiteFallback(hook);
    checks.push({
      check_id: `${hook.hook_id}-thin-site`,
      category: "compatibility",
      status: thinSite.status,
      severity: thinSite.status === "fail" ? "medium" : "low",
      message: thinSite.message,
      evidence_refs: [hook.proof_ref],
    });
  }

  for (const prompt of params.prompts) {
    const banlist = checkBanlist(prompt);
    checks.push({
      check_id: `${prompt.prompt_id}-banlist`,
      category: "prompt",
      status: banlist.status,
      severity: banlist.status === "fail" ? "medium" : "low",
      message: banlist.message,
      evidence_refs: [prompt.response_ref],
    });

    const tokens = checkPromptTokens(prompt);
    checks.push({
      check_id: `${prompt.prompt_id}-tokens`,
      category: "prompt",
      status: tokens.status,
      severity: tokens.status === "fail" ? "medium" : "low",
      message: tokens.message,
      evidence_refs: [prompt.response_ref],
    });
  }

  for (const imagePrompt of params.imagePrompts) {
    const likeness = checkLikenessAndLicensing(imagePrompt);
    checks.push({
      check_id: `${imagePrompt.prompt_id}-likeness`,
      category: "imagery",
      status: likeness.status,
      severity: likeness.status === "fail" ? "high" : "low",
      message: likeness.message,
      evidence_refs: [imagePrompt.generated_image_ref ?? imagePrompt.prompt_id],
    });
  }

  for (const storyboard of params.storyboards) {
    for (const frame of storyboard.frames) {
      const overlay = checkOverlayLegibility(frame);
      checks.push({
        check_id: `${frame.frame_id}-overlay`,
        category: "storyboard",
        status: overlay.status,
        severity: overlay.status === "fail" ? "high" : "low",
        message:
          overlay.status === "pass"
            ? "Overlay meets mute legibility & accessibility guidance"
            : overlay.issues.join("; "),
        evidence_refs: [storyboard.storyboard_id],
      });
    }
  }

  const similarityResults = checkNearDuplicateSimilarity(params.copy);
  for (const result of similarityResults) {
    const hook = params.copy.find((candidate) => candidate.hook_id === result.hookId);
    checks.push({
      check_id: `${result.hookId}-near-duplicate`,
      category: "uniqueness",
      status: result.status,
      severity: result.status === "fail" ? "medium" : "low",
      message: result.message,
      evidence_refs: hook ? [hook.proof_ref] : [],
    });
  }

  const failedChecks = checks.filter((check) => check.status === "fail");
  const overallStatus = failedChecks.length === 0 ? "pass" : "fail";

  const report: QaReport = {
    schema_version: schemaVersionLiteral,
    run_id: params.runId,
    generated_at: new Date().toISOString(),
    summary: {
      status: overallStatus,
      coverage:
        params.copy.length > 0
          ? similarityResults.filter((res) => res.status === "pass").length / params.copy.length
          : 1,
      notes:
        overallStatus === "pass"
          ? "All creative artifacts passed QA review."
          : `${failedChecks.length} check(s) failed. Review failing items for remediation.`,
    },
    checks,
  };

  const accessibilityReport = buildAccessibilityReport({
    runId: params.runId,
    storyboards: params.storyboards,
  });

  const nearDuplicateCsv = buildNearDuplicateCsv(similarityResults);

  return {
    qaReport: {
      filename: `${params.runId}-qa_report.json`,
      body: JSON.stringify(report, null, 2),
    },
    nearDuplicateReport: {
      filename: `${params.runId}-near_duplicate_report.csv`,
      body: nearDuplicateCsv,
    },
    accessibilityReport: {
      filename: `${params.runId}-accessibility_report.json`,
      body: JSON.stringify(accessibilityReport, null, 2),
    },
    summary: report,
    accessibility: accessibilityReport,
  };
}
