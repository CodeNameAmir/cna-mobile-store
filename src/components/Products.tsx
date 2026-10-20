import { products, type Product } from "../data/products";
import { ProductCard } from "./ProductCard";
import { Reveal } from "./Reveal";

interface ProductsProps {
  onAdd: (product: Product) => void;
}

export function Products({ onAdd }: ProductsProps) {
  return (
    <section id="products" className="scroll-mt-20 py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-2.5 text-sm font-bold text-royal-400">
                <span className="h-px w-8 bg-royal-500/60" aria-hidden="true" />
                پیشنهادهای این هفته
              </span>
              <h2 className="mt-3 font-display text-4xl text-mist-100 sm:text-[2.75rem] sm:leading-tight">
                جدیدترین گوشی‌های هوشمند
              </h2>
              <p className="mt-3 text-sm leading-7 text-mist-500">
                مجموعه‌ای از محبوب‌ترین گوشی‌های روز دنیا با گارانتی اصالت کالا و قیمت به‌روز بازار.
              </p>
            </div>
            <a
              href="#products"
              className="group inline-flex items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.03] px-5 py-3 text-sm font-bold text-mist-300 transition-all duration-300 hover:border-royal-500/40 hover:text-royal-300"
            >
              مشاهده همه محصولات
              <svg
                className="transition-transform duration-300 group-hover:-translate-x-1"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                aria-hidden="true"
              >
                <path d="M19 12H5m6-7-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>
        </Reveal>

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product, index) => (
            <Reveal key={product.id} delay={index * 120} className="h-full">
              <ProductCard product={product} onAdd={onAdd} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
