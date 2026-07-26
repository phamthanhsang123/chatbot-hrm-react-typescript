import { API_BASE } from './apiBase';
import { getStoredToken } from './authSession';

export interface AgenticAiRunPayload {
  managerId: number;
  employeeId?: number | null;
  departmentId?: number | null;
  month: number;
  year: number;
  goal: string;
  persistReview?: boolean;
}

export interface AgenticTargetEmployeeApi {
  id: number;
  fullName: string;
  email: string;
  role: string;
  departmentId?: number | null;
  departmentName?: string | null;
  positionId?: number | null;
  positionTitle?: string | null;
  salaryBase?: number | null;
  status: string;
}

export interface AgenticDataPackageApi {
  scope: string;
  employees: AgenticTargetEmployeeApi[];
  missingData: string[];
  contextNotes: string[];
}

export interface AgenticPlanStepApi {
  order: number;
  agent: string;
  action: string;
  reason: string;
}

export interface AgenticPlanApi {
  intent: string;
  requiredData: string[];
  requiredTools: string[];
  successCriteria: string[];
  steps: AgenticPlanStepApi[];
}

export interface AgenticEmployeeAnalysisApi {
  employeeId: number;
  employeeName: string;
  attendanceScore: number;
  taskPerformanceScore: number;
  qualitySkillScore: number;
  disciplineResponsibilityScore: number;
  totalScore: number;
  rating: string;
  riskLevel: string;
  dataCompletenessPercent: number;
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW' | string;
  isDecisionReady: boolean;
  availableEvidence: string[];
  missingEvidence: string[];
  findings: string[];
  rootCauses: string[];
}

export interface AgenticAnalysisApi {
  totalEmployees: number;
  decisionReadyEmployees: number;
  averageScore: number;
  employees: AgenticEmployeeAnalysisApi[];
  departmentInsights: string[];
}

export interface AgenticPolicyRuleApi {
  code: string;
  name: string;
  description: string;
  threshold: number;
}

export interface AgenticPolicyApi {
  source: string;
  rules: AgenticPolicyRuleApi[];
  appliedRules: string[];
  ragNotes: string[];
}

export interface AgenticRecommendationItemApi {
  employeeId: number;
  employeeName: string;
  action: string;
  priority: string;
  reason: string;
  evidence: string;
  policyReference: string;
}

export interface AgenticRecommendationApi {
  overallRecommendation: string;
  items: AgenticRecommendationItemApi[];
}

export interface AgenticReflectionApi {
  isValid: boolean;
  validationStatus: 'VALID' | 'VALID_WITH_WARNINGS' | 'INVALID' | string;
  needsMoreData: boolean;
  needsPolicyReview: boolean;
  needsRecommendationRevision: boolean;
  checks: string[];
  issues: string[];
  nextActions: string[];
}

export interface AgenticLlmStatusApi {
  isEnabled: boolean;
  isConfigured: boolean;
  wasUsed: boolean;
  provider: string;
  model: string;
  mode: 'RuleBased' | 'HybridRuleBasedAndLLM' | string;
  notes: string[];
}

export interface AgenticReportApi {
  title: string;
  summary: string;
  dashboardMetrics: Record<string, number>;
  highlights: string[];
  warnings: string[];
  generatedAt: string;
  exportStatus: string;
}

export interface AgenticTraceApi {
  agent: string;
  action: string;
  result: string;
  createdAt: string;
}

export interface AgenticAiWorkflowApi {
  runId: string;
  createdAt: string;
  goal: string;
  managerId: number;
  employeeId?: number | null;
  departmentId?: number | null;
  month: number;
  year: number;
  iterationCount: number;
  completionStatus: 'COMPLETED' | 'COMPLETED_WITH_WARNINGS' | 'BLOCKED_BY_VALIDATION' | string;
  persistedReviewIds: number[];
  plan: AgenticPlanApi;
  data: AgenticDataPackageApi;
  analysis: AgenticAnalysisApi;
  policy: AgenticPolicyApi;
  recommendation: AgenticRecommendationApi;
  reflection: AgenticReflectionApi;
  report: AgenticReportApi;
  llm: AgenticLlmStatusApi;
  trace: AgenticTraceApi[];
}

export interface AgenticServiceStatusApi {
  service: string;
  status: string;
  llm: AgenticLlmStatusApi;
}

export interface AgenticAiQueryPayload {
  managerId: number;
  question: string;
  month: number;
  year: number;
}

