import { z } from "zod";

export const OwnerKpisSchema = z.object({
  ks_median: z.number().min(0).max(1),
  entropy_pass_percentage: z.number().min(0).max(100),
  novelty_percentage: z.number().min(0).max(100),
  coverage_percentage: z.number().min(0).max(100),
  export_success_percentage: z.number().min(0).max(100),
  total_runs: z.number(),
  successful_runs: z.number(),
  failed_runs: z.number(),
  last_updated: z.string().datetime(),
});

export type OwnerKpis = z.infer<typeof OwnerKpisSchema>;

export const OwnerDashboardResponseSchema = z.object({
  kpis: OwnerKpisSchema,
  recent_runs: z.array(z.object({
    run_id: z.string().uuid(),
    url: z.string().url(),
    status: z.enum(["success", "failed", "in_progress"]),
    created_at: z.string().datetime(),
    coverage: z.number().min(0).max(1),
  })),
  trends: z.object({
    daily_runs: z.array(z.object({
      date: z.string(),
      runs: z.number(),
      success_rate: z.number().min(0).max(1),
    })),
    coverage_trend: z.array(z.object({
      date: z.string(),
      avg_coverage: z.number().min(0).max(1),
    })),
  }),
});

export type OwnerDashboardResponse = z.infer<typeof OwnerDashboardResponseSchema>;
