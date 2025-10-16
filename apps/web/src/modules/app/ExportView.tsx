import React, { useState, useEffect } from "react";
import type { ExportViewResponse } from "@slate/api-types";

interface ExportViewProps {
  runId: string;
}

export function ExportView({ runId }: ExportViewProps) {
  const [data, setData] = useState<ExportViewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Mock data for now - in real implementation, this would fetch from API
    const mockData: ExportViewResponse = {
      run_id: runId,
      run_summary: {
        url: "https://example.com/product",
        current_stage: "done",
        created_at: new Date().toISOString(),
      },
      metrics: {
        run_id: runId,
        coverage: {
          total_segments: 5,
          total_archetypes: 3,
          total_formats: 4,
          covered_segments: 4,
          covered_archetypes: 3,
          covered_formats: 4,
          segment_coverage: 0.8,
          archetype_coverage: 1.0,
          format_coverage: 1.0,
          overall_coverage: 0.93,
        },
        caps: {
          ok: true,
          violations: [],
        },
        export_success: true,
        generated_at: new Date().toISOString(),
      },
      artifacts_count: 12,
      export_ready: true,
    };

    // Simulate API call
    setTimeout(() => {
      setData(mockData);
      setLoading(false);
    }, 500);
  }, [runId]);

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p>Loading export metrics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "2rem", color: "red" }}>
        <p>Error loading export data: {error || "Unknown error"}</p>
      </div>
    );
  }

  const { metrics, run_summary, artifacts_count, export_ready } = data;

  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1>Export View - Run {runId}</h1>
      
      <div style={{ marginBottom: "2rem" }}>
        <h2>Run Summary</h2>
        <p><strong>URL:</strong> {run_summary.url}</p>
        <p><strong>Status:</strong> {run_summary.current_stage}</p>
        <p><strong>Created:</strong> {new Date(run_summary.created_at).toLocaleString()}</p>
        <p><strong>Artifacts:</strong> {artifacts_count}</p>
        <p><strong>Export Ready:</strong> {export_ready ? "✅ Yes" : "❌ No"}</p>
      </div>

      <div style={{ marginBottom: "2rem" }}>
        <h2>Coverage Meter</h2>
        <div style={{ 
          background: "#f0f0f0", 
          borderRadius: "8px", 
          padding: "1rem",
          marginBottom: "1rem"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
            <span>Overall Coverage</span>
            <span><strong>{(metrics.coverage.overall_coverage * 100).toFixed(1)}%</strong></span>
          </div>
          <div style={{
            background: "#e0e0e0",
            borderRadius: "4px",
            height: "20px",
            overflow: "hidden"
          }}>
            <div style={{
              background: metrics.coverage.overall_coverage >= 0.8 ? "#4CAF50" : "#FF9800",
              height: "100%",
              width: `${metrics.coverage.overall_coverage * 100}%`,
              transition: "width 0.3s ease"
            }} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          <div style={{ background: "#f9f9f9", padding: "1rem", borderRadius: "8px" }}>
            <h3>Segment Coverage</h3>
            <p><strong>{(metrics.coverage.segment_coverage * 100).toFixed(1)}%</strong></p>
            <p>{metrics.coverage.covered_segments} / {metrics.coverage.total_segments} segments</p>
          </div>
          
          <div style={{ background: "#f9f9f9", padding: "1rem", borderRadius: "8px" }}>
            <h3>Archetype Coverage</h3>
            <p><strong>{(metrics.coverage.archetype_coverage * 100).toFixed(1)}%</strong></p>
            <p>{metrics.coverage.covered_archetypes} / {metrics.coverage.total_archetypes} archetypes</p>
          </div>
          
          <div style={{ background: "#f9f9f9", padding: "1rem", borderRadius: "8px" }}>
            <h3>Format Coverage</h3>
            <p><strong>{(metrics.coverage.format_coverage * 100).toFixed(1)}%</strong></p>
            <p>{metrics.coverage.covered_formats} / {metrics.coverage.total_formats} formats</p>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: "2rem" }}>
        <h2>Export Caps</h2>
        <div style={{
          background: metrics.caps.ok ? "#e8f5e8" : "#ffe8e8",
          border: `1px solid ${metrics.caps.ok ? "#4CAF50" : "#f44336"}`,
          borderRadius: "8px",
          padding: "1rem"
        }}>
          <p><strong>Status:</strong> {metrics.caps.ok ? "✅ All caps respected" : "❌ Cap violations detected"}</p>
          {metrics.caps.violations.length > 0 && (
            <div>
              <p><strong>Violations:</strong></p>
              <ul>
                {metrics.caps.violations.map((violation, index) => (
                  <li key={index} style={{ color: "#d32f2f" }}>{violation}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginBottom: "2rem" }}>
        <h2>Export Status</h2>
        <div style={{
          background: metrics.export_success ? "#e8f5e8" : "#ffe8e8",
          border: `1px solid ${metrics.export_success ? "#4CAF50" : "#f44336"}`,
          borderRadius: "8px",
          padding: "1rem"
        }}>
          <p><strong>Export Success:</strong> {metrics.export_success ? "✅ Successful" : "❌ Failed"}</p>
          <p><strong>Generated:</strong> {new Date(metrics.generated_at).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
