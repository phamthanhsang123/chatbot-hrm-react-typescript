import { TrendingUp, Users, DollarSign, Calendar } from 'lucide-react';
import { Card } from './ui/card';

export function Analytics() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Phân tích & Thống kê</h1>
                <p className="text-gray-500 mt-1">Dữ liệu và xu hướng nhân sự</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-blue-100 text-sm">Tỷ lệ tăng trưởng</p>
                            <p className="text-3xl font-bold mt-2">+12.5%</p>
                            <p className="text-sm text-blue-100 mt-1">So với năm trước</p>
                        </div>
                        <div className="size-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                            <TrendingUp className="size-6" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-green-100 text-sm">Tỷ lệ giữ chân</p>
                            <p className="text-3xl font-bold mt-2">94.2%</p>
                            <p className="text-sm text-green-100 mt-1">Rất tốt</p>
                        </div>
                        <div className="size-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                            <Users className="size-6" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-purple-100 text-sm">Chi phí/Nhân viên</p>
                            <p className="text-3xl font-bold mt-2">22.5M</p>
                            <p className="text-sm text-purple-100 mt-1">Trung bình/tháng</p>
                        </div>
                        <div className="size-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                            <DollarSign className="size-6" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-lg">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-orange-100 text-sm">Ngày phép TB</p>
                            <p className="text-3xl font-bold mt-2">14.2</p>
                            <p className="text-sm text-orange-100 mt-1">Ngày/năm</p>
                        </div>
                        <div className="size-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                            <Calendar className="size-6" />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Employee Growth Chart */}
                <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-6">Tăng trưởng nhân sự</h3>
                    <div className="space-y-4">
                        {[
                            { month: 'T1', value: 90, color: 'bg-blue-500' },
                            { month: 'T2', value: 95, color: 'bg-blue-500' },
                            { month: 'T3', value: 100, color: 'bg-blue-500' },
                            { month: 'T4', value: 105, color: 'bg-blue-500' },
                            { month: 'T5', value: 110, color: 'bg-blue-500' },
                            { month: 'T6', value: 115, color: 'bg-blue-500' },
                            { month: 'T7', value: 118, color: 'bg-blue-500' },
                            { month: 'T8', value: 120, color: 'bg-blue-500' },
                            { month: 'T9', value: 122, color: 'bg-blue-500' },
                            { month: 'T10', value: 123, color: 'bg-blue-500' },
                            { month: 'T11', value: 124, color: 'bg-blue-500' },
                            { month: 'T12', value: 125, color: 'bg-green-500' },
                        ].map((item) => (
                            <div key={item.month} className="flex items-center gap-3">
                                <span className="text-sm font-medium text-gray-600 w-8">{item.month}</span>
                                <div className="flex-1 bg-gray-200 rounded-full h-8 relative overflow-hidden">
                                    <div
                                        className={`${item.color} h-full rounded-full flex items-center justify-end pr-3 text-white text-sm font-medium transition-all duration-500`}
                                        style={{ width: `${(item.value / 125) * 100}%` }}
                                    >
                                        {item.value}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Department Distribution */}
                <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-6">Phân bổ theo phòng ban</h3>
                    <div className="space-y-6">
                        {[
                            { dept: 'IT Department', count: 45, percent: 36, color: 'bg-blue-500' },
                            { dept: 'Sales', count: 32, percent: 26, color: 'bg-green-500' },
                            { dept: 'Marketing', count: 18, percent: 14, color: 'bg-purple-500' },
                            { dept: 'HR', count: 15, percent: 12, color: 'bg-orange-500' },
                            { dept: 'Finance', count: 15, percent: 12, color: 'bg-pink-500' },
                        ].map((item) => (
                            <div key={item.dept}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-900">{item.dept}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-gray-900">{item.count}</span>
                                        <span className="text-xs text-gray-500">({item.percent}%)</span>
                                    </div>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div
                                        className={`${item.color} h-3 rounded-full transition-all duration-500`}
                                        style={{ width: `${item.percent}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Performance Metrics */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-6">Chỉ số hiệu suất</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { label: 'Năng suất', value: '87%', trend: '+5%', color: 'text-green-600' },
                        { label: 'Đúng giờ', value: '92%', trend: '+3%', color: 'text-green-600' },
                        { label: 'Hoàn thành KPI', value: '85%', trend: '+8%', color: 'text-green-600' },
                        { label: 'Hài lòng', value: '89%', trend: '-2%', color: 'text-red-600' },
                    ].map((metric) => (
                        <div key={metric.label} className="p-4 bg-gray-50 rounded-xl">
                            <p className="text-sm text-gray-600 mb-2">{metric.label}</p>
                            <div className="flex items-end justify-between">
                                <p className="text-3xl font-bold text-gray-900">{metric.value}</p>
                                <p className={`text-sm font-medium ${metric.color}`}>{metric.trend}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <div className="flex items-start gap-3">
                        <div className="size-10 bg-blue-500 rounded-lg flex items-center justify-center text-white text-xl flex-shrink-0">
                            💡
                        </div>
                        <div>
                            <h4 className="font-semibold text-blue-900 mb-1">Insight</h4>
                            <p className="text-sm text-blue-700">Tỷ lệ tuyển dụng tăng 15% so với quý trước. Nên tăng cường đào tạo onboarding.</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <div className="flex items-start gap-3">
                        <div className="size-10 bg-green-500 rounded-lg flex items-center justify-center text-white text-xl flex-shrink-0">
                            ⚡
                        </div>
                        <div>
                            <h4 className="font-semibold text-green-900 mb-1">Cảnh báo</h4>
                            <p className="text-sm text-green-700">3 nhân viên xuất sắc sắp hết hạn hợp đồng. Nên có kế hoạch gia hạn sớm.</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                    <div className="flex items-start gap-3">
                        <div className="size-10 bg-purple-500 rounded-lg flex items-center justify-center text-white text-xl flex-shrink-0">
                            📈
                        </div>
                        <div>
                            <h4 className="font-semibold text-purple-900 mb-1">Xu hướng</h4>
                            <p className="text-sm text-purple-700">Phòng IT có tốc độ tăng trưởng nhanh nhất, chiếm 36% tổng số nhân viên.</p>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
