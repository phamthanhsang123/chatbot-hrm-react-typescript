'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Swal from 'sweetalert2';
import {
  AlertTriangle,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Download,
  Edit3,
  FileCheck2,
  Filter,
  LayoutList,
  Plus,
  RefreshCcw,
  Search,
  Send,
  TimerReset,
  UserRound,
  Users,
  XCircle,
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { getSessionEmail } from '@/services/authSession';
import { fetchEmployees, type EmployeeApiItem } from '@/services/employees';
import { generateCompetencyReview, type AgenticCompetencyReviewApi } from '@/services/managerCompetency';
import {
  createManagerTask,
  fetchManagerTasks,
  reviewManagerTask,
  updateManagerTask,
  type CreateTaskPayload,
  type ReviewTaskPayload,
  type TaskApiItem,
  type TaskPriority,
  type TaskReviewDecision,
  type TaskStatus,
} from '@/services/tasks';

interface ManagerTasksProps {
  mode?: 'manage' | 'review';
  departmentName: string;
}

type QuickFilter = 'all' | 'review' | 'overdue' | 'revision' | 'open' | 'completed';
type DeadlineFilter = 'all' | 'today' | 'week' | 'overdue';

const emptyForm = {
  employeeId: '',
  title: '',
  description: '',
  deadline: '',
  priority: 'MEDIUM' as TaskPriority,
  expectedScore: '100',
};

const statusMeta: Record<TaskStatus, { label: string; className: string; leftBorder: string }> = {
  NEW: { label: 'Mới giao', className: 'bg-slate-100 text-slate-700 hover:bg-slate-100', leftBorder: 'border-l-slate-300' },
  IN_PROGRESS: { label: 'Đang làm', className: 'bg-blue-100 text-blue-700 hover:bg-blue-100', leftBorder: 'border-l-blue-400' },
  SUBMITTED: { label: 'Chờ duyệt', className: 'bg-amber-100 text-amber-700 hover:bg-amber-100', leftBorder: 'border-l-amber-400' },
  APPROVED: { label: 'Hoàn thành', className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100', leftBorder: 'border-l-emerald-400' },
  REJECTED: { label: 'Từ chối', className: 'bg-red-100 text-red-700 hover:bg-red-100', leftBorder: 'border-l-red-400' },
  REVISION_REQUIRED: { label: 'Cần sửa', className: 'bg-orange-100 text-orange-700 hover:bg-orange-100', leftBorder: 'border-l-orange-400' },
  OVERDUE: { label: 'Quá hạn', className: 'bg-rose-100 text-rose-700 hover:bg-rose-100', leftBorder: 'border-l-rose-400' },
};

const priorityMeta: Record<TaskPriority, string> = {
  LOW: 'bg-slate-100 text-slate-700 hover:bg-slate-100',
  MEDIUM: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  HIGH: 'bg-orange-100 text-orange-700 hover:bg-orange-100',
  CRITICAL: 'bg-red-100 text-red-700 hover:bg-red-100',
};

const quickFilters: Array<{ id: QuickFilter; label: string }> = [
  { id: 'all', label: 'Tất cả' },
  { id: 'review', label: 'Review Queue' },
  { id: 'overdue', label: 'Quá hạn' },
  { id: 'revision', label: 'Cần sửa' },
  { id: 'open', label: 'Đang mở' },
  { id: 'completed', label: 'Hoàn thành' },
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

function periodEndDateInput(value: string) {
  const { month, year } = parsePeriod(value);
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

function isTaskInPeriod(task: TaskApiItem, period: string) {
  const { month, year } = parsePeriod(period);
  const deadline = new Date(task.deadline);
  return deadline.getFullYear() === year && deadline.getMonth() + 1 === month;
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

const toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2200,
  timerProgressBar: true,
});

function formatDate(value: string) {
  return value ? new Date(value).toLocaleDateString('vi-VN') : '';
}

function toDateInput(value: string) {
  return value ? value.slice(0, 10) : '';
}

function daysUntil(value: string) {
  const deadline = new Date(value);
  const today = new Date();
  deadline.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.ceil((deadline.getTime() - today.getTime()) / 86400000);
}

function isTaskOverdue(task: TaskApiItem) {
  return daysUntil(task.deadline) < 0 && task.status !== 'APPROVED';
}

function isOpenTask(task: TaskApiItem) {
  return task.status === 'NEW' || task.status === 'IN_PROGRESS' || task.status === 'REVISION_REQUIRED' || task.status === 'OVERDUE';
}

function canEditTask(task: TaskApiItem) {
  return task.status !== 'APPROVED' && task.status !== 'REJECTED';
}

export function ManagerTasks({ mode = 'manage', departmentName }: ManagerTasksProps) {
  const [manager, setManager] = useState<EmployeeApiItem | null>(null);
  const [employees, setEmployees] = useState<EmployeeApiItem[]>([]);
  const [tasks, setTasks] = useState<TaskApiItem[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(mode === 'review' ? 'review' : 'all');
  const [search, setSearch] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [deadlineFilter, setDeadlineFilter] = useState<DeadlineFilter>('all');
  const [period, setPeriod] = useState(currentPeriodValue());
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskApiItem | null>(null);
  const [taskForm, setTaskForm] = useState(emptyForm);
  const [savingTask, setSavingTask] = useState(false);
  const [reviewDraft, setReviewDraft] = useState<ReviewTaskPayload>({
    qualityScore: 90,
    deadlineScore: 90,
    decision: 'APPROVED',
    comment: '',
  });
  const [aiReview, setAiReview] = useState<AgenticCompetencyReviewApi | null>(null);
  const [aiOpen, setAiOpen] = useState(false);

  const selectedTask = useMemo(() => {
    return tasks.find((task) => task.id === selectedTaskId && task.departmentName === departmentName && isTaskInPeriod(task, period)) || null;
  }, [departmentName, period, selectedTaskId, tasks]);

  const departmentEmployees = useMemo(() => {
    return employees.filter((employee) => employee.departmentName === departmentName && employee.status !== 'Đã nghỉ việc');
  }, [departmentName, employees]);

  const loadData = async () => {
    setLoading(true);
    try {
      const employeeList = await fetchEmployees();
      const email = getSessionEmail();
      const currentManager = employeeList.find((item) => {
        const sameEmail = item.email.toLowerCase() === email;
        return sameEmail && (item.role === 'MANAGER' || item.role === 'ADMIN');
      });

      if (!currentManager) {
        setManager(null);
        setEmployees(employeeList);
        setTasks([]);
        toast.fire({ icon: 'warning', title: 'Không tìm thấy Manager từ tài khoản đăng nhập' });
        return;
      }

      const taskList = await fetchManagerTasks(currentManager.id, parsePeriod(period));
      setManager(currentManager);
      setEmployees(employeeList);
      setTasks(taskList);

      const visibleTasks = taskList.filter((task) => task.departmentName === departmentName && isTaskInPeriod(task, period));
      if (visibleTasks.length > 0 && (!selectedTaskId || !visibleTasks.some((task) => task.id === selectedTaskId))) {
        const firstPending = visibleTasks.find((task) => task.status === 'SUBMITTED');
        setSelectedTaskId((firstPending || visibleTasks[0]).id);
      } else if (visibleTasks.length === 0) {
        setSelectedTaskId(null);
      }
    } catch (error) {
      console.error('Load manager tasks failed:', error);
      toast.fire({ icon: 'error', title: 'Không tải được task từ API' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [period]);

  useEffect(() => {
    if (selectedTask) {
      setReviewDraft({
        qualityScore: selectedTask.latestReview?.qualityScore || 90,
        deadlineScore: selectedTask.latestReview?.deadlineScore || 90,
        decision: 'APPROVED',
        comment: selectedTask.latestReview?.comment || '',
      });
    }
  }, [selectedTask?.id]);

  const scopedTasks = useMemo(() => {
    return tasks.filter((task) => task.departmentName === departmentName && isTaskInPeriod(task, period));
  }, [departmentName, period, tasks]);

  const filteredTasks = useMemo(() => {
    return scopedTasks.filter((task) => {
      const keyword = search.trim().toLowerCase();
      const matchesSearch = !keyword || `${task.title} ${task.description || ''} ${task.employeeName}`.toLowerCase().includes(keyword);
      const matchesEmployee = employeeFilter === 'all' || String(task.employeeId) === employeeFilter;
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
      const remaining = daysUntil(task.deadline);
      const matchesDeadline =
        deadlineFilter === 'all' ||
        (deadlineFilter === 'today' && remaining === 0) ||
        (deadlineFilter === 'week' && remaining >= 0 && remaining <= 7) ||
        (deadlineFilter === 'overdue' && isTaskOverdue(task));
      const matchesQuick =
        quickFilter === 'all' ||
        (quickFilter === 'review' && task.status === 'SUBMITTED') ||
        (quickFilter === 'overdue' && isTaskOverdue(task)) ||
        (quickFilter === 'revision' && task.status === 'REVISION_REQUIRED') ||
        (quickFilter === 'open' && isOpenTask(task)) ||
        (quickFilter === 'completed' && task.status === 'APPROVED');

      return matchesSearch && matchesEmployee && matchesStatus && matchesPriority && matchesDeadline && matchesQuick;
    });
  }, [deadlineFilter, employeeFilter, priorityFilter, quickFilter, scopedTasks, search, statusFilter]);

  const groups = useMemo(() => {
    const map = new Map<number, { employee: EmployeeApiItem | null; employeeId: number; employeeName: string; departmentName?: string | null; tasks: TaskApiItem[] }>();

    filteredTasks.forEach((task) => {
      const employee = employees.find((item) => item.id === task.employeeId) || null;
      const group = map.get(task.employeeId) || {
        employee,
        employeeId: task.employeeId,
        employeeName: task.employeeName,
        departmentName: task.departmentName,
        tasks: [],
      };

      group.tasks.push(task);
      map.set(task.employeeId, group);
    });

    return Array.from(map.values()).sort((a, b) => a.employeeName.localeCompare(b.employeeName, 'vi'));
  }, [employees, filteredTasks]);

  const kpis = useMemo(() => {
    const total = scopedTasks.length;
    const open = scopedTasks.filter(isOpenTask).length;
    const submitted = scopedTasks.filter((task) => task.status === 'SUBMITTED').length;
    const approved = scopedTasks.filter((task) => task.status === 'APPROVED').length;
    const overdue = scopedTasks.filter(isTaskOverdue).length;
    const avgProgress = total ? Math.round(scopedTasks.reduce((sum, task) => sum + task.progressPercent, 0) / total) : 0;
    return { total, open, submitted, approved, overdue, avgProgress };
  }, [scopedTasks]);

  const updateTaskForm = (key: keyof typeof taskForm, value: string) => {
    setTaskForm((current) => ({ ...current, [key]: value }));
  };

  const openCreateDialog = () => {
    setEditingTask(null);
    setTaskForm({ ...emptyForm, deadline: periodEndDateInput(period) });
    setTaskDialogOpen(true);
  };

  const openEditDialog = (task: TaskApiItem) => {
    setEditingTask(task);
    setTaskForm({
      employeeId: String(task.employeeId),
      title: task.title,
      description: task.description || '',
      deadline: toDateInput(task.deadline),
      priority: task.priority,
      expectedScore: String(task.expectedScore),
    });
    setTaskDialogOpen(true);
  };

  const saveTask = async () => {
    if (!manager) return;
    if (!taskForm.employeeId || !taskForm.title.trim() || !taskForm.deadline) {
      toast.fire({ icon: 'warning', title: 'Chọn nhân viên, nhập task và deadline' });
      return;
    }

    const payload = {
      employeeId: Number(taskForm.employeeId),
      title: taskForm.title.trim(),
      description: taskForm.description.trim(),
      deadline: `${taskForm.deadline}T17:00:00`,
      priority: taskForm.priority,
      expectedScore: Number(taskForm.expectedScore || 100),
    };

    setSavingTask(true);
    try {
      if (editingTask) {
        const updated = await updateManagerTask(manager.id, editingTask.id, {
          title: payload.title,
          description: payload.description,
          deadline: payload.deadline,
          priority: payload.priority,
          expectedScore: payload.expectedScore,
        });
        setTasks((current) => current.map((task) => (task.id === updated.id ? updated : task)));
        setSelectedTaskId(updated.id);
        toast.fire({ icon: 'success', title: 'Đã cập nhật task' });
      } else {
        const created = await createManagerTask(manager.id, payload as CreateTaskPayload);
        setTasks((current) => [created, ...current]);
        setSelectedTaskId(created.id);
        toast.fire({ icon: 'success', title: 'Đã giao task' });
      }

      setTaskDialogOpen(false);
      setEditingTask(null);
      setTaskForm(emptyForm);
    } catch (error) {
      console.error('Save task failed:', error);
      Swal.fire('Không lưu được task', 'Kiểm tra dữ liệu, trạng thái task hoặc quyền Manager.', 'error');
    } finally {
      setSavingTask(false);
    }
  };

  const submitReview = async (decision: TaskReviewDecision) => {
    if (!manager || !selectedTask) return;

    try {
      const updated = await reviewManagerTask(manager.id, selectedTask.id, {
        ...reviewDraft,
        decision,
        comment: reviewDraft.comment || decision,
      });
      setTasks((current) => current.map((task) => (task.id === updated.id ? updated : task)));
      setSelectedTaskId(updated.id);
      toast.fire({ icon: 'success', title: 'Đã lưu review task' });
    } catch (error) {
      console.error('Review task failed:', error);
      Swal.fire('Không review được task', 'Kiểm tra trạng thái task hoặc quyền Manager.', 'error');
    }
  };

  const runAiEvaluation = async (employeeId: number) => {
    if (!manager) return;
    const selectedPeriod = parsePeriod(period);

    try {
      const review = await generateCompetencyReview(manager.id, employeeId, {
        month: selectedPeriod.month,
        year: selectedPeriod.year,
      });
      setAiReview(review);
      setAiOpen(true);
    } catch (error) {
      console.error('Generate competency failed:', error);
      Swal.fire('Không tạo được đánh giá AI', 'Cần có dữ liệu task/review/chấm công phù hợp hoặc kiểm tra backend.', 'error');
    }
  };

  const exportReport = () => {
    const rows = [
      ['Employee', 'Task', 'Status', 'Priority', 'Deadline', 'Progress', 'Expected Score'],
      ...filteredTasks.map((task) => [
        task.employeeName,
        task.title,
        task.status,
        task.priority,
        formatDate(task.deadline),
        `${task.progressPercent}%`,
        String(task.expectedScore),
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `manager-task-report-${period}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
            <ClipboardList className="size-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-950">Quản lý Task Phòng Ban</h1>
            <p className="mt-1 text-sm text-slate-500">
              Theo dõi task theo kỳ đánh giá, review queue và AI năng lực không bị lẫn dữ liệu cũ.
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
          {mode === 'manage' && (
            <Button onClick={openCreateDialog} disabled={!manager}>
              <Plus className="mr-2 size-4" />
              Giao Task
            </Button>
          )}
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCcw className="mr-2 size-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportReport} disabled={filteredTasks.length === 0}>
            <Download className="mr-2 size-4" />
            Export Report
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard icon={<ClipboardList className="size-6" />} label={`Task đang mở ${formatPeriod(period)}`} value={kpis.open} tone="blue" />
        <KpiCard icon={<FileCheck2 className="size-6" />} label="Chờ duyệt" value={kpis.submitted} tone="amber" />
        <KpiCard icon={<CheckCircle2 className="size-6" />} label="Đã hoàn thành" value={kpis.approved} tone="emerald" />
        <KpiCard icon={<AlertTriangle className="size-6" />} label="Quá hạn" value={kpis.overdue} tone="red" />
        <KpiCard icon={<TimerReset className="size-6" />} label="Tiến độ TB" value={`${kpis.avgProgress}%`} tone="slate" />
      </div>

      <Card className="rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col gap-3">
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
            <Button className="ml-auto" variant="ghost" size="sm" onClick={() => setShowAdvancedFilters((value) => !value)}>
              <Filter className="mr-2 size-4" />
              Advanced
            </Button>
          </div>

          {showAdvancedFilters && (
            <div className="grid gap-3 border-t border-slate-100 pt-4 md:grid-cols-2 xl:grid-cols-5">
              <div className="relative xl:col-span-2">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm task, mô tả, nhân viên..." className="pl-9" />
              </div>
              <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Nhân viên" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả nhân viên</SelectItem>
                  {departmentEmployees.map((employee) => (
                    <SelectItem key={employee.id} value={String(employee.id)}>
                      {employee.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as TaskStatus | 'all')}>
                <SelectTrigger>
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  {Object.entries(statusMeta).map(([status, meta]) => (
                    <SelectItem key={status} value={status}>
                      {meta.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value as TaskPriority | 'all')}>
                <SelectTrigger>
                  <SelectValue placeholder="Độ ưu tiên" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả ưu tiên</SelectItem>
                  <SelectItem value="LOW">LOW</SelectItem>
                  <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                  <SelectItem value="HIGH">HIGH</SelectItem>
                  <SelectItem value="CRITICAL">CRITICAL</SelectItem>
                </SelectContent>
              </Select>
              <Select value={deadlineFilter} onValueChange={(value) => setDeadlineFilter(value as DeadlineFilter)}>
                <SelectTrigger>
                  <SelectValue placeholder="Deadline" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả deadline</SelectItem>
                  <SelectItem value="today">Hạn hôm nay</SelectItem>
                  <SelectItem value="week">Trong 7 ngày</SelectItem>
                  <SelectItem value="overdue">Quá hạn</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4">
          {loading ? (
            <Card className="rounded-2xl p-8 text-center text-slate-500 shadow-sm">Đang tải task từ API...</Card>
          ) : !manager ? (
            <Card className="rounded-2xl p-8 text-center text-slate-500 shadow-sm">Không tìm thấy Manager theo tài khoản đăng nhập.</Card>
          ) : groups.length === 0 ? (
            <EmptyState onCreate={openCreateDialog} />
          ) : (
            groups.map((group) => (
              <EmployeeGroup
                key={group.employeeId}
                group={group}
                selectedTaskId={selectedTaskId}
                onSelectTask={setSelectedTaskId}
                onAi={runAiEvaluation}
              />
            ))
          )}
        </div>

        <TaskDetailPanel
          mode={mode}
          task={selectedTask}
          reviewDraft={reviewDraft}
          onReviewDraftChange={setReviewDraft}
          onEdit={openEditDialog}
          onSubmitReview={submitReview}
          onAi={runAiEvaluation}
        />
      </div>

      <TaskFormDialog
        open={taskDialogOpen}
        editingTask={editingTask}
        employees={departmentEmployees}
        form={taskForm}
        saving={savingTask}
        onOpenChange={(nextOpen) => {
          setTaskDialogOpen(nextOpen);
          if (!nextOpen) {
            setEditingTask(null);
            setTaskForm(emptyForm);
          }
        }}
        onUpdateForm={updateTaskForm}
        onSave={saveTask}
      />

      <AiReviewDialog open={aiOpen} review={aiReview} onOpenChange={setAiOpen} />
    </div>
  );
}

function EmployeeGroup({
  group,
  selectedTaskId,
  onSelectTask,
  onAi,
}: {
  group: { employee: EmployeeApiItem | null; employeeId: number; employeeName: string; departmentName?: string | null; tasks: TaskApiItem[] };
  selectedTaskId: number | null;
  onSelectTask: (taskId: number) => void;
  onAi: (employeeId: number) => void;
}) {
  const completed = group.tasks.filter((task) => task.status === 'APPROVED').length;
  const active = group.tasks.filter(isOpenTask).length;
  const overdue = group.tasks.filter(isTaskOverdue).length;
  const avgProgress = group.tasks.length ? Math.round(group.tasks.reduce((sum, task) => sum + task.progressPercent, 0) / group.tasks.length) : 0;
  const reviewedTasks = group.tasks.filter((task) => task.latestReview);
  const averageScore = reviewedTasks.length
    ? Math.round(reviewedTasks.reduce((sum, task) => sum + (task.latestReview?.qualityScore || 0), 0) / reviewedTasks.length)
    : 0;

  return (
    <Card className="overflow-hidden rounded-2xl shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-600 font-semibold text-white shadow-sm">
            {group.employeeName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-950">{group.employeeName}</h2>
            <p className="text-sm text-slate-500">{group.departmentName || group.employee?.departmentName || 'Chưa có phòng ban'}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4 lg:w-[520px]">
          <MiniMetric label="Tổng task" value={group.tasks.length} />
          <MiniMetric label="Hoàn thành" value={completed} />
          <MiniMetric label="Đang làm" value={active} />
          <MiniMetric label="Điểm TB" value={averageScore || '-'} />
        </div>

        <div className="flex items-center gap-2">
          {overdue > 0 && <Badge className="bg-red-100 text-red-700 hover:bg-red-100">{overdue} quá hạn</Badge>}
          <Button variant="outline" onClick={() => onAi(group.employeeId)}>
            <BrainCircuit className="mr-2 size-4" />
            AI Đánh Giá
          </Button>
        </div>
      </div>

      <div className="space-y-2 p-3">
        {group.tasks.map((task) => (
          <button
            key={task.id}
            onClick={() => onSelectTask(task.id)}
            className={`w-full rounded-2xl border-l-4 p-4 text-left transition hover:bg-slate-50 ${
              selectedTaskId === task.id ? 'bg-blue-50 ring-1 ring-blue-200' : 'bg-white'
            } ${statusMeta[task.status].leftBorder}`}
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-slate-950">{task.title}</h3>
                  <Badge className={priorityMeta[task.priority]}>{task.priority}</Badge>
                  <Badge className={statusMeta[task.status].className}>{statusMeta[task.status].label}</Badge>
                </div>
                <p className="line-clamp-1 text-sm text-slate-500">{task.description || 'Không có mô tả task.'}</p>
              </div>
              <div className="grid shrink-0 grid-cols-3 gap-3 text-sm lg:w-[360px]">
                <TaskBrief label="Deadline" value={formatDate(task.deadline)} />
                <TaskBrief label="Progress" value={`${task.progressPercent}%`} />
                <TaskBrief label="Review" value={task.latestReview?.comment || 'Chưa có'} />
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="border-t border-slate-100 px-5 py-4">
        <div className="mb-2 flex justify-between text-sm">
          <span className="font-medium text-slate-700">Workload / Team Progress</span>
          <span className="font-semibold text-slate-950">{avgProgress}%</span>
        </div>
        <Progress value={avgProgress} />
      </div>
    </Card>
  );
}

function TaskDetailPanel({
  mode,
  task,
  reviewDraft,
  onReviewDraftChange,
  onEdit,
  onSubmitReview,
  onAi,
}: {
  mode: 'manage' | 'review';
  task: TaskApiItem | null;
  reviewDraft: ReviewTaskPayload;
  onReviewDraftChange: (draft: ReviewTaskPayload) => void;
  onEdit: (task: TaskApiItem) => void;
  onSubmitReview: (decision: TaskReviewDecision) => void;
  onAi: (employeeId: number) => void;
}) {
  if (!task) {
    return (
      <Card className="sticky top-6 hidden rounded-2xl p-8 text-center text-slate-500 shadow-sm xl:block">
        Chọn một task để xem chi tiết.
      </Card>
    );
  }

  const remaining = daysUntil(task.deadline);

  return (
    <Card className="sticky top-6 max-h-[calc(100vh-120px)] overflow-y-auto rounded-2xl shadow-md">
      <div className="border-b border-slate-100 p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Task Detail Drawer</p>
            <h2 className="mt-1 text-xl font-bold text-slate-950">{task.title}</h2>
          </div>
          <ChevronRight className="mt-1 size-5 text-slate-400" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className={statusMeta[task.status].className}>{statusMeta[task.status].label}</Badge>
          <Badge className={priorityMeta[task.priority]}>{task.priority}</Badge>
          {isTaskOverdue(task) && <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Quá hạn {Math.abs(remaining)} ngày</Badge>}
        </div>
      </div>

      <div className="space-y-5 p-5">
        <p className="text-sm leading-6 text-slate-600">{task.description || 'Không có mô tả task.'}</p>

        <div className="grid grid-cols-2 gap-3">
          <Info icon={<UserRound className="size-4" />} label="Nhân viên" value={task.employeeName} />
          <Info icon={<CalendarDays className="size-4" />} label="Deadline" value={formatDate(task.deadline)} />
          <Info icon={<TimerReset className="size-4" />} label="Còn lại" value={remaining < 0 ? `Quá hạn ${Math.abs(remaining)} ngày` : `${remaining} ngày`} />
          <Info icon={<LayoutList className="size-4" />} label="Expected Score" value={String(task.expectedScore)} />
        </div>

        <div>
          <div className="mb-2 flex justify-between text-sm">
            <span className="font-medium text-slate-700">Current Progress</span>
            <span className="font-semibold text-slate-950">{task.progressPercent}%</span>
          </div>
          <Progress value={task.progressPercent} />
        </div>

        <ActivityBlock task={task} />

        <div className="grid gap-2">
          {mode === 'manage' && (
            <Button variant="outline" onClick={() => onEdit(task)} disabled={!canEditTask(task)}>
              <Edit3 className="mr-2 size-4" />
              Chỉnh sửa task
            </Button>
          )}
          <Button variant="outline" onClick={() => onAi(task.employeeId)}>
            <BrainCircuit className="mr-2 size-4" />
            AI Đánh Giá Năng Lực
          </Button>
        </div>

        {task.status === 'SUBMITTED' ? (
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
            <div className="mb-3 flex items-center gap-2 font-semibold text-amber-900">
              <FileCheck2 className="size-4" />
              Review Panel
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Quality Score</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={reviewDraft.qualityScore}
                  onChange={(event) => onReviewDraftChange({ ...reviewDraft, qualityScore: Number(event.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <Label>Deadline Score</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={reviewDraft.deadlineScore}
                  onChange={(event) => onReviewDraftChange({ ...reviewDraft, deadlineScore: Number(event.target.value) })}
                />
              </div>
            </div>
            <div className="mt-3 space-y-1">
              <Label>Comment</Label>
              <Textarea
                value={reviewDraft.comment || ''}
                onChange={(event) => onReviewDraftChange({ ...reviewDraft, comment: event.target.value })}
                placeholder="Nhận xét nghiệm thu task"
              />
            </div>
            <div className="mt-4 grid gap-2">
              <Button onClick={() => onSubmitReview('APPROVED')}>
                <CheckCircle2 className="mr-2 size-4" />
                Approve
              </Button>
              <Button variant="outline" onClick={() => onSubmitReview('REVISION_REQUIRED')}>
                <RefreshCcw className="mr-2 size-4" />
                Revision Required
              </Button>
              <Button variant="destructive" onClick={() => onSubmitReview('REJECTED')}>
                <XCircle className="mr-2 size-4" />
                Reject
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
            {task.latestReview
              ? `Latest review: Quality ${task.latestReview.qualityScore}/100, Deadline ${task.latestReview.deadlineScore}/100. ${task.latestReview.comment || ''}`
              : 'Task chưa được gửi hoàn thành nên chưa có review panel.'}
          </div>
        )}
      </div>
    </Card>
  );
}

function TaskFormDialog({
  open,
  editingTask,
  employees,
  form,
  saving,
  onOpenChange,
  onUpdateForm,
  onSave,
}: {
  open: boolean;
  editingTask: TaskApiItem | null;
  employees: EmployeeApiItem[];
  form: typeof emptyForm;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateForm: (key: keyof typeof emptyForm, value: string) => void;
  onSave: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle>{editingTask ? 'Chỉnh sửa task' : 'Giao task mới'}</DialogTitle>
          <DialogDescription>
            {editingTask ? 'Chỉnh sửa thông tin task khi task chưa đóng.' : 'Giao task cho nhân viên trong phòng ban qua API thật.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Nhân viên</Label>
            <Select value={form.employeeId} onValueChange={(value) => onUpdateForm('employeeId', value)} disabled={Boolean(editingTask)}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn nhân viên" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={String(employee.id)}>
                    {employee.fullName} - {employee.positionTitle || 'Chưa có chức vụ'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Tên task</Label>
            <Input value={form.title} onChange={(event) => onUpdateForm('title', event.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Mô tả</Label>
            <Textarea value={form.description} onChange={(event) => onUpdateForm('description', event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Deadline</Label>
            <Input type="date" value={form.deadline} onChange={(event) => onUpdateForm('deadline', event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Độ ưu tiên</Label>
            <Select value={form.priority} onValueChange={(value) => onUpdateForm('priority', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">LOW</SelectItem>
                <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                <SelectItem value="HIGH">HIGH</SelectItem>
                <SelectItem value="CRITICAL">CRITICAL</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Điểm kỳ vọng</Label>
            <Input type="number" min={0} max={100} value={form.expectedScore} onChange={(event) => onUpdateForm('expectedScore', event.target.value)} />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={onSave} disabled={saving}>
            <Send className="mr-2 size-4" />
            {saving ? 'Đang lưu...' : editingTask ? 'Lưu chỉnh sửa' : 'Giao task'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AiReviewDialog({ open, review, onOpenChange }: { open: boolean; review: AgenticCompetencyReviewApi | null; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl rounded-2xl">
        <DialogHeader>
          <DialogTitle>AI Đánh Giá Năng Lực</DialogTitle>
          <DialogDescription>Kết quả được tạo từ task, review, chấm công và nghỉ phép hiện có.</DialogDescription>
        </DialogHeader>

        {!review ? (
          <div className="p-6 text-center text-slate-500">Chưa có dữ liệu đánh giá.</div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Nhân viên</p>
              <p className="text-xl font-bold text-slate-950">{review.employeeName}</p>
              <p className="text-sm text-slate-500">{review.departmentName}</p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <AiScore label="Điểm năng lực" value={review.totalScore} />
              <AiScore label="Điểm KPI" value={review.taskPerformanceScore} />
              <AiScore label="Điểm thái độ" value={review.disciplineResponsibilityScore} />
              <AiScore label="Điểm deadline" value={review.qualitySkillScore} />
              <AiScore label="Điểm hợp tác" value={review.attendanceScore} />
              <AiScore label="Xếp loại" value={review.rating} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 p-4">
                <p className="mb-2 font-semibold text-slate-900">Nhận xét AI</p>
                <p className="text-sm leading-6 text-slate-600">{review.aiSummary}</p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <p className="mb-2 font-semibold text-emerald-900">Khuyến nghị AI</p>
                <p className="text-sm leading-6 text-emerald-900">{review.aiRecommendation}</p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ActivityBlock({ task }: { task: TaskApiItem }) {
  const events = [
    { title: 'Manager giao task', desc: `Deadline ${formatDate(task.deadline)}` },
    { title: 'Employee cập nhật', desc: `Tiến độ hiện tại ${task.progressPercent}%` },
    ...(task.status === 'SUBMITTED' || task.status === 'APPROVED' ? [{ title: 'Submit hoàn thành', desc: 'Đã gửi Manager duyệt' }] : []),
    ...(task.latestReview ? [{ title: 'Manager phản hồi', desc: task.latestReview.comment || statusMeta[task.status].label }] : []),
  ];

  return (
    <div className="rounded-2xl border border-slate-100 p-4">
      <p className="mb-3 text-sm font-semibold text-slate-900">Activity</p>
      <div className="space-y-3">
        {events.map((event, index) => (
          <div key={`${event.title}-${index}`} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="size-2.5 rounded-full bg-blue-500" />
              {index < events.length - 1 && <div className="mt-1 min-h-6 w-px flex-1 bg-slate-200" />}
            </div>
            <div className="-mt-1">
              <p className="text-sm font-medium text-slate-900">{event.title}</p>
              <p className="text-xs text-slate-500">{event.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="rounded-2xl p-10 text-center shadow-sm">
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <ClipboardList className="size-7" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-950">Chưa có task nào trong bộ lọc này</h3>
      <p className="mt-1 text-sm text-slate-500">Thử đổi bộ lọc hoặc giao task mới cho nhân viên.</p>
      <Button className="mt-5" onClick={onCreate}>
        <Plus className="mr-2 size-4" />
        Giao task mới
      </Button>
    </Card>
  );
}

function KpiCard({ icon, label, value, tone }: { icon: ReactNode; label: string; value: number | string; tone: 'blue' | 'amber' | 'emerald' | 'red' | 'slate' }) {
  const toneClass = {
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-700',
    slate: 'bg-slate-100 text-slate-700',
  }[tone];

  return (
    <Card className="rounded-2xl p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-1 text-3xl font-bold text-slate-950">{value}</p>
        </div>
        <div className={`flex size-11 items-center justify-center rounded-2xl ${toneClass}`}>{icon}</div>
      </div>
    </Card>
  );
}

function MiniMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl bg-white px-3 py-2 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-bold text-slate-950">{value}</p>
    </div>
  );
}

function TaskBrief({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="truncate font-medium text-slate-900">{value}</p>
    </div>
  );
}

function Info({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <div className="mb-1 flex items-center gap-2 text-xs text-slate-500">
        {icon}
        {label}
      </div>
      <p className="truncate text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function AiScore({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  );
}
