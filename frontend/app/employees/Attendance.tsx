'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import {
  AlertTriangle,
  BriefcaseBusiness,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ClipboardCheck,
  Eye,
  FileText,
  GripHorizontal,
  History,
  LoaderCircle,
  Play,
  RefreshCcw,
  Save,
  Send,
  Square,
  TimerReset,
  Trash2,
  X,
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
  AttendanceRequestApiItem,
  AttendanceShiftApiItem,
  checkInEmployeeAttendance,
  checkOutEmployeeAttendance,
  createAttendanceRequest,
  createAttendanceShift,
  deleteAttendanceShift,
  fetchAttendanceMonthlyRecords,
  fetchAttendanceMonthlyReport,
  fetchAttendanceRequests,
  fetchAttendanceShifts,
  updateAttendanceShift,
  updateAttendanceWorkReport,
} from '@/services/attendance';
import { getCurrentEmployeeId } from '@/services/tasks';

type AttendanceStatus = 'completed' | 'working' | 'late' | 'early' | 'missing';
type RequestStatus = 'pending' | 'approved' | 'rejected';
type RequestType = 'supplement' | 'adjustment';
type PlannedShiftStatus = 'planned' | 'working' | 'completed';

interface WorkReport {
  title: string;
  description: string;
  note?: string;
}

interface AttendanceRecord {
  id: number;
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

interface PlannedShift {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  description?: string;
  status: PlannedShiftStatus;
  report?: WorkReport;
}

interface ShiftDraft {
  id?: string;
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  description: string;
  status: PlannedShiftStatus;
}

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
const calendarHours = Array.from({ length: 24 }, (_, index) => index);
const calendarRowHeight = 20;
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

  return Math.max(0, end - start - calculateLunchBreakMinutes(checkIn, checkOut));
}

function calculateWorkedHours(checkIn?: string, checkOut?: string) {
  return calculateWorkedMinutes(checkIn, checkOut) / 60;
}

function calculateLunchBreakMinutes(checkIn?: string, checkOut?: string) {
  if (!checkIn || !checkOut) return 0;
  const start = timeToMinutes(checkIn);
  const end = timeToMinutes(checkOut);
  if (end <= start) return 0;

  return Math.max(
    0,
    Math.min(end, workSchedule.lunchEnd) - Math.max(start, workSchedule.lunchStart),
  );
}

function getCalendarSegmentMetrics(startMinutes: number, endMinutes: number) {
  const gridStart = calendarStartHour * 60;
  const gridEnd = calendarEndHour * 60;
  const visibleStart = Math.max(gridStart, Math.min(startMinutes, gridEnd - 15));
  const visibleEnd = Math.max(visibleStart + 15, Math.min(endMinutes, gridEnd));

  return {
    top: ((visibleStart - gridStart) / 60) * calendarRowHeight,
    height: Math.max(18, ((visibleEnd - visibleStart) / 60) * calendarRowHeight),
  };
}

function timeFromCalendarPointer(clientY: number, top: number, height: number) {
  const position = Math.max(0, Math.min(clientY - top, height));
  const rawMinutes = calendarStartHour * 60 + (position / height) * (calendarEndHour - calendarStartHour) * 60;
  return Math.max(0, Math.min(Math.round(rawMinutes / 30) * 30, 24 * 60));
}

function createShiftDraft(date = todayIso(), startTime = '08:00', endTime = '17:00'): ShiftDraft {
  return {
    date,
    startTime,
    endTime,
    title: 'Ca làm việc',
    description: '',
    status: 'planned',
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
    id: item.id,
    date,
    checkIn,
    checkOut,
    hours: checkIn && checkOut ? calculateWorkedHours(checkIn, checkOut) : Number(item.totalHours || 0),
    status,
    note: item.note && item.note !== '-' ? item.note : statusMeta[status].label,
    workReport:
      item.workReportTitle || item.workReportDescription || item.workReportNote
        ? {
            title: item.workReportTitle || 'Báo cáo công việc',
            description: item.workReportDescription || '',
            note: item.workReportNote || undefined,
          }
        : undefined,
  };
}

function mapApiRequest(item: AttendanceRequestApiItem): AttendanceRequest {
  const normalizedStatus = item.status.toLowerCase() as RequestStatus;
  const normalizedType = (
    item.requestType?.toLowerCase() ||
    item.type ||
    'supplement'
  ) as RequestType;

  return {
    id: item.id,
    employeeName: item.employeeName,
    employeeId: String(item.employeeCode || item.employeeId),
    department: item.department,
    type: normalizedType,
    date: (item.workDate || item.date || '').slice(0, 10),
    checkIn: formatTimeFromIso(item.requestedCheckIn || item.checkIn),
    checkOut: formatTimeFromIso(item.requestedCheckOut || item.checkOut),
    reason: item.reason,
    status: normalizedStatus,
    submittedAt: item.submittedAt,
    reviewedBy: item.reviewedBy || undefined,
    reviewedAt: item.reviewedAt || undefined,
    reviewNote: item.reviewNote || undefined,
    originalCheckIn: formatTimeFromIso(item.originalCheckIn),
    originalCheckOut: formatTimeFromIso(item.originalCheckOut),
    workReport:
      item.workReportTitle || item.workReportDescription
        ? {
            title: item.workReportTitle || 'Báo cáo công việc',
            description: item.workReportDescription || '',
          }
        : undefined,
  };
}

