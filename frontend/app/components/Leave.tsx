'use client';
import { BarChart3, Calendar, Clock, CheckCircle, XCircle, Plus, Eye } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import Swal from 'sweetalert2';
import { Card } from './ui/card';
import { MetricCard } from './MetricCard';
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
import {
  approveLeaveRequest,
  createLeaveRequest,
  fetchLeaveRequests,
  rejectLeaveRequest,
  type LeaveRequestApiItem,
} from '@/services/leave';
import { fetchEmployees, type EmployeeApiItem } from '@/services/employees';

type LeaveStatus = 'pending' | 'approved' | 'rejected';
type LeaveType = 'annual' | 'sick' | 'unpaid' | 'maternity' | 'marriage' | 'funeral';
type LeaveFilterStatus = 'all' | LeaveStatus;

const LEAVE_PAGE_SIZE = 10;

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getRelativeDateKey = (daysAgo: number) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return formatDateKey(date);
};

interface LeaveRequest {
  id: number;
  employeeId: string;
  name: string;
  department: string;
  type: LeaveType;
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  days: number;
  reason: string;
  status: LeaveStatus;
  appliedDate: string;
  reviewedDate?: string;
  reviewedBy?: string;
  reviewNote?: string;
}

function normalizeLeaveStatus(status: string): LeaveStatus {
  const value = status.trim().toLowerCase();
  if (value.includes('duyệt') && !value.includes('chờ')) return 'approved';
  if (value.includes('từ chối') || value.includes('rejected')) return 'rejected';
  return 'pending';
}

function normalizeLeaveType(type: string): LeaveType {
  const value = type.toLowerCase();
  if (value.includes('ốm') || value.includes('sick')) return 'sick';
  if (value.includes('không') || value.includes('unpaid')) return 'unpaid';
  if (value.includes('thai') || value.includes('maternity')) return 'maternity';
  if (value.includes('cưới') || value.includes('marriage')) return 'marriage';
  if (value.includes('tang') || value.includes('funeral')) return 'funeral';
  return 'annual';
}

function toDateInputValue(value: string) {
  return value ? value.slice(0, 10) : '';
}

function mapLeaveRequest(item: LeaveRequestApiItem): LeaveRequest {
  return {
    id: item.id,
    employeeId: `NV${String(item.employeeId).padStart(3, '0')}`,
    name: item.employeeName || `NV${item.employeeId}`,
    department: 'API',
    type: normalizeLeaveType(item.leaveType),
    from: toDateInputValue(item.startDate),
    to: toDateInputValue(item.endDate),
    days: Number(item.totalDays || 0),
    reason: item.reason || '',
    status: normalizeLeaveStatus(item.status),
    appliedDate: toDateInputValue(item.startDate),
  };
}

