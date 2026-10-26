import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdminData } from '../../context/AdminDataContext';
import { formatToman, toPersianDigits } from '../../utils/formatters';

export const AdminDashboardPage: React.FC = () => {
  const { products, orders, systemLogs, showToast, updateOrderStatus } = useAdminData();
  const [timeRange, setTimeRange] = useState('۳۰ روز اخیر');
  const [quickInvoiceModal, setQuickInvoiceModal] = useState(false);
  const [quickCustomerName, setQuickCustomerName] = useState('');
  const [quickAmount, setQuickAmount] = useState('');

  // Dynamic low stock items for Emergency Stock Watch (stock <= 4)
  const lowStockProducts = products.filter((p) => p.stock <= 4);

  // Dynamic order stats
  const pendingOrProcessingOrders = orders.filter(
    (o) => o.status === 'pending' || o.status === 'processing'
  );

  const handleExportExcel = () => {
    // Generate CSV content
    const headers = ['OrderNumber', 'Customer', 'Amount', 'Status', 'Date'];
    const rows = orders.map((o) => [
      o.orderNumber,
      o.customerName,
      o.totalAmount,
      o.status,
      o.createdAt
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'CNA_Orders_Report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('گزارش اکسل سفارش‌ها با موفقیت دانلود شد.');
  };

  const handleQuickInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCustomerName.trim() || !quickAmount) {
      showToast('لطفاً نام خریدار و مبلغ را وارد نمایید.');
      return;
    }
    showToast(`پیش‌فاکتور سریع برای ${quickCustomerName} با موفقیت صادر شد.`);
    setQuickInvoiceModal(false);
    setQuickCustomerName('');
    setQuickAmount('');
  };

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Top Welcome & Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 bg-surface-container-lowest rounded-xl shadow-sm">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="font-headline-md text-headline-md text-on-surface">
              خوش‌آمدید، مدیر ارشد سی‌ان‌ای
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-label-sm font-label-sm bg-surface-container-high text-primary">
              شعبه مرکزی آنلاین
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
              داده آزمایشی انبار
            </span>
          </div>
          <div className="flex items-center gap-3 text-on-surface-variant font-body-sm text-body-sm flex-wrap">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-primary">
                calendar_today
              </span>
              <span>امروز: دوشنبه، ۲۱ آبان ۱۴۰۳</span>
            </span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-outline-variant"></span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-emerald-600 animate-spin">
                sync
              </span>
              <span>به‌روزرسانی داده‌ها: ۳ دقیقه پیش</span>
            </span>
          </div>
        </div>

        {/* Quick Actions & Date Filter */}
        <div className="flex items-center flex-wrap gap-2.5">
          <div className="relative">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="h-10 px-3.5 pr-8 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface flex items-center gap-2 font-label-md text-label-md transition-colors shadow-sm cursor-pointer appearance-none border-0 focus:ring-2 focus:ring-primary"
            >
              <option value="امروز">امروز (۲۱ آبان)</option>
              <option value="این هفته">این هفته</option>
              <option value="۳۰ روز اخیر">بازه زمانی: ۳۰ روز اخیر</option>
              <option value="۹۰ روز گذشته">۹۰ روز گذشته</option>
            </select>
            <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant pointer-events-none">
              date_range
            </span>
          </div>

          <button
            onClick={handleExportExcel}
            className="h-10 px-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface flex items-center gap-2 font-label-md text-label-md transition-colors shadow-sm"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px] text-emerald-600">
              file_download
            </span>
            <span>خروجی اکسل گزارش</span>
          </button>

          <button
            onClick={() => setQuickInvoiceModal(true)}
            className="h-10 px-3.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary flex items-center gap-2 font-label-md text-label-md transition-colors shadow-sm"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">add_box</span>
            <span>ثبت فاکتور سریع</span>
          </button>
        </div>
      </div>

      {/* 4 Key Metric / KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* KPI 1: Total Sales */}
        <div className="flex flex-col p-5 bg-surface-container-lowest rounded-xl shadow-sm hover:shadow-md transition-all justify-between gap-4">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <span className="font-label-md text-label-md text-on-surface-variant">
                  فروش کل (۳۰ روز اخیر)
                </span>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-surface-container-high text-primary">
                  داده آزمایشی
                </span>
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
                  {toPersianDigits('۳,۸۴۰,۵۰۰,۰۰۰')}
                </span>
                <span className="font-price-unit text-price-unit text-on-surface-variant">
                  تومان
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary-fixed flex items-center justify-center text-primary shadow-sm shrink-0">
              <span className="material-symbols-outlined text-[24px]">payments</span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 bg-surface-container-low/50 rounded-lg px-2.5 py-1.5">
            <span className="flex items-center gap-1 font-label-sm text-label-sm text-emerald-600">
              <span className="material-symbols-outlined text-[16px]">trending_up</span>
              <span>+۱۲.۴٪ نسبت به ماه قبل</span>
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              هدف: ۹۲٪ محقق شد
            </span>
          </div>
        </div>

        {/* KPI 2: Pending Orders */}
        <div className="flex flex-col p-5 bg-surface-container-lowest rounded-xl shadow-sm hover:shadow-md transition-all justify-between gap-4">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className="font-label-md text-label-md text-on-surface-variant">
                سفارش‌های جدید و در پردازش
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-headline-lg text-headline-lg text-on-surface">
                  {toPersianDigits(pendingOrProcessingOrders.length || 128)}
                </span>
                <span className="font-price-unit text-price-unit text-on-surface-variant">
                  سفارش ثبت‌شده
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-secondary-container flex items-center justify-center text-primary-container shadow-sm shrink-0">
              <span className="material-symbols-outlined text-[24px]">local_shipping</span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 bg-surface-container-low/50 rounded-lg px-2.5 py-1.5">
            <span className="flex items-center gap-1 font-label-sm text-label-sm text-primary font-bold">
              <span className="material-symbols-outlined text-[16px]">bolt</span>
              <span>۲۴ سفارش آماده ارسال فوری</span>
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              میانگین: ۳ ساعت
            </span>
          </div>
        </div>

        {/* KPI 3: Active Customers */}
        <div className="flex flex-col p-5 bg-surface-container-lowest rounded-xl shadow-sm hover:shadow-md transition-all justify-between gap-4">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className="font-label-md text-label-md text-on-surface-variant">
                تعداد مشتریان فعال
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-headline-lg text-headline-lg text-on-surface">
                  {toPersianDigits('۵,۴۲۰')}
                </span>
                <span className="font-price-unit text-price-unit text-on-surface-variant">
                  کاربر خریدار
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center text-on-surface shadow-sm shrink-0">
              <span className="material-symbols-outlined text-[24px]">group</span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 bg-surface-container-low/50 rounded-lg px-2.5 py-1.5">
            <span className="flex items-center gap-1 font-label-sm text-label-sm text-emerald-600">
              <span className="material-symbols-outlined text-[16px]">person_add</span>
              <span>+۳۴۰ کاربر جدید این ماه</span>
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              نرخ بازگشت: ۳۸٪
            </span>
          </div>
        </div>

        {/* KPI 4: Stock Deficit Alert */}
        <div className="flex flex-col p-5 bg-surface-container-lowest rounded-xl shadow-sm hover:shadow-md transition-all justify-between gap-4">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className="font-label-md text-label-md text-on-surface-variant">
                کالاهای نیازمند شارژ انبار
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-headline-lg text-headline-lg text-error">
                  {toPersianDigits(lowStockProducts.length || 8)}
                </span>
                <span className="font-price-unit text-price-unit text-on-surface-variant">
                  مدل بحرانی
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-error-container flex items-center justify-center text-error shadow-sm shrink-0">
              <span className="material-symbols-outlined text-[24px]">warning</span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 bg-error-container/40 rounded-lg px-2.5 py-1.5">
            <span className="flex items-center gap-1 font-label-sm text-label-sm text-error font-bold">
              <span className="w-2 h-2 rounded-full bg-error animate-pulse"></span>
              <span>کسری جدی پرچمداران</span>
            </span>
            <Link
              to="/admin/products"
              className="font-label-sm text-label-sm text-primary hover:underline"
            >
              سفارش تأمین ←
            </Link>
          </div>
        </div>
      </div>

      {/* Middle Section: Main Analytics Chart & Stock Alerts Bento */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sales & Brand Share Analytics (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col p-6 bg-surface-container-lowest rounded-xl shadow-sm gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface">
                تحلیل روند فروش و سهم برندها
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                بررسی حجم ریالی فروش در ۶ ماه اخیر به تفکیک دسته‌بندی
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container text-on-surface font-label-sm text-label-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                <span>اپل (۴۲٪)</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container text-on-surface font-label-sm text-label-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-primary-container"></span>
                <span>سامسونگ (۳۱٪)</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container text-on-surface font-label-sm text-label-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-tertiary"></span>
                <span>شیائومی و انکر (۲۷٪)</span>
              </span>
            </div>
          </div>

          {/* Custom SVG Area & Trend Chart */}
          <div className="relative w-full h-64 bg-surface-container-low/40 rounded-xl p-4 flex flex-col justify-between overflow-hidden">
            {/* Background metric grid guides */}
            <div className="absolute inset-0 flex flex-col justify-between p-4 pointer-events-none opacity-20">
              <div className="w-full border-b border-outline"></div>
              <div className="w-full border-b border-outline"></div>
              <div className="w-full border-b border-outline"></div>
              <div className="w-full border-b border-outline"></div>
            </div>

            {/* SVG Visual Data Curves */}
            <svg
              className="w-full h-44 overflow-visible my-auto"
              preserveAspectRatio="none"
              viewBox="0 0 600 160"
            >
              <defs>
                <linearGradient id="primaryGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#004ac6" stopOpacity="0.35"></stop>
                  <stop offset="100%" stopColor="#004ac6" stopOpacity="0.0"></stop>
                </linearGradient>
                <linearGradient id="amberGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#8e3c00" stopOpacity="0.25"></stop>
                  <stop offset="100%" stopColor="#8e3c00" stopOpacity="0.0"></stop>
                </linearGradient>
              </defs>

              {/* Secondary Trend (Accessories / Xiaomi) */}
              <path
                d="M 0,130 Q 100,110 200,120 T 400,90 T 600,75 L 600,160 L 0,160 Z"
                fill="url(#amberGradient)"
              ></path>
              <path
                d="M 0,130 Q 100,110 200,120 T 400,90 T 600,75"
                fill="none"
                stroke="#8e3c00"
                strokeDasharray="4 4"
                strokeWidth="2.5"
              ></path>

              {/* Primary Trend (Apple & Samsung Phones) */}
              <path
                d="M 0,110 Q 120,40 240,75 T 440,30 T 600,15 L 600,160 L 0,160 Z"
                fill="url(#primaryGradient)"
              ></path>
              <path
                d="M 0,110 Q 120,40 240,75 T 440,30 T 600,15"
                fill="none"
                stroke="#004ac6"
                strokeWidth="3.5"
              ></path>

              {/* Data Points */}
              <circle cx="240" cy="75" fill="#004ac6" r="4.5" stroke="#ffffff" strokeWidth="2"></circle>
              <circle cx="440" cy="30" fill="#004ac6" r="4.5" stroke="#ffffff" strokeWidth="2"></circle>
              <circle cx="600" cy="15" fill="#004ac6" r="5" stroke="#ffffff" strokeWidth="2.5"></circle>
            </svg>

            {/* Persian Months Axis */}
            <div className="flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm pt-2 z-10">
              <span>خرداد</span>
              <span>تیر</span>
              <span>مرداد</span>
              <span>شهریور</span>
              <span>مهر</span>
              <span className="text-primary font-bold">آبان (جاری)</span>
            </div>
          </div>

          {/* Quick Summary Footnote */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3 rounded-lg bg-surface-container-low flex flex-col gap-0.5">
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                پرفروش‌ترین رده
              </span>
              <span className="font-headline-sm text-headline-sm text-on-surface">
                گوشی‌های پرچمدار
              </span>
              <span className="font-body-sm text-body-sm text-emerald-600">
                ۲,۱۵۰ م‌تومان ثبت سفارش
              </span>
            </div>
            <div className="p-3 rounded-lg bg-surface-container-low flex flex-col gap-0.5">
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                بیشترین رشد تقاضا
              </span>
              <span className="font-headline-sm text-headline-sm text-on-surface">
                هدفون و ساعت هوشمند
              </span>
              <span className="font-body-sm text-body-sm text-primary">+۴۱٪ جهش در پاییز</span>
            </div>
            <div className="p-3 rounded-lg bg-surface-container-low flex flex-col gap-0.5">
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                میانگین ارزش سبد (AOV)
              </span>
              <span className="font-headline-sm text-headline-sm text-on-surface">
                ۲۹,۸۰۰,۰۰۰ تومان
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                با گارانتی طلایی سی‌ان‌ای
              </span>
            </div>
          </div>
        </div>

        {/* Quick Stock Alert & Inventory Watch (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col p-6 bg-surface-container-lowest rounded-xl shadow-sm justify-between gap-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-error text-[22px]">
                notification_important
              </span>
              <h2 className="font-headline-sm text-headline-sm text-on-surface">
                وضعیت اضطراری انبار
              </h2>
            </div>
            <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-error-container text-error font-bold">
              {toPersianDigits(lowStockProducts.length)} کالا
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {lowStockProducts.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl bg-surface-container-low flex items-center justify-between gap-3 hover:bg-surface-container transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-surface-container-highest flex items-center justify-center shrink-0 overflow-hidden p-1">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="material-symbols-outlined text-primary text-[24px]">
                        smartphone
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-headline-sm text-headline-sm text-on-surface leading-tight truncate max-w-[150px]">
                      {item.name}
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant font-mono text-[11px] truncate max-w-[150px]" dir="ltr">
                      {item.englishTitle}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span
                    className={`font-label-sm text-label-sm px-2 py-0.5 rounded-md font-bold ${
                      item.stock === 0
                        ? 'bg-error text-on-error'
                        : item.stock <= 2
                        ? 'bg-error text-on-error'
                        : 'bg-tertiary-fixed text-on-tertiary-fixed'
                    }`}
                  >
                    {item.stock === 0 ? 'ناموجود' : `${toPersianDigits(item.stock)} عدد مانده`}
                  </span>
                  <span className="font-label-sm text-label-sm text-error">
                    {item.stock === 0 ? 'اتمام موجودی' : 'بحرانی'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Supply Action */}
          <div className="p-4 rounded-xl bg-primary/5 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-primary font-label-md text-label-md">
              <span className="material-symbols-outlined text-[18px]">verified</span>
              <span>درخواست خودکار تأمین موجودی فعال است</span>
            </div>
            <Link
              to="/admin/products"
              className="w-full h-10 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container transition-colors flex items-center justify-center gap-2"
            >
              <span>ارسال پیش‌فاکتور به تأمین‌کننده دبی</span>
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Section: Latest Orders Table & Recent System Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Latest Orders Table (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col p-6 bg-surface-container-lowest rounded-xl shadow-sm gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[24px]">
                receipt_long
              </span>
              <div>
                <h2 className="font-headline-sm text-headline-sm text-on-surface">
                  آخرین سفارش‌های ثبت‌شده
                </h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  لیست سفارش‌های اخیر مشتریان با تفکیک وضعیت و مبلغ
                </p>
              </div>
            </div>
            <Link
              to="/admin/orders"
              className="font-label-md text-label-md text-primary hover:underline flex items-center gap-1"
            >
              <span>مشاهده همه سفارش‌ها</span>
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            </Link>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto w-full">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant font-label-md text-label-md">
                  <th className="py-3 px-4 rounded-r-lg">شناسه سفارش</th>
                  <th className="py-3 px-4">مشتری</th>
                  <th className="py-3 px-4">کالا و مشخصات</th>
                  <th className="py-3 px-4">مبلغ پرداختی</th>
                  <th className="py-3 px-4">وضعیت</th>
                  <th className="py-3 px-4">زمان ثبت</th>
                  <th className="py-3 px-4 rounded-l-lg text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="font-body-sm text-body-sm divide-y divide-surface-container">
                {orders.slice(0, 4).map((order) => {
                  const firstItem = order.items[0];
                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-surface-container-low/60 transition-colors"
                    >
                      <td className="py-3 px-4 font-label-md text-label-md text-primary font-mono text-right">
                        #{order.orderNumber}
                      </td>
                      <td className="py-3 px-4 font-headline-sm text-headline-sm text-on-surface">
                        {order.customerName}
                      </td>
                      <td className="py-3 px-4 text-on-surface-variant">
                        {firstItem ? firstItem.productName : 'بدون اقلام'}
                        {order.items.length > 1 && ` (+${order.items.length - 1} کالا)`}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-label-lg text-label-lg font-bold text-on-surface">
                          {toPersianDigits(new Intl.NumberFormat('fa-IR').format(order.totalAmount))}
                        </span>
                        <span className="font-price-unit text-price-unit text-on-surface-variant mr-1">
                          تومان
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {order.status === 'delivered' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-label-sm font-label-sm bg-emerald-100 text-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                            <span>تحویل شده</span>
                          </span>
                        )}
                        {order.status === 'shipped' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-label-sm font-label-sm bg-blue-100 text-blue-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                            <span>ارسال با باربری</span>
                          </span>
                        )}
                        {order.status === 'processing' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-label-sm font-label-sm bg-amber-100 text-amber-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span>
                            <span>در حال بسته‌بندی</span>
                          </span>
                        )}
                        {order.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-label-sm font-label-sm bg-tertiary-fixed text-on-tertiary-fixed">
                            <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                            <span>منتظر تایید مالی</span>
                          </span>
                        )}
                        {order.status === 'cancelled' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-label-sm font-label-sm bg-error-container text-error">
                            <span>لغو شده</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-on-surface-variant">{order.createdAt}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <Link
                            to="/admin/orders"
                            className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
                            title="مشاهده فاکتور"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              visibility
                            </span>
                          </Link>
                          {order.status === 'pending' && (
                            <button
                              onClick={() => updateOrderStatus(order.id, 'processing')}
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                              title="تایید سفارش"
                            >
                              <span className="material-symbols-outlined text-[18px]">check</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent System Logs & Staff Activities (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col p-6 bg-surface-container-lowest rounded-xl shadow-sm justify-between gap-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[22px]">
                history_toggle_off
              </span>
              <h2 className="font-headline-sm text-headline-sm text-on-surface">
                فعالیت‌ها و لاگ دسترسی
              </h2>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
              tune
            </span>
          </div>

          {/* Activity Timeline */}
          <div className="flex flex-col gap-4 relative">
            {/* Vertical guide line */}
            <div className="absolute right-4 top-2 bottom-2 w-0.5 bg-surface-container pointer-events-none"></div>

            {systemLogs.slice(0, 4).map((log) => (
              <div key={log.id} className="flex items-start gap-3 relative">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 shadow-sm ${
                    log.type === 'price'
                      ? 'bg-primary text-on-primary'
                      : log.type === 'inventory'
                      ? 'bg-surface-container-high text-on-surface'
                      : log.type === 'warranty'
                      ? 'bg-error-container text-error'
                      : 'bg-primary-fixed text-primary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{log.icon}</span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    <span className="font-label-md text-label-md text-on-surface">{log.title}</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      ({log.author})
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    {log.description}
                  </p>
                  <span className="font-label-sm text-label-sm text-primary mt-0.5">
                    {log.timeAgo}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Security Status */}
          <div className="p-3 bg-surface-container-low rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20"></span>
              <span className="font-label-sm text-label-sm text-on-surface">
                وضعیت امنیتی سرور و درگاه: امن و پایدار
              </span>
            </div>
            <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
              SSL Active
            </span>
          </div>
        </div>
      </div>

      {/* Quick Invoice Modal Dialog */}
      {quickInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[24px]">receipt</span>
                <h3 className="font-headline-md text-headline-md text-on-surface">
                  صدور فاکتور سریع
                </h3>
              </div>
              <button
                onClick={() => setQuickInvoiceModal(false)}
                className="w-8 h-8 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <form onSubmit={handleQuickInvoiceSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-label-md text-on-surface">نام خریدار / شرکت</label>
                <input
                  type="text"
                  required
                  value={quickCustomerName}
                  onChange={(e) => setQuickCustomerName(e.target.value)}
                  placeholder="مثال: شرکت بازرگانی پارس"
                  className="h-10 px-3 rounded-xl bg-surface-container-low text-on-surface text-body-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-label-md text-on-surface">مبلغ کل فاکتور (تومان)</label>
                <input
                  type="number"
                  required
                  value={quickAmount}
                  onChange={(e) => setQuickAmount(e.target.value)}
                  placeholder="مثال: ۱۵۰۰۰۰۰۰"
                  className="h-10 px-3 rounded-xl bg-surface-container-low text-on-surface text-body-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono text-left"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickInvoiceModal(false)}
                  className="h-10 px-4 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="h-10 px-5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md shadow-sm"
                >
                  صدور و چاپ فاکتور
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
