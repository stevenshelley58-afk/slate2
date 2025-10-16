import type { RunStage } from "@slate/state-machine";
import type { AssetsManifestRecord } from "@slate/schemas";
import { SEGMENT_CAPS } from "@slate/business-rules";
import { createHash } from "crypto";

type ExportArtifact = {
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
      [format: string]: number; // count of assets
    };
  };
};

export function computeCoverage(manifest: AssetsManifestRecord[]): CoverageMetrics {
  const segments = new Set<string>();
  const archetypes = new Set<string>();
  const formats = new Set<string>();
  
  const coveredSegments = new Set<string>();
  const coveredArchetypes = new Set<string>();
  const coveredFormats = new Set<string>();

  // Collect all possible segments, archetypes, and formats from manifest
  for (const asset of manifest) {
    segments.add(asset.segment_id);
    archetypes.add(asset.archetype);
    formats.add(asset.ratio);
    
    coveredSegments.add(asset.segment_id);
    coveredArchetypes.add(asset.archetype);
    coveredFormats.add(asset.ratio);
  }

  const totalSegments = segments.size;
  const totalArchetypes = archetypes.size;
  const totalFormats = formats.size;
  
  const segmentCoverage = totalSegments > 0 ? coveredSegments.size / totalSegments : 0;
  const archetypeCoverage = totalArchetypes > 0 ? coveredArchetypes.size / totalArchetypes : 0;
  const formatCoverage = totalFormats > 0 ? coveredFormats.size / totalFormats : 0;
  
  // Overall coverage is the average of the three coverage metrics
  const overallCoverage = (segmentCoverage + archetypeCoverage + formatCoverage) / 3;

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

export function buildSegmentArchetypeFormatMatrix(manifest: AssetsManifestRecord[]): SegmentArchetypeFormatMatrix {
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
    matrix[asset.segment_id][asset.archetype][asset.ratio]++;
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

  // Check segment caps (≤12 per segment)
  for (const [segment, count] of bySegment) {
    if (count > SEGMENT_CAPS.perSegment) {
      violations.push(`Segment ${segment} exceeds cap ${SEGMENT_CAPS.perSegment} (has ${count})`);
    }
  }

  // Check archetype caps (≤2 per archetype per segment)
  for (const [key, count] of bySegmentArchetype) {
    if (count > SEGMENT_CAPS.perArchetype) {
      violations.push(`Archetype allocation ${key} exceeds cap ${SEGMENT_CAPS.perArchetype} (has ${count})`);
    }
  }

  return {
    ok: violations.length === 0,
    violations,
  };
}

export function generateAssetsManifest(
  runId: string,
  manifest: AssetsManifestRecord[]
): { filename: string; body: string } {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${runId}-assets-manifest-${timestamp}.json`;
  
  // Generate checksums for each asset
  const assetsWithChecksums = manifest.map(asset => ({
    ...asset,
    checksum: generateChecksum(asset),
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

function generateChecksum(asset: AssetsManifestRecord): string {
  // Generate a deterministic checksum based on asset properties
  const content = `${asset.segment_id}-${asset.archetype}-${asset.hook_id}-${asset.ratio}-${asset.variant}`;
  return createHash('sha256').update(content).digest('hex').substring(0, 16);
}

export function generateExportManifest(params: {
  runId: string;
  artifacts: ExportArtifact[];
  thinSite?: boolean;
  crawlStats?: {
    pagesCrawled: number;
    totalTextBytes: number;
    mediaCount: number;
    blockedByRobots: number;
    maxDepthReached: number;
    durationMs: number;
  };
}): { filename: string; body: string } {
  const header = `Slate export manifest for run ${params.runId}`;
  const lines = params.artifacts.map((artifact, index) => {
    const lineNumber = (index + 1).toString().padStart(2, "0");
    return `${lineNumber}. [${artifact.stage}] ${artifact.artifactType} -> ${artifact.filename} (${artifact.contentType}) @ ${artifact.absolutePath}`;
  });

  const metaLines: string[] = [];
  if (params.thinSite) {
    metaLines.push("Thin-site mode: active — downstream budgets constrained.");
  }
  if (params.crawlStats) {
    metaLines.push(
      `Crawl stats: ${params.crawlStats.pagesCrawled} page(s), ${params.crawlStats.totalTextBytes} text bytes, ${params.crawlStats.mediaCount} media asset(s).`,
    );
  }

  const sections = [header, "=".repeat(header.length), ...metaLines, ...lines];
  const body = sections.join("\n");

  return {
    filename: `${params.runId}-export-manifest.txt`,
    body,
  };
}
