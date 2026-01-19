'use client';
import { FileText, Download, Calendar, TrendingUp, Plus, Filter, Eye } from 'lucide-react';
import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';

interface Report {
  id: number;
  name: string;
  type: 'PDF' | 'Excel';
  date: string;
  size: string;
  status: 'ready' | 'processing';
}

export function Reports() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'PDF' | 'Excel'>('all');

  const [reports, setReports] = useState<Report[]>([
    { id: 1, name: 'Báo cáo nhân sự tháng 1/2026', type: 'PDF', date: '09/01/2026', size: '2.5 MB', status: 'ready' },
    { id: 2, name: 'Báo cáo lương thưởng Q4 2025', type: 'Excel', date: '05/01/2026', size: '4.2 MB', status: 'ready' },
    { id: 3, name: 'Báo cáo nghỉ phép năm 2025', type: 'PDF', date: '01/01/2026', size: '1.8 MB', status: 'ready' },
    { id: 4, name: 'Phân tích hiệu suất nhân viên', type: 'Excel', date: '28/12/2025', size: '3.1 MB', status: 'processing' },
    { id: 5, name: 'Báo cáo tuyển dụng 2025', type: 'PDF', date: '20/12/2025', size: '2.9 MB', status: 'ready' },
  ]);

  const [newReport, setNewReport] = useState({
    name: '',
    type: 'PDF' as 'PDF' | 'Excel',
    description: '',
  });

  const filteredReports = filterType === 'all' 
    ? reports 
    : reports.filter(r => r.type === filterType);

  const handleDownload = (report: Report) => {
    if (report.status === 'ready') {
      alert(`📥 Đang tải xuống "${report.name}"...\n\nLoại: ${report.type}\nKích thước: ${report.size}`);
    }
  };

  const handleViewDetail = (report: Report) => {
    setSelectedReport(report);
    setShowDetailDialog(true);
  };

  const handleCreateReport = () => {
    if (!newReport.name || !newReport.description) {
      alert('⚠️ Vui lòng điền đầy đủ thông tin!');
      return;
    }

    const report: Report = {
      id: Math.max(...reports.map(r => r.id)) + 1,
      name: newReport.name,
      type: newReport.type,
      date: new Date().toLocaleDateString('vi-VN'),
      size: '0 MB',
      status: 'processing',
    };

    setReports([report, ...reports]);

    alert(
      `✅ Đã tạo báo cáo thành công!\n\n` +
      `Tên: ${newReport.name}\n` +
      `Loại: ${newReport.type}\n` +
      `Trạng thái: Đang xử lý`
    );

    setShowCreateDialog(false);
    setNewReport({ name: '', type: 'PDF', description: '' });
  };

  const handleGenerateReport = (type: string) => {
    const reportNames = {
      'HR': 'Báo cáo nhân sự tháng ' + new Date().toLocaleDateString('vi-VN', { month: 'numeric', year: 'numeric' }),
      'Salary': 'Báo cáo lương thưởng tháng ' + new Date().toLocaleDateString('vi-VN', { month: 'numeric', year: 'numeric' }),
      'Performance': 'Báo cáo hiệu suất tháng ' + new Date().toLocaleDateString('vi-VN', { month: 'numeric', year: 'numeric' }),
      'Leave': 'Báo cáo nghỉ phép tháng ' + new Date().toLocaleDateString('vi-VN', { month: 'numeric', year: 'numeric' }),
    };

    alert(
      `🔄 Đang tạo báo cáo...\n\n` +
      `Loại: ${reportNames[type as keyof typeof reportNames]}\n` +
      `Thời gian: Dự kiến 2-3 phút\n` +
      `Bạn sẽ nhận được thông báo khi hoàn tất.`
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Báo cáo</h1>
          <p className="text-gray-500 mt-1">Quản lý và tải xuống các báo cáo</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setShowFilterDialog(true)}>
            <Filter className="size-4" />
            Lọc: {filterType === 'all' ? 'Tất cả' : filterType}
          </Button>
          <Button 
            className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="size-4" />
            Tạo báo cáo mới
          </Button>
        </div>
      </div>

      {/* Report Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card 
          className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg hover:scale-105 transition-transform cursor-pointer"
          onClick={() => handleGenerateReport('HR')}
        >
          <div className="flex flex-col items-center text-center">
            <div className="size-16 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm mb-4">
              <FileText className="size-8" />
            </div>
            <h3 className="font-semibold text-lg">Báo cáo nhân sự</h3>
            <p className="text-sm text-blue-100 mt-1">Tổng quan nhân sự</p>
          </div>
        </Card>

        <Card 
          className="p-6 bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg hover:scale-105 transition-transform cursor-pointer"
          onClick={() => handleGenerateReport('Salary')}
        >
          <div className="flex flex-col items-center text-center">
            <div className="size-16 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm mb-4">
              💰
            </div>
            <h3 className="font-semibold text-lg">Báo cáo lương</h3>
            <p className="text-sm text-green-100 mt-1">Chi tiết lương thưởng</p>
          </div>
        </Card>

        <Card 
          className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg hover:scale-105 transition-transform cursor-pointer"
          onClick={() => handleGenerateReport('Performance')}
        >
          <div className="flex flex-col items-center text-center">
            <div className="size-16 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm mb-4">
              <TrendingUp className="size-8" />
            </div>
            <h3 className="font-semibold text-lg">Báo cáo hiệu suất</h3>
            <p className="text-sm text-purple-100 mt-1">Đánh giá KPI</p>
          </div>
        </Card>

        <Card 
          className="p-6 bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-lg hover:scale-105 transition-transform cursor-pointer"
          onClick={() => handleGenerateReport('Leave')}
        >
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
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Báo cáo gần đây</h2>
          <Badge variant="secondary">{filteredReports.length} báo cáo</Badge>
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
              {filteredReports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                        <FileText className="size-5 text-blue-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-900">{report.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      report.type === 'PDF' 
                        ? 'bg-red-100 text-red-700' 
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {report.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{report.date}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{report.size}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      report.status === 'ready' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      {report.status === 'ready' ? 'Sẵn sàng' : 'Đang xử lý'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {report.status === 'ready' ? (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="gap-2"
                            onClick={() => handleViewDetail(report)}
                          >
                            <Eye className="size-4" />
                            Xem
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="gap-2"
                            onClick={() => handleDownload(report)}
                          >
                            <Download className="size-4" />
                            Tải
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" variant="outline" disabled>
                          Đang xử lý...
                        </Button>
                      )}
                    </div>
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
              <p className="text-2xl font-bold text-gray-900">{reports.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="size-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Download className="size-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Sẵn sàng tải</p>
              <p className="text-2xl font-bold text-gray-900">{reports.filter(r => r.status === 'ready').length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="size-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="size-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Đang xử lý</p>
              <p className="text-2xl font-bold text-gray-900">{reports.filter(r => r.status === 'processing').length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Tạo báo cáo mới</DialogTitle>
            <DialogDescription>Tạo báo cáo tùy chỉnh theo nhu cầu</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Tên báo cáo</Label>
              <Input
                value={newReport.name}
                onChange={(e) => setNewReport({ ...newReport, name: e.target.value })}
                placeholder="Nhập tên báo cáo"
              />
            </div>

            <div>
              <Label>Loại file</Label>
              <select
                className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm"
                value={newReport.type}
                onChange={(e) => setNewReport({ ...newReport, type: e.target.value as 'PDF' | 'Excel' })}
              >
                <option value="PDF">PDF</option>
                <option value="Excel">Excel</option>
              </select>
            </div>

            <div>
              <Label>Mô tả</Label>
              <Textarea
                value={newReport.description}
                onChange={(e) => setNewReport({ ...newReport, description: e.target.value })}
                placeholder="Mô tả nội dung báo cáo"
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Hủy
            </Button>
            <Button
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              onClick={handleCreateReport}
            >
              Tạo báo cáo
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Filter Dialog */}
      <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Lọc báo cáo</DialogTitle>
            <DialogDescription>Chọn loại báo cáo muốn xem</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Button
              variant={filterType === 'all' ? 'default' : 'outline'}
              className="w-full justify-start"
              onClick={() => {
                setFilterType('all');
                setShowFilterDialog(false);
              }}
            >
              Tất cả ({reports.length})
            </Button>
            <Button
              variant={filterType === 'PDF' ? 'default' : 'outline'}
              className="w-full justify-start"
              onClick={() => {
                setFilterType('PDF');
                setShowFilterDialog(false);
              }}
            >
              PDF ({reports.filter(r => r.type === 'PDF').length})
            </Button>
            <Button
              variant={filterType === 'Excel' ? 'default' : 'outline'}
              className="w-full justify-start"
              onClick={() => {
                setFilterType('Excel');
                setShowFilterDialog(false);
              }}
            >
              Excel ({reports.filter(r => r.type === 'Excel').length})
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Chi tiết báo cáo</DialogTitle>
            <DialogDescription>Thông tin chi tiết về báo cáo</DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="size-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="size-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{selectedReport.name}</h3>
                    <p className="text-sm text-gray-500">Báo cáo {selectedReport.type}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm pt-3 border-t">
                  <div>
                    <p className="text-gray-500">Ngày tạo</p>
                    <p className="font-medium">{selectedReport.date}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Kích thước</p>
                    <p className="font-medium">{selectedReport.size}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Trạng thái</p>
                    <p className="font-medium">
                      {selectedReport.status === 'ready' ? '✅ Sẵn sàng' : '🔄 Đang xử lý'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Loại file</p>
                    <p className="font-medium">{selectedReport.type}</p>
                  </div>
                </div>
              </div>

              {selectedReport.status === 'ready' && (
                <Button
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  onClick={() => handleDownload(selectedReport)}
                >
                  <Download className="size-4 mr-2" />
                  Tải xuống báo cáo
                </Button>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              Đóng
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
