'use client';

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  Plus,
  Search,
  Send,
  Star,
  UserCheck,
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';

type TaskStatus = 'new' | 'in_progress' | 'submitted' | 'approved' | 'revision_required' | 'rejected' | 'overdue';
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
type ReviewResult = 'approved' | 'revision_required' | 'rejected';

interface ManagerTask {
  id: number;
  title: string;
  description: string;
  assignee: string;
  role: string;
  department: string;
  deadline: string;
  priority: TaskPriority;
  kpiPoint: number;
  progress: number;
  status: TaskStatus;
  qualityScore?: number;
  managerNote?: string;
  lastUpdate: string;
}

interface ManagerTasksProps {
  mode?: 'manage' | 'review';
  departmentName: string;
}

const taskData: ManagerTask[] = [
  {
    id: 1,
    title: 'Sửa lỗi đăng nhập bằng JWT',
    description: 'Kiểm tra luồng đăng nhập, token hết hạn và thông báo lỗi cho người dùng.',
    assignee: 'Nguyễn Văn A',
    role: 'Developer',
    department: 'IT',
    deadline: '2026-06-14',
    priority: 'HIGH',
    kpiPoint: 20,
    progress: 100,
    status: 'submitted',
    lastUpdate: 'Đã hoàn thành backend, chờ Manager review.',
  },
  {
    id: 2,
    title: 'Hoàn thiện báo cáo chấm công team',
    description: 'Tổng hợp số lần đi trễ, về sớm và vắng không phép theo tuần.',
    assignee: 'Lê Văn C',
    role: 'Team Lead',
    department: 'IT',
    deadline: '2026-06-18',
    priority: 'MEDIUM',
    kpiPoint: 15,
    progress: 75,
    status: 'in_progress',
    lastUpdate: 'Đang đợi dữ liệu chấm công từ backend.',
  },
  {
    id: 3,
    title: 'Viết test case cho module nghỉ phép',
    description: 'Kiểm tra phê duyệt, từ chối và tính ngày nghỉ hợp lệ.',
    assignee: 'Vũ Thị F',
    role: 'QA Tester',
    department: 'IT',
    deadline: '2026-06-12',
    priority: 'URGENT',
    kpiPoint: 18,
    progress: 60,
    status: 'overdue',
    lastUpdate: 'Có nghỉ phép hợp lệ 1 ngày, cần gia hạn deadline thực tế.',
  },
  {
    id: 4,
    title: 'Triển khai monitoring API lương',
    description: 'Theo dõi lỗi gọi API lương và log response bất thường.',
    assignee: 'Hoàng Minh Tuấn',
    role: 'DevOps Engineer',
    department: 'IT',
    deadline: '2026-06-20',
    priority: 'LOW',
    kpiPoint: 10,
    progress: 0,
    status: 'new',
    lastUpdate: 'Task mới được giao.',
  },
  {
    id: 5,
    title: 'Review giao diện đánh giá năng lực',
    description: 'Kiểm tra điểm task, điểm chất lượng và đề xuất AI trước khi chốt.',
    assignee: 'Nguyễn Văn A',
    role: 'Developer',
    department: 'IT',
    deadline: '2026-06-10',
    priority: 'HIGH',
    kpiPoint: 25,
    progress: 100,
    status: 'approved',
    qualityScore: 88,
    managerNote: 'Hoàn thành đúng hạn, chất lượng tốt.',
    lastUpdate: 'Manager đã duyệt hoàn thành.',
  },
];

