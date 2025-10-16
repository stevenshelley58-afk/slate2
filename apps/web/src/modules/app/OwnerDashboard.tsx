import React, { useState, useEffect } from "react";
import type { OwnerDashboardResponse } from "@slate/api-types";

export function OwnerDashboard() {
  const [data, setData] = useState<OwnerDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Mock data for now - in real implementation, this would fetch from API
    const mockData: OwnerDashboardResponse = {
      kpis: {
        ks_median: 0.87,
        entropy_pass_percentage: 78.5,
        novelty_percentage: 82.3,
        coverage_percentage: 89.2,
        export_success_percentage: 94.7,
        total_runs: 156,
        successful_runs: 148,
        failed_runs: 8,
        last_updated: new Date().toISOString(),
      },
      recent_runs: [
        {
          run_id: "550e8400-e29b-41d4-a716-446655440001",
          url: "https://example.com/product1",
          status: "success",
          created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          coverage: 0.92,
        },
        {
          run_id: "550e8400-e29b-41d4-a716-446655440002",
          url: "https://example.com/product2",
          status: "success",
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          coverage: 0.88,
        },
        {
          run_id: "550e8400-e29b-41d4-a716-446655440003",
          url: "https://example.com/product3",
          status: "failed",
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
          coverage: 0.45,
        },
      ],
      trends: {
        daily_runs: [
          { date: "2024-01-01", runs: 12, success_rate: 0.92 },
          { date: "2024-01-02", runs: 15, success_rate: 0.87 },
          { date: "2024-01-03", runs: 18, success_rate: 0.94 },
          { date: "2024-01-04", runs: 14, success_rate: 0.89 },
          { date: "2024-01-05", runs: 16, success_rate: 0.91 },
        ],
        coverage_trend: [
          { date: "2024-01-01", avg_coverage: 0.88 },
          { date: "2024-01-02", avg_coverage: 0.85 },
          { date: "2024-01-03", avg_coverage: 0.91 },
          { date: "2024-01-04", avg_coverage: 0.89 },
          { date: "2024-01-05", avg_coverage: 0.92 },
        ],
      },
    };

    // Simulate API call
    setTimeout(() => {
      setData(mockData);
      setLoading(false);
    }, 500);
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p>Loading owner dashboard...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "2rem", color: "red" }}>
        <p>Error loading dashboard data: {error || "Unknown error"}</p>
      </div>
    );
  }

  const { kpis, recent_runs, trends } = data;

  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1>Owner Dashboard</h1>
      <p style={{ color: "#666", marginBottom: "2rem" }}>
        Last updated: {new Date(kpis.last_updated).toLocaleString()}
      </p>

      <div style={{ marginBottom: "2rem" }}>
        <h2>Key Performance Indicators</h2>
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", 
          gap: "1rem",
          marginBottom: "2rem"
        }}>
          <div style={{ background: "#f0f8ff", padding: "1.5rem", borderRadius: "8px", border: "1px solid #e0e0e0" }}>
            <h3 style={{ margin: "0 0 0.5rem 0", color: "#1976d2" }}>KS Median</h3>
            <p style={{ fontSize: "2rem", margin: "0", fontWeight: "bold" }}>
              {(kpis.ks_median * 100).toFixed(1)}%
            </p>
            <p style={{ margin: "0.5rem 0 0 0", color: "#666", fontSize: "0.9rem" }}>
              Kolmogorov-Smirnov test median
            </p>
          </div>

          <div style={{ background: "#f0fff0", padding: "1.5rem", borderRadius: "8px", border: "1px solid #e0e0e0" }}>
            <h3 style={{ margin: "0 0 0.5rem 0", color: "#388e3c" }}>Entropy Pass %</h3>
            <p style={{ fontSize: "2rem", margin: "0", fontWeight: "bold" }}>
              {kpis.entropy_pass_percentage.toFixed(1)}%
            </p>
            <p style={{ margin: "0.5rem 0 0 0", color: "#666", fontSize: "0.9rem" }}>
              Entropy validation success rate
            </p>
          </div>

          <div style={{ background: "#fff8e1", padding: "1.5rem", borderRadius: "8px", border: "1px solid #e0e0e0" }}>
            <h3 style={{ margin: "0 0 0.5rem 0", color: "#f57c00" }}>Novelty %</h3>
            <p style={{ fontSize: "2rem", margin: "0", fontWeight: "bold" }}>
              {kpis.novelty_percentage.toFixed(1)}%
            </p>
            <p style={{ margin: "0.5rem 0 0 0", color: "#666", fontSize: "0.9rem" }}>
              Novel content generation rate
            </p>
          </div>

          <div style={{ background: "#f3e5f5", padding: "1.5rem", borderRadius: "8px", border: "1px solid #e0e0e0" }}>
            <h3 style={{ margin: "0 0 0.5rem 0", color: "#7b1fa2" }}>Coverage %</h3>
            <p style={{ fontSize: "2rem", margin: "0", fontWeight: "bold" }}>
              {kpis.coverage_percentage.toFixed(1)}%
            </p>
            <p style={{ margin: "0.5rem 0 0 0", color: "#666", fontSize: "0.9rem" }}>
              Overall content coverage
            </p>
          </div>

          <div style={{ background: "#e8f5e8", padding: "1.5rem", borderRadius: "8px", border: "1px solid #e0e0e0" }}>
            <h3 style={{ margin: "0 0 0.5rem 0", color: "#2e7d32" }}>Export Success %</h3>
            <p style={{ fontSize: "2rem", margin: "0", fontWeight: "bold" }}>
              {kpis.export_success_percentage.toFixed(1)}%
            </p>
            <p style={{ margin: "0.5rem 0 0 0", color: "#666", fontSize: "0.9rem" }}>
              Successful export rate
            </p>
          </div>
        </div>

        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
          gap: "1rem" 
        }}>
          <div style={{ background: "#f9f9f9", padding: "1rem", borderRadius: "8px" }}>
            <h4>Total Runs</h4>
            <p style={{ fontSize: "1.5rem", margin: "0", fontWeight: "bold" }}>{kpis.total_runs}</p>
          </div>
          <div style={{ background: "#e8f5e8", padding: "1rem", borderRadius: "8px" }}>
            <h4>Successful</h4>
            <p style={{ fontSize: "1.5rem", margin: "0", fontWeight: "bold", color: "#2e7d32" }}>{kpis.successful_runs}</p>
          </div>
          <div style={{ background: "#ffe8e8", padding: "1rem", borderRadius: "8px" }}>
            <h4>Failed</h4>
            <p style={{ fontSize: "1.5rem", margin: "0", fontWeight: "bold", color: "#d32f2f" }}>{kpis.failed_runs}</p>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: "2rem" }}>
        <h2>Recent Runs</h2>
        <div style={{ background: "#f9f9f9", borderRadius: "8px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#e0e0e0" }}>
                <th style={{ padding: "1rem", textAlign: "left" }}>Run ID</th>
                <th style={{ padding: "1rem", textAlign: "left" }}>URL</th>
                <th style={{ padding: "1rem", textAlign: "left" }}>Status</th>
                <th style={{ padding: "1rem", textAlign: "left" }}>Coverage</th>
                <th style={{ padding: "1rem", textAlign: "left" }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {recent_runs.map((run) => (
                <tr key={run.run_id} style={{ borderTop: "1px solid #e0e0e0" }}>
                  <td style={{ padding: "1rem", fontFamily: "monospace", fontSize: "0.9rem" }}>
                    {run.run_id.substring(0, 8)}...
                  </td>
                  <td style={{ padding: "1rem" }}>
                    <a href={run.url} target="_blank" rel="noopener noreferrer" style={{ color: "#1976d2" }}>
                      {run.url}
                    </a>
                  </td>
                  <td style={{ padding: "1rem" }}>
                    <span style={{
                      padding: "0.25rem 0.5rem",
                      borderRadius: "4px",
                      fontSize: "0.8rem",
                      fontWeight: "bold",
                      background: run.status === "success" ? "#e8f5e8" : run.status === "failed" ? "#ffe8e8" : "#fff3e0",
                      color: run.status === "success" ? "#2e7d32" : run.status === "failed" ? "#d32f2f" : "#f57c00"
                    }}>
                      {run.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: "1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <div style={{
                        background: "#e0e0e0",
                        borderRadius: "4px",
                        height: "8px",
                        width: "100px",
                        overflow: "hidden"
                      }}>
                        <div style={{
                          background: run.coverage >= 0.8 ? "#4CAF50" : run.coverage >= 0.6 ? "#FF9800" : "#f44336",
                          height: "100%",
                          width: `${run.coverage * 100}%`
                        }} />
                      </div>
                      <span>{(run.coverage * 100).toFixed(1)}%</span>
                    </div>
                  </td>
                  <td style={{ padding: "1rem", color: "#666" }}>
                    {new Date(run.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginBottom: "2rem" }}>
        <h2>Trends</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem" }}>
          <div style={{ background: "#f9f9f9", padding: "1rem", borderRadius: "8px" }}>
            <h3>Daily Runs & Success Rate</h3>
            <div style={{ height: "200px", display: "flex", alignItems: "end", gap: "4px" }}>
              {trends.daily_runs.map((day, index) => (
                <div key={day.date} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                  <div style={{
                    background: day.success_rate >= 0.9 ? "#4CAF50" : day.success_rate >= 0.8 ? "#FF9800" : "#f44336",
                    height: `${(day.runs / 20) * 150}px`,
                    width: "100%",
                    borderRadius: "4px 4px 0 0",
                    marginBottom: "0.5rem"
                  }} />
                  <div style={{ fontSize: "0.7rem", textAlign: "center" }}>
                    <div>{day.runs}</div>
                    <div style={{ color: "#666" }}>{(day.success_rate * 100).toFixed(0)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: "#f9f9f9", padding: "1rem", borderRadius: "8px" }}>
            <h3>Coverage Trend</h3>
            <div style={{ height: "200px", display: "flex", alignItems: "end", gap: "4px" }}>
              {trends.coverage_trend.map((day, index) => (
                <div key={day.date} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                  <div style={{
                    background: day.avg_coverage >= 0.8 ? "#4CAF50" : day.avg_coverage >= 0.6 ? "#FF9800" : "#f44336",
                    height: `${day.avg_coverage * 200}px`,
                    width: "100%",
                    borderRadius: "4px 4px 0 0",
                    marginBottom: "0.5rem"
                  }} />
                  <div style={{ fontSize: "0.7rem", textAlign: "center" }}>
                    <div>{(day.avg_coverage * 100).toFixed(0)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
