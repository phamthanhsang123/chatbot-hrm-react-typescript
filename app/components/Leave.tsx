"use client";

import {
    Calendar,
    Clock,
    CheckCircle,
    XCircle,
    Plus,
    Eye,
    CalendarDays,
} from "lucide-react";
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
import { Textarea } from "./ui/textarea";

type LeaveStatus = "pending" | "approved" | "rejected";
type LeaveType = "annual" | "sick" | "unpaid" | "maternity" | "marriage" | "funeral";

interface LeaveRequest {
    id: number;
    employeeId: string;
    name: string;
    department: string;
    type: LeaveType;
    from: string; // YYYY-MM-DD
    to: string;   // YYYY-MM-DD
    days: number;
    reason: string;
    status: LeaveStatus;
    appliedDate: string;
    reviewedDate?: string;
    reviewedBy?: string;
    reviewNote?: string;
}

/**
 * Format ổn định 100% SSR/CSR (không lệch timezone)
 * Input: "YYYY-MM-DD" => Output: "DD/MM/YYYY"
 */
function formatDateStable(dateStr: string) {
    if (!dateStr) return "-";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const [yyyy, mm, dd] = parts;
    return `${dd}/${mm}/${yyyy}`;
}

/**
 * Lấy YYYY-MM-DD theo giờ local của client (ổn định vì dùng sau mount)
 */