function mapApiShift(item: AttendanceShiftApiItem): PlannedShift {
  const statusMap: Record<AttendanceShiftApiItem['status'], PlannedShiftStatus> = {
    PLANNED: 'planned',
    WORKING: 'working',
    COMPLETED: 'completed',
    CANCELLED: 'completed',
  };

  return {
    id: String(item.id),
    date: item.workDate.slice(0, 10),
    startTime: item.startTime.slice(0, 5),
    endTime: item.endTime.slice(0, 5),
    title: item.title,
    description: item.description || '',
    status: statusMap[item.status],
  };
}

function getApiError(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
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
  const currentDate = todayIso();
  const [period, setPeriod] = useState(currentPeriodValue());
  const [calendarDate, setCalendarDate] = useState(currentDate);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [requests, setRequests] = useState<AttendanceRequest[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<AttendanceMonthlyReportItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [dataError, setDataError] = useState('');
  const [message, setMessage] = useState('');
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<AttendanceRequest | null>(null);
  const [requestForm, setRequestForm] = useState(emptyRequestForm());
  const [requestError, setRequestError] = useState('');
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [plannedShifts, setPlannedShifts] = useState<PlannedShift[]>([]);
  const [shiftDraft, setShiftDraft] = useState<ShiftDraft>(() => createShiftDraft(currentDate));
  const [shiftError, setShiftError] = useState('');
  const [shiftSaving, setShiftSaving] = useState(false);
  const [attendanceActionLoading, setAttendanceActionLoading] = useState(false);
  const [checkoutReport, setCheckoutReport] = useState<WorkReport>({ title: '', description: '', note: '' });
  const [editingReportShiftId, setEditingReportShiftId] = useState<string | null>(null);

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
  const todayShift = useMemo(
    () => plannedShifts.find((shift) => shift.date === currentDate) || null,
    [currentDate, plannedShifts],
  );
  const shiftAttendanceRecord = useMemo(
    () => history.find((record) => record.date === shiftDraft.date) || null,
    [history, shiftDraft.date],
  );

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

  const loadAttendance = useCallback(async () => {
    const { month, year } = parsePeriod(period);
    setLoading(true);
    setMessage('');
    setDataError('');

    try {
      const [monthlyData, attendanceData, requestData, shiftData] = await Promise.all([
        fetchAttendanceMonthlyReport(year, month),
        fetchAttendanceMonthlyRecords(year, month),
        fetchAttendanceRequests(),
        fetchAttendanceShifts(year, month, employeeId),
      ]);

      const mappedAttendance = attendanceData
        .filter((item) => Number(item.employeeId) === employeeId)
        .map(mapApiAttendance);
      const mappedShifts = shiftData.map(mapApiShift).map((shift) => ({
        ...shift,
        report: mappedAttendance.find((record) => record.date === shift.date)?.workReport,
      }));

      setMonthlySummary(monthlyData.find((item) => Number(item.employeeId) === employeeId) || null);
      setHistory(mappedAttendance);
      setRequests(
        requestData
          .filter((item) => Number(item.employeeId) === employeeId)
          .map(mapApiRequest),
      );
      setPlannedShifts(mappedShifts);
    } catch (error) {
      console.error('Không tải được dữ liệu chấm công:', error);
      setMonthlySummary(null);
      setDataError(getApiError(error, 'Không tải được dữ liệu chấm công từ máy chủ.'));
    } finally {
      setLoading(false);
    }
  }, [employeeId, period]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const handleCheckIn = async () => {
    setMessage('');
    setDataError('');

    try {
      const result = await checkInEmployeeAttendance(employeeId);
      if (result.data) {
        mergeRecord(mapApiAttendance(result.data));
      }
      setMessage(result.message || (result.success ? 'Check-in thành công.' : 'Không check-in được.'));
      return result.success;
    } catch (error) {
      const errorMessage = getApiError(error, 'Không thể check-in. Vui lòng kiểm tra kết nối máy chủ.');
      setDataError(errorMessage);
      return false;
    }
  };

  const handleCheckOut = async (report?: WorkReport) => {
    setMessage('');
    setDataError('');

    try {
      const result = await checkOutEmployeeAttendance(employeeId, {
        workReportTitle: report?.title,
        workReportDescription: report?.description,
        workReportNote: report?.note,
      });
      if (result.data) {
        mergeRecord(mapApiAttendance(result.data));
      }
      setMessage(result.message || (result.success ? 'Check-out thành công.' : 'Không check-out được.'));
      return result.success;
    } catch (error) {
      const errorMessage = getApiError(error, 'Không thể check-out. Vui lòng kiểm tra kết nối máy chủ.');
      setDataError(errorMessage);
      return false;
    }
  };

  const openNewShift = (date: string, startTime: string, endTime: string) => {
    setShiftDraft(createShiftDraft(date, startTime, endTime));
    setShiftError('');
    setShiftDialogOpen(true);
  };

  const openShift = (shift: PlannedShift) => {
    const attendance = history.find((record) => record.date === shift.date);
    const effectiveStatus: PlannedShiftStatus = attendance?.checkOut
      ? 'completed'
      : attendance?.checkIn
        ? 'working'
        : shift.status;
    setShiftDraft({ ...shift, status: effectiveStatus, description: shift.description || '' });
    setShiftError('');
    setShiftDialogOpen(true);
  };

  const saveShift = async () => {
    setShiftError('');
    if (!shiftDraft.title.trim()) {
      setShiftError('Vui lòng nhập tên hoặc nội dung chính của ca làm.');
      return;
    }
    if (timeToMinutes(shiftDraft.endTime) <= timeToMinutes(shiftDraft.startTime)) {
      setShiftError('Giờ kết thúc phải sau giờ bắt đầu.');
      return;
    }

    setShiftSaving(true);
    try {
      const payload = {
        employeeId,
        workDate: shiftDraft.date,
        startTime: shiftDraft.startTime,
        endTime: shiftDraft.endTime,
        title: shiftDraft.title.trim(),
        description: shiftDraft.description.trim() || undefined,
      };
      const saved = shiftDraft.id
        ? await updateAttendanceShift(Number(shiftDraft.id), payload)
        : await createAttendanceShift(payload);
      const nextShift = mapApiShift(saved);

      setPlannedShifts((current) => (
        shiftDraft.id
          ? current.map((shift) => (shift.id === shiftDraft.id ? nextShift : shift))
          : [...current, nextShift]
      ));
      setShiftDialogOpen(false);
      setMessage(`Đã lưu ca ${nextShift.startTime} - ${nextShift.endTime} ngày ${formatDate(nextShift.date)}.`);
    } catch (error) {
      setShiftError(getApiError(error, 'Không thể lưu ca làm vào hệ thống.'));
    } finally {
      setShiftSaving(false);
    }
  };

  const deleteShift = async () => {
    if (!shiftDraft.id || shiftDraft.status !== 'planned') return;
    setShiftSaving(true);
    setShiftError('');
    try {
      await deleteAttendanceShift(Number(shiftDraft.id));
      setPlannedShifts((current) => current.filter((shift) => shift.id !== shiftDraft.id));
      setShiftDialogOpen(false);
      setMessage('Đã xóa ca dự kiến.');
    } catch (error) {
      setShiftError(getApiError(error, 'Không thể xóa ca làm.'));
    } finally {
      setShiftSaving(false);
    }
  };

  const updateTodayShiftStatus = (status: PlannedShiftStatus, report?: WorkReport) => {
    setPlannedShifts((current) => current.map((shift) => (
      shift.date === currentDate && shift.status !== 'completed'
        ? { ...shift, status, report: report || shift.report }
        : shift
    )));
  };

  const handleAttendanceAction = async () => {
    if (attendanceActionLoading || todayRecord?.checkOut) return;

    if (!todayRecord?.checkIn) {
      setAttendanceActionLoading(true);
      try {
        const success = await handleCheckIn();
        if (success) {
          updateTodayShiftStatus('working');
          setShiftDialogOpen(false);
        }
      } finally {
        setAttendanceActionLoading(false);
      }
      return;
    }

    setCheckoutReport({
      title: todayShift?.title || 'Báo cáo công việc trong ca',
      description: todayShift?.report?.description || todayShift?.description || '',
      note: todayShift?.report?.note || '',
    });
    setEditingReportShiftId(null);
    setShiftDialogOpen(false);
    setCheckoutDialogOpen(true);
  };

  const openCompletedReportEditor = () => {
    if (!shiftDraft.id) return;
    const shift = plannedShifts.find((item) => item.id === shiftDraft.id);
    if (!shift) return;

    setCheckoutReport({
      title: shift.report?.title || shift.title,
      description: shift.report?.description || shift.description || '',
      note: shift.report?.note || '',
    });
    setEditingReportShiftId(shift.id);
    setShiftDialogOpen(false);
    setCheckoutDialogOpen(true);
  };

  const finishAttendanceShift = async () => {
    if (!checkoutReport.description.trim()) return;
    const report = {
      title: checkoutReport.title.trim() || 'Báo cáo công việc trong ca',
      description: checkoutReport.description.trim(),
      note: checkoutReport.note?.trim(),
    };

    if (editingReportShiftId) {
      const editedShift = plannedShifts.find((shift) => shift.id === editingReportShiftId);
      const attendance = editedShift
        ? history.find((record) => record.date === editedShift.date)
        : null;
      if (!attendance) {
        setDataError('Không tìm thấy bản ghi chấm công để cập nhật báo cáo.');
        return;
      }

      setAttendanceActionLoading(true);
      setDataError('');
      try {
        const updated = await updateAttendanceWorkReport(attendance.id, {
          workReportTitle: report.title,
          workReportDescription: report.description,
          workReportNote: report.note,
        });
        mergeRecord(mapApiAttendance(updated));
        setPlannedShifts((current) => current.map((shift) => (
          shift.id === editingReportShiftId ? { ...shift, report } : shift
        )));
        setMessage('Đã cập nhật báo cáo công việc. Giờ chấm công thực tế không thay đổi.');
        setEditingReportShiftId(null);
        setCheckoutDialogOpen(false);
      } catch (error) {
        setDataError(getApiError(error, 'Không thể cập nhật báo cáo công việc.'));
      } finally {
        setAttendanceActionLoading(false);
      }
      return;
    }

    setAttendanceActionLoading(true);
    try {
      const success = await handleCheckOut(report);
      if (success) {
        updateTodayShiftStatus('completed', report);
        setCheckoutDialogOpen(false);
      }
    } finally {
      setAttendanceActionLoading(false);
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

  const submitRequest = async () => {
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

    setRequestSubmitting(true);
    try {
      const saved = await createAttendanceRequest({
        employeeId,
        workDate: requestForm.date,
        requestType: requestForm.type === 'supplement' ? 'SUPPLEMENT' : 'ADJUSTMENT',
        requestedCheckIn: requestForm.checkIn,
        requestedCheckOut: requestForm.checkOut,
        reason: requestForm.reason.trim(),
        workReportTitle: requestForm.reportTitle.trim() || undefined,
        workReportDescription: requestForm.reportDescription.trim() || undefined,
      });
      const nextRequest = mapApiRequest(saved);
      setRequests((current) => [nextRequest, ...current.filter((item) => item.id !== nextRequest.id)]);
      setMessage('Đã gửi đơn chấm công ở trạng thái chờ HR duyệt.');
      setRequestDialogOpen(false);
      setSelectedRecord(null);
      setRequestForm(emptyRequestForm());
    } catch (error) {
      setRequestError(getApiError(error, 'Không thể gửi đơn chấm công.'));
    } finally {
      setRequestSubmitting(false);
    }
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

  const selectedCalendarRecord = history.find((record) => record.date === calendarDate);
  const isShiftForToday = Boolean(shiftDraft.id) && shiftDraft.date === currentDate;
  const shiftHasEnded = shiftDraft.status === 'completed'
    || (shiftDraft.date === currentDate && Boolean(todayRecord?.checkOut));
  const shiftHasStarted = shiftDraft.status === 'working'
    || (shiftDraft.date === currentDate && Boolean(todayRecord?.checkIn) && !todayRecord?.checkOut);
  const shiftActionLabel = attendanceActionLoading
    ? (shiftHasStarted ? 'Đang kết thúc...' : 'Đang bắt đầu...')
    : !shiftDraft.id
      ? 'Lưu ca trước'
      : shiftDraft.date !== currentDate
        ? 'Chỉ dùng hôm nay'
        : shiftHasEnded
          ? 'Đã kết thúc'
          : shiftHasStarted
            ? 'Kết thúc'
            : 'Bắt đầu';

  return (
    <div className="space-y-3 rounded-2xl bg-slate-50/70 p-3 text-[13px]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-100">
            <ClipboardCheck className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-950">Chấm công</h1>
            <p className="mt-0.5 text-xs text-slate-500">Theo dõi giờ làm và xử lý dữ liệu chấm công của bạn.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 [&_button]:h-9">
          <Button variant="outline" size="sm" onClick={loadAttendance} disabled={loading} title="Làm mới dữ liệu">
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
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => openRequestDialog(calendarDate, selectedCalendarRecord ? 'adjustment' : 'supplement', selectedCalendarRecord)}>
            <Send className="mr-2 size-4" />
            Tạo yêu cầu
          </Button>
        </div>
      </div>

      {message && <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">{message}</div>}

      {dataError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {dataError}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/70">
        <div className="grid lg:grid-cols-[208px_minmax(0,1fr)]">
          <aside className="border-b border-slate-200 bg-slate-50/80 lg:border-b-0 lg:border-r">
            <div className="border-b border-slate-200 p-2.5">
              <p className="text-xs font-semibold uppercase text-slate-500">Hôm nay, {formatDate(currentDate)}</p>
              <div className="mt-1.5 flex items-start justify-between gap-2">
                <div>
                  <p className="text-base font-bold text-slate-950">{todayRecord ? statusMeta[todayRecord.status].label : 'Chưa check-in'}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {todayRecord?.checkIn || '--:--'} <span className="mx-1">-</span> {todayRecord?.checkOut || '--:--'}
                  </p>
                </div>
                <span className={`mt-1 size-3 rounded-full ${todayRecord ? statusMeta[todayRecord.status].bar : 'bg-slate-300'}`} />
              </div>

              <Button
                size="sm"
                variant="ghost"
                className="mt-2 w-full justify-start px-0 text-blue-700 hover:bg-transparent hover:text-blue-800"
                onClick={() => openRequestDialog(currentDate, 'supplement', todayRecord || undefined)}
              >
                <Send className="mr-2 size-4" />
                Bổ sung chấm công
              </Button>
            </div>

            <div className="border-b border-slate-200 p-2.5">
              <div className="mb-2 flex items-center justify-between">
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
                      className={`relative mx-auto flex size-5 items-center justify-center rounded-full text-[10px] transition-colors ${
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

            <div className="p-2.5">
              <p className="mb-1.5 text-[10px] font-semibold uppercase text-slate-500">Trạng thái</p>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1">
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
            <div className="flex flex-col gap-2 border-b border-slate-200 bg-white/90 px-3 py-2 xl:flex-row xl:items-center xl:justify-between">
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
              plannedShifts={plannedShifts}
              onSelectDate={(date) => selectCalendarDate(date)}
              onOpenRecord={(record) => openDetail(record)}
              onOpenRequest={(request) => openDetail(undefined, request)}
              onOpenShift={openShift}
              onCreateShift={openNewShift}
              onProposeTimeChange={proposeAttendanceChange}
            />
          </section>
        </div>
      </div>

      <Dialog open={shiftDialogOpen} onOpenChange={setShiftDialogOpen}>
        <DialogContent
          className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-xl overflow-x-hidden overflow-y-auto"
          showCloseButton={false}
        >
          <DialogHeader className="min-w-0">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <DialogTitle className="flex items-center gap-2">
                  <CalendarPlus className="size-5 shrink-0 text-blue-600" />
                  {shiftDraft.id ? 'Chi tiết ca làm' : 'Tạo ca làm'}
                </DialogTitle>
                <DialogDescription className="mt-1 max-w-md leading-5">
                  Ca dự kiến giúp bạn tự sắp xếp lịch. Giờ chấm công thật chỉ được ghi nhận khi bắt đầu và kết thúc ca.
                </DialogDescription>
              </div>
              <div className="w-fit shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-1 shadow-sm">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAttendanceAction}
                  disabled={attendanceActionLoading || !isShiftForToday || shiftHasEnded}
                  title={
                    shiftDraft.date === currentDate
                      ? shiftActionLabel
                      : 'Chỉ có thể chấm công cho ca trong ngày hôm nay'
                  }
                  className={
                    shiftHasEnded
                      ? 'h-8 bg-white px-2.5 text-xs font-semibold text-slate-500 shadow-none hover:bg-white'
                      : shiftHasStarted
                        ? 'h-8 bg-rose-600 px-2.5 text-xs font-semibold text-white hover:bg-rose-700'
                        : 'h-8 bg-emerald-600 px-2.5 text-xs font-semibold text-white hover:bg-emerald-700'
                  }
                >
                  {attendanceActionLoading
                    ? <LoaderCircle className="mr-1.5 size-3.5 animate-spin" />
                    : shiftHasEnded
                      ? <CheckCircle2 className="mr-1.5 size-3.5" />
                      : shiftHasStarted
                        ? <Square className="mr-1.5 size-3 fill-current" />
                        : <Play className="mr-1.5 size-3.5 fill-current" />}
                  {shiftActionLabel}
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="grid min-w-0 gap-4">
            <div className="min-w-0 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="shiftTitle">Nội dung ca làm</Label>
                <div className="text-right">
                  <span
                    className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700"
                    title="Giờ công thực tế sau khi trừ thời gian nghỉ trưa"
                  >
                    {calculateWorkedHours(shiftDraft.startTime, shiftDraft.endTime).toFixed(1)} giờ công
                  </span>
                  {calculateLunchBreakMinutes(shiftDraft.startTime, shiftDraft.endTime) > 0 && (
                    <p className="mt-1 text-[10px] text-slate-500">Đã trừ nghỉ trưa 12:00–13:00</p>
                  )}
                </div>
              </div>
              <Input
                id="shiftTitle"
                className="w-full min-w-0"
                value={shiftDraft.title}
                onChange={(event) => setShiftDraft((current) => ({ ...current, title: event.target.value }))}
                placeholder="Ví dụ: Hoàn thiện API chấm công"
              />
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="min-w-0 space-y-2">
                <Label htmlFor="shiftDate">Ngày</Label>
                <Input
                  id="shiftDate"
                  className="w-full min-w-0"
                  type="date"
                  value={shiftDraft.date}
                  disabled={shiftDraft.status !== 'planned'}
                  onChange={(event) => setShiftDraft((current) => ({ ...current, date: event.target.value }))}
                />
              </div>
              <div className="min-w-0 space-y-2">
                <Label htmlFor="shiftStart">Bắt đầu</Label>
                <Input
                  id="shiftStart"
                  className="w-full min-w-0"
                  type="time"
                  step={1800}
                  value={shiftDraft.startTime}
                  disabled={shiftDraft.status !== 'planned'}
                  onChange={(event) => setShiftDraft((current) => ({ ...current, startTime: event.target.value }))}
                />
              </div>
              <div className="min-w-0 space-y-2">
                <Label htmlFor="shiftEnd">Kết thúc</Label>
                <Input
                  id="shiftEnd"
                  className="w-full min-w-0"
                  type="time"
                  step={1800}
                  value={shiftDraft.endTime}
                  disabled={shiftDraft.status !== 'planned'}
                  onChange={(event) => setShiftDraft((current) => ({ ...current, endTime: event.target.value }))}
                />
              </div>
            </div>

            <div className="min-w-0 space-y-2">
              <Label htmlFor="shiftDescription">Công việc trong ca</Label>
              <Textarea
                id="shiftDescription"
                rows={5}
                value={shiftDraft.description}
                onChange={(event) => setShiftDraft((current) => ({ ...current, description: event.target.value }))}
                placeholder="Ghi kế hoạch hoặc những công việc cần thực hiện trong ca hôm nay..."
                className="min-h-28 w-full min-w-0 resize-none"
              />
            </div>

            {shiftError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{shiftError}</div>
            )}

            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
              <div>
                {shiftDraft.id && shiftDraft.status === 'planned' && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={deleteShift}
                    disabled={shiftSaving}
                    title="Xóa ca"
                    aria-label="Xóa ca"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
              <div className="flex min-w-0 flex-wrap justify-end gap-1.5">
                <Button
                  size="icon"
                  variant="outline"
                  className="size-8"
                  onClick={() => setShiftDialogOpen(false)}
                  title="Đóng"
                  aria-label="Đóng"
                >
                  <X className="size-4" />
                </Button>
                {shiftDraft.status === 'completed' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 px-2.5"
                    onClick={openCompletedReportEditor}
                    title="Chỉnh sửa báo cáo công việc"
                  >
                    <FileText className="size-3.5" />
                    Report
                  </Button>
                )}
                {shiftDraft.status === 'completed' && shiftAttendanceRecord?.checkIn && shiftAttendanceRecord.checkOut && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShiftDialogOpen(false);
                      openRequestDialog(shiftDraft.date, 'adjustment', shiftAttendanceRecord);
                    }}
                    className="h-8 gap-1.5 px-2.5"
                    title="Gửi yêu cầu điều chỉnh giờ"
                  >
                    <TimerReset className="size-3.5" />
                    Giờ
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 px-2.5"
                  onClick={saveShift}
                  disabled={shiftSaving}
                  title={
                    !shiftDraft.id
                      ? 'Lưu ca'
                      : shiftDraft.status === 'planned'
                        ? 'Lưu thay đổi'
                        : 'Lưu nội dung'
                  }
                >
                  <Save className="size-3.5" />
                  Lưu
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={checkoutDialogOpen}
        onOpenChange={(open) => {
          setCheckoutDialogOpen(open);
          if (!open) setEditingReportShiftId(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BriefcaseBusiness className="size-5 text-blue-600" />
              {editingReportShiftId ? 'Chỉnh sửa báo cáo công việc' : 'Kết thúc ca và báo cáo công việc'}
            </DialogTitle>
            <DialogDescription>
              {editingReportShiftId
                ? 'Bạn có thể cập nhật nội dung báo cáo; giờ vào và giờ ra thực tế vẫn được giữ nguyên.'
                : 'Ghi ngắn gọn kết quả trong ca để quản lý có dữ liệu đối chiếu hiệu suất.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="checkoutReportTitle">Tiêu đề</Label>
              <Input
                id="checkoutReportTitle"
                value={checkoutReport.title}
                onChange={(event) => setCheckoutReport((current) => ({ ...current, title: event.target.value }))}
                placeholder="Ví dụ: Hoàn thiện giao diện chấm công"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="checkoutReportDescription">Kết quả đã làm</Label>
              <Textarea
                id="checkoutReportDescription"
                rows={4}
                value={checkoutReport.description}
                onChange={(event) => setCheckoutReport((current) => ({ ...current, description: event.target.value }))}
                placeholder="Nêu công việc đã hoàn thành, kết quả và phần còn tồn đọng..."
              />
              {!checkoutReport.description.trim() && (
                <p className="text-xs text-amber-700">Cần nhập kết quả công việc trước khi kết thúc ca.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="checkoutReportNote">Ghi chú (không bắt buộc)</Label>
              <Textarea
                id="checkoutReportNote"
                rows={2}
                value={checkoutReport.note || ''}
                onChange={(event) => setCheckoutReport((current) => ({ ...current, note: event.target.value }))}
                placeholder="Khó khăn, đề xuất hỗ trợ hoặc kế hoạch tiếp theo..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCheckoutDialogOpen(false)}>Hủy</Button>
            <Button
              className="bg-rose-600 hover:bg-rose-700"
              onClick={finishAttendanceShift}
              disabled={attendanceActionLoading || !checkoutReport.description.trim()}
            >
              {editingReportShiftId
                ? <FileText className="mr-2 size-4" />
                : <Square className="mr-2 size-3.5 fill-current" />}
              {attendanceActionLoading
                ? 'Đang lưu...'
                : editingReportShiftId
                  ? 'Lưu báo cáo'
                  : 'Kết thúc ca'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
            <Button onClick={submitRequest} disabled={requestSubmitting}>
              <Send className="mr-2 size-4" />
              {requestSubmitting ? 'Đang gửi...' : 'Gửi HR duyệt'}
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
  plannedShifts: PlannedShift[];
  onSelectDate: (date: Date) => void;
  onOpenRecord: (record: AttendanceRecord) => void;
  onOpenRequest: (request: AttendanceRequest) => void;
  onOpenShift: (shift: PlannedShift) => void;
  onCreateShift: (date: string, startTime: string, endTime: string) => void;
  onProposeTimeChange: (record: AttendanceRecord, checkIn: string, checkOut: string) => void;
}

interface CheckoutResizeState {
  date: string;
  checkIn: string;
  checkOut: string;
  dayTop: number;
  dayHeight: number;
}

interface ShiftSelectionState {
  date: string;
  anchorMinutes: number;
  startMinutes: number;
  endMinutes: number;
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
  plannedShifts,
  onSelectDate,
  onOpenRecord,
  onOpenRequest,
  onOpenShift,
  onCreateShift,
  onProposeTimeChange,
}: AttendanceWeekCalendarProps) {
  const [checkoutResize, setCheckoutResize] = useState<CheckoutResizeState | null>(null);
  const checkoutResizeRef = useRef<CheckoutResizeState | null>(null);
  const [shiftSelection, setShiftSelection] = useState<ShiftSelectionState | null>(null);
  const shiftSelectionRef = useRef<ShiftSelectionState | null>(null);
  const weekStart = startOfWeek(parseISO(selectedDate), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const timelineHeight = calendarHours.length * calendarRowHeight;
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowTop = ((nowMinutes - calendarStartHour * 60) / 60) * calendarRowHeight;

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

  const startShiftSelection = (event: ReactPointerEvent<HTMLDivElement>, date: string) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest('[data-calendar-event]')) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const anchorMinutes = Math.min(23 * 60 + 30, timeFromCalendarPointer(event.clientY, rect.top, rect.height));
    const nextState: ShiftSelectionState = {
      date,
      anchorMinutes,
      startMinutes: anchorMinutes,
      endMinutes: Math.min(24 * 60 - 1, anchorMinutes + 30),
      dayTop: rect.top,
      dayHeight: rect.height,
    };
    shiftSelectionRef.current = nextState;
    setShiftSelection(nextState);
  };

  useEffect(() => {
    if (!shiftSelection?.date) return;

    const handlePointerMove = (event: PointerEvent) => {
      const current = shiftSelectionRef.current;
      if (!current) return;
      const pointerMinutes = timeFromCalendarPointer(event.clientY, current.dayTop, current.dayHeight);
      const draggingForward = pointerMinutes >= current.anchorMinutes;
      const startMinutes = draggingForward ? current.anchorMinutes : pointerMinutes;
      const endMinutes = Math.min(
        24 * 60 - 1,
        draggingForward ? Math.max(current.anchorMinutes + 30, pointerMinutes) : current.anchorMinutes,
      );
      const nextState = { ...current, startMinutes, endMinutes };
      shiftSelectionRef.current = nextState;
      setShiftSelection(nextState);
    };

    const clearSelection = () => {
      shiftSelectionRef.current = null;
      setShiftSelection(null);
    };

    const handlePointerUp = () => {
      const current = shiftSelectionRef.current;
      if (!current) return;
      clearSelection();
      onCreateShift(current.date, minutesToTime(current.startMinutes), minutesToTime(current.endMinutes));
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', clearSelection);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', clearSelection);
    };
  }, [onCreateShift, shiftSelection?.date]);

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
      <div className="min-w-[700px] select-none">
        <div className="grid grid-cols-[48px_repeat(7,minmax(84px,1fr))] border-b border-slate-200 bg-white">
          <div className="flex items-end justify-center border-r border-slate-200 pb-2 text-[10px] font-medium text-slate-400">GMT+7</div>
          {weekDays.map((day) => {
            const dateIso = toIsoDate(day);
            const isToday = dateIso === today;
            const isSelected = dateIso === selectedDate;
            const dayRequests = requests.filter((request) => request.date === dateIso);
            const firstRequest = dayRequests[0];
            return (
              <div key={dateIso} className={`min-h-[52px] border-r border-slate-200 px-1 py-1 text-center last:border-r-0 ${isSelected ? 'bg-blue-50/60' : ''}`}>
                <button type="button" className="group mx-auto block" onClick={() => onSelectDate(day)}>
                  <span className={`block text-[11px] font-semibold uppercase ${isToday ? 'text-blue-600' : 'text-slate-500'}`}>
                    {format(day, 'EEE', { locale: vi })}
                  </span>
                  <span className={`mx-auto mt-0.5 flex size-7 items-center justify-center rounded-full text-sm ${isToday ? 'bg-blue-600 font-semibold text-white' : isSelected ? 'bg-blue-100 font-semibold text-blue-700' : 'text-slate-800 group-hover:bg-slate-100'}`}>
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

        <div className="grid grid-cols-[48px_repeat(7,minmax(84px,1fr))] bg-white">
          <div className="relative border-r border-slate-200" style={{ height: timelineHeight }}>
            {calendarHours.map((hour, index) => (
              <span
                key={hour}
                className={`absolute right-1.5 -translate-y-1/2 text-[9px] font-medium text-slate-400 ${hour % 2 !== 0 ? 'hidden' : ''}`}
                style={{ top: index * calendarRowHeight }}
              >
                {String(hour).padStart(2, '0')}:00
              </span>
            ))}
        </div>

        {weekDays.map((day) => {
            const dateIso = toIsoDate(day);
            const dayRecords = records.filter((record) => record.date === dateIso);
            const dayShifts = plannedShifts.filter((shift) => shift.date === dateIso);
            const isToday = dateIso === today;
            const isSelected = dateIso === selectedDate;
            return (
              <div
                key={dateIso}
                data-attendance-day={dateIso}
                className={`relative cursor-crosshair touch-none border-r border-slate-200 last:border-r-0 ${isSelected ? 'bg-blue-50/30' : ''}`}
                style={{ height: timelineHeight }}
                onPointerDown={(event) => startShiftSelection(event, dateIso)}
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
                        data-calendar-event
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

                {dayShifts.map((shift) => {
                  const metrics = getCalendarSegmentMetrics(timeToMinutes(shift.startTime), timeToMinutes(shift.endTime));
                  const tone = shift.status === 'completed'
                    ? 'border-emerald-400 bg-emerald-100/95 text-emerald-950 hover:bg-emerald-200'
                    : shift.status === 'working'
                      ? 'border-blue-500 bg-blue-100/95 text-blue-950 hover:bg-blue-200'
                      : 'border-violet-400 bg-violet-100/95 text-violet-950 hover:bg-violet-200';
                  return (
                    <button
                      key={shift.id}
                      data-calendar-event
                      type="button"
                      className={`absolute inset-x-1 z-[15] overflow-hidden rounded-md border-l-4 px-1.5 py-1 text-left text-[10px] shadow-sm transition-colors ${tone}`}
                      style={{ top: metrics.top, height: metrics.height }}
                      onClick={() => onOpenShift(shift)}
                      title={`${shift.title}: ${shift.startTime} - ${shift.endTime}`}
                    >
                      <span className="block truncate font-semibold">{shift.title}</span>
                      {metrics.height >= 34 && (
                        <span className="mt-0.5 block font-medium opacity-80">{shift.startTime} - {shift.endTime}</span>
                      )}
                      {metrics.height >= 58 && (
                        <span className="mt-1 block opacity-70">
                          {shift.status === 'completed' ? 'Đã kết thúc' : shift.status === 'working' ? 'Đang thực hiện' : 'Ca dự kiến'}
                        </span>
                      )}
                    </button>
                  );
                })}

                {shiftSelection?.date === dateIso && (() => {
                  const metrics = getCalendarSegmentMetrics(shiftSelection.startMinutes, shiftSelection.endMinutes);
                  return (
                    <div
                      className="pointer-events-none absolute inset-x-1 z-30 rounded-md border-2 border-dashed border-violet-500 bg-violet-200/70 px-1.5 py-1 text-[10px] font-semibold text-violet-950 shadow-sm"
                      style={{ top: metrics.top, height: metrics.height }}
                    >
                      {minutesToTime(shiftSelection.startMinutes)} - {minutesToTime(shiftSelection.endMinutes)}
                    </div>
                  );
                })()}

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
    <div className="min-w-0 border-b border-r border-slate-200 p-2.5 even:border-r-0">
      <div className="flex items-center gap-2">
        <span className={toneClass}>{icon}</span>
        <div className="min-w-0">
          <p className="truncate text-[11px] text-slate-500">{label}</p>
          <p className="text-sm font-bold text-slate-950">{value}</p>
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
