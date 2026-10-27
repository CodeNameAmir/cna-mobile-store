import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  SlidersHorizontal,
  Search,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  HelpCircle,
  RotateCcw,
} from 'lucide-react';
import { ProductCard } from '../components/ui/ProductCard';
import { Breadcrumb } from '../components/layout/Breadcrumb';
import { NotifyModal } from '../components/ui/NotifyModal';
import { Product, Brand, FilterState } from '../types';
import { formatPersianNumber, toPersianDigits } from '../utils/formatters';
import { useProducts } from '../hooks/useProductsQuery';
import { CatalogSkeletonGrid } from '../components/ui/LoadingSkeleton';
import { ErrorMessage } from '../components/ui/ErrorMessage';

const ALL_BRANDS: { brand: Brand; count: number }[] = [
  { brand: 'Apple', count: 32 },
  { brand: 'Samsung', count: 46 },
  { brand: 'Xiaomi', count: 28 },
  { brand: 'Honor', count: 12 },
  { brand: 'Motorola', count: 6 },
];

const STORAGE_OPTIONS = ['128GB', '256GB', '512GB', '1TB'];
const RAM_OPTIONS = ['6GB', '8GB', '12GB', '16GB'];

const COLOR_SWATCHES = [
  { name: 'تیتانیوم طبیعی', hex: '#9c9589' },
  { name: 'آبی تیره', hex: '#1e293b' },
  { name: 'نقره‌ای مهتابی', hex: '#e2e8f0' },
  { name: 'بنفش رویایی', hex: '#581c87' },
  { name: 'سبز زمردی', hex: '#064e3b' },
  { name: 'طلایی بیابانی', hex: '#d4af37' },
];

