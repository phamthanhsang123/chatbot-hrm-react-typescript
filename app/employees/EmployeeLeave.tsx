'use client';

import { useState } from 'react';
import { Calendar, Plus, Eye, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';

interface LeaveRequest {
  id: number;
  type: string;
  from: string;
  to: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedDate: string;
  reviewNote?: string;
}

export function EmployeeLeave() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([
    { id: 1, type: 'Nghỉ phép năm', from: '20/01/2026', to: '22/01/2026', days: 3, reason: 'Về quê', status: 'approved', appliedDate: '15/01/2026', reviewNote: 'Đã duyệt' },
    { id: 2, type: 'Nghỉ ốm', from: '10/01/2026', to: '10/01/2026', days: 1, reason: 'Ốm', status: 'approved', appliedDate: '10/01/2026', reviewNote: 'Đã duyệt' },
    { id: 3, type: 'Nghỉ phép năm', from: '25/01/2026', to: '26/01/2026', days: 2, reason: 'Du lịch', status: 'pending', appliedDate: '16/01/2026' },
    { id: 4, type: 'Nghỉ việc riêng', from: '05/01/2026', to: '05/01/2026', days: 1, reason: 'Làm giấy tờ', status: 'rejected', appliedDate: '03/01/2026', reviewNote: 'Không đủ điều kiện' },
  ]);

  const [newLeave, setNewLeave] = useState({
    type: 'Nghỉ phép năm',
    from: '',
    to: '',
    reason: '',
  });

  const leaveBalance = {
    annual: { used: 5, total: 12 },
    sick: { used: 2, total: 12 },
    unpaid: { used: 0, total: 999 },
  };

  const calculateDays = (from: string, to: string) => {
    const start = new Date(from);
    const end = new Date(to);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diff + 1;
  };

  const handleCreateLeave = () => {
    if (!newLeave.from || !newLeave.to || !newLeave.reason) {
      alert('⚠️ Vui lòng điền đầy đủ thông tin!');
      return;
    }

    const days = calculateDays(newLeave.from, newLeave.to);
    
    const request: LeaveRequest = {
      id: Math.max(...leaveRequests.map(r => r.id)) + 1,
      type: newLeave.type,
      from: new Date(newLeave.from).toLocaleDateString('vi-VN'),
      to: new Date(newLeave.to).toLocaleDateString('vi-VN'),
      days,
      reason: newLeave.reason,
      status: 'pending',
      appliedDate: new Date().toLocaleDateString('vi-VN'),
    };

    setLeaveRequests([request, ...leaveRequests]);

    alert(
      `✅ Đã gửi đơn nghỉ phép thành công!\n\n` +
      `Loại: ${newLeave.type}\n` +
      `Từ: ${request.from}\n` +
      `Đến: ${request.to}\n` +
      `Số ngày: ${days}\n` +
      `Lý do: ${newLeave.reason}\n\n` +
      `Đơn của bạn đang chờ phê duyệt.`
    );

    setShowCreateDialog(false);
    setNewLeave({ type: 'Nghỉ phép năm', from: '', to: '', reason: '' });
  };

  const handleViewDetail = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setShowDetailDialog(true);
  };

  const pendingCount = leaveRequests.filter(r => r.status === 'pending').length;
  const approvedCount = leaveRequests.filter(r => r.status === 'approved').length;
  const rejectedCount = leaveRequests.filter(r => r.status === 'rejected').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Nghỉ phép</h1>
          <p className="text-gray-500 mt-1">Quản lý đơn nghỉ phép của bạn</p>
        </div>
        <Button
          className="gap-2 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus className="size-4" />
          Tạo đơn nghỉ phép
        </Button>
      </div>

      {/* Leave Balance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center gap-4">
            <div className="size-12 shrink-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-md">
              <Calendar className="size-6" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-blue-700 font-medium">Nghỉ phép năm</p>
              <p className="text-3xl font-bold text-blue-900 mt-1">
                {leaveBalance.annual.total - leaveBalance.annual.used}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Đã dùng: {leaveBalance.annual.used}/{leaveBalance.annual.total}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center gap-4">
            <div className="size-12 shrink-0 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center text-white shadow-md">
              <Calendar className="size-6" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-green-700 font-medium">Nghỉ ốm</p>
              <p className="text-3xl font-bold text-green-900 mt-1">
                {leaveBalance.sick.total - leaveBalance.sick.used}
              </p>
              <p className="text-xs text-green-600 mt-1">
                Đã dùng: {leaveBalance.sick.used}/{leaveBalance.sick.total}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <div className="flex items-center gap-4">
            <div className="size-12 shrink-0 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-white shadow-md">
              <Calendar className="size-6" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-orange-700 font-medium">Nghỉ không lương</p>
              <p className="text-3xl font-bold text-orange-900 mt-1">∞</p>
              <p className="text-xs text-orange-600 mt-1">
                Đã dùng: {leaveBalance.unpaid.used}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <p className="text-sm text-gray-600">Chờ duyệt</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">{pendingCount}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-gray-600">Đã duyệt</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{approvedCount}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-gray-600">Từ chối</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{rejectedCount}</p>
        </Card>
      </div>

      {/* Leave Requests Table */}
      <Card>
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Đơn nghỉ phép của tôi</h2>
        </div>
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
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Ngày gửi</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {leaveRequests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-gray-900">{request.type}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{request.from}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{request.to}</td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-blue-600">{request.days} ngày</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-700 line-clamp-2">{request.reason}</span>
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      variant={
                        request.status === 'approved' ? 'default' :
                        request.status === 'pending' ? 'secondary' :
                        'destructive'
                      }
                      className={
                        request.status === 'approved' ? 'bg-green-600' :
                        request.status === 'pending' ? 'bg-orange-600' :
                        'bg-red-600'
                      }
                    >
                      {request.status === 'approved' ? '✓ Đã duyệt' :
                       request.status === 'pending' ? '⏳ Chờ duyệt' :
                       '✗ Từ chối'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{request.appliedDate}</td>
                  <td className="px-6 py-4 text-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewDetail(request)}
                    >
                      <Eye className="size-4 mr-1" />
                      Xem
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
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
                value={newLeave.type}
                onChange={(e) => setNewLeave({ ...newLeave, type: e.target.value })}
              >
                <option>Nghỉ phép năm</option>
                <option>Nghỉ ốm</option>
                <option>Nghỉ không lương</option>
                <option>Nghỉ thai sản</option>
                <option>Nghỉ việc riêng</option>
                <option>Nghỉ hiếu/hỷ</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Từ ngày</Label>
                <Input
                  type="date"
                  value={newLeave.from}
                  onChange={(e) => setNewLeave({ ...newLeave, from: e.target.value })}
                />
              </div>
              <div>
                <Label>Đến ngày</Label>
                <Input
                  type="date"
                  value={newLeave.to}
                  onChange={(e) => setNewLeave({ ...newLeave, to: e.target.value })}
                />
              </div>
            </div>

            {newLeave.from && newLeave.to && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-700">
                  Số ngày nghỉ: <strong>{calculateDays(newLeave.from, newLeave.to)} ngày</strong>
                </p>
              </div>
            )}

            <div>
              <Label>Lý do nghỉ phép</Label>
              <Textarea
                value={newLeave.reason}
                onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
                placeholder="Nhập lý do nghỉ phép..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Hủy
            </Button>
            <Button
              className="bg-gradient-to-r from-green-600 to-teal-600"
              onClick={handleCreateLeave}
            >
              Gửi đơn
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Chi tiết đơn nghỉ phép</DialogTitle>
            <DialogDescription>Thông tin chi tiết về đơn nghỉ phép</DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Trạng thái</span>
                  <Badge
                    variant={
                      selectedRequest.status === 'approved' ? 'default' :
                      selectedRequest.status === 'pending' ? 'secondary' :
                      'destructive'
                    }
                    className={
                      selectedRequest.status === 'approved' ? 'bg-green-600' :
                      selectedRequest.status === 'pending' ? 'bg-orange-600' :
                      'bg-red-600'
                    }
                  >
                    {selectedRequest.status === 'approved' ? '✓ Đã duyệt' :
                     selectedRequest.status === 'pending' ? '⏳ Chờ duyệt' :
                     '✗ Từ chối'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Loại nghỉ phép</p>
                    <p className="font-medium">{selectedRequest.type}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Số ngày</p>
                    <p className="font-medium text-blue-600">{selectedRequest.days} ngày</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Từ ngày</p>
                    <p className="font-medium">{selectedRequest.from}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Đến ngày</p>
                    <p className="font-medium">{selectedRequest.to}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-600">Ngày gửi đơn</p>
                    <p className="font-medium">{selectedRequest.appliedDate}</p>
                  </div>
                </div>

                <div className="pt-3 border-t">
                  <p className="text-gray-600 text-sm mb-1">Lý do</p>
                  <p className="text-sm">{selectedRequest.reason}</p>
                </div>

                {selectedRequest.reviewNote && (
                  <div className="pt-3 border-t">
                    <p className="text-gray-600 text-sm mb-1">Ghi chú phê duyệt</p>
                    <p className="text-sm">{selectedRequest.reviewNote}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              Đóng
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
