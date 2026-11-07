import { Product, Category, Review, Article } from '../types';
import canonicalData from '../data/canonicalCatalog.json';

export const CNA_LOGO =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCNpElgPvxQWS5cLzvXKBBkvHUBkq1cpO6nL0AHHxkrMVeb-scS6B0zkLYvoaBj6V81iKkjiNeUhShco1LVp5HgHQh5MPdzFvA1RitQsZS8AlFsDFLCgJ1sTL3llqjJbVRFQAhZCXZV1tDDbsA2F6npJjXU2uHNjzUGBQxQspyWlcONKszCfIsYRA8rVUkN0Pe8N7zGbjlgRyRmg7EzaTSZPiXfBm5hI88dxwAsKnk5Ubl6Wu_cYx8Nqg';

export const CATEGORIES: Category[] = [
  {
    id: 'cat-1',
    slug: 'phones',
    titleFa: 'گوشی موبایل',
    subtitleFa: 'اپل، سامسونگ، شیائومی، گوگل',
    iconName: 'smartphone',
    itemCount: 18,
  },
  {
    id: 'cat-2',
    slug: 'smartwatches',
    titleFa: 'ساعت هوشمند',
    subtitleFa: 'اپل واچ، گلکسی واچ',
    iconName: 'watch',
    itemCount: 1,
  },
  {
    id: 'cat-3',
    slug: 'audio',
    titleFa: 'هدفون و ایرپاد',
    subtitleFa: 'ایرپاد پرو، گلکسی بادز',
    iconName: 'headphones',
    itemCount: 2,
  },
  {
    id: 'cat-4',
    slug: 'chargers',
    titleFa: 'شارژر و پاوربانک',
    subtitleFa: 'فست شارژ GaN، پاوربانک Qi2',
    iconName: 'battery_charging_full',
    itemCount: 3,
  },
  {
    id: 'cat-5',
    slug: 'cases-screen',
    titleFa: 'قاب و محافظ صفحه',
    subtitleFa: 'شیشه 9H نیلکین، کاور مگ‌سیف',
    iconName: 'shield',
    itemCount: 2,
  },
];

const brandFaMap: Record<string, string> = {
  apple: 'Apple',
  samsung: 'Samsung',
  xiaomi: 'Xiaomi',
  google: 'Google',
  anker: 'Anker',
  nillkin: 'Nillkin',
};

const categoryFaMap: Record<string, string> = {
  phones: 'گوشی موبایل',
  smartwatches: 'ساعت هوشمند',
  audio: 'هدفون و ایرپاد',
  chargers: 'شارژر و پاوربانک',
  'cases-screen': 'قاب و لوازم جانبی',
};

export const PRODUCTS: Product[] = canonicalData.products.map((p) => {
  const lowestPriceVariant = [...p.variants].sort((a, b) => a.priceToman - b.priceToman)[0];
  const totalStock = p.variants.reduce((acc, v) => acc + v.initialStock, 0);

  const colors = Array.from(
    new Map(p.variants.map((v) => [v.colorNameFa, { name: v.colorNameFa, hex: v.colorHex }])).values()
  );

  const storageOptions = Array.from(new Set(p.variants.map((v) => v.storage)));
  const ramOptions = Array.from(new Set(p.variants.filter((v) => v.ram).map((v) => v.ram as string)));

  const discountPercent =
    lowestPriceVariant.originalPriceToman && lowestPriceVariant.originalPriceToman > lowestPriceVariant.priceToman
      ? Math.round(
          ((lowestPriceVariant.originalPriceToman - lowestPriceVariant.priceToman) /
            lowestPriceVariant.originalPriceToman) *
            100
        )
      : 0;

  return {
    id: p.id,
    titleFa: p.titleFa,
    titleEn: p.titleEn,
    name: p.titleFa,
    englishTitle: p.titleEn,
    slug: p.slug,
    sku: lowestPriceVariant.sku,
    brand: brandFaMap[p.brandSlug] || p.brandSlug,
    category: p.categorySlug,
    categoryFa: categoryFaMap[p.categorySlug] || 'سایر',
    price: lowestPriceVariant.priceToman,
    originalPrice: lowestPriceVariant.originalPriceToman || lowestPriceVariant.priceToman,
    discountPrice: lowestPriceVariant.originalPriceToman || lowestPriceVariant.priceToman,
    discountPercent,
    inStock: totalStock > 0,
    stockCount: totalStock,
    stock: totalStock,
    shelfLocation: lowestPriceVariant.shelfLocation,
    warrantyFa: canonicalData.warranties[p.warrantyIndex]?.providerName,
    rating: p.ratingAverage,
    reviewsCount: p.reviewsCount,
    imageUrl: p.images[0] || '',
    image: p.images[0] || '',
    galleryImages: p.images,
    badge: p.badge,
    isSpecialOffer: Boolean(p.badge),
    isBestseller: p.isFeatured,
    isNew: false,
    isExpressDelivery: Boolean((p.specs as Record<string, unknown>)?.isExpressDelivery),
    colors,
    storageOptions,
    ramOptions,
    selectedColor: lowestPriceVariant.colorNameFa,
    selectedStorage: lowestPriceVariant.storage,
    specs: p.specs as any,
    descriptionFa: p.descriptionFa,
  };
});

