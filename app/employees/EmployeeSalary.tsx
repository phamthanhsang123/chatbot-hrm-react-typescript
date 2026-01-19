'use client';

import { useState } from 'react';
import { DollarSign, Download, Eye, TrendingUp, Calendar } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

interface SalaryRecord {
  month: string;
  baseSalary: number;
  allowances: number;
  bonus: number;
  insurance: number;
  tax: number;
  netSalary: number;
  status: 'paid' | 'pending';
  paymentDate: string;
}

export function EmployeeSalary() {
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedSalary, setSelectedSalary] = useState<SalaryRecord | null>(null);

  const employeeInfo = {
    name: 'Nguyễn Văn B',
    employeeId: 'NV001',
    position: 'Developer',
    department: 'IT',
  };

  const salaryHistory: SalaryRecord[] = [
    {
      month: 'Tháng 12/2025',
      baseSalary: 15000000,
      allowances: 1000000,
      bonus: 2000000,
      insurance: 1200000,
      tax: 800000,
      netSalary: 16000000,
      status: 'paid',
      paymentDate: '05/01/2026',
    },
    {
      month: 'Tháng 11/2025',
      baseSalary: 15000000,
      allowances: 1000000,
      bonus: 1500000,
      insurance: 1200000,
      tax: 700000,
      netSalary: 15600000,
      status: 'paid',
      paymentDate: '05/12/2025',
    },
    {
      month: 'Tháng 10/2025',
      baseSalary: 15000000,
      allowances: 1000000,
      bonus: 1000000,
      insurance: 1200000,
      tax: 600000,
      netSalary: 15200000,
      status: 'paid',
      paymentDate: '05/11/2025',
    },
  ];

  const currentMonthSalary = {
    baseSalary: 15000000,
    expectedAllowances: 1000000,
    estimatedBonus: 2500000,
    estimatedNet: 16500000,
  };

  const yearSummary = {
    totalEarned: 187200000,
    totalInsurance: 14400000,
    totalTax: 8400000,
    averageBonus: 1500000,
  };

  const handleViewDetail = (salary: SalaryRecord) => {
    setSelectedSalary(salary);
    setShowDetailDialog(true);
  };

  const handleDownload = (month: string) => {
    alert(`📥 Đang tải phiếu lương ${month}...\n\nFile PDF sẽ được tải xuống.`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Lương của tôi</h1>
          <p className="text-gray-500 mt-1">Xem lịch sử lương và phiếu lương</p>
        </div>
      </div>

      {/* Current Month Preview */}
      <Card className="p-6 bg-gradient-to-br from-green-600 to-teal-600 text-white border-0 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="size-16 shrink-0 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <DollarSign className="size-8" />
            </div>
            <div>
              <p className="text-green-100 text-sm">Lương tháng hiện tại (dự kiến)</p>
              <h2 className="text-4xl font-bold mt-1">
                {currentMonthSalary.estimatedNet.toLocaleString('vi-VN')}đ
              </h2>
              <p className="text-green-100 text-sm mt-1">
                Cơ bản: {currentMonthSalary.baseSalary.toLocaleString('vi-VN')}đ + Thưởng dự kiến: {currentMonthSalary.estimatedBonus.toLocaleString('vi-VN')}đ
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Year Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="size-12 shrink-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-md">
              <DollarSign className="size-6" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Tổng thu nhập năm</p>
              <p className="text-xl font-bold text-gray-900">
                {yearSummary.totalEarned.toLocaleString('vi-VN')}đ
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="size-12 shrink-0 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-white shadow-md">
              <TrendingUp className="size-6" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Thưởng TB/tháng</p>
              <p className="text-xl font-bold text-gray-900">
                {yearSummary.averageBonus.toLocaleString('vi-VN')}đ
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="size-12 shrink-0 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-md">
              <DollarSign className="size-6" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Tổng BHXH</p>
              <p className="text-xl font-bold text-gray-900">
                {yearSummary.totalInsurance.toLocaleString('vi-VN')}đ
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="size-12 shrink-0 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center text-white shadow-md">
              <DollarSign className="size-6" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Tổng thuế</p>
              <p className="text-xl font-bold text-gray-900">
                {yearSummary.totalTax.toLocaleString('vi-VN')}đ
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Salary History */}
      <Card>
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Lịch sử lương</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {salaryHistory.map((salary, index) => (
              <Card key={index} className="p-6 hover:shadow-lg transition-shadow border-2">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4 text-gray-600" />
                    <h3 className="font-semibold text-gray-900">{salary.month}</h3>
                  </div>
                  <Badge variant="default" className="bg-green-600">
                    {salary.status === 'paid' ? '✓ Đã thanh toán' : '⏳ Chờ thanh toán'}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Lương cơ bản:</span>
                    <span className="font-medium">{salary.baseSalary.toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Phụ cấp:</span>
                    <span className="font-medium">{salary.allowances.toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Thưởng:</span>
                    <span className="font-medium text-green-600">+{salary.bonus.toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">BHXH:</span>
                    <span className="font-medium text-red-600">-{salary.insurance.toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Thuế:</span>
                    <span className="font-medium text-red-600">-{salary.tax.toLocaleString('vi-VN')}đ</span>
                  </div>
                  
                  <div className="border-t pt-2 flex justify-between">
                    <span className="font-semibold text-gray-900">Thực lãnh:</span>
                    <span className="font-bold text-xl text-green-600">
                      {salary.netSalary.toLocaleString('vi-VN')}đ
                    </span>
                  </div>

                  <div className="text-xs text-gray-500 pt-1">
                    Ngày thanh toán: {salary.paymentDate}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleViewDetail(salary)}
                  >
                    <Eye className="size-4 mr-1" />
                    Xem
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 bg-gradient-to-r from-green-600 to-teal-600"
                    onClick={() => handleDownload(salary.month)}
                  >
                    <Download className="size-4 mr-1" />
                    Tải
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Phiếu lương {selectedSalary?.month}</DialogTitle>
            <DialogDescription>Chi tiết bảng lương</DialogDescription>
          </DialogHeader>

          {selectedSalary && (
            <div className="space-y-4">
              {/* Employee Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Họ tên</p>
                  <p className="font-medium">{employeeInfo.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Mã NV</p>
                  <p className="font-medium">{employeeInfo.employeeId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Chức vụ</p>
                  <p className="font-medium">{employeeInfo.position}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phòng ban</p>
                  <p className="font-medium">{employeeInfo.department}</p>
                </div>
              </div>

              {/* Salary Details */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Lương cơ bản</span>
                  <span className="font-medium">{selectedSalary.baseSalary.toLocaleString('vi-VN')}đ</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Phụ cấp (ăn trưa, xăng xe...)</span>
                  <span className="font-medium">{selectedSalary.allowances.toLocaleString('vi-VN')}đ</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Thưởng (KPI, dự án...)</span>
                  <span className="font-medium text-green-600">+{selectedSalary.bonus.toLocaleString('vi-VN')}đ</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">BHXH (8%)</span>
                  <span className="font-medium text-red-600">-{selectedSalary.insurance.toLocaleString('vi-VN')}đ</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Thuế TNCN</span>
                  <span className="font-medium text-red-600">-{selectedSalary.tax.toLocaleString('vi-VN')}đ</span>
                </div>
                <div className="flex justify-between py-3 bg-green-50 px-3 rounded-lg">
                  <span className="font-bold text-gray-900">Thực lãnh</span>
                  <span className="font-bold text-2xl text-green-600">
                    {selectedSalary.netSalary.toLocaleString('vi-VN')}đ
                  </span>
                </div>
                <div className="text-xs text-gray-500 text-center pt-2">
                  Ngày thanh toán: {selectedSalary.paymentDate}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              Đóng
            </Button>
            <Button
              className="bg-gradient-to-r from-green-600 to-teal-600"
              onClick={() => selectedSalary && handleDownload(selectedSalary.month)}
            >
              <Download className="size-4 mr-2" />
              Tải PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
