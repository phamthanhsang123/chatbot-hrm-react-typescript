'use client';
import { useEffect, useState } from 'react';
import Swal, { type SweetAlertIcon } from 'sweetalert2';
import { Login } from './components/Login';
import { defaultManagementSettings, Navbar, type ManagementSettings } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { ManagerTasks } from './components/ManagerTasks';
import { EmployeeTable } from './components/EmployeeTable';
import { Salary } from './components/Salary';
import { Leave } from './components/Leave';
import { Reports } from './components/Reports';
import { AttendanceApproval } from './components/AttendanceApproval';
import { CompetencyEvaluation } from './components/CompetencyEvaluation';

// Employee Components
import { EmployeeNavbar } from './employees/EmployeeNavbar'; 
import { EmployeeSidebar } from './employees/EmployeeSidebar'; 
import { Attendance } from './employees/Attendance'; 
import { EmployeeLeave } from './employees/EmployeeLeave'; 
import { EmployeeSalary } from './employees/EmployeeSalary'; 
import { EmployeeProfile } from './employees/EmployeeProfile';
import { EmployeeTasks } from './employees/EmployeeTasks';
import type { UserRole } from './types';
import { MANAGER_DEPARTMENT } from './types';

const MANAGEMENT_SETTINGS_KEY = 'hrm-management-settings';

const getDefaultPageForRole = (role: UserRole | null) => {
  if (role === 'employee') return 'attendance';
  return 'employees';
};

const escapeAlertHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const getAlertIcon = (message: string): SweetAlertIcon => {
  if (/✅|thành công|đã lưu|đã cập nhật|đã duyệt|đã tạo/i.test(message)) return 'success';
  if (/❌|lỗi|thất bại|từ chối|xóa/i.test(message)) return 'error';
  if (/⚠️|vui lòng|không hợp lệ|cảnh báo/i.test(message)) return 'warning';
  return 'info';
};

const getAlertTitle = (icon: SweetAlertIcon) => {
  switch (icon) {
    case 'success':
      return 'Thành công';
    case 'error':
      return 'Thông báo lỗi';
    case 'warning':
      return 'Cần kiểm tra';
    default:
      return 'Thông báo';
  }
};

function loadManagementSettings() {
  if (typeof window === 'undefined') return defaultManagementSettings;

  const savedSettings = window.localStorage.getItem(MANAGEMENT_SETTINGS_KEY);
  if (!savedSettings) return defaultManagementSettings;

  try {
    return {
      ...defaultManagementSettings,
      ...JSON.parse(savedSettings),
    };
  } catch {
    window.localStorage.removeItem(MANAGEMENT_SETTINGS_KEY);
    return defaultManagementSettings;
  }
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(getDefaultPageForRole(null));
  const [managementSettings, setManagementSettings] = useState<ManagementSettings>(loadManagementSettings);
  const [managementSettingsOpen, setManagementSettingsOpen] = useState(false);

  useEffect(() => {
    const nativeAlert = window.alert;

    window.alert = (message?: unknown) => {
      const text = String(message ?? '');
      const icon = getAlertIcon(text);

      void Swal.fire({
        title: getAlertTitle(icon),
        icon,
        html: `<div style="white-space:pre-line;text-align:left;line-height:1.6">${escapeAlertHtml(text)}</div>`,
        confirmButtonText: 'Đóng',
        confirmButtonColor: '#2563eb',
      });
    };

    return () => {
      window.alert = nativeAlert;
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', managementSettings.darkMode);
  }, [managementSettings.darkMode]);

  const handleManagementSettingsSave = (nextSettings: ManagementSettings) => {
    setManagementSettings(nextSettings);
    window.localStorage.setItem(MANAGEMENT_SETTINGS_KEY, JSON.stringify(nextSettings));
  };

  const handleLogin = (role: UserRole) => {
    setUserRole(role);
    setIsLoggedIn(true);
    setCurrentPage(getDefaultPageForRole(role));
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserRole(null);
    setCurrentPage(getDefaultPageForRole(null));
    setSidebarOpen(false);
  };

  // Show login screen
  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  // Employee Portal
  if (userRole === 'employee') {
    const renderEmployeePage = () => {
      switch (currentPage) {
        case 'tasks':
          return <EmployeeTasks />;
        case 'attendance':
          return <Attendance />;
        case 'leave':
          return <EmployeeLeave />;
        case 'salary':
          return <EmployeeSalary />;
        case 'profile':
          return <EmployeeProfile />;
        default:
          return <Attendance />;
      }
    };

    return (
      <div className="h-screen w-full min-w-0 flex overflow-hidden bg-slate-50 overscroll-none">
        {/* Employee Sidebar */}
        <EmployeeSidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)}
          currentPage={currentPage}
          onNavigate={setCurrentPage}
        />

        {/* Main Content */}
        <div className="min-w-0 flex-1 flex flex-col overflow-hidden">
          {/* Employee Navbar */}
          <EmployeeNavbar 
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            onLogout={handleLogout}
          />

          {/* Page Content */}
          <main className="hide-scrollbar flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
            <div className="container mx-auto min-w-0 px-4 py-8">
              {renderEmployeePage()}
            </div>
          </main>
        </div>
      </div>
    );
  }

  const renderManagementPage = () => {
    if (userRole === 'manager') {
      switch (currentPage) {
        case 'employees':
          return <EmployeeTable userRole="manager" departmentScope={MANAGER_DEPARTMENT} readOnly />;
        case 'manager-tasks':
          return <ManagerTasks departmentName={MANAGER_DEPARTMENT} />;
        case 'task-review':
          return <ManagerTasks departmentName={MANAGER_DEPARTMENT} mode="review" />;
        case 'leave':
          return <Leave />;
        case 'attendance-approval':
          return <AttendanceApproval />;
        case 'competency':
          return <CompetencyEvaluation userRole="manager" departmentScope={MANAGER_DEPARTMENT} />;
        case 'reports':
          return <Reports />;
        default:
          return <EmployeeTable userRole="manager" departmentScope={MANAGER_DEPARTMENT} readOnly />;
      }
    }

    switch (currentPage) {
      case 'employees':
        return <EmployeeTable userRole="admin" />;
      case 'salary':
        return <Salary />;
      case 'leave':
        return <Leave />;
      case 'attendance-approval':
        return <AttendanceApproval />;
      case 'competency':
        return <CompetencyEvaluation userRole="admin" />;
      case 'reports':
        return <Reports />;
      default:
        return <EmployeeTable userRole="admin" />;
    }
  };

  return (
    <div
      className={`h-screen w-full min-w-0 flex overflow-hidden overscroll-none transition-colors ${
        managementSettings.darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50'
      }`}
    >
      {/* Admin / Manager Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onOpenSettings={() => setManagementSettingsOpen(true)}
        userRole={userRole === 'manager' ? 'manager' : 'admin'}
        defaultCollapsed={managementSettings.sidebarCollapsed}
      />

      {/* Main Content */}
      <div className="min-w-0 flex-1 flex flex-col overflow-hidden">
        {/* Admin Navbar */}
        <Navbar 
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
          onLogout={handleLogout}
          settings={managementSettings}
          onSettingsSave={handleManagementSettingsSave}
          settingsOpen={managementSettingsOpen}
          onSettingsOpenChange={setManagementSettingsOpen}
          userRole={userRole === 'manager' ? 'manager' : 'admin'}
        />

        {/* Page Content */}
        <main className="hide-scrollbar flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
          <div className="container mx-auto min-w-0 px-4 py-8">
            {renderManagementPage()}
          </div>
        </main>
      </div>
    </div>
  );
}
