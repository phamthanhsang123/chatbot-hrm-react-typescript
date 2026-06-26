'use client';

import { useMemo } from 'react';
import {
  AlertCircle,
  BriefcaseBusiness,
  Calendar,
  CheckCircle2,
  Clock,
  FileCheck2,
  UserCheck,
  Wallet,
} from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { getCurrentEmployeeId } from '@/services/tasks';
import { getEmployeePortalIdentity } from './hrmSync';

interface EmployeeDashboardProps {
  onNavigate?: (page: string) => void;
}

const employeeMeta = {
  position: 'Developer',
  manager: 'Kiên Quân',
  joinDate: '01/01/2023',
};

const taskOverview = {
  assigned: 4,
  active: 2,
  submitted: 1,
  approved: 1,
  overdue: 1,
  averageProgress: 66,
};

const stats = [
  { label: 'Giờ làm tháng này', value: '160h', detail: '/ 176h', icon: Clock, tone: 'text-blue-600 bg-blue-50' },
  { label: 'Ngày phép còn lại', value: '7', detail: '/ 12 ngày', icon: Calendar, tone: 'text-emerald-600 bg-emerald-50' },
  { label: 'Task đang xử lý', value: taskOverview.active.toString(), detail: `${taskOverview.submitted} chờ duyệt`, icon: BriefcaseBusiness, tone: 'text-indigo-600 bg-indigo-50' },
  { label: 'Lương gần nhất', value: '17tr', detail: 'đã thanh toán', icon: Wallet, tone: 'text-purple-600 bg-purple-50' },
];

const activities = [
  { title: 'Đã cập nhật tiến độ task FE/API lên 65%', time: '09:30 hôm nay', icon: BriefcaseBusiness, tone: 'text-indigo-600 bg-indigo-50' },
  { title: 'Task demo đã gửi sang trạng thái chờ Manager duyệt', time: '16:20 hôm qua', icon: FileCheck2, tone: 'text-amber-600 bg-amber-50' },
  { title: 'Đơn nghỉ phép 20/06 đã được HR duyệt', time: '2 ngày trước', icon: CheckCircle2, tone: 'text-emerald-600 bg-emerald-50' },
  { title: 'Cần cập nhật task quá hạn trước khi Manager review', time: '3 ngày trước', icon: AlertCircle, tone: 'text-rose-600 bg-rose-50' },
];

export function EmployeeDashboard({ onNavigate }: EmployeeDashboardProps) {
  const employeeIdentity = useMemo(() => getEmployeePortalIdentity(getCurrentEmployeeId()), []);
  const avatar = employeeIdentity.employeeName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="border-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-6 text-white shadow-lg">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-white/15 text-2xl font-bold shadow-inner backdrop-blur-sm">
                {avatar}
              </div>
              <div>
                <h1 className="text-2xl font-bold">Xin chào, {employeeIdentity.employeeName}</h1>
                <p className="mt-1 text-blue-100">
                  {employeeMeta.position} - {employeeIdentity.department} - Mã NV: {employeeIdentity.employeeId}
                </p>
                <p className="mt-1 text-sm text-blue-100">
                  Manager: {employeeMeta.manager} - Ngày vào làm: {employeeMeta.joinDate}
                </p>
              </div>
            </div>
            <Badge className="w-fit bg-white/15 text-white hover:bg-white/15">
              Hôm nay: {new Date().toLocaleDateString('vi-VN')}
            </Badge>
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Task trong kỳ</h2>
              <p className="text-sm text-gray-500">Đồng bộ với luồng Manager review</p>
            </div>
            <BriefcaseBusiness className="size-7 text-indigo-600" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tiến độ trung bình</span>
              <span className="font-semibold text-gray-900">{taskOverview.averageProgress}%</span>
            </div>
            <Progress value={taskOverview.averageProgress} />
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-md bg-blue-50 p-2 text-blue-700">
                <p className="font-bold">{taskOverview.active}</p>
                <p>Đang làm</p>
              </div>
              <div className="rounded-md bg-amber-50 p-2 text-amber-700">
                <p className="font-bold">{taskOverview.submitted}</p>
                <p>Chờ duyệt</p>
              </div>
              <div className="rounded-md bg-rose-50 p-2 text-rose-700">
                <p className="font-bold">{taskOverview.overdue}</p>
                <p>Quá hạn</p>
              </div>
            </div>
            <Button className="w-full" onClick={() => onNavigate?.('tasks')}>
              <BriefcaseBusiness className="mr-2 size-4" />
              Mở task của tôi
            </Button>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-5">
              <div className="flex items-center gap-4">
                <div className={`flex size-12 shrink-0 items-center justify-center rounded-lg ${stat.tone}`}>
                  <Icon className="size-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-gray-900">{stat.value}</span>
                    <span className="text-sm text-gray-500">{stat.detail}</span>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <div className="border-b border-gray-100 p-5">
            <h2 className="text-lg font-semibold text-gray-900">Hoạt động gần đây</h2>
            <p className="text-sm text-gray-500">Các sự kiện nhân viên đẩy lên cho Manager/HR xử lý</p>
          </div>
          <div className="divide-y divide-gray-100">
            {activities.map((activity) => {
              const Icon = activity.icon;
              return (
                <div key={activity.title} className="flex items-start gap-3 p-5">
                  <div className={`flex size-10 shrink-0 items-center justify-center rounded-md ${activity.tone}`}>
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900">{activity.title}</p>
                    <p className="mt-1 text-sm text-gray-500">{activity.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <UserCheck className="size-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-gray-900">Tác vụ nhanh</h2>
            </div>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start" onClick={() => onNavigate?.('attendance')}>
                <Clock className="mr-2 size-4" />
                Chấm công hôm nay
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => onNavigate?.('leave')}>
                <Calendar className="mr-2 size-4" />
                Tạo đơn nghỉ phép
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => onNavigate?.('salary')}>
                <Wallet className="mr-2 size-4" />
                Xem lương cá nhân
              </Button>
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <AlertCircle className="size-5 text-amber-600" />
              <h2 className="text-lg font-semibold text-gray-900">Nguyên tắc đồng bộ</h2>
            </div>
            <p className="text-sm leading-6 text-gray-600">
              Nhân viên chỉ cập nhật tiến độ và gửi hoàn thành. Kết quả task, điểm chất lượng và trạng thái cuối cùng
              do Manager review để Agentic AI tính năng lực.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
