import { schemaVersionLiteral, type HookRecord, type QaReport } from "@slate/schemas";
import { BANLIST_TERMS, DISTANCE_THRESHOLDS } from "@slate/business-rules";

type QaReportArtifact = {
  filename: string;
  body: string;
};

type QaCheckParams = {
  runId: string;
  hooks: HookRecord[];
};

// Simple token similarity calculation using Jaccard similarity
function calculateTokenSimilarity(text1: string, text2: string): number {
  const tokens1 = new Set(text1.toLowerCase().split(/\s+/).filter(Boolean));
  const tokens2 = new Set(text2.toLowerCase().split(/\s+/).filter(Boolean));
  
  const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
  const union = new Set([...tokens1, ...tokens2]);
  
  return intersection.size / union.size;
}

// Check for atomicity - hooks should be self-contained and not reference external content
function checkAtomicity(hook: HookRecord): { status: "pass" | "fail"; message: string } {
  const text = hook.hook_text.toLowerCase();
  
  // Check for external references
  const externalRefs = [
    "click here", "see more", "read more", "learn more", "find out",
    "check out", "visit", "go to", "link", "website", "page"
  ];
  
  const hasExternalRef = externalRefs.some(ref => text.includes(ref));
  
  if (hasExternalRef) {
    return {
      status: "fail",
      message: "Hook contains external references that break atomicity"
    };
  }
  
  return {
    status: "pass",
    message: "Hook is self-contained and atomic"
  };
}

// Check accessibility - ≤12 words per screen/line
function checkAccessibility(hook: HookRecord): { status: "pass" | "fail"; message: string } {
  const lines = hook.hook_text.split('\n');
  const maxWordsPerLine = 12;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length === 0) continue;
    
    const wordCount = line.split(/\s+/).filter(Boolean).length;
    if (wordCount > maxWordsPerLine) {
      return {
        status: "fail",
        message: `Line ${i + 1} has ${wordCount} words (max ${maxWordsPerLine})`
      };
    }
  }
  
  return {
    status: "pass",
    message: "All lines meet accessibility word count requirements"
  };
}

// Check banlist compliance
function checkBanlist(hook: HookRecord): { status: "pass" | "fail"; message: string } {
  const lowerHook = hook.hook_text.toLowerCase();
  const banHits = Array.from(BANLIST_TERMS).filter((term) =>
    lowerHook.includes(term),
  );
  
  if (banHits.length > 0) {
    return {
      status: "fail",
      message: `Banlist terms detected: ${banHits.join(", ")}`
    };
  }
  
  return {
    status: "pass",
    message: "No banlist terms found"
  };
}

// Check for near-duplicate token similarity
function checkNearDuplicateSimilarity(hooks: HookRecord[]): Array<{ hookId: string; status: "pass" | "fail"; message: string }> {
  const results: Array<{ hookId: string; status: "pass" | "fail"; message: string }> = [];
  const threshold = DISTANCE_THRESHOLDS.hook;
  
  for (let i = 0; i < hooks.length; i++) {
    const hook = hooks[i];
    let maxSimilarity = 0;
    let similarHookId = "";
    
    for (let j = 0; j < hooks.length; j++) {
      if (i === j) continue;
      
      const similarity = calculateTokenSimilarity(hook.hook_text, hooks[j].hook_text);
      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
        similarHookId = hooks[j].hook_id;
      }
    }
    
    if (maxSimilarity > threshold) {
      results.push({
        hookId: hook.hook_id,
        status: "fail",
        message: `High similarity (${(maxSimilarity * 100).toFixed(1)}%) with hook ${similarHookId}`
      });
    } else {
      results.push({
        hookId: hook.hook_id,
        status: "pass",
        message: `Token similarity within acceptable range (${(maxSimilarity * 100).toFixed(1)}%)`
      });
    }
  }
  
  return results;
}

// Check legal tags compliance
function checkLegalTags(hook: HookRecord): { status: "pass" | "fail"; message: string } {
  if (hook.legal_risk && hook.legal_risk.length > 0) {
    return {
      status: "fail",
      message: `Legal risks identified: ${hook.legal_risk.join(", ")}`
    };
  }
  
  return {
    status: "pass",
    message: "No legal risks identified"
  };
}

