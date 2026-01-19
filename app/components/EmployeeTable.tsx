'use client';
import { Edit, Trash2, Search, Plus, Download } from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Label } from './ui/label';

interface Employee {
  id: number;
  name: string;
  department: string;
  position: string;
  role: 'manager' | 'staff';
  salary: string;
  status: 'active' | 'inactive';
  email: string;
}

const allEmployees: Employee[] = [
  { id: 1, name: 'Nguyễn Văn A', department: 'IT', position: 'Developer', role: 'staff', salary: '15,000,000 đ', status: 'active', email: 'nguyenvana@example.com' },
  { id: 2, name: 'Trần Thị B', department: 'HR', position: 'HR Manager', role: 'manager', salary: '18,000,000 đ', status: 'active', email: 'tranthib@example.com' },
  { id: 3, name: 'Lê Văn C', department: 'IT', position: 'Team Lead', role: 'manager', salary: '22,000,000 đ', status: 'active', email: 'levanc@example.com' },
  { id: 4, name: 'Phạm Thị D', department: 'Marketing', position: 'Marketing Executive', role: 'staff', salary: '12,000,000 đ', status: 'active', email: 'phamthid@example.com' },
  { id: 5, name: 'Hoàng Văn E', department: 'Sales', position: 'Sales Manager', role: 'manager', salary: '20,000,000 đ', status: 'active', email: 'hoangvane@example.com' },
  { id: 6, name: 'Võ Thị F', department: 'IT', position: 'Developer', role: 'staff', salary: '16,000,000 đ', status: 'active', email: 'vothif@example.com' },
  { id: 7, name: 'Đỗ Văn G', department: 'HR', position: 'HR Staff', role: 'staff', salary: '10,000,000 đ', status: 'inactive', email: 'dovang@example.com' },
  { id: 8, name: 'Bùi Thị H', department: 'Marketing', position: 'Content Writer', role: 'staff', salary: '11,000,000 đ', status: 'active', email: 'buithih@example.com' },
  { id: 9, name: 'Phan Văn I', department: 'Sales', position: 'Sales Executive', role: 'staff', salary: '13,000,000 đ', status: 'active', email: 'phanvani@example.com' },
  { id: 10, name: 'Lý Thị K', department: 'IT', position: 'QA Tester', role: 'staff', salary: '14,000,000 đ', status: 'active', email: 'lythik@example.com' },
  { id: 11, name: 'Ngô Văn L', department: 'Accounting', position: 'Chief Accountant', role: 'manager', salary: '25,000,000 đ', status: 'active', email: 'ngovanl@example.com' },
  { id: 12, name: 'Đặng Thị M', department: 'Accounting', position: 'Accountant', role: 'staff', salary: '13,000,000 đ', status: 'active', email: 'dangthim@example.com' },
  { id: 13, name: 'Tô Văn N', department: 'Marketing', position: 'Marketing Manager', role: 'manager', salary: '19,000,000 đ', status: 'active', email: 'tovann@example.com' },
  { id: 14, name: 'Hồ Thị O', department: 'IT', position: 'DevOps Engineer', role: 'staff', salary: '17,000,000 đ', status: 'active', email: 'hothio@example.com' },
  { id: 15, name: 'Dương Văn P', department: 'Sales', position: 'Sales Representative', role: 'staff', salary: '12,500,000 đ', status: 'active', email: 'duongvanp@example.com' },
];

