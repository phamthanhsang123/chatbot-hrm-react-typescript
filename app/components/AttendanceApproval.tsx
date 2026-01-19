'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, Clock, Calendar, User, FileText, Eye, MessageSquare, ArrowRight } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Label } from './ui/label';

interface AttendanceRequest {
  id: number;
  employeeName: string;
  employeeId: string;
  department: string;
  date: string;
  checkIn: string;
  checkOut: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNote?: string;
  type: 'supplement' | 'adjustment';
  originalCheckIn?: string;
  originalCheckOut?: string;
}

export function AttendanceApproval() {
  const [selectedRequest, setSelectedRequest] = useState<AttendanceRequest | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [reviewNote, setReviewNote] = useState('');

  const [requests, setRequests] = useState<AttendanceRequest[]>([
    {
      id: 1,
      employeeName: 'Nguyễn Văn An',
      employeeId: 'NV001',
      department: 'IT',
      date: '12/01/2026',
      checkIn: '08:30',
      checkOut: '17:30',
      reason: 'Quên chấm công do họp khách hàng bên ngoài văn phòng. Cuộc họp kéo dài từ 9h đến 12h tại trụ sở công ty ABC.',
      status: 'pending',
      submittedAt: '13/01/2026 08:30',
      type: 'supplement',
    },
    {
      id: 2,
      employeeName: 'Trần Thị Bình',
      employeeId: 'NV002',
      department: 'HR',
      date: '11/01/2026',
      checkIn: '08:25',
      checkOut: '17:25',
      reason: 'Lỗi hệ thống chấm công, không quét được vân tay. Đã có xác nhận từ bộ phận IT về sự cố hệ thống.',
      status: 'pending',
      submittedAt: '12/01/2026 09:00',
      type: 'supplement',
    },
    {
      id: 3,
      employeeName: 'Lê Hoàng Cường',
      employeeId: 'NV003',
      department: 'Marketing',
      date: '10/01/2026',
      checkIn: '08:20',
      checkOut: '17:35',
      reason: 'Đi công tác tại chi nhánh Đà Nẵng, có xác nhận từ trưởng phòng Marketing.',
      status: 'pending',
      submittedAt: '11/01/2026 14:20',
      type: 'supplement',
    },
    {
      id: 4,
      employeeName: 'Phạm Minh Đức',
      employeeId: 'NV004',
      department: 'Sales',
      date: '09/01/2026',
      checkIn: '08:30',
      checkOut: '17:30',
      reason: 'Quên chấm công do gặp khách hàng VIP tại khách sạn Sheraton.',
      status: 'approved',
      submittedAt: '10/01/2026 08:00',
      reviewedAt: '10/01/2026 10:30',
      reviewedBy: 'HR Manager',
      reviewNote: 'Đã xác nhận với trưởng phòng Sales. Đơn được phê duyệt.',
      type: 'supplement',
    },
    {
      id: 5,
      employeeName: 'Võ Thị Như',
      employeeId: 'NV005',
      department: 'Finance',
      date: '08/01/2026',
      checkIn: '09:00',
      checkOut: '17:00',
      reason: 'Quên chấm công',
      status: 'rejected',
      submittedAt: '10/01/2026 15:00',
      reviewedAt: '11/01/2026 09:00',
      reviewedBy: 'HR Manager',
      reviewNote: 'Lý do không rõ ràng. Vui lòng cung cấp thêm thông tin chi tiết.',
      type: 'supplement',
    },
    {
      id: 6,
      employeeName: 'Hoàng Minh Tuấn',
      employeeId: 'NV006',
      department: 'IT',
      date: '14/01/2026',
      checkIn: '08:30',
      checkOut: '17:40',
      reason: 'Đã chấm công nhưng sai giờ ra, thực tế ra lúc 17:40 do làm thêm giờ để hoàn thành dự án gấp.',
      status: 'pending',
      submittedAt: '15/01/2026 08:00',
      type: 'adjustment',
      originalCheckIn: '08:20',
      originalCheckOut: '17:35',
    },
    {
      id: 7,
      employeeName: 'Nguyễn Thu Hà',
      employeeId: 'NV007',
      department: 'Marketing',
      date: '13/01/2026',
      checkIn: '08:15',
      checkOut: '17:30',
      reason: 'Chấm công vào sai giờ, thực tế đến sớm lúc 08:15 để chuẩn bị presentation.',
      status: 'pending',
      submittedAt: '14/01/2026 09:30',
      type: 'adjustment',
      originalCheckIn: '08:30',
      originalCheckOut: '17:30',
    },
    {
      id: 8,
      employeeName: 'Trần Văn Bình',
      employeeId: 'NV008',
      department: 'Sales',
      date: '09/01/2026',
      checkIn: '08:30',
      checkOut: '18:00',
      reason: 'Điều chỉnh giờ ra do làm thêm giờ xử lý khách hàng khẩn cấp.',
      status: 'approved',
      submittedAt: '10/01/2026 08:30',
      reviewedAt: '10/01/2026 14:00',
      reviewedBy: 'HR Manager',
      reviewNote: 'Đã xác nhận với quản lý trực tiếp. Approved.',
      type: 'adjustment',
      originalCheckIn: '08:30',
      originalCheckOut: '17:30',
    },
  ]);

  const supplementRequests = requests.filter(r => r.type === 'supplement');
  const adjustmentRequests = requests.filter(r => r.type === 'adjustment');

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
    supplement: supplementRequests.length,
    adjustment: adjustmentRequests.length,
  };

  const handleViewDetail = (request: AttendanceRequest) => {
    setSelectedRequest(request);
    setShowDetailDialog(true);
  };

  const handleOpenActionDialog = (request: AttendanceRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setActionType(action);
    setShowActionDialog(true);
    setReviewNote('');
  };

  const handleSubmitReview = () => {
    if (!selectedRequest) return;

    const updatedRequests = requests.map(req => {
      if (req.id === selectedRequest.id) {
        return {
          ...req,
          status: actionType === 'approve' ? 'approved' as const : 'rejected' as const,
          reviewedAt: new Date().toLocaleString('vi-VN'),
          reviewedBy: 'HR Manager',
          reviewNote: reviewNote || (actionType === 'approve' ? 'Đơn được phê duyệt' : 'Đơn bị từ chối'),
        };
      }
      return req;
    });

    setRequests(updatedRequests);
    setShowActionDialog(false);
    setShowDetailDialog(false);
    setReviewNote('');

    alert(
      actionType === 'approve'
        ? '✅ Đã phê duyệt đơn chấm công!'
        : '❌ Đã từ chối đơn chấm công!'
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Quản lý chấm công</h1>
        <p className="text-gray-500 mt-1">Xem xét và phê duyệt các đơn bổ sung và điều chỉnh chấm công</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="p-5 bg-gradient-to-br from-blue-50 to-white border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 mb-1">Tổng đơn</p>
              <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
            </div>
            <div className="size-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-md">
              <FileText className="size-6" />
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-yellow-50 to-white border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 mb-1">Chờ duyệt</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <div className="size-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center text-white shadow-md animate-pulse">
              <Clock className="size-6" />
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-green-50 to-white border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 mb-1">Đã duyệt</p>
              <p className="text-3xl font-bold text-green-600">{stats.approved}</p>
            </div>
            <div className="size-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center text-white shadow-md">
              <CheckCircle className="size-6" />
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-red-50 to-white border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 mb-1">Từ chối</p>
              <p className="text-3xl font-bold text-red-600">{stats.rejected}</p>
            </div>
            <div className="size-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center text-white shadow-md">
              <XCircle className="size-6" />
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-purple-50 to-white border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 mb-1">Bổ sung</p>
              <p className="text-3xl font-bold text-purple-600">{stats.supplement}</p>
            </div>
            <div className="size-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-md">
              <FileText className="size-6" />
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-indigo-50 to-white border-indigo-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 mb-1">Điều chỉnh</p>
              <p className="text-3xl font-bold text-indigo-600">{stats.adjustment}</p>
            </div>
            <div className="size-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md">
              <ArrowRight className="size-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs for Supplement and Adjustment Requests */}
      <Tabs defaultValue="supplement" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-100 p-1">
          <TabsTrigger value="supplement" className="data-[state=active]:bg-white">
            <FileText className="size-4 mr-2" />
            Đơn bổ sung ({supplementRequests.length})
          </TabsTrigger>
          <TabsTrigger value="adjustment" className="data-[state=active]:bg-white">
            <ArrowRight className="size-4 mr-2" />
            Đơn điều chỉnh ({adjustmentRequests.length})
          </TabsTrigger>
        </TabsList>

        {/* Supplement Requests Tab */}
        <TabsContent value="supplement" className="mt-6 space-y-6">
          {/* Pending Supplement Requests */}
          {supplementRequests.filter(r => r.status === 'pending').length > 0 && (
            <Card className="shadow-lg">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-yellow-50 to-orange-50">
                <div className="flex items-center gap-3">
                  <div className="size-10 bg-yellow-600 rounded-lg flex items-center justify-center text-white">
                    <Clock className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Đơn bổ sung chờ duyệt</h2>
                    <p className="text-sm text-gray-600">Nhân viên quên chấm công hoàn toàn</p>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Nhân viên</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Ngày</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Giờ vào/ra</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Lý do</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Gửi lúc</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {supplementRequests.filter(r => r.status === 'pending').map((request) => (
                      <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="size-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold">
                              {request.employeeName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{request.employeeName}</p>
                              <p className="text-xs text-gray-500">{request.employeeId} - {request.department}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="size-4 text-gray-400" />
                            <span className="font-medium text-gray-900">{request.date}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          <div className="flex flex-col gap-1">
                            <span>Vào: <strong>{request.checkIn}</strong></span>
                            <span>Ra: <strong>{request.checkOut}</strong></span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-700 max-w-xs truncate" title={request.reason}>
                            {request.reason}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{request.submittedAt}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewDetail(request)}
                            >
                              <Eye className="size-4" />
                            </Button>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleOpenActionDialog(request, 'approve')}
                            >
                              <CheckCircle className="size-4 mr-1" />
                              Duyệt
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleOpenActionDialog(request, 'reject')}
                            >
                              <XCircle className="size-4 mr-1" />
                              Từ chối
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Reviewed Supplement Requests */}
          {supplementRequests.filter(r => r.status !== 'pending').length > 0 && (
            <Card className="shadow-lg">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold">Lịch sử đơn bổ sung đã xử lý</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Nhân viên</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Ngày</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Giờ vào/ra</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Trạng thái</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Xử lý bởi</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {supplementRequests.filter(r => r.status !== 'pending').map((request) => (
                      <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="size-10 bg-gradient-to-br from-gray-500 to-gray-600 rounded-full flex items-center justify-center text-white font-semibold">
                              {request.employeeName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{request.employeeName}</p>
                              <p className="text-xs text-gray-500">{request.employeeId} - {request.department}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="size-4 text-gray-400" />
                            <span className="font-medium text-gray-900">{request.date}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          <div className="flex flex-col gap-1">
                            <span>Vào: <strong>{request.checkIn}</strong></span>
                            <span>Ra: <strong>{request.checkOut}</strong></span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            className={request.status === 'approved' ? 'bg-green-600' : 'bg-red-600'}
                          >
                            {request.status === 'approved' ? '✓ Đã duyệt' : '✗ Từ chối'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          <div className="flex flex-col gap-1">
                            <span>{request.reviewedBy}</span>
                            <span className="text-xs text-gray-500">{request.reviewedAt}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
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
          )}
        </TabsContent>

        {/* Adjustment Requests Tab */}
        <TabsContent value="adjustment" className="mt-6 space-y-6">
          {/* Pending Adjustment Requests */}
          {adjustmentRequests.filter(r => r.status === 'pending').length > 0 && (
            <Card className="shadow-lg">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
                <div className="flex items-center gap-3">
                  <div className="size-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                    <ArrowRight className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Đơn điều chỉnh chờ duyệt</h2>
                    <p className="text-sm text-gray-600">Nhân viên đã chấm công nhưng sai giờ</p>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Nhân viên</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Ngày</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Giờ cũ → Giờ mới</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Lý do</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Gửi lúc</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {adjustmentRequests.filter(r => r.status === 'pending').map((request) => (
                      <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="size-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                              {request.employeeName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{request.employeeName}</p>
                              <p className="text-xs text-gray-500">{request.employeeId} - {request.department}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="size-4 text-gray-400" />
                            <span className="font-medium text-gray-900">{request.date}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500">Vào:</span>
                              <span className="text-red-600 line-through">{request.originalCheckIn}</span>
                              <ArrowRight className="size-3 text-gray-400" />
                              <strong className="text-green-600">{request.checkIn}</strong>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500">Ra:</span>
                              <span className="text-red-600 line-through">{request.originalCheckOut}</span>
                              <ArrowRight className="size-3 text-gray-400" />
                              <strong className="text-green-600">{request.checkOut}</strong>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-700 max-w-xs truncate" title={request.reason}>
                            {request.reason}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{request.submittedAt}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewDetail(request)}
                            >
                              <Eye className="size-4" />
                            </Button>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleOpenActionDialog(request, 'approve')}
                            >
                              <CheckCircle className="size-4 mr-1" />
                              Duyệt
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleOpenActionDialog(request, 'reject')}
                            >
                              <XCircle className="size-4 mr-1" />
                              Từ chối
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Reviewed Adjustment Requests */}
          {adjustmentRequests.filter(r => r.status !== 'pending').length > 0 && (
            <Card className="shadow-lg">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold">Lịch sử đơn điều chỉnh đã xử lý</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Nhân viên</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Ngày</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Giờ cũ → Giờ mới</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Trạng thái</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Xử lý bởi</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {adjustmentRequests.filter(r => r.status !== 'pending').map((request) => (
                      <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="size-10 bg-gradient-to-br from-gray-500 to-gray-600 rounded-full flex items-center justify-center text-white font-semibold">
                              {request.employeeName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{request.employeeName}</p>
                              <p className="text-xs text-gray-500">{request.employeeId} - {request.department}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="size-4 text-gray-400" />
                            <span className="font-medium text-gray-900">{request.date}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500">Vào:</span>
                              <span className="text-red-600 line-through text-xs">{request.originalCheckIn}</span>
                              <ArrowRight className="size-3 text-gray-400" />
                              <strong className="text-green-600">{request.checkIn}</strong>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500">Ra:</span>
                              <span className="text-red-600 line-through text-xs">{request.originalCheckOut}</span>
                              <ArrowRight className="size-3 text-gray-400" />
                              <strong className="text-green-600">{request.checkOut}</strong>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            className={request.status === 'approved' ? 'bg-green-600' : 'bg-red-600'}
                          >
                            {request.status === 'approved' ? '✓ Đã duyệt' : '✗ Từ chối'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          <div className="flex flex-col gap-1">
                            <span>{request.reviewedBy}</span>
                            <span className="text-xs text-gray-500">{request.reviewedAt}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
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
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl">
              Chi tiết đơn {selectedRequest?.type === 'supplement' ? 'bổ sung' : 'điều chỉnh'} chấm công
            </DialogTitle>
            <DialogDescription>
              Thông tin đầy đủ về đơn yêu cầu
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-4">
              {/* Employee Info */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="size-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {selectedRequest.employeeName.charAt(0)}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{selectedRequest.employeeName}</h3>
                  <p className="text-sm text-gray-600">{selectedRequest.employeeId} - {selectedRequest.department}</p>
                  <Badge className={selectedRequest.type === 'supplement' ? 'bg-purple-600 mt-1' : 'bg-indigo-600 mt-1'}>
                    {selectedRequest.type === 'supplement' ? '📋 Đơn bổ sung' : '🔄 Đơn điều chỉnh'}
                  </Badge>
                </div>
              </div>

              {/* Request Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Ngày</Label>
                  <p className="font-medium">{selectedRequest.date}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Gửi lúc</Label>
                  <p className="font-medium">{selectedRequest.submittedAt}</p>
                </div>
                {selectedRequest.type === 'adjustment' && (
                  <>
                    <div className="space-y-1 col-span-2">
                      <Label className="text-xs text-gray-500">Giờ vào</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-red-600 line-through">{selectedRequest.originalCheckIn}</span>
                        <ArrowRight className="size-4 text-gray-400" />
                        <strong className="text-green-600">{selectedRequest.checkIn}</strong>
                      </div>
                    </div>
                    <div className="space-y-1 col-span-2">
                      <Label className="text-xs text-gray-500">Giờ ra</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-red-600 line-through">{selectedRequest.originalCheckOut}</span>
                        <ArrowRight className="size-4 text-gray-400" />
                        <strong className="text-green-600">{selectedRequest.checkOut}</strong>
                      </div>
                    </div>
                  </>
                )}
                {selectedRequest.type === 'supplement' && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Giờ vào</Label>
                      <p className="font-medium text-green-600">{selectedRequest.checkIn}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Giờ ra</Label>
                      <p className="font-medium text-orange-600">{selectedRequest.checkOut}</p>
                    </div>
                  </>
                )}
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-500">Lý do</Label>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-sm text-gray-700 leading-relaxed">{selectedRequest.reason}</p>
                </div>
              </div>

              {/* Review Info */}
              {selectedRequest.status !== 'pending' && (
                <div className="space-y-2 p-4 border-t pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-semibold">Kết quả xét duyệt</Label>
                    <Badge className={selectedRequest.status === 'approved' ? 'bg-green-600' : 'bg-red-600'}>
                      {selectedRequest.status === 'approved' ? 'Đã duyệt' : 'Từ chối'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Xử lý bởi:</span>
                      <p className="font-medium">{selectedRequest.reviewedBy}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Thời gian:</span>
                      <p className="font-medium">{selectedRequest.reviewedAt}</p>
                    </div>
                  </div>
                  {selectedRequest.reviewNote && (
                    <div className="mt-3">
                      <span className="text-gray-500 text-sm">Ghi chú:</span>
                      <p className="text-sm mt-1 p-3 bg-gray-50 rounded">{selectedRequest.reviewNote}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {selectedRequest?.status === 'pending' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDetailDialog(false);
                    handleOpenActionDialog(selectedRequest, 'reject');
                  }}
                  className="text-red-600 border-red-600 hover:bg-red-50"
                >
                  <XCircle className="size-4 mr-2" />
                  Từ chối
                </Button>
                <Button
                  onClick={() => {
                    setShowDetailDialog(false);
                    handleOpenActionDialog(selectedRequest, 'approve');
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="size-4 mr-2" />
                  Phê duyệt
                </Button>
              </>
            )}
            {selectedRequest?.status !== 'pending' && (
              <Button onClick={() => setShowDetailDialog(false)}>
                Đóng
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {actionType === 'approve' ? 'Phê duyệt đơn' : 'Từ chối đơn'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve' 
                ? 'Xác nhận phê duyệt đơn chấm công này'
                : 'Vui lòng nêu rõ lý do từ chối'}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <User className="size-4 text-gray-600" />
                  <span className="font-semibold">{selectedRequest.employeeName}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="size-4" />
                  <span>{selectedRequest.date} - {selectedRequest.checkIn} → {selectedRequest.checkOut}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reviewNote">
                  Ghi chú {actionType === 'reject' && <span className="text-red-500">*</span>}
                </Label>
                <textarea
                  id="reviewNote"
                  rows={4}
                  placeholder={
                    actionType === 'approve'
                      ? 'Thêm ghi chú (không bắt buộc)...'
                      : 'Vui lòng nêu rõ lý do từ chối...'
                  }
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActionDialog(false)}>
              Hủy
            </Button>
            <Button
              onClick={handleSubmitReview}
              className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
              disabled={actionType === 'reject' && !reviewNote.trim()}
            >
              {actionType === 'approve' ? (
                <>
                  <CheckCircle className="size-4 mr-2" />
                  Xác nhận duyệt
                </>
              ) : (
                <>
                  <XCircle className="size-4 mr-2" />
                  Xác nhận từ chối
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
