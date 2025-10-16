export const EXPORT_RULES = {
  // Export format requirements
  formats: {
    // Primary formats for distribution
    primary: [
      "png",
      "jpg",
      "webp",
    ] as const,
    // Archive formats for backup
    archive: [
      "zip",
      "tar.gz",
    ] as const,
    // Metadata formats
    metadata: [
      "json",
      "csv",
    ] as const,
  },
  
  // File naming conventions
  naming: {
    // Pattern for asset files: {segment_id}-{archetype}-{variant}-{ratio}.{ext}
    assetPattern: /^[a-z0-9-]+-[a-z0-9-]+-[a-z0-9-]+-(9:16|1:1|4:5|16:9)\.[a-z]+$/,
    // Pattern for manifest files: {run_id}-{type}-{timestamp}.{ext}
    manifestPattern: /^[a-z0-9-]+-(assets|qa|prompts)-\d{8}T\d{6}\.[a-z]+$/,
    // Maximum filename length
    maxLength: 128,
    // Allowed characters in filenames
    allowedChars: /^[a-z0-9.-]+$/,
  },
  
  // Directory structure rules
  directoryStructure: {
    // Base export directory structure
    basePath: "exports",
    // Subdirectory patterns
    subdirectories: {
      assets: "assets/{run_id}/{segment_id}",
      manifests: "manifests/{run_id}",
      qa: "qa/{run_id}",
      prompts: "prompts/{run_id}",
    },
    // Maximum directory depth
    maxDepth: 5,
  },
  
  // Export validation rules
  validation: {
    // Required files for each export
    requiredFiles: [
      "assets_manifest.json",
      "qa_report.json",
      "image_prompts.jsonl",
      "filenames.csv",
    ] as const,
    // Maximum total export size (in MB)
    maxTotalSize: 500,
    // Minimum number of assets per segment
    minAssetsPerSegment: 12, // 3 variants × 4 aspect ratios
    // Maximum number of assets per segment
    maxAssetsPerSegment: 32, // 8 variants × 4 aspect ratios
  },
  
  // Metadata requirements
  metadata: {
    // Required metadata fields for each asset
    assetFields: [
      "asset_id",
      "segment_id", 
      "archetype",
      "hook_id",
      "ratio",
      "variant",
      "filename",
      "checksum",
      "license_tag",
      "created_at",
      "file_size",
      "dimensions",
    ] as const,
    // Required metadata fields for each prompt
    promptFields: [
      "prompt_id",
      "stage",
      "model",
      "model_revision",
      "input_tokens",
      "output_tokens",
      "prompt_text",
      "response_ref",
      "created_at",
    ] as const,
    // Required metadata fields for QA reports
    qaFields: [
      "run_id",
      "generated_at",
      "summary",
      "checks",
    ] as const,
  },
  
  // Export triggers and conditions
  triggers: {
    // Conditions that trigger an export
    conditions: [
      "all_segments_complete",
      "qa_checks_passed",
      "asset_validation_passed",
      "metadata_complete",
    ] as const,
    // Minimum number of segments required for export
    minSegments: 3,
    // Maximum number of segments per export
    maxSegments: 5,
  },
  
  // Export scheduling and retention
  scheduling: {
    // Maximum export retention period (in days)
    maxRetentionDays: 30,
    // Export frequency limits
    frequency: {
      // Minimum time between exports (in minutes)
      minIntervalMinutes: 15,
      // Maximum exports per day
      maxPerDay: 10,
    },
  },
  
  // Quality assurance rules
  qa: {
    // Required QA checks before export
    requiredChecks: [
      "asset_integrity",
      "metadata_completeness",
      "file_size_validation",
      "aspect_ratio_validation",
      "naming_convention_check",
      "license_compliance",
    ] as const,
    // QA thresholds
    thresholds: {
      // Minimum QA pass rate for export
      minPassRate: 0.95,
      // Maximum number of critical failures
      maxCriticalFailures: 0,
      // Maximum number of warnings
      maxWarnings: 5,
    },
  },
<<<<<<< HEAD
} as const;
=======
} as const;
>>>>>>> m5d-exporter
