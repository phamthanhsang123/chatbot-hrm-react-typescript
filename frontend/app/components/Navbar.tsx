'use client';

import { Bell, Check, LogOut, Menu, Search, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { getSessionEmail } from '@/services/authSession';
import type { ManagementRole } from '../types';

export interface ManagementSettings {
  fullName: string;
  email: string;
  phone: string;
  emailNotifications: boolean;
  leaveNotifications: boolean;
  salaryNotifications: boolean;
  darkMode: boolean;
  sidebarCollapsed: boolean;
}

interface NavbarProps {
  onToggleSidebar: () => void;
  onLogout?: () => void;
  settings: ManagementSettings;
  onSettingsSave: (settings: ManagementSettings) => void;
  settingsOpen?: boolean;
  onSettingsOpenChange?: (open: boolean) => void;
  userRole?: ManagementRole;
}

interface Notification {
  id: number;
  title: string;
  message: string;
  read: boolean;
  time: string;
  category: 'leave' | 'salary' | 'system' | 'employee';
}

export const defaultManagementSettings: ManagementSettings = {
  fullName: 'Nguyễn Văn A',
  email: 'nguyenvana@company.com',
  phone: '0123456789',
  emailNotifications: true,
  leaveNotifications: true,
  salaryNotifications: true,
  darkMode: false,
  sidebarCollapsed: false,
};

export function Navbar({
  onToggleSidebar,
  onLogout,
  settings,
  onSettingsSave,
  settingsOpen,
  onSettingsOpenChange,
  userRole = 'admin',
}: NavbarProps) {
  const [sessionProfile, setSessionProfile] = useState({
    fullName: '',
    email: '',
    department: '',
  });
  useEffect(() => {
    setSessionProfile({
      fullName: window.localStorage.getItem('hrm_employee_name') || '',
      email: getSessionEmail(),
      department: window.localStorage.getItem('hrm_employee_department') || '',
    });
  }, [userRole]);

  const roleProfile = userRole === 'manager'
    ? {
        fullName: sessionProfile.fullName || 'Manager',
        email: sessionProfile.email || 'manager@company.com',
        title: `Manager ${sessionProfile.department || ''}`.trim(),
        scope: `Quản lý phòng ban ${sessionProfile.department || 'được phân quyền'}`,
        searchPlaceholder: 'Tìm nhân viên, task, phòng ban...',
      }
    : {
        fullName: sessionProfile.fullName || 'Admin HR',
        email: sessionProfile.email || 'admin.hr@company.com',
        title: 'HR Admin',
        scope: 'Quản trị toàn hệ thống',
        searchPlaceholder: 'Tìm nhân viên, phòng ban, chức vụ...',
      };
  const displayName = settings.fullName === defaultManagementSettings.fullName ? roleProfile.fullName : settings.fullName;
  const displayEmail = settings.email === defaultManagementSettings.email ? roleProfile.email : settings.email;

  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: 1,
      title: 'Yêu cầu nghỉ phép mới',
      message: 'Nguyễn Văn B đã gửi yêu cầu nghỉ phép',
      read: false,
      time: '5 phút trước',
      category: 'leave',
    },
    {
      id: 2,
      title: 'Cập nhật hệ thống',
      message: 'Hệ thống sẽ bảo trì vào 20:00 hôm nay',
      read: false,
      time: '1 giờ trước',
      category: 'system',
    },
    {
      id: 3,
      title: 'Nhân viên mới',
      message: 'Chào mừng Trần Thị C gia nhập công ty',
      read: false,
      time: '2 giờ trước',
      category: 'employee',
    },
  ]);

  const [internalShowSettings, setInternalShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [draftSettings, setDraftSettings] = useState<ManagementSettings>(settings);
  const showSettings = settingsOpen ?? internalShowSettings;
  const setShowSettings = onSettingsOpenChange ?? setInternalShowSettings;

  useEffect(() => {
    if (showSettings) {
      setDraftSettings(settings);
    }
  }, [settings, showSettings]);

  const visibleNotifications = notifications.filter((notification) => {
    if (notification.category === 'leave') return settings.leaveNotifications;
    if (notification.category === 'salary') return settings.salaryNotifications;
    return true;
  });

  const unreadCount = visibleNotifications.filter((notification) => !notification.read).length;
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(-1)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'U';

  const markAsRead = (id: number) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  const markAllAsRead = () => {
    const visibleIds = new Set(visibleNotifications.map((notification) => notification.id));
    setNotifications((current) =>
      current.map((notification) =>
        visibleIds.has(notification.id) ? { ...notification, read: true } : notification
      )
    );
  };

  const handleLogout = () => {
    if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
      alert('Đã đăng xuất thành công!');
      onLogout?.();
    }
  };

  const handleSaveSettings = () => {
    const fullName = draftSettings.fullName.trim();
    const email = draftSettings.email.trim();
    const phone = draftSettings.phone.trim();

    if (!fullName || !email || !phone) {
      alert('Vui lòng nhập đầy đủ họ tên, email và số điện thoại.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert('Email không hợp lệ.');
      return;
    }

    onSettingsSave({
      ...draftSettings,
      fullName,
      email,
      phone,
    });
    setShowSettings(false);
    alert('Đã lưu cài đặt thành công!');
  };

  return (
    <nav
      className={`sticky top-0 z-50 h-16 border-b shadow-sm transition-colors ${
        settings.darkMode ? 'border-slate-800 bg-slate-950 text-slate-100' : 'border-slate-200 bg-white/95 text-slate-900 backdrop-blur'
      }`}
    >
      <div className="flex h-full items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className={settings.darkMode ? 'hover:bg-white/10 hover:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
          >
            <Menu className="size-5" />
          </Button>

          <div className="hidden items-center gap-2 text-2xl font-bold text-slate-900 lg:flex">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-900 to-indigo-700 text-lg text-white shadow-lg shadow-slate-200">
              HR
            </div>
            <span>HRM SYSTEM</span>
          </div>
        </div>

        <div className="hidden max-w-md flex-1 md:mx-8 md:flex">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={roleProfile.searchPlaceholder}
              className={`w-full rounded-lg border py-2 pl-10 pr-4 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                settings.darkMode
                  ? 'border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500'
                  : 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400'
              }`}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`relative ${settings.darkMode ? 'hover:bg-white/10 hover:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
              >
                <Bell className="size-5" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex size-5 animate-pulse items-center justify-center rounded-full bg-rose-500 text-xs text-white">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="flex items-center justify-between px-2 py-2">
                <DropdownMenuLabel>Thông báo</DropdownMenuLabel>
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs" onClick={markAllAsRead}>
                    Đánh dấu tất cả đã đọc
                  </Button>
                )}
              </div>
              <DropdownMenuSeparator />
              <div className="max-h-[400px] overflow-y-auto py-2">
                {visibleNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`relative cursor-pointer rounded-md px-2 py-3 hover:bg-gray-50 ${
                      notification.read ? 'opacity-60' : ''
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-2">
                      {!notification.read && <div className="mt-1.5 size-2 shrink-0 rounded-full bg-blue-500" />}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{notification.title}</p>
                        <p className="mt-1 text-xs text-gray-500">{notification.message}</p>
                        <p className="mt-1 text-xs text-gray-400">{notification.time}</p>
                      </div>
                      {notification.read && <Check className="mt-1 size-4 shrink-0 text-green-600" />}
                    </div>
                  </div>
                ))}
              </div>
              {visibleNotifications.length === 0 && (
                <div className="py-8 text-center text-sm text-gray-500">Không có thông báo mới</div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            className={`hidden md:flex ${settings.darkMode ? 'hover:bg-white/10 hover:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
            onClick={() => setShowSettings(true)}
          >
            <Settings className="size-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={`flex items-center gap-2 ${settings.darkMode ? 'hover:bg-white/10 hover:text-white' : 'hover:bg-slate-100'}`}
              >
                <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-slate-800 to-indigo-700 text-sm font-bold text-white shadow-md">
                  {initials}
                </div>
                <div className="hidden text-left lg:block">
                  <p className="text-sm font-medium">{displayName}</p>
                  <p className={`text-xs ${settings.darkMode ? 'text-slate-400' : 'text-gray-500'}`}>{roleProfile.title}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div>
                  <p className="text-sm font-semibold">{displayName}</p>
                  <p className="text-xs font-normal text-gray-500">{displayEmail}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600" onClick={handleLogout}>
                <LogOut className="mr-2 size-4" />
                Đăng xuất
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Cài đặt</DialogTitle>
            <DialogDescription>{roleProfile.scope}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Tài khoản</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="fullname" className="text-xs">
                    Họ và tên
                  </Label>
                  <Input
                    id="fullname"
                    value={draftSettings.fullName}
                    onChange={(event) => setDraftSettings({ ...draftSettings, fullName: event.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="email-settings" className="text-xs">
                    Email
                  </Label>
                  <Input
                    id="email-settings"
                    type="email"
                    value={draftSettings.email}
                    onChange={(event) => setDraftSettings({ ...draftSettings, email: event.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-xs">
                    Số điện thoại
                  </Label>
                  <Input
                    id="phone"
                    value={draftSettings.phone}
                    onChange={(event) => setDraftSettings({ ...draftSettings, phone: event.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Thông báo</h3>
              <div className="space-y-2">
                <SettingSwitch
                  title="Email thông báo"
                  description="Nhận thông báo qua email"
                  checked={draftSettings.emailNotifications}
                  onCheckedChange={(checked) => setDraftSettings({ ...draftSettings, emailNotifications: checked })}
                />
                <SettingSwitch
                  title="Thông báo đơn nghỉ phép"
                  description="Khi có đơn mới"
                  checked={draftSettings.leaveNotifications}
                  onCheckedChange={(checked) => setDraftSettings({ ...draftSettings, leaveNotifications: checked })}
                />
                <SettingSwitch
                  title="Thông báo lương"
                  description="Khi tính lương"
                  checked={draftSettings.salaryNotifications}
                  onCheckedChange={(checked) => setDraftSettings({ ...draftSettings, salaryNotifications: checked })}
                />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Giao diện</h3>
              <div className="space-y-2">
                <SettingSwitch
                  title="Chế độ tối"
                  description="Đổi thanh điều hướng sang giao diện tối"
                  checked={draftSettings.darkMode}
                  onCheckedChange={(checked) => setDraftSettings({ ...draftSettings, darkMode: checked })}
                />
                <SettingSwitch
                  title="Sidebar thu gọn"
                  description="Thu gọn mặc định sau khi lưu"
                  checked={draftSettings.sidebarCollapsed}
                  onCheckedChange={(checked) => setDraftSettings({ ...draftSettings, sidebarCollapsed: checked })}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowSettings(false)}>
              Hủy
            </Button>
            <Button size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600" onClick={handleSaveSettings}>
              Lưu
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </nav>
  );
}

function SettingSwitch({
  title,
  description,
  checked,
  onCheckedChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-xs font-medium">{title}</p>
        <p className="text-[10px] text-gray-500">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
