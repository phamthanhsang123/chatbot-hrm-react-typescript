'use client';

import { useState } from 'react';
import { BriefcaseBusiness, Eye, EyeOff, Lock, LogIn, Mail, Shield, Sparkles, UserRound } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import type { UserRole } from '../types';
import { API_BASE } from '@/services/apiBase';

interface LoginProps {
  onLogin: (role: UserRole) => void;
}

type Particle = {
  left: number;
  top: number;
  delay: number;
  duration: number;
};

const particles: Particle[] = Array.from({ length: 20 }, (_, index) => ({
  left: (index * 37) % 100,
  top: (index * 53) % 100,
  delay: (index % 5) * 0.7,
  duration: 6 + (index % 7),
}));

const mapApiRole = (role?: string): UserRole => {
  const normalizedRole = (role || '').trim().toUpperCase();

  if (normalizedRole === 'ADMIN' || normalizedRole === 'QUAN_TRI' || normalizedRole === 'QUẢN TRỊ') {
    return 'admin';
  }

  if (normalizedRole === 'MANAGER' || normalizedRole === 'QUAN_LY' || normalizedRole === 'QUẢN LÝ') {
    return 'manager';
  }

  return 'employee';
};

export function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [message, setMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setSelectedRole(null);

    if (!email.trim() || !password) {
      setMessage('Vui lòng nhập email và mật khẩu.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: email.trim(),
          password,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        const errorMessage = data?.message || `Đăng nhập thất bại (${response.status}).`;
        console.error('Login failed:', errorMessage, data);
        setMessage(errorMessage);
        return;
      }

      if (data.token) {
        localStorage.setItem('hrm_token', data.token);
      }
      localStorage.setItem('hrm_role', data.role || '');
      const employeeId = Number(data.employeeId || data.user?.employeeId || data.id);
      if (Number.isFinite(employeeId) && employeeId > 0) {
        localStorage.setItem('hrm_employee_id', String(employeeId));
      } else {
        localStorage.removeItem('hrm_employee_id');
      }

      if (typeof data.fullName === 'string' && data.fullName.trim()) {
        localStorage.setItem('hrm_employee_name', data.fullName.trim());
      } else {
        localStorage.removeItem('hrm_employee_name');
      }

      if (typeof data.departmentName === 'string' && data.departmentName.trim()) {
        localStorage.setItem('hrm_employee_department', data.departmentName.trim());
      } else {
        localStorage.removeItem('hrm_employee_department');
      }

      onLogin(mapApiRole(data.role));
    } catch (error) {
      console.error('Login request error:', error);
      setMessage(`Không kết nối được API đăng nhập (${API_BASE}). Kiểm tra backend đang chạy chưa.`);
    } finally {
      setIsLoading(false);
    }
  };

  const resetPasswordByEmail = async () => {
    setMessage('');

    if (!email.trim()) {
      setMessage('Nhập email trước khi dùng chức năng quên mật khẩu.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/admin/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json().catch(() => null);
      setMessage(data?.message || (response.ok ? 'Đã gửi yêu cầu đặt lại mật khẩu.' : 'Không thể đặt lại mật khẩu.'));
    } catch (error) {
      console.error('Forgot password request error:', error);
      setMessage(`Không kết nối được API quên mật khẩu (${API_BASE}).`);
    }
  };

  const handleQuickLogin = (role: UserRole) => {
    setMessage('Đăng nhập nhanh chỉ để xem giao diện demo. Muốn dùng dữ liệu thật hãy nhập email/mật khẩu từ MySQL.');
    setSelectedRole(role);
    setIsLoading(true);

    if (role === 'employee') {
      localStorage.setItem('hrm_employee_id', '1');
    } else if (role === 'manager') {
      localStorage.setItem('hrm_employee_id', '2');
    }

    setTimeout(() => {
      onLogin(role);
    }, 600);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 p-4 overflow-hidden relative">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-purple-400/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '1s' }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '2s' }}
        ></div>
      </div>

      <div className="absolute inset-0 pointer-events-none">
        {particles.map((p, i) => (
          <div
            key={i}
            className="absolute size-2 bg-white/30 rounded-full animate-float"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}
      </div>

      <Card className="relative w-full max-w-5xl overflow-hidden border-0 bg-white/95 py-0 shadow-2xl backdrop-blur-xl">
        <div className="grid md:grid-cols-2 min-h-[600px]">
          <div className="hidden md:flex flex-col justify-center p-12 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>

            <div className="relative z-10">
              <div className="size-24 bg-white/20 rounded-3xl flex items-center justify-center text-white text-4xl font-bold shadow-2xl shadow-black/20 backdrop-blur-sm mb-6 animate-float">
                <Sparkles className="size-12" />
              </div>
              <h1 className="text-5xl font-bold mb-4 drop-shadow-lg">HRM System</h1>
              <p className="text-xl text-blue-100 mb-8 leading-relaxed">
                Hệ thống quản trị nhân sự
                <br />
                tích hợp Agentic AI
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-3 bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                  <div className="size-10 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
                    <Shield className="size-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Đăng nhập qua API</h3>
                    <p className="text-sm text-blue-100">Tài khoản lấy từ bảng employees trong MySQL</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                  <div className="size-10 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
                    <Sparkles className="size-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">AI Assistant</h3>
                    <p className="text-sm text-blue-100">Hỗ trợ phân tích và đánh giá năng lực</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 md:p-12 flex flex-col justify-center">
            <div className="md:hidden flex flex-col items-center mb-8">
              <div className="size-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg mb-4">
                <Sparkles className="size-10" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                HRM System
              </h1>
            </div>

            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Đăng nhập</h2>
              <p className="text-gray-600 mb-8">Nhập tài khoản đã có trong cơ sở dữ liệu</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin')}
                  disabled={isLoading}
                  className={`group relative p-6 rounded-2xl border-2 transition-all duration-300 ${
                    selectedRole === 'admin'
                      ? 'border-blue-600 bg-blue-50 scale-95'
                      : 'border-gray-200 hover:border-blue-300 hover:shadow-lg'
                  } ${isLoading && selectedRole !== 'admin' ? 'opacity-50' : ''}`}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div
                      className={`size-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                        selectedRole === 'admin'
                          ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg'
                          : 'bg-gradient-to-br from-blue-400 to-indigo-500 text-white group-hover:scale-110 group-hover:shadow-md'
                      }`}
                    >
                      <Shield className="size-8" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-gray-900 mb-1">Admin</p>
                      <p className="text-xs text-gray-500">Quản trị hệ thống</p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('manager')}
                  disabled={isLoading}
                  className={`group relative p-6 rounded-2xl border-2 transition-all duration-300 ${
                    selectedRole === 'manager'
                      ? 'border-indigo-600 bg-indigo-50 scale-95'
                      : 'border-gray-200 hover:border-indigo-300 hover:shadow-lg'
                  } ${isLoading && selectedRole !== 'manager' ? 'opacity-50' : ''}`}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div
                      className={`size-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                        selectedRole === 'manager'
                          ? 'bg-gradient-to-br from-indigo-500 to-sky-600 text-white shadow-lg'
                          : 'bg-gradient-to-br from-indigo-400 to-sky-500 text-white group-hover:scale-110 group-hover:shadow-md'
                      }`}
                    >
                      <BriefcaseBusiness className="size-8" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-gray-900 mb-1">Manager</p>
                      <p className="text-xs text-gray-500">Trưởng bộ phận</p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('employee')}
                  disabled={isLoading}
                  className={`group relative p-6 rounded-2xl border-2 transition-all duration-300 ${
                    selectedRole === 'employee'
                      ? 'border-green-600 bg-green-50 scale-95'
                      : 'border-gray-200 hover:border-green-300 hover:shadow-lg'
                  } ${isLoading && selectedRole !== 'employee' ? 'opacity-50' : ''}`}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div
                      className={`size-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                        selectedRole === 'employee'
                          ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg'
                          : 'bg-gradient-to-br from-green-400 to-emerald-500 text-white group-hover:scale-110 group-hover:shadow-md'
                      }`}
                    >
                      <UserRound className="size-8" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-gray-900 mb-1">Nhân viên</p>
                      <p className="text-xs text-gray-500">Employee</p>
                    </div>
                  </div>
                </button>
              </div>

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">Hoặc đăng nhập bằng email</span>
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700">
                    Email
                  </Label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12 border-2 focus:border-blue-600 transition-all"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700">
                    Mật khẩu
                  </Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Nhập mật khẩu"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-12 h-12 border-2 focus:border-blue-600 transition-all"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      disabled={isLoading}
                    >
                      {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-600" />
                    <span className="text-gray-600 group-hover:text-gray-900">Ghi nhớ</span>
                  </label>
                  <button
                    type="button"
                    onClick={resetPasswordByEmail}
                    className="text-blue-600 hover:text-blue-700 font-medium hover:underline"
                  >
                    Quên mật khẩu?
                  </button>
                </div>

                {message && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    {message}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 shadow-xl shadow-blue-200 text-base font-semibold transition-all hover:scale-[1.02]"
                  disabled={isLoading}
                >
                  {isLoading && !selectedRole ? (
                    <>
                      <div className="animate-spin rounded-full size-5 border-2 border-white border-t-transparent mr-2"></div>
                      Đang đăng nhập...
                    </>
                  ) : (
                    <>
                      <LogIn className="size-5 mr-2" />
                      Đăng nhập
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
                <p className="text-xs font-semibold text-blue-900 mb-2 flex items-center gap-1">
                  <Shield className="size-3" />
                  Tài khoản test từ MySQL
                </p>
                <div className="text-xs text-blue-700 space-y-1">
                  <p>
                    <strong>Admin:</strong> tạo 1 tài khoản role ADMIN trong MySQL
                  </p>
                  <p>
                    <strong>Manager:</strong> Kienquan@gmail.com / 123456
                  </p>
                  <p>
                    <strong>Nhân viên:</strong> thanhsang3213121@gmail.com / 123456
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 text-center text-xs text-gray-500">© 2026 HRM System. All rights reserved.</div>
          </div>
        </div>
      </Card>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(-20px) translateX(10px); }
          50% { transform: translateY(-10px) translateX(-10px); }
          75% { transform: translateY(-15px) translateX(5px); }
        }
        .animate-float {
          animation: float 8s ease-in-out infinite;
        }
        .bg-grid-pattern {
          background-image:
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px);
          background-size: 50px 50px;
        }
      `}</style>
    </div>
  );
}
