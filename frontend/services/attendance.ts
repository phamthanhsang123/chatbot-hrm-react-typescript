import { API_BASE } from './apiBase';
import { getStoredToken } from './authSession';

export interface AttendanceApiItem {
  id: number;
  employeeId: number;
  employeeName?: string;
  department?: string;
  date: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  totalHours: number;
  isLate: boolean;
  isEarlyLeave: boolean;
  note?: string | null;
  status: string;
}

export interface AttendanceActionResponse {
  success: boolean;
  message: string;
  data?: AttendanceApiItem;
}

export interface AttendanceMonthlyReportItem {
  employeeId: number;
  employeeName: string;
  department: string;
  totalDays: number;
  completedDays: number;
  lateDays: number;
  earlyLeaveDays: number;
  totalHours: number;
}

export interface AttendanceRequestApiItem {
  id: number;
  employeeName: string;
  employeeId: string;
  department: string;
  date: string;
  checkIn: string;
  checkOut: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | string;
  submittedAt: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  reviewNote?: string | null;
  type: 'supplement' | 'adjustment' | string;
  originalCheckIn?: string | null;
  originalCheckOut?: string | null;
}

async function request<T>(path: string, init?: RequestInit) {
  const token = getStoredToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${path} failed: ${res.status} ${text}`);
  }

  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export function checkInEmployeeAttendance(employeeId: number) {
  return request<AttendanceActionResponse>(`/api/admin/attendance/checkin/${employeeId}`, {
    method: 'POST',
  });
}

export function checkOutEmployeeAttendance(employeeId: number) {
  return request<AttendanceActionResponse>(`/api/admin/attendance/checkout/${employeeId}`, {
    method: 'POST',
  });
}

export function fetchAttendanceByDate(date: string) {
  return request<AttendanceApiItem[]>(`/api/admin/attendance?date=${encodeURIComponent(date)}`);
}

export function fetchAttendanceMonthlyReport(year: number, month: number) {
  return request<AttendanceMonthlyReportItem[]>(`/api/admin/attendance/report?year=${year}&month=${month}`);
}

export function fetchAttendanceRequests() {
  return request<AttendanceRequestApiItem[]>('/api/admin/attendance/requests');
}

export function approveAttendanceRequest(id: number, note?: string) {
  return request<AttendanceRequestApiItem>(`/api/admin/attendance/requests/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
}

export function rejectAttendanceRequest(id: number, note?: string) {
  return request<AttendanceRequestApiItem>(`/api/admin/attendance/requests/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
}
