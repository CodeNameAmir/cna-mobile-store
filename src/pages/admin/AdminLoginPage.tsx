import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@cnamobile.ir');
  const [password, setPassword] = useState('admin123');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !password.trim()) {
      setErrorMessage('لطفاً ایمیل سازمانی و کلمه عبور را وارد نمایید.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      localStorage.setItem('cna_admin_auth', 'true');
      navigate('/admin/dashboard');
    }, 700);
  };

  const handleQuickDemoLogin = () => {
    setEmail('admin@cnamobile.ir');
    setPassword('admin123');
    setIsLoading(true);
    setTimeout(() => {
      localStorage.setItem('cna_admin_auth', 'true');
      navigate('/admin/dashboard');
    }, 400);
  };

  return (
    <div
      className="min-h-screen bg-surface flex flex-col items-center justify-center p-4 selection:bg-primary selection:text-on-primary font-body-md text-on-surface"
      dir="rtl"
    >
      <div className="w-full max-w-md bg-surface-container-lowest rounded-3xl p-8 shadow-[0_10px_35px_rgba(0,74,198,0.06)] border border-surface-container-high/60 flex flex-col gap-6 relative overflow-hidden animate-fade-in">
        {/* Subtle decorative glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-primary-container/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Icon & Heading */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-on-primary shadow-md">
            <span className="material-symbols-outlined text-[32px]">smartphone</span>
          </div>
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface font-extrabold">
              ورود به پنل مدیریت سی‌ان‌ای
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
              سیستم جامع انبارداری، سفارشات و نظارت بر فروشگاه آنلاین
            </p>
          </div>
        </div>

        {/* Demo Credentials Hint Card */}
        <div className="p-3.5 rounded-2xl bg-primary-fixed/40 border border-primary-fixed flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">
              key
            </span>
            <div className="flex flex-col text-right">
              <span className="font-label-md text-label-md text-on-primary-fixed font-bold">
                حساب کاربری آزمایشی (Demo)
              </span>
              <span className="text-[11px] text-on-surface-variant font-mono" dir="ltr">
                admin@cnamobile.ir / admin123
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleQuickDemoLogin}
            className="px-2.5 py-1 rounded-lg bg-primary hover:bg-primary-container text-on-primary text-[11px] font-bold shadow-xs transition-colors shrink-0"
          >
            ورود سریع
          </button>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-error-container text-on-error-container text-body-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="font-label-md text-label-md text-on-surface">
              ایمیل یا شناسه کاربری
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
                alternate_email
              </span>
              <input
                type="email"
                required
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@cnamobile.ir"
                className="w-full h-12 pr-11 pl-4 rounded-xl bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary font-mono text-left transition-all"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="font-label-md text-label-md text-on-surface">کلمه عبور امنیتی</label>
              <span className="text-[11px] text-primary hover:underline cursor-pointer">
                فراموشی رمز؟
              </span>
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
                lock
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-12 pr-11 pl-11 rounded-xl bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary font-mono text-left transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 h-12 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <span className="material-symbols-outlined text-[20px] animate-spin">
                  progress_activity
                </span>
                <span>در حال احراز هویت...</span>
              </>
            ) : (
              <>
                <span>ورود به پنل مدیریت</span>
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              </>
            )}
          </button>
        </form>

        {/* Back to Storefront Link */}
        <div className="pt-2 border-t border-surface-container flex items-center justify-center">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-primary hover:underline font-label-md text-label-md"
          >
            <span className="material-symbols-outlined text-[18px]">storefront</span>
            <span>بازگشت به فروشگاه آنلاین سی‌ان‌ای</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
