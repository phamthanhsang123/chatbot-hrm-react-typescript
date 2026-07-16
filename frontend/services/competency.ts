import { API_BASE } from './apiBase';

export interface CompetencyItem {
  employeeId: number;
  employeeName: string;
  department: string;
  position: string;
  attendanceScore: number;
  performanceScore: number;
  skillScore: number;
  disciplineScore: number;
  totalScore: number;
  rating: string;
  strengths: string;
  improvements: string;
  aiRecommendation: string;
}

export interface CompetencyDashboard {
  month: number;
  year: number;
  totalEmployees: number;
  averageScore: number;
  excellent: number;
  good: number;
  average: number;
  needsImprovement: number;
  topEmployees: CompetencyItem[];
}

export async function fetchCompetencyList(month: number, year: number) {
  const res = await fetch(`${API_BASE}/api/admin/competency?month=${month}&year=${year}`);

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`fetchCompetencyList failed: ${res.status} ${txt}`);
  }

  return res.json() as Promise<CompetencyItem[]>;
}

export async function fetchCompetencyDashboard(month: number, year: number) {
  const res = await fetch(`${API_BASE}/api/admin/competency/dashboard?month=${month}&year=${year}`);

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`fetchCompetencyDashboard failed: ${res.status} ${txt}`);
  }

  return res.json() as Promise<CompetencyDashboard>;
}

export async function analyzeEmployeeCompetency(employeeId: number, month: number, year: number) {
  const res = await fetch(`${API_BASE}/api/admin/competency/${employeeId}/analyze?month=${month}&year=${year}`);

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`analyzeEmployeeCompetency failed: ${res.status} ${txt}`);
  }

  return res.json() as Promise<CompetencyItem>;
}
