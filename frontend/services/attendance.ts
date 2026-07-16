import { API_BASE } from './apiBase';

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
