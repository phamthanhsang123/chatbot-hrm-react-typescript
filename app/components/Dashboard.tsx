import { TrendingUp, Users, Wallet, Calendar, ArrowUp, ArrowDown } from 'lucide-react';
import { Card } from './ui/card';
import { AddEmployeeDialog } from '@/app/dialogs/AddEmployeeDialog';
import { ApproveLeaveDialog } from '@/app/dialogs/ApproveLeaveDialog';
import { ExportReportDialog } from '@/app/dialogs/ExportReportDialog';
import { CalculateSalaryDialog } from '@/app/dialogs/CalculateSalaryDialog';
import React from 'react';


export function Dashboard() {
    const [openAddEmployee, setOpenAddEmployee] = React.useState(false)
    const [openApproveLeave, setOpenApproveLeave] = React.useState(false)
    const [openExportReport, setOpenExportReport] = React.useState(false)
    const [openCalculateSalary, setOpenCalculateSalary] = React.useState(false)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-500 mt-1">Tổng quan hệ thống HRM</p>
            </div>


            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-blue-100 text-sm">Tổng nhân viên</p>
                            <p className="text-3xl font-bold mt-2">125</p>
                            <div className="flex items-center gap-1 mt-2 text-sm">
                                <ArrowUp className="size-4" />
                                <span>+12% so với tháng trước</span>
                            </div>
                        </div>
                        <div className="size-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                            <Users className="size-6" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-green-100 text-sm">Tổng lương tháng này</p>
                            <p className="text-3xl font-bold mt-2">2.1 tỷ</p>
                            <div className="flex items-center gap-1 mt-2 text-sm">
                                <ArrowUp className="size-4" />
                                <span>+5% so với tháng trước</span>
                            </div>
                        </div>
                        <div className="size-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                            <Wallet className="size-6" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-lg">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-orange-100 text-sm">Nghỉ phép hôm nay</p>
                            <p className="text-3xl font-bold mt-2">7</p>
                            <div className="flex items-center gap-1 mt-2 text-sm">
                                <ArrowDown className="size-4" />
                                <span>-3 so với hôm qua</span>
                            </div>
                        </div>
                        <div className="size-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                            <Calendar className="size-6" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-purple-100 text-sm">Hiệu suất trung bình</p>
                            <p className="text-3xl font-bold mt-2">87%</p>
                            <div className="flex items-center gap-1 mt-2 text-sm">
                                <ArrowUp className="size-4" />
                                <span>+2% so với tháng trước</span>
                            </div>
                        </div>
                        <div className="size-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                            <TrendingUp className="size-6" />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Nhân viên theo phòng ban</h3>
                    <div className="space-y-3">
                        {[
                            { dept: 'IT Department', count: 45, color: 'bg-blue-500', percent: 36 },
                            { dept: 'Sales', count: 32, color: 'bg-green-500', percent: 26 },
                            { dept: 'Marketing', count: 18, color: 'bg-purple-500', percent: 14 },
                            { dept: 'HR', count: 15, color: 'bg-orange-500', percent: 12 },
                            { dept: 'Finance', count: 15, color: 'bg-pink-500', percent: 12 },
                        ].map((item) => (
                            <div key={item.dept}>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium">{item.dept}</span>
                                    <span className="text-sm text-gray-600">{item.count} người</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className={`${item.color} h-2 rounded-full transition-all duration-500`}
                                        style={{ width: `${item.percent}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Hoạt động gần đây</h3>
                    <div className="space-y-4">
                        {[
                            { action: 'Nguyễn Văn A đã được thêm vào hệ thống', time: '5 phút trước', icon: '👤' },
                            { action: 'Trần Thị B đã gửi yêu cầu nghỉ phép', time: '30 phút trước', icon: '📅' },
                            { action: 'Lương tháng 1 đã được duyệt', time: '2 giờ trước', icon: '💰' },
                            { action: 'Báo cáo hiệu suất Q4 đã sẵn sàng', time: '5 giờ trước', icon: '📊' },
                            { action: 'Phạm Văn C đã hoàn thành khóa đào tạo', time: '1 ngày trước', icon: '🎓' },
                        ].map((item, index) => (
                            <div key={index} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                                <div className="size-10 bg-gray-100 rounded-lg flex items-center justify-center text-xl flex-shrink-0">
                                    {item.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900">{item.action}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{item.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Quick Actions */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Thao tác nhanh</h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button
                        onClick={() => setOpenAddEmployee(true)}
                        className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl hover:scale-105 transition-transform shadow-lg"
                    >
                        <div className="text-3xl mb-2">👥</div>
                        <p className="text-sm font-medium">Thêm nhân viên</p>
                    </button>

                    <button
                        onClick={() => setOpenApproveLeave(true)}
                        className="p-4 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl hover:scale-105 transition-transform shadow-lg">
                        <div className="text-3xl mb-2">✅</div>
                        <p className="text-sm font-medium">Duyệt nghỉ phép</p>
                    </button>

                    <button
                        onClick={() => setOpenExportReport(true)}
                        className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl hover:scale-105 transition-transform shadow-lg">
                        <div className="text-3xl mb-2">📄</div>
                        <p className="text-sm font-medium">Xuất báo cáo</p>
                    </button>

                    <button
                        onClick={() => setOpenCalculateSalary(true)}
                        className="p-4 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl hover:scale-105 transition-transform shadow-lg">
                        <div className="text-3xl mb-2">💵</div>
                        <p className="text-sm font-medium">Tính lương</p>
                    </button>
                </div>
            </Card>

            {/* Popup thêm nhân viên */}
            <AddEmployeeDialog
                open={openAddEmployee}
                onOpenChange={setOpenAddEmployee}
            />

            {/* Popup Duyet Phep */}
            <ApproveLeaveDialog
                open={openApproveLeave}
                onOpenChange={setOpenApproveLeave}
            />

            {/* Popup xuat bao cao */}
            <ExportReportDialog
                open={openExportReport}
                onOpenChange={setOpenExportReport}
            />

            {/* Popup tinh luong */}
            <CalculateSalaryDialog
                open={openCalculateSalary}
                onOpenChange={setOpenCalculateSalary}
            />


        </div>
    );
}
