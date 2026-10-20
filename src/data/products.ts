import galaxyImage from "../assets/galaxy-s25.jpg";
import iphoneImage from "../assets/iphone-16.jpg";
import xiaomiImage from "../assets/xiaomi-14t.jpg";

export interface Product {
  id: string;
  brand: string;
  name: string;
  specs: string[];
  /** Price in Toman */
  price: number;
  /** Previous price in Toman, shown with a strikethrough when present */
  oldPrice?: number;
  badge?: string;
  image: string;
}

export const products: Product[] = [
  {
    id: "galaxy-s25-ultra",
    brand: "سامسونگ",
    name: "گلکسی S25 اولترا",
    specs: ["حافظه ۲۵۶ گیگابایت", "رم ۱۲ گیگابایت", "دوربین ۲۰۰ مگاپیکسل"],
    price: 98_500_000,
    oldPrice: 104_200_000,
    badge: "پرفروش‌ترین",
    image: galaxyImage,
  },
  {
    id: "iphone-16-pro-max",
    brand: "اپل",
    name: "آیفون 16 پرو مکس",
    specs: ["حافظه ۲۵۶ گیگابایت", "تراشه A18 Pro", "نمایشگر ۶٫۹ اینچ"],
    price: 92_800_000,
    oldPrice: 97_500_000,
    badge: "جدید",
    image: iphoneImage,
  },
  {
    id: "xiaomi-14t-pro",
    brand: "شیائومی",
    name: "شیائومی 14T پرو",
    specs: ["حافظه ۵۱۲ گیگابایت", "رم ۱۲ گیگابایت", "شارژ سریع ۱۲۰ وات"],
    price: 32_400_000,
    oldPrice: 35_900_000,
    badge: "پیشنهاد ویژه",
    image: xiaomiImage,
  },
];
