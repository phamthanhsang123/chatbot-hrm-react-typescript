'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ClipboardCheck,
  Download,
  Eye,
  FileText,
  GripHorizontal,
  History,
  LogIn,
  LogOut,
  RefreshCcw,
  Send,
  TimerReset,
} from 'lucide-react';
import {
  addDays,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { vi } from 'date-fns/locale';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Textarea } from '../components/ui/textarea';
import {
  AttendanceApiItem,
  AttendanceMonthlyReportItem,
  checkInEmployeeAttendance,
  checkOutEmployeeAttendance,
  fetchAttendanceByDate,
  fetchAttendanceMonthlyReport,
} from '@/services/attendance';
import { getCurrentEmployeeId } from '@/services/tasks';
import {
  HRM_SYNC_KEYS,
  LiveAttendanceSyncRecord,
  formatSyncDate,
  getEmployeePortalIdentity,
  readSyncedRecords,
  upsertSyncedRecord,
} from './hrmSync';

type AttendanceStatus = 'completed' | 'working' | 'late' | 'early' | 'missing';
type RequestStatus = 'pending' | 'approved' | 'rejected';
type RequestType = 'supplement' | 'adjustment';

interface WorkReport {
  title: string;
  description: string;
  note?: string;
}

interface AttendanceRecord {
  date: string;
  checkIn?: string;
  checkOut?: string;
  hours: number;
  status: AttendanceStatus;
  note: string;
  workReport?: WorkReport;
}

interface AttendanceRequest {
  id: number;
  employeeName: string;
  employeeId: string;
  department: string;
  type: RequestType;
  date: string;
  checkIn: string;
  checkOut: string;
  reason: string;
  status: RequestStatus;
  submittedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
  originalCheckIn?: string;
  originalCheckOut?: string;
  workReport?: WorkReport;
}

const demoHistory: AttendanceRecord[] = [
  {
    date: '2026-06-23',
    checkIn: '08:18',
    hours: 0,
    status: 'working',
    note: 'Đang làm việc',
    workReport: {
      title: 'Hoàn thiện giao diện chấm công',
      description: 'Xây dựng lịch tuần, trạng thái giờ làm và luồng gửi yêu cầu cho HR.',
    },
  },
  {
    date: '2026-06-22',
    checkIn: '08:26',
    checkOut: '17:32',
    hours: 8.1,
    status: 'completed',
    note: 'Đủ công',
    workReport: {
      title: 'Đối chiếu nghiệp vụ chấm công',
      description: 'Kiểm tra dữ liệu User với màn hình HR và báo cáo Manager.',
    },
  },
  {
    date: '2026-06-19',
    checkIn: '08:24',
    hours: 0,
    status: 'working',
    note: 'Đang làm việc',
  },
  {
    date: '2026-06-18',
    checkIn: '08:25',
    checkOut: '17:35',
    hours: 8.17,
    status: 'completed',
    note: 'Đủ công',
    workReport: {
      title: 'Hoàn thiện Employee Task',
      description: 'Cập nhật giao diện task cá nhân, kiểm tra filter kỳ đánh giá và luồng gửi duyệt.',
      note: 'Đã chuyển sang trạng thái sẵn sàng review.',
    },
  },
  {
    date: '2026-06-17',
    checkIn: '08:37',
    checkOut: '17:30',
    hours: 7.88,
    status: 'late',
    note: 'Đi muộn 7 phút',
    workReport: {
      title: 'Kiểm thử portal nhân viên',
      description: 'Kiểm tra dashboard, task, nghỉ phép và lương cá nhân sau khi lấy code mới.',
    },
  },
  {
    date: '2026-06-16',
    checkIn: '08:28',
    checkOut: '17:20',
    hours: 7.87,
    status: 'completed',
    note: 'Đủ công',
  },
  {
    date: '2026-06-15',
    hours: 0,
    status: 'missing',
    note: 'Chưa chấm công, cần gửi bổ sung',
  },
  {
    date: '2026-06-12',
    checkIn: '08:20',
    checkOut: '16:45',
    hours: 7.42,
    status: 'early',
    note: 'Về sớm 15 phút',
  },
];

const demoRequests: AttendanceRequest[] = [
  {
    id: 1,
    employeeName: 'Nguyễn Văn A',
    employeeId: 'NV001',
    department: 'IT',
    type: 'supplement',
    date: '2026-06-15',
    checkIn: '08:30',
    checkOut: '17:30',
    reason: 'Quên chấm công do họp khách hàng ngoài văn phòng.',
    status: 'pending',
    submittedAt: '2026-06-16 08:20',
    workReport: {
      title: 'Họp khách hàng và xử lý demo',
      description: 'Chuẩn bị demo, họp khách hàng và tổng hợp phản hồi gửi Manager.',
    },
  },
  {
    id: 2,
    employeeName: 'Nguyễn Văn A',
    employeeId: 'NV001',
    department: 'IT',
    type: 'adjustment',
    date: '2026-06-12',
    checkIn: '08:20',
    checkOut: '17:15',
    reason: 'Có làm thêm đến 17:15 nhưng máy chấm công ghi nhận sai giờ ra.',
    status: 'approved',
    submittedAt: '2026-06-13 09:00',
    reviewedBy: 'HR Manager',
    reviewedAt: '2026-06-13 15:30',
    reviewNote: 'Đã đối chiếu log hệ thống và duyệt điều chỉnh.',
    originalCheckOut: '16:45',
  },
];

