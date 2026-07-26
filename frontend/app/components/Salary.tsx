'use client';
import { Calculator, ChevronDown, ChevronRight, CreditCard, DollarSign, Pencil, Search, TrendingUp, Users, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import {
    approveSalary,
    calculateMonthlySalary,
    fetchSalaryRows,
    paySalary,
    type SalaryRowApiItem,
} from "@/services/salary";

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

const formatMonthKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
};

const getRelativeMonthKey = (offset: number) => {
    const date = new Date();
    date.setMonth(date.getMonth() + offset);
    return formatMonthKey(date);
};

function parseMonthKey(value: string) {
    const [year, month] = value.split("-").map(Number);
    return { month, year };
}

function normalizeSalaryStatus(status?: string): SalaryStatus {
    const value = (status || "").toLowerCase();
    if (value.includes("đã thanh toán") || value.includes("da thanh toan") || value.includes("paid")) return "paid";
    if (value.includes("chờ thanh toán") || value.includes("cho thanh toan") || value.includes("approved")) return "approved";
    if (value.includes("đã duyệt") || value.includes("da duyet") || value.includes("calculated")) return "calculated";
    return "pending";
}

function mapSalaryRow(item: SalaryRowApiItem, monthKey: string): SalaryItem {
    const allowance = Number(item.allowance || 0);
    const socialInsurance = Math.round(Number(item.insuranceDeduction || 0) * 0.7);
    const healthInsurance = Math.round(Number(item.insuranceDeduction || 0) * 0.2);
    const unemploymentInsurance = Math.max(0, Number(item.insuranceDeduction || 0) - socialInsurance - healthInsurance);

    return {
        id: item.id,
        employeeId: item.employeeCode || `NV${String(item.employeeId).padStart(3, "0")}`,
        name: item.employeeName,
        department: item.department || "Chưa phân phòng",
        position: item.position || "Nhân viên",
        month: monthKey,
        baseSalary: Number(item.salaryBase || 0),
        mealAllowance: Math.round(allowance * 0.4),
        transportAllowance: Math.round(allowance * 0.3),
        phoneAllowance: Math.round(allowance * 0.2),
        housingAllowance: Math.max(0, allowance - Math.round(allowance * 0.9)),
        standardDays: Number(item.standardDays || 22),
        workDays: Number(item.workDays || 0),
        overtimeHours: Number(item.overtimeHours || 0),
        overtimeRate: 1.5,
        kpiBonus: Number(item.bonus || 0),
        projectBonus: 0,
        holidayBonus: Number(item.overtimePay || 0),
        socialInsurance,
        healthInsurance,
        unemploymentInsurance,
        personalIncomeTax: Number(item.taxDeduction || 0),
        advancePayment: 0,
        penalties: Number(item.penaltyDeduction || 0),
        salaryDeduction: Number(item.salaryDeduction || 0),
        status: normalizeSalaryStatus(item.status),
        calculatedDate: new Date().toISOString().slice(0, 10),
    };
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
                return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">Chưa tính</Badge>;
            case "calculated":
                return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Chờ duyệt</Badge>;
            case "approved":
                return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">Chờ thanh toán</Badge>;
            case "paid":
                return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Đã thanh toán</Badge>;
            default:
                return <Badge>-</Badge>;
        }
    };

    const currentMonthKey = getRelativeMonthKey(0);
    const previousMonthKey = getRelativeMonthKey(-1);

    const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
    const [filterStatus, setFilterStatus] = useState<"all" | SalaryStatus>("all");
    const [searchQuery, setSearchQuery] = useState("");

    const [showCalculateDialog, setShowCalculateDialog] = useState(false);
    const [showDetailDialog, setShowDetailDialog] = useState(false);
    const [showApproveDialog, setShowApproveDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showIncomeDetail, setShowIncomeDetail] = useState(false);
    const [showDeductionDetail, setShowDeductionDetail] = useState(false);

    const [selectedEmployee, setSelectedEmployee] = useState<SalaryItem | null>(null);
    const [apiError, setApiError] = useState("");
    const [editSalaryForm, setEditSalaryForm] = useState({
        baseSalary: 0,
        mealAllowance: 0,
        transportAllowance: 0,
        phoneAllowance: 0,
        housingAllowance: 0,
        overtimeHours: 0,
        overtimeRate: 1.5,
        kpiBonus: 0,
        projectBonus: 0,
        holidayBonus: 0,
        advancePayment: 0,
        penalties: 0,
    });

    const [salaryData, setSalaryData] = useState<SalaryItem[]>([
        {
            id: 101,
            employeeId: "NV001",
            name: "Nguyễn Văn An",
            department: "IT",
            position: "Senior Developer",
            month: currentMonthKey,
            baseSalary: 20000000,
            mealAllowance: 1000000,
            transportAllowance: 500000,
            phoneAllowance: 300000,
            housingAllowance: 2000000,
            standardDays: 22,
            workDays: 21,
            overtimeHours: 18,
            overtimeRate: 1.5,
            kpiBonus: 2800000,
            projectBonus: 2000000,
            holidayBonus: 0,
            socialInsurance: 1600000,
            healthInsurance: 300000,
            unemploymentInsurance: 200000,
            personalIncomeTax: 2400000,
            advancePayment: 3000000,
            penalties: 0,
            status: "calculated",
            calculatedDate: todayISO(),
        },
        {
            id: 102,
            employeeId: "NV002",
            name: "Trần Thị Bình",
            department: "HR",
            position: "HR Manager",
            month: currentMonthKey,
            baseSalary: 25000000,
            mealAllowance: 1000000,
            transportAllowance: 500000,
            phoneAllowance: 500000,
            housingAllowance: 3000000,
            standardDays: 22,
            workDays: 22,
            overtimeHours: 8,
            overtimeRate: 1.5,
            kpiBonus: 3500000,
            projectBonus: 0,
            holidayBonus: 0,
            socialInsurance: 2000000,
            healthInsurance: 375000,
            unemploymentInsurance: 250000,
            personalIncomeTax: 3600000,
            advancePayment: 5000000,
            penalties: 0,
            status: "approved",
            calculatedDate: todayISO(),
            approvedDate: todayISO(),
        },
        {
            id: 103,
            employeeId: "NV003",
            name: "Lê Hoàng Cường",
            department: "Marketing",
            position: "Marketing Executive",
            month: currentMonthKey,
            baseSalary: 16000000,
            mealAllowance: 900000,
            transportAllowance: 500000,
            phoneAllowance: 300000,
            housingAllowance: 1000000,
            standardDays: 22,
            workDays: 22,
            overtimeHours: 6,
            overtimeRate: 1.5,
            kpiBonus: 2200000,
            projectBonus: 1000000,
            holidayBonus: 0,
            socialInsurance: 1280000,
            healthInsurance: 240000,
            unemploymentInsurance: 160000,
            personalIncomeTax: 1400000,
            advancePayment: 0,
            penalties: 0,
            status: "pending",
        },
        {
            id: 201,
            employeeId: "NV001",
            name: "Nguyễn Văn An",
            department: "IT",
            position: "Senior Developer",
            month: previousMonthKey,
            baseSalary: 20000000,
            mealAllowance: 1000000,
            transportAllowance: 500000,
            phoneAllowance: 300000,
            housingAllowance: 2000000,
            standardDays: 22,
            workDays: 22,
            overtimeHours: 16,
            overtimeRate: 1.5,
            kpiBonus: 3000000,
            projectBonus: 1500000,
            holidayBonus: 0,
            socialInsurance: 1600000,
            healthInsurance: 300000,
            unemploymentInsurance: 200000,
            personalIncomeTax: 2350000,
            advancePayment: 2000000,
            penalties: 0,
            status: "paid",
            calculatedDate: previousMonthKey + "-25",
            approvedDate: previousMonthKey + "-26",
            paidDate: previousMonthKey + "-28",
        },
        {
            id: 202,
            employeeId: "NV002",
            name: "Trần Thị Bình",
            department: "HR",
            position: "HR Manager",
            month: previousMonthKey,
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
            advancePayment: 4000000,
            penalties: 0,
            status: "paid",
            calculatedDate: previousMonthKey + "-25",
            approvedDate: previousMonthKey + "-26",
            paidDate: previousMonthKey + "-28",
        },
        {
            id: 203,
            employeeId: "NV004",
            name: "Phạm Minh Đức",
            department: "Sales",
            position: "Sales Executive",
            month: previousMonthKey,
            baseSalary: 15000000,
            mealAllowance: 900000,
            transportAllowance: 700000,
            phoneAllowance: 300000,
            housingAllowance: 1000000,
            standardDays: 22,
            workDays: 20,
            overtimeHours: 5,
            overtimeRate: 1.5,
            kpiBonus: 2500000,
            projectBonus: 0,
            holidayBonus: 0,
            socialInsurance: 1200000,
            healthInsurance: 225000,
            unemploymentInsurance: 150000,
            personalIncomeTax: 1200000,
            advancePayment: 1000000,
            penalties: 300000,
            salaryDeduction: 600000,
            status: "paid",
            calculatedDate: previousMonthKey + "-25",
            approvedDate: previousMonthKey + "-26",
            paidDate: previousMonthKey + "-28",
        },
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

    useEffect(() => {
        let mounted = true;
        const { month, year } = parseMonthKey(selectedMonth);

        fetchSalaryRows(month, year, filterStatus)
            .then((rows) => {
                if (!mounted) return;
                setSalaryData(rows.map((row) => mapSalaryRow(row, selectedMonth)));
                setApiError("");
            })
            .catch((error) => {
                console.error("Load salary API failed:", error);
                if (!mounted) return;
                setSalaryData([]);
                setApiError("Không tải được bảng lương từ Render API.");
            });

        return () => {
            mounted = false;
        };
    }, [filterStatus, selectedMonth]);

    const filteredData = useMemo(() => {
        const keyword = searchQuery.trim().toLowerCase();
        return monthData.filter((item) => {
            const matchesStatus = filterStatus === "all" || item.status === filterStatus;
            const matchesSearch =
                !keyword ||
                item.name.toLowerCase().includes(keyword) ||
                item.employeeId.toLowerCase().includes(keyword) ||
                item.department.toLowerCase().includes(keyword) ||
                item.position.toLowerCase().includes(keyword);

            return matchesStatus && matchesSearch;
        });
    }, [monthData, filterStatus, searchQuery]);

    const stats = useMemo(() => {
        const list = monthData;
        const totalNet = list.reduce((sum, x) => sum + calcNet(x), 0);
        const avgNet = list.length ? totalNet / list.length : 0;
        const totalBonus = list.reduce((sum, x) => sum + calcBonuses(x), 0);
        const needProcessCount = list.filter((x) => x.status !== "paid").length;
        const paidCount = list.filter((x) => x.status === "paid").length;
        const calculatedCount = list.filter((x) => x.status === "calculated").length;
        const approvedCount = list.filter((x) => x.status === "approved").length;
        const pendingCount = list.filter((x) => x.status === "pending").length;

        return {
            totalNet,
            avgNet,
            totalBonus,
            needProcessCount,
            employeeCount: list.length,
            paidCount,
            calculatedCount,
            approvedCount,
            pendingCount,
        };
    }, [monthData]);

    const handleViewDetail = (employee: SalaryItem) => {
        setSelectedEmployee(employee);
        setShowIncomeDetail(false);
        setShowDeductionDetail(false);
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

    const handleEditSalary = (employee: SalaryItem) => {
        setSelectedEmployee(employee);
        setEditSalaryForm({
            baseSalary: employee.baseSalary,
            mealAllowance: employee.mealAllowance,
            transportAllowance: employee.transportAllowance,
            phoneAllowance: employee.phoneAllowance,
            housingAllowance: employee.housingAllowance,
            overtimeHours: employee.overtimeHours,
            overtimeRate: employee.overtimeRate,
            kpiBonus: employee.kpiBonus,
            projectBonus: employee.projectBonus,
            holidayBonus: employee.holidayBonus,
            advancePayment: employee.advancePayment,
            penalties: employee.penalties,
        });
        setShowEditDialog(true);
    };

    const handleSaveSalaryEdit = () => {
        if (!selectedEmployee) return;

        setSalaryData((prev) =>
            prev.map((item) =>
                item.id === selectedEmployee.id
                    ? {
                        ...item,
                        ...editSalaryForm,
                    }
                    : item
            )
        );

        alert(`Đã cập nhật lương cho ${selectedEmployee.name}.`);
        setShowEditDialog(false);
    };

    const handleConfirmCalculate = async () => {
        // Chỉ chuyển những nhân viên status pending của tháng đang chọn sang calculated
        const pendingInMonth = monthData.filter((x) => x.status === "pending");
        const { month, year } = parseMonthKey(selectedMonth);

        try {
            await calculateMonthlySalary(month, year);
            const rows = await fetchSalaryRows(month, year, filterStatus);
            setSalaryData(rows.map((row) => mapSalaryRow(row, selectedMonth)));
            setApiError("");
        } catch (error) {
            console.error("Calculate salary API failed:", error);
            setApiError("Không tính được lương trên Render API.");
            alert("Không tính được lương trên API. Giao diện giữ nguyên dữ liệu cũ.");
            setShowCalculateDialog(false);
            return;
        }

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

    const handleConfirmApprove = async () => {
        if (!selectedEmployee) return;

        try {
            await approveSalary(selectedEmployee.id);
            setApiError("");
        } catch (error) {
            console.error("Approve salary API failed:", error);
            setApiError("Không duyệt được lương trên Render API.");
            alert("Không duyệt được lương trên API. Giao diện giữ nguyên trạng thái cũ.");
            setShowApproveDialog(false);
            return;
        }

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

    const handlePaySalary = async (employee: SalaryItem) => {
        if (
            !confirm(
                `Xác nhận thanh toán lương cho ${employee.name}?\n\nSố tiền (Net): ${formatCurrency(
                    calcNet(employee)
                )}`
            )
        )
            return;

        try {
            await paySalary(employee.id);
            setApiError("");
        } catch (error) {
            console.error("Pay salary API failed:", error);
            setApiError("Không thanh toán được lương trên Render API.");
            alert("Không thanh toán được lương trên API. Giao diện giữ nguyên trạng thái cũ.");
            return;
        }

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
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Quản lý lương thưởng</h1>
                    <p className="mt-1 text-gray-500">Theo dõi bảng lương, duyệt và thanh toán theo từng tháng.</p>
                    {apiError && <p className="mt-1 text-xs text-amber-600">{apiError}</p>}
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                    <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={handleCalculateSalary}>
                        <Calculator className="size-4" />
                        Tính lương
                    </Button>
                </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Card className="!gap-2 border-gray-200 !p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-500">Tổng thực chi</p>
                        <Wallet className="size-5 text-emerald-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalNet)}</p>
                    <p className="text-xs text-gray-500">{stats.employeeCount} nhân viên trong tháng {selectedMonth}</p>
                </Card>

                <Card className="!gap-2 border-gray-200 !p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-500">Lương trung bình</p>
                        <TrendingUp className="size-5 text-blue-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.avgNet)}</p>
                    <p className="text-xs text-gray-500">Tính theo thực nhận sau khấu trừ</p>
                </Card>

                <Card className="!gap-2 border-gray-200 !p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-500">Tổng thưởng</p>
                        <DollarSign className="size-5 text-violet-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalBonus)}</p>
                    <p className="text-xs text-gray-500">KPI, dự án và lễ tết</p>
                </Card>

                <Card className="!gap-2 border-gray-200 !p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-500">Cần xử lý</p>
                        <Users className="size-5 text-orange-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stats.needProcessCount}</p>
                    <p className="text-xs text-gray-500">Chưa hoàn tất thanh toán</p>
                </Card>
            </div>

            <Card className="border-gray-200 !p-4">
                <div className="grid gap-3 xl:grid-cols-[180px_minmax(280px,1fr)_minmax(500px,auto)] xl:items-end">
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-600">Tháng lương</Label>
                        <Input
                            type="month"
                            className="h-10"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-600">Tìm kiếm</Label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                            <Input
                                className="h-10 pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Tên, mã NV, phòng ban, chức vụ..."
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 rounded-lg bg-gray-100 p-1 md:grid-cols-5">
                        {[
                            { value: "all", label: "Tất cả", count: monthData.length },
                            { value: "pending", label: "Chưa tính", count: stats.pendingCount },
                            { value: "calculated", label: "Chờ duyệt", count: stats.calculatedCount },
                            { value: "approved", label: "Chờ trả", count: stats.approvedCount },
                            { value: "paid", label: "Đã trả", count: stats.paidCount },
                        ].map((item) => (
                            <Button
                                key={item.value}
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => setFilterStatus(item.value as "all" | SalaryStatus)}
                                className={`h-9 justify-between px-3 ${filterStatus === item.value ? "bg-white text-blue-700 shadow-sm hover:bg-white" : "text-gray-600 hover:bg-white"}`}
                            >
                                <span>{item.label}</span>
                                <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">{item.count}</span>
                            </Button>
                        ))}
                    </div>
                </div>
            </Card>

            <Card className="overflow-hidden border-gray-200">
                <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                    <div>
                        <h2 className="text-base font-semibold text-gray-900">Bảng lương tháng {selectedMonth}</h2>
                        <p className="text-sm text-gray-500">
                            Hiển thị {filteredData.length}/{monthData.length} nhân viên. Công thức: lương gộp - khấu trừ = thực nhận.
                        </p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1080px]">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="px-5 py-3 text-left text-xs font-bold uppercase text-gray-600">Nhân viên</th>
                                <th className="px-5 py-3 text-left text-xs font-bold uppercase text-gray-600">Công / OT</th>
                                <th className="px-5 py-3 text-right text-xs font-bold uppercase text-gray-600">Lương gộp</th>
                                <th className="px-5 py-3 text-right text-xs font-bold uppercase text-gray-600">Khấu trừ</th>
                                <th className="px-5 py-3 text-right text-xs font-bold uppercase text-gray-600">Thực nhận</th>
                                <th className="px-5 py-3 text-left text-xs font-bold uppercase text-gray-600">Trạng thái</th>
                                <th className="px-5 py-3 text-right text-xs font-bold uppercase text-gray-600">Hành động</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-100">
                            {filteredData.map((item) => {
                                const totalIncome = calcTotalIncome(item);
                                const deduction = calcTotalDeduction(item);
                                const net = calcNet(item);

                                return (
                                    <tr key={item.id} className="transition-colors hover:bg-gray-50/80">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-600 font-semibold text-white">
                                                    {item.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                                                    <p className="text-xs text-gray-500">{item.employeeId} • {item.department} • {item.position}</p>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-5 py-4 text-sm">
                                            <div className="font-semibold text-gray-900">{item.workDays}/{item.standardDays} ngày</div>
                                            <div className="text-xs text-gray-500">OT {item.overtimeHours}h x {item.overtimeRate}</div>
                                        </td>

                                        <td className="px-5 py-4 text-right">
                                            <div className="font-semibold tabular-nums text-gray-900">{formatCurrency(totalIncome)}</div>
                                            <div className="text-xs text-gray-500">Cơ bản + phụ cấp + thưởng</div>
                                        </td>

                                        <td className="px-5 py-4 text-right">
                                            <div className="font-semibold tabular-nums text-red-600">-{formatCurrency(deduction)}</div>
                                            <div className="text-xs text-gray-500">BH, thuế, tạm ứng</div>
                                        </td>

                                        <td className="px-5 py-4 text-right">
                                            <div className="text-base font-bold tabular-nums text-emerald-700">{formatCurrency(net)}</div>
                                            <div className="text-xs text-gray-500">Net pay</div>
                                        </td>

                                        <td className="px-5 py-4">{getStatusBadge(item.status)}</td>

                                        <td className="px-5 py-4">
                                            <div className="flex justify-end gap-2">
                                                <Button size="sm" variant="outline" onClick={() => handleViewDetail(item)}>
                                                    Chi tiết
                                                </Button>
                                                <Button size="sm" variant="outline" className="gap-1" onClick={() => handleEditSalary(item)}>
                                                    <Pencil className="size-3" />
                                                    Sửa
                                                </Button>
                                                {item.status === "calculated" && (
                                                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => handleApproveSalary(item)}>
                                                        Duyệt
                                                    </Button>
                                                )}
                                                {item.status === "approved" && (
                                                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handlePaySalary(item)}>
                                                        Thanh toán
                                                    </Button>
                                                )}
                                                {item.status === "paid" && (
                                                    <Button size="sm" variant="outline" className="gap-1" onClick={() => handleSendPayslip(item)}>
                                                        <CreditCard className="size-3" />
                                                        Phiếu lương
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}

                            {filteredData.length === 0 && (
                                <tr>
                                    <td className="px-6 py-12 text-center text-sm text-gray-500" colSpan={7}>
                                        Không có dữ liệu phù hợp với bộ lọc hiện tại.
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

            <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
                <DialogContent className="sm:max-w-[760px] max-h-[88vh] overflow-y-auto p-0">
                    <DialogHeader className="border-b border-gray-200 px-6 py-5">
                        <DialogTitle className="text-xl font-bold">Chi tiết lương</DialogTitle>
                        <DialogDescription>Kiểm tra nhanh lương gộp, khấu trừ và số thực nhận.</DialogDescription>
                    </DialogHeader>

                    {selectedEmployee && (
                        <div className="space-y-5 px-6 py-5">
                            <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex size-12 items-center justify-center rounded-full bg-blue-600 text-base font-bold text-white">
                                        {selectedEmployee.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">{selectedEmployee.name} ({selectedEmployee.employeeId})</p>
                                        <p className="text-sm text-gray-500">{selectedEmployee.department} • {selectedEmployee.position} • Tháng {selectedEmployee.month}</p>
                                    </div>
                                </div>
                                {getStatusBadge(selectedEmployee.status)}
                            </div>

                            <div className="grid gap-3 md:grid-cols-3">
                                <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
                                    <p className="text-xs font-semibold uppercase text-emerald-700">Lương gộp</p>
                                    <p className="mt-2 text-lg font-bold text-emerald-800">{formatCurrency(calcTotalIncome(selectedEmployee))}</p>
                                </div>
                                <div className="rounded-lg border border-red-100 bg-red-50 p-4">
                                    <p className="text-xs font-semibold uppercase text-red-700">Khấu trừ</p>
                                    <p className="mt-2 text-lg font-bold text-red-700">-{formatCurrency(calcTotalDeduction(selectedEmployee))}</p>
                                </div>
                                <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                                    <p className="text-xs font-semibold uppercase text-blue-700">Thực nhận</p>
                                    <p className="mt-2 text-lg font-bold text-blue-800">{formatCurrency(calcNet(selectedEmployee))}</p>
                                </div>
                            </div>

                            <div className="rounded-lg border border-gray-200 bg-white p-4">
                                <div className="grid gap-3 text-sm sm:grid-cols-4">
                                    <div>
                                        <p className="text-xs text-gray-500">Ngày công</p>
                                        <p className="mt-1 font-semibold text-gray-900">{selectedEmployee.workDays}/{selectedEmployee.standardDays} ngày</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">OT</p>
                                        <p className="mt-1 font-semibold text-gray-900">{selectedEmployee.overtimeHours}h x {selectedEmployee.overtimeRate}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Ngày duyệt</p>
                                        <p className="mt-1 font-semibold text-gray-900">{selectedEmployee.approvedDate ?? "-"}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Ngày thanh toán</p>
                                        <p className="mt-1 font-semibold text-gray-900">{selectedEmployee.paidDate ?? "-"}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-hidden rounded-lg border border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => setShowIncomeDetail((current) => !current)}
                                    className="flex w-full items-center justify-between gap-3 bg-white p-4 text-left transition hover:bg-emerald-50"
                                >
                                    <div className="flex items-center gap-2">
                                        {showIncomeDetail ? <ChevronDown className="size-4 text-emerald-600" /> : <ChevronRight className="size-4 text-emerald-600" />}
                                        <span className="font-semibold text-gray-900">Thu nhập</span>
                                    </div>
                                    <span className="font-bold text-emerald-700">{formatCurrency(calcTotalIncome(selectedEmployee))}</span>
                                </button>

                                {showIncomeDetail && (
                                    <div className="space-y-2 border-t border-gray-200 bg-gray-50 p-4 text-sm">
                                        <Row label="Lương cơ bản" value={formatCurrency(selectedEmployee.baseSalary)} />
                                        <Row label="Phụ cấp" value={formatCurrency(calcAllowances(selectedEmployee))} />
                                        <Row label="Lương OT" value={formatCurrency(calcOvertimePay(selectedEmployee))} />
                                        <Row label="Thưởng" value={formatCurrency(calcBonuses(selectedEmployee))} />
                                        {(selectedEmployee.salaryDeduction ?? 0) > 0 && (
                                            <Row label="Trừ lương do nghỉ/vi phạm" value={`-${formatCurrency(selectedEmployee.salaryDeduction ?? 0)}`} valueClass="font-semibold text-red-600" />
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="overflow-hidden rounded-lg border border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => setShowDeductionDetail((current) => !current)}
                                    className="flex w-full items-center justify-between gap-3 bg-white p-4 text-left transition hover:bg-red-50"
                                >
                                    <div className="flex items-center gap-2">
                                        {showDeductionDetail ? <ChevronDown className="size-4 text-red-600" /> : <ChevronRight className="size-4 text-red-600" />}
                                        <span className="font-semibold text-gray-900">Khấu trừ</span>
                                    </div>
                                    <span className="font-bold text-red-700">-{formatCurrency(calcTotalDeduction(selectedEmployee))}</span>
                                </button>

                                {showDeductionDetail && (
                                    <div className="space-y-2 border-t border-gray-200 bg-gray-50 p-4 text-sm">
                                        <Row label="BHXH" value={`-${formatCurrency(selectedEmployee.socialInsurance)}`} valueClass="font-semibold text-red-600" />
                                        <Row label="BHYT" value={`-${formatCurrency(selectedEmployee.healthInsurance)}`} valueClass="font-semibold text-red-600" />
                                        <Row label="BHTN" value={`-${formatCurrency(selectedEmployee.unemploymentInsurance)}`} valueClass="font-semibold text-red-600" />
                                        <Row label="Thuế TNCN" value={`-${formatCurrency(selectedEmployee.personalIncomeTax)}`} valueClass="font-semibold text-red-600" />
                                        <Row label="Tạm ứng" value={`-${formatCurrency(selectedEmployee.advancePayment)}`} valueClass="font-semibold text-red-600" />
                                        <Row label="Phạt" value={`-${formatCurrency(selectedEmployee.penalties)}`} valueClass="font-semibold text-red-600" />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end border-t border-gray-200 px-6 py-4">
                        <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
                            Đóng
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Salary Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="sm:max-w-[720px] max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Chỉnh sửa lương</DialogTitle>
                        <DialogDescription>Cập nhật nhanh các khoản thu nhập và khấu trừ</DialogDescription>
                    </DialogHeader>

                    {selectedEmployee && (
                        <div className="space-y-5">
                            <div className="rounded-lg border p-4 text-sm">
                                <div className="font-semibold text-gray-900">
                                    {selectedEmployee.name} ({selectedEmployee.employeeId})
                                </div>
                                <div className="text-xs text-gray-500">
                                    {selectedEmployee.department} • {selectedEmployee.position} • Tháng {selectedEmployee.month}
                                </div>
                            </div>

                            <div className="grid gap-4">
                                <div className="rounded-lg border border-gray-200 p-4">
                                    <div className="mb-3 flex items-center justify-between">
                                        <h3 className="font-semibold text-gray-900">Lương cố định</h3>
                                        <Badge variant="outline" className="bg-gray-50 text-gray-600">Cơ bản + phụ cấp</Badge>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <MoneyInput
                                            label="Lương cơ bản"
                                            value={editSalaryForm.baseSalary}
                                            onChange={(value) => setEditSalaryForm({ ...editSalaryForm, baseSalary: value })}
                                        />
                                        <MoneyInput
                                            label="Phụ cấp ăn"
                                            value={editSalaryForm.mealAllowance}
                                            onChange={(value) => setEditSalaryForm({ ...editSalaryForm, mealAllowance: value })}
                                        />
                                        <MoneyInput
                                            label="Phụ cấp xăng xe"
                                            value={editSalaryForm.transportAllowance}
                                            onChange={(value) => setEditSalaryForm({ ...editSalaryForm, transportAllowance: value })}
                                        />
                                        <MoneyInput
                                            label="Phụ cấp điện thoại"
                                            value={editSalaryForm.phoneAllowance}
                                            onChange={(value) => setEditSalaryForm({ ...editSalaryForm, phoneAllowance: value })}
                                        />
                                        <MoneyInput
                                            label="Phụ cấp nhà ở"
                                            value={editSalaryForm.housingAllowance}
                                            onChange={(value) => setEditSalaryForm({ ...editSalaryForm, housingAllowance: value })}
                                        />
                                    </div>
                                </div>

                                <div className="rounded-lg border border-gray-200 p-4">
                                    <div className="mb-3 flex items-center justify-between">
                                        <h3 className="font-semibold text-gray-900">OT và thưởng</h3>
                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700">Cộng vào lương</Badge>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <NumberInputWithSuffix
                                            label="Số giờ OT"
                                            suffix="giờ"
                                            value={editSalaryForm.overtimeHours}
                                            onChange={(value) => setEditSalaryForm({ ...editSalaryForm, overtimeHours: value })}
                                        />
                                        <NumberInputWithSuffix
                                            label="Hệ số OT"
                                            suffix="x"
                                            step="0.5"
                                            value={editSalaryForm.overtimeRate}
                                            onChange={(value) => setEditSalaryForm({ ...editSalaryForm, overtimeRate: value })}
                                        />
                                        <MoneyInput
                                            label="Thưởng KPI"
                                            value={editSalaryForm.kpiBonus}
                                            onChange={(value) => setEditSalaryForm({ ...editSalaryForm, kpiBonus: value })}
                                        />
                                        <MoneyInput
                                            label="Thưởng dự án"
                                            value={editSalaryForm.projectBonus}
                                            onChange={(value) => setEditSalaryForm({ ...editSalaryForm, projectBonus: value })}
                                        />
                                        <MoneyInput
                                            label="Thưởng lễ tết"
                                            value={editSalaryForm.holidayBonus}
                                            onChange={(value) => setEditSalaryForm({ ...editSalaryForm, holidayBonus: value })}
                                        />
                                    </div>
                                </div>

                                <div className="rounded-lg border border-gray-200 p-4">
                                    <div className="mb-3 flex items-center justify-between">
                                        <h3 className="font-semibold text-gray-900">Khấu trừ có thể chỉnh</h3>
                                        <Badge variant="outline" className="bg-red-50 text-red-700">Trừ vào lương</Badge>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <MoneyInput
                                            label="Tạm ứng"
                                            value={editSalaryForm.advancePayment}
                                            onChange={(value) => setEditSalaryForm({ ...editSalaryForm, advancePayment: value })}
                                        />
                                        <MoneyInput
                                            label="Phạt"
                                            value={editSalaryForm.penalties}
                                            onChange={(value) => setEditSalaryForm({ ...editSalaryForm, penalties: value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-lg bg-emerald-50 p-4 text-sm">
                                <Row
                                    label="Thực nhận dự kiến"
                                    value={formatCurrency(
                                        calcNet({
                                            ...selectedEmployee,
                                            ...editSalaryForm,
                                        })
                                    )}
                                    valueClass="font-bold text-emerald-700"
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                            Hủy bỏ
                        </Button>
                        <Button
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                            onClick={handleSaveSalaryEdit}
                        >
                            Lưu thay đổi
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

function formatMoneyInput(value: number) {
    return new Intl.NumberFormat("vi-VN").format(Math.max(0, Number.isFinite(value) ? value : 0));
}

function parseMoneyInput(value: string) {
    return Number(value.replace(/\D/g, "")) || 0;
}

function MoneyInput({
    label,
    value,
    onChange,
}: {
    label: string;
    value: number;
    onChange: (value: number) => void;
}) {
    return (
        <div>
            <Label className="text-xs font-semibold text-gray-700">{label}</Label>
            <div className="relative mt-1">
                <Input
                    type="text"
                    inputMode="numeric"
                    value={formatMoneyInput(value)}
                    onChange={(event) => onChange(parseMoneyInput(event.target.value))}
                    className="h-11 rounded-lg bg-white pr-10 text-right font-semibold tabular-nums text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-500"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-semibold text-gray-500">
                    đ
                </span>
            </div>
        </div>
    );
}

function NumberInputWithSuffix({
    label,
    value,
    onChange,
    suffix,
    step,
}: {
    label: string;
    value: number;
    onChange: (value: number) => void;
    suffix: string;
    step?: string;
}) {
    return (
        <div>
            <Label className="text-xs font-semibold text-gray-700">{label}</Label>
            <div className="relative mt-1">
                <Input
                    type="number"
                    step={step}
                    value={value}
                    onChange={(event) => onChange(Number(event.target.value) || 0)}
                    className="h-11 rounded-lg bg-white pr-12 text-right font-semibold tabular-nums text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-500"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-semibold text-gray-500">
                    {suffix}
                </span>
            </div>
        </div>
    );
}
