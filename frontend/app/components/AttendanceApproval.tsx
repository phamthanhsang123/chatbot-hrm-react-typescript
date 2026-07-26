'use client';

import { useEffect, useState, useMemo } from 'react';
import { CheckCircle, XCircle, Clock, Calendar, User, FileText, Eye, MessageSquare, ArrowRight, Search, Filter, ListChecks, Target, AlertTriangle, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { MetricCard } from './MetricCard';
import { HRM_SYNC_KEYS, readSyncedRecords } from '../employees/hrmSync';
import { approveAttendanceRequest, rejectAttendanceRequest } from '@/services/attendance';

// Helper function to get day of week in Vietnamese
const getDayOfWeek = (dateStr: string): string => {
  const parts = dateStr.split('/');
  if (parts.length !== 3) return '';
  
  const day = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1;
  const year = parseInt(parts[2]);
  
  const date = new Date(year, month, day);
  const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  return days[date.getDay()];
};

// Helper to format date to DD/MM/YYYY
const formatDate = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const getRelativeDateLabel = (daysAgo: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return formatDate(date);
};

// Helper to parse DD/MM/YYYY to Date
const parseDate = (dateStr: string): Date | null => {
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1;
  const year = parseInt(parts[2]);
  return new Date(year, month, day);
};

const formatDateInputValue = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getWeekDays = (date: Date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());

  return Array.from({ length: 7 }, (_, index) => {
    const current = new Date(start);
    current.setDate(start.getDate() + index);
    return current;
  });
};

const timeToMinutes = (time?: string) => {
  if (!time) return 0;
  const [hour = '0', minute = '0'] = time.split(':');
  return Number(hour) * 60 + Number(minute);
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

interface WorkReport {
  title: string;
  description: string;
  tasks: {
    name: string;
    status: 'completed' | 'in-progress' | 'pending';
    duration?: string;
  }[];
  achievements: string[];
  note?: string;
}

interface AttendanceRequest {
  id: number;
  syncKey?: string;
  externalId?: number;
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
  workReport?: WorkReport;
}

interface EmployeeAttendance {
  employeeId: string;
  employeeName: string;
  department: string;
  date: string;
  checkIn: string;
  checkOut: string;
  hours: string;
  status: 'ontime' | 'late' | 'missing' | 'early-leave';
  note: string;
  workReport?: WorkReport;
}

type AttendanceStatusFilter = 'all' | AttendanceRequest['status'];
type LiveWorkStatus = 'online' | 'offline';
type AttendancePopup = 'supplement' | 'adjustment' | 'history';

interface LiveAttendanceStatus {
  employeeId: string;
  employeeName: string;
  department: string;
  date: string;
  checkIn: string;
  checkOut?: string;
  checkOutDate?: string;
  status: LiveWorkStatus;
  lastUpdated: string;
}

interface EmployeeLiveRoster {
  employeeId: string;
  employeeName: string;
  department: string;
}

interface CalendarAttendanceEvent extends LiveAttendanceStatus {
  dayIndex: number;
  top: number;
  height: number;
  durationLabel: string;
}

const LIVE_ATTENDANCE_STORAGE_KEY = 'hrm-live-attendance';

const normalizeAttendanceDate = (value?: string) => {
  if (!value) return formatDate(new Date());
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [year, month, day] = value.slice(0, 10).split('-');
    return `${day}/${month}/${year}`;
  }
  return value;
};

const requestSyncKey = (request: Pick<AttendanceRequest, 'employeeId' | 'date' | 'type' | 'submittedAt' | 'checkIn' | 'checkOut'>) =>
  [
    request.employeeId,
    normalizeAttendanceDate(request.date),
    request.type,
    request.submittedAt,
    request.checkIn,
    request.checkOut,
  ].join('|');

const minutesToHoursLabel = (checkIn?: string, checkOut?: string) => {
  if (!checkIn || !checkOut) return '0h';
  const minutes = Math.max(0, timeToMinutes(checkOut) - timeToMinutes(checkIn));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
};

const getAttendanceStatusFromLive = (record: LiveAttendanceStatus): EmployeeAttendance['status'] => {
  if (!record.checkIn) return 'missing';
  if (!record.checkOut) return 'missing';
  return timeToMinutes(record.checkIn) > timeToMinutes('08:30') ? 'late' : 'ontime';
};

const normalizeSyncedAttendanceRequest = (item: Partial<AttendanceRequest>): AttendanceRequest | null => {
  if (!item.employeeId || !item.employeeName || !item.type || !item.checkIn || !item.checkOut) return null;

  const normalized: AttendanceRequest = {
    id: Number(item.id || 0) + 10000,
    externalId: Number(item.id || 0),
    employeeName: item.employeeName,
    employeeId: item.employeeId,
    department: item.department || 'IT',
    date: normalizeAttendanceDate(item.date),
    checkIn: item.checkIn,
    checkOut: item.checkOut,
    reason: item.reason || 'Nhân viên gửi đơn chấm công từ cổng Employee.',
    status: item.status || 'pending',
    submittedAt: item.submittedAt || new Date().toLocaleString('vi-VN'),
    reviewedAt: item.reviewedAt,
    reviewedBy: item.reviewedBy,
    reviewNote: item.reviewNote,
    type: item.type,
    originalCheckIn: item.originalCheckIn,
    originalCheckOut: item.originalCheckOut,
    workReport: item.workReport
      ? {
          title: item.workReport.title || 'Báo cáo công việc',
          description: item.workReport.description || '',
          tasks: item.workReport.tasks || [],
          achievements: item.workReport.achievements || [],
          note: item.workReport.note,
        }
      : undefined,
  };

  normalized.syncKey = requestSyncKey(normalized);
  return normalized;
};

