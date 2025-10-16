import React, { useState, useEffect } from "react";
import { RUN_STAGES, type RunStage, type StageStatus } from "@slate/state-machine";
import { orchestratorMock, type StageData, type RunStagesResponse } from "../../services/orchestratorMock";

interface RunTimelineProps {
  runId: string;
}

export function RunTimeline({ runId }: RunTimelineProps) {
  const [stages, setStages] = useState<StageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resumingStage, setResumingStage] = useState<RunStage | null>(null);

  useEffect(() => {
    const fetchStages = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await orchestratorMock.getRunStages(runId);
        setStages(response.stages);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch stages");
      } finally {
        setLoading(false);
      }
    };

    fetchStages();
  }, [runId]);

  const handleResumeStage = async (stage: RunStage) => {
    try {
      setResumingStage(stage);
      const response = await orchestratorMock.resumeRun(runId, stage);
      setStages(response.stages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resume stage");
    } finally {
      setResumingStage(null);
    }
  };

  const getStatusColor = (status: StageStatus) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "active":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "blocked":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "failed":
        return "bg-red-100 text-red-800 border-red-200";
      case "pending":
      default:
        return "bg-gray-100 text-gray-600 border-gray-200";
    }
  };

  const getStatusIcon = (status: StageStatus) => {
    switch (status) {
      case "completed":
        return "✓";
      case "active":
        return "⟳";
      case "blocked":
        return "⏸";
      case "failed":
        return "✗";
      case "pending":
      default:
        return "○";
    }
  };

  const formatDuration = (enteredAt: string | null, exitedAt: string | null) => {
    if (!enteredAt) return null;
    
    const start = new Date(enteredAt);
    const end = exitedAt ? new Date(exitedAt) : new Date();
    const durationMs = end.getTime() - start.getTime();
    
    if (durationMs < 1000) return "< 1s";
    if (durationMs < 60000) return `${Math.round(durationMs / 1000)}s`;
    return `${Math.round(durationMs / 60000)}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">Loading timeline...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Run Timeline: {runId}
        </h1>
        <p className="text-gray-600">
          Track the progress of your creative run through each stage
        </p>
      </div>

      <div className="space-y-4">
        {stages.map((stageData, index) => (
          <div
            key={stageData.stage}
            className="flex items-center space-x-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm"
          >
            {/* Stage number */}
            <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
              {index + 1}
            </div>

            {/* Stage chip */}
            <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(stageData.status)}`}>
              <span className="mr-2">{getStatusIcon(stageData.status)}</span>
              {stageData.stage}
            </div>

            {/* Status details */}
            <div className="flex-1 min-w-0">
              <div className="text-sm text-gray-600">
                {stageData.status === "active" && "Currently running"}
                {stageData.status === "completed" && "Completed"}
                {stageData.status === "blocked" && `Blocked: ${stageData.blocking_reason}`}
                {stageData.status === "failed" && "Failed"}
                {stageData.status === "pending" && "Waiting to start"}
              </div>
              
              {stageData.entered_at && (
                <div className="text-xs text-gray-500 mt-1">
                  Started: {new Date(stageData.entered_at).toLocaleString()}
                  {stageData.exited_at && (
                    <span className="ml-2">
                      • Completed: {new Date(stageData.exited_at).toLocaleString()}
                    </span>
                  )}
                  {formatDuration(stageData.entered_at, stageData.exited_at) && (
                    <span className="ml-2">
                      • Duration: {formatDuration(stageData.entered_at, stageData.exited_at)}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Progress indicator and actions */}
            <div className="flex-shrink-0 flex items-center space-x-2">
              {stageData.status === "active" && (
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              )}
              {stageData.status === "blocked" && (
                <button
                  onClick={() => handleResumeStage(stageData.stage)}
                  disabled={resumingStage === stageData.stage}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resumingStage === stageData.stage ? "Resuming..." : "Resume"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {stages.filter(s => s.status === "completed").length}
            </div>
            <div className="text-gray-600">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {stages.filter(s => s.status === "active").length}
            </div>
            <div className="text-gray-600">Active</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {stages.filter(s => s.status === "blocked").length}
            </div>
            <div className="text-gray-600">Blocked</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {stages.filter(s => s.status === "failed").length}
            </div>
            <div className="text-gray-600">Failed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">
              {stages.filter(s => s.status === "pending").length}
            </div>
            <div className="text-gray-600">Pending</div>
          </div>
        </div>
      </div>
    </div>
  );
}
