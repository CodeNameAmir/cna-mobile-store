import React, { useState } from 'react';
import { useAdminData } from '../../context/AdminDataContext';
import { Product } from '../../types/admin';

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
}

export const CreateProductModal: React.FC<CreateProductModalProps> = ({
  isOpen,
  onClose,
  productToEdit
}) => {
  const { addProduct, updateProduct } = useAdminData();

  const isEditing = Boolean(productToEdit);

  const [name, setName] = useState(productToEdit?.name || '');
  const [englishTitle, setEnglishTitle] = useState(productToEdit?.englishTitle || '');
  const [sku, setSku] = useState(productToEdit?.sku || '');
  const [barcode, setBarcode] = useState(productToEdit?.barcode || '');
  const [brand, setBrand] = useState(productToEdit?.brand || 'اپل (Apple)');
  const [category, setCategory] = useState(productToEdit?.category || 'گوشی‌های اپل (iPhone)');
  const [price, setPrice] = useState(productToEdit?.price?.toString() || '');
  const [discountPrice, setDiscountPrice] = useState(productToEdit?.discountPrice?.toString() || '');
  const [stock, setStock] = useState(productToEdit?.stock?.toString() || '10');
  const [shelfLocation, setShelfLocation] = useState(productToEdit?.shelfLocation || 'قفسه: B-12 | لاین موبایل');
  const [warranty, setWarranty] = useState(productToEdit?.warranty || 'CNA Care طلایی (۱۸ ماه)');
  const [partNumber, setPartNumber] = useState(productToEdit?.partNumber || 'ZAA (دو سیم)');
  const [color, setColor] = useState(productToEdit?.specs?.color || 'تیتانیوم مشکی');
  const [storage, setStorage] = useState(productToEdit?.specs?.storage || '۲۵۶ گیگابایت');
  const [ram, setRam] = useState(productToEdit?.specs?.ram || '۸ گیگابایت');
  const [image, setImage] = useState(
    productToEdit?.image ||
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDEhqOL3yhWHLA5GOfq-QD2P28EOK9Joo6p2sk0YAf9Q_CGggWL_eUWvfICHrIMAZioJqDBpRcaa-K5aploQyIMBBMMh1M1GShLh6nEfYyRMpppl_gZwEUoLttFPgFbSnMrCYAI3JEU2jHeko0AUL1mD9h9P3_dcJFkyqZ1xSqsQlQjhFj-vit-ZhPpzvWOVHPHYG3CrQgegn8l54tfGUp8GbPqmCCAIldK34Pru00F'
  );
  const [badge, setBadge] = useState(productToEdit?.badge || 'جدید');
  const [errorMsg, setErrorMsg] = useState('');

  // Reset or initialize on open
  React.useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name);
      setEnglishTitle(productToEdit.englishTitle);
      setSku(productToEdit.sku);
      setBarcode(productToEdit.barcode);
      setBrand(productToEdit.brand);
      setCategory(productToEdit.category);
      setPrice(productToEdit.price.toString());
      setDiscountPrice(productToEdit.discountPrice ? productToEdit.discountPrice.toString() : '');
      setStock(productToEdit.stock.toString());
      setShelfLocation(productToEdit.shelfLocation);
      setWarranty(productToEdit.warranty);
      setPartNumber(productToEdit.partNumber);
      setColor(productToEdit.specs?.color || '');
      setStorage(productToEdit.specs?.storage || '');
      setRam(productToEdit.specs?.ram || '');
      setImage(productToEdit.image);
      setBadge(productToEdit.badge || '');
    } else {
      setName('');
      setEnglishTitle('');
      setSku(`CNA-PRD-${Math.floor(100 + Math.random() * 900)}`);
      setBarcode(`${Math.floor(1000000000 + Math.random() * 9000000000)}`);
      setPrice('');
      setDiscountPrice('');
      setStock('12');
      setErrorMsg('');
    }
  }, [productToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const parsedPrice = parseInt(price.replace(/[^\d]/g, ''), 10);
    const parsedDiscountPrice = discountPrice ? parseInt(discountPrice.replace(/[^\d]/g, ''), 10) : 0;
    const parsedStock = parseInt(stock.replace(/[^\d]/g, ''), 10);

    if (!name.trim()) {
      setErrorMsg('لطفاً عنوان فارسی محصول را وارد نمایید.');
      return;
    }
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setErrorMsg('قیمت محصول باید یک عدد مثبت باشد.');
      return;
    }
    if (parsedDiscountPrice > 0 && parsedDiscountPrice <= parsedPrice) {
      setErrorMsg('قیمت قبلی (خط‌خورده) باید از قیمت نهایی بیشتر باشد.');
      return;
    }
    if (isNaN(parsedStock) || parsedStock < 0) {
      setErrorMsg('موجودی انبار نمی‌تواند منفی باشد.');
      return;
    }

    let discountPercent = 0;
    if (parsedDiscountPrice > parsedPrice) {
      discountPercent = Math.round(((parsedDiscountPrice - parsedPrice) / parsedDiscountPrice) * 100);
    }

    const payload = {
      name: name.trim(),
      englishTitle: englishTitle.trim() || name.trim(),
      slug: (englishTitle.trim() || name.trim()).toLowerCase().replace(/\s+/g, '-'),
      sku: sku.trim() || `CNA-PRD-${Date.now().toString().slice(-4)}`,
      barcode: barcode.trim() || `${Date.now()}`,
      brand,
      category,
      price: parsedPrice,
      discountPrice: parsedDiscountPrice > 0 ? parsedDiscountPrice : undefined,
      discountPercent: discountPercent > 0 ? discountPercent : undefined,
      stock: parsedStock,
      shelfLocation: shelfLocation.trim(),
      warranty: warranty.trim(),
      partNumber: partNumber.trim(),
      isPublished: true,
      image,
      badge: badge.trim() || undefined,
      specs: {
        color: color.trim() || undefined,
        storage: storage.trim() || undefined,
        ram: ram.trim() || undefined
      }
    };

    if (isEditing && productToEdit) {
      updateProduct(productToEdit.id, payload);
    } else {
      addProduct(payload);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-fade-in" dir="rtl">
      <div className="bg-surface-container-lowest rounded-2xl max-w-3xl w-full p-6 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-surface-container-high shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-fixed text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">
                {isEditing ? 'edit_note' : 'add_box'}
              </span>
            </div>
            <div>
              <h3 className="font-headline-md text-headline-md text-on-surface">
                {isEditing ? 'ویرایش مشخصات کالا در انبار' : 'افزودن محصول جدید به انبار مرکزی'}
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                اطلاعات فنی، بارکد، قیمت‌گذاری و موقعیت فیزیکی کالا در قفسه‌های انبار
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="overflow-y-auto py-5 pe-2 flex flex-col gap-5 flex-1">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-error-container text-on-error-container text-body-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Titles & Codes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="font-label-md text-label-md text-on-surface">نام فارسی کالا *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: گوشی اپل مدل iPhone 16 Pro Max"
                className="h-11 px-3.5 rounded-xl bg-surface-container-low text-on-surface text-body-sm focus:outline-none focus:ring-2 focus:ring-primary border border-transparent focus:border-primary transition-all"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-label-md text-label-md text-on-surface">عنوان انگلیسی و مشخصه (English Title)</label>
              <input
                type="text"
                dir="ltr"
                value={englishTitle}
                onChange={(e) => setEnglishTitle(e.target.value)}
                placeholder="iPhone 16 Pro Max 256GB - Desert Titanium"
                className="h-11 px-3.5 rounded-xl bg-surface-container-low text-on-surface text-body-sm focus:outline-none focus:ring-2 focus:ring-primary border border-transparent focus:border-primary transition-all font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="font-label-md text-label-md text-on-surface">کد کالا (SKU)</label>
              <input
                type="text"
                dir="ltr"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="CNA-APL-16PM"
                className="h-11 px-3.5 rounded-xl bg-surface-container-low text-on-surface text-body-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-label-md text-label-md text-on-surface">بارکد تجاری</label>
              <input
                type="text"
                dir="ltr"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="۰۱۹۵۹۴۹۲۱۸"
                className="h-11 px-3.5 rounded-xl bg-surface-container-low text-on-surface text-body-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-label-md text-label-md text-on-surface">برند</label>
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="h-11 px-3.5 rounded-xl bg-surface-container-low text-on-surface text-body-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="اپل (Apple)">اپل (Apple)</option>
                <option value="سامسونگ (Samsung)">سامسونگ (Samsung)</option>
                <option value="شیائومی (Xiaomi)">شیائومی (Xiaomi)</option>
                <option value="انکر (Anker)">انکر (Anker)</option>
                <option value="نیلکین (Nillkin)">نیلکین (Nillkin)</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-label-md text-label-md text-on-surface">دسته‌بندی</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-11 px-3.5 rounded-xl bg-surface-container-low text-on-surface text-body-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="گوشی‌های اپل (iPhone)">گوشی‌های اپل (iPhone)</option>
                <option value="گوشی‌های سامسونگ (Galaxy)">گوشی‌های سامسونگ (Galaxy)</option>
                <option value="شیائومی و پوکو (Xiaomi)">شیائومی و پوکو (Xiaomi)</option>
                <option value="ساعت و هندزفری هوشمند">ساعت و هندزفری هوشمند</option>
                <option value="آداپتور، کابل و گارد اورجینال">آداپتور، کابل و گارد اورجینال</option>
              </select>
            </div>
          </div>

          {/* Section 2: Pricing & Stock */}
          <div className="p-4 rounded-xl bg-surface-container-low/70 border border-surface-container-high grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="font-label-md text-label-md text-on-surface">قیمت فروش (تومان) *</label>
              <input
                type="number"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="۹۴۵۰۰۰۰۰"
                className="h-11 px-3.5 rounded-xl bg-surface-container-lowest text-on-surface text-body-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono text-left"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-label-md text-label-md text-on-surface-variant">قیمت قبل تخفیف (اختیاری)</label>
              <input
                type="number"
                value={discountPrice}
                onChange={(e) => setDiscountPrice(e.target.value)}
                placeholder="۹۷۲۰۰۰۰۰"
                className="h-11 px-3.5 rounded-xl bg-surface-container-lowest text-on-surface text-body-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono text-left"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-label-md text-label-md text-on-surface">موجودی انبار مرکزی (عدد) *</label>
              <input
                type="number"
                required
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="۱۸"
                className="h-11 px-3.5 rounded-xl bg-surface-container-lowest text-on-surface text-body-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono text-left"
              />
            </div>
          </div>

          {/* Section 3: Physical & Warehouse Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="font-label-md text-label-md text-on-surface">موقعیت قفسه در انبار</label>
              <input
                type="text"
                value={shelfLocation}
                onChange={(e) => setShelfLocation(e.target.value)}
                placeholder="قفسه: B-14 | لاین موبایل"
                className="h-11 px-3.5 rounded-xl bg-surface-container-low text-on-surface text-body-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-label-md text-label-md text-on-surface">نوع گارانتی</label>
              <input
                type="text"
                value={warranty}
                onChange={(e) => setWarranty(e.target.value)}
                placeholder="CNA Care طلایی (۱۸ ماه)"
                className="h-11 px-3.5 rounded-xl bg-surface-container-low text-on-surface text-body-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-label-md text-label-md text-on-surface">پارت نامبر / مشخصه فنی</label>
              <input
                type="text"
                value={partNumber}
                onChange={(e) => setPartNumber(e.target.value)}
                placeholder="ZAA (دو سیم)"
                className="h-11 px-3.5 rounded-xl bg-surface-container-low text-on-surface text-body-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Section 4: Specs & Variants */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="font-label-md text-label-md text-on-surface">رنگ بدنه</label>
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="تیتانیوم صحرایی"
                className="h-11 px-3.5 rounded-xl bg-surface-container-low text-on-surface text-body-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-label-md text-label-md text-on-surface">حافظه داخلی</label>
              <input
                type="text"
                value={storage}
                onChange={(e) => setStorage(e.target.value)}
                placeholder="۲۵۶ گیگابایت"
                className="h-11 px-3.5 rounded-xl bg-surface-container-low text-on-surface text-body-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-label-md text-label-md text-on-surface">حافظه رم</label>
              <input
                type="text"
                value={ram}
                onChange={(e) => setRam(e.target.value)}
                placeholder="۸ گیگابایت"
                className="h-11 px-3.5 rounded-xl bg-surface-container-low text-on-surface text-body-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-label-md text-label-md text-on-surface">نشان ویژه (Badge)</label>
              <input
                type="text"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                placeholder="پرچمدار، هوش مصنوعی، پرفروش..."
                className="h-11 px-3.5 rounded-xl bg-surface-container-low text-on-surface text-body-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Section 5: Image URL */}
          <div className="flex flex-col gap-1.5">
            <label className="font-label-md text-label-md text-on-surface">لینک تصویر محصول (URL)</label>
            <div className="flex items-center gap-3">
              <input
                type="text"
                dir="ltr"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="https://..."
                className="flex-1 h-11 px-3.5 rounded-xl bg-surface-container-low text-on-surface text-body-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono text-left"
              />
              <div className="w-12 h-11 rounded-xl bg-surface-container flex items-center justify-center overflow-hidden shrink-0 border border-surface-container-high">
                {image ? (
                  <img src={image} alt="Preview" className="w-full h-full object-contain p-0.5" />
                ) : (
                  <span className="material-symbols-outlined text-outline text-[20px]">image</span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-container-high">
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-lg transition-colors"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="h-11 px-7 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-lg shadow-sm transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">
                {isEditing ? 'check' : 'add'}
              </span>
              <span>{isEditing ? 'ذخیره تغییرات' : 'افزودن و ثبت در انبار'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