// Check thin-site fallback - hooks should work on minimal content sites
function checkThinSiteFallback(hook: HookRecord): { status: "pass" | "fail"; message: string } {
  const text = hook.hook_text.toLowerCase();
  
  // Check for content that requires rich site features
  const richContentIndicators = [
    "video", "animation", "interactive", "hover", "click", "scroll",
    "carousel", "slider", "modal", "popup", "overlay", "tooltip"
  ];
  
  const hasRichContent = richContentIndicators.some(indicator => text.includes(indicator));
  
  if (hasRichContent) {
    return {
      status: "fail",
      message: "Hook references rich content features not suitable for thin sites"
    };
  }
  
  return {
    status: "pass",
    message: "Hook is suitable for thin-site fallback"
  };
}

export function generateQaReport(params: QaCheckParams): QaReportArtifact {
  const checks: QaReport["checks"] = [];

  // Run all checks for each hook
  for (const hook of params.hooks) {
    // Atomicity check
    const atomicityResult = checkAtomicity(hook);
    checks.push({
      check_id: `${hook.hook_id}-atomicity`,
      category: "content",
      status: atomicityResult.status,
      severity: atomicityResult.status === "fail" ? "high" : "low",
      message: atomicityResult.message,
      evidence_refs: [hook.proof_ref],
    });

    // Accessibility check
    const accessibilityResult = checkAccessibility(hook);
    checks.push({
      check_id: `${hook.hook_id}-accessibility`,
      category: "accessibility",
      status: accessibilityResult.status,
      severity: accessibilityResult.status === "fail" ? "medium" : "low",
      message: accessibilityResult.message,
      evidence_refs: [hook.proof_ref],
    });

    // Banlist check
    const banlistResult = checkBanlist(hook);
    checks.push({
      check_id: `${hook.hook_id}-banlist`,
      category: "compliance",
      status: banlistResult.status,
      severity: banlistResult.status === "fail" ? "high" : "low",
      message: banlistResult.message,
      evidence_refs: [hook.proof_ref],
    });

    // Legal tags check
    const legalResult = checkLegalTags(hook);
    checks.push({
      check_id: `${hook.hook_id}-legal-tags`,
      category: "compliance",
      status: legalResult.status,
      severity: legalResult.status === "fail" ? "high" : "low",
      message: legalResult.message,
      evidence_refs: [hook.proof_ref],
    });

    // Thin-site fallback check
    const thinSiteResult = checkThinSiteFallback(hook);
    checks.push({
      check_id: `${hook.hook_id}-thin-site-fallback`,
      category: "compatibility",
      status: thinSiteResult.status,
      severity: thinSiteResult.status === "fail" ? "medium" : "low",
      message: thinSiteResult.message,
      evidence_refs: [hook.proof_ref],
    });
  }

  // Near-duplicate similarity check (cross-hook analysis)
  const similarityResults = checkNearDuplicateSimilarity(params.hooks);
  for (const result of similarityResults) {
    const hook = params.hooks.find(h => h.hook_id === result.hookId);
    checks.push({
      check_id: `${result.hookId}-near-duplicate-similarity`,
      category: "uniqueness",
      status: result.status,
      severity: result.status === "fail" ? "medium" : "low",
      message: result.message,
      evidence_refs: hook ? [hook.proof_ref] : [],
    });
  }

  // Calculate overall status
  const failedChecks = checks.filter(check => check.status === "fail");
  const overallStatus = failedChecks.length === 0 ? "pass" : "fail";
  
  const report: QaReport = {
    schema_version: schemaVersionLiteral,
    run_id: params.runId,
    generated_at: new Date().toISOString(),
    summary: {
      status: overallStatus,
      coverage: 1,
      notes: overallStatus === "pass"
        ? "All hooks pass QA checks for atomicity, accessibility, banlist, similarity, legal tags, and thin-site compatibility."
        : `${failedChecks.length} check(s) failed. Review failing items for compliance issues.`,
    },
    checks,
  };

  return {
    filename: `${params.runId}-qa_report.json`,
    body: JSON.stringify(report, null, 2),
  };
}
