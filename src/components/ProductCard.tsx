import { useEffect, useRef, useState } from "react";
import { cn } from "../utils/cn";
import { formatToman, toPersianDigits } from "../utils/format";
import type { Product } from "../data/products";

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
}

export function ProductCard({ product, onAdd }: ProductCardProps) {
  const [added, setAdded] = useState(false);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const discount = product.oldPrice
    ? Math.round((1 - product.price / product.oldPrice) * 100)
    : 0;

  const handleAdd = () => {
    onAdd(product);
    setAdded(true);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setAdded(false), 1500);
  };

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-white/[0.07] bg-gradient-to-b from-navy-800/80 to-navy-900/90 transition-all duration-300 hover:-translate-y-1.5 hover:border-royal-500/35 hover:shadow-[0_20px_50px_rgba(4,10,30,0.6),0_0_40px_rgba(77,132,246,0.12)]">
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-navy-950">
        <img
          src={product.image}
          alt={`گوشی ${product.name}`}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-navy-900 to-transparent" />

        {product.badge && (
          <span className="absolute top-3 start-3 rounded-lg bg-royal-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-[0_6px_18px_rgba(53,101,221,0.45)]">
            {product.badge}
          </span>
        )}
        {discount > 0 && (
          <span className="absolute top-3 end-3 rounded-lg border border-royal-400/30 bg-navy-950/80 px-2.5 py-1 text-[11px] font-bold text-royal-300 backdrop-blur">
            {toPersianDigits(discount)}٪ تخفیف
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <span className="text-xs font-medium text-mist-500">{product.brand}</span>
        <h3 className="text-[15.5px] font-extrabold text-mist-100">{product.name}</h3>

        <ul className="flex flex-wrap gap-1.5">
          {product.specs.map((spec) => (
            <li
              key={spec}
              className="rounded-md border border-white/[0.07] bg-white/[0.03] px-2 py-0.5 text-[11px] text-mist-400"
            >
              {spec}
            </li>
          ))}
        </ul>

        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <div className="flex flex-col gap-1">
            {product.oldPrice && (
              <span className="text-xs text-mist-500 line-through decoration-mist-500/50">
                {formatToman(product.oldPrice)}
              </span>
            )}
            <span className="font-display text-[1.6rem] leading-none text-mist-100">
              {formatToman(product.price)}
              <span className="ms-1.5 text-xs font-normal text-mist-400">تومان</span>
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          className={cn(
            "mt-3 inline-flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-bold transition-all duration-300 active:scale-[0.98]",
            added
              ? "border border-royal-400/40 bg-royal-600/20 text-royal-200"
              : "bg-royal-500 text-white shadow-[0_8px_24px_rgba(77,132,246,0.3)] hover:bg-royal-400"
          )}
        >
          {added ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                <path d="m4.5 12.5 5 5 10-11" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              افزوده شد
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
                <path
                  d="M2.5 3.5h2l2.4 12.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.2l1.7-8.2H5.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path d="M12 10v5M9.5 12.5h5" strokeLinecap="round" />
              </svg>
              افزودن به سبد خرید
            </>
          )}
        </button>
      </div>
    </article>
  );
}
