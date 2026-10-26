import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ChevronLeft } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  announcement?: string;
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  announcement,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 py-3 text-xs text-slate-500 ${className}`}
    >
      <nav aria-label="مسیر راهنما" className="flex items-center gap-1.5 flex-wrap">
        <Link
          to="/"
          className="hover:text-blue-600 transition-colors flex items-center gap-1 font-medium"
        >
          <Home className="w-3.5 h-3.5" />
          <span>خانه</span>
        </Link>

        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <React.Fragment key={index}>
              <ChevronLeft className="w-3 h-3 text-slate-400 shrink-0" />
              {isLast || !item.to ? (
                <span className="font-semibold text-slate-900 truncate max-w-xs sm:max-w-md">
                  {item.label}
                </span>
              ) : (
                <Link to={item.to} className="hover:text-blue-600 transition-colors font-medium">
                  {item.label}
                </Link>
              )}
            </React.Fragment>
          );
        })}
      </nav>

      {announcement && (
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-medium border border-blue-100">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
          <span>{announcement}</span>
        </div>
      )}
    </div>
  );
};
