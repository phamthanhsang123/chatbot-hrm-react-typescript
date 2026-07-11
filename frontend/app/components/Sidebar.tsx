'use client';

import {
  BarChart3,
  BrainCircuit,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Users,
  Wallet,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import type { ManagementRole } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage: string;
  onNavigate: (page: string) => void;
  onOpenSettings?: () => void;
  userRole?: ManagementRole;
  defaultCollapsed?: boolean;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number | string;
}

const adminMenuItems: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="size-5" /> },
  { id: 'employees', label: 'Nhân viên', icon: <Users className="size-5" />, badge: '125' },
  { id: 'salary', label: 'Lương thưởng', icon: <Wallet className="size-5" /> },
  { id: 'leave', label: 'Nghỉ phép', icon: <Calendar className="size-5" />, badge: 5 },
  { id: 'attendance-approval', label: 'Duyệt chấm công', icon: <ClipboardCheck className="size-5" />, badge: 3 },
  { id: 'competency', label: 'Đánh giá năng lực', icon: <BrainCircuit className="size-5" />, badge: 'AI' },
  { id: 'chatbot', label: 'AI Assistant', icon: <MessageSquare className="size-5" />, badge: 'New' },
  { id: 'reports', label: 'Báo cáo', icon: <FileText className="size-5" /> },
  { id: 'analytics', label: 'Phân tích', icon: <BarChart3 className="size-5" /> },
];

const managerMenuItems: MenuItem[] = [
  { id: 'dashboard', label: 'Tổng quan team', icon: <LayoutDashboard className="size-5" /> },
  { id: 'employees', label: 'Nhân viên team', icon: <Users className="size-5" />, badge: 'IT' },
  { id: 'manager-tasks', label: 'Giao task', icon: <ClipboardList className="size-5" />, badge: 4 },
  { id: 'task-review', label: 'Duyệt task', icon: <ClipboardCheck className="size-5" />, badge: 1 },
  { id: 'leave', label: 'Duyệt nghỉ phép', icon: <Calendar className="size-5" />, badge: 3 },
  { id: 'attendance-approval', label: 'Chấm công team', icon: <ClipboardCheck className="size-5" />, badge: 2 },
  { id: 'competency', label: 'Năng lực team', icon: <BrainCircuit className="size-5" />, badge: 'AI' },
  { id: 'reports', label: 'Báo cáo team', icon: <FileText className="size-5" /> },
  { id: 'chatbot', label: 'AI Assistant', icon: <MessageSquare className="size-5" /> },
];

export function Sidebar({
  isOpen,
  onClose,
  currentPage,
  onNavigate,
  onOpenSettings,
  userRole = 'admin',
  defaultCollapsed = false,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [showSettings, setShowSettings] = useState(false);
  const menuItems = userRole === 'manager' ? managerMenuItems : adminMenuItems;
  const roleInfo = userRole === 'manager'
    ? {
        title: 'Manager Portal',
        subtitle: 'Phòng ban IT',
        summary: '4 nhân viên IT',
        summaryNote: 'Phạm vi quản lý',
      }
    : {
        title: 'HR Admin',
        subtitle: 'Toàn hệ thống',
        summary: '125 nhân viên',
        summaryNote: 'Đang hoạt động',
      };

  useEffect(() => {
    setIsCollapsed(defaultCollapsed);
  }, [defaultCollapsed]);

  const handleNavigate = (pageId: string) => {
    onNavigate(pageId);
    onClose();
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed left-0 top-0 z-50 h-screen w-64 border-r border-slate-800 bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-white shadow-2xl
          transition-all duration-300 ease-in-out lg:sticky
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
        `}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
            {!isCollapsed && (
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-xl font-bold shadow-lg backdrop-blur-md">
                  HR
                </div>
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold">{roleInfo.title}</p>
                  <p className="truncate text-xs text-white/65">{roleInfo.subtitle}</p>
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden text-slate-200 hover:bg-white/10 hover:text-white lg:flex"
            >
              {isCollapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
            </Button>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-6">
            <div className="space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={`
                    group flex w-full items-center gap-3 rounded-xl px-3 py-3 transition-all duration-200
                    ${
                      currentPage === item.id
                        ? 'bg-white/95 text-slate-950 shadow-lg shadow-black/20'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }
                    ${isCollapsed ? 'justify-center' : ''}
                  `}
                >
                  <div className={`${currentPage === item.id ? 'scale-110' : 'group-hover:scale-110'} transition-transform`}>
                    {item.icon}
                  </div>
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 truncate text-left font-medium">{item.label}</span>
                      {item.badge && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            currentPage === item.id ? 'bg-indigo-100 text-indigo-700' : 'bg-white/10 text-slate-200'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </button>
              ))}
            </div>
          </nav>

          <div className="border-t border-white/10 p-3">
            <button
              className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-slate-300 transition-all duration-200 hover:bg-white/10 hover:text-white ${
                isCollapsed ? 'justify-center' : ''
              }`}
              onClick={() => {
                setShowSettings(!showSettings);
                onOpenSettings?.();
              }}
            >
              <Settings className="size-5 transition-transform duration-300 group-hover:rotate-90" />
              {!isCollapsed && <span className="flex-1 text-left font-medium">Cài đặt</span>}
            </button>

            {showSettings && !isCollapsed && (
              <div className="mt-4 rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 shadow-md">
                    <Users className="size-5" />
                  </div>
                  <div className="flex-1 text-sm">
                    <p className="font-semibold">{roleInfo.summary}</p>
                    <p className="text-xs text-white/70">{roleInfo.summaryNote}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