export function EmployeeTable() {
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const itemsPerPage = 5;

  // Filter employees
  const filteredEmployees = allEmployees.filter((emp) => {
    const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         emp.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         emp.position.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDepartment = departmentFilter === 'all' || emp.department === departmentFilter;
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && emp.status === 'active') ||
                         (statusFilter === 'inactive' && emp.status === 'inactive');
    const matchesRole = roleFilter === 'all' || emp.role === roleFilter;
    
    return matchesSearch && matchesDepartment && matchesStatus && matchesRole;
  });

  // Pagination
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentEmployees = filteredEmployees.slice(startIndex, endIndex);

  const handleEdit = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowEditDialog(true);
  };

  const handleDelete = (employee: Employee) => {
    if (confirm(`Bạn có chắc chắn muốn xóa nhân viên ${employee.name}?`)) {
      alert(`Đã xóa nhân viên ${employee.name}`);
      // Xử lý xóa ở đây
    }
  };

  const handleExportExcel = () => {
    alert('Đang xuất file Excel với ' + filteredEmployees.length + ' nhân viên...');
    // Xử lý export Excel ở đây
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quản lý nhân viên</h1>
          <p className="text-gray-500 mt-1">Quản lý thông tin và hồ sơ nhân viên</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handleExportExcel}>
            <Download className="size-4" />
            Xuất Excel
          </Button>
          <Button className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" onClick={() => setShowAddDialog(true)}>
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
            <option value="all">Tất cả phòng ban</option>
            <option value="IT">IT</option>
            <option value="HR">HR</option>
            <option value="Marketing">Marketing</option>
            <option value="Sales">Sales</option>
            <option value="Accounting">Accounting</option>
          </select>
          <select className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang làm việc</option>
            <option value="inactive">Nghỉ phép</option>
          </select>
          <select className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="all">Tất cả vai trò</option>
            <option value="manager">Quản lý</option>
            <option value="staff">Nhân viên</option>
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
                  Vai trò
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
              {currentEmployees.map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {employee.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="size-10 shrink-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold shadow-md">
                        {employee.name.charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <div className="font-medium text-gray-900">{employee.name}</div>
                        <div className="text-sm text-gray-500">{employee.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {employee.department}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {employee.position}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge 
                      variant={employee.role === 'manager' ? 'default' : 'secondary'}
                      className={employee.role === 'manager' ? 'bg-purple-100 text-purple-700 hover:bg-purple-100' : 'bg-blue-100 text-blue-700 hover:bg-blue-100'}
                    >
                      {employee.role === 'manager' ? 'Quản lý' : 'Nhân viên'}
                    </Badge>
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
                        onClick={() => handleEdit(employee)}
                      >
                        <Edit className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(employee)}
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
          Hiển thị <span className="font-medium">{startIndex + 1}-{Math.min(endIndex, filteredEmployees.length)}</span> trong tổng số <span className="font-medium">{filteredEmployees.length}</span> nhân viên
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)}>
            Trước
          </Button>
          {Array.from({ length: totalPages }, (_, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              className={currentPage === index + 1 ? 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white' : ''}
              onClick={() => handlePageChange(index + 1)}
            >
              {index + 1}
            </Button>
          ))}
          <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => handlePageChange(currentPage + 1)}>
            Sau
          </Button>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Sửa thông tin nhân viên</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin nhân viên {selectedEmployee?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Tên
              </Label>
              <Input
                id="name"
                className="col-span-3"
                value={selectedEmployee?.name || ''}
                onChange={(e) => {
                  if (selectedEmployee) {
                    selectedEmployee.name = e.target.value;
                  }
                }}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="department" className="text-right">
                Phòng ban
              </Label>
              <Input
                id="department"
                className="col-span-3"
                value={selectedEmployee?.department || ''}
                onChange={(e) => {
                  if (selectedEmployee) {
                    selectedEmployee.department = e.target.value;
                  }
                }}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="position" className="text-right">
                Chức vụ
              </Label>
              <Input
                id="position"
                className="col-span-3"
                value={selectedEmployee?.position || ''}
                onChange={(e) => {
                  if (selectedEmployee) {
                    selectedEmployee.position = e.target.value;
                  }
                }}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                Vai trò
              </Label>
              <select
                id="role"
                className="col-span-3 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedEmployee?.role || 'staff'}
                onChange={(e) => {
                  if (selectedEmployee) {
                    selectedEmployee.role = e.target.value as 'manager' | 'staff';
                  }
                }}
              >
                <option value="staff">Nhân viên</option>
                <option value="manager">Quản lý</option>
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="salary" className="text-right">
                Lương
              </Label>
              <Input
                id="salary"
                className="col-span-3"
                value={selectedEmployee?.salary || ''}
                onChange={(e) => {
                  if (selectedEmployee) {
                    selectedEmployee.salary = e.target.value;
                  }
                }}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Trạng thái
              </Label>
              <select
                id="status"
                className="col-span-3 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedEmployee?.status || 'active'}
                onChange={(e) => {
                  if (selectedEmployee) {
                    selectedEmployee.status = e.target.value as 'active' | 'inactive';
                  }
                }}
              >
                <option value="active">Đang làm việc</option>
                <option value="inactive">Nghỉ phép</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEditDialog(false)}
            >
              Hủy
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowEditDialog(false)}
            >
              Lưu
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Thêm nhân viên mới</DialogTitle>
            <DialogDescription>
              Nhập thông tin nhân viên mới.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Tên
              </Label>
              <Input
                id="name"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="department" className="text-right">
                Phòng ban
              </Label>
              <Input
                id="department"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="position" className="text-right">
                Chức vụ
              </Label>
              <Input
                id="position"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                Vai trò
              </Label>
              <select
                id="role"
                className="col-span-3 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                defaultValue="staff"
              >
                <option value="staff">Nhân viên</option>
                <option value="manager">Quản lý</option>
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="salary" className="text-right">
                Lương
              </Label>
              <Input
                id="salary"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Trạng thái
              </Label>
              <select
                id="status"
                className="col-span-3 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                defaultValue="active"
              >
                <option value="active">Đang làm việc</option>
                <option value="inactive">Nghỉ phép</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddDialog(false)}
            >
              Hủy
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowAddDialog(false)}
            >
              Thêm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}