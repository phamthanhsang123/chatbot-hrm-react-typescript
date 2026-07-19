'use client';

import {
  BriefcaseBusiness,
  Calendar,
  Clock,
  Settings,
  User,
  Wallet,
} from 'lucide-react';

interface EmployeeSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage: string;
  onNavigate: (page: string) => void;
  onOpenSettings?: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number | string;
}

const menuItems: MenuItem[] = [
  { id: 'tasks', label: 'Task của tôi', icon: <BriefcaseBusiness className="size-5" />, badge: 'New' },
  { id: 'attendance', label: 'Chấm công', icon: <Clock className="size-5" /> },
  { id: 'leave', label: 'Nghỉ phép', icon: <Calendar className="size-5" />, badge: 2 },
  { id: 'salary', label: 'Lương của tôi', icon: <Wallet className="size-5" /> },
  { id: 'profile', label: 'Hồ sơ cá nhân', icon: <User className="size-5" /> },
];

export function EmployeeSidebar({ isOpen, onClose, currentPage, onNavigate, onOpenSettings }: EmployeeSidebarProps) {
  const handleNavigate = (pageId: string) => {
    onNavigate(pageId);
    onClose();
  };

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity lg:hidden" onClick={onClose} />}

      <aside
        className={`
          fixed left-0 top-0 z-50 h-screen w-72 bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-white shadow-2xl
          transition-all duration-300 ease-in-out lg:sticky
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          lg:w-72
        `}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-20 items-center justify-between border-b border-white/10 px-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 shadow-lg backdrop-blur-md">
                <User className="size-5" />
              </div>
              <span className="truncate text-xl font-bold leading-tight">Employee Portal</span>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-6">
            <div className="space-y-2">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={`
                    group flex w-full items-center gap-4 rounded-2xl px-4 py-3.5 transition-all duration-200
                    ${
                      currentPage === item.id
                        ? 'bg-white/95 text-slate-950 shadow-lg shadow-black/20'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }
                  `}
                >
                  <div
                    className={`flex size-9 shrink-0 items-center justify-center rounded-xl transition-all ${
                      currentPage === item.id
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'bg-white/5 text-slate-300 group-hover:bg-white/10 group-hover:text-white'
                    }`}
                  >
                    {item.icon}
                  </div>
                  <span className="flex-1 truncate text-left text-[15px] font-semibold leading-5">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                        currentPage === item.id ? 'bg-indigo-100 text-indigo-700' : 'bg-white/10 text-slate-200'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </nav>

          <div className="border-t border-white/10 p-4">
            <button
              className="group flex w-full items-center gap-4 rounded-2xl px-4 py-3.5 text-slate-300 transition-all duration-200 hover:bg-white/10 hover:text-white"
              onClick={() => {
                onOpenSettings?.();
                onClose();
              }}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/5">
                <Settings className="size-5 transition-transform duration-300 group-hover:rotate-90" />
              </span>
              <span className="flex-1 text-left text-[15px] font-semibold">Cài đặt</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
