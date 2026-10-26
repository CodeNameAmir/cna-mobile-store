import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Heart, Bell, Star, ShieldCheck, Check } from 'lucide-react';
import { Product } from '../../types';
import { useCart } from '../../context/CartContext';
import { PriceTag } from './PriceTag';
import { Badge } from './Badge';
import { toPersianDigits } from '../../utils/formatters';

interface ProductCardProps {
  product: Product;
  onNotifyRequest?: (product: Product) => void;
  className?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onNotifyRequest,
  className = '',
}) => {
  const { addItem } = useCart();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.inStock) {
      addItem(product);
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 1200);
    } else if (onNotifyRequest) {
      onNotifyRequest(product);
    }
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsWishlisted(!isWishlisted);
  };

  const handleNotify = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onNotifyRequest) {
      onNotifyRequest(product);
    }
  };

  return (
    <div
      className={`group relative rounded-2xl bg-white p-4 border border-slate-200 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between ${
        !product.inStock ? 'opacity-90' : ''
      } ${className}`}
    >
      <div>
        {/* Badges & Wishlist Action Bar */}
        <div className="flex items-center justify-between mb-2">
          {product.discountPercent && product.discountPercent > 0 && product.inStock ? (
            <Badge variant="discount">
              {toPersianDigits(product.discountPercent)}٪ تخفیف
            </Badge>
          ) : !product.inStock ? (
            <Badge variant="outOfStock">
              ناموجود در انبار
            </Badge>
          ) : product.isSpecialOffer ? (
            <Badge variant="featured">
              پیشنهاد طلایی
            </Badge>
          ) : (
            <span />
          )}

          <button
            onClick={handleWishlist}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              isWishlisted
                ? 'bg-rose-50 text-rose-500'
                : 'bg-slate-100 text-slate-400 hover:text-rose-500 hover:bg-rose-50'
            }`}
            title="افزودن به علاقه‌مندی‌ها"
            type="button"
          >
            <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Product Image Frame */}
        <Link
          to={`/product/${product.slug}`}
          className="relative block w-full aspect-square rounded-xl bg-slate-50 overflow-hidden p-3 mb-3"
        >
          <img
            src={product.imageUrl}
            alt={product.titleFa}
            loading="lazy"
            className={`w-full h-full object-contain transform group-hover:scale-105 transition-transform duration-300 ${
              !product.inStock ? 'grayscale group-hover:grayscale-0' : ''
            }`}
          />

          {!product.inStock && (
            <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[1px] flex items-center justify-center">
              <span className="px-3 py-1 rounded-lg bg-slate-900/90 text-white text-xs font-bold shadow-sm">
                اتمام موجودی
              </span>
            </div>
          )}

          {product.selectedColor && (
            <span className="absolute bottom-2 end-2 px-2 py-0.5 rounded-md bg-white/90 backdrop-blur-xs text-[10px] text-slate-600 font-medium border border-slate-200/50 shadow-2xs">
              {product.selectedColor}
            </span>
          )}
        </Link>

        {/* Specs & Guarantee Tags */}
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          {product.selectedStorage && (
            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px] font-medium">
              {toPersianDigits(product.selectedStorage)}
            </span>
          )}
          {product.ramOptions && product.ramOptions[0] && (
            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px] font-medium">
              رم {toPersianDigits(product.ramOptions[0])}
            </span>
          )}
          <span className="inline-flex items-center gap-0.5 text-blue-600 text-[11px] font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>گارانتی رسمی</span>
          </span>
        </div>

        {/* Brand & Ratings */}
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
          <span className="font-medium">{product.brand}</span>
          <div className="flex items-center gap-1 text-amber-500 font-medium">
            <Star className="w-3.5 h-3.5 fill-current" />
            <span>{toPersianDigits(product.rating)}</span>
            <span className="text-slate-400">({toPersianDigits(product.reviewsCount)})</span>
          </div>
        </div>

        {/* Title */}
        <Link to={`/product/${product.slug}`} className="block">
          <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors mb-1">
            {product.titleFa}
          </h3>
          <p className="text-[11px] text-slate-400 font-mono tracking-tight line-clamp-1" dir="ltr">
            {product.titleEn}
          </p>
        </Link>
      </div>

      {/* Price & Purchase Action Bottom Row */}
      <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
        <PriceTag price={product.price} originalPrice={product.originalPrice} size="md" />

        {product.inStock ? (
          <button
            onClick={handleAddToCart}
            className={`h-10 px-3.5 rounded-xl flex items-center gap-1.5 text-xs font-semibold transition-all duration-200 shadow-2xs ${
              isAdded
                ? 'bg-emerald-600 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white active:scale-95'
            }`}
            type="button"
            title="افزودن به سبد خرید"
          >
            {isAdded ? (
              <>
                <Check className="w-4 h-4" />
                <span>افزوده شد</span>
              </>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4" />
                <span>خرید</span>
              </>
            )}
          </button>
        ) : (
          <button
            onClick={handleNotify}
            className="h-9 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-blue-700 text-[11px] font-semibold flex items-center gap-1 transition-colors"
            type="button"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>خبرم کن</span>
          </button>
        )}
      </div>
    </div>
  );
};
