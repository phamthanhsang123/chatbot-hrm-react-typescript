'use client';

import { useState } from 'react';
import { Calendar, FileText, DollarSign, MessageSquare, User, LogOut, Bell, Settings } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';

interface EmployeePortalProps {
  onLogout: () => void;
}

export function EmployeePortal({ onLogout }: EmployeePortalProps) {
  const [currentTab, setCurrentTab] = useState('overview');
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showPayslipDialog, setShowPayslipDialog] = useState(false);

  const [leaveForm, setLeaveForm] = useState({
    type: 'Nghỉ phép năm',
    startDate: '',
    endDate: '',
    reason: '',
  });

  // Mock employee data
  const employeeData = {
    name: 'Nguyễn Văn B',
    employeeId: 'NV001',
    email: 'employee@company.com',
    department: 'IT',
    position: 'Developer',
    avatar: 'NVB',
    joinDate: '01/01/2023',
  };

  const leaveBalance = {
    annual: { used: 5, total: 12 },
    sick: { used: 2, total: 12 },
    unpaid: { used: 0, total: 999 },
  };

  const myLeaveRequests = [
    { id: 1, type: 'Nghỉ phép năm', from: '20/01/2026', to: '22/01/2026', days: 3, status: 'approved', reason: 'Về quê' },
    { id: 2, type: 'Nghỉ ốm', from: '10/01/2026', to: '10/01/2026', days: 1, status: 'approved', reason: 'Ốm' },
    { id: 3, type: 'Nghỉ phép năm', from: '25/01/2026', to: '26/01/2026', days: 2, status: 'pending', reason: 'Du lịch' },
  ];

  const salaryHistory = [
    { month: 'Tháng 12/2025', base: 15000000, bonus: 2000000, total: 17000000, status: 'Đã thanh toán' },
    { month: 'Tháng 11/2025', base: 15000000, bonus: 1500000, total: 16500000, status: 'Đã thanh toán' },
    { month: 'Tháng 10/2025', base: 15000000, bonus: 1000000, total: 16000000, status: 'Đã thanh toán' },
  ];

  const handleLeaveSubmit = () => {
    if (!leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason) {
      alert('⚠️ Vui lòng điền đầy đủ thông tin!');
      return;
    }

    alert(
      `✅ Đã gửi đơn nghỉ phép thành công!\n\n` +
      `Loại: ${leaveForm.type}\n` +
      `Từ: ${leaveForm.startDate}\n` +
      `Đến: ${leaveForm.endDate}\n` +
      `Lý do: ${leaveForm.reason}\n\n` +
      `Đơn của bạn đang chờ phê duyệt.`
    );

    setShowLeaveDialog(false);
    setLeaveForm({ type: 'Nghỉ phép năm', startDate: '', endDate: '', reason: '' });
  };

  const handleLogout = () => {
    if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
      alert('👋 Đã đăng xuất! Hẹn gặp lại!');
      onLogout();
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Welcome Card */}
      <Card className="p-6 bg-gradient-to-br from-blue-600 to-indigo-600 text-white border-0">
        <div className="flex items-center gap-4">
          <div className="size-16 shrink-0 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-2xl font-bold">
            {employeeData.avatar}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold">Xin chào, {employeeData.name}!</h2>
            <p className="text-blue-100 mt-1">
              {employeeData.position} • {employeeData.department}
            </p>
            <p className="text-sm text-blue-100 mt-1">
              Mã NV: {employeeData.employeeId} • Ngày vào: {employeeData.joinDate}
            </p>
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card 
          className="p-6 cursor-pointer hover:shadow-lg transition-shadow bg-gradient-to-br from-green-50 to-green-100 border-green-200"
          onClick={() => setShowLeaveDialog(true)}
        >
          <div className="flex items-center gap-4">
            <div className="size-12 shrink-0 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center text-white shadow-md">
              <Calendar className="size-6" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Đăng ký nghỉ phép</h3>
              <p className="text-sm text-gray-600 mt-1">Tạo đơn nghỉ phép mới</p>
            </div>
          </div>
        </Card>

        <Card 
          className="p-6 cursor-pointer hover:shadow-lg transition-shadow bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200"
          onClick={() => setShowPayslipDialog(true)}
        >
          <div className="flex items-center gap-4">
            <div className="size-12 shrink-0 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-md">
              <DollarSign className="size-6" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Phiếu lương</h3>
              <p className="text-sm text-gray-600 mt-1">Xem lịch sử lương</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Leave Balance */}
      <Card>
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold">Số ngày nghỉ phép</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">Nghỉ phép năm</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {leaveBalance.annual.total - leaveBalance.annual.used}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Đã dùng: {leaveBalance.annual.used}/{leaveBalance.annual.total}
              </p>
            </div>

            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600">Nghỉ ốm</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {leaveBalance.sick.total - leaveBalance.sick.used}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Đã dùng: {leaveBalance.sick.used}/{leaveBalance.sick.total}
              </p>
            </div>

            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-sm text-gray-600">Nghỉ không lương</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">∞</p>
              <p className="text-xs text-gray-500 mt-1">
                Đã dùng: {leaveBalance.unpaid.used}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Recent Leave Requests */}
      <Card>
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold">Đơn nghỉ phép gần đây</h3>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {myLeaveRequests.slice(0, 3).map((request) => (
              <div key={request.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{request.type}</p>
                    <Badge variant={
                      request.status === 'approved' ? 'default' : 
                      request.status === 'pending' ? 'secondary' : 
                      'destructive'
                    }>
                      {request.status === 'approved' ? 'Đã duyệt' : 
                       request.status === 'pending' ? 'Chờ duyệt' : 
                       'Từ chối'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {request.from} → {request.to} ({request.days} ngày)
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Lý do: {request.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );

  const renderLeaveRequests = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Đơn nghỉ phép của tôi</h2>
          <p className="text-gray-600 mt-1">Quản lý các đơn nghỉ phép</p>
        </div>
        <Button
          className="bg-gradient-to-r from-blue-600 to-indigo-600"
          onClick={() => setShowLeaveDialog(true)}
        >
          <Calendar className="size-4 mr-2" />
          Tạo đơn mới
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Loại</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Từ ngày</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Đến ngày</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Số ngày</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Lý do</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {myLeaveRequests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium">{request.type}</td>
                  <td className="px-6 py-4 text-sm">{request.from}</td>
                  <td className="px-6 py-4 text-sm">{request.to}</td>
                  <td className="px-6 py-4 text-sm">{request.days} ngày</td>
                  <td className="px-6 py-4 text-sm">{request.reason}</td>
                  <td className="px-6 py-4">
                    <Badge variant={
                      request.status === 'approved' ? 'default' : 
                      request.status === 'pending' ? 'secondary' : 
                      'destructive'
                    }>
                      {request.status === 'approved' ? 'Đã duyệt' : 
                       request.status === 'pending' ? 'Chờ duyệt' : 
                       'Từ chối'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  const renderSalary = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Lịch sử lương</h2>
        <p className="text-gray-600 mt-1">Xem phiếu lương các tháng</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {salaryHistory.map((salary, index) => (
          <Card key={index} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">{salary.month}</h3>
              <Badge variant="default">{salary.status}</Badge>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Lương cơ bản:</span>
                <span className="font-medium">{salary.base.toLocaleString('vi-VN')}đ</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Thưởng:</span>
                <span className="font-medium text-green-600">+{salary.bonus.toLocaleString('vi-VN')}đ</span>
              </div>
              <div className="border-t pt-2 flex justify-between">
                <span className="font-semibold">Tổng:</span>
                <span className="font-bold text-blue-600">{salary.total.toLocaleString('vi-VN')}đ</span>
              </div>
            </div>
            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={() => setShowPayslipDialog(true)}
            >
              <FileText className="size-4 mr-2" />
              Xem chi tiết
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg">
              HR
            </div>
            <div>
              <h1 className="font-bold text-lg bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Portal Nhân viên
              </h1>
              <p className="text-xs text-gray-500">{employeeData.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Bell className="size-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Settings className="size-5" />
            </Button>
            <Button variant="ghost" onClick={handleLogout}>
              <LogOut className="size-4 mr-2" />
              Đăng xuất
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 flex gap-1 overflow-x-auto border-t">
          <button
            onClick={() => setCurrentTab('overview')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              currentTab === 'overview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Tổng quan
          </button>
          <button
            onClick={() => setCurrentTab('leave')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              currentTab === 'leave'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Nghỉ phép
          </button>
          <button
            onClick={() => setCurrentTab('salary')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              currentTab === 'salary'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Lương
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {currentTab === 'overview' && renderOverview()}
        {currentTab === 'leave' && renderLeaveRequests()}
        {currentTab === 'salary' && renderSalary()}
      </main>

      {/* Leave Request Dialog */}
      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Tạo đơn nghỉ phép</DialogTitle>
            <DialogDescription>Điền thông tin đơn nghỉ phép của bạn</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Loại nghỉ phép</Label>
              <select
                className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm"
                value={leaveForm.type}
                onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })}
              >
                <option>Nghỉ phép năm</option>
                <option>Nghỉ ốm</option>
                <option>Nghỉ không lương</option>
                <option>Nghỉ thai sản</option>
                <option>Nghỉ việc riêng</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Từ ngày</Label>
                <Input
                  type="date"
                  value={leaveForm.startDate}
                  onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Đến ngày</Label>
                <Input
                  type="date"
                  value={leaveForm.endDate}
                  onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Lý do</Label>
              <Textarea
                value={leaveForm.reason}
                onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                placeholder="Nhập lý do nghỉ phép..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowLeaveDialog(false)}>
              Hủy
            </Button>
            <Button
              className="bg-gradient-to-r from-blue-600 to-indigo-600"
              onClick={handleLeaveSubmit}
            >
              Gửi đơn
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payslip Dialog */}
      <Dialog open={showPayslipDialog} onOpenChange={setShowPayslipDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Phiếu lương tháng 12/2025</DialogTitle>
            <DialogDescription>Chi tiết bảng lương</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Họ tên</p>
                <p className="font-medium">{employeeData.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Mã NV</p>
                <p className="font-medium">{employeeData.employeeId}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Chức vụ</p>
                <p className="font-medium">{employeeData.position}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Phòng ban</p>
                <p className="font-medium">{employeeData.department}</p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Lương cơ bản</span>
                <span className="font-medium">15,000,000đ</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Phụ cấp</span>
                <span className="font-medium">1,000,000đ</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Thưởng</span>
                <span className="font-medium text-green-600">+2,000,000đ</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">BHXH (8%)</span>
                <span className="font-medium text-red-600">-1,200,000đ</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Thuế TNCN</span>
                <span className="font-medium text-red-600">-800,000đ</span>
              </div>
              <div className="flex justify-between py-3 bg-blue-50 px-3 rounded-lg">
                <span className="font-bold text-gray-900">Thực lãnh</span>
                <span className="font-bold text-xl text-blue-600">17,000,000đ</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowPayslipDialog(false)}>
              Đóng
            </Button>
            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600">
              <FileText className="size-4 mr-2" />
              Tải PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
