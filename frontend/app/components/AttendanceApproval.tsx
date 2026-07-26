'use client';

import { useEffect, useState, useMemo } from 'react';
import Swal from 'sweetalert2';
import { CheckCircle, XCircle, Clock, Calendar, FileText, Eye, MessageSquare, ArrowRight, Search, ListChecks, Target, AlertTriangle, ChevronLeft, ChevronRight, Download, Users } from 'lucide-react';
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
import {
  AttendanceApiItem,
  AttendanceRequestApiItem,
  fetchAttendanceMonthlyRecords,
  fetchAttendanceRequests,
  reviewAttendanceRequest,
} from '@/services/attendance';

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
type AttendancePopup = 'review-center' | 'supplement' | 'adjustment' | 'history';
type CalendarAttendanceState = 'online' | EmployeeAttendance['status'];
type AttendanceReturnView = AttendancePopup | 'detail' | 'work-report' | null;

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
  attendanceState: CalendarAttendanceState;
}

const calendarAttendanceTones: Record<
  CalendarAttendanceState,
  { label: string; cardClass: string; dotClass: string; badgeClass: string; avatarClass: string }
> = {
  online: {
    label: 'Đang làm',
    cardClass: 'border-emerald-400 bg-emerald-50 text-emerald-950',
    dotClass: 'bg-emerald-500',
    badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    avatarClass: 'bg-emerald-600',
  },
  ontime: {
    label: 'Đúng giờ',
    cardClass: 'border-blue-400 bg-blue-50 text-blue-950',
    dotClass: 'bg-blue-500',
    badgeClass: 'border-blue-200 bg-blue-50 text-blue-700',
    avatarClass: 'bg-blue-600',
  },
  late: {
    label: 'Đi muộn',
    cardClass: 'border-amber-400 bg-amber-50 text-amber-950',
    dotClass: 'bg-amber-500',
    badgeClass: 'border-amber-200 bg-amber-50 text-amber-700',
    avatarClass: 'bg-amber-500',
  },
  'early-leave': {
    label: 'Về sớm',
    cardClass: 'border-violet-400 bg-violet-50 text-violet-950',
    dotClass: 'bg-violet-500',
    badgeClass: 'border-violet-200 bg-violet-50 text-violet-700',
    avatarClass: 'bg-violet-600',
  },
  missing: {
    label: 'Thiếu công',
    cardClass: 'border-rose-400 bg-rose-50 text-rose-950',
    dotClass: 'bg-rose-500',
    badgeClass: 'border-rose-200 bg-rose-50 text-rose-700',
    avatarClass: 'bg-rose-600',
  },
};

const calendarAttendanceLegend: CalendarAttendanceState[] = [
  'online',
  'ontime',
  'late',
  'early-leave',
  'missing',
];

const normalizeAttendanceDate = (value?: string) => {
  if (!value) return formatDate(new Date());
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [year, month, day] = value.slice(0, 10).split('-');
    return `${day}/${month}/${year}`;
  }
  return value;
};

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

