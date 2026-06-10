'use client';

import { useEffect, useMemo, useState } from 'react';
import { Archive, Edit, Loader2, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  DepartmentOption,
  EmployeeApiItem,
  EmployeePayload,
  PositionOption,
  createEmployee,
  deleteEmployee,
  fetchDepartments,
  fetchEmployees,
  fetchPositions,
  updateEmployee,
} from '@/services/employees';
import type { ManagementRole } from '../types';

const ACTIVE_STATUS = 'Đang làm việc';
const INACTIVE_STATUS = 'Đã nghỉ việc';

interface EmployeeView {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  cccd: string;
  role: string;
  status: string;
  departmentId: number | null;
  departmentName: string;
  positionId: number | null;
  positionTitle: string;
  salaryBase: number;
}

interface EmployeeFormState {
  fullName: string;
  email: string;
  phone: string;
  cccd: string;
  role: string;
  status: string;
  departmentId: string;
  positionId: string;
  salaryBase: string;
  password: string;
}

interface PositionChoice {
  id: string;
  title: string;
}

interface EmployeeTableProps {
  userRole?: ManagementRole;
  departmentScope?: string;
  readOnly?: boolean;
}

const emptyForm: EmployeeFormState = {
  fullName: '',
  email: '',
  phone: '',
  cccd: '',
  role: 'EMPLOYEE',
  status: ACTIVE_STATUS,
  departmentId: '',
  positionId: '',
  salaryBase: '',
  password: '123456',
};

const fallbackPositionsByDepartment: Record<string, string[]> = {
  IT: ['Developer', 'Team Lead', 'QA Tester', 'DevOps Engineer'],
  HR: ['HR Manager', 'HR Staff'],
  Marketing: ['Marketing Manager', 'Marketing Executive', 'Content Writer'],
  Sales: ['Sales Manager', 'Sales Executive', 'Sales Representative'],
  Accounting: ['Chief Accountant', 'Accountant'],
};

function mapEmployee(item: EmployeeApiItem): EmployeeView {
  return {
    id: item.id,
    fullName: item.fullName || 'Chưa có tên',
    email: item.email || '',
    phone: item.phone || '',
    cccd: item.cccd || '',
    role: normalizeRole(item.role),
    status: item.status || ACTIVE_STATUS,
    departmentId: item.departmentId ?? null,
    departmentName: item.departmentName || 'Chưa phân phòng',
    positionId: item.positionId ?? null,
    positionTitle: item.positionTitle || 'Chưa có chức vụ',
    salaryBase: Number(item.salaryBase || 0),
  };
}

function normalizeRole(role: string) {
  const upper = role.toUpperCase();
  if (upper === 'MANAGER' || upper === 'QUẢN LÝ') return 'MANAGER';
  return 'EMPLOYEE';
}

function getRoleLabel(role: string) {
  return normalizeRole(role) === 'MANAGER' ? 'Quản lý' : 'Nhân viên';
}

function toForm(employee: EmployeeView): EmployeeFormState {
  return {
    fullName: employee.fullName,
    email: employee.email,
    phone: employee.phone,
    cccd: employee.cccd,
    role: normalizeRole(employee.role),
    status: employee.status,
    departmentId: employee.departmentId ? String(employee.departmentId) : '',
    positionId: employee.positionId ? String(employee.positionId) : '',
    salaryBase: employee.salaryBase ? formatMoneyInput(String(employee.salaryBase)) : '',
    password: '123456',
  };
}

function toPayload(form: EmployeeFormState): EmployeePayload {
  return {
    fullName: form.fullName.trim(),
    email: form.email.trim(),
    phone: form.phone.trim() || null,
    cccd: form.cccd.trim() || null,
    role: normalizeRole(form.role),
    status: form.status || ACTIVE_STATUS,
    departmentId: form.departmentId ? Number(form.departmentId) : null,
    positionId: form.positionId && !Number.isNaN(Number(form.positionId)) ? Number(form.positionId) : null,
    salaryBase: parseMoney(form.salaryBase),
    password: form.password || '123456',
  };
}