export const REVIEWS: Review[] = [
  {
    id: 'rev-1',
    authorName: 'مهدی رضایی',
    authorInitials: 'م‌ر',
    isVerifiedBuyer: true,
    productNameFa: 'خریدار گلکسی اس ۲۴ اولترا',
    rating: 5,
    dateFa: '۲ روز پیش',
    commentFa: 'گوشی S24 Ultra رو ازتون خریدم. بسته‌بندی عالی بود، جعبه کاملاً پلمپ رسمی و کد همتا درجا فعال شد. ارسال به اصفهان کمتر از ۲۴ ساعت طول کشید.',
    cityFa: 'اصفهان',
  },
  {
    id: 'rev-2',
    authorName: 'سارا طباطبایی',
    authorInitials: 'س‌ط',
    isVerifiedBuyer: true,
    productNameFa: 'خریدار ایرپاد پرو ۲',
    rating: 5,
    dateFa: 'هفته گذشته',
    commentFa: 'ایرپاد پرو ۲ رو با تخفیف شگفت‌انگیز خریدم. شماره سریال رو توی سایت اپل چک کردم کاملاً اصلی بود. پشتیبانی تلفنی هم خیلی باحوصله راهنمایی کردن.',
    cityFa: 'تهران',
  },
  {
    id: 'rev-3',
    authorName: 'پویا کیانی',
    authorInitials: 'پ‌ک',
    isVerifiedBuyer: true,
    productNameFa: 'خریدار شارژر انکر',
    rating: 4.8,
    dateFa: '۱۰ روز پیش',
    commentFa: 'پاوربانک GaN انکر واقعا غولیه واسه شارژ لپ‌تاپ و گوشی. گارانتی CNA خیال آدم رو از لوازم جانبی گرون‌قیمت راحت می‌کنه. تشکر از تیم حرفه‌ایتون.',
    cityFa: 'شیراز',
  },
];

export const ARTICLES: Article[] = [
  {
    id: 'art-1',
    titleFa: 'مقایسه دوربین پرچمداران: آیفون ۱۶ پرو مکس در برابر اس ۲۴ اولترا',
    excerptFa: 'کدام گوشی در شب عکس‌های طبیعی‌تری ثبت می‌کند؟ بررسی دقیق سنسورهای پریسکوپی و قدرت پردازش هوش مصنوعی.',
    categoryFa: 'مقایسه تخصصی',
    readTimeFa: '۷ دقیقه',
    dateFa: '۲ روز پیش',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuADKiGwBnPPF-daKIQSMLp50kjN-18Akp7si8_8Z_CoGxGBIM4jJPQEhT00QzQmOLUp4nhyGpxvx-o-jrA47Te84YbNG2X-W94Yg5kbZk7UHEci4SDoJusKMHKDhEoNfAurCzjNNisNbrdtmSfXj1hGe6GccMX5OZAMwEdsW5lcl_zxXf69GoQHvirVoihYVqJVnxiFzLn7XwIIGUDjCLuPc4Vt2n1Lrn7Tr3nwkXoIlQcs9V9acvtx-g',
    slug: 'iphone-16-pro-max-vs-s24-ultra-camera',
  },
  {
    id: 'art-2',
    titleFa: 'راهنمای جامع خرید آداپتور و کابل فست شارژ؛ گول کپی‌های بازار را نخورید!',
    excerptFa: 'معرفی استانداردهای PD و PPS و نحوه تشخیص شارژرهای تقلبی که سلامت باتری گوشی گران‌قیمت شما را به خطر می‌اندازند.',
    categoryFa: 'راهنمای خرید',
    readTimeFa: '۵ دقیقه',
    dateFa: '۴ روز پیش',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDR6ok1IcU2ffjuiqp53j7JMsVYdzTf4dNNEiWdqbvhjMLvWI7aBSxTFFWuVFE0ky5-5hNRtnUQLKVgd5LDvUAeA1PMNQYb_JzoMo3oNDvoz_qN4f97kyiwpYPT1CTqBlZBlku6ad8wpSIhqEKbwfb2XrHCSsV2vwGWkJwH3dpbmRFwjYJWY3E4ZE8mdLOTlDmRsqwUiobatmN8cVe_hjKWGEP8j_iuLeyeGR841jHlFI9LLjGPVvWOaA',
    slug: 'fast-charger-buying-guide',
  },
  {
    id: 'art-3',
    titleFa: 'بهترین ساعت‌های هوشمند برای پایش سلامت و ورزش در سال ۱۴۰۳',
    excerptFa: 'تحلیل دقت سنسورهای ضربان قلب، نوار قلب ECG و باتری در ساعت‌های هوشمند اپل، سامسونگ و شیائومی.',
    categoryFa: 'ترفندها',
    readTimeFa: '۹ دقیقه',
    dateFa: '۱ هفته پیش',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDHk-9qBYf7QFHHMIlc_cwC4t6IV7UVi-HbuUIdTIryeP6xa0OyEqmyiI7MS_cJUvwaEsupSLf2ZTar6WaZTVf78EYAfok-f_jU0b6sc1VQK4g0388YwUFUxiR02Ji8OJycWLnTUSW-k3MJ7XsGXYZEDDA5BD2U39Go5hr6MUU9WIVVSAecfRnr6PVwKX1lmA12rpsR5FWGUZx9eQQzqotfpqBxWwrXwSVAObZqTPLnPgjkgo1tjisvRw',
    slug: 'best-smartwatches-health-tracking',
  },
];