const formatApiTime = (value?: string | null) => {
  if (!value) return '';

  const timeOnly = value.match(/^(\d{1,2}):(\d{2})/);
  if (timeOnly) {
    return `${timeOnly[1].padStart(2, '0')}:${timeOnly[2]}`;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const formatApiDateTime = (value?: string | null) => {
  if (!value) return undefined;
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(value)) return value;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN');
};

const mapApiRequest = (item: AttendanceRequestApiItem): AttendanceRequest => {
  const normalizedStatus = item.status.toUpperCase();
  const requestType = item.requestType?.toUpperCase() || item.type?.toUpperCase();
  const rawEmployeeId = item.employeeCode || item.employeeId;

  return {
    id: item.id,
    employeeName: item.employeeName,
    employeeId:
      typeof rawEmployeeId === 'number'
        ? `NV${String(rawEmployeeId).padStart(3, '0')}`
        : rawEmployeeId,
    department: item.department,
    date: normalizeAttendanceDate(item.workDate || item.date),
    checkIn: formatApiTime(item.requestedCheckIn || item.checkIn),
    checkOut: formatApiTime(item.requestedCheckOut || item.checkOut),
    reason: item.reason,
    status:
      normalizedStatus === 'APPROVED'
        ? 'approved'
        : normalizedStatus === 'REJECTED'
          ? 'rejected'
          : 'pending',
    submittedAt: formatApiDateTime(item.submittedAt) || '-',
    reviewedAt: formatApiDateTime(item.reviewedAt),
    reviewedBy: item.reviewedBy || undefined,
    reviewNote: item.reviewNote || undefined,
    type: requestType === 'ADJUSTMENT' ? 'adjustment' : 'supplement',
    originalCheckIn: formatApiTime(item.originalCheckIn),
    originalCheckOut: formatApiTime(item.originalCheckOut),
    workReport:
      item.workReportTitle || item.workReportDescription
        ? {
            title: item.workReportTitle || 'Báo cáo công việc',
            description: item.workReportDescription || '',
            tasks: [],
            achievements: [],
          }
        : undefined,
  };
};

const mapApiAttendance = (item: AttendanceApiItem): EmployeeAttendance => ({
  employeeId: `NV${String(item.employeeId).padStart(3, '0')}`,
  employeeName: item.employeeName || `Nhân viên ${item.employeeId}`,
  department: item.department || 'Chưa có phòng ban',
  date: formatDate(new Date(item.date)),
  checkIn: formatApiTime(item.checkInTime),
  checkOut: formatApiTime(item.checkOutTime),
  hours: `${Number(item.totalHours || 0).toFixed(2)}h`,
  status: item.isLate ? 'late' : item.isEarlyLeave ? 'early-leave' : item.checkInTime ? 'ontime' : 'missing',
  note: item.note && item.note !== '-' ? item.note : '',
  workReport:
    item.workReportTitle || item.workReportDescription
      ? {
          title: item.workReportTitle || 'Báo cáo công việc',
          description: item.workReportDescription || '',
          tasks: [],
          achievements: [],
          note: item.workReportNote || undefined,
        }
      : undefined,
});

interface AttendanceApprovalProps {
  userRole: 'admin' | 'manager';
  departmentScope?: string;
}

export function AttendanceApproval({ userRole, departmentScope }: AttendanceApprovalProps) {
  const isManager = userRole === 'manager';
  const roleTitle = isManager ? 'Chấm công team' : 'Quản lý chấm công';
  const roleDescription = isManager
    ? 'Theo dõi ca làm của nhân viên trong team và xử lý đơn chấm công thuộc phòng ban mình.'
    : 'Xem lịch sử chấm công từng ngày và xét duyệt đơn bổ sung/điều chỉnh toàn hệ thống.';
  const scopeLabel = isManager ? departmentScope || 'Team được phân quyền' : 'Toàn hệ thống';
  const [selectedRequest, setSelectedRequest] = useState<AttendanceRequest | null>(null);
  const [selectedAttendance, setSelectedAttendance] = useState<EmployeeAttendance | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [showWorkReportDialog, setShowWorkReportDialog] = useState(false);
  const [activeAttendancePopup, setActiveAttendancePopup] = useState<AttendancePopup | null>(null);
  const [returnPopupAfterDetail, setReturnPopupAfterDetail] = useState<AttendancePopup | null>(null);
  const [returnViewAfterWorkReport, setReturnViewAfterWorkReport] = useState<AttendanceReturnView>(null);
  const [returnViewAfterAction, setReturnViewAfterAction] = useState<AttendanceReturnView>(null);
  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState<CalendarAttendanceEvent | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [reviewNote, setReviewNote] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<AttendanceStatusFilter>('all');
  const [liveDepartmentFilter, setLiveDepartmentFilter] = useState('all');

  // Date selector for attendance history - default to today
  const [selectedDate, setSelectedDate] = useState(new Date());
  const selectedAttendanceYear = selectedDate.getFullYear();
  const selectedAttendanceMonth = selectedDate.getMonth() + 1;
  const [liveAttendance, setLiveAttendance] = useState<LiveAttendanceStatus[]>([]);

  const [requests, setRequests] = useState<AttendanceRequest[]>([]);

  const [allAttendance, setAllAttendance] = useState<EmployeeAttendance[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [attendanceError, setAttendanceError] = useState('');
  const [attendanceRefreshKey, setAttendanceRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadRequests = async () => {
      try {
        const data = await fetchAttendanceRequests();
        if (cancelled) return;

        setRequests(data.map(mapApiRequest));
      } catch (error) {
        console.error('Không tải được đơn chấm công:', error);
        if (!cancelled) setRequests([]);
      }
    };

    loadRequests();
    window.addEventListener('focus', loadRequests);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', loadRequests);
    };
  }, [departmentScope, userRole]);

  useEffect(() => {
    let cancelled = false;

    const loadAttendance = async () => {
      setAttendanceLoading(true);
      setAttendanceError('');
      try {
        const data = await fetchAttendanceMonthlyRecords(
          selectedAttendanceYear,
          selectedAttendanceMonth,
        );
        if (cancelled) return;

        setAllAttendance(data.map(mapApiAttendance));
        const todayKey = formatDateInputValue(new Date());
        setLiveAttendance(
          data
            .filter((item) => item.checkInTime)
            .map((item) => {
              const checkIn = formatApiTime(item.checkInTime);
              const checkOut = formatApiTime(item.checkOutTime);
              const date = formatDate(new Date(item.date));
              const isToday = item.date.slice(0, 10) === todayKey;
              return {
                employeeId: `NV${String(item.employeeId).padStart(3, '0')}`,
                employeeName: item.employeeName || `Nhân viên ${item.employeeId}`,
                department: item.department || 'Chưa có phòng ban',
                date,
                checkIn,
                checkOut: checkOut || undefined,
                checkOutDate: checkOut ? date : undefined,
                status: isToday && !checkOut ? 'online' : 'offline',
                lastUpdated: checkOut || checkIn,
              };
            }),
        );
      } catch (error) {
        console.error('Không tải được lịch sử chấm công:', error);
        if (!cancelled) {
          setAllAttendance([]);
          setLiveAttendance([]);
          setAttendanceError(error instanceof Error ? error.message : 'Không tải được dữ liệu chấm công.');
        }
      } finally {
        if (!cancelled) setAttendanceLoading(false);
      }
    };

    loadAttendance();
    return () => {
      cancelled = true;
    };
  }, [attendanceRefreshKey, selectedAttendanceMonth, selectedAttendanceYear]);

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

    const buildEvent = (
      record: LiveAttendanceStatus,
      attendanceState?: CalendarAttendanceState,
    ): CalendarAttendanceEvent | null => {
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
        attendanceState:
          attendanceState ||
          (record.status === 'online' ? 'online' : getAttendanceStatusFromLive(record)),
      };
    };

    allAttendance.forEach((record) => {
      if (!weekDateKeys.includes(record.date)) return;

      const event = buildEvent(
        {
          employeeId: record.employeeId,
          employeeName: record.employeeName,
          department: record.department,
          date: record.date,
          checkIn: record.checkIn,
          checkOut: record.checkOut,
          status: record.checkOut ? 'offline' : 'online',
          lastUpdated: record.checkOut || record.checkIn,
        },
        record.status,
      );

      if (event) {
        eventMap.set(`${event.employeeId}-${event.date}`, event);
      }
    });

    liveAttendance.forEach((record) => {
      if (!weekDateKeys.includes(record.date)) return;
      const eventKey = `${record.employeeId}-${record.date}`;
      const existingEvent = eventMap.get(eventKey);
      const event = buildEvent(
        record,
        record.status === 'online' ? 'online' : existingEvent?.attendanceState,
      );
      if (event) {
        eventMap.set(eventKey, event);
      }
    });

    return Array.from(eventMap.values()).sort((a, b) => {
      if (a.dayIndex !== b.dayIndex) return a.dayIndex - b.dayIndex;
      return timeToMinutes(a.checkIn) - timeToMinutes(b.checkIn);
    });
  }, [
    allAttendance,
    calendarEndMinute,
    calendarStartMinute,
    calendarTotalMinutes,
    liveAttendance,
    liveDepartmentFilter,
    weekDateKeys,
  ]);

  const filteredSupplementRequests = filteredRequests.filter(r => r.type === 'supplement');
  const filteredAdjustmentRequests = filteredRequests.filter(r => r.type === 'adjustment');
  const pendingRequests = useMemo(
    () =>
      filteredRequests
        .filter((request) => request.status === 'pending')
        .sort((first, second) => first.id - second.id),
    [filteredRequests],
  );
  const reviewedTodayCount = attendanceForDate.length;

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

  const handlePreviousWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 7);
    setSelectedDate(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 7);
    setSelectedDate(newDate);
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const handleExportAttendance = async () => {
    if (attendanceForDate.length === 0) {
      await Swal.fire({
        icon: 'info',
        title: 'Không có dữ liệu để xuất',
        text: 'Hãy chọn ngày hoặc bộ lọc có dữ liệu chấm công.',
        confirmButtonText: 'Đóng',
        confirmButtonColor: '#2563eb',
      });
      return;
    }

    const statusLabels: Record<EmployeeAttendance['status'], string> = {
      ontime: 'Đúng giờ',
      late: 'Đi muộn',
      'early-leave': 'Về sớm',
      missing: 'Thiếu công',
    };
    const escapeCsv = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
    const rows = attendanceForDate.map((record) => [
      record.employeeId,
      record.employeeName,
      record.department,
      record.date,
      record.checkIn || '-',
      record.checkOut || '-',
      record.hours,
      statusLabels[record.status],
      record.note || '',
    ]);
    const csv = [
      ['Mã nhân viên', 'Họ tên', 'Phòng ban', 'Ngày', 'Giờ vào', 'Giờ ra', 'Tổng giờ', 'Trạng thái', 'Ghi chú'],
      ...rows,
    ]
      .map((row) => row.map(escapeCsv).join(','))
      .join('\r\n');

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cham-cong-${formatDateInputValue(selectedDate)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
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

  const handleViewWorkReport = (
    request: AttendanceRequest | null,
    attendance: EmployeeAttendance | null = null,
    returnView?: AttendanceReturnView,
  ) => {
    setReturnViewAfterWorkReport(
      returnView !== undefined
        ? returnView
        : showDetailDialog
          ? 'detail'
          : activeAttendancePopup,
    );
    setActiveAttendancePopup(null);
    setShowDetailDialog(false);
    if (request) {
      setSelectedRequest(request);
      setSelectedAttendance(null);
    } else if (attendance) {
      setSelectedRequest(null);
      setSelectedAttendance(attendance);
    }
    setShowWorkReportDialog(true);
  };

  const closeWorkReportDialog = (restoreView = true) => {
    setShowWorkReportDialog(false);
    if (restoreView) {
      if (returnViewAfterWorkReport === 'detail') {
        setShowDetailDialog(true);
      } else if (
        returnViewAfterWorkReport &&
        returnViewAfterWorkReport !== 'work-report'
      ) {
        setActiveAttendancePopup(returnViewAfterWorkReport);
      }
    }
    setReturnViewAfterWorkReport(null);
  };

  const handleOpenActionDialog = (
    request: AttendanceRequest,
    action: 'approve' | 'reject',
    returnView?: AttendanceReturnView,
  ) => {
    setReturnViewAfterAction(
      returnView !== undefined
        ? returnView
        : showWorkReportDialog
          ? 'work-report'
          : showDetailDialog
            ? 'detail'
            : activeAttendancePopup,
    );
    setActiveAttendancePopup(null);
    setShowDetailDialog(false);
    setShowWorkReportDialog(false);
    setSelectedRequest(request);
    setActionType(action);
    setShowActionDialog(true);
    setReviewNote('');
  };

  const closeActionDialog = (restoreView = true) => {
    setShowActionDialog(false);
    if (restoreView) {
      if (returnViewAfterAction === 'detail') {
        setShowDetailDialog(true);
      } else if (returnViewAfterAction === 'work-report') {
        setShowWorkReportDialog(true);
      } else if (returnViewAfterAction) {
        setActiveAttendancePopup(returnViewAfterAction);
      }
    }
    setReturnViewAfterAction(null);
    setReviewNote('');
  };

  const handleSubmitReview = async () => {
    if (!selectedRequest || reviewSubmitting) return;

    if (actionType === 'reject' && !reviewNote.trim()) {
      await Swal.fire({
        icon: 'warning',
        title: 'Thiếu lý do từ chối',
        text: 'Vui lòng nhập lý do để nhân viên biết cần bổ sung hoặc điều chỉnh gì.',
        confirmButtonText: 'Đã hiểu',
        confirmButtonColor: '#2563eb',
      });
      return;
    }

    setReviewSubmitting(true);
    try {
      const result = await reviewAttendanceRequest(
        selectedRequest.id,
        actionType,
        reviewNote,
      );
      const reviewedRequest = mapApiRequest(result);
      setRequests((current) =>
        current.map((request) => request.id === reviewedRequest.id ? reviewedRequest : request),
      );
      setSelectedRequest(reviewedRequest);
      if (reviewedRequest.status === 'approved') {
        setAttendanceRefreshKey((current) => current + 1);
      }
      setShowActionDialog(false);
      setShowDetailDialog(false);
      setShowWorkReportDialog(false);
      setReturnViewAfterAction(null);
      setReturnViewAfterWorkReport(null);
      setReturnPopupAfterDetail(null);
      setReviewNote('');
      await Swal.fire({
        icon: 'success',
        title: actionType === 'approve' ? 'Đã duyệt đơn' : 'Đã từ chối đơn',
        text:
          actionType === 'approve'
            ? 'Dữ liệu chấm công đã được cập nhật.'
            : 'Kết quả và lý do từ chối đã được lưu.',
        confirmButtonText: 'Đóng',
        confirmButtonColor: actionType === 'approve' ? '#16a34a' : '#dc2626',
      });
      return;
    } catch (error) {
      await Swal.fire({
        icon: 'error',
        title: 'Không xử lý được đơn',
        text: error instanceof Error ? error.message : 'Vui lòng kiểm tra API và quyền tài khoản.',
        confirmButtonText: 'Đóng',
        confirmButtonColor: '#dc2626',
      });
      return;
    } finally {
      setReviewSubmitting(false);
    }

  };

  const getRequestTypeBadge = (type: AttendanceRequest['type']) => (
    <Badge
      variant="outline"
      className={
        type === 'supplement'
          ? 'gap-1 border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-50'
          : 'gap-1 border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-50'
      }
    >
      {type === 'supplement' ? <FileText className="size-3" /> : <Clock className="size-3" />}
      {type === 'supplement' ? 'Bổ sung công' : 'Điều chỉnh giờ'}
    </Badge>
  );

  const getRequestStatusBadge = (status: AttendanceRequest['status']) => {
    if (status === 'approved') {
      return (
        <Badge variant="outline" className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
          <CheckCircle className="size-3" />
          Đã duyệt
        </Badge>
      );
    }

    if (status === 'rejected') {
      return (
        <Badge variant="outline" className="gap-1 border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-50">
          <XCircle className="size-3" />
          Từ chối
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="gap-1 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50">
        <Clock className="size-3" />
        Chờ duyệt
      </Badge>
    );
  };

  const getRequestCardTone = (status: AttendanceRequest['status']) => {
    if (status === 'approved') {
      return 'border-emerald-200 border-l-4 border-l-emerald-400 bg-emerald-50/30 hover:border-emerald-300';
    }

    if (status === 'rejected') {
      return 'border-rose-200 border-l-4 border-l-rose-400 bg-rose-50/30 hover:border-rose-300';
    }

    return 'border-amber-200 border-l-4 border-l-amber-400 bg-amber-50/30 hover:border-amber-300';
  };

  const renderCompactRequestList = (
    requestList: AttendanceRequest[],
    title: string,
    description: string,
    showHeader = true,
  ) => {
    const orderedRequests = [...requestList].sort((first, second) => {
      if (first.status === second.status) return first.id - second.id;
      return first.status === 'pending' ? -1 : 1;
    });

    return (
      <Card className="overflow-hidden border-gray-200 shadow-sm">
        {showHeader && (
          <div className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
              <p className="text-sm text-gray-500">{description}</p>
            </div>
            <Badge variant="outline" className="w-fit bg-gray-50 text-gray-700">
              {orderedRequests.length} đơn
            </Badge>
          </div>
        )}

        <div className="space-y-3 bg-gray-50/60 p-4">
          {orderedRequests.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">
              Không có đơn phù hợp với bộ lọc hiện tại.
            </div>
          ) : (
            orderedRequests.map((request) => (
              <article
                key={request.id}
                className={`rounded-lg border p-4 shadow-sm transition hover:shadow-md ${getRequestCardTone(request.status)}`}
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
                  <tr
                    key={request.id}
                    className={`transition-colors ${
                      request.status === 'approved'
                        ? 'bg-emerald-50/30 hover:bg-emerald-50/60'
                        : request.status === 'rejected'
                        ? 'bg-rose-50/30 hover:bg-rose-50/60'
                        : 'bg-amber-50/30 hover:bg-amber-50/60'
                    }`}
                  >
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
              <Button
                size="sm"
                variant="outline"
                aria-label="Ngày trước"
                title="Ngày trước"
                onClick={handlePreviousDay}
                className="bg-white"
              >
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
              <Button
                size="sm"
                variant="outline"
                aria-label="Ngày sau"
                title="Ngày sau"
                onClick={handleNextDay}
                className="bg-white"
              >
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
            <Button
              variant="outline"
              className="w-fit gap-2 bg-white text-blue-600 hover:bg-blue-50"
              onClick={handleExportAttendance}
            >
              <Download className="size-4" />
              Xuất báo cáo
            </Button>
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
              <p className="text-xs font-medium uppercase text-gray-500">Ngày đang xem</p>
              <p className="mt-1 text-sm text-gray-500">
                {getDayOfWeek(selectedDateLabel)}, {selectedDateLabel}
                {departmentFilter !== 'all' ? ` • ${departmentFilter}` : ''}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                aria-label="Ngày trước"
                title="Ngày trước"
                onClick={handlePreviousDay}
                className="bg-white"
              >
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
              <Button
                size="sm"
                variant="outline"
                aria-label="Ngày sau"
                title="Ngày sau"
                onClick={handleNextDay}
                className="bg-white"
              >
                <ChevronRight className="size-4" />
              </Button>
              <Button size="sm" onClick={handleToday} className="bg-blue-600 hover:bg-blue-700">
                Hôm nay
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-2 bg-white text-blue-600 hover:bg-blue-50"
                onClick={handleExportAttendance}
              >
                <Download className="size-4" />
                Xuất
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
    <div className="flex h-[calc(100vh-7rem)] min-h-[620px] flex-col gap-1.5 overflow-hidden pb-1">
      {/* Header */}
      <div className="flex shrink-0 flex-col gap-1.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white shadow-sm">
            <Calendar className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-slate-950">{roleTitle}</h1>
              <Badge variant="outline" className={`h-6 px-2 text-[10px] ${isManager ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600'}`}>
                {scopeLabel}
              </Badge>
            </div>
            <p className="truncate text-[11px] text-slate-500">{roleDescription}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 lg:justify-end">
          <Button
            type="button"
            size="sm"
            onClick={() => setActiveAttendancePopup('review-center')}
            className="h-8 gap-1.5 bg-blue-600 px-2.5 text-xs text-white shadow-sm hover:bg-blue-700"
          >
            <ListChecks className="size-4" />
            {isManager ? 'Duyệt đơn team' : 'Cần xử lý'}
            <Badge className={`ml-1 ${stats.pending > 0 ? 'bg-amber-400 text-amber-950 hover:bg-amber-400' : 'bg-white/20 text-white hover:bg-white/20'}`}>
              {stats.pending}
            </Badge>
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setActiveAttendancePopup('supplement')}
            className="h-8 gap-1.5 border-slate-200 bg-white px-2.5 text-xs hover:bg-blue-50"
          >
            <FileText className="size-4 text-blue-600" />
            {isManager ? 'Bổ sung team' : 'Đơn bổ sung'}
            <Badge className="ml-1 bg-blue-100 text-blue-700 hover:bg-blue-100">
              {filteredSupplementRequests.length}
            </Badge>
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setActiveAttendancePopup('adjustment')}
            className="h-8 gap-1.5 border-slate-200 bg-white px-2.5 text-xs hover:bg-indigo-50"
          >
            <ArrowRight className="size-4 text-indigo-600" />
            {isManager ? 'Điều chỉnh team' : 'Đơn điều chỉnh'}
            <Badge className="ml-1 bg-indigo-100 text-indigo-700 hover:bg-indigo-100">
              {filteredAdjustmentRequests.length}
            </Badge>
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setActiveAttendancePopup('history')}
            className="h-8 gap-1.5 border-slate-200 bg-white px-2.5 text-xs hover:bg-slate-50"
          >
            <Calendar className="size-4 text-gray-700" />
            {isManager ? 'Lịch sử team' : 'Lịch sử'}
            <Badge variant="outline" className="ml-1 bg-gray-50 text-gray-700">
              {attendanceForDate.length}
            </Badge>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="shrink-0 border border-slate-200 bg-white p-1.5 shadow-sm">
        <div className="flex flex-col gap-1.5 xl:flex-row xl:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Tìm theo tên, mã NV, lý do..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 border-slate-200 bg-slate-50 pl-9 text-xs focus:bg-white"
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-[200px_minmax(0,1fr)] xl:min-w-[660px]">
            {isManager ? (
              <div className="flex h-8 items-center justify-between rounded-md border border-indigo-100 bg-indigo-50 px-2.5 text-xs font-semibold text-indigo-700">
                <span>Phạm vi team</span>
                <span className="truncate">{scopeLabel}</span>
              </div>
            ) : (
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="h-8 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tất cả phòng ban</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            )}

            <div className="grid grid-cols-2 gap-1 rounded-md bg-slate-100 p-0.5 md:grid-cols-4">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setStatusFilter('all')}
                className={`h-7 justify-between px-2 text-xs ${statusFilter === 'all' ? 'bg-white text-slate-900 shadow-sm hover:bg-white' : 'text-slate-600 hover:bg-white'}`}
              >
                <span>Tất cả</span>
                <Badge variant="outline" className="ml-2 bg-white text-gray-700">{stats.total}</Badge>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setStatusFilter('pending')}
                className={`h-7 justify-between px-2 text-xs ${statusFilter === 'pending' ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700' : 'text-slate-600 hover:bg-white'}`}
              >
                <span>Chờ duyệt</span>
                <Badge className={`ml-2 ${statusFilter === 'pending' ? 'bg-white/20 text-white hover:bg-white/20' : 'bg-blue-100 text-blue-700 hover:bg-blue-100'}`}>{stats.pending}</Badge>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setStatusFilter('approved')}
                className={`h-7 justify-between px-2 text-xs ${statusFilter === 'approved' ? 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700' : 'text-slate-600 hover:bg-white'}`}
              >
                <span>Đã duyệt</span>
                <Badge className={`ml-2 ${statusFilter === 'approved' ? 'bg-white/20 text-white hover:bg-white/20' : 'bg-green-100 text-green-700 hover:bg-green-100'}`}>{stats.approved}</Badge>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setStatusFilter('rejected')}
                className={`h-7 justify-between px-2 text-xs ${statusFilter === 'rejected' ? 'bg-red-600 text-white shadow-sm hover:bg-red-700' : 'text-slate-600 hover:bg-white'}`}
              >
                <span>Từ chối</span>
                <Badge className={`ml-2 ${statusFilter === 'rejected' ? 'bg-white/20 text-white hover:bg-white/20' : 'bg-red-100 text-red-700 hover:bg-red-100'}`}>{stats.rejected}</Badge>
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <div className="hidden">
        <Card className="overflow-hidden border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">{isManager ? 'Team cần xử lý' : 'Cần xử lý'}</h2>
              <p className="text-xs text-gray-500">
                {isManager ? 'Đơn chấm công của nhân viên trong team đang chờ duyệt' : 'Các đơn chấm công đang chờ Admin duyệt'}
              </p>
            </div>
            <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">{stats.pending} chờ duyệt</Badge>
          </div>

          <div className="grid max-h-[176px] gap-2 overflow-y-auto p-3 lg:grid-cols-3">
            {pendingRequests.length === 0 ? (
              <div className="col-span-full rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-center">
                <p className="text-sm font-semibold text-gray-700">Không có đơn cần xử lý</p>
                <p className="mt-1 text-xs text-gray-500">
                  {isManager ? 'Khi nhân viên trong team gửi đơn mới, đơn sẽ xuất hiện tại đây.' : 'Các đơn bổ sung hoặc điều chỉnh mới sẽ xuất hiện ở đây.'}
                </p>
              </div>
            ) : (
              pendingRequests.map((request) => (
                <article key={request.id} className="rounded-lg border border-gray-200 bg-slate-50/70 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{request.employeeName}</p>
                      <p className="mt-0.5 text-xs text-gray-500">{request.employeeId} • {request.department}</p>
                    </div>
                    {getRequestTypeBadge(request.type)}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 rounded-md bg-white p-2 text-xs">
                    <div>
                      <p className="text-gray-500">Ngày</p>
                      <p className="font-semibold text-gray-900">{request.date}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Giờ</p>
                      <p className="font-semibold text-gray-900">{request.checkIn} - {request.checkOut}</p>
                    </div>
                  </div>

                  <p className="mt-2 line-clamp-2 text-xs text-gray-600">{request.reason}</p>

                  <div className="mt-3 flex items-center gap-2">
                    <Button size="sm" variant="outline" className="h-8 flex-1 bg-white" onClick={() => handleViewDetail(request)}>
                      Chi tiết
                    </Button>
                    <Button size="sm" className="h-8 bg-green-600 hover:bg-green-700" onClick={() => handleOpenActionDialog(request, 'approve')}>
                      Duyệt
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 border-red-200 bg-white text-red-600 hover:bg-red-50" onClick={() => handleOpenActionDialog(request, 'reject')}>
                      Từ chối
                    </Button>
                  </div>
                </article>
              ))
            )}
          </div>
        </Card>

        <Card className="border border-gray-200 bg-white p-3 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">{isManager ? 'Tổng quan team' : 'Tổng quan ngày'}</h2>
              <p className="text-xs text-gray-500">{formatDate(selectedDate)}</p>
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-700">{reviewedTodayCount} bản ghi</Badge>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-blue-50 p-3">
              <p className="text-xs text-blue-700">{isManager ? 'Đơn của team' : 'Tổng đơn'}</p>
              <p className="mt-1 text-xl font-bold text-blue-900">{stats.total}</p>
            </div>
            <div className="rounded-lg bg-orange-50 p-3">
              <p className="text-xs text-orange-700">Chờ duyệt</p>
              <p className="mt-1 text-xl font-bold text-orange-900">{stats.pending}</p>
            </div>
            <div className="rounded-lg bg-green-50 p-3">
              <p className="text-xs text-green-700">{isManager ? 'Đang làm' : 'Online'}</p>
              <p className="mt-1 text-xl font-bold text-green-900">{liveStats.online}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-600">{isManager ? 'Chưa/đã kết thúc' : 'Offline'}</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{liveStats.offline}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border border-slate-200 bg-white shadow-sm">
        <div className="flex shrink-0 flex-col gap-1 border-b border-slate-200 bg-white px-2.5 py-1.5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            <Button size="sm" className="h-7 gap-1.5 bg-blue-600 px-2.5 text-xs hover:bg-blue-700" onClick={handleToday}>
              <Calendar className="size-4" />
              Hôm nay
            </Button>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="size-7 rounded-md text-slate-600"
                aria-label="Tuần trước"
                title="Tuần trước"
                onClick={handlePreviousWeek}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-7 rounded-md text-slate-600"
                aria-label="Tuần sau"
                title="Tuần sau"
                onClick={handleNextWeek}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-950">{selectedMonthLabel}</h2>
                <Badge variant="outline" className="h-6 border-blue-100 bg-blue-50 px-2 text-[10px] text-blue-700">
                  {selectedWeekRange}
                </Badge>
                <Badge className="h-6 gap-1.5 bg-emerald-50 px-2 text-[10px] text-emerald-700 hover:bg-emerald-50">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                  </span>
                  Realtime
                </Badge>
              </div>
              <p className="hidden">
                {isManager
                  ? 'Theo dõi Start/End của team theo tuần, click vào ca để xem chi tiết nhân viên.'
                  : 'Theo dõi Start/End của nhân viên theo lịch tuần, click vào ca để xem chi tiết.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex h-7 items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2">
              <Calendar className="size-4 text-blue-600" />
              <input
                type="date"
                value={formatDateInputValue(selectedDate)}
                onChange={(event) => {
                  const [year, month, day] = event.target.value.split('-').map(Number);
                  setSelectedDate(new Date(year, month - 1, day));
                }}
                className="bg-transparent text-[11px] font-semibold text-slate-900 outline-none"
              />
            </div>
            <Badge className="h-6 bg-emerald-50 px-2 text-[10px] text-emerald-700 hover:bg-emerald-50">{liveStats.online} online</Badge>
            <Badge variant="outline" className="h-6 border-slate-200 bg-slate-50 px-2 text-[10px] text-slate-600">{liveStats.offline} offline</Badge>
          </div>
        </div>

        <div className="shrink-0 border-b border-slate-100 bg-slate-50/80 px-2.5 py-1">
          <div className="flex flex-col gap-1.5 xl:flex-row xl:items-center xl:justify-between">
            <div className="grid grid-cols-3 gap-1.5 sm:flex sm:items-center">
              <div className="flex h-7 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2">
                <p className="text-[10px] text-slate-500">Tổng</p>
                <p className="text-sm font-bold text-slate-900">{liveStats.total}</p>
              </div>
              <div className="flex h-7 items-center gap-1.5 rounded-md border border-emerald-100 bg-white px-2">
                <p className="text-[10px] text-emerald-700">Online</p>
                <p className="text-sm font-bold text-emerald-700">{liveStats.online}</p>
              </div>
              <div className="flex h-7 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2">
                <p className="text-[10px] text-slate-500">Offline</p>
                <p className="text-sm font-bold text-slate-700">{liveStats.offline}</p>
              </div>
              <div className="hidden h-7 min-w-[124px] rounded-md border border-slate-200 bg-white px-2 py-0.5 sm:block">
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>Tỷ lệ online</span>
                  <span className="font-semibold text-emerald-700">{liveOnlinePercent}%</span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${liveOnlinePercent}%` }} />
                </div>
              </div>
              <div className="hidden h-7 items-center gap-2 rounded-md border border-slate-200 bg-white px-2 2xl:flex">
                {calendarAttendanceLegend.map((state) => {
                  const tone = calendarAttendanceTones[state];
                  return (
                    <span key={state} className="inline-flex items-center gap-1 whitespace-nowrap text-[9px] font-medium text-slate-600">
                      <span className={`size-1.5 rounded-full ${tone.dotClass}`} />
                      {tone.label}
                    </span>
                  );
                })}
              </div>
            </div>

            {isManager ? (
              <div className="rounded-md border border-indigo-100 bg-white px-2.5 py-1 text-xs font-semibold text-indigo-700">
                Team {scopeLabel}: {liveStats.online}/{liveStats.total} đang làm
              </div>
            ) : (
              <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setLiveDepartmentFilter('all')}
                  className={`shrink-0 rounded-md border px-2.5 py-1 text-[11px] font-semibold transition ${liveDepartmentFilter === 'all' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                >
                  Tất cả {allLiveStats.online}/{allLiveStats.total}
                </button>
                {liveDepartmentStats.map((department) => (
                  <button
                    key={department.department}
                    type="button"
                    onClick={() => setLiveDepartmentFilter(department.department)}
                    className={`shrink-0 rounded-md border px-2.5 py-1 text-[11px] font-semibold transition ${liveDepartmentFilter === department.department ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                  >
                    {department.department} {department.online}/{department.total}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          <aside className="hidden">
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

            <div className="mt-3">
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

          <div className="h-full min-w-0 overflow-x-auto overflow-y-hidden">
            <div className="flex h-full min-w-[860px] flex-col">
              <div className="sticky top-0 z-10 grid shrink-0 grid-cols-[56px_repeat(7,minmax(112px,1fr))] border-b border-slate-200 bg-white">
                <div className="flex items-center border-r border-slate-100 px-2 text-[9px] font-semibold text-slate-400">GMT+7</div>
                {weekDays.map((day) => {
                  const dayKey = formatDate(day);
                  const isSelected = dayKey === formatDate(selectedDate);
                  const dayName = day.toLocaleDateString('vi-VN', { weekday: 'short' });
                  const eventCount = calendarEvents.filter((event) => event.date === dayKey).length;

                  return (
                    <div key={dayKey} className={`flex h-11 items-center justify-center gap-1.5 border-r border-slate-100 px-1 text-center transition-colors ${isSelected ? 'bg-blue-50' : 'bg-white hover:bg-slate-50'}`}>
                      <p className="text-[9px] font-semibold uppercase text-slate-500">{dayName}</p>
                      <button
                        type="button"
                        onClick={() => setSelectedDate(day)}
                        className={`inline-flex size-6 items-center justify-center rounded-full text-[11px] font-bold ${isSelected ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-800 hover:bg-slate-100'}`}
                      >
                        {day.getDate()}
                      </button>
                      {eventCount > 0 && (
                        <span
                          title={`${eventCount} nhân viên`}
                          className="inline-flex size-4 items-center justify-center rounded-full bg-blue-100 text-[9px] font-bold text-blue-700"
                        >
                          {eventCount}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="relative grid min-h-0 flex-1 grid-cols-[56px_repeat(7,minmax(112px,1fr))]">
                <div className="flex h-full flex-col border-r border-slate-100 bg-slate-50/60">
                  {weekTimeSlots.map((hour) => (
                    <div key={hour} className="min-h-0 flex-1 border-b border-slate-100 pr-2 pt-0.5 text-right text-[9px] leading-none text-slate-400">
                      {hour}:00
                    </div>
                  ))}
                </div>

                {weekDays.map((day) => {
                  const dayKey = formatDate(day);
                  const dayIndex = weekDateKeys.indexOf(dayKey);
                  const isSelected = dayKey === formatDate(selectedDate);
                  const dayEvents = calendarEvents.filter((event) => event.dayIndex === dayIndex);

                  return (
                    <div key={dayKey} className={`relative flex h-full min-w-0 flex-col border-r border-slate-100 ${isSelected ? 'bg-blue-50/50' : 'bg-white'}`}>
                      {weekTimeSlots.map((hour) => (
                        <div key={hour} className="min-h-0 flex-1 border-b border-slate-100" />
                      ))}

                      {dayEvents.length > 0 && (
                        <div className="attendance-day-scroll absolute inset-0 z-[1] overflow-x-auto overflow-y-hidden">
                          <div className="flex h-full min-w-full">
                            {dayEvents.map((event) => {
                              const tone = calendarAttendanceTones[event.attendanceState];

                              return (
                                <div
                                  key={`${event.employeeId}-${event.date}`}
                                  className="relative h-full basis-1/4 shrink-0 px-0.5"
                                >
                                  <button
                                    type="button"
                                    title={`${event.employeeName} | ${tone.label} | ${event.employeeId} | ${event.department} | ${event.durationLabel}`}
                                    onClick={() => setSelectedCalendarEvent(event)}
                                    className={`absolute inset-x-0.5 overflow-hidden rounded-md border-l-[3px] px-1 py-1 text-left text-[10px] leading-tight shadow-sm transition duration-200 hover:z-10 hover:-translate-y-0.5 hover:shadow-md ${tone.cardClass}`}
                                    style={{ top: `${event.top}%`, height: `${event.height}%` }}
                                  >
                                    <div className="flex items-start justify-between gap-0.5">
                                      <span className="truncate font-semibold">{event.employeeName}</span>
                                      <span className={`mt-0.5 size-1.5 shrink-0 rounded-full ${tone.dotClass}`} />
                                    </div>
                                    <p className="mt-0.5 truncate font-medium">{event.employeeId}</p>
                                    <p className="truncate">{event.durationLabel}</p>
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {(attendanceLoading || attendanceError || calendarEvents.length === 0) && (
                  <div className="pointer-events-none absolute inset-x-[56px] top-24 flex justify-center">
                    <div className="rounded-lg border border-dashed border-gray-300 bg-white/90 px-5 py-4 text-center shadow-sm">
                      <p className="text-sm font-semibold text-gray-800">
                        {attendanceLoading
                          ? 'Đang tải dữ liệu chấm công...'
                          : attendanceError
                            ? 'Không tải được dữ liệu từ hệ thống'
                            : 'Chưa có ca chấm công trong tuần này'}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {attendanceError || 'Dữ liệu chỉ xuất hiện sau khi nhân viên check-in hoặc được duyệt bổ sung công.'}
                      </p>
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
        open={activeAttendancePopup === 'review-center'}
        onOpenChange={(open) => setActiveAttendancePopup(open ? 'review-center' : null)}
      >
        <DialogContent className="!flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[1080px]">
          <DialogHeader className="shrink-0 border-b border-gray-200 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
              <div>
                <DialogTitle className="text-xl">
                  {isManager ? 'Trung tâm duyệt chấm công team' : 'Trung tâm duyệt chấm công'}
                </DialogTitle>
                <DialogDescription className="mt-1">
                  Xem tổng quan và xử lý các đơn đang chờ mà không rời khỏi lịch làm việc.
                </DialogDescription>
              </div>
              <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
                {pendingRequests.length} chờ duyệt
              </Badge>
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                <p className="text-xs font-medium text-blue-700">{isManager ? 'Đơn của team' : 'Tổng đơn'}</p>
                <p className="mt-1 text-2xl font-bold text-blue-900">{stats.total}</p>
              </div>
              <div className="rounded-lg border border-orange-100 bg-orange-50 p-3">
                <p className="text-xs font-medium text-orange-700">Chờ duyệt</p>
                <p className="mt-1 text-2xl font-bold text-orange-900">{stats.pending}</p>
              </div>
              <div className="rounded-lg border border-green-100 bg-green-50 p-3">
                <p className="text-xs font-medium text-green-700">{isManager ? 'Đang làm' : 'Online'}</p>
                <p className="mt-1 text-2xl font-bold text-green-900">{liveStats.online}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-600">{isManager ? 'Chưa/đã kết thúc' : 'Offline'}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{liveStats.offline}</p>
              </div>
            </div>

            {renderCompactRequestList(
              pendingRequests,
              isManager ? 'Đơn team cần xử lý' : 'Đơn cần xử lý',
              isManager
                ? 'Các đơn chấm công của nhân viên trong phạm vi quản lý.'
                : 'Các đơn bổ sung và điều chỉnh đang chờ Admin duyệt.',
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeAttendancePopup === 'history'}
        onOpenChange={(open) => setActiveAttendancePopup(open ? 'history' : null)}
      >
        <DialogContent className="!flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[1020px]">
          <DialogHeader className="shrink-0 border-b border-gray-200 p-5">
            <DialogTitle className="text-xl">Lịch sử chấm công</DialogTitle>
            <DialogDescription>
              Xem chi tiết chấm công, báo cáo công việc và trạng thái theo ngày.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {renderSimpleAttendanceHistoryPanel()}
          </div>
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
              <Button
                variant="outline"
                className="border-gray-200 bg-white text-blue-600 hover:bg-blue-50"
                onClick={handleExportAttendance}
              >
                <Download className="size-4 mr-2" />
                Xuất báo cáo
              </Button>
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
        <DialogContent className="!flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[900px]">
          <DialogHeader className="shrink-0 border-b border-gray-200 p-5">
            <div className="flex items-start justify-between gap-3 pr-8">
              <div>
                <DialogTitle className="text-xl">Đơn bổ sung chấm công</DialogTitle>
                <DialogDescription>
                  Nhân viên gửi đơn khi quên chấm công hoặc thiếu lượt vào/ra.
                </DialogDescription>
              </div>
              <Badge variant="outline" className="shrink-0 bg-sky-50 text-sky-700">
                {filteredSupplementRequests.length} đơn
              </Badge>
            </div>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {renderCompactRequestList(
              filteredSupplementRequests,
              'Đơn bổ sung chấm công',
              'Nhân viên gửi đơn khi quên chấm công hoặc thiếu lượt vào/ra.',
              false,
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeAttendancePopup === 'adjustment'}
        onOpenChange={(open) => setActiveAttendancePopup(open ? 'adjustment' : null)}
      >
        <DialogContent className="!flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[900px]">
          <DialogHeader className="shrink-0 border-b border-gray-200 p-5">
            <div className="flex items-start justify-between gap-3 pr-8">
              <div>
                <DialogTitle className="text-xl">Đơn điều chỉnh giờ chấm công</DialogTitle>
                <DialogDescription>
                  Dùng cho trường hợp nhân viên cần sửa giờ vào/ra đã ghi nhận.
                </DialogDescription>
              </div>
              <Badge variant="outline" className="shrink-0 bg-violet-50 text-violet-700">
                {filteredAdjustmentRequests.length} đơn
              </Badge>
            </div>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {renderCompactRequestList(
              filteredAdjustmentRequests,
              'Đơn điều chỉnh giờ chấm công',
              'Dùng cho trường hợp nhân viên cần sửa giờ vào/ra đã ghi nhận.',
              false,
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
                  <div className={`flex size-12 items-center justify-center rounded-full font-bold text-white ${calendarAttendanceTones[selectedCalendarEvent.attendanceState].avatarClass}`}>
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
                <div className={`rounded-lg border p-3 ${calendarAttendanceTones[selectedCalendarEvent.attendanceState].badgeClass}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Trạng thái</span>
                    <Badge variant="outline" className={calendarAttendanceTones[selectedCalendarEvent.attendanceState].badgeClass}>
                      {calendarAttendanceTones[selectedCalendarEvent.attendanceState].label}
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
        <DialogContent className="!flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[680px]">
          {selectedRequest && (
            <>
              <DialogHeader className="shrink-0 border-b border-gray-200 px-6 pb-4 pt-6 pr-12">
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

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-600">Loại đơn</Label>
                    <div className="mt-1">{getRequestTypeBadge(selectedRequest.type)}</div>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Trạng thái</Label>
                    <div className="mt-1">{getRequestStatusBadge(selectedRequest.status)}</div>
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
                          handleViewWorkReport(selectedRequest, null, 'detail');
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

              <DialogFooter className="shrink-0 border-t border-gray-200 bg-white px-6 py-4">
                {selectedRequest.status === 'pending' ? (
                  <div className="flex gap-2 w-full">
                    <Button variant="outline" onClick={() => closeDetailDialog()} className="flex-1">
                      Đóng
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        handleOpenActionDialog(selectedRequest, 'reject', 'detail');
                      }}
                      className="flex-1"
                    >
                      <XCircle className="size-4 mr-2" />
                      Từ chối
                    </Button>
                    <Button
                      className="bg-green-600 hover:bg-green-700 flex-1"
                      onClick={() => {
                        handleOpenActionDialog(selectedRequest, 'approve', 'detail');
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
      <Dialog
        open={showActionDialog}
        onOpenChange={(open) => (open ? setShowActionDialog(true) : closeActionDialog())}
      >
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
                <Button
                  variant="outline"
                  disabled={reviewSubmitting}
                  onClick={() => closeActionDialog()}
                >
                  Hủy
                </Button>
                <Button
                  className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                  disabled={reviewSubmitting || (actionType === 'reject' && !reviewNote.trim())}
                  onClick={handleSubmitReview}
                >
                  {reviewSubmitting ? (
                    'Đang xử lý...'
                  ) : actionType === 'approve' ? (
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
      <Dialog
        open={showWorkReportDialog}
        onOpenChange={(open) => (open ? setShowWorkReportDialog(true) : closeWorkReportDialog())}
      >
        <DialogContent className="!flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[700px]">
          {(selectedRequest?.workReport || selectedAttendance?.workReport) && (
            <>
              <DialogHeader className="shrink-0 border-b border-gray-200 px-6 pb-4 pt-6 pr-12">
                <div className="flex items-center gap-3">
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

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
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

              <DialogFooter className="shrink-0 border-t border-gray-200 bg-white px-6 py-4">
                <Button variant="outline" onClick={() => closeWorkReportDialog()}>
                  Đóng
                </Button>
                {selectedRequest && selectedRequest.status === 'pending' && (
                  <>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        handleOpenActionDialog(selectedRequest, 'reject', 'work-report');
                      }}
                    >
                      <XCircle className="size-4 mr-2" />
                      Từ chối
                    </Button>
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        handleOpenActionDialog(selectedRequest, 'approve', 'work-report');
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
