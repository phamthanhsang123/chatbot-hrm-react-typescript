import { API_BASE } from './chatbot';

export type TaskStatus = 'NEW' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'REVISION_REQUIRED' | 'REJECTED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ReviewDecision = 'APPROVED' | 'REVISION_REQUIRED' | 'REJECTED';

export interface TaskReviewApiItem {
  id: number;
  taskId: number;
  managerId: number;
  managerName: string;
  qualityScore: number;
  deadlineScore: number;
  decision: ReviewDecision;
  comment?: string | null;
  createdAt: string;
}

export interface EmployeeTaskApiItem {
  id: number;
  employeeId: number;
  employeeName: string;
  managerId: number;
  managerName: string;
  departmentId?: number | null;
  departmentName?: string | null;
  title: string;
  description?: string | null;
  deadline: string;
  priority: TaskPriority;
  status: TaskStatus;
  progressPercent: number;
  expectedScore: number;
  isOverdue: boolean;
  createdAt: string;
  updatedAt: string;
  latestReview?: TaskReviewApiItem | null;
}

export interface UpdateTaskProgressPayload {
  progressPercent: number;
  note?: string;
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

export function getCurrentEmployeeId() {
  if (typeof window === 'undefined') return 1;

  const storedEmployeeId = window.localStorage.getItem('hrm_employee_id');
  const parsedStoredId = Number(storedEmployeeId);

  if (Number.isFinite(parsedStoredId) && parsedStoredId > 0) {
    return parsedStoredId;
  }

  const configuredId = Number(process.env.NEXT_PUBLIC_DEMO_EMPLOYEE_ID || 1);
  return Number.isFinite(configuredId) && configuredId > 0 ? configuredId : 1;
}

export function fetchEmployeeTasks(employeeId = getCurrentEmployeeId()) {
  return request<EmployeeTaskApiItem[]>(`/api/employee/tasks?employeeId=${employeeId}`);
}

export function updateEmployeeTaskProgress(
  taskId: number,
  payload: UpdateTaskProgressPayload,
  employeeId = getCurrentEmployeeId(),
) {
  return request<EmployeeTaskApiItem>(`/api/employee/tasks/${taskId}/progress?employeeId=${employeeId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function submitEmployeeTask(taskId: number, employeeId = getCurrentEmployeeId()) {
  return request<EmployeeTaskApiItem>(`/api/employee/tasks/${taskId}/submit?employeeId=${employeeId}`, {
    method: 'POST',
  });
}