const statusMeta: Record<AttendanceStatus, { label: string; className: string; bar: string }> = {
  completed: { label: 'Đủ công', className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100', bar: 'bg-emerald-500' },
  working: { label: 'Đang làm', className: 'bg-blue-100 text-blue-700 hover:bg-blue-100', bar: 'bg-blue-500' },
  late: { label: 'Đi muộn', className: 'bg-amber-100 text-amber-700 hover:bg-amber-100', bar: 'bg-amber-500' },
  early: { label: 'Về sớm', className: 'bg-orange-100 text-orange-700 hover:bg-orange-100', bar: 'bg-orange-500' },
  missing: { label: 'Thiếu công', className: 'bg-red-100 text-red-700 hover:bg-red-100', bar: 'bg-red-500' },
};

const requestMeta: Record<RequestStatus, { label: string; className: string }> = {
  pending: { label: 'Chờ HR duyệt', className: 'bg-amber-100 text-amber-700 hover:bg-amber-100' },
  approved: { label: 'Đã duyệt', className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' },
  rejected: { label: 'Từ chối', className: 'bg-red-100 text-red-700 hover:bg-red-100' },
};

function currentPeriodValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function parsePeriod(value: string) {
  const [year, month] = value.split('-').map(Number);
  return { month, year };
}

function formatPeriod(value: string) {
  const { month, year } = parsePeriod(value);
  return `Tháng ${String(month).padStart(2, '0')}/${year}`;
}

function buildPeriodOptions() {
  const options: string[] = [];
  const start = new Date();
  start.setDate(1);

  for (let offset = -5; offset <= 2; offset += 1) {
    const date = new Date(start);
    date.setMonth(start.getMonth() + offset);
    options.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  }

  return options.reverse();
}

const periodOptions = buildPeriodOptions();
const calendarHours = Array.from({ length: 13 }, (_, index) => index + 7);
const calendarRowHeight = 58;
const calendarStartHour = calendarHours[0];
const calendarEndHour = calendarHours[calendarHours.length - 1] + 1;
const workSchedule = {
  start: 8 * 60,
  lunchStart: 12 * 60,
  lunchEnd: 13 * 60,
  end: 17 * 60,
};

function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('vi-VN');
}

function getDayName(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('vi-VN', { weekday: 'long' });
}

function formatTimeFromIso(value?: string | null) {
  if (!value) return '';
  return new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function toIsoDate(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

function getPeriodFromDate(date: Date) {
  return format(date, 'yyyy-MM');
}

function formatWeekRange(date: Date) {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const end = addDays(start, 6);
  return `${format(start, 'dd/MM')} - ${format(end, 'dd/MM/yyyy')}`;
}

function timeToMinutes(value?: string) {
  if (!value) return calendarStartHour * 60;
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

function minutesToTime(value: number) {
  const safeValue = Math.max(0, Math.min(value, 23 * 60 + 59));
  const hour = Math.floor(safeValue / 60);
  const minute = safeValue % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function calculateWorkedMinutes(checkIn?: string, checkOut?: string) {
  if (!checkIn || !checkOut) return 0;
  const start = timeToMinutes(checkIn);
  const end = timeToMinutes(checkOut);
  if (end <= start) return 0;

  const lunchOverlap = Math.max(0, Math.min(end, workSchedule.lunchEnd) - Math.max(start, workSchedule.lunchStart));
  return Math.max(0, end - start - lunchOverlap);
}

function calculateWorkedHours(checkIn?: string, checkOut?: string) {
  return calculateWorkedMinutes(checkIn, checkOut) / 60;
}

function getCalendarSegmentMetrics(startMinutes: number, endMinutes: number) {
  const gridStart = calendarStartHour * 60;
  const gridEnd = calendarEndHour * 60;
  const visibleStart = Math.max(gridStart, Math.min(startMinutes, gridEnd - 15));
  const visibleEnd = Math.max(visibleStart + 15, Math.min(endMinutes, gridEnd));

  return {
    top: ((visibleStart - gridStart) / 60) * calendarRowHeight,
    height: Math.max(36, ((visibleEnd - visibleStart) / 60) * calendarRowHeight),
  };
}

function getWorkSegments(record: AttendanceRecord, currentMinutes: number) {
  const start = record.checkIn ? timeToMinutes(record.checkIn) : workSchedule.start;
  const end = record.checkOut
    ? timeToMinutes(record.checkOut)
    : record.status === 'working'
      ? Math.max(start + 15, currentMinutes)
      : start + 60;
  const ranges = [
    { start, end: Math.min(end, workSchedule.lunchStart) },
    { start: Math.max(start, workSchedule.lunchEnd), end },
  ];

  return ranges.filter((range) => range.end > range.start);
}

function getCalendarMonthDays(value: string) {
  const selected = parseISO(value);
  const first = startOfWeek(startOfMonth(selected), { weekStartsOn: 1 });
  const last = endOfWeek(endOfMonth(selected), { weekStartsOn: 1 });
  return eachDayOfInterval({ start: first, end: last });
}

function publishLiveAttendance(record: LiveAttendanceSyncRecord) {
  upsertSyncedRecord(
    HRM_SYNC_KEYS.liveAttendance,
    record,
    (current) => current.employeeId === record.employeeId && current.date === record.date,
  );
}

function isRecordInPeriod(record: { date: string }, period: string) {
  const { month, year } = parsePeriod(period);
  const date = new Date(`${record.date}T00:00:00`);
  return date.getFullYear() === year && date.getMonth() + 1 === month;
}

function workingDaysInPeriod(period: string) {
  const { month, year } = parsePeriod(period);
  const lastDay = new Date(year, month, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
  const maxDay = isCurrentMonth ? today.getDate() : lastDay;
  const days: string[] = [];

  for (let day = 1; day <= maxDay; day += 1) {
    const date = new Date(year, month - 1, day);
    const weekday = date.getDay();
    if (weekday === 0 || weekday === 6) continue;
    days.push(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
  }

  return days;
}

function mapApiAttendance(item: AttendanceApiItem): AttendanceRecord {
  const checkIn = formatTimeFromIso(item.checkInTime);
  const checkOut = formatTimeFromIso(item.checkOutTime);
  const date = item.date.slice(0, 10);
  const status: AttendanceStatus =
    !checkIn ? 'missing' : !checkOut ? 'working' : item.isLate ? 'late' : item.isEarlyLeave ? 'early' : 'completed';

  return {
    date,
    checkIn,
    checkOut,
    hours: checkIn && checkOut ? calculateWorkedHours(checkIn, checkOut) : Number(item.totalHours || 0),
    status,
    note: item.note && item.note !== '-' ? item.note : statusMeta[status].label,
  };
}

function emptyRequestForm(date = todayIso(), type: RequestType = 'supplement') {
  return {
    type,
    date,
    checkIn: '08:30',
    checkOut: '17:30',
    reason: '',
    reportTitle: '',
    reportDescription: '',
  };
}

export function Attendance() {
  const employeeId = getCurrentEmployeeId();
  const employeeIdentity = useMemo(() => getEmployeePortalIdentity(employeeId), [employeeId]);
  const currentDate = todayIso();
  const [period, setPeriod] = useState(currentPeriodValue());
  const [calendarDate, setCalendarDate] = useState(currentDate);
  const [history, setHistory] = useState<AttendanceRecord[]>(demoHistory);
  const [requests, setRequests] = useState<AttendanceRequest[]>(demoRequests);
  const [monthlySummary, setMonthlySummary] = useState<AttendanceMonthlyReportItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [usingDemoData, setUsingDemoData] = useState(false);
  const [message, setMessage] = useState('');
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<AttendanceRequest | null>(null);
  const [requestForm, setRequestForm] = useState(emptyRequestForm());
  const [requestError, setRequestError] = useState('');

  const periodRecords = useMemo(() => {
    return history
      .filter((record) => isRecordInPeriod(record, period))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [history, period]);

  const periodRequests = useMemo(() => {
    return requests
      .filter((request) => isRecordInPeriod(request, period))
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  }, [period, requests]);

  const todayRecord = useMemo(() => history.find((record) => record.date === currentDate) || null, [currentDate, history]);

  const stats = useMemo(() => {
    const workingDays = workingDaysInPeriod(period);
    const completed = monthlySummary?.completedDays ?? periodRecords.filter((record) => record.status === 'completed' || record.status === 'late' || record.status === 'early').length;
    const late = monthlySummary?.lateDays ?? periodRecords.filter((record) => record.status === 'late').length;
    const early = monthlySummary?.earlyLeaveDays ?? periodRecords.filter((record) => record.status === 'early').length;
    const totalHours = periodRecords.reduce(
      (sum, record) => sum + (record.checkIn && record.checkOut ? calculateWorkedHours(record.checkIn, record.checkOut) : record.hours),
      0,
    );
    const missing = Math.max(0, workingDays.length - completed - periodRecords.filter((record) => record.status === 'working').length);
    const pending = periodRequests.filter((request) => request.status === 'pending').length;
    const attendanceRate = workingDays.length ? Math.round((completed / workingDays.length) * 100) : 0;

    return { workingDays: workingDays.length, completed, late, early, totalHours, missing, pending, attendanceRate };
  }, [monthlySummary, period, periodRecords, periodRequests]);

  const mergeRecord = useCallback((record: AttendanceRecord) => {
    setHistory((current) => {
      const exists = current.some((item) => item.date === record.date);
      return exists ? current.map((item) => (item.date === record.date ? { ...item, ...record } : item)) : [record, ...current];
    });
  }, []);

  useEffect(() => {
    const todaySyncDate = formatSyncDate(new Date());
    const liveRecord = readSyncedRecords<LiveAttendanceSyncRecord>(HRM_SYNC_KEYS.liveAttendance).find(
      (record) => record.employeeId === employeeIdentity.employeeId && record.date === todaySyncDate,
    );

    if (liveRecord) {
      mergeRecord({
        date: currentDate,
        checkIn: liveRecord.checkIn,
        checkOut: liveRecord.checkOut,
        hours: calculateWorkedHours(liveRecord.checkIn, liveRecord.checkOut),
        status: liveRecord.status === 'online' ? 'working' : 'completed',
        note: liveRecord.status === 'online' ? 'Đang làm việc' : 'Đã check-out',
      });
    }

    const syncedRequests = readSyncedRecords<AttendanceRequest>(HRM_SYNC_KEYS.attendanceRequests).filter(
      (request) => request.employeeId === employeeIdentity.employeeId,
    );
    if (syncedRequests.length > 0) {
      setRequests((current) => {
        const syncedIds = new Set(syncedRequests.map((request) => request.id));
        return [...syncedRequests, ...current.filter((request) => !syncedIds.has(request.id))];
      });
    }
  }, [currentDate, employeeIdentity.employeeId, mergeRecord]);

  const loadAttendance = useCallback(async () => {
    const { month, year } = parsePeriod(period);
    setLoading(true);
    setMessage('');

    try {
      const [monthlyData, todayData] = await Promise.all([
        fetchAttendanceMonthlyReport(year, month),
        fetchAttendanceByDate(currentDate),
      ]);
      setMonthlySummary(monthlyData.find((item) => Number(item.employeeId) === employeeId) || null);
      const todayAttendance = todayData.find((item) => Number(item.employeeId) === employeeId);
      if (todayAttendance) mergeRecord(mapApiAttendance(todayAttendance));
      setUsingDemoData(false);
    } catch (error) {
      console.warn('Attendance API unavailable, using demo data:', error);
      setMonthlySummary(null);
      setUsingDemoData(true);
    } finally {
      setLoading(false);
    }
  }, [currentDate, employeeId, mergeRecord, period]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const handleCheckIn = async () => {
    setMessage('');
    const now = new Date();
    const fallbackCheckIn = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    try {
      const result = await checkInEmployeeAttendance(employeeId);
      if (result.data) {
        const record = mapApiAttendance(result.data);
        mergeRecord(record);
        if (result.success) {
          publishLiveAttendance({
            ...employeeIdentity,
            date: formatSyncDate(now),
            checkIn: record.checkIn || fallbackCheckIn,
            status: 'online',
            lastUpdated: fallbackCheckIn,
          });
        }
      }
      setMessage(result.message || (result.success ? 'Check-in thành công.' : 'Không check-in được.'));
      setUsingDemoData(false);
    } catch (error) {
      console.warn('Check-in API unavailable, using demo data:', error);
      mergeRecord({
        date: currentDate,
        checkIn: fallbackCheckIn,
        hours: 0,
        status: 'working',
        note: 'Check-in demo vì API chưa phản hồi.',
      });
      publishLiveAttendance({
        ...employeeIdentity,
        date: formatSyncDate(now),
        checkIn: fallbackCheckIn,
        status: 'online',
        lastUpdated: fallbackCheckIn,
      });
      setMessage('Đã ghi nhận check-in demo. Khi backend chạy, thao tác này sẽ gọi API chấm công thật.');
      setUsingDemoData(true);
    }
  };

  const handleCheckOut = async () => {
    setMessage('');
    const now = new Date();
    const fallbackCheckOut = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const fallbackCheckIn = todayRecord?.checkIn || '08:30';

    try {
      const result = await checkOutEmployeeAttendance(employeeId);
      if (result.data) {
        const record = mapApiAttendance(result.data);
        mergeRecord(record);
        if (result.success) {
          publishLiveAttendance({
            ...employeeIdentity,
            date: formatSyncDate(now),
            checkIn: record.checkIn || fallbackCheckIn,
            checkOut: record.checkOut || fallbackCheckOut,
            checkOutDate: formatSyncDate(now),
            status: 'offline',
            lastUpdated: fallbackCheckOut,
          });
        }
      }
      setMessage(result.message || (result.success ? 'Check-out thành công.' : 'Không check-out được.'));
      setUsingDemoData(false);
    } catch (error) {
      console.warn('Check-out API unavailable, using demo data:', error);
      mergeRecord({
        date: currentDate,
        checkIn: fallbackCheckIn,
        checkOut: fallbackCheckOut,
        hours: calculateWorkedHours(fallbackCheckIn, fallbackCheckOut),
        status: 'completed',
        note: 'Check-out demo vì API chưa phản hồi.',
      });
      publishLiveAttendance({
        ...employeeIdentity,
        date: formatSyncDate(now),
        checkIn: fallbackCheckIn,
        checkOut: fallbackCheckOut,
        checkOutDate: formatSyncDate(now),
        status: 'offline',
        lastUpdated: fallbackCheckOut,
      });
      setMessage('Đã ghi nhận check-out demo. Khi backend chạy, thao tác này sẽ gọi API chấm công thật.');
      setUsingDemoData(true);
    }
  };

  const openRequestDialog = (date: string, type: RequestType, source?: AttendanceRecord) => {
    setSelectedRecord(source || null);
    setRequestError('');
    setRequestForm({
      ...emptyRequestForm(date, type),
      checkIn: source?.checkIn || '08:30',
      checkOut: source?.checkOut || '17:30',
    });
    setRequestDialogOpen(true);
  };

  const submitRequest = () => {
    setRequestError('');
    if (!requestForm.date || !requestForm.checkIn || !requestForm.checkOut || !requestForm.reason.trim()) {
      setRequestError('Vui lòng nhập đủ ngày, giờ và lý do trước khi gửi HR.');
      return;
    }

    if (timeToMinutes(requestForm.checkOut) <= timeToMinutes(requestForm.checkIn)) {
      setRequestError('Giờ ra phải sau giờ vào. Vui lòng kiểm tra lại thời gian đề xuất.');
      return;
    }

    if (calculateWorkedMinutes(requestForm.checkIn, requestForm.checkOut) < 15) {
      setRequestError('Thời gian làm việc sau khi trừ giờ nghỉ trưa phải từ 15 phút trở lên.');
      return;
    }

    const nextRequest: AttendanceRequest = {
      id: Math.max(0, ...requests.map((request) => request.id)) + 1,
      ...employeeIdentity,
      type: requestForm.type,
      date: requestForm.date,
      checkIn: requestForm.checkIn,
      checkOut: requestForm.checkOut,
      reason: requestForm.reason.trim(),
      status: 'pending',
      submittedAt: new Date().toLocaleString('sv-SE').slice(0, 16),
      originalCheckIn: selectedRecord?.checkIn,
      originalCheckOut: selectedRecord?.checkOut,
      workReport:
        requestForm.reportTitle.trim() || requestForm.reportDescription.trim()
          ? {
              title: requestForm.reportTitle.trim() || 'Báo cáo công việc',
              description: requestForm.reportDescription.trim(),
            }
          : undefined,
    };

    setRequests((current) => [nextRequest, ...current]);
    upsertSyncedRecord(
      HRM_SYNC_KEYS.attendanceRequests,
      nextRequest,
      (current) => current.employeeId === nextRequest.employeeId && current.id === nextRequest.id,
    );
    setMessage('Đã gửi đơn chấm công ở trạng thái chờ HR duyệt.');
    setRequestDialogOpen(false);
    setRequestError('');
    setSelectedRecord(null);
    setRequestForm(emptyRequestForm());
  };

  const openDetail = (record?: AttendanceRecord, request?: AttendanceRequest) => {
    setSelectedRecord(record || null);
    setSelectedRequest(request || null);
    setDetailDialogOpen(true);
  };

  const proposeAttendanceChange = (record: AttendanceRecord, checkIn: string, checkOut: string) => {
    setSelectedRecord(record);
    setRequestError('');
    setRequestForm({
      ...emptyRequestForm(record.date, 'adjustment'),
      checkIn,
      checkOut,
      reason: '',
      reportTitle: record.workReport?.title || '',
      reportDescription: record.workReport?.description || '',
    });
    setMessage(
      `Đã chọn giờ đề xuất ${checkIn} - ${checkOut}. Tổng giờ hợp lệ sau khi trừ nghỉ trưa: ${calculateWorkedHours(checkIn, checkOut).toFixed(2)} giờ.`,
    );
    setRequestDialogOpen(true);
  };

  const selectCalendarDate = (date: Date) => {
    setCalendarDate(toIsoDate(date));
    setPeriod(getPeriodFromDate(date));
  };

  const moveCalendarWeek = (amount: number) => {
    selectCalendarDate(addWeeks(parseISO(calendarDate), amount));
  };

  const handlePeriodChange = (value: string) => {
    setPeriod(value);
    const today = parseISO(currentDate);
    const nextDate = value === getPeriodFromDate(today) ? today : parseISO(`${value}-01`);
    setCalendarDate(toIsoDate(nextDate));
  };

  const exportReport = () => {
    const rows = [
      ['Date', 'Check In', 'Check Out', 'Hours', 'Status', 'Note'],
      ...periodRecords.map((record) => [
        formatDate(record.date),
        record.checkIn || '',
        record.checkOut || '',
        String(record.hours),
        statusMeta[record.status].label,
        record.note,
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `employee-attendance-${period}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const selectedCalendarRecord = history.find((record) => record.date === calendarDate);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
            <ClipboardCheck className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-950">Chấm công</h1>
            <p className="mt-1 text-sm text-slate-500">Theo dõi giờ làm và xử lý dữ liệu chấm công của bạn.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={loadAttendance} disabled={loading} title="Làm mới dữ liệu">
            <RefreshCcw className={`mr-2 size-4 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
          <AttendanceHistoryPopover
            period={period}
            records={periodRecords}
            requests={periodRequests}
            onOpenRecord={(record) => openDetail(record)}
            onOpenRequest={(request) => openDetail(undefined, request)}
            onAdjustRecord={(record) => openRequestDialog(record.date, record.status === 'missing' ? 'supplement' : 'adjustment', record)}
          />
          <Button variant="outline" onClick={exportReport} disabled={periodRecords.length === 0}>
            <Download className="mr-2 size-4" />
            Xuất CSV
          </Button>
          <Button onClick={() => openRequestDialog(calendarDate, selectedCalendarRecord ? 'adjustment' : 'supplement', selectedCalendarRecord)}>
            <Send className="mr-2 size-4" />
            Tạo yêu cầu
          </Button>
        </div>
      </div>

      {message && <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">{message}</div>}

      {usingDemoData && (
        <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          API chưa phản hồi nên màn hình đang dùng dữ liệu minh họa. Nhân viên gửi yêu cầu, HR duyệt và Manager chỉ đối chiếu.
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="grid lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="border-b border-slate-200 bg-slate-50/70 lg:border-b-0 lg:border-r">
            <div className="border-b border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Hôm nay, {formatDate(currentDate)}</p>
              <div className="mt-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xl font-bold text-slate-950">{todayRecord ? statusMeta[todayRecord.status].label : 'Chưa check-in'}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {todayRecord?.checkIn || '--:--'} <span className="mx-1">-</span> {todayRecord?.checkOut || '--:--'}
                  </p>
                </div>
                <span className={`mt-1 size-3 rounded-full ${todayRecord ? statusMeta[todayRecord.status].bar : 'bg-slate-300'}`} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button size="sm" onClick={handleCheckIn} disabled={Boolean(todayRecord?.checkIn && todayRecord.status !== 'missing')}>
                  <LogIn className="mr-2 size-4" />
                  Check-in
                </Button>
                <Button size="sm" variant="outline" onClick={handleCheckOut} disabled={!todayRecord?.checkIn || Boolean(todayRecord?.checkOut)}>
                  <LogOut className="mr-2 size-4" />
                  Check-out
                </Button>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="mt-2 w-full justify-start text-blue-700"
                onClick={() => openRequestDialog(currentDate, 'supplement', todayRecord || undefined)}
              >
                <Send className="mr-2 size-4" />
                Bổ sung chấm công
              </Button>
            </div>

            <div className="border-b border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">
                  {format(parseISO(calendarDate), "'Tháng' M, yyyy", { locale: vi })}
                </p>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="size-7" onClick={() => moveCalendarWeek(-1)} title="Tuần trước">
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-7" onClick={() => moveCalendarWeek(1)} title="Tuần sau">
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-7 text-center text-[11px] font-medium text-slate-400">
                {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => <span key={day}>{day}</span>)}
              </div>
              <div className="mt-1 grid grid-cols-7 gap-y-1">
                {getCalendarMonthDays(calendarDate).map((day) => {
                  const dayIso = toIsoDate(day);
                  const hasRecord = history.some((record) => record.date === dayIso);
                  const selected = isSameDay(day, parseISO(calendarDate));
                  const today = isSameDay(day, parseISO(currentDate));
                  return (
                    <button
                      key={dayIso}
                      type="button"
                      className={`relative mx-auto flex size-7 items-center justify-center rounded-full text-xs transition-colors ${
                        selected ? 'bg-blue-600 font-semibold text-white' : today ? 'bg-blue-50 font-semibold text-blue-700' : isSameMonth(day, parseISO(calendarDate)) ? 'text-slate-700 hover:bg-slate-200' : 'text-slate-300'
                      }`}
                      onClick={() => selectCalendarDate(day)}
                      aria-label={`Chọn ngày ${formatDate(dayIso)}`}
                    >
                      {format(day, 'd')}
                      {hasRecord && !selected && <span className="absolute bottom-0.5 size-1 rounded-full bg-blue-500" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 border-b border-slate-200">
              <SummaryMetric icon={<CheckCircle2 className="size-4" />} label="Ngày công" value={`${stats.completed}/${stats.workingDays}`} tone="emerald" />
              <SummaryMetric icon={<Clock className="size-4" />} label="Tổng giờ" value={`${stats.totalHours.toFixed(1)}h`} tone="blue" />
              <SummaryMetric icon={<AlertTriangle className="size-4" />} label="Đi muộn" value={stats.late} tone="amber" />
              <SummaryMetric icon={<TimerReset className="size-4" />} label="Về sớm" value={stats.early} tone="orange" />
              <SummaryMetric icon={<FileText className="size-4" />} label="Thiếu công" value={stats.missing} tone="red" />
              <SummaryMetric icon={<Send className="size-4" />} label="Chờ duyệt" value={stats.pending} tone="slate" />
            </div>

            <div className="p-4">
              <p className="mb-3 text-xs font-semibold uppercase text-slate-500">Trạng thái</p>
              <div className="space-y-2">
                {(Object.keys(statusMeta) as AttendanceStatus[]).map((status) => (
                  <div key={status} className="flex items-center gap-2 text-xs text-slate-600">
                    <span className={`size-2.5 rounded-sm ${statusMeta[status].bar}`} />
                    {statusMeta[status].label}
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <section className="min-w-0">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={() => selectCalendarDate(parseISO(currentDate))}>Hôm nay</Button>
                <Button variant="ghost" size="icon" className="size-8" onClick={() => moveCalendarWeek(-1)} title="Tuần trước">
                  <ChevronLeft className="size-5" />
                </Button>
                <Button variant="ghost" size="icon" className="size-8" onClick={() => moveCalendarWeek(1)} title="Tuần sau">
                  <ChevronRight className="size-5" />
                </Button>
                <div className="ml-2">
                  <p className="font-semibold text-slate-950">{format(parseISO(calendarDate), "'Tháng' M, yyyy", { locale: vi })}</p>
                  <p className="text-xs text-slate-500">{formatWeekRange(parseISO(calendarDate))}</p>
                </div>
              </div>

              <Select value={period} onValueChange={handlePeriodChange}>
                <SelectTrigger className="w-[175px] bg-white">
                  <CalendarDays className="mr-2 size-4 text-slate-500" />
                  <SelectValue placeholder="Chọn tháng" />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map((item) => <SelectItem key={item} value={item}>{formatPeriod(item)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <AttendanceWeekCalendar
              selectedDate={calendarDate}
              today={currentDate}
              records={history}
              requests={requests}
              onSelectDate={(date) => selectCalendarDate(date)}
              onOpenRecord={(record) => openDetail(record)}
              onOpenRequest={(request) => openDetail(undefined, request)}
              onProposeTimeChange={proposeAttendanceChange}
            />
          </section>
        </div>
      </div>

      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{requestForm.type === 'supplement' ? 'Gửi đơn bổ sung chấm công' : 'Gửi đơn điều chỉnh chấm công'}</DialogTitle>
            <DialogDescription>Đơn sẽ ở trạng thái chờ HR duyệt, User không tự thay đổi kết quả chấm công.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="requestType">Loại đơn</Label>
              <Select value={requestForm.type} onValueChange={(value) => setRequestForm((current) => ({ ...current, type: value as RequestType }))}>
                <SelectTrigger id="requestType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="supplement">Bổ sung chấm công</SelectItem>
                  <SelectItem value="adjustment">Điều chỉnh giờ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="requestDate">Ngày</Label>
              <Input id="requestDate" type="date" value={requestForm.date} onChange={(event) => setRequestForm((current) => ({ ...current, date: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="requestCheckIn">Giờ vào</Label>
              <Input id="requestCheckIn" type="time" value={requestForm.checkIn} onChange={(event) => setRequestForm((current) => ({ ...current, checkIn: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="requestCheckOut">Giờ ra</Label>
              <Input id="requestCheckOut" type="time" value={requestForm.checkOut} onChange={(event) => setRequestForm((current) => ({ ...current, checkOut: event.target.value }))} />
            </div>
          </div>

          <div className="grid gap-3 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm md:grid-cols-3">
            <div>
              <p className="text-xs text-blue-600">Ca làm chuẩn</p>
              <p className="mt-1 font-semibold text-blue-950">08:00 - 17:00</p>
            </div>
            <div>
              <p className="text-xs text-blue-600">Nghỉ trưa không tính công</p>
              <p className="mt-1 font-semibold text-blue-950">12:00 - 13:00</p>
            </div>
            <div>
              <p className="text-xs text-blue-600">Tổng giờ đề xuất</p>
              <p className="mt-1 font-semibold text-blue-950">
                {calculateWorkedHours(requestForm.checkIn, requestForm.checkOut).toFixed(2)} giờ
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="requestReason">Lý do</Label>
            <Textarea
              id="requestReason"
              rows={3}
              value={requestForm.reason}
              onChange={(event) => setRequestForm((current) => ({ ...current, reason: event.target.value }))}
              placeholder="Ví dụ: quên chấm công do họp khách hàng, máy chấm công lỗi, sai giờ ra..."
            />
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="mb-3 text-sm font-semibold text-slate-950">Báo cáo công việc kèm theo</p>
            <div className="space-y-3">
              <Input
                value={requestForm.reportTitle}
                onChange={(event) => setRequestForm((current) => ({ ...current, reportTitle: event.target.value }))}
                placeholder="Tiêu đề công việc trong ngày"
              />
              <Textarea
                rows={3}
                value={requestForm.reportDescription}
                onChange={(event) => setRequestForm((current) => ({ ...current, reportDescription: event.target.value }))}
                placeholder="Nội dung đã làm, kết quả, bằng chứng cần HR/Manager đối chiếu..."
              />
            </div>
          </div>

          {requestError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{requestError}</div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRequestDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={submitRequest}>
              <Send className="mr-2 size-4" />
              Gửi HR duyệt
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chi tiết chấm công</DialogTitle>
            <DialogDescription>Thông tin để User kiểm tra trước khi gửi bổ sung hoặc theo dõi kết quả HR duyệt.</DialogDescription>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <DetailItem label="Ngày" value={formatDate(selectedRecord.date)} />
                <DetailItem label="Trạng thái" value={statusMeta[selectedRecord.status].label} />
                <DetailItem label="Giờ vào" value={selectedRecord.checkIn || '-'} />
                <DetailItem label="Giờ ra" value={selectedRecord.checkOut || '-'} />
                <DetailItem label="Tổng giờ" value={selectedRecord.hours ? `${selectedRecord.hours.toFixed(2)}h` : '-'} />
                <DetailItem label="Ghi chú" value={selectedRecord.note} />
              </div>
              {selectedRecord.workReport && <WorkReportView report={selectedRecord.workReport} />}
            </div>
          )}

          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <DetailItem label="Loại đơn" value={selectedRequest.type === 'supplement' ? 'Bổ sung chấm công' : 'Điều chỉnh giờ'} />
                <DetailItem label="Trạng thái" value={requestMeta[selectedRequest.status].label} />
                <DetailItem label="Ngày" value={formatDate(selectedRequest.date)} />
                <DetailItem label="Giờ đề xuất" value={`${selectedRequest.checkIn} - ${selectedRequest.checkOut}`} />
                <DetailItem label="Gửi lúc" value={selectedRequest.submittedAt} />
                <DetailItem label="Người duyệt" value={selectedRequest.reviewedBy || 'Chưa duyệt'} />
              </div>
              <DetailItem label="Lý do" value={selectedRequest.reason} />
              {selectedRequest.reviewNote && <DetailItem label="Phản hồi HR" value={selectedRequest.reviewNote} />}
              {selectedRequest.workReport && <WorkReportView report={selectedRequest.workReport} />}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface AttendanceHistoryPopoverProps {
  period: string;
  records: AttendanceRecord[];
  requests: AttendanceRequest[];
  onOpenRecord: (record: AttendanceRecord) => void;
  onOpenRequest: (request: AttendanceRequest) => void;
  onAdjustRecord: (record: AttendanceRecord) => void;
}

function AttendanceHistoryPopover({
  period,
  records,
  requests,
  onOpenRecord,
  onOpenRequest,
  onAdjustRecord,
}: AttendanceHistoryPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <History className="mr-2 size-4" />
          Lịch sử
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[min(920px,calc(100vw-2rem))] overflow-hidden p-0">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-950">Chấm công {formatPeriod(period)}</h2>
          <p className="mt-1 text-xs text-slate-500">Tổng giờ đã tự trừ thời gian nghỉ trưa 12:00 - 13:00.</p>
        </div>

        <Tabs defaultValue="history">
          <TabsList className="mx-4 mt-3">
            <TabsTrigger value="history">Lịch sử ({records.length})</TabsTrigger>
            <TabsTrigger value="requests">Đơn đã gửi ({requests.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="m-0 max-h-[58vh] overflow-auto">
            {records.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">Chưa có dữ liệu chấm công trong kỳ này.</div>
            ) : (
              <table className="w-full min-w-[760px]">
                <thead className="sticky top-0 z-10 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Ngày</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Giờ vào</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Giờ ra</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Thực làm</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Trạng thái</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map((record) => (
                    <tr key={record.date} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-950">{formatDate(record.date)}</p>
                        <p className="text-xs capitalize text-slate-500">{getDayName(record.date)}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{record.checkIn || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{record.checkOut || '-'}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                        {record.checkIn && record.checkOut ? `${calculateWorkedHours(record.checkIn, record.checkOut).toFixed(2)}h` : '-'}
                      </td>
                      <td className="px-4 py-3"><Badge className={statusMeta[record.status].className}>{statusMeta[record.status].label}</Badge></td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => onOpenRecord(record)}>
                            <Eye className="mr-1.5 size-4" />
                            Xem
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => onAdjustRecord(record)}>
                            {record.status === 'missing' ? 'Bổ sung' : 'Điều chỉnh'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </TabsContent>

          <TabsContent value="requests" className="m-0 max-h-[58vh] overflow-y-auto p-4">
            {requests.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">Chưa có đơn chấm công nào trong kỳ này.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {requests.map((request) => (
                  <div key={request.id} className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-950">
                          {request.type === 'supplement' ? 'Bổ sung' : 'Điều chỉnh'} ngày {formatDate(request.date)}
                        </p>
                        <Badge className={requestMeta[request.status].className}>{requestMeta[request.status].label}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{request.checkIn} - {request.checkOut} · {calculateWorkedHours(request.checkIn, request.checkOut).toFixed(2)} giờ thực làm</p>
                      <p className="mt-1 text-xs text-slate-500">{request.reason}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => onOpenRequest(request)}>
                      <Eye className="mr-1.5 size-4" />
                      Chi tiết
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}

interface AttendanceWeekCalendarProps {
  selectedDate: string;
  today: string;
  records: AttendanceRecord[];
  requests: AttendanceRequest[];
  onSelectDate: (date: Date) => void;
  onOpenRecord: (record: AttendanceRecord) => void;
  onOpenRequest: (request: AttendanceRequest) => void;
  onProposeTimeChange: (record: AttendanceRecord, checkIn: string, checkOut: string) => void;
}

interface CheckoutResizeState {
  date: string;
  checkIn: string;
  checkOut: string;
  dayTop: number;
  dayHeight: number;
}

function checkoutTimeFromPointer(clientY: number, state: CheckoutResizeState) {
  const position = Math.max(0, Math.min(clientY - state.dayTop, state.dayHeight));
  const rawMinutes = calendarStartHour * 60 + (position / state.dayHeight) * (calendarEndHour - calendarStartHour) * 60;
  const snappedMinutes = Math.round(rawMinutes / 15) * 15;
  return minutesToTime(Math.max(timeToMinutes(state.checkIn) + 15, Math.min(snappedMinutes, calendarEndHour * 60)));
}

function AttendanceWeekCalendar({
  selectedDate,
  today,
  records,
  requests,
  onSelectDate,
  onOpenRecord,
  onOpenRequest,
  onProposeTimeChange,
}: AttendanceWeekCalendarProps) {
  const [checkoutResize, setCheckoutResize] = useState<CheckoutResizeState | null>(null);
  const checkoutResizeRef = useRef<CheckoutResizeState | null>(null);
  const weekStart = startOfWeek(parseISO(selectedDate), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const timelineHeight = calendarHours.length * calendarRowHeight;
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowTop = ((nowMinutes - calendarStartHour * 60) / 60) * calendarRowHeight;
  const lunchTop = ((workSchedule.lunchStart - calendarStartHour * 60) / 60) * calendarRowHeight;
  const lunchHeight = ((workSchedule.lunchEnd - workSchedule.lunchStart) / 60) * calendarRowHeight;

  const startCheckoutResize = (event: ReactPointerEvent<HTMLElement>, record: AttendanceRecord) => {
    if (!record.checkIn || !record.checkOut) return;
    event.preventDefault();
    event.stopPropagation();
    const dayColumn = event.currentTarget.closest<HTMLElement>('[data-attendance-day]');
    if (!dayColumn) return;
    const rect = dayColumn.getBoundingClientRect();
    event.currentTarget.setPointerCapture(event.pointerId);
    const nextState: CheckoutResizeState = {
      date: record.date,
      checkIn: record.checkIn,
      checkOut: record.checkOut,
      dayTop: rect.top,
      dayHeight: rect.height,
    };
    checkoutResizeRef.current = nextState;
    setCheckoutResize(nextState);
  };

  useEffect(() => {
    if (!checkoutResize?.date) return;

    const handlePointerMove = (event: PointerEvent) => {
      const current = checkoutResizeRef.current;
      if (!current) return;
      const nextState = { ...current, checkOut: checkoutTimeFromPointer(event.clientY, current) };
      checkoutResizeRef.current = nextState;
      setCheckoutResize(nextState);
    };

    const clearResize = () => {
      checkoutResizeRef.current = null;
      setCheckoutResize(null);
    };

    const handlePointerUp = (event: PointerEvent) => {
      const current = checkoutResizeRef.current;
      if (!current) return;
      const nextCheckOut = checkoutTimeFromPointer(event.clientY, current);
      const record = records.find((item) => item.date === current.date);
      clearResize();
      if (record) onProposeTimeChange(record, current.checkIn, nextCheckOut);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', clearResize);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', clearResize);
    };
  }, [checkoutResize?.date, onProposeTimeChange, records]);

  const startAttendanceDrag = (event: DragEvent<HTMLElement>, record: AttendanceRecord, mode: 'move' | 'checkout') => {
    if (!record.checkIn || !record.checkOut) {
      event.preventDefault();
      return;
    }
    event.stopPropagation();
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', JSON.stringify({ date: record.date, mode }));
  };

  const handleAttendanceDrop = (event: DragEvent<HTMLDivElement>, dateIso: string) => {
    event.preventDefault();
    let payload: { date?: string; mode?: 'move' | 'checkout' };
    try {
      payload = JSON.parse(event.dataTransfer.getData('text/plain'));
    } catch {
      return;
    }

    if (payload.date !== dateIso) return;
    const record = records.find((item) => item.date === payload.date);
    if (!record?.checkIn || !record.checkOut) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const position = Math.max(0, Math.min(event.clientY - rect.top, rect.height));
    const rawMinutes = calendarStartHour * 60 + (position / rect.height) * (calendarEndHour - calendarStartHour) * 60;
    const snappedMinutes = Math.round(rawMinutes / 15) * 15;
    const originalStart = timeToMinutes(record.checkIn);
    const originalEnd = timeToMinutes(record.checkOut);

    if (payload.mode === 'checkout') {
      const nextEnd = Math.max(originalStart + 15, Math.min(snappedMinutes, calendarEndHour * 60));
      onProposeTimeChange(record, record.checkIn, minutesToTime(nextEnd));
      return;
    }

    const duration = originalEnd - originalStart;
    const nextStart = Math.max(calendarStartHour * 60, Math.min(snappedMinutes, calendarEndHour * 60 - duration));
    onProposeTimeChange(record, minutesToTime(nextStart), minutesToTime(nextStart + duration));
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[920px]">
        <div className="grid grid-cols-[64px_repeat(7,minmax(112px,1fr))] border-b border-slate-200 bg-white">
          <div className="flex items-end justify-center border-r border-slate-200 pb-3 text-[10px] font-medium text-slate-400">GMT+7</div>
          {weekDays.map((day) => {
            const dateIso = toIsoDate(day);
            const isToday = dateIso === today;
            const isSelected = dateIso === selectedDate;
            const dayRequests = requests.filter((request) => request.date === dateIso);
            const firstRequest = dayRequests[0];
            return (
              <div key={dateIso} className={`min-h-[92px] border-r border-slate-200 px-2 py-2 text-center last:border-r-0 ${isSelected ? 'bg-blue-50/60' : ''}`}>
                <button type="button" className="group mx-auto block" onClick={() => onSelectDate(day)}>
                  <span className={`block text-[11px] font-semibold uppercase ${isToday ? 'text-blue-600' : 'text-slate-500'}`}>
                    {format(day, 'EEE', { locale: vi })}
                  </span>
                  <span className={`mx-auto mt-1 flex size-9 items-center justify-center rounded-full text-lg ${isToday ? 'bg-blue-600 font-semibold text-white' : isSelected ? 'bg-blue-100 font-semibold text-blue-700' : 'text-slate-800 group-hover:bg-slate-100'}`}>
                    {format(day, 'd')}
                  </span>
                </button>
                {firstRequest && (
                  <button
                    type="button"
                    className={`mt-1 max-w-full truncate rounded px-1.5 py-0.5 text-[10px] font-medium ${requestMeta[firstRequest.status].className}`}
                    onClick={() => onOpenRequest(firstRequest)}
                    title={firstRequest.reason}
                  >
                    {requestMeta[firstRequest.status].label}{dayRequests.length > 1 ? ` +${dayRequests.length - 1}` : ''}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-[64px_repeat(7,minmax(112px,1fr))] bg-white">
          <div className="relative border-r border-slate-200" style={{ height: timelineHeight }}>
            {calendarHours.map((hour, index) => (
              <span
                key={hour}
                className="absolute right-2 -translate-y-1/2 text-[10px] font-medium text-slate-400"
                style={{ top: index * calendarRowHeight }}
              >
                {String(hour).padStart(2, '0')}:00
              </span>
            ))}
            <span
              className="absolute inset-x-1 z-10 -translate-y-1/2 rounded bg-slate-200 px-1 py-0.5 text-center text-[9px] font-semibold text-slate-600"
              style={{ top: lunchTop + lunchHeight / 2 }}
            >
              Nghỉ trưa
            </span>
          </div>

          {weekDays.map((day) => {
            const dateIso = toIsoDate(day);
            const dayRecords = records.filter((record) => record.date === dateIso);
            const isToday = dateIso === today;
            const isSelected = dateIso === selectedDate;
            return (
              <div
                key={dateIso}
                data-attendance-day={dateIso}
                className={`relative border-r border-slate-200 last:border-r-0 ${isSelected ? 'bg-blue-50/30' : ''}`}
                style={{ height: timelineHeight }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => handleAttendanceDrop(event, dateIso)}
              >
                {calendarHours.map((hour, index) => (
                  <div
                    key={hour}
                    className="absolute inset-x-0 border-t border-slate-100"
                    style={{ top: index * calendarRowHeight }}
                  />
                ))}

                <div
                  className="pointer-events-none absolute inset-x-0 z-[1] border-y border-slate-200 bg-slate-100/90"
                  style={{ top: lunchTop, height: lunchHeight }}
                />

                {dayRecords.map((record) => {
                  const displayedRecord = checkoutResize?.date === record.date
                    ? { ...record, checkOut: checkoutResize.checkOut }
                    : record;
                  const segments = getWorkSegments(displayedRecord, nowMinutes);
                  const eventTone = {
                    completed: 'border-emerald-300 bg-emerald-100 text-emerald-950 hover:bg-emerald-200',
                    working: 'border-blue-300 bg-blue-100 text-blue-950 hover:bg-blue-200',
                    late: 'border-amber-300 bg-amber-100 text-amber-950 hover:bg-amber-200',
                    early: 'border-orange-300 bg-orange-100 text-orange-950 hover:bg-orange-200',
                    missing: 'border-red-300 bg-red-100 text-red-950 hover:bg-red-200',
                  }[record.status];
                  const workedHours = calculateWorkedHours(displayedRecord.checkIn, displayedRecord.checkOut);
                  return segments.map((segment, segmentIndex) => {
                    const metrics = getCalendarSegmentMetrics(segment.start, segment.end);
                    const isLastSegment = segmentIndex === segments.length - 1;
                    return (
                      <button
                        key={`${record.date}-${segmentIndex}`}
                        type="button"
                        draggable={Boolean(record.checkIn && record.checkOut)}
                        className={`absolute inset-x-1 z-10 overflow-hidden rounded-md border-l-4 p-2 text-left text-xs shadow-sm transition-colors ${record.checkOut ? 'cursor-grab active:cursor-grabbing' : ''} ${eventTone}`}
                        style={{ top: metrics.top, height: metrics.height }}
                        onClick={() => onOpenRecord(record)}
                        onDragStart={(event) => startAttendanceDrag(event, record, 'move')}
                        title={record.checkOut ? 'Kéo block để đề xuất đổi cả giờ vào và giờ ra' : `${statusMeta[record.status].label}: ${record.note}`}
                      >
                        <span className="block font-semibold">{statusMeta[record.status].label}</span>
                        <span className="mt-0.5 block font-medium">{displayedRecord.checkIn || '--:--'} - {displayedRecord.checkOut || '--:--'}</span>
                        {metrics.height >= 70 && <span className="mt-1 line-clamp-2 block opacity-80">{record.note}</span>}
                        {metrics.height >= 105 && workedHours > 0 && <span className="mt-1 block opacity-70">{workedHours.toFixed(2)} giờ thực làm</span>}
                        {isLastSegment && record.checkOut && (
                          <span
                            className="absolute inset-x-0 bottom-0 flex h-5 touch-none cursor-ns-resize items-center justify-center bg-black/5"
                            onClick={(event) => event.stopPropagation()}
                            onPointerDown={(event) => startCheckoutResize(event, record)}
                            title="Kéo mép dưới để đề xuất sửa giờ check-out"
                          >
                            <GripHorizontal className="size-3.5" />
                          </span>
                        )}
                      </button>
                    );
                  });
                })}

                {isToday && nowTop >= 0 && nowTop <= timelineHeight && (
                  <div className="pointer-events-none absolute inset-x-0 z-20 flex items-center" style={{ top: nowTop }}>
                    <span className="-ml-1 size-2 rounded-full bg-red-500" />
                    <span className="h-px flex-1 bg-red-500" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SummaryMetric({ icon, label, value, tone }: { icon: ReactNode; label: string; value: number | string; tone: 'blue' | 'amber' | 'emerald' | 'red' | 'slate' | 'orange' }) {
  const toneClass = {
    blue: 'text-blue-600',
    amber: 'text-amber-600',
    emerald: 'text-emerald-600',
    red: 'text-red-600',
    slate: 'text-slate-600',
    orange: 'text-orange-600',
  }[tone];

  return (
    <div className="min-w-0 border-b border-r border-slate-200 p-3 even:border-r-0">
      <div className="flex items-center gap-2">
        <span className={toneClass}>{icon}</span>
        <div className="min-w-0">
          <p className="truncate text-[11px] text-slate-500">{label}</p>
          <p className="text-base font-bold text-slate-950">{value}</p>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-950">{value}</p>
    </div>
  );
}

function WorkReportView({ report }: { report: WorkReport }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4">
      <p className="text-sm font-semibold text-slate-950">{report.title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{report.description}</p>
      {report.note && <p className="mt-2 text-sm text-slate-500">{report.note}</p>}
    </div>
  );
}
