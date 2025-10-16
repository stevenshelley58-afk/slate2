import { z } from "zod";

export const ExportMetricsSchema = z.object({
  run_id: z.string().uuid(),
  coverage: z.object({
    total_segments: z.number(),
    total_archetypes: z.number(),
    total_formats: z.number(),
    covered_segments: z.number(),
    covered_archetypes: z.number(),
    covered_formats: z.number(),
    segment_coverage: z.number().min(0).max(1),
    archetype_coverage: z.number().min(0).max(1),
    format_coverage: z.number().min(0).max(1),
    overall_coverage: z.number().min(0).max(1),
  }),
  caps: z.object({
    ok: z.boolean(),
    violations: z.array(z.string()),
  }),
  export_success: z.boolean(),
  generated_at: z.string().datetime(),
});

export type ExportMetrics = z.infer<typeof ExportMetricsSchema>;

export const ExportViewResponseSchema = z.object({
  run_id: z.string().uuid(),
  run_summary: z.object({
    url: z.string().url(),
    current_stage: z.string(),
    created_at: z.string().datetime(),
  }),
  metrics: ExportMetricsSchema,
  artifacts_count: z.number(),
  export_ready: z.boolean(),
});

export type ExportViewResponse = z.infer<typeof ExportViewResponseSchema>;
