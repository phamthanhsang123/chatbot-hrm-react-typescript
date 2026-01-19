"use client";

import {
  Bell,
  LogOut,
  Menu,
  Search,
  Settings,
  User,
  Check,
} from "lucide-react";
import { useState } from "react";
import { Button } from "../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { Switch } from "../components/ui/switch";

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

export function EmployeeNavbar({
  onToggleSidebar,
  onLogout,
}: EmployeeNavbarProps) {
  const [notifications, setNotifications] = useState<
    Notification[]
  >([
    {
      id: 1,
      title: "Đơn nghỉ phép đã được duyệt",
      message: "Đơn nghỉ phép từ 20-22/01 đã được phê duyệt",
      read: false,
      time: "10 phút trước",
    },
    {
      id: 2,
      title: "Phiếu lương tháng 12",
      message: "Phiếu lương tháng 12/2025 đã sẵn sàng",
      read: false,
      time: "2 giờ trước",
    },
    {
      id: 3,
      title: "Nhắc nhở chấm công",
      message: "Bạn chưa chấm công ngày hôm nay",
      read: false,
      time: "3 giờ trước",
    },
  ]);

  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const unreadCount = notifications.filter(
    (n) => !n.read,
  ).length;

  const markAsRead = (id: number) => {
    setNotifications(
      notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      ),
    );
  };

  const markAllAsRead = () => {
    setNotifications(
      notifications.map((n) => ({ ...n, read: true })),
    );
  };

  const handleLogout = () => {
    if (confirm("Bạn có chắc chắn muốn đăng xuất?")) {
      alert("👋 Đã đăng xuất! Hẹn gặp lại!");
      onLogout();
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      alert(
        `🔍 Tìm kiếm: "${searchQuery}"\n\nChức năng đang phát triển...`,
      );
    }
  };

  return (
    <nav className="h-16 bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="h-full px-4 flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="lg:hidden hover:bg-gray-100"
          >
            <Menu className="size-5" />
          </Button>

          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              <div className="size-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white text-lg shadow-lg shadow-blue-200">
                👤
              </div>
              EMPLOYEE PORTAL
            </div>
          </div>
        </div>

        {/* Center Section - Search */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <form
            onSubmit={handleSearch}
            className="relative w-full"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm chính sách, câu hỏi HR..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </form>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative hover:bg-gray-100"
              >
                <Bell className="size-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 size-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="flex items-center justify-between px-2 py-2">
                <DropdownMenuLabel>Thông báo</DropdownMenuLabel>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto py-1 px-2 text-xs"
                    onClick={markAllAsRead}
                  >
                    Đánh dấu tất cả đã đọc
                  </Button>
                )}
              </div>
              <DropdownMenuSeparator />
              <div className="py-2 max-h-[400px] overflow-y-auto">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`px-2 py-3 hover:bg-gray-50 cursor-pointer rounded-md relative ${
                      notification.read ? "opacity-60" : ""
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-2">
                      {!notification.read && (
                        <div className="size-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {notification.time}
                        </p>
                      </div>
                      {notification.read && (
                        <Check className="size-4 text-blue-600 flex-shrink-0 mt-1" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {notifications.length === 0 && (
                <div className="py-8 text-center text-sm text-gray-500">
                  Không có thông báo mới
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Settings */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex hover:bg-gray-100"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="size-5" />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 hover:bg-gray-100"
              >
                <div className="size-8 bg-gradient-to-br from-blue-500 to-teal-600 rounded-full flex items-center justify-center text-white shadow-md">
                  <User className="size-4" />
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-sm font-medium">
                    Nguyễn Văn B
                  </p>
                  <p className="text-xs text-gray-500">
                    Developer
                  </p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Tài khoản</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowSettings(true)}
              >
                <Settings className="mr-2 size-4" />
                Cài đặt
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 size-4" />
                Đăng xuất
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Settings Dialog */}
      <Dialog
        open={showSettings}
        onOpenChange={setShowSettings}
      >
        <DialogContent className="sm:max-w-[480px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cài đặt</DialogTitle>
            <DialogDescription>
              Tùy chỉnh thiết lập của bạn
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Account Settings */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">
                Tài khoản
              </h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="fullname" className="text-xs">
                    Họ và tên
                  </Label>
                  <Input
                    id="fullname"
                    defaultValue="Nguyễn Văn B"
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="email-settings"
                    className="text-xs"
                  >
                    Email
                  </Label>
                  <Input
                    id="email-settings"
                    type="email"
                    defaultValue="employee@company.com"
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-xs">
                    Số điện thoại
                  </Label>
                  <Input
                    id="phone"
                    defaultValue="0123456789"
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Notification Settings */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">
                Thông báo
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium">
                      Email thông báo
                    </p>
                    <p className="text-[10px] text-gray-500">
                      Nhận thông báo qua email
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium">
                      Thông báo nghỉ phép
                    </p>
                    <p className="text-[10px] text-gray-500">
                      Khi đơn được duyệt
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium">
                      Thông báo lương
                    </p>
                    <p className="text-[10px] text-gray-500">
                      Khi phiếu lương sẵn sàng
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium">
                      Nhắc chấm công
                    </p>
                    <p className="text-[10px] text-gray-500">
                      Nhắc hàng ngày
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </div>

            {/* Appearance Settings */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">
                Giao diện
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium">
                      Chế độ tối
                    </p>
                    <p className="text-[10px] text-gray-500">
                      Giao diện tối
                    </p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium">
                      Sidebar thu gọn
                    </p>
                    <p className="text-[10px] text-gray-500">
                      Thu gọn mặc định
                    </p>
                  </div>
                  <Switch />
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(false)}
            >
              Hủy
            </Button>
            <Button
              size="sm"
              className="bg-gradient-to-r from-blue-600 to-teal-600"
              onClick={() => {
                alert("✅ Đã lưu cài đặt thành công!");
                setShowSettings(false);
              }}
            >
              Lưu
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </nav>
  );
}