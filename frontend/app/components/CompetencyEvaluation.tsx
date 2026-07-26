'use client';

import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import {
  AlertTriangle,
  BadgeCheck,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Eye,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  XCircle,
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { getSessionEmail } from '@/services/authSession';
import {
  runAgenticAiWorkflow,
  type AgenticAiWorkflowApi,
  type AgenticEmployeeAnalysisApi,
} from '@/services/agenticAi';
import { fetchEmployees, type EmployeeApiItem } from '@/services/employees';
import {
  approveCompetencyReview,
  fetchManagerCompetencyReviews,
  rejectCompetencyReview,
  type AgenticCompetencyReviewApi,
} from '@/services/managerCompetency';
import type { ManagementRole } from '../types';

interface CompetencyEvaluationProps {
  userRole?: ManagementRole;
  departmentScope?: string;
}

function currentPeriodValue() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
}

function parsePeriod(value: string) {
  const [year, month] = value.split('-').map(Number);
  return { month, year };
}

function formatPeriod(value: string) {
  const { month, year } = parsePeriod(value);
  return `Tháng ${String(month).padStart(2, '0')}/${year}`;
}

function buildPeriodOptions() {
  const options: string[] = [];
  const start = new Date();
  start.setDate(1);

  for (let offset = -11; offset <= 1; offset += 1) {
    const date = new Date(start);
    date.setMonth(start.getMonth() + offset);
    options.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  }

  return options.reverse();
}

const periodOptions = buildPeriodOptions();

function ratingLabel(rating: string) {
  const normalized = rating.toLowerCase();
  if (normalized === 'excellent') return 'Xuất sắc';
  if (normalized === 'good') return 'Tốt';
  if (normalized === 'average') return 'Trung bình';
  if (normalized === 'needs improvement') return 'Cần cải thiện';
  return rating || 'Chưa xếp loại';
}

function ratingClass(rating: string) {
  const normalized = ratingLabel(rating);
  if (normalized === 'Xuất sắc') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (normalized === 'Tốt') return 'border-blue-200 bg-blue-50 text-blue-700';
  if (normalized === 'Trung bình') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (normalized === 'Chưa đủ dữ liệu') return 'border-slate-200 bg-slate-50 text-slate-700';
  return 'border-rose-200 bg-rose-50 text-rose-700';
}

function reviewStatusLabel(status: AgenticCompetencyReviewApi['status']) {
  const labels = {
    DRAFT: 'Bản nháp',
    PENDING_APPROVAL: 'Chờ Manager duyệt',
    APPROVED: 'Đã duyệt',
    REJECTED: 'Đã từ chối',
  };
  return labels[status];
}

function reviewStatusClass(status: AgenticCompetencyReviewApi['status']) {
  if (status === 'APPROVED') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'REJECTED') return 'border-rose-200 bg-rose-50 text-rose-700';
  if (status === 'PENDING_APPROVAL') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function workflowStatusLabel(status: string) {
  if (status === 'COMPLETED') return 'Đã hoàn tất';
  if (status === 'COMPLETED_WITH_WARNINGS') return 'Hoàn tất, có cảnh báo';
  if (status === 'BLOCKED_BY_VALIDATION') return 'Tạm dừng do thiếu dữ liệu';
  return status;
}

function confidenceLabel(level: string) {
  if (level === 'HIGH') return 'Tin cậy cao';
  if (level === 'MEDIUM') return 'Tin cậy trung bình';
  if (level === 'LOW') return 'Tin cậy thấp';
  return level || 'Chưa xác định';
}

function scoreTone(score: number) {
  if (score >= 85) return 'bg-emerald-500';
  if (score >= 65) return 'bg-blue-500';
  return 'bg-rose-500';
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(-2).map((part) => part[0]).join('').toUpperCase() || 'NV';
}

