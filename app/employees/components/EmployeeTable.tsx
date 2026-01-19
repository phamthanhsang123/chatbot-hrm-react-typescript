"use client"

import React from "react"
import { Edit, Trash2, Search, Plus, Download } from "lucide-react"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "../../components/ui/dialog"
import { AddEmployeeDialog } from "@/app/dialogs/AddEmployeeDialog"
import { Pagination } from "@/app/components/common/Pagination"

interface Employee {
    id: number
    name: string
    department: string
    position: string
    salary: string
    status: "active" | "inactive"
}

const initialEmployees: Employee[] = [
    { id: 1, name: "Nguyễn Văn A", department: "IT", position: "Developer", salary: "15,000,000 đ", status: "active" },
    { id: 2, name: "Trần Thị B", department: "HR", position: "HR Manager", salary: "18,000,000 đ", status: "active" },
    { id: 3, name: "Lê Văn C", department: "IT", position: "Team Lead", salary: "22,000,000 đ", status: "active" },
    { id: 4, name: "Phạm Thị D", department: "Marketing", position: "Marketing Executive", salary: "12,000,000 đ", status: "active" },
    { id: 5, name: "Hoàng Văn E", department: "Sales", position: "Sales Manager", salary: "20,000,000 đ", status: "active" },
    { id: 6, name: "Võ Thị F", department: "IT", position: "Developer", salary: "16,000,000 đ", status: "active" },
    { id: 7, name: "Đỗ Văn G", department: "HR", position: "HR Staff", salary: "10,000,000 đ", status: "inactive" },
    { id: 8, name: "Bùi Thị H", department: "Marketing", position: "Content Writer", salary: "11,000,000 đ", status: "active" },
    { id: 9, name: "Phan Văn I", department: "Sales", position: "Sales Executive", salary: "13,000,000 đ", status: "active" },
    { id: 10, name: "Lý Thị K", department: "IT", position: "QA Tester", salary: "14,000,000 đ", status: "active" },
]

type Toast = { type: "success" | "info" | "danger"; message: string } | null

