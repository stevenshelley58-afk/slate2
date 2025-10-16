// Export-related API types
export interface ExportRequest {
  runId: string;
  format: 'json' | 'csv' | 'zip';
  includeAssets?: boolean;
}

export interface ExportResponse {
  exportId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  errorMessage?: string;
}

export interface ExportStatus {
  exportId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  createdAt: string;
  completedAt?: string;
}
