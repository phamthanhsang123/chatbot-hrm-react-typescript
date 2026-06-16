'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  FileCheck2,
  ListChecks,
  MessageSquareText,
  RotateCw,
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

const demoTasks: EmployeeTaskApiItem[] = [
  {
    id: 1,
    employeeId: 1,
    employeeName: 'Nguyễn Văn A',
    managerId: 2,
    managerName: 'Kiên Quân',
    departmentId: 1,
    departmentName: 'IT',
    title: 'Kiểm tra đồng bộ FE với API task',
    description: 'Rà soát contract task của Employee để tiến độ gửi lên đúng luồng Manager review.',
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
    deadline: '2026-06-18T17:00:00',
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
    description: 'Mô phỏng task đã đạt 100% và chờ Manager review, chấm điểm chất lượng.',
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
      id: 1,
      taskId: 4,
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

const statusConfig: Record<DisplayStatus, { label: string; className: string }> = {
  NEW: { label: 'Mới giao', className: 'bg-slate-100 text-slate-700 hover:bg-slate-100' },
  IN_PROGRESS: { label: 'Đang làm', className: 'bg-blue-100 text-blue-700 hover:bg-blue-100' },
  SUBMITTED: { label: 'Chờ Manager duyệt', className: 'bg-amber-100 text-amber-700 hover:bg-amber-100' },
  APPROVED: { label: 'Đã duyệt', className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' },
  REVISION_REQUIRED: { label: 'Cần chỉnh sửa', className: 'bg-orange-100 text-orange-700 hover:bg-orange-100' },
  REJECTED: { label: 'Bị từ chối', className: 'bg-red-100 text-red-700 hover:bg-red-100' },
  OVERDUE: { label: 'Quá hạn', className: 'bg-rose-100 text-rose-700 hover:bg-rose-100' },
};

const priorityConfig: Record<TaskPriority, { label: string; className: string }> = {
  LOW: { label: 'Thấp', className: 'bg-gray-100 text-gray-700 hover:bg-gray-100' },
  MEDIUM: { label: 'Trung bình', className: 'bg-sky-100 text-sky-700 hover:bg-sky-100' },
  HIGH: { label: 'Cao', className: 'bg-orange-100 text-orange-700 hover:bg-orange-100' },
  CRITICAL: { label: 'Khẩn cấp', className: 'bg-red-100 text-red-700 hover:bg-red-100' },
};

const filters: { id: DisplayStatus | 'ALL'; label: string }[] = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'NEW', label: 'Mới giao' },
  { id: 'IN_PROGRESS', label: 'Đang làm' },
  { id: 'SUBMITTED', label: 'Chờ duyệt' },
  { id: 'REVISION_REQUIRED', label: 'Cần sửa' },
  { id: 'APPROVED', label: 'Đã duyệt' },
  { id: 'OVERDUE', label: 'Quá hạn' },
];

function getDisplayStatus(task: EmployeeTaskApiItem): DisplayStatus {
  if (task.isOverdue && task.status !== 'APPROVED' && task.status !== 'REJECTED') {
    return 'OVERDUE';
  }

  return task.status;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('vi-VN');
}

function clampProgress(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function EmployeeTasks() {
  const [tasks, setTasks] = useState<EmployeeTaskApiItem[]>([]);
  const [selectedTask, setSelectedTask] = useState<EmployeeTaskApiItem | null>(null);
  const [activeFilter, setActiveFilter] = useState<DisplayStatus | 'ALL'>('ALL');
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressNote, setProgressNote] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUsingDemoData, setIsUsingDemoData] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadTasks() {
      try {
        setIsLoading(true);
        const data = await fetchEmployeeTasks();
        if (!isMounted) return;
        setTasks(data);
        setIsUsingDemoData(false);
      } catch (error) {
        console.error('fetchEmployeeTasks failed:', error);
        if (!isMounted) return;
        setTasks(demoTasks);
        setIsUsingDemoData(true);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadTasks();

    return () => {
      isMounted = false;
    };
  }, []);

  const summary = useMemo(() => {
    return {
      total: tasks.length,
      active: tasks.filter((task) => ['NEW', 'IN_PROGRESS', 'REVISION_REQUIRED'].includes(task.status)).length,
      submitted: tasks.filter((task) => task.status === 'SUBMITTED').length,
      approved: tasks.filter((task) => task.status === 'APPROVED').length,
      overdue: tasks.filter((task) => getDisplayStatus(task) === 'OVERDUE').length,
    };
  }, [tasks]);

  const visibleTasks = useMemo(() => {
    if (activeFilter === 'ALL') return tasks;
    return tasks.filter((task) => getDisplayStatus(task) === activeFilter);
  }, [activeFilter, tasks]);

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

    if (isUsingDemoData) {
      replaceTask({
        ...selectedTask,
        progressPercent: safeProgress,
        status: selectedTask.status === 'NEW' ? 'IN_PROGRESS' : selectedTask.status,
        updatedAt: new Date().toISOString(),
      });
      setMessage('Đã cập nhật tiến độ trên dữ liệu demo.');
      setShowProgressDialog(false);
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
      setMessage('Chưa cập nhật được tiến độ. Kiểm tra backend/API task.');
    }
  };

  const submitTask = async (task: EmployeeTaskApiItem) => {
    if (isUsingDemoData) {
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
      setMessage('Chưa gửi hoàn thành được. Kiểm tra backend/API task.');
    }
  };

  const canUpdate = (task: EmployeeTaskApiItem) => !['SUBMITTED', 'APPROVED', 'REJECTED'].includes(task.status);
  const canSubmit = (task: EmployeeTaskApiItem) =>
    !['SUBMITTED', 'APPROVED', 'REJECTED'].includes(task.status) && task.progressPercent >= 100;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <ListChecks className="size-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Task của tôi</h1>
            <p className="text-sm text-gray-500">
              Nhận task từ Manager, cập nhật tiến độ và gửi hoàn thành để được review.
            </p>
          </div>
        </div>
        <Badge className="w-fit bg-indigo-100 text-indigo-700 hover:bg-indigo-100">
          Employee ID: {getCurrentEmployeeId()}
        </Badge>
      </div>

      {message && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">{message}</div>
      )}

      {isUsingDemoData && (
        <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Đang hiển thị dữ liệu mẫu theo đúng contract task vì API employee task chưa trả về dữ liệu.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Tổng task" value={summary.total} icon={<ListChecks className="size-7 text-indigo-600" />} />
        <SummaryCard label="Đang xử lý" value={summary.active} icon={<Clock3 className="size-7 text-blue-600" />} />
        <SummaryCard label="Chờ duyệt" value={summary.submitted} icon={<FileCheck2 className="size-7 text-amber-600" />} />
        <SummaryCard label="Đã duyệt" value={summary.approved} icon={<CheckCircle2 className="size-7 text-emerald-600" />} />
        <SummaryCard label="Quá hạn" value={summary.overdue} icon={<AlertCircle className="size-7 text-rose-600" />} />
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <Button
              key={filter.id}
              variant={activeFilter === filter.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter(filter.id)}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </Card>

      <div className="space-y-4">
        {isLoading ? (
          <Card className="p-6 text-sm text-gray-500">Đang tải task của nhân viên...</Card>
        ) : visibleTasks.length === 0 ? (
          <Card className="p-6 text-sm text-gray-500">Không có task nào trong bộ lọc hiện tại.</Card>
        ) : (
          visibleTasks.map((task) => {
            const displayStatus = getDisplayStatus(task);

            return (
              <Card key={task.id} className="p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-gray-900">{task.title}</h2>
                      <Badge className={statusConfig[displayStatus].className}>{statusConfig[displayStatus].label}</Badge>
                      <Badge className={priorityConfig[task.priority].className}>{priorityConfig[task.priority].label}</Badge>
                    </div>
                    <p className="max-w-3xl text-sm leading-6 text-gray-600">{task.description || 'Không có mô tả.'}</p>

                    <div className="grid gap-3 text-sm text-gray-600 md:grid-cols-2 xl:grid-cols-4">
                      <InfoLine icon={<UserCheck className="size-4" />} label="Manager" subLabel={task.managerName || 'Chưa gán'} />
                      <InfoLine icon={<CalendarDays className="size-4" />} label="Deadline" subLabel={formatDate(task.deadline)} />
                      <InfoLine icon={<Star className="size-4" />} label="Điểm kỳ vọng" subLabel={`${task.expectedScore}/100`} />
                      <InfoLine icon={<MessageSquareText className="size-4" />} label="Phòng ban" subLabel={task.departmentName || 'Chưa có'} />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700">Tiến độ cập nhật</span>
                        <span className="font-semibold text-gray-900">{task.progressPercent}%</span>
                      </div>
                      <Progress value={task.progressPercent} />
                      <p className="text-xs text-gray-500">
                        100% chỉ là trạng thái nhân viên đã sẵn sàng gửi, task chỉ hoàn thành chính thức khi Manager duyệt.
                      </p>
                    </div>

                    {task.latestReview && (
                      <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm text-gray-700">
                        <p className="font-medium text-gray-900">Phản hồi Manager</p>
                        <p className="mt-1">
                          Kết quả: {statusConfig[task.latestReview.decision].label} - Điểm chất lượng:{' '}
                          {task.latestReview.qualityScore}/100
                        </p>
                        {task.latestReview.comment && <p className="mt-1 text-gray-600">{task.latestReview.comment}</p>}
                      </div>
                    )}
                  </div>

                  <div className="flex w-full flex-col gap-2 xl:w-48">
                    <Button variant="outline" onClick={() => openDetail(task)}>
                      <Eye className="mr-2 size-4" />
                      Xem chi tiết
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

      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chi tiết task</DialogTitle>
            <DialogDescription>Thông tin task do Manager giao và trạng thái review hiện tại.</DialogDescription>
          </DialogHeader>

          {selectedTask && (
            <div className="space-y-4">
              <div>
                <Label>Tên task</Label>
                <p className="mt-1 font-medium text-gray-900">{selectedTask.title}</p>
              </div>
              <div>
                <Label>Mô tả</Label>
                <p className="mt-1 text-sm leading-6 text-gray-700">{selectedTask.description || 'Không có mô tả.'}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <DetailItem label="Manager" value={selectedTask.managerName || 'Chưa gán'} />
                <DetailItem label="Phòng ban" value={selectedTask.departmentName || 'Chưa có'} />
                <DetailItem label="Deadline" value={formatDate(selectedTask.deadline)} />
                <DetailItem label="Độ ưu tiên" value={priorityConfig[selectedTask.priority].label} />
                <DetailItem label="Trạng thái" value={statusConfig[getDisplayStatus(selectedTask)].label} />
                <DetailItem label="Điểm kỳ vọng" value={`${selectedTask.expectedScore}/100`} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showProgressDialog} onOpenChange={setShowProgressDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Cập nhật tiến độ task</DialogTitle>
            <DialogDescription>Ghi nhận tiến độ và ghi chú để Manager có dữ liệu review.</DialogDescription>
          </DialogHeader>

          {selectedTask && (
            <div className="space-y-4">
              <div>
                <Label>Task</Label>
                <p className="mt-1 font-medium text-gray-900">{selectedTask.title}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="progressPercent">Tiến độ hoàn thành (%)</Label>
                <Input
                  id="progressPercent"
                  type="number"
                  min={0}
                  max={100}
                  value={progressPercent}
                  onChange={(event) => setProgressPercent(clampProgress(Number(event.target.value)))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="progressNote">Ghi chú cập nhật</Label>
                <Textarea
                  id="progressNote"
                  rows={4}
                  value={progressNote}
                  onChange={(event) => setProgressNote(event.target.value)}
                  placeholder="Nội dung đã làm, khó khăn, phần cần Manager hỗ trợ..."
                />
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm text-gray-600">
                Khi đạt 100%, hãy dùng nút Gửi duyệt để chuyển task sang trạng thái chờ Manager review.
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowProgressDialog(false)}>
                  Hủy
                </Button>
                <Button onClick={saveProgress}>Lưu tiến độ</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
        </div>
        {icon}
      </div>
    </Card>
  );
}

function InfoLine({ icon, label, subLabel }: { icon: React.ReactNode; label: string; subLabel: string }) {
  return (
    <div className="flex min-w-0 items-start gap-2 rounded-md bg-gray-50 p-3">
      <div className="mt-0.5 text-gray-400">{icon}</div>
      <div className="min-w-0">
        <p className="truncate font-medium text-gray-900">{label}</p>
        <p className="line-clamp-2 text-xs text-gray-500">{subLabel}</p>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-gray-50 p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}