export function EmployeeTable() {
    // data
    const [employees, setEmployees] = React.useState<Employee[]>(initialEmployees)

    // search/filter/pagination
    const [searchQuery, setSearchQuery] = React.useState("")
    const [departmentFilter, setDepartmentFilter] = React.useState("all")
    const [statusFilter, setStatusFilter] = React.useState("all")
    const [currentPage, setCurrentPage] = React.useState(1)
    const itemsPerPage = 5

    // dialogs
    const [openAddEmployee, setOpenAddEmployee] = React.useState(false)

    const [showEditDialog, setShowEditDialog] = React.useState(false)
    const [editing, setEditing] = React.useState<Employee | null>(null)
    const [editForm, setEditForm] = React.useState<Employee | null>(null)

    const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
    const [deleting, setDeleting] = React.useState<Employee | null>(null)

    const [showExportDialog, setShowExportDialog] = React.useState(false)

    // mini toast
    const [toast, setToast] = React.useState<Toast>(null)
    const pushToast = React.useCallback((t: NonNullable<Toast>) => {
        setToast(t)
        window.setTimeout(() => setToast(null), 2200)
    }, [])

    // reset page when filters change
    React.useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery, departmentFilter, statusFilter])

    // filter
    const filteredEmployees = React.useMemo(() => {
        const q = searchQuery.trim().toLowerCase()
        return employees.filter((emp) => {
            const matchesSearch =
                q === "" ||
                emp.name.toLowerCase().includes(q) ||
                emp.department.toLowerCase().includes(q) ||
                emp.position.toLowerCase().includes(q)

            const matchesDepartment = departmentFilter === "all" || emp.department === departmentFilter
            const matchesStatus = statusFilter === "all" || emp.status === statusFilter

            return matchesSearch && matchesDepartment && matchesStatus
        })
    }, [employees, searchQuery, departmentFilter, statusFilter])

    // pagination
    const totalPagesRaw = Math.ceil(filteredEmployees.length / itemsPerPage)
    const totalPages = Math.max(1, totalPagesRaw)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const currentEmployees = filteredEmployees.slice(startIndex, endIndex)

    // clamp page when deleting makes total pages smaller
    React.useEffect(() => {
        const tp = Math.max(1, Math.ceil(filteredEmployees.length / itemsPerPage))
        if (currentPage > tp) setCurrentPage(tp)
    }, [filteredEmployees.length, currentPage])

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) setCurrentPage(page)
    }

    // ===== Actions: Edit / Delete / Export =====
    const openEdit = (emp: Employee) => {
        setEditing(emp)
        setEditForm({ ...emp }) // ✅ copy to avoid mutating
        setShowEditDialog(true)
    }

    const saveEdit = () => {
        if (!editForm) return

        setEmployees((prev) => prev.map((e) => (e.id === editForm.id ? editForm : e)))
        setShowEditDialog(false)
        setEditing(null)
        setEditForm(null)
        pushToast({ type: "success", message: "Đã cập nhật nhân viên." })
    }

    const openDelete = (emp: Employee) => {
        setDeleting(emp)
        setShowDeleteDialog(true)
    }

    const confirmDelete = () => {
        if (!deleting) return

        setEmployees((prev) => prev.filter((e) => e.id !== deleting.id))
        setShowDeleteDialog(false)
        pushToast({ type: "success", message: `Đã xóa ${deleting.name}.` })
        setDeleting(null)
    }

    const exportToCSV = (rows: Employee[]) => {
        // Excel mở CSV bình thường
        const header = ["ID", "Tên", "Phòng ban", "Chức vụ", "Lương", "Trạng thái"]
        const body = rows.map((e) => [
            e.id,
            e.name,
            e.department,
            e.position,
            e.salary,
            e.status === "active" ? "Đang làm việc" : "Nghỉ phép",
        ])

        const escape = (v: unknown) => {
            const s = String(v ?? "")
            if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
            return s
        }

        const csv = [header, ...body].map((r) => r.map(escape).join(",")).join("\n")
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)

        const a = document.createElement("a")
        a.href = url
        a.download = `employees_${new Date().toISOString().slice(0, 10)}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)

        URL.revokeObjectURL(url)
    }

    const confirmExport = () => {
        exportToCSV(filteredEmployees)
        setShowExportDialog(false)
        pushToast({ type: "info", message: `Đã xuất ${filteredEmployees.length} nhân viên (CSV).` })
    }

    return (
        <div className="space-y-6">
            {/* Toast mini */}
            {toast && (
                <div
                    className={[
                        "fixed top-4 right-4 z-50 rounded-xl border px-4 py-3 shadow-lg",
                        toast.type === "success" ? "bg-green-50 border-green-200 text-green-800" : "",
                        toast.type === "info" ? "bg-blue-50 border-blue-200 text-blue-800" : "",
                        toast.type === "danger" ? "bg-red-50 border-red-200 text-red-800" : "",
                    ].join(" ")}
                >
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Quản lý nhân viên</h1>
                    <p className="text-gray-500 mt-1">Quản lý thông tin và hồ sơ nhân viên</p>
                </div>

                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => setShowExportDialog(true)}
                        disabled={filteredEmployees.length === 0}
                        title={filteredEmployees.length === 0 ? "Không có dữ liệu để xuất" : ""}
                    >
                        <Download className="size-4" />
                        Xuất Excel
                    </Button>

                    <Button
                        onClick={() => setOpenAddEmployee(true)}
                        className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    >
                        <Plus className="size-4" />
                        Thêm nhân viên
                    </Button>
                </div>
            </div>

            {/* Stats Cards (giữ nguyên UI của bạn) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-blue-100 text-sm">Tổng nhân viên</p>
                            <p className="text-3xl font-bold mt-2">125</p>
                            <p className="text-sm text-blue-100 mt-1">+5 tháng này</p>
                        </div>
                        <div className="size-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">👥</div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-green-100 text-sm">Đang làm việc</p>
                            <p className="text-3xl font-bold mt-2">118</p>
                            <p className="text-sm text-green-100 mt-1">94.4% tỷ lệ</p>
                        </div>
                        <div className="size-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">✅</div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-orange-100 text-sm">Nghỉ phép</p>
                            <p className="text-3xl font-bold mt-2">7</p>
                            <p className="text-sm text-orange-100 mt-1">Hôm nay</p>
                        </div>
                        <div className="size-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">📅</div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-purple-100 text-sm">Phòng ban</p>
                            <p className="text-3xl font-bold mt-2">8</p>
                            <p className="text-sm text-purple-100 mt-1">Đang hoạt động</p>
                        </div>
                        <div className="size-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">🏢</div>
                    </div>
                </div>
            </div>

            {/* Search and Filter */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                        <Input
                            placeholder="Tìm kiếm theo tên, phòng ban, chức vụ..."
                            className="pl-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <select
                        className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={departmentFilter}
                        onChange={(e) => setDepartmentFilter(e.target.value)}
                    >
                        <option value="all">Tất cả phòng ban</option>
                        <option value="IT">IT</option>
                        <option value="HR">HR</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Sales">Sales</option>
                    </select>

                    <select
                        className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">Tất cả trạng thái</option>
                        <option value="active">Đang làm việc</option>
                        <option value="inactive">Nghỉ phép</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ID</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tên</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Phòng ban</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Chức vụ</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Lương</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Trạng thái</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Hành động</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-200">
                            {currentEmployees.length === 0 ? (
                                <tr>
                                    <td className="px-6 py-6 text-sm text-gray-500" colSpan={7}>
                                        Không có nhân viên phù hợp.
                                    </td>
                                </tr>
                            ) : (
                                currentEmployees.map((employee) => (
                                    <tr key={employee.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{employee.id}</td>

                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="size-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold shadow-md">
                                                    {employee.name.charAt(0)}
                                                </div>
                                                <span className="text-sm font-medium text-gray-900">{employee.name}</span>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{employee.department}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{employee.position}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{employee.salary}</td>

                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <Badge
                                                variant={employee.status === "active" ? "default" : "secondary"}
                                                className={employee.status === "active" ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-gray-300"}
                                            >
                                                {employee.status === "active" ? "Đang làm việc" : "Nghỉ phép"}
                                            </Badge>
                                        </td>

                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                    onClick={() => openEdit(employee)}
                                                >
                                                    <Edit className="size-4" />
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => openDelete(employee)}
                                                >
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-200 px-6 py-4">
                <p className="text-sm text-gray-600">
                    Hiển thị{" "}
                    <span className="font-medium">
                        {filteredEmployees.length === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, filteredEmployees.length)}
                    </span>{" "}
                    trong tổng số <span className="font-medium">{filteredEmployees.length}</span> nhân viên
                </p>

                <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(filteredEmployees.length / itemsPerPage)}
                    onPageChange={handlePageChange}
                />
            </div>

            {/* Add (giữ dialog riêng của bạn) */}
            <AddEmployeeDialog open={openAddEmployee} onOpenChange={setOpenAddEmployee} />

            {/* ===== Edit Dialog (đẹp như figma) ===== */}
            <Dialog
                open={showEditDialog}
                onOpenChange={(open) => {
                    setShowEditDialog(open)
                    if (!open) {
                        setEditing(null)
                        setEditForm(null)
                    }
                }}
            >
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Sửa thông tin nhân viên</DialogTitle>
                        <DialogDescription>
                            Cập nhật thông tin nhân viên <span className="font-medium">{editing?.name}</span>.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Tên</Label>
                            <Input
                                className="col-span-3"
                                value={editForm?.name ?? ""}
                                onChange={(e) => setEditForm((p) => (p ? { ...p, name: e.target.value } : p))}
                            />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Phòng ban</Label>
                            <Input
                                className="col-span-3"
                                value={editForm?.department ?? ""}
                                onChange={(e) => setEditForm((p) => (p ? { ...p, department: e.target.value } : p))}
                            />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Chức vụ</Label>
                            <Input
                                className="col-span-3"
                                value={editForm?.position ?? ""}
                                onChange={(e) => setEditForm((p) => (p ? { ...p, position: e.target.value } : p))}
                            />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Lương</Label>
                            <Input
                                className="col-span-3"
                                value={editForm?.salary ?? ""}
                                onChange={(e) => setEditForm((p) => (p ? { ...p, salary: e.target.value } : p))}
                            />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Trạng thái</Label>
                            <select
                                className="col-span-3 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={editForm?.status ?? "active"}
                                onChange={(e) =>
                                    setEditForm((p) =>
                                        p ? { ...p, status: e.target.value as "active" | "inactive" } : p
                                    )
                                }
                            >
                                <option value="active">Đang làm việc</option>
                                <option value="inactive">Nghỉ phép</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setShowEditDialog(false)}>
                            Hủy
                        </Button>
                        <Button size="sm" onClick={saveEdit} disabled={!editForm?.name?.trim()}>
                            Lưu
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ===== Delete Confirm Dialog ===== */}
            <Dialog
                open={showDeleteDialog}
                onOpenChange={(open) => {
                    setShowDeleteDialog(open)
                    if (!open) setDeleting(null)
                }}
            >
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle>Xóa nhân viên</DialogTitle>
                        <DialogDescription>
                            Bạn có chắc chắn muốn xóa{" "}
                            <span className="font-medium text-gray-900">{deleting?.name}</span>? Hành động này không thể hoàn tác.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setShowDeleteDialog(false)}>
                            Hủy
                        </Button>
                        <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={confirmDelete}>
                            Xóa
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ===== Export Confirm Dialog ===== */}
            <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle>Xuất danh sách</DialogTitle>
                        <DialogDescription>
                            Bạn muốn xuất <span className="font-medium">{filteredEmployees.length}</span> nhân viên theo bộ lọc hiện tại?
                            <br />
                            File xuất ra là <span className="font-medium">CSV</span> (Excel mở được).
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setShowExportDialog(false)}>
                            Hủy
                        </Button>
                        <Button size="sm" onClick={confirmExport}>
                            Xuất
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
