'use client';
import { TrendingUp, Users, Wallet, Calendar, ArrowUp, ArrowDown } from 'lucide-react';
import { Card } from './ui/card';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

export function Dashboard() {
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [showApproveLeave, setShowApproveLeave] = useState(false);
  const [showExportReport, setShowExportReport] = useState(false);
  const [showCalculateSalary, setShowCalculateSalary] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Tổng quan hệ thống HRM</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-blue-100 text-sm">Tổng nhân viên</p>
              <p className="text-3xl font-bold mt-2">125</p>
              <div className="flex items-center gap-1 mt-2 text-sm">
                <ArrowUp className="size-4" />
                <span>+12% so với tháng trước</span>
              </div>
            </div>
            <div className="size-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Users className="size-6" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-green-100 text-sm">Tổng lương tháng này</p>
              <p className="text-3xl font-bold mt-2">2.1 tỷ</p>
              <div className="flex items-center gap-1 mt-2 text-sm">
                <ArrowUp className="size-4" />
                <span>+5% so với tháng trước</span>
              </div>
            </div>
            <div className="size-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Wallet className="size-6" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-orange-100 text-sm">Nghỉ phép hôm nay</p>
              <p className="text-3xl font-bold mt-2">7</p>
              <div className="flex items-center gap-1 mt-2 text-sm">
                <ArrowDown className="size-4" />
                <span>-3 so với hôm qua</span>
              </div>
            </div>
            <div className="size-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Calendar className="size-6" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-purple-100 text-sm">Hiệu suất trung bình</p>
              <p className="text-3xl font-bold mt-2">87%</p>
              <div className="flex items-center gap-1 mt-2 text-sm">
                <ArrowUp className="size-4" />
                <span>+2% so với tháng trước</span>
              </div>
            </div>
            <div className="size-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <TrendingUp className="size-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Nhân viên theo phòng ban</h3>
          <div className="space-y-3">
            {[
              { dept: 'IT Department', count: 45, color: 'bg-blue-500', percent: 36 },
              { dept: 'Sales', count: 32, color: 'bg-green-500', percent: 26 },
              { dept: 'Marketing', count: 18, color: 'bg-purple-500', percent: 14 },
              { dept: 'HR', count: 15, color: 'bg-orange-500', percent: 12 },
              { dept: 'Finance', count: 15, color: 'bg-pink-500', percent: 12 },
            ].map((item) => (
              <div key={item.dept}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{item.dept}</span>
                  <span className="text-sm text-gray-600">{item.count} người</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`${item.color} h-2 rounded-full transition-all duration-500`}
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Hoạt động gần đây</h3>
          <div className="space-y-4">
            {[
              { action: 'Nguyễn Văn A đã được thêm vào hệ thống', time: '5 phút trước', icon: '👤' },
              { action: 'Trần Thị B đã gửi yêu cầu nghỉ phép', time: '30 phút trước', icon: '📅' },
              { action: 'Lương tháng 1 đã được duyệt', time: '2 giờ trước', icon: '💰' },
              { action: 'Báo cáo hiệu suất Q4 đã sẵn sàng', time: '5 giờ trước', icon: '📊' },
              { action: 'Phạm Văn C đã hoàn thành khóa đào tạo', time: '1 ngày trước', icon: '🎓' },
            ].map((item, index) => (
              <div key={index} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="size-10 bg-gray-100 rounded-lg flex items-center justify-center text-xl flex-shrink-0">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{item.action}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Thao tác nhanh</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => setShowAddEmployee(true)}
            className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl hover:scale-105 transition-transform shadow-lg"
          >
            <div className="text-3xl mb-2">👥</div>
            <p className="text-sm font-medium">Thêm nhân viên</p>
          </button>
          <button
            onClick={() => setShowApproveLeave(true)}
            className="p-4 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl hover:scale-105 transition-transform shadow-lg"
          >
            <div className="text-3xl mb-2">✅</div>
            <p className="text-sm font-medium">Duyệt nghỉ phép</p>
          </button>
          <button
            onClick={() => setShowExportReport(true)}
            className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl hover:scale-105 transition-transform shadow-lg"
          >
            <div className="text-3xl mb-2">📄</div>
            <p className="text-sm font-medium">Xuất báo cáo</p>
          </button>
          <button
            onClick={() => setShowCalculateSalary(true)}
            className="p-4 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl hover:scale-105 transition-transform shadow-lg"
          >
            <div className="text-3xl mb-2">💵</div>
            <p className="text-sm font-medium">Tính lương</p>
          </button>
        </div>
      </Card>

      {/* Add Employee Dialog */}
      <Dialog open={showAddEmployee} onOpenChange={setShowAddEmployee}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Thêm nhân viên mới</DialogTitle>
            <DialogDescription>
              Điền thông tin nhân viên mới vào form bên dưới
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Họ và tên</Label>
              <Input id="name" placeholder="Nguyễn Văn A" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="nguyenvana@company.com" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="department">Phòng ban</Label>
              <Input id="department" placeholder="IT Department" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="position">Vị trí</Label>
              <Input id="position" placeholder="Developer" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAddEmployee(false)}>
              Hủy
            </Button>
            <Button 
              className="bg-gradient-to-r from-blue-600 to-indigo-600"
              onClick={() => {
                alert('Đã thêm nhân viên thành công!');
                setShowAddEmployee(false);
              }}
            >
              Thêm nhân viên
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Approve Leave Dialog */}
      <Dialog open={showApproveLeave} onOpenChange={setShowApproveLeave}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Duyệt đơn nghỉ phép</DialogTitle>
            <DialogDescription>
              Danh sách đơn xin nghỉ phép chờ duyệt
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4 max-h-[400px] overflow-y-auto">
            {[
              { name: 'Nguyễn Văn A', dates: '10/01 - 12/01', reason: 'Du lịch gia đình' },
              { name: 'Trần Thị B', dates: '15/01 - 16/01', reason: 'Việc cá nhân' },
              { name: 'Lê Văn C', dates: '20/01 - 22/01', reason: 'Nghỉ ngơi' },
            ].map((leave, index) => (
              <div key={index} className="p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold">{leave.name}</p>
                    <p className="text-sm text-gray-600">{leave.dates}</p>
                    <p className="text-sm text-gray-500 mt-1">{leave.reason}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => alert(`Đã duyệt đơn của ${leave.name}`)}
                    >
                      Duyệt
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => alert(`Đã từ chối đơn của ${leave.name}`)}
                    >
                      Từ chối
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Export Report Dialog */}
      <Dialog open={showExportReport} onOpenChange={setShowExportReport}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Xuất báo cáo</DialogTitle>
            <DialogDescription>
              Chọn loại báo cáo bạn muốn xuất
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            {[
              { title: 'Báo cáo nhân sự', desc: 'Tổng quan nhân sự công ty', icon: '👥' },
              { title: 'Báo cáo lương', desc: 'Chi tiết lương thưởng', icon: '💰' },
              { title: 'Báo cáo nghỉ phép', desc: 'Thống kê nghỉ phép', icon: '📅' },
              { title: 'Báo cáo hiệu suất', desc: 'Đánh giá KPI', icon: '📊' },
            ].map((report, index) => (
              <button
                key={index}
                className="p-4 border rounded-lg hover:bg-gray-50 text-left transition-colors"
                onClick={() => {
                  alert(`Đang xuất ${report.title}...`);
                  setShowExportReport(false);
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{report.icon}</div>
                  <div>
                    <p className="font-semibold">{report.title}</p>
                    <p className="text-sm text-gray-600">{report.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Calculate Salary Dialog */}
      <Dialog open={showCalculateSalary} onOpenChange={setShowCalculateSalary}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Tính lương</DialogTitle>
            <DialogDescription>
              Chọn tháng để tính lương cho toàn bộ nhân viên
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="month">Tháng</Label>
              <Input id="month" type="month" defaultValue="2026-01" />
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-semibold text-blue-900 mb-2">Thông tin tính lương:</p>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Tổng nhân viên: 125 người</li>
                <li>• Tổng lương cơ bản: 1.85 tỷ đ</li>
                <li>• Tổng thưởng dự kiến: 320M đ</li>
                <li>• Tổng chi phí: 2.17 tỷ đ</li>
              </ul>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowCalculateSalary(false)}>
              Hủy
            </Button>
            <Button 
              className="bg-gradient-to-r from-orange-600 to-orange-700"
              onClick={() => {
                alert('Đang tính lương cho 125 nhân viên...');
                setShowCalculateSalary(false);
              }}
            >
              Tính lương
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}