'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BrainCircuit,
  Search,
  Sparkles,
  TrendingUp,
  Users,
  Award,
  Target,
  AlertTriangle,
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import {
  CompetencyDashboard,
  CompetencyItem,
  analyzeEmployeeCompetency,
  fetchCompetencyDashboard,
  fetchCompetencyList,
} from '@/services/competency';
import type { ManagementRole } from '../types';

const now = new Date();

type AiActionStatus = 'new' | 'in-progress' | 'done';

interface CompetencyEvaluationProps {
  userRole?: ManagementRole;
  departmentScope?: string;
}

const fallbackData: CompetencyItem[] = [
  {
    employeeId: 1,
    employeeName: 'Nguyễn Văn A',
    department: 'IT',
    position: 'Developer',
    attendanceScore: 92,
    performanceScore: 88,
    skillScore: 86,
    disciplineScore: 94,
    totalScore: 89,
    rating: 'Tốt',
    strengths: 'chuyên cần ổn định, hiệu suất làm việc tốt, kỷ luật làm việc tốt.',
    improvements: 'Duy trì phong độ hiện tại và chuẩn bị mục tiêu phát triển cao hơn.',
    aiRecommendation:
      'Nguyễn Văn A có năng lực tốt và ổn định. Đề xuất bổ sung đào tạo nâng cao về thiết kế hệ thống để chuẩn bị cho vai trò cao hơn.',
  },
  {
    employeeId: 2,
    employeeName: 'Trần Thị B',
    department: 'HR',
    position: 'HR Manager',
    attendanceScore: 96,
    performanceScore: 91,
    skillScore: 90,
    disciplineScore: 95,
    totalScore: 93,
    rating: 'Xuất sắc',
    strengths: 'hiệu suất làm việc tốt, nền tảng kỹ năng phù hợp, kỷ luật làm việc tốt.',
    improvements: 'Duy trì phong độ hiện tại và chuẩn bị mục tiêu phát triển cao hơn.',
    aiRecommendation:
      'Trần Thị B có năng lực nổi bật. Đề xuất đưa vào nhóm nhân sự nòng cốt và giao nhiệm vụ cố vấn quy trình đánh giá năng lực.',
  },
  {
    employeeId: 3,
    employeeName: 'Lê Văn C',
    department: 'Sales',
    position: 'Sales Executive',
    attendanceScore: 74,
    performanceScore: 78,
    skillScore: 80,
    disciplineScore: 76,
    totalScore: 77,
    rating: 'Trung bình',
    strengths: 'Có nền tảng làm việc cơ bản, cần thêm dữ liệu để đánh giá sâu hơn.',
    improvements: 'cải thiện chuyên cần và đúng giờ, nâng hiệu suất xử lý công việc.',
    aiRecommendation:
      'Lê Văn C cần ưu tiên cải thiện chuyên cần và hiệu suất. HR nên đặt mục tiêu theo dõi trong tháng tiếp theo.',
  },
];

function buildFallbackDashboard(data: CompetencyItem[]): CompetencyDashboard {
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    totalEmployees: data.length,
    averageScore: Number((data.reduce((sum, item) => sum + item.totalScore, 0) / data.length).toFixed(1)),
    excellent: data.filter((item) => item.rating === 'Xuất sắc').length,
    good: data.filter((item) => item.rating === 'Tốt').length,
    average: data.filter((item) => item.rating === 'Trung bình').length,
    needsImprovement: data.filter((item) => item.rating === 'Cần cải thiện').length,
    topEmployees: [...data].sort((a, b) => b.totalScore - a.totalScore).slice(0, 5),
  };
}

function getRatingClass(rating: string) {
  if (rating === 'Xuất sắc') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (rating === 'Tốt') return 'bg-blue-100 text-blue-700 border-blue-200';
  if (rating === 'Trung bình') return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-rose-100 text-rose-700 border-rose-200';
}

function ScoreBar({ value }: { value: number }) {
  const color = value >= 85 ? 'bg-emerald-500' : value >= 70 ? 'bg-blue-500' : 'bg-rose-500';

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 rounded-full bg-gray-100">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="w-8 text-right text-sm font-medium text-gray-700">{value}</span>
    </div>
  );
}

