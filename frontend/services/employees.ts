import { API_BASE } from './apiBase';

export interface EmployeeApiItem {
  id: number;
  email: string;
  role: string;
  fullName: string;
  phone?: string | null;
  cccd?: string | null;
  status: string;
  departmentId?: number | null;
  departmentName?: string | null;
  positionId?: number | null;
  positionTitle?: string | null;
  salaryBase?: number | null;
}

export interface DepartmentOption {
  id: number;
  name: string;
}

export interface PositionOption {
  id: number;
  title: string;
  departmentId?: number | null;
}

export interface EmployeePayload {
  email: string;
  role: string;
  fullName: string;
  phone?: string | null;
  cccd?: string | null;
  status: string;
  departmentId?: number | null;
  positionId?: number | null;
  salaryBase?: number | null;
  password?: string;
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

  return res.json() as Promise<T>;
}

export function fetchEmployees() {
  return request<EmployeeApiItem[]>('/api/admin/employees');
}

export function fetchEmployeeById(id: number) {
  return request<EmployeeApiItem>(`/api/admin/employees/${id}`);
}

export function fetchDepartments() {
  return request<DepartmentOption[]>('/api/admin/employees/departments');
}

export function fetchPositions() {
  return request<PositionOption[]>('/api/admin/employees/positions');
}

export function createEmployee(payload: EmployeePayload) {
  return request<EmployeeApiItem>('/api/admin/employees', {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      password: payload.password || '123456',
    }),
  });
}

export function updateEmployee(id: number, payload: EmployeePayload) {
  const body = { ...payload };
  delete body.password;

  return request<{ message: string }>(`/api/admin/employees/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function deleteEmployee(id: number) {
  return request<{ message: string }>(`/api/admin/employees/${id}`, {
    method: 'DELETE',
  });
}
