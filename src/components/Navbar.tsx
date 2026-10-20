import { useEffect, useState } from "react";
import { cn } from "../utils/cn";
import { toPersianDigits } from "../utils/format";

const NAV_LINKS: ReadonlyArray<{ label: string; href: string }> = [
  { label: "خانه", href: "#home" },
  { label: "محصولات", href: "#products" },
  { label: "خدمات", href: "#services" },
  { label: "تماس با ما", href: "#contact" },
];

interface NavbarProps {
  cartCount: number;
}

export function Navbar({ cartCount }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled || menuOpen
          ? "border-b border-white/[0.06] bg-navy-950/85 shadow-[0_10px_40px_rgba(2,6,20,0.5)] backdrop-blur-xl"
          : "border-b border-transparent"
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 md:h-[4.5rem]">
        {/* Logo */}
        <a href="#home" className="group flex items-center gap-3" aria-label="صفحه اصلی فروشگاه موبایل CNA">
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-royal-500/40 bg-navy-800 text-royal-400 shadow-[0_0_18px_rgba(77,132,246,0.22)] transition-shadow duration-300 group-hover:shadow-[0_0_30px_rgba(77,132,246,0.45)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <rect x="7" y="2.5" width="10" height="19" rx="2.6" />
              <path d="M10.6 5.2h2.8" strokeLinecap="round" />
              <circle cx="12" cy="17.6" r="1" fill="currentColor" stroke="none" />
            </svg>
          </span>
          <span className="flex flex-col">
            <span className="font-display text-[1.45rem] leading-none text-mist-100">
              CNA <span className="text-royal-400">Mobile</span>
            </span>
            <span className="mt-1 text-[10.5px] font-medium text-mist-500">فروشگاه تخصصی موبایل</span>
          </span>
        </a>

        {/* Desktop navigation */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="منوی اصلی">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="group relative rounded-lg px-4 py-2 text-sm font-medium text-mist-300 transition-colors duration-200 hover:text-mist-100"
            >
              {link.label}
              <span className="absolute inset-x-4 -bottom-0.5 h-px origin-center scale-x-0 bg-royal-400 transition-transform duration-300 group-hover:scale-x-100" />
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          {/* Shopping cart */}
          <button
            type="button"
            aria-label={`سبد خرید، ${toPersianDigits(cartCount)} کالا`}
            className="relative grid h-10 w-10 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-mist-300 transition-all duration-200 hover:border-royal-500/40 hover:text-royal-300"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <path
                d="M2.5 3.5h2l2.4 12.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.2l1.7-8.2H5.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="9.5" cy="20.5" r="1.4" />
              <circle cx="17" cy="20.5" r="1.4" />
            </svg>
            {cartCount > 0 && (
              <span
                key={cartCount}
                className="badge-pop absolute -top-1.5 -end-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-royal-500 px-1 text-[11px] font-bold text-white shadow-[0_0_12px_rgba(77,132,246,0.6)]"
              >
                {toPersianDigits(cartCount)}
              </span>
            )}
          </button>

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "بستن منو" : "باز کردن منو"}
            aria-expanded={menuOpen}
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-mist-300 transition-colors duration-200 hover:text-mist-100 md:hidden"
          >
            <span className="relative block h-3.5 w-5">
              <span
                className={cn(
                  "absolute inset-x-0 top-0 h-0.5 rounded bg-current transition-all duration-300",
                  menuOpen && "top-1.5 rotate-45"
                )}
              />
              <span
                className={cn(
                  "absolute inset-x-0 top-1.5 h-0.5 rounded bg-current transition-all duration-300",
                  menuOpen && "opacity-0"
                )}
              />
              <span
                className={cn(
                  "absolute inset-x-0 top-3 h-0.5 rounded bg-current transition-all duration-300",
                  menuOpen && "top-1.5 -rotate-45"
                )}
              />
            </span>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 md:hidden",
          menuOpen ? "max-h-72" : "max-h-0"
        )}
      >
        <nav className="flex flex-col gap-1 border-t border-white/[0.06] px-4 py-3" aria-label="منوی موبایل">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-mist-300 transition-colors duration-200 hover:bg-white/[0.04] hover:text-mist-100"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
