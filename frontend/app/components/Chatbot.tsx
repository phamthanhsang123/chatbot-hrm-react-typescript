'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bot, BrainCircuit, RefreshCw, Search, Sparkles, Users } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { API_BASE } from '@/services/apiBase';
import { fetchEmployees, type EmployeeApiItem } from '@/services/employees';
import { fetchCompetencyDashboard, type CompetencyDashboard } from '@/services/competency';

const now = new Date();
const currentMonth = now.getMonth() + 1;
const currentYear = now.getFullYear();

function formatMoney(value?: number | null) {
  return `${Number(value || 0).toLocaleString('vi-VN')} đ`;
}

function buildAssistantReply(query: string, employees: EmployeeApiItem[], dashboard: CompetencyDashboard | null) {
  const normalized = query.trim().toLowerCase();
  const activeEmployees = employees.filter((item) => item.status !== 'Đã nghỉ việc' && item.status !== 'inactive');
  const managers = employees.filter((item) => item.role?.toUpperCase() === 'MANAGER');
  const totalSalary = activeEmployees.reduce((sum, item) => sum + Number(item.salaryBase || 0), 0);

  if (!normalized) {
    return 'Bạn có thể hỏi về tổng nhân viên, quản lý, phòng ban, lương cơ bản hoặc đánh giá năng lực.';
  }

  if (normalized.includes('lương') || normalized.includes('luong')) {
    return `Tổng lương cơ bản của ${activeEmployees.length} nhân viên đang làm việc là ${formatMoney(totalSalary)}. Mức trung bình khoảng ${formatMoney(activeEmployees.length ? totalSalary / activeEmployees.length : 0)}.`;
  }

  if (normalized.includes('quản lý') || normalized.includes('quan ly') || normalized.includes('manager')) {
    const names = managers.map((item) => item.fullName).join(', ') || 'chưa có dữ liệu';
    return `Hiện có ${managers.length} nhân sự vai trò quản lý: ${names}.`;
  }

  if (normalized.includes('năng lực') || normalized.includes('nang luc') || normalized.includes('đánh giá') || normalized.includes('danh gia')) {
    if (!dashboard) return 'API đánh giá năng lực chưa trả dữ liệu dashboard. Bạn thử lại sau khi backend ổn định.';
    return `Dashboard năng lực tháng ${dashboard.month}/${dashboard.year}: ${dashboard.totalEmployees} nhân viên, điểm trung bình ${dashboard.averageScore}, xuất sắc ${dashboard.excellent}, tốt ${dashboard.good}, cần cải thiện ${dashboard.needsImprovement}.`;
  }

  if (normalized.includes('phòng ban') || normalized.includes('phong ban') || normalized.includes('department')) {
    const counts = activeEmployees.reduce<Record<string, number>>((acc, item) => {
      const name = item.departmentName || 'Chưa phân phòng';
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .map(([name, count]) => `${name}: ${count} nhân viên`)
      .join('\n') || 'Chưa có dữ liệu phòng ban.';
  }

  const matched = employees.filter((item) => {
    const haystack = `${item.fullName} ${item.email} ${item.departmentName || ''} ${item.positionTitle || ''}`.toLowerCase();
    return haystack.includes(normalized);
  });

  if (matched.length > 0) {
    return matched
      .slice(0, 5)
      .map((item) => `${item.fullName} - ${item.departmentName || 'Chưa có phòng ban'} - ${item.positionTitle || 'Chưa có chức vụ'} - ${formatMoney(item.salaryBase)}`)
      .join('\n');
  }

  return `Tôi đang dùng dữ liệu thật từ Render (${API_BASE}). Hiện có ${activeEmployees.length} nhân viên đang làm việc, ${managers.length} quản lý. Bạn có thể hỏi: "tổng lương", "quản lý", "phòng ban", "đánh giá năng lực" hoặc nhập tên nhân viên.`;
}

export function Chatbot() {
  const [employees, setEmployees] = useState<EmployeeApiItem[]>([]);
  const [dashboard, setDashboard] = useState<CompetencyDashboard | null>(null);
  const [query, setQuery] = useState('');
  const [reply, setReply] = useState('Đang tải dữ liệu từ Render...');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const activeCount = useMemo(
    () => employees.filter((item) => item.status !== 'Đã nghỉ việc' && item.status !== 'inactive').length,
    [employees]
  );

  const managerCount = useMemo(
    () => employees.filter((item) => item.role?.toUpperCase() === 'MANAGER').length,
    [employees]
  );

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const [employeeList, competencyDashboard] = await Promise.all([
        fetchEmployees(),
        fetchCompetencyDashboard(currentMonth, currentYear).catch(() => null),
      ]);

      setEmployees(employeeList);
      setDashboard(competencyDashboard);
      setReply(`Đã kết nối Render API. Hiện có ${employeeList.length} hồ sơ nhân viên. Bạn muốn hỏi gì?`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không kết nối được API Render.';
      setError(message);
      setReply(`Không tải được dữ liệu từ Render.\n${message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const submitQuestion = () => {
    setReply(buildAssistantReply(query, employees, dashboard));
  };

  const suggestions = ['Tổng lương', 'Có bao nhiêu quản lý?', 'Thống kê phòng ban', 'Đánh giá năng lực'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg">
            <Bot className="size-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold text-gray-900">AI Assistant</h1>
              <Badge className="border-0 bg-emerald-100 text-emerald-700">
                <Sparkles className="mr-1 size-3" />
                Render API
              </Badge>
            </div>
            <p className="mt-1 text-gray-500">Trợ lý hỏi nhanh dữ liệu HRM từ backend public.</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => void loadData()} disabled={loading}>
          <RefreshCw className={`mr-2 size-4 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Tổng hồ sơ</p>
              <p className="mt-2 text-3xl font-bold">{employees.length}</p>
            </div>
            <Users className="size-8 text-blue-600" />
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Đang làm việc</p>
              <p className="mt-2 text-3xl font-bold">{activeCount}</p>
            </div>
            <Users className="size-8 text-emerald-600" />
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Quản lý</p>
              <p className="mt-2 text-3xl font-bold">{managerCount}</p>
            </div>
            <BrainCircuit className="size-8 text-purple-600" />
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submitQuestion();
              }}
              className="pl-10"
              placeholder="Hỏi: tổng lương, quản lý, phòng ban, tên nhân viên..."
            />
          </div>
          <Button onClick={submitQuestion} disabled={loading}>
            Hỏi AI
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {suggestions.map((item) => (
            <Button
              key={item}
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setQuery(item);
                setReply(buildAssistantReply(item, employees, dashboard));
              }}
            >
              {item}
            </Button>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <div className="mb-2 flex items-center gap-2 font-semibold text-blue-900">
            <Bot className="size-5" />
            Phản hồi
          </div>
          <p className="whitespace-pre-line text-sm leading-6 text-slate-700">{reply}</p>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>
      </Card>
    </div>
  );
}
