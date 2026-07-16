import { API_BASE } from './apiBase';
import type { TaskApiItem } from './tasks';

export interface CompetencyInputDataApi {
  employeeId: number;
  employeeName: string;
  departmentId?: number | null;
  departmentName?: string | null;
  positionTitle?: string | null;
  month: number;
  year: number;
  totalTasks: number;
  approvedTasks: number;
  rejectedTasks: number;
  revisionTasks: number;
  overdueTasks: number;
  averageProgress: number;
  averageQualityScore: number;
  averageDeadlineScore: number;
  progressUpdateCount: number;
  attendanceDays: number;
  lateDays: number;
  earlyLeaveDays: number;
  incompleteAttendanceDays: number;
  approvedLeaveDays: number;
  tasks: TaskApiItem[];
}

export interface AgenticCompetencyReviewApi {
  id: number;
  employeeId: number;
  employeeName: string;
  managerId?: number | null;
  managerName?: string | null;
  departmentId?: number | null;
  departmentName?: string | null;
  month: number;
  year: number;
  attendanceScore: number;
  taskPerformanceScore: number;
  qualitySkillScore: number;
  disciplineResponsibilityScore: number;
  totalScore: number;
  rating: string;
  aiSummary?: string | null;
  aiRecommendation?: string | null;
  managerNote?: string | null;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
}

export interface GenerateCompetencyPayload {
  month: number;
  year: number;
}

export interface ReviewDecisionPayload {
  managerNote?: string | null;
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

export function fetchManagerCompetencyReviews(managerId: number, month: number, year: number) {
  return request<AgenticCompetencyReviewApi[]>(
    `/api/manager/competency?managerId=${managerId}&month=${month}&year=${year}`,
  );
}

export function fetchCompetencyInputData(managerId: number, employeeId: number, month: number, year: number) {
  return request<CompetencyInputDataApi>(
    `/api/manager/competency/${employeeId}/input-data?managerId=${managerId}&month=${month}&year=${year}`,
  );
}

export function generateCompetencyReview(managerId: number, employeeId: number, payload: GenerateCompetencyPayload) {
  return request<AgenticCompetencyReviewApi>(`/api/manager/competency/${employeeId}/generate?managerId=${managerId}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function approveCompetencyReview(managerId: number, reviewId: number, payload: ReviewDecisionPayload) {
  return request<AgenticCompetencyReviewApi>(`/api/manager/competency/${reviewId}/approve?managerId=${managerId}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function rejectCompetencyReview(managerId: number, reviewId: number, payload: ReviewDecisionPayload) {
  return request<AgenticCompetencyReviewApi>(`/api/manager/competency/${reviewId}/reject?managerId=${managerId}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
