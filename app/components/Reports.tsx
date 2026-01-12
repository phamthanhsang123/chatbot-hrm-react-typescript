import { FileText, Download, Calendar, TrendingUp } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from "./ui/button"


export function Reports() {
    const reports = [
        { id: 1, name: 'Báo cáo nhân sự tháng 1/2026', type: 'PDF', date: '09/01/2026', size: '2.5 MB', status: 'ready' },
        { id: 2, name: 'Báo cáo lương thưởng Q4 2025', type: 'Excel', date: '05/01/2026', size: '4.2 MB', status: 'ready' },
        { id: 3, name: 'Báo cáo nghỉ phép năm 2025', type: 'PDF', date: '01/01/2026', size: '1.8 MB', status: 'ready' },
        { id: 4, name: 'Phân tích hiệu suất nhân viên', type: 'Excel', date: '28/12/2025', size: '3.1 MB', status: 'processing' },
        { id: 5, name: 'Báo cáo tuyển dụng 2025', type: 'PDF', date: '20/12/2025', size: '2.9 MB', status: 'ready' },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Báo cáo</h1>
                    <p className="text-gray-500 mt-1">Quản lý và tải xuống các báo cáo</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2">
                        <Calendar className="size-4" />
                        Lọc theo ngày
                    </Button>
                    <Button className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                        <FileText className="size-4" />
                        Tạo báo cáo mới
                    </Button>
                </div>
            </div>

            {/* Report Templates */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg hover:scale-105 transition-transform cursor-pointer">
                    <div className="flex flex-col items-center text-center">
                        <div className="size-16 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm mb-4">
                            <FileText className="size-8" />
                        </div>
                        <h3 className="font-semibold text-lg">Báo cáo nhân sự</h3>
                        <p className="text-sm text-blue-100 mt-1">Tổng quan nhân sự</p>
                    </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg hover:scale-105 transition-transform cursor-pointer">
                    <div className="flex flex-col items-center text-center">
                        <div className="size-16 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm mb-4">
                            💰
                        </div>
                        <h3 className="font-semibold text-lg">Báo cáo lương</h3>
                        <p className="text-sm text-green-100 mt-1">Chi tiết lương thưởng</p>
                    </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg hover:scale-105 transition-transform cursor-pointer">
                    <div className="flex flex-col items-center text-center">
                        <div className="size-16 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm mb-4">
                            <TrendingUp className="size-8" />
                        </div>
                        <h3 className="font-semibold text-lg">Báo cáo hiệu suất</h3>
                        <p className="text-sm text-purple-100 mt-1">Đánh giá KPI</p>
                    </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-lg hover:scale-105 transition-transform cursor-pointer">
                    <div className="flex flex-col items-center text-center">
                        <div className="size-16 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm mb-4">
                            <Calendar className="size-8" />
                        </div>
                        <h3 className="font-semibold text-lg">Báo cáo nghỉ phép</h3>
                        <p className="text-sm text-orange-100 mt-1">Thống kê nghỉ phép</p>
                    </div>
                </Card>
            </div>

            {/* Recent Reports */}
            <Card>
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold">Báo cáo gần đây</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Tên báo cáo</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Loại</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Ngày tạo</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Kích thước</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Trạng thái</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {reports.map((report) => (
                                <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="size-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                                <FileText className="size-5 text-blue-600" />
                                            </div>
                                            <span className="text-sm font-medium text-gray-900">{report.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${report.type === 'PDF'
                                                ? 'bg-red-100 text-red-700'
                                                : 'bg-green-100 text-green-700'
                                            }`}>
                                            {report.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-700">{report.date}</td>
                                    <td className="px-6 py-4 text-sm text-gray-700">{report.size}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${report.status === 'ready'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-orange-100 text-orange-700'
                                            }`}>
                                            {report.status === 'ready' ? 'Sẵn sàng' : 'Đang xử lý'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {report.status === 'ready' ? (
                                            <Button size="sm" variant="outline" className="gap-2">
                                                <Download className="size-4" />
                                                Tải xuống
                                            </Button>
                                        ) : (
                                            <Button size="sm" variant="outline" disabled>
                                                Đang xử lý...
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="size-12 bg-blue-100 rounded-xl flex items-center justify-center">
                            <FileText className="size-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Tổng báo cáo</p>
                            <p className="text-2xl font-bold text-gray-900">247</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="size-12 bg-green-100 rounded-xl flex items-center justify-center">
                            <Download className="size-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Tải xuống tháng này</p>
                            <p className="text-2xl font-bold text-gray-900">89</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="size-12 bg-purple-100 rounded-xl flex items-center justify-center">
                            <TrendingUp className="size-6 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Đang xử lý</p>
                            <p className="text-2xl font-bold text-gray-900">3</p>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
