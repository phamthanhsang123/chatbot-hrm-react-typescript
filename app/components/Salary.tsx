import { DollarSign, TrendingUp, Users, Download, Calculator, Eye } from "lucide-react";
import { useMemo, useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";

type SalaryStatus = "pending" | "calculated" | "approved" | "paid";

interface SalaryItem {
    id: number;
    employeeId: string;
    name: string;
    department: string;
    position: string;
    month: string; // YYYY-MM

    // Lương cơ bản
    baseSalary: number;

    // Phụ cấp
    mealAllowance: number;
    transportAllowance: number;
    phoneAllowance: number;
    housingAllowance: number;

    // Làm thêm
    standardDays: number; // mặc định 22
    workDays: number; // số ngày công thực tế
    overtimeHours: number;
    overtimeRate: number; // 1.5, 2.0, 3.0

    // Thưởng
    kpiBonus: number;
    projectBonus: number;
    holidayBonus: number;

    // Các khoản trừ
    socialInsurance: number; // BHXH
    healthInsurance: number; // BHYT
    unemploymentInsurance: number; // BHTN
    personalIncomeTax: number; // Thuế TNCN
    advancePayment: number; // Tạm ứng
    penalties: number; // Phạt

    // Trừ lương do nghỉ/vi phạm (nếu có)
    salaryDeduction?: number; // ví dụ nghỉ không phép trừ lương theo ngày

    // Workflow
    status: SalaryStatus;
    calculatedDate?: string;
    approvedDate?: string;
    paidDate?: string;
}

export function Salary() {
    const todayISO = () => new Date().toISOString().slice(0, 10);

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

    const calcOvertimePay = (item: SalaryItem) => {
        const hourly = item.baseSalary / item.standardDays / 8;
        return Math.round(hourly * item.overtimeHours * item.overtimeRate);
    };

    const calcAllowances = (item: SalaryItem) =>
        item.mealAllowance + item.transportAllowance + item.phoneAllowance + item.housingAllowance;

    const calcBonuses = (item: SalaryItem) =>
        item.kpiBonus + item.projectBonus + item.holidayBonus;

    const calcTotalIncome = (item: SalaryItem) => {
        const overtimePay = calcOvertimePay(item);
        const allowances = calcAllowances(item);
        const bonuses = calcBonuses(item);
        const salaryDeduction = item.salaryDeduction ?? 0;

        // Thu nhập = Lương cơ bản - trừ lương (nghỉ/vi phạm) + phụ cấp + OT + thưởng
        return Math.round(item.baseSalary - salaryDeduction + allowances + overtimePay + bonuses);
    };

    const calcTotalDeduction = (item: SalaryItem) =>
        Math.round(
            item.socialInsurance +
            item.healthInsurance +
            item.unemploymentInsurance +
            item.personalIncomeTax +
            item.advancePayment +
            item.penalties
        );

    const calcNet = (item: SalaryItem) => Math.round(calcTotalIncome(item) - calcTotalDeduction(item));

    const getStatusBadge = (status: SalaryStatus) => {
        switch (status) {
            case "pending":
                return <Badge className="bg-gray-100 text-gray-700">⏳ Chưa tính</Badge>;
            case "calculated":
                return <Badge className="bg-blue-100 text-blue-700">🧮 Chờ duyệt</Badge>;
            case "approved":
                return <Badge className="bg-orange-100 text-orange-700">✅ Chờ thanh toán</Badge>;
            case "paid":
                return <Badge className="bg-green-100 text-green-700">💰 Đã thanh toán</Badge>;
            default:
                return <Badge>-</Badge>;
        }
    };

    const [selectedMonth, setSelectedMonth] = useState("2026-01");
    const [filterStatus, setFilterStatus] = useState<"all" | SalaryStatus>("all");

    const [showCalculateDialog, setShowCalculateDialog] = useState(false);
    const [showDetailDialog, setShowDetailDialog] = useState(false);
    const [showApproveDialog, setShowApproveDialog] = useState(false);

    const [selectedEmployee, setSelectedEmployee] = useState<SalaryItem | null>(null);

    const [salaryData, setSalaryData] = useState<SalaryItem[]>([
        {
            id: 1,
            employeeId: "NV001",
            name: "Nguyễn Văn A",
            department: "IT",
            position: "Senior Developer",
            month: "2026-01",
            baseSalary: 20000000,
            mealAllowance: 1000000,
            transportAllowance: 500000,
            phoneAllowance: 300000,
            housingAllowance: 2000000,
            standardDays: 22,
            workDays: 22,
            overtimeHours: 20,
            overtimeRate: 1.5,
            kpiBonus: 3000000,
            projectBonus: 2000000,
            holidayBonus: 0,
            socialInsurance: 1600000,
            healthInsurance: 300000,
            unemploymentInsurance: 200000,
            personalIncomeTax: 2500000,
            advancePayment: 5000000,
            penalties: 0,
            status: "paid",
            calculatedDate: "2026-01-25",
            approvedDate: "2026-01-26",
            paidDate: "2026-01-28",
        },
        {
            id: 2,
            employeeId: "NV002",
            name: "Trần Thị B",
            department: "HR",
            position: "HR Manager",
            month: "2026-01",
            baseSalary: 25000000,
            mealAllowance: 1000000,
            transportAllowance: 500000,
            phoneAllowance: 500000,
            housingAllowance: 3000000,
            standardDays: 22,
            workDays: 22,
            overtimeHours: 10,
            overtimeRate: 1.5,
            kpiBonus: 4000000,
            projectBonus: 0,
            holidayBonus: 0,
            socialInsurance: 2000000,
            healthInsurance: 375000,
            unemploymentInsurance: 250000,
            personalIncomeTax: 3800000,
            advancePayment: 10000000,
            penalties: 0,
            status: "approved",
            calculatedDate: "2026-01-25",
            approvedDate: "2026-01-26",
        },
        {
            id: 3,
            employeeId: "NV003",
            name: "Lê Văn C",
            department: "IT",
            position: "Team Lead",
            month: "2026-01",
            baseSalary: 30000000,
            mealAllowance: 1000000,
            transportAllowance: 800000,
            phoneAllowance: 500000,
            housingAllowance: 3000000,
            standardDays: 22,
            workDays: 22,
            overtimeHours: 15,
            overtimeRate: 1.5,
            kpiBonus: 5000000,
            projectBonus: 3000000,
            holidayBonus: 0,
            socialInsurance: 2400000,
            healthInsurance: 450000,
            unemploymentInsurance: 300000,
            personalIncomeTax: 5200000,
            advancePayment: 8000000,
            penalties: 0,
            status: "calculated",
            calculatedDate: "2026-01-25",
        },
        {
            id: 4,
            employeeId: "NV004",
            name: "Phạm Thị D",
            department: "Marketing",
            position: "Marketing Executive",
            month: "2026-01",
            baseSalary: 12000000,
            mealAllowance: 800000,
            transportAllowance: 500000,
            phoneAllowance: 300000,
            housingAllowance: 0,
            standardDays: 22,
            workDays: 20,
            overtimeHours: 0,
            overtimeRate: 1.5,
            kpiBonus: 1500000,
            projectBonus: 1000000,
            holidayBonus: 0,
            socialInsurance: 960000,
            healthInsurance: 180000,
            unemploymentInsurance: 120000,
            personalIncomeTax: 800000,
            advancePayment: 3000000,
            penalties: 500000,
            // trừ lương do nghỉ không phép (bạn có thể chỉnh công thức/giá trị tùy nghiệp vụ)
            salaryDeduction: 500000,
            status: "calculated",
            calculatedDate: "2026-01-25",
        },
        {
            id: 5,
            employeeId: "NV005",
            name: "Hoàng Văn E",
            department: "Sales",
            position: "Sales Manager",
            month: "2026-01",
            baseSalary: 18000000,
            mealAllowance: 1000000,
            transportAllowance: 1000000,
            phoneAllowance: 500000,
            housingAllowance: 2000000,
            standardDays: 22,
            workDays: 22,
            overtimeHours: 25,
            overtimeRate: 1.5,
            kpiBonus: 6000000,
            projectBonus: 0,
            holidayBonus: 0,
            socialInsurance: 1440000,
            healthInsurance: 270000,
            unemploymentInsurance: 180000,
            personalIncomeTax: 3500000,
            advancePayment: 5000000,
            penalties: 0,
            status: "pending",
        },
        {
            id: 6,
            employeeId: "NV006",
            name: "Vũ Thị F",
            department: "Finance",
            position: "Accountant",
            month: "2026-01",
            baseSalary: 15000000,
            mealAllowance: 800000,
            transportAllowance: 500000,
            phoneAllowance: 300000,
            housingAllowance: 1500000,
            standardDays: 22,
            workDays: 22,
            overtimeHours: 8,
            overtimeRate: 1.5,
            kpiBonus: 2000000,
            projectBonus: 0,
            holidayBonus: 0,
            socialInsurance: 1200000,
            healthInsurance: 225000,
            unemploymentInsurance: 150000,
            personalIncomeTax: 1800000,
            advancePayment: 3000000,
            penalties: 0,
            status: "pending",
        },
    ]);

    const monthData = useMemo(
        () => salaryData.filter((x) => x.month === selectedMonth),
        [salaryData, selectedMonth]
    );

    const filteredData = useMemo(() => {
        const base = monthData;
        if (filterStatus === "all") return base;
        return base.filter((x) => x.status === filterStatus);
    }, [monthData, filterStatus]);

    const stats = useMemo(() => {
        const list = monthData;
        const totalNet = list.reduce((sum, x) => sum + calcNet(x), 0);
        const avgNet = list.length ? totalNet / list.length : 0;
        const totalBonus = list.reduce((sum, x) => sum + calcBonuses(x), 0);
        const needProcessCount = list.filter((x) => x.status !== "paid").length;

        return {
            totalNet,
            avgNet,
            totalBonus,
            needProcessCount,
            employeeCount: list.length,
        };
    }, [monthData]);

    const handleViewDetail = (employee: SalaryItem) => {
        setSelectedEmployee(employee);
        setShowDetailDialog(true);
    };

    const handleExportReport = () => {
        const totalNet = filteredData.reduce((sum, x) => sum + calcNet(x), 0);
        const avgNet = filteredData.length ? totalNet / filteredData.length : 0;

        alert(
            `Đang xuất báo cáo lương tháng ${selectedMonth}...\n\n` +
            `Tổng: ${filteredData.length} nhân viên\n` +
            `Tổng chi (Net): ${formatCurrency(totalNet)}\n` +
            `Lương TB (Net): ${formatCurrency(avgNet)}`
        );
    };

    const handleCalculateSalary = () => setShowCalculateDialog(true);

    const handleConfirmCalculate = () => {
        // Chỉ chuyển những nhân viên status pending của tháng đang chọn sang calculated
        const pendingInMonth = monthData.filter((x) => x.status === "pending");
        setSalaryData((prev) =>
            prev.map((x) => {
                if (x.month !== selectedMonth) return x;
                if (x.status !== "pending") return x;
                return { ...x, status: "calculated", calculatedDate: todayISO() };
            })
        );

        const totalNetAfter = monthData.reduce((sum, x) => sum + calcNet(x), 0);

        alert(
            `✅ Đã tính lương thành công!\n\n` +
            `Tháng: ${selectedMonth}\n` +
            `Số lượng: ${pendingInMonth.length} nhân viên\n` +
            `Tổng chi (Net): ${formatCurrency(totalNetAfter)}`
        );

        setShowCalculateDialog(false);
    };

    const handleApproveSalary = (employee: SalaryItem) => {
        setSelectedEmployee(employee);
        setShowApproveDialog(true);
    };

    const handleConfirmApprove = () => {
        if (!selectedEmployee) return;

        setSalaryData((prev) =>
            prev.map((x) => {
                if (x.id !== selectedEmployee.id) return x;
                if (x.status !== "calculated") return x;
                return { ...x, status: "approved", approvedDate: todayISO() };
            })
        );

        alert(
            `✅ Đã duyệt lương cho ${selectedEmployee.name}!\n\n` +
            `Số tiền (Net): ${formatCurrency(calcNet(selectedEmployee))}\n` +
            `Trạng thái: Chờ thanh toán`
        );

        setShowApproveDialog(false);
    };

    const handlePaySalary = (employee: SalaryItem) => {
        if (
            !confirm(
                `Xác nhận thanh toán lương cho ${employee.name}?\n\nSố tiền (Net): ${formatCurrency(
                    calcNet(employee)
                )}`
            )
        )
            return;

        setSalaryData((prev) =>
            prev.map((x) => {
                if (x.id !== employee.id) return x;
                if (x.status !== "approved") return x;
                return { ...x, status: "paid", paidDate: todayISO() };
            })
        );

        alert(
            `✅ Đã thanh toán lương cho ${employee.name}!\n\n` +
            `Số tiền (Net): ${formatCurrency(calcNet(employee))}\n` +
            `Trạng thái: Đã thanh toán`
        );
    };

    const handleSendPayslip = (employee: SalaryItem) => {
        alert(
            `📧 Đang gửi phiếu lương qua email...\n\n` +
            `Nhân viên: ${employee.name}\n` +
            `Email: ${employee.employeeId}@company.com\n` +
            `Tháng: ${employee.month}`
        );
    };

    return (
        <div className="space-y-5 text-[13px]">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Quản lý lương thưởng</h1>
                    <p className="text-gray-500 mt-1">Theo dõi và quản lý lương thưởng nhân viên</p>
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleExportReport}>
                        <Download className="size-4 mr-2" />
                        Xuất báo cáo
                    </Button>

                    <Button
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                        onClick={handleCalculateSalary}
                    >
                        <Calculator className="size-4 mr-2" />
                        Tính lương tháng mới
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-6 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-lg">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-emerald-100 text-sm">Tổng chi (Net) tháng này</p>
                            <p className="text-2xl font-bold mt-2">{formatCurrency(stats.totalNet)}</p>
                            <p className="text-sm text-emerald-100 mt-1">{stats.employeeCount} nhân viên</p>
                        </div>
                        <div className="size-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                            <DollarSign className="size-6" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-blue-100 text-sm">Lương trung bình (Net)</p>
                            <p className="text-2xl font-bold mt-2">{formatCurrency(stats.avgNet)}</p>
                            <p className="text-sm text-blue-100 mt-1">Theo tháng {selectedMonth}</p>
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
                            <p className="text-2xl font-bold mt-2">{formatCurrency(stats.totalBonus)}</p>
                            <p className="text-sm text-purple-100 mt-1">KPI + Dự án + Lễ tết</p>
                        </div>
                        <div className="size-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                            💰
                        </div>
                    </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-lg">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-orange-100 text-sm">Cần xử lý</p>
                            <p className="text-2xl font-bold mt-2">{stats.needProcessCount}</p>
                            <p className="text-sm text-orange-100 mt-1">Chưa "Đã thanh toán"</p>
                        </div>
                        <div className="size-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                            <Users className="size-6" />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Filters - Moved above table */}
            <Card className="p-4">
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                    <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                        <div className="flex items-center gap-2">
                            <Label className="text-sm text-gray-600 min-w-[60px]">Tháng:</Label>
                            <Input
                                className="w-[140px]"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                placeholder="YYYY-MM"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <Label className="text-sm text-gray-600 min-w-[70px]">Trạng thái:</Label>
                            <select
                                className="h-10 rounded-md border border-gray-200 px-3 text-sm min-w-[180px]"
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value as any)}
                            >
                                <option value="all">Tất cả</option>
                                <option value="pending">⏳ Chưa tính</option>
                                <option value="calculated">🧮 Chờ duyệt</option>
                                <option value="approved">✅ Chờ thanh toán</option>
                                <option value="paid">💰 Đã thanh toán</option>
                            </select>
                        </div>
                    </div>

                    <div className="text-sm text-gray-600">
                        Hiển thị: <span className="font-semibold text-gray-900">{filteredData.length}</span> / {monthData.length} nhân viên
                    </div>
                </div>
            </Card>

            {/* Salary Table */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                                    ID
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                                    Nhân viên
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                                    Phòng ban
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                                    Lương cơ bản
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                                    Thưởng
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                                    Tổng thu nhập
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                                    Thực nhận (Net)
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                                    Trạng thái
                                </th>
                                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">
                                    Hành động
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-200">
                            {filteredData.map((item) => {
                                const totalIncome = calcTotalIncome(item);
                                const net = calcNet(item);
                                const bonuses = calcBonuses(item);

                                return (
                                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-2 text-sm font-medium text-gray-900">{item.id}</td>

                                        <td className="px-4 py-2">
                                            <div className="flex items-center gap-3">
                                                <div className="size-10 shrink-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold">
                                                    {item.name.charAt(0)}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium">{item.name}</span>
                                                    <span className="text-xs text-gray-500">
                                                        {item.employeeId} • {item.position}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-4 py-2 text-sm text-gray-700">{item.department}</td>

                                        <td className="px-4 py-2 text-sm text-gray-900">
                                            {formatCurrency(item.baseSalary)}
                                        </td>

                                        <td className="px-4 py-2 text-sm text-green-600 font-medium">
                                            +{formatCurrency(bonuses)}
                                        </td>

                                        <td className="px-4 py-2 text-sm font-bold text-gray-900">
                                            {formatCurrency(totalIncome)}
                                        </td>

                                        <td className="px-4 py-2 text-sm font-bold text-emerald-700">
                                            {formatCurrency(net)}
                                        </td>

                                        <td className="px-4 py-2">{getStatusBadge(item.status)}</td>

                                        <td className="px-4 py-2">
                                            <div className="flex justify-end gap-2">


                                                {item.status === "calculated" && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-green-600 hover:bg-green-50"
                                                        onClick={() => handleApproveSalary(item)}
                                                    >
                                                        Duyệt
                                                    </Button>
                                                )}


                                                {item.status === "approved" && (
                                                    <Button size="sm" variant="outline" onClick={() => handlePaySalary(item)}>
                                                        Thanh toán
                                                    </Button>
                                                )}



                                                {item.status === "paid" && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleSendPayslip(item)}
                                                    >
                                                        Gửi phiếu lương
                                                    </Button>
                                                )}

                                                <Button size="sm" variant="outline" onClick={() => handleViewDetail(item)}>
                                                    <Eye className="size-3 mr-1" />
                                                    Chi tiết
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}

                            {filteredData.length === 0 && (
                                <tr>
                                    <td className="px-6 py-10 text-center text-sm text-gray-500" colSpan={9}>
                                        Không có dữ liệu cho bộ lọc hiện tại.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Calculate Salary Dialog */}
            <Dialog open={showCalculateDialog} onOpenChange={setShowCalculateDialog}>
                <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle>Tính lương tháng mới</DialogTitle>
                        <DialogDescription>
                            Bạn có chắc chắn muốn tính lương cho tháng <b>{selectedMonth}</b> không?
                            <br />
                            Hệ thống sẽ chuyển trạng thái từ <b>⏳ Chưa tính</b> → <b>🧮 Chờ duyệt</b>.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setShowCalculateDialog(false)}>
                            Hủy bỏ
                        </Button>
                        <Button
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                            onClick={handleConfirmCalculate}
                        >
                            Tính lương
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Detail Dialog */}
            <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
                <DialogContent className="sm:max-w-[720px] max-h-[85vh] overflow-y-auto">
                    <DialogHeader className="border-b pb-4">
                        <DialogTitle className="text-xl font-bold">Chi tiết lương</DialogTitle>
                        <DialogDescription>Tổng quan thu nhập & khấu trừ nhân viên</DialogDescription>
                    </DialogHeader>

                    {selectedEmployee && (
                        <div className="space-y-5">
                            {/* Employee info */}
                            <div className="rounded-lg border p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-sm font-semibold text-gray-900">
                                            {selectedEmployee.name} ({selectedEmployee.employeeId})
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {selectedEmployee.position} • {selectedEmployee.department} • Tháng{" "}
                                            {selectedEmployee.month}
                                        </div>
                                    </div>
                                    {getStatusBadge(selectedEmployee.status)}
                                </div>

                                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                                    <div>
                                        <div className="text-xs text-gray-500">Ngày công</div>
                                        <div className="font-medium">
                                            {selectedEmployee.workDays}/{selectedEmployee.standardDays} ngày
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-500">OT</div>
                                        <div className="font-medium">
                                            {selectedEmployee.overtimeHours}h × {selectedEmployee.overtimeRate}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-500">Thực nhận</div>
                                        <div className="text-lg font-bold text-emerald-700">
                                            {formatCurrency(calcNet(selectedEmployee))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Income */}
                            <div className="rounded-xl border bg-gray-50 p-5">
                                <div className="text-sm font-semibold text-gray-900 mb-3">✅ Thu nhập</div>
                                <div className="space-y-2 text-sm">
                                    <Row label="Lương cơ bản" value={formatCurrency(selectedEmployee.baseSalary)} />
                                    {(selectedEmployee.salaryDeduction ?? 0) > 0 && (
                                        <Row
                                            label="Trừ lương (nghỉ/vi phạm)"
                                            value={`-${formatCurrency(selectedEmployee.salaryDeduction ?? 0)}`}
                                            valueClass="text-red-600 font-medium"
                                        />
                                    )}
                                    <Row
                                        label="Phụ cấp (ăn + xăng + phone + nhà)"
                                        value={formatCurrency(calcAllowances(selectedEmployee))}
                                    />
                                    <Row
                                        label="Lương làm thêm (OT)"
                                        value={formatCurrency(calcOvertimePay(selectedEmployee))}
                                    />
                                    <Row
                                        label="Thưởng (KPI + dự án + lễ tết)"
                                        value={formatCurrency(calcBonuses(selectedEmployee))}
                                    />
                                    <div className="pt-2 border-t">
                                        <Row
                                            label="TỔNG THU NHẬP"
                                            value={formatCurrency(calcTotalIncome(selectedEmployee))}
                                            valueClass="font-bold"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Deduction */}
                            <div className="rounded-lg border p-4">
                                <div className="text-sm font-semibold text-gray-900 mb-3">❌ Khấu trừ</div>
                                <div className="space-y-2 text-sm">
                                    <Row
                                        label="BHXH"
                                        value={`-${formatCurrency(selectedEmployee.socialInsurance)}`}
                                        valueClass="text-red-600 font-medium"
                                    />
                                    <Row
                                        label="BHYT"
                                        value={`-${formatCurrency(selectedEmployee.healthInsurance)}`}
                                        valueClass="text-red-600 font-medium"
                                    />
                                    <Row
                                        label="BHTN"
                                        value={`-${formatCurrency(selectedEmployee.unemploymentInsurance)}`}
                                        valueClass="text-red-600 font-medium"
                                    />
                                    <Row
                                        label="Thuế TNCN"
                                        value={`-${formatCurrency(selectedEmployee.personalIncomeTax)}`}
                                        valueClass="text-red-600 font-medium"
                                    />
                                    <Row
                                        label="Tạm ứng"
                                        value={`-${formatCurrency(selectedEmployee.advancePayment)}`}
                                        valueClass="text-red-600 font-medium"
                                    />
                                    <Row
                                        label="Phạt"
                                        value={`-${formatCurrency(selectedEmployee.penalties)}`}
                                        valueClass="text-red-600 font-medium"
                                    />
                                    <div className="pt-2 border-t">
                                        <Row
                                            label="TỔNG KHẤU TRỪ"
                                            value={`-${formatCurrency(calcTotalDeduction(selectedEmployee))}`}
                                            valueClass="font-bold text-red-700"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Dates */}
                            <div className="rounded-lg border p-4">
                                <div className="text-sm font-semibold text-gray-900 mb-3">🗓️ Mốc thời gian</div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                                    <div>
                                        <div className="text-xs text-gray-500">Ngày tính</div>
                                        <div className="font-medium">{selectedEmployee.calculatedDate ?? "-"}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-500">Ngày duyệt</div>
                                        <div className="font-medium">{selectedEmployee.approvedDate ?? "-"}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-500">Ngày thanh toán</div>
                                        <div className="font-medium">{selectedEmployee.paidDate ?? "-"}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
                            Đóng
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Approve Dialog */}
            <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
                <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle>Duyệt lương</DialogTitle>
                        <DialogDescription>
                            Xác nhận duyệt lương (🧮 Chờ duyệt → ✅ Chờ thanh toán)
                        </DialogDescription>
                    </DialogHeader>

                    {selectedEmployee && (
                        <div className="space-y-3 rounded-lg border p-4 text-sm">
                            <div className="font-semibold text-gray-900">
                                {selectedEmployee.name} ({selectedEmployee.employeeId})
                            </div>
                            <Row label="Phòng ban" value={selectedEmployee.department} />
                            <Row label="Tháng" value={selectedEmployee.month} />
                            <Row label="Thực nhận (Net)" value={formatCurrency(calcNet(selectedEmployee))} />
                        </div>
                    )}

                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
                            Hủy bỏ
                        </Button>
                        <Button
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                            onClick={handleConfirmApprove}
                        >
                            Duyệt lương
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function Row({
    label,
    value,
    valueClass,
}: {
    label: string;
    value: string;
    valueClass?: string;
}) {
    return (
        <div className="flex items-center justify-between gap-3">
            <div className="text-gray-600">{label}</div>
            <div className={valueClass ?? "font-medium text-gray-900"}>{value}</div>
        </div>
    );
}