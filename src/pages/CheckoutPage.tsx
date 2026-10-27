import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MapPin,
  Truck,
  CreditCard,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  ShoppingBag,
  Info,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { orderService } from '../services/orderService';
import { ShippingAddress } from '../types';
import { formatPersianNumber, toPersianDigits } from '../utils/formatters';

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    items,
    totalItemsCount,
    subtotalAmount,
    discountAmount,
    shippingCost,
    finalPayableAmount,
  } = useCart();

  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [shippingMethod, setShippingMethod] = useState<'express' | 'tipax' | 'post'>('express');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isValidatedPreview, setIsValidatedPreview] = useState(false);

  const [address, setAddress] = useState<ShippingAddress>({
    name: 'علیرضا محمدی',
    phone: '09123456789',
    city: 'تهران',
    address: 'خیابان ولیعصر، بالاتر از میرداماد، کوچه سرو، پلاک ۲۴، واحد ۶',
    postalCode: '1987654321',
    notes: 'تحویل بین ساعت ۱۴ الی ۱۸',
  });

  // Guard: Empty cart
  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">سبد خرید شما خالی است</h2>
        <p className="text-sm text-slate-500 mb-6">
          برای دسترسی به صفحه تسویه حساب، ابتدا باید کالایی را به سبد خرید خود اضافه فرمایید.
        </p>
        <Link
          to="/catalog"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
        >
          <span>مشاهده محصولات فروشگاه</span>
          <ArrowLeft className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = orderService.validateAddress(address);
    if (!result.isValid) {
      setValidationErrors(result.errors);
      return;
    }
    setValidationErrors({});
    setActiveStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStep2Submit = () => {
    setActiveStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePreviewVerification = () => {
    // Phase 3 Rule: No false order commitment or fake gateway success
    setIsValidatedPreview(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full" dir="rtl">
      {/* Disclaimer Banner: Phase 3 Scope Clarification */}
      <div className="mb-8 p-4 rounded-2xl bg-blue-50/80 border border-blue-200/90 flex items-start gap-3 text-start">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs sm:text-sm font-bold text-blue-900">
            پیش‌نمایش فرآیند تسویه حساب و اعتبارسنجی داده‌ها (فاز ۳)
          </h4>
          <p className="text-[11px] sm:text-xs text-blue-700 leading-relaxed mt-1">
            در این فاز ساختار اعتبارسنجی فرم‌ها و جریان کاربری تسویه حساب آماده‌سازی شده است. طبق الزامات معماری، هیچ سفارش جعلی یا پرداخت ساختگی ثبت قطعی نمی‌شود و محاسبه نهایی مبالغ، کسر موجودی و ثبت تراکنشی در فاز اتصال به سرور اتمیک خواهد بود.
          </p>
        </div>
      </div>

      {/* Stepper Navigation */}
      <div className="mb-8 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="grid grid-cols-3 gap-2 text-center">
          <button
            type="button"
            onClick={() => setActiveStep(1)}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-colors ${
              activeStep === 1
                ? 'bg-blue-600 text-white'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>۱. اطلاعات تحویل</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const res = orderService.validateAddress(address);
              if (res.isValid) {
                setValidationErrors({});
                setActiveStep(2);
              }
            }}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-colors ${
              activeStep === 2
                ? 'bg-blue-600 text-white'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>۲. شیوه ارسال</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const res = orderService.validateAddress(address);
              if (res.isValid) {
                setActiveStep(3);
              }
            }}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-colors ${
              activeStep === 3
                ? 'bg-blue-600 text-white'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>۳. پیش‌نمایش پرداخت</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Step Content (8 cols) */}
        <div className="lg:col-span-8 space-y-6 text-start">
          {activeStep === 1 && (
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-2xs">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                <span>مشخصات تحویل‌گیرنده و نشانی پستی</span>
              </h2>
              <p className="text-xs text-slate-500 mb-6">
                لطفاً اطلاعات زیر را با دقت بررسی و تکمیل نمایید.
              </p>

              <form onSubmit={handleStep1Submit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      نام و نام خانوادگی تحویل‌گیرنده *
                    </label>
                    <input
                      type="text"
                      value={address.name}
                      onChange={(e) => setAddress({ ...address, name: e.target.value })}
                      className={`w-full h-11 px-3.5 rounded-xl bg-slate-50 border text-xs focus:bg-white focus:outline-none focus:ring-1 ${
                        validationErrors.name
                          ? 'border-red-400 focus:ring-red-500 bg-red-50/30'
                          : 'border-slate-200 focus:ring-blue-600'
                      }`}
                      placeholder="مثال: علیرضا محمدی"
                    />
                    {validationErrors.name && (
                      <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>{validationErrors.name}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      شماره تماس همراه (جهت هماهنگی مرسوله) *
                    </label>
                    <input
                      type="text"
                      value={address.phone}
                      onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                      className={`w-full h-11 px-3.5 rounded-xl bg-slate-50 border text-xs text-left focus:bg-white focus:outline-none focus:ring-1 ${
                        validationErrors.phone
                          ? 'border-red-400 focus:ring-red-500 bg-red-50/30'
                          : 'border-slate-200 focus:ring-blue-600'
                      }`}
                      dir="ltr"
                      placeholder="09123456789"
                    />
                    {validationErrors.phone && (
                      <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>{validationErrors.phone}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">شهر *</label>
                    <input
                      type="text"
                      value={address.city}
                      onChange={(e) => setAddress({ ...address, city: e.target.value })}
                      className={`w-full h-11 px-3.5 rounded-xl bg-slate-50 border text-xs focus:bg-white focus:outline-none focus:ring-1 ${
                        validationErrors.city
                          ? 'border-red-400 focus:ring-red-500 bg-red-50/30'
                          : 'border-slate-200 focus:ring-blue-600'
                      }`}
                      placeholder="مثال: تهران"
                    />
                    {validationErrors.city && (
                      <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>{validationErrors.city}</span>
                      </p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      کد پستی ۱۰ رقمی *
                    </label>
                    <input
                      type="text"
                      value={address.postalCode}
                      onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
                      className={`w-full h-11 px-3.5 rounded-xl bg-slate-50 border text-xs text-left focus:bg-white focus:outline-none focus:ring-1 ${
                        validationErrors.postalCode
                          ? 'border-red-400 focus:ring-red-500 bg-red-50/30'
                          : 'border-slate-200 focus:ring-blue-600'
                      }`}
                      dir="ltr"
                      placeholder="1987654321"
                    />
                    {validationErrors.postalCode && (
                      <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>{validationErrors.postalCode}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    نشانی دقیق پستی (خیابان، کوچه، پلاک، واحد) *
                  </label>
                  <textarea
                    rows={3}
                    value={address.address}
                    onChange={(e) => setAddress({ ...address, address: e.target.value })}
                    className={`w-full p-3.5 rounded-xl bg-slate-50 border text-xs leading-relaxed focus:bg-white focus:outline-none focus:ring-1 ${
                      validationErrors.address
                        ? 'border-red-400 focus:ring-red-500 bg-red-50/30'
                        : 'border-slate-200 focus:ring-blue-600'
                    }`}
                    placeholder="تهران، خیابان ولیعصر..."
                  />
                  {validationErrors.address && (
                    <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>{validationErrors.address}</span>
                    </p>
                  )}
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <Link
                    to="/cart"
                    className="text-xs text-slate-500 hover:text-slate-800 font-semibold inline-flex items-center gap-1"
                  >
                    <ArrowRight className="w-4 h-4" />
                    <span>بازگشت به سبد خرید</span>
                  </Link>
                  <button
                    type="submit"
                    className="h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-2 transition-colors shadow-xs"
                  >
                    <span>ادامه و انتخاب روش ارسال</span>
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeStep === 2 && (
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" />
                <span>انتخاب شیوه تحویل مرسوله</span>
              </h2>

              <div className="space-y-3">
                <label
                  onClick={() => setShippingMethod('express')}
                  className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                    shippingMethod === 'express'
                      ? 'border-blue-600 bg-blue-50/30 ring-1 ring-blue-600'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="shipping"
                    checked={shippingMethod === 'express'}
                    onChange={() => setShippingMethod('express')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs sm:text-sm font-bold text-slate-900">
                        پیک اختصاصی تهران (اکسپرس ۲ ساعته)
                      </span>
                      <span className="text-xs font-bold text-blue-600">
                        {shippingCost === 0 ? 'رایگان' : `${formatPersianNumber(shippingCost)} تومان`}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      مخصوص سفارش‌های شهر تهران با بسته‌بندی امن و تحویل فوری.
                    </p>
                  </div>
                </label>

                <label
                  onClick={() => setShippingMethod('tipax')}
                  className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                    shippingMethod === 'tipax'
                      ? 'border-blue-600 bg-blue-50/30 ring-1 ring-blue-600'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="shipping"
                    checked={shippingMethod === 'tipax'}
                    onChange={() => setShippingMethod('tipax')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs sm:text-sm font-bold text-slate-900">
                        ارسال پیشتاز تیپاکس (سراسر کشور)
                      </span>
                      <span className="text-xs font-bold text-blue-600">
                        {shippingCost === 0 ? 'رایگان' : `${formatPersianNumber(shippingCost)} تومان`}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      تحویل ۲۴ الی ۴۸ ساعته با کد رهگیری آنلاین و بیمه کامل کالاهای دیجیتال.
                    </p>
                  </div>
                </label>

                <label
                  onClick={() => setShippingMethod('post')}
                  className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                    shippingMethod === 'post'
                      ? 'border-blue-600 bg-blue-50/30 ring-1 ring-blue-600'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="shipping"
                    checked={shippingMethod === 'post'}
                    onChange={() => setShippingMethod('post')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs sm:text-sm font-bold text-slate-900">
                        پست پیشتاز جمهوری اسلامی ایران
                      </span>
                      <span className="text-xs font-bold text-blue-600">
                        {shippingCost === 0 ? 'رایگان' : `${formatPersianNumber(shippingCost)} تومان`}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      پوشش ۱۰۰ درصدی تمام نقاط کشور با امکان دریافت درب منزل.
                    </p>
                  </div>
                </label>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveStep(1)}
                  className="text-xs text-slate-500 hover:text-slate-800 font-semibold inline-flex items-center gap-1"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>مرحله قبل (اصلاح آدرس)</span>
                </button>
                <button
                  type="button"
                  onClick={handleStep2Submit}
                  className="h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-2 transition-colors shadow-xs"
                >
                  <span>ادامه به مرحله پرداخت</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {activeStep === 3 && (
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <span>بررسی نهایی و پیش‌نمایش اعتبارسنجی تسویه حساب</span>
              </h2>

              {/* Verified Information Summary */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">تحویل‌گیرنده:</span>
                  <strong className="text-slate-900">{address.name} ({toPersianDigits(address.phone)})</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">نشانی پستی:</span>
                  <span className="text-slate-800 text-start">{address.city} - {address.address}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">کد پستی:</span>
                  <span className="text-slate-800 font-mono" dir="ltr">{toPersianDigits(address.postalCode)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">روش ارسال:</span>
                  <span className="text-blue-700 font-bold">
                    {shippingMethod === 'express' ? 'پیک اکسپرس تهران' : shippingMethod === 'tipax' ? 'تیپاکس سراسری' : 'پست پیشتاز'}
                  </span>
                </div>
              </div>

              {isValidatedPreview ? (
                <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-emerald-900">
                    اعتبارسنجی ورودی‌های تسویه حساب با موفقیت انجام شد
                  </h3>
                  <p className="text-xs text-emerald-700 max-w-lg mx-auto leading-relaxed">
                    اطلاعات آدرس و مقادیر سبد خرید با موفقیت تأیید اعتبار شدند. برای رعایت اصل یکپارچگی داده‌ها، هیچ سفارش جعلی در دیتابیس ثبت نشد و تراکنش نهایی با اتصال به بک‌اند اتمیک در فاز بعد فعال خواهد گردید.
                  </p>
                  <div className="pt-2">
                    <Link
                      to="/catalog"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors"
                    >
                      <span>بازگشت به کاتالوگ فروشگاه</span>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-dashed border-slate-300 text-slate-600 text-xs leading-relaxed">
                    با کلیک بر روی دکمه زیر، صحت مقادیر ورودی در لایه سرویس اعتبارسنجی می‌شود.
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveStep(2)}
                      className="text-xs text-slate-500 hover:text-slate-800 font-semibold inline-flex items-center gap-1"
                    >
                      <ArrowRight className="w-4 h-4" />
                      <span>مرحله قبل</span>
                    </button>
                    <button
                      type="button"
                      onClick={handlePreviewVerification}
                      className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-2 transition-colors shadow-xs"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>تأیید و اعتبارسنجی مقادیر فرم</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar Summary (4 cols) */}
        <div className="lg:col-span-4 space-y-4 text-start">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
              <span>خلاصه فاکتور تسویه</span>
              <span className="text-xs text-slate-500">{toPersianDigits(totalItemsCount)} کالا</span>
            </h3>

            {/* Item list preview */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {items.map((it) => (
                <div key={it.id} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50">
                  <div className="flex-1 pr-2">
                    <p className="font-semibold text-slate-800 line-clamp-1">{it.product.titleFa}</p>
                    <span className="text-[11px] text-slate-400">
                      {toPersianDigits(it.quantity)} عدد · {it.selectedColor}
                    </span>
                  </div>
                  <span className="text-slate-700 font-bold shrink-0">
                    {formatPersianNumber(it.price * it.quantity)} تومان
                  </span>
                </div>
              ))}
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-2.5 pt-2 text-xs border-t border-slate-100">
              <div className="flex justify-between text-slate-500">
                <span>قیمت کل کالاها:</span>
                <span className="text-slate-800 font-medium">{formatPersianNumber(subtotalAmount)} تومان</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span>مجموع تخفیف‌ها:</span>
                  <span className="font-bold">- {formatPersianNumber(discountAmount)} تومان</span>
                </div>
              )}

              <div className="flex justify-between text-slate-500">
                <span>هزینه بسته‌بندی و ارسال:</span>
                <span className="font-medium text-slate-800">
                  {shippingCost === 0 ? 'رایگان' : `${formatPersianNumber(shippingCost)} تومان`}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">مبلغ نهایی پیش‌نمایش:</span>
                <div className="text-blue-600 font-black text-base">
                  {formatPersianNumber(finalPayableAmount)} <span className="text-xs text-slate-500 font-normal">تومان</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
