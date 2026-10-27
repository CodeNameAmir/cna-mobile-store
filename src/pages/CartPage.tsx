import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Truck,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Headphones,
  ArrowLeft,
  ArrowRight,
  PackageCheck,
  Sparkles,
  AlertTriangle,
  Gift,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatPersianNumber, toPersianDigits } from '../utils/formatters';
import { PRODUCTS } from '../services/mockData';

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    items,
    totalItemsCount,
    subtotalAmount,
    discountAmount,
    shippingCost,
    finalPayableAmount,
    appliedCoupon,
    couponMessage,
    updateQuantity,
    removeItem,
    clearCart,
    applyCoupon,
    removeCoupon,
    addItem,
  } = useCart();

  const [couponCode, setCouponCode] = useState('');
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutComplete, setCheckoutComplete] = useState(false);

  // Form for Step 2
  const [shippingAddress, setShippingAddress] = useState({
    name: 'مهدی رضایی',
    phone: '۰۹۱۲۳۴۵۶۷۸۹',
    city: 'تهران',
    address: 'خیابان ولیعصر، بالاتر از پارک ساعی، پلاک ۱۲۴، واحد ۳',
    postalCode: '۱۹۸۷۶۵۴۳۲۱',
  });

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    applyCoupon(couponCode);
  };

  const handleProceedToStep2 = () => {
    setActiveStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFinalOrder = () => {
    setIsCheckingOut(true);
    setTimeout(() => {
      setIsCheckingOut(false);
      setCheckoutComplete(true);
      clearCart();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 1500);
  };

  // Upsell bundle accessory items
  const upsellItems = [
    PRODUCTS.find((p) => p.slug === 'anker-30w-charger') || PRODUCTS[5],
    PRODUCTS.find((p) => p.slug === 'nillkin-h-pro-glass') || PRODUCTS[6],
    PRODUCTS.find((p) => p.slug === 'anker-maggo-qi2-10000') || PRODUCTS[7],
  ].filter(Boolean);

  if (checkoutComplete) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-start">
        <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-md space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <PackageCheck className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">سفارش شما با موفقیت ثبت شد!</h1>
          <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            کد رهگیری پیش‌فاکتور دمو: <strong className="text-slate-900 font-mono" dir="ltr">CNA-ORDER-98214</strong>
          </p>
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 leading-relaxed text-justify max-w-lg mx-auto">
            <AlertTriangle className="w-4 h-4 text-amber-600 inline me-1.5" />
            توجه: این یک ثبت سفارش آزمایشی در محیط توسعه است و هیچ وجهی کسر نشده است. ساختار دیتابیس آماده ارسال اطلاعات به جدول Orders در Supabase است.
          </div>
          <div className="pt-4 flex items-center justify-center gap-3">
            <button
              onClick={() => {
                setCheckoutComplete(false);
                setActiveStep(1);
                navigate('/catalog');
              }}
              className="h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-2xs"
            >
              بازگشت به فروشگاه
            </button>
            <button
              onClick={() => {
                setCheckoutComplete(false);
                setActiveStep(1);
                navigate('/');
              }}
              className="h-11 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
            >
              صفحه اصلی
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full pb-16">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 w-full">
        {/* Progress Stepper (RTL) */}
        <section className="pt-4 pb-8">
          <div className="bg-white shadow-2xs border border-slate-200/80 rounded-2xl p-4 md:p-6">
            <div className="flex items-center justify-between max-w-3xl mx-auto relative">
              {/* Progress Line */}
              <div className="absolute top-1/2 right-12 left-12 h-1 bg-slate-200 -translate-y-1/2 z-0">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-300"
                  style={{
                    width: activeStep === 1 ? '15%' : activeStep === 2 ? '55%' : '100%',
                  }}
                ></div>
              </div>

              {/* Step 1 */}
              <button
                type="button"
                onClick={() => setActiveStep(1)}
                className="relative z-10 flex flex-col items-center gap-1.5 text-center group cursor-pointer focus:outline-none"
              >
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-xs transition-all ${
                    activeStep === 1
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100 scale-105'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <span className={`text-xs font-bold ${activeStep === 1 ? 'text-blue-600' : 'text-slate-800'}`}>
                  ۱. سبد خرید
                </span>
                <span className="hidden sm:inline text-[11px] text-slate-400">بررسی و ویرایش اقلام</span>
              </button>

              {/* Step 2 */}
              <button
                type="button"
                onClick={() => items.length > 0 && setActiveStep(2)}
                disabled={items.length === 0}
                className={`relative z-10 flex flex-col items-center gap-1.5 text-center group focus:outline-none ${
                  items.length === 0 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                    activeStep === 2
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100 scale-105 shadow-xs'
                      : activeStep > 2
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}
                >
                  <Truck className="w-5 h-5" />
                </div>
                <span className={`text-xs font-bold ${activeStep === 2 ? 'text-blue-600' : 'text-slate-700'}`}>
                  ۲. زمان و نحوه ارسال
                </span>
                <span className="hidden sm:inline text-[11px] text-slate-400">انتخاب آدرس و زمان تحویل</span>
              </button>

              {/* Step 3 */}
              <button
                type="button"
                onClick={() => items.length > 0 && setActiveStep(3)}
                disabled={items.length === 0}
                className={`relative z-10 flex flex-col items-center gap-1.5 text-center focus:outline-none ${
                  items.length === 0 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                    activeStep === 3
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100 scale-105 shadow-xs'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}
                >
                  <Lock className="w-5 h-5" />
                </div>
                <span className={`text-xs font-bold ${activeStep === 3 ? 'text-blue-600' : 'text-slate-700'}`}>
                  ۳. پرداخت اینترنتی
                </span>
                <span className="hidden sm:inline text-[11px] text-slate-400">درگاه امن بانکی</span>
              </button>
            </div>
          </div>
        </section>

        {/* Empty Cart State */}
        {items.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 border border-slate-200/80 shadow-2xs text-center space-y-4 max-w-2xl mx-auto my-8">
            <div className="w-20 h-20 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <ShoppingBag className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-black text-slate-900">سبد خرید شما خالی است!</h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              می‌توانید برای مشاهده محصولات و خرید انواع گوشی‌های هوشمند و لوازم جانبی به صفحه کاتالوگ مراجعه نمایید.
            </p>
            <div className="pt-2">
              <Link
                to="/catalog"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-sm"
              >
                <span>مشاهده فروشگاه و خرید گوشی</span>
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          /* Main Cart Content 2-Column Grid */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Right Column: Cart Items & Step details (8 cols) */}
            <div className="lg:col-span-8 flex flex-col gap-6 text-start">
              {activeStep === 1 && (
                <>
                  {/* Cart Header Meta Card */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                        <ShoppingBag className="w-5 h-5" />
                      </div>
                      <div>
                        <h1 className="text-sm sm:text-base font-black text-slate-900">
                          سبد خرید شما
                        </h1>
                        <p className="text-xs text-slate-500">
                          {toPersianDigits(totalItemsCount)} محصول در سبد شما آماده ثبت نهایی است
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-xs font-semibold border border-blue-100">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      <span>آماده ارسال فوری توسط پیک و پست ویژه</span>
                    </div>
                  </div>

                  {/* Cart Items Stream */}
                  <div className="space-y-4">
                    {items.map((item) => {
                      const discountPct =
                        item.originalPrice && item.originalPrice > item.price
                          ? Math.round(
                              ((item.originalPrice - item.price) / item.originalPrice) * 100
                            )
                          : 0;

                      return (
                        <div
                          key={item.id}
                          className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row gap-5 relative transition-all"
                        >
                          {/* Discount Pill */}
                          {discountPct > 0 && (
                            <span className="absolute top-4 end-4 bg-orange-600 text-white px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-2xs">
                              {toPersianDigits(discountPct)}٪ تخفیف
                            </span>
                          )}

                          {/* Thumbnail */}
                          <div className="w-full md:w-32 h-32 bg-slate-50 rounded-xl p-2 flex items-center justify-center shrink-0 border border-slate-200/60">
                            <img
                              src={item.product.imageUrl}
                              alt={item.product.titleFa}
                              className="object-contain w-full h-full"
                            />
                          </div>

                          {/* Details & Specs */}
                          <div className="flex-1 flex flex-col justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-xs">
                                <span className="font-semibold text-slate-600">
                                  {item.product.brand}
                                </span>
                                <span className="text-slate-300">•</span>
                                <span className="text-emerald-700 font-semibold flex items-center gap-1 text-[11px]">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                  موجود در انبار مرکزی تهران
                                </span>
                              </div>

                              <Link
                                to={`/product/${item.product.slug}`}
                                className="block text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors"
                              >
                                {item.product.titleFa}
                              </Link>

                              {/* Attributes */}
                              <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-slate-600">
                                {item.selectedColor && (
                                  <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg">
                                    <span className="w-3 h-3 rounded-full bg-slate-500 border border-white"></span>
                                    <span>رنگ: {item.selectedColor}</span>
                                  </div>
                                )}
                                {item.selectedStorage && (
                                  <div className="bg-slate-100 px-2.5 py-1 rounded-lg font-mono">
                                    <span>ظرفیت: {toPersianDigits(item.selectedStorage)}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg">
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  <span>گارانتی ۱۸ ماهه همراه رجیستری شرکتی</span>
                                </div>
                              </div>
                            </div>

                            {/* Stepper & Price Row */}
                            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-4 mt-3 border-t border-slate-100">
                              {/* Quantity Stepper Controller */}
                              <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl self-start">
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(item.id, 1)}
                                  className="w-8 h-8 rounded-lg bg-white text-slate-800 hover:bg-slate-200 flex items-center justify-center font-bold shadow-2xs transition-colors"
                                  title="افزایش تعداد"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                                <span className="text-xs font-bold w-8 text-center text-slate-900">
                                  {toPersianDigits(item.quantity)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(item.id, -1)}
                                  className="w-8 h-8 rounded-lg bg-white text-slate-800 hover:bg-slate-200 flex items-center justify-center font-bold shadow-2xs transition-colors"
                                  title="کاهش تعداد"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeItem(item.id)}
                                  className="w-8 h-8 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center transition-colors ms-1"
                                  title="حذف کالا"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              {/* Price Calculation for Item */}
                              <div className="text-start sm:text-end flex flex-col items-start sm:items-end">
                                {item.originalPrice && item.originalPrice > item.price && (
                                  <span className="text-xs text-slate-400 line-through">
                                    {formatPersianNumber(item.originalPrice * item.quantity)} تومان
                                  </span>
                                )}
                                <div className="flex items-baseline gap-1 text-blue-600 font-black text-base sm:text-lg">
                                  <span>{formatPersianNumber(item.price * item.quantity)}</span>
                                  <span className="text-xs font-normal text-slate-500">تومان</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Delivery Perk Notice Banner */}
                  <div className="bg-blue-50/80 border border-blue-200/80 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                        <Gift className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-bold text-slate-900">
                          سفارش شما مشمول ارسال رایگان اکسپرس شد!
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          هزینه ارسال به سراسر ایران برای مبالغ بیش از ۱,۰۰۰,۰۰۰ تومان کاملاً رایگان است.
                        </p>
                      </div>
                    </div>
                    <CheckCircle2 className="w-6 h-6 text-blue-600 hidden sm:inline shrink-0" />
                  </div>

                  {/* Cross-sell Bundle Section */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5 text-orange-600" />
                        <h3 className="text-sm font-bold text-slate-900">
                          لوازم جانبی و مکمل پیشنهادی برای سبد شما
                        </h3>
                      </div>
                      <span className="text-[11px] font-bold text-orange-700 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-full">
                        پیشنهاد باندل تخفیف‌دار
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                      {upsellItems.map((item) => (
                        <div
                          key={item.id}
                          className="bg-slate-50 border border-slate-200/70 p-3.5 rounded-xl flex flex-col justify-between hover:bg-slate-100/70 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-14 h-14 bg-white rounded-lg p-1 flex items-center justify-center shrink-0 border border-slate-200/60">
                              <img
                                src={item.imageUrl}
                                alt={item.titleFa}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-slate-900 truncate">
                                {item.titleFa}
                              </h4>
                              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                {item.tags?.[0] || 'اورجینال'}
                              </p>
                              <div className="text-blue-600 font-bold text-xs mt-1">
                                {formatPersianNumber(item.price)} تومان
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => addItem(item)}
                            className="mt-3 w-full h-8 rounded-lg bg-white border border-slate-200 text-blue-600 hover:bg-blue-600 hover:text-white text-xs font-bold transition-colors flex items-center justify-center gap-1 shadow-2xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>افزودن به سبد</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Step 2: Shipping & Delivery Selection */}
              {activeStep === 2 && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">آدرس تحویل سفارش</h2>
                      <p className="text-xs text-slate-500">انتخاب محل دریافت کالا و بازه زمانی ارسال اکسپرس</p>
                    </div>
                    <button
                      onClick={() => setActiveStep(1)}
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>ویرایش اقلام سبد</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          نام و نام خانوادگی تحویل‌گیرنده:
                        </label>
                        <input
                          type="text"
                          value={shippingAddress.name}
                          onChange={(e) => setShippingAddress({ ...shippingAddress, name: e.target.value })}
                          className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          شماره موبایل هماهنگی:
                        </label>
                        <input
                          type="text"
                          value={shippingAddress.phone}
                          onChange={(e) => setShippingAddress({ ...shippingAddress, phone: e.target.value })}
                          className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        آدرس پستی کامل:
                      </label>
                      <textarea
                        rows={2}
                        value={shippingAddress.address}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, address: e.target.value })}
                        className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800"
                      />
                    </div>
                  </div>

                  {/* Delivery time slots */}
                  <div className="space-y-3 pt-2">
                    <h3 className="text-xs font-bold text-slate-900">انتخاب بازه تحویل اکسپرس:</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="p-3.5 rounded-xl border-2 border-blue-600 bg-blue-50/50 flex items-center justify-between cursor-pointer">
                        <div className="flex items-center gap-2">
                          <input type="radio" name="delivery-slot" defaultChecked className="text-blue-600" />
                          <div>
                            <span className="text-xs font-bold text-slate-900 block">ارسال فوری امروز (تهران)</span>
                            <span className="text-[11px] text-slate-500">ساعت ۱۷:۰۰ الی ۲۱:۰۰ پیک اختصاصی CNA</span>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-emerald-600">رایگان</span>
                      </label>

                      <label className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between cursor-pointer">
                        <div className="flex items-center gap-2">
                          <input type="radio" name="delivery-slot" className="text-blue-600" />
                          <div>
                            <span className="text-xs font-bold text-slate-900 block">پست پیشتاز هوایی</span>
                            <span className="text-[11px] text-slate-500">تحویل ۲۴ الی ۴۸ ساعته سراسر کشور</span>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-emerald-600">رایگان</span>
                      </label>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => setActiveStep(3)}
                      className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors shadow-2xs"
                    >
                      تایید آدرس و رفتن به مرحله پرداخت
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Payment Gateway Choice */}
              {activeStep === 3 && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">درگاه پرداخت اینترنتی</h2>
                      <p className="text-xs text-slate-500">اتصال به درگاه امن شبکه شاپرک با کلیه کارت‌های عضو شتاب</p>
                    </div>
                    <button
                      onClick={() => setActiveStep(2)}
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>تغییر آدرس ارسال</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    <label className="p-4 rounded-xl border-2 border-blue-600 bg-blue-50/50 flex items-center justify-between cursor-pointer">
                      <div className="flex items-center gap-3">
                        <input type="radio" name="payment-method" defaultChecked className="text-blue-600" />
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">درگاه پرداخت سداد بانک ملی (دمو)</span>
                          <span className="text-[11px] text-slate-500">پرداخت امن و سریع شتابی بدون کارمزد</span>
                        </div>
                      </div>
                      <ShieldCheck className="w-5 h-5 text-blue-600" />
                    </label>

                    <label className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between cursor-pointer">
                      <div className="flex items-center gap-3">
                        <input type="radio" name="payment-method" className="text-blue-600" />
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">درگاه به‌پرداخت ملت (دمو)</span>
                          <span className="text-[11px] text-slate-500">سرعت بالا با تاییدیه پیامکی</span>
                        </div>
                      </div>
                      <ShieldCheck className="w-5 h-5 text-slate-400" />
                    </label>
                  </div>

                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed">
                    <strong>شفافیت دمو:</strong> پس از فشردن دکمه پرداخت، ثبت آزمایشی بدون کسر وجه واقعی انجام شده و فاکتور نهایی صادر می‌گردد.
                  </div>

                  <button
                    onClick={handleFinalOrder}
                    disabled={isCheckingOut}
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    {isCheckingOut ? (
                      <span>در حال برقراری ارتباط با درگاه...</span>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>پرداخت آنلاین ({formatPersianNumber(finalPayableAmount)} تومان)</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Left Column: Sticky Order Summary & Invoice (4 cols) */}
            <div className="lg:col-span-4 sticky top-40 flex flex-col gap-5 text-start">
              {/* Order Invoice Summary Card */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h2 className="text-sm font-bold text-slate-900">خلاصه پیش‌فاکتور</h2>
                  <span className="text-xs text-slate-400 font-mono">شناسه: CNA-98214</span>
                </div>

                {/* Calculation Lines */}
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between text-slate-800">
                    <span className="text-slate-500">قیمت کالاها ({toPersianDigits(totalItemsCount)} کالا)</span>
                    <div className="flex items-center gap-1 font-bold">
                      <span>{formatPersianNumber(subtotalAmount)}</span>
                      <span className="text-[10px] text-slate-400 font-normal">تومان</span>
                    </div>
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex items-center justify-between text-orange-600 font-semibold">
                      <div className="flex items-center gap-1">
                        <span>تخفیف کالاها</span>
                        <span className="text-[10px] bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded font-bold">
                          ویژه
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>- {formatPersianNumber(discountAmount)}</span>
                        <span className="text-[10px] font-normal">تومان</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-slate-800">
                    <span className="text-slate-500">هزینه ارسال</span>
                    <span className="text-xs font-bold text-blue-600">
                      {shippingCost === 0 ? 'رایگان' : `${formatPersianNumber(shippingCost)} تومان`}
                    </span>
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex items-center justify-between text-slate-500 pt-2 border-t border-slate-100">
                      <span>سود شما از این خرید:</span>
                      <span className="text-orange-600 font-bold">
                        {formatPersianNumber(discountAmount)} تومان
                      </span>
                    </div>
                  )}
                </div>

                {/* Discount Code Input Box */}
                <div className="pt-2 border-t border-slate-100">
                  <label className="block text-xs font-bold text-slate-800 mb-2">
                    کد تخفیف یا کارت هدیه دارید؟
                  </label>
                  <form onSubmit={handleApplyCoupon} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="مثال: CNA-OFF"
                      className="flex-1 h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 uppercase focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                    <button
                      type="submit"
                      className="h-10 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-colors shrink-0"
                    >
                      ثبت کد
                    </button>
                  </form>

                  {couponMessage && (
                    <p
                      className={`text-[11px] mt-1.5 font-medium ${
                        couponMessage.isError ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {couponMessage.text}
                    </p>
                  )}

                  {appliedCoupon && (
                    <div className="mt-2 flex items-center justify-between text-[11px] bg-emerald-50 text-emerald-800 p-2 rounded-lg">
                      <span>کد فعال: {appliedCoupon}</span>
                      <button
                        type="button"
                        onClick={removeCoupon}
                        className="text-rose-600 hover:underline"
                      >
                        حذف کد
                      </button>
                    </div>
                  )}
                </div>

                {/* Total Payable Block */}
                <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="block text-[11px] text-slate-400">مبلغ نهایی قابل پرداخت:</span>
                    <span className="text-[10px] text-slate-500">شامل مالیات و عوارض</span>
                  </div>
                  <div className="flex items-baseline gap-1 text-blue-600">
                    <span className="text-xl font-black">
                      {formatPersianNumber(finalPayableAmount)}
                    </span>
                    <span className="text-xs text-slate-500 font-normal">تومان</span>
                  </div>
                </div>

                {/* Primary CTA */}
                {activeStep === 1 && (
                  <button
                    type="button"
                    onClick={() => navigate('/checkout')}
                    className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
                  >
                    <span>ادامه فرایند خرید و ثبت آدرس</span>
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}

                {/* Return Link */}
                <div className="text-center pt-1">
                  <Link
                    to="/catalog"
                    className="text-xs text-slate-500 hover:text-blue-600 font-medium inline-flex items-center gap-1 transition-colors"
                  >
                    <span>انصراف و بازگشت به فروشگاه</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Trust Badges & Guarantee Micro-card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="text-xs text-slate-700">
                    <strong className="text-slate-900 block">تضمین اصالت قطعی:</strong>
                    دستگاه‌ها با کد رجیستری و گارانتی معتبر شرکتی ارسال می‌شوند.
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div className="text-xs text-slate-700">
                    <strong className="text-slate-900 block">درگاه امن و مطمئن:</strong>
                    تراکنش مستقیم از طریق درگاه‌های شاپرک بانک مرکزی (نسخه دمو).
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Headphones className="w-4 h-4" />
                  </div>
                  <div className="text-xs text-slate-700">
                    <strong className="text-slate-900 block">پشتیبانی تلفنی و آنلاین:</strong>
                    کارشناسان فروش سی‌ان‌ای در تمام مراحل خرید همراه شما هستند.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
