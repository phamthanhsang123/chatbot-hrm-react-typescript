'use client';
import { useState } from 'react';
import { Login } from './components/Login';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { EmployeeTable } from './components/EmployeeTable';
import { Salary } from './components/Salary';
import { Leave } from './components/Leave';
import { Chatbot } from './components/Chatbot';
import { Reports } from './components/Reports';
import { Analytics } from './components/Analytics';
import { AttendanceApproval } from './components/AttendanceApproval';

// Employee Components
import { EmployeeNavbar } from './employees/EmployeeNavbar'; 
import { EmployeeSidebar } from './employees/EmployeeSidebar'; 
import { EmployeeDashboard } from './employees/EmployeeDashboard'; 
import { Attendance } from './employees/Attendance'; 
import { EmployeeLeave } from './employees/EmployeeLeave'; 
import { EmployeeSalary } from './employees/EmployeeSalary'; 
import { EmployeeProfile } from './employees/EmployeeProfile';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'employee' | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');

  const handleLogin = (role: 'admin' | 'employee') => {
    setUserRole(role);
    setIsLoggedIn(true);
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserRole(null);
    setCurrentPage('dashboard');
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
        case 'dashboard':
          return <EmployeeDashboard />;
        case 'attendance':
          return <Attendance />;
        case 'leave':
          return <EmployeeLeave />;
        case 'salary':
          return <EmployeeSalary />;
        case 'chatbot':
          return <Chatbot />;
        case 'profile':
          return <EmployeeProfile />;
        default:
          return <EmployeeDashboard />;
      }
    };

    return (
      <div className="h-screen flex overflow-hidden bg-gray-50">
        {/* Employee Sidebar */}
        <EmployeeSidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)}
          currentPage={currentPage}
          onNavigate={setCurrentPage}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Employee Navbar */}
          <EmployeeNavbar 
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            onLogout={handleLogout}
          />

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto">
            <div className="container mx-auto px-4 py-8">
              {renderEmployeePage()}
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Admin Dashboard
  const renderAdminPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'employees':
        return <EmployeeTable />;
      case 'salary':
        return <Salary />;
      case 'leave':
        return <Leave />;
      case 'attendance-approval':
        return <AttendanceApproval />;
      case 'chatbot':
        return <Chatbot />;
      case 'reports':
        return <Reports />;
      case 'analytics':
        return <Analytics />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      {/* Admin Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        currentPage={currentPage}
        onNavigate={setCurrentPage}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Admin Navbar */}
        <Navbar 
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
          onLogout={handleLogout}
        />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 py-8">
            {renderAdminPage()}
          </div>
        </main>
      </div>
    </div>
  );
}