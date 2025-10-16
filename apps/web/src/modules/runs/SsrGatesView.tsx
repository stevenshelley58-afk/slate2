import React from "react";
import { SSR_GATES, type SsrMetrics } from "@slate/business-rules";

interface SsrGatesViewProps {
  runId: string;
  metrics?: SsrMetrics;
}

interface ThresholdDisplayProps {
  label: string;
  value: number | undefined;
  threshold: number;
  operator: "min" | "max";
  description: string;
}

function ThresholdDisplay({ 
  label, 
  value, 
  threshold, 
  operator, 
  description 
}: ThresholdDisplayProps) {
  if (value === undefined) return null;
  
  const passed = operator === "min" ? value >= threshold : value <= threshold;
  
  return (
    <div style={{ 
      padding: "1rem", 
      border: `2px solid ${passed ? "#10b981" : "#ef4444"}`, 
      borderRadius: "8px",
      marginBottom: "1rem",
      backgroundColor: passed ? "#f0fdf4" : "#fef2f2"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "600" }}>{label}</h3>
        <span style={{ 
          padding: "0.25rem 0.5rem", 
          borderRadius: "4px", 
          fontSize: "0.875rem",
          fontWeight: "500",
          backgroundColor: passed ? "#dcfce7" : "#fecaca",
          color: passed ? "#166534" : "#991b1b"
        }}>
          {passed ? "PASS" : "FAIL"}
        </span>
      </div>
      <div style={{ marginTop: "0.5rem" }}>
        <p style={{ margin: 0, fontSize: "1rem", fontWeight: "500" }}>
          Value: <strong>{value.toFixed(3)}</strong>
        </p>
        <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.875rem", color: "#6b7280" }}>
          Threshold: {operator === "min" ? "≥" : "≤"} {threshold}
        </p>
        <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.875rem", color: "#4b5563" }}>
          {description}
        </p>
      </div>
    </div>
  );
}

export function SsrGatesView({ runId, metrics }: SsrGatesViewProps) {
  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <header style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: "700", margin: "0 0 0.5rem 0" }}>
          SSR Gates Analysis
        </h1>
        <p style={{ fontSize: "1rem", color: "#6b7280", margin: 0 }}>
          Run ID: <code style={{ 
            backgroundColor: "#f3f4f6", 
            padding: "0.25rem 0.5rem", 
            borderRadius: "4px",
            fontSize: "0.875rem"
          }}>{runId}</code>
        </p>
      </header>

      <section>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "600", margin: "0 0 1rem 0" }}>
          Quality Gates
        </h2>
        <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: "0 0 1.5rem 0" }}>
          These thresholds are defined in <code>@slate/business-rules</code> and determine 
          whether the SSR (Statistical Significance Report) meets quality standards.
        </p>

        <div>
          <ThresholdDisplay
            label="KS Statistic"
            value={metrics?.ks}
            threshold={SSR_GATES.ksMin}
            operator="min"
            description="Kolmogorov-Smirnov test statistic measuring distribution difference"
          />

          <ThresholdDisplay
            label="Entropy"
            value={metrics?.entropy}
            threshold={SSR_GATES.entropyMin}
            operator="min"
            description="Information entropy measuring response diversity"
          />

          <ThresholdDisplay
            label="Entropy Coverage Ratio"
            value={metrics?.entropyCoverageRatio}
            threshold={SSR_GATES.entropyCoverage}
            operator="min"
            description="Ratio of entropy coverage to expected maximum"
          />

          <ThresholdDisplay
            label="Bimodal Share"
            value={metrics?.bimodalShare}
            threshold={SSR_GATES.bimodalShare}
            operator="min"
            description="Proportion of responses in bimodal distribution"
          />

          <ThresholdDisplay
            label="Separation"
            value={metrics?.separation}
            threshold={SSR_GATES.separationMin}
            operator="min"
            description="Top-2 separation distance between response clusters"
          />

          <ThresholdDisplay
            label="Relevance Mean"
            value={metrics?.relevanceMean}
            threshold={SSR_GATES.relevanceMeanMin}
            operator="min"
            description="Average relevance score across all responses"
          />

          {metrics?.purchaseIntentMean !== undefined && (
            <ThresholdDisplay
              label="Purchase Intent Mean"
              value={metrics.purchaseIntentMean}
              threshold={SSR_GATES.purchaseIntentMeanMin}
              operator="min"
              description="Average purchase intent score"
            />
          )}

          {metrics?.purchaseIntentHighMass !== undefined && (
            <ThresholdDisplay
              label="Purchase Intent High Mass"
              value={metrics.purchaseIntentHighMass}
              threshold={SSR_GATES.purchaseIntentHighMass}
              operator="min"
              description="Proportion of high purchase intent responses"
            />
          )}

          {metrics?.fastTrack && (
            <>
              <ThresholdDisplay
                label="Fast Track Entropy"
                value={metrics.entropy}
                threshold={SSR_GATES.fastTrackEntropyMax}
                operator="max"
                description="Maximum entropy allowed for fast track processing"
              />
              <ThresholdDisplay
                label="Fast Track Purchase Intent Mean"
                value={metrics.purchaseIntentMean}
                threshold={SSR_GATES.fastTrackMean}
                operator="min"
                description="Minimum purchase intent mean for fast track processing"
              />
            </>
          )}
        </div>

        {!metrics && (
          <div style={{ 
            padding: "2rem", 
            textAlign: "center", 
            backgroundColor: "#f9fafb", 
            borderRadius: "8px",
            border: "2px dashed #d1d5db"
          }}>
            <p style={{ margin: 0, color: "#6b7280" }}>
              No SSR metrics available for this run.
            </p>
          </div>
        )}
      </section>

      <section style={{ marginTop: "3rem" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "600", margin: "0 0 1rem 0" }}>
          Threshold Configuration
        </h2>
        <div style={{ 
          backgroundColor: "#f9fafb", 
          padding: "1rem", 
          borderRadius: "8px",
          fontFamily: "monospace",
          fontSize: "0.875rem"
        }}>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
{`SSR_GATES = {
  relevanceMeanMin: ${SSR_GATES.relevanceMeanMin},
  ksMin: ${SSR_GATES.ksMin},
  entropyMin: ${SSR_GATES.entropyMin},
  entropyCoverage: ${SSR_GATES.entropyCoverage},
  bimodalShare: ${SSR_GATES.bimodalShare},
  separationMin: ${SSR_GATES.separationMin},
  purchaseIntentMeanMin: ${SSR_GATES.purchaseIntentMeanMin},
  purchaseIntentHighMass: ${SSR_GATES.purchaseIntentHighMass},
  fastTrackMean: ${SSR_GATES.fastTrackMean},
  fastTrackEntropyMax: ${SSR_GATES.fastTrackEntropyMax}
}`}
          </pre>
        </div>
      </section>
    </div>
  );
}
