'use client';

import { useEffect, useState } from 'react';
import { User, Phone, Calendar, Briefcase, Edit, Save, X } from 'lucide-react';
import Swal from 'sweetalert2';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { getProfileInitials, useEmployeePortalProfile, type EmployeePortalProfile } from './useEmployeePortalProfile';

interface ProfileState {
  fullName: string;
  employeeId: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  position: string;
  department: string;
  joinDate: string;
  employmentType: string;
  workingStatus: string;
  manager: string;
  education: string;
  major: string;
  skills: string;
  emergencyContact: string;
}

type ProfileField = keyof ProfileState;
type ProfileErrors = Partial<Record<ProfileField, string>>;

const requiredProfileFields: Array<{ field: ProfileField; label: string }> = [
  { field: 'fullName', label: 'Họ và tên' },
  { field: 'email', label: 'Email' },
  { field: 'phone', label: 'Số điện thoại' },
  { field: 'gender', label: 'Giới tính' },
  { field: 'address', label: 'Địa chỉ' },
  { field: 'education', label: 'Trường' },
  { field: 'major', label: 'Chuyên ngành' },
  { field: 'skills', label: 'Kỹ năng' },
  { field: 'emergencyContact', label: 'Liên hệ khẩn cấp' },
];

function trimProfile(profile: ProfileState): ProfileState {
  return Object.fromEntries(
    Object.entries(profile).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]),
  ) as ProfileState;
}

function validateProfile(profile: ProfileState) {
  const nextErrors: ProfileErrors = {};

  requiredProfileFields.forEach(({ field, label }) => {
    if (!profile[field].trim()) {
      nextErrors[field] = `${label} không được bỏ trống.`;
    }
  });

  if (profile.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim())) {
    nextErrors.email = 'Email chưa đúng định dạng.';
  }

  const normalizedPhone = profile.phone.replace(/\s/g, '');
  if (normalizedPhone && !/^(0|\+84)\d{9,10}$/.test(normalizedPhone)) {
    nextErrors.phone = 'Số điện thoại phải bắt đầu bằng 0 hoặc +84 và có 10-11 chữ số.';
  }

  return nextErrors;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs font-medium text-red-600">{message}</p>;
}

function toProfileState(profile: EmployeePortalProfile): ProfileState {
  return {
    fullName: profile.employeeName,
    employeeId: profile.employeeId,
    email: profile.email,
    phone: profile.phone,
    dateOfBirth: profile.dateOfBirth,
    gender: profile.gender,
    address: profile.address,
    position: profile.position,
    department: profile.department,
    joinDate: profile.joinDate,
    employmentType: profile.employmentType,
    workingStatus: profile.status,
    manager: profile.managerName,
    education: profile.education,
    major: profile.major,
    skills: profile.skills,
    emergencyContact: profile.emergencyContact,
  };
}

