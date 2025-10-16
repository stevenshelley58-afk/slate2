import type { RunStage } from "@slate/state-machine";
import type { AssetsManifestRecord, QaReport } from "@slate/schemas";
import { schemaVersionLiteral } from "@slate/schemas";
import { SEGMENT_CAPS, COVERAGE_TARGET, EXPORT_RULES } from "@slate/business-rules";
import { createHash } from "crypto";
import type { AccessibilityReport } from "@slate/qa-service";

export type ExportArtifact = {
  stage: RunStage;
  artifactType: string;
  filename: string;
  contentType: string;
  absolutePath: string;
};

export type CoverageMetrics = {
  totalSegments: number;
  totalArchetypes: number;
  totalFormats: number;
  coveredSegments: number;
  coveredArchetypes: number;
  coveredFormats: number;
  segmentCoverage: number;
  archetypeCoverage: number;
  formatCoverage: number;
  overallCoverage: number;
};

export type SegmentArchetypeFormatMatrix = {
  [segmentId: string]: {
    [archetype: string]: {
      [format: string]: number;
    };
  };
};

export type CoverageOptions = {
  expectedSegments?: string[];
  expectedArchetypes?: string[];
  expectedFormats?: readonly string[];
};

export type ExportBatch = {
  batchId: string;
  assets: AssetsManifestRecord[];
};

export type PrepareExportArtifactsParams = {
  runId: string;
  manifest: AssetsManifestRecord[];
  expectedSegments: string[];
  expectedArchetypes: string[];
  expectedFormats: readonly string[];
  qaReport: QaReport;
  accessibility: AccessibilityReport;
};

export type PreparedExportArtifacts = {
  assetsManifest: { filename: string; body: string };
  filenamesCsv: { filename: string; body: string };
  taxonomy: { filename: string; body: string };
  exportManifest: { filename: string; body: string };
  coverage: CoverageMetrics;
  caps: { ok: boolean; violations: string[] };
  batches: ExportBatch[];
};

export function computeCoverage(
  manifest: AssetsManifestRecord[],
  options: CoverageOptions = {},
): CoverageMetrics {
  const segments = new Set(options.expectedSegments ?? manifest.map((asset) => asset.segment_id));
  const archetypes = new Set(options.expectedArchetypes ?? manifest.map((asset) => asset.archetype));
  const formats = new Set(options.expectedFormats ?? manifest.map((asset) => asset.ratio));

  const coveredSegments = new Set(manifest.map((asset) => asset.segment_id));
  const coveredArchetypes = new Set(manifest.map((asset) => asset.archetype));
  const coveredFormats = new Set(manifest.map((asset) => asset.ratio));

  const totalSegments = segments.size;
  const totalArchetypes = archetypes.size;
  const totalFormats = formats.size;

  const segmentCoverage = totalSegments > 0 ? coveredSegments.size / totalSegments : 0;
  const archetypeCoverage = totalArchetypes > 0 ? coveredArchetypes.size / totalArchetypes : 0;
  const formatCoverage = totalFormats > 0 ? coveredFormats.size / totalFormats : 0;
  const overallCoverage =
    totalSegments + totalArchetypes + totalFormats === 0
      ? 0
      : (segmentCoverage + archetypeCoverage + formatCoverage) / 3;

  return {
    totalSegments,
    totalArchetypes,
    totalFormats,
    coveredSegments: coveredSegments.size,
    coveredArchetypes: coveredArchetypes.size,
    coveredFormats: coveredFormats.size,
    segmentCoverage,
    archetypeCoverage,
    formatCoverage,
    overallCoverage,
  };
}

export function buildSegmentArchetypeFormatMatrix(
  manifest: AssetsManifestRecord[],
): SegmentArchetypeFormatMatrix {
  const matrix: SegmentArchetypeFormatMatrix = {};

  for (const asset of manifest) {
    if (!matrix[asset.segment_id]) {
      matrix[asset.segment_id] = {};
    }
    if (!matrix[asset.segment_id][asset.archetype]) {
      matrix[asset.segment_id][asset.archetype] = {};
    }
    if (!matrix[asset.segment_id][asset.archetype][asset.ratio]) {
      matrix[asset.segment_id][asset.archetype][asset.ratio] = 0;
    }
    matrix[asset.segment_id][asset.archetype][asset.ratio] += 1;
  }

  return matrix;
}