export const CatalogPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get('category');
  const initialSearch = searchParams.get('q') || '';
  const initialSpecial = searchParams.get('special') === 'true';

  const [notifyProduct, setNotifyProduct] = useState<Product | null>(null);
  const [brandSearch, setBrandSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter State matching the screenshot
  const [filters, setFilters] = useState<FilterState>({
    onlyInStock: true,
    onlyDiscounted: false,
    onlyExpress: false,
    selectedBrands: ['Apple', 'Samsung'],
    priceRange: [14500000, 98000000],
    selectedStorage: ['256GB'],
    selectedRam: [],
    selectedColors: ['تیتانیوم طبیعی'],
    searchQuery: initialSearch,
    sortBy: 'newest',
  });

  const resetFilters = () => {
    setFilters({
      onlyInStock: false,
      onlyDiscounted: false,
      onlyExpress: false,
      selectedBrands: [],
      priceRange: [10000000, 100000000],
      selectedStorage: [],
      selectedRam: [],
      selectedColors: [],
      searchQuery: '',
      sortBy: 'newest',
    });
  };

  const toggleBrand = (brand: Brand) => {
    setFilters((prev) => {
      const exists = prev.selectedBrands.includes(brand);
      return {
        ...prev,
        selectedBrands: exists
          ? prev.selectedBrands.filter((b) => b !== brand)
          : [...prev.selectedBrands, brand],
      };
    });
  };

  const toggleStorage = (storage: string) => {
    setFilters((prev) => {
      const exists = prev.selectedStorage.includes(storage);
      return {
        ...prev,
        selectedStorage: exists
          ? prev.selectedStorage.filter((s) => s !== storage)
          : [...prev.selectedStorage, storage],
      };
    });
  };

  const toggleRam = (ram: string) => {
    setFilters((prev) => {
      const exists = prev.selectedRam.includes(ram);
      return {
        ...prev,
        selectedRam: exists
          ? prev.selectedRam.filter((r) => r !== ram)
          : [...prev.selectedRam, ram],
      };
    });
  };

  const toggleColor = (colorName: string) => {
    setFilters((prev) => {
      const exists = prev.selectedColors.includes(colorName);
      return {
        ...prev,
        selectedColors: exists
          ? prev.selectedColors.filter((c) => c !== colorName)
          : [...prev.selectedColors, colorName],
      };
    });
  };

  const { data: serverProducts = [], isLoading, isError, error, refetch, isFetching } = useProducts();

  // Filter logic
  const filteredProducts = useMemo(() => {
    let result = [...serverProducts];

    if (initialCategory) {
      result = result.filter((p) => p.category === initialCategory);
    }

    if (initialSpecial) {
      result = result.filter((p) => p.isSpecialOffer);
    }

    if (filters.onlyInStock) {
      result = result.filter((p) => p.inStock);
    }

    if (filters.onlyDiscounted) {
      result = result.filter((p) => (p.discountPercent || 0) > 0);
    }

    if (filters.onlyExpress) {
      result = result.filter((p) => p.isExpressDelivery);
    }

    if (filters.selectedBrands.length > 0) {
      result = result.filter((p) => filters.selectedBrands.includes(p.brand));
    }

    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.titleFa.toLowerCase().includes(q) ||
          p.titleEn.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q)
      );
    }

    // Storage filter
    if (filters.selectedStorage.length > 0) {
      result = result.filter((p) =>
        filters.selectedStorage.some((s) => p.storageOptions.includes(s) || p.selectedStorage?.includes(s))
      );
    }

    // Price range
    result = result.filter(
      (p) => p.price >= filters.priceRange[0] && p.price <= filters.priceRange[1]
    );

    // Sort
    if (filters.sortBy === 'cheapest') {
      result.sort((a, b) => a.price - b.price);
    } else if (filters.sortBy === 'expensive') {
      result.sort((a, b) => b.price - a.price);
    } else if (filters.sortBy === 'popular') {
      result.sort((a, b) => b.rating - a.rating);
    } else if (filters.sortBy === 'bestselling') {
      result.sort((a, b) => (b.reviewsCount || 0) - (a.reviewsCount || 0));
    }

    return result;
  }, [serverProducts, filters, initialCategory, initialSpecial]);

  // Brand search in sidebar
  const visibleBrands = ALL_BRANDS.filter((b) =>
    b.brand.toLowerCase().includes(brandSearch.toLowerCase())
  );

  return (
    <div className="flex flex-col w-full pb-16">
      <NotifyModal
        product={notifyProduct}
        isOpen={Boolean(notifyProduct)}
        onClose={() => setNotifyProduct(null)}
      />

      <div className="max-w-7xl mx-auto px-4 lg:px-8 w-full">
        {/* Breadcrumb Bar */}
        <Breadcrumb
          items={[
            { label: 'گوشی موبایل', to: '/catalog' },
            { label: 'همه گوشی‌های هوشمند' },
          ]}
          announcement="قیمت‌ها بر اساس نرخ روز ارز به‌روزرسانی شدند"
        />

        {/* Editorial Top Banner Card */}
        <section className="relative overflow-hidden rounded-2xl bg-blue-50/70 border border-blue-100 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xs mb-8">
          <div className="space-y-2 z-10 max-w-xl text-start">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white text-blue-700 text-xs font-bold border border-blue-100 shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>تضمین رجیستری قانونی و گارانتی رسمی ۱۸ ماهه</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900">
              بازار تخصصی پرچمداران و میان‌رده‌های موبایل
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              انتخاب هوشمندانه از بین ۱۲۴ مدل متنوع اپل، سامسونگ و شیائومی با پلمپ اصلی شرکتی و ارسال فوق‌سریع به سراسر ایران
            </p>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 z-10 shrink-0">
            <div className="flex flex-col items-center bg-white px-4 py-3 rounded-xl border border-slate-200/80 shadow-2xs min-w-[90px]">
              <span className="text-xl sm:text-2xl font-black text-blue-600">۱۲۴</span>
              <span className="text-[11px] text-slate-500">مدل در دسترس</span>
            </div>
            <div className="flex flex-col items-center bg-white px-4 py-3 rounded-xl border border-slate-200/80 shadow-2xs min-w-[90px]">
              <span className="text-xl sm:text-2xl font-black text-orange-600">۱۰۰٪</span>
              <span className="text-[11px] text-slate-500">اصالت کالا</span>
            </div>
            <div className="flex flex-col items-center bg-white px-4 py-3 rounded-xl border border-slate-200/80 shadow-2xs min-w-[90px]">
              <span className="text-xl sm:text-2xl font-black text-slate-800">۲۴</span>
              <span className="text-[11px] text-slate-500">ساعته ارسال</span>
            </div>
          </div>
          <div className="absolute -left-12 -bottom-12 w-64 h-64 rounded-full bg-blue-200/30 blur-3xl pointer-events-none"></div>
        </section>

        {/* Main 2-Column Catalog Grid (Right Sidebar in RTL) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Right Column: Interactive Filters Sidebar (lg:col-span-3) */}
          <aside className="lg:col-span-3 space-y-5">
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-6 text-start">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                  <span>فیلترهای پیشرفته</span>
                </div>
                <button
                  onClick={resetFilters}
                  className="text-rose-600 hover:text-rose-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                  type="button"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>حذف همه</span>
                </button>
              </div>

              {/* Quick Switches */}
              <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
                {/* Toggle 1: Only In-Stock */}
                <label className="flex items-center justify-between cursor-pointer select-none">
                  <span className="text-xs font-semibold text-slate-800">فقط کالاهای موجود</span>
                  <input
                    type="checkbox"
                    checked={filters.onlyInStock}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, onlyInStock: e.target.checked }))
                    }
                    className="w-4 h-4 text-blue-600 rounded focus:ring-0 cursor-pointer"
                  />
                </label>

                {/* Toggle 2: Only Discounted */}
                <label className="flex items-center justify-between cursor-pointer select-none">
                  <span className="text-xs font-semibold text-slate-800">فقط تخفیف‌دارها</span>
                  <input
                    type="checkbox"
                    checked={filters.onlyDiscounted}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, onlyDiscounted: e.target.checked }))
                    }
                    className="w-4 h-4 text-orange-600 rounded focus:ring-0 cursor-pointer"
                  />
                </label>

                {/* Toggle 3: Express */}
                <label className="flex items-center justify-between cursor-pointer select-none">
                  <span className="text-xs font-semibold text-slate-800">ارسال فوری امروز (تهران)</span>
                  <input
                    type="checkbox"
                    checked={filters.onlyExpress}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, onlyExpress: e.target.checked }))
                    }
                    className="w-4 h-4 text-blue-600 rounded focus:ring-0 cursor-pointer"
                  />
                </label>
              </div>

              {/* Brand Filter */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">برند سازنده</span>
                  <span className="text-[11px] text-slate-400">انتخاب چندگانه</span>
                </div>

                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={brandSearch}
                    onChange={(e) => setBrandSearch(e.target.value)}
                    placeholder="جستجوی نام برند..."
                    className="w-full h-8 ps-8 pe-2.5 rounded-lg bg-slate-100 text-xs text-slate-800 placeholder:text-slate-400 border border-slate-200 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-600"
                  />
                  <Search className="w-3.5 h-3.5 absolute start-2.5 text-slate-400 pointer-events-none" />
                </div>

                <div className="space-y-1.5 pt-1 max-h-48 overflow-y-auto">
                  {visibleBrands.map(({ brand, count }) => {
                    const checked = filters.selectedBrands.includes(brand);
                    return (
                      <label
                        key={brand}
                        onClick={() => toggleBrand(brand)}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            readOnly
                            className="w-4 h-4 text-blue-600 rounded focus:ring-0"
                          />
                          <span className="text-xs font-medium text-slate-800">
                            {brand === 'Apple'
                              ? 'اپل (Apple)'
                              : brand === 'Samsung'
                              ? 'سامسونگ (Samsung)'
                              : brand === 'Xiaomi'
                              ? 'شیائومی (Xiaomi)'
                              : brand === 'Honor'
                              ? 'آنر (Honor)'
                              : 'موتورولا (Motorola)'}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">{toPersianDigits(count)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Price Range Slider */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">محدوده قیمت</span>
                  <span className="text-[11px] text-blue-600 font-semibold">تومان</span>
                </div>

                <input
                  type="range"
                  min={10000000}
                  max={100000000}
                  step={1000000}
                  value={filters.priceRange[1]}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      priceRange: [prev.priceRange[0], parseInt(e.target.value, 10)],
                    }))
                  }
                  className="w-full accent-blue-600 cursor-pointer"
                />

                <div className="grid grid-cols-2 gap-2 text-start">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">از قیمت:</span>
                    <span className="text-xs font-bold text-slate-800">
                      {formatPersianNumber(filters.priceRange[0])}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">تا قیمت:</span>
                    <span className="text-xs font-bold text-slate-800">
                      {formatPersianNumber(filters.priceRange[1])}
                    </span>
                  </div>
                </div>
              </div>

              {/* Internal Storage Filter (Chips) */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-900 block">حافظه داخلی</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {STORAGE_OPTIONS.map((opt) => {
                    const isSelected = filters.selectedStorage.includes(opt);
                    return (
                      <button
                        key={opt}
                        onClick={() => toggleStorage(opt)}
                        type="button"
                        className={`py-1.5 px-2 rounded-lg text-xs font-medium text-center transition-colors border ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-2xs font-bold'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {toPersianDigits(opt)} {isSelected && '✓'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* RAM Filter */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-900 block">حافظه رم (RAM)</span>
                <div className="flex flex-wrap gap-1.5">
                  {RAM_OPTIONS.map((ram) => {
                    const isSelected = filters.selectedRam.includes(ram);
                    return (
                      <button
                        key={ram}
                        onClick={() => toggleRam(ram)}
                        type="button"
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-2xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {toPersianDigits(ram)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Swatches */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-900 block">رنگ بدنه</span>
                <div className="flex items-center gap-2.5 flex-wrap">
                  {COLOR_SWATCHES.map((color) => {
                    const isSelected = filters.selectedColors.includes(color.name);
                    return (
                      <button
                        key={color.name}
                        onClick={() => toggleColor(color.name)}
                        type="button"
                        style={{ backgroundColor: color.hex }}
                        className={`w-7 h-7 rounded-full shadow-2xs flex items-center justify-center transition-transform hover:scale-110 border border-slate-300 ${
                          isSelected ? 'ring-2 ring-blue-600 ring-offset-2' : ''
                        }`}
                        title={color.name}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-white drop-shadow-sm" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 space-y-2">
                <button
                  type="button"
                  className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>اعمال فیلترهای انتخابی</span>
                </button>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="w-full h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
                >
                  پاک‌سازی تنظیمات
                </button>
              </div>
            </div>

            {/* Assurance Card */}
            <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-100 space-y-2 text-start">
              <div className="flex items-center gap-2 text-blue-700 text-xs font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>گارانتی طلایی سی‌ان‌ای</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed text-justify">
                تمامی گوشی‌ها دارای کد فعال‌سازی سامانه همتا و ۱۸ ماه پشتیبانی شرکت‌های معتبر گارانتی کننده هستند.
              </p>
            </div>
          </aside>

          {/* Left Column: Product Grid, Toolbar & Pagination (lg:col-span-9) */}
          <main className="lg:col-span-9 space-y-6">
            {/* Top Toolbar Shelf (Sorting + Results Count) */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
                <span className="text-xs text-slate-500 whitespace-nowrap font-medium">
                  مرتب‌سازی:
                </span>
                {(
                  [
                    { key: 'newest', label: 'جدیدترین' },
                    { key: 'bestselling', label: 'پرفروش‌ترین' },
                    { key: 'cheapest', label: 'ارزان‌ترین' },
                    { key: 'expensive', label: 'گران‌ترین' },
                    { key: 'popular', label: 'محبوب‌ترین' },
                  ] as const
                ).map(({ key, label }) => {
                  const isActive = filters.sortBy === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setFilters((prev) => ({ ...prev, sortBy: key }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              <div className="text-xs text-slate-500 whitespace-nowrap text-start">
                <span>
                  نمایش <strong className="text-slate-900">{toPersianDigits(filteredProducts.length)}</strong> کالا از{' '}
                  <strong className="text-slate-900">۱۲۴</strong> گوشی هوشمند
                </span>
              </div>
            </div>

            {/* Active Applied Filters Chips Row */}
            <div className="flex flex-wrap items-center gap-2 text-start">
              <span className="text-[11px] text-slate-500">فیلترهای فعال:</span>

              {filters.selectedBrands.length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-800 text-[11px] font-semibold border border-blue-100">
                  <span>برند: {filters.selectedBrands.join(' و ')}</span>
                  <button
                    onClick={() => setFilters((prev) => ({ ...prev, selectedBrands: [] }))}
                    className="hover:text-rose-600 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {filters.selectedStorage.length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-800 text-[11px] font-semibold border border-blue-100">
                  <span>حافظه: {filters.selectedStorage.map(toPersianDigits).join('، ')}</span>
                  <button
                    onClick={() => setFilters((prev) => ({ ...prev, selectedStorage: [] }))}
                    className="hover:text-rose-600 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {filters.onlyInStock && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-semibold border border-emerald-100">
                  <span>فقط موجود در انبار</span>
                  <button
                    onClick={() => setFilters((prev) => ({ ...prev, onlyInStock: false }))}
                    className="hover:text-rose-600 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              <button
                onClick={resetFilters}
                className="text-blue-600 hover:underline text-[11px] font-semibold px-2"
              >
                پاک کردن همه فیلترها
              </button>
            </div>

            {/* Product Grid State Handling */}
            {isLoading ? (
              <CatalogSkeletonGrid count={8} />
            ) : isError ? (
              <ErrorMessage
                message={error instanceof Error ? error.message : undefined}
                onRetry={() => refetch()}
                isRetrying={isFetching}
              />
            ) : filteredProducts.length === 0 ? (
              <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center space-y-3">
                <HelpCircle className="w-10 h-10 text-slate-400 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">هیچ محصولی با این فیلترها یافت نشد</h3>
                <p className="text-xs text-slate-500">
                  لطفاً فیلترهای انتخابی را تغییر دهید یا دکمه «پاک کردن همه فیلترها» را بزنید.
                </p>
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors"
                >
                  بازنشانی فیلترها
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onNotifyRequest={(p) => setNotifyProduct(p)}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            <div className="pt-6 pb-2 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-slate-500">
                صفحه <strong className="text-slate-900">{toPersianDigits(currentPage)}</strong> از{' '}
                <strong className="text-slate-900">۱۶</strong>
              </span>

              <div className="flex items-center gap-1.5" dir="rtl">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="h-9 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                  <span>صفحه قبل</span>
                </button>

                {[1, 2, 3].map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-9 h-9 rounded-xl text-xs font-bold transition-colors ${
                      currentPage === page
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {toPersianDigits(page)}
                  </button>
                ))}

                <span className="px-1 text-slate-400">...</span>

                <button
                  onClick={() => setCurrentPage(16)}
                  className={`w-9 h-9 rounded-xl text-xs font-bold transition-colors ${
                    currentPage === 16
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  ۱۶
                </button>

                <button
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="h-9 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <span>صفحه بعد</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Information FAQ Guide */}
            <div className="rounded-2xl bg-white p-6 border border-slate-200/80 shadow-2xs space-y-3 mt-8 text-start">
              <div className="flex items-center gap-2 text-blue-600">
                <HelpCircle className="w-5 h-5" />
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  راهنمای جامع خرید آنلاین گوشی موبایل در CNA Mobile
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600 leading-relaxed text-justify">
                <p>
                  تمامی گوشی‌های ارائه‌شده در فروشگاه اینترنتی سی‌ان‌ای موبایل به صورت کاملاً رسمی و رجیستر شده در سامانه همتا ارائه می‌شوند. بسته‌بندی دستگاه‌ها دارای پلمپ اصلی شرکت‌های واردکننده معتبر و گارانتی ۱۸ ماهه طلایی است.
                </p>
                <p>
                  در صورت تمایل می‌توانید در زمان خرید، از طرح بیمه تکمیلی شکستگی صفحه نمایش و سرقت با پوشش ۸۵ درصدی خسارت نیز بهره‌مند شوید. کارشناسان پشتیبانی فنی همه روزه آماده پاسخگویی به سوالات شما هستند.
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