function getTodayLocalYYYYMMDD() {
    const d = new Date();
    const yyyy = String(d.getFullYear());
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

export function Leave() {
    const [filterStatus, setFilterStatus] = useState<"all" | LeaveStatus>("all");
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showDetailDialog, setShowDetailDialog] = useState(false);
    const [showApproveDialog, setShowApproveDialog] = useState(false);
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
    const [rejectNote, setRejectNote] = useState("");

    // Hôm nay chỉ tính sau khi mount để tránh SSR/CSR mismatch
    const [today, setToday] = useState<string>("");

    useEffect(() => {
        setToday(getTodayLocalYYYYMMDD());
    }, []);

    // Form state for create dialog
    const [newLeave, setNewLeave] = useState({
        employeeName: "",
        type: "annual" as LeaveType,
        from: "",
        to: "",
        reason: "",
    });

    const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([
        {
            id: 1,
            employeeId: "NV001",
            name: "Nguyễn Văn A",
            department: "IT",
            type: "annual",
            from: "2026-01-10",
            to: "2026-01-12",
            days: 3,
            status: "pending",
            reason: "Du lịch gia đình",
            appliedDate: "2026-01-05",
        },
        {
            id: 2,
            employeeId: "NV002",
            name: "Trần Thị B",
            department: "HR",
            type: "sick",
            from: "2026-01-08",
            to: "2026-01-09",
            days: 2,
            status: "approved",
            reason: "Ốm, cần nghỉ ngơi",
            appliedDate: "2026-01-07",
            reviewedDate: "2026-01-07",
            reviewedBy: "HR Manager",
        },
        {
            id: 3,
            employeeId: "NV003",
            name: "Lê Văn C",
            department: "IT",
            type: "unpaid",
            from: "2026-01-15",
            to: "2026-01-20",
            days: 6,
            status: "pending",
            reason: "Việc gia đình cần xử lý",
            appliedDate: "2026-01-05",
        },
        {
            id: 4,
            employeeId: "NV004",
            name: "Phạm Thị D",
            department: "Marketing",
            type: "annual",
            from: "2026-01-05",
            to: "2026-01-07",
            days: 3,
            status: "approved",
            reason: "Nghỉ ngơi sau dự án",
            appliedDate: "2025-12-28",
            reviewedDate: "2026-01-02",
            reviewedBy: "Department Head",
        },
        {
            id: 5,
            employeeId: "NV005",
            name: "Hoàng Văn E",
            department: "Sales",
            type: "sick",
            from: "2026-01-09",
            to: "2026-01-09",
            days: 1,
            status: "rejected",
            reason: "Khám bệnh",
            appliedDate: "2026-01-09",
            reviewedDate: "2026-01-09",
            reviewedBy: "HR Manager",
            reviewNote: "Không có giấy xác nhận từ bác sĩ",
        },
        {
            id: 6,
            employeeId: "NV006",
            name: "Vũ Thị F",
            department: "Finance",
            type: "marriage",
            from: "2026-01-20",
            to: "2026-01-22",
            days: 3,
            status: "pending",
            reason: "Đám cưới",
            appliedDate: "2026-01-10",
        },
    ]);

    const filteredData = useMemo(() => {
        if (filterStatus === "all") return leaveRequests;
        return leaveRequests.filter((x) => x.status === filterStatus);
    }, [leaveRequests, filterStatus]);

    const stats = useMemo(() => {
        const pending = leaveRequests.filter((x) => x.status === "pending").length;
        const approved = leaveRequests.filter((x) => x.status === "approved").length;
        const rejected = leaveRequests.filter((x) => x.status === "rejected").length;

        // Nếu chưa mount (today=""), trả về 0 để tránh mismatch SSR/CSR
        const onLeaveToday =
            today === ""
                ? 0
                : leaveRequests.filter((x) => x.status === "approved" && x.from <= today && x.to >= today).length;

        return { pending, approved, rejected, onLeaveToday };
    }, [leaveRequests, today]);

    const getLeaveTypeLabel = (type: LeaveType) => {
        const types: Record<LeaveType, string> = {
            annual: "Nghỉ phép năm",
            sick: "Nghỉ ốm",
            unpaid: "Nghỉ không lương",
            maternity: "Nghỉ thai sản",
            marriage: "Nghỉ cưới",
            funeral: "Nghỉ tang",
        };
        return types[type];
    };

    const getStatusBadge = (status: LeaveStatus) => {
        switch (status) {
            case "pending":
                return <Badge className="bg-orange-100 text-orange-700">⏳ Chờ duyệt</Badge>;
            case "approved":
                return <Badge className="bg-green-100 text-green-700">✅ Đã duyệt</Badge>;
            case "rejected":
                return <Badge className="bg-red-100 text-red-700">❌ Từ chối</Badge>;
            default:
                return <Badge>-</Badge>;
        }
    };

    const handleViewDetail = (request: LeaveRequest) => {
        setSelectedRequest(request);
        setShowDetailDialog(true);
    };

    const handleApprove = (request: LeaveRequest) => {
        setSelectedRequest(request);
        setShowApproveDialog(true);
    };

    const handleReject = (request: LeaveRequest) => {
        setSelectedRequest(request);
        setRejectNote("");
        setShowRejectDialog(true);
    };

    const handleConfirmApprove = () => {
        if (!selectedRequest) return;

        const reviewedDate = getTodayLocalYYYYMMDD();

        setLeaveRequests((prev) =>
            prev.map((x) => {
                if (x.id !== selectedRequest.id) return x;
                return {
                    ...x,
                    status: "approved",
                    reviewedDate,
                    reviewedBy: "HR Manager",
                };
            })
        );

        alert(
            `✅ Đã duyệt đơn nghỉ phép!\n\n` +
            `Nhân viên: ${selectedRequest.name}\n` +
            `Loại: ${getLeaveTypeLabel(selectedRequest.type)}\n` +
            `Số ngày: ${selectedRequest.days} ngày\n` +
            `Từ ${formatDateStable(selectedRequest.from)} đến ${formatDateStable(selectedRequest.to)}`
        );

        setShowApproveDialog(false);
    };

    const handleConfirmReject = () => {
        if (!selectedRequest) return;

        if (!rejectNote.trim()) {
            alert("⚠️ Vui lòng nhập lý do từ chối!");
            return;
        }

        const reviewedDate = getTodayLocalYYYYMMDD();

        setLeaveRequests((prev) =>
            prev.map((x) => {
                if (x.id !== selectedRequest.id) return x;
                return {
                    ...x,
                    status: "rejected",
                    reviewedDate,
                    reviewedBy: "HR Manager",
                    reviewNote: rejectNote,
                };
            })
        );

        alert(
            `❌ Đã từ chối đơn nghỉ phép!\n\n` +
            `Nhân viên: ${selectedRequest.name}\n` +
            `Lý do từ chối: ${rejectNote}`
        );

        setShowRejectDialog(false);
    };

    const handleCreateLeave = () => {
        if (!newLeave.employeeName || !newLeave.from || !newLeave.to || !newLeave.reason) {
            alert("⚠️ Vui lòng điền đầy đủ thông tin!");
            return;
        }

        // Validate date range
        if (newLeave.to < newLeave.from) {
            alert("⚠️ 'Đến ngày' phải lớn hơn hoặc bằng 'Từ ngày'!");
            return;
        }

        // Tính days bằng cách dựa trên string YYYY-MM-DD (tránh lệch timezone)
        // Convert sang UTC-safe bằng cách thêm "T00:00:00Z" để ổn định
        const from = new Date(`${newLeave.from}T00:00:00Z`);
        const to = new Date(`${newLeave.to}T00:00:00Z`);
        const diff = to.getTime() - from.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;

        const nextId = leaveRequests.length === 0 ? 1 : Math.max(...leaveRequests.map((x) => x.id)) + 1;

        const newRequest: LeaveRequest = {
            id: nextId,
            employeeId: "NV999",
            name: newLeave.employeeName,
            department: "IT",
            type: newLeave.type,
            from: newLeave.from,
            to: newLeave.to,
            days,
            reason: newLeave.reason,
            status: "pending",
            appliedDate: getTodayLocalYYYYMMDD(),
        };

        setLeaveRequests((prev) => [newRequest, ...prev]);

        alert(
            `✅ Đã tạo đơn nghỉ phép thành công!\n\n` +
            `Nhân viên: ${newLeave.employeeName}\n` +
            `Loại: ${getLeaveTypeLabel(newLeave.type)}\n` +
            `Số ngày: ${days} ngày`
        );

        setShowCreateDialog(false);
        setNewLeave({
            employeeName: "",
            type: "annual",
            from: "",
            to: "",
            reason: "",
        });
    };

    const handleViewCalendar = () => {
        alert(
            `📅 Lịch nghỉ phép tháng này\n\n` +
            `Tổng: ${stats.approved} đơn đã duyệt\n` +
            `Đang nghỉ hôm nay: ${stats.onLeaveToday} người\n` +
            `Chờ duyệt: ${stats.pending} đơn`
        );
    };

    return (
        <div className="space-y-5 text-[13px]">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Quản lý nghỉ phép</h1>
                    <p className="text-gray-500 mt-1">Theo dõi và duyệt đơn xin nghỉ phép</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleViewCalendar}>
                        <CalendarDays className="size-4 mr-2" />
                        Lịch nghỉ phép
                    </Button>

                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-blue-100 text-sm">Chờ duyệt</p>
                            <p className="text-3xl font-bold mt-2">{stats.pending}</p>
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
                            <p className="text-3xl font-bold mt-2">{stats.approved}</p>
                            <p className="text-sm text-green-100 mt-1">Tổng cộng</p>
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
                            <p className="text-3xl font-bold mt-2">{stats.onLeaveToday}</p>
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
                            <p className="text-3xl font-bold mt-2">{stats.rejected}</p>
                            <p className="text-sm text-red-100 mt-1">Tổng cộng</p>
                        </div>
                        <div className="size-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                            <XCircle className="size-6" />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Filters */}
            <Card className="p-4">
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                    <div className="flex gap-2">
                        <Button
                            variant={filterStatus === "all" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFilterStatus("all")}
                        >
                            Tất cả
                        </Button>
                        <Button
                            variant={filterStatus === "pending" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFilterStatus("pending")}
                        >
                            Chờ duyệt
                        </Button>
                        <Button
                            variant={filterStatus === "approved" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFilterStatus("approved")}
                        >
                            Đã duyệt
                        </Button>
                        <Button
                            variant={filterStatus === "rejected" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFilterStatus("rejected")}
                        >
                            Từ chối
                        </Button>
                    </div>

                    <div className="text-sm text-gray-600">
                        Hiển thị:{" "}
                        <span className="font-semibold text-gray-900">{filteredData.length}</span> /{" "}
                        {leaveRequests.length} đơn
                    </div>
                </div>
            </Card>

            {/* Leave Requests Table */}
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
                                    Loại nghỉ
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                                    Từ ngày
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                                    Đến ngày
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                                    Số ngày
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                                    Lý do
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
                            {filteredData.map((request) => (
                                <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-2 text-sm font-medium text-gray-900">
                                        {request.id}
                                    </td>
                                    <td className="px-4 py-2">
                                        <div className="flex items-center gap-3">
                                            <div className="size-10 shrink-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold">
                                                {request.name.charAt(0)}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium">{request.name}</span>
                                                <span className="text-xs text-gray-500">
                                                    {request.employeeId} • {request.department}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-2 text-sm text-gray-700">
                                        {getLeaveTypeLabel(request.type)}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-gray-700">
                                        {formatDateStable(request.from)}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-gray-700">
                                        {formatDateStable(request.to)}
                                    </td>
                                    <td className="px-4 py-2 text-sm font-medium text-gray-900">
                                        {request.days} ngày
                                    </td>
                                    <td className="px-4 py-2 text-sm text-gray-700 max-w-[200px] truncate">
                                        {request.reason}
                                    </td>
                                    <td className="px-4 py-2">{getStatusBadge(request.status)}</td>
                                    <td className="px-4 py-2">
                                        <div className="flex justify-end gap-2">
                                            {request.status === "pending" ? (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-green-600 hover:bg-green-50"
                                                        onClick={() => handleApprove(request)}
                                                    >
                                                        Duyệt
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-red-600 hover:bg-red-50"
                                                        onClick={() => handleReject(request)}
                                                    >
                                                        Từ chối
                                                    </Button>
                                                </>
                                            ) : (
                                                <Button size="sm" variant="outline" onClick={() => handleViewDetail(request)}>
                                                    <Eye className="size-3 mr-1" />
                                                    Chi tiết
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {filteredData.length === 0 && (
                                <tr>
                                    <td className="px-6 py-10 text-center text-sm text-gray-500" colSpan={9}>
                                        Không có đơn nghỉ phép nào.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Create Dialog */}


            {/* Detail Dialog */}
            <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
                <DialogContent className="sm:max-w-[620px]">
                    <DialogHeader>
                        <DialogTitle>Chi tiết đơn nghỉ phép</DialogTitle>
                        <DialogDescription>Thông tin chi tiết đơn xin nghỉ phép</DialogDescription>
                    </DialogHeader>

                    {selectedRequest && (
                        <div className="space-y-4">
                            <div className="rounded-lg border p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <div className="text-sm font-semibold text-gray-900">{selectedRequest.name}</div>
                                        <div className="text-xs text-gray-500">
                                            {selectedRequest.employeeId} • {selectedRequest.department}
                                        </div>
                                    </div>
                                    {getStatusBadge(selectedRequest.status)}
                                </div>

                                <div className="space-y-3 text-sm">
                                    <Row label="Loại nghỉ" value={getLeaveTypeLabel(selectedRequest.type)} />
                                    <Row label="Từ ngày" value={formatDateStable(selectedRequest.from)} />
                                    <Row label="Đến ngày" value={formatDateStable(selectedRequest.to)} />
                                    <Row label="Số ngày" value={`${selectedRequest.days} ngày`} />
                                    <Row label="Lý do" value={selectedRequest.reason} />
                                    <Row label="Ngày nộp đơn" value={formatDateStable(selectedRequest.appliedDate)} />

                                    {selectedRequest.reviewedDate && (
                                        <>
                                            <Row
                                                label="Ngày duyệt/từ chối"
                                                value={formatDateStable(selectedRequest.reviewedDate)}
                                            />
                                            <Row label="Người duyệt" value={selectedRequest.reviewedBy || "-"} />
                                        </>
                                    )}

                                    {selectedRequest.reviewNote && (
                                        <Row label="Ghi chú" value={selectedRequest.reviewNote} valueClass="text-red-600" />
                                    )}
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
                        <DialogTitle>Duyệt đơn nghỉ phép</DialogTitle>
                        <DialogDescription>Xác nhận duyệt đơn xin nghỉ phép</DialogDescription>
                    </DialogHeader>

                    {selectedRequest && (
                        <div className="rounded-lg border p-4 space-y-3 text-sm">
                            <div className="font-semibold text-gray-900">{selectedRequest.name}</div>
                            <Row label="Loại nghỉ" value={getLeaveTypeLabel(selectedRequest.type)} />
                            <Row
                                label="Thời gian"
                                value={`${formatDateStable(selectedRequest.from)} - ${formatDateStable(selectedRequest.to)}`}
                            />
                            <Row label="Số ngày" value={`${selectedRequest.days} ngày`} />
                            <Row label="Lý do" value={selectedRequest.reason} />
                        </div>
                    )}

                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
                            Hủy bỏ
                        </Button>
                        <Button
                            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                            onClick={handleConfirmApprove}
                        >
                            Duyệt đơn
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle>Từ chối đơn nghỉ phép</DialogTitle>
                        <DialogDescription>Nhập lý do từ chối đơn xin nghỉ phép</DialogDescription>
                    </DialogHeader>

                    {selectedRequest && (
                        <div className="space-y-4">
                            <div className="rounded-lg border p-4 space-y-3 text-sm">
                                <div className="font-semibold text-gray-900">{selectedRequest.name}</div>
                                <Row label="Loại nghỉ" value={getLeaveTypeLabel(selectedRequest.type)} />
                                <Row
                                    label="Thời gian"
                                    value={`${formatDateStable(selectedRequest.from)} - ${formatDateStable(selectedRequest.to)}`}
                                />
                                <Row label="Số ngày" value={`${selectedRequest.days} ngày`} />
                            </div>

                            <div>
                                <Label>Lý do từ chối *</Label>
                                <Textarea
                                    value={rejectNote}
                                    onChange={(e) => setRejectNote(e.target.value)}
                                    placeholder="Nhập lý do từ chối..."
                                    rows={3}
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                            Hủy bỏ
                        </Button>
                        <Button
                            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
                            onClick={handleConfirmReject}
                        >
                            Từ chối đơn
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
        <div className="flex items-start justify-between gap-3">
            <div className="text-gray-600">{label}:</div>
            <div className={valueClass ?? "font-medium text-gray-900 text-right"}>{value}</div>
        </div>
    );
}
