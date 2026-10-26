import React, { useState, useMemo } from 'react';
import { useAdminData } from '../../context/AdminDataContext';
import { DiscountCoupon } from '../../types/admin';
import { formatToman, toPersianDigits } from '../../utils/formatters';

export const AdminDiscountsPage: React.FC = () => {
  const { coupons, addCoupon, toggleCouponActive, deleteCoupon, showToast } = useAdminData();

  const [searchQuery, setSearchQuery] = useState('');
  const [audienceFilter, setAudienceFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Modal State
  const [isNewCouponModalOpen, setIsNewCouponModalOpen] = useState(false);
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'percent' | 'fixed'>('percent');
  const [value, setValue] = useState<string>('10');
  const [minOrder, setMinOrder] = useState<string>('1000000');
  const [maxCap, setMaxCap] = useState<string>('500000');
  const [maxUsage, setMaxUsage] = useState<string>('200');
  const [targetAudience, setTargetAudience] = useState<'all' | 'vip' | 'new_customers'>('all');
  const [startDate, setStartDate] = useState('۱۴۰۳/۰۸/۲۲');
  const [endDate, setEndDate] = useState('۱۴۰۳/۰۹/۳۰');

  // KPI computations
  const activeCouponsCount = coupons.filter((c) => c.isActive).length;
  const totalRedeemedCount = coupons.reduce((sum, c) => sum + c.usageCount, 0);

  // Filtered coupons
  const filteredCoupons = useMemo(() => {
    return coupons.filter((c) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = c.code.toLowerCase().includes(q);
        const matchTitle = c.title.toLowerCase().includes(q);
        if (!matchCode && !matchTitle) return false;
      }

      if (audienceFilter !== 'all') {
        if (c.targetAudience !== audienceFilter) return false;
      }

      if (typeFilter !== 'all') {
        if (c.type !== typeFilter) return false;
      }

      return true;
    });
  }, [coupons, searchQuery, audienceFilter, typeFilter]);

  const handleCopyCode = (couponCode: string) => {
    navigator.clipboard.writeText(couponCode);
    showToast(`کد تخفیف "${couponCode}" در حافظه کپی شد.`);
  };

  const handleCreateCouponSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedVal = parseInt(value.replace(/[^\d]/g, ''), 10);
    const parsedMin = parseInt(minOrder.replace(/[^\d]/g, ''), 10) || 0;
    const parsedCap = maxCap ? parseInt(maxCap.replace(/[^\d]/g, ''), 10) : undefined;
    const parsedMaxUsage = parseInt(maxUsage.replace(/[^\d]/g, ''), 10) || 100;

    if (!code.trim() || !title.trim() || isNaN(parsedVal) || parsedVal <= 0) {
      showToast('لطفاً مشخصات کد تخفیف را کامل کنید.');
      return;
    }

    addCoupon({
      code: code.trim().toUpperCase(),
      title: title.trim(),
      type,
      value: parsedVal,
      minOrderAmount: parsedMin,
      maxDiscountCap: parsedCap,
      maxUsage: parsedMaxUsage,
      startDate,
      endDate,
      isActive: true,
      targetAudience
    });

    setIsNewCouponModalOpen(false);
    setCode('');
    setTitle('');
    setValue('10');
  };

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Top Banner / Headline Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-xl shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-tertiary-fixed flex items-center justify-center text-tertiary shadow-inner shrink-0">
            <span className="material-symbols-outlined text-[32px]">sell</span>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-headline-lg text-headline-lg text-on-surface">
                کدهای تخفیف، جشنواره‌ها و پروموشن‌ها
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-surface-container-high text-tertiary font-label-sm text-label-sm font-bold">
                کمپین‌های پاییز ۱۴۰۳
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              تعریف کوپن‌های تخفیف ریالی و درصدی، مدیریت کدهای اختصاصی باشگاه مشتریان طلایی و تخفیف‌های ویژه اولین خرید
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end lg:self-center flex-wrap">
          <button
            onClick={() => {
              showToast('کمپین ویژه بلک‌فرایدی فعال و آماده‌سازی شد.');
            }}
            className="h-11 px-4 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface flex items-center gap-2 font-label-lg text-label-lg transition-colors shadow-sm"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px] text-tertiary">celebration</span>
            <span>تنظیم جشنواره بلک‌فرایدی</span>
          </button>
          <button
            onClick={() => setIsNewCouponModalOpen(true)}
            className="h-11 px-5 rounded-xl bg-primary hover:bg-primary-container text-on-primary flex items-center gap-2 font-label-lg text-label-lg transition-colors shadow-sm"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>ایجاد کد تخفیف جدید</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Stat 1: Active Coupons */}
        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className="font-label-md text-label-md text-on-surface-variant">
                کدهای تخفیف فعال
              </span>
              <span className="font-headline-xl text-headline-xl text-on-surface font-extrabold mt-1">
                {toPersianDigits(activeCouponsCount)}{' '}
                <span className="font-label-md text-label-md text-on-surface-variant font-normal">
                  کد فعال
                </span>
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary-fixed text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[26px]">confirmation_number</span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-primary text-body-sm font-label-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>در حال استفاده توسط کاربران</span>
          </div>
        </div>

        {/* Stat 2: Total Redemptions */}
        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className="font-label-md text-label-md text-on-surface-variant">
                دفعات استفاده شده
              </span>
              <span className="font-headline-xl text-headline-xl text-primary font-extrabold mt-1">
                {toPersianDigits(totalRedeemedCount)}{' '}
                <span className="font-label-md text-label-md text-on-surface-variant font-normal">
                  تراکنش
                </span>
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-secondary-fixed text-secondary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[26px]">shopping_cart_checkout</span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-emerald-600 text-body-sm font-label-sm">
            <span className="material-symbols-outlined text-[16px]">trending_up</span>
            <span>+۲۲٪ افزایش نسبت به ماه قبل</span>
          </div>
        </div>

        {/* Stat 3: Total Discount Value */}
        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className="font-label-md text-label-md text-on-surface-variant">
                مجموع تخفیف‌های اعطا شده
              </span>
              <span className="font-headline-xl text-headline-xl text-tertiary font-extrabold mt-1">
                {toPersianDigits('۳۸,۵۰۰,۰۰۰')}{' '}
                <span className="font-label-md text-label-md text-on-surface-variant font-normal">
                  تومان
                </span>
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-tertiary-fixed text-tertiary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[26px]">savings</span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-body-sm text-on-surface-variant">
            <span>میانگین تخفیف هر سبد:</span>
            <span className="font-bold text-on-surface">۶۰,۸۰۰ تومان</span>
          </div>
        </div>

        {/* Stat 4: Conversion Lift */}
        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className="font-label-md text-label-md text-on-surface-variant">
                نرخ نهایی‌سازی سبد خرید
              </span>
              <span className="font-headline-xl text-headline-xl text-emerald-600 font-extrabold mt-1">
                {toPersianDigits('۳۴.۲٪')}
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[26px]">loyalty</span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-emerald-600 text-body-sm font-label-sm">
            <span>+۸.۱٪ با اعمال کوپن‌های طلایی</span>
          </div>
        </div>
      </div>

      {/* Featured Campaign Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-l from-primary/10 via-surface-container-low to-tertiary/10 border border-primary/20 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary text-on-primary flex items-center justify-center shadow-md shrink-0">
            <span className="material-symbols-outlined text-[36px]">auto_awesome</span>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-primary text-on-primary font-label-sm font-bold">
                جشنواره اصلی پاییز
              </span>
              <h2 className="font-headline-md text-headline-md text-on-surface">
                جشنواره شگفت‌انگیز پاییزه سی‌ان‌ای (Yalda Warm-Up)
              </h2>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              کد <span className="font-mono font-bold text-primary">CNA-YALDA</span> برای ۱۰٪ تخفیف تا سقف ۱.۵ میلیون تومان روی گوشی‌های آیفون و سامسونگ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleCopyCode('CNA-YALDA')}
            className="h-11 px-4 rounded-xl bg-surface-container-lowest hover:bg-surface-container text-primary font-label-md flex items-center gap-2 shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">content_copy</span>
            <span>کپی کد جشنواره</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-6 relative">
            <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[22px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو بر اساس عنوان کمپین، کد تخفیف (مثال: CNA-YALDA)..."
              className="w-full h-12 pr-11 pl-4 rounded-xl bg-surface-container-low text-on-surface font-body-sm text-body-sm placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest focus:shadow-md transition-all"
            />
          </div>

          <div className="md:col-span-3 relative">
            <select
              value={audienceFilter}
              onChange={(e) => setAudienceFilter(e.target.value)}
              className="w-full h-12 pr-4 pl-8 rounded-xl bg-surface-container-low text-on-surface font-label-md text-label-md focus:outline-none appearance-none cursor-pointer"
            >
              <option value="all">همه مخاطبان</option>
              <option value="vip">باشگاه مشتریان طلایی (VIP)</option>
              <option value="new_customers">کاربران اولین خرید</option>
            </select>
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[18px]">
              expand_more
            </span>
          </div>

          <div className="md:col-span-3 relative">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full h-12 pr-4 pl-8 rounded-xl bg-surface-container-low text-on-surface font-label-md text-label-md focus:outline-none appearance-none cursor-pointer"
            >
              <option value="all">همه انواع تخفیف</option>
              <option value="percent">درصدی (٪)</option>
              <option value="fixed">مبلغ ثابت ریالی</option>
            </select>
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[18px]">
              expand_more
            </span>
          </div>
        </div>
      </div>

      {/* Coupons Table */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 px-6 bg-surface-container-low/50 flex items-center justify-between">
          <span className="font-headline-sm text-headline-sm text-on-surface">
            لیست کوپن‌ها و کدهای فعال در سبد خرید
          </span>
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            نمایش {toPersianDigits(filteredCoupons.length)} از {toPersianDigits(coupons.length)} مورد
          </span>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-on-surface-variant font-label-md text-label-md">
                <th className="py-4 px-5">کد تخفیف</th>
                <th className="py-4 px-4">عنوان کمپین و جشنواره</th>
                <th className="py-4 px-4">مقدار و نوع تخفیف</th>
                <th className="py-4 px-4">حداقل خرید و سقف</th>
                <th className="py-4 px-4 min-w-[170px]">میزان استفاده</th>
                <th className="py-4 px-4">بازه اعتبار</th>
                <th className="py-4 px-4 text-center">وضعیت فعال</th>
                <th className="py-4 px-5 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low font-body-sm text-body-sm text-on-surface">
              {filteredCoupons.map((coupon) => {
                const percentUsed = Math.min(
                  100,
                  Math.round((coupon.usageCount / coupon.maxUsage) * 100)
                );

                return (
                  <tr key={coupon.id} className="hover:bg-surface-container-low/40 transition-colors">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-extrabold text-[15px] text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                          {coupon.code}
                        </span>
                        <button
                          onClick={() => handleCopyCode(coupon.code)}
                          className="text-on-surface-variant hover:text-primary p-1"
                          title="کپی کد"
                        >
                          <span className="material-symbols-outlined text-[16px]">content_copy</span>
                        </button>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <span className="font-headline-sm text-headline-sm text-on-surface">
                          {coupon.title}
                        </span>
                        <span className="text-[11px] text-on-surface-variant">
                          مخاطبان:{' '}
                          {coupon.targetAudience === 'vip'
                            ? 'باشگاه طلایی (VIP)'
                            : coupon.targetAudience === 'new_customers'
                            ? 'خرید اولی‌ها'
                            : 'همه کاربران'}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {coupon.type === 'percent' ? (
                        <span className="font-headline-sm text-headline-sm text-emerald-600 font-bold">
                          {toPersianDigits(coupon.value)}٪ تخفیف
                        </span>
                      ) : (
                        <span className="font-headline-sm text-headline-sm text-primary font-bold">
                          {formatToman(coupon.value)}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col text-[12px]">
                        <span>حداقل: {formatToman(coupon.minOrderAmount)}</span>
                        {coupon.maxDiscountCap && (
                          <span className="text-on-surface-variant">
                            سقف: {formatToman(coupon.maxDiscountCap)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between text-[11px] font-mono">
                          <span>{toPersianDigits(coupon.usageCount)} استفاده</span>
                          <span>از {toPersianDigits(coupon.maxUsage)} سقف</span>
                        </div>
                        <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-primary h-full rounded-full transition-all"
                            style={{ width: `${percentUsed}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-on-surface-variant text-[11px] font-mono">
                      <span>{coupon.startDate} تا {coupon.endDate}</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => toggleCouponActive(coupon.id)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          coupon.isActive ? 'bg-primary' : 'bg-surface-container-high'
                        }`}
                        title={coupon.isActive ? 'فعال' : 'غیرفعال'}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-surface-container-lowest shadow-md transition-transform ${
                            coupon.isActive ? '-translate-x-5' : '-translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="py-4 px-5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            if (window.confirm(`آیا از حذف کد "${coupon.code}" مطمئن هستید؟`)) {
                              deleteCoupon(coupon.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-error hover:bg-error-container/40 transition-colors"
                          title="حذف کد تخفیف"
                        >
                          <span className="material-symbols-outlined text-[19px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create New Coupon Modal */}
      {isNewCouponModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[24px]">sell</span>
                <h3 className="font-headline-md text-headline-md text-on-surface">
                  تعریف کد تخفیف جدید
                </h3>
              </div>
              <button
                onClick={() => setIsNewCouponModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-surface-container text-on-surface flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateCouponSubmit} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-label-md text-on-surface">کد تخفیف (لاتین) *</label>
                  <input
                    type="text"
                    required
                    dir="ltr"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="مثال: CNA-VIP20"
                    className="h-11 px-3 rounded-xl bg-surface-container-low text-on-surface font-mono text-left uppercase focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-md text-on-surface">عنوان کمپین *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="تخفیف ویژه آخر هفته"
                    className="h-11 px-3 rounded-xl bg-surface-container-low text-on-surface text-body-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-label-md text-on-surface">نوع تخفیف</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as 'percent' | 'fixed')}
                    className="h-11 px-3 rounded-xl bg-surface-container-low text-on-surface font-label-md focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                  >
                    <option value="percent">درصدی (٪)</option>
                    <option value="fixed">مبلغ ثابت ریالی (تومان)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-md text-on-surface">
                    {type === 'percent' ? 'درصد تخفیف (مثال: ۱۵)' : 'مبلغ تخفیف به تومان'}
                  </label>
                  <input
                    type="number"
                    required
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="h-11 px-3 rounded-xl bg-surface-container-low text-on-surface font-mono text-left focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-label-md text-on-surface">حداقل مبلغ سفارش (تومان)</label>
                  <input
                    type="number"
                    value={minOrder}
                    onChange={(e) => setMinOrder(e.target.value)}
                    placeholder="۱۰۰۰۰۰۰"
                    className="h-11 px-3 rounded-xl bg-surface-container-low text-on-surface font-mono text-left focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-md text-on-surface">سقف تخفیف (تومان)</label>
                  <input
                    type="number"
                    value={maxCap}
                    onChange={(e) => setMaxCap(e.target.value)}
                    placeholder="۵۰۰۰۰۰"
                    className="h-11 px-3 rounded-xl bg-surface-container-low text-on-surface font-mono text-left focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-label-md text-on-surface">سقف تعداد استفاده</label>
                  <input
                    type="number"
                    value={maxUsage}
                    onChange={(e) => setMaxUsage(e.target.value)}
                    placeholder="۲۰۰"
                    className="h-11 px-3 rounded-xl bg-surface-container-low text-on-surface font-mono text-left focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-md text-on-surface">مخاطبان هدف</label>
                  <select
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value as any)}
                    className="h-11 px-3 rounded-xl bg-surface-container-low text-on-surface font-label-md focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                  >
                    <option value="all">همه مشتریان</option>
                    <option value="vip">باشگاه مشتریان طلایی (VIP)</option>
                    <option value="new_customers">کاربران اولین خرید</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-container">
                <button
                  type="button"
                  onClick={() => setIsNewCouponModalOpen(false)}
                  className="h-10 px-4 rounded-xl bg-surface-container text-on-surface font-label-md"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="h-10 px-6 rounded-xl bg-primary text-on-primary font-label-md shadow-sm"
                >
                  ثبت و فعال‌سازی کد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