export interface AgenticAttendanceEvidenceApi {
  employeeId: number;
  employeeName: string;
  departmentName?: string | null;
  month: number;
  year: number;
  rule: string;
  attendanceDays: number;
  lateDays: number;
  lateDates: Array<{
    date: string;
    checkInTime: string;
    expectedStartTime: string;
    lateMinutes: number;
  }>;
}

export interface AgenticWorkHoursEvidenceApi {
  employeeId: number;
  employeeName: string;
  departmentName?: string | null;
  month: number;
  year: number;
  attendanceDays: number;
  completedDays: number;
  incompleteDays: number;
  lateDays: number;
  earlyLeaveDays: number;
  totalWorkedHours: number;
  averageWorkedHours: number;
  expectedHours: number;
  overtimeHours: number;
  rule: string;
  days: Array<{
    date: string;
    checkInTime?: string | null;
    checkOutTime?: string | null;
    workedHours: number;
    overtimeHours: number;
    isLate: boolean;
    isEarlyLeave: boolean;
    isIncomplete: boolean;
  }>;
}

export interface AgenticLeaveEvidenceApi {
  employeeId: number;
  employeeName: string;
  departmentName?: string | null;
  month: number;
  year: number;
  totalRequests: number;
  approvedRequests: number;
  pendingRequests: number;
  rejectedRequests: number;
  approvedDays: number;
  pendingDays: number;
  rejectedDays: number;
  hasLeaveBalanceData: boolean;
  rule: string;
  requests: Array<{
    leaveId: number;
    leaveType: string;
    startDate: string;
    endDate: string;
    daysInPeriod: number;
    status: string;
  }>;
}

export interface AgenticSalaryEvidenceApi {
  employeeId: number;
  employeeName: string;
  departmentName?: string | null;
  totalPeriods: number;
  paidPeriods: number;
  pendingPeriods: number;
  recordedNetSalary: number;
  paidNetSalary: number;
  pendingNetSalary: number;
  rule: string;
  periods: Array<{
    payrollId: number;
    month: number;
    year: number;
    grossSalary: number;
    deductions: number;
    netSalary: number;
    status: string;
    isPaid: boolean;
  }>;
}

export interface AgenticTaskEvidenceApi {
  employeeId: number;
  employeeName: string;
  departmentName?: string | null;
  month: number;
  year: number;
  totalTasks: number;
  approvedTasks: number;
  submittedTasks: number;
  inProgressTasks: number;
  revisionTasks: number;
  rejectedTasks: number;
  overdueTasks: number;
  averageProgress: number;
  averageQualityScore?: number | null;
  rule: string;
  tasks: Array<{
    taskId: number;
    title: string;
    deadline: string;
    priority: string;
    status: string;
    progressPercent: number;
    isOverdue: boolean;
    qualityScore?: number | null;
    deadlineScore?: number | null;
  }>;
}

export interface AgenticAiQueryResponseApi {
  runId: string;
  createdAt: string;
  question: string;
  answer: string;
  intent: {
    isSupported: boolean;
    tool: string;
    metric: string;
    employeeName: string;
    employeeNames?: string[];
  };
  evidence?: AgenticAttendanceEvidenceApi | null;
  workHoursEvidence?: AgenticWorkHoursEvidenceApi | null;
  leaveEvidence?: AgenticLeaveEvidenceApi | null;
  salaryEvidence?: AgenticSalaryEvidenceApi | null;
  taskEvidence?: AgenticTaskEvidenceApi | null;
  attendanceEvidences?: AgenticAttendanceEvidenceApi[];
  workHoursEvidences?: AgenticWorkHoursEvidenceApi[];
  leaveEvidences?: AgenticLeaveEvidenceApi[];
  salaryEvidences?: AgenticSalaryEvidenceApi[];
  taskEvidences?: AgenticTaskEvidenceApi[];
  llm: AgenticLlmStatusApi;
  trace: AgenticTraceApi[];
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

export function runAgenticAiWorkflow(payload: AgenticAiRunPayload) {
  return request<AgenticAiWorkflowApi>('/api/manager/agentic-ai/analyze', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fetchAgenticAiStatus() {
  return request<AgenticServiceStatusApi>('/api/manager/agentic-ai/status');
}

export function queryAgenticAiData(payload: AgenticAiQueryPayload) {
  return request<AgenticAiQueryResponseApi>('/api/manager/agentic-ai/query', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
