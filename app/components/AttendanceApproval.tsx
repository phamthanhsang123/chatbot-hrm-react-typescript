'use client';

import { useState, useMemo } from 'react';
import { CheckCircle, XCircle, Clock, Calendar, User, FileText, Eye, MessageSquare, ArrowRight, Search, Filter, ListChecks, Target, AlertTriangle, ChevronLeft, ChevronRight, Download, Users } from 'lucide-react';
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
import { Input } from './ui/input';

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

// Helper to parse DD/MM/YYYY to Date
const parseDate = (dateStr: string): Date | null => {
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1;
  const year = parseInt(parts[2]);
  return new Date(year, month, day);
};

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

export function AttendanceApproval() {
  const [selectedRequest, setSelectedRequest] = useState<AttendanceRequest | null>(null);
  const [selectedAttendance, setSelectedAttendance] = useState<EmployeeAttendance | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [showWorkReportDialog, setShowWorkReportDialog] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [reviewNote, setReviewNote] = useState('');
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Date selector for attendance history - default to today
  const [selectedDate, setSelectedDate] = useState(new Date(2026, 0, 17)); // 17/01/2026

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

  const supplementRequests = requests.filter(r => r.type === 'supplement');
  const adjustmentRequests = requests.filter(r => r.type === 'adjustment');

  // Get unique departments for filters
  const departments = useMemo(() => {
    const depts = new Set(requests.map(r => r.department));
    return Array.from(depts);
  }, [requests]);

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
    return allAttendance.filter(att => {
      const matchesDate = att.date === dateStr;
      const matchesSearch = 
        att.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        att.employeeId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDepartment = departmentFilter === 'all' || att.department === departmentFilter;
      
      return matchesDate && matchesSearch && matchesDepartment;
    }).sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  }, [allAttendance, selectedDate, searchQuery, departmentFilter]);

  // Calculate stats for selected date
  const dateStats = useMemo(() => {
    const total = attendanceForDate.length;
    const ontime = attendanceForDate.filter(a => a.status === 'ontime').length;
    const late = attendanceForDate.filter(a => a.status === 'late').length;
    const missing = attendanceForDate.filter(a => a.status === 'missing').length;
    const withReport = attendanceForDate.filter(a => a.workReport).length;
    
    return { total, ontime, late, missing, withReport };
  }, [attendanceForDate]);

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
    setSelectedDate(new Date(2026, 0, 17)); // Mock today as 17/01/2026
  };

  const handleViewDetail = (request: AttendanceRequest) => {
    setSelectedRequest(request);
    setShowDetailDialog(true);
  };

  const handleViewWorkReport = (request: AttendanceRequest | null, attendance: EmployeeAttendance | null = null) => {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Quản lý chấm công</h1>
        <p className="text-gray-500 mt-1">Xem lịch sử chấm công từng ngày và xét duyệt đơn bổ sung/điều chỉnh</p>
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

      {/* Filters */}
      <Card className="p-5">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <Label className="text-sm font-medium mb-2 block">Tìm kiếm</Label>
            <div className="relative">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Tìm theo tên, mã NV, lý do..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="w-full lg:w-48">
            <Label className="text-sm font-medium mb-2 block">Phòng ban</Label>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tất cả</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
          <div className="w-full lg:w-48">
            <Label className="text-sm font-medium mb-2 block">Trạng thái</Label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tất cả</option>
              <option value="pending">Chờ duyệt</option>
              <option value="approved">Đã duyệt</option>
              <option value="rejected">Từ chối</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="history" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1">
          <TabsTrigger value="history" className="data-[state=active]:bg-white">
            <Calendar className="size-4 mr-2" />
            Lịch sử chấm công
          </TabsTrigger>
          <TabsTrigger value="supplement" className="data-[state=active]:bg-white">
            <FileText className="size-4 mr-2" />
            Đơn bổ sung ({filteredSupplementRequests.length})
          </TabsTrigger>
          <TabsTrigger value="adjustment" className="data-[state=active]:bg-white">
            <ArrowRight className="size-4 mr-2" />
            Đơn điều chỉnh ({filteredAdjustmentRequests.length})
          </TabsTrigger>
        </TabsList>

        {/* Attendance History Tab */}
        <TabsContent value="history" className="mt-6 space-y-6">
          {/* Date Selector Card */}
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
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
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border-2 border-blue-300 min-w-[200px]">
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
          <Card className="p-6 bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold mb-1">
                  {getDayOfWeek(formatDate(selectedDate))}, {formatDate(selectedDate)}
                </h3>
                <p className="text-blue-100">
                  Có {dateStats.total} nhân viên chấm công trong ngày này
                </p>
              </div>
              <Button
                variant="outline"
                className="bg-white text-blue-600 hover:bg-blue-50 border-0"
                onClick={() => alert('Xuất báo cáo Excel')}
              >
                <Download className="size-4 mr-2" />
                Xuất báo cáo
              </Button>
            </div>
          </Card>

          {/* Daily Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
        </TabsContent>

        {/* Supplement Requests Tab */}
        <TabsContent value="supplement" className="mt-6">
          {renderRequestTable(filteredSupplementRequests)}
        </TabsContent>

        {/* Adjustment Requests Tab */}
        <TabsContent value="adjustment" className="mt-6">
          {renderRequestTable(filteredAdjustmentRequests)}
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
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
                          setShowDetailDialog(false);
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
                    <Button variant="outline" onClick={() => setShowDetailDialog(false)} className="flex-1">
                      Đóng
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setShowDetailDialog(false);
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
                        setShowDetailDialog(false);
                        handleOpenActionDialog(selectedRequest, 'approve');
                      }}
                    >
                      <CheckCircle className="size-4 mr-2" />
                      Phê duyệt
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
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
