import { z } from "zod";

export const SegmentScoreSchema = z.object({
  segment_id: z.string(),
  intent: z.number().min(0).max(1),
  margin: z.number().min(0).max(1),
  proof: z.number().min(0).max(1),
  novelty: z.number().min(0).max(1),
  evidence_weight: z.number().min(0).max(1),
  claim_risk: z.number().min(0).max(1),
  total: z.number().min(0).max(1),
});

export type SegmentScore = z.infer<typeof SegmentScoreSchema>;

export const SegmentSummarySchema = SegmentScoreSchema.extend({
  name: z.string(),
  centroid_distance: z.number().min(0).max(1),
  coverage_contribution: z.number().min(0).max(1),
  selected: z.boolean(),
  persona_support: z.array(
    z.object({
      persona_id: z.string(),
      weight: z.number().min(0),
    }),
  ),
});

export type SegmentSummary = z.infer<typeof SegmentSummarySchema>;

export const SelectedSegmentsResponseSchema = z.object({
  run_id: z.string().uuid(),
  segments: z.array(SegmentSummarySchema),
});

export type SelectedSegmentsResponse = z.infer<
  typeof SelectedSegmentsResponseSchema
>;
