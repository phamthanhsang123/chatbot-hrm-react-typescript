import { Calendar, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from "./ui/button"
import { Badge } from './ui/badge';

export function Leave() {
    const leaveRequests = [
        { id: 1, name: 'Nguyễn Văn A', type: 'Nghỉ phép năm', from: '10/01/2026', to: '12/01/2026', days: 3, status: 'pending', reason: 'Du lịch gia đình' },
        { id: 2, name: 'Trần Thị B', type: 'Nghỉ ốm', from: '08/01/2026', to: '09/01/2026', days: 2, status: 'approved', reason: 'Ốm' },
        { id: 3, name: 'Lê Văn C', type: 'Nghỉ không lương', from: '15/01/2026', to: '20/01/2026', days: 6, status: 'pending', reason: 'Việc cá nhân' },
        { id: 4, name: 'Phạm Thị D', type: 'Nghỉ phép năm', from: '05/01/2026', to: '07/01/2026', days: 3, status: 'approved', reason: 'Nghỉ ngơi' },
        { id: 5, name: 'Hoàng Văn E', type: 'Nghỉ ốm', from: '09/01/2026', to: '09/01/2026', days: 1, status: 'rejected', reason: 'Khám bệnh' },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Quản lý nghỉ phép</h1>
                    <p className="text-gray-500 mt-1">Theo dõi và duyệt đơn xin nghỉ phép</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">Lịch nghỉ phép</Button>
                    <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                        Tạo đơn nghỉ phép
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-blue-100 text-sm">Chờ duyệt</p>
                            <p className="text-3xl font-bold mt-2">5</p>
                            <p className="text-sm text-blue-100 mt-1">Đơn xin nghỉ</p>
                        </div>
                        <div className="size-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                            <Clock className="size-6" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-green-100 text-sm">Đã duyệt</p>
                            <p className="text-3xl font-bold mt-2">18</p>
                            <p className="text-sm text-green-100 mt-1">Tháng này</p>
                        </div>
                        <div className="size-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                            <CheckCircle className="size-6" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-lg">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-orange-100 text-sm">Đang nghỉ hôm nay</p>
                            <p className="text-3xl font-bold mt-2">7</p>
                            <p className="text-sm text-orange-100 mt-1">Nhân viên</p>
                        </div>
                        <div className="size-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                            <Calendar className="size-6" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-red-500 to-red-600 text-white border-0 shadow-lg">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-red-100 text-sm">Từ chối</p>
                            <p className="text-3xl font-bold mt-2">3</p>
                            <p className="text-sm text-red-100 mt-1">Tháng này</p>
                        </div>
                        <div className="size-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                            <XCircle className="size-6" />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Leave Requests Table */}
            <Card className="overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm">Tất cả</Button>
                        <Button variant="outline" size="sm">Chờ duyệt</Button>
                        <Button variant="outline" size="sm">Đã duyệt</Button>
                        <Button variant="outline" size="sm">Từ chối</Button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">ID</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Nhân viên</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Loại nghỉ</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Từ ngày</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Đến ngày</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Số ngày</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Lý do</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Trạng thái</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {leaveRequests.map((request) => (
                                <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{request.id}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="size-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold">
                                                {request.name.charAt(0)}
                                            </div>
                                            <span className="text-sm font-medium">{request.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-700">{request.type}</td>
                                    <td className="px-6 py-4 text-sm text-gray-700">{request.from}</td>
                                    <td className="px-6 py-4 text-sm text-gray-700">{request.to}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{request.days} ngày</td>
                                    <td className="px-6 py-4 text-sm text-gray-700">{request.reason}</td>
                                    <td className="px-6 py-4">
                                        <Badge
                                            variant="secondary"
                                            className={
                                                request.status === 'approved'
                                                    ? 'bg-green-100 text-green-700'
                                                    : request.status === 'rejected'
                                                        ? 'bg-red-100 text-red-700'
                                                        : 'bg-orange-100 text-orange-700'
                                            }
                                        >
                                            {request.status === 'approved' ? 'Đã duyệt' : request.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt'}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {request.status === 'pending' ? (
                                            <div className="flex justify-end gap-2">
                                                <Button size="sm" variant="outline" className="text-green-600 hover:bg-green-50">
                                                    Duyệt
                                                </Button>
                                                <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50">
                                                    Từ chối
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button size="sm" variant="outline">Chi tiết</Button>
                                        )}
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