export function CompetencyEvaluation({
  userRole = 'admin',
  departmentScope,
}: CompetencyEvaluationProps) {
  const [period, setPeriod] = useState(currentPeriodValue());
  const [identity, setIdentity] = useState<EmployeeApiItem | null>(null);
  const [reviews, setReviews] = useState<AgenticCompetencyReviewApi[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [runningScope, setRunningScope] = useState<'team' | number | null>(null);
  const [workflow, setWorkflow] = useState<AgenticAiWorkflowApi | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [selectedReview, setSelectedReview] = useState<AgenticCompetencyReviewApi | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const selectedPeriod = useMemo(() => parsePeriod(period), [period]);

  const loadReviews = async (currentIdentity: EmployeeApiItem) => {
    const data = await fetchManagerCompetencyReviews(
      currentIdentity.id,
      selectedPeriod.month,
      selectedPeriod.year,
    );
    setReviews(data);
    return data;
  };

  const loadPage = async () => {
    setLoading(true);
    try {
      const employees = await fetchEmployees();
      const email = getSessionEmail();
      const currentIdentity = employees.find((employee) => {
        const role = employee.role.toUpperCase();
        return employee.email.trim().toLowerCase() === email
          && (role === 'MANAGER' || role === 'ADMIN');
      });

      if (!currentIdentity) {
        setIdentity(null);
        setReviews([]);
        throw new Error('Không tìm thấy hồ sơ Manager/Admin khớp tài khoản đang đăng nhập.');
      }

      setIdentity(currentIdentity);
      await loadReviews(currentIdentity);
    } catch (error) {
      console.error('Load competency page failed:', error);
      setReviews([]);
      void Swal.fire({
        icon: 'error',
        title: 'Không tải được dữ liệu năng lực',
        text: error instanceof Error ? error.message : 'Kiểm tra kết nối backend.',
        confirmButtonText: 'Đóng',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPage();
  }, [period]);

  const filteredReviews = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return reviews.filter((review) => {
      const matchesSearch = !keyword
        || review.employeeName.toLowerCase().includes(keyword)
        || (review.departmentName || '').toLowerCase().includes(keyword);
      const matchesStatus = statusFilter === 'all' || review.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [reviews, search, statusFilter]);

  const metrics = useMemo(() => {
    const average = reviews.length
      ? Math.round((reviews.reduce((sum, review) => sum + review.totalScore, 0) / reviews.length) * 100) / 100
      : 0;

    return {
      total: reviews.length,
      average,
      draft: reviews.filter((review) => review.status === 'DRAFT').length,
      pending: reviews.filter((review) => review.status === 'PENDING_APPROVAL').length,
      approved: reviews.filter((review) => review.status === 'APPROVED').length,
      rejected: reviews.filter((review) => review.status === 'REJECTED').length,
    };
  }, [reviews]);

  const selectedAnalysis = useMemo(() => {
    if (!workflow) return null;
    if (selectedEmployeeId) {
      return workflow.analysis.employees.find((employee) => employee.employeeId === selectedEmployeeId) || null;
    }
    return workflow.analysis.employees[0] || null;
  }, [selectedEmployeeId, workflow]);

  const runEvaluation = async (employeeId?: number) => {
    if (!identity) {
      await Swal.fire('Thiếu tài khoản quản lý', 'Đăng nhập bằng tài khoản Manager hoặc Admin có hồ sơ nhân viên.', 'warning');
      return;
    }

    setRunningScope(employeeId || 'team');
    try {
      const result = await runAgenticAiWorkflow({
        managerId: identity.id,
        employeeId: employeeId || null,
        month: selectedPeriod.month,
        year: selectedPeriod.year,
        goal: employeeId
          ? 'Đánh giá năng lực nhân viên từ task, review, chấm công và nghỉ phép; đối chiếu chính sách và đề xuất hành động.'
          : 'Đánh giá toàn bộ nhân viên thuộc phạm vi quản lý trong kỳ; phát hiện người nổi bật, người cần hỗ trợ và đề xuất hành động theo chính sách.',
        persistReview: true,
      });

      setWorkflow(result);
      const targetEmployeeId = employeeId || result.analysis.employees[0]?.employeeId || null;
      const refreshedReviews = await loadReviews(identity);
      setSelectedEmployeeId(targetEmployeeId);
      setSelectedReview(
        refreshedReviews.find((review) => review.employeeId === targetEmployeeId) || null,
      );
      setDetailOpen(true);

      if (result.completionStatus === 'BLOCKED_BY_VALIDATION') {
        void Swal.fire(
          'Chưa thể hoàn tất đánh giá',
          'Hệ thống phát hiện dữ liệu còn thiếu hoặc chưa phù hợp chính sách. Xem chi tiết để xử lý.',
          'warning',
        );
      }
    } catch (error) {
      console.error('Run Agentic AI failed:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Không chạy được Agentic AI',
        text: error instanceof Error ? error.message : 'Kiểm tra API và dữ liệu kỳ đánh giá.',
        confirmButtonText: 'Đóng',
      });
    } finally {
      setRunningScope(null);
    }
  };

  const openSavedReview = (review: AgenticCompetencyReviewApi) => {
    setWorkflow(null);
    setSelectedReview(review);
    setSelectedEmployeeId(review.employeeId);
    setDetailOpen(true);
  };

  const selectWorkflowEmployee = (employeeId: number) => {
    setSelectedEmployeeId(employeeId);
    setSelectedReview(
      reviews.find((review) => review.employeeId === employeeId) || null,
    );
  };

  const decideReview = async (
    review: AgenticCompetencyReviewApi,
    decision: 'approve' | 'reject',
  ) => {
    if (!identity) return;

    const result = await Swal.fire({
      title: decision === 'approve' ? 'Duyệt đánh giá năng lực?' : 'Từ chối đánh giá?',
      input: 'textarea',
      inputLabel: 'Ghi chú của Manager',
      inputPlaceholder: decision === 'approve'
        ? 'Ghi nhận kết quả hoặc hành động sẽ thực hiện...'
        : 'Nêu lý do cần đánh giá lại...',
      showCancelButton: true,
      confirmButtonText: decision === 'approve' ? 'Duyệt' : 'Từ chối',
      cancelButtonText: 'Hủy',
      confirmButtonColor: decision === 'approve' ? '#059669' : '#dc2626',
      inputValidator: (value) => decision === 'reject' && !value.trim()
        ? 'Cần nhập lý do từ chối.'
        : undefined,
    });

    if (!result.isConfirmed) return;

    try {
      const updated = decision === 'approve'
        ? await approveCompetencyReview(identity.id, review.id, { managerNote: result.value || '' })
        : await rejectCompetencyReview(identity.id, review.id, { managerNote: result.value || '' });

      setReviews((current) => current.map((item) => item.id === updated.id ? updated : item));
      setSelectedReview(updated);
      void Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: decision === 'approve' ? 'Đã duyệt đánh giá' : 'Đã từ chối đánh giá',
        showConfirmButton: false,
        timer: 1800,
      });
    } catch (error) {
      await Swal.fire('Không lưu được quyết định', error instanceof Error ? error.message : 'Kiểm tra backend.', 'error');
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
            <BrainCircuit className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-slate-950">
              {userRole === 'manager' ? 'Năng lực đội ngũ' : 'Phân tích năng lực'}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <span>
                {userRole === 'admin'
                  ? 'Toàn hệ thống'
                  : identity?.departmentName || departmentScope || 'Phòng ban của bạn'}
              </span>
              <span className="text-slate-300">•</span>
              <span>AI đề xuất, Manager phê duyệt</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="h-10 w-[180px] rounded-lg bg-white">
              <CalendarDays className="mr-2 size-4 text-blue-600" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((item) => (
                <SelectItem key={item} value={item}>{formatPeriod(item)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={loadPage} disabled={loading} aria-label="Làm mới">
            <RefreshCcw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            onClick={() => runEvaluation()}
            disabled={!identity || runningScope !== null}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Sparkles className="mr-2 size-4" />
            {runningScope === 'team' ? 'Đang phân tích...' : 'Phân tích kỳ này'}
          </Button>
        </div>
      </header>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 lg:grid-cols-4 lg:divide-y-0">
          <SummaryMetric
            icon={<Users className="size-4" />}
            label="Đã phân tích"
            value={metrics.total}
            detail={formatPeriod(period)}
          />
          <SummaryMetric
            icon={<BadgeCheck className="size-4" />}
            label="Điểm trung bình"
            value={metrics.average}
            detail="Trên các kết quả đã lưu"
            tone="blue"
          />
          <SummaryMetric
            icon={<Clock3 className="size-4" />}
            label="Chờ quyết định"
            value={metrics.pending}
            detail="Cần Manager xử lý"
            tone="amber"
          />
          <SummaryMetric
            icon={<CheckCircle2 className="size-4" />}
            label="Đã xác nhận"
            value={metrics.approved}
            detail="Kết quả có hiệu lực"
            tone="emerald"
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-4">
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-950">Kết quả theo nhân viên</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Chọn một nhân viên để xem bằng chứng, khuyến nghị và đưa ra quyết định.
              </p>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {filteredReviews.length}/{reviews.length} kết quả
            </p>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm nhân viên hoặc phòng ban..."
                className="h-9 pl-9"
              />
            </div>
            <div className="hide-scrollbar flex min-w-0 gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">
              {[
                { value: 'all', label: 'Tất cả', count: metrics.total },
                { value: 'PENDING_APPROVAL', label: 'Chờ duyệt', count: metrics.pending },
                { value: 'APPROVED', label: 'Đã duyệt', count: metrics.approved },
                { value: 'DRAFT', label: 'Bản nháp', count: metrics.draft },
                { value: 'REJECTED', label: 'Từ chối', count: metrics.rejected },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setStatusFilter(item.value)}
                  className={`h-8 shrink-0 rounded-md px-3 text-xs font-medium transition-colors ${
                    statusFilter === item.value
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {item.label} <span className="ml-1 text-slate-400">{item.count}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-80 items-center justify-center text-sm text-slate-500">
            <RefreshCcw className="mr-2 size-4 animate-spin" />
            Đang tải dữ liệu thật từ API...
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
            <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
              <ClipboardCheck className="size-6" />
            </div>
            <h2 className="font-semibold text-slate-950">Chưa có kết quả trong kỳ này</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              Chạy phân tích để hệ thống tổng hợp task đã review, chấm công và nghỉ phép của nhân viên.
            </p>
            <Button
              className="mt-4 bg-blue-600 hover:bg-blue-700"
              onClick={() => runEvaluation()}
              disabled={!identity || runningScope !== null}
            >
              <Sparkles className="mr-2 size-4" />
              Phân tích kỳ này
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredReviews.map((review) => (
              <ReviewRow
                key={review.id}
                review={review}
                running={runningScope === review.employeeId}
                disabled={runningScope !== null}
                onOpen={() => openSavedReview(review)}
                onRerun={() => runEvaluation(review.employeeId)}
              />
            ))}
          </div>
        )}
      </section>

      <CompetencyDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        workflow={workflow}
        analysis={selectedAnalysis}
        review={selectedReview}
        onSelectEmployee={selectWorkflowEmployee}
        onApprove={decideReview}
        onReject={decideReview}
      />
    </div>
  );
}

function SummaryMetric({
  icon,
  label,
  value,
  detail,
  tone = 'slate',
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  detail: string;
  tone?: 'slate' | 'blue' | 'emerald' | 'amber';
}) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    blue: 'bg-blue-50 text-blue-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
  };

  return (
    <div className="flex min-w-0 items-center gap-3 px-4 py-3.5">
      <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <p className="text-xl font-bold text-slate-950">{value}</p>
          <p className="truncate text-sm font-medium text-slate-600">{label}</p>
        </div>
        <p className="truncate text-xs text-slate-400">{detail}</p>
      </div>
    </div>
  );
}

function ReviewRow({
  review,
  running,
  disabled,
  onOpen,
  onRerun,
}: {
  review: AgenticCompetencyReviewApi;
  running: boolean;
  disabled: boolean;
  onOpen: () => void;
  onRerun: () => void;
}) {
  return (
    <article className="grid gap-4 px-4 py-4 transition-colors hover:bg-slate-50/80 lg:grid-cols-[minmax(210px,1.05fr)_130px_minmax(260px,1.35fr)_160px_82px] lg:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 font-semibold text-blue-700">
          {getInitials(review.employeeName)}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-950">{review.employeeName}</p>
          <p className="truncate text-xs text-slate-500">
            {review.departmentName || 'Chưa có phòng ban'} · cập nhật {new Date(review.updatedAt).toLocaleDateString('vi-VN')}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold text-slate-950">{review.totalScore}</span>
        <Badge variant="outline" className={ratingClass(review.rating)}>
          {ratingLabel(review.rating)}
        </Badge>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <CompactScore label="CC" value={review.attendanceScore} title="Chuyên cần" />
        <CompactScore label="Task" value={review.taskPerformanceScore} title="Hiệu suất task" />
        <CompactScore label="CL" value={review.qualitySkillScore} title="Chất lượng" />
        <CompactScore label="KL" value={review.disciplineResponsibilityScore} title="Kỷ luật" />
      </div>

      <Badge variant="outline" className={`w-fit ${reviewStatusClass(review.status)}`}>
        {reviewStatusLabel(review.status)}
      </Badge>

      <div className="flex justify-end gap-1">
        <Button
          variant="outline"
          size="icon"
          onClick={onOpen}
          aria-label={`Xem đánh giá của ${review.employeeName}`}
          title="Xem chi tiết"
          className="size-9"
        >
          <Eye className="size-4" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          onClick={onRerun}
          disabled={disabled}
          aria-label={`Phân tích lại ${review.employeeName}`}
          title="Phân tích lại"
          className="size-9"
        >
          {running
            ? <RefreshCcw className="size-4 animate-spin" />
            : <Sparkles className="size-4" />}
        </Button>
      </div>
    </article>
  );
}

function CompactScore({
  label,
  value,
  title,
}: {
  label: string;
  value: number;
  title: string;
}) {
  return (
    <div className="min-w-0" title={title}>
      <div className="mb-1 flex items-center justify-between gap-1 text-[11px]">
        <span className="truncate text-slate-400">{label}</span>
        <span className="font-semibold text-slate-700">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${scoreTone(value)}`}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

function CompetencyDetailDialog({
  open,
  onOpenChange,
  workflow,
  analysis,
  review,
  onSelectEmployee,
  onApprove,
  onReject,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflow: AgenticAiWorkflowApi | null;
  analysis: AgenticEmployeeAnalysisApi | null;
  review: AgenticCompetencyReviewApi | null;
  onSelectEmployee: (employeeId: number) => void;
  onApprove: (review: AgenticCompetencyReviewApi, decision: 'approve') => void;
  onReject: (review: AgenticCompetencyReviewApi, decision: 'reject') => void;
}) {
  const recommendation = analysis
    ? workflow?.recommendation.items.find((item) => item.employeeId === analysis.employeeId)
    : null;
  const title = analysis?.employeeName || review?.employeeName || 'Kết quả đánh giá';
  const score = analysis?.totalScore ?? review?.totalScore ?? 0;
  const rating = analysis?.rating || review?.rating || '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden p-0">
        <DialogHeader className="border-b border-slate-200 bg-slate-50/70 px-5 py-4">
          <div className="pr-8">
            <DialogTitle className="flex flex-wrap items-center gap-2">
              {title}
              <Badge variant="outline" className={ratingClass(rating)}>{ratingLabel(rating)}</Badge>
            </DialogTitle>
            <DialogDescription className="mt-1">
              {workflow
                ? `${formatPeriod(`${workflow.year}-${String(workflow.month).padStart(2, '0')}`)} · ${workflowStatusLabel(workflow.completionStatus)}`
                : review
                  ? `${formatPeriod(`${review.year}-${String(review.month).padStart(2, '0')}`)} · Kết quả đã lưu`
                  : 'Kết quả Agentic AI'}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="hide-scrollbar max-h-[calc(90vh-82px)] space-y-4 overflow-y-auto px-5 pb-5 pt-4">
          {workflow && workflow.analysis.employees.length > 1 && (
            <div className="hide-scrollbar flex gap-2 overflow-x-auto border-b border-slate-100 pb-3">
              {workflow.analysis.employees.map((employee) => (
                <Button
                  key={employee.employeeId}
                  variant={analysis?.employeeId === employee.employeeId ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onSelectEmployee(employee.employeeId)}
                >
                  {employee.employeeName}
                </Button>
              ))}
            </div>
          )}

          {analysis && (
            <section className={`rounded-lg border p-3.5 ${
              analysis.isDecisionReady
                ? 'border-emerald-200 bg-emerald-50'
                : 'border-amber-200 bg-amber-50'
            }`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-900">Độ tin cậy dữ liệu</h3>
                    <Badge
                      variant="outline"
                      className={analysis.isDecisionReady
                        ? 'border-emerald-300 bg-white text-emerald-700'
                        : 'border-amber-300 bg-white text-amber-700'}
                    >
                      {analysis.isDecisionReady ? 'Đủ điều kiện ra quyết định' : 'Kết quả sơ bộ'}
                    </Badge>
                    <Badge variant="outline" className="bg-white">
                      {confidenceLabel(analysis.confidenceLevel)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {analysis.isDecisionReady
                      ? 'Có đủ task, review của Manager và dữ liệu chấm công trong kỳ.'
                      : 'Không dùng kết quả này để thưởng, phạt, tăng lương hoặc thăng chức.'}
                  </p>
                </div>
                <div className="min-w-48">
                  <div className="mb-1 flex items-center justify-between text-xs font-medium text-slate-600">
                    <span>Độ đầy đủ</span>
                    <span>{analysis.dataCompletenessPercent}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white">
                    <div
                      className={`h-full rounded-full ${
                        analysis.isDecisionReady ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, analysis.dataCompletenessPercent))}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                {analysis.availableEvidence.map((item) => (
                  <span key={item} className="rounded-full bg-white px-2.5 py-1 text-emerald-700">✓ {item}</span>
                ))}
                {analysis.missingEvidence.map((item) => (
                  <span key={item} className="rounded-full bg-white px-2.5 py-1 text-amber-700">Thiếu: {item}</span>
                ))}
              </div>
            </section>
          )}

          <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-[160px_1fr]">
            <ScoreSummary
              label="Tổng điểm năng lực"
              value={analysis && !analysis.isDecisionReady ? '—' : score}
              strong
            />
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <ScoreSummary label="Chuyên cần" value={analysis?.attendanceScore ?? review?.attendanceScore ?? 0} />
              <ScoreSummary label="Hiệu suất task" value={analysis?.taskPerformanceScore ?? review?.taskPerformanceScore ?? 0} />
              <ScoreSummary label="Chất lượng" value={analysis?.qualitySkillScore ?? review?.qualitySkillScore ?? 0} />
              <ScoreSummary label="Kỷ luật" value={analysis?.disciplineResponsibilityScore ?? review?.disciplineResponsibilityScore ?? 0} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-lg border border-slate-200 p-4">
              <h3 className="flex items-center gap-2 font-semibold text-slate-900">
                <BrainCircuit className="size-4 text-blue-600" />
                Phân tích và bằng chứng
              </h3>
              <div className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                {analysis ? (
                  <>
                    {analysis.findings.map((finding) => <p key={finding}>• {finding}</p>)}
                    {analysis.rootCauses.map((cause) => (
                      <p key={cause} className="text-amber-700">• {cause}</p>
                    ))}
                  </>
                ) : (
                  <p>{review?.aiSummary || 'Chưa có nhận xét được lưu.'}</p>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <h3 className="flex items-center gap-2 font-semibold text-emerald-900">
                <Sparkles className="size-4" />
                Khuyến nghị cho Manager
              </h3>
              <p className="mt-3 text-sm font-semibold text-emerald-950">
                {recommendation?.action || review?.aiRecommendation || 'Chưa có khuyến nghị.'}
              </p>
              {recommendation && (
                <>
                  <p className="mt-2 text-sm leading-6 text-emerald-800">{recommendation.reason}</p>
                  <p className="mt-2 text-xs leading-5 text-emerald-700">{recommendation.evidence}</p>
                  <Badge className="mt-3 bg-white text-emerald-700 hover:bg-white">
                    Quy tắc áp dụng: {recommendation.policyReference}
                  </Badge>
                </>
              )}
            </section>
          </div>

          {workflow && (
            <>
              <section className={`rounded-lg border p-4 ${
                workflow.reflection.isValid
                  ? 'border-blue-200 bg-blue-50'
                  : 'border-rose-200 bg-rose-50'
              }`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="flex items-center gap-2 font-semibold text-slate-900">
                    <ShieldCheck className="size-4" />
                    Kiểm tra độ tin cậy
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">
                      {workflow.reflection.isValid ? 'Đã kiểm tra hợp lệ' : 'Cần xử lý'}
                    </Badge>
                    <Badge variant="outline">{workflow.iterationCount} vòng kiểm tra</Badge>
                    <Badge variant="outline">
                      {workflow.llm.wasUsed
                        ? `${workflow.llm.provider || 'AI'} hỗ trợ diễn đạt`
                        : 'Tính toán hệ thống'}
                    </Badge>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {(workflow.reflection.issues.length
                    ? workflow.reflection.issues
                    : workflow.reflection.checks
                  ).map((item) => (
                    <p key={item} className="rounded-md bg-white/80 p-2 text-sm text-slate-700">
                      {workflow.reflection.issues.length ? '⚠ ' : '✓ '}{item}
                    </p>
                  ))}
                </div>
              </section>

              <details className="rounded-lg border border-slate-200 p-4">
                <summary className="cursor-pointer font-semibold text-slate-900">
                  Nhật ký xử lý dành cho kiểm tra
                </summary>
                <p className="mt-1 text-xs text-slate-500">
                  Hiển thị nguồn dữ liệu và từng bước hệ thống đã thực hiện.
                </p>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {workflow.trace.map((trace, index) => (
                    <div key={`${trace.createdAt}-${index}`} className="flex gap-3 rounded-md bg-slate-50 p-3">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-blue-700">
                        {index + 1}
                      </div>
                      <div className="min-w-0 text-sm">
                        <p className="font-semibold text-slate-900">{trace.agent}</p>
                        <p className="text-slate-600">{trace.action}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{trace.result}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            </>
          )}

          {review && (
            <section className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-slate-900">Quyết định của Manager</p>
                <p className="text-sm text-slate-500">
                  {review.managerNote || 'AI chỉ đưa ra đề xuất; kết quả chỉ có hiệu lực sau khi Manager xác nhận.'}
                </p>
              </div>
              {review.status === 'PENDING_APPROVAL' && (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => onReject(review, 'reject')} className="text-rose-700">
                    <XCircle className="mr-2 size-4" />
                    Từ chối
                  </Button>
                  <Button onClick={() => onApprove(review, 'approve')} className="bg-emerald-600 hover:bg-emerald-700">
                    <CheckCircle2 className="mr-2 size-4" />
                    Duyệt kết quả
                  </Button>
                </div>
              )}
            </section>
          )}

          {workflow?.data.missingData.length ? (
            <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <h3 className="flex items-center gap-2 font-semibold text-amber-900">
                <AlertTriangle className="size-4" />
                Dữ liệu còn thiếu
              </h3>
              <div className="mt-2 space-y-1 text-sm text-amber-800">
                {workflow.data.missingData.map((item) => <p key={item}>• {item}</p>)}
              </div>
            </section>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ScoreSummary({ label, value, strong = false }: { label: string; value: number | string; strong?: boolean }) {
  return (
    <div className={`flex min-h-20 flex-col justify-center rounded-md p-3 ${
      strong ? 'bg-blue-600 text-white' : 'bg-slate-50'
    }`}>
      <p className={`text-xs ${strong ? 'text-blue-100' : 'text-slate-500'}`}>{label}</p>
      <p className={`mt-1 font-bold ${strong ? 'text-3xl text-white' : 'text-xl text-slate-900'}`}>{value}</p>
      {!strong && (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full rounded-full ${scoreTone(Number(value) || 0)}`}
            style={{ width: `${Math.max(0, Math.min(100, Number(value) || 0))}%` }}
          />
        </div>
      )}
    </div>
  );
}
