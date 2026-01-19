"use client";

import { Bell, LogOut, Menu, Search, Settings, User, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Switch } from "./ui/switch";

interface NavbarProps {
    onToggleSidebar: () => void;
}

interface Notification {
    id: number;
    title: string;
    message: string;
    read: boolean;
    time: string;
}

export function Navbar({ onToggleSidebar }: NavbarProps) {
    const [notifications, setNotifications] = useState<Notification[]>([
        {
            id: 1,
            title: "Yêu cầu nghỉ phép mới",
            message: "Nguyễn Văn B đã gửi yêu cầu nghỉ phép",
            read: false,
            time: "5 phút trước",
        },
        {
            id: 2,
            title: "Cập nhật hệ thống",
            message: "Hệ thống sẽ bảo trì vào 20:00 hôm nay",
            read: false,
            time: "1 giờ trước",
        },
        {
            id: 3,
            title: "Nhân viên mới",
            message: "Chào mừng Trần Thị C gia nhập công ty",
            read: false,
            time: "2 giờ trước",
        },
    ]);

    const [showSettings, setShowSettings] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const [emailNotify, setEmailNotify] = useState(true);
    const [leaveNotify, setLeaveNotify] = useState(true);
    const [salaryNotify, setSalaryNotify] = useState(true);
    const [darkMode, setDarkMode] = useState(false);
    const [compactSidebar, setCompactSidebar] = useState(false);

    const unreadCount = notifications.filter((n) => !n.read).length;

    const markAsRead = (id: number) => {
        setNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)));
    };

    const markAllAsRead = () => {
        setNotifications(notifications.map((n) => ({ ...n, read: true })));
    };

    const handleLogout = () => {
        if (confirm("Bạn có chắc chắn muốn đăng xuất?")) {
            alert("Đã đăng xuất thành công!");
            window.location.reload();
        }
    };

    return (
        <nav className="h-16 bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
            <div className="h-full px-4 flex items-center justify-between">
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
                                HR
                            </div>
                            HRM SYSTEM
                        </div>
                    </div>
                </div>

                <div className="hidden md:flex flex-1 max-w-md mx-8">
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm nhân viên, phòng ban..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="relative hover:bg-gray-100">
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
                                        className={`px-2 py-3 hover:bg-gray-50 cursor-pointer rounded-md relative ${notification.read ? "opacity-60" : ""
                                            }`}
                                        onClick={() => markAsRead(notification.id)}
                                    >
                                        <div className="flex items-start gap-2">
                                            {!notification.read && (
                                                <div className="size-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                                            )}
                                            <div className="flex-1">
                                                <p className="text-sm font-medium">{notification.title}</p>
                                                <p className="text-xs text-gray-500 mt-1">{notification.message}</p>
                                                <p className="text-xs text-gray-400 mt-1">{notification.time}</p>
                                            </div>
                                            {notification.read && <Check className="size-4 text-green-600 flex-shrink-0 mt-1" />}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {notifications.length === 0 && (
                                <div className="py-8 text-center text-sm text-gray-500">Không có thông báo mới</div>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="hidden md:flex hover:bg-gray-100"
                        onClick={() => setShowSettings(true)}
                    >
                        <Settings className="size-5" />
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="flex items-center gap-2 hover:bg-gray-100">
                                <div className="size-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white shadow-md">
                                    <User className="size-4" />
                                </div>
                                <div className="hidden lg:block text-left">
                                    <p className="text-sm font-medium">Nguyễn Văn A</p>
                                    <p className="text-xs text-gray-500">HR Manager</p>
                                </div>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>Tài khoản</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => alert("Mở trang hồ sơ cá nhân")}>
                                <User className="mr-2 size-4" />
                                Hồ sơ cá nhân
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setShowSettings(true)}>
                                <Settings className="mr-2 size-4" />
                                Cài đặt
                            </DropdownMenuItem>
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
                <DialogContent className="sm:max-w-[480px] max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Cài đặt</DialogTitle>
                        <DialogDescription>Tùy chỉnh thiết lập của bạn</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-gray-900">Tài khoản</h3>
                            <div className="space-y-3">
                                <div>
                                    <Label htmlFor="fullname" className="text-xs">
                                        Họ và tên
                                    </Label>
                                    <Input id="fullname" defaultValue="Nguyễn Văn A" className="h-9 text-sm" />
                                </div>
                                <div>
                                    <Label htmlFor="email-settings" className="text-xs">
                                        Email
                                    </Label>
                                    <Input
                                        id="email-settings"
                                        type="email"
                                        defaultValue="nguyenvana@company.com"
                                        className="h-9 text-sm"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="phone" className="text-xs">
                                        Số điện thoại
                                    </Label>
                                    <Input id="phone" defaultValue="0123456789" className="h-9 text-sm" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-gray-900">Thông báo</h3>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-medium">Email thông báo</p>
                                        <p className="text-[10px] text-gray-500">Nhận thông báo qua email</p>
                                    </div>
                                    <Switch  checked={emailNotify} onCheckedChange={setEmailNotify} />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-medium">Thông báo đơn nghỉ phép</p>
                                        <p className="text-[10px] text-gray-500">Khi có đơn mới</p>
                                    </div>
                                    <Switch checked={leaveNotify} onCheckedChange={setLeaveNotify} />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-medium">Thông báo lương</p>
                                        <p className="text-[10px] text-gray-500">Khi tính lương</p>
                                    </div>
                                    <Switch checked={salaryNotify} onCheckedChange={setSalaryNotify} />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-gray-900">Giao diện</h3>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-medium">Chế độ tối</p>
                                        <p className="text-[10px] text-gray-500">Giao diện tối</p>
                                    </div>
                                    <Switch checked={darkMode} onCheckedChange={setDarkMode} />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-medium">Sidebar thu gọn</p>
                                        <p className="text-[10px] text-gray-500">Thu gọn mặc định</p>
                                    </div>
                                    <Switch checked={compactSidebar} onCheckedChange={setCompactSidebar} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setShowSettings(false)}>
                            Hủy
                        </Button>
                        <Button
                            size="sm"
                            className="bg-gradient-to-r from-blue-600 to-indigo-600"
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
