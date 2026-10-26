import React, { useState } from 'react';
import { Bell, X, CheckCircle2 } from 'lucide-react';
import { Product } from '../../types';

interface NotifyModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export const NotifyModal: React.FC<NotifyModalProps> = ({ product, isOpen, onClose }) => {
  const [contact, setContact] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen || !product) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (contact.trim()) {
      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        setContact('');
        onClose();
      }, 2400);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-100"
        dir="rtl"
      >
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="بستن پنجره"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">خبرم کن زمان موجود شدن</h3>
            <p className="text-xs text-slate-500">اطلاع‌رسانی پیامکی یا ایمیلی به محض شارژ انبار</p>
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl mb-4 flex items-center gap-3">
          <img
            src={product.imageUrl}
            alt={product.titleFa}
            className="w-12 h-12 object-contain bg-white rounded-lg p-1 border border-slate-200"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-800 line-clamp-1">{product.titleFa}</p>
            <p className="text-[11px] text-slate-500 font-mono" dir="ltr">
              {product.titleEn}
            </p>
          </div>
        </div>

        {isSubmitted ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-1">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <p className="text-sm font-bold text-emerald-800">درخواست شما با موفقیت ثبت شد</p>
            <p className="text-xs text-emerald-600">به محض موجود شدن کالا، پیامک ارسال خواهد شد.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                شماره موبایل یا آدرس ایمیل:
              </label>
              <input
                type="text"
                required
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="مثال: ۰۹۱۲۳۴۵۶۷۸۹ یا info@example.com"
                className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm"
              >
                ثبت درخواست اطلاع‌رسانی
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-colors"
              >
                انصراف
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
