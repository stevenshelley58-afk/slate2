import type {
  RunSummary,
  SelectedSegmentsResponse,
} from "@slate/api-types";

/**
 * Typed API client for Slate backend services
 * 
 * This client provides type-safe methods for interacting with the Slate API.
 * All methods return promises and use the types defined in @slate/api-types.
 */
export class SlateApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = "/api") {
    this.baseUrl = baseUrl;
  }

  /**
   * Fetch run summary by run ID
   */
  async getRunSummary(runId: string): Promise<RunSummary> {
    const response = await fetch(`${this.baseUrl}/runs/${runId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch run summary: ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Fetch selected segments for a run
   */
  async getSelectedSegments(runId: string): Promise<SelectedSegmentsResponse> {
    const response = await fetch(`${this.baseUrl}/runs/${runId}/segments`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch selected segments: ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * List all runs for a tenant
   */
  async listRuns(tenantId: string): Promise<RunSummary[]> {
    const response = await fetch(`${this.baseUrl}/tenants/${tenantId}/runs`);
    
    if (!response.ok) {
      throw new Error(`Failed to list runs: ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Create a new run
   */
  async createRun(tenantId: string, data: {
    anchor_set_version: string;
    model_revision: string;
    url: string;
    locale?: string;
    currency?: string;
  }): Promise<RunSummary> {
    const response = await fetch(`${this.baseUrl}/tenants/${tenantId}/runs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create run: ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Update run autopilot setting
   */
  async updateRunAutopilot(runId: string, autopilotEnabled: boolean): Promise<RunSummary> {
    const response = await fetch(`${this.baseUrl}/runs/${runId}/autopilot`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ autopilot_enabled: autopilotEnabled }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update run autopilot: ${response.statusText}`);
    }
    
    return response.json();
  }
}

/**
 * Default API client instance
 */
export const apiClient = new SlateApiClient();

/**
 * Utility function to create a new API client with custom base URL
 */
export function createApiClient(baseUrl: string): SlateApiClient {
  return new SlateApiClient(baseUrl);
}
