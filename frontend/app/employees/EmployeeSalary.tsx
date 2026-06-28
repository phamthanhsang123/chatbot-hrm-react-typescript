'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Clock3, DollarSign, Download, Eye, ShieldCheck, Wallet } from 'lucide-react';
import Swal from 'sweetalert2';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { getCurrentEmployeeId } from '@/services/tasks';
import { HRM_SYNC_KEYS, getEmployeePortalIdentity, readSyncedRecords } from './hrmSync';

type SalaryStatus = 'pending' | 'calculated' | 'approved' | 'paid';

interface SalaryRecord {
  id: number;
  employeeId: string;
  name: string;
  department: string;
  position: string;
  month: string;
  baseSalary: number;
  mealAllowance: number;
  transportAllowance: number;
  phoneAllowance: number;
  housingAllowance: number;
  standardDays: number;
  workDays: number;
  overtimeHours: number;
  overtimeRate: number;
  kpiBonus: number;
  projectBonus: number;
  holidayBonus: number;
  socialInsurance: number;
  healthInsurance: number;
  unemploymentInsurance: number;
  personalIncomeTax: number;
  advancePayment: number;
  penalties: number;
  salaryDeduction?: number;
  status: SalaryStatus;
  calculatedDate?: string;
  approvedDate?: string;
  paidDate?: string;
}

