export const HRM_SYNC_KEYS = {
  liveAttendance: 'hrm-live-attendance',
  attendanceRequests: 'hrm-attendance-requests',
  leaveRequests: 'hrm-leave-requests',
  salaryRecords: 'hrm-salary-records',
} as const;

export interface EmployeePortalIdentity {
  employeeId: string;
  employeeName: string;
  department: string;
}

export interface LiveAttendanceSyncRecord extends EmployeePortalIdentity {
  date: string;
  checkIn: string;
  checkOut?: string;
  checkOutDate?: string;
  status: 'online' | 'offline';
  lastUpdated: string;
}

const DEFAULT_EMPLOYEE_NAME = 'Nguyễn Văn A';
const DEFAULT_DEPARTMENT = 'IT';

function toEmployeeCode(numericId: number) {
  return `NV${String(numericId).padStart(3, '0')}`;
}

export function getEmployeePortalIdentity(numericId = 1): EmployeePortalIdentity {
  const fallbackId = toEmployeeCode(numericId);

  if (typeof window === 'undefined') {
    return { employeeId: fallbackId, employeeName: DEFAULT_EMPLOYEE_NAME, department: DEFAULT_DEPARTMENT };
  }

  const storedNumericId = Number(window.localStorage.getItem('hrm_employee_id'));
  const employeeIdFromLogin = Number.isFinite(storedNumericId) && storedNumericId > 0
    ? toEmployeeCode(storedNumericId)
    : fallbackId;

  return {
    employeeId: window.localStorage.getItem('hrm_employee_code') || employeeIdFromLogin,
    employeeName: window.localStorage.getItem('hrm_employee_name') || DEFAULT_EMPLOYEE_NAME,
    department: window.localStorage.getItem('hrm_employee_department') || DEFAULT_DEPARTMENT,
  };
}

export function formatSyncDate(value: Date) {
  const day = String(value.getDate()).padStart(2, '0');
  const month = String(value.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${value.getFullYear()}`;
}

export function readSyncedRecords<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  const saved = window.localStorage.getItem(key);
  if (!saved) return [];

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    window.localStorage.removeItem(key);
    return [];
  }
}

export function upsertSyncedRecord<T>(key: string, item: T, isSame: (current: T) => boolean) {
  if (typeof window === 'undefined') return;
  const current = readSyncedRecords<T>(key);
  const next = [item, ...current.filter((record) => !isSame(record))];
  const serialized = JSON.stringify(next);
  window.localStorage.setItem(key, serialized);
  window.dispatchEvent(new CustomEvent('hrm-sync', { detail: { key } }));

  try {
    window.dispatchEvent(
      new StorageEvent('storage', {
        key,
        newValue: serialized,
        storageArea: window.localStorage,
      }),
    );
  } catch {
    // Some older browsers do not allow constructing StorageEvent manually.
  }
}
