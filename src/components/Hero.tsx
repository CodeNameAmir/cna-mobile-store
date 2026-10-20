import heroPhone from "../assets/hero-phone.jpg";
import { Reveal } from "./Reveal";

const HERO_STATS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "+۱۲۰", label: "مدل گوشی موجود" },
  { value: "۲۴ ماه", label: "گارانتی شرکتی معتبر" },
  { value: "٪۹۸", label: "رضایت مشتریان" },
];

export function Hero() {
  return (
    <section id="home" className="relative overflow-hidden pt-32 pb-16 md:pt-40 md:pb-24">
      {/* Section-local ambient glows */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 right-[-12%] h-[460px] w-[460px] rounded-full bg-royal-500/[0.13] blur-[130px]" />
        <div className="absolute top-1/2 left-[-14%] h-[400px] w-[400px] rounded-full bg-navy-600/30 blur-[120px]" />
      </div>

      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Copy */}
        <div>
          <Reveal>
            <span className="inline-flex items-center gap-2.5 rounded-full border border-royal-500/30 bg-royal-500/[0.08] px-4 py-1.5 text-xs font-medium text-royal-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-royal-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-royal-400" />
              </span>
              نمایندگی رسمی برندهای معتبر جهان
            </span>
          </Reveal>

          <Reveal delay={120}>
            <h1 className="mt-6 font-display text-[2.7rem] leading-[1.2] text-mist-100 sm:text-6xl sm:leading-[1.15]">
              تجربه‌ای{" "}
              <span className="relative inline-block text-royal-400">
                متفاوت
                <svg
                  className="absolute -bottom-1.5 right-0 w-full text-royal-500"
                  viewBox="0 0 120 12"
                  fill="none"
                  aria-hidden="true"
                >
                  <path d="M3 9c25-6 62-7 114-3" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.5" />
                </svg>
              </span>{" "}
              در خرید موبایل
            </h1>
          </Reveal>

          <Reveal delay={240}>
            <p className="mt-6 max-w-xl text-[15px] leading-8 text-mist-400 sm:text-lg sm:leading-9">
              در فروشگاه <span className="font-bold text-mist-300">CNA</span> جدیدترین گوشی‌های هوشمند روز دنیا را با
              گارانتی اصالت، بهترین قیمت بازار و ارسال سریع تجربه کنید؛ انتخابی مطمئن برای کسانی که کیفیت برایشان
              مهم است.
            </p>
          </Reveal>

          <Reveal delay={360}>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <a
                href="#products"
                className="group inline-flex h-12 items-center gap-2.5 rounded-xl bg-royal-500 px-7 text-sm font-bold text-white shadow-[0_10px_30px_rgba(53,101,221,0.35)] transition-all duration-300 hover:bg-royal-400 hover:shadow-[0_14px_40px_rgba(77,132,246,0.5)] active:scale-[0.98]"
              >
                مشاهده محصولات
                <svg
                  className="transition-transform duration-300 group-hover:-translate-x-1"
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  aria-hidden="true"
                >
                  <path d="M19 12H5m6-7-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
              <a
                href="#services"
                className="inline-flex h-12 items-center rounded-xl border border-white/[0.1] bg-white/[0.03] px-7 text-sm font-bold text-mist-300 transition-all duration-300 hover:border-royal-500/40 hover:bg-royal-500/[0.07] hover:text-mist-100"
              >
                مشاوره رایگان خرید
              </a>
            </div>
          </Reveal>

          <Reveal delay={480}>
            <dl className="mt-11 flex flex-wrap items-center gap-x-10 gap-y-5 border-t border-white/[0.07] pt-7">
              {HERO_STATS.map((stat) => (
                <div key={stat.label} className="flex flex-col gap-1.5">
                  <dt className="order-2 text-xs text-mist-500">{stat.label}</dt>
                  <dd className="order-1 font-display text-[1.7rem] leading-none text-royal-300">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>

        {/* Visual */}
        <Reveal delay={200} className="relative mx-auto w-full max-w-[380px] lg:max-w-[440px]">
          <div className="relative">
            <div aria-hidden="true" className="absolute inset-x-8 inset-y-10 rounded-full bg-royal-500/20 blur-[90px]" />
            <div
              aria-hidden="true"
              className="animate-spin-slower absolute left-1/2 top-1/2 aspect-square w-[118%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-royal-400/20"
            />
            <div
              aria-hidden="true"
              className="animate-spin-slower-reverse absolute left-1/2 top-1/2 aspect-square w-[92%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-royal-400/10"
            />

            <img
              src={heroPhone}
              alt="گوشی هوشمند پرچم‌دار در فروشگاه موبایل CNA"
              className="animate-float relative z-10 w-full rounded-[1.75rem] border border-white/[0.08] object-cover shadow-[0_40px_80px_rgba(2,6,20,0.65)]"
            />

            {/* Floating trust chips */}
            <div className="animate-float-chip absolute -right-2 top-10 z-20 sm:-right-6">
              <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-navy-900/90 px-4 py-3 shadow-[0_16px_40px_rgba(2,6,20,0.5)] backdrop-blur">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-royal-500/[0.15] text-royal-300">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M12 2.8 4.5 5.6v6c0 4.6 3.2 7.7 7.5 9.6 4.3-1.9 7.5-5 7.5-9.6v-6L12 2.8Z" strokeLinejoin="round" />
                    <path d="m8.8 11.8 2.3 2.3 4.2-4.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="flex flex-col">
                  <span className="text-[12.5px] font-bold text-mist-100">اصالت کالا</span>
                  <span className="text-[10.5px] text-mist-500">تضمین‌شده با گارانتی رسمی</span>
                </span>
              </div>
            </div>

            <div className="animate-float-chip-late absolute -left-2 bottom-12 z-20 sm:-left-6">
              <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-navy-900/90 px-4 py-3 shadow-[0_16px_40px_rgba(2,6,20,0.5)] backdrop-blur">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-royal-500/[0.15] text-royal-300">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M2.5 5.5H14v10H2.5zM14 9.5h4l3 3.5v2.5h-7" strokeLinejoin="round" />
                    <circle cx="6.5" cy="17.8" r="1.9" />
                    <circle cx="17.5" cy="17.8" r="1.9" />
                  </svg>
                </span>
                <span className="flex flex-col">
                  <span className="text-[12.5px] font-bold text-mist-100">ارسال رایگان</span>
                  <span className="text-[10.5px] text-mist-500">به سراسر کشور</span>
                </span>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
