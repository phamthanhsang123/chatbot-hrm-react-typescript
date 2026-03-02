'use client';

import { useState, useEffect } from 'react';
import { LogIn, Mail, Lock, Eye, EyeOff, Sparkles, Shield } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';

interface LoginProps {
  onLogin: (role: 'admin' | 'employee') => void;
}

type Particle = {
  left: number;
  top: number;
  delay: number;
  duration: number;
};

export function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'employee' | null>(null);

  // ✅ FIX hydration: generate particles only on client
  const [particles, setParticles] = useState<Particle[]>([]);
  useEffect(() => {
    const generated: Particle[] = Array.from({ length: 20 }, () => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 5 + Math.random() * 10,
    }));
    setParticles(generated);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      return;
    }

    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      // Admin login
      if (email === 'admin@company.com' && password === 'admin123') {
        onLogin('admin');
      }
      // Employee login
      else if (email === 'employee@company.com' && password === 'emp123') {
        onLogin('employee');
      } else {
        setIsLoading(false);
      }
    }, 800);
  };

  const handleQuickLogin = (role: 'admin' | 'employee') => {
    setSelectedRole(role);
    setIsLoading(true);

    setTimeout(() => {
      onLogin(role);
    }, 600);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 p-4 overflow-hidden relative">
      {/* Animated Background */}
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

      {/* Floating Particles */}
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

      {/* Login Card */}
      <Card className="relative w-full max-w-5xl shadow-2xl backdrop-blur-xl bg-white/95 overflow-hidden border-0">
        <div className="grid md:grid-cols-2 min-h-[600px]">
          {/* Left Side - Branding */}
          <div className="hidden md:flex flex-col justify-center p-12 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>

            {/* Logo */}
            <div className="relative z-10">
              <div className="size-24 bg-white/20 rounded-3xl flex items-center justify-center text-white text-4xl font-bold shadow-2xl shadow-black/20 backdrop-blur-sm mb-6 animate-float">
                <Sparkles className="size-12" />
              </div>
              <h1 className="text-5xl font-bold mb-4 drop-shadow-lg">HRM System</h1>
              <p className="text-xl text-blue-100 mb-8 leading-relaxed">
                Hệ thống quản lý nhân sự
                <br />
                thông minh và hiện đại
              </p>

              {/* Features */}
              <div className="space-y-4">
                <div className="flex items-start gap-3 bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                  <div className="size-10 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
                    <Shield className="size-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Bảo mật cao</h3>
                    <p className="text-sm text-blue-100">Mã hóa dữ liệu end-to-end</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                  <div className="size-10 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
                    <Sparkles className="size-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">AI Chatbot</h3>
                    <p className="text-sm text-blue-100">Hỗ trợ nhân viên 24/7</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="p-8 md:p-12 flex flex-col justify-center">
            {/* Mobile Logo */}
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
              <p className="text-gray-600 mb-8">Chọn vai trò để tiếp tục</p>

              {/* Role Selection */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <button
                  onClick={() => handleQuickLogin('admin')}
                  disabled={isLoading}
                  className={`group relative p-6 rounded-2xl border-2 transition-all duration-300 ${selectedRole === 'admin'
                      ? 'border-blue-600 bg-blue-50 scale-95'
                      : 'border-gray-200 hover:border-blue-300 hover:shadow-lg'
                    } ${isLoading && selectedRole !== 'admin' ? 'opacity-50' : ''}`}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div
                      className={`size-16 rounded-2xl flex items-center justify-center text-2xl transition-all duration-300 ${selectedRole === 'admin'
                          ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg'
                          : 'bg-gradient-to-br from-blue-400 to-indigo-500 group-hover:scale-110 group-hover:shadow-md'
                        }`}
                    >
                      👨‍💼
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-gray-900 mb-1">Admin</p>
                      <p className="text-xs text-gray-500">HR Manager</p>
                    </div>
                  </div>
                  {isLoading && selectedRole === 'admin' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-2xl backdrop-blur-sm">
                      <div className="animate-spin rounded-full size-8 border-3 border-blue-600 border-t-transparent"></div>
                    </div>
                  )}
                </button>

                <button
                  onClick={() => handleQuickLogin('employee')}
                  disabled={isLoading}
                  className={`group relative p-6 rounded-2xl border-2 transition-all duration-300 ${selectedRole === 'employee'
                      ? 'border-green-600 bg-green-50 scale-95'
                      : 'border-gray-200 hover:border-green-300 hover:shadow-lg'
                    } ${isLoading && selectedRole !== 'employee' ? 'opacity-50' : ''}`}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div
                      className={`size-16 rounded-2xl flex items-center justify-center text-2xl transition-all duration-300 ${selectedRole === 'employee'
                          ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg'
                          : 'bg-gradient-to-br from-green-400 to-emerald-500 group-hover:scale-110 group-hover:shadow-md'
                        }`}
                    >
                      👤
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-gray-900 mb-1">Nhân viên</p>
                      <p className="text-xs text-gray-500">Employee</p>
                    </div>
                  </div>
                  {isLoading && selectedRole === 'employee' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-2xl backdrop-blur-sm">
                      <div className="animate-spin rounded-full size-8 border-3 border-green-600 border-t-transparent"></div>
                    </div>
                  )}
                </button>
              </div>

              {/* Divider */}
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">Hoặc đăng nhập với email</span>
                </div>
              </div>

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-5">
                {/* Email */}
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

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700">
                    Mật khẩu
                  </Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
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

                {/* Remember & Forgot */}
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                    />
                    <span className="text-gray-600 group-hover:text-gray-900">Ghi nhớ</span>
                  </label>
                  <a
                    href="#"
                    className="text-blue-600 hover:text-blue-700 font-medium hover:underline"
                  >
                    Quên mật khẩu?
                  </a>
                </div>

                {/* Submit Button */}
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

              {/* Demo Info */}
              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
                <p className="text-xs font-semibold text-blue-900 mb-2 flex items-center gap-1">
                  <Shield className="size-3" />
                  Thông tin đăng nhập Demo
                </p>
                <div className="text-xs text-blue-700 space-y-1">
                  <p>
                    <strong>Admin:</strong> admin@company.com / admin123
                  </p>
                  <p>
                    <strong>Nhân viên:</strong> employee@company.com / emp123
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center text-xs text-gray-500">
              © 2026 HRM System. All rights reserved.
            </div>
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
