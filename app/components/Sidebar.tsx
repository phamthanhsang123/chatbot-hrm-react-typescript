import {
    LayoutDashboard,
    Users,
    Wallet,
    Calendar,
    MessageSquare,
    FileText,
    BarChart3,
    Settings,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from "./ui/button"


interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    currentPage: string;
    onNavigate: (page: string) => void;
}

interface MenuItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    badge?: number | string;
    active?: boolean;
}

export function Sidebar({ isOpen, onClose, currentPage, onNavigate }: SidebarProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const menuItems: MenuItem[] = [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="size-4" /> },
        { id: 'employees', label: 'Quản Lý Nhân viên', icon: <Users className="size-3" />, badge: '125', active: true },
        { id: 'salary', label: 'Quản Lý Lương', icon: <Wallet className="size-4" /> },
        { id: 'leave', label: 'Quản Lý Phép', icon: <Calendar className="size-4" />, badge: 5 },
        { id: 'chatbot', label: 'Quản Lý Chatbot', icon: <MessageSquare className="size-4" />, badge: 'New' },
        { id: 'reports', label: 'Quản Lý Báo cáo', icon: <FileText className="size-4" /> },
        { id: 'analytics', label: 'Quản Lý Phân tích', icon: <BarChart3 className="size-4" /> },
    ];

    const handleNavigate = (pageId: string) => {
        onNavigate(pageId);
        onClose(); // Close sidebar on mobile after navigation
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm transition-opacity"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
          fixed lg:sticky top-0 left-0 h-screen bg-gradient-to-b from-blue-600 via-blue-700 to-indigo-800 text-white z-50
          transition-all duration-300 ease-in-out shadow-2xl
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
          w-64
        `}
            >
                <div className="h-full flex flex-col">
                    {/* Logo Section */}
                    <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
                        {!isCollapsed && (
                            <div className="flex items-center gap-2">
                                <div className="size-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center shadow-lg">
                                    <span className="text-xl font-bold">HR</span>
                                </div>
                                <span className="font-bold text-lg">HRM System</span>
                            </div>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="hidden lg:flex text-white hover:bg-white/10 hover:text-white"
                        >
                            {isCollapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
                        </Button>
                    </div>

                    {/* Navigation Menu */}
                    <nav className="flex-1 py-6 px-3 overflow-y-auto">
                        <div className="space-y-1">
                            {menuItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => handleNavigate(item.id)}
                                    className={`
                    w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group
                    ${currentPage === item.id
                                            ? 'bg-white text-blue-700 shadow-lg shadow-blue-900/20'
                                            : 'text-white/90 hover:bg-white/10 hover:text-white'
                                        }
                    ${isCollapsed ? 'justify-center' : ''}
                  `}
                                >
                                    <div className={`${currentPage === item.id ? 'scale-110' : 'group-hover:scale-110'} transition-transform`}>
                                        {item.icon}
                                    </div>
                                    {!isCollapsed && (
                                        <>
                                            <span className="flex-1 text-left font-medium">{item.label}</span>
                                            {item.badge && (
                                                <span
                                                    className={`
                            px-2 py-0.5 text-xs rounded-full font-semibold
                            ${currentPage === item.id
                                                            ? 'bg-blue-100 text-blue-700'
                                                            : 'bg-white/20 text-white'
                                                        }
                          `}
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

                    {/* Bottom Section */}
                    <div className="p-3 border-t border-white/10">
                        <button
                            className={`
                w-full flex items-center gap-3 px-3 py-3 rounded-xl
                text-white/90 hover:bg-white/10 hover:text-white transition-all duration-200 group
                ${isCollapsed ? 'justify-center' : ''}
              `}
                        >
                            <Settings className="size-5 group-hover:rotate-90 transition-transform duration-300" />
                            {!isCollapsed && <span className="flex-1 text-left font-medium">Cài đặt</span>}
                        </button>

                        {!isCollapsed && (
                            <div className="mt-4 p-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="size-10 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full flex items-center justify-center shadow-md">
                                        <Users className="size-5" />
                                    </div>
                                    <div className="flex-1 text-sm">
                                        <p className="font-semibold">125 Nhân viên</p>
                                        <p className="text-xs text-white/70">Đang hoạt động</p>
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