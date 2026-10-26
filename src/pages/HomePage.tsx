import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Zap,
  ArrowLeft,
  Smartphone,
  Watch,
  Headphones,
  BatteryCharging,
  Shield,
  Gamepad2,
  Cpu,
  Camera,
  ShieldCheck,
  Star,
  CheckCircle2,
  ChevronLeft,
  SlidersHorizontal,
} from 'lucide-react';
import { PRODUCTS, ARTICLES, REVIEWS } from '../services/mockData';
import { ProductCard } from '../components/ui/ProductCard';
import { PriceTag } from '../components/ui/PriceTag';
import { NotifyModal } from '../components/ui/NotifyModal';
import { Product, Brand } from '../types';
import { padPersianZero, toPersianDigits } from '../utils/formatters';

export const HomePage: React.FC = () => {
  // Flash sale countdown state: starts at 9h 24m 48s
  const [secondsLeft, setSecondsLeft] = useState(9 * 3600 + 24 * 60 + 48);
  const [selectedBrandTab, setSelectedBrandTab] = useState<'All' | Brand>('All');
  const [notifyProduct, setNotifyProduct] = useState<Product | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;

  // Filter products for the bestselling tabs
  const bestsellerPhones = PRODUCTS.filter((p) => p.category === 'phones');
  const displayedPhones =
    selectedBrandTab === 'All'
      ? bestsellerPhones.slice(0, 4)
      : bestsellerPhones.filter((p) => p.brand === selectedBrandTab);

  // Flash sale products (4 items)
  const flashSaleItems = [
    PRODUCTS.find((p) => p.slug === 'galaxy-s24-ultra')!,
    PRODUCTS.find((p) => p.slug === 'airpods-pro-2-usbc')!,
    PRODUCTS.find((p) => p.slug === 'anker-737-powerbank')!,
    PRODUCTS.find((p) => p.slug === 'apple-watch-ultra-2')!,
  ].filter(Boolean);

  const heroPhone = PRODUCTS.find((p) => p.slug === 'iphone-16-pro-max') || PRODUCTS[0];

  return (
    <div className="flex flex-col w-full pb-12">
      <NotifyModal
        product={notifyProduct}
        isOpen={Boolean(notifyProduct)}
        onClose={() => setNotifyProduct(null)}
      />

      {/* 1. Top Luxury Hero Section */}
      <section className="relative w-full overflow-hidden bg-white border-b border-slate-200/80 py-8 md:py-14">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Right text & action column in RTL */}
            <div className="lg:col-span-7 flex flex-col items-start text-start z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-slate-800 text-xs font-semibold mb-5 border border-blue-100">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                <span>معرفی رسمی پرچمداران سال ۲۰۲۵</span>
                <span className="text-slate-300">/</span>
                <span className="text-blue-600 font-bold">رجیستر شده با کد فعال‌سازی همتا</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 leading-tight tracking-tight mb-4">
                شکوه قدرت و ظرافت؛
                <br />
                <span className="bg-gradient-to-l from-blue-700 to-blue-500 bg-clip-text text-transparent">
                  آیفون ۱۶ پرو مکس
                </span>{' '}
                در دستان شما
              </h1>

              <p className="text-sm sm:text-base text-slate-600 max-w-xl mb-7 leading-relaxed">
                تراشه تیتانیومی نوین A18 Pro، دکمه پیشرفته کنترل دوربین، سیستم عکاسی ۴۸ مگاپیکسلی فیوژن و شارژدهی بی‌سابقه با گارانتی معتبر شرکتی ۱۸ ماهه سی‌ان‌ای.
              </p>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto mb-8">
                <Link
                  to={`/product/${heroPhone.slug}`}
                  className="h-12 px-7 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 group"
                >
                  <span>خرید فوری با ارسال رایگان</span>
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                </Link>
                <Link
                  to={`/product/${heroPhone.slug}#specs`}
                  className="h-12 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold flex items-center justify-center gap-2 transition-colors border border-slate-200"
                >
                  <SlidersHorizontal className="w-4 h-4 text-slate-500" />
                  <span>بررسی مشخصات فنی</span>
                </Link>
              </div>

              {/* Fast Spec Badges Grid */}
              <div className="grid grid-cols-3 gap-3 w-full max-w-lg pt-4 border-t border-slate-100">
                <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl flex items-center gap-2.5">
                  <Cpu className="w-5 h-5 text-blue-600 shrink-0" />
                  <div className="flex flex-col text-start">
                    <span className="text-[11px] text-slate-500">پردازنده</span>
                    <span className="text-xs font-bold text-slate-900">A18 Pro (3nm)</span>
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl flex items-center gap-2.5">
                  <Camera className="w-5 h-5 text-blue-600 shrink-0" />
                  <div className="flex flex-col text-start">
                    <span className="text-[11px] text-slate-500">دوربین اصلی</span>
                    <span className="text-xs font-bold text-slate-900">۴۸ مگاپیکسل</span>
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
                  <div className="flex flex-col text-start">
                    <span className="text-[11px] text-slate-500">ضمانت رسمی</span>
                    <span className="text-xs font-bold text-slate-900">۱۸ ماهه CNA</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Hero Media (Left column in RTL) */}
            <div className="lg:col-span-5 relative flex items-center justify-center">
              <div className="absolute -inset-4 bg-gradient-to-tr from-blue-200/40 via-indigo-100/40 to-transparent rounded-full filter blur-3xl pointer-events-none"></div>
              <div className="relative w-full max-w-md aspect-square rounded-3xl bg-slate-50 border border-slate-200 p-6 flex flex-col items-center justify-center shadow-xl overflow-hidden group">
                <span className="absolute top-4 start-4 bg-orange-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-xs">
                  پیشنهاد ویژه جشنواره
                </span>
                <Link to={`/product/${heroPhone.slug}`} className="w-full h-full flex items-center justify-center">
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAkxa0SQR-wf5ebHdSEYHLMsN8xMc_Ng_uaKHg340pdOy5nGqhRc6FiFACeGgs6InPnUx0nX_WxLkmTLZ_ioYgaUOrBLOvmXDdhwBIOQCgp6yljgL3gnkdEGebJCMjT6bGXHO00ewJVHZNPjPXBKCd9cEJ7FQ-6RKBQMDB4Nh1LuqgGSMYYDx2o2a7kG4_pHJBH1-0nbCz2u9EyQeGfFo46fereVMyMKzwuglPedbhRcBtfpWfru41PuA"
                    alt="iPhone 16 Pro Max Desert Titanium"
                    className="w-full h-full object-contain filter drop-shadow-2xl group-hover:scale-105 transition-transform duration-500"
                  />
                </Link>

                {/* Bottom Float Overlay Price */}
                <div className="absolute bottom-4 inset-x-4 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-sm">
                  <div>
                    <span className="text-[11px] text-slate-500 block">شروع قیمت از</span>
                    <PriceTag price={96500000} size="md" />
                  </div>
                  <span className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-semibold text-slate-700">
                    ۲۵۶ گیگابایت
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Golden Flash Sale Section (شگفت‌انگیز طلایی CNA) */}
      <section className="w-full py-10 bg-gradient-to-r from-orange-600 via-orange-500 to-amber-600 text-white shadow-md my-6">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          {/* Section Header with Countdown */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-xs">
                <Zap className="w-7 h-7 text-white fill-current" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black">شگفت‌انگیز طلایی CNA</h2>
                  <span className="bg-white text-orange-600 text-xs px-2.5 py-0.5 rounded-full font-bold shadow-2xs">
                    تعداد بسیار محدود
                  </span>
                </div>
                <p className="text-xs text-orange-100 mt-0.5">
                  فرصت تخفیف‌های استثنایی با گارانتی تعویض تا اتمام موجودی انبار
                </p>
              </div>
            </div>

            {/* Countdown Clock */}
            <div className="flex items-center gap-3 self-start md:self-auto">
              <span className="text-xs text-orange-100 hidden sm:inline">زمان باقیمانده:</span>
              <div className="flex items-center gap-2" dir="ltr">
                <div className="flex flex-col items-center bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-xl min-w-[48px]">
                  <span className="text-lg font-black">{padPersianZero(seconds)}</span>
                  <span className="text-[10px] text-orange-100">ثانیه</span>
                </div>
                <span className="text-lg font-black">:</span>
                <div className="flex flex-col items-center bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-xl min-w-[48px]">
                  <span className="text-lg font-black">{padPersianZero(minutes)}</span>
                  <span className="text-[10px] text-orange-100">دقیقه</span>
                </div>
                <span className="text-lg font-black">:</span>
                <div className="flex flex-col items-center bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-xl min-w-[48px]">
                  <span className="text-lg font-black">{padPersianZero(hours)}</span>
                  <span className="text-[10px] text-orange-100">ساعت</span>
                </div>
              </div>
            </div>
          </div>

          {/* Flash Sale Product Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {flashSaleItems.map((item) => (
              <ProductCard
                key={item.id}
                product={item}
                onNotifyRequest={(p) => setNotifyProduct(p)}
                className="bg-white text-slate-900 border-white/20"
              />
            ))}
          </div>
        </div>
      </section>

      {/* 3. Quick Category Navigator (دسته‌بندی‌های سریع و مصور) */}
      <section className="w-full py-10">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className="text-xs font-bold text-blue-600 block">دسته‌بندی محصولات تخصصی</span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                خرید آسان بر اساس دسته‌بندی
              </h2>
            </div>
            <Link
              to="/catalog"
              className="text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
            >
              <span>مشاهده تمامی دسته‌ها</span>
              <ChevronLeft className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <Link
              to="/catalog"
              className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:-translate-y-1 transition-all flex flex-col items-center text-center group"
            >
              <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors mb-2.5">
                <Smartphone className="w-7 h-7" />
              </div>
              <span className="text-sm font-bold text-slate-900 mb-0.5">گوشی موبایل</span>
              <span className="text-[11px] text-slate-500">اپل، سامسونگ، شیائومی</span>
            </Link>

            <Link
              to="/catalog?category=smartwatches"
              className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:-translate-y-1 transition-all flex flex-col items-center text-center group"
            >
              <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors mb-2.5">
                <Watch className="w-7 h-7" />
              </div>
              <span className="text-sm font-bold text-slate-900 mb-0.5">ساعت هوشمند</span>
              <span className="text-[11px] text-slate-500">اپل واچ، گلکسی واچ</span>
            </Link>

            <Link
              to="/catalog?category=audio"
              className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:-translate-y-1 transition-all flex flex-col items-center text-center group"
            >
              <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors mb-2.5">
                <Headphones className="w-7 h-7" />
              </div>
              <span className="text-sm font-bold text-slate-900 mb-0.5">هدفون و ایرپاد</span>
              <span className="text-[11px] text-slate-500">بی‌سیم و استودیویی</span>
            </Link>

            <Link
              to="/catalog?category=chargers"
              className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:-translate-y-1 transition-all flex flex-col items-center text-center group"
            >
              <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors mb-2.5">
                <BatteryCharging className="w-7 h-7" />
              </div>
              <span className="text-sm font-bold text-slate-900 mb-0.5">شارژر و کابل</span>
              <span className="text-[11px] text-slate-500">فست شارژ GaN، اصل</span>
            </Link>

            <Link
              to="/catalog?category=cases-screen"
              className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:-translate-y-1 transition-all flex flex-col items-center text-center group"
            >
              <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors mb-2.5">
                <Shield className="w-7 h-7" />
              </div>
              <span className="text-sm font-bold text-slate-900 mb-0.5">قاب و محافظ</span>
              <span className="text-[11px] text-slate-500">ضد ضربه و مگ‌سیف</span>
            </Link>

            <Link
              to="/catalog?category=gaming"
              className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:-translate-y-1 transition-all flex flex-col items-center text-center group"
            >
              <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors mb-2.5">
                <Gamepad2 className="w-7 h-7" />
              </div>
              <span className="text-sm font-bold text-slate-900 mb-0.5">گیمینگ و استریم</span>
              <span className="text-[11px] text-slate-500">دسته و خنک‌کننده</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 4. Bestseller Flagship Phones Showcase */}
      <section className="w-full py-12 bg-slate-100/60 border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <span className="text-xs font-bold text-blue-600 block">پرفروش‌ترین‌های این هفته</span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                گوشی‌های محبوب بازار ایران
              </h2>
            </div>

            {/* Brand Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {(['All', 'Apple', 'Samsung', 'Xiaomi'] as const).map((brand) => {
                const label =
                  brand === 'All'
                    ? 'همه برندها'
                    : brand === 'Apple'
                    ? 'اپل (Apple)'
                    : brand === 'Samsung'
                    ? 'سامسونگ (Samsung)'
                    : 'شیائومی (Xiaomi)';
                const isActive = selectedBrandTab === brand;

                return (
                  <button
                    key={brand}
                    onClick={() => setSelectedBrandTab(brand)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-2xs ${
                      isActive
                        ? 'bg-slate-900 text-white'
                        : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {displayedPhones.map((phone) => (
              <ProductCard
                key={phone.id}
                product={phone}
                onNotifyRequest={(p) => setNotifyProduct(p)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 5. Luxury Dual Feature Promo Banners */}
      <section className="w-full py-10">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Promo 1: Anker Ecosystem */}
            <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-7 lg:p-9 flex flex-col justify-between shadow-lg">
              <div className="relative z-10 max-w-sm">
                <span className="text-xs font-bold text-blue-400 block mb-2">
                  نمایندگی رسمی لوازم جانبی انکر
                </span>
                <h3 className="text-xl sm:text-2xl font-black mb-3">
                  شارژ ایمن و سریع با فناوری GaNPrime™
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 mb-6 leading-relaxed">
                  انواع شارژرهای دیواری، پاوربانک‌های هوشمند و کابل‌های فست‌شارژ مقاوم با ۱۸ ماه گارانتی تعویض درجا.
                </p>
                <Link
                  to="/catalog?category=chargers"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-sm"
                >
                  <span>مشاهده محصولات انکر</span>
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </div>
              <div className="absolute -left-6 -bottom-6 w-60 h-60 opacity-90 pointer-events-none">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCbthsBut58VI7qkKwSesmNA-Gxohql4xrmlEFRi6VvxWjqEcncEf7d9dJi87lV_8C-QNlvhHKOuIdIKaMciz8pqojZInl7hu26rLN0D4L7kfCVJBugaRofOdBGw1UumYBte32MnU1HH4cHbom1lecCwnM7SLRIumDwqfaPXQ-HpzRyiwb6UpvRcHT2uWsPZjZ58BmwPZxPKiRV4JZmUajGT88r4TxD-PaHtzB68PSOyxTnnj7V1D8J5Q"
                  alt="Anker Chargers"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            {/* Promo 2: Apple Genuine Accessories */}
            <div className="relative overflow-hidden rounded-3xl bg-blue-50 border border-blue-100 text-slate-900 p-7 lg:p-9 flex flex-col justify-between shadow-lg">
              <div className="relative z-10 max-w-sm">
                <span className="text-xs font-bold text-blue-600 block mb-2">
                  تجهیزات اورجینال اپل
                </span>
                <h3 className="text-xl sm:text-2xl font-black mb-3">
                  کاورهای مگ‌سیف چرمی و سیلیکونی اصل
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed">
                  طراحی ارگونومیک، سازگاری کامل با شارژرهای بی‌سیم MagSafe همراه با هولوگرام اصالت و بسته‌بندی پلمپ کارخانه.
                </p>
                <Link
                  to="/catalog?category=cases-screen"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors shadow-sm"
                >
                  <span>خرید اکسسوری اپل</span>
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </div>
              <div className="absolute -left-6 -bottom-6 w-60 h-60 opacity-90 pointer-events-none">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDMV3vb_bQjjYQuxcMNGA3oEbAZ6EyXcErnqCwipYhy_1cNNcf6b8rjyaiDsPVs9g6yDSMP0AQUhJ1pujaYtbX7oSTYuWxCLK6Tn5xvyt26brgzaW7PoK6q6HmupXTQaQnBj0LtTyWXTsZNeqwJRkMOV7pD7QyH_WqtIEvNPsCDbZbT1x1Rujhoe_uRYue5_VdNmBns9gnxHHAM958J-4sPVp8a_wDpSFoCTPyYF1yGc02s6PF3teGTkQ"
                  alt="Apple Cases"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. CNA Tech Guide & Buying Articles (مجله تخصصی سی‌ان‌ای) */}
      <section className="w-full py-12 bg-slate-100/60 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <span className="text-xs font-bold text-blue-600 block">مجله فناوری و راهنمای تخصصی</span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                تازه‌ترین مقالات و بررسی‌های ویدئویی
              </h2>
            </div>
            <a
              href="#blog"
              className="text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
            >
              <span>ورود به وبلاگ تخصصی</span>
              <ChevronLeft className="w-4 h-4" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {ARTICLES.map((article) => (
              <article
                key={article.id}
                className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs hover:shadow-md transition-shadow group flex flex-col justify-between"
              >
                <div>
                  <div className="h-48 w-full overflow-hidden relative bg-slate-100">
                    <img
                      src={article.imageUrl}
                      alt={article.titleFa}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-3 end-3 bg-white/95 backdrop-blur-xs text-slate-800 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-slate-200/60 shadow-2xs">
                      {article.categoryFa}
                    </span>
                  </div>

                  <div className="p-5">
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-2">
                      <span>{article.dateFa}</span>
                      <span>•</span>
                      <span>زمان مطالعه: {article.readTimeFa}</span>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 mb-2 leading-snug">
                      {article.titleFa}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {article.excerptFa}
                    </p>
                  </div>
                </div>

                <div className="px-5 pb-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600">
                  <span>مطالعه بررسی کامل</span>
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Real User Reviews & Trust Section */}
      <section className="w-full py-12">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold text-blue-600 block mb-1">تجربه خریداران واقعی</span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-2">
              اعتماد شما، بزرگترین سرمایه سی‌ان‌ای موبایل
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              بیش از ۱۲,۰۰۰ سفارش موفق در سال جاری و رضایت ۹۸.۴ درصدی خریداران سراسر کشور
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {REVIEWS.map((review) => (
              <div
                key={review.id}
                className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-1 text-amber-500 mb-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed mb-4 text-justify">
                    «{review.commentFa}»
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                    {review.authorInitials}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-900 block truncate">
                      {review.authorName}
                    </span>
                    <span className="text-[11px] text-slate-400 block truncate">
                      {review.productNameFa} • {review.cityFa}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
