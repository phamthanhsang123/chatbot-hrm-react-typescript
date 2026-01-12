import { Edit, Trash2, Search, Plus, Download } from 'lucide-react';
import { Button } from "./ui/button"
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { AddEmployeeDialog } from '@/app/dialogs/AddEmployeeDialog';
import React from 'react';
import { Pagination } from "@/app/components/common/Pagination"

interface Employee {
    id: number;
    name: string;
    department: string;
    position: string;
    salary: string;
    status: 'active' | 'inactive';
}

export function EmployeeTable() {

    const [openAddEmployee, setOpenAddEmployee] = React.useState(false)
    const [currentPage, setCurrentPage] = React.useState(1)
    const itemsPerPage = 5
    const filteredEmployees = employees
    const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage

    const paginatedEmployees = filteredEmployees.slice(startIndex, endIndex)




    const employees: Employee[] = [
        { id: 1, name: 'Nguyễn Văn A', department: 'IT', position: 'Developer', salary: '15,000,000 đ', status: 'active' },
        { id: 2, name: 'Trần Thị B', department: 'HR', position: 'HR Manager', salary: '18,000,000 đ', status: 'active' },
        { id: 3, name: 'Lê Văn C', department: 'IT', position: 'Team Lead', salary: '22,000,000 đ', status: 'active' },
        { id: 4, name: 'Phạm Thị D', department: 'Marketing', position: 'Marketing Executive', salary: '12,000,000 đ', status: 'active' },
        { id: 5, name: 'Hoàng Văn E', department: 'Sales', position: 'Sales Manager', salary: '20,000,000 đ', status: 'active' },
    ];

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Quản lý nhân viên</h1>
                    <p className="text-gray-500 mt-1">Quản lý thông tin và hồ sơ nhân viên</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2">
                        <Download className="size-4" />
                        Xuất Excel
                    </Button>
                    <Button
                        onClick={() => setOpenAddEmployee(true)}
                        className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                        <Plus className="size-4" />
                        Thêm nhân viên
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-blue-100 text-sm">Tổng nhân viên</p>
                            <p className="text-3xl font-bold mt-2">125</p>
                            <p className="text-sm text-blue-100 mt-1">+5 tháng này</p>
                        </div>
                        <div className="size-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                            👥
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-green-100 text-sm">Đang làm việc</p>
                            <p className="text-3xl font-bold mt-2">118</p>
                            <p className="text-sm text-green-100 mt-1">94.4% tỷ lệ</p>
                        </div>
                        <div className="size-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                            ✅
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-orange-100 text-sm">Nghỉ phép</p>
                            <p className="text-3xl font-bold mt-2">7</p>
                            <p className="text-sm text-orange-100 mt-1">Hôm nay</p>
                        </div>
                        <div className="size-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                            📅
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-purple-100 text-sm">Phòng ban</p>
                            <p className="text-3xl font-bold mt-2">8</p>
                            <p className="text-sm text-purple-100 mt-1">Đang hoạt động</p>
                        </div>
                        <div className="size-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                            🏢
                        </div>
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
                        />
                    </div>
                    <select className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option>Tất cả phòng ban</option>
                        <option>IT</option>
                        <option>HR</option>
                        <option>Marketing</option>
                        <option>Sales</option>
                    </select>
                    <select className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option>Tất cả trạng thái</option>
                        <option>Đang làm việc</option>
                        <option>Nghỉ phép</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    ID
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Tên
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Phòng ban
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Chức vụ
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Lương
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Trạng thái
                                </th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Hành động
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {employees.map((employee) => (
                                <tr key={employee.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {employee.id}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="size-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold shadow-md">
                                                {employee.name.charAt(0)}
                                            </div>
                                            <span className="text-sm font-medium text-gray-900">{employee.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {employee.department}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {employee.position}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {employee.salary}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <Badge
                                            variant={employee.status === 'active' ? 'default' : 'secondary'}
                                            className={employee.status === 'active' ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}
                                        >
                                            {employee.status === 'active' ? 'Đang làm việc' : 'Nghỉ phép'}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                            >
                                                <Edit className="size-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-200 px-6 py-4">
                <p className="text-sm text-gray-600">
                    Hiển thị{" "}
                    <span className="font-medium">
                        {startIndex + 1}-{Math.min(endIndex, filteredEmployees.length)}
                    </span>{" "}
                    trong tổng số{" "}
                    <span className="font-medium">{filteredEmployees.length}</span> nhân viên
                </p>

                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                />
            </div>

            <AddEmployeeDialog
                open={openAddEmployee}
                onOpenChange={setOpenAddEmployee}
            />
        </div>
    );
}
