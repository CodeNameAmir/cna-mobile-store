import React, { useState } from 'react';
import { useAdminData } from '../../context/AdminDataContext';
import { StoreSettings } from '../../types/admin';
import { toPersianDigits } from '../../utils/formatters';
import { DatabaseDiagnosticsPanel } from '../../components/admin/diagnostics/DatabaseDiagnosticsPanel';

export const AdminSettingsPage: React.FC = () => {
  const { settings, updateSettings, showToast } = useAdminData();

  const [activeTab, setActiveTab] = useState<'general' | 'payments' | 'shipping' | 'sms' | 'security' | 'database'>('general');

  // Local form state initialized from context
  const [formData, setFormData] = useState<StoreSettings>({ ...settings });
  const [isSavedRecently, setIsSavedRecently] = useState(false);

  const handleChange = (field: keyof StoreSettings, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formData);
    setIsSavedRecently(true);
    setTimeout(() => setIsSavedRecently(false), 3000);
  };

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Top Banner / Headline Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-xl shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary-fixed flex items-center justify-center text-primary shadow-inner shrink-0">
            <span className="material-symbols-outlined text-[32px]">settings</span>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-headline-lg text-headline-lg text-on-surface">
                تنظیمات سیستم و پیکربندی فروشگاه
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-surface-container-high text-primary font-label-sm text-label-sm font-bold">
                سی‌ان‌ای هسته ۴.۲
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              پیکربندی هویت تجاری، درگاه‌های پرداخت اینترنتی شاپرک، ارتباط بارکدخوان انبار و وب‌سرویس پیامکی
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end lg:self-center">
          <button
            onClick={handleSave}
            className="h-11 px-6 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg shadow-sm flex items-center gap-2 transition-all"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">save</span>
            <span>ذخیره تغییرات تنظیمات</span>
          </button>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-surface-container-high/60">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-label-lg transition-all shrink-0 ${
            activeTab === 'general'
              ? 'bg-primary-container text-on-primary font-bold shadow-sm'
              : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">store</span>
          <span>اطلاعات عمومی فروشگاه</span>
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-label-lg transition-all shrink-0 ${
            activeTab === 'payments'
              ? 'bg-primary-container text-on-primary font-bold shadow-sm'
              : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">account_balance</span>
          <span>درگاه‌های پرداخت و شاپرک</span>
        </button>

        <button
          onClick={() => setActiveTab('shipping')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-label-lg transition-all shrink-0 ${
            activeTab === 'shipping'
              ? 'bg-primary-container text-on-primary font-bold shadow-sm'
              : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">local_shipping</span>
          <span>ناوگان، ارسال و انبار</span>
        </button>

        <button
          onClick={() => setActiveTab('sms')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-label-lg transition-all shrink-0 ${
            activeTab === 'sms'
              ? 'bg-primary-container text-on-primary font-bold shadow-sm'
              : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">sms</span>
          <span>وب‌سرویس پیامک و اعلان</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-label-lg transition-all shrink-0 ${
            activeTab === 'security'
              ? 'bg-primary-container text-on-primary font-bold shadow-sm'
              : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">security</span>
          <span>امنیت و نشست‌ها</span>
        </button>

        <button
          onClick={() => setActiveTab('database')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-label-lg transition-all shrink-0 ${
            activeTab === 'database'
              ? 'bg-primary-container text-on-primary font-bold shadow-sm'
              : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">database</span>
          <span>پایگاه داده و سرویس ابری</span>
        </button>
      </div>

      {/* Main Settings Form Container */}
      <form onSubmit={handleSave} className="bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col gap-6">
        {/* Tab 1: General Info */}
        {activeTab === 'general' && (
          <div className="flex flex-col gap-6 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">
                  هویت تجاری و مشخصات رسمی فروشگاه
                </h3>
                <p className="font-body-sm text-on-surface-variant">
                  اطلاعات تماس، ساعات کاری پشتیبانی و وضعیت فعالیت فروشگاه آنلاین
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-label-md text-on-surface">وضعیت فعالیت فروشگاه:</span>
                <button
                  type="button"
                  onClick={() => handleChange('isStoreOpen', !formData.isStoreOpen)}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                    formData.isStoreOpen ? 'bg-primary' : 'bg-surface-container-high'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-surface-container-lowest shadow-md transition-transform ${
                      formData.isStoreOpen ? '-translate-x-6' : '-translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-body-sm font-bold text-emerald-600">
                  {formData.isStoreOpen ? 'باز و سفارش‌گیری فعال' : 'حالت تعمیرات'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-on-surface">نام تجاری فروشگاه</label>
                <input
                  type="text"
                  value={formData.storeName}
                  onChange={(e) => handleChange('storeName', e.target.value)}
                  className="h-11 px-3.5 rounded-xl bg-surface-container-low text-on-surface font-body-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-on-surface">شعار سازمانی و بیانیه برند</label>
                <input
                  type="text"
                  value={formData.tagline}
                  onChange={(e) => handleChange('tagline', e.target.value)}
                  className="h-11 px-3.5 rounded-xl bg-surface-container-low text-on-surface font-body-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-on-surface">تلفن پشتیبانی مرکزی</label>
                <input
                  type="text"
                  dir="ltr"
                  value={formData.supportPhone}
                  onChange={(e) => handleChange('supportPhone', e.target.value)}
                  className="h-11 px-3.5 rounded-xl bg-surface-container-low text-on-surface font-mono text-left focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-on-surface">شماره همراه تماس اضطراری</label>
                <input
                  type="text"
                  dir="ltr"
                  value={formData.emergencyPhone}
                  onChange={(e) => handleChange('emergencyPhone', e.target.value)}
                  className="h-11 px-3.5 rounded-xl bg-surface-container-low text-on-surface font-mono text-left focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 flex flex-col gap-1.5">
                <label className="font-label-md text-on-surface">آدرس دفتر مرکزی و انبار اصلی</label>
                <input
                  type="text"
                  value={formData.centralAddress}
                  onChange={(e) => handleChange('centralAddress', e.target.value)}
                  className="h-11 px-3.5 rounded-xl bg-surface-container-low text-on-surface font-body-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-on-surface">کد پستی ۱۰ رقمی</label>
                <input
                  type="text"
                  dir="ltr"
                  value={formData.postalCode}
                  onChange={(e) => handleChange('postalCode', e.target.value)}
                  className="h-11 px-3.5 rounded-xl bg-surface-container-low text-on-surface font-mono text-left focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-label-md text-on-surface">ساعات کار و تحویل حضوری کالا</label>
              <input
                type="text"
                value={formData.workHours}
                onChange={(e) => handleChange('workHours', e.target.value)}
                className="h-11 px-3.5 rounded-xl bg-surface-container-low text-on-surface font-body-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        )}

        {/* Tab 2: Payments & Gateways */}
        {activeTab === 'payments' && (
          <div className="flex flex-col gap-6 animate-fade-in">
            <div className="pb-3 border-b border-surface-container">
              <h3 className="font-headline-sm text-headline-sm text-on-surface">
                پیکربندی درگاه‌های پرداخت اینترنتی شاپرک
              </h3>
              <p className="font-body-sm text-on-surface-variant">
                تنظیم شناسه ترمینال، مرچنت کد بانکی و نرخ مالیات بر ارزش افزوده در فاکتورها
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Bank Mellat Box */}
              <div className="p-5 rounded-2xl bg-surface-container-low/70 border border-surface-container-high flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                    <span className="font-headline-sm text-on-surface">به‌پرداخت ملت (درگاه اصلی)</span>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    فعال
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-on-surface-variant">شماره ترمینال (Terminal ID)</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={formData.mellatTerminalId}
                    onChange={(e) => handleChange('mellatTerminalId', e.target.value)}
                    className="h-10 px-3 rounded-xl bg-surface-container-lowest text-on-surface font-mono text-left focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Bank Saman Box */}
              <div className="p-5 rounded-2xl bg-surface-container-low/70 border border-surface-container-high flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                    <span className="font-headline-sm text-on-surface">پرداخت الکترونیک سامان (سپ)</span>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    فعال
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-on-surface-variant">مرچنت کد پذیرنده (Merchant ID)</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={formData.samanMerchantId}
                    onChange={(e) => handleChange('samanMerchantId', e.target.value)}
                    className="h-10 px-3 rounded-xl bg-surface-container-lowest text-on-surface font-mono text-left focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-on-surface">نرخ مالیات بر ارزش افزوده قانونی (٪)</label>
                <input
                  type="number"
                  value={formData.taxRatePercent}
                  onChange={(e) => handleChange('taxRatePercent', parseInt(e.target.value, 10) || 10)}
                  className="h-11 px-3.5 rounded-xl bg-surface-container-low text-on-surface font-mono text-left focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-on-surface">شماره شبا جهت تسویه شاپرک</label>
                <input
                  type="text"
                  dir="ltr"
                  defaultValue="IR890120000000018928172601"
                  className="h-11 px-3.5 rounded-xl bg-surface-container-low text-on-surface font-mono text-left focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Shipping & Logistics */}
        {activeTab === 'shipping' && (
          <div className="flex flex-col gap-6 animate-fade-in">
            <div className="pb-3 border-b border-surface-container">
              <h3 className="font-headline-sm text-headline-sm text-on-surface">
                ناوگان توزیع، تعرفه‌ها و سخت‌افزار انبار
              </h3>
              <p className="font-body-sm text-on-surface-variant">
                تعیین هزینه ارسال اکسپرس تهران، کرایه تیپاکس و اتصال لیبل‌پرینتر بارکد
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-on-surface">هزینه پیک فوری تهران (تومان)</label>
                <input
                  type="number"
                  value={formData.expressTehranCost}
                  onChange={(e) => handleChange('expressTehranCost', parseInt(e.target.value, 10) || 0)}
                  className="h-11 px-3.5 rounded-xl bg-surface-container-low text-on-surface font-mono text-left focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-on-surface">کرایه پایه تیپاکس شهرستان (تومان)</label>
                <input
                  type="number"
                  value={formData.tipaxBaseCost}
                  onChange={(e) => handleChange('tipaxBaseCost', parseInt(e.target.value, 10) || 0)}
                  className="h-11 px-3.5 rounded-xl bg-surface-container-low text-on-surface font-mono text-left focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-on-surface">حداقل خرید برای ارسال رایگان (تومان)</label>
                <input
                  type="number"
                  value={formData.freeShippingThreshold}
                  onChange={(e) => handleChange('freeShippingThreshold', parseInt(e.target.value, 10) || 0)}
                  className="h-11 px-3.5 rounded-xl bg-surface-container-low text-on-surface font-mono text-left focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-container-low/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-[24px]">print</span>
                <div className="flex flex-col">
                  <span className="font-label-md text-on-surface">پورت لیبل‌پرینتر زبرا (Zebra COM Port)</span>
                  <span className="text-[11px] text-on-surface-variant">
                    چاپ خودکار بارکد بسته بلافاصله پس از تغییر وضعیت به «در حال بسته‌بندی»
                  </span>
                </div>
              </div>
              <input
                type="text"
                dir="ltr"
                value={formData.zebraPort}
                onChange={(e) => handleChange('zebraPort', e.target.value)}
                className="w-28 h-10 px-3 rounded-lg bg-surface-container-lowest text-on-surface font-mono text-center focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        )}

        {/* Tab 4: SMS Gateway */}
        {activeTab === 'sms' && (
          <div className="flex flex-col gap-6 animate-fade-in">
            <div className="pb-3 border-b border-surface-container">
              <h3 className="font-headline-sm text-headline-sm text-on-surface">
                پیکربندی سامانه پیامک و وب‌سرویس پترن خدماتی
              </h3>
              <p className="font-body-sm text-on-surface-variant">
                ارسال پیامک آنی با پترن‌های تاییدشده سامانه کاوه‌نگار / ملی‌پیامک حتی به بلک‌لیست
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-label-md text-on-surface">کلید امنیتی API Key کاوه‌نگار</label>
              <input
                type="password"
                dir="ltr"
                value={formData.kavenegarApiKey}
                onChange={(e) => handleChange('kavenegarApiKey', e.target.value)}
                className="h-11 px-3.5 rounded-xl bg-surface-container-low text-on-surface font-mono text-left focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex flex-col gap-3">
              <span className="font-label-md text-on-surface">رویدادهای پیامکی خودکار سیستم:</span>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-primary focus:ring-primary" />
                  <span className="font-body-sm text-on-surface">
                    ارسال فاکتور و کد رهگیری سفارش بلافاصله پس از پرداخت موفق مشتری
                  </span>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-primary focus:ring-primary" />
                  <span className="font-body-sm text-on-surface">
                    ارسال شماره بارنامه تیپاکس و لینک استعلام پستی به خریدار
                  </span>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-primary focus:ring-primary" />
                  <span className="font-body-sm text-on-surface">
                    هشدار خودکار کسری انبار به مدیر تأمین هنگام کاهش موجودی به زیر ۴ عدد
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Security */}
        {activeTab === 'security' && (
          <div className="flex flex-col gap-6 animate-fade-in">
            <div className="pb-3 border-b border-surface-container">
              <h3 className="font-headline-sm text-headline-sm text-on-surface">
                امنیت پنل مدیریت، تایید دومرحله‌ای و کنترل نشست‌ها
              </h3>
              <p className="font-body-sm text-on-surface-variant">
                حفاظت از اطلاعات مشتریان، تایید دو مرحله‌ای (2FA) و محدودسازی آی‌پی‌های مجاز
              </p>
            </div>

            <div className="p-4 rounded-xl bg-surface-container-low flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-[24px]">verified_user</span>
                <div className="flex flex-col">
                  <span className="font-label-md text-on-surface">احراز هویت دو مرحله‌ای (2FA) ادمین‌ها</span>
                  <span className="text-[11px] text-on-surface-variant">
                    ارسال کد تایید یکبار مصرف پیامکی هنگام ورود به پنل مدیریت
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleChange('twoFactorEnabled', !formData.twoFactorEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.twoFactorEnabled ? 'bg-primary' : 'bg-surface-container-high'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-surface-container-lowest shadow-md transition-transform ${
                    formData.twoFactorEnabled ? '-translate-x-5' : '-translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-label-md text-on-surface">محدوده آی‌پی‌های معتبر انبار مرکزی (White-list)</label>
              <textarea
                rows={3}
                dir="ltr"
                defaultValue="185.120.45.10&#10;185.120.45.11&#10;192.168.1.0/24"
                className="p-3 rounded-xl bg-surface-container-low text-on-surface font-mono text-left focus:outline-none focus:ring-2 focus:ring-primary text-body-sm"
              />
              <span className="text-[11px] text-on-surface-variant">
                در صورت خالی گذاشتن، دسترسی از تمامی آی‌پی‌ها مجاز خواهد بود.
              </span>
            </div>
          </div>
        )}

        {/* Tab 6: Database & Cloud Infrastructure */}
        {activeTab === 'database' && (
          <DatabaseDiagnosticsPanel />
        )}

        {/* Save Footer Bar */}
        <div className="pt-4 border-t border-surface-container flex items-center justify-between flex-wrap gap-3">
          {isSavedRecently ? (
            <span className="text-emerald-600 font-label-md flex items-center gap-1.5 animate-pulse">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              <span>تمام تغییرات با موفقیت ذخیره گردید.</span>
            </span>
          ) : (
            <span className="text-on-surface-variant text-[12px]">
              آخرین به‌روزرسانی پیکربندی: امروز ساعت ۱۱:۴۵ توسط مدیر ارشد سی‌ان‌ای
            </span>
          )}

          <button
            type="submit"
            className="h-11 px-8 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-lg shadow-sm transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">save</span>
            <span>ذخیره کلیه تغییرات</span>
          </button>
        </div>
      </form>
    </div>
  );
};
