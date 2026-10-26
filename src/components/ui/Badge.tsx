import React from 'react';

export type BadgeVariant = 'discount' | 'stock' | 'outOfStock' | 'warranty' | 'featured' | 'info' | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  children,
  className = '',
  size = 'sm',
}) => {
  const variantStyles: Record<BadgeVariant, string> = {
    discount: 'bg-orange-600 text-white font-bold shadow-xs',
    stock: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-medium',
    outOfStock: 'bg-slate-200 text-slate-700 font-semibold',
    warranty: 'bg-blue-50 text-blue-700 border border-blue-100 font-medium',
    featured: 'bg-blue-600 text-white font-bold shadow-xs',
    info: 'bg-indigo-50 text-indigo-700 border border-indigo-100 font-medium',
    neutral: 'bg-slate-100 text-slate-700 font-medium',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 rounded-md',
    md: 'text-xs px-2.5 py-1 rounded-lg',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 select-none leading-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
};
