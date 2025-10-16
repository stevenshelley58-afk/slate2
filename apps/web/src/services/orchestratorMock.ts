import { RUN_STAGES, type RunStage, type StageStatus } from "@slate/state-machine";

export interface StageData {
  stage: RunStage;
  status: StageStatus;
  entered_at: string | null;
  exited_at: string | null;
  gate?: RunStage;
  blocking_reason: string | null;
}

export interface RunStagesResponse {
  run_id: string;
  stages: StageData[];
}

export class OrchestratorMock {
  private static instance: OrchestratorMock;
  private runs: Map<string, RunStagesResponse> = new Map();

  static getInstance(): OrchestratorMock {
    if (!OrchestratorMock.instance) {
      OrchestratorMock.instance = new OrchestratorMock();
    }
    return OrchestratorMock.instance;
  }

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData() {
    // Create mock data for demo runs
    const demoRuns = [
      'demo-run-123',
      'demo-run-456',
      'demo-run-789'
    ];

    demoRuns.forEach(runId => {
      this.runs.set(runId, this.generateMockStages(runId));
    });
  }

  private generateMockStages(runId: string): RunStagesResponse {
    const stages: StageData[] = RUN_STAGES.map((stage, index) => {
      let status: StageStatus = "pending";
      let entered_at: string | null = null;
      let exited_at: string | null = null;
      let blocking_reason: string | null = null;

      // Simulate different run states based on runId
      const runSeed = runId.split('-').pop() || '123';
      const seedNum = parseInt(runSeed) % 3;

      if (seedNum === 0) {
        // Completed run
        if (index < RUN_STAGES.length - 1) {
          status = "completed";
          entered_at = new Date(Date.now() - (RUN_STAGES.length - index) * 1000 * 60).toISOString();
          exited_at = new Date(Date.now() - (RUN_STAGES.length - index - 1) * 1000 * 60).toISOString();
        } else {
          status = "active";
          entered_at = new Date(Date.now() - 1000 * 60).toISOString();
        }
      } else if (seedNum === 1) {
        // Partially completed run with some blocked stages
        if (index < 4) {
          status = "completed";
          entered_at = new Date(Date.now() - (4 - index) * 1000 * 60).toISOString();
          exited_at = new Date(Date.now() - (3 - index) * 1000 * 60).toISOString();
        } else if (index === 4) {
          status = "active";
          entered_at = new Date(Date.now() - 1000 * 60).toISOString();
        } else if (index === 5) {
          status = "blocked";
          entered_at = new Date(Date.now() - 30 * 1000).toISOString();
          blocking_reason = "Waiting for user approval";
        }
      } else {
        // Failed run
        if (index < 3) {
          status = "completed";
          entered_at = new Date(Date.now() - (3 - index) * 1000 * 60).toISOString();
          exited_at = new Date(Date.now() - (2 - index) * 1000 * 60).toISOString();
        } else if (index === 3) {
          status = "failed";
          entered_at = new Date(Date.now() - 1000 * 60).toISOString();
          exited_at = new Date(Date.now() - 30 * 1000).toISOString();
          blocking_reason = "Scraping failed: Invalid URL";
        }
      }

      return {
        stage,
        status,
        entered_at,
        exited_at,
        gate: status === "blocked" ? stage : undefined,
        blocking_reason,
      };
    });

    return {
      run_id: runId,
      stages,
    };
  }

  async getRunStages(runId: string): Promise<RunStagesResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

    const runData = this.runs.get(runId);
    if (!runData) {
      throw new Error(`Run ${runId} not found`);
    }

    return runData;
  }

  async createRun(url: string, tenantId: string = "demo-tenant"): Promise<{ run_id: string }> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));

    const runId = `run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.runs.set(runId, this.generateMockStages(runId));

    return { run_id: runId };
  }

  async resumeRun(runId: string, stage: RunStage): Promise<RunStagesResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 250));

    const runData = this.runs.get(runId);
    if (!runData) {
      throw new Error(`Run ${runId} not found`);
    }

    // Update the stage status to active
    const updatedStages = runData.stages.map(s => {
      if (s.stage === stage) {
        return {
          ...s,
          status: "active" as StageStatus,
          entered_at: new Date().toISOString(),
          blocking_reason: null,
        };
      }
      return s;
    });

    const updatedRun = {
      ...runData,
      stages: updatedStages,
    };

    this.runs.set(runId, updatedRun);
    return updatedRun;
  }
}

// Export singleton instance
export const orchestratorMock = OrchestratorMock.getInstance();
