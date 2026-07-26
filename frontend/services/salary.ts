import { API_BASE } from './apiBase';
import { getStoredToken } from './authSession';

export interface SalaryDashboardApi {
  totalGross?: number;
  totalNet: number;
  avgNet: number;
  totalBonus?: number;
  totalDeduction?: number;
  pending: number;
  count: number;
}

export interface SalaryRowApiItem {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  department: string;
  position: string;
  salaryBase: number;
  bonus: number;
  allowance?: number;
  overtimePay?: number;
  salaryDeduction?: number;
  insuranceDeduction?: number;
  taxDeduction?: number;
  penaltyDeduction?: number;
  totalIncome: number;
  totalDeduction?: number;
  netPay: number;
  standardDays?: number;
  workDays?: number;
  paidLeaveDays?: number;
  unpaidLeaveDays?: number;
  lateDays?: number;
  earlyLeaveDays?: number;
  overtimeHours?: number;
  status: string;
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
    let message = text;

    try {
      const payload = JSON.parse(text) as { message?: string };
      message = payload.message || text;
    } catch {
      // Keep plain-text errors returned by older backend endpoints.
    }

    throw new Error(message || `${path} failed: ${res.status}`);
  }

  const text = await res.text();
  if (!text) return undefined as T;

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return JSON.parse(text) as T;
  }

  return text as T;
}

export function fetchSalaryDashboard(month: number, year: number) {
  return request<SalaryDashboardApi>(`/api/admin/salary/dashboard?month=${month}&year=${year}`);
}

export function fetchSalaryRows(month: number, year: number, status?: string) {
  const statusQuery = status && status !== 'all' ? `&status=${encodeURIComponent(status)}` : '';
  return request<SalaryRowApiItem[]>(`/api/admin/salary?month=${month}&year=${year}${statusQuery}`);
}

export function fetchManagerSalaryRows(managerId: number, month: number, year: number, status?: string) {
  const statusQuery = status && status !== 'all' ? `&status=${encodeURIComponent(status)}` : '';
  return request<SalaryRowApiItem[]>(
    `/api/manager/salary?managerId=${managerId}&month=${month}&year=${year}${statusQuery}`,
  );
}

export function fetchEmployeeSalaryRows(employeeId: number, month: number, year: number) {
  return request<SalaryRowApiItem[]>(
    `/api/employee/salary?employeeId=${employeeId}&month=${month}&year=${year}`,
  );
}

export function calculateMonthlySalary(month: number, year: number) {
  return request<{ message: string }>(`/api/admin/salary/calculate?month=${month}&year=${year}`, {
    method: 'POST',
  });
}

export function approveSalary(id: number) {
  return request<{ message: string }>(`/api/admin/salary/${id}/approve`, {
    method: 'POST',
  });
}

export function paySalary(id: number) {
  return request<{ message: string }>(`/api/admin/salary/${id}/pay`, {
    method: 'POST',
  });
}
