import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, CheckCircle2, AlertTriangle } from 'lucide-react';
import { CNA_LOGO } from '../../services/mockData';
import { TrustBadges } from './TrustBadges';

export const Footer: React.FC = () => {
  const [newsletterInput, setNewsletterInput] = useState('');
  const [newsletterSuccess, setNewsletterSuccess] = useState(false);

  const handleNewsletter = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterInput.trim()) {
      setNewsletterSuccess(true);
      setTimeout(() => {
        setNewsletterInput('');
        setNewsletterSuccess(false);
      }, 3000);
    }
  };

  return (
    <footer className="w-full bg-slate-100/80 text-slate-700 pt-12 pb-8 mt-16 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        {/* Trust Badges Strip */}
        <TrustBadges />

        {/* Demo Transparency Banner */}
        <div className="mb-8 p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>توجه:</strong> این سامانه یک نسخه آزمایشی / دمو (بدون پرداخت واقعی) جهت اعتبارسنجی رابط کاربری و اتصال به دیتابیس Supabase است. کلیه شماره‌ها و نشان‌ها جنبه نمایش ساختار محصول را دارند.
          </span>
        </div>

        {/* 5-Column Main Links & Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 py-8 border-t border-slate-200">
          {/* Col 1 & 2: About Store */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <img src={CNA_LOGO} alt="CNA Mobile" className="h-8 w-auto object-contain" />
              <span className="text-lg font-black text-slate-900">سیانای موبایل</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed text-justify">
              فروشگاه تخصصی سی‌ان‌ای موبایل (CNA Mobile) ارائه‌دهنده جدیدترین گوشی‌های هوشمند، تبلت‌ها و بروزترین لوازم جانبی اورجینال از برندهای اپل، سامسونگ، شیائومی و انکر است. تعهد ما به اصالت کالا و رضایت پایدار مشتریان است.
            </p>
            <div className="flex items-center gap-2 pt-1 text-xs text-slate-600">
              <Phone className="w-4 h-4 text-blue-600 shrink-0" />
              <span dir="ltr">۰۲۱-۸۸۸۸۹۹۹۹</span>
              <span className="text-slate-400">|</span>
              <span>ساعت پاسخگویی: ۹ الی ۲۱ (روزهای کاری)</span>
            </div>
          </div>

          {/* Col 3: Quick Links */}
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-4">دسترسی سریع</h4>
            <ul className="space-y-2.5 text-xs text-slate-600">
              <li>
                <Link to="/catalog" className="hover:text-blue-600 transition-colors">
                  گوشی‌های پرچمدار
                </Link>
              </li>
              <li>
                <Link to="/catalog?category=chargers" className="hover:text-blue-600 transition-colors">
                  شارژر و کابل اورجینال
                </Link>
              </li>
              <li>
                <Link to="/catalog?category=audio" className="hover:text-blue-600 transition-colors">
                  هدفون و ایرپاد
                </Link>
              </li>
              <li>
                <Link to="/catalog?special=true" className="hover:text-blue-600 transition-colors text-orange-600 font-semibold">
                  تخفیف‌های شگفت‌انگیز
                </Link>
              </li>
              <li>
                <Link to="/cart" className="hover:text-blue-600 transition-colors">
                  پیگیری سبد خرید
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Customer Services */}
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-4">خدمات مشتریان</h4>
            <ul className="space-y-2.5 text-xs text-slate-600">
              <li>
                <a href="#faq" className="hover:text-blue-600 transition-colors">
                  پرسش‌های متداول
                </a>
              </li>
              <li>
                <a href="#return-terms" className="hover:text-blue-600 transition-colors">
                  شرایط مرجوعی ۷ روزه
                </a>
              </li>
              <li>
                <a href="#privacy" className="hover:text-blue-600 transition-colors">
                  حریم خصوصی کاربران
                </a>
              </li>
              <li>
                <a href="#guarantee" className="hover:text-blue-600 transition-colors">
                  شرایط گارانتی طلایی CNA
                </a>
              </li>
              <li>
                <a href="#contact" className="hover:text-blue-600 transition-colors">
                  تماس با پشتیبانی
                </a>
              </li>
            </ul>
          </div>

          {/* Col 5: Newsletter & Badges */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-900">خبرنامه تخفیف‌ها</h4>
            <p className="text-xs text-slate-600">
              از جدیدترین پیشنهادها و کوپن‌های تخفیف مطلع شوید:
            </p>
            {newsletterSuccess ? (
              <div className="p-2.5 bg-emerald-50 text-emerald-700 text-xs rounded-xl flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>عضویت در خبرنامه با موفقیت انجام شد!</span>
              </div>
            ) : (
              <form onSubmit={handleNewsletter} className="flex items-center gap-2">
                <input
                  type="text"
                  value={newsletterInput}
                  onChange={(e) => setNewsletterInput(e.target.value)}
                  placeholder="شماره موبایل یا ایمیل"
                  required
                  className="w-full h-10 px-3 rounded-xl bg-white border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <button
                  type="submit"
                  className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shrink-0 shadow-2xs"
                >
                  عضویت
                </button>
              </form>
            )}

            {/* Simulated Seals */}
            <div className="flex items-center gap-2 pt-2">
              <div className="h-14 flex-1 bg-white border border-slate-200 rounded-xl p-2 flex flex-col items-center justify-center text-center text-slate-500 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-700">اینماد</span>
                <span className="text-[9px] text-slate-400">نسخه تستی</span>
              </div>
              <div className="h-14 flex-1 bg-white border border-slate-200 rounded-xl p-2 flex flex-col items-center justify-center text-center text-slate-500 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-700">ساماندهی</span>
                <span className="text-[9px] text-slate-400">ثبت رسمی</span>
              </div>
              <div className="h-14 flex-1 bg-white border border-slate-200 rounded-xl p-2 flex flex-col items-center justify-center text-center text-slate-500 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-700">عضو اتحادیه</span>
                <span className="text-[9px] text-slate-400">فناوری اطلاعات</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Legal Copyright */}
        <div className="pt-6 mt-4 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>© ۱۴۰۳ تمامی حقوق مادی و معنوی این وب‌سایت متعلق به فروشگاه سی‌ان‌ای موبایل است.</p>
          <p className="text-[11px]">طراحی و توسعه با بالاترین استاندارد رابط کاربری React & Tailwind CSS</p>
        </div>
      </div>
    </footer>
  );
};
