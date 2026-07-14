'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchEmployeeById, fetchEmployees, type EmployeeApiItem } from '@/services/employees';
import { getCurrentEmployeeId } from '@/services/tasks';
import { getEmployeePortalIdentity } from './hrmSync';

const PROFILE_SYNC_KEY = 'hrm-employee-profile';

export interface EmployeePortalProfile {
  numericId: number;
  employeeId: string;
  employeeName: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  status: string;
  managerName: string;
  managerId?: number;
  joinDate: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  employmentType: string;
  education: string;
  major: string;
  skills: string;
  emergencyContact: string;
}

const demoEmployees: EmployeeApiItem[] = [
  {
    id: 1,
    fullName: 'Nguyễn Văn A',
    email: 'nguyenvana@example.com',
    phone: '0901000001',
    cccd: '001203000001',
    role: 'EMPLOYEE',
    status: 'Đang làm việc',
    departmentId: 1,
    departmentName: 'IT',
    positionId: 1,
    positionTitle: 'Developer',
    salaryBase: 15000000,
  },
  {
    id: 2,
    fullName: 'Trần Thị B',
    email: 'tranthib@example.com',
    phone: '0901000002',
    cccd: '001203000002',
    role: 'MANAGER',
    status: 'Đang làm việc',
    departmentId: 2,
    departmentName: 'HR',
    positionId: 2,
    positionTitle: 'HR Manager',
    salaryBase: 18000000,
  },
  {
    id: 3,
    fullName: 'Lê Văn C',
    email: 'levanc@example.com',
    phone: '0901000003',
    cccd: '001203000003',
    role: 'MANAGER',
    status: 'Đang làm việc',
    departmentId: 1,
    departmentName: 'IT',
    positionId: 3,
    positionTitle: 'Team Lead',
    salaryBase: 22000000,
  },
];

function employeeCode(id: number) {
  return `NV${String(id).padStart(3, '0')}`;
}

export function getProfileInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return 'NV';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function findDepartmentManager(employee: EmployeeApiItem, employees: EmployeeApiItem[]) {
  return employees.find((item) => {
    if (item.id === employee.id) return false;
    if (item.departmentId !== employee.departmentId) return false;
    return item.role?.trim().toUpperCase() === 'MANAGER';
  });
}

function readStoredProfile(): Partial<EmployeePortalProfile> {
  if (typeof window === 'undefined') return {};

  const saved = window.localStorage.getItem(PROFILE_SYNC_KEY);
  if (!saved) return {};

  try {
    const parsed = JSON.parse(saved);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    window.localStorage.removeItem(PROFILE_SYNC_KEY);
    return {};
  }
}

function syncProfileToStorage(profile: EmployeePortalProfile) {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(PROFILE_SYNC_KEY, JSON.stringify(profile));
  window.localStorage.setItem('hrm_employee_code', profile.employeeId);
  window.localStorage.setItem('hrm_employee_name', profile.employeeName);
  window.localStorage.setItem('hrm_employee_department', profile.department);
  window.localStorage.setItem('hrm_employee_position', profile.position);
  window.localStorage.setItem('hrm_employee_manager_name', profile.managerName);
  window.dispatchEvent(new CustomEvent('hrm-sync', { detail: { key: PROFILE_SYNC_KEY } }));
}

function buildProfile(employee: EmployeeApiItem, employees: EmployeeApiItem[], stored: Partial<EmployeePortalProfile>) {
  const manager = findDepartmentManager(employee, employees);

  return {
    numericId: employee.id,
    employeeId: employeeCode(employee.id),
    employeeName: employee.fullName || stored.employeeName || 'Nguyễn Văn A',
    email: employee.email || stored.email || 'nguyenvana@example.com',
    phone: employee.phone || stored.phone || '0901000001',
    department: employee.departmentName || stored.department || 'IT',
    position: employee.positionTitle || stored.position || 'Developer',
    status: employee.status || stored.status || 'Đang làm việc',
    managerName: manager?.fullName || stored.managerName || 'Chưa phân công',
    managerId: manager?.id || stored.managerId,
    joinDate: stored.joinDate || '01/01/2023',
    dateOfBirth: stored.dateOfBirth || '15/05/1995',
    gender: stored.gender || 'Nam',
    address: stored.address || '123 Nguyễn Huệ, Quận 1, TP.HCM',
    employmentType: stored.employmentType || 'Toàn thời gian',
    education: stored.education || 'Đại học Bách Khoa',
    major: stored.major || 'Công nghệ thông tin',
    skills: stored.skills || 'React, Node.js, Python, SQL',
    emergencyContact: stored.emergencyContact || 'Nguyễn Thị C - 0987654321',
  } satisfies EmployeePortalProfile;
}

function buildFallbackProfile(numericId: number) {
  const stored = readStoredProfile();
  const identity = getEmployeePortalIdentity(numericId);
  const employee = demoEmployees.find((item) => item.id === numericId) || demoEmployees[0];
  return {
    ...buildProfile(employee, demoEmployees, stored),
    employeeId: stored.employeeId || identity.employeeId,
    employeeName: stored.employeeName || identity.employeeName,
    department: stored.department || identity.department,
  };
}

export function useEmployeePortalProfile() {
  const numericId = useMemo(() => getCurrentEmployeeId(), []);
  const [profile, setProfile] = useState<EmployeePortalProfile>(() => buildFallbackProfile(numericId));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setLoading(true);

      try {
        const [employee, employees] = await Promise.all([fetchEmployeeById(numericId), fetchEmployees()]);
        if (cancelled) return;

        const nextProfile = buildProfile(employee, employees, readStoredProfile());
        setProfile(nextProfile);
        syncProfileToStorage(nextProfile);
      } catch {
        const fallback = buildFallbackProfile(numericId);
        setProfile(fallback);
        syncProfileToStorage(fallback);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [numericId]);

  const saveLocalProfile = (nextProfile: EmployeePortalProfile) => {
    setProfile(nextProfile);
    syncProfileToStorage(nextProfile);
  };

  return { profile, loading, saveLocalProfile };
}
