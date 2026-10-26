import React from 'react';
import { ShieldCheck, Truck, RotateCcw, Headphones } from 'lucide-react';

export const TrustBadges: React.FC = () => {
  const badges = [
    {
      icon: <ShieldCheck className="w-8 h-8 text-blue-600" />,
      title: 'ضمانت اصالت ۱۰۰٪',
      desc: 'گارانتی رسمی و معتبر شرکتی',
    },
    {
      icon: <Truck className="w-8 h-8 text-blue-600" />,
      title: 'تحویل فوری و اکسپرس',
      desc: 'ارسال سریع به سراسر کشور',
    },
    {
      icon: <RotateCcw className="w-8 h-8 text-blue-600" />,
      title: '۷ روز مهلت بازگشت',
      desc: 'تضمین بازگشت وجه بی‌قید و شرط',
    },
    {
      icon: <Headphones className="w-8 h-8 text-blue-600" />,
      title: 'پشتیبانی ۲۴ ساعته',
      desc: 'پاسخگویی در تمام ایام هفته',
    },
  ];

  return (
    <section className="w-full pb-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        {badges.map((badge, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 sm:gap-4 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow"
          >
            <div className="shrink-0 p-2 rounded-xl bg-blue-50/80">{badge.icon}</div>
            <div className="text-start min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                {badge.title}
              </h4>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate mt-0.5">
                {badge.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
