'use client';

import { Bell, BriefcaseBusiness, Check, LogOut, Menu, Search, Settings, User } from 'lucide-react';
import { useMemo, useState } from 'react';
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
import { getCurrentEmployeeId } from '@/services/tasks';
import { getEmployeePortalIdentity } from './hrmSync';

interface EmployeeNavbarProps {
  onToggleSidebar: () => void;
  onLogout: () => void;
}

interface Notification {
  id: number;
  title: string;
  message: string;
  read: boolean;
  time: string;
}

const initialNotifications: Notification[] = [
  {
    id: 1,
    title: 'Task đã được Manager giao',
    message: 'Kiểm tra đồng bộ FE với API task - deadline 21/06/2026',
    read: false,
    time: '10 phút trước',
  },
  {
    id: 2,
    title: 'Task đang chờ Manager duyệt',
    message: 'Gửi demo luồng task đã ở trạng thái SUBMITTED',
    read: false,
    time: '2 giờ trước',
  },
  {
    id: 3,
    title: 'Đơn nghỉ phép đã được HR duyệt',
    message: 'Đơn nghỉ phép 20/06 đã chuyển sang trạng thái Đã duyệt',
    read: true,
    time: '1 ngày trước',
  },
];

export function EmployeeNavbar({ onToggleSidebar, onLogout }: EmployeeNavbarProps) {
  const employeeIdentity = useMemo(() => getEmployeePortalIdentity(getCurrentEmployeeId()), []);
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const markAsRead = (id: number) => {
    setNotifications((current) =>
      current.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)),
    );
  };

  const markAllAsRead = () => {
    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
  };

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setSearchQuery('');
  };

  return (
    <nav className="sticky top-0 z-50 h-16 border-b border-gray-200 bg-white shadow-sm">
      <div className="flex h-full items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="hover:bg-gray-100 lg:hidden">
            <Menu className="size-5" />
          </Button>

          <div className="hidden items-center gap-2 text-2xl font-bold text-blue-700 lg:flex">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-200">
              <BriefcaseBusiness className="size-5" />
            </div>
            EMPLOYEE PORTAL
          </div>
        </div>

        <div className="hidden max-w-md flex-1 px-8 md:flex">
          <form onSubmit={handleSearch} className="relative w-full">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm task, chính sách HR, phiếu lương..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </form>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative hover:bg-gray-100">
                <Bell className="size-5" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
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
                {notifications.map((notification) => (
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
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="icon" className="hidden hover:bg-gray-100 md:flex" onClick={() => setShowSettings(true)}>
            <Settings className="size-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 hover:bg-gray-100">
                <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md">
                  <User className="size-4" />
                </div>
                <div className="hidden text-left lg:block">
                  <p className="text-sm font-medium">{employeeIdentity.employeeName}</p>
                  <p className="text-xs text-gray-500">Developer - {employeeIdentity.department}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Tài khoản</DropdownMenuLabel>
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
                  <Input id="fullname" defaultValue={employeeIdentity.employeeName} className="h-9 text-sm" />
                </div>
                <div>
                  <Label htmlFor="email-settings" className="text-xs">
                    Email
                  </Label>
                  <Input id="email-settings" type="email" defaultValue="thanhsang3213121@gmail.com" className="h-9 text-sm" />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Thông báo</h3>
              <div className="space-y-2">
                <SettingSwitch title="Task mới" description="Khi Manager giao task" defaultChecked />
                <SettingSwitch title="Review task" description="Khi Manager duyệt, từ chối hoặc yêu cầu sửa" defaultChecked />
                <SettingSwitch title="Nghỉ phép" description="Khi HR cập nhật trạng thái đơn" defaultChecked />
                <SettingSwitch title="Lương" description="Khi phiếu lương sẵn sàng" defaultChecked />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowSettings(false)}>
              Đóng
            </Button>
            <Button size="sm" onClick={() => setShowSettings(false)}>
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
  defaultChecked,
}: {
  title: string;
  description: string;
  defaultChecked?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-xs font-medium">{title}</p>
        <p className="text-[10px] text-gray-500">{description}</p>
      </div>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}
