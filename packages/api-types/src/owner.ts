// Owner-related API types
export interface Owner {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
  createdAt: string;
  updatedAt: string;
}

export interface CreateOwnerRequest {
  name: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
}

export interface UpdateOwnerRequest {
  name?: string;
  email?: string;
  role?: 'admin' | 'user' | 'viewer';
}