export function EmployeeProfile() {
  const { profile: portalProfile, loading, saveLocalProfile } = useEmployeePortalProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ProfileErrors>({});
  const [profile, setProfile] = useState<ProfileState>(() => toProfileState(portalProfile));

  useEffect(() => {
    if (isEditing) return;
    const syncTimer = window.setTimeout(() => {
      setProfile(toProfileState(portalProfile));
    }, 0);

    return () => window.clearTimeout(syncTimer);
  }, [isEditing, portalProfile]);

  const updateProfileField = (field: ProfileField, value: string) => {
    setProfile((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const handleSave = () => {
    const normalizedProfile = trimProfile(profile);
    const nextErrors = validateProfile(normalizedProfile);

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      void Swal.fire({
        icon: 'warning',
        title: 'Chưa thể cập nhật hồ sơ',
        html: `Vui lòng kiểm tra các mục bắt buộc:<br/><b>${Object.values(nextErrors).join('<br/>')}</b>`,
        confirmButtonText: 'Kiểm tra lại',
        confirmButtonColor: '#2563eb',
      });
      return;
    }

    setProfile(normalizedProfile);
    setFieldErrors({});

    saveLocalProfile({
      ...portalProfile,
      employeeId: normalizedProfile.employeeId,
      employeeName: normalizedProfile.fullName,
      email: normalizedProfile.email,
      phone: normalizedProfile.phone,
      department: normalizedProfile.department,
      position: normalizedProfile.position,
      status: normalizedProfile.workingStatus,
      managerName: normalizedProfile.manager,
      joinDate: normalizedProfile.joinDate,
      dateOfBirth: normalizedProfile.dateOfBirth,
      gender: normalizedProfile.gender,
      address: normalizedProfile.address,
      employmentType: normalizedProfile.employmentType,
      education: normalizedProfile.education,
      major: normalizedProfile.major,
      skills: normalizedProfile.skills,
      emergencyContact: normalizedProfile.emergencyContact,
    });

    setIsEditing(false);
    void Swal.fire({
      icon: 'success',
      title: 'Cập nhật thành công',
      text: 'Thông tin hồ sơ cá nhân của bạn đã được lưu.',
      confirmButtonText: 'Hoàn tất',
      confirmButtonColor: '#059669',
    });
  };

  const handleCancel = () => {
    setFieldErrors({});
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Hồ sơ cá nhân</h1>
          <p className="text-gray-500 mt-1">
            {loading ? 'Đang đồng bộ thông tin từ database...' : 'Quản lý thông tin cá nhân của bạn'}
          </p>
        </div>
        {!isEditing ? (
          <Button
            className="gap-2 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
            onClick={() => setIsEditing(true)}
          >
            <Edit className="size-4" />
            Chỉnh sửa
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              <X className="size-4 mr-2" />
              Hủy
            </Button>
            <Button
              className="bg-gradient-to-r from-green-600 to-teal-600"
              onClick={handleSave}
            >
              <Save className="size-4 mr-2" />
              Lưu thay đổi
            </Button>
          </div>
        )}
      </div>

      {/* Profile Header Card */}
      <Card className="p-6 bg-gradient-to-br from-green-600 to-teal-600 text-white border-0 shadow-lg">
        <div className="flex items-center gap-6">
          <div className="size-24 shrink-0 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-4xl font-bold">
            {getProfileInitials(profile.fullName)}
          </div>
          <div className="flex-1">
            <h2 className="text-3xl font-bold">{profile.fullName}</h2>
            <p className="text-green-100 mt-2 text-lg">
              {profile.position} • {profile.department}
            </p>
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-green-100">
              <span>📧 {profile.email}</span>
              <span>📱 {profile.phone}</span>
              <span>🆔 {profile.employeeId}</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personal Information */}
        <Card className="lg:col-span-2">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <User className="size-5" />
              Thông tin cá nhân
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label>
                  Họ và tên <span className="text-red-500">*</span>
                </Label>
                {isEditing ? (
                  <>
                    <Input
                      value={profile.fullName}
                      onChange={(e) => updateProfileField('fullName', e.target.value)}
                      aria-invalid={Boolean(fieldErrors.fullName)}
                      className={fieldErrors.fullName ? 'border-red-300 focus-visible:ring-red-200' : undefined}
                    />
                    <FieldError message={fieldErrors.fullName} />
                  </>
                ) : (
                  <p className="mt-2 text-gray-900 font-medium">{profile.fullName}</p>
                )}
              </div>

              <div>
                <Label>Mã nhân viên</Label>
                <p className="mt-2 text-gray-900 font-medium">{profile.employeeId}</p>
              </div>

              <div>
                <Label>
                  Email <span className="text-red-500">*</span>
                </Label>
                {isEditing ? (
                  <>
                    <Input
                      type="email"
                      value={profile.email}
                      onChange={(e) => updateProfileField('email', e.target.value)}
                      aria-invalid={Boolean(fieldErrors.email)}
                      className={fieldErrors.email ? 'border-red-300 focus-visible:ring-red-200' : undefined}
                    />
                    <FieldError message={fieldErrors.email} />
                  </>
                ) : (
                  <p className="mt-2 text-gray-900 font-medium">{profile.email}</p>
                )}
              </div>

              <div>
                <Label>
                  Số điện thoại <span className="text-red-500">*</span>
                </Label>
                {isEditing ? (
                  <>
                    <Input
                      value={profile.phone}
                      onChange={(e) => updateProfileField('phone', e.target.value)}
                      aria-invalid={Boolean(fieldErrors.phone)}
                      className={fieldErrors.phone ? 'border-red-300 focus-visible:ring-red-200' : undefined}
                    />
                    <FieldError message={fieldErrors.phone} />
                  </>
                ) : (
                  <p className="mt-2 text-gray-900 font-medium">{profile.phone}</p>
                )}
              </div>

              <div>
                <Label>Ngày sinh</Label>
                <p className="mt-2 text-gray-900 font-medium">{profile.dateOfBirth}</p>
              </div>

              <div>
                <Label>
                  Giới tính <span className="text-red-500">*</span>
                </Label>
                {isEditing ? (
                  <>
                    <select
                      className={`mt-2 h-10 w-full rounded-md border px-3 text-sm ${
                        fieldErrors.gender ? 'border-red-300 focus-visible:ring-red-200' : 'border-gray-200'
                      }`}
                      value={profile.gender}
                      onChange={(e) => updateProfileField('gender', e.target.value)}
                      aria-invalid={Boolean(fieldErrors.gender)}
                    >
                      <option value="">Chọn giới tính</option>
                      <option>Nam</option>
                      <option>Nữ</option>
                      <option>Khác</option>
                    </select>
                    <FieldError message={fieldErrors.gender} />
                  </>
                ) : (
                  <p className="mt-2 text-gray-900 font-medium">{profile.gender}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <Label>
                  Địa chỉ <span className="text-red-500">*</span>
                </Label>
                {isEditing ? (
                  <>
                    <Textarea
                      value={profile.address}
                      onChange={(e) => updateProfileField('address', e.target.value)}
                      rows={2}
                      aria-invalid={Boolean(fieldErrors.address)}
                      className={fieldErrors.address ? 'border-red-300 focus-visible:ring-red-200' : undefined}
                    />
                    <FieldError message={fieldErrors.address} />
                  </>
                ) : (
                  <p className="mt-2 text-gray-900 font-medium">{profile.address}</p>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Quick Stats */}
        <div className="space-y-6">
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="size-10 shrink-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white">
                <Calendar className="size-5" />
              </div>
              <div>
                <p className="text-xs text-blue-700">Ngày vào làm</p>
                <p className="text-lg font-bold text-blue-900">{profile.joinDate}</p>
              </div>
            </div>
            <p className="text-sm text-blue-700">
              Thâm niên: {Math.floor((new Date().getTime() - new Date('2023-01-01').getTime()) / (1000 * 60 * 60 * 24 * 365))} năm
            </p>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center gap-3">
              <div className="size-10 shrink-0 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center text-white">
                <Briefcase className="size-5" />
              </div>
              <div>
                <p className="text-xs text-green-700">Loại hợp đồng</p>
                <p className="text-lg font-bold text-green-900">{profile.employmentType}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Work Information */}
        <Card>
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Briefcase className="size-5" />
              Thông tin công việc
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-600">Chức vụ</Label>
                  <p className="font-medium text-gray-900 mt-1">{profile.position}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Phòng ban</Label>
                  <p className="font-medium text-gray-900 mt-1">{profile.department}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Quản lý trực tiếp</Label>
                  <p className="font-medium text-gray-900 mt-1">{profile.manager}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Trạng thái</Label>
                  <p className="font-medium text-green-600 mt-1">{profile.workingStatus}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Education & Skills */}
        <Card>
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Học vấn & Kỹ năng</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div>
                <Label className="text-sm text-gray-600">
                  Trường <span className="text-red-500">*</span>
                </Label>
                {isEditing ? (
                  <>
                    <Input
                      value={profile.education}
                      onChange={(e) => updateProfileField('education', e.target.value)}
                      className={`mt-1 ${fieldErrors.education ? 'border-red-300 focus-visible:ring-red-200' : ''}`}
                      aria-invalid={Boolean(fieldErrors.education)}
                    />
                    <FieldError message={fieldErrors.education} />
                  </>
                ) : (
                  <p className="font-medium text-gray-900 mt-1">{profile.education}</p>
                )}
              </div>
              <div>
                <Label className="text-sm text-gray-600">
                  Chuyên ngành <span className="text-red-500">*</span>
                </Label>
                {isEditing ? (
                  <>
                    <Input
                      value={profile.major}
                      onChange={(e) => updateProfileField('major', e.target.value)}
                      className={`mt-1 ${fieldErrors.major ? 'border-red-300 focus-visible:ring-red-200' : ''}`}
                      aria-invalid={Boolean(fieldErrors.major)}
                    />
                    <FieldError message={fieldErrors.major} />
                  </>
                ) : (
                  <p className="font-medium text-gray-900 mt-1">{profile.major}</p>
                )}
              </div>
              <div>
                <Label className="text-sm text-gray-600">
                  Kỹ năng <span className="text-red-500">*</span>
                </Label>
                {isEditing ? (
                  <>
                    <Textarea
                      value={profile.skills}
                      onChange={(e) => updateProfileField('skills', e.target.value)}
                      rows={2}
                      className={`mt-1 ${fieldErrors.skills ? 'border-red-300 focus-visible:ring-red-200' : ''}`}
                      aria-invalid={Boolean(fieldErrors.skills)}
                    />
                    <FieldError message={fieldErrors.skills} />
                  </>
                ) : (
                  <p className="font-medium text-gray-900 mt-1">{profile.skills}</p>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Emergency Contact */}
      <Card>
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Phone className="size-5" />
            Liên hệ khẩn cấp
          </h2>
        </div>
        <div className="p-6">
          <div>
            <Label>
              Người liên hệ & Số điện thoại <span className="text-red-500">*</span>
            </Label>
            {isEditing ? (
              <>
                <Input
                  value={profile.emergencyContact}
                  onChange={(e) => updateProfileField('emergencyContact', e.target.value)}
                  placeholder="Tên người liên hệ - Số điện thoại"
                  className={`mt-2 ${fieldErrors.emergencyContact ? 'border-red-300 focus-visible:ring-red-200' : ''}`}
                  aria-invalid={Boolean(fieldErrors.emergencyContact)}
                />
                <FieldError message={fieldErrors.emergencyContact} />
              </>
            ) : (
              <p className="mt-2 text-gray-900 font-medium">{profile.emergencyContact}</p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
