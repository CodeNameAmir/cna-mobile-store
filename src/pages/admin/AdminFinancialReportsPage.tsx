import React, { useState, useMemo } from 'react';
import { useAdminData } from '../../context/AdminDataContext';
import { FinancialInvoice, InvoiceStatus } from '../../types/admin';
import { formatToman, toPersianDigits } from '../../utils/formatters';

export const AdminFinancialReportsPage: React.FC = () => {
  const { invoices, addInvoice, updateInvoiceStatus, showToast } = useAdminData();

  const [searchQuery, setSearchQuery] = useState('');
  const [gatewayFilter, setGatewayFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [timePeriod, setTimePeriod] = useState('month');

  // Modals
  const [isNewInvoiceModalOpen, setIsNewInvoiceModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<FinancialInvoice | null>(null);

  // New Invoice Form State
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newNationalId, setNewNationalId] = useState('');
  const [newOrderNumber, setNewOrderNumber] = useState('');
  const [newSubtotal, setNewSubtotal] = useState<string>('');
  const [newGateway, setNewGateway] = useState('درگاه بانک ملت (شاپرک)');

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNumber = inv.invoiceNumber.toLowerCase().includes(q);
        const matchOrder = inv.orderNumber.toLowerCase().includes(q);
        const matchCustomer = inv.customerName.toLowerCase().includes(q);
        const matchNat = inv.nationalId.includes(q);
        if (!matchNumber && !matchOrder && !matchCustomer && !matchNat) return false;
      }

      if (gatewayFilter !== 'all') {
        if (!inv.paymentGateway.includes(gatewayFilter)) return false;
      }

      if (statusFilter !== 'all') {
        if (inv.status !== statusFilter) return false;
      }

      return true;
    });
  }, [invoices, searchQuery, gatewayFilter, statusFilter]);

  // Aggregate computations
  const totalGrossRevenue = invoices.reduce((acc, curr) => acc + curr.totalAmount, 0) + 3840500000;
  const totalVatCalculated = Math.round(totalGrossRevenue * 0.0909);
  const totalNetProfit = Math.round(totalGrossRevenue * 0.125);

  const handleExportTaxReport = () => {
    const csv =
      'data:text/csv;charset=utf-8,\uFEFF' +
      ['InvoiceNo', 'OrderNo', 'Customer', 'NationalId', 'Subtotal', 'VAT', 'Total', 'Gateway', 'Status'].join(
        ','
      ) +
      '\n' +
      invoices
        .map((i) =>
          [
            i.invoiceNumber,
            i.orderNumber,
            i.customerName,
            i.nationalId,
            i.subtotal,
            i.vatAmount,
            i.totalAmount,
            i.paymentGateway,
            i.status
          ].join(',')
        )
        .join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', 'CNA_Tax_Moadian_Report.csv');
    link.click();
    showToast('گزارش فاکتورهای رسمی سامانه مودیان با موفقیت دانلود شد.');
  };

  const handleCreateInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sub = parseInt(newSubtotal.replace(/[^\d]/g, ''), 10);
    if (!newCustomerName.trim() || !newNationalId.trim() || isNaN(sub) || sub <= 0) {
      showToast('لطفاً مشخصات خریدار و مبلغ را به درستی وارد کنید.');
      return;
    }

    const vat = Math.round(sub * 0.1);
    const total = sub + vat;

    addInvoice({
      invoiceNumber: `CNA-INV-1403-${Math.floor(1000 + Math.random() * 9000)}`,
      orderNumber: newOrderNumber.trim() || `CNA-${Math.floor(10000 + Math.random() * 90000)}`,
      customerName: newCustomerName.trim(),
      nationalId: newNationalId.trim(),
      economicCode: '۴۱۱' + Math.floor(1000000 + Math.random() * 9000000),
      subtotal: sub,
      vatAmount: vat,
      totalAmount: total,
      paymentGateway: newGateway,
      paymentRefCode: `SHP-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      status: 'approved',
      date: '۱۴۰۳/۰۸/۲۲',
      itemsCount: 1
    });

    setIsNewInvoiceModalOpen(false);
    setNewCustomerName('');
    setNewNationalId('');
    setNewOrderNumber('');
    setNewSubtotal('');
  };

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Top Banner / Headline Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-xl shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary-fixed flex items-center justify-center text-primary shadow-inner shrink-0">
            <span className="material-symbols-outlined text-[32px]">receipt_long</span>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-headline-lg text-headline-lg text-on-surface">
                گزارشات مالی، تراز حسابداری و فاکتورها
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-surface-container-high text-primary font-label-sm text-label-sm">
                ماده ۱۶۹ مکرر
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-label-sm text-label-sm font-bold">
                اتصال سامانه مودیان فعال
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              نظارت بر ارزش افزوده (VAT ۱۰٪)، تراز شاپرک بانک مرکزی، صدور فاکتور رسمی الکترونیک و تراز ماهانه فروشگاه
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end lg:self-center flex-wrap">
          <button
            onClick={handleExportTaxReport}
            className="h-11 px-4 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface flex items-center gap-2 font-label-lg text-label-lg transition-colors shadow-sm"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px] text-emerald-600">
              file_download
            </span>
            <span>خروجی سامانه مودیان</span>
          </button>
          <button
            onClick={() => setIsNewInvoiceModalOpen(true)}
            className="h-11 px-5 rounded-xl bg-primary hover:bg-primary-container text-on-primary flex items-center gap-2 font-label-lg text-label-lg transition-colors shadow-sm"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">add_box</span>
            <span>صدور فاکتور رسمی جدید</span>
          </button>
        </div>
      </div>

      {/* 4 Financial KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Stat 1: Total Gross Revenue */}
        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className="font-label-md text-label-md text-on-surface-variant">
                فروش ناخالص (۳۰ روز اخیر)
              </span>
              <span className="font-headline-xl text-headline-xl text-on-surface font-extrabold mt-1">
                {toPersianDigits(new Intl.NumberFormat('fa-IR').format(totalGrossRevenue))}{' '}
                <span className="font-label-md text-label-md text-on-surface-variant font-normal">
                  تومان
                </span>
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary-fixed text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[26px]">payments</span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-emerald-600 text-body-sm font-label-sm">
            <span className="material-symbols-outlined text-[16px]">trending_up</span>
            <span>+۱۴.۸٪ رشد گردش حساب</span>
          </div>
        </div>

        {/* Stat 2: Net Operating Profit */}
        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className="font-label-md text-label-md text-on-surface-variant">
                سود ناخالص عملیاتی انبار
              </span>
              <span className="font-headline-xl text-headline-xl text-emerald-600 font-extrabold mt-1">
                {toPersianDigits(new Intl.NumberFormat('fa-IR').format(totalNetProfit))}{' '}
                <span className="font-label-md text-label-md text-on-surface-variant font-normal">
                  تومان
                </span>
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[26px]">monitoring</span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-body-sm text-on-surface-variant">
            <span>حاشیه سود ناخالص:</span>
            <span className="font-bold text-emerald-600">۱۲.۵٪</span>
          </div>
        </div>

        {/* Stat 3: VAT 10% */}
        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className="font-label-md text-label-md text-on-surface-variant">
                مالیات بر ارزش افزوده (VAT ۱۰٪)
              </span>
              <span className="font-headline-xl text-headline-xl text-primary font-extrabold mt-1">
                {toPersianDigits(new Intl.NumberFormat('fa-IR').format(totalVatCalculated))}{' '}
                <span className="font-label-md text-label-md text-on-surface-variant font-normal">
                  تومان
                </span>
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-secondary-fixed text-secondary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[26px]">account_balance</span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-body-sm text-on-surface-variant">
            <span>شناسه مالیاتی حافظه:</span>
            <span className="font-mono text-primary font-bold">CNA-TAX-098</span>
          </div>
        </div>

        {/* Stat 4: Shaparak Gateway Settlements */}
        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className="font-label-md text-label-md text-on-surface-variant">
                تسویه‌حساب درگاه‌های شاپرک
              </span>
              <span className="font-headline-xl text-headline-xl text-on-surface font-extrabold mt-1">
                {toPersianDigits('۱۰۰٪')}{' '}
                <span className="font-label-md text-label-md text-emerald-600 font-normal">
                  موفق
                </span>
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary-fixed-dim text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[26px]">credit_card</span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-primary text-body-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>واریز پایا ساعت ۱۴:۰۰ و ۲۱:۰۰ روزانه</span>
          </div>
        </div>
      </div>

      {/* Middle Financial Insights & Gateway Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Revenue Flow SVG Chart (8 Cols) */}
        <div className="lg:col-span-8 bg-surface-container-lowest p-6 rounded-xl shadow-sm flex flex-col justify-between gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface">
                گردش مالی و جریان وجوه نقد ماهانه
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                مقایسه حجم فروش ناخالص در برابر مالیات کسرشده و سود عملیاتی
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-container text-on-surface text-label-sm font-label-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                <span>فروش ناخالص</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-container text-on-surface text-label-sm font-label-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>سود خالص</span>
              </span>
            </div>
          </div>

          {/* Custom SVG Trend Chart */}
          <div className="relative w-full h-56 bg-surface-container-low/40 rounded-xl p-4 flex flex-col justify-between overflow-hidden">
            <div className="absolute inset-0 flex flex-col justify-between p-4 pointer-events-none opacity-20">
              <div className="w-full border-b border-outline"></div>
              <div className="w-full border-b border-outline"></div>
              <div className="w-full border-b border-outline"></div>
            </div>

            <svg
              className="w-full h-36 overflow-visible my-auto"
              preserveAspectRatio="none"
              viewBox="0 0 600 140"
            >
              <defs>
                <linearGradient id="finGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#004ac6" stopOpacity="0.3"></stop>
                  <stop offset="100%" stopColor="#004ac6" stopOpacity="0.0"></stop>
                </linearGradient>
              </defs>
              <path
                d="M 0,110 Q 150,50 300,75 T 450,30 T 600,10 L 600,140 L 0,140 Z"
                fill="url(#finGradient)"
              ></path>
              <path
                d="M 0,110 Q 150,50 300,75 T 450,30 T 600,10"
                fill="none"
                stroke="#004ac6"
                strokeWidth="3.5"
              ></path>
              <path
                d="M 0,125 Q 150,90 300,105 T 450,75 T 600,50"
                fill="none"
                stroke="#10b981"
                strokeDasharray="4 4"
                strokeWidth="2.5"
              ></path>
              <circle cx="300" cy="75" fill="#004ac6" r="4.5" stroke="#fff" strokeWidth="2"></circle>
              <circle cx="450" cy="30" fill="#004ac6" r="4.5" stroke="#fff" strokeWidth="2"></circle>
              <circle cx="600" cy="10" fill="#004ac6" r="5" stroke="#fff" strokeWidth="2.5"></circle>
            </svg>

            <div className="flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm pt-2">
              <span>تیر</span>
              <span>مرداد</span>
              <span>شهریور</span>
              <span>مهر</span>
              <span className="text-primary font-bold">آبان (جاری)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-surface-container">
            <div className="flex flex-col">
              <span className="text-on-surface-variant text-[11px]">بیشترین فروش روزانه:</span>
              <span className="font-headline-sm text-headline-sm text-on-surface">۳۸۵ م.ت (۲۱ آبان)</span>
            </div>
            <div className="flex flex-col">
              <span className="text-on-surface-variant text-[11px]">میانگین تراکنش شاپرک:</span>
              <span className="font-headline-sm text-headline-sm text-on-surface">۳۱,۴۰۰,۰۰۰ تومان</span>
            </div>
            <div className="flex flex-col">
              <span className="text-on-surface-variant text-[11px]">ضریب مالیاتی پرونده:</span>
              <span className="font-headline-sm text-headline-sm text-emerald-600">استاندارد بازرگانی ۴.۲٪</span>
            </div>
          </div>
        </div>

        {/* Payment Gateways Share (4 Cols) */}
        <div className="lg:col-span-4 bg-surface-container-lowest p-6 rounded-xl shadow-sm flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[22px]">account_balance</span>
              <h2 className="font-headline-sm text-headline-sm text-on-surface">درگاه‌های پرداخت فعال</h2>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
              شاپرک آنلاین
            </span>
          </div>

          <div className="flex flex-col gap-3.5 my-1">
            <div>
              <div className="flex justify-between font-label-sm text-label-sm mb-1 text-on-surface">
                <span>به‌پرداخت ملت (ترمینال ۲۹۳۸۴)</span>
                <span className="font-bold">۴۸٪ سهم فروش</span>
              </div>
              <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                <div className="bg-primary h-full rounded-full" style={{ width: '48%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between font-label-sm text-label-sm mb-1 text-on-surface">
                <span>سپ - پرداخت الکترونیک سامان</span>
                <span className="font-bold">۳۲٪ سهم فروش</span>
              </div>
              <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                <div className="bg-secondary h-full rounded-full" style={{ width: '32%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between font-label-sm text-label-sm mb-1 text-on-surface">
                <span>آسان پرداخت (آپ)</span>
                <span className="font-bold">۱۴٪ سهم فروش</span>
              </div>
              <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                <div className="bg-tertiary h-full rounded-full" style={{ width: '14%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between font-label-sm text-label-sm mb-1 text-on-surface">
                <span>واریز کارت به کارت / پایا</span>
                <span className="font-bold">۶٪</span>
              </div>
              <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                <div className="bg-outline h-full rounded-full" style={{ width: '6%' }}></div>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container-low flex items-center justify-between text-body-sm">
            <span className="text-on-surface-variant font-label-sm">وضعیت تطبیق مغایرت:</span>
            <span className="font-bold text-emerald-600 font-label-md">تراز صفر و تسویه کامل</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar for Tax Invoices */}
      <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-5 relative">
            <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[22px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو با شماره فاکتور، کد ملی خریدار یا شماره سفارش..."
              className="w-full h-12 pr-11 pl-4 rounded-xl bg-surface-container-low text-on-surface font-body-sm text-body-sm placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest focus:shadow-md transition-all"
            />
          </div>

          <div className="md:col-span-3 relative">
            <select
              value={gatewayFilter}
              onChange={(e) => setGatewayFilter(e.target.value)}
              className="w-full h-12 pr-4 pl-8 rounded-xl bg-surface-container-low text-on-surface font-label-md text-label-md focus:outline-none appearance-none cursor-pointer"
            >
              <option value="all">همه درگاه‌ها</option>
              <option value="ملت">بانک ملت (به‌پرداخت)</option>
              <option value="سامان">بانک سامان (سپ)</option>
              <option value="آپ">آسان پرداخت (آپ)</option>
              <option value="پایا">واریز فیش / پایا</option>
            </select>
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[18px]">
              expand_more
            </span>
          </div>

          <div className="md:col-span-2 relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-12 pr-4 pl-8 rounded-xl bg-surface-container-low text-on-surface font-label-md text-label-md focus:outline-none appearance-none cursor-pointer"
            >
              <option value="all">وضعیت مودیان: همه</option>
              <option value="approved">ارسال و تایید شده</option>
              <option value="pending_tax">در انتظار ارسال</option>
              <option value="rejected">رد شده</option>
            </select>
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[18px]">
              expand_more
            </span>
          </div>

          <div className="md:col-span-2 flex items-center justify-end gap-2">
            <button
              onClick={() => {
                setSearchQuery('');
                setGatewayFilter('all');
                setStatusFilter('all');
                showToast('فیلترهای مالی بازنشانی شدند.');
              }}
              className="h-12 w-full rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface flex items-center justify-center gap-1 font-label-md"
            >
              <span className="material-symbols-outlined text-[20px]">restart_alt</span>
              <span>بازنشانی</span>
            </button>
          </div>
        </div>
      </div>

      {/* Official Invoices Table */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 px-6 bg-surface-container-low/50 flex items-center justify-between">
          <span className="font-headline-sm text-headline-sm text-on-surface">
            دفتر کل فاکتورهای رسمی صادره (ماده ۱۶۹ مکرر)
          </span>
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            نمایش {toPersianDigits(filteredInvoices.length)} رکورد فاکتور
          </span>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-on-surface-variant font-label-md text-label-md">
                <th className="py-4 px-5">شماره فاکتور و سفارش</th>
                <th className="py-4 px-4">خریدار و کدملی</th>
                <th className="py-4 px-4">مبلغ پایه (خالص)</th>
                <th className="py-4 px-4">ارزش افزوده (۱۰٪)</th>
                <th className="py-4 px-4">مبلغ نهایی فاکتور</th>
                <th className="py-4 px-4">درگاه و کد رهگیری شاپرک</th>
                <th className="py-4 px-4 text-center">وضعیت مالیاتی</th>
                <th className="py-4 px-5 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low font-body-sm text-body-sm text-on-surface">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-surface-container-low/40 transition-colors">
                  <td className="py-4 px-5">
                    <div className="flex flex-col font-mono">
                      <span className="font-label-md text-primary font-bold">{inv.invoiceNumber}</span>
                      <span className="text-[11px] text-on-surface-variant">
                        سفارش: #{inv.orderNumber} • {inv.date}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex flex-col">
                      <span className="font-headline-sm text-headline-sm text-on-surface">
                        {inv.customerName}
                      </span>
                      <span className="text-[11px] text-on-surface-variant font-mono">
                        کد ملی: {toPersianDigits(inv.nationalId)}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4 font-mono font-bold">
                    {formatToman(inv.subtotal)}
                  </td>
                  <td className="py-4 px-4 font-mono text-secondary">
                    {formatToman(inv.vatAmount)}
                  </td>
                  <td className="py-4 px-4 font-mono font-extrabold text-primary text-[15px]">
                    {formatToman(inv.totalAmount)}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex flex-col">
                      <span className="font-label-md text-on-surface">{inv.paymentGateway}</span>
                      <span className="text-[10px] text-on-surface-variant font-mono">
                        {inv.paymentRefCode}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    {inv.status === 'approved' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-label-sm font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        تایید سامانه مودیان
                      </span>
                    )}
                    {inv.status === 'pending_tax' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-label-sm font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        در انتظار ارسال کارپوشه
                      </span>
                    )}
                    {inv.status === 'rejected' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-error-container text-on-error-container font-label-sm font-bold">
                        رد شده
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="p-1.5 rounded-lg text-primary hover:bg-surface-container transition-colors"
                        title="مشاهده فاکتور رسمی"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[20px]">visibility</span>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedInvoice(inv);
                          setTimeout(() => window.print(), 200);
                        }}
                        className="p-1.5 rounded-lg text-secondary hover:bg-surface-container transition-colors"
                        title="چاپ فاکتور رسمی"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[20px]">print</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Formal Invoice View Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-container-lowest rounded-2xl max-w-2xl w-full p-8 shadow-2xl flex flex-col gap-6 max-h-[92vh] overflow-y-auto border border-surface-container-high">
            {/* Invoice Header */}
            <div className="flex items-start justify-between pb-4 border-b-2 border-primary">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-on-primary">
                  <span className="material-symbols-outlined text-[28px]">receipt_long</span>
                </div>
                <div>
                  <h3 className="font-headline-md text-headline-md text-on-surface font-extrabold">
                    صورت‌حساب الکترونیکی فروش کالا
                  </h3>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    فروشگاه تخصصی سی‌ان‌ای موبایل (شماره ثبت بازرگانی: ۴۸۹۲۱۸)
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end text-left font-mono">
                <span className="font-bold text-primary">{selectedInvoice.invoiceNumber}</span>
                <span className="text-[11px] text-on-surface-variant">تاریخ: {selectedInvoice.date}</span>
                <span className="text-[11px] text-emerald-600 font-bold">دارای کد یکتای مالیاتی</span>
              </div>
            </div>

            {/* Buyer & Seller Info Strip */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-surface-container-low text-body-sm">
              <div className="flex flex-col gap-1">
                <span className="font-bold text-on-surface">مشخصات فروشنده:</span>
                <span>فروشگاه سی‌ان‌ای موبایل و اکسسوری</span>
                <span className="font-mono text-[11px]">شناسه ملی: ۱۰۸۶۱۹۸۲۳۰۱</span>
                <span className="text-[11px]">آدرس: مجتمع کامپیوتر پایتخت، واحد ۱۸</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-bold text-on-surface">مشخصات خریدار:</span>
                <span>{selectedInvoice.customerName}</span>
                <span className="font-mono text-[11px]">کد ملی: {toPersianDigits(selectedInvoice.nationalId)}</span>
                <span className="font-mono text-[11px]">کد سفارش: #{selectedInvoice.orderNumber}</span>
              </div>
            </div>

            {/* Financial Details Table */}
            <div className="border border-surface-container rounded-xl overflow-hidden divide-y divide-surface-container">
              <div className="p-3 bg-surface-container-low font-bold flex justify-between">
                <span>شرح کالا یا خدمات</span>
                <span>مبلغ (تومان)</span>
              </div>
              <div className="p-3 flex justify-between">
                <span>تجهیزات دیجیتال و گوشی هوشمند (سفارش #{selectedInvoice.orderNumber})</span>
                <span className="font-mono font-bold">{formatToman(selectedInvoice.subtotal)}</span>
              </div>
              <div className="p-3 flex justify-between text-secondary">
                <span>مالیات بر ارزش افزوده و عوارض قانونی (۱۰٪)</span>
                <span className="font-mono">{formatToman(selectedInvoice.vatAmount)}</span>
              </div>
              <div className="p-3.5 bg-primary/5 flex justify-between font-bold text-primary text-[16px]">
                <span>مبلغ کل قابل پرداخت با احتساب مالیات:</span>
                <span className="font-mono font-extrabold">{formatToman(selectedInvoice.totalAmount)}</span>
              </div>
            </div>

            {/* Stamp & Verification */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low/50">
              <div className="flex items-center gap-2 text-primary font-label-md">
                <span className="material-symbols-outlined text-[20px]">verified</span>
                <span>تاییدیه سامانه مودیان سازمان امور مالیاتی کشور</span>
              </div>
              <span className="font-mono text-[11px] text-on-surface-variant">
                کد رهگیری: {selectedInvoice.paymentRefCode}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-container">
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="h-10 px-5 rounded-xl bg-surface-container text-on-surface font-label-md"
              >
                بستن
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="h-10 px-6 rounded-xl bg-primary text-on-primary font-label-md flex items-center gap-1.5 shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">print</span>
                <span>چاپ فاکتور رسمی</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Invoice Modal */}
      {isNewInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[24px]">receipt</span>
                <h3 className="font-headline-md text-headline-md text-on-surface">
                  صدور فاکتور رسمی جدید
                </h3>
              </div>
              <button
                onClick={() => setIsNewInvoiceModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-surface-container text-on-surface flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateInvoiceSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-label-md text-on-surface">نام و نام خانوادگی / شرکت</label>
                <input
                  type="text"
                  required
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="مثال: شرکت بازرگانی رهپویان"
                  className="h-11 px-3 rounded-xl bg-surface-container-low text-on-surface text-body-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-md text-on-surface">کد ملی یا شناسه اقتصادی</label>
                <input
                  type="text"
                  required
                  dir="ltr"
                  value={newNationalId}
                  onChange={(e) => setNewNationalId(e.target.value)}
                  placeholder="۰۰۱۴۸۹۲۲۷۳"
                  className="h-11 px-3 rounded-xl bg-surface-container-low text-on-surface text-body-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono text-left"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-md text-on-surface">شماره سفارش مربوطه (اختیاری)</label>
                <input
                  type="text"
                  dir="ltr"
                  value={newOrderNumber}
                  onChange={(e) => setNewOrderNumber(e.target.value)}
                  placeholder="CNA-10492"
                  className="h-11 px-3 rounded-xl bg-surface-container-low text-on-surface text-body-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono text-left"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-md text-on-surface">مبلغ خالص پایه (بدون ارزش افزوده)</label>
                <input
                  type="number"
                  required
                  value={newSubtotal}
                  onChange={(e) => setNewSubtotal(e.target.value)}
                  placeholder="مثال: ۵۰۰۰۰۰۰۰"
                  className="h-11 px-3 rounded-xl bg-surface-container-low text-on-surface text-body-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono text-left"
                />
                {newSubtotal && (
                  <span className="text-[11px] text-emerald-600 font-bold">
                    + ۱۰٪ ارزش افزوده: {formatToman(Math.round(parseInt(newSubtotal || '0', 10) * 0.1))}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-md text-on-surface">درگاه پرداخت / نحوه تسویه</label>
                <select
                  value={newGateway}
                  onChange={(e) => setNewGateway(e.target.value)}
                  className="h-11 px-3 rounded-xl bg-surface-container-low text-on-surface font-label-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="درگاه بانک ملت (شاپرک)">درگاه بانک ملت (شاپرک)</option>
                  <option value="درگاه سامان کیش (سپ)">درگاه سامان کیش (سپ)</option>
                  <option value="آسان پرداخت (آپ)">آسان پرداخت (آپ)</option>
                  <option value="واریز فیش پایا / ساتنا">واریز فیش پایا / ساتنا</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-container">
                <button
                  type="button"
                  onClick={() => setIsNewInvoiceModalOpen(false)}
                  className="h-10 px-4 rounded-xl bg-surface-container text-on-surface font-label-md"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="h-10 px-6 rounded-xl bg-primary text-on-primary font-label-md shadow-sm"
                >
                  ثبت و صدور رسمی
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
