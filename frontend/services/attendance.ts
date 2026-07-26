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
  workReportTitle?: string | null;
  workReportDescription?: string | null;
  workReportNote?: string | null;
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
  employeeId: number | string;
  employeeCode?: string;
  employeeName: string;
  departmentId?: number | null;
  department: string;
  workDate?: string;
  date?: string;
  requestType?: 'SUPPLEMENT' | 'ADJUSTMENT';
  type?: 'supplement' | 'adjustment';
  requestedCheckIn?: string | null;
  requestedCheckOut?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  originalCheckIn?: string | null;
  originalCheckOut?: string | null;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string | null;
  reviewedById?: number | null;
  reviewedBy?: string | null;
  reviewNote?: string | null;
  workReportTitle?: string | null;
  workReportDescription?: string | null;
}

export interface CreateAttendanceRequestPayload {
  employeeId: number;
  workDate: string;
  requestType: 'SUPPLEMENT' | 'ADJUSTMENT';
  requestedCheckIn: string;
  requestedCheckOut: string;
  reason: string;
  workReportTitle?: string;
  workReportDescription?: string;
}

export interface AttendanceCheckOutPayload {
  workReportTitle?: string;
  workReportDescription?: string;
  workReportNote?: string;
}

export interface AttendanceShiftApiItem {
  id: number;
  employeeId: number;
  workDate: string;
  startTime: string;
  endTime: string;
  title: string;
  description?: string | null;
  status: 'PLANNED' | 'WORKING' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
}

export interface SaveAttendanceShiftPayload {
  employeeId: number;
  workDate: string;
  startTime: string;
  endTime: string;
  title: string;
  description?: string;
}

async function request<T>(path: string, init?: RequestInit) {
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('hrm_token') : null;
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
    let message = text;
    try {
      const payload = JSON.parse(text) as { message?: string };
      message = payload.message || text;
    } catch {
      // Keep the original response when it is not JSON.
    }
    throw new Error(message || `${path} thất bại (${res.status}).`);
  }

  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export function checkInEmployeeAttendance(employeeId: number) {
  return request<AttendanceActionResponse>(`/api/admin/attendance/checkin/${employeeId}`, {
    method: 'POST',
  });
}

export function checkOutEmployeeAttendance(employeeId: number, payload?: AttendanceCheckOutPayload) {
  return request<AttendanceActionResponse>(`/api/admin/attendance/checkout/${employeeId}`, {
    method: 'POST',
    body: JSON.stringify(payload || {}),
  });
}

export function fetchAttendanceByDate(date: string) {
  return request<AttendanceApiItem[]>(`/api/admin/attendance?date=${encodeURIComponent(date)}`);
}

export function fetchAttendanceMonthlyReport(year: number, month: number) {
  return request<AttendanceMonthlyReportItem[]>(`/api/admin/attendance/report?year=${year}&month=${month}`);
}

export function fetchAttendanceMonthlyRecords(year: number, month: number) {
  return request<AttendanceApiItem[]>(`/api/admin/attendance/records?year=${year}&month=${month}`);
}

export function updateAttendanceWorkReport(
  attendanceId: number,
  payload: AttendanceCheckOutPayload,
) {
  return request<AttendanceApiItem>(`/api/admin/attendance/records/${attendanceId}/report`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function fetchAttendanceRequests(status?: AttendanceRequestApiItem['status'] | 'ALL') {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return request<AttendanceRequestApiItem[]>(`/api/admin/attendance/requests${query}`);
}

export function createAttendanceRequest(payload: CreateAttendanceRequestPayload) {
  return request<AttendanceRequestApiItem>('/api/admin/attendance/requests', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function reviewAttendanceRequest(
  requestId: number,
  action: 'approve' | 'reject',
  note?: string,
) {
  return request<AttendanceRequestApiItem>(
    `/api/admin/attendance/requests/${requestId}/${action}`,
    {
      method: 'POST',
      body: JSON.stringify({ note: note || null }),
    },
  );
}

export function fetchAttendanceShifts(year: number, month: number, employeeId?: number) {
  const employeeQuery = employeeId ? `&employeeId=${employeeId}` : '';
  return request<AttendanceShiftApiItem[]>(
    `/api/admin/attendance/shifts?year=${year}&month=${month}${employeeQuery}`,
  );
}

export function createAttendanceShift(payload: SaveAttendanceShiftPayload) {
  return request<AttendanceShiftApiItem>('/api/admin/attendance/shifts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateAttendanceShift(id: number, payload: SaveAttendanceShiftPayload) {
  return request<AttendanceShiftApiItem>(`/api/admin/attendance/shifts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteAttendanceShift(id: number) {
  return request<void>(`/api/admin/attendance/shifts/${id}`, {
    method: 'DELETE',
  });
}
