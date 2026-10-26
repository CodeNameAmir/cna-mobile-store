import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Heart,
  Share2,
  ShieldCheck,
  CheckCircle2,
  Check,
  Star,
  ThumbsUp,
  CreditCard,
  ShoppingCart,
  Zap,
  Truck,
  RotateCcw,
  Plus,
  Minus,
  SlidersHorizontal,
  Tv,
  Cpu,
  Camera,
  BatteryCharging,
  QrCode,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { PRODUCTS } from '../services/mockData';
import { Breadcrumb } from '../components/layout/Breadcrumb';
import { PriceTag } from '../components/ui/PriceTag';
import { useCart } from '../context/CartContext';
import { formatPersianNumber, toPersianDigits } from '../utils/formatters';
import { Product } from '../types';

export const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();

  // Find product by slug or id, fallback to iphone-16-pro-max
  const product: Product =
    PRODUCTS.find((p) => p.slug === slug || p.id === slug) || PRODUCTS[0];

  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [selectedColor, setSelectedColor] = useState(
    product.colors[0]?.name || 'تیتانیوم کویری (Desert Titanium)'
  );
  const [selectedStorage, setSelectedStorage] = useState(
    product.storageOptions[0] || '256GB'
  );
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [activeTab, setActiveTab] = useState<'specs' | 'review' | 'comments'>('specs');

  // Dynamic price adjustment based on storage
  const basePrice = product.price;
  const currentPrice =
    selectedStorage === '512GB'
      ? basePrice + 12300000
      : selectedStorage === '1TB'
      ? basePrice + 25600000
      : basePrice;

  const originalPrice = product.originalPrice
    ? selectedStorage === '512GB'
      ? product.originalPrice + 13000000
      : selectedStorage === '1TB'
      ? product.originalPrice + 27000000
      : product.originalPrice
    : undefined;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setActiveImageIdx(0);
  }, [slug]);

  const handleAddToCart = () => {
    addItem(
      {
        ...product,
        price: currentPrice,
        originalPrice,
      },
      selectedColor,
      selectedStorage,
      quantity
    );
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate('/cart');
  };

  // Upsell complementary accessories
  const complementaryAccessories = PRODUCTS.filter(
    (p) => p.category === 'cases-screen' || p.category === 'chargers'
  ).slice(0, 4);

  return (
    <div className="flex flex-col w-full pb-16">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 w-full">
        {/* Top Breadcrumb & Metadata */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <Breadcrumb
            items={[
              { label: 'گوشی موبایل', to: '/catalog' },
              { label: product.brand, to: `/catalog?q=${product.brand}` },
              { label: product.titleFa },
            ]}
          />

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
              <QrCode className="w-3.5 h-3.5 text-blue-600" />
              <span>کد کالا: CNA-{product.slug.toUpperCase().slice(0, 9)}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>شناسه ریجستری همتا تایید شده</span>
            </div>
          </div>
        </div>

        {/* Main 3-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Right Column: Product Gallery & Badges (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs relative flex flex-col items-center">
              {/* Floating Status Badges */}
              <div className="absolute top-4 end-4 flex flex-col gap-1.5 z-10">
                <span className="bg-orange-600 text-white px-2.5 py-1 rounded-lg text-xs font-bold shadow-2xs">
                  پیشنهاد طلایی CNA
                </span>
                <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-blue-100 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  پرچمدار ۲۰۲۵
                </span>
              </div>

              {/* Action Buttons */}
              <div className="absolute top-4 start-4 flex flex-col gap-2 z-10">
                <button
                  onClick={() => setIsWishlisted(!isWishlisted)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors border border-slate-200 shadow-2xs ${
                    isWishlisted ? 'bg-rose-50 text-rose-500' : 'bg-slate-50 text-slate-400 hover:text-rose-500'
                  }`}
                  title="افزودن به علاقه‌مندی‌ها"
                >
                  <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    alert('لینک کالا در حافظه موقت کپی شد.');
                  }}
                  className="w-9 h-9 rounded-full bg-slate-50 text-slate-400 hover:text-blue-600 flex items-center justify-center transition-colors border border-slate-200 shadow-2xs"
                  title="اشتراک‌گذاری"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>

              {/* Main Feature Image */}
              <div className="w-full h-72 sm:h-88 flex items-center justify-center py-4">
                <img
                  src={product.galleryImages[activeImageIdx] || product.imageUrl}
                  alt={product.titleFa}
                  className="w-full h-full object-contain filter drop-shadow-xl transition-all duration-300"
                />
              </div>

              {/* Thumbnails Row */}
              <div className="grid grid-cols-5 gap-2 w-full pt-4 border-t border-slate-100">
                {product.galleryImages.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIdx(idx)}
                    className={`p-1.5 rounded-xl border transition-all flex items-center justify-center h-16 ${
                      activeImageIdx === idx
                        ? 'bg-blue-50 border-blue-600 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <img src={imgUrl} alt={`عکس ${idx + 1}`} className="h-full object-contain" />
                  </button>
                ))}
                {product.galleryImages.length < 5 && (
                  <button className="p-1.5 rounded-xl bg-slate-50 border border-slate-200 text-blue-600 flex flex-col items-center justify-center gap-0.5 h-16">
                    <span className="text-xs font-bold">۳۶۰°</span>
                    <span className="text-[10px] text-slate-500">نمای سه‌بعدی</span>
                  </button>
                )}
              </div>
            </div>

            {/* Trust Features Strip Under Image */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2.5 p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs text-start">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-900 block truncate">ضمانت رجیستری</span>
                  <span className="text-[11px] text-slate-500 block truncate">ثبت رسمی در سامانه همتا</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs text-start">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-900 block truncate">پلمپ اصلی اپل</span>
                  <span className="text-[11px] text-slate-500 block truncate">دارای کد پارت‌نامبر</span>
                </div>
              </div>
            </div>
          </div>

          {/* Center Column: Core Specs & Options (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6 text-start">
            {/* Title & Ratings */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-600">
                <span>پرچمدار رسمی {product.brand}</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500">{product.specs.simType || 'دو سیم‌کارت فیزیکی'}</span>
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                {product.titleFa}
              </h1>

              <p className="text-xs text-slate-400 font-mono tracking-tight" dir="ltr">
                {product.titleEn}
              </p>

              <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs">
                <div className="flex items-center gap-1 bg-amber-50 text-amber-800 px-2.5 py-1 rounded-md border border-amber-200/60 font-semibold">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-current" />
                  <span>{toPersianDigits(product.rating)}</span>
                  <span className="text-slate-400 font-normal">
                    ({toPersianDigits(product.reviewsCount)} نظر خریداران)
                  </span>
                </div>
                <span className="text-slate-300">|</span>
                <div className="flex items-center gap-1 text-slate-600 font-medium">
                  <ThumbsUp className="w-3.5 h-3.5 text-blue-600" />
                  <span>۹۶٪ کاربران این کالا را پیشنهاد کرده‌اند</span>
                </div>
              </div>
            </div>

            {/* Color Selection */}
            <div className="flex flex-col gap-2.5 p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">انتخاب رنگ:</span>
                <span className="font-semibold text-blue-600">{selectedColor}</span>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                {product.colors.map((c) => {
                  const isSelected = selectedColor === c.name;
                  return (
                    <button
                      key={c.name}
                      onClick={() => setSelectedColor(c.name)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs transition-all ${
                        isSelected
                          ? 'bg-blue-50 border-blue-600 font-bold shadow-2xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full shadow-inner flex items-center justify-center border border-slate-300"
                        style={{ backgroundColor: c.hex }}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 text-white drop-shadow-xs" />}
                      </span>
                      <span>{c.name.split(' (')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Storage Selection */}
            <div className="flex flex-col gap-2.5 p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">حافظه داخلی دستگاه:</span>
                <span className="text-slate-400 text-[11px]">رم یکپارچه هوش مصنوعی</span>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {product.storageOptions.map((storage) => {
                  const isSelected = selectedStorage === storage;
                  const desc =
                    storage === '256GB'
                      ? 'نسخه استاندارد'
                      : storage === '512GB'
                      ? 'پیشنهاد ادیتورها'
                      : 'فیلمبرداری ProRes';

                  return (
                    <button
                      key={storage}
                      onClick={() => setSelectedStorage(storage)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900 font-bold shadow-2xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="block text-xs sm:text-sm font-bold">
                        {toPersianDigits(storage)}
                      </span>
                      <span
                        className={`block text-[10px] mt-0.5 ${
                          isSelected ? 'text-slate-300' : 'text-slate-400'
                        }`}
                      >
                        {desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Warranty Box */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-xs font-bold text-slate-800 block mb-2">گارانتی و خدمات شرکتی:</span>
              <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/70 border border-blue-100">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-6 h-6 text-blue-600 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      {product.warrantyFa}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      شامل تعویض قطعات اصلی، پوشش نوسان برق و شکستگی با فرانشیز
                    </span>
                  </div>
                </div>
                <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
              </div>
            </div>

            {/* Quick Spec Highlights Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-white rounded-xl border border-slate-200/80 text-center shadow-2xs">
                <Tv className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                <span className="text-[10px] text-slate-400 block">صفحه‌نمایش</span>
                <span className="text-xs font-bold text-slate-900 block mt-0.5">
                  {product.specs.screen?.slice(0, 12) || 'OLED'}
                </span>
                <span className="text-[10px] text-slate-500">۱۲۰Hz ProMotion</span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200/80 text-center shadow-2xs">
                <Cpu className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                <span className="text-[10px] text-slate-400 block">تراشه پردازنده</span>
                <span className="text-xs font-bold text-slate-900 block mt-0.5">
                  {product.specs.processor?.slice(0, 15) || 'A18 Pro'}
                </span>
                <span className="text-[10px] text-slate-500">معماری ۳ نانومتر</span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200/80 text-center shadow-2xs">
                <Camera className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                <span className="text-[10px] text-slate-400 block">دوربین سه‌گانه</span>
                <span className="text-xs font-bold text-slate-900 block mt-0.5">
                  ۴۸ + ۴۸ + ۱۲ MP
                </span>
                <span className="text-[10px] text-slate-500">زوم اپتیکال ۵ برابر</span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200/80 text-center shadow-2xs">
                <BatteryCharging className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                <span className="text-[10px] text-slate-400 block">باتری و شارژ</span>
                <span className="text-xs font-bold text-slate-900 block mt-0.5">
                  {product.specs.battery?.slice(0, 12) || '۴۶۸۵ میلی‌آمپر'}
                </span>
                <span className="text-[10px] text-slate-500">شارژ مگ‌سیف</span>
              </div>
            </div>
          </div>

          {/* Left Column: Sticky Buy Box & Cart Summary (3 cols) */}
          <div className="lg:col-span-3 lg:sticky lg:top-40 space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-md flex flex-col gap-5 text-start">
              {/* Seller Info */}
              <div className="flex items-center justify-between pb-3 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs">
                    CNA
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">فروشگاه مرکزی سیانای</span>
                    <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      فروشنده رسمی و معتبر
                    </span>
                  </div>
                </div>
                <div className="text-start">
                  <span className="text-xs font-black text-emerald-600 block">۱۰۰٪</span>
                  <span className="text-[10px] text-slate-400">رضایت کالا</span>
                </div>
              </div>

              {/* Stock Condition */}
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-emerald-700 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  موجود در انبار مرکزی تهران
                </span>
                <span className="text-slate-400 text-[11px]">ارسال امروز</span>
              </div>

              {/* Price Tag */}
              <div className="flex flex-col gap-1 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">قیمت نهایی:</span>
                  {product.discountPercent && (
                    <span className="bg-orange-600 text-white px-2 py-0.5 rounded-full text-[11px] font-bold">
                      {toPersianDigits(product.discountPercent)}٪ تخفیف
                    </span>
                  )}
                </div>
                <PriceTag price={currentPrice} originalPrice={originalPrice} size="xl" />
              </div>

              {/* Installment Info */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-slate-800">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-600 shrink-0" />
                  <div>
                    <span className="text-xs font-bold block">خرید اقساطی اسنپ‌پی و بلوبانک</span>
                    <span className="text-[11px] text-slate-500 block">از ماهی ۷,۸۵۰,۰۰۰ تومان</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => alert('شرایط اقساط: ۴ قسط بدون کارمزد با اعتبارسنجی بلوبانک')}
                  className="text-xs font-bold text-blue-600 hover:underline"
                >
                  شرایط
                </button>
              </div>

              {/* Quantity Stepper & Actions */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">تعداد سفارش:</span>
                  <div className="flex items-center gap-2.5 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.min(5, q + 1))}
                      className="w-7 h-7 rounded-lg bg-white text-blue-600 hover:bg-slate-200 flex items-center justify-center font-bold"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-bold text-slate-900 w-4 text-center">
                      {toPersianDigits(quantity)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="w-7 h-7 rounded-lg bg-white text-slate-600 hover:bg-slate-200 flex items-center justify-center font-bold"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span>افزودن به سبد خرید</span>
                </button>

                <button
                  type="button"
                  onClick={handleBuyNow}
                  className="w-full h-11 bg-slate-100 hover:bg-slate-200 text-blue-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Zap className="w-4 h-4" />
                  <span>خرید فوری با یک کلیک</span>
                </button>
              </div>

              {/* Free Shipping Notice */}
              <div className="flex flex-col gap-2 pt-2 text-xs text-slate-500 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>ارسال رایگان اکسپرس با بسته‌بندی ایمن</span>
                </div>
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>۷ روز ضمانت بازگشت بی‌قید و شرط کالا</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Supplementary Complementary Products Shelf (Upsell Section) */}
        <section className="mt-14 mb-10">
          <div className="flex items-center justify-between mb-4">
            <div className="text-start">
              <h2 className="text-lg sm:text-xl font-black text-slate-900">
                لوازم جانبی مکمل و پیشنهادی
              </h2>
              <p className="text-xs text-slate-500">
                اکسسوری‌های اورجینال متناسب با {product.titleFa}
              </p>
            </div>
            <Link
              to="/catalog?category=cases-screen"
              className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
            >
              <span>مشاهده تمام اکسسوری‌ها</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {complementaryAccessories.map((acc) => (
              <div
                key={acc.id}
                className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between hover:shadow-md transition-shadow text-start"
              >
                <div>
                  <div className="w-full h-40 bg-slate-50 rounded-xl flex items-center justify-center p-3 relative mb-3">
                    <span className="absolute top-2 start-2 bg-white text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold border border-slate-200">
                      {acc.tags?.[0] || 'اورجینال'}
                    </span>
                    <img
                      src={acc.imageUrl}
                      alt={acc.titleFa}
                      className="h-full object-contain"
                    />
                  </div>
                  <h3 className="text-xs font-bold text-slate-800 line-clamp-2 leading-snug">
                    {acc.titleFa}
                  </h3>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <PriceTag price={acc.price} size="sm" />
                  <button
                    type="button"
                    onClick={() => addItem(acc)}
                    className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-blue-600 hover:text-white text-blue-600 flex items-center justify-center transition-colors shadow-2xs"
                    title="افزودن به سبد خرید"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Detailed Information & Interactive Tabs Section */}
        <section className="bg-white rounded-2xl p-6 lg:p-8 border border-slate-200/80 shadow-2xs mt-8 text-start" id="specs">
          {/* Tabs Navigation */}
          <div className="flex items-center gap-2 overflow-x-auto pb-4 border-b border-slate-200 no-scrollbar">
            <button
              onClick={() => setActiveTab('specs')}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${
                activeTab === 'specs'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              مشخصات فنی تخصصی
            </button>
            <button
              onClick={() => setActiveTab('review')}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${
                activeTab === 'review'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              بررسی تخصصی تیم CNA
            </button>
            <button
              onClick={() => setActiveTab('comments')}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${
                activeTab === 'comments'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              نظرات خریداران و امتیازات ({toPersianDigits(product.reviewsCount)})
            </button>
          </div>

          {/* Tab 1: Technical Specifications Table */}
          {activeTab === 'specs' && (
            <div className="flex flex-col gap-6 pt-6 animate-in fade-in duration-200">
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-1">
                  مشخصات جامع فنی و سخت‌افزاری
                </h3>
                <p className="text-xs text-slate-500">
                  اطلاعات اعتبارسنجی شده توسط تیم کنترل کیفیت سی‌ان‌ای موبایل بر اساس مشخصات رسمی کمپانی سازنده
                </p>
              </div>

              <div className="space-y-6">
                {/* Category 1: Display */}
                <div>
                  <span className="text-xs font-bold text-blue-600 flex items-center gap-1.5 mb-2">
                    <Tv className="w-4 h-4" />
                    نمایشگر و تصویر
                  </span>
                  <div className="rounded-xl overflow-hidden border border-slate-200 divide-y divide-slate-200 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-3 p-3 bg-slate-50">
                      <span className="text-slate-500 font-semibold">اندازه صفحه نمایش</span>
                      <span className="md:col-span-2 text-slate-800 font-medium">
                        {product.specs.screen || '۶.۹ اینچ Super Retina XDR OLED'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 p-3 bg-white">
                      <span className="text-slate-500 font-semibold">رزولوشن و چگالی پیکسل</span>
                      <span className="md:col-span-2 text-slate-800 font-medium">
                        {product.specs.resolution || '۱۳۲۰ در ۲۸۶۸ پیکسل (چگالی ۴۶۰ ppi)'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 p-3 bg-slate-50">
                      <span className="text-slate-500 font-semibold">بیشینه روشنایی</span>
                      <span className="md:col-span-2 text-slate-800 font-medium">
                        {product.specs.brightness || '۲۰۰۰ نیت زیر نور مستقیم خورشید'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 p-3 bg-white">
                      <span className="text-slate-500 font-semibold">نرخ نوسازی تصویر (Refresh Rate)</span>
                      <span className="md:col-span-2 text-slate-800 font-medium">
                        {product.specs.refreshRate || 'تطبیق‌پذیر ۱ تا ۱۲۰ هرتز ProMotion'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Category 2: Processor */}
                <div>
                  <span className="text-xs font-bold text-blue-600 flex items-center gap-1.5 mb-2">
                    <Cpu className="w-4 h-4" />
                    پردازشگر و هوش مصنوعی
                  </span>
                  <div className="rounded-xl overflow-hidden border border-slate-200 divide-y divide-slate-200 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-3 p-3 bg-slate-50">
                      <span className="text-slate-500 font-semibold">مدل چیپست اصلی</span>
                      <span className="md:col-span-2 text-slate-800 font-medium">
                        {product.specs.processor || 'Apple A18 Pro (۳ نانومتری TSMC)'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 p-3 bg-white">
                      <span className="text-slate-500 font-semibold">تعداد هسته‌های پردازشی</span>
                      <span className="md:col-span-2 text-slate-800 font-medium">
                        {product.specs.cpuCores || '۶ هسته‌ای (۲ هسته عملکردی + ۴ هسته بهینه کم‌مصرف)'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 p-3 bg-slate-50">
                      <span className="text-slate-500 font-semibold">موتور عصبی (Neural Engine)</span>
                      <span className="md:col-span-2 text-slate-800 font-medium">
                        {product.specs.neuralEngine || '۱۶ هسته‌ای، توانایی ۳۵ تریلیون پردازش در ثانیه'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Category 3: Camera */}
                <div>
                  <span className="text-xs font-bold text-blue-600 flex items-center gap-1.5 mb-2">
                    <Camera className="w-4 h-4" />
                    ماژول‌های دوربین و فیلمبرداری
                  </span>
                  <div className="rounded-xl overflow-hidden border border-slate-200 divide-y divide-slate-200 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-3 p-3 bg-slate-50">
                      <span className="text-slate-500 font-semibold">دوربین عریض (Wide)</span>
                      <span className="md:col-span-2 text-slate-800 font-medium">
                        {product.specs.mainCamera || '۴۸ مگاپیکسل سنسور Fusion با لرزشگیر Sensor-shift'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 p-3 bg-white">
                      <span className="text-slate-500 font-semibold">دوربین پریسکوپ تله‌فوتو</span>
                      <span className="md:col-span-2 text-slate-800 font-medium">
                        {product.specs.telephotoCamera || '۱۲ مگاپیکسل با زوم ۵ برابری اپتیکال'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 p-3 bg-slate-50">
                      <span className="text-slate-500 font-semibold">دوربین فوق عریض (Ultra Wide)</span>
                      <span className="md:col-span-2 text-slate-800 font-medium">
                        {product.specs.ultraWideCamera || '۴۸ مگاپیکسل با زاویه دید ۱۲۰ درجه'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 p-3 bg-white">
                      <span className="text-slate-500 font-semibold">کیفیت فیلمبرداری</span>
                      <span className="md:col-span-2 text-slate-800 font-medium">
                        {product.specs.videoRecording || 'ضبط ویدیو 4K دالبی ویژن با سرعت ۱۲۰ فریم بر ثانیه'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: CNA Editorial Review */}
          {activeTab === 'review' && (
            <div className="flex flex-col gap-6 pt-6 animate-in fade-in duration-200">
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-1">
                  بررسی تخصصی و موشکافانه CNA Mobile
                </h3>
                <p className="text-xs text-slate-500">
                  تجربه ۲ هفته استفاده مداوم از پرچمدار {product.titleFa}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed text-justify">
                  <p>
                    {product.descriptionFa}
                  </p>
                  <p>
                    کلید فیزیکی و لمسی <strong>Camera Control</strong> در لبه پایینی سمت راست دستگاه تعبیه شده که با شبیه‌سازی دو مرحله‌ای شاتر دوربین‌های حرفه‌ای DSLR، کنترل زوم، گشودگی دیافراگم و نوردهی را بدون لمس نمایشگر فراهم می‌کند. سیستم صوتی به ۴ میکروفون استودیویی با قابلیت تفکیک نویز فضایی تجهیز شده است.
                  </p>
                  <div className="bg-blue-50 border border-blue-100 p-3.5 rounded-xl text-blue-900">
                    <span className="font-bold block mb-1">جمع‌بندی کارشناس سی‌ان‌ای:</span>
                    <span className="text-xs text-blue-800 leading-normal block">
                      اگر قصد تولید محتوای ویدیویی در سطح تجاری دارید یا عمر باتری فراتر از یک روز و نیم برایتان اولویت دارد، این پرچمدار گزینه‌ای بی‌نقص و مطمئن در بازار فعلی است.
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="w-full h-56 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200">
                    <img
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuARoSFxn_veblhReZCZEYg5OKbbRoqgxa3oo3388syAIdkjKdMTSrNT-6bBOOV5QeiSdG5ykBlvAHWc_2vI0VE4zh7uXHSu2ulJalwM8w1u1J5QTgJPBPKl9XItYk2CTRsGYh43UU1znGNt6SW8gnugg9kFpyEwuCqc-y387n95omACIECV7i-ESpPa15xqBtBx3lgMDJOh9hRTNrkyGXZuS0S_LEehVEgN3apXOSHNDyH45VCY2x0sOw"
                      alt="CNA In-hand review"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Benchmark score bars */}
                  <div className="space-y-2 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    <div className="flex justify-between font-semibold">
                      <span>عملکرد پردازنده و پایداری دمایی</span>
                      <span className="text-blue-600 font-bold">۹.۸ / ۱۰</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-blue-600 h-full w-[98%]"></div>
                    </div>

                    <div className="flex justify-between font-semibold pt-1">
                      <span>شارژدهی و باتری در آزمون استاندارد</span>
                      <span className="text-blue-600 font-bold">۹.۵ / ۱۰</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-blue-600 h-full w-[95%]"></div>
                    </div>

                    <div className="flex justify-between font-semibold pt-1">
                      <span>کیفیت دوربین در نور شب و دینامیک رنج</span>
                      <span className="text-blue-600 font-bold">۹.۹ / ۱۰</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-blue-600 h-full w-[99%]"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Customer Ratings & Reviews */}
          {activeTab === 'comments' && (
            <div className="flex flex-col gap-6 pt-6 animate-in fade-in duration-200">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-50 border border-slate-200 p-5 rounded-2xl">
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <span className="text-3xl font-black text-slate-900">
                      {toPersianDigits(product.rating)}
                    </span>
                    <span className="block text-xs text-slate-400">از ۵ نمره</span>
                    <div className="flex text-amber-500 justify-center mt-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-current" />
                      ))}
                    </div>
                  </div>
                  <div className="h-12 w-px bg-slate-200 hidden sm:block"></div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs sm:text-sm font-bold text-slate-800">
                      بیش از ۹۶٪ خریداران این کالا را پیشنهاد کرده‌اند
                    </span>
                    <span className="text-xs text-slate-500">
                      مجموع {toPersianDigits(product.reviewsCount)} نظر ثبت شده توسط خریداران تایید شده CNA Mobile
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => alert('فرم ثبت دیدگاه و امتیاز پس از ورود به حساب کاربری فعال می‌شود.')}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-2xs"
                >
                  ثبت نظر و تجربه خرید
                </button>
              </div>

              {/* Reviews List */}
              <div className="space-y-3">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">مهرداد رضایی</span>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded font-medium">
                        خریدار تایید شده
                      </span>
                    </div>
                    <span className="text-slate-400">۲ روز پیش</span>
                  </div>
                  <div className="flex text-amber-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed text-justify">
                    گوشی از نظر رجیستری و پلمپ کاملاً رسمی بود. رنگ تیتانیوم در واقعیت بسیار شیک‌تر از تصاویر است. شارژدهی باتری واقعاً پیشرفت زیادی نسبت به نسل‌های قبلی داشته. ممنون از بسته‌بندی عالی سی‌ان‌ای.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">سارا میرزایی</span>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded font-medium">
                        خریدار تایید شده
                      </span>
                    </div>
                    <span className="text-slate-400">هفته پیش</span>
                  </div>
                  <div className="flex text-amber-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed text-justify">
                    دوربین فوق‌العاده‌ست بخصوص برای ساخت ریلز اینستاگرام. کلید کمرا کنترل خیلی روان کار می‌کنه و دیگه نیاز نیست صفحه لمسی رو دستکاری کنید. ارسال اکسپرس دقیقاً ظرف ۳ ساعت در تهران انجام شد.
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
