import type { ReactNode } from "react";

interface Feature {
  title: string;
  description: string;
  icon: ReactNode;
}

const iconProps = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  "aria-hidden": true,
} as const;

const FEATURES: Feature[] = [
  {
    title: "ارسال سریع و رایگان",
    description: "تحویل در کمتر از ۲۴ ساعت در تهران",
    icon: (
      <svg {...iconProps}>
        <path d="M2.5 5.5H14v10H2.5zM14 9.5h4l3 3.5v2.5h-7" strokeLinejoin="round" />
        <circle cx="6.5" cy="17.8" r="1.9" />
        <circle cx="17.5" cy="17.8" r="1.9" />
      </svg>
    ),
  },
  {
    title: "گارانتی اصالت کالا",
    description: "تضمین اصل بودن تمامی گوشی‌ها",
    icon: (
      <svg {...iconProps}>
        <path d="M12 2.8 4.5 5.6v6c0 4.6 3.2 7.7 7.5 9.6 4.3-1.9 7.5-5 7.5-9.6v-6L12 2.8Z" strokeLinejoin="round" />
        <path d="m8.8 11.8 2.3 2.3 4.2-4.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "۷ روز مهلت بازگشت",
    description: "بازگشت بدون قید و شرط کالا",
    icon: (
      <svg {...iconProps}>
        <path d="M3.8 8.7A9 9 0 0 1 20.2 10.4M20.2 15.3A9 9 0 0 1 3.8 13.6" strokeLinecap="round" />
        <path d="M3.5 3.7v5h5M20.5 20.3v-5h-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "پشتیبانی ۷ روز هفته",
    description: "پاسخ‌گویی از ۹ صبح تا ۹ شب",
    icon: (
      <svg {...iconProps}>
        <path d="M4.5 13.5v-2a7.5 7.5 0 0 1 15 0v2" strokeLinecap="round" />
        <rect x="3" y="13" width="4" height="6" rx="1.6" />
        <rect x="17" y="13" width="4" height="6" rx="1.6" />
        <path d="M19.5 19v.5a2.5 2.5 0 0 1-2.5 2.5h-3" strokeLinecap="round" />
      </svg>
    ),
  },
];

/**
 * A compact strip of store guarantees shown between the hero and the
 * product grid (anchored as the «خدمات» section).
 */
export function FeatureStrip() {
  return (
    <section id="services" className="scroll-mt-20 border-y border-white/[0.05] bg-navy-900/50">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-2 px-4 py-6 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="group flex items-start gap-4 rounded-xl p-5 transition-colors duration-300 hover:bg-white/[0.03]"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-royal-500/25 bg-navy-800 text-royal-400 transition-all duration-300 group-hover:border-royal-400/50 group-hover:text-royal-300 group-hover:shadow-[0_0_24px_rgba(77,132,246,0.25)]">
              {feature.icon}
            </span>
            <span className="flex flex-col gap-1">
              <span className="text-[15px] font-bold text-mist-100">{feature.title}</span>
              <span className="text-[12.5px] leading-6 text-mist-500">{feature.description}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