export function Leave() {
  const [filterStatus, setFilterStatus] = useState<LeaveFilterStatus>('pending');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLeaveDate, setSelectedLeaveDate] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [employees, setEmployees] = useState<EmployeeApiItem[]>([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  // Form state for create dialog
  const [newLeave, setNewLeave] = useState({
    employeeId: '',
    employeeName: '',
    type: 'annual' as LeaveType,
    from: '',
    to: '',
    reason: '',
  });

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([
    {
      id: 1,
      employeeId: 'NV001',
      name: 'Nguyễn Văn A',
      department: 'IT',
      type: 'annual',
      from: '2026-01-10',
      to: '2026-01-12',
      days: 3,
      status: 'pending',
      reason: 'Du lịch gia đình',
      appliedDate: '2026-01-05',
    },
    {
      id: 2,
      employeeId: 'NV002',
      name: 'Trần Thị B',
      department: 'HR',
      type: 'sick',
      from: '2026-01-08',
      to: '2026-01-09',
      days: 2,
      status: 'approved',
      reason: 'Ốm, cần nghỉ ngơi',
      appliedDate: '2026-01-07',
      reviewedDate: '2026-01-07',
      reviewedBy: 'HR Manager',
    },
    {
      id: 3,
      employeeId: 'NV003',
      name: 'Lê Văn C',
      department: 'IT',
      type: 'unpaid',
      from: '2026-01-15',
      to: '2026-01-20',
      days: 6,
      status: 'pending',
      reason: 'Việc gia đình cần xử lý',
      appliedDate: '2026-01-05',
    },
    {
      id: 4,
      employeeId: 'NV004',
      name: 'Phạm Thị D',
      department: 'Marketing',
      type: 'annual',
      from: '2026-01-05',
      to: '2026-01-07',
      days: 3,
      status: 'approved',
      reason: 'Nghỉ ngơi sau dự án',
      appliedDate: '2025-12-28',
      reviewedDate: '2026-01-02',
      reviewedBy: 'Department Head',
    },
    {
      id: 5,
      employeeId: 'NV005',
      name: 'Hoàng Văn E',
      department: 'Sales',
      type: 'sick',
      from: '2026-01-09',
      to: '2026-01-09',
      days: 1,
      status: 'rejected',
      reason: 'Khám bệnh',
      appliedDate: '2026-01-09',
      reviewedDate: '2026-01-09',
      reviewedBy: 'HR Manager',
      reviewNote: 'Không có giấy xác nhận từ bác sĩ',
    },
    {
      id: 6,
      employeeId: 'NV006',
      name: 'Vũ Thị F',
      department: 'Finance',
      type: 'marriage',
      from: '2026-01-20',
      to: '2026-01-22',
      days: 3,
      status: 'pending',
      reason: 'Đám cưới',
      appliedDate: '2026-01-10',
    },
    {
      id: 7,
      employeeId: 'NV011',
      name: 'Nguyễn Minh Anh',
      department: 'HR',
      type: 'annual',
      from: getRelativeDateKey(0),
      to: getRelativeDateKey(0),
      days: 1,
      status: 'approved',
      reason: 'Nghỉ phép hôm nay đã được duyệt',
      appliedDate: getRelativeDateKey(2),
      reviewedDate: getRelativeDateKey(1),
      reviewedBy: 'HR Manager',
    },
    {
      id: 8,
      employeeId: 'NV007',
      name: 'Nguyễn Thu Hà',
      department: 'Marketing',
      type: 'annual',
      from: getRelativeDateKey(1),
      to: getRelativeDateKey(1),
      days: 1,
      status: 'approved',
      reason: 'Nghỉ phép cá nhân đã được duyệt',
      appliedDate: getRelativeDateKey(4),
      reviewedDate: getRelativeDateKey(3),
      reviewedBy: 'HR Manager',
    },
    {
      id: 9,
      employeeId: 'NV008',
      name: 'Trần Văn Bình',
      department: 'Sales',
      type: 'sick',
      from: getRelativeDateKey(2),
      to: getRelativeDateKey(2),
      days: 1,
      status: 'approved',
      reason: 'Nghỉ ốm có xác nhận',
      appliedDate: getRelativeDateKey(3),
      reviewedDate: getRelativeDateKey(2),
      reviewedBy: 'HR Manager',
    },
    {
      id: 10,
      employeeId: 'NV009',
      name: 'Đỗ Minh Quân',
      department: 'IT',
      type: 'annual',
      from: getRelativeDateKey(3),
      to: getRelativeDateKey(1),
      days: 3,
      status: 'approved',
      reason: 'Nghỉ phép theo kế hoạch gia đình',
      appliedDate: getRelativeDateKey(7),
      reviewedDate: getRelativeDateKey(6),
      reviewedBy: 'HR Manager',
    },
    {
      id: 11,
      employeeId: 'NV010',
      name: 'Lê Mỹ Linh',
      department: 'Finance',
      type: 'unpaid',
      from: getRelativeDateKey(2),
      to: getRelativeDateKey(1),
      days: 2,
      status: 'pending',
      reason: 'Xin nghỉ giải quyết việc cá nhân',
      appliedDate: getRelativeDateKey(2),
    },
  ]);

  const filteredData = useMemo(() => {
    return leaveRequests.filter((request) => {
      const matchesStatus = filterStatus === 'all' || request.status === filterStatus;
      const matchesDate = !selectedLeaveDate || (request.from <= selectedLeaveDate && request.to >= selectedLeaveDate);
      return matchesStatus && matchesDate;
    });
  }, [leaveRequests, filterStatus, selectedLeaveDate]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / LEAVE_PAGE_SIZE));
  const startIndex = (currentPage - 1) * LEAVE_PAGE_SIZE;
  const endIndex = startIndex + LEAVE_PAGE_SIZE;
  const paginatedData = useMemo(
    () => filteredData.slice(startIndex, endIndex),
    [filteredData, startIndex, endIndex]
  );

  const stats = useMemo(() => {
    const total = leaveRequests.length;
    const pending = leaveRequests.filter((x) => x.status === 'pending').length;
    const approved = leaveRequests.filter((x) => x.status === 'approved').length;
    const rejected = leaveRequests.filter((x) => x.status === 'rejected').length;
    
    // Count people on leave today
    const today = new Date().toISOString().slice(0, 10);
    const onLeaveToday = leaveRequests.filter((x) => {
      return x.status === 'approved' && x.from <= today && x.to >= today;
    }).length;

    return { total, pending, approved, rejected, onLeaveToday };
  }, [leaveRequests]);

  const loadLeaveData = async () => {
    setApiLoading(true);
    setApiError('');

    try {
      const [requests, employeeList] = await Promise.all([
        fetchLeaveRequests(),
        fetchEmployees(),
      ]);

      setLeaveRequests(requests.map(mapLeaveRequest));
      setEmployees(employeeList.filter((employee) => employee.status !== 'Đã nghỉ việc'));
    } catch (error) {
      console.error('Load leave API failed:', error);
      setApiError('Không tải được dữ liệu nghỉ phép từ Render API. Giao diện đang giữ dữ liệu hiện có.');
    } finally {
      setApiLoading(false);
    }
  };

  useEffect(() => {
    void loadLeaveData();
  }, []);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const getLeaveTypeLabel = (type: LeaveType) => {
    const types = {
      annual: 'Nghỉ phép năm',
      sick: 'Nghỉ ốm',
      unpaid: 'Nghỉ không lương',
      maternity: 'Nghỉ thai sản',
      marriage: 'Nghỉ cưới',
      funeral: 'Nghỉ tang',
    };
    return types[type];
  };

  const getStatusBadge = (status: LeaveStatus) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-orange-100 text-orange-700">⏳ Chờ duyệt</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-700">✅ Đã duyệt</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700">❌ Từ chối</Badge>;
      default:
        return <Badge>-</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN');
  };

  const handleFilterStatusChange = (status: LeaveFilterStatus) => {
    setFilterStatus(status);
    setCurrentPage(1);
  };

  const handleViewDetail = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setShowDetailDialog(true);
  };

  const handleApprove = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setShowApproveDialog(true);
  };

  const handleReject = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setRejectNote('');
    setShowRejectDialog(true);
  };

  const calculateLeaveDays = (fromDate: string, toDate: string) => {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    return Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleConfirmApprove = async () => {
    if (!selectedRequest) return;

    try {
      await approveLeaveRequest(selectedRequest.id);
      await loadLeaveData();
      await Swal.fire({
        icon: 'success',
        title: 'Đã duyệt',
        text: `Đã duyệt đơn nghỉ phép cho ${selectedRequest.name}.`,
        confirmButtonText: 'Đóng',
      });
    } catch (error) {
      console.error('Approve leave API failed:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Không duyệt được đơn',
        text: 'Kiểm tra API hoặc trạng thái đơn nghỉ phép.',
        confirmButtonText: 'Đóng',
      });
    } finally {
      setShowApproveDialog(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!selectedRequest) return;

    if (!rejectNote.trim()) {
      await Swal.fire({
        icon: 'warning',
        title: 'Thiếu lý do',
        text: 'Vui lòng nhập lý do từ chối.',
        confirmButtonText: 'Đóng',
      });
      return;
    }

    try {
      await rejectLeaveRequest(selectedRequest.id);
      await loadLeaveData();
      await Swal.fire({
        icon: 'success',
        title: 'Đã từ chối',
        text: `Đã từ chối đơn nghỉ phép của ${selectedRequest.name}.`,
        confirmButtonText: 'Đóng',
      });
    } catch (error) {
      console.error('Reject leave API failed:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Không từ chối được đơn',
        text: 'Kiểm tra API hoặc trạng thái đơn nghỉ phép.',
        confirmButtonText: 'Đóng',
      });
    } finally {
      setShowRejectDialog(false);
    }
  };

  const handleCreateLeave = async () => {
    if (!newLeave.employeeId || !newLeave.from || !newLeave.to || !newLeave.reason) {
      await Swal.fire({
        icon: 'warning',
        title: 'Thiếu thông tin',
        text: 'Vui lòng điền đầy đủ thông tin đơn nghỉ phép.',
        confirmButtonText: 'Đóng',
      });
      return;
    }

    const selectedEmployee = employees.find((employee) => String(employee.id) === newLeave.employeeId);
    const typeIdMap: Record<LeaveType, number> = {
      annual: 1,
      sick: 2,
      unpaid: 3,
      maternity: 4,
      marriage: 5,
      funeral: 6,
    };

    try {
      await createLeaveRequest({
        employeeId: Number(newLeave.employeeId),
        leaveTypeId: typeIdMap[newLeave.type],
        startDate: newLeave.from,
        endDate: newLeave.to,
        reason: newLeave.reason,
      });
      await loadLeaveData();
      await Swal.fire({
        icon: 'success',
        title: 'Đã tạo đơn',
        text: `Đã tạo đơn nghỉ phép cho ${selectedEmployee?.fullName || 'nhân viên'}.`,
        confirmButtonText: 'Đóng',
      });
      setShowCreateDialog(false);
      setNewLeave({
        employeeId: '',
        employeeName: '',
        type: 'annual',
        from: '',
        to: '',
        reason: '',
      });
    } catch (error) {
      console.error('Create leave API failed:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Không tạo được đơn',
        text: 'Kiểm tra dữ liệu hoặc kết nối API.',
        confirmButtonText: 'Đóng',
      });
    }
  };

  const handleViewStats = () => {
    Swal.fire({
      title: 'Thống kê nghỉ phép tháng này',
      icon: 'info',
      html: `
        <div style="display:grid;gap:10px;text-align:left">
          <div style="display:flex;justify-content:space-between;align-items:center;border:1px solid #e5e7eb;border-radius:10px;padding:10px 12px">
            <span style="color:#475569">Đơn đã duyệt</span>
            <b style="color:#16a34a">${stats.approved} đơn</b>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;border:1px solid #e5e7eb;border-radius:10px;padding:10px 12px">
            <span style="color:#475569">Đang nghỉ hôm nay</span>
            <b style="color:#ea580c">${stats.onLeaveToday} người</b>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;border:1px solid #e5e7eb;border-radius:10px;padding:10px 12px">
            <span style="color:#475569">Chờ duyệt</span>
            <b style="color:#2563eb">${stats.pending} đơn</b>
          </div>
        </div>
      `,
      confirmButtonText: 'Đóng',
      confirmButtonColor: '#2563eb',
    });
  };

  return (
    <div className="space-y-5 pb-24 text-[13px]">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quản lý nghỉ phép</h1>
          <p className="text-gray-500 mt-1">Theo dõi và duyệt đơn xin nghỉ phép</p>
          <p className="mt-1 text-xs text-blue-600">{apiLoading ? 'Đang tải dữ liệu từ Render API...' : 'Dữ liệu nghỉ phép được đồng bộ từ Render API'}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleViewStats}>
            <BarChart3 className="size-4 mr-2" />
            Thống kê
          </Button>
          <Button
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="size-4 mr-2" />
            Tạo đơn nghỉ phép
          </Button>
        </div>
      </div>

      {apiError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {apiError}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Chờ duyệt" value={stats.pending} description="Đơn xin nghỉ" icon={<Clock className="size-5" />} tone="blue" />
        <MetricCard title="Đã duyệt" value={stats.approved} description="Tổng cộng" icon={<CheckCircle className="size-5" />} tone="emerald" />
        <MetricCard title="Đang nghỉ hôm nay" value={stats.onLeaveToday} description="Nhân viên" icon={<Calendar className="size-5" />} tone="orange" />
        <MetricCard title="Từ chối" value={stats.rejected} description="Tổng cộng" icon={<XCircle className="size-5" />} tone="red" />
      </div>

      <div className="hidden grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-blue-100 text-sm">Chờ duyệt</p>
              <p className="text-3xl font-bold mt-2">{stats.pending}</p>
              <p className="text-sm text-blue-100 mt-1">Đơn xin nghỉ</p>
            </div>
            <div className="size-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Clock className="size-6" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-green-100 text-sm">Đã duyệt</p>
              <p className="text-3xl font-bold mt-2">{stats.approved}</p>
              <p className="text-sm text-green-100 mt-1">Tổng cộng</p>
            </div>
            <div className="size-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <CheckCircle className="size-6" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-orange-100 text-sm">Đang nghỉ hôm nay</p>
              <p className="text-3xl font-bold mt-2">{stats.onLeaveToday}</p>
              <p className="text-sm text-orange-100 mt-1">Nhân viên</p>
            </div>
            <div className="size-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Calendar className="size-6" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-red-500 to-red-600 text-white border-0 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-red-100 text-sm">Từ chối</p>
              <p className="text-3xl font-bold mt-2">{stats.rejected}</p>
              <p className="text-sm text-red-100 mt-1">Tổng cộng</p>
            </div>
            <div className="size-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <XCircle className="size-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filterStatus === 'all' ? 'default' : 'outline'}
              size="sm"
              className="flex-row-reverse gap-1"
              onClick={() => handleFilterStatusChange('all')}
            >
              <span>({stats.total})</span>
              Tất cả
            </Button>
            <Button
              variant={filterStatus === 'pending' ? 'default' : 'outline'}
              size="sm"
              className="flex-row-reverse gap-1"
              onClick={() => handleFilterStatusChange('pending')}
            >
              <span>({stats.pending})</span>
              Chờ duyệt
            </Button>
            <Button
              variant={filterStatus === 'approved' ? 'default' : 'outline'}
              size="sm"
              className="flex-row-reverse gap-1"
              onClick={() => handleFilterStatusChange('approved')}
            >
              <span>({stats.approved})</span>
              Đã duyệt
            </Button>
            <Button
              variant={filterStatus === 'rejected' ? 'default' : 'outline'}
              size="sm"
              className="flex-row-reverse gap-1"
              onClick={() => handleFilterStatusChange('rejected')}
            >
              <span>({stats.rejected})</span>
              Từ chối
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-9 items-center gap-2 rounded-md border border-gray-200 bg-white px-3">
              <Calendar className="size-4 text-blue-600" />
              <Input
                type="date"
                value={selectedLeaveDate}
                onChange={(event) => {
                  setSelectedLeaveDate(event.target.value);
                  setFilterStatus('all');
                  setCurrentPage(1);
                }}
                className="h-7 w-[145px] border-0 p-0 text-sm shadow-none focus-visible:ring-0"
              />
            </div>
            {selectedLeaveDate && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedLeaveDate('');
                  setCurrentPage(1);
                }}
              >
                Bỏ ngày
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedLeaveDate(formatDateKey(new Date()));
                setFilterStatus('all');
                setCurrentPage(1);
              }}
            >
              Hôm nay
            </Button>
            <div className="text-sm text-gray-600">
              Hiển thị: <span className="font-semibold text-gray-900">{filteredData.length}</span> /{' '}
              {leaveRequests.length} đơn
            </div>
          </div>
        </div>
      </Card>

      {/* Leave Requests Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">ID</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                  Nhân viên
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                  Loại nghỉ
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                  Từ ngày
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                  Đến ngày
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                  Số ngày
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Lý do</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                  Trạng thái
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedData.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2 text-sm font-medium text-gray-900">{request.id}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-3">
                      <div className="size-10 shrink-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {request.name.charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{request.name}</span>
                        <span className="text-xs text-gray-500">
                          {request.employeeId} • {request.department}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-700">{getLeaveTypeLabel(request.type)}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{formatDate(request.from)}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{formatDate(request.to)}</td>
                  <td className="px-4 py-2 text-sm font-medium text-gray-900">{request.days} ngày</td>
                  <td className="px-4 py-2 text-sm text-gray-700 max-w-[200px] truncate">
                    {request.reason}
                  </td>
                  <td className="px-4 py-2">{getStatusBadge(request.status)}</td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-2">
                      {request.status === 'pending' ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 hover:bg-green-50"
                            onClick={() => handleApprove(request)}
                          >
                            Duyệt
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => handleReject(request)}
                          >
                            Từ chối
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => handleViewDetail(request)}>
                          <Eye className="size-3 mr-1" />
                          Chi tiết
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredData.length === 0 && (
                <tr>
                  <td className="px-6 py-10 text-center text-sm text-gray-500" colSpan={9}>
                    Không có đơn nghỉ phép nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 z-40 flex flex-col gap-3 border border-gray-200 bg-white/95 px-5 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur md:flex-row md:items-center md:justify-between lg:left-64">
        <p className="text-sm text-gray-600">
          Hiển thị{' '}
          <span className="font-medium">
            {filteredData.length === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, filteredData.length)}
          </span>{' '}
          trong tổng số <span className="font-medium">{filteredData.length}</span> đơn
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
          >
            Trước
          </Button>
          <Button variant="outline" size="sm" disabled>
            {currentPage}/{totalPages}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
          >
            Sau
          </Button>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Tạo đơn nghỉ phép</DialogTitle>
            <DialogDescription>Điền thông tin đơn xin nghỉ phép mới</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nh?n vi?n</Label>
              <select
                className="h-10 w-full rounded-md border border-gray-200 px-3 text-sm"
                value={newLeave.employeeId}
                onChange={(e) => {
                  const employee = employees.find((item) => String(item.id) === e.target.value);
                  setNewLeave({
                    ...newLeave,
                    employeeId: e.target.value,
                    employeeName: employee?.fullName || '',
                  });
                }}
              >
                <option value="">Chọn nhân viên từ API</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName} - {employee.departmentName || 'Chưa phân phòng'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Loại nghỉ</Label>
              <select
                className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm"
                value={newLeave.type}
                onChange={(e) => setNewLeave({ ...newLeave, type: e.target.value as LeaveType })}
              >
                <option value="annual">Nghỉ phép năm</option>
                <option value="sick">Nghỉ ốm</option>
                <option value="unpaid">Nghỉ không lương</option>
                <option value="maternity">Nghỉ thai sản</option>
                <option value="marriage">Nghỉ cưới</option>
                <option value="funeral">Nghỉ tang</option>
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

            <div>
              <Label>Lý do</Label>
              <Textarea
                value={newLeave.reason}
                onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
                placeholder="Nhập lý do xin nghỉ phép"
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Hủy bỏ
            </Button>
            <Button
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              onClick={handleCreateLeave}
            >
              Tạo đơn
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-[620px]">
          <DialogHeader>
            <DialogTitle>Chi tiết đơn nghỉ phép</DialogTitle>
            <DialogDescription>Thông tin chi tiết đơn xin nghỉ phép</DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{selectedRequest.name}</div>
                    <div className="text-xs text-gray-500">
                      {selectedRequest.employeeId} • {selectedRequest.department}
                    </div>
                  </div>
                  {getStatusBadge(selectedRequest.status)}
                </div>

                <div className="space-y-3 text-sm">
                  <Row label="Loại nghỉ" value={getLeaveTypeLabel(selectedRequest.type)} />
                  <Row label="Từ ngày" value={formatDate(selectedRequest.from)} />
                  <Row label="Đến ngày" value={formatDate(selectedRequest.to)} />
                  <Row label="Số ngày" value={`${selectedRequest.days} ngày`} />
                  <Row label="Lý do" value={selectedRequest.reason} />
                  <Row label="Ngày nộp đơn" value={formatDate(selectedRequest.appliedDate)} />

                  {selectedRequest.reviewedDate && (
                    <>
                      <Row label="Ngày duyệt/từ chối" value={formatDate(selectedRequest.reviewedDate)} />
                      <Row label="Người duyệt" value={selectedRequest.reviewedBy || '-'} />
                    </>
                  )}

                  {selectedRequest.reviewNote && (
                    <Row label="Ghi chú" value={selectedRequest.reviewNote} valueClass="text-red-600" />
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              Đóng
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Duyệt đơn nghỉ phép</DialogTitle>
            <DialogDescription>Xác nhận duyệt đơn xin nghỉ phép</DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="rounded-lg border p-4 space-y-3 text-sm">
              <div className="font-semibold text-gray-900">{selectedRequest.name}</div>
              <Row label="Loại nghỉ" value={getLeaveTypeLabel(selectedRequest.type)} />
              <Row
                label="Thời gian"
                value={`${formatDate(selectedRequest.from)} - ${formatDate(selectedRequest.to)}`}
              />
              <Row label="Số ngày" value={`${selectedRequest.days} ngày`} />
              <Row label="Lý do" value={selectedRequest.reason} />
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Hủy bỏ
            </Button>
            <Button
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
              onClick={handleConfirmApprove}
            >
              Duyệt đơn
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Từ chối đơn nghỉ phép</DialogTitle>
            <DialogDescription>Nhập lý do từ chối đơn xin nghỉ phép</DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 space-y-3 text-sm">
                <div className="font-semibold text-gray-900">{selectedRequest.name}</div>
                <Row label="Loại nghỉ" value={getLeaveTypeLabel(selectedRequest.type)} />
                <Row
                  label="Thời gian"
                  value={`${formatDate(selectedRequest.from)} - ${formatDate(selectedRequest.to)}`}
                />
                <Row label="Số ngày" value={`${selectedRequest.days} ngày`} />
              </div>

              <div>
                <Label>Lý do từ chối *</Label>
                <Textarea
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder="Nhập lý do từ chối..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Hủy bỏ
            </Button>
            <Button
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
              onClick={handleConfirmReject}
            >
              Từ chối đơn
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="text-gray-600">{label}:</div>
      <div className={valueClass ?? 'font-medium text-gray-900 text-right'}>{value}</div>
    </div>
  );
}
