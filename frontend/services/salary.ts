import { API_BASE } from './chatbot';

export interface SalaryDashboardApi {
  totalNet: number;
  avgNet: number;
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
  totalIncome: number;
  netPay: number;
  status: string;
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

export function fetchSalaryDashboard(month: number, year: number) {
  return request<SalaryDashboardApi>(`/api/admin/salary/dashboard?month=${month}&year=${year}`);
}

export function fetchSalaryRows(month: number, year: number, status?: string) {
  const statusQuery = status && status !== 'all' ? `&status=${encodeURIComponent(status)}` : '';
  return request<SalaryRowApiItem[]>(`/api/admin/salary?month=${month}&year=${year}${statusQuery}`);
}

export function calculateMonthlySalary(month: number, year: number) {
  return request<{ message: string }>(`/api/admin/salary/calculate?month=${month}&year=${year}`, {
    method: 'POST',
  });
}

export function approveSalary(id: number) {
  return request<string>(`/api/admin/salary/${id}/approve`, {
    method: 'POST',
  });
}

export function paySalary(id: number) {
  return request<string>(`/api/admin/salary/${id}/pay`, {
    method: 'POST',
  });
}
