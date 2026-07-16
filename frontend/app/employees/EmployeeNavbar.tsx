'use client';

import { Bell, BriefcaseBusiness, Check, LogOut, Menu, Search, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { getProfileInitials, useEmployeePortalProfile } from './useEmployeePortalProfile';

export interface EmployeePortalSettings {
  taskNotifications: boolean;
  leaveNotifications: boolean;
  salaryNotifications: boolean;
  darkMode: boolean;
  sidebarCollapsed: boolean;
}

export const defaultEmployeePortalSettings: EmployeePortalSettings = {
  taskNotifications: true,
  leaveNotifications: true,
  salaryNotifications: true,
  darkMode: false,
  sidebarCollapsed: false,
};

interface EmployeeNavbarProps {
  onToggleSidebar: () => void;
  onLogout: () => void;
  settings: EmployeePortalSettings;
  onSettingsSave: (settings: EmployeePortalSettings) => void;
  settingsOpen?: boolean;
  onSettingsOpenChange?: (open: boolean) => void;
}

interface Notification {
  id: number;
  title: string;
  message: string;
  read: boolean;
  time: string;
  category: 'task' | 'leave' | 'salary' | 'system';
}

const initialNotifications: Notification[] = [
  {
    id: 1,
    title: 'Task đã được Manager giao',
    message: 'Kiểm tra đồng bộ FE với API task - deadline 21/06/2026',
    read: false,
    time: '10 phút trước',
    category: 'task',
  },
  {
    id: 2,
    title: 'Task đang chờ Manager duyệt',
    message: 'Gửi demo luồng task đã ở trạng thái SUBMITTED',
    read: false,
    time: '2 giờ trước',
    category: 'task',
  },
  {
    id: 3,
    title: 'Đơn nghỉ phép đã được HR duyệt',
    message: 'Đơn nghỉ phép 20/06 đã chuyển sang trạng thái Đã duyệt',
    read: true,
    time: '1 ngày trước',
    category: 'leave',
  },
];

export function EmployeeNavbar({
  onToggleSidebar,
  onLogout,
  settings,
  onSettingsSave,
  settingsOpen,
  onSettingsOpenChange,
}: EmployeeNavbarProps) {
  const { profile } = useEmployeePortalProfile();
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [internalShowSettings, setInternalShowSettings] = useState(false);
  const [draftSettings, setDraftSettings] = useState<EmployeePortalSettings>(settings);
  const [searchQuery, setSearchQuery] = useState('');
  const showSettings = settingsOpen ?? internalShowSettings;
  const setShowSettings = onSettingsOpenChange ?? setInternalShowSettings;

  useEffect(() => {
    if (!showSettings) return;

    const syncTimer = window.setTimeout(() => {
      setDraftSettings(settings);
    }, 0);

    return () => window.clearTimeout(syncTimer);
  }, [settings, showSettings]);

  const visibleNotifications = notifications.filter((notification) => {
    if (notification.category === 'task') return settings.taskNotifications;
    if (notification.category === 'leave') return settings.leaveNotifications;
    if (notification.category === 'salary') return settings.salaryNotifications;
    return true;
  });

  const unreadCount = visibleNotifications.filter((notification) => !notification.read).length;
  const initials = getProfileInitials(profile.employeeName);

  const markAsRead = (id: number) => {
    setNotifications((current) =>
      current.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)),
    );
  };

  const markAllAsRead = () => {
    const visibleIds = new Set(visibleNotifications.map((notification) => notification.id));
    setNotifications((current) =>
      current.map((notification) => (visibleIds.has(notification.id) ? { ...notification, read: true } : notification)),
    );
  };

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setSearchQuery('');
  };

  const handleSaveSettings = () => {
    onSettingsSave(draftSettings);
    setShowSettings(false);
    alert('Đã lưu cài đặt giao diện nhân viên thành công!');
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
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-900 to-indigo-700 text-white shadow-lg shadow-slate-200">
              <BriefcaseBusiness className="size-5" />
            </div>
            <span className={settings.darkMode ? 'text-slate-100' : 'text-slate-900'}>EMPLOYEE PORTAL</span>
          </div>
        </div>

        <div className="hidden max-w-md flex-1 md:mx-8 md:flex">
          <form onSubmit={handleSearch} className="relative w-full">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm task, chính sách HR, phiếu lương..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className={`w-full rounded-lg border py-2 pl-10 pr-4 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                settings.darkMode
                  ? 'border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500'
                  : 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400'
              }`}
            />
          </form>
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
                    Đánh dấu đã đọc
                  </Button>
                )}
              </div>
              <DropdownMenuSeparator />
              <div className="max-h-[400px] overflow-y-auto py-2">
                {visibleNotifications.map((notification) => (
                  <button
                    key={notification.id}
                    className={`w-full rounded-md px-2 py-3 text-left hover:bg-gray-50 ${
                      notification.read ? 'opacity-70' : ''
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-2">
                      {!notification.read && <div className="mt-1.5 size-2 shrink-0 rounded-full bg-blue-500" />}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                        <p className="mt-1 text-xs text-gray-500">{notification.message}</p>
                        <p className="mt-1 text-xs text-gray-400">{notification.time}</p>
                      </div>
                      {notification.read && <Check className="mt-1 size-4 shrink-0 text-blue-600" />}
                    </div>
                  </button>
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
                  <p className="text-sm font-medium">{profile.employeeName}</p>
                  <p className={`text-xs ${settings.darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    {profile.position} - {profile.department}
                  </p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div>
                  <p className="text-sm font-semibold">{profile.employeeName}</p>
                  <p className="text-xs font-normal text-gray-500">{profile.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowSettings(true)}>
                <Settings className="mr-2 size-4" />
                Cài đặt
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600" onClick={onLogout}>
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
            <DialogTitle>Cài đặt Employee Portal</DialogTitle>
            <DialogDescription>Quản lý thông tin hiển thị và thông báo cá nhân.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Tài khoản</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="fullname" className="text-xs">
                    Họ và tên
                  </Label>
                  <Input id="fullname" value={profile.employeeName} readOnly className="h-9 text-sm" />
                </div>
                <div>
                  <Label htmlFor="email-settings" className="text-xs">
                    Email
                  </Label>
                  <Input id="email-settings" type="email" value={profile.email} readOnly className="h-9 text-sm" />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Thông báo</h3>
              <div className="space-y-2">
                <SettingSwitch
                  title="Task mới và review"
                  description="Khi Manager giao, duyệt hoặc yêu cầu sửa task"
                  checked={draftSettings.taskNotifications}
                  onCheckedChange={(checked) => setDraftSettings({ ...draftSettings, taskNotifications: checked })}
                />
                <SettingSwitch
                  title="Nghỉ phép"
                  description="Khi HR cập nhật trạng thái đơn"
                  checked={draftSettings.leaveNotifications}
                  onCheckedChange={(checked) => setDraftSettings({ ...draftSettings, leaveNotifications: checked })}
                />
                <SettingSwitch
                  title="Lương"
                  description="Khi phiếu lương sẵn sàng"
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
              Đóng
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