export function CompetencyEvaluation({ userRole = 'admin', departmentScope }: CompetencyEvaluationProps) {
  const [items, setItems] = useState<CompetencyItem[]>(fallbackData);
  const [dashboard, setDashboard] = useState<CompetencyDashboard>(buildFallbackDashboard(fallbackData));
  const [selected, setSelected] = useState<CompetencyItem>(fallbackData[0]);
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [usingFallback, setUsingFallback] = useState(true);
  const [aiActions, setAiActions] = useState<Record<number, AiActionStatus>>({});

  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [list, summary] = await Promise.all([
          fetchCompetencyList(month, year),
          fetchCompetencyDashboard(month, year),
        ]);

        if (list.length > 0) {
          setItems(list);
          setDashboard(summary);
          setSelected(list[0]);
          setUsingFallback(false);
        }
      } catch (error) {
        console.warn('Không tải được dữ liệu đánh giá năng lực, dùng dữ liệu demo:', error);
        setUsingFallback(true);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [month, year]);

  const scopedItems = useMemo(() => {
    if (!departmentScope) return items;
    return items.filter((item) => item.department === departmentScope);
  }, [departmentScope, items]);

  useEffect(() => {
    if (scopedItems.length > 0 && !scopedItems.some((item) => item.employeeId === selected.employeeId)) {
      setSelected(scopedItems[0]);
    }
  }, [scopedItems, selected.employeeId]);

  const visibleDashboard = useMemo(() => {
    if (!departmentScope) return dashboard;

    const source = scopedItems.length > 0 ? scopedItems : items;
    const averageScore = source.length
      ? Number((source.reduce((sum, item) => sum + item.totalScore, 0) / source.length).toFixed(1))
      : 0;

    return {
      ...dashboard,
      totalEmployees: source.length,
      averageScore,
      excellent: source.filter((item) => item.rating === 'Xuất sắc').length,
      good: source.filter((item) => item.rating === 'Tốt').length,
      average: source.filter((item) => item.rating === 'Trung bình').length,
      needsImprovement: source.filter((item) => item.rating === 'Cần cải thiện').length,
      topEmployees: [...source].sort((a, b) => b.totalScore - a.totalScore).slice(0, 5),
    };
  }, [dashboard, departmentScope, items, scopedItems]);

  const filteredItems = useMemo(() => {
    return scopedItems.filter((item) => {
      const keyword = search.trim().toLowerCase();
      const matchesSearch =
        !keyword ||
        item.employeeName.toLowerCase().includes(keyword) ||
        item.department.toLowerCase().includes(keyword) ||
        item.position.toLowerCase().includes(keyword);
      const matchesRating = ratingFilter === 'all' || item.rating === ratingFilter;

      return matchesSearch && matchesRating;
    });
  }, [ratingFilter, scopedItems, search]);

  const selectedActionStatus = aiActions[selected.employeeId] || 'new';
  const actionLabel = {
    new: 'Mới đề xuất',
    'in-progress': 'Đang xử lý',
    done: 'Đã hoàn thành',
  }[selectedActionStatus];

  const handleAnalyze = async (item: CompetencyItem) => {
    setSelected(item);

    if (usingFallback) return;

    try {
      const detail = await analyzeEmployeeCompetency(item.employeeId, month, year);
      setSelected(detail);
    } catch (error) {
      console.warn('Không phân tích được nhân viên:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
              <BrainCircuit className="size-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Đánh giá năng lực</h1>
              <p className="text-sm text-gray-500">
                {userRole === 'manager'
                  ? `Agentic AI phân tích năng lực nhân viên phòng ban ${departmentScope || 'được phân quyền'}`
                  : 'Agentic AI phân tích chuyên cần, hiệu suất, kỹ năng và kỷ luật nhân sự'}
              </p>
            </div>
          </div>
        </div>

        <Badge className={usingFallback ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}>
          {usingFallback ? 'Dữ liệu demo' : 'Đang dùng API'}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Nhân viên đánh giá</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{visibleDashboard.totalEmployees}</p>
            </div>
            <Users className="size-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Điểm trung bình</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{visibleDashboard.averageScore}</p>
            </div>
            <TrendingUp className="size-8 text-emerald-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Xuất sắc / Tốt</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{visibleDashboard.excellent + visibleDashboard.good}</p>
            </div>
            <Award className="size-8 text-amber-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Cần theo dõi</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{visibleDashboard.average + visibleDashboard.needsImprovement}</p>
            </div>
            <AlertTriangle className="size-8 text-rose-600" />
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
        <Card className="overflow-hidden">
          <div className="border-b border-gray-100 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Bảng điểm năng lực tháng {month}/{year}</h2>
                <p className="text-sm text-gray-500">Công thức demo: chuyên cần 30%, hiệu suất 35%, kỹ năng 20%, kỷ luật 15%</p>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Tìm nhân viên..."
                    className="w-full pl-9 md:w-56"
                  />
                </div>
                <select
                  value={ratingFilter}
                  onChange={(event) => setRatingFilter(event.target.value)}
                  className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700"
                >
                  <option value="all">Tất cả</option>
                  <option value="Xuất sắc">Xuất sắc</option>
                  <option value="Tốt">Tốt</option>
                  <option value="Trung bình">Trung bình</option>
                  <option value="Cần cải thiện">Cần cải thiện</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Nhân viên</th>
                  <th className="px-4 py-3">Phòng ban</th>
                  <th className="px-4 py-3">Chuyên cần</th>
                  <th className="px-4 py-3">Hiệu suất</th>
                  <th className="px-4 py-3">Kỹ năng</th>
                  <th className="px-4 py-3">Kỷ luật</th>
                  <th className="px-4 py-3">Tổng</th>
                  <th className="px-4 py-3">Xếp loại</th>
                  <th className="px-4 py-3 text-right">AI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredItems.map((item) => (
                  <tr key={item.employeeId} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="font-medium text-gray-900">{item.employeeName}</div>
                      <div className="text-xs text-gray-500">{item.position}</div>
                    </td>
                    <td className="px-4 py-4 text-gray-700">{item.department}</td>
                    <td className="px-4 py-4"><ScoreBar value={item.attendanceScore} /></td>
                    <td className="px-4 py-4"><ScoreBar value={item.performanceScore} /></td>
                    <td className="px-4 py-4"><ScoreBar value={item.skillScore} /></td>
                    <td className="px-4 py-4"><ScoreBar value={item.disciplineScore} /></td>
                    <td className="px-4 py-4">
                      <span className="text-lg font-bold text-gray-900">{item.totalScore}</span>
                    </td>
                    <td className="px-4 py-4">
                      <Badge className={getRatingClass(item.rating)}>{item.rating}</Badge>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Button size="sm" onClick={() => handleAnalyze(item)} disabled={loading}>
                        <Sparkles className="mr-2 size-4" />
                        AI đánh giá
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="size-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-900">Nhận xét AI</h2>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Nhân viên</p>
                <p className="font-semibold text-gray-900">{selected.employeeName}</p>
                <p className="text-sm text-gray-500">{selected.department} · {selected.position}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Tổng điểm</p>
                  <p className="text-2xl font-bold text-gray-900">{selected.totalScore}</p>
                </div>
                <div className="rounded-md bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Xếp loại</p>
                  <Badge className={getRatingClass(selected.rating)}>{selected.rating}</Badge>
                </div>
              </div>

              <div>
                <p className="mb-1 text-sm font-medium text-gray-900">Điểm mạnh</p>
                <p className="text-sm leading-6 text-gray-600">{selected.strengths}</p>
              </div>

              <div>
                <p className="mb-1 text-sm font-medium text-gray-900">Cần cải thiện</p>
                <p className="text-sm leading-6 text-gray-600">{selected.improvements}</p>
              </div>

              <div className="rounded-md border border-indigo-100 bg-indigo-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-indigo-700">
                  <Target className="size-4" />
                  <p className="text-sm font-semibold">Đề xuất Agentic AI</p>
                </div>
                <p className="text-sm leading-6 text-indigo-900">{selected.aiRecommendation}</p>
              </div>

              <div className="rounded-md border border-gray-200 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Trạng thái xử lý đề xuất</p>
                    <p className="text-xs text-gray-500">Manager/HR cập nhật sau khi xem khuyến nghị AI</p>
                  </div>
                  <Badge className={
                    selectedActionStatus === 'done'
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                      : selectedActionStatus === 'in-progress'
                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-100'
                        : 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                  }>
                    {actionLabel}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={selectedActionStatus === 'new' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAiActions((prev) => ({ ...prev, [selected.employeeId]: 'new' }))}
                  >
                    Mới
                  </Button>
                  <Button
                    variant={selectedActionStatus === 'in-progress' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAiActions((prev) => ({ ...prev, [selected.employeeId]: 'in-progress' }))}
                  >
                    Xử lý
                  </Button>
                  <Button
                    variant={selectedActionStatus === 'done' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAiActions((prev) => ({ ...prev, [selected.employeeId]: 'done' }))}
                  >
                    Hoàn thành
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">Top năng lực</h2>
            <div className="space-y-3">
              {visibleDashboard.topEmployees.map((item, index) => (
                <button
                  key={item.employeeId}
                  onClick={() => handleAnalyze(item)}
                  className="flex w-full items-center justify-between rounded-md border border-gray-100 p-3 text-left hover:bg-gray-50"
                >
                  <div>
                    <p className="font-medium text-gray-900">{index + 1}. {item.employeeName}</p>
                    <p className="text-xs text-gray-500">{item.department}</p>
                  </div>
                  <span className="text-lg font-bold text-indigo-600">{item.totalScore}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
