import { DollarSign, TrendingUp, Users, Calendar } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from "./ui/button"
import { Badge } from './ui/badge';

export function Salary() {
    const salaryData = [
        { id: 1, name: 'Nguyễn Văn A', department: 'IT', baseSalary: '15,000,000', bonus: '3,000,000', total: '18,000,000', status: 'paid' },
        { id: 2, name: 'Trần Thị B', department: 'HR', baseSalary: '18,000,000', bonus: '4,000,000', total: '22,000,000', status: 'paid' },
        { id: 3, name: 'Lê Văn C', department: 'IT', baseSalary: '22,000,000', bonus: '5,000,000', total: '27,000,000', status: 'pending' },
        { id: 4, name: 'Phạm Thị D', department: 'Marketing', baseSalary: '12,000,000', bonus: '2,500,000', total: '14,500,000', status: 'paid' },
        { id: 5, name: 'Hoàng Văn E', department: 'Sales', baseSalary: '20,000,000', bonus: '6,000,000', total: '26,000,000', status: 'pending' },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Quản lý lương thưởng</h1>
                    <p className="text-gray-500 mt-1">Theo dõi và quản lý lương thưởng nhân viên</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">Xuất báo cáo</Button>
                    <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                        Tính lương tháng mới
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-6 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-lg">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-emerald-100 text-sm">Tổng chi lương tháng này</p>
                            <p className="text-3xl font-bold mt-2">2.1 tỷ đ</p>
                            <p className="text-sm text-emerald-100 mt-1">125 nhân viên</p>
                        </div>
                        <div className="size-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                            <DollarSign className="size-6" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-blue-100 text-sm">Lương trung bình</p>
                            <p className="text-3xl font-bold mt-2">16.8M đ</p>
                            <p className="text-sm text-blue-100 mt-1">+5% so với tháng trước</p>
                        </div>
                        <div className="size-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                            <TrendingUp className="size-6" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-purple-100 text-sm">Tổng thưởng</p>
                            <p className="text-3xl font-bold mt-2">450M đ</p>
                            <p className="text-sm text-purple-100 mt-1">Tháng này</p>
                        </div>
                        <div className="size-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                            💰
                        </div>
                    </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-lg">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-orange-100 text-sm">Chưa thanh toán</p>
                            <p className="text-3xl font-bold mt-2">12</p>
                            <p className="text-sm text-orange-100 mt-1">Nhân viên</p>
                        </div>
                        <div className="size-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                            <Users className="size-6" />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Salary Table */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">ID</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Nhân viên</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Phòng ban</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Lương cơ bản</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Thưởng</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Tổng</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Trạng thái</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {salaryData.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.id}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="size-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold">
                                                {item.name.charAt(0)}
                                            </div>
                                            <span className="text-sm font-medium">{item.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-700">{item.department}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{item.baseSalary} đ</td>
                                    <td className="px-6 py-4 text-sm text-green-600 font-medium">+{item.bonus} đ</td>
                                    <td className="px-6 py-4 text-sm font-bold text-gray-900">{item.total} đ</td>
                                    <td className="px-6 py-4">
                                        <Badge variant={item.status === 'paid' ? 'default' : 'secondary'} className={item.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}>
                                            {item.status === 'paid' ? 'Đã thanh toán' : 'Chờ thanh toán'}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Button size="sm" variant="outline">Chi tiết</Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
