'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  FileCheck2,
  Filter,
  ListChecks,
  MessageSquareText,
  RefreshCcw,
  RotateCw,
  Search,
  Send,
  Star,
  UserCheck,
} from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Progress } from '../components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Slider } from '../components/ui/slider';
import { Textarea } from '../components/ui/textarea';
import {
  EmployeeTaskApiItem,
  TaskPriority,
  TaskStatus,
  fetchEmployeeTasks,
  getCurrentEmployeeId,
  submitEmployeeTask,
  updateEmployeeTaskProgress,
} from '@/services/tasks';

type DisplayStatus = TaskStatus | 'OVERDUE';
type QuickFilter = 'all' | 'open' | 'review' | 'revision' | 'completed' | 'overdue';

const demoTasks: EmployeeTaskApiItem[] = [
  {
    id: 1,
    employeeId: 1,
    employeeName: 'Nguyễn Văn A',
    managerId: 2,
    managerName: 'Kiên Quân',
    departmentId: 1,
    departmentName: 'IT',
    title: 'Đồng bộ Employee Task với API kỳ đánh giá',
    description: 'Kiểm tra luồng nhận task, cập nhật tiến độ và gửi hoàn thành để Manager review trong cùng kỳ tháng.',
    deadline: '2026-06-21T17:00:00',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    progressPercent: 65,
    expectedScore: 90,
    isOverdue: false,
    createdAt: '2026-06-13T08:00:00',
    updatedAt: '2026-06-16T09:30:00',
    latestReview: null,
  },
  {
    id: 2,
    employeeId: 1,
    employeeName: 'Nguyễn Văn A',
    managerId: 2,
    managerName: 'Kiên Quân',
    departmentId: 1,
    departmentName: 'IT',
    title: 'Hoàn thiện giao diện Employee Portal',
    description: 'Cập nhật dashboard, sidebar và task cá nhân để đồng nhất với HR/Manager.',
    deadline: '2026-06-28T17:00:00',
    priority: 'MEDIUM',
    status: 'NEW',
    progressPercent: 0,
    expectedScore: 80,
    isOverdue: false,
    createdAt: '2026-06-12T08:00:00',
    updatedAt: '2026-06-12T08:00:00',
    latestReview: null,
  },
  {
    id: 3,
    employeeId: 1,
    employeeName: 'Nguyễn Văn A',
    managerId: 2,
    managerName: 'Kiên Quân',
    departmentId: 1,
    departmentName: 'IT',
    title: 'Gửi demo luồng task cho Manager duyệt',
    description: 'Task đã đạt 100% và đang chờ Manager review, chấm điểm chất lượng và deadline.',
    deadline: '2026-06-15T17:00:00',
    priority: 'CRITICAL',
    status: 'SUBMITTED',
    progressPercent: 100,
    expectedScore: 100,
    isOverdue: true,
    createdAt: '2026-06-10T08:00:00',
    updatedAt: '2026-06-15T16:20:00',
    latestReview: null,
  },
  {
    id: 4,
    employeeId: 1,
    employeeName: 'Nguyễn Văn A',
    managerId: 2,
    managerName: 'Kiên Quân',
    departmentId: 1,
    departmentName: 'IT',
    title: 'Sửa task theo phản hồi Manager',
    description: 'Bổ sung ghi chú xử lý và gửi lại sau khi Manager yêu cầu chỉnh sửa.',
    deadline: '2026-06-24T17:00:00',
    priority: 'HIGH',
    status: 'REVISION_REQUIRED',
    progressPercent: 82,
    expectedScore: 85,
    isOverdue: false,
    createdAt: '2026-06-09T08:00:00',
    updatedAt: '2026-06-17T10:00:00',
    latestReview: {
      id: 1,
      taskId: 4,
      managerId: 2,
      managerName: 'Kiên Quân',
      qualityScore: 72,
      deadlineScore: 90,
      decision: 'REVISION_REQUIRED',
      comment: 'Cần bổ sung bằng chứng kiểm thử và cập nhật lại tiến độ trước khi gửi duyệt.',
      createdAt: '2026-06-17T10:00:00',
    },
  },
  {
    id: 5,
    employeeId: 1,
    employeeName: 'Nguyễn Văn A',
    managerId: 2,
    managerName: 'Kiên Quân',
    departmentId: 1,
    departmentName: 'IT',
    title: 'Viết kịch bản demo Employee Task',
    description: 'Mô tả rõ luồng nhận task, cập nhật tiến độ và gửi hoàn thành.',
    deadline: '2026-06-10T17:00:00',
    priority: 'LOW',
    status: 'APPROVED',
    progressPercent: 100,
    expectedScore: 70,
    isOverdue: false,
    createdAt: '2026-06-06T08:00:00',
    updatedAt: '2026-06-10T15:00:00',
    latestReview: {
      id: 2,
      taskId: 5,
      managerId: 2,
      managerName: 'Kiên Quân',
      qualityScore: 88,
      deadlineScore: 95,
      decision: 'APPROVED',
      comment: 'Hoàn thành đúng yêu cầu, có thể dùng cho demo.',
      createdAt: '2026-06-10T15:00:00',
    },
  },
];