function parseMoney(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits ? Number(digits) : null;
}

function formatMoneyInput(value: string) {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('vi-VN');
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

const toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2200,
  timerProgressBar: true,
});

function getDepartmentName(departments: DepartmentOption[], departmentId: string) {
  return departments.find((department) => String(department.id) === departmentId)?.name || 'Chưa phân phòng';
}

function getPositionTitle(positions: PositionOption[], positionId: string) {
  const fromApi = positions.find((position) => String(position.id) === positionId)?.title;
  return fromApi || positionId || 'Chưa có chức vụ';
}

function buildEmployeeFromForm(
  id: number,
  form: EmployeeFormState,
  departments: DepartmentOption[],
  positions: PositionOption[],
): EmployeeView {
  return {
    id,
    fullName: form.fullName.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    cccd: form.cccd.trim(),
    role: normalizeRole(form.role),
    status: form.status || ACTIVE_STATUS,
    departmentId: form.departmentId ? Number(form.departmentId) : null,
    departmentName: getDepartmentName(departments, form.departmentId),
    positionId: form.positionId && !Number.isNaN(Number(form.positionId)) ? Number(form.positionId) : null,
    positionTitle: getPositionTitle(positions, form.positionId),
    salaryBase: parseMoney(form.salaryBase) || 0,
  };
}