export function AttendanceApproval() {
  const [selectedRequest, setSelectedRequest] = useState<AttendanceRequest | null>(null);
  const [selectedAttendance, setSelectedAttendance] = useState<EmployeeAttendance | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [showWorkReportDialog, setShowWorkReportDialog] = useState(false);
  const [activeAttendancePopup, setActiveAttendancePopup] = useState<AttendancePopup | null>(null);
  const [returnPopupAfterDetail, setReturnPopupAfterDetail] = useState<AttendancePopup | null>(null);
  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState<CalendarAttendanceEvent | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [reviewNote, setReviewNote] = useState('');
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<AttendanceStatusFilter>('pending');
  const [liveDepartmentFilter, setLiveDepartmentFilter] = useState('all');
  
  // Date selector for attendance history - default to today
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [liveAttendance, setLiveAttendance] = useState<LiveAttendanceStatus[]>([
    {
      employeeId: 'NV001',
      employeeName: 'Nguyễn Văn An',
      department: 'IT',
      date: formatDate(new Date()),
      checkIn: '08:25',
      status: 'online',
      lastUpdated: '08:25',
    },
    {
      employeeId: 'NV002',
      employeeName: 'Trần Thị Bình',
      department: 'HR',
      date: formatDate(new Date()),
      checkIn: '08:20',
      checkOut: '17:20',
      status: 'offline',
      lastUpdated: '17:20',
    },
  ]);

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
      workReport: {
        title: 'Họp khách hàng và tư vấn giải pháp kỹ thuật',
        description: 'Meeting với khách hàng ABC Corp để tư vấn về giải pháp Cloud Infrastructure và Security',
        tasks: [
          { name: 'Chuẩn bị tài liệu presentation và demo', status: 'completed', duration: '1h 30m' },
          { name: 'Meeting với khách hàng tại trụ sở ABC', status: 'completed', duration: '3h 0m' },
          { name: 'Viết báo cáo meeting và proposal', status: 'completed', duration: '2h 0m' },
          { name: 'Follow up email với khách hàng', status: 'completed', duration: '30m' },
        ],
        achievements: [
          'Khách hàng đồng ý 90% proposal',
          'Đạt deal trị giá 500M VND',
          'Scheduled meeting lần 2 để ký hợp đồng',
        ],
        note: 'Khách hàng rất hài lòng với giải pháp đề xuất'
      }
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
      workReport: {
        title: 'Tuyển dụng và phỏng vấn ứng viên',
        description: 'Phỏng vấn 5 ứng viên cho vị trí Senior Developer và HR Specialist',
        tasks: [
          { name: 'Review 15 CV ứng viên', status: 'completed', duration: '1h 30m' },
          { name: 'Phỏng vấn 3 ứng viên Senior Dev', status: 'completed', duration: '3h 0m' },
          { name: 'Phỏng vấn 2 ứng viên HR Specialist', status: 'completed', duration: '2h 0m' },
          { name: 'Viết feedback và đánh giá', status: 'completed', duration: '1h 0m' },
        ],
        achievements: [
          'Tìm được 2 ứng viên tiềm năng cho vị trí Senior Dev',
          '1 ứng viên HR xuất sắc, đủ tiêu chuẩn onboard',
        ]
      }
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
      workReport: {
        title: 'Công tác tại chi nhánh Đà Nẵng - Lên kế hoạch Marketing Q1',
        description: 'Làm việc với team Marketing Đà Nẵng để lên kế hoạch chiến dịch Q1/2026',
        tasks: [
          { name: 'Bay sáng từ HN đến ĐN (6h-8h)', status: 'completed', duration: '2h 0m' },
          { name: 'Meeting với team Marketing chi nhánh', status: 'completed', duration: '3h 30m' },
          { name: 'Workshop lên ý tưởng campaign', status: 'completed', duration: '2h 0m' },
          { name: 'Review và approve budget', status: 'completed', duration: '1h 0m' },
        ],
        achievements: [
          'Hoàn thành kế hoạch Marketing Q1 cho miền Trung',
          'Team ĐN commit đạt 120% KPI',
          'Đề xuất 3 chiến dịch mới',
        ],
        note: 'Sẽ follow up weekly với team ĐN'
      }
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
      workReport: {
        title: 'Đàm phán hợp đồng với khách hàng VIP - XYZ Corporation',
        description: 'Gặp gỡ và đàm phán hợp đồng lớn trị giá 2 tỷ VND',
        tasks: [
          { name: 'Chuẩn bị hợp đồng và tài liệu pháp lý', status: 'completed', duration: '2h 0m' },
          { name: 'Meeting đàm phán với BOD khách hàng', status: 'completed', duration: '4h 0m' },
          { name: 'Điều chỉnh điều khoản hợp đồng', status: 'completed', duration: '1h 30m' },
        ],
        achievements: [
          'Đàm phán thành công hợp đồng 2 tỷ VND',
          'Khách hàng đồng ý ký trong tuần này',
          'Được giới thiệu thêm 2 khách hàng tiềm năng',
        ]
      }
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
      workReport: {
        title: 'Deploy hotfix production - Fix critical bugs',
        description: 'Xử lý và deploy hotfix cho các bugs nghiêm trọng trên production',
        tasks: [
          { name: 'Debug và tìm root cause của bug', status: 'completed', duration: '2h 30m' },
          { name: 'Code fix và testing trên local', status: 'completed', duration: '2h 0m' },
          { name: 'Deploy lên staging và UAT testing', status: 'completed', duration: '1h 30m' },
          { name: 'Deploy production và monitoring', status: 'completed', duration: '1h 40m' },
        ],
        achievements: [
          'Fix thành công 3 bugs critical',
          'Zero downtime khi deploy',
          'System hoạt động ổn định 100%',
        ],
        note: 'Đã làm overtime đến 17:40 để đảm bảo hệ thống ổn định'
      }
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
      workReport: {
        title: 'Presentation chiến dịch Marketing cho BOD',
        description: 'Trình bày kế hoạch Marketing Q1 và xin phê duyệt budget',
        tasks: [
          { name: 'Chuẩn bị slides và rehearsal', status: 'completed', duration: '2h 0m' },
          { name: 'Presentation trước BOD', status: 'completed', duration: '1h 30m' },
          { name: 'Q&A và điều chỉnh kế hoạch', status: 'completed', duration: '1h 0m' },
          { name: 'Finalize kế hoạch sau feedback', status: 'completed', duration: '2h 30m' },
        ],
        achievements: [
          'BOD approve 100% budget đề xuất',
          'Được khen ngợi về chất lượng presentation',
          'Green light cho 5 campaigns lớn',
        ],
        note: 'Đến sớm lúc 8h15 để chuẩn bị kỹ lưỡng'
      }
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
      workReport: {
        title: 'Xử lý khiếu nại khẩn cấp từ khách hàng',
        description: 'Khách hàng gặp sự cố nghiêm trọng, cần hỗ trợ ngay lập tức',
        tasks: [
          { name: 'Tiếp nhận và phân tích vấn đề', status: 'completed', duration: '1h 0m' },
          { name: 'Điều phối team tech support', status: 'completed', duration: '30m' },
          { name: 'Họp với khách hàng để giải quyết', status: 'completed', duration: '2h 30m' },
          { name: 'Follow up và đảm bảo hài lòng', status: 'completed', duration: '1h 30m' },
        ],
        achievements: [
          'Giải quyết thành công khiếu nại',
          'Khách hàng hài lòng và gia hạn hợp đồng',
          'Tránh được việc mất khách hàng lớn',
        ],
        note: 'Đã làm thêm giờ đến 18h để đảm bảo khách hàng hài lòng'
      }
    },
  ]);

  // Sample attendance data for all employees
  const [allAttendance, setAllAttendance] = useState<EmployeeAttendance[]>([
    // Recent demo data - yesterday / previous days
    { employeeId: 'NV001', employeeName: 'Nguyễn Văn An', department: 'IT', date: getRelativeDateLabel(1), checkIn: '08:24', checkOut: '17:32', hours: '8h 8m', status: 'ontime', note: '',
      workReport: {
        title: 'Hoàn thiện dashboard quản trị',
        description: 'Cập nhật giao diện Admin/Manager và rà soát các luồng nghiệp vụ chính',
        tasks: [
          { name: 'Rà soát UI module nhân viên', status: 'completed', duration: '2h 0m' },
          { name: 'Tối ưu bộ lọc nghỉ phép', status: 'completed', duration: '2h 30m' },
          { name: 'Kiểm tra build frontend', status: 'completed', duration: '1h 0m' },
        ],
        achievements: ['Dashboard ổn định hơn', 'Bộ lọc ngày có dữ liệu demo'],
      }
    },
    { employeeId: 'NV002', employeeName: 'Trần Thị Bình', department: 'HR', date: getRelativeDateLabel(1), checkIn: '08:35', checkOut: '17:25', hours: '7h 50m', status: 'late', note: 'Đi muộn 5 phút' },
    { employeeId: 'NV004', employeeName: 'Phạm Minh Đức', department: 'Sales', date: getRelativeDateLabel(1), checkIn: '08:20', checkOut: '17:40', hours: '8h 20m', status: 'ontime', note: '' },
    { employeeId: 'NV003', employeeName: 'Lê Hoàng Cường', department: 'Marketing', date: getRelativeDateLabel(2), checkIn: '08:28', checkOut: '17:35', hours: '8h 7m', status: 'ontime', note: '',
      workReport: {
        title: 'Tổng hợp chiến dịch truyền thông',
        description: 'Theo dõi hiệu quả nội dung và tổng hợp số liệu báo cáo ngày',
        tasks: [
          { name: 'Kiểm tra hiệu quả bài đăng', status: 'completed', duration: '2h 0m' },
          { name: 'Tổng hợp số liệu ads', status: 'completed', duration: '2h 30m' },
          { name: 'Đề xuất nội dung mới', status: 'completed', duration: '1h 30m' },
        ],
        achievements: ['CTR tăng 8%', 'Hoàn tất báo cáo daily'],
      }
    },
    { employeeId: 'NV005', employeeName: 'Võ Thị Như', department: 'Finance', date: getRelativeDateLabel(2), checkIn: '09:05', checkOut: '17:30', hours: '7h 25m', status: 'late', note: 'Đi muộn 35 phút' },
    { employeeId: 'NV006', employeeName: 'Hoàng Minh Tuấn', department: 'IT', date: getRelativeDateLabel(3), checkIn: '08:25', checkOut: '17:45', hours: '8h 20m', status: 'ontime', note: '' },
    { employeeId: 'NV007', employeeName: 'Nguyễn Thu Hà', department: 'Marketing', date: getRelativeDateLabel(3), checkIn: '-', checkOut: '-', hours: '0h', status: 'missing', note: 'Chưa chấm công' },

    // 17/01/2026 - Friday
    { employeeId: 'NV001', employeeName: 'Nguyễn Văn An', department: 'IT', date: '17/01/2026', checkIn: '08:25', checkOut: '17:30', hours: '8h 5m', status: 'ontime', note: '',
      workReport: {
        title: 'Phát triển API cho module Payment',
        description: 'Hoàn thành RESTful API cho hệ thống thanh toán',
        tasks: [
          { name: 'Thiết kế database schema', status: 'completed', duration: '2h 0m' },
          { name: 'Code API endpoints', status: 'completed', duration: '3h 30m' },
          { name: 'Write unit tests', status: 'completed', duration: '2h 0m' },
        ],
        achievements: ['Hoàn thành 100% API specs', 'Code coverage 95%'],
      }
    },
    { employeeId: 'NV002', employeeName: 'Trần Thị Bình', department: 'HR', date: '17/01/2026', checkIn: '08:20', checkOut: '17:20', hours: '8h 0m', status: 'ontime', note: '',
      workReport: {
        title: 'Tổ chức chương trình đào tạo nội bộ',
        description: 'Training về kỹ năng mềm cho nhân viên mới',
        tasks: [
          { name: 'Chuẩn bị tài liệu training', status: 'completed', duration: '2h 30m' },
          { name: 'Thực hiện buổi đào tạo', status: 'completed', duration: '4h 0m' },
          { name: 'Đánh giá và thu thập feedback', status: 'completed', duration: '1h 0m' },
        ],
        achievements: ['25 nhân viên tham gia', 'Feedback rate 4.8/5'],
      }
    },
    { employeeId: 'NV003', employeeName: 'Lê Hoàng Cường', department: 'Marketing', date: '17/01/2026', checkIn: '08:30', checkOut: '17:30', hours: '8h 0m', status: 'ontime', note: '',
      workReport: {
        title: 'Launch chiến dịch quảng cáo Facebook Ads',
        description: 'Triển khai campaign quảng cáo sản phẩm mới trên Facebook',
        tasks: [
          { name: 'Setup Facebook Ads campaign', status: 'completed', duration: '2h 0m' },
          { name: 'Tạo creative content và copy', status: 'completed', duration: '3h 0m' },
          { name: 'Monitoring và optimize ads', status: 'in-progress', duration: '2h 30m' },
        ],
        achievements: ['Reach 50K người', 'CTR 3.5%', 'Cost per click giảm 20%'],
      }
    },
    { employeeId: 'NV004', employeeName: 'Phạm Minh Đức', department: 'Sales', date: '17/01/2026', checkIn: '08:20', checkOut: '17:40', hours: '8h 20m', status: 'ontime', note: '',
      workReport: {
        title: 'Chăm sóc khách hàng và closing deals',
        description: 'Follow up 10 khách hàng tiềm năng và close 3 deals',
        tasks: [
          { name: 'Gọi điện tư vấn khách hàng', status: 'completed', duration: '3h 0m' },
          { name: 'Viết proposal cho 3 khách hàng', status: 'completed', duration: '2h 30m' },
          { name: 'Meeting và ký hợp đồng', status: 'completed', duration: '2h 0m' },
        ],
        achievements: ['Close 3 deals = 150M VND', 'Conversion rate 30%'],
      }
    },
    { employeeId: 'NV005', employeeName: 'Võ Thị Như', department: 'Finance', date: '17/01/2026', checkIn: '08:30', checkOut: '17:30', hours: '8h 0m', status: 'ontime', note: '' },
    
    // 16/01/2026 - Thursday
    { employeeId: 'NV001', employeeName: 'Nguyễn Văn An', department: 'IT', date: '16/01/2026', checkIn: '08:30', checkOut: '17:30', hours: '8h 0m', status: 'ontime', note: '' },
    { employeeId: 'NV002', employeeName: 'Trần Thị Bình', department: 'HR', date: '16/01/2026', checkIn: '08:30', checkOut: '17:30', hours: '8h 0m', status: 'ontime', note: '' },
    { employeeId: 'NV003', employeeName: 'Lê Hoàng Cường', department: 'Marketing', date: '16/01/2026', checkIn: '08:28', checkOut: '17:28', hours: '8h 0m', status: 'ontime', note: '' },
    { employeeId: 'NV004', employeeName: 'Phạm Minh Đức', department: 'Sales', date: '16/01/2026', checkIn: '08:25', checkOut: '17:35', hours: '8h 10m', status: 'ontime', note: '' },
    { employeeId: 'NV005', employeeName: 'Võ Thị Như', department: 'Finance', date: '16/01/2026', checkIn: '08:28', checkOut: '17:28', hours: '8h 0m', status: 'ontime', note: '' },
    
    // 15/01/2026 - Wednesday
    { employeeId: 'NV001', employeeName: 'Nguyễn Văn An', department: 'IT', date: '15/01/2026', checkIn: '08:28', checkOut: '17:28', hours: '8h 0m', status: 'ontime', note: '' },
    { employeeId: 'NV002', employeeName: 'Trần Thị Bình', department: 'HR', date: '15/01/2026', checkIn: '08:25', checkOut: '17:25', hours: '8h 0m', status: 'ontime', note: '' },
    { employeeId: 'NV003', employeeName: 'Lê Hoàng Cường', department: 'Marketing', date: '15/01/2026', checkIn: '08:30', checkOut: '17:30', hours: '8h 0m', status: 'ontime', note: '' },
    { employeeId: 'NV004', employeeName: 'Phạm Minh Đức', department: 'Sales', date: '15/01/2026', checkIn: '08:30', checkOut: '17:30', hours: '8h 0m', status: 'ontime', note: '' },
    { employeeId: 'NV005', employeeName: 'Võ Thị Như', department: 'Finance', date: '15/01/2026', checkIn: '08:25', checkOut: '17:25', hours: '8h 0m', status: 'ontime', note: '' },
    
    // 14/01/2026 - Tuesday
    { employeeId: 'NV001', employeeName: 'Nguyễn Văn An', department: 'IT', date: '14/01/2026', checkIn: '08:35', checkOut: '17:30', hours: '7h 55m', status: 'late', note: 'Đi muộn 5 phút' },
    { employeeId: 'NV002', employeeName: 'Trần Thị Bình', department: 'HR', date: '14/01/2026', checkIn: '08:30', checkOut: '17:30', hours: '8h 0m', status: 'ontime', note: '' },
    { employeeId: 'NV003', employeeName: 'Lê Hoàng Cường', department: 'Marketing', date: '14/01/2026', checkIn: '08:25', checkOut: '17:25', hours: '8h 0m', status: 'ontime', note: '' },
    { employeeId: 'NV004', employeeName: 'Phạm Minh Đức', department: 'Sales', date: '14/01/2026', checkIn: '08:30', checkOut: '17:30', hours: '8h 0m', status: 'ontime', note: '' },
    { employeeId: 'NV005', employeeName: 'Võ Thị Như', department: 'Finance', date: '14/01/2026', checkIn: '08:30', checkOut: '17:30', hours: '8h 0m', status: 'ontime', note: '' },
    
    // 13/01/2026 - Monday
    { employeeId: 'NV001', employeeName: 'Nguyễn Văn An', department: 'IT', date: '13/01/2026', checkIn: '08:25', checkOut: '17:25', hours: '8h 0m', status: 'ontime', note: '' },
    { employeeId: 'NV002', employeeName: 'Trần Thị Bình', department: 'HR', date: '13/01/2026', checkIn: '08:22', checkOut: '17:22', hours: '8h 0m', status: 'ontime', note: '' },
    { employeeId: 'NV003', employeeName: 'Lê Hoàng Cường', department: 'Marketing', date: '13/01/2026', checkIn: '08:40', checkOut: '17:30', hours: '7h 50m', status: 'late', note: 'Đi muộn 10 phút' },
    { employeeId: 'NV004', employeeName: 'Phạm Minh Đức', department: 'Sales', date: '13/01/2026', checkIn: '08:22', checkOut: '17:22', hours: '8h 0m', status: 'ontime', note: '' },
    { employeeId: 'NV005', employeeName: 'Võ Thị Như', department: 'Finance', date: '13/01/2026', checkIn: '08:30', checkOut: '17:30', hours: '8h 0m', status: 'ontime', note: '' },
  ]);

  useEffect(() => {
    const loadLiveAttendance = () => {
      const saved = window.localStorage.getItem(LIVE_ATTENDANCE_STORAGE_KEY);
      if (!saved) return;

      try {
        const parsed = JSON.parse(saved) as LiveAttendanceStatus[];
        if (Array.isArray(parsed)) {
          setLiveAttendance(parsed);
        }
      } catch {
        window.localStorage.removeItem(LIVE_ATTENDANCE_STORAGE_KEY);
      }
    };

    const loadSyncedRequests = () => {
      const synced = readSyncedRecords<Partial<AttendanceRequest>>(HRM_SYNC_KEYS.attendanceRequests)
        .map(normalizeSyncedAttendanceRequest)
        .filter((item): item is AttendanceRequest => Boolean(item));

      if (synced.length === 0) return;

      setRequests((current) => {
        const syncedKeys = new Set(synced.map((request) => request.syncKey));
        const localOnly = current.filter((request) => !request.syncKey || !syncedKeys.has(request.syncKey));
        return [...synced, ...localOnly];
      });
    };

    loadLiveAttendance();
    loadSyncedRequests();

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === LIVE_ATTENDANCE_STORAGE_KEY) {
        loadLiveAttendance();
      }
      if (event.key === HRM_SYNC_KEYS.attendanceRequests) {
        loadSyncedRequests();
      }
    };

    const handleHrmSync = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string }>).detail;
      if (!detail?.key || detail.key === LIVE_ATTENDANCE_STORAGE_KEY) {
        loadLiveAttendance();
      }
      if (!detail?.key || detail.key === HRM_SYNC_KEYS.attendanceRequests) {
        loadSyncedRequests();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('hrm-sync', handleHrmSync);
    window.addEventListener('focus', loadLiveAttendance);
    window.addEventListener('focus', loadSyncedRequests);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('hrm-sync', handleHrmSync);
      window.removeEventListener('focus', loadLiveAttendance);
      window.removeEventListener('focus', loadSyncedRequests);
    };
  }, []);

  const supplementRequests = requests.filter(r => r.type === 'supplement');
  const adjustmentRequests = requests.filter(r => r.type === 'adjustment');

  // Get unique departments for filters
  const departments = useMemo(() => {
    const depts = new Set(requests.map(r => r.department));
    return Array.from(depts);
  }, [requests]);

  const attendanceDepartments = useMemo(() => {
    const depts = new Set<string>();
    allAttendance.forEach((record) => depts.add(record.department));
    liveAttendance.forEach((record) => depts.add(record.department));
    requests.forEach((record) => depts.add(record.department));
    return Array.from(depts).sort((a, b) => a.localeCompare(b));
  }, [allAttendance, liveAttendance, requests]);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      const matchesSearch = 
        req.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.reason.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesDepartment = departmentFilter === 'all' || req.department === departmentFilter;
      const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
      
      return matchesSearch && matchesDepartment && matchesStatus;
    });
  }, [requests, searchQuery, departmentFilter, statusFilter]);

  // Get attendance for selected date
  const attendanceForDate = useMemo(() => {
    const dateStr = formatDate(selectedDate);
    const liveAsHistory: EmployeeAttendance[] = liveAttendance.map((record) => ({
      employeeId: record.employeeId,
      employeeName: record.employeeName,
      department: record.department,
      date: record.date,
      checkIn: record.checkIn || '-',
      checkOut: record.checkOut || '-',
      hours: minutesToHoursLabel(record.checkIn, record.checkOut),
      status: getAttendanceStatusFromLive(record),
      note: record.status === 'online'
        ? 'Đang làm việc - dữ liệu realtime từ Employee'
        : record.checkOutDate && record.checkOutDate !== record.date
          ? `Đã kết thúc ca vào ${record.checkOutDate}`
          : 'Đã check-out - dữ liệu realtime từ Employee',
    }));

    const merged = new Map<string, EmployeeAttendance>();
    [...allAttendance, ...liveAsHistory].forEach((item) => {
      merged.set(`${item.employeeId}-${item.date}`, item);
    });

    return Array.from(merged.values()).filter(att => {
      const matchesDate = att.date === dateStr;
      const matchesSearch = 
        att.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        att.employeeId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDepartment = departmentFilter === 'all' || att.department === departmentFilter;
      
      return matchesDate && matchesSearch && matchesDepartment;
    }).sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  }, [allAttendance, liveAttendance, selectedDate, searchQuery, departmentFilter]);

  const employeeRoster = useMemo<EmployeeLiveRoster[]>(() => {
    const roster = new Map<string, EmployeeLiveRoster>();

    allAttendance.forEach((record) => {
      if (!roster.has(record.employeeId)) {
        roster.set(record.employeeId, {
          employeeId: record.employeeId,
          employeeName: record.employeeName,
          department: record.department,
        });
      }
    });

    liveAttendance.forEach((record) => {
      if (!roster.has(record.employeeId)) {
        roster.set(record.employeeId, {
          employeeId: record.employeeId,
          employeeName: record.employeeName,
          department: record.department,
        });
      }
    });

    return Array.from(roster.values()).sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  }, [allAttendance, liveAttendance]);

  const liveAttendanceForDate = useMemo(() => {
    const dateStr = formatDate(selectedDate);
    const liveByEmployee = new Map(
      liveAttendance
        .filter((item) => item.date === dateStr)
        .map((item) => [item.employeeId, item])
    );

    const baseEmployees = employeeRoster.map<LiveAttendanceStatus>((record) => {
      const liveRecord = liveByEmployee.get(record.employeeId);
      if (liveRecord) return liveRecord;

      return {
        employeeId: record.employeeId,
        employeeName: record.employeeName,
        department: record.department,
        date: dateStr,
        checkIn: '',
        status: 'offline',
        lastUpdated: '-',
      };
    });

    const extraLiveRecords = Array.from(liveByEmployee.values()).filter(
      (item) => !baseEmployees.some((record) => record.employeeId === item.employeeId)
    );

    return [...baseEmployees, ...extraLiveRecords].sort((a, b) => {
      if (a.status !== b.status) return a.status === 'online' ? -1 : 1;
      return a.employeeName.localeCompare(b.employeeName);
    });
  }, [employeeRoster, liveAttendance, selectedDate]);

  // Calculate stats for selected date
  const dateStats = useMemo(() => {
    const total = attendanceForDate.length;
    const ontime = attendanceForDate.filter(a => a.status === 'ontime').length;
    const late = attendanceForDate.filter(a => a.status === 'late').length;
    const missing = attendanceForDate.filter(a => a.status === 'missing').length;
    const withReport = attendanceForDate.filter(a => a.workReport).length;
    
    return { total, ontime, late, missing, withReport };
  }, [attendanceForDate]);

  const liveDepartmentStats = useMemo(() => {
    const summary = new Map<string, { department: string; total: number; online: number; offline: number }>();

    liveAttendanceForDate.forEach((item) => {
      const current = summary.get(item.department) ?? {
        department: item.department,
        total: 0,
        online: 0,
        offline: 0,
      };

      current.total += 1;
      if (item.status === 'online') {
        current.online += 1;
      } else {
        current.offline += 1;
      }

      summary.set(item.department, current);
    });

    return Array.from(summary.values()).sort((a, b) => a.department.localeCompare(b.department));
  }, [liveAttendanceForDate]);

  const filteredLiveAttendance = useMemo(() => {
    if (liveDepartmentFilter === 'all') return liveAttendanceForDate;
    return liveAttendanceForDate.filter((item) => item.department === liveDepartmentFilter);
  }, [liveAttendanceForDate, liveDepartmentFilter]);

  const liveVisibleEmployees = useMemo(() => {
    return [...filteredLiveAttendance].sort((a, b) => {
      if (a.status !== b.status) return a.status === 'online' ? -1 : 1;
      return a.employeeName.localeCompare(b.employeeName);
    });
  }, [filteredLiveAttendance]);

  const liveStats = useMemo(() => {
    const online = filteredLiveAttendance.filter((item) => item.status === 'online').length;
    const total = filteredLiveAttendance.length;
    return { online, offline: Math.max(total - online, 0), total };
  }, [filteredLiveAttendance]);

  const allLiveStats = useMemo(() => {
    const online = liveAttendanceForDate.filter((item) => item.status === 'online').length;
    return {
      online,
      total: liveAttendanceForDate.length,
      offline: Math.max(liveAttendanceForDate.length - online, 0),
    };
  }, [liveAttendanceForDate]);

  const liveOnlinePercent = liveStats.total > 0 ? Math.round((liveStats.online / liveStats.total) * 100) : 0;
  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);
  const weekDateKeys = useMemo(() => weekDays.map((day) => formatDate(day)), [weekDays]);
  const weekTimeSlots = useMemo(() => Array.from({ length: 16 }, (_, index) => index + 6), []);
  const selectedMonthLabel = selectedDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
  const selectedWeekRange = `${formatDate(weekDays[0])} - ${formatDate(weekDays[6])}`;
  const calendarStartMinute = 6 * 60;
  const calendarEndMinute = 22 * 60;
  const calendarTotalMinutes = calendarEndMinute - calendarStartMinute;

  const calendarEvents = useMemo<CalendarAttendanceEvent[]>(() => {
    const eventMap = new Map<string, CalendarAttendanceEvent>();

    const buildEvent = (record: LiveAttendanceStatus): CalendarAttendanceEvent | null => {
      if (!record.checkIn) return null;
      if (liveDepartmentFilter !== 'all' && record.department !== liveDepartmentFilter) return null;

      const dayIndex = weekDateKeys.indexOf(record.date);
      if (dayIndex < 0) return null;

      const startMinute = clamp(timeToMinutes(record.checkIn), calendarStartMinute, calendarEndMinute - 30);
      const rawEndMinute = record.checkOut
        ? timeToMinutes(record.checkOut)
        : record.status === 'online'
          ? startMinute + 180
          : startMinute + 75;
      const endMinute = clamp(rawEndMinute <= startMinute ? calendarEndMinute : rawEndMinute, startMinute + 45, calendarEndMinute);
      const top = ((startMinute - calendarStartMinute) / calendarTotalMinutes) * 100;
      const height = ((endMinute - startMinute) / calendarTotalMinutes) * 100;
      const durationLabel = record.checkOut ? `${record.checkIn} - ${record.checkOut}` : `${record.checkIn} - đang làm`;

      return {
        ...record,
        dayIndex,
        top,
        height: Math.max(height, 7),
        durationLabel,
      };
    };

    allAttendance.forEach((record) => {
      if (!weekDateKeys.includes(record.date)) return;

      const event = buildEvent({
        employeeId: record.employeeId,
        employeeName: record.employeeName,
        department: record.department,
        date: record.date,
        checkIn: record.checkIn,
        checkOut: record.checkOut,
        status: record.checkOut ? 'offline' : 'online',
        lastUpdated: record.checkOut || record.checkIn,
      });

      if (event) {
        eventMap.set(`${event.employeeId}-${event.date}`, event);
      }
    });

    liveAttendance.forEach((record) => {
      if (!weekDateKeys.includes(record.date)) return;
      const event = buildEvent(record);
      if (event) {
        eventMap.set(`${event.employeeId}-${event.date}`, event);
      }
    });

    return Array.from(eventMap.values()).sort((a, b) => {
      if (a.dayIndex !== b.dayIndex) return a.dayIndex - b.dayIndex;
      return timeToMinutes(a.checkIn) - timeToMinutes(b.checkIn);
    });
  }, [allAttendance, calendarTotalMinutes, liveAttendance, liveDepartmentFilter, weekDateKeys]);

  const filteredSupplementRequests = filteredRequests.filter(r => r.type === 'supplement');
  const filteredAdjustmentRequests = filteredRequests.filter(r => r.type === 'adjustment');

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
    supplement: supplementRequests.length,
    adjustment: adjustmentRequests.length,
  };

  const handlePreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const handleViewDetail = (request: AttendanceRequest) => {
    setReturnPopupAfterDetail(activeAttendancePopup);
    setActiveAttendancePopup(null);
    setSelectedRequest(request);
    setShowDetailDialog(true);
  };

  const closeDetailDialog = (restorePopup = true) => {
    setShowDetailDialog(false);
    if (restorePopup && returnPopupAfterDetail) {
      setActiveAttendancePopup(returnPopupAfterDetail);
    }
    setReturnPopupAfterDetail(null);
  };

  const handleViewWorkReport = (request: AttendanceRequest | null, attendance: EmployeeAttendance | null = null) => {
    setActiveAttendancePopup(null);
    if (request) {
      setSelectedRequest(request);
      setSelectedAttendance(null);
    } else if (attendance) {
      setSelectedRequest(null);
      setSelectedAttendance(attendance);
    }
    setShowWorkReportDialog(true);
  };

  const handleOpenActionDialog = (request: AttendanceRequest, action: 'approve' | 'reject') => {
    setActiveAttendancePopup(null);
    setSelectedRequest(request);
    setActionType(action);
    setShowActionDialog(true);
    setReviewNote('');
  };

  const syncReviewedRequestToEmployee = (reviewedRequest: AttendanceRequest) => {
    if (!reviewedRequest.syncKey) return;

    const synced = readSyncedRecords<Partial<AttendanceRequest>>(HRM_SYNC_KEYS.attendanceRequests);
    const next = synced.map((item) => {
      const normalized = normalizeSyncedAttendanceRequest(item);
      if (!normalized || normalized.syncKey !== reviewedRequest.syncKey) return item;

      return {
        ...item,
        status: reviewedRequest.status,
        reviewedAt: reviewedRequest.reviewedAt,
        reviewedBy: reviewedRequest.reviewedBy,
        reviewNote: reviewedRequest.reviewNote,
      };
    });

    const serialized = JSON.stringify(next);
    window.localStorage.setItem(HRM_SYNC_KEYS.attendanceRequests, serialized);
    window.dispatchEvent(new CustomEvent('hrm-sync', { detail: { key: HRM_SYNC_KEYS.attendanceRequests } }));

    try {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: HRM_SYNC_KEYS.attendanceRequests,
          newValue: serialized,
          storageArea: window.localStorage,
        }),
      );
    } catch {
      // Older browsers may block synthetic StorageEvent.
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedRequest) return;

    try {
      const updated = actionType === 'approve'
        ? await approveAttendanceRequest(selectedRequest.externalId || selectedRequest.id, reviewNote || undefined)
        : await rejectAttendanceRequest(selectedRequest.externalId || selectedRequest.id, reviewNote || undefined);

      if (!updated || (updated.status !== 'approved' && updated.status !== 'rejected')) {
        throw new Error('API không trả về trạng thái duyệt hợp lệ.');
      }
    } catch (error) {
      console.error('Review attendance request failed:', error);
      alert('Không cập nhật được đơn chấm công trên API. Giao diện sẽ giữ nguyên trạng thái cũ.');
      return;
    }

    let reviewedRequest: AttendanceRequest | null = null;
    const updatedRequests = requests.map(req => {
      if (req.id === selectedRequest.id) {
        reviewedRequest = {
          ...req,
          status: actionType === 'approve' ? 'approved' as const : 'rejected' as const,
          reviewedAt: new Date().toLocaleString('vi-VN'),
          reviewedBy: 'HR Manager',
          reviewNote: reviewNote || (actionType === 'approve' ? 'Đơn được phê duyệt' : 'Đơn bị từ chối'),
        };
        return reviewedRequest;
      }
      return req;
    });

    setRequests(updatedRequests);
    if (reviewedRequest) {
      syncReviewedRequestToEmployee(reviewedRequest);
    }
    setShowActionDialog(false);
    setShowDetailDialog(false);
    setReviewNote('');

    alert(
      actionType === 'approve'
        ? '✅ Đã phê duyệt đơn chấm công!'
        : '❌ Đã từ chối đơn chấm công!'
    );
  };

  const getRequestTypeBadge = (type: AttendanceRequest['type']) => (
    <Badge
      variant="outline"
      className={type === 'supplement' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-indigo-200 bg-indigo-50 text-indigo-700'}
    >
      {type === 'supplement' ? 'Bổ sung công' : 'Điều chỉnh giờ'}
    </Badge>
  );

  const getRequestStatusBadge = (status: AttendanceRequest['status']) => {
    if (status === 'approved') {
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Đã duyệt</Badge>;
    }

    if (status === 'rejected') {
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Từ chối</Badge>;
    }

    return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">Chờ duyệt</Badge>;
  };

  const renderCompactRequestList = (requestList: AttendanceRequest[], title: string, description: string) => {
    const orderedRequests = [...requestList].sort((first, second) => {
      if (first.status === second.status) return first.id - second.id;
      return first.status === 'pending' ? -1 : 1;
    });

    return (
      <Card className="overflow-hidden border-gray-200 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
          <Badge variant="outline" className="w-fit bg-gray-50 text-gray-700">
            {orderedRequests.length} đơn
          </Badge>
        </div>

        <div className="space-y-3 bg-gray-50/60 p-4">
          {orderedRequests.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">
              Không có đơn phù hợp với bộ lọc hiện tại.
            </div>
          ) : (
            orderedRequests.map((request) => (
              <article
                key={request.id}
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md"
              >
                <div className="grid gap-4 xl:grid-cols-[minmax(220px,1fr)_minmax(260px,1.25fr)_minmax(170px,0.75fr)_auto] xl:items-center">
                  <div className="min-w-0">
                    <div className="flex items-start gap-3">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-base font-semibold text-white">
                        {request.employeeName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{request.employeeName}</p>
                        <p className="text-xs text-gray-500">{request.employeeId} • {request.department}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {getRequestTypeBadge(request.type)}
                          {getRequestStatusBadge(request.status)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="min-w-0 rounded-md bg-gray-50 px-3 py-2">
                    <div className="grid gap-3 sm:grid-cols-[110px_minmax(0,1fr)]">
                      <div>
                        <p className="text-xs font-medium uppercase text-gray-400">Ngày</p>
                        <p className="mt-1 text-sm font-semibold text-gray-900">{request.date}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase text-gray-400">
                          {request.type === 'adjustment' ? 'Giờ điều chỉnh' : 'Giờ đề xuất'}
                        </p>
                        {request.type === 'adjustment' && (
                          <p className="mt-1 text-xs text-gray-500">
                            Gốc: {request.originalCheckIn ?? '-'} - {request.originalCheckOut ?? '-'}
                          </p>
                        )}
                        <p className="mt-1 text-sm text-gray-700">
                          Mới: <span className="font-semibold text-gray-900">{request.checkIn}</span> -{' '}
                          <span className="font-semibold text-gray-900">{request.checkOut}</span>
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 line-clamp-2 break-words text-sm text-gray-600" title={request.reason}>
                      {request.reason}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">Gửi lúc {request.submittedAt}</p>
                  </div>

                  <div className="min-w-0 space-y-2">
                    {request.workReport ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewWorkReport(request)}
                        className="w-full justify-center gap-2 border-blue-200 text-blue-600 hover:bg-blue-50"
                      >
                        <FileText className="size-4" />
                        {request.workReport.tasks.length} việc
                      </Button>
                    ) : (
                      <div className="rounded-md border border-dashed border-gray-200 px-3 py-2 text-center text-sm text-gray-400">
                        Chưa có báo cáo
                      </div>
                    )}
                    {request.status !== 'pending' && (
                      <p className="text-xs text-gray-500">
                        {request.reviewedBy} • {request.reviewedAt}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 xl:justify-end">
                    <Button size="sm" variant="outline" onClick={() => handleViewDetail(request)} className="gap-2">
                      <Eye className="size-4" />
                      Chi tiết
                    </Button>
                    {request.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => handleOpenActionDialog(request, 'reject')}
                        >
                          Từ chối
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleOpenActionDialog(request, 'approve')}
                        >
                          Duyệt
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </Card>
    );
  };

  const renderOptimizedRequestTable = (requestList: AttendanceRequest[], title: string, description: string) => {
    const orderedRequests = [...requestList].sort((first, second) => {
      if (first.status === second.status) return first.id - second.id;
      return first.status === 'pending' ? -1 : 1;
    });

    return (
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
          <Badge variant="outline" className="w-fit bg-gray-50 text-gray-700">
            {orderedRequests.length} đơn
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Nhân viên</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Loại đơn</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Ngày</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Giờ đề xuất</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Lý do</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Báo cáo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Trạng thái</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orderedRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-500">
                    Không có đơn phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                orderedRequests.map((request) => (
                  <tr key={request.id} className="transition-colors hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 font-semibold text-white">
                          {request.employeeName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{request.employeeName}</p>
                          <p className="text-xs text-gray-500">{request.employeeId} • {request.department}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{getRequestTypeBadge(request.type)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{request.date}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <div className="space-y-1">
                        {request.type === 'adjustment' && (
                          <p className="text-xs text-gray-500">
                            Gốc: {request.originalCheckIn ?? '-'} - {request.originalCheckOut ?? '-'}
                          </p>
                        )}
                        <p>
                          Mới: <span className="font-semibold">{request.checkIn}</span> -{' '}
                          <span className="font-semibold">{request.checkOut}</span>
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="max-w-[260px] truncate text-sm text-gray-600" title={request.reason}>
                        {request.reason}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">Gửi lúc {request.submittedAt}</p>
                    </td>
                    <td className="px-4 py-3">
                      {request.workReport ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewWorkReport(request)}
                          className="gap-2 text-blue-600 hover:bg-blue-50"
                        >
                          <FileText className="size-4" />
                          {request.workReport.tasks.length} việc
                        </Button>
                      ) : (
                        <span className="text-sm text-gray-400">Chưa có</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {getRequestStatusBadge(request.status)}
                        {request.status !== 'pending' && (
                          <p className="text-xs text-gray-500">{request.reviewedBy} • {request.reviewedAt}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleViewDetail(request)}>
                          <Eye className="mr-1 size-4" />
                          Chi tiết
                        </Button>
                        {request.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:bg-red-50"
                              onClick={() => handleOpenActionDialog(request, 'reject')}
                            >
                              Từ chối
                            </Button>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleOpenActionDialog(request, 'approve')}
                            >
                              Duyệt
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    );
  };

  const renderRequestTable = (requestList: AttendanceRequest[]) => {
    if (requestList.length === 0) {
      return (
        <Card className="p-8 text-center">
          <p className="text-gray-500">Không có đơn nào</p>
        </Card>
      );
    }

    const pendingRequests = requestList.filter(r => r.status === 'pending');
    const reviewedRequests = requestList.filter(r => r.status !== 'pending');

    return (
      <div className="space-y-6">
        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <Card className="shadow-lg">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-yellow-50 to-orange-50">
              <div className="flex items-center gap-3">
                <div className="size-10 bg-yellow-600 rounded-lg flex items-center justify-center text-white">
                  <Clock className="size-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Chờ duyệt ({pendingRequests.length})</h2>
                  <p className="text-sm text-gray-600">Cần xem xét và phê duyệt</p>
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
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Báo cáo</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Gửi lúc</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {pendingRequests.map((request) => (
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
                        <p className="text-sm text-gray-700 max-w-xs line-clamp-2" title={request.reason}>
                          {request.reason}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        {request.workReport ? (
                          <div className="flex flex-col gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewWorkReport(request)}
                              className="gap-2 border-blue-200 text-blue-600 hover:bg-blue-50"
                            >
                              <Eye className="size-4" />
                              Xem báo cáo
                            </Button>
                            <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs" variant="outline">
                              📋 {request.workReport.tasks.length} tasks
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Chưa có</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{request.submittedAt}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewDetail(request)}
                            className="w-full"
                          >
                            <Eye className="size-4 mr-1" />
                            Chi tiết
                          </Button>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 flex-1"
                              onClick={() => handleOpenActionDialog(request, 'approve')}
                            >
                              <CheckCircle className="size-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="flex-1"
                              onClick={() => handleOpenActionDialog(request, 'reject')}
                            >
                              <XCircle className="size-4" />
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Reviewed Requests */}
        {reviewedRequests.length > 0 && (
          <Card className="shadow-lg">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="size-10 bg-gray-600 rounded-lg flex items-center justify-center text-white">
                  <FileText className="size-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Đã xử lý ({reviewedRequests.length})</h2>
                  <p className="text-sm text-gray-600">Đơn đã được duyệt hoặc từ chối</p>
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
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Báo cáo</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Trạng thái</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Xử lý bởi</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {reviewedRequests.map((request) => (
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
                        {request.workReport ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewWorkReport(request)}
                            className="gap-2 border-blue-200 text-blue-600 hover:bg-blue-50"
                          >
                            <Eye className="size-4" />
                            Xem báo cáo
                          </Button>
                        ) : (
                          <span className="text-sm text-gray-400">Chưa có</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          className={
                            request.status === 'approved'
                              ? 'bg-green-600'
                              : 'bg-red-600'
                          }
                        >
                          {request.status === 'approved' ? '✓ Đã duyệt' : '✗ Từ chối'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <p className="font-medium">{request.reviewedBy}</p>
                        <p className="text-xs text-gray-500">{request.reviewedAt}</p>
                      </td>
                      <td className="px-6 py-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDetail(request)}
                        >
                          <Eye className="size-4 mr-1" />
                          Chi tiết
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    );
  };

  const renderAttendanceHistoryPanel = () => {
    const selectedDateLabel = formatDate(selectedDate);
    const ontimePercent = dateStats.total > 0 ? Math.round((dateStats.ontime / dateStats.total) * 100) : 0;
    const latePercent = dateStats.total > 0 ? Math.round((dateStats.late / dateStats.total) * 100) : 0;
    const missingPercent = dateStats.total > 0 ? Math.round((dateStats.missing / dateStats.total) * 100) : 0;
    const reportPercent = dateStats.total > 0 ? Math.round((dateStats.withReport / dateStats.total) * 100) : 0;

    const getHistoryStatusBadge = (status: EmployeeAttendance['status']) => {
      if (status === 'ontime') {
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Đúng giờ</Badge>;
      }
      if (status === 'late') {
        return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">Đi muộn</Badge>;
      }
      if (status === 'early-leave') {
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Về sớm</Badge>;
      }
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Thiếu công</Badge>;
    };

    return (
      <div className="space-y-4 p-5">
        <Card className="border-gray-200 !p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Lịch sử theo ngày</h2>
              <p className="mt-1 text-sm text-gray-500">
                Chọn ngày để xem các lượt chấm công đã ghi nhận, báo cáo công việc và trạng thái xử lý.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={handlePreviousDay} className="bg-white">
                <ChevronLeft className="size-4" />
              </Button>
              <div className="flex h-9 items-center gap-2 rounded-md border border-gray-200 bg-white px-3">
                <Calendar className="size-4 text-blue-600" />
                <input
                  type="date"
                  value={formatDateInputValue(selectedDate)}
                  onChange={(event) => {
                    const [year, month, day] = event.target.value.split('-').map(Number);
                    setSelectedDate(new Date(year, month - 1, day));
                  }}
                  className="h-7 w-[145px] bg-transparent text-sm font-semibold text-gray-900 outline-none"
                />
              </div>
              <Button size="sm" variant="outline" onClick={handleNextDay} className="bg-white">
                <ChevronRight className="size-4" />
              </Button>
              <Button size="sm" onClick={handleToday} className="bg-blue-600 hover:bg-blue-700">
                Hôm nay
              </Button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Tìm theo tên hoặc mã nhân viên..."
                className="pl-9"
              />
            </div>
            <select
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
              className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-blue-500"
            >
              <option value="all">Tất cả phòng ban</option>
              {attendanceDepartments.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </div>
        </Card>

        <Card className="border-gray-200 !p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                {getDayOfWeek(selectedDateLabel)}, {selectedDateLabel}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {attendanceForDate.length} bản ghi
                {departmentFilter !== 'all' ? ` • Phòng ${departmentFilter}` : ''}
                {searchQuery ? ` • Từ khóa "${searchQuery}"` : ''}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Tổng bản ghi</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{dateStats.total}</p>
            </div>
            <div className="rounded-lg border border-green-100 bg-green-50 p-3">
              <p className="text-xs text-green-700">Đúng giờ</p>
              <p className="mt-1 text-2xl font-bold text-green-700">{dateStats.ontime}</p>
              <p className="text-xs text-green-700">{ontimePercent}%</p>
            </div>
            <div className="rounded-lg border border-orange-100 bg-orange-50 p-3">
              <p className="text-xs text-orange-700">Đi muộn</p>
              <p className="mt-1 text-2xl font-bold text-orange-700">{dateStats.late}</p>
              <p className="text-xs text-orange-700">{latePercent}%</p>
            </div>
            <div className="rounded-lg border border-red-100 bg-red-50 p-3">
              <p className="text-xs text-red-700">Thiếu công</p>
              <p className="mt-1 text-2xl font-bold text-red-700">{dateStats.missing}</p>
              <p className="text-xs text-red-700">{missingPercent}%</p>
            </div>
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
              <p className="text-xs text-blue-700">Có báo cáo</p>
              <p className="mt-1 text-2xl font-bold text-blue-700">{dateStats.withReport}</p>
              <p className="text-xs text-blue-700">{reportPercent}%</p>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden border-gray-200 shadow-sm">
          <div className="border-b border-gray-200 p-4">
            <h2 className="text-base font-semibold text-gray-900">Danh sách chấm công</h2>
            <p className="mt-1 text-sm text-gray-500">Hiển thị theo ngày đã chọn, không cần kéo ngang để xem đủ thông tin.</p>
          </div>

          <div className="space-y-3 bg-gray-50/60 p-4">
            {attendanceForDate.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 bg-white px-4 py-10 text-center">
                <p className="text-sm font-medium text-gray-700">Không có dữ liệu chấm công cho ngày này.</p>
                <p className="mt-1 text-xs text-gray-500">Hãy chọn ngày khác hoặc đổi bộ lọc phòng ban/tìm kiếm.</p>
              </div>
            ) : (
              attendanceForDate.map((record) => (
                <article key={`${record.employeeId}-${record.date}`} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="grid gap-4 lg:grid-cols-[minmax(220px,1fr)_minmax(240px,1fr)_minmax(190px,0.8fr)] lg:items-center">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 font-semibold text-white">
                        {record.employeeName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{record.employeeName}</p>
                        <p className="text-xs text-gray-500">{record.employeeId} • {record.department}</p>
                        <div className="mt-2">{getHistoryStatusBadge(record.status)}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 rounded-md bg-gray-50 px-3 py-2 text-sm">
                      <div>
                        <p className="text-xs text-gray-500">Giờ vào</p>
                        <p className="font-semibold text-gray-900">{record.checkIn}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Giờ ra</p>
                        <p className="font-semibold text-gray-900">{record.checkOut}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Tổng giờ</p>
                        <p className="font-semibold text-blue-700">{record.hours}</p>
                      </div>
                    </div>

                    <div className="min-w-0 space-y-2">
                      {record.workReport ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewWorkReport(null, record)}
                          className="w-full justify-center gap-2 border-blue-200 text-blue-600 hover:bg-blue-50"
                        >
                          <FileText className="size-4" />
                          Xem báo cáo ({record.workReport.tasks.length} việc)
                        </Button>
                      ) : (
                        <div className="rounded-md border border-dashed border-gray-200 px-3 py-2 text-center text-sm text-gray-400">
                          Chưa có báo cáo
                        </div>
                      )}
                      <p className="line-clamp-2 text-xs text-gray-500">{record.note || 'Không có ghi chú'}</p>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </Card>
      </div>
    );
  };

  const renderSimpleAttendanceHistoryPanel = () => {
    const selectedDateLabel = formatDate(selectedDate);

    const getHistoryStatusBadge = (status: EmployeeAttendance['status']) => {
      if (status === 'ontime') return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Đúng giờ</Badge>;
      if (status === 'late') return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">Đi muộn</Badge>;
      if (status === 'early-leave') return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Về sớm</Badge>;
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Thiếu công</Badge>;
    };

    return (
      <div className="space-y-3 p-4">
        <Card className="border-gray-200 !p-4 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-gray-900">Lịch sử chấm công</h2>
              <p className="mt-1 text-sm text-gray-500">
                {getDayOfWeek(selectedDateLabel)}, {selectedDateLabel}
                {departmentFilter !== 'all' ? ` • ${departmentFilter}` : ''}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={handlePreviousDay} className="bg-white">
                <ChevronLeft className="size-4" />
              </Button>
              <div className="flex h-9 items-center gap-2 rounded-md border border-gray-200 bg-white px-3">
                <Calendar className="size-4 text-blue-600" />
                <input
                  type="date"
                  value={formatDateInputValue(selectedDate)}
                  onChange={(event) => {
                    const [year, month, day] = event.target.value.split('-').map(Number);
                    setSelectedDate(new Date(year, month - 1, day));
                  }}
                  className="h-7 w-[145px] bg-transparent text-sm font-semibold text-gray-900 outline-none"
                />
              </div>
              <Button size="sm" variant="outline" onClick={handleNextDay} className="bg-white">
                <ChevronRight className="size-4" />
              </Button>
              <Button size="sm" onClick={handleToday} className="bg-blue-600 hover:bg-blue-700">
                Hôm nay
              </Button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_210px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Tìm nhân viên..."
                className="h-9 pl-9"
              />
            </div>
            <select
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
              className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-blue-500"
            >
              <option value="all">Tất cả phòng ban</option>
              {attendanceDepartments.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <div className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5">
              <span className="text-gray-500">Tổng </span>
              <span className="font-semibold text-gray-900">{dateStats.total}</span>
            </div>
            <div className="rounded-full border border-green-100 bg-green-50 px-3 py-1.5">
              <span className="text-green-700">Đúng giờ </span>
              <span className="font-semibold text-green-800">{dateStats.ontime}</span>
            </div>
            <div className="rounded-full border border-orange-100 bg-orange-50 px-3 py-1.5">
              <span className="text-orange-700">Đi muộn </span>
              <span className="font-semibold text-orange-800">{dateStats.late}</span>
            </div>
            <div className="rounded-full border border-red-100 bg-red-50 px-3 py-1.5">
              <span className="text-red-700">Thiếu </span>
              <span className="font-semibold text-red-800">{dateStats.missing}</span>
            </div>
            <div className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5">
              <span className="text-blue-700">Báo cáo </span>
              <span className="font-semibold text-blue-800">{dateStats.withReport}</span>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden border-gray-200 shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-900">Nhân viên</h2>
            <span className="text-xs text-gray-500">{attendanceForDate.length} bản ghi</span>
          </div>

          <div className="divide-y divide-gray-100">
            {attendanceForDate.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm font-medium text-gray-700">Không có dữ liệu chấm công cho ngày này.</p>
                <p className="mt-1 text-xs text-gray-500">Chọn ngày khác hoặc đổi bộ lọc.</p>
              </div>
            ) : (
              attendanceForDate.map((record) => (
                <article key={`${record.employeeId}-${record.date}`} className="px-4 py-3 transition-colors hover:bg-gray-50">
                  <div className="grid gap-3 lg:grid-cols-[minmax(230px,1fr)_260px_minmax(180px,0.7fr)] lg:items-center">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-semibold text-white">
                        {record.employeeName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{record.employeeName}</p>
                        <p className="text-xs text-gray-500">{record.employeeId} • {record.department}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="rounded-md bg-gray-50 px-2.5 py-1 font-medium text-gray-900">
                        {record.checkIn} - {record.checkOut}
                      </span>
                      <span className="text-xs text-gray-500">{record.hours}</span>
                      {getHistoryStatusBadge(record.status)}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      {record.workReport ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewWorkReport(null, record)}
                          className="gap-2 border-blue-200 text-blue-600 hover:bg-blue-50"
                        >
                          <FileText className="size-4" />
                          Báo cáo
                        </Button>
                      ) : (
                        <span className="text-xs text-gray-400">Chưa có báo cáo</span>
                      )}
                      {record.note && <span className="line-clamp-1 max-w-[180px] text-xs text-gray-500">{record.note}</span>}
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quản lý chấm công</h1>
          <p className="text-gray-500 mt-1">Xem lịch sử chấm công từng ngày và xét duyệt đơn bổ sung/điều chỉnh</p>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setActiveAttendancePopup('supplement')}
            className="gap-2 bg-white hover:bg-blue-50"
          >
            <FileText className="size-4 text-blue-600" />
            Đơn bổ sung
            <Badge className="ml-1 bg-blue-100 text-blue-700 hover:bg-blue-100">
              {filteredSupplementRequests.length}
            </Badge>
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setActiveAttendancePopup('adjustment')}
            className="gap-2 bg-white hover:bg-indigo-50"
          >
            <ArrowRight className="size-4 text-indigo-600" />
            Đơn điều chỉnh
            <Badge className="ml-1 bg-indigo-100 text-indigo-700 hover:bg-indigo-100">
              {filteredAdjustmentRequests.length}
            </Badge>
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setActiveAttendancePopup('history')}
            className="gap-2 bg-white hover:bg-gray-50"
          >
            <Calendar className="size-4 text-gray-700" />
            Lịch sử
            <Badge variant="outline" className="ml-1 bg-gray-50 text-gray-700">
              {attendanceForDate.length}
            </Badge>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Tìm theo tên, mã NV, lý do..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 border-gray-200 bg-gray-50 pl-10 focus:bg-white"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-[220px_minmax(0,1fr)] xl:min-w-[720px]">
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="h-11 w-full rounded-md border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tất cả phòng ban</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-2 rounded-lg bg-gray-100 p-1 md:grid-cols-4">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setStatusFilter('all')}
                className={`h-9 justify-between px-3 ${statusFilter === 'all' ? 'bg-white text-gray-900 shadow-sm hover:bg-white' : 'text-gray-600 hover:bg-white'}`}
              >
                <span>Tất cả</span>
                <Badge variant="outline" className="ml-2 bg-white text-gray-700">{stats.total}</Badge>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setStatusFilter('pending')}
                className={`h-9 justify-between px-3 ${statusFilter === 'pending' ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700' : 'text-gray-600 hover:bg-white'}`}
              >
                <span>Chờ duyệt</span>
                <Badge className={`ml-2 ${statusFilter === 'pending' ? 'bg-white/20 text-white hover:bg-white/20' : 'bg-blue-100 text-blue-700 hover:bg-blue-100'}`}>{stats.pending}</Badge>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setStatusFilter('approved')}
                className={`h-9 justify-between px-3 ${statusFilter === 'approved' ? 'bg-green-600 text-white shadow-sm hover:bg-green-700' : 'text-gray-600 hover:bg-white'}`}
              >
                <span>Đã duyệt</span>
                <Badge className={`ml-2 ${statusFilter === 'approved' ? 'bg-white/20 text-white hover:bg-white/20' : 'bg-green-100 text-green-700 hover:bg-green-100'}`}>{stats.approved}</Badge>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setStatusFilter('rejected')}
                className={`h-9 justify-between px-3 ${statusFilter === 'rejected' ? 'bg-red-600 text-white shadow-sm hover:bg-red-700' : 'text-gray-600 hover:bg-white'}`}
              >
                <span>Từ chối</span>
                <Badge className={`ml-2 ${statusFilter === 'rejected' ? 'bg-white/20 text-white hover:bg-white/20' : 'bg-red-100 text-red-700 hover:bg-red-100'}`}>{stats.rejected}</Badge>
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-200 bg-white p-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={handleToday}>
              <Calendar className="size-4" />
              Hôm nay
            </Button>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" className="size-9 rounded-full" onClick={handlePreviousDay}>
                <ChevronLeft className="size-4" />
              </Button>
              <Button size="icon" variant="ghost" className="size-9 rounded-full" onClick={handleNextDay}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold text-gray-900">{selectedMonthLabel}</h2>
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  {selectedWeekRange}
                </Badge>
                <Badge className="gap-2 bg-green-100 text-green-700 hover:bg-green-100">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-green-500" />
                  </span>
                  Realtime
                </Badge>
              </div>
              <p className="mt-1 text-sm text-gray-500">Theo dõi Start/End của nhân viên theo lịch tuần, click vào ca để xem chi tiết.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-10 items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3">
              <Calendar className="size-4 text-blue-600" />
              <input
                type="date"
                value={formatDateInputValue(selectedDate)}
                onChange={(event) => {
                  const [year, month, day] = event.target.value.split('-').map(Number);
                  setSelectedDate(new Date(year, month - 1, day));
                }}
                className="bg-transparent text-sm font-semibold text-gray-900 outline-none"
              />
            </div>
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">{liveStats.online} online</Badge>
            <Badge variant="outline" className="bg-gray-50 text-gray-700">{liveStats.offline} offline</Badge>
          </div>
        </div>

        <div className="grid min-h-[680px] lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="border-b border-gray-200 bg-gray-50/70 p-4 lg:border-b-0 lg:border-r">
            <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
              <p className="text-sm font-semibold text-gray-900">Trạng thái ngày chọn</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md border border-gray-100 bg-white p-2">
                  <p className="text-lg font-bold text-gray-900">{liveStats.total}</p>
                  <p className="text-[11px] text-gray-500">Tổng</p>
                </div>
                <div className="rounded-md border border-green-100 bg-white p-2">
                  <p className="text-lg font-bold text-green-700">{liveStats.online}</p>
                  <p className="text-[11px] text-green-700">Online</p>
                </div>
                <div className="rounded-md border border-gray-100 bg-white p-2">
                  <p className="text-lg font-bold text-gray-700">{liveStats.offline}</p>
                  <p className="text-[11px] text-gray-500">Offline</p>
                </div>
              </div>
              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                  <span>Tỷ lệ online</span>
                  <span className="font-semibold text-green-700">{liveOnlinePercent}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${liveOnlinePercent}%` }} />
                </div>
              </div>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-sm font-semibold text-gray-900">Phòng ban</p>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setLiveDepartmentFilter('all')}
                  className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition ${liveDepartmentFilter === 'all' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
                >
                  <span>Tất cả</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold">{allLiveStats.online}/{allLiveStats.total}</span>
                </button>
                {liveDepartmentStats.map((department) => (
                  <button
                    key={department.department}
                    type="button"
                    onClick={() => setLiveDepartmentFilter(department.department)}
                    className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition ${liveDepartmentFilter === department.department ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
                  >
                    <span>{department.department}</span>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold">{department.online}/{department.total}</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <div className="min-w-0 overflow-x-auto">
            <div className="min-w-[980px]">
              <div className="grid grid-cols-[64px_repeat(7,minmax(120px,1fr))] border-b border-gray-200 bg-white">
                <div className="border-r border-gray-100 px-3 py-3 text-xs font-semibold text-gray-400">GMT+7</div>
                {weekDays.map((day) => {
                  const dayKey = formatDate(day);
                  const isSelected = dayKey === formatDate(selectedDate);
                  const dayName = day.toLocaleDateString('vi-VN', { weekday: 'short' });

                  return (
                    <div key={dayKey} className={`border-r border-gray-100 px-3 py-3 text-center ${isSelected ? 'bg-blue-50' : ''}`}>
                      <p className="text-[11px] font-semibold uppercase text-gray-500">{dayName}</p>
                      <button
                        type="button"
                        onClick={() => setSelectedDate(day)}
                        className={`mt-1 inline-flex size-9 items-center justify-center rounded-full text-sm font-bold ${isSelected ? 'bg-blue-600 text-white' : 'text-gray-800 hover:bg-gray-100'}`}
                      >
                        {day.getDate()}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="relative grid grid-cols-[64px_repeat(7,minmax(120px,1fr))]">
                <div className="border-r border-gray-100 bg-white">
                  {weekTimeSlots.map((hour) => (
                    <div key={hour} className="h-16 border-b border-gray-100 pr-2 pt-1 text-right text-xs text-gray-500">
                      {hour}:00
                    </div>
                  ))}
                </div>

                {weekDays.map((day) => {
                  const dayKey = formatDate(day);
                  const dayIndex = weekDateKeys.indexOf(dayKey);
                  const isSelected = dayKey === formatDate(selectedDate);

                  return (
                    <div key={dayKey} className={`relative h-[1024px] border-r border-gray-100 ${isSelected ? 'bg-blue-50/40' : 'bg-white'}`}>
                      {weekTimeSlots.map((hour) => (
                        <div key={hour} className="h-16 border-b border-gray-100" />
                      ))}
                      {calendarEvents
                        .filter((event) => event.dayIndex === dayIndex)
                        .map((event) => {
                          const isOnline = event.status === 'online';

                          return (
                            <button
                              key={`${event.employeeId}-${event.date}`}
                              type="button"
                              onClick={() => setSelectedCalendarEvent(event)}
                              className={`absolute left-2 right-2 overflow-hidden rounded-md border p-2 text-left text-xs shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${isOnline ? 'border-cyan-200 bg-cyan-300/90 text-slate-900' : 'border-slate-200 bg-slate-100 text-slate-600'}`}
                              style={{ top: `${event.top}%`, height: `${event.height}%` }}
                            >
                              <div className="flex items-start justify-between gap-1">
                                <span className="line-clamp-2 font-semibold leading-snug">{event.employeeName}</span>
                                <span className={`mt-0.5 size-2 shrink-0 rounded-full ${isOnline ? 'bg-green-600' : 'bg-gray-400'}`} />
                              </div>
                              <p className="mt-1 truncate font-medium">{event.employeeId} • {event.department}</p>
                              <p className="mt-1 truncate">{event.durationLabel}</p>
                              <p className="truncate text-[11px] opacity-80">Cập nhật {event.lastUpdated || '-'}</p>
                            </button>
                          );
                        })}
                    </div>
                  );
                })}

                {calendarEvents.length === 0 && (
                  <div className="pointer-events-none absolute inset-x-[64px] top-24 flex justify-center">
                    <div className="rounded-lg border border-dashed border-gray-300 bg-white/90 px-5 py-4 text-center shadow-sm">
                      <p className="text-sm font-semibold text-gray-800">Chưa có ca chấm công trong tuần này</p>
                      <p className="mt-1 text-xs text-gray-500">Hãy đổi ngày hoặc phòng ban để xem dữ liệu khác.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="hidden overflow-hidden border border-gray-200 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900">Theo dõi chấm công realtime</h2>
              <Badge className="gap-2 bg-green-100 text-green-700 hover:bg-green-100">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-green-500" />
                </span>
                Live
              </Badge>
            </div>
            <p className="text-sm text-gray-600">
              Chọn ngày và phòng ban để xem nhanh số người Online/Offline.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" className="bg-white" onClick={handlePreviousDay}>
              <ChevronLeft className="size-4" />
            </Button>
            <div className="flex h-10 items-center gap-2 rounded-md border border-blue-200 bg-white px-3">
              <Calendar className="size-4 text-blue-600" />
              <input
                type="date"
                value={selectedDate.toISOString().split('T')[0]}
                onChange={(event) => setSelectedDate(new Date(event.target.value))}
                className="bg-transparent text-sm font-semibold text-gray-900 outline-none"
              />
            </div>
            <Button size="sm" variant="outline" className="bg-white" onClick={handleNextDay}>
              <ChevronRight className="size-4" />
            </Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={handleToday}>
              Hôm nay
            </Button>
          </div>
        </div>

        <div className="border-b border-gray-100 bg-gray-50/60 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">Lọc theo phòng ban</p>
              <p className="text-xs text-gray-500">Số bên phải là Online/Tổng nhân sự của phòng.</p>
            </div>
            <Badge variant="outline" className="w-fit bg-white text-gray-700">
              {formatDate(selectedDate)}
            </Badge>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={liveDepartmentFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setLiveDepartmentFilter('all')}
              className={`h-auto gap-2 px-3 py-2 ${liveDepartmentFilter === 'all' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-white'}`}
            >
              <span>Tất cả</span>
              <span className={`rounded-full px-2 py-0.5 text-xs ${liveDepartmentFilter === 'all' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'}`}>
                {allLiveStats.online}/{allLiveStats.total}
              </span>
            </Button>
            {liveDepartmentStats.map((department) => (
              <Button
                key={department.department}
                type="button"
                size="sm"
                variant={liveDepartmentFilter === department.department ? 'default' : 'outline'}
                onClick={() => setLiveDepartmentFilter(department.department)}
                className={`h-auto gap-2 px-3 py-2 ${liveDepartmentFilter === department.department ? 'bg-blue-600 hover:bg-blue-700' : 'bg-white'}`}
              >
                <span>{department.department}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${liveDepartmentFilter === department.department ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'}`}>
                  {department.online}/{department.total}
                </span>
              </Button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 border-b border-gray-100 p-4 md:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500">Tổng nhân sự</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{liveStats.total}</p>
          </div>
          <div className="rounded-lg border border-green-100 bg-green-50 p-4">
            <p className="text-xs text-green-700">Đang online</p>
            <p className="mt-1 text-2xl font-bold text-green-700">{liveStats.online}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs text-gray-600">Đã offline</p>
            <p className="mt-1 text-2xl font-bold text-gray-700">{liveStats.offline}</p>
          </div>
        </div>

        <div className="border-b border-gray-100 px-4 py-3">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">Tỷ lệ đang online</span>
            <span className="font-semibold text-green-700">{liveOnlinePercent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{ width: `${liveOnlinePercent}%` }}
            />
          </div>
        </div>

        <div className="p-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Trạng thái nhân viên</h3>
              <p className="text-xs text-gray-500">Online được ưu tiên ở trên, Offline hiển thị mờ để dễ theo dõi.</p>
            </div>
            <Badge className="w-fit bg-green-100 text-green-700 hover:bg-green-100">
              {liveStats.online} online / {liveStats.total} nhân viên
            </Badge>
          </div>

          {liveVisibleEmployees.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center">
              <p className="text-sm font-medium text-gray-700">Chưa có dữ liệu nhân viên trong bộ lọc này.</p>
              <p className="mt-1 text-xs text-gray-500">Hãy đổi phòng ban hoặc chọn ngày khác để kiểm tra.</p>
            </div>
          ) : (
            <div className="max-h-[460px] overflow-y-auto rounded-lg border border-gray-200 bg-white">
              <div className="divide-y divide-gray-100">
                {liveVisibleEmployees.map((record) => {
                  const isOnline = record.status === 'online';
                  const isOvernight = Boolean(record.checkOutDate && record.checkOutDate !== record.date);
                  const checkOutLabel = record.checkOut
                    ? `${record.checkOut}${isOvernight ? ` • ${record.checkOutDate}` : ''}`
                    : '-';

                  return (
                  <div
                    key={`${record.employeeId}-${record.date}`}
                    className={`flex flex-col gap-3 p-4 transition-colors sm:flex-row sm:items-center sm:justify-between ${isOnline ? 'hover:bg-green-50/50' : 'bg-gray-50/60 text-gray-500 hover:bg-gray-100'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex size-11 shrink-0 items-center justify-center rounded-full font-semibold text-white ${isOnline ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gray-400'}`}>
                        {record.employeeName.charAt(0)}
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${isOnline ? 'text-gray-900' : 'text-gray-600'}`}>{record.employeeName}</p>
                        <p className="text-xs text-gray-500">{record.employeeId} • {record.department}</p>
                        {isOvernight && (
                          <Badge variant="outline" className="mt-1 border-amber-200 bg-amber-50 text-amber-700">
                            Ca qua ngày
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-3 text-sm sm:grid-cols-4 sm:items-center sm:text-right">
                      <div>
                        <p className="text-xs text-gray-500">Giờ vào</p>
                        <p className={isOnline ? 'font-semibold text-green-700' : 'font-semibold text-gray-700'}>
                          {record.checkIn || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Giờ ra</p>
                        <p className="font-semibold text-gray-700">{checkOutLabel}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Cập nhật</p>
                        <p className="font-semibold text-gray-800">{record.lastUpdated || '-'}</p>
                      </div>
                      {isOnline ? (
                        <Badge className="w-fit justify-self-start gap-2 bg-green-100 text-green-700 hover:bg-green-100 sm:justify-self-end">
                          <span className="relative flex size-2">
                            <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
                            <span className="relative inline-flex size-2 rounded-full bg-green-500" />
                          </span>
                          Online
                        </Badge>
                      ) : (
                        <Badge className="w-fit justify-self-start gap-2 bg-gray-100 text-gray-600 hover:bg-gray-100 sm:justify-self-end">
                          <span className="size-2 rounded-full bg-gray-400" />
                          Offline
                        </Badge>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Card>

      <Dialog
        open={activeAttendancePopup === 'history'}
        onOpenChange={(open) => setActiveAttendancePopup(open ? 'history' : null)}
      >
        <DialogContent className="max-h-[88vh] overflow-y-auto p-0 sm:max-w-[1020px]">
          <DialogHeader className="border-b border-gray-200 p-5">
            <DialogTitle className="text-xl">Lịch sử chấm công</DialogTitle>
            <DialogDescription>
              Xem chi tiết chấm công, báo cáo công việc và trạng thái theo ngày.
            </DialogDescription>
          </DialogHeader>

          {renderSimpleAttendanceHistoryPanel()}
          <div className="hidden">
          {/* Date Selector Card */}
          <Card className="!gap-2 border-gray-200 !p-4 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Chọn ngày xem chấm công</h2>
                <p className="text-sm text-gray-600">Xem chi tiết chấm công của tất cả nhân viên theo từng ngày</p>
              </div>
              
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleToday}
                  className="bg-white"
                >
                  Hôm nay
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePreviousDay}
                  className="bg-white"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-200 min-w-[200px]">
                  <Calendar className="size-5 text-blue-600" />
                  <input
                    type="date"
                    value={selectedDate.toISOString().split('T')[0]}
                    onChange={(e) => setSelectedDate(new Date(e.target.value))}
                    className="outline-none font-semibold text-gray-900"
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleNextDay}
                  className="bg-white"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </Card>

          {/* Date Info Banner */}
          <Card className="!gap-2 border-gray-200 !p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold mb-1">
                  {getDayOfWeek(formatDate(selectedDate))}, {formatDate(selectedDate)}
                </h3>
                <p className="text-gray-500">
                  Có {dateStats.total} nhân viên chấm công trong ngày này
                </p>
              </div>
            </div>
          </Card>

          {/* Daily Stats */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <MetricCard
              title="Tổng nhân viên"
              value={dateStats.total}
              description="Đã chấm công"
              icon={<Users className="size-5" />}
              tone="slate"
            />
            <MetricCard
              title="Đúng giờ"
              value={dateStats.ontime}
              description={`${dateStats.total > 0 ? Math.round((dateStats.ontime / dateStats.total) * 100) : 0}% nhân viên`}
              icon={<CheckCircle className="size-5" />}
              tone="emerald"
            />
            <MetricCard
              title="Đi muộn"
              value={dateStats.late}
              description={`${dateStats.total > 0 ? Math.round((dateStats.late / dateStats.total) * 100) : 0}% nhân viên`}
              icon={<Clock className="size-5" />}
              tone="orange"
            />
            <MetricCard
              title="Vắng mặt"
              value={dateStats.missing}
              description={`${dateStats.total > 0 ? Math.round((dateStats.missing / dateStats.total) * 100) : 0}% nhân viên`}
              icon={<XCircle className="size-5" />}
              tone="red"
            />
            <MetricCard
              title="Có báo cáo"
              value={dateStats.withReport}
              description={`${dateStats.total > 0 ? Math.round((dateStats.withReport / dateStats.total) * 100) : 0}% nhân viên`}
              icon={<FileText className="size-5" />}
              tone="blue"
            />
          </div>

          <div className="hidden grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="p-5 bg-gradient-to-br from-gray-50 to-white border-gray-200">
              <div>
                <p className="text-xs text-gray-600 mb-1">Tổng nhân viên</p>
                <p className="text-3xl font-bold text-gray-900">{dateStats.total}</p>
                <p className="text-xs text-gray-500 mt-1">Đã chấm công</p>
              </div>
            </Card>

            <Card className="p-5 bg-gradient-to-br from-green-50 to-white border-green-200">
              <div>
                <p className="text-xs text-gray-600 mb-1">Đúng giờ</p>
                <p className="text-3xl font-bold text-green-600">{dateStats.ontime}</p>
                <p className="text-xs text-gray-500 mt-1">{dateStats.total > 0 ? Math.round((dateStats.ontime / dateStats.total) * 100) : 0}% nhân viên</p>
              </div>
            </Card>

            <Card className="p-5 bg-gradient-to-br from-orange-50 to-white border-orange-200">
              <div>
                <p className="text-xs text-gray-600 mb-1">Đi muộn</p>
                <p className="text-3xl font-bold text-orange-600">{dateStats.late}</p>
                <p className="text-xs text-gray-500 mt-1">{dateStats.total > 0 ? Math.round((dateStats.late / dateStats.total) * 100) : 0}% nhân viên</p>
              </div>
            </Card>

            <Card className="p-5 bg-gradient-to-br from-red-50 to-white border-red-200">
              <div>
                <p className="text-xs text-gray-600 mb-1">Vắng mặt</p>
                <p className="text-3xl font-bold text-red-600">{dateStats.missing}</p>
                <p className="text-xs text-gray-500 mt-1">{dateStats.total > 0 ? Math.round((dateStats.missing / dateStats.total) * 100) : 0}% nhân viên</p>
              </div>
            </Card>

            <Card className="p-5 bg-gradient-to-br from-cyan-50 to-white border-cyan-200">
              <div>
                <p className="text-xs text-gray-600 mb-1">Có báo cáo</p>
                <p className="text-3xl font-bold text-cyan-600">{dateStats.withReport}</p>
                <p className="text-xs text-gray-500 mt-1">{dateStats.total > 0 ? Math.round((dateStats.withReport / dateStats.total) * 100) : 0}% nhân viên</p>
              </div>
            </Card>
          </div>

          {/* Attendance Table */}
          <Card className="shadow-lg">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Chi tiết chấm công - {formatDate(selectedDate)}</h2>
              <p className="text-sm text-gray-600 mt-1">
                {attendanceForDate.length} nhân viên
                {searchQuery && ` (đang lọc: "${searchQuery}")`}
                {departmentFilter !== 'all' && ` • Phòng: ${departmentFilter}`}
              </p>
            </div>
            
            <div className="overflow-x-auto">
              {attendanceForDate.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-gray-500">Không có dữ liệu chấm công cho ngày này</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Nhân viên</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Giờ vào</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Giờ ra</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Tổng giờ</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Trạng thái</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Báo cáo</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {attendanceForDate.map((record, index) => (
                      <tr key={index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="size-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                              {record.employeeName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{record.employeeName}</p>
                              <p className="text-xs text-gray-500">{record.employeeId} - {record.department}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-700">{record.checkIn}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-700">{record.checkOut}</td>
                        <td className="px-6 py-4 text-sm font-medium text-blue-600">{record.hours}</td>
                        <td className="px-6 py-4">
                          <Badge
                            className={
                              record.status === 'ontime'
                                ? 'bg-green-600'
                                : record.status === 'late'
                                ? 'bg-orange-600'
                                : record.status === 'early-leave'
                                ? 'bg-yellow-600'
                                : 'bg-red-600'
                            }
                          >
                            {record.status === 'ontime'
                              ? 'Đúng giờ'
                              : record.status === 'late'
                              ? 'Đi muộn'
                              : record.status === 'early-leave'
                              ? 'Về sớm'
                              : 'Thiếu'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          {record.workReport ? (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewWorkReport(null, record)}
                                className="gap-2 border-blue-200 text-blue-600 hover:bg-blue-50"
                              >
                                <Eye className="size-4" />
                                Xem
                              </Button>
                              <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs" variant="outline">
                                📋 {record.workReport.tasks.length} tasks
                              </Badge>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">Chưa có</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{record.note || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeAttendancePopup === 'supplement'}
        onOpenChange={(open) => setActiveAttendancePopup(open ? 'supplement' : null)}
      >
        <DialogContent className="max-h-[86vh] overflow-y-auto overflow-x-hidden p-0 sm:max-w-[900px]">
          <DialogHeader className="border-b border-gray-200 p-5">
            <DialogTitle className="text-xl">Đơn bổ sung chấm công</DialogTitle>
            <DialogDescription>
              Nhân viên gửi đơn khi quên chấm công hoặc thiếu lượt vào/ra.
            </DialogDescription>
          </DialogHeader>
          <div className="p-5">
            {renderCompactRequestList(
              filteredSupplementRequests,
              'Đơn bổ sung chấm công',
              'Nhân viên gửi đơn khi quên chấm công hoặc thiếu lượt vào/ra.'
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeAttendancePopup === 'adjustment'}
        onOpenChange={(open) => setActiveAttendancePopup(open ? 'adjustment' : null)}
      >
        <DialogContent className="max-h-[86vh] overflow-y-auto overflow-x-hidden p-0 sm:max-w-[900px]">
          <DialogHeader className="border-b border-gray-200 p-5">
            <DialogTitle className="text-xl">Đơn điều chỉnh giờ chấm công</DialogTitle>
            <DialogDescription>
              Dùng cho trường hợp nhân viên cần sửa giờ vào/ra đã ghi nhận.
            </DialogDescription>
          </DialogHeader>
          <div className="p-5">
            {renderCompactRequestList(
              filteredAdjustmentRequests,
              'Đơn điều chỉnh giờ chấm công',
              'Dùng cho trường hợp nhân viên cần sửa giờ vào/ra đã ghi nhận.'
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedCalendarEvent)} onOpenChange={(open) => !open && setSelectedCalendarEvent(null)}>
        <DialogContent className="sm:max-w-[460px]">
          {selectedCalendarEvent && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-3">
                  <div className={`flex size-12 items-center justify-center rounded-full font-bold text-white ${selectedCalendarEvent.status === 'online' ? 'bg-blue-600' : 'bg-gray-500'}`}>
                    {selectedCalendarEvent.employeeName.charAt(0)}
                  </div>
                  <div>
                    <DialogTitle>{selectedCalendarEvent.employeeName}</DialogTitle>
                    <DialogDescription>
                      {selectedCalendarEvent.employeeId} • {selectedCalendarEvent.department}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                <div className={`rounded-lg border p-3 ${selectedCalendarEvent.status === 'online' ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Trạng thái</span>
                    <Badge className={selectedCalendarEvent.status === 'online' ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-gray-200 text-gray-700 hover:bg-gray-200'}>
                      {selectedCalendarEvent.status === 'online' ? 'Online' : 'Offline'}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-gray-200 p-3">
                    <p className="text-xs text-gray-500">Ngày</p>
                    <p className="mt-1 font-semibold text-gray-900">{selectedCalendarEvent.date}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-3">
                    <p className="text-xs text-gray-500">Cập nhật</p>
                    <p className="mt-1 font-semibold text-gray-900">{selectedCalendarEvent.lastUpdated || '-'}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-3">
                    <p className="text-xs text-gray-500">Giờ vào</p>
                    <p className="mt-1 font-semibold text-green-700">{selectedCalendarEvent.checkIn || '-'}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-3">
                    <p className="text-xs text-gray-500">Giờ ra</p>
                    <p className="mt-1 font-semibold text-gray-900">{selectedCalendarEvent.checkOut || '-'}</p>
                  </div>
                </div>

                {selectedCalendarEvent.checkOutDate && selectedCalendarEvent.checkOutDate !== selectedCalendarEvent.date && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    Ca này kết thúc vào ngày {selectedCalendarEvent.checkOutDate}.
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedCalendarEvent(null)}>
                  Đóng
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={(open) => (open ? setShowDetailDialog(true) : closeDetailDialog())}>
        <DialogContent className="sm:max-w-[600px]">
          {selectedRequest && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="size-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {selectedRequest.employeeName.charAt(0)}
                  </div>
                  <div>
                    <DialogTitle className="text-xl">{selectedRequest.employeeName}</DialogTitle>
                    <DialogDescription>
                      {selectedRequest.employeeId} - {selectedRequest.department}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-600">Loại đơn</Label>
                    <Badge className={selectedRequest.type === 'supplement' ? 'bg-purple-600 mt-1' : 'bg-indigo-600 mt-1'}>
                      {selectedRequest.type === 'supplement' ? '📋 Bổ sung' : '🔄 Điều chỉnh'}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Trạng thái</Label>
                    <div className="mt-1">
                      <Badge
                        className={
                          selectedRequest.status === 'approved'
                            ? 'bg-green-600'
                            : selectedRequest.status === 'rejected'
                            ? 'bg-red-600'
                            : 'bg-yellow-600'
                        }
                      >
                        {selectedRequest.status === 'approved' 
                          ? '✓ Đã duyệt' 
                          : selectedRequest.status === 'rejected'
                          ? '✗ Từ chối'
                          : '⏳ Chờ duyệt'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-sm text-gray-600">Ngày cần {selectedRequest.type === 'supplement' ? 'bổ sung' : 'điều chỉnh'}</Label>
                  <p className="font-semibold mt-1">{selectedRequest.date}</p>
                </div>

                {selectedRequest.type === 'adjustment' && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <Label className="text-sm font-medium text-yellow-900 mb-2 block">Thông tin gốc:</Label>
                    <div className="grid grid-cols-2 gap-2 text-sm text-yellow-800">
                      <div>Giờ vào: <span className="font-semibold">{selectedRequest.originalCheckIn}</span></div>
                      <div>Giờ ra: <span className="font-semibold">{selectedRequest.originalCheckOut}</span></div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-600">Giờ vào {selectedRequest.type === 'adjustment' ? 'mới' : ''}</Label>
                    <p className="font-semibold mt-1">{selectedRequest.checkIn}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Giờ ra {selectedRequest.type === 'adjustment' ? 'mới' : ''}</Label>
                    <p className="font-semibold mt-1">{selectedRequest.checkOut}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm text-gray-600">Lý do</Label>
                  <p className="text-gray-900 mt-1 bg-gray-50 p-3 rounded-lg">{selectedRequest.reason}</p>
                </div>

                <div>
                  <Label className="text-sm text-gray-600">Gửi lúc</Label>
                  <p className="font-medium mt-1">{selectedRequest.submittedAt}</p>
                </div>

                {selectedRequest.workReport && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium text-blue-900">📋 Có báo cáo công việc</Label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          closeDetailDialog(false);
                          handleViewWorkReport(selectedRequest);
                        }}
                        className="border-blue-300 text-blue-700 hover:bg-blue-100"
                      >
                        <Eye className="size-4 mr-1" />
                        Xem báo cáo
                      </Button>
                    </div>
                    <p className="text-sm text-blue-700">
                      {selectedRequest.workReport.title}
                    </p>
                  </div>
                )}

                {selectedRequest.status !== 'pending' && (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <Label className="text-sm text-gray-600 mb-2 block">Phản hồi từ HR</Label>
                    <div className="space-y-2">
                      <p className="text-sm">
                        <span className="font-medium">Người xử lý:</span> {selectedRequest.reviewedBy}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Thời gian:</span> {selectedRequest.reviewedAt}
                      </p>
                      {selectedRequest.reviewNote && (
                        <p className="text-sm bg-white p-2 rounded">
                          <span className="font-medium">Ghi chú:</span> {selectedRequest.reviewNote}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                {selectedRequest.status === 'pending' ? (
                  <div className="flex gap-2 w-full">
                    <Button variant="outline" onClick={() => closeDetailDialog()} className="flex-1">
                      Đóng
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        closeDetailDialog(false);
                        handleOpenActionDialog(selectedRequest, 'reject');
                      }}
                      className="flex-1"
                    >
                      <XCircle className="size-4 mr-2" />
                      Từ chối
                    </Button>
                    <Button
                      className="bg-green-600 hover:bg-green-700 flex-1"
                      onClick={() => {
                        closeDetailDialog(false);
                        handleOpenActionDialog(selectedRequest, 'approve');
                      }}
                    >
                      <CheckCircle className="size-4 mr-2" />
                      Phê duyệt
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" onClick={() => closeDetailDialog()}>
                    Đóng
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Dialog (Approve/Reject) */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="sm:max-w-[500px]">
          {selectedRequest && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`size-12 ${actionType === 'approve' ? 'bg-green-600' : 'bg-red-600'} rounded-xl flex items-center justify-center text-white shadow-md`}>
                    {actionType === 'approve' ? <CheckCircle className="size-6" /> : <XCircle className="size-6" />}
                  </div>
                  <div>
                    <DialogTitle className="text-xl">
                      {actionType === 'approve' ? 'Phê duyệt đơn' : 'Từ chối đơn'}
                    </DialogTitle>
                    <DialogDescription>
                      {selectedRequest.employeeName} - {selectedRequest.date}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">Thông tin đơn:</p>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Loại:</span> {selectedRequest.type === 'supplement' ? 'Bổ sung' : 'Điều chỉnh'}</p>
                    <p><span className="font-medium">Giờ vào:</span> {selectedRequest.checkIn}</p>
                    <p><span className="font-medium">Giờ ra:</span> {selectedRequest.checkOut}</p>
                  </div>
                </div>

                <div>
                  <Label>Ghi chú {actionType === 'approve' ? '(tùy chọn)' : '(bắt buộc)'}</Label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mt-2"
                    rows={4}
                    placeholder={
                      actionType === 'approve'
                        ? 'Thêm ghi chú nếu cần...'
                        : 'Nhập lý do từ chối...'
                    }
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowActionDialog(false)}>
                  Hủy
                </Button>
                <Button
                  className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                  onClick={handleSubmitReview}
                >
                  {actionType === 'approve' ? (
                    <>
                      <CheckCircle className="size-4 mr-2" />
                      Xác nhận phê duyệt
                    </>
                  ) : (
                    <>
                      <XCircle className="size-4 mr-2" />
                      Xác nhận từ chối
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Work Report View Dialog */}
      <Dialog open={showWorkReportDialog} onOpenChange={setShowWorkReportDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          {(selectedRequest?.workReport || selectedAttendance?.workReport) && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="size-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md">
                    <FileText className="size-6" />
                  </div>
                  <div className="flex-1">
                    <DialogTitle className="text-xl">
                      {selectedRequest?.workReport?.title || selectedAttendance?.workReport?.title}
                    </DialogTitle>
                    <DialogDescription>
                      Báo cáo công việc của {selectedRequest?.employeeName || selectedAttendance?.employeeName} - {selectedRequest?.date || selectedAttendance?.date}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                {/* Employee Info */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="size-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {(selectedRequest?.employeeName || selectedAttendance?.employeeName || '').charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{selectedRequest?.employeeName || selectedAttendance?.employeeName}</p>
                      <p className="text-xs text-gray-500">
                        {selectedRequest?.employeeId || selectedAttendance?.employeeId} - {selectedRequest?.department || selectedAttendance?.department}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <MessageSquare className="size-4 text-blue-600" />
                    Mô tả công việc
                  </h3>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                    {(selectedRequest?.workReport || selectedAttendance?.workReport)?.description}
                  </p>
                </div>

                {/* Tasks */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <ListChecks className="size-4 text-blue-600" />
                    Danh sách công việc ({(selectedRequest?.workReport || selectedAttendance?.workReport)?.tasks.length})
                  </h3>
                  <div className="space-y-2">
                    {(selectedRequest?.workReport || selectedAttendance?.workReport)?.tasks.map((task, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="mt-1">
                          {task.status === 'completed' ? (
                            <CheckCircle className="size-5 text-green-600" />
                          ) : task.status === 'in-progress' ? (
                            <Clock className="size-5 text-orange-600" />
                          ) : (
                            <AlertTriangle className="size-5 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{task.name}</p>
                          {task.duration && (
                            <p className="text-xs text-gray-600 mt-1">
                              ⏱️ Thời gian: {task.duration}
                            </p>
                          )}
                        </div>
                        <Badge
                          className={
                            task.status === 'completed'
                              ? 'bg-green-600'
                              : task.status === 'in-progress'
                              ? 'bg-orange-600'
                              : 'bg-gray-400'
                          }
                        >
                          {task.status === 'completed' ? 'Hoàn thành' : task.status === 'in-progress' ? 'Đang làm' : 'Chờ'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Achievements */}
                {((selectedRequest?.workReport || selectedAttendance?.workReport)?.achievements.length || 0) > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Target className="size-4 text-blue-600" />
                      Thành tựu đạt được
                    </h3>
                    <ul className="space-y-2">
                      {(selectedRequest?.workReport || selectedAttendance?.workReport)?.achievements.map((achievement, index) => (
                        <li key={index} className="flex items-start gap-2 text-gray-700">
                          <span className="text-green-600 mt-1">✓</span>
                          <span>{achievement}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Note */}
                {(selectedRequest?.workReport || selectedAttendance?.workReport)?.note && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Ghi chú</h3>
                    <p className="text-gray-700 bg-blue-50 p-3 rounded-lg border border-blue-100">
                      {(selectedRequest?.workReport || selectedAttendance?.workReport)?.note}
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowWorkReportDialog(false)}>
                  Đóng
                </Button>
                {selectedRequest && selectedRequest.status === 'pending' && (
                  <>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setShowWorkReportDialog(false);
                        handleOpenActionDialog(selectedRequest, 'reject');
                      }}
                    >
                      <XCircle className="size-4 mr-2" />
                      Từ chối
                    </Button>
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        setShowWorkReportDialog(false);
                        handleOpenActionDialog(selectedRequest, 'approve');
                      }}
                    >
                      <CheckCircle className="size-4 mr-2" />
                      Phê duyệt
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
