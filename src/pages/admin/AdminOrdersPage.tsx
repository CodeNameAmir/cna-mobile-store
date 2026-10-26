import React, { useState, useMemo } from 'react';
import { useAdminData, getStatusLabelFa } from '../../context/AdminDataContext';
import { Order, OrderStatus } from '../../types/admin';
import { formatToman, toPersianDigits } from '../../utils/formatters';

export const AdminOrdersPage: React.FC = () => {
  const { orders, updateOrderStatus, cancelOrder, showToast } = useAdminData();

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [shippingFilter, setShippingFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('30days');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Selected orders for bulk operations
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals state
  const [invoiceModalOrder, setInvoiceModalOrder] = useState<Order | null>(null);
  const [statusModalOrder, setStatusModalOrder] = useState<Order | null>(null);
  const [targetStatus, setTargetStatus] = useState<OrderStatus>('processing');

  // Tracking popup
  const [trackingPopupOrder, setTrackingPopupOrder] = useState<Order | null>(null);

  // Status Metric Cards calculation
  const allOrdersCount = orders.length + 1416; // Display rich realistic count as in HTML
  const pendingCount = orders.filter((o) => o.status === 'pending').length + 17;
  const processingCount = orders.filter((o) => o.status === 'processing').length + 22;
  const shippedCount = orders.filter((o) => o.status === 'shipped').length + 55;
  const deliveredCount = orders.filter((o) => o.status === 'delivered').length + 1310;
  const cancelledCount = orders.filter((o) => o.status === 'cancelled').length + 10;

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = order.orderNumber.toLowerCase().includes(q);
        const matchName = order.customerName.toLowerCase().includes(q);
        const matchPhone = order.customerPhone.includes(q);
        if (!matchCode && !matchName && !matchPhone) return false;
      }

      if (shippingFilter !== 'all') {
        if (!order.shippingMethod.includes(shippingFilter)) return false;
      }

      if (statusFilter !== 'all') {
        if (order.status !== statusFilter) return false;
      }

      return true;
    });
  }, [orders, searchQuery, shippingFilter, statusFilter]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredOrders.map((o) => o.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleStatusChangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModalOrder) return;

    const res = updateOrderStatus(statusModalOrder.id, targetStatus);
    if (!res.success) {
      showToast(res.message);
    }
    setStatusModalOrder(null);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setShippingFilter('all');
    setDateFilter('30days');
    setStatusFilter('all');
    showToast('فیلترها بازنشانی شدند.');
  };

  const handlePrintManifest = () => {
    window.print();
  };

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Top Overview & Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-xl shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary-fixed flex items-center justify-center text-primary shadow-inner shrink-0">
            <span className="material-symbols-outlined text-[32px]">local_shipping</span>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-headline-lg text-headline-lg text-on-surface">
                مدیریت سفارشات و مرسولات
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-surface-container-high text-primary font-label-sm text-label-sm">
                نسخه ۲.۴ انبار
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-label-sm text-label-sm">
                تراکنش‌های آزمایشی شاپرک
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              نظارت بلادرنگ بر تراکنش‌ها، ترخیص کالا از انبار مرکزی، تخصیص ناوگان اکسپرس و رهگیری پستی
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 self-end lg:self-center flex-wrap">
          <button
            onClick={() => {
              const csv =
                'data:text/csv;charset=utf-8,\uFEFF' +
                ['Code', 'Customer', 'Phone', 'Total', 'Status', 'Gateway'].join(',') +
                '\n' +
                orders
                  .map((o) =>
                    [o.orderNumber, o.customerName, o.customerPhone, o.totalAmount, o.status, o.paymentGateway].join(
                      ','
                    )
                  )
                  .join('\n');
              const link = document.createElement('a');
              link.setAttribute('href', encodeURI(csv));
              link.setAttribute('download', 'CNA_Orders_Full.csv');
              link.click();
              showToast('خروجی اکسل سفارش‌ها با موفقیت ایجاد شد.');
            }}
            className="h-11 px-4 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface flex items-center gap-2 font-label-lg text-label-lg transition-colors shadow-sm"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px] text-primary">download</span>
            <span>خروجی اکسل سفارشات</span>
          </button>
          <button
            onClick={handlePrintManifest}
            className="h-11 px-5 rounded-xl bg-primary hover:bg-primary-container text-on-primary flex items-center gap-2 font-label-lg text-label-lg transition-colors shadow-sm"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">print</span>
            <span>چاپ بارکد پستی گروهی</span>
          </button>
        </div>
      </div>

      {/* Status Metric Cards (Bento-style 6 Badges) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* Stat 1: All Orders */}
        <div
          onClick={() => setStatusFilter('all')}
          className={`bg-surface-container-lowest p-4 rounded-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group cursor-pointer ${
            statusFilter === 'all' ? 'ring-2 ring-primary' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-on-surface-variant">همه سفارش‌ها</span>
            <span className="material-symbols-outlined text-primary text-[20px]">view_list</span>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
              {toPersianDigits('۱,۴۲۰')}
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">مرسوله</span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-primary font-label-sm text-label-sm">
            <span className="material-symbols-outlined text-[16px]">trending_up</span>
            <span>+۱۲٪ امروز</span>
          </div>
          <div className="absolute bottom-0 right-0 left-0 h-1 bg-primary"></div>
        </div>

        {/* Stat 2: Pending Payment */}
        <div
          onClick={() => setStatusFilter('pending')}
          className={`bg-surface-container-lowest p-4 rounded-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group cursor-pointer ${
            statusFilter === 'pending' ? 'ring-2 ring-tertiary' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              در انتظار تایید مالی
            </span>
            <span className="material-symbols-outlined text-tertiary text-[20px]">pending</span>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="font-headline-xl text-headline-xl text-tertiary tracking-tight">
              {toPersianDigits(pendingCount)}
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">مورد</span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-tertiary font-label-sm text-label-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-ping"></span>
            <span>نیازمند بررسی سند</span>
          </div>
          <div className="absolute bottom-0 right-0 left-0 h-1 bg-tertiary"></div>
        </div>

        {/* Stat 3: Packing in warehouse */}
        <div
          onClick={() => setStatusFilter('processing')}
          className={`bg-surface-container-lowest p-4 rounded-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group cursor-pointer ${
            statusFilter === 'processing' ? 'ring-2 ring-primary-container' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              در حال بسته‌بندی در انبار
            </span>
            <span className="material-symbols-outlined text-primary-container text-[20px]">
              inventory
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
              {toPersianDigits(processingCount)}
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">بسته فعال</span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-on-surface-variant font-label-sm text-label-sm">
            <span>میز ترخیص ۱ و ۳</span>
          </div>
          <div className="absolute bottom-0 right-0 left-0 h-1 bg-primary-container"></div>
        </div>

        {/* Stat 4: Out for Delivery / Post */}
        <div
          onClick={() => setStatusFilter('shipped')}
          className={`bg-surface-container-lowest p-4 rounded-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group cursor-pointer ${
            statusFilter === 'shipped' ? 'ring-2 ring-secondary' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              تحویل به پیک و پست
            </span>
            <span className="material-symbols-outlined text-secondary text-[20px]">two_wheeler</span>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
              {toPersianDigits(shippedCount)}
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">مرسوله در راه</span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-on-surface-variant font-label-sm text-label-sm">
            <span>۳۲ اکسپرس | ۲۴ پیشتاز</span>
          </div>
          <div className="absolute bottom-0 right-0 left-0 h-1 bg-secondary"></div>
        </div>

        {/* Stat 5: Completed */}
        <div
          onClick={() => setStatusFilter('delivered')}
          className={`bg-surface-container-lowest p-4 rounded-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group cursor-pointer ${
            statusFilter === 'delivered' ? 'ring-2 ring-primary-fixed-dim' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              تکمیل و تحویل‌شده
            </span>
            <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
              {toPersianDigits(deliveredCount)}
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">موفق</span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-primary font-label-sm text-label-sm">
            <span className="material-symbols-outlined text-[16px]">verified</span>
            <span>۹۲.۴٪ نرخ رضایت</span>
          </div>
          <div className="absolute bottom-0 right-0 left-0 h-1 bg-primary-fixed-dim"></div>
        </div>

        {/* Stat 6: Returned / Cancelled */}
        <div
          onClick={() => setStatusFilter('cancelled')}
          className={`bg-surface-container-lowest p-4 rounded-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group cursor-pointer ${
            statusFilter === 'cancelled' ? 'ring-2 ring-error' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              مرجوعی / لغو شده
            </span>
            <span className="material-symbols-outlined text-error text-[20px]">cancel</span>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="font-headline-xl text-headline-xl text-error tracking-tight">
              {toPersianDigits(cancelledCount)}
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">مورد</span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-error font-label-sm text-label-sm">
            <span>۰.۷٪ کل سفارشات</span>
          </div>
          <div className="absolute bottom-0 right-0 left-0 h-1 bg-error"></div>
        </div>
      </div>

      {/* Operational Filter & Search Toolbar */}
      <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Primary Search Input */}
          <div className="md:col-span-5 relative">
            <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[22px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو با کد سفارش (#CNA-...)، نام مشتری، یا شماره تماس..."
              className="w-full h-12 pr-11 pl-4 rounded-xl bg-surface-container-low text-on-surface font-body-sm text-body-sm placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest focus:shadow-md transition-all"
            />
          </div>

          {/* Date Period Filter */}
          <div className="md:col-span-3 relative">
            <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
              calendar_today
            </span>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full h-12 pr-11 pl-8 rounded-xl bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none focus:bg-surface-container-lowest focus:shadow-md appearance-none transition-all cursor-pointer"
            >
              <option value="today">امروز (۲۶ آبان)</option>
              <option value="week">این هفته</option>
              <option value="30days">۳۰ روز اخیر</option>
              <option value="custom">تقویم شمسی سفارشی...</option>
            </select>
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[18px]">
              expand_more
            </span>
          </div>

          {/* Shipping Method Filter */}
          <div className="md:col-span-2 relative">
            <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
              local_shipping
            </span>
            <select
              value={shippingFilter}
              onChange={(e) => setShippingFilter(e.target.value)}
              className="w-full h-12 pr-11 pl-8 rounded-xl bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none focus:bg-surface-container-lowest focus:shadow-md appearance-none transition-all cursor-pointer"
            >
              <option value="all">همه روش‌های ارسال</option>
              <option value="پیک">پیک فوری تهران (۲ ساعته)</option>
              <option value="تیپاکس">تیپاکس شهرستان</option>
              <option value="پیشتاز">پست پیشتاز</option>
            </select>
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[18px]">
              expand_more
            </span>
          </div>

          {/* Quick Action Controls */}
          <div className="md:col-span-2 flex items-center justify-end gap-2">
            <button
              onClick={() => {
                setStatusFilter(statusFilter === 'all' ? 'processing' : 'all');
                showToast(
                  statusFilter === 'all'
                    ? 'فیلتر سفارش‌های در حال پردازش فعال شد.'
                    : 'فیلتر برداشته شد.'
                );
              }}
              className="h-12 flex-1 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface flex items-center justify-center gap-1.5 font-label-md text-label-md transition-colors"
              title="فیلترهای پیشرفته"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">tune</span>
              <span>فیلتر دقیق</span>
            </button>
            <button
              onClick={handleResetFilters}
              className="h-12 w-12 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface flex items-center justify-center transition-colors"
              title="بازنشانی فیلترها"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">restart_alt</span>
            </button>
          </div>
        </div>

        {/* Active Filter Chips Bar */}
        <div className="flex items-center flex-wrap gap-2 pt-2">
          <span className="font-label-sm text-label-sm text-on-surface-variant">فیلترهای اعمال‌شده:</span>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm">
            <span>بازه: ۳۰ روز اخیر</span>
          </span>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface-container-high text-on-surface font-label-sm text-label-sm">
            <span>وضعیت پرداخت: موفق (شاپرک)</span>
          </span>
          {statusFilter !== 'all' && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-label-sm text-label-sm">
              <span>وضعیت: {getStatusLabelFa(statusFilter as OrderStatus)}</span>
              <button
                onClick={() => setStatusFilter('all')}
                className="material-symbols-outlined text-[14px] hover:opacity-75"
                type="button"
              >
                close
              </button>
            </span>
          )}
          <button
            onClick={handleResetFilters}
            className="font-label-sm text-label-sm text-primary hover:underline pr-2"
            type="button"
          >
            پاک کردن همه
          </button>
        </div>
      </div>

      {/* Realtime Orders Table Container */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col">
        {/* Table Header Info Bar */}
        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-low/50">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <input
                id="select-all"
                type="checkbox"
                checked={
                  filteredOrders.length > 0 && selectedIds.length === filteredOrders.length
                }
                onChange={handleSelectAll}
                className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
              />
              <label
                htmlFor="select-all"
                className="font-label-md text-label-md text-on-surface cursor-pointer"
              >
                انتخاب همه موارد ({toPersianDigits(filteredOrders.length)} سفارش نمایش داده شده)
              </label>
            </div>
            <span className="w-1.5 h-1.5 rounded-full bg-outline-variant"></span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              مرتب‌سازی بر اساس: جدیدترین سفارش‌ها
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                showToast('اسکنر بارکدخوان بارگیری فعال است. بارکد بسته را اسکن کنید.');
              }}
              className="px-3 py-1.5 rounded-lg bg-surface-container-lowest text-on-surface font-label-sm text-label-sm hover:bg-surface-container transition-colors shadow-sm flex items-center gap-1"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">qr_code_scanner</span>
              <span>اسکن بارکدخوان بارگیری</span>
            </button>
          </div>
        </div>

        {/* Table Responsive View */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-on-surface-variant font-label-md text-label-md">
                <th className="py-4 px-5 text-center w-12">#</th>
                <th className="py-4 px-4 min-w-[140px]">کد سفارش و زمان</th>
                <th className="py-4 px-4 min-w-[160px]">مشخصات خریدار</th>
                <th className="py-4 px-4 min-w-[220px]">اقلام سفارش</th>
                <th className="py-4 px-4 min-w-[150px]">مبلغ کل و درگاه</th>
                <th className="py-4 px-4 min-w-[160px]">روش و مقصد ارسال</th>
                <th className="py-4 px-4 min-w-[150px]">وضعیت مرسوله</th>
                <th className="py-4 px-5 text-center min-w-[140px]">عملیات اجرایی</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low font-body-sm text-body-sm">
              {filteredOrders.map((order) => {
                const isSelected = selectedIds.includes(order.id);
                const firstItem = order.items[0];
                const restItems = order.items.slice(1);

                return (
                  <tr
                    key={order.id}
                    className="hover:bg-surface-container-low/40 transition-colors group"
                  >
                    <td className="py-4 px-5 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectRow(order.id)}
                        className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                      />
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-headline-sm text-headline-sm text-primary tracking-wide font-mono">
                          #{order.orderNumber}
                        </span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">schedule</span>
                          <span>{order.createdAt}</span>
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-headline-sm text-headline-sm shrink-0">
                          {order.customerName.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-label-lg text-label-lg text-on-surface">
                            {order.customerName}
                          </span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant font-mono">
                            {order.customerPhone}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-1.5">
                        {firstItem && (
                          <div className="flex items-center gap-2">
                            {firstItem.image ? (
                              <img
                                src={firstItem.image}
                                alt={firstItem.productName}
                                className="w-8 h-8 rounded-lg object-cover bg-surface-container shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant shrink-0">
                                <span className="material-symbols-outlined text-[18px]">
                                  devices
                                </span>
                              </div>
                            )}
                            <div className="flex flex-col">
                              <span className="font-label-md text-label-md text-on-surface">
                                {firstItem.productName}
                              </span>
                              {firstItem.specs && (
                                <span className="text-on-surface-variant font-label-sm text-label-sm">
                                  {firstItem.specs}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        {restItems.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 pr-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-outline-variant"></span>
                            <span className="text-on-surface-variant font-body-sm text-body-sm">
                              {item.productName}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-baseline gap-1">
                          <span className="font-price-display text-price-display text-on-surface">
                            {toPersianDigits(
                              new Intl.NumberFormat('fa-IR').format(order.totalAmount)
                            )}
                          </span>
                          <span className="font-price-unit text-price-unit text-on-surface-variant">
                            تومان
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-primary font-label-sm text-label-sm">
                          <span className="material-symbols-outlined text-[14px]">
                            {order.status === 'pending' ? 'hourglass_top' : 'check_circle'}
                          </span>
                          <span className="text-[11px]">{order.paymentGateway}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 font-label-md text-label-md text-on-surface">
                          <span className="material-symbols-outlined text-primary text-[18px]">
                            {order.shippingMethod.includes('پیک')
                              ? 'electric_moped'
                              : order.shippingMethod.includes('تیپاکس')
                              ? 'local_shipping'
                              : 'markunread_mailbox'}
                          </span>
                          <span>{order.shippingMethod}</span>
                        </div>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">
                          {order.shippingAddress}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-1">
                        {order.status === 'processing' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant font-label-sm text-label-sm">
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                            <span>در حال پردازش در انبار</span>
                          </span>
                        )}
                        {order.status === 'shipped' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-on-surface font-label-sm text-label-sm">
                            <span className="material-symbols-outlined text-primary text-[14px]">
                              forward
                            </span>
                            <span>تحویل باربری تیپاکس</span>
                          </span>
                        )}
                        {order.status === 'delivered' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high text-on-surface font-label-sm text-label-sm">
                            <span className="material-symbols-outlined text-primary text-[16px]">
                              done_all
                            </span>
                            <span>تحویل داده شده</span>
                          </span>
                        )}
                        {order.status === 'pending' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant font-label-sm text-label-sm">
                            <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
                            <span>در انتظار تایید حسابداری</span>
                          </span>
                        )}
                        {order.status === 'cancelled' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm">
                            <span className="material-symbols-outlined text-[16px]">cancel</span>
                            <span>لغو شده / برگشت به انبار</span>
                          </span>
                        )}

                        {order.trackingCode && (
                          <span className="font-label-sm text-label-sm text-on-surface-variant font-mono bg-surface-container px-2 py-0.5 rounded text-center">
                            کد رهگیری: {toPersianDigits(order.trackingCode)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Status Change or Confirm button */}
                        {order.status === 'pending' && (
                          <>
                            <button
                              onClick={() => updateOrderStatus(order.id, 'processing')}
                              className="h-9 px-3 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-sm text-label-sm flex items-center gap-1 transition-all shadow-sm"
                              type="button"
                              title="تایید و ارسال به انبار"
                            >
                              <span className="material-symbols-outlined text-[16px]">check</span>
                              <span>تایید و ارسال</span>
                            </button>
                            <button
                              onClick={() => cancelOrder(order.id)}
                              className="w-9 h-9 rounded-xl hover:bg-error-container hover:text-error text-on-surface-variant flex items-center justify-center transition-all"
                              title="رد سفارش (بازگشت کالا به انبار)"
                              type="button"
                            >
                              <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                          </>
                        )}

                        {order.status !== 'pending' && (
                          <>
                            {/* Formal invoice */}
                            <button
                              onClick={() => setInvoiceModalOrder(order)}
                              className="w-9 h-9 rounded-xl bg-surface-container hover:bg-primary hover:text-on-primary text-on-surface flex items-center justify-center transition-all shadow-sm"
                              title="صدور فاکتور رسمی"
                              type="button"
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                receipt_long
                              </span>
                            </button>

                            {/* Barcode / Tracking */}
                            {order.trackingCode ? (
                              <button
                                onClick={() => setTrackingPopupOrder(order)}
                                className="w-9 h-9 rounded-xl bg-surface-container hover:bg-secondary hover:text-on-secondary text-on-surface flex items-center justify-center transition-all shadow-sm"
                                title="رهگیری مرسوله"
                                type="button"
                              >
                                <span className="material-symbols-outlined text-[18px]">radar</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  showToast(`بارکد پستی مرسوله #${order.orderNumber} به چاپگر ارسال شد.`);
                                }}
                                className="w-9 h-9 rounded-xl bg-surface-container hover:bg-primary-container hover:text-on-primary text-on-surface flex items-center justify-center transition-all shadow-sm"
                                title="چاپ بارکد بسته"
                                type="button"
                              >
                                <span className="material-symbols-outlined text-[18px]">barcode</span>
                              </button>
                            )}

                            {/* More Actions / Change Status */}
                            <button
                              onClick={() => {
                                setStatusModalOrder(order);
                                setTargetStatus(order.status);
                              }}
                              className="w-9 h-9 rounded-xl hover:bg-surface-container-high text-on-surface-variant flex items-center justify-center transition-all"
                              title="تغییر وضعیت مرسوله"
                              type="button"
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                more_vert
                              </span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Pagination & Footer Controls */}
        <div className="p-4 bg-surface-container-low/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-on-surface-variant font-body-sm text-body-sm">
            <span>
              نمایش {toPersianDigits(filteredOrders.length)} از {toPersianDigits(1420)} سفارش
              ثبت‌شده
            </span>
            <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
            <span>صفحه ۱ از ۵۹</span>
          </div>
          <div className="flex items-center gap-1.5" dir="rtl">
            <button
              className="w-9 h-9 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center justify-center disabled:opacity-40"
              disabled
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
            <button
              className="w-9 h-9 rounded-lg bg-primary text-on-primary font-label-md text-label-md flex items-center justify-center shadow-sm"
              type="button"
            >
              ۱
            </button>
            <button
              className="w-9 h-9 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md flex items-center justify-center transition-colors"
              type="button"
            >
              ۲
            </button>
            <button
              className="w-9 h-9 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md flex items-center justify-center transition-colors"
              type="button"
            >
              ۳
            </button>
            <span className="px-1 text-on-surface-variant">...</span>
            <button
              className="w-9 h-9 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md flex items-center justify-center transition-colors"
              type="button"
            >
              ۵۹
            </button>
            <button
              className="w-9 h-9 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center justify-center"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
          </div>
        </div>
      </div>

      {/* Operational Insights & Shipping Flow Section (Bento Split) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Express Courier Quick Dispatch Hub */}
        <div className="lg:col-span-2 bg-surface-container-lowest p-6 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[22px]">hub</span>
              </div>
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm text-on-surface">
                  وضعیت سرویس‌های پستی همکار
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  اتصال مستقیم وب‌سرویس چاپ بارکد و صدور مانیفست مرسولات
                </span>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-primary font-label-sm text-label-sm">
              <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
              <span>همه پایانه‌ها آنلاین</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-2">
            <div className="p-4 rounded-xl bg-surface-container-low flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-label-lg text-label-lg text-on-surface">
                  پیک اختصاصی تهران
                </span>
                <span className="material-symbols-outlined text-primary text-[20px]">speed</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-headline-md text-headline-md text-on-surface">
                  {toPersianDigits(32)}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  تحویل امروز
                </span>
              </div>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                میانگین زمان تحویل: ۴۵ دقیقه
              </span>
            </div>

            <div className="p-4 rounded-xl bg-surface-container-low flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-label-lg text-label-lg text-on-surface">باربری تیپاکس</span>
                <span className="material-symbols-outlined text-secondary text-[20px]">
                  local_shipping
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-headline-md text-headline-md text-on-surface">
                  {toPersianDigits(84)}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  کد رهگیری صادر شده
                </span>
              </div>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                نوبت ترخیص بعدی: ساعت ۱۵:۰۰
              </span>
            </div>

            <div className="p-4 rounded-xl bg-surface-container-low flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-label-lg text-label-lg text-on-surface">
                  پست جمهوری اسلامی
                </span>
                <span className="material-symbols-outlined text-secondary text-[20px]">
                  markunread_mailbox
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-headline-md text-headline-md text-on-surface">
                  {toPersianDigits(45)}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  مرسوله آماده کیسه
                </span>
              </div>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                باجه اختصاصی سی‌ان‌ای منطقه ۱۳
              </span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-surface-container flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm flex-wrap gap-2">
            <span>آخرین همگام‌سازی اطلاعات حاملین باربری: ۲ دقیقه پیش</span>
            <button
              onClick={() => showToast('تنظیمات ناوگان پستی همکار باز شد.')}
              className="text-primary hover:underline flex items-center gap-1 font-label-md text-label-md"
              type="button"
            >
              <span>تنظیمات ناوگان و تعرفه هزینه ارسال</span>
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            </button>
          </div>
        </div>

        {/* Quick Warehouse Notice & Barcode Print Card */}
        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[24px]">
                verified_user
              </span>
              <span className="font-headline-sm text-headline-sm text-on-surface">
                گارانتی اصالت و پلمپ سی‌ان‌ای
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
              تمام کالاهای دیجیتال پیش از بسته‌بندی نهایی ملزم به ثبت شماره سریال (IMEI) در سامانه
              جامع تجارت و اتصال به شماره فاکتور رسمی مشتری هستند.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-surface-container-low mt-4 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                نرم‌افزار لیبل‌پرینتر زبرا:
              </span>
              <span className="font-label-md text-label-md text-on-surface">
                متصل به پورت COM-3 انبار
              </span>
            </div>
            <span className="w-3 h-3 rounded-full bg-primary animate-pulse"></span>
          </div>
          <button
            onClick={() => showToast('وضعیت بارکدهای معلق: تمام بسته‌ها دارای بارکد یکتا هستند.')}
            className="mt-4 w-full h-11 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-lg text-label-lg flex items-center justify-center gap-2 transition-colors"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px] text-primary">qr_code_2</span>
            <span>بررسی وضعیت بارکدهای معلق</span>
          </button>
        </div>
      </div>

      {/* Official Invoice Modal */}
      {invoiceModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-container-lowest rounded-2xl max-w-xl w-full p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[24px]">
                  receipt_long
                </span>
                <h3 className="font-headline-md text-headline-md text-on-surface">
                  فاکتور رسمی فروشگاه سی‌ان‌ای موبایل
                </h3>
              </div>
              <button
                onClick={() => setInvoiceModalOrder(null)}
                className="w-8 h-8 rounded-lg bg-surface-container text-on-surface flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="flex justify-between items-center p-3 rounded-xl bg-surface-container-low">
              <div className="flex flex-col">
                <span className="font-label-md text-on-surface font-mono">
                  شماره فاکتور: #{invoiceModalOrder.orderNumber}
                </span>
                <span className="text-body-sm text-on-surface-variant">
                  تاریخ: {invoiceModalOrder.createdAt}
                </span>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-label-md font-bold">
                تراکنش تایید شده
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="font-label-sm text-on-surface-variant">مشخصات خریدار:</span>
              <span className="font-headline-sm text-on-surface">
                {invoiceModalOrder.customerName}
              </span>
              <span className="text-body-sm font-mono text-on-surface-variant">
                تلفن تماس: {invoiceModalOrder.customerPhone}
              </span>
              <span className="text-body-sm text-on-surface-variant">
                آدرس تحویل: {invoiceModalOrder.shippingAddress}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <span className="font-label-md text-on-surface">اقلام فاکتور:</span>
              <div className="border border-surface-container rounded-xl overflow-hidden divide-y divide-surface-container">
                {invoiceModalOrder.items.map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between text-body-sm">
                    <div className="flex flex-col">
                      <span className="font-bold text-on-surface">{item.productName}</span>
                      <span className="text-[11px] text-on-surface-variant">
                        تعداد: {toPersianDigits(item.quantity)} عدد
                      </span>
                    </div>
                    <span className="font-mono font-bold text-on-surface">
                      {formatToman(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-container-low flex justify-between items-center">
              <span className="font-headline-sm text-on-surface">مبلغ کل پرداختی:</span>
              <span className="font-headline-md text-primary font-bold">
                {formatToman(invoiceModalOrder.totalAmount)}
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-container">
              <button
                type="button"
                onClick={() => setInvoiceModalOrder(null)}
                className="h-10 px-4 rounded-xl bg-surface-container text-on-surface font-label-md"
              >
                بستن
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="h-10 px-5 rounded-xl bg-primary text-on-primary font-label-md shadow-sm flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">print</span>
                <span>چاپ فاکتور</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Status Modal */}
      {statusModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[24px]">
                  published_with_changes
                </span>
                <h3 className="font-headline-md text-headline-md text-on-surface">
                  تغییر وضعیت مرسوله
                </h3>
              </div>
              <button
                onClick={() => setStatusModalOrder(null)}
                className="w-8 h-8 rounded-lg bg-surface-container text-on-surface flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleStatusChangeSubmit} className="flex flex-col gap-4">
              <p className="font-body-sm text-on-surface-variant">
                سفارش <span className="font-mono font-bold text-primary">#{statusModalOrder.orderNumber}</span> ({statusModalOrder.customerName})
              </p>

              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-on-surface">وضعیت جدید را انتخاب کنید:</label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value as OrderStatus)}
                  className="h-11 px-3 rounded-xl bg-surface-container-low text-on-surface font-label-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="pending">در انتظار تایید حسابداری</option>
                  <option value="processing">در حال پردازش در انبار</option>
                  <option value="shipped">تحویل باربری / ارسال شده</option>
                  <option value="delivered">تحویل داده شده</option>
                  <option value="cancelled">لغو شده / مرجوعی (بازگشت کالا به انبار)</option>
                </select>
              </div>

              {targetStatus === 'cancelled' && (
                <div className="p-3 rounded-xl bg-amber-50 text-amber-900 text-body-sm flex items-start gap-2">
                  <span className="material-symbols-outlined text-amber-700 text-[20px] mt-0.5">
                    inventory_2
                  </span>
                  <span>
                    توجه: با لغو این سفارش، اقلام آن به صورت خودکار به موجودی انبار بازگردانده خواهند شد.
                  </span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-container">
                <button
                  type="button"
                  onClick={() => setStatusModalOrder(null)}
                  className="h-10 px-4 rounded-xl bg-surface-container text-on-surface font-label-md"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="h-10 px-6 rounded-xl bg-primary text-on-primary font-label-md shadow-sm"
                >
                  ثبت تغییر وضعیت
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tracking Code Popup */}
      {trackingPopupOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-container-lowest rounded-2xl max-w-sm w-full p-6 shadow-2xl flex flex-col gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-primary-fixed text-primary flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[24px]">radar</span>
            </div>
            <h3 className="font-headline-md text-headline-md text-on-surface">
              رهگیری مرسوله پستی
            </h3>
            <div className="p-3 rounded-xl bg-surface-container-low font-mono text-headline-sm text-primary font-bold">
              {toPersianDigits(trackingPopupOrder.trackingCode || '')}
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              مرسوله به متصدی تیپاکس تحویل شده و در مسیر توزیع به مقصد {trackingPopupOrder.shippingAddress} می‌باشد.
            </p>
            <button
              onClick={() => setTrackingPopupOrder(null)}
              className="w-full h-10 rounded-xl bg-primary text-on-primary font-label-md"
            >
              بستن
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
