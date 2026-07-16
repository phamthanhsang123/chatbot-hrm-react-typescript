import { API_BASE } from './apiBase';

export type TaskStatus = 'NEW' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'REVISION_REQUIRED' | 'REJECTED' | 'OVERDUE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TaskReviewDecision = 'APPROVED' | 'REVISION_REQUIRED' | 'REJECTED';
export type ReviewDecision = TaskReviewDecision;

export interface TaskReviewApiItem {
  id: number;
  taskId: number;
  managerId: number;
  managerName: string;
  qualityScore: number;
  deadlineScore: number;
  decision: TaskReviewDecision;
  comment?: string | null;
  createdAt: string;
}

export interface TaskApiItem {
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

export type EmployeeTaskApiItem = TaskApiItem;

export interface TaskPeriodQuery {
  month?: number;
  year?: number;
}

export interface CreateTaskPayload {
  employeeId: number;
  title: string;
  description?: string | null;
  deadline: string;
  priority: TaskPriority;
  expectedScore: number;
}

export type UpdateTaskPayload = Omit<CreateTaskPayload, 'employeeId'>;

export interface UpdateTaskProgressPayload {
  progressPercent: number;
  note?: string | null;
}

export interface ReviewTaskPayload {
  qualityScore: number;
  deadlineScore: number;
  decision: TaskReviewDecision;
  comment?: string | null;
}

function periodQuery(period?: TaskPeriodQuery) {
  if (!period?.month || !period?.year) return '';
  return `&month=${period.month}&year=${period.year}`;
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

export function fetchManagerTasks(managerId: number, period?: TaskPeriodQuery) {
  return request<TaskApiItem[]>(`/api/manager/tasks?managerId=${managerId}${periodQuery(period)}`);
}

export function fetchTaskById(taskId: number) {
  return request<TaskApiItem>(`/api/manager/tasks/${taskId}`);
}

export function createManagerTask(managerId: number, payload: CreateTaskPayload) {
  return request<TaskApiItem>(`/api/manager/tasks?managerId=${managerId}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateManagerTask(managerId: number, taskId: number, payload: UpdateTaskPayload) {
  return request<TaskApiItem>(`/api/manager/tasks/${taskId}?managerId=${managerId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function reviewManagerTask(managerId: number, taskId: number, payload: ReviewTaskPayload) {
  return request<TaskApiItem>(`/api/manager/tasks/${taskId}/review?managerId=${managerId}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fetchEmployeeTasks(employeeId = getCurrentEmployeeId(), period?: TaskPeriodQuery) {
  return request<EmployeeTaskApiItem[]>(`/api/employee/tasks?employeeId=${employeeId}${periodQuery(period)}`);
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
