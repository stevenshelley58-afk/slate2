import type { RunStage } from "@slate/state-machine";

type ExportArtifact = {
  stage: RunStage;
  artifactType: string;
  filename: string;
  contentType: string;
  absolutePath: string;
};

export function generateExportManifest(params: {
  runId: string;
  artifacts: ExportArtifact[];
}): { filename: string; body: string } {
  const header = `Slate export manifest for run ${params.runId}`;
  const lines = params.artifacts.map((artifact, index) => {
    const lineNumber = (index + 1).toString().padStart(2, "0");
    return `${lineNumber}. [${artifact.stage}] ${artifact.artifactType} -> ${artifact.filename} (${artifact.contentType}) @ ${artifact.absolutePath}`;
  });

  const body = [header, "=".repeat(header.length), ...lines].join("\n");

  return {
    filename: `${params.runId}-export-manifest.txt`,
    body,
  };
}
