import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { RunTimeline } from "../runs/RunTimeline";
import { SsrGatesView } from "../runs/SsrGatesView";
import { ExportView } from "./ExportView.js";
import { OwnerDashboard } from "./OwnerDashboard.js";

export function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900">
                  Slate Creative Control Center
                </h1>
              </div>
            </div>
          </div>
        </nav>

        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/runs/:runId" element={<RunTimelinePage />} />
            <Route path="/runs/:runId/ssr" element={<SsrGatesPage />} />
            <Route path="/runs/:runId/export" element={<ExportViewPage />} />
            <Route path="/owner" element={<OwnerDashboard />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

function HomePage() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Slate Creative Control Center
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Implement Express and Owner workflows by consuming orchestrator APIs,
          state machine feeds, and artifact previews.
        </p>
        
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Run Timeline Demo
            </h2>
            <p className="text-gray-600 mb-4">
              View the timeline for different sample runs to see various stage progressions.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a
                href="/runs/demo-run-123"
                className="block p-4 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
              >
                <div className="font-medium text-blue-900">Completed Run</div>
                <div className="text-sm text-blue-700">All stages completed successfully</div>
              </a>
              <a
                href="/runs/demo-run-456"
                className="block p-4 bg-yellow-50 rounded-md hover:bg-yellow-100 transition-colors"
              >
                <div className="font-medium text-yellow-900">Blocked Run</div>
                <div className="text-sm text-yellow-700">Some stages blocked, waiting for input</div>
              </a>
              <a
                href="/runs/demo-run-789"
                className="block p-4 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
              >
                <div className="font-medium text-red-900">Failed Run</div>
                <div className="text-sm text-red-700">Run failed at scraping stage</div>
              </a>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              SSR Gates Analysis
            </h2>
            <p className="text-gray-600 mb-4">
              View SSR quality gates and thresholds for statistical significance reporting.
            </p>
            <a
              href="/runs/demo-run-123/ssr"
              className="inline-block bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
            >
              View SSR Gates
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function RunTimelinePage() {
  // Extract runId from URL - in a real app, this would come from useParams
  const runId = window.location.pathname.split('/runs/')[1] || 'demo-run-123';
  
  return <RunTimeline runId={runId} />;
}

function ExportViewPage() {
  // Extract runId from URL - in a real app, this would come from useParams
  const runId = window.location.pathname.split('/runs/')[1]?.split('/export')[0] || 'demo-run-123';
  
  return <ExportView runId={runId} />;
}

function SsrGatesPage() {
  // Extract runId from URL - in a real app, this would come from useParams
  const runId = window.location.pathname.split('/runs/')[1]?.split('/ssr')[0] || 'demo-run-123';
  
  // Mock metrics for demonstration - in real app this would come from API
  const mockMetrics = {
    relevanceMean: 4.2,
    ks: 0.92,
    entropy: 1.45,
    entropyCoverageRatio: 0.78,
    bimodalShare: 0.35,
    separation: 0.18,
    purchaseIntentMean: 4.3,
    purchaseIntentHighMass: 0.75,
    fastTrack: true
  };
  
  return <SsrGatesView runId={runId} metrics={mockMetrics} />;
}