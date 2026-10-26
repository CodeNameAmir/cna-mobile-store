import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, ShoppingBag, User, Phone, ShieldCheck, Flame, X } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { CNA_LOGO, PRODUCTS } from '../../services/mockData';
import { toPersianDigits, formatPersianNumber } from '../../utils/formatters';

export const Header: React.FC = () => {
  const { totalItemsCount } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Search filter results preview
  const searchResults = searchQuery.trim()
    ? PRODUCTS.filter(
        (p) =>
          p.titleFa.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.titleEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.brand.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 5)
    : [];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setIsSearchOpen(false);
      navigate(`/catalog?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const navLinks = [
    { label: 'صفحه اصلی', to: '/' },
    { label: 'گوشی موبایل', to: '/catalog' },
    { label: 'تبلت', to: '/catalog?category=tablets' },
    { label: 'ساعت و بند هوشمند', to: '/catalog?category=smartwatches' },
    { label: 'هندزفری و هدفون', to: '/catalog?category=audio' },
    { label: 'پاوربانک و شارژر', to: '/catalog?category=chargers' },
    { label: 'قاب و محافظ صفحه', to: '/catalog?category=cases-screen' },
    { label: 'لوازم گیمینگ', to: '/catalog?category=gaming' },
    {
      label: 'پیشنهادات طلایی',
      to: '/catalog?special=true',
      isHighlight: true,
    },
  ];

  return (
    <>
      <header className="fixed top-0 right-0 left-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
        {/* Top Info Strip */}
        <div className="bg-slate-900 text-slate-200 text-xs py-2 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
              ارسال رایگان برای خریدهای بالای ۱ میلیون تومان به سراسر ایران
            </span>
            <div className="flex items-center gap-4 sm:gap-6 text-slate-300">
              <Link
                to="/admin/dashboard"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600 text-blue-200 hover:text-white transition-all text-xs font-semibold"
              >
                <span className="material-symbols-outlined text-[16px]">admin_panel_settings</span>
                <span>پنل مدیریت و انبارداری</span>
              </Link>
              <span className="hidden md:flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                ضمانت اصالت ۱۰۰٪ تمامی کالاها
              </span>
              <span className="hidden md:flex items-center gap-1" dir="ltr">
                <Phone className="w-3.5 h-3.5 text-blue-400" />
                ۰۲۱-۸۸۸۸۹۹۹۹
              </span>
            </div>
          </div>
        </div>

        {/* Main Header Bar */}
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3.5">
          <div className="flex items-center justify-between gap-4 md:gap-8">
            {/* Brand Logo & Title */}
            <Link to="/" className="flex items-center gap-3 shrink-0 group">
              <img
                src={CNA_LOGO}
                alt="CNA Mobile Logo"
                className="h-9 w-auto object-contain transition-transform group-hover:scale-105"
              />
              <div className="flex flex-col">
                <span className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  سیانای موبایل
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  CNA Mobile & Accessories
                </span>
              </div>
            </Link>

            {/* Live Search Bar */}
            <div className="relative flex-1 max-w-xl mx-2">
              <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearchOpen(true);
                  }}
                  onFocus={() => setIsSearchOpen(true)}
                  placeholder="جستجوی گوشی، ساعت هوشمند، کاور، شارژر و..."
                  className="w-full h-11 ps-10 pe-4 rounded-xl bg-slate-100/90 text-slate-900 text-xs sm:text-sm placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all border border-slate-200"
                />
                <button
                  type="submit"
                  className="absolute start-3 text-slate-400 hover:text-blue-600 transition-colors"
                  aria-label="جستجو"
                >
                  <Search className="w-4 h-4" />
                </button>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setIsSearchOpen(false);
                    }}
                    className="absolute end-3 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </form>

              {/* Search Dropdown Results */}
              {isSearchOpen && searchResults.length > 0 && (
                <div
                  className="absolute top-full mt-2 inset-x-0 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 p-2 space-y-1"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400">
                    نتایج جستجوی کالاها:
                  </div>
                  {searchResults.map((item) => (
                    <Link
                      key={item.id}
                      to={`/product/${item.slug}`}
                      onClick={() => setIsSearchOpen(false)}
                      className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors group"
                    >
                      <img
                        src={item.imageUrl}
                        alt={item.titleFa}
                        className="w-10 h-10 object-contain rounded-lg bg-slate-100 p-1 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 group-hover:text-blue-600 truncate">
                          {item.titleFa}
                        </p>
                        <p className="text-[11px] text-slate-400">{item.brand}</p>
                      </div>
                      <span className="text-xs font-bold text-blue-600 shrink-0">
                        {formatPersianNumber(item.price)} ت
                      </span>
                    </Link>
                  ))}
                  <div className="pt-2 border-t border-slate-100 text-center">
                    <button
                      onClick={handleSearchSubmit}
                      className="text-xs text-blue-600 font-semibold hover:underline"
                    >
                      مشاهده تمام نتایج برای «{searchQuery}»
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Actions: User Auth & Shopping Cart */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Login / Profile */}
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-2 h-11 px-3 sm:px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold transition-colors"
                type="button"
              >
                <User className="w-4 h-4 text-slate-600" />
                <span className="hidden sm:inline">ورود / ثبت‌نام</span>
              </button>

              {/* Cart Button with Count Badge */}
              <Link
                to="/cart"
                className="relative flex items-center gap-2.5 h-11 px-3.5 sm:px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold transition-all shadow-xs active:scale-95"
              >
                <div className="relative">
                  <ShoppingBag className="w-5 h-5" />
                  {totalItemsCount > 0 && (
                    <span className="absolute -top-2 -end-2 bg-orange-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold shadow-xs">
                      {toPersianDigits(totalItemsCount)}
                    </span>
                  )}
                </div>
                <span className="hidden md:inline">سبد خرید</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Sub-Navigation Strip */}
        <div className="bg-slate-100/70 border-t border-slate-200/60">
          <div className="max-w-7xl mx-auto px-4 lg:px-8">
            <nav className="flex items-center gap-5 sm:gap-7 overflow-x-auto py-2.5 text-xs sm:text-sm no-scrollbar">
              {navLinks.map((link) => {
                const isActive =
                  location.pathname === link.to ||
                  (link.to !== '/' && location.pathname + location.search === link.to);

                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`whitespace-nowrap transition-colors flex items-center gap-1 font-medium ${
                      isActive
                        ? 'text-blue-600 font-bold border-b-2 border-blue-600 pb-0.5'
                        : link.isHighlight
                        ? 'text-orange-600 hover:text-orange-700 font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {link.isHighlight && <Flame className="w-3.5 h-3.5 text-orange-500" />}
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Auth Demo Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-slate-100 shadow-2xl relative text-start">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 left-4 p-1 rounded-lg text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <User className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">ورود به حساب کاربری سیانای</h3>
            <p className="text-xs text-slate-500 mb-4">
              لطفاً شماره موبایل خود را وارد نمایید تا کد تایید برای شما ارسال شود.
            </p>
            <div className="space-y-3">
              <input
                type="tel"
                placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button
                onClick={() => {
                  alert('ورود به عنوان کاربر مهمان انجام شد.');
                  setShowAuthModal(false);
                }}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-colors"
              >
                ورود سریع (دمو)
              </button>
              <p className="text-[11px] text-slate-400 text-center">
                این یک محیط پیش‌نمایش آماده برای اتصال به سرویس احراز هویت Supabase است.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
