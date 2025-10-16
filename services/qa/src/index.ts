import { schemaVersionLiteral, type HookRecord, type QaReport } from "@slate/schemas";
import { STYLE_RULES, BANLIST_TERMS } from "@slate/business-rules";

type QaReportArtifact = {
  filename: string;
  body: string;
};

export function generateQaReport(params: {
  runId: string;
  hooks: HookRecord[];
}): QaReportArtifact {
  const checks: QaReport["checks"] = [];

  for (const hook of params.hooks) {
    const [firstLine] = hook.hook_text.split("\n");
    const firstLineWordCount = firstLine.trim().split(/\s+/).filter(Boolean).length;
    const withinStyle = firstLineWordCount <= STYLE_RULES.firstLineMaxWords;

    checks.push({
      check_id: `${hook.hook_id}-style-first-line`,
      category: "style",
      status: withinStyle ? "pass" : "fail",
      severity: withinStyle ? "low" : "medium",
      message: `First line uses ${firstLineWordCount} words (max ${STYLE_RULES.firstLineMaxWords}).`,
      evidence_refs: [hook.proof_ref],
    });

    const lowerHook = hook.hook_text.toLowerCase();
    const banHits = Array.from(BANLIST_TERMS).filter((term) =>
      lowerHook.includes(term),
    );
    const banlistPass = banHits.length === 0;

    checks.push({
      check_id: `${hook.hook_id}-banlist`,
      category: "compliance",
      status: banlistPass ? "pass" : "fail",
      severity: banlistPass ? "low" : "high",
      message: banlistPass
        ? "No banlist terms found."
        : `Banlist terms detected: ${banHits.join(", ")}`,
      evidence_refs: [hook.proof_ref],
    });
  }

  const allPass = checks.every((check) => check.status === "pass");
  const report: QaReport = {
    schema_version: schemaVersionLiteral,
    run_id: params.runId,
    generated_at: new Date().toISOString(),
    summary: {
      status: allPass ? "pass" : "fail",
      coverage: 1,
      notes: allPass
        ? "All hooks meet baseline style and compliance checks."
        : "One or more hooks violate style or banlist requirements.",
    },
    checks,
  };

  return {
    filename: `${params.runId}-qa_report.json`,
    body: JSON.stringify(report, null, 2),
  };
}