const statusConfig: Record<TaskStatus, { label: string; className: string }> = {
  new: { label: 'Mới giao', className: 'bg-slate-100 text-slate-700 hover:bg-slate-100' },
  in_progress: { label: 'Đang làm', className: 'bg-blue-100 text-blue-700 hover:bg-blue-100' },
  submitted: { label: 'Chờ duyệt', className: 'bg-amber-100 text-amber-700 hover:bg-amber-100' },
  approved: { label: 'Đã duyệt', className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' },
  revision_required: { label: 'Cần sửa', className: 'bg-orange-100 text-orange-700 hover:bg-orange-100' },
  rejected: { label: 'Từ chối', className: 'bg-red-100 text-red-700 hover:bg-red-100' },
  overdue: { label: 'Quá hạn', className: 'bg-rose-100 text-rose-700 hover:bg-rose-100' },
};

const priorityConfig: Record<TaskPriority, { label: string; className: string }> = {
  LOW: { label: 'Thấp', className: 'bg-gray-100 text-gray-700 hover:bg-gray-100' },
  MEDIUM: { label: 'Trung bình', className: 'bg-sky-100 text-sky-700 hover:bg-sky-100' },
  HIGH: { label: 'Cao', className: 'bg-orange-100 text-orange-700 hover:bg-orange-100' },
  URGENT: { label: 'Khẩn cấp', className: 'bg-red-100 text-red-700 hover:bg-red-100' },
};

const reviewLabels: Record<ReviewResult, string> = {
  approved: 'Duyệt hoàn thành',
  revision_required: 'Yêu cầu chỉnh sửa',
  rejected: 'Từ chối hoàn thành',
};

export function ManagerTasks({ mode = 'manage', departmentName }: ManagerTasksProps) {
  const [tasks, setTasks] = useState(taskData);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>(mode === 'review' ? 'submitted' : 'all');
  const [open, setOpen] = useState(false);

  const visibleTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesDepartment = task.department === departmentName;
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      const text = `${task.title} ${task.assignee} ${task.role}`.toLowerCase();
      return matchesDepartment && matchesStatus && text.includes(query.toLowerCase());
    });
  }, [departmentName, query, statusFilter, tasks]);

  const pendingReviewCount = tasks.filter((task) => task.department === departmentName && task.status === 'submitted').length;
  const activeCount = tasks.filter((task) => task.department === departmentName && ['new', 'in_progress', 'overdue'].includes(task.status)).length;
  const approvedCount = tasks.filter((task) => task.department === departmentName && task.status === 'approved').length;
  const averageProgress = Math.round(
    tasks
      .filter((task) => task.department === departmentName)
      .reduce((sum, task, _, scopedTasks) => sum + task.progress / scopedTasks.length, 0),
  );

  const handleCreateDemoTask = () => {
    const newTask: ManagerTask = {
      id: Date.now(),
      title: 'Kiểm tra đồng bộ FE với API task',
      description: 'Xác nhận contract với TV2 trước khi gọi API thật.',
      assignee: 'Lê Văn C',
      role: 'Team Lead',
      department: departmentName,
      deadline: '2026-06-21',
      priority: 'MEDIUM',
      kpiPoint: 12,
      progress: 0,
      status: 'new',
      lastUpdate: 'Task demo vừa được tạo trên frontend.',
    };

    setTasks((current) => [newTask, ...current]);
    setOpen(false);
  };

  const handleReview = (taskId: number, result: ReviewResult) => {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status: result,
              qualityScore: result === 'approved' ? 88 : result === 'revision_required' ? 65 : 45,
              managerNote: reviewLabels[result],
              lastUpdate: `Manager đã chọn: ${reviewLabels[result]}.`,
            }
          : task,
      ),
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-indigo-600 text-white">
            {mode === 'review' ? <FileCheck2 className="size-6" /> : <ClipboardList className="size-6" />}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {mode === 'review' ? 'Duyệt task phòng ban' : 'Quản lý task Manager'}
            </h1>
            <p className="text-sm text-gray-500">
              Manager chỉ giao, theo dõi và review task của nhân viên thuộc phòng ban {departmentName}
            </p>
          </div>
        </div>

        {mode === 'manage' && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 size-4" />
                Giao task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Giao task cho nhân viên phòng ban</DialogTitle>
                <DialogDescription>
                  Đây là form demo frontend. Khi TV2 chốt API, FE sẽ gọi POST /api/manager/tasks theo contract.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="task-title">Tên task</Label>
                  <Input id="task-title" defaultValue="Kiểm tra đồng bộ FE với API task" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="task-description">Mô tả task</Label>
                  <Textarea id="task-description" defaultValue="Xác nhận request/response với TV2 trước khi gọi API thật." />
                </div>
                <div className="space-y-2">
                  <Label>Nhân viên được giao</Label>
                  <Select defaultValue="le-van-c">
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Chọn nhân viên" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nguyen-van-a">Nguyễn Văn A</SelectItem>
                      <SelectItem value="le-van-c">Lê Văn C</SelectItem>
                      <SelectItem value="hoang-minh-tuan">Hoàng Minh Tuấn</SelectItem>
                      <SelectItem value="vu-thi-f">Vũ Thị F</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task-deadline">Deadline</Label>
                  <Input id="task-deadline" type="date" defaultValue="2026-06-21" />
                </div>
                <div className="space-y-2">
                  <Label>Mức độ ưu tiên</Label>
                  <Select defaultValue="MEDIUM">
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Chọn mức độ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Thấp</SelectItem>
                      <SelectItem value="MEDIUM">Trung bình</SelectItem>
                      <SelectItem value="HIGH">Cao</SelectItem>
                      <SelectItem value="URGENT">Khẩn cấp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task-point">Điểm KPI/task point</Label>
                  <Input id="task-point" type="number" defaultValue={12} min={1} max={100} />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Hủy
                </Button>
                <Button onClick={handleCreateDemoTask}>
                  <Send className="mr-2 size-4" />
                  Tạo task demo
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Task đang theo dõi" value={activeCount} icon={<ClipboardList className="size-7 text-blue-600" />} />
        <MetricCard label="Chờ Manager duyệt" value={pendingReviewCount} icon={<FileCheck2 className="size-7 text-amber-600" />} />
        <MetricCard label="Đã duyệt hoàn thành" value={approvedCount} icon={<CheckCircle2 className="size-7 text-emerald-600" />} />
        <MetricCard label="Tiến độ trung bình" value={`${averageProgress}%`} icon={<Star className="size-7 text-indigo-600" />} />
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative max-w-xl flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm theo task, nhân viên, chức vụ"
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as TaskStatus | 'all')}>
            <SelectTrigger className="w-full lg:w-56">
              <SelectValue placeholder="Lọc trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="new">Mới giao</SelectItem>
              <SelectItem value="in_progress">Đang làm</SelectItem>
              <SelectItem value="submitted">Chờ duyệt</SelectItem>
              <SelectItem value="approved">Đã duyệt</SelectItem>
              <SelectItem value="revision_required">Cần sửa</SelectItem>
              <SelectItem value="rejected">Từ chối</SelectItem>
              <SelectItem value="overdue">Quá hạn</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <div className="space-y-4">
        {visibleTasks.map((task) => (
          <Card key={task.id} className="p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-gray-900">{task.title}</h2>
                  <Badge className={statusConfig[task.status].className}>{statusConfig[task.status].label}</Badge>
                  <Badge className={priorityConfig[task.priority].className}>{priorityConfig[task.priority].label}</Badge>
                </div>
                <p className="max-w-3xl text-sm leading-6 text-gray-600">{task.description}</p>

                <div className="grid gap-3 text-sm text-gray-600 md:grid-cols-2 xl:grid-cols-4">
                  <InfoLine icon={<UserCheck className="size-4" />} label={task.assignee} subLabel={task.role} />
                  <InfoLine icon={<CalendarDays className="size-4" />} label="Deadline" subLabel={task.deadline} />
                  <InfoLine icon={<Star className="size-4" />} label="Task point" subLabel={`${task.kpiPoint} điểm`} />
                  <InfoLine icon={<AlertCircle className="size-4" />} label="Cập nhật cuối" subLabel={task.lastUpdate} />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">Tiến độ nhân viên cập nhật</span>
                    <span className="font-semibold text-gray-900">{task.progress}%</span>
                  </div>
                  <Progress value={task.progress} />
                  <p className="text-xs text-gray-500">
                    Lưu ý: 100% chỉ là nhân viên gửi hoàn thành, task chỉ kết thúc khi Manager duyệt.
                  </p>
                </div>
              </div>

              <div className="flex w-full flex-col gap-2 xl:w-56">
                {task.status === 'submitted' ? (
                  <>
                    <Button onClick={() => handleReview(task.id, 'approved')}>Duyệt hoàn thành</Button>
                    <Button variant="outline" onClick={() => handleReview(task.id, 'revision_required')}>
                      Yêu cầu sửa
                    </Button>
                    <Button variant="destructive" onClick={() => handleReview(task.id, 'rejected')}>
                      Từ chối
                    </Button>
                  </>
                ) : (
                  <div className="rounded-md border border-gray-100 bg-gray-50 p-3 text-sm text-gray-600">
                    {task.qualityScore ? `Điểm chất lượng: ${task.qualityScore}/100` : 'Chưa đến bước review'}
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: number | string; icon: ReactNode }) {
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

function InfoLine({ icon, label, subLabel }: { icon: ReactNode; label: string; subLabel: string }) {
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