export function EmployeeTable({ userRole = 'admin', departmentScope, readOnly = false }: EmployeeTableProps) {
  const [employees, setEmployees] = useState<EmployeeView[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [positions, setPositions] = useState<PositionOption[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showInactiveDialog, setShowInactiveDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeView | null>(null);
  const [form, setForm] = useState<EmployeeFormState>(emptyForm);

  const itemsPerPage = 8;

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const [employeeList, departmentList, positionList] = await Promise.all([
        fetchEmployees(),
        fetchDepartments(),
        fetchPositions(),
      ]);

      setEmployees(employeeList.map(mapEmployee));
      setDepartments(departmentList);
      setPositions(positionList);
    } catch (err) {
      console.error('Load employees failed:', err);
      setError('Không tải được danh sách nhân viên. Kiểm tra backend hoặc database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const departmentNameById = useMemo(() => {
    return new Map(departments.map((department) => [String(department.id), department.name]));
  }, [departments]);

  const selectedDepartmentName = form.departmentId ? departmentNameById.get(form.departmentId) : '';

  const availablePositions = useMemo<PositionChoice[]>(() => {
    if (!selectedDepartmentName) return [];

    const titles = fallbackPositionsByDepartment[selectedDepartmentName] || [];
    const choices = titles.map((title) => {
      const existing = positions.find((position) => position.title.toLowerCase() === title.toLowerCase());
      return {
        id: existing ? String(existing.id) : title,
        title,
      };
    });

    if (choices.length > 0) return choices;

    return positions.map((position) => ({
      id: String(position.id),
      title: position.title,
    }));
  }, [positions, selectedDepartmentName]);

  const isManagerView = userRole === 'manager';
  const canManageEmployees = userRole === 'admin' && !readOnly;
  const scopedEmployees = useMemo(() => {
    if (!departmentScope) return employees;
    return employees.filter((employee) => employee.departmentName === departmentScope);
  }, [departmentScope, employees]);

  const inactiveEmployees = scopedEmployees.filter((employee) => employee.status === INACTIVE_STATUS);

  const filteredEmployees = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();

    return scopedEmployees.filter((employee) => {
      const matchesSearch =
        !keyword ||
        employee.fullName.toLowerCase().includes(keyword) ||
        employee.email.toLowerCase().includes(keyword) ||
        employee.cccd.toLowerCase().includes(keyword) ||
        employee.departmentName.toLowerCase().includes(keyword) ||
        employee.positionTitle.toLowerCase().includes(keyword);
      const matchesDepartment = Boolean(departmentScope) || departmentFilter === 'all' || employee.departmentName === departmentFilter;
      const matchesStatus = employee.status === ACTIVE_STATUS;
      const matchesRole = roleFilter === 'all' || normalizeRole(employee.role) === roleFilter;

      return matchesSearch && matchesDepartment && matchesStatus && matchesRole;
    });
  }, [departmentFilter, departmentScope, roleFilter, scopedEmployees, searchQuery]);

  const selectedScopeLabel = departmentScope || (departmentFilter === 'all' ? '' : departmentFilter);
  const scopedManagerCount = filteredEmployees.filter((employee) => normalizeRole(employee.role) === 'MANAGER').length;
  const scopedSalary = filteredEmployees.reduce((sum, employee) => sum + employee.salaryBase, 0);
  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentEmployees = filteredEmployees.slice(startIndex, endIndex);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const updateForm = (key: keyof EmployeeFormState, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'departmentId') {
        next.positionId = '';
      }
      return next;
    });
  };

  const handleSalaryChange = (value: string) => {
    updateForm('salaryBase', formatMoneyInput(value));
  };

  const handleOpenAdd = () => {
    setForm(emptyForm);
    setSelectedEmployee(null);
    setShowAddDialog(true);
  };

  const handleOpenEdit = (employee: EmployeeView) => {
    setShowInactiveDialog(false);
    setSelectedEmployee(employee);
    setForm(toForm(employee));
    setShowEditDialog(true);
  };

  const validateForm = () => {
    if (!form.fullName.trim()) return 'Vui lòng nhập họ tên nhân viên.';
    if (!form.email.trim()) return 'Vui lòng nhập email nhân viên.';
    if (!form.cccd.trim()) return 'Vui lòng nhập CCCD.';
    if (!form.departmentId) return 'Vui lòng chọn phòng ban.';
    if (!form.positionId) return 'Vui lòng chọn chức vụ.';
    if (form.cccd.replace(/\D/g, '').length !== 12) return 'CCCD cần đủ 12 chữ số.';
    const currentId = selectedEmployee?.id;
    const normalizedEmail = form.email.trim().toLowerCase();
    const normalizedCccd = form.cccd.trim();
    const duplicatedEmail = employees.some(
      (employee) => employee.id !== currentId && employee.email.trim().toLowerCase() === normalizedEmail
    );
    const duplicatedCccd = employees.some(
      (employee) => employee.id !== currentId && employee.cccd.trim() === normalizedCccd
    );

    if (duplicatedEmail) return 'Email này đã tồn tại trong hệ thống.';
    if (duplicatedCccd) return 'CCCD này đã tồn tại trong hệ thống.';

    return '';
  };

  const handleCreate = async () => {
    const message = validateForm();
    if (message) {
      await Swal.fire({
        icon: 'warning',
        title: 'Thiếu thông tin',
        text: message,
        confirmButtonText: 'Đã hiỒu',
      });
      return;
    }

    setSaving(true);
    try {
      const created = await createEmployee(toPayload({ ...form, status: ACTIVE_STATUS }));
      const fallbackId = employees.length === 0 ? 1 : Math.max(...employees.map((employee) => employee.id)) + 1;
      const createdEmployee = buildEmployeeFromForm(created?.id || fallbackId, { ...form, status: ACTIVE_STATUS }, departments, positions);

      setEmployees((prev) => [createdEmployee, ...prev]);
      setShowAddDialog(false);
      setCurrentPage(1);
      toast.fire({ icon: 'success', title: 'Đã thêm nhân viên' });
    } catch (err) {
      console.error('Create employee failed:', err);
      Swal.fire({
        icon: 'error',
        title: 'Thêm thất bại',
        text: 'Không thêm được nhân viên. Kiểm tra backend hoặc dữ liệu nhập.',
        confirmButtonText: 'Đóng',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedEmployee) return;

    const message = validateForm();
    if (message) {
      await Swal.fire({
        icon: 'warning',
        title: 'Thiếu thông tin',
        text: message,
        confirmButtonText: 'Đã hiỒu',
      });
      return;
    }

    setSaving(true);
    try {
      await updateEmployee(selectedEmployee.id, toPayload(form));
      const updatedEmployee = buildEmployeeFromForm(selectedEmployee.id, form, departments, positions);
      setEmployees((prev) =>
        prev.map((employee) => (employee.id === selectedEmployee.id ? updatedEmployee : employee))
      );
      setShowEditDialog(false);
      toast.fire({ icon: 'success', title: 'Đã cập nhật nhân viên' });
    } catch (err) {
      console.error('Update employee failed:', err);
      Swal.fire({
        icon: 'error',
        title: 'Cập nhật thất bại',
        text: 'Không cập nhật được nhân viên. Kiểm tra backend hoặc dữ liệu nhập.',
        confirmButtonText: 'Đóng',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (employee: EmployeeView) => {
    const result = await Swal.fire({
      icon: 'question',
      title: 'Chuyển vào danh sách đã nghỉ việc?',
      text: employee.fullName,
      showCancelButton: true,
      confirmButtonText: 'ChuyỒn',
      cancelButtonText: 'Hủy',
      confirmButtonColor: '#dc2626',
    });

    if (!result.isConfirmed) return;

    try {
      await deleteEmployee(employee.id);
      setEmployees((prev) =>
        prev.map((item) =>
          item.id === employee.id ? { ...item, status: INACTIVE_STATUS } : item
        )
      );
      toast.fire({ icon: 'success', title: 'Đã chuyển vào danh sách nghỉ việc' });
    } catch (err) {
      console.error('Delete employee failed:', err);
      Swal.fire({
        icon: 'error',
        title: 'Thao tác thất bại',
        text: 'Không cập nhật được trạng thái nhân viên.',
        confirmButtonText: 'Đóng',
      });
    }
  };

  const renderEmployeeDialog = (mode: 'add' | 'edit') => (
    <DialogContent className="sm:max-w-[620px]">
      <DialogHeader>
        <DialogTitle>{mode === 'add' ? 'Thêm nhân viên mới' : 'Sửa thông tin nhân viên'}</DialogTitle>
        <DialogDescription>
          {mode === 'add'
            ? 'Nhân viên mới luôn được tạo ở trạng thái đang làm việc.'
            : `Cập nhật thông tin của ${selectedEmployee?.fullName || 'nhân viên'}.`}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${mode}-fullName`}>Họ tên</Label>
          <Input id={`${mode}-fullName`} value={form.fullName} onChange={(event) => updateForm('fullName', event.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${mode}-email`}>Email</Label>
          <Input id={`${mode}-email`} value={form.email} onChange={(event) => updateForm('email', event.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${mode}-phone`}>Số điện thoại</Label>
          <Input id={`${mode}-phone`} value={form.phone} onChange={(event) => updateForm('phone', event.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${mode}-cccd`}>CCCD</Label>
          <Input
            id={`${mode}-cccd`}
            inputMode="numeric"
            maxLength={12}
            value={form.cccd}
            onChange={(event) => updateForm('cccd', event.target.value.replace(/\D/g, ''))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${mode}-salary`}>Lương cơ bản</Label>
          <Input
            id={`${mode}-salary`}
            inputMode="numeric"
            value={form.salaryBase}
            onChange={(event) => handleSalaryChange(event.target.value)}
            placeholder="15.000.000"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${mode}-role`}>Vai trò</Label>
          <select
            id={`${mode}-role`}
            value={form.role}
            onChange={(event) => updateForm('role', event.target.value)}
            className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
          >
            <option value="EMPLOYEE">Nhân viên</option>
            <option value="MANAGER">Quản lý</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${mode}-department`}>Phòng ban</Label>
          <select
            id={`${mode}-department`}
            value={form.departmentId}
            onChange={(event) => updateForm('departmentId', event.target.value)}
            className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
          >
            <option value="">Chọn phòng ban</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${mode}-position`}>Chức vụ</Label>
          <select
            id={`${mode}-position`}
            value={form.positionId}
            onChange={(event) => updateForm('positionId', event.target.value)}
            disabled={!form.departmentId}
            className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm disabled:bg-gray-100"
          >
            <option value="">{form.departmentId ? 'Chọn chức vụ' : 'Chọn phòng ban trước'}</option>
            {availablePositions.map((position) => (
              <option key={position.id} value={position.id}>
                {position.title}
              </option>
            ))}
          </select>
        </div>

        {mode === 'add' && (
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="add-password">Mật khẩu mặc định</Label>
            <Input id="add-password" value={form.password} onChange={(event) => updateForm('password', event.target.value)} />
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => (mode === 'add' ? setShowAddDialog(false) : setShowEditDialog(false))}>
          Hủy
        </Button>
        <Button size="sm" onClick={mode === 'add' ? handleCreate : handleSaveEdit} disabled={saving}>
          {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
          {mode === 'add' ? 'Thêm' : 'Lưu'}
        </Button>
      </div>
    </DialogContent>
  );

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col gap-5 pb-24">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{isManagerView ? 'Nhân viên phòng ban' : 'Quản lý nhân viên'}</h1>
          <p className="mt-1 text-gray-500">
            {isManagerView
              ? `Manager chỉ xem nhân viên thuộc phòng ban ${departmentScope || 'được phân quyền'} và dùng dữ liệu này để theo dõi năng lực team.`
              : 'Danh sách nhân viên đang làm việc, phòng ban, chức vụ và lương cơ bản'}
          </p>
        </div>
        <div className="flex gap-2">
          {!isManagerView && (
            <Button variant="outline" className="gap-2" onClick={() => setShowInactiveDialog(true)}>
              <Archive className="size-4" />
              Đã nghỉ việc ({inactiveEmployees.length})
            </Button>
          )}
          <Button variant="outline" className="gap-2" onClick={loadData} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
          {canManageEmployees && (
            <Button className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600" onClick={handleOpenAdd}>
              <Plus className="size-4" />
              Thêm nhân viên
            </Button>
          )}
        </div>
      </div>

      {isManagerView && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Chế độ Manager: dữ liệu được giới hạn theo phòng ban {departmentScope}. Các thao tác thêm, sửa và chuyển nghỉ việc thuộc quyền Admin/HR.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        <Card className="!gap-2 !px-4 !py-3">
          <p className="text-xs text-gray-500">
            Tổng nhân viên {selectedScopeLabel && <strong className="text-gray-900">{selectedScopeLabel}</strong>}
          </p>
          <p className="text-2xl font-bold text-gray-900">{filteredEmployees.length}</p>
        </Card>
        <Card className="!gap-2 !px-4 !py-3">
          <p className="text-xs text-gray-500">
            Quản lý {selectedScopeLabel && <strong className="text-gray-900">{selectedScopeLabel}</strong>}
          </p>
          <p className="text-2xl font-bold text-emerald-600">{scopedManagerCount}</p>
        </Card>
        <Card className="!gap-2 !px-4 !py-3">
          <p className="text-xs text-gray-500">
            Tổng lương {selectedScopeLabel && <strong className="text-gray-900">{selectedScopeLabel}</strong>}
          </p>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(scopedSalary)}</p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Tìm theo tên, email, CCCD, phòng ban, chức vụ..."
              className="pl-10"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
          {departmentScope ? (
            <div className="flex h-10 items-center rounded-md border border-blue-200 bg-blue-50 px-3 text-sm font-medium text-blue-700">
              Phòng ban: {departmentScope}
            </div>
          ) : (
            <select className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm" value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
              <option value="all">Tất cả phòng ban</option>
              {Array.from(new Set(employees.map((employee) => employee.departmentName))).map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          )}
          <select className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
            <option value="all">Tất cả vai trò</option>
            <option value="EMPLOYEE">Nhân viên</option>
            <option value="MANAGER">Quản lý</option>
          </select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="hide-scrollbar overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">Nhân viên</th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">Liên hệ</th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">CCCD</th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">Phòng ban</th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">Chức vụ</th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">Vai trò</th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">Lương</th>
                <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-600">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-gray-500">
                    <Loader2 className="mx-auto mb-3 size-6 animate-spin text-blue-600" />
                    Đang tải dữ liệu nhân viên...
                  </td>
                </tr>
              ) : currentEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-gray-500">
                    Không có nhân viên phù hợp.
                  </td>
                </tr>
              ) : (
                currentEmployees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-600 font-semibold text-white">
                          {employee.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{employee.fullName}</p>
                          <p className="text-xs text-gray-500">ID: {employee.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-700">
                      <p>{employee.email}</p>
                      <p className="text-xs text-gray-500">{employee.phone || 'Chưa có SĐT'}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-700">{employee.cccd || 'Chưa có'}</td>
                    <td className="px-5 py-4 text-sm text-gray-700">{employee.departmentName}</td>
                    <td className="px-5 py-4 text-sm text-gray-700">{employee.positionTitle}</td>
                    <td className="px-5 py-4">
                      <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">{getRoleLabel(employee.role)}</Badge>
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-gray-900">{formatCurrency(employee.salaryBase)}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {canManageEmployees ? (
                          <Button variant="ghost" size="sm" className="text-blue-600 hover:bg-blue-50 hover:text-blue-700" onClick={() => handleOpenEdit(employee)}>
                            <Edit className="size-4" />
                          </Button>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100">Chỉ xem</Badge>
                        )}
                        {canManageEmployees && employee.status === ACTIVE_STATUS && (
                          <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => handleDelete(employee)}>
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 z-40 flex flex-col gap-3 border border-gray-200 bg-white/95 px-5 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur md:flex-row md:items-center md:justify-between lg:left-64">
        <p className="text-sm text-gray-600">
          Hiển thị <span className="font-medium">{filteredEmployees.length === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, filteredEmployees.length)}</span> trong tổng số{' '}
          <span className="font-medium">{filteredEmployees.length}</span> nhân viên
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>
            Trước
          </Button>
          <Button variant="outline" size="sm" disabled>
            {currentPage}/{totalPages}
          </Button>
          <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}>
            Sau
          </Button>
        </div>
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        {renderEmployeeDialog('add')}
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        {renderEmployeeDialog('edit')}
      </Dialog>

      <Dialog open={showInactiveDialog} onOpenChange={setShowInactiveDialog}>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>Nhân viên đã nghỉ việc</DialogTitle>
            <DialogDescription>Danh sách này được tách riêng để màn hình chính tập trung vào nhân sự đang làm việc.</DialogDescription>
          </DialogHeader>
          <div className="hide-scrollbar max-h-[420px] overflow-y-auto rounded-lg border border-gray-100">
            {inactiveEmployees.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">Chưa có nhân viên đã nghỉ việc.</div>
            ) : (
              inactiveEmployees.map((employee) => (
                <div key={employee.id} className="flex items-center justify-between border-b border-gray-100 p-4 last:border-b-0">
                  <div>
                    <p className="font-medium text-gray-900">{employee.fullName}</p>
                    <p className="text-sm text-gray-500">{employee.departmentName} · {employee.positionTitle}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleOpenEdit(employee)}>
                    Xem/Sửa
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
