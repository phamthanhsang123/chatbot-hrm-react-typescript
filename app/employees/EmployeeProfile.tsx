'use client';

import { useState } from 'react';
import { User, Mail, Phone, MapPin, Calendar, Briefcase, Edit, Save, X } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';

export function EmployeeProfile() {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    // Personal Info
    fullName: 'Nguyễn Văn B',
    employeeId: 'NV001',
    email: 'employee@company.com',
    phone: '0123456789',
    dateOfBirth: '15/05/1995',
    gender: 'Nam',
    address: '123 Nguyễn Huệ, Quận 1, TP.HCM',
    
    // Work Info
    position: 'Developer',
    department: 'IT',
    joinDate: '01/01/2023',
    employmentType: 'Toàn thời gian',
    workingStatus: 'Đang làm việc',
    manager: 'Trần Văn A',
    
    // Additional Info
    education: 'Đại học Bách Khoa',
    major: 'Công nghệ thông tin',
    skills: 'React, Node.js, Python, SQL',
    emergencyContact: 'Nguyễn Thị C - 0987654321',
  });

  const handleSave = () => {
    alert('✅ Đã cập nhật hồ sơ thành công!');
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Hồ sơ cá nhân</h1>
          <p className="text-gray-500 mt-1">Quản lý thông tin cá nhân của bạn</p>
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
            {profile.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
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
                <Label>Họ và tên</Label>
                {isEditing ? (
                  <Input
                    value={profile.fullName}
                    onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                  />
                ) : (
                  <p className="mt-2 text-gray-900 font-medium">{profile.fullName}</p>
                )}
              </div>

              <div>
                <Label>Mã nhân viên</Label>
                <p className="mt-2 text-gray-900 font-medium">{profile.employeeId}</p>
              </div>

              <div>
                <Label>Email</Label>
                {isEditing ? (
                  <Input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  />
                ) : (
                  <p className="mt-2 text-gray-900 font-medium">{profile.email}</p>
                )}
              </div>

              <div>
                <Label>Số điện thoại</Label>
                {isEditing ? (
                  <Input
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  />
                ) : (
                  <p className="mt-2 text-gray-900 font-medium">{profile.phone}</p>
                )}
              </div>

              <div>
                <Label>Ngày sinh</Label>
                <p className="mt-2 text-gray-900 font-medium">{profile.dateOfBirth}</p>
              </div>

              <div>
                <Label>Giới tính</Label>
                {isEditing ? (
                  <select
                    className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm mt-2"
                    value={profile.gender}
                    onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                  >
                    <option>Nam</option>
                    <option>Nữ</option>
                    <option>Khác</option>
                  </select>
                ) : (
                  <p className="mt-2 text-gray-900 font-medium">{profile.gender}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <Label>Địa chỉ</Label>
                {isEditing ? (
                  <Textarea
                    value={profile.address}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                    rows={2}
                  />
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
                <Label className="text-sm text-gray-600">Trường</Label>
                {isEditing ? (
                  <Input
                    value={profile.education}
                    onChange={(e) => setProfile({ ...profile, education: e.target.value })}
                    className="mt-1"
                  />
                ) : (
                  <p className="font-medium text-gray-900 mt-1">{profile.education}</p>
                )}
              </div>
              <div>
                <Label className="text-sm text-gray-600">Chuyên ngành</Label>
                {isEditing ? (
                  <Input
                    value={profile.major}
                    onChange={(e) => setProfile({ ...profile, major: e.target.value })}
                    className="mt-1"
                  />
                ) : (
                  <p className="font-medium text-gray-900 mt-1">{profile.major}</p>
                )}
              </div>
              <div>
                <Label className="text-sm text-gray-600">Kỹ năng</Label>
                {isEditing ? (
                  <Textarea
                    value={profile.skills}
                    onChange={(e) => setProfile({ ...profile, skills: e.target.value })}
                    rows={2}
                    className="mt-1"
                  />
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
            <Label>Người liên hệ & Số điện thoại</Label>
            {isEditing ? (
              <Input
                value={profile.emergencyContact}
                onChange={(e) => setProfile({ ...profile, emergencyContact: e.target.value })}
                placeholder="Tên người liên hệ - Số điện thoại"
                className="mt-2"
              />
            ) : (
              <p className="mt-2 text-gray-900 font-medium">{profile.emergencyContact}</p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
