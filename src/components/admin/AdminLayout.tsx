import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CreateProductModal } from './CreateProductModal';
import { useAdminData } from '../../context/AdminDataContext';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { products, orders, users } = useAdminData();

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const currentPath = location.pathname;

  const navItems = [
    {
      title: 'داشبورد و آمار کلیدی',
      path: '/admin/dashboard',
      icon: 'dashboard'
    },
    {
      title: 'مدیریت محصولات و انبار',
      path: '/admin/products',
      icon: 'inventory_2',
      badge: products.filter((p) => p.stock <= 4).length > 0 ? `${products.filter((p) => p.stock <= 4).length} هشدار` : undefined
    },
    {
      title: 'مدیریت سفارش‌ها',
      path: '/admin/orders',
      icon: 'shopping_bag',
      badge: orders.filter((o) => o.status === 'pending' || o.status === 'processing').length > 0
        ? `${orders.filter((o) => o.status === 'pending' || o.status === 'processing').length}`
        : undefined
    },
    {
      title: 'مدیریت کاربران و دسترسی‌ها',
      path: '/admin/users',
      icon: 'group'
    },
    {
      title: 'گزارشات مالی و فاکتورها',
      path: '/admin/reports',
      icon: 'receipt_long',
      badge: 'مودیان'
    },
    {
      title: 'کدهای تخفیف و جشنواره‌ها',
      path: '/admin/discounts',
      icon: 'sell',
      badge: '۴ فعال'
    },
    {
      title: 'تنظیمات سیستم',
      path: '/admin/settings',
      icon: 'settings'
    }
  ];

  // Quick live search matching products, orders, or users
  const searchResults = globalSearch.trim()
    ? {
        products: products
          .filter(
            (p) =>
              p.name.includes(globalSearch.trim()) ||
              p.sku.toLowerCase().includes(globalSearch.trim().toLowerCase()) ||
              p.barcode.includes(globalSearch.trim())
          )
          .slice(0, 3),
        orders: orders
          .filter(
            (o) =>
              o.orderNumber.toLowerCase().includes(globalSearch.trim().toLowerCase()) ||
              o.customerName.includes(globalSearch.trim()) ||
              o.customerPhone.includes(globalSearch.trim())
          )
          .slice(0, 3),
        users: users
          .filter(
            (u) =>
              u.fullName.includes(globalSearch.trim()) ||
              u.phone.includes(globalSearch.trim()) ||
              u.email.toLowerCase().includes(globalSearch.trim().toLowerCase())
          )
          .slice(0, 3)
      }
    : null;

  const handleLogout = () => {
    localStorage.removeItem('cna_admin_auth');
    navigate('/admin/login');
  };

  return (
    <div className="bg-surface font-body-md text-on-surface min-h-screen relative" dir="rtl">
      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-on-surface/40 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Fixed Sidebar */}
      <aside
        className={`fixed right-0 top-0 h-full w-72 bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-50 flex flex-col justify-between py-6 transition-transform duration-300 lg:translate-x-0 ${
          isMobileSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col">
          {/* Logo Brand Header */}
          <div className="px-6 pb-6 flex items-center justify-between border-b border-surface-container-low/60">
            <Link to="/admin/dashboard" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm group-hover:bg-primary-container transition-colors">
                <span className="material-symbols-outlined text-on-primary text-[24px]">
                  smartphone
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm text-on-surface">سی‌ان‌ای موبایل</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  پنل مدیریت و انبارداری
                </span>
              </div>
            </Link>

            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="lg:hidden text-on-surface-variant hover:text-on-surface p-1 rounded-lg"
              aria-label="بستن منو"
            >
              <span className="material-symbols-outlined text-[22px]">close</span>
            </button>
          </div>

          {/* Navigation Items */}
          <div className="px-4 py-4">
            <nav className="flex flex-col gap-1.5">
              {navItems.map((item) => {
                const isActive =
                  currentPath === item.path ||
                  (item.path === '/admin/dashboard' && currentPath === '/admin');

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileSidebarOpen(false)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all font-label-lg text-label-lg ${
                      isActive
                        ? 'bg-primary-container text-on-primary font-bold shadow-sm'
                        : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                      <span>{item.title}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-primary-fixed text-primary'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="px-4 flex flex-col gap-2">
          {/* Link to Online Storefront */}
          <Link
            to="/"
            className="flex items-center justify-between px-4 py-3 rounded-xl bg-surface-container-low text-on-surface hover:bg-surface-container-high transition-all group"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[20px] text-primary group-hover:scale-110 transition-transform">
                storefront
              </span>
              <span className="font-label-md text-label-md">مشاهده فروشگاه آنلاین</span>
            </div>
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
              arrow_back
            </span>
          </Link>

          {/* User Profile Card */}
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-surface-container-lowest shadow-[0_1px_4px_rgba(0,0,0,0.03)] border border-surface-container-low">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-primary text-[18px]">
                    person
                  </span>
                </div>
                <span className="absolute bottom-0 left-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-surface-container-lowest"></span>
              </div>
              <div className="flex flex-col">
                <span className="font-label-md text-label-md text-on-surface">مدیر ارشد سی‌ان‌ای</span>
                <span className="font-label-sm text-label-sm text-emerald-600">آنلاین در سیستم</span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="text-on-surface-variant hover:text-error transition-colors p-1.5 rounded-lg hover:bg-error-container/30"
              title="خروج از حساب مدیریت"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:pr-72 transition-all">
        {/* Sticky Header */}
        <header className="fixed top-0 right-0 lg:right-72 left-0 h-20 bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-30 flex items-center justify-between px-4 sm:px-8 border-b border-surface-container-high/40">
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface"
              aria-label="باز کردن منو"
            >
              <span className="material-symbols-outlined text-[22px]">menu</span>
            </button>

            {/* Global Search Input */}
            <div className="relative w-full flex items-center">
              <span className="material-symbols-outlined absolute right-3 text-on-surface-variant text-[20px]">
                search
              </span>
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 250)}
                placeholder="جستجو در سفارش‌ها، محصولات، کاربران..."
                className="w-full h-11 pr-10 pl-9 rounded-xl bg-surface-container-low text-on-surface font-body-sm text-body-sm placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary transition-all"
              />
              {globalSearch && (
                <button
                  onClick={() => setGlobalSearch('')}
                  className="absolute left-3 text-on-surface-variant hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}

              {/* Global Search Quick Dropdown */}
              {isSearchFocused && searchResults && (
                <div className="absolute top-13 right-0 left-0 bg-surface-container-lowest rounded-xl shadow-2xl p-4 border border-surface-container-high z-50 flex flex-col gap-3">
                  {searchResults.products.length > 0 && (
                    <div>
                      <span className="font-label-sm text-label-sm text-on-surface-variant mb-1 block">
                        محصولات یافت‌شده:
                      </span>
                      {searchResults.products.map((p) => (
                        <Link
                          key={p.id}
                          to="/admin/products"
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-container-low transition-colors"
                        >
                          <span className="font-body-sm text-on-surface">{p.name}</span>
                          <span className="font-label-sm text-primary font-mono">{p.sku}</span>
                        </Link>
                      ))}
                    </div>
                  )}

                  {searchResults.orders.length > 0 && (
                    <div>
                      <span className="font-label-sm text-label-sm text-on-surface-variant mb-1 block">
                        سفارشات یافت‌شده:
                      </span>
                      {searchResults.orders.map((o) => (
                        <Link
                          key={o.id}
                          to="/admin/orders"
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-container-low transition-colors"
                        >
                          <span className="font-body-sm text-on-surface">
                            {o.orderNumber} - {o.customerName}
                          </span>
                          <span className="font-label-sm text-secondary font-mono">
                            {o.customerPhone}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}

                  {searchResults.users.length > 0 && (
                    <div>
                      <span className="font-label-sm text-label-sm text-on-surface-variant mb-1 block">
                        کاربران:
                      </span>
                      {searchResults.users.map((u) => (
                        <Link
                          key={u.id}
                          to="/admin/users"
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-container-low transition-colors"
                        >
                          <span className="font-body-sm text-on-surface">{u.fullName}</span>
                          <span className="font-label-sm text-on-surface-variant">{u.role}</span>
                        </Link>
                      ))}
                    </div>
                  )}

                  {searchResults.products.length === 0 &&
                    searchResults.orders.length === 0 &&
                    searchResults.users.length === 0 && (
                      <span className="font-body-sm text-on-surface-variant text-center py-2">
                        موردی منطبق با جستجو یافت نشد.
                      </span>
                    )}
                </div>
              )}
            </div>
          </div>

          {/* Header Action Items */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Quick Add Product Button */}
            <button
              onClick={() => setIsProductModalOpen(true)}
              className="h-11 px-4 sm:px-5 rounded-xl bg-primary hover:bg-primary-container text-on-primary flex items-center gap-2 font-label-lg text-label-lg transition-colors shadow-sm"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              <span className="hidden sm:inline">افزودن محصول جدید</span>
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen((v) => !v)}
                className="w-11 h-11 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface flex items-center justify-center transition-colors relative"
                type="button"
                aria-label="اعلان‌ها"
              >
                <span className="material-symbols-outlined text-[22px]">notifications</span>
                <span className="absolute top-2.5 left-2.5 w-2 h-2 rounded-full bg-error ring-2 ring-surface"></span>
              </button>

              {/* Notifications Popup */}
              {isNotificationsOpen && (
                <div className="absolute left-0 top-14 w-80 bg-surface-container-lowest rounded-2xl shadow-2xl p-4 border border-surface-container-high z-50 flex flex-col gap-3 animate-fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-surface-container">
                    <span className="font-headline-sm text-headline-sm text-on-surface">
                      اعلان‌های سیستم
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-fixed text-primary font-bold">
                      ۳ جدید
                    </span>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    <div className="p-2.5 rounded-xl bg-surface-container-low flex items-start gap-2.5">
                      <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">
                        inventory_2
                      </span>
                      <div className="flex flex-col">
                        <span className="font-label-md text-on-surface">هشدار کسری انبار</span>
                        <span className="text-body-sm text-on-surface-variant text-[11px]">
                          موجودی Xiaomi 14 Ultra به کمتر از ۳ عدد رسیده است.
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-surface-container-low flex items-start gap-2.5">
                      <span className="material-symbols-outlined text-tertiary text-[20px] mt-0.5">
                        payments
                      </span>
                      <div className="flex flex-col">
                        <span className="font-label-md text-on-surface">فیش بانکی جدید</span>
                        <span className="text-body-sm text-on-surface-variant text-[11px]">
                          سفارش #CNA-10489 منتظر تایید حسابداری است.
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-surface-container-low flex items-start gap-2.5">
                      <span className="material-symbols-outlined text-secondary text-[20px] mt-0.5">
                        local_shipping
                      </span>
                      <div className="flex flex-col">
                        <span className="font-label-md text-on-surface">نوبت تحویل تیپاکس</span>
                        <span className="text-body-sm text-on-surface-variant text-[11px]">
                          مامور جمع‌آوری ساعت ۱۵:۰۰ در انبار مرکزی حضور خواهد داشت.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Avatar */}
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
            </div>
          </div>
        </header>

        {/* Child Page Content */}
        <main className="relative pt-20 bg-surface min-h-screen w-full px-4 sm:px-8 py-8">
          {children}
        </main>
      </div>

      {/* Global Create Product Modal */}
      <CreateProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
      />
    </div>
  );
};
