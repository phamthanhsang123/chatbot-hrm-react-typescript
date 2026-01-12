import { Bell, LogOut, Menu, Search, Settings, User } from 'lucide-react';
import { useState } from 'react';
import { Button } from "./ui/button"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface NavbarProps {
    onToggleSidebar: () => void;
}

export function Navbar({ onToggleSidebar }: NavbarProps) {
    const [notifications] = useState(3);

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
                                HR
                            </div>
                            HRM SYSTEM
                        </div>
                    </div>
                </div>

                {/* Center Section - Search */}
                <div className="hidden md:flex flex-1 max-w-md mx-8">
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm nhân viên, phòng ban..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                    </div>
                </div>

                {/* Right Section */}
                <div className="flex items-center gap-2">
                    {/* Notifications */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="relative hover:bg-gray-100">
                                <Bell className="size-5" />
                                {notifications > 0 && (
                                    <span className="absolute -top-1 -right-1 size-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                                        {notifications}
                                    </span>
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-80">
                            <DropdownMenuLabel>Thông báo</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <div className="py-2">
                                <div className="px-2 py-3 hover:bg-gray-50 cursor-pointer rounded-md">
                                    <p className="text-sm font-medium">Yêu cầu nghỉ phép mới</p>
                                    <p className="text-xs text-gray-500 mt-1">Nguyễn Văn B đã gửi yêu cầu nghỉ phép</p>
                                </div>
                                <div className="px-2 py-3 hover:bg-gray-50 cursor-pointer rounded-md">
                                    <p className="text-sm font-medium">Cập nhật hệ thống</p>
                                    <p className="text-xs text-gray-500 mt-1">Hệ thống sẽ bảo trì vào 20:00 hôm nay</p>
                                </div>
                                <div className="px-2 py-3 hover:bg-gray-50 cursor-pointer rounded-md">
                                    <p className="text-sm font-medium">Nhân viên mới</p>
                                    <p className="text-xs text-gray-500 mt-1">Chào mừng Trần Thị C gia nhập công ty</p>
                                </div>
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Settings */}
                    <Button variant="ghost" size="icon" className="hidden md:flex hover:bg-gray-100">
                        <Settings className="size-5" />
                    </Button>

                    {/* User Menu */}
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
                            <DropdownMenuItem>
                                <User className="mr-2 size-4" />
                                Hồ sơ cá nhân
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <Settings className="mr-2 size-4" />
                                Cài đặt
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">
                                <LogOut className="mr-2 size-4" />
                                Đăng xuất
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </nav>
    );
}
