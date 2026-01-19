'use client';

import { Calendar, Clock, Wallet, TrendingUp, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

export function EmployeeDashboard() {
  const employeeData = {
    name: 'Nguyễn Văn B',
    employeeId: 'NV001',
    department: 'IT',
    position: 'Developer',
    joinDate: '01/01/2023',
    avatar: 'NVB',
  };

  const todayAttendance = {
    checkIn: '08:30',
    checkOut: null,
    status: 'working',
    workingHours: '4.5h',
  };

  const stats = [
    { label: 'Giờ làm tháng này', value: '160h', target: '176h', icon: Clock, color: 'blue' },
    { label: 'Ngày phép còn lại', value: '7', total: '12', icon: Calendar, color: 'green' },
    { label: 'Đơn chờ duyệt', value: '2', icon: AlertCircle, color: 'orange' },
    { label: 'Lương tháng trước', value: '17tr', icon: Wallet, color: 'purple' },
  ];

  const recentActivities = [
    { id: 1, type: 'attendance', title: 'Chấm công vào', time: '08:30', date: '18/01/2026', status: 'success' },
    { id: 2, type: 'leave', title: 'Đơn nghỉ phép được duyệt', time: '14:30', date: '17/01/2026', status: 'success' },
    { id: 3, type: 'salary', title: 'Phiếu lương tháng 12 đã sẵn sàng', time: '09:00', date: '15/01/2026', status: 'info' },
    { id: 4, type: 'leave', title: 'Đơn nghỉ phép đang chờ duyệt', time: '16:00', date: '14/01/2026', status: 'pending' },
  ];

  const upcomingLeave = [
    { from: '20/01/2026', to: '22/01/2026', type: 'Nghỉ phép năm', days: 3, status: 'approved' },
  ];

  const thisMonthSummary = {
    workingDays: 22,
    workedDays: 14,
    lateDays: 1,
    earlyLeaveDays: 0,
    absentDays: 0,
  };

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <Card className="p-6 bg-gradient-to-br from-green-600 to-teal-600 text-white border-0 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="size-16 shrink-0 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-2xl font-bold">
            {employeeData.avatar}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Xin chào, {employeeData.name}! 👋</h1>
            <p className="text-green-100 mt-1">
              {employeeData.position} • {employeeData.department} • Mã NV: {employeeData.employeeId}
            </p>
            <p className="text-sm text-green-100 mt-1">
              Ngày vào làm: {employeeData.joinDate} • Hôm nay: {new Date().toLocaleDateString('vi-VN')}
            </p>
          </div>
        </div>
      </Card>

      {/* Today Attendance */}
      <Card className="p-6 border-2 border-green-200 bg-gradient-to-br from-green-50 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="size-12 shrink-0 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center text-white shadow-md">
              <Clock className="size-6" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Chấm công hôm nay</h3>
              <div className="flex items-center gap-4 mt-1 text-sm">
                <span className="text-green-700">
                  ✓ Check-in: <strong>{todayAttendance.checkIn}</strong>
                </span>
                {todayAttendance.checkOut ? (
                  <span className="text-gray-700">
                    Check-out: <strong>{todayAttendance.checkOut}</strong>
                  </span>
                ) : (
                  <span className="text-orange-600">Chưa check-out</span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Giờ làm việc</p>
            <p className="text-2xl font-bold text-green-600">{todayAttendance.workingHours}</p>
          </div>
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const colorClasses = {
            blue: 'from-blue-500 to-blue-600 bg-blue-100 text-blue-600',
            green: 'from-green-500 to-green-600 bg-green-100 text-green-600',
            orange: 'from-orange-500 to-orange-600 bg-orange-100 text-orange-600',
            purple: 'from-purple-500 to-purple-600 bg-purple-100 text-purple-600',
          };
          const [gradientClass, iconClass] = colorClasses[stat.color as keyof typeof colorClasses].split(' bg-');
          
          return (
            <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-4">
                <div className={`size-12 shrink-0 bg-gradient-to-br ${gradientClass} rounded-xl flex items-center justify-center text-white shadow-md`}>
                  <Icon className="size-6" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600">{stat.label}</p>
                  <div className="flex items-baseline gap-1">
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    {stat.target && <p className="text-sm text-gray-500">/ {stat.target}</p>}
                    {stat.total && <p className="text-sm text-gray-500">/ {stat.total}</p>}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activities */}
        <Card className="lg:col-span-2">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Hoạt động gần đây</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className={`size-10 shrink-0 rounded-full flex items-center justify-center ${
                    activity.status === 'success' ? 'bg-green-100' :
                    activity.status === 'pending' ? 'bg-orange-100' :
                    'bg-blue-100'
                  }`}>
                    {activity.status === 'success' ? <CheckCircle className="size-5 text-green-600" /> :
                     activity.status === 'pending' ? <AlertCircle className="size-5 text-orange-600" /> :
                     <Clock className="size-5 text-blue-600" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{activity.title}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {activity.date} • {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Upcoming Leave */}
          <Card>
            <div className="p-6 border-b border-gray-200">
              <h3 className="font-semibold">Kỳ nghỉ sắp tới</h3>
            </div>
            <div className="p-6">
              {upcomingLeave.length > 0 ? (
                <div className="space-y-3">
                  {upcomingLeave.map((leave, index) => (
                    <div key={index} className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="default" className="bg-green-600">Đã duyệt</Badge>
                        <span className="text-sm font-medium text-green-700">{leave.days} ngày</span>
                      </div>
                      <p className="text-sm font-medium text-gray-900">{leave.type}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {leave.from} → {leave.to}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  Không có kỳ nghỉ sắp tới
                </p>
              )}
            </div>
          </Card>

          {/* Month Summary */}
          <Card>
            <div className="p-6 border-b border-gray-200">
              <h3 className="font-semibold">Tổng kết tháng này</h3>
            </div>
            <div className="p-6">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Ngày làm việc:</span>
                  <span className="font-medium">{thisMonthSummary.workedDays}/{thisMonthSummary.workingDays}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Đi muộn:</span>
                  <span className="font-medium text-orange-600">{thisMonthSummary.lateDays}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Về sớm:</span>
                  <span className="font-medium text-orange-600">{thisMonthSummary.earlyLeaveDays}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Vắng mặt:</span>
                  <span className="font-medium text-red-600">{thisMonthSummary.absentDays}</span>
                </div>
                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Đánh giá:</span>
                    <Badge variant="default" className="bg-green-600">Tốt</Badge>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