const statusMeta: Record<SalaryStatus, { label: string; className: string }> = {
  pending: { label: 'Chưa tính', className: 'bg-slate-100 text-slate-700 hover:bg-slate-100' },
  calculated: { label: 'Chờ HR duyệt', className: 'bg-blue-100 text-blue-700 hover:bg-blue-100' },
  approved: { label: 'Chờ thanh toán', className: 'bg-amber-100 text-amber-700 hover:bg-amber-100' },
  paid: { label: 'Đã thanh toán', className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' },
};

function monthKey(offset: number) {
  const date = new Date();
  date.setMonth(date.getMonth() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonth(value: string) {
  const [year, month] = value.split('-');
  return `Tháng ${month}/${year}`;
}

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(`${value}T00:00:00`).toLocaleDateString('vi-VN');
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

function overtimePay(record: SalaryRecord) {
  const hourly = record.baseSalary / record.standardDays / 8;
  return Math.round(hourly * record.overtimeHours * record.overtimeRate);
}

function totalAllowances(record: SalaryRecord) {
  return record.mealAllowance + record.transportAllowance + record.phoneAllowance + record.housingAllowance;
}

function totalBonuses(record: SalaryRecord) {
  return record.kpiBonus + record.projectBonus + record.holidayBonus;
}

function totalIncome(record: SalaryRecord) {
  return record.baseSalary - (record.salaryDeduction || 0) + totalAllowances(record) + overtimePay(record) + totalBonuses(record);
}

function totalDeductions(record: SalaryRecord) {
  return record.socialInsurance + record.healthInsurance + record.unemploymentInsurance + record.personalIncomeTax + record.advancePayment + record.penalties;
}

function netSalary(record: SalaryRecord) {
  return Math.round(totalIncome(record) - totalDeductions(record));
}

function buildDemoSalaryRecords(employeeId: string, name: string, department: string): SalaryRecord[] {
  return [
    {
      id: 1,
      employeeId,
      name,
      department,
      position: 'Developer',
      month: monthKey(0),
      baseSalary: 15000000,
      mealAllowance: 730000,
      transportAllowance: 400000,
      phoneAllowance: 200000,
      housingAllowance: 0,
      standardDays: 22,
      workDays: 21,
      overtimeHours: 6,
      overtimeRate: 1.5,
      kpiBonus: 1500000,
      projectBonus: 1000000,
      holidayBonus: 0,
      socialInsurance: 1200000,
      healthInsurance: 225000,
      unemploymentInsurance: 150000,
      personalIncomeTax: 620000,
      advancePayment: 0,
      penalties: 0,
      status: 'calculated',
      calculatedDate: `${monthKey(0)}-24`,
    },
    {
      id: 2,
      employeeId,
      name,
      department,
      position: 'Developer',
      month: monthKey(-1),
      baseSalary: 15000000,
      mealAllowance: 730000,
      transportAllowance: 400000,
      phoneAllowance: 200000,
      housingAllowance: 0,
      standardDays: 22,
      workDays: 22,
      overtimeHours: 8,
      overtimeRate: 1.5,
      kpiBonus: 2000000,
      projectBonus: 500000,
      holidayBonus: 0,
      socialInsurance: 1200000,
      healthInsurance: 225000,
      unemploymentInsurance: 150000,
      personalIncomeTax: 760000,
      advancePayment: 0,
      penalties: 0,
      status: 'paid',
      calculatedDate: `${monthKey(-1)}-24`,
      approvedDate: `${monthKey(-1)}-26`,
      paidDate: `${monthKey(0)}-05`,
    },
    {
      id: 3,
      employeeId,
      name,
      department,
      position: 'Developer',
      month: monthKey(-2),
      baseSalary: 15000000,
      mealAllowance: 730000,
      transportAllowance: 400000,
      phoneAllowance: 200000,
      housingAllowance: 0,
      standardDays: 22,
      workDays: 20,
      overtimeHours: 2,
      overtimeRate: 1.5,
      kpiBonus: 1000000,
      projectBonus: 0,
      holidayBonus: 0,
      socialInsurance: 1200000,
      healthInsurance: 225000,
      unemploymentInsurance: 150000,
      personalIncomeTax: 480000,
      advancePayment: 0,
      penalties: 0,
      salaryDeduction: 680000,
      status: 'paid',
      calculatedDate: `${monthKey(-2)}-24`,
      approvedDate: `${monthKey(-2)}-26`,
      paidDate: `${monthKey(-1)}-05`,
    },
  ];
}

export function EmployeeSalary() {
  const employeeIdentity = useMemo(() => getEmployeePortalIdentity(getCurrentEmployeeId()), []);
  const [records] = useState<SalaryRecord[]>(() => {
    const demo = buildDemoSalaryRecords(employeeIdentity.employeeId, employeeIdentity.employeeName, employeeIdentity.department);
    const synced = readSyncedRecords<SalaryRecord>(HRM_SYNC_KEYS.salaryRecords).filter(
      (record) => record.employeeId === employeeIdentity.employeeId,
    );
    if (synced.length === 0) return demo;
    const months = new Set(synced.map((record) => record.month));
    return [...synced, ...demo.filter((record) => !months.has(record.month))];
  });
  const [selectedMonth, setSelectedMonth] = useState(monthKey(0));
  const [selectedSalary, setSelectedSalary] = useState<SalaryRecord | null>(null);

  const currentRecord = records.find((record) => record.month === selectedMonth) || records[0];
  const paidRecords = records.filter((record) => record.status === 'paid');
  const yearSummary = {
    totalNet: paidRecords.reduce((sum, record) => sum + netSalary(record), 0),
    totalInsurance: paidRecords.reduce(
      (sum, record) => sum + record.socialInsurance + record.healthInsurance + record.unemploymentInsurance,
      0,
    ),
    totalTax: paidRecords.reduce((sum, record) => sum + record.personalIncomeTax, 0),
    overtimeHours: records.reduce((sum, record) => sum + record.overtimeHours, 0),
  };

  const handleDownload = (record: SalaryRecord) => {
    if (record.status !== 'paid' && record.status !== 'approved') {
      void Swal.fire({
        icon: 'warning',
        title: 'Phiếu lương chưa được chốt',
        text: 'HR cần duyệt bảng lương trước khi nhân viên tải phiếu lương chính thức.',
        confirmButtonText: 'Đã hiểu',
        confirmButtonColor: '#2563eb',
      });
      return;
    }

    void Swal.fire({
      icon: 'info',
      title: 'Đang chuẩn bị phiếu lương',
      text: `Phiếu lương ${formatMonth(record.month)} đang được chuẩn bị dưới dạng PDF.`,
      confirmButtonText: 'Đã hiểu',
      confirmButtonColor: '#2563eb',
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Lương của tôi</h1>
          <p className="mt-1 text-sm text-slate-500">Theo dõi bảng lương đã tính, duyệt và thanh toán từ HR.</p>
        </div>
        <select
          value={selectedMonth}
          onChange={(event) => setSelectedMonth(event.target.value)}
          className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
          aria-label="Chọn tháng lương"
        >
          {records.map((record) => <option key={record.month} value={record.month}>{formatMonth(record.month)}</option>)}
        </select>
      </div>

      <section className="rounded-lg bg-slate-950 p-6 text-white shadow-sm">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-slate-300">Thực lãnh {formatMonth(currentRecord.month)}</p>
              <Badge className={statusMeta[currentRecord.status].className}>{statusMeta[currentRecord.status].label}</Badge>
            </div>
            <p className="mt-2 text-3xl font-bold">{formatCurrency(netSalary(currentRecord))}</p>
            <p className="mt-2 text-sm text-slate-300">
              {currentRecord.workDays}/{currentRecord.standardDays} ngày công · {currentRecord.overtimeHours} giờ OT
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setSelectedSalary(currentRecord)}>
              <Eye className="mr-2 size-4" />
              Chi tiết
            </Button>
            <Button variant="secondary" onClick={() => handleDownload(currentRecord)}>
              <Download className="mr-2 size-4" />
              Phiếu lương
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SalaryMetric icon={<Wallet className="size-5" />} label="Đã nhận" value={formatCurrency(yearSummary.totalNet)} tone="emerald" />
        <SalaryMetric icon={<ShieldCheck className="size-5" />} label="Bảo hiểm" value={formatCurrency(yearSummary.totalInsurance)} tone="blue" />
        <SalaryMetric icon={<DollarSign className="size-5" />} label="Thuế TNCN" value={formatCurrency(yearSummary.totalTax)} tone="red" />
        <SalaryMetric icon={<Clock3 className="size-5" />} label="Giờ làm thêm" value={`${yearSummary.overtimeHours}h`} tone="amber" />
      </div>

      <Card className="overflow-hidden rounded-lg shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-950">Lịch sử bảng lương</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {records.map((record) => (
            <div key={record.month} className="grid gap-4 px-5 py-4 hover:bg-slate-50 md:grid-cols-[1.2fr_1fr_1fr_auto] md:items-center">
              <div>
                <p className="font-semibold text-slate-950">{formatMonth(record.month)}</p>
                <p className="mt-1 text-xs text-slate-500">{record.workDays}/{record.standardDays} ngày công</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Thực lãnh</p>
                <p className="mt-1 font-semibold text-emerald-700">{formatCurrency(netSalary(record))}</p>
              </div>
              <div>
                <Badge className={statusMeta[record.status].className}>{statusMeta[record.status].label}</Badge>
                <p className="mt-1 text-xs text-slate-500">
                  {record.paidDate ? `Trả ngày ${formatDate(record.paidDate)}` : record.approvedDate ? `Duyệt ngày ${formatDate(record.approvedDate)}` : `Tính ngày ${formatDate(record.calculatedDate)}`}
                </p>
              </div>
              <div className="flex gap-2 md:justify-end">
                <Button variant="outline" size="sm" onClick={() => setSelectedSalary(record)}>
                  <Eye className="mr-1.5 size-4" />
                  Xem
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDownload(record)} title="Tải phiếu lương">
                  <Download className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Dialog open={Boolean(selectedSalary)} onOpenChange={(open) => !open && setSelectedSalary(null)}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Phiếu lương {selectedSalary ? formatMonth(selectedSalary.month) : ''}</DialogTitle>
            <DialogDescription>Chi tiết được tính theo cùng công thức với bảng lương HR.</DialogDescription>
          </DialogHeader>

          {selectedSalary && (
            <div className="space-y-5">
              <div className="grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-2">
                <SalaryInfo label="Nhân viên" value={`${selectedSalary.name} (${selectedSalary.employeeId})`} />
                <SalaryInfo label="Phòng ban" value={`${selectedSalary.department} · ${selectedSalary.position}`} />
                <SalaryInfo label="Ngày công" value={`${selectedSalary.workDays}/${selectedSalary.standardDays} ngày`} />
                <SalaryInfo label="Trạng thái" value={statusMeta[selectedSalary.status].label} />
              </div>

              <SalaryBreakdown title="Thu nhập">
                <SalaryRow label="Lương cơ bản" value={formatCurrency(selectedSalary.baseSalary)} />
                <SalaryRow label="Phụ cấp" value={formatCurrency(totalAllowances(selectedSalary))} />
                <SalaryRow label={`Làm thêm (${selectedSalary.overtimeHours}h × ${selectedSalary.overtimeRate})`} value={formatCurrency(overtimePay(selectedSalary))} />
                <SalaryRow label="Thưởng" value={formatCurrency(totalBonuses(selectedSalary))} />
                {(selectedSalary.salaryDeduction || 0) > 0 && <SalaryRow label="Trừ lương do nghỉ/vi phạm" value={`-${formatCurrency(selectedSalary.salaryDeduction || 0)}`} danger />}
              </SalaryBreakdown>

              <SalaryBreakdown title="Khấu trừ">
                <SalaryRow label="BHXH, BHYT, BHTN" value={`-${formatCurrency(selectedSalary.socialInsurance + selectedSalary.healthInsurance + selectedSalary.unemploymentInsurance)}`} danger />
                <SalaryRow label="Thuế TNCN" value={`-${formatCurrency(selectedSalary.personalIncomeTax)}`} danger />
                {(selectedSalary.advancePayment + selectedSalary.penalties) > 0 && <SalaryRow label="Tạm ứng và khoản phạt" value={`-${formatCurrency(selectedSalary.advancePayment + selectedSalary.penalties)}`} danger />}
              </SalaryBreakdown>

              <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-3">
                <span className="font-semibold text-slate-900">Thực lãnh</span>
                <span className="text-xl font-bold text-emerald-700">{formatCurrency(netSalary(selectedSalary))}</span>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleDownload(selectedSalary)}>
                  <Download className="mr-2 size-4" />
                  Tải phiếu lương
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SalaryMetric({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone: 'emerald' | 'blue' | 'red' | 'amber' }) {
  const toneClass = {
    emerald: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-blue-50 text-blue-700',
    red: 'bg-red-50 text-red-700',
    amber: 'bg-amber-50 text-amber-700',
  }[tone];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className={`flex size-9 items-center justify-center rounded-md ${toneClass}`}>{icon}</div>
      <p className="mt-3 text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-950">{value}</p>
    </div>
  );
}

function SalaryInfo({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-sm font-medium text-slate-950">{value}</p></div>;
}

function SalaryBreakdown({ title, children }: { title: string; children: ReactNode }) {
  return <section><h3 className="mb-2 text-sm font-semibold text-slate-950">{title}</h3><div className="divide-y divide-slate-100 rounded-lg border border-slate-200 px-4">{children}</div></section>;
}

function SalaryRow({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return <div className="flex items-center justify-between gap-4 py-3 text-sm"><span className="text-slate-600">{label}</span><span className={danger ? 'font-semibold text-red-600' : 'font-semibold text-slate-950'}>{value}</span></div>;
}