const statusConfig: Record<DisplayStatus, { label: string; className: string; leftBorder: string }> = {
  NEW: { label: 'Mới giao', className: 'bg-slate-100 text-slate-700 hover:bg-slate-100', leftBorder: 'border-l-slate-300' },
  IN_PROGRESS: { label: 'Đang làm', className: 'bg-blue-100 text-blue-700 hover:bg-blue-100', leftBorder: 'border-l-blue-400' },
  SUBMITTED: { label: 'Chờ Manager duyệt', className: 'bg-amber-100 text-amber-700 hover:bg-amber-100', leftBorder: 'border-l-amber-400' },
  APPROVED: { label: 'Hoàn thành', className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100', leftBorder: 'border-l-emerald-400' },
  REVISION_REQUIRED: { label: 'Cần sửa', className: 'bg-orange-100 text-orange-700 hover:bg-orange-100', leftBorder: 'border-l-orange-400' },
  REJECTED: { label: 'Từ chối', className: 'bg-red-100 text-red-700 hover:bg-red-100', leftBorder: 'border-l-red-400' },
  OVERDUE: { label: 'Quá hạn', className: 'bg-rose-100 text-rose-700 hover:bg-rose-100', leftBorder: 'border-l-rose-400' },
};

const priorityConfig: Record<TaskPriority, { label: string; className: string }> = {
  LOW: { label: 'Thấp', className: 'bg-gray-100 text-gray-700 hover:bg-gray-100' },
  MEDIUM: { label: 'Trung bình', className: 'bg-sky-100 text-sky-700 hover:bg-sky-100' },
  HIGH: { label: 'Cao', className: 'bg-orange-100 text-orange-700 hover:bg-orange-100' },
  CRITICAL: { label: 'Khẩn cấp', className: 'bg-red-100 text-red-700 hover:bg-red-100' },
};

const quickFilters: Array<{ id: QuickFilter; label: string }> = [
  { id: 'all', label: 'Tất cả' },
  { id: 'open', label: 'Đang mở' },
  { id: 'review', label: 'Chờ duyệt' },
  { id: 'revision', label: 'Cần sửa' },
  { id: 'completed', label: 'Hoàn thành' },
  { id: 'overdue', label: 'Quá hạn' },
];

function currentPeriodValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
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

  for (let offset = -5; offset <= 2; offset += 1) {
    const date = new Date(start);
    date.setMonth(start.getMonth() + offset);
    options.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  }

  return options.reverse();
}

const periodOptions = buildPeriodOptions();

function formatDate(value: string) {
  return value ? new Date(value).toLocaleDateString('vi-VN') : '';
}

function daysUntil(value: string) {
  const deadline = new Date(value);
  const today = new Date();
  deadline.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.ceil((deadline.getTime() - today.getTime()) / 86400000);
}

function isClosedStatus(status: TaskStatus) {
  return status === 'APPROVED' || status === 'REJECTED';
}

function isTaskOverdue(task: EmployeeTaskApiItem) {
  return (task.isOverdue || daysUntil(task.deadline) < 0) && !isClosedStatus(task.status);
}

function getDisplayStatus(task: EmployeeTaskApiItem): DisplayStatus {
  return isTaskOverdue(task) ? 'OVERDUE' : task.status;
}