export function enforceCaps(manifest: AssetsManifestRecord[]): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  const bySegment = new Map<string, number>();
  const bySegmentArchetype = new Map<string, number>();

  for (const asset of manifest) {
    bySegment.set(asset.segment_id, (bySegment.get(asset.segment_id) ?? 0) + 1);
    const key = `${asset.segment_id}:${asset.archetype}`;
    bySegmentArchetype.set(key, (bySegmentArchetype.get(key) ?? 0) + 1);
  }

  for (const [segment, count] of bySegment) {
    if (count > SEGMENT_CAPS.perSegment) {
      violations.push(
        `Segment ${segment} exceeds cap ${SEGMENT_CAPS.perSegment} (has ${count})`,
      );
    }
  }

  for (const [key, count] of bySegmentArchetype) {
    if (count > SEGMENT_CAPS.perArchetype) {
      violations.push(
        `Archetype allocation ${key} exceeds cap ${SEGMENT_CAPS.perArchetype} (has ${count})`,
      );
    }
  }

  return {
    ok: violations.length === 0,
    violations,
  };
}

export function generateAssetsManifest(
  runId: string,
  manifest: AssetsManifestRecord[],
): { filename: string; body: string } {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `${runId}-assets-manifest-${timestamp}.json`;

  const assetsWithChecksums = manifest.map((asset) => ({
    ...asset,
    checksum: asset.checksum ?? generateChecksum(asset),
  }));

  const manifestData = {
    run_id: runId,
    generated_at: new Date().toISOString(),
    total_assets: assetsWithChecksums.length,
    coverage: computeCoverage(manifest),
    caps_enforcement: enforceCaps(manifest),
    assets: assetsWithChecksums,
  };

  return {
    filename,
    body: JSON.stringify(manifestData, null, 2),
  };
}

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

export function prepareExportArtifacts(
  params: PrepareExportArtifactsParams,
): PreparedExportArtifacts {
  if (params.manifest.length === 0) {
    throw new Error("Cannot prepare export artifacts with empty manifest");
  }

  const coverage = computeCoverage(params.manifest, {
    expectedSegments: params.expectedSegments,
    expectedArchetypes: params.expectedArchetypes,
    expectedFormats: params.expectedFormats,
  });

  if (coverage.overallCoverage < COVERAGE_TARGET) {
    throw new Error(
      `Coverage ${coverage.overallCoverage.toFixed(3)} below target ${COVERAGE_TARGET.toFixed(3)}`,
    );
  }

  const caps = enforceCaps(params.manifest);
  if (!caps.ok) {
    throw new Error(`Caps violation: ${caps.violations.join("; ")}`);
  }

  if (params.qaReport.summary.status !== "pass") {
    throw new Error("QA summary indicates failure");
  }

  if (params.accessibility.totals.failing > 0) {
    throw new Error("Accessibility checks failed");
  }

  validateFilenames(params.manifest);

  const batches = chunkManifest(params.manifest, 10);
  const timestamp = new Date().toISOString();
  const assetsManifest = buildAssetsManifestDoc(params.runId, params.manifest, coverage, caps, timestamp, params.qaReport);
  const filenamesCsv = buildFilenamesCsv(params.runId, params.manifest, batches, timestamp);
  const taxonomy = buildTaxonomyDoc(params.runId, params.manifest, timestamp);
  const exportManifest = buildExportManifestDoc(
    params.runId,
    assetsManifest.filename,
    filenamesCsv.filename,
    taxonomy.filename,
    timestamp,
    batches,
  );

  return {
    assetsManifest,
    filenamesCsv,
    taxonomy,
    exportManifest,
    coverage,
    caps,
    batches,
  };
}

function validateFilenames(manifest: AssetsManifestRecord[]) {
  const pattern = EXPORT_RULES.naming.assetPattern;
  const maxLength = EXPORT_RULES.naming.maxLength;
  const allowedChars = EXPORT_RULES.naming.allowedChars;

  for (const asset of manifest) {
    if (asset.filename.length > maxLength) {
      throw new Error(`Filename ${asset.filename} exceeds max length ${maxLength}`);
    }
    if (!allowedChars.test(asset.filename)) {
      throw new Error(`Filename ${asset.filename} contains invalid characters`);
    }
    if (!pattern.test(asset.filename)) {
      throw new Error(`Filename ${asset.filename} does not match asset pattern`);
    }
  }
}

function chunkManifest(manifest: AssetsManifestRecord[], size: number): ExportBatch[] {
  const batches: ExportBatch[] = [];
  for (let i = 0; i < manifest.length; i += size) {
    const slice = manifest.slice(i, i + size);
    batches.push({ batchId: `batch-${(i / size + 1).toString().padStart(2, "0")}`, assets: slice });
  }
  return batches;
}

