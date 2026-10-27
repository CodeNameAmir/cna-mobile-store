import React from 'react';

export const ProductCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 flex flex-col h-[400px] animate-pulse">
      {/* Image container skeleton */}
      <div className="w-full h-48 bg-slate-100 rounded-xl mb-4" />
      {/* Brand & badges skeleton */}
      <div className="flex items-center gap-2 mb-2">
        <div className="h-3 w-16 bg-slate-100 rounded-md" />
        <div className="h-3 w-12 bg-slate-100 rounded-md" />
      </div>
      {/* Title skeleton */}
      <div className="h-4 w-5/6 bg-slate-200 rounded-md mb-2" />
      <div className="h-4 w-3/5 bg-slate-100 rounded-md mb-auto" />
      {/* Specs skeleton */}
      <div className="flex gap-2 my-3">
        <div className="h-5 w-14 bg-slate-100 rounded-md" />
        <div className="h-5 w-14 bg-slate-100 rounded-md" />
      </div>
      {/* Price & CTA skeleton */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
        <div className="h-5 w-24 bg-slate-200 rounded-md" />
        <div className="h-8 w-8 bg-slate-100 rounded-lg" />
      </div>
    </div>
  );
};

export const CatalogSkeletonGrid: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
};
