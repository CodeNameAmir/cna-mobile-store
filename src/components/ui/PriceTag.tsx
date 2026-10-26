import React from 'react';
import { formatPersianNumber } from '../../utils/formatters';

interface PriceTagProps {
  price: number;
  originalPrice?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCurrency?: boolean;
  className?: string;
}

export const PriceTag: React.FC<PriceTagProps> = ({
  price,
  originalPrice,
  size = 'md',
  showCurrency = true,
  className = '',
}) => {
  const hasDiscount = originalPrice && originalPrice > price;

  const fontSizes = {
    sm: 'text-sm font-bold',
    md: 'text-base sm:text-lg font-bold',
    lg: 'text-xl sm:text-2xl font-extrabold',
    xl: 'text-2xl sm:text-3xl font-black',
  };

  return (
    <div className={`flex flex-col text-start ${className}`}>
      {hasDiscount && (
        <span className="text-xs text-slate-400 line-through tracking-tight">
          {formatPersianNumber(originalPrice)}
        </span>
      )}
      <div className="flex items-baseline gap-1 text-slate-900">
        <span className={`${fontSizes[size]} text-blue-600 tracking-tight`}>
          {formatPersianNumber(price)}
        </span>
        {showCurrency && (
          <span className="text-[11px] sm:text-xs font-medium text-slate-500">
            تومان
          </span>
        )}
      </div>
    </div>
  );
};
