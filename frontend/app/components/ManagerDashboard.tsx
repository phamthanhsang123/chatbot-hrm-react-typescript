'use client';

import {
  AlertTriangle,
  BrainCircuit,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Search,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface ManagerDashboardProps {
  departmentName: string;
  onNavigate: (page: string) => void;
}

const teamMembers = [
  { name: 'Nguyễn Văn A', role: 'Developer', score: 89, status: 'Ổn định' },
  { name: 'Lê Văn C', role: 'Team Lead', score: 77, status: 'Cần theo dõi' },
  { name: 'Hoàng Minh Tuấn', role: 'DevOps Engineer', score: 84, status: 'Tốt' },
  { name: 'Vũ Thị F', role: 'QA Tester', score: 72, status: 'Cần hỗ trợ' },
];

const actionItems = [
  { title: 'Giao và theo dõi 4 task', page: 'manager-tasks', icon: ClipboardList, tone: 'text-indigo-600 bg-indigo-50' },
  { title: 'Duyệt 1 task hoàn thành', page: 'task-review', icon: ClipboardCheck, tone: 'text-amber-600 bg-amber-50' },
  { title: 'Duyệt 3 đơn nghỉ phép', page: 'leave', icon: CalendarCheck, tone: 'text-orange-600 bg-orange-50' },
  { title: 'Kiểm tra 2 đơn chấm công', page: 'attendance-approval', icon: CheckCircle2, tone: 'text-blue-600 bg-blue-50' },
  { title: 'Xem 2 khuyến nghị AI', page: 'competency', icon: BrainCircuit, tone: 'text-indigo-600 bg-indigo-50' },
  { title: 'Rà soát nhân viên team', page: 'employees', icon: Search, tone: 'text-emerald-600 bg-emerald-50' },
];

export function ManagerDashboard({ departmentName, onNavigate }: ManagerDashboardProps) {
  const averageScore = Math.round(teamMembers.reduce((sum, member) => sum + member.score, 0) / teamMembers.length);
  const watchCount = teamMembers.filter((member) => member.score < 80).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Users className="size-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard Manager</h1>
              <p className="text-sm text-gray-500">Theo dõi nhân sự, chấm công và năng lực phòng ban {departmentName}</p>
            </div>
          </div>
        </div>
        <Badge className="w-fit bg-blue-100 text-blue-700 hover:bg-blue-100">Phạm vi: {departmentName}</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Nhân viên trong team</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">{teamMembers.length}</p>
            </div>
            <Users className="size-8 text-blue-600" />
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Điểm năng lực TB</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">{averageScore}</p>
            </div>
            <TrendingUp className="size-8 text-emerald-600" />
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Cần theo dõi</p>
              <p className="mt-1 text-3xl font-bold text-orange-600">{watchCount}</p>
            </div>
            <AlertTriangle className="size-8 text-orange-600" />
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Việc chờ xử lý</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">7</p>
            </div>
            <ClipboardCheck className="size-8 text-indigo-600" />
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="overflow-hidden">
          <div className="border-b border-gray-100 p-5">
            <h2 className="text-lg font-semibold text-gray-900">Nhân viên phòng ban</h2>
            <p className="text-sm text-gray-500">Manager chỉ theo dõi nhân viên thuộc phạm vi quản lý</p>
          </div>
          <div className="divide-y divide-gray-100">
            {teamMembers.map((member) => (
              <div key={member.name} className="flex items-center justify-between gap-4 p-5">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">{member.name}</p>
                  <p className="text-sm text-gray-500">{member.role}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-28">
                    <div className="h-2 rounded-full bg-gray-100">
                      <div
                        className={`h-2 rounded-full ${member.score >= 85 ? 'bg-emerald-500' : member.score >= 80 ? 'bg-blue-500' : 'bg-orange-500'}`}
                        style={{ width: `${member.score}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-8 text-right font-semibold text-gray-900">{member.score}</span>
                  <Badge className={member.score < 80 ? 'bg-orange-100 text-orange-700 hover:bg-orange-100' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'}>
                    {member.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Việc cần xử lý</h2>
            <div className="space-y-3">
              {actionItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.title}
                    onClick={() => onNavigate(item.page)}
                    className="flex w-full items-center gap-3 rounded-md border border-gray-100 p-3 text-left hover:bg-gray-50"
                  >
                    <div className={`flex size-10 items-center justify-center rounded-md ${item.tone}`}>
                      <Icon className="size-5" />
                    </div>
                    <span className="text-sm font-medium text-gray-900">{item.title}</span>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-gray-900">Mục tiêu hôm nay</h2>
            </div>
            <p className="text-sm leading-6 text-gray-600">
              Ưu tiên duyệt task nhân viên đã gửi hoàn thành, kiểm tra đơn chờ xử lý và xem khuyến nghị AI cho nhân viên có điểm năng lực dưới 80.
            </p>
            <Button className="mt-4 w-full" onClick={() => onNavigate('competency')}>
              <BrainCircuit className="mr-2 size-4" />
              Xem khuyến nghị AI
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
