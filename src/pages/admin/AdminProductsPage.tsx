import React, { useState, useMemo } from 'react';
import { useAdminData } from '../../context/AdminDataContext';
import { Product } from '../../types/admin';
import { CreateProductModal } from '../../components/admin/CreateProductModal';
import { formatToman, toPersianDigits } from '../../utils/formatters';

export const AdminProductsPage: React.FC = () => {
  const {
    products,
    deleteProduct,
    togglePublish,
    bulkDeleteProducts,
    bulkTogglePublish,
    bulkUpdatePrice,
    incrementStock,
    showToast
  } = useAdminData();

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('همه');
  const [selectedStockStatus, setSelectedStockStatus] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>(['prod-1', 'prod-2']);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Bulk Price Modal state
  const [isBulkPriceModalOpen, setIsBulkPriceModalOpen] = useState(false);
  const [bulkPriceMode, setBulkPriceMode] = useState<'percent' | 'fixed'>('percent');
  const [bulkPriceValue, setBulkPriceValue] = useState<number>(5);

  // History / Price History Modal
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);

  // Variant / Specs Modal
  const [variantProduct, setVariantProduct] = useState<Product | null>(null);

  // Quick Batch Adjustment form state
  const [quickBarcodeOrSku, setQuickBarcodeOrSku] = useState('');
  const [quickStockAmount, setQuickStockAmount] = useState<number>(5);
  const [quickShelf, setQuickShelf] = useState('قفسه: B-14 | لاین موبایل');

  // KPI calculations
  const totalCount = products.length;
  const inStockCount = products.filter((p) => p.stock > 0).length;
  const criticalCount = products.filter((p) => p.stock > 0 && p.stock < 5).length;
  const outOfStockCount = products.filter((p) => p.stock === 0).length;

  const inStockPercent = totalCount > 0 ? Math.round((inStockCount / totalCount) * 100) : 0;
  const outOfStockPercent = totalCount > 0 ? Math.round((outOfStockCount / totalCount) * 100) : 0;

  // Filter & Search Logic
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = p.name.toLowerCase().includes(q);
          const matchEnglish = p.englishTitle.toLowerCase().includes(q);
          const matchSku = p.sku.toLowerCase().includes(q);
          const matchBarcode = p.barcode.includes(q);
          const matchBrand = p.brand.toLowerCase().includes(q);
          if (!matchName && !matchEnglish && !matchSku && !matchBarcode && !matchBrand) {
            return false;
          }
        }

        // Category filter
        if (selectedCategory !== 'همه') {
          if (!p.category.includes(selectedCategory)) return false;
        }

        // Stock status filter
        if (selectedStockStatus === 'inStock' && p.stock <= 0) return false;
        if (selectedStockStatus === 'critical' && (p.stock <= 0 || p.stock >= 5)) return false;
        if (selectedStockStatus === 'outOfStock' && p.stock > 0) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'priceDesc') return b.price - a.price;
        if (sortBy === 'priceAsc') return a.price - b.price;
        if (sortBy === 'stockDesc') return b.stock - a.stock;
        return 0; // default newest
      });
  }, [products, searchQuery, selectedCategory, selectedStockStatus, sortBy]);

  // Bulk Selection Handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredProducts.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleQuickStockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickBarcodeOrSku.trim()) {
      showToast('لطفاً بارکد یا شناسه کالا را وارد نمایید.');
      return;
    }
    const result = incrementStock(quickBarcodeOrSku, quickStockAmount, quickShelf);
    if (result.success) {
      setQuickBarcodeOrSku('');
    } else {
      showToast(result.message);
    }
  };

  const handleBulkPriceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    bulkUpdatePrice(selectedIds, bulkPriceMode, bulkPriceValue);
    setIsBulkPriceModalOpen(false);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('همه');
    setSelectedStockStatus('all');
    setSortBy('newest');
    showToast('فیلترها بازنشانی شدند.');
  };

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Top Banner / Headline Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-xl shadow-sm">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-container text-on-primary flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[24px]">warehouse</span>
            </div>
            <div>
              <h1 className="font-headline-lg text-headline-lg text-on-surface">
                مدیریت انبار و محصولات
              </h1>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                مدیریت بیش از {toPersianDigits(124)} مدل گوشی هوشمند و لوازم جانبی اورجینال سی‌ان‌ای
              </p>
            </div>
          </div>
        </div>

        {/* Quick Action Group */}
        <div className="flex items-center gap-3 self-end lg:self-center flex-wrap">
          <button
            onClick={() => {
              const csv =
                'data:text/csv;charset=utf-8,\uFEFF' +
                ['SKU', 'Name', 'Stock', 'Price', 'Shelf'].join(',') +
                '\n' +
                products.map((p) => [p.sku, p.name, p.stock, p.price, p.shelfLocation].join(',')).join('\n');
              const link = document.createElement('a');
              link.setAttribute('href', encodeURI(csv));
              link.setAttribute('download', 'CNA_Inventory_Report.csv');
              link.click();
              showToast('خروجی اکسل انبار با موفقیت آماده شد.');
            }}
            className="h-11 px-4 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface flex items-center gap-2 font-label-lg text-label-lg transition-all shadow-sm"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px] text-on-surface-variant">
              file_download
            </span>
            <span>خروجی اکسل انبار</span>
          </button>

          <button
            onClick={() => {
              setSelectedStockStatus('critical');
              showToast('فیلتر کالاهای با موجودی بحرانی فعال شد.');
            }}
            className="h-11 px-4 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface flex items-center gap-2 font-label-lg text-label-lg transition-all shadow-sm"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px] text-tertiary">warning</span>
            <span>سفارش‌گذاری شارژ مجدد</span>
          </button>

          <button
            onClick={() => {
              setEditingProduct(null);
              setIsCreateModalOpen(true);
            }}
            className="h-11 px-6 rounded-xl bg-primary hover:bg-primary-container text-on-primary flex items-center gap-2 font-label-lg text-label-lg shadow-sm transition-all"
            type="button"
          >
            <span className="material-symbols-outlined text-[22px]">add_box</span>
            <span>افزودن محصول جدید</span>
          </button>
        </div>
      </div>

      {/* Inventory Summary Strip (4 KPI Tiles) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Total */}
        <div className="relative overflow-hidden bg-surface-container-lowest p-5 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-md text-label-md text-on-surface-variant">
                کل تنوع محصولات
              </span>
              <span className="font-headline-xl text-headline-xl text-on-surface mt-1">
                {toPersianDigits(totalCount)}{' '}
                <span className="font-label-md text-label-md text-on-surface-variant font-normal">
                  کالا
                </span>
              </span>
            </div>
            <div className="w-11 h-11 rounded-lg bg-surface-container-low flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[26px]">devices_other</span>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="font-body-sm text-body-sm text-secondary">۸ دسته فعال کالایی</span>
            <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-surface-container-high text-primary font-bold">
              ۱۰۰٪ پوشش
            </span>
          </div>
          <div className="w-full bg-surface-container-high h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-primary h-full rounded-full" style={{ width: '100%' }}></div>
          </div>
        </div>

        {/* Stat 2: In-stock */}
        <div className="relative overflow-hidden bg-surface-container-lowest p-5 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-md text-label-md text-on-surface-variant">
                کالاهای موجود در انبار
              </span>
              <span className="font-headline-xl text-headline-xl text-emerald-600 mt-1">
                {toPersianDigits(inStockCount)}{' '}
                <span className="font-label-md text-label-md text-on-surface-variant font-normal">
                  قلم
                </span>
              </span>
            </div>
            <div className="w-11 h-11 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[26px]">check_circle</span>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="font-body-sm text-body-sm text-on-surface-variant">آماده ارسال فوری</span>
            <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold">
              {toPersianDigits(inStockPercent)}٪ موجودی
            </span>
          </div>
          <div className="w-full bg-surface-container-high h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full"
              style={{ width: `${inStockPercent}%` }}
            ></div>
          </div>
        </div>

        {/* Stat 3: Critical Stock */}
        <div className="relative overflow-hidden bg-surface-container-lowest p-5 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-md text-label-md text-on-surface-variant">
                موجودی بحرانی (کمتر از ۵ عدد)
              </span>
              <span className="font-headline-xl text-headline-xl text-amber-600 mt-1">
                {toPersianDigits(criticalCount)}{' '}
                <span className="font-label-md text-label-md text-on-surface-variant font-normal">
                  قلم
                </span>
              </span>
            </div>
            <div className="w-11 h-11 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[26px]">notification_important</span>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="font-body-sm text-body-sm text-on-surface-variant">نیازمند شارژ انبار</span>
            <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold">
              هشدار سی‌ان‌ای
            </span>
          </div>
          <div className="w-full bg-surface-container-high h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-amber-500 h-full rounded-full" style={{ width: '15%' }}></div>
          </div>
        </div>

        {/* Stat 4: Out of stock */}
        <div className="relative overflow-hidden bg-surface-container-lowest p-5 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-md text-label-md text-on-surface-variant">
                کالاهای ناموجود در انبار
              </span>
              <span className="font-headline-xl text-headline-xl text-error mt-1">
                {toPersianDigits(outOfStockCount)}{' '}
                <span className="font-label-md text-label-md text-on-surface-variant font-normal">
                  قلم
                </span>
              </span>
            </div>
            <div className="w-11 h-11 rounded-lg bg-error-container text-on-error-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[26px]">block</span>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              عدم تخصیص به فروشگاه
            </span>
            <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-error-container text-on-error-container font-bold">
              {toPersianDigits(outOfStockPercent)}٪ ناموجود
            </span>
          </div>
          <div className="w-full bg-surface-container-high h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-error h-full rounded-full"
              style={{ width: `${outOfStockPercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar Card */}
      <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box with Clear Button */}
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[22px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجوی نام گوشی، مدل انگلیسی، بارکد، کد کالا (SKU)..."
              className="w-full h-12 pr-11 pl-10 rounded-xl bg-surface-container-low text-on-surface font-body-md text-body-md placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>

          {/* Select Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Category Filter */}
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="h-12 pr-9 pl-8 rounded-xl bg-surface-container-low text-on-surface font-label-lg text-label-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              >
                <option value="همه">همه دسته‌بندی‌ها (کامل)</option>
                <option value="اپل">گوشی‌های اپل (iPhone)</option>
                <option value="سامسونگ">گوشی‌های سامسونگ (Galaxy)</option>
                <option value="شیائومی">شیائومی و پوکو (Xiaomi)</option>
                <option value="ساعت">ساعت و هندزفری هوشمند</option>
                <option value="شارژر">آداپتور، کابل و گارد اورجینال</option>
              </select>
              <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[20px]">
                category
              </span>
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[18px]">
                expand_more
              </span>
            </div>

            {/* Stock Status Filter */}
            <div className="relative">
              <select
                value={selectedStockStatus}
                onChange={(e) => setSelectedStockStatus(e.target.value)}
                className="h-12 pr-9 pl-8 rounded-xl bg-surface-container-low text-on-surface font-label-lg text-label-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              >
                <option value="all">وضعیت: تمام موجودی‌ها</option>
                <option value="inStock">موجود در انبار مرکزی</option>
                <option value="critical">رو به اتمام (کمتر از ۵)</option>
                <option value="outOfStock">ناموجود (Out of Stock)</option>
              </select>
              <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[20px]">
                inventory
              </span>
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[18px]">
                expand_more
              </span>
            </div>

            {/* Sort Filter */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-12 pr-9 pl-8 rounded-xl bg-surface-container-low text-on-surface font-label-lg text-label-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              >
                <option value="newest">مرتب‌سازی: جدیدترین ورودی</option>
                <option value="priceDesc">گران‌ترین به ارزان‌ترین</option>
                <option value="priceAsc">ارزان‌ترین به گران‌ترین</option>
                <option value="stockDesc">بیشترین موجودی فیزیکی</option>
              </select>
              <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[20px]">
                sort
              </span>
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[18px]">
                expand_more
              </span>
            </div>

            {/* View Reset Button */}
            <button
              onClick={handleResetFilters}
              className="w-12 h-12 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface-variant flex items-center justify-center transition-colors"
              title="بازنشانی فیلترها"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">filter_alt_off</span>
            </button>
          </div>
        </div>

        {/* Active Filter Tags */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              فیلترهای فعال:
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary font-label-sm text-label-sm">
              دسته‌بندی: {selectedCategory}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
              گارانتی: CNA Care طلایی
            </span>
            {(searchQuery || selectedCategory !== 'همه' || selectedStockStatus !== 'all') && (
              <button
                onClick={handleResetFilters}
                className="font-label-sm text-label-sm text-primary hover:underline pr-2"
                type="button"
              >
                پاک کردن همه فیلترها
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              نمایش {toPersianDigits(filteredProducts.length)} از مجموع {toPersianDigits(totalCount)}{' '}
              مورد
            </span>
          </div>
        </div>
      </div>

      {/* Bulk Action Floating Bar (Contextual) */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between p-3.5 px-5 rounded-xl bg-surface-container-high text-on-surface shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-[22px]">checklist</span>
            <span className="font-label-lg text-label-lg font-bold">
              {toPersianDigits(selectedIds.length)} کالا انتخاب شده‌اند
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant hidden md:inline">
              (می‌توانید عملیات گروهی روی محصولات انتخابی اعمال کنید)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsBulkPriceModalOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-surface-container-lowest text-on-surface hover:bg-surface text-label-sm font-label-sm flex items-center gap-1.5 shadow-sm transition-all"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px] text-primary">price_change</span>
              <span>تغییر قیمت گروهی</span>
            </button>
            <button
              onClick={() => bulkTogglePublish(selectedIds, true)}
              className="px-3.5 py-1.5 rounded-lg bg-surface-container-lowest text-on-surface hover:bg-surface text-label-sm font-label-sm flex items-center gap-1.5 shadow-sm transition-all"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px] text-emerald-600">
                published_with_changes
              </span>
              <span>فعال‌سازی در سایت</span>
            </button>
            <button
              onClick={() => {
                if (window.confirm(`آیا از حذف ${selectedIds.length} کالای انتخابی اطمینان دارید؟`)) {
                  bulkDeleteProducts(selectedIds);
                  setSelectedIds([]);
                }
              }}
              className="px-3.5 py-1.5 rounded-lg bg-error-container text-on-error-container hover:opacity-90 text-label-sm font-label-sm flex items-center gap-1.5 shadow-sm transition-all"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
              <span>حذف گروهی</span>
            </button>
          </div>
        </div>
      )}

      {/* Comprehensive Data Table Card */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse select-text">
            <thead>
              <tr className="bg-surface-container-low text-on-surface-variant font-label-md text-label-md">
                <th className="py-4 px-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={
                      filteredProducts.length > 0 &&
                      selectedIds.length === filteredProducts.length
                    }
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                  />
                </th>
                <th className="py-4 px-4 min-w-[280px]">تصویر و نام کالا</th>
                <th className="py-4 px-4 min-w-[130px]">کد کالا (SKU)</th>
                <th className="py-4 px-4 min-w-[150px]">دسته‌بندی و برند</th>
                <th className="py-4 px-4 min-w-[170px]">قیمت فروش و تخفیف</th>
                <th className="py-4 px-4 min-w-[180px]">موجودی و لوکیشن انبار</th>
                <th className="py-4 px-4 min-w-[170px]">گارانتی و پارت نامبر</th>
                <th className="py-4 px-4 min-w-[100px] text-center">وضعیت سایت</th>
                <th className="py-4 px-4 min-w-[140px] text-center">عملیات مدیریت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high/40 font-body-sm text-body-sm text-on-surface">
              {filteredProducts.map((product) => {
                const isChecked = selectedIds.includes(product.id);
                const isOutOfStock = product.stock === 0;
                const isLowStock = product.stock > 0 && product.stock <= 4;

                return (
                  <tr
                    key={product.id}
                    className={`hover:bg-surface-container-low/60 transition-colors ${
                      isOutOfStock ? 'opacity-75' : isLowStock ? 'bg-amber-50/20' : ''
                    }`}
                  >
                    <td className="py-4 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleSelectRow(product.id)}
                        className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                      />
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`relative w-14 h-14 rounded-lg bg-surface-container-low overflow-hidden flex-shrink-0 flex items-center justify-center p-1 ${
                            isOutOfStock ? 'grayscale' : ''
                          }`}
                        >
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <span className="material-symbols-outlined text-[24px] text-outline">
                              smartphone
                            </span>
                          )}
                          <span
                            className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
                              isOutOfStock
                                ? 'bg-error'
                                : isLowStock
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                          ></span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-headline-sm text-headline-sm text-on-surface truncate">
                              {product.name}
                            </span>
                            {product.badge && (
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  isOutOfStock
                                    ? 'bg-error-container text-on-error-container'
                                    : isLowStock
                                    ? 'bg-amber-100 text-amber-900'
                                    : 'bg-primary-fixed text-primary'
                                }`}
                              >
                                {product.badge}
                              </span>
                            )}
                          </div>
                          <span
                            className="font-label-sm text-label-sm text-on-surface-variant font-mono mt-0.5 truncate"
                            dir="ltr"
                          >
                            {product.englishTitle}
                          </span>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-secondary">
                            {product.specs?.color && (
                              <span>رنگ: {product.specs.color}</span>
                            )}
                            {product.specs?.storage && (
                              <>
                                <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
                                <span>حافظه: {product.specs.storage}</span>
                              </>
                            )}
                            {product.specs?.ram && (
                              <>
                                <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
                                <span>رم: {product.specs.ram}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col font-mono">
                        <span className="font-label-md text-label-md text-primary font-bold">
                          {product.sku}
                        </span>
                        <span className="text-[11px] text-on-surface-variant">
                          بارکد: {toPersianDigits(product.barcode)}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <span className="font-label-md text-label-md text-on-surface font-semibold">
                          {product.brand}
                        </span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
                          {product.category}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <div className="flex items-baseline gap-1">
                          <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                            {toPersianDigits(new Intl.NumberFormat('fa-IR').format(product.price))}
                          </span>
                          <span className="font-label-sm text-label-sm text-on-surface-variant">
                            تومان
                          </span>
                        </div>
                        {product.discountPrice && product.discountPrice > product.price ? (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[12px] text-outline line-through">
                              {toPersianDigits(
                                new Intl.NumberFormat('fa-IR').format(product.discountPrice)
                              )}
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-tertiary/10 text-tertiary text-[10px] font-bold">
                              {toPersianDigits(product.discountPercent || 0)}٪ تخفیف
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-on-surface-variant mt-0.5">
                            قیمت مصوب شرکتی
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          {product.stock > 4 && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-label-md text-label-md font-bold">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                              <span>{toPersianDigits(product.stock)} عدد موجود</span>
                            </span>
                          )}
                          {product.stock > 0 && product.stock <= 4 && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-label-md text-label-md font-bold">
                              <span className="material-symbols-outlined text-[15px] text-amber-700">
                                warning
                              </span>
                              <span>تنها {toPersianDigits(product.stock)} عدد باقیست</span>
                            </span>
                          )}
                          {product.stock === 0 && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-error-container text-on-error-container font-label-md text-label-md font-bold">
                              <span className="material-symbols-outlined text-[14px]">cancel</span>
                              <span>۰ عدد (اتمام موجودی)</span>
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-on-surface-variant font-mono">
                          <span className="material-symbols-outlined text-[14px]">shelves</span>
                          <span>{product.shelfLocation}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1 text-on-surface">
                          <span className="material-symbols-outlined text-primary text-[16px]">
                            verified
                          </span>
                          <span className="font-label-sm text-label-sm font-bold">
                            {product.warranty}
                          </span>
                        </div>
                        <span className="font-mono text-[11px] text-on-surface-variant mt-0.5">
                          پارت: {product.partNumber}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => togglePublish(product.id)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          product.isPublished ? 'bg-primary' : 'bg-surface-container-high'
                        }`}
                        title={product.isPublished ? 'فعال در فروشگاه' : 'غیرفعال در فروشگاه'}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-surface-container-lowest shadow-md transition-transform ${
                            product.isPublished ? '-translate-x-5' : '-translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProduct(product);
                            setIsCreateModalOpen(true);
                          }}
                          className="w-8 h-8 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors flex items-center justify-center"
                          title="ویرایش اطلاعات محصول"
                        >
                          <span className="material-symbols-outlined text-[19px]">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setVariantProduct(product)}
                          className="w-8 h-8 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors flex items-center justify-center"
                          title="مدیریت تنوع رنگ و ظرفیت"
                        >
                          <span className="material-symbols-outlined text-[19px]">tune</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setHistoryProduct(product)}
                          className="w-8 h-8 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors flex items-center justify-center"
                          title="تاریخچه تغییرات قیمت"
                        >
                          <span className="material-symbols-outlined text-[19px]">history</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`آیا از حذف "${product.name}" اطمینان دارید؟`)) {
                              deleteProduct(product.id);
                            }
                          }}
                          className="w-8 h-8 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/40 transition-colors flex items-center justify-center"
                          title="حذف کالا"
                        >
                          <span className="material-symbols-outlined text-[19px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Pagination & Settings Strip */}
        <div className="bg-surface-container-low/50 p-4 px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              تعداد نمایش در صفحه:
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-surface-container-lowest text-on-surface font-label-md text-label-md shadow-sm">
              {toPersianDigits(filteredProducts.length)} مورد
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant mr-2">
              نمایش ۱ تا {toPersianDigits(filteredProducts.length)} از {toPersianDigits(totalCount)}{' '}
              رکورد انبار
            </span>
          </div>

          <div className="flex items-center gap-1.5" dir="rtl">
            <button
              className="w-9 h-9 rounded-lg bg-surface-container-lowest text-outline flex items-center justify-center shadow-sm cursor-not-allowed opacity-50"
              disabled
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
            <button
              className="w-9 h-9 rounded-lg bg-primary text-on-primary font-headline-sm text-headline-sm flex items-center justify-center shadow-sm"
              type="button"
            >
              ۱
            </button>
            <button
              className="w-9 h-9 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-on-surface font-headline-sm text-headline-sm flex items-center justify-center shadow-sm transition-colors"
              type="button"
            >
              ۲
            </button>
            <button
              className="w-9 h-9 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-on-surface flex items-center justify-center shadow-sm transition-colors"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Inventory Insights (Donut SVG Chart + Storage Zone + Quick Batch Stock Adjustment) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Analytics: Brand Allocation Chart */}
        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">pie_chart</span>
                <h2 className="font-headline-sm text-headline-sm text-on-surface">
                  سهم ارزش موجودی انبار بر اساس برند
                </h2>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                به‌روزرسانی: امروز
              </span>
            </div>
            <div className="flex items-center gap-6 my-2">
              {/* Donut SVG */}
              <div className="relative w-28 h-28 flex-shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-surface-container-high"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.8"
                  ></path>
                  {/* Apple 54% */}
                  <path
                    className="text-primary"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeDasharray="54, 100"
                    strokeWidth="3.8"
                  ></path>
                  {/* Samsung 30% */}
                  <path
                    className="text-secondary"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeDasharray="30, 100"
                    strokeDashoffset="-54"
                    strokeWidth="3.8"
                  ></path>
                  {/* Xiaomi & Others 16% */}
                  <path
                    className="text-tertiary"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeDasharray="16, 100"
                    strokeDashoffset="-84"
                    strokeWidth="3.8"
                  ></path>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
                    ۵۴٪
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant text-[10px]">
                    سهم اپل
                  </span>
                </div>
              </div>
              {/* Legend */}
              <div className="flex flex-col gap-2 flex-1">
                <div className="flex items-center justify-between text-body-sm font-body-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-primary"></span>
                    <span className="text-on-surface">اپل (iPhone)</span>
                  </div>
                  <span className="font-bold text-on-surface">۵۴٪</span>
                </div>
                <div className="flex items-center justify-between text-body-sm font-body-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-secondary"></span>
                    <span className="text-on-surface">سامسونگ (Galaxy)</span>
                  </div>
                  <span className="font-bold text-on-surface">۳۰٪</span>
                </div>
                <div className="flex items-center justify-between text-body-sm font-body-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-tertiary"></span>
                    <span className="text-on-surface">شیائومی و سایرین</span>
                  </div>
                  <span className="font-bold text-on-surface">۱۶٪</span>
                </div>
              </div>
            </div>
          </div>
          <div className="pt-3 border-t border-surface-container flex items-center justify-between text-label-sm font-label-sm text-on-surface-variant">
            <span>ارزش کل موجودی ریالی:</span>
            <span className="font-bold text-on-surface text-label-lg font-label-lg">
              ۴,۸۵۰,۰۰۰,۰۰۰ تومان
            </span>
          </div>
        </div>

        {/* Storage Zone Map & Warehouse Health */}
        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">domain</span>
                <h2 className="font-headline-sm text-headline-sm text-on-surface">
                  وضعیت فیزیکی انبار مرکزی (تهران)
                </h2>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-label-sm text-label-sm font-bold">
                فعال و ایمن
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">
              ظرفیت اشغال شده لاین‌های انبار محصولات با سیستم بارکدخوان هوشمند CNA Track:
            </p>
            <div className="flex flex-col gap-3">
              <div>
                <div className="flex justify-between font-label-sm text-label-sm mb-1 text-on-surface">
                  <span>لاین A و B (گوشی‌های هوشمند پلمپ)</span>
                  <span className="font-bold">۸۸٪ پر شده</span>
                </div>
                <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                  <div className="bg-primary h-full rounded-full" style={{ width: '88%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between font-label-sm text-label-sm mb-1 text-on-surface">
                  <span>لاین C (لوازم جانبی و اکسسوری)</span>
                  <span className="font-bold">۵۲٪ پر شده</span>
                </div>
                <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                  <div className="bg-secondary h-full rounded-full" style={{ width: '52%' }}></div>
                </div>
              </div>
            </div>
          </div>
          <div className="pt-4 flex items-center justify-between border-t border-surface-container mt-2">
            <span className="font-label-sm text-label-sm text-primary flex items-center gap-1 font-bold">
              <span className="material-symbols-outlined text-[16px]">qr_code_scanner</span>
              <span>بارکدخوان زبرا COM-3 فعال</span>
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
              دمای استاندارد: ۲۱°C
            </span>
          </div>
        </div>

        {/* Quick Batch Stock Adjustment Panel */}
        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-primary text-[20px]">bolt</span>
              <h2 className="font-headline-sm text-headline-sm text-on-surface">
                عملیات سریع ورود به انبار
              </h2>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-3">
              ثبت فوری پارت بار تحویلی جدید بدون نیاز به باز کردن فرم کامل محصول:
            </p>
            <form onSubmit={handleQuickStockSubmit} className="flex flex-col gap-2.5">
              <div className="relative">
                <input
                  type="text"
                  value={quickBarcodeOrSku}
                  onChange={(e) => setQuickBarcodeOrSku(e.target.value)}
                  placeholder="اسکن بارکد یا شناسه کالا (مثال: CNA-APL-16PM)..."
                  className="w-full h-10 px-3 pr-9 rounded-lg bg-surface-container-low text-on-surface text-body-sm font-body-sm placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                  barcode_scanner
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min="1"
                  value={quickStockAmount}
                  onChange={(e) => setQuickStockAmount(parseInt(e.target.value, 10) || 1)}
                  placeholder="تعداد ورودی"
                  className="w-full h-10 px-3 rounded-lg bg-surface-container-low text-on-surface text-body-sm font-body-sm placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary font-mono text-left"
                />
                <select
                  value={quickShelf}
                  onChange={(e) => setQuickShelf(e.target.value)}
                  className="w-full h-10 px-2 rounded-lg bg-surface-container-low text-on-surface text-label-sm font-label-sm focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                >
                  <option value="قفسه A (اصلی)">قفسه A (اصلی)</option>
                  <option value="قفسه: B-14 | لاین موبایل">قفسه B (موبایل)</option>
                  <option value="قفسه: ACC-05 | انبار اکسسوری">قفسه C (اکسسوری)</option>
                </select>
              </div>
              <div className="mt-2">
                <button
                  type="submit"
                  className="w-full h-10 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">add_circle</span>
                  <span>ثبت و افزایش فوری موجودی</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Edit / Create Product Modal */}
      <CreateProductModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingProduct(null);
        }}
        productToEdit={editingProduct}
      />

      {/* Bulk Price Adjustment Modal */}
      {isBulkPriceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[24px]">
                  price_change
                </span>
                <h3 className="font-headline-md text-headline-md text-on-surface">
                  تغییر قیمت گروهی محصولات
                </h3>
              </div>
              <button
                onClick={() => setIsBulkPriceModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <form onSubmit={handleBulkPriceSubmit} className="flex flex-col gap-4">
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                تغییر قیمت برای {toPersianDigits(selectedIds.length)} محصول انتخاب‌شده اعمال خواهد شد.
              </p>
              <div className="flex flex-col gap-2">
                <label className="font-label-md text-on-surface">نحوه اعمال تغییر قیمت:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBulkPriceMode('percent')}
                    className={`h-10 rounded-xl font-label-md transition-all ${
                      bulkPriceMode === 'percent'
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-low text-on-surface'
                    }`}
                  >
                    درصدی (٪)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkPriceMode('fixed')}
                    className={`h-10 rounded-xl font-label-md transition-all ${
                      bulkPriceMode === 'fixed'
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-low text-on-surface'
                    }`}
                  >
                    مبلغ ثابت (تومان)
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-on-surface">
                  {bulkPriceMode === 'percent' ? 'درصد افزایش یا کاهش (مثبت یا منفی)' : 'مبلغ تغییر به تومان'}
                </label>
                <input
                  type="number"
                  required
                  value={bulkPriceValue}
                  onChange={(e) => setBulkPriceValue(parseFloat(e.target.value) || 0)}
                  placeholder={bulkPriceMode === 'percent' ? 'مثال: ۵ یا -۱۰' : 'مثال: ۵۰۰۰۰۰'}
                  className="h-11 px-3.5 rounded-xl bg-surface-container-low text-on-surface font-mono text-left focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-container">
                <button
                  type="button"
                  onClick={() => setIsBulkPriceModalOpen(false)}
                  className="h-10 px-4 rounded-xl bg-surface-container text-on-surface font-label-md"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="h-10 px-6 rounded-xl bg-primary text-on-primary font-label-md shadow-sm"
                >
                  اعمال تغییر قیمت
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Price History Modal */}
      {historyProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[24px]">history</span>
                <h3 className="font-headline-md text-headline-md text-on-surface">
                  تاریخچه تغییرات قیمت
                </h3>
              </div>
              <button
                onClick={() => setHistoryProduct(null)}
                className="w-8 h-8 rounded-lg bg-surface-container text-on-surface flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <span className="font-headline-sm text-on-surface">{historyProduct.name}</span>
              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-surface-container-low flex justify-between items-center">
                  <span className="font-label-md text-on-surface">نرخ فعلی سیستم</span>
                  <span className="font-bold text-primary font-mono">
                    {formatToman(historyProduct.price)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-surface-container-low/60 flex justify-between items-center text-on-surface-variant">
                  <span className="text-body-sm">۷ روز پیش (پیش از نوسان درهم)</span>
                  <span className="font-mono text-body-sm line-through">
                    {formatToman(Math.round(historyProduct.price * 0.96))}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-surface-container-low/40 flex justify-between items-center text-on-surface-variant">
                  <span className="text-body-sm">۳۰ روز پیش</span>
                  <span className="font-mono text-body-sm">
                    {formatToman(Math.round(historyProduct.price * 0.94))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Variant / Specs Modal */}
      {variantProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[24px]">tune</span>
                <h3 className="font-headline-md text-headline-md text-on-surface">
                  مدیریت تنوع و مشخصات فنی
                </h3>
              </div>
              <button
                onClick={() => setVariantProduct(null)}
                className="w-8 h-8 rounded-lg bg-surface-container text-on-surface flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="flex flex-col gap-3 text-body-sm">
              <span className="font-headline-sm text-on-surface">{variantProduct.name}</span>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-surface-container-low">
                  <span className="text-on-surface-variant text-[11px] block">رنگ بدنه</span>
                  <span className="font-bold text-on-surface">
                    {variantProduct.specs?.color || 'ثبت نشده'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-surface-container-low">
                  <span className="text-on-surface-variant text-[11px] block">ظرفیت ذخیره‌سازی</span>
                  <span className="font-bold text-on-surface">
                    {variantProduct.specs?.storage || 'ثبت نشده'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-surface-container-low">
                  <span className="text-on-surface-variant text-[11px] block">حافظه RAM</span>
                  <span className="font-bold text-on-surface">
                    {variantProduct.specs?.ram || 'ثبت نشده'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-surface-container-low">
                  <span className="text-on-surface-variant text-[11px] block">پارت نامبر</span>
                  <span className="font-bold text-on-surface font-mono">
                    {variantProduct.partNumber}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setVariantProduct(null);
                  setEditingProduct(variantProduct);
                  setIsCreateModalOpen(true);
                }}
                className="mt-2 h-10 rounded-xl bg-primary text-on-primary font-label-md flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">edit</span>
                <span>ویرایش مقادیر در فرم کامل</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
