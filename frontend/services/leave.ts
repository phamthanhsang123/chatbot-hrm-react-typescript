import { API_BASE } from './chatbot';

export interface LeaveRequestApiItem {
  id: number;
  employeeId: number;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: string;
}

export interface LeaveDashboardApi {
  pending: number;
  approved: number;
  rejected: number;
  onLeaveToday: number;
}

export interface LeaveCreatePayload {
  employeeId: number;
  leaveTypeId?: number;
  leaveType?: string;
  startDate: string;
  endDate: string;
  reason: string;
}

async function request<T>(path: string, init?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${path} failed: ${res.status} ${text}`);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export function fetchLeaveRequests(status?: string) {
  const query = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
  return request<LeaveRequestApiItem[]>(`/api/admin/leave-requests${query}`);
}

export function fetchLeaveDashboard() {
  return request<LeaveDashboardApi>('/api/admin/leave-requests/dashboard');
}

export function createLeaveRequest(payload: LeaveCreatePayload) {
  return request<LeaveRequestApiItem>('/api/admin/leave-requests', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function approveLeaveRequest(id: number) {
  return request<void>(`/api/admin/leave-requests/${id}/approve`, {
    method: 'POST',
  });
}

export function rejectLeaveRequest(id: number) {
  return request<void>(`/api/admin/leave-requests/${id}/reject`, {
    method: 'POST',
  });
}
