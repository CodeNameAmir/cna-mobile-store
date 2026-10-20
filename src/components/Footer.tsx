import type { ReactNode } from "react";
import { getPersianYear } from "../utils/format";

const QUICK_LINKS: ReadonlyArray<{ label: string; href: string }> = [
  { label: "خانه", href: "#home" },
  { label: "محصولات", href: "#products" },
  { label: "خدمات", href: "#services" },
  { label: "تماس با ما", href: "#contact" },
];

const SOCIALS: ReadonlyArray<{ label: string; href: string; icon: ReactNode }> = [
  {
    label: "اینستاگرام",
    href: "https://www.instagram.com/",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4.2" />
        <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: "تلگرام",
    href: "https://t.me/",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
        <path
          d="m20.7 3.3-8.9 8.9m8.9-8.9-2.6 17.1-6.3-6.2m8.9-10.9L3.6 9.6l6.2 2.6m0 0 1.1 6 2.9-3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: "ایکس",
    href: "https://x.com/",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M18.9 2H22l-6.77 7.74L23.2 22h-6.23l-4.88-6.38L6.5 22H3.35l7.24-8.28L1.6 2h6.39l4.41 5.83L18.9 2Zm-1.09 18.13h1.72L7.08 3.77H5.23l12.58 16.36Z" />
      </svg>
    ),
  },
];

const contactIconProps = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  "aria-hidden": true,
} as const;

export function Footer() {
  const year = getPersianYear();

  return (
    <footer id="contact" className="relative scroll-mt-20 border-t border-white/[0.06] bg-navy-950">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-navy-900/60 to-transparent"
      />

      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-14 sm:px-6 md:grid-cols-[1.2fr_0.7fr_1.1fr]">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl border border-royal-500/40 bg-navy-800 text-royal-400">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                <rect x="7" y="2.5" width="10" height="19" rx="2.6" />
                <path d="M10.6 5.2h2.8" strokeLinecap="round" />
                <circle cx="12" cy="17.6" r="1" fill="currentColor" stroke="none" />
              </svg>
            </span>
            <span className="flex flex-col">
              <span className="font-display text-2xl leading-none text-mist-100">
                CNA <span className="text-royal-400">Mobile</span>
              </span>
              <span className="mt-1 text-[11px] font-medium text-mist-500">فروشگاه تخصصی موبایل</span>
            </span>
          </div>
          <p className="mt-5 max-w-sm text-[13.5px] leading-7 text-mist-500">
            فروشگاه موبایل CNA عرضه‌کننده جدیدترین گوشی‌های هوشمند با گارانتی اصالت کالا، قیمت رقابتی و پشتیبانی
            حرفه‌ای قبل و بعد از خرید.
          </p>
          <div className="mt-6 flex items-center gap-3">
            {SOCIALS.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noreferrer"
                aria-label={social.label}
                className="grid h-10 w-10 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-mist-400 transition-all duration-300 hover:-translate-y-0.5 hover:border-royal-500/40 hover:text-royal-300"
              >
                {social.icon}
              </a>
            ))}
          </div>
        </div>

        {/* Quick links */}
        <nav aria-label="لینک‌های سریع">
          <h3 className="text-sm font-extrabold text-mist-100">لینک‌های سریع</h3>
          <ul className="mt-5 flex flex-col gap-3">
            {QUICK_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="group inline-flex items-center gap-2 text-[13.5px] text-mist-500 transition-colors duration-200 hover:text-royal-300"
                >
                  <span className="h-1 w-1 rounded-full bg-royal-500/60 transition-transform duration-200 group-hover:scale-150" />
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Contact */}
        <div>
          <h3 className="text-sm font-extrabold text-mist-100">تماس با ما</h3>
          <ul className="mt-5 flex flex-col gap-4 text-[13.5px] leading-7 text-mist-500">
            <li className="flex items-start gap-3">
              <span className="mt-1.5 text-royal-400">
                <svg {...contactIconProps}>
                  <path
                    d="M5 4h4l1.5 4.5-2.2 1.6a13 13 0 0 0 5.6 5.6l1.6-2.2L20 15v4a1.5 1.5 0 0 1-1.6 1.5C10.8 19.9 4.1 13.2 3.5 5.6A1.5 1.5 0 0 1 5 4Z"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span>۰۲۱-۸۸۷۷۶۶۵۵</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1.5 text-royal-400">
                <svg {...contactIconProps}>
                  <path d="M12 21s7-5.8 7-11a7 7 0 1 0-14 0c0 5.2 7 11 7 11Z" strokeLinejoin="round" />
                  <circle cx="12" cy="10" r="2.6" />
                </svg>
              </span>
              <span>تهران، خیابان انقلاب، پاساژ علاءالدین، پلاک ۱۲۳</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1.5 text-royal-400">
                <svg {...contactIconProps}>
                  <circle cx="12" cy="12" r="8.5" />
                  <path d="M12 7.5V12l3 2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span>شنبه تا پنجشنبه، ۹ صبح تا ۹ شب</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="relative border-t border-white/[0.05]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-5 text-center sm:flex-row sm:px-6 sm:text-start">
          <p className="text-xs text-mist-500">© {year} فروشگاه موبایل CNA — تمامی حقوق محفوظ است.</p>
          <p className="text-xs text-mist-500/70">نمونه اولیه (Prototype) — React + Vite + Tailwind CSS</p>
        </div>
      </div>
    </footer>
  );
}