function isOpenTask(task: EmployeeTaskApiItem) {
  return task.status === 'NEW' || task.status === 'IN_PROGRESS' || task.status === 'REVISION_REQUIRED' || getDisplayStatus(task) === 'OVERDUE';
}

function isTaskInPeriod(task: EmployeeTaskApiItem, period: string) {
  const { month, year } = parsePeriod(period);
  const deadline = new Date(task.deadline);
  return deadline.getFullYear() === year && deadline.getMonth() + 1 === month;
}

function clampProgress(value: number) {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
}

export function EmployeeTasks() {
  const [tasks, setTasks] = useState<EmployeeTaskApiItem[]>([]);
  const [selectedTask, setSelectedTask] = useState<EmployeeTaskApiItem | null>(null);
  const [period, setPeriod] = useState(currentPeriodValue());
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [search, setSearch] = useState('');
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressNote, setProgressNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [usingDemoData, setUsingDemoData] = useState(false);
  const [message, setMessage] = useState('');

  const employeeId = getCurrentEmployeeId();

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setMessage('');

    try {
      const data = await fetchEmployeeTasks(employeeId, parsePeriod(period));
      setTasks(data);
      setUsingDemoData(false);
    } catch (error) {
      console.error('fetchEmployeeTasks failed:', error);
      setTasks(demoTasks.filter((task) => isTaskInPeriod(task, period)));
      setUsingDemoData(true);
    } finally {
      setLoading(false);
    }
  }, [employeeId, period]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const filteredTasks = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return tasks.filter((task) => {
      const displayStatus = getDisplayStatus(task);
      const matchesPeriod = isTaskInPeriod(task, period);
      const matchesSearch =
        !keyword ||
        `${task.title} ${task.description || ''} ${task.managerName || ''} ${task.departmentName || ''}`
          .toLowerCase()
          .includes(keyword);
      const matchesQuick =
        quickFilter === 'all' ||
        (quickFilter === 'open' && isOpenTask(task)) ||
        (quickFilter === 'review' && task.status === 'SUBMITTED') ||
        (quickFilter === 'revision' && task.status === 'REVISION_REQUIRED') ||
        (quickFilter === 'completed' && task.status === 'APPROVED') ||
        (quickFilter === 'overdue' && displayStatus === 'OVERDUE');

      return matchesPeriod && matchesSearch && matchesQuick;
    });
  }, [period, quickFilter, search, tasks]);

  const kpis = useMemo(() => {
    const scoped = tasks.filter((task) => isTaskInPeriod(task, period));
    const total = scoped.length;
    const open = scoped.filter(isOpenTask).length;
    const submitted = scoped.filter((task) => task.status === 'SUBMITTED').length;
    const approved = scoped.filter((task) => task.status === 'APPROVED').length;
    const overdue = scoped.filter((task) => getDisplayStatus(task) === 'OVERDUE').length;
    const revision = scoped.filter((task) => task.status === 'REVISION_REQUIRED').length;
    const avgProgress = total ? Math.round(scoped.reduce((sum, task) => sum + task.progressPercent, 0) / total) : 0;

    return { total, open, submitted, approved, overdue, revision, avgProgress };
  }, [period, tasks]);

  const openDetail = (task: EmployeeTaskApiItem) => {
    setSelectedTask(task);
    setShowDetailDialog(true);
  };

  const openProgress = (task: EmployeeTaskApiItem) => {
    setSelectedTask(task);
    setProgressPercent(task.progressPercent);
    setProgressNote('');
    setShowProgressDialog(true);
  };

  const replaceTask = (updatedTask: EmployeeTaskApiItem) => {
    setTasks((currentTasks) => currentTasks.map((task) => (task.id === updatedTask.id ? updatedTask : task)));
    setSelectedTask(updatedTask);
  };

  const saveProgress = async () => {
    if (!selectedTask) return;

    const safeProgress = clampProgress(progressPercent);
    setSaving(true);
    setMessage('');

    if (usingDemoData) {
      replaceTask({
        ...selectedTask,
        progressPercent: safeProgress,
        status: selectedTask.status === 'NEW' ? 'IN_PROGRESS' : selectedTask.status,
        updatedAt: new Date().toISOString(),
      });
      setMessage('Đã cập nhật tiến độ trên dữ liệu demo. Khi backend chạy, thao tác này sẽ gọi API Employee Task.');
      setShowProgressDialog(false);
      setSaving(false);
      return;
    }

    try {
      const updatedTask = await updateEmployeeTaskProgress(selectedTask.id, {
        progressPercent: safeProgress,
        note: progressNote.trim() || undefined,
      });
      replaceTask(updatedTask);
      setMessage('Đã cập nhật tiến độ và ghi chú cho Manager.');
      setShowProgressDialog(false);
    } catch (error) {
      console.error('updateEmployeeTaskProgress failed:', error);
      setMessage('Chưa cập nhật được tiến độ. Kiểm tra backend/API task hoặc quyền của nhân viên.');
    } finally {
      setSaving(false);
    }
  };

  const submitTask = async (task: EmployeeTaskApiItem) => {
    setMessage('');

    if (usingDemoData) {
      replaceTask({
        ...task,
        status: 'SUBMITTED',
        progressPercent: 100,
        updatedAt: new Date().toISOString(),
      });
      setMessage('Đã gửi task demo sang trạng thái chờ Manager duyệt.');
      return;
    }

    try {
      const updatedTask = await submitEmployeeTask(task.id);
      replaceTask(updatedTask);
      setMessage('Đã gửi hoàn thành. Task đang chờ Manager review.');
    } catch (error) {
      console.error('submitEmployeeTask failed:', error);
      setMessage('Chưa gửi hoàn thành được. Kiểm tra backend/API task hoặc tiến độ task.');
    }
  };

  const canUpdate = (task: EmployeeTaskApiItem) => !['SUBMITTED', 'APPROVED', 'REJECTED'].includes(task.status);
  const canSubmit = (task: EmployeeTaskApiItem) =>
    !['SUBMITTED', 'APPROVED', 'REJECTED'].includes(task.status) && task.progressPercent >= 100;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
            <ListChecks className="size-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-950">Task của tôi</h1>
            <p className="mt-1 text-sm text-slate-500">
              Nhận task từ Manager, cập nhật tiến độ và gửi hoàn thành theo đúng kỳ đánh giá.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px] bg-white">
              <CalendarDays className="mr-2 size-4 text-slate-500" />
              <SelectValue placeholder="Kỳ đánh giá" />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((item) => (
                <SelectItem key={item} value={item}>
                  {formatPeriod(item)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadTasks} disabled={loading}>
            <RefreshCcw className="mr-2 size-4" />
            Làm mới
          </Button>
        </div>
      </div>

      {message && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">{message}</div>
      )}

      {usingDemoData && (
        <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Đang hiển thị dữ liệu mẫu vì API Employee Task chưa trả về dữ liệu. Luồng thao tác vẫn giữ đúng contract với Manager.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <KpiCard icon={<ListChecks className="size-6" />} label={`Tổng task ${formatPeriod(period)}`} value={kpis.total} tone="slate" />
        <KpiCard icon={<Clock3 className="size-6" />} label="Đang mở" value={kpis.open} tone="blue" />
        <KpiCard icon={<FileCheck2 className="size-6" />} label="Chờ duyệt" value={kpis.submitted} tone="amber" />
        <KpiCard icon={<MessageSquareText className="size-6" />} label="Cần sửa" value={kpis.revision} tone="orange" />
        <KpiCard icon={<CheckCircle2 className="size-6" />} label="Hoàn thành" value={kpis.approved} tone="emerald" />
        <KpiCard icon={<AlertCircle className="size-6" />} label="Quá hạn" value={kpis.overdue} tone="red" />
      </div>

      <Card className="rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="flex flex-wrap items-center gap-2">
            {quickFilters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setQuickFilter(filter.id)}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  quickFilter === filter.id ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="relative xl:ml-auto xl:w-80">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm task, Manager, phòng ban..."
              className="pl-9"
            />
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          {loading ? (
            <Card className="rounded-2xl p-6 text-sm text-slate-500">Đang tải task của nhân viên...</Card>
          ) : filteredTasks.length === 0 ? (
            <Card className="rounded-2xl p-8 text-center">
              <Filter className="mx-auto size-10 text-slate-300" />
              <p className="mt-3 font-medium text-slate-900">Không có task phù hợp</p>
              <p className="mt-1 text-sm text-slate-500">Đổi kỳ đánh giá hoặc bộ lọc để xem task khác.</p>
            </Card>
          ) : (
            filteredTasks.map((task) => {
              const displayStatus = getDisplayStatus(task);
              const remaining = daysUntil(task.deadline);

              return (
                <Card key={task.id} className={`rounded-2xl border-l-4 p-5 shadow-sm ${statusConfig[displayStatus].leftBorder}`}>
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1 space-y-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold text-slate-950">{task.title}</h2>
                        <Badge className={statusConfig[displayStatus].className}>{statusConfig[displayStatus].label}</Badge>
                        <Badge className={priorityConfig[task.priority].className}>{priorityConfig[task.priority].label}</Badge>
                      </div>

                      <p className="max-w-3xl text-sm leading-6 text-slate-600">{task.description || 'Không có mô tả.'}</p>

                      <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-2 2xl:grid-cols-4">
                        <InfoLine icon={<UserCheck className="size-4" />} label="Manager" subLabel={task.managerName || 'Chưa gán'} />
                        <InfoLine icon={<CalendarDays className="size-4" />} label="Deadline" subLabel={formatDate(task.deadline)} />
                        <InfoLine icon={<Star className="size-4" />} label="Điểm task" subLabel={`${task.expectedScore} điểm`} />
                        <InfoLine
                          icon={<Clock3 className="size-4" />}
                          label="Thời hạn"
                          subLabel={remaining < 0 ? `Quá hạn ${Math.abs(remaining)} ngày` : `${remaining} ngày còn lại`}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-700">Tiến độ cập nhật</span>
                          <span className="font-semibold text-slate-950">{task.progressPercent}%</span>
                        </div>
                        <Progress value={task.progressPercent} />
                        <p className="text-xs text-slate-500">
                          Tiến độ 100% chỉ cho biết nhân viên sẵn sàng gửi. Task chỉ hoàn thành chính thức khi Manager duyệt.
                        </p>
                      </div>

                      {task.latestReview && (
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-700">
                          <p className="font-medium text-slate-950">Phản hồi Manager</p>
                          <p className="mt-1">
                            Kết quả: {statusConfig[task.latestReview.decision].label} - Chất lượng {task.latestReview.qualityScore}/100,
                            deadline {task.latestReview.deadlineScore}/100.
                          </p>
                          {task.latestReview.comment && <p className="mt-1 text-slate-600">{task.latestReview.comment}</p>}
                        </div>
                      )}
                    </div>

                    <div className="flex w-full flex-col gap-2 xl:w-48">
                      <Button variant="outline" onClick={() => openDetail(task)}>
                        <Eye className="mr-2 size-4" />
                        Chi tiết
                      </Button>
                      {canUpdate(task) && (
                        <Button variant="outline" onClick={() => openProgress(task)}>
                          <RotateCw className="mr-2 size-4" />
                          Cập nhật
                        </Button>
                      )}
                      {canSubmit(task) && (
                        <Button onClick={() => submitTask(task)}>
                          <Send className="mr-2 size-4" />
                          Gửi duyệt
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        <Card className="h-fit rounded-2xl p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <MessageSquareText className="size-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-950">Quy tắc đồng bộ</h2>
          </div>
          <div className="space-y-4 text-sm leading-6 text-slate-600">
            <p>User chỉ cập nhật tiến độ, ghi chú và gửi hoàn thành. Manager giữ quyền giao task, sửa task, review và chấm điểm.</p>
            <p>Kỳ đánh giá ở màn này dùng cùng tháng/năm với Manager Tasks để Agentic AI không lấy lẫn dữ liệu cũ.</p>
            <div className="rounded-xl bg-blue-50 p-3 text-blue-800">
              Tiến độ trung bình kỳ này: <span className="font-semibold">{kpis.avgProgress}%</span>
            </div>
          </div>
        </Card>
      </div>

      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-[28px] border border-slate-200 p-0 shadow-2xl sm:max-w-2xl">
          <DialogHeader className="border-b border-slate-100 bg-gradient-to-br from-slate-50 via-white to-blue-50 p-6">
            <DialogTitle>Chi tiết task</DialogTitle>
            <DialogDescription>Thông tin task do Manager giao và trạng thái review hiện tại.</DialogDescription>
          </DialogHeader>

          {selectedTask && (
            <div className="space-y-4 p-6">
              <div>
                <Label>Tên task</Label>
                <p className="mt-1 font-medium text-slate-950">{selectedTask.title}</p>
              </div>
              <div>
                <Label>Mô tả</Label>
                <p className="mt-1 text-sm leading-6 text-slate-700">{selectedTask.description || 'Không có mô tả.'}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <DetailItem label="Manager" value={selectedTask.managerName || 'Chưa gán'} />
                <DetailItem label="Phòng ban" value={selectedTask.departmentName || 'Chưa có'} />
                <DetailItem label="Deadline" value={formatDate(selectedTask.deadline)} />
                <DetailItem label="Độ ưu tiên" value={priorityConfig[selectedTask.priority].label} />
                <DetailItem label="Trạng thái" value={statusConfig[getDisplayStatus(selectedTask)].label} />
                <DetailItem label="Điểm task" value={`${selectedTask.expectedScore} điểm`} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showProgressDialog} onOpenChange={setShowProgressDialog}>
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-[28px] border border-slate-200 p-0 shadow-2xl sm:max-w-xl">
          <DialogHeader className="border-b border-slate-100 bg-gradient-to-br from-slate-50 via-white to-blue-50 p-6">
            <DialogTitle>Cập nhật tiến độ task</DialogTitle>
            <DialogDescription>Ghi nhận tiến độ và ghi chú để Manager có dữ liệu review.</DialogDescription>
          </DialogHeader>

          {selectedTask && (
            <div className="space-y-5 p-6">
              <div>
                <Label>Task</Label>
                <p className="mt-1 font-medium text-slate-950">{selectedTask.title}</p>
              </div>
              <div className="space-y-3">
                <Label htmlFor="progressPercent">Tiến độ hoàn thành (%)</Label>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm text-slate-500">Kéo để cập nhật tiến độ</span>
                    <span className="text-lg font-bold text-slate-950">{progressPercent}%</span>
                  </div>
                  <Slider
                    id="progressPercent"
                    min={0}
                    max={100}
                    step={5}
                    value={[progressPercent]}
                    onValueChange={(value) => setProgressPercent(clampProgress(value[0] ?? 0))}
                    className="py-2"
                  />
                  <div className="mt-3 flex justify-between text-xs text-slate-400">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="progressNote">Ghi chú cập nhật</Label>
                <Textarea
                  id="progressNote"
                  rows={4}
                  className="rounded-2xl"
                  value={progressNote}
                  onChange={(event) => setProgressNote(event.target.value)}
                  placeholder="Nội dung đã làm, khó khăn, phần cần Manager hỗ trợ..."
                />
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">
                Khi đạt 100%, hãy dùng nút Gửi duyệt để chuyển task sang trạng thái chờ Manager review.
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowProgressDialog(false)}>
                  Hủy
                </Button>
                <Button onClick={saveProgress} disabled={saving}>
                  {saving ? 'Đang lưu...' : 'Lưu tiến độ'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KpiCard({ icon, label, value, tone }: { icon: ReactNode; label: string; value: number | string; tone: 'blue' | 'amber' | 'emerald' | 'red' | 'slate' | 'orange' }) {
  const toneClass = {
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-700',
    slate: 'bg-slate-50 text-slate-700',
    orange: 'bg-orange-50 text-orange-700',
  }[tone];

  return (
    <Card className="rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-1 text-3xl font-bold text-slate-950">{value}</p>
        </div>
        <div className={`flex size-11 items-center justify-center rounded-xl ${toneClass}`}>{icon}</div>
      </div>
    </Card>
  );
}

function InfoLine({ icon, label, subLabel }: { icon: ReactNode; label: string; subLabel: string }) {
  return (
    <div className="flex min-w-0 items-start gap-2 rounded-xl bg-slate-50 p-3">
      <div className="mt-0.5 text-slate-400">{icon}</div>
      <div className="min-w-0">
        <p className="truncate font-medium text-slate-950">{label}</p>
        <p className="text-xs text-slate-500">{subLabel}</p>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-950">{value}</p>
    </div>
  );
}