function buildAssetsManifestDoc(
  runId: string,
  manifest: AssetsManifestRecord[],
  coverage: CoverageMetrics,
  caps: { ok: boolean; violations: string[] },
  timestamp: string,
  qaReport: QaReport,
): { filename: string; body: string } {
  const filename = `${runId}-assets_manifest.json`;
  const body = JSON.stringify(
    {
      schema_version: schemaVersionLiteral,
      run_id: runId,
      generated_at: timestamp,
      totals: {
        assets: manifest.length,
      },
      coverage,
      caps,
      qa_summary: qaReport.summary,
      assets: manifest,
    },
    null,
    2,
  );
  return { filename, body };
}

function buildFilenamesCsv(
  runId: string,
  manifest: AssetsManifestRecord[],
  batches: ExportBatch[],
  timestamp: string,
): { filename: string; body: string } {
  const filename = `${runId}-filenames.csv`;
  const batchLookup = new Map<string, string>();
  batches.forEach((batch) => {
    for (const asset of batch.assets) {
      batchLookup.set(asset.asset_id, batch.batchId);
    }
  });

  const header = [
    "filename",
    "category",
    "file_type",
    "segment_id",
    "run_id",
    "size_bytes",
    "checksum",
    "created_at",
    "relative_path",
    "export_batch",
  ];

  const rows = manifest.map((asset) => {
    const batchId = batchLookup.get(asset.asset_id) ?? "batch-01";
    const relativePath = `${EXPORT_RULES.directoryStructure.basePath}/assets/${runId}/${asset.segment_id}/${asset.filename}`;
    return [
      asset.filename,
      "asset",
      "image/png",
      asset.segment_id,
      runId,
      asset.file_size.toString(),
      asset.checksum,
      asset.created_at,
      relativePath,
      batchId,
    ];
  });

  const csv = [header, ...rows].map((columns) => columns.join(",")).join("\n");
  return { filename, body: csv };
}

function buildTaxonomyDoc(
  runId: string,
  manifest: AssetsManifestRecord[],
  timestamp: string,
): { filename: string; body: string } {
  const filename = `${runId}-taxonomy.md`;
  const segments = new Map<string, number>();
  const archetypes = new Map<string, number>();
  const formats = new Map<string, number>();

  for (const asset of manifest) {
    segments.set(asset.segment_id, (segments.get(asset.segment_id) ?? 0) + 1);
    archetypes.set(asset.archetype, (archetypes.get(asset.archetype) ?? 0) + 1);
    formats.set(asset.ratio, (formats.get(asset.ratio) ?? 0) + 1);
  }

  const lines = [
    `# Export taxonomy for run ${runId}`,
    `Generated at ${timestamp}`,
    "",
    "## Segments",
    ...Array.from(segments.entries()).map(([segment, count]) => `- ${segment}: ${count} assets`),
    "",
    "## Archetypes",
    ...Array.from(archetypes.entries()).map(([archetype, count]) => `- ${archetype}: ${count} assets`),
    "",
    "## Formats",
    ...Array.from(formats.entries()).map(([format, count]) => `- ${format}: ${count} assets`),
  ];

  return { filename, body: lines.join("\n") };
}

function buildExportManifestDoc(
  runId: string,
  assetsManifestFilename: string,
  filenamesCsvFilename: string,
  taxonomyFilename: string,
  timestamp: string,
  batches: ExportBatch[],
): { filename: string; body: string } {
  const filename = `${runId}-export_manifest.json`;
  const body = JSON.stringify(
    {
      schema_version: schemaVersionLiteral,
      run_id: runId,
      generated_at: timestamp,
      files: [
        { type: "assets_manifest", filename: assetsManifestFilename },
        { type: "filenames_csv", filename: filenamesCsvFilename },
        { type: "taxonomy", filename: taxonomyFilename },
      ],
      batches: batches.map((batch) => ({
        batch_id: batch.batchId,
        asset_ids: batch.assets.map((asset) => asset.asset_id),
        filenames: batch.assets.map((asset) => asset.filename),
      })),
    },
    null,
    2,
  );
  return { filename, body };
}

function generateChecksum(asset: AssetsManifestRecord): string {
  const content = `${asset.segment_id}-${asset.archetype}-${asset.hook_id}-${asset.ratio}-${asset.variant}`;
  return createHash("sha256").update(content).digest("hex").substring(0, 16);
}
