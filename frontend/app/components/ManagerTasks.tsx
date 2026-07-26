'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Swal from 'sweetalert2';
import {
  AlertTriangle,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Download,
  Edit3,
  FileCheck2,
  Plus,
  RefreshCcw,
  Search,
  TimerReset,
  UserRound,
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
import { runAgenticAiWorkflow, type AgenticAiWorkflowApi } from '@/services/agenticAi';
import { fetchEmployees, type EmployeeApiItem } from '@/services/employees';
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
  departmentName?: string;
}

type QuickFilter = 'all' | 'need-review' | 'active' | 'done' | 'issue';

const emptyForm = {
  employeeId: '',
  title: '',
  description: '',
  deadline: '',
  priority: 'MEDIUM' as TaskPriority,
  expectedScore: '20',
};

const statusMeta: Record<TaskStatus, { label: string; className: string }> = {
  NEW: { label: 'Mới giao', className: 'bg-slate-100 text-slate-700 hover:bg-slate-100' },
  IN_PROGRESS: { label: 'Đang làm', className: 'bg-blue-100 text-blue-700 hover:bg-blue-100' },
  SUBMITTED: { label: 'Chờ duyệt', className: 'bg-amber-100 text-amber-700 hover:bg-amber-100' },
  APPROVED: { label: 'Hoàn thành', className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' },
  REJECTED: { label: 'Từ chối', className: 'bg-red-100 text-red-700 hover:bg-red-100' },
  REVISION_REQUIRED: { label: 'Cần sửa', className: 'bg-orange-100 text-orange-700 hover:bg-orange-100' },
  OVERDUE: { label: 'Quá hạn', className: 'bg-rose-100 text-rose-700 hover:bg-rose-100' },
};

const priorityMeta: Record<TaskPriority, string> = {
  LOW: 'bg-slate-100 text-slate-700 hover:bg-slate-100',
  MEDIUM: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  HIGH: 'bg-orange-100 text-orange-700 hover:bg-orange-100',
  CRITICAL: 'bg-red-100 text-red-700 hover:bg-red-100',
};

const priorityScoreMap: Record<TaskPriority, number> = {
  LOW: 10,
  MEDIUM: 20,
  HIGH: 30,
  CRITICAL: 40,
};

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

function expectedScoreForPriority(priority: TaskPriority) {
  return priorityScoreMap[priority] ?? 20;
}

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

function progressColor(value: number) {
  if (value <= 30) return 'text-red-700';
  if (value <= 70) return 'text-orange-700';
  return 'text-emerald-700';
}

function progressBarColor(task: TaskApiItem) {
  if (task.status === 'APPROVED') return 'bg-emerald-500';
  if (task.status === 'SUBMITTED') return 'bg-violet-500';
  if (task.status === 'REVISION_REQUIRED') return 'bg-amber-500';
  if (task.status === 'REJECTED' || isTaskOverdue(task)) return 'bg-red-500';
  if (task.progressPercent <= 30) return 'bg-red-500';
  if (task.progressPercent <= 70) return 'bg-blue-500';
  return 'bg-emerald-500';
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.slice(-2).map((part) => part.charAt(0)).join('');
  return initials.toUpperCase() || 'NV';
}

function isActiveEmployee(employee: EmployeeApiItem) {
  const status = employee.status.trim().toLowerCase();
  return status !== 'inactive' && status !== 'đã nghỉ việc';
}

function canManageDepartment(manager: EmployeeApiItem, departmentName?: string) {
  if (!departmentName || manager.role === 'ADMIN') return true;
  return manager.role === 'MANAGER' && manager.departmentName === departmentName;
}

function resolveManager(
  employees: EmployeeApiItem[],
  sessionEmail: string,
  departmentName?: string,
) {
  const loggedInManager = employees.find((employee) =>
    employee.email.toLowerCase() === sessionEmail.toLowerCase()
    && isActiveEmployee(employee)
    && (employee.role === 'MANAGER' || employee.role === 'ADMIN')
  );

  if (loggedInManager && canManageDepartment(loggedInManager, departmentName)) {
    return loggedInManager;
  }

  if (!departmentName) return loggedInManager || null;

  return employees.find((employee) =>
    isActiveEmployee(employee)
    && employee.role === 'MANAGER'
    && employee.departmentName === departmentName
  ) || employees.find((employee) =>
    isActiveEmployee(employee) && employee.role === 'ADMIN'
  ) || null;
}

export function ManagerTasks({ departmentName }: ManagerTasksProps) {
  const [manager, setManager] = useState<EmployeeApiItem | null>(null);
  const [employees, setEmployees] = useState<EmployeeApiItem[]>([]);
  const [tasks, setTasks] = useState<TaskApiItem[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [search, setSearch] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
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
  const [aiWorkflow, setAiWorkflow] = useState<AgenticAiWorkflowApi | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const effectiveDepartmentName = manager?.departmentName || departmentName || '';

  const selectedTask = useMemo(() => {
    return tasks.find((task) =>
      task.id === selectedTaskId
      && (!effectiveDepartmentName || task.departmentName === effectiveDepartmentName)
      && isTaskInPeriod(task, period)
    ) || null;
  }, [effectiveDepartmentName, period, selectedTaskId, tasks]);

  const departmentEmployees = useMemo(() => {
    return employees.filter((employee) =>
      (!effectiveDepartmentName || employee.departmentName === effectiveDepartmentName)
      && employee.status !== 'Đã nghỉ việc'
    );
  }, [effectiveDepartmentName, employees]);

  const loadData = async () => {
    setLoading(true);
    try {
      const employeeList = await fetchEmployees();
      const email = getSessionEmail();
      const currentManager = resolveManager(employeeList, email, departmentName);

      if (!currentManager || !canManageDepartment(currentManager, departmentName)) {
        setManager(null);
        setEmployees(employeeList);
        setTasks([]);
        toast.fire({ icon: 'warning', title: 'Không tìm thấy Manager từ tài khoản đăng nhập' });
        return;
      }

      const taskList = await fetchManagerTasks(currentManager.id, parsePeriod(period));
      const managerDepartment = currentManager.departmentName || departmentName || '';
      const visibleTasks = taskList.filter((task) =>
        (!managerDepartment || task.departmentName === managerDepartment)
        && isTaskInPeriod(task, period)
      );

      setManager(currentManager);
      setEmployees(employeeList);
      setTasks(taskList);

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
    if (!selectedTask) return;

    setReviewDraft({
      qualityScore: selectedTask.latestReview?.qualityScore || 90,
      deadlineScore: selectedTask.latestReview?.deadlineScore || 90,
      decision: 'APPROVED',
      comment: selectedTask.latestReview?.comment || '',
    });
  }, [selectedTask?.id]);

  const scopedTasks = useMemo(() => {
    return tasks.filter((task) =>
      (!effectiveDepartmentName || task.departmentName === effectiveDepartmentName)
      && isTaskInPeriod(task, period)
    );
  }, [effectiveDepartmentName, period, tasks]);

  const filteredTasks = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return scopedTasks.filter((task) => {
      const matchesSearch = !keyword || `${task.title} ${task.description || ''} ${task.employeeName}`.toLowerCase().includes(keyword);
      const matchesEmployee = employeeFilter === 'all' || String(task.employeeId) === employeeFilter;
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      const matchesQuick =
        quickFilter === 'all' ||
        (quickFilter === 'need-review' && task.status === 'SUBMITTED') ||
        (quickFilter === 'active' && isOpenTask(task)) ||
        (quickFilter === 'done' && task.status === 'APPROVED') ||
        (quickFilter === 'issue' && (isTaskOverdue(task) || task.status === 'REVISION_REQUIRED' || task.status === 'REJECTED'));

      return matchesSearch && matchesEmployee && matchesStatus && matchesQuick;
    });
  }, [employeeFilter, quickFilter, scopedTasks, search, statusFilter]);

  const kpis = useMemo(() => {
    const total = scopedTasks.length;
    const needReview = scopedTasks.filter((task) => task.status === 'SUBMITTED').length;
    const active = scopedTasks.filter(isOpenTask).length;
    const done = scopedTasks.filter((task) => task.status === 'APPROVED').length;
    const issue = scopedTasks.filter((task) => isTaskOverdue(task) || task.status === 'REVISION_REQUIRED' || task.status === 'REJECTED').length;
    const avgProgress = total ? Math.round(scopedTasks.reduce((sum, task) => sum + task.progressPercent, 0) / total) : 0;
    return { total, needReview, active, done, issue, avgProgress };
  }, [scopedTasks]);

  const quickFilters: Array<{ id: QuickFilter; label: string; count: number }> = [
    { id: 'all', label: 'Tất cả', count: kpis.total },
    { id: 'need-review', label: 'Chờ duyệt', count: kpis.needReview },
    { id: 'active', label: 'Đang làm', count: kpis.active },
    { id: 'done', label: 'Hoàn thành', count: kpis.done },
    { id: 'issue', label: 'Cần xử lý', count: kpis.issue },
  ];

  const updateTaskForm = (key: keyof typeof taskForm, value: string) => {
    setTaskForm((current) => {
      if (key === 'priority') {
        const nextPriority = value as TaskPriority;
        return {
          ...current,
          priority: nextPriority,
          expectedScore: String(expectedScoreForPriority(nextPriority)),
        };
      }

      return { ...current, [key]: value };
    });
  };

  const openCreateDialog = () => {
    setEditingTask(null);
    setTaskForm({
      ...emptyForm,
      deadline: periodEndDateInput(period),
      expectedScore: String(expectedScoreForPriority(emptyForm.priority)),
    });
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
      expectedScore: String(expectedScoreForPriority(task.priority)),
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
      expectedScore: expectedScoreForPriority(taskForm.priority),
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

    setAiWorkflow(null);
    setAiOpen(true);
    setAiLoading(true);

    try {
      const workflow = await runAgenticAiWorkflow({
        managerId: manager.id,
        employeeId,
        month: selectedPeriod.month,
        year: selectedPeriod.year,
        goal: 'Evaluate employee competency from task, review, attendance and leave data, then recommend manager actions.',
        persistReview: true,
      });
      setAiWorkflow(workflow);
    } catch (error) {
      console.error('Run Agentic AI workflow failed:', error);
      setAiOpen(false);
      Swal.fire('Không tạo được đánh giá AI', 'Cần có dữ liệu task/review/chấm công phù hợp hoặc kiểm tra backend.', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const exportReport = () => {
    const rows = [
      ['Nhan vien', 'Task', 'Trang thai', 'Uu tien', 'Deadline', 'Tien do', 'Diem ky vong'],
      ...filteredTasks.map((task) => [
        task.employeeName,
        task.title,
        statusMeta[task.status].label,
        task.priority,
        formatDate(task.deadline),
        `${task.progressPercent}%`,
        String(task.expectedScore),
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `manager-task-report-${period}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Quản lý task</h1>
          <p className="mt-2 text-sm text-slate-500">Giao việc, theo dõi tiến độ và duyệt kết quả theo kỳ đánh giá.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="h-10 w-[180px] rounded-2xl bg-white shadow-sm">
              <CalendarDays className="mr-2 size-4 text-blue-600" />
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
          <Button className="h-10 rounded-2xl bg-blue-600 px-5 shadow-sm hover:bg-blue-700" onClick={openCreateDialog} disabled={!manager}>
            <Plus className="mr-2 size-4" />
            Giao task
          </Button>
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-full bg-white shadow-sm" onClick={loadData} disabled={loading} aria-label="Làm mới">
            <RefreshCcw className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-full bg-white shadow-sm"
            onClick={exportReport}
            disabled={filteredTasks.length === 0}
            aria-label="Xuất báo cáo"
          >
            <Download className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard icon={<ClipboardList className="size-5" />} label="Tổng task" value={kpis.total} />
        <KpiCard icon={<FileCheck2 className="size-5" />} label="Cần duyệt" value={kpis.needReview} tone="amber" />
        <KpiCard icon={<TimerReset className="size-5" />} label="Đang làm" value={kpis.active} tone="blue" />
        <KpiCard icon={<CheckCircle2 className="size-5" />} label="Hoàn thành" value={kpis.done} tone="emerald" />
        <KpiCard icon={<AlertTriangle className="size-5" />} label="Có vấn đề" value={kpis.issue} tone="red" />
      </div>

      <Card className="rounded-2xl border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {quickFilters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setQuickFilter(filter.id)}
                aria-label={`${filter.label}: ${filter.count} task`}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  quickFilter === filter.id ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm theo tên task hoặc nhân viên..."
                className="h-10 rounded-2xl border-slate-200 bg-slate-50 pl-9"
              />
            </div>
            <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
              <SelectTrigger className="h-10 rounded-2xl bg-white">
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
              <SelectTrigger className="h-10 rounded-2xl bg-white">
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
          </div>
        </div>
      </Card>

      {loading ? (
        <Card className="rounded-2xl border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">Đang tải task từ API...</Card>
      ) : !manager ? (
        <Card className="rounded-2xl border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">Không tìm thấy Manager theo tài khoản đăng nhập.</Card>
      ) : filteredTasks.length === 0 ? (
        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
          <EmptyState onCreate={openCreateDialog} />
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              selected={selectedTaskId === task.id}
              departmentName={effectiveDepartmentName}
              onSelect={() => {
                setSelectedTaskId(task.id);
                setDetailOpen(true);
              }}
              onEdit={() => openEditDialog(task)}
              onAi={() => runAiEvaluation(task.employeeId)}
            />
          ))}
        </div>
      )}

      <TaskDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        task={selectedTask}
        reviewDraft={reviewDraft}
        onReviewDraftChange={setReviewDraft}
        onEdit={(task) => {
          setDetailOpen(false);
          openEditDialog(task);
        }}
        onSubmitReview={submitReview}
        onAi={runAiEvaluation}
      />

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

      <AiReviewDialog open={aiOpen} workflow={aiWorkflow} loading={aiLoading} onOpenChange={setAiOpen} />
    </div>
  );
}

function deadlineLabel(task: TaskApiItem) {
  if (task.status === 'APPROVED') return 'Đã hoàn thành';
  const days = daysUntil(task.deadline);
  if (days < 0) return `Quá hạn ${Math.abs(days)} ngày`;
  if (days === 0) return 'Hạn hôm nay';
  return `Còn ${days} ngày`;
}

function TaskRow({
  task,
  selected,
  departmentName,
  onSelect,
  onEdit,
  onAi,
}: {
  task: TaskApiItem;
  selected: boolean;
  departmentName: string;
  onSelect: () => void;
  onEdit: () => void;
  onAi: () => void;
}) {
  const deadlineTone = (() => {
    if (task.status === 'APPROVED') return 'text-emerald-600';
    const days = daysUntil(task.deadline);
    if (days < 0) return 'text-red-600';
    if (days <= 2) return 'text-orange-600';
    return 'text-slate-500';
  })();

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect();
        }
      }}
      className={`cursor-pointer rounded-2xl border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md ${
        selected ? 'border-blue-200 bg-blue-50/60' : ''
      }`}
    >
      <div className="grid gap-4 lg:grid-cols-[34px_minmax(0,1fr)_160px_88px] lg:items-center">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
          {getInitials(task.employeeName)}
        </div>

        <div className="min-w-0">
          <div className="mb-2 flex min-w-0 flex-wrap items-center gap-2">
            <p className="min-w-0 truncate text-base font-bold text-slate-950">{task.title}</p>
            <Badge className={`${priorityMeta[task.priority]} rounded px-2 py-0.5 text-xs font-semibold tracking-normal`}>{task.priority}</Badge>
            <Badge className={`${statusMeta[task.status].className} gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium`}>
              <span className="size-1.5 rounded-full bg-current" />
              {statusMeta[task.status].label}
            </Badge>
          </div>
          <p className="line-clamp-2 text-sm leading-5 text-slate-500">{task.description || 'Không có mô tả'}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
            <TaskMeta icon={<UserRound className="size-3.5" />} value={task.employeeName} strong />
            <TaskMeta icon={<ClipboardList className="size-3.5" />} value={task.departmentName || departmentName} />
            <TaskMeta icon={<CalendarDays className="size-3.5" />} value={formatDate(task.deadline)} />
            <TaskMeta icon={<TimerReset className="size-3.5" />} value={deadlineLabel(task)} className={deadlineTone} />
          </div>
        </div>

        <div className="w-full lg:w-40">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-slate-400">Tiến độ</span>
            <span className={`font-bold ${progressColor(task.progressPercent)}`}>{task.progressPercent}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full transition-all ${progressBarColor(task)}`} style={{ width: `${task.progressPercent}%` }} />
          </div>
        </div>

        <div className="flex items-center gap-2 lg:justify-end">
          <Button
            variant="outline"
            size="icon-sm"
            className="rounded-xl bg-white text-slate-500 hover:text-blue-700"
            onClick={(event) => {
              event.stopPropagation();
              onEdit();
            }}
            disabled={!canEditTask(task)}
            aria-label="Sửa task"
          >
            <Edit3 className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            className="rounded-xl bg-white text-blue-600 hover:text-blue-700"
            onClick={(event) => {
              event.stopPropagation();
              onAi();
            }}
            aria-label="AI đánh giá"
          >
            <BrainCircuit className="size-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function TaskMeta({
  icon,
  value,
  strong = false,
  className = 'text-slate-500',
}: {
  icon: ReactNode;
  value: string;
  strong?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 ${className}`}>
      {icon}
      <span className={`truncate ${strong ? 'font-semibold text-slate-800' : ''}`}>{value}</span>
    </span>
  );
}

function TaskDetailDialog({
  open,
  onOpenChange,
  task,
  reviewDraft,
  onReviewDraftChange,
  onEdit,
  onSubmitReview,
  onAi,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskApiItem | null;
  reviewDraft: ReviewTaskPayload;
  onReviewDraftChange: (draft: ReviewTaskPayload) => void;
  onEdit: (task: TaskApiItem) => void;
  onSubmitReview: (decision: TaskReviewDecision) => void;
  onAi: (employeeId: number) => void;
}) {
  if (!task) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chi tiết task</DialogTitle>
            <DialogDescription>Chọn một task trong danh sách để xem chi tiết.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  const canReview = task.status === 'SUBMITTED';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto rounded-[28px] border border-slate-200 p-0 shadow-2xl">
        <DialogHeader className="border-b border-slate-100 bg-gradient-to-br from-slate-50 via-white to-blue-50 p-6 text-left">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-blue-600">Chi tiết task</p>
            <DialogTitle className="mt-1 text-xl font-bold text-slate-950">{task.title}</DialogTitle>
          </div>
          <Badge className={statusMeta[task.status].className}>{statusMeta[task.status].label}</Badge>
        </div>
        <DialogDescription className="text-sm leading-6 text-slate-600">{task.description || 'Task này chưa có mô tả.'}</DialogDescription>
        </DialogHeader>

      <div className="space-y-5 p-6">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Info icon={<UserRound className="size-4" />} label="Nhân viên" value={task.employeeName} />
          <Info icon={<CalendarDays className="size-4" />} label="Deadline" value={formatDate(task.deadline)} />
          <Info icon={<TimerReset className="size-4" />} label="Còn lại" value={deadlineLabel(task)} />
          <Info icon={<ClipboardList className="size-4" />} label="Điểm task" value={`${task.expectedScore} điểm`} />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Tiến độ</p>
            <p className={`text-sm font-bold ${progressColor(task.progressPercent)}`}>{task.progressPercent}%</p>
          </div>
          <Progress value={task.progressPercent} className="h-2" />
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="mb-1 text-sm font-semibold text-slate-900">Phản hồi gần nhất</p>
          <p className="text-sm text-slate-600">{task.latestReview?.comment || 'Chưa có phản hồi từ Manager.'}</p>
        </div>

        {canReview ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <FileCheck2 className="size-5 text-amber-700" />
              <p className="font-semibold text-amber-900">Task đang chờ duyệt</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Điểm chất lượng</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={reviewDraft.qualityScore}
                  onChange={(event) => onReviewDraftChange({ ...reviewDraft, qualityScore: Number(event.target.value) })}
                />
              </div>
              <div>
                <Label>Điểm deadline</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={reviewDraft.deadlineScore}
                  onChange={(event) => onReviewDraftChange({ ...reviewDraft, deadlineScore: Number(event.target.value) })}
                />
              </div>
            </div>
            <div className="mt-3">
              <Label>Nhận xét</Label>
              <Textarea
                value={reviewDraft.comment || ''}
                onChange={(event) => onReviewDraftChange({ ...reviewDraft, comment: event.target.value })}
                placeholder="Nhận xét ngắn gọn cho nhân viên"
              />
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <Button onClick={() => onSubmitReview('APPROVED')}>
                <CheckCircle2 className="mr-2 size-4" />
                Duyệt
              </Button>
              <Button variant="outline" onClick={() => onSubmitReview('REVISION_REQUIRED')}>
                <AlertTriangle className="mr-2 size-4" />
                Sửa lại
              </Button>
              <Button variant="destructive" onClick={() => onSubmitReview('REJECTED')}>
                <XCircle className="mr-2 size-4" />
                Từ chối
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">
            {task.status === 'APPROVED'
              ? 'Task đã hoàn thành và được nghiệm thu.'
              : 'Task chưa gửi hoàn thành nên chưa cần review.'}
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-2">
          <Button variant="outline" onClick={() => onEdit(task)} disabled={!canEditTask(task)}>
            <Edit3 className="mr-2 size-4" />
            Chỉnh sửa
          </Button>
          <Button variant="outline" onClick={() => onAi(task.employeeId)}>
            <BrainCircuit className="mr-2 size-4" />
            AI đánh giá
          </Button>
        </div>
      </div>
      </DialogContent>
    </Dialog>
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
      <DialogContent className="max-w-2xl rounded-[28px] border border-slate-200 p-0 shadow-2xl">
        <DialogHeader className="border-b border-slate-100 bg-gradient-to-br from-slate-50 via-white to-blue-50 p-6">
          <DialogTitle>{editingTask ? 'Chỉnh sửa task' : 'Giao task mới'}</DialogTitle>
          <DialogDescription>
            {editingTask ? 'Chỉnh sửa thông tin task khi task chưa đóng.' : 'Giao task cho nhân viên trong phòng ban.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 p-6">
          <div className="grid gap-2">
            <Label>Nhân viên</Label>
            <Select value={form.employeeId} onValueChange={(value) => onUpdateForm('employeeId', value)} disabled={Boolean(editingTask)}>
              <SelectTrigger className="h-11 rounded-2xl">
                <SelectValue placeholder="Chọn nhân viên" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={String(employee.id)}>
                    {employee.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Tên task</Label>
            <Input className="h-11 rounded-2xl" value={form.title} onChange={(event) => onUpdateForm('title', event.target.value)} placeholder="Ví dụ: Hoàn thiện báo cáo tuần" />
          </div>
          <div className="grid gap-2">
            <Label>Mô tả</Label>
            <Textarea className="min-h-28 rounded-2xl" value={form.description} onChange={(event) => onUpdateForm('description', event.target.value)} placeholder="Yêu cầu, tiêu chí hoàn thành..." />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="grid gap-2">
              <Label>Deadline</Label>
              <Input className="h-11 rounded-2xl" type="date" value={form.deadline} onChange={(event) => onUpdateForm('deadline', event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Ưu tiên</Label>
              <Select value={form.priority} onValueChange={(value) => onUpdateForm('priority', value as TaskPriority)}>
                <SelectTrigger className="h-11 rounded-2xl">
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
            <div className="grid gap-2">
              <Label>Điểm tự động</Label>
              <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
                <p className="text-lg font-bold text-blue-900">{form.expectedScore} điểm</p>
                <p className="mt-1 text-xs text-blue-700">LOW = 10, MEDIUM = 20, HIGH = 30, CRITICAL = 40</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Hệ thống tự gán điểm theo độ ưu tiên để manager và AI đánh giá theo cùng một chuẩn.
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button onClick={onSave} disabled={saving}>
              {saving ? 'Đang lưu...' : editingTask ? 'Lưu chỉnh sửa' : 'Giao task'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AiReviewDialog({
  open,
  workflow,
  loading,
  onOpenChange,
}: {
  open: boolean;
  workflow: AgenticAiWorkflowApi | null;
  loading: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const employee = workflow?.analysis.employees[0];
  const recommendation = workflow?.recommendation.items[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AI đánh giá năng lực</DialogTitle>
          <DialogDescription>Kết quả đánh giá theo kỳ đã chọn.</DialogDescription>
        </DialogHeader>
        {loading || !workflow || !employee ? (
          <div className="py-8 text-center text-sm text-slate-500">Đang tạo đánh giá...</div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-5">
              <AiScore label="Tổng" value={employee.totalScore} />
              <AiScore label="Task" value={employee.taskPerformanceScore} />
              <AiScore label="Chất lượng" value={employee.qualitySkillScore} />
              <AiScore label="Kỷ luật" value={employee.disciplineResponsibilityScore} />
              <AiScore label="Chuyên cần" value={employee.attendanceScore} />
            </div>
            <div className="rounded-2xl border border-slate-100 p-4">
              <p className="mb-2 font-semibold text-slate-900">Nhận xét AI</p>
              <p className="text-sm leading-6 text-slate-600">{workflow.report.summary}</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="mb-2 font-semibold text-emerald-900">Khuyến nghị AI</p>
              <p className="text-sm leading-6 text-emerald-900">{recommendation?.action || workflow.recommendation.overallRecommendation}</p>
              {recommendation && (
                <p className="mt-2 text-xs leading-5 text-emerald-800">
                  {recommendation.reason} Evidence: {recommendation.evidence}
                </p>
              )}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <p className="mb-2 text-sm font-semibold text-blue-900">Planner Agent</p>
                <div className="space-y-2">
                  {workflow.plan.steps.slice(0, 4).map((step) => (
                    <div key={`${step.order}-${step.agent}`} className="rounded-xl bg-white/70 p-2 text-xs text-blue-900">
                      <span className="font-bold">{step.order}. {step.agent}</span> - {step.action}
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
                <p className="mb-2 text-sm font-semibold text-violet-900">Reflection Agent</p>
                <Badge className={workflow.reflection.isValid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                  {workflow.reflection.isValid ? 'Validation passed' : 'Needs review'}
                </Badge>
                <div className="mt-3 space-y-2 text-xs text-violet-900">
                  {(workflow.reflection.issues.length > 0 ? workflow.reflection.issues : workflow.reflection.checks).slice(0, 4).map((item) => (
                    <p key={item} className="rounded-xl bg-white/70 p-2">{item}</p>
                  ))}
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 p-4">
              <p className="mb-2 text-sm font-semibold text-slate-900">Agent trace</p>
              <div className="grid gap-2 md:grid-cols-2">
                {workflow.trace.slice(0, 6).map((trace) => (
                  <div key={`${trace.agent}-${trace.action}-${trace.createdAt}`} className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                    <p className="font-semibold text-slate-900">{trace.agent}</p>
                    <p>{trace.action}</p>
                    <p className="mt-1 text-slate-500">{trace.result}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="p-10 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <ClipboardList className="size-6" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-950">Không có task phù hợp</h3>
      <p className="mt-1 text-sm text-slate-500">Thử đổi bộ lọc hoặc giao task mới.</p>
      <Button className="mt-5" onClick={onCreate}>
        <Plus className="mr-2 size-4" />
        Giao task mới
      </Button>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  tone = 'slate',
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
  tone?: 'slate' | 'blue' | 'amber' | 'emerald' | 'red';
}) {
  const toneClass = {
    slate: 'bg-slate-100 text-slate-600',
    blue: 'bg-blue-100 text-blue-700',
    amber: 'bg-violet-100 text-violet-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    red: 'bg-amber-100 text-amber-700',
  }[tone];

  return (
    <Card className="rounded-2xl border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-4">
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-2xl ${toneClass}`}>{icon}</div>
        <div className="min-w-0">
          <p className="truncate text-sm text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold leading-none text-slate-950">{value}</p>
        </div>
      </div>
    </Card>
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
