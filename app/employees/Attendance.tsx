'use client';

import { useState, useMemo } from 'react';
import { Clock, Calendar, Download, MapPin, CheckCircle, XCircle, AlertTriangle, FileText, Send, Eye, Target, ListChecks, MessageSquareText, Plus, Trash2, Edit, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

// Helper function to get day of week in Vietnamese
const getDayOfWeek = (dateStr: string): string => {
  // Parse date in format DD/MM/YYYY
  const parts = dateStr.split('/');
  if (parts.length !== 3) return '';
  
  const day = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1; // Month is 0-indexed
  const year = parseInt(parts[2]);
  
  const date = new Date(year, month, day);
  const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  return days[date.getDay()];
};

// Helper function to check if a date is weekend
const isWeekend = (dateStr: string): boolean => {
  const dayOfWeek = getDayOfWeek(dateStr);
  return dayOfWeek === 'CN' || dayOfWeek === 'T7';
};

// Helper function to get week number
const getWeekNumber = (dateStr: string): number => {
  const parts = dateStr.split('/');
  if (parts.length !== 3) return 0;
  
  const day = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1;
  const year = parseInt(parts[2]);
  
  const date = new Date(year, month, day);
  const firstDayOfMonth = new Date(year, month, 1);
  const daysSinceFirst = Math.floor((date.getTime() - firstDayOfMonth.getTime()) / (1000 * 60 * 60 * 24));
  return Math.ceil((daysSinceFirst + firstDayOfMonth.getDay() + 1) / 7);
};

// Helper function to generate all working days in a month
const getWorkingDaysInMonth = (month: number, year: number): string[] => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const workingDays: string[] = [];
  
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${day.toString().padStart(2, '0')}/${(month + 1).toString().padStart(2, '0')}/${year}`;
    if (!isWeekend(dateStr)) {
      workingDays.push(dateStr);
    }
  }
  
  return workingDays;
};

// Helper function to get month name
const getMonthName = (month: number): string => {
  const months = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 
                 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
  return months[month];
};

interface MissingAttendance {
  date: string;
  reason: 'forgot' | 'technical' | 'other';
  status: 'missing';
}

interface AttendanceRequest {
  id: number;
  date: string;
  checkIn: string;
  checkOut: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  note?: string;
  type: 'supplement' | 'adjustment';
  originalCheckIn?: string;
  originalCheckOut?: string;
}

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

interface AttendanceRecord {
  date: string;
  checkIn: string;
  checkOut: string;
  hours: string;
  status: 'ontime' | 'late' | 'missing' | 'weekend';
  note: string;
  workReport?: WorkReport;
}

export function Attendance() {
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showWorkReportDialog, setShowWorkReportDialog] = useState(false);
  const [showCreateReportDialog, setShowCreateReportDialog] = useState(false);
  const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [requestCheckIn, setRequestCheckIn] = useState('');
  const [requestCheckOut, setRequestCheckOut] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [selectedWorkReport, setSelectedWorkReport] = useState<AttendanceRecord | null>(null);
  const [selectedRecordForAdjustment, setSelectedRecordForAdjustment] = useState<AttendanceRecord | null>(null);
  
  // Month/Year selector state
  const [selectedMonth, setSelectedMonth] = useState(0); // 0 = January
  const [selectedYear, setSelectedYear] = useState(2026);
  
  // Work Report Form State
  const [reportTitle, setReportTitle] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportTasks, setReportTasks] = useState<WorkReport['tasks']>([
    { name: '', status: 'completed', duration: '' }
  ]);
  const [reportAchievements, setReportAchievements] = useState<string[]>(['']);
  const [reportNote, setReportNote] = useState('');

  const todayStatus = {
    date: '18/01/2026',
    checkIn: '08:30',
    checkOut: '17:30',
    status: 'completed',
    location: 'Văn phòng',
    hasReport: false,
  };

  const thisMonth = {
    workingDays: 22,
    workedDays: 14,
    lateDays: 1,
    earlyDays: 0,
    absentDays: 0,
    totalHours: 112,
  };

  const [attendanceRequests, setAttendanceRequests] = useState<AttendanceRequest[]>([
    {
      id: 1,
      date: '07/01/2026',
      checkIn: '08:30',
      checkOut: '17:30',
      reason: 'Quên chấm công do họp khách hàng ngoài văn phòng',
      status: 'approved',
      submittedAt: '08/01/2026 09:00',
      note: 'Đã được phê duyệt bởi HR Manager',
      type: 'supplement',
    },
    {
      id: 2,
      date: '06/01/2026',
      checkIn: '08:25',
      checkOut: '17:25',
      reason: 'Lỗi hệ thống chấm công, không quét được vân tay',
      status: 'pending',
      submittedAt: '07/01/2026 08:30',
      type: 'supplement',
    },
    {
      id: 3,
      date: '14/01/2026',
      checkIn: '08:30',
      checkOut: '17:40',
      reason: 'Đã chấm công nhưng sai giờ ra, thực tế ra lúc 17:40 do làm thêm giờ',
      status: 'pending',
      submittedAt: '15/01/2026 08:00',
      type: 'adjustment',
      originalCheckIn: '08:20',
      originalCheckOut: '17:35',
    },
  ]);

  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([
    { 
      date: '17/01/2026', 
      checkIn: '08:25', 
      checkOut: '17:30', 
      hours: '8h 5m', 
      status: 'ontime', 
      note: '',
      workReport: {
        title: 'Phát triển tính năng Dashboard Analytics',
        description: 'Hoàn thành module Dashboard với biểu đồ thống kê real-time và tối ưu performance',
        tasks: [
          { name: 'Thiết kế UI/UX cho Dashboard', status: 'completed', duration: '2h 30m' },
          { name: 'Tích hợp Chart.js và xử lý data', status: 'completed', duration: '3h 15m' },
          { name: 'Code review và bug fixing', status: 'completed', duration: '1h 45m' },
          { name: 'Viết unit tests', status: 'in-progress', duration: '45m' },
        ],
        achievements: [
          'Hoàn thành 95% tính năng Dashboard',
          'Tối ưu load time từ 3s xuống 0.8s',
          'Fix 5 bugs critical từ QA team',
        ],
        note: 'Ngày mai sẽ hoàn thành phần unit tests và deploy lên staging'
      }
    },
    { 
      date: '16/01/2026', 
      checkIn: '08:35', 
      checkOut: '17:25', 
      hours: '7h 50m', 
      status: 'late', 
      note: 'Đi muộn 5 phút',
      workReport: {
        title: 'Họp khách hàng và lên kế hoạch Sprint mới',
        description: 'Meeting với khách hàng ABC Corp để review tiến độ và planning Sprint 5',
        tasks: [
          { name: 'Chuẩn bị tài liệu demo cho khách hàng', status: 'completed', duration: '1h 30m' },
          { name: 'Meeting với khách hàng ABC Corp', status: 'completed', duration: '2h 30m' },
          { name: 'Sprint Planning Meeting', status: 'completed', duration: '2h 0m' },
          { name: 'Update Jira tickets và assign tasks', status: 'completed', duration: '1h 0m' },
        ],
        achievements: [
          'Khách hàng hài lòng với demo, approve 100%',
          'Đã có roadmap rõ ràng cho Sprint 5',
          'Phân công task cho 5 team members',
        ]
      }
    },
    { 
      date: '15/01/2026', 
      checkIn: '08:28', 
      checkOut: '17:28', 
      hours: '8h 0m', 
      status: 'ontime', 
      note: '',
      workReport: {
        title: 'Refactor codebase và improve performance',
        description: 'Tối ưu hóa code hiện tại, refactor các components và cải thiện performance',
        tasks: [
          { name: 'Code refactoring cho module User Management', status: 'completed', duration: '3h 0m' },
          { name: 'Optimize database queries', status: 'completed', duration: '2h 30m' },
          { name: 'Update documentation', status: 'completed', duration: '1h 30m' },
          { name: 'Performance testing', status: 'completed', duration: '1h 0m' },
        ],
        achievements: [
          'Giảm 40% số dòng code duplicate',
          'API response time giảm từ 500ms xuống 150ms',
          'Code coverage tăng lên 85%',
        ]
      }
    },
    { 
      date: '14/01/2026', 
      checkIn: '08:20', 
      checkOut: '17:35', 
      hours: '8h 15m', 
      status: 'ontime', 
      note: '' 
    },
    { 
      date: '13/01/2026', 
      checkIn: '08:30', 
      checkOut: '17:30', 
      hours: '8h 0m', 
      status: 'ontime', 
      note: '' 
    },
    { 
      date: '10/01/2026', 
      checkIn: '08:27', 
      checkOut: '17:27', 
      hours: '8h 0m', 
      status: 'ontime', 
      note: '',
      workReport: {
        title: 'Fix bugs và deploy hotfix production',
        description: 'Xử lý các bugs critical từ production và deploy hotfix',
        tasks: [
          { name: 'Fix bug payment gateway timeout', status: 'completed', duration: '2h 0m' },
          { name: 'Fix memory leak ở module export', status: 'completed', duration: '2h 30m' },
          { name: 'Testing hotfix trên staging', status: 'completed', duration: '1h 30m' },
          { name: 'Deploy lên production', status: 'completed', duration: '1h 0m' },
        ],
        achievements: [
          'Fix thành công 3 bugs critical',
          'Zero downtime khi deploy',
          'Không có bugs mới phát sinh',
        ]
      }
    },
    { date: '09/01/2026', checkIn: '08:22', checkOut: '17:32', hours: '8h 10m', status: 'ontime', note: '' },
    { date: '08/01/2026', checkIn: '08:30', checkOut: '17:30', hours: '8h 0m', status: 'ontime', note: '' },
  ]);

  // Generate missing attendance (exclude weekends)
  const missingAttendance = useMemo(() => {
    const allWorkingDays = getWorkingDaysInMonth(selectedMonth, selectedYear);
    return allWorkingDays
      .filter(date => {
        // Check if this date doesn't have attendance record
        const hasRecord = attendanceHistory.some(record => record.date === date && record.status !== 'missing');
        const isPast = new Date(date.split('/').reverse().join('-')) < new Date();
        return !hasRecord && isPast;
      })
      .slice(0, 10)
      .map(date => ({
        date,
        reason: 'forgot' as const,
        status: 'missing' as const,
      }));
  }, [selectedMonth, selectedYear, attendanceHistory]);

  // Group attendance by week
  const groupedAttendance = useMemo(() => {
    const allDays = getWorkingDaysInMonth(selectedMonth, selectedYear);
    const grouped: { [week: number]: AttendanceRecord[] } = {};

    // First add all working days
    allDays.forEach(date => {
      const weekNum = getWeekNumber(date);
      if (!grouped[weekNum]) {
        grouped[weekNum] = [];
      }

      const existing = attendanceHistory.find(record => record.date === date);
      if (existing) {
        grouped[weekNum].push(existing);
      } else {
        // Add missing attendance
        grouped[weekNum].push({
          date,
          checkIn: '-',
          checkOut: '-',
          hours: '-',
          status: 'missing',
          note: 'Chưa chấm công',
        });
      }
    });

    // Sort each week by date
    Object.keys(grouped).forEach(week => {
      grouped[parseInt(week)].sort((a, b) => {
        const dateA = new Date(a.date.split('/').reverse().join('-'));
        const dateB = new Date(b.date.split('/').reverse().join('-'));
        return dateB.getTime() - dateA.getTime();
      });
    });

    return grouped;
  }, [selectedMonth, selectedYear, attendanceHistory]);

  const handlePreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const handleCheckIn = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    alert(
      `✅ Chấm công vào thành công!\n\n` +
      `Thời gian: ${timeStr}\n` +
      `Ngày: ${now.toLocaleDateString('vi-VN')}\n` +
      `Địa điểm: Văn phòng`
    );
  };

  const handleCheckOut = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    alert(
      `✅ Chấm công ra thành công!\n\n` +
      `Thời gian: ${timeStr}\n` +
      `Ngày: ${now.toLocaleDateString('vi-VN')}\n` +
      `Tổng giờ làm: 8h 30m`
    );
    
    // Prompt to create work report
    setTimeout(() => {
      const shouldCreate = confirm('💼 Bạn có muốn tạo báo cáo công việc cho ngày hôm nay không?');
      if (shouldCreate) {
        setShowCreateReportDialog(true);
      }
    }, 500);
  };

  const handleExport = () => {
    alert('📥 Đang xuất báo cáo chấm công...\n\nFile Excel sẽ được tải xuống.');
  };

  const handleOpenRequestDialog = (date?: string) => {
    if (date) {
      setSelectedDate(date);
    }
    setShowRequestDialog(true);
  };

  const handleCloseDialog = () => {
    setShowRequestDialog(false);
    setSelectedDate('');
    setRequestCheckIn('');
    setRequestCheckOut('');
    setRequestReason('');
  };

  const handleSubmitRequest = () => {
    if (!selectedDate || !requestCheckIn || !requestCheckOut || !requestReason) {
      alert('⚠️ Vui lòng điền đầy đủ thông tin!');
      return;
    }

    const newRequest: AttendanceRequest = {
      id: attendanceRequests.length + 1,
      date: selectedDate,
      checkIn: requestCheckIn,
      checkOut: requestCheckOut,
      reason: requestReason,
      status: 'pending',
      submittedAt: new Date().toLocaleString('vi-VN'),
      type: 'supplement',
    };

    setAttendanceRequests([newRequest, ...attendanceRequests]);
    handleCloseDialog();

    alert('✅ Đã gửi đơn bổ sung chấm công!\n\nHR sẽ xem xét và phê duyệt trong vòng 24h.');
  };

  const handleViewWorkReport = (record: AttendanceRecord) => {
    setSelectedWorkReport(record);
    setShowWorkReportDialog(true);
  };

  const handleOpenCreateReport = (date?: string) => {
    setSelectedDate(date || todayStatus.date);
    setReportTitle('');
    setReportDescription('');
    setReportTasks([{ name: '', status: 'completed', duration: '' }]);
    setReportAchievements(['']);
    setReportNote('');
    setShowCreateReportDialog(true);
  };

  const handleAddTask = () => {
    setReportTasks([...reportTasks, { name: '', status: 'completed', duration: '' }]);
  };

  const handleRemoveTask = (index: number) => {
    setReportTasks(reportTasks.filter((_, i) => i !== index));
  };

  const handleAddAchievement = () => {
    setReportAchievements([...reportAchievements, '']);
  };

  const handleRemoveAchievement = (index: number) => {
    setReportAchievements(reportAchievements.filter((_, i) => i !== index));
  };

  const handleSubmitReport = () => {
    if (!reportTitle.trim() || !reportDescription.trim()) {
      alert('⚠️ Vui lòng điền tiêu đề và mô tả công việc!');
      return;
    }

    const filteredTasks = reportTasks.filter(t => t.name.trim());
    const filteredAchievements = reportAchievements.filter(a => a.trim());

    if (filteredTasks.length === 0) {
      alert('⚠️ Vui lòng thêm ít nhất 1 công việc!');
      return;
    }

    const newReport: WorkReport = {
      title: reportTitle,
      description: reportDescription,
      tasks: filteredTasks,
      achievements: filteredAchievements,
      note: reportNote,
    };

    // Update attendance history with new report
    const updatedHistory = attendanceHistory.map(record => {
      if (record.date === selectedDate) {
        return { ...record, workReport: newReport };
      }
      return record;
    });

    setAttendanceHistory(updatedHistory);
    setShowCreateReportDialog(false);
    alert('✅ Đã tạo báo cáo công việc thành công!');
  };

  const handleOpenAdjustmentDialog = (record: AttendanceRecord) => {
    setSelectedRecordForAdjustment(record);
    setSelectedDate(record.date);
    setRequestCheckIn(record.checkIn);
    setRequestCheckOut(record.checkOut);
    setRequestReason('');
    setShowAdjustmentDialog(true);
  };

  const handleCloseAdjustmentDialog = () => {
    setShowAdjustmentDialog(false);
    setSelectedRecordForAdjustment(null);
    setSelectedDate('');
    setRequestCheckIn('');
    setRequestCheckOut('');
    setRequestReason('');
  };

  const handleSubmitAdjustment = () => {
    if (!requestCheckIn || !requestCheckOut || !requestReason) {
      alert('⚠️ Vui lòng điền đầy đủ thông tin!');
      return;
    }

    if (!selectedRecordForAdjustment) return;

    const newRequest: AttendanceRequest = {
      id: attendanceRequests.length + 1,
      date: selectedDate,
      checkIn: requestCheckIn,
      checkOut: requestCheckOut,
      reason: requestReason,
      status: 'pending',
      submittedAt: new Date().toLocaleString('vi-VN'),
      type: 'adjustment',
      originalCheckIn: selectedRecordForAdjustment.checkIn,
      originalCheckOut: selectedRecordForAdjustment.checkOut,
    };

    setAttendanceRequests([newRequest, ...attendanceRequests]);
    handleCloseAdjustmentDialog();

    alert('✅ Đã gửi đơn điều chỉnh giờ làm!\n\nHR sẽ xem xét và phê duyệt trong vòng 24h.');
  };

  const handleDeleteRequest = (requestId: number) => {
    if (confirm('⚠️ Bạn có chắc muốn xóa đơn này không?')) {
      setAttendanceRequests(attendanceRequests.filter(req => req.id !== requestId));
      alert('✅ Đã xóa đơn thành công!');
    }
  };

  const handleDeleteWorkReport = (date: string) => {
    if (confirm('⚠️ Bạn có chắc muốn xóa báo cáo công việc này không?')) {
      const updatedHistory = attendanceHistory.map(record => {
        if (record.date === date) {
          return { ...record, workReport: undefined };
        }
        return record;
      });
      setAttendanceHistory(updatedHistory);
      setShowWorkReportDialog(false);
      alert('✅ Đã xóa báo cáo công việc!');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Chấm công</h1>
          <p className="text-gray-500 mt-1">Quản lý thời gian làm việc của bạn</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleExport}>
          <Download className="size-4" />
          Xuất báo cáo
        </Button>
      </div>

      {/* Missing Attendance Warning */}
      {missingAttendance.length > 0 && (
        <Card className="p-5 border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-red-50 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="size-12 shrink-0 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center text-white shadow-lg animate-pulse">
              <AlertTriangle className="size-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-orange-900 mb-2 text-lg">
                ⚠️ Bạn có {missingAttendance.length} ngày chưa chấm công!
              </h3>
              <p className="text-sm text-orange-800 mb-3">
                Vui lòng gửi đơn bổ sung chấm công để tránh ảnh hưởng đến lương và đánh giá hiệu suất.
                <span className="font-medium"> (Không tính thứ 7, Chủ nhật)</span>
              </p>
              <div className="flex flex-wrap gap-2 mb-3">
                {missingAttendance.slice(0, 5).map((missing, index) => (
                  <Badge key={index} className="bg-orange-600 text-white border-0">
                    📅 {missing.date} ({getDayOfWeek(missing.date)})
                  </Badge>
                ))}
                {missingAttendance.length > 5 && (
                  <Badge className="bg-orange-700 text-white border-0">
                    +{missingAttendance.length - 5} ngày nữa
                  </Badge>
                )}
              </div>
              <Button
                size="sm"
                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 shadow-lg"
                onClick={() => handleOpenRequestDialog(missingAttendance[0].date)}
              >
                <FileText className="size-4 mr-2" />
                Gửi đơn bổ sung ngay
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Today Status */}
      <Card className="p-6 border-2 border-green-200 bg-gradient-to-br from-green-50 to-white shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-12 shrink-0 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center text-white shadow-md">
                <Clock className="size-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Chấm công hôm nay</h2>
                <p className="text-sm text-gray-600">{getDayOfWeek(todayStatus.date)}, {todayStatus.date}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-lg border shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="size-4 text-green-600" />
                  <span className="text-sm text-gray-600">Giờ vào</span>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {todayStatus.checkIn || '--:--'}
                </p>
              </div>

              <div className="p-4 bg-white rounded-lg border shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  {todayStatus.checkOut ? (
                    <CheckCircle className="size-4 text-green-600" />
                  ) : (
                    <XCircle className="size-4 text-gray-400" />
                  )}
                  <span className="text-sm text-gray-600">Giờ ra</span>
                </div>
                <p className={`text-2xl font-bold ${todayStatus.checkOut ? 'text-green-600' : 'text-gray-400'}`}>
                  {todayStatus.checkOut || 'Chưa checkout'}
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="size-4" />
              <span>{todayStatus.location}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {!todayStatus.checkIn ? (
              <Button
                size="lg"
                className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 shadow-lg w-full"
                onClick={handleCheckIn}
              >
                <Clock className="size-5 mr-2" />
                Chấm công vào
              </Button>
            ) : !todayStatus.checkOut ? (
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-orange-500 text-orange-600 hover:bg-orange-50 w-full"
                onClick={handleCheckOut}
              >
                <Clock className="size-5 mr-2" />
                Chấm công ra
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="text-center p-4 bg-green-100 rounded-lg">
                  <CheckCircle className="size-8 text-green-600 mx-auto mb-2" />
                  <p className="font-semibold text-green-700">Đã hoàn thành</p>
                </div>
                {!todayStatus.hasReport && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-blue-500 text-blue-600 hover:bg-blue-50"
                    onClick={() => handleOpenCreateReport(todayStatus.date)}
                  >
                    <FileText className="size-4 mr-2" />
                    Tạo báo cáo công việc
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Month Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="p-4">
          <p className="text-xs text-gray-600 mb-1">Ngày làm việc</p>
          <p className="text-2xl font-bold text-gray-900">{thisMonth.workedDays}</p>
          <p className="text-xs text-gray-500 mt-1">/ {thisMonth.workingDays} ngày</p>
        </Card>

        <Card className="p-4">
          <p className="text-xs text-gray-600 mb-1">Tổng giờ làm</p>
          <p className="text-2xl font-bold text-blue-600">{thisMonth.totalHours}h</p>
          <p className="text-xs text-gray-500 mt-1">Tháng này</p>
        </Card>

        <Card className="p-4">
          <p className="text-xs text-gray-600 mb-1">Đi muộn</p>
          <p className="text-2xl font-bold text-orange-600">{thisMonth.lateDays}</p>
          <p className="text-xs text-gray-500 mt-1">Lần</p>
        </Card>

        <Card className="p-4">
          <p className="text-xs text-gray-600 mb-1">Về sớm</p>
          <p className="text-2xl font-bold text-orange-600">{thisMonth.earlyDays}</p>
          <p className="text-xs text-gray-500 mt-1">Lần</p>
        </Card>

        <Card className="p-4">
          <p className="text-xs text-gray-600 mb-1">Vắng mặt</p>
          <p className="text-2xl font-bold text-red-600">{thisMonth.absentDays}</p>
          <p className="text-xs text-gray-500 mt-1">Ngày</p>
        </Card>

        <Card className="p-4">
          <p className="text-xs text-gray-600 mb-1">Hiệu suất</p>
          <p className="text-2xl font-bold text-green-600">98%</p>
          <p className="text-xs text-gray-500 mt-1">Tốt</p>
        </Card>
      </div>

      {/* Tabs for History and Requests */}
      <Tabs defaultValue="history" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-100 p-1">
          <TabsTrigger value="history" className="data-[state=active]:bg-white">
            <Calendar className="size-4 mr-2" />
            Lịch sử chấm công
          </TabsTrigger>
          <TabsTrigger value="requests" className="data-[state=active]:bg-white">
            <FileText className="size-4 mr-2" />
            Đơn bổ sung ({attendanceRequests.length})
          </TabsTrigger>
        </TabsList>

        {/* Attendance History Tab */}
        <TabsContent value="history" className="mt-6">
          <Card className="shadow-lg">
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">Lịch sử chấm công</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    <FileText className="size-4 inline mr-1" />
                    Click "Xem báo cáo" để xem chi tiết công việc
                  </p>
                </div>
                
                {/* Month/Year Selector */}
                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handlePreviousMonth}
                    className="gap-1"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <div className="text-center min-w-[140px]">
                    <p className="font-semibold text-gray-900">{getMonthName(selectedMonth)}</p>
                    <p className="text-sm text-gray-600">{selectedYear}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleNextMonth}
                    className="gap-1"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Ngày</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Giờ vào</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Giờ ra</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Tổng giờ</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Trạng thái</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Báo cáo</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(groupedAttendance)
                    .sort((a, b) => parseInt(b) - parseInt(a))
                    .map((weekNum) => (
                      <>
                        {/* Week Separator */}
                        <tr key={`week-${weekNum}`}>
                          <td colSpan={7} className="px-6 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-y border-blue-200">
                            <div className="flex items-center gap-2">
                              <Calendar className="size-4 text-blue-600" />
                              <span className="font-semibold text-blue-700">
                                Tuần {weekNum} - {getMonthName(selectedMonth)} {selectedYear}
                              </span>
                              <span className="text-sm text-blue-600 ml-2">
                                ({groupedAttendance[parseInt(weekNum)].length} ngày)
                              </span>
                            </div>
                          </td>
                        </tr>
                        
                        {/* Week Records */}
                        {groupedAttendance[parseInt(weekNum)].map((record, index) => (
                          <tr key={`${weekNum}-${index}`} className="hover:bg-gray-50 transition-colors border-b">
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <Calendar className="size-4 text-gray-400" />
                                  <span className="font-medium text-gray-900">{record.date}</span>
                                </div>
                                <span className="text-xs text-gray-500 ml-6">{getDayOfWeek(record.date)}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700">{record.checkIn}</td>
                            <td className="px-6 py-4 text-sm text-gray-700">{record.checkOut}</td>
                            <td className="px-6 py-4 text-sm font-medium text-blue-600">{record.hours}</td>
                            <td className="px-6 py-4">
                              <Badge
                                className={
                                  record.status === 'ontime'
                                    ? 'bg-green-600'
                                    : record.status === 'late'
                                    ? 'bg-orange-600'
                                    : 'bg-red-600'
                                }
                              >
                                {record.status === 'ontime'
                                  ? 'Đúng giờ'
                                  : record.status === 'late'
                                  ? 'Đi muộn'
                                  : 'Thiếu'}
                              </Badge>
                            </td>
                            <td className="px-6 py-4">
                              {record.workReport ? (
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleViewWorkReport(record)}
                                    className="gap-2 border-blue-200 text-blue-600 hover:bg-blue-50"
                                  >
                                    <Eye className="size-4" />
                                    Xem
                                  </Button>
                                  <Badge className="bg-blue-100 text-blue-700 border-blue-200" variant="outline">
                                    📋 {record.workReport.title.substring(0, 15)}...
                                  </Badge>
                                </div>
                              ) : record.status !== 'missing' ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenCreateReport(record.date)}
                                  className="gap-2 text-gray-600 hover:bg-gray-50"
                                >
                                  <Plus className="size-4" />
                                  Tạo báo cáo
                                </Button>
                              ) : (
                                <span className="text-sm text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {record.status !== 'missing' ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenAdjustmentDialog(record)}
                                  className="gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                                >
                                  <Edit className="size-4" />
                                  Điều chỉnh
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenRequestDialog(record.date)}
                                  className="gap-2 text-orange-600 border-orange-200 hover:bg-orange-50"
                                >
                                  <Plus className="size-4" />
                                  Bổ sung
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* Attendance Requests Tab */}
        <TabsContent value="requests" className="mt-6">
          <Card className="shadow-lg">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Đơn bổ sung chấm công</h2>
                <p className="text-sm text-gray-600 mt-1">Theo dõi trạng thái đơn của bạn</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenRequestDialog()}
              >
                <FileText className="size-4 mr-2" />
                Tạo đơn mới
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Loại</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Ngày</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Giờ vào</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Giờ ra</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Lý do</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Trạng thái</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Gửi lúc</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {attendanceRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <Badge className={request.type === 'supplement' ? 'bg-purple-600' : 'bg-indigo-600'}>
                          {request.type === 'supplement' ? '📋 Bổ sung' : '🔄 Điều chỉnh'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Calendar className="size-4 text-gray-400" />
                            <span className="font-medium text-gray-900">{request.date}</span>
                          </div>
                          <span className="text-xs text-gray-500 ml-6">{getDayOfWeek(request.date)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{request.checkIn}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{request.checkOut}</td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-700 max-w-xs truncate" title={request.reason}>
                          {request.reason}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          className={
                            request.status === 'approved'
                              ? 'bg-green-600'
                              : request.status === 'rejected'
                              ? 'bg-red-600'
                              : 'bg-yellow-600'
                          }
                        >
                          {request.status === 'approved' 
                            ? '✓ Đã duyệt' 
                            : request.status === 'rejected'
                            ? '✗ Từ chối'
                            : '⏳ Chờ duyệt'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{request.submittedAt}</td>
                      <td className="px-6 py-4">
                        {request.status === 'pending' && (
                          <div className="flex items-center gap-2">
                            {request.type === 'adjustment' && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleOpenAdjustmentDialog({ ...request } as unknown as AttendanceRecord)}
                              >
                                <Edit className="size-4 text-blue-600" />
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteRequest(request.id)}
                            >
                              <Trash2 className="size-4 text-red-600" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Request Form Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="size-12 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl flex items-center justify-center text-white shadow-md">
                <FileText className="size-6" />
              </div>
              <div>
                <DialogTitle className="text-xl">Đơn bổ sung chấm công</DialogTitle>
                <DialogDescription>
                  Điền đầy đủ thông tin để gửi yêu cầu đến HR
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Ngày cần bổ sung</Label>
              <Input
                type="text"
                placeholder="DD/MM/YYYY"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Giờ vào</Label>
                <Input
                  type="time"
                  value={requestCheckIn}
                  onChange={(e) => setRequestCheckIn(e.target.value)}
                />
              </div>
              <div>
                <Label>Giờ ra</Label>
                <Input
                  type="time"
                  value={requestCheckOut}
                  onChange={(e) => setRequestCheckOut(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>Lý do</Label>
              <Input
                type="text"
                placeholder="Nhập lý do bổ sung chấm công"
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Hủy
            </Button>
            <Button
              className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
              onClick={handleSubmitRequest}
            >
              <Send className="size-4 mr-2" />
              Gửi đơn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjustment Dialog */}
      <Dialog open={showAdjustmentDialog} onOpenChange={setShowAdjustmentDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="size-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-md">
                <Edit className="size-6" />
              </div>
              <div>
                <DialogTitle className="text-xl">Điều chỉnh giờ làm</DialogTitle>
                <DialogDescription>
                  Chỉnh sửa giờ vào/ra khi có sai sót
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Ngày</Label>
              <Input
                type="text"
                value={selectedDate}
                disabled
                className="bg-gray-100"
              />
            </div>
            {selectedRecordForAdjustment && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm font-medium text-yellow-900 mb-2">Thông tin hiện tại:</p>
                <div className="grid grid-cols-2 gap-2 text-sm text-yellow-800">
                  <div>Giờ vào: <span className="font-semibold">{selectedRecordForAdjustment.checkIn}</span></div>
                  <div>Giờ ra: <span className="font-semibold">{selectedRecordForAdjustment.checkOut}</span></div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Giờ vào mới</Label>
                <Input
                  type="time"
                  value={requestCheckIn}
                  onChange={(e) => setRequestCheckIn(e.target.value)}
                />
              </div>
              <div>
                <Label>Giờ ra mới</Label>
                <Input
                  type="time"
                  value={requestCheckOut}
                  onChange={(e) => setRequestCheckOut(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>Lý do điều chỉnh</Label>
              <Input
                type="text"
                placeholder="Nhập lý do cần điều chỉnh"
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseAdjustmentDialog}>
              Hủy
            </Button>
            <Button
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              onClick={handleSubmitAdjustment}
            >
              <Send className="size-4 mr-2" />
              Gửi đơn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Work Report View Dialog */}
      <Dialog open={showWorkReportDialog} onOpenChange={setShowWorkReportDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          {selectedWorkReport?.workReport && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3">
                    <div className="size-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md">
                      <FileText className="size-6" />
                    </div>
                    <div>
                      <DialogTitle className="text-xl">{selectedWorkReport.workReport.title}</DialogTitle>
                      <DialogDescription>
                        Báo cáo công việc ngày {selectedWorkReport.date}
                      </DialogDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteWorkReport(selectedWorkReport.date)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                {/* Description */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <MessageSquareText className="size-4 text-blue-600" />
                    Mô tả công việc
                  </h3>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                    {selectedWorkReport.workReport.description}
                  </p>
                </div>

                {/* Tasks */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <ListChecks className="size-4 text-blue-600" />
                    Danh sách công việc ({selectedWorkReport.workReport.tasks.length})
                  </h3>
                  <div className="space-y-2">
                    {selectedWorkReport.workReport.tasks.map((task, index) => (
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
                {selectedWorkReport.workReport.achievements.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Target className="size-4 text-blue-600" />
                      Thành tựu đạt được
                    </h3>
                    <ul className="space-y-2">
                      {selectedWorkReport.workReport.achievements.map((achievement, index) => (
                        <li key={index} className="flex items-start gap-2 text-gray-700">
                          <span className="text-green-600 mt-1">✓</span>
                          <span>{achievement}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Note */}
                {selectedWorkReport.workReport.note && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Ghi chú</h3>
                    <p className="text-gray-700 bg-blue-50 p-3 rounded-lg border border-blue-100">
                      {selectedWorkReport.workReport.note}
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowWorkReportDialog(false)}>
                  Đóng
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Work Report Dialog */}
      <Dialog open={showCreateReportDialog} onOpenChange={setShowCreateReportDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="size-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md">
                <FileText className="size-6" />
              </div>
              <div>
                <DialogTitle className="text-xl">Tạo báo cáo công việc</DialogTitle>
                <DialogDescription>
                  Báo cáo chi tiết công việc ngày {selectedDate}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Title */}
            <div>
              <Label>Tiêu đề báo cáo *</Label>
              <Input
                type="text"
                placeholder="VD: Phát triển tính năng Login/Register"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
              />
            </div>

            {/* Description */}
            <div>
              <Label>Mô tả tổng quan *</Label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Mô tả ngắn gọn về công việc đã làm trong ngày"
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
              />
            </div>

            {/* Tasks */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Danh sách công việc *</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddTask}
                  className="gap-2"
                >
                  <Plus className="size-4" />
                  Thêm task
                </Button>
              </div>
              <div className="space-y-3">
                {reportTasks.map((task, index) => (
                  <div key={index} className="flex gap-2 items-start p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 space-y-2">
                      <Input
                        placeholder="Tên công việc"
                        value={task.name}
                        onChange={(e) => {
                          const newTasks = [...reportTasks];
                          newTasks[index].name = e.target.value;
                          setReportTasks(newTasks);
                        }}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                          value={task.status}
                          onChange={(e) => {
                            const newTasks = [...reportTasks];
                            newTasks[index].status = e.target.value as any;
                            setReportTasks(newTasks);
                          }}
                        >
                          <option value="completed">Hoàn thành</option>
                          <option value="in-progress">Đang làm</option>
                          <option value="pending">Chờ</option>
                        </select>
                        <Input
                          placeholder="Thời gian (VD: 2h 30m)"
                          value={task.duration || ''}
                          onChange={(e) => {
                            const newTasks = [...reportTasks];
                            newTasks[index].duration = e.target.value;
                            setReportTasks(newTasks);
                          }}
                        />
                      </div>
                    </div>
                    {reportTasks.length > 1 && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemoveTask(index)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Achievements */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Thành tựu (tùy chọn)</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddAchievement}
                  className="gap-2"
                >
                  <Plus className="size-4" />
                  Thêm thành tựu
                </Button>
              </div>
              <div className="space-y-2">
                {reportAchievements.map((achievement, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="VD: Hoàn thành 100% công việc được giao"
                      value={achievement}
                      onChange={(e) => {
                        const newAchievements = [...reportAchievements];
                        newAchievements[index] = e.target.value;
                        setReportAchievements(newAchievements);
                      }}
                    />
                    {reportAchievements.length > 1 && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemoveAchievement(index)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Note */}
            <div>
              <Label>Ghi chú (tùy chọn)</Label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Ghi chú thêm về công việc, kế hoạch ngày hôm sau..."
                value={reportNote}
                onChange={(e) => setReportNote(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateReportDialog(false)}>
              Hủy
            </Button>
            <Button
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              onClick={handleSubmitReport}
            >
              <Send className="size-4 mr-2" />
              Tạo báo cáo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
