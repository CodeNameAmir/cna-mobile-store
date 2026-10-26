import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Product,
  Order,
  OrderStatus,
  AdminUser,
  UserStatus,
  UserRole,
  SystemLog,
  FinancialInvoice,
  InvoiceStatus,
  DiscountCoupon,
  StoreSettings
} from '../types/admin';

// Initial Mock Data extracted directly from code1.html, code2.html, code3.html, code4.html
const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'گوشی اپل مدل iPhone 16 Pro Max',
    englishTitle: 'iPhone 16 Pro Max 256GB - Desert Titanium',
    slug: 'iphone-16-pro-max-256gb',
    sku: 'CNA-APL-16PM',
    barcode: '۰۱۹۵۹۴۹۲۱۸',
    brand: 'اپل (Apple)',
    category: 'گوشی‌های اپل (iPhone)',
    price: 94500000,
    discountPrice: 97200000,
    discountPercent: 3,
    stock: 18,
    shelfLocation: 'قفسه: B-14 | لاین موبایل',
    warranty: 'CNA Care طلایی (۱۸ ماه)',
    partNumber: 'ZAA (دو سیم)',
    isPublished: true,
    badge: 'پرچمدار',
    specs: {
      color: 'تیتانیوم صحرایی',
      storage: '۲۵۶ گیگابایت',
      ram: '۸ گیگابایت'
    },
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDEhqOL3yhWHLA5GOfq-QD2P28EOK9Joo6p2sk0YAf9Q_CGggWL_eUWvfICHrIMAZioJqDBpRcaa-K5aploQyIMBBMMh1M1GShLh6nEfYyRMpppl_gZwEUoLttFPgFbSnMrCYAI3JEU2jHeko0AUL1mD9h9P3_dcJFkyqZ1xSqsQlQjhFj-vit-ZhPpzvWOVHPHYG3CrQgegn8l54tfGUp8GbPqmCCAIldK34Pru00F'
  },
  {
    id: 'prod-2',
    name: 'گوشی سامسونگ مدل Galaxy S24 Ultra',
    englishTitle: 'Galaxy S24 Ultra 5G 512GB - Titanium Gray',
    slug: 'galaxy-s24-ultra-512gb',
    sku: 'CNA-SAM-S24U',
    barcode: '۸۸۰۶۰۹۵۱۱۸',
    brand: 'سامسونگ (Samsung)',
    category: 'گوشی‌های سامسونگ (Galaxy)',
    price: 71200000,
    discountPrice: 74900000,
    discountPercent: 5,
    stock: 32,
    shelfLocation: 'قفسه: B-08 | لاین سامسونگ',
    warranty: 'سامتل / داریا همراه (۱۸ ماه)',
    partNumber: 'SM-S928B (ویتنام اصلی)',
    isPublished: true,
    badge: 'هوش مصنوعی',
    specs: {
      color: 'خاکستری تیتانیوم',
      storage: '۵۱۲ گیگابایت / ۱۲ رم',
      ram: '۱۲ گیگابایت'
    },
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA-cDO_jHgKKJaDaH_sVgOxU_F08OpLREslIN5ggaXhB-1Z-KEw1Hz8wf7pLQJDz2l25F-RgZWM9DYtDP7Bh3vXMvy_Xa7adx9ojWjPYaEg9Rx4A4ZPPZ92KY9tIeKr-BrQX1H0ueLS11XywSvaeR1AoHNl_UcCV3zbPyYI3QGqzYRSXv-M17Zk9JfSsrA-9ufUUbZg8edWHnnkJLNyrT6TYGAq-EsnMgNmGAFqnjf6'
  },
  {
    id: 'prod-3',
    name: 'گوشی شیائومی مدل Xiaomi 14 Ultra',
    englishTitle: 'Xiaomi 14 Ultra 512GB - Leica Quad Cam Black',
    slug: 'xiaomi-14-ultra-512gb',
    sku: 'CNA-MI-14U',
    barcode: '۶۹۴۱۸۱۲۹۴۰',
    brand: 'شیائومی (Xiaomi)',
    category: 'شیائومی و پوکو (Xiaomi)',
    price: 64800000,
    discountPrice: 0,
    discountPercent: 0,
    stock: 2,
    shelfLocation: 'قفسه: C-02 | گاوصندوق انبار',
    warranty: 'تسک میران (۱۸ ماهه)',
    partNumber: 'پک گلوبال اصلی اتحادیه اروپا',
    isPublished: true,
    badge: 'موجودی رو به اتمام',
    specs: {
      color: 'چرم مشکی',
      storage: '۵۱۲ گیگابایت',
      ram: '۱۶ گیگابایت'
    },
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBj7moj_LQwEmuqTTDJvTZM5rwH99XXAwlrL4cd0E7e55hF44Gjifh-aAS_0rNZetIs1CThU9nLgF2yDMYINd7We4c0ZtkFTIeBP8pNh2o-RpzL0w36idqsUAJ6QGeyzgo1IxgM1csPgSH2WDyg5wYCjZgEyOo-IKDAT9eDZ53r5v0VLeL8XLqx8E8QWaI0Smz8oqe7AkPInh81mQdcL19eknKl8HKcWnvKqNuJdibR'
  },
  {
    id: 'prod-4',
    name: 'هدفون بی‌سیم اپل مدل AirPods Pro 2',
    englishTitle: 'AirPods Pro (2nd Gen) MagSafe Case (USB-C)',
    slug: 'airpods-pro-2-type-c',
    sku: 'CNA-ACC-APP2',
    barcode: '۰۱۹۴۲۵۳۳۹۷',
    brand: 'اپل (Apple)',
    category: 'ساعت و هندزفری هوشمند',
    price: 14350000,
    discountPrice: 15100000,
    discountPercent: 4,
    stock: 43,
    shelfLocation: 'قفسه: ACC-05 | انبار اکسسوری',
    warranty: 'گارانتی اصالت CNA Care',
    partNumber: 'MTJV3ZM/A',
    isPublished: true,
    badge: 'پرفروش',
    specs: {
      color: 'سفید کلاسیک',
      port: 'Type-C'
    },
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBZS4vlwz4VIsqxjMGUSTUbWpZ6ZDi_arICF9zyOZuTifsYj2XiAoqyj7f8Jf6W3o48lsQ_KcwzdWtcthjrEhff6D6onUI5Yetjv8t7WRvPSCqT24zDDFsZINHG9Lb7zpwZbsLp_LkVFdaUWMc8yTNkSwWOSahF9n9m1wsj-1yk5XW0kj410I8v5AVZNZj2W2TYh4RZyqHLPWK5SfWk-0hhj1wvp3Kc8wnFo292WyJZ'
  },
  {
    id: 'prod-5',
    name: 'گوشی سامسونگ مدل Galaxy A55',
    englishTitle: 'Galaxy A55 5G 256GB/8GB - Awesome Iceblue',
    slug: 'galaxy-a55-5g-256gb',
    sku: 'CNA-SAM-A55',
    barcode: '۸۸۰۶۰۹۱۸۴۱',
    brand: 'سامسونگ (Samsung)',
    category: 'گوشی‌های سامسونگ (Galaxy)',
    price: 22800000,
    discountPrice: 0,
    discountPercent: 0,
    stock: 0,
    shelfLocation: 'قفسه پیشین: B-02',
    warranty: 'هماهنگ / مدیاپردازش (۱۸ ماه)',
    partNumber: 'رام ویتنام (SM-A556E/DS)',
    isPublished: false,
    badge: 'ناموجود در انبار',
    specs: {
      color: 'آبی یخی',
      storage: '۲۵۶ گیگابایت',
      ram: '۸ گیگابایت'
    },
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCQcXoFj52HVGQ8E7moK0Xye2BpPnYSWqRNUqsfxr2W6-jOcmnn2vk9O4-oaK9HwpqpoFFHk6bVY1dlVbDXuEOnRoT4NQSpChTVu4W95mOBQbwaMeRoYQ6BmMsSel5KnK59t68gcVv0DToH_cG--Tb-dqpLuT0ZQEQdvPahenc4p0off4appSEBcFnFljT2dLsjtjipvwAdhI0zP4GZIle_YX9iyhvyHnFoPyW7k7zP'
  },
  {
    id: 'prod-6',
    name: 'پاوربانک Anker 737 Power Bank (PowerCore 24K)',
    englishTitle: 'Anker 737 Power Bank 140W 24,000mAh',
    slug: 'anker-737-powerbank',
    sku: 'CNA-ANK-737',
    barcode: '۰۱۹۴۶۴۴۰۸۲',
    brand: 'انکر (Anker)',
    category: 'آداپتور، کابل و گارد اورجینال',
    price: 7450000,
    discountPrice: 0,
    discountPercent: 0,
    stock: 1,
    shelfLocation: 'قفسه: ACC-02 | لاین اکسسوری',
    warranty: 'ایران انکر طلایی (۱۸ ماه)',
    partNumber: 'A1289',
    isPublished: true,
    badge: 'بحرانی',
    specs: {
      capacity: '۲۴,۰۰۰ میلی‌آمپر ۱۴۰ وات',
      color: 'خاکستری تیره'
    },
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBUdpicB0PHEhgFyJU642y8Cc3igDvXFiX6e8kdC0Hil1fgHmqLVLk-VI1240PebrexQs-nnEHDXxU1QoiExko6lm9HEZSFR63lILnDMXyObI8njAptjw1MuAPPS9VwyJgjjQvExH4rDD8E-NT2fshgL2kzpvq8m7bJXnZ2PxIfcvn8bCfw7JdAI0jK2ql5NbVkVic4_Qlr-6rFpLzpbkY8Df487JMUFg2XdYeT7uSg'
  },
  {
    id: 'prod-7',
    name: 'شارژر دیواری انکر ۴۵ وات Nano II',
    englishTitle: 'Anker Nano II 45W Fast Charger (Foldable)',
    slug: 'anker-nano-ii-45w',
    sku: 'CNA-ANK-45W',
    barcode: '۰۱۹۴۶۴۴۱۱۹',
    brand: 'انکر (Anker)',
    category: 'آداپتور، کابل و گارد اورجینال',
    price: 900000,
    discountPrice: 1100000,
    discountPercent: 18,
    stock: 25,
    shelfLocation: 'قفسه: ACC-01 | لاین شارژر',
    warranty: 'فارس / انکر ایران (۱۲ ماه)',
    partNumber: 'A2664',
    isPublished: true,
    specs: {
      color: 'مشکی کربنی',
      port: 'Type-C PPS'
    },
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB0jFQIG5UrATv1MrYxoAgyZJ8bdrEUE9-QkobVlu4VxTNEk0cbBW4ok0aExcQNVJqq-E2GyMGC9FJ8u0HLmFeg5zGP3NSBAEYqsSjFKVLKYS3FKXIe0mJgZ5reSqlqRiUVwsYWvHcPHLSMAQnGhzg3kRKzH91-bEoia_AtOq1UiR8V7WbTAJWLrJy7Tzwm-13ODr30kCjkkvz5vEetZR1MmiARUNy1JvlTUlZn47ZQ'
  },
  {
    id: 'prod-8',
    name: 'کابل شارژ تایپ سی به لایتنینگ انکر',
    englishTitle: 'Anker PowerLine III USB-C to Lightning 1.8m',
    slug: 'anker-usbc-lightning-1-8m',
    sku: 'CNA-ANK-CAB',
    barcode: '۰۱۹۴۶۴۴۸۳۲',
    brand: 'انکر (Anker)',
    category: 'آداپتور، کابل و گارد اورجینال',
    price: 725000,
    discountPrice: 0,
    discountPercent: 0,
    stock: 60,
    shelfLocation: 'قفسه: ACC-09 | لاین کابل',
    warranty: 'گارانتی اصالت CNA',
    partNumber: 'A8833',
    isPublished: true,
    specs: {
      length: '۱.۸ متر',
      color: 'سفید'
    },
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBUdpicB0PHEhgFyJU642y8Cc3igDvXFiX6e8kdC0Hil1fgHmqLVLk-VI1240PebrexQs-nnEHDXxU1QoiExko6lm9HEZSFR63lILnDMXyObI8njAptjw1MuAPPS9VwyJgjjQvExH4rDD8E-NT2fshgL2kzpvq8m7bJXnZ2PxIfcvn8bCfw7JdAI0jK2ql5NbVkVic4_Qlr-6rFpLzpbkY8Df487JMUFg2XdYeT7uSg'
  }
];

const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord-1',
    orderNumber: 'CNA-10492',
    customerName: 'علیرضا محمدی',
    customerPhone: '۰۹۱۲۳۴۵۶۷۸۹',
    createdAt: '۱۰ دقیقه پیش (۱۳:۴۲)',
    totalAmount: 95400000,
    paymentGateway: 'درگاه بانک ملت (شاپرک)',
    paymentStatus: 'موفق',
    shippingMethod: 'پیک اکسپرس تهران',
    shippingAddress: 'تهران، منطقه ۱ (زعفرانیه)',
    status: 'processing',
    statusNote: 'میز ترخیص ۱',
    items: [
      {
        productId: 'CNA-APL-16PM',
        productName: 'iPhone 16 Pro Max 256GB',
        specs: 'رنگ تیتانیوم صحرایی',
        price: 94500000,
        quantity: 1,
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB0jFQIG5UrATv1MrYxoAgyZJ8bdrEUE9-QkobVlu4VxTNEk0cbBW4ok0aExcQNVJqq-E2GyMGC9FJ8u0HLmFeg5zGP3NSBAEYqsSjFKVLKYS3FKXIe0mJgZ5reSqlqRiUVwsYWvHcPHLSMAQnGhzg3kRKzH91-bEoia_AtOq1UiR8V7WbTAJWLrJy7Tzwm-13ODr30kCjkkvz5vEetZR1MmiARUNy1JvlTUlZn47ZQ'
      },
      {
        productId: 'CNA-ANK-45W',
        productName: 'شارژر دیواری انکر ۴۵ وات Nano II',
        specs: 'مشکی کربنی',
        price: 900000,
        quantity: 1
      }
    ]
  },
  {
    id: 'ord-2',
    orderNumber: 'CNA-10491',
    customerName: 'سارا طباطبایی',
    customerPhone: '۰۹۱۳۸۸۸۰۱۹۲',
    createdAt: '۳۵ دقیقه پیش (۱۳:۱۷)',
    totalAmount: 69000000,
    paymentGateway: 'پرداخت آنلاین موفق (سامان)',
    paymentStatus: 'موفق',
    shippingMethod: 'تیپاکس شهرستان',
    shippingAddress: 'اصفهان، خ نظر غربی',
    trackingCode: '۲۹۴۸۲۹',
    status: 'shipped',
    statusNote: 'تحویل باربری تیپاکس',
    items: [
      {
        productId: 'CNA-SAM-S24U',
        productName: 'Galaxy S24 Ultra 512GB',
        specs: 'رنگ تیتانیوم مشکی | ویتنام',
        price: 69000000,
        quantity: 1,
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDcBuwFW11uhBG3HTppJ5GWzDb41IZxWpnKC1lCnoxTdXSK1z0CD5y4JeDebK0ZXfQ7dK7a9KPcUODd35s_58oEYzl1BS__PP0JJc_mwxczeq9yx-ogyBTHO435mzGHvbl704C1rqZ2wnmUahAbu6aTd6fR36yYFUBS0y12weP-mTbsTI6gpOkGnH9XREJLBNhWcPmpzJmkCrVFFlud01fGg_-HIFgferBH3IK3KmZm'
      }
    ]
  },
  {
    id: 'ord-3',
    orderNumber: 'CNA-10490',
    customerName: 'پویا ضیایی',
    customerPhone: '۰۹۱۷۱۱۱۲۲۳۳',
    createdAt: 'دیروز (۱۶:۲۲)',
    totalAmount: 11020000,
    paymentGateway: 'پرداخت درگاه آپ (موفق)',
    paymentStatus: 'موفق',
    shippingMethod: 'پست پیشتاز',
    shippingAddress: 'شیراز، خیابان ارم',
    trackingCode: '۹۱۸۳۷۴',
    status: 'delivered',
    statusNote: 'تحویل مشتری شده',
    items: [
      {
        productId: 'CNA-SAM-B2P',
        productName: 'Galaxy Buds2 Pro خاکستری',
        specs: '+ قاب مگ‌سیف آیفون پرومکس',
        price: 11020000,
        quantity: 1,
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBUdpicB0PHEhgFyJU642y8Cc3igDvXFiX6e8kdC0Hil1fgHmqLVLk-VI1240PebrexQs-nnEHDXxU1QoiExko6lm9HEZSFR63lILnDMXyObI8njAptjw1MuAPPS9VwyJgjjQvExH4rDD8E-NT2fshgL2kzpvq8m7bJXnZ2PxIfcvn8bCfw7JdAI0jK2ql5NbVkVic4_Qlr-6rFpLzpbkY8Df487JMUFg2XdYeT7uSg'
      }
    ]
  },
  {
    id: 'ord-4',
    orderNumber: 'CNA-10489',
    customerName: 'مریم رضایی',
    customerPhone: '۰۹۲۱۵۵۵۷۷۶۶',
    createdAt: '۳ ساعت پیش',
    totalAmount: 1450000,
    paymentGateway: 'فیش واریزی در انتظار تایید',
    paymentStatus: 'در انتظار تایید حسابداری',
    shippingMethod: 'پست سفارشی',
    shippingAddress: 'تبریز، بلوار ۲۹ بهمن',
    status: 'pending',
    statusNote: 'فیش واریزی ارسال شده',
    items: [
      {
        productId: 'CNA-ANK-CAB',
        productName: 'کابل شارژ تایپ سی به لایتنینگ انکر',
        specs: 'تعداد: ۲ عدد (طول ۱.۸ متر)',
        price: 725000,
        quantity: 2
      }
    ]
  },
  {
    id: 'ord-5',
    orderNumber: 'CNA-89412',
    customerName: 'سامان کریمی',
    customerPhone: '۰۹۱۲۹۹۹۳۳۴۴',
    createdAt: '۱۴ دقیقه پیش',
    totalAmount: 104200000,
    paymentGateway: 'درگاه سامان (شاپرک)',
    paymentStatus: 'موفق',
    shippingMethod: 'تحویل اکسپرس',
    shippingAddress: 'تهران، شهرک غرب',
    status: 'delivered',
    statusNote: 'تحویل اکسپرس انجام شد',
    items: [
      {
        productId: 'CNA-APL-16PM',
        productName: 'iPhone 16 Pro Max + قاب مگ‌سیف',
        specs: 'نچرال تیتانیوم',
        price: 104200000,
        quantity: 1
      }
    ]
  },
  {
    id: 'ord-6',
    orderNumber: 'CNA-89411',
    customerName: 'الهام فراهانی',
    customerPhone: '۰۹۳۰۴۴۴۵۵۶۶',
    createdAt: '۴۲ دقیقه پیش',
    totalAmount: 78900000,
    paymentGateway: 'درگاه پرداخت ملت',
    paymentStatus: 'موفق',
    shippingMethod: 'پیک اختصاصی تهران',
    shippingAddress: 'تهران، نیاوران',
    status: 'processing',
    statusNote: 'در انتظار بسته‌بندی',
    items: [
      {
        productId: 'CNA-SAM-S24U',
        productName: 'Galaxy S24 Ultra (512GB)',
        specs: 'خاکستری تیتانیوم',
        price: 78900000,
        quantity: 1
      }
    ]
  }
];

const INITIAL_USERS: AdminUser[] = [
  {
    id: 'usr-1',
    fullName: 'علیرضا محمدی',
    nationalId: '۰۰۱۴۸۹۲۲۷۳',
    phone: '۰۹۱۲ ۳۴۵ ۶۷۸۹',
    email: 'a.mohammadi@gmail.com',
    role: 'vip',
    totalPurchases: 102500000,
    orderCount: 8,
    orderSummary: '۸ سفارش موفق (آیفون ۱۵ پرو، اپل‌واچ)',
    walletBalance: 340000,
    joinedAt: '۱۴ شهریور ۱۴۰۲',
    lastLogin: 'امروز ۱۰:۲۴',
    status: 'active',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBOlrFn-K8IwtE8T_Pdhoso3IaXkYTvqWpOPhfBtZRrBPp-KWAo8DpKEpjGtq75ThkMypA-VjABMe-YZ0yVZySBWuXBKn9P9H2MbHQ_-NZt1OY7RHHlSwR8FArO_qxGcieQhOwGsxObr1Zp4ZrhQ4bGX7upAvySImJlUVoBVKt2vqTzVYA6k9ZqwOH3mdPPPLyrHsMecd0445qSmmxReYCLCs0LvdMSKRzPGMtya2--',
    address: {
      title: 'آدرس اصلی (تهران - میرداماد)',
      fullAddress: 'تهران، بلوار میرداماد، خیابان شمس تبریزی شمالی، کوچه دوازدهم، پلاک ۱۸، زنگ ۴.',
      postalCode: '۱۹۱۹۸۸۲۳۱۱',
      receiver: 'علیرضا محمدی',
      phone: '۰۹۱۲۳۴۵۶۷۸۹'
    },
    recentOrders: [
      {
        title: 'آیفون ۱۵ پرو مکس ۲۵۶ گیگابایت تیتانیوم',
        invoice: '#CNA-8841',
        date: '۱۲ مهر ۱۴۰۲',
        amount: 88000000,
        status: 'تحویل شده',
        icon: 'smartphone'
      },
      {
        title: 'اپل‌واچ سری ۹ مدل ۴۵ میلی‌متری',
        invoice: '#CNA-7932',
        date: '۲۲ شهریور ۱۴۰۲',
        amount: 14500000,
        status: 'تحویل شده',
        icon: 'watch'
      }
    ],
    adminNote: 'مشتری وفادار و خوش‌حساب، اولویت ارسال اکسپرس رایگان.'
  },
  {
    id: 'usr-2',
    fullName: 'سارا طباطبایی',
    nationalId: '۱۲۷۴۰۹۰۸۱۱',
    phone: '۰۹۳۵ ۷۸۹ ۱۱۲۲',
    email: 'sara.taba@chmail.ir',
    role: 'customer',
    totalPurchases: 24800000,
    orderCount: 2,
    orderSummary: '۲ سفارش (هندزفری انکر و قاب محافظ)',
    walletBalance: 0,
    joinedAt: '۲۲ آبان ۱۴۰۲',
    lastLogin: 'دیروز ۱۸:۱۵',
    status: 'active',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDfRZIHk3o5L4vDX6ix2HNovJg25T6jUaYA_Fva0HSbVFLsMEuHnoBEM7d2fBdkCTP-wWXYShBhORwYHdm81ZUKD0iqGUnOQ2rw7Wt3rP4nWPzbrvbaPOTfbw0oGzOBR60UsxephVc57C5vZaIfbCnbTcD8-jHRplafg6wPN6cSLzCvfLe13dfecGObVCMOWkd9JdWW4EhqAeZM1FgAR8yP41FTgMwh-cdw9RPxQLJg',
    address: {
      title: 'آدرس منزل (اصفهان)',
      fullAddress: 'اصفهان، خیابان نظر غربی، کوچه لادن، مجتمع پارس، طبقه ۳',
      postalCode: '۸۱۴۵۶۷۸۹۰۱',
      receiver: 'سارا طباطبایی',
      phone: '۰۹۳۵۷۸۹۱۱۲۲'
    },
    recentOrders: [
      {
        title: 'هندزفری انکر Soundcore R50i',
        invoice: '#CNA-9102',
        date: '۲۰ آبان ۱۴۰۲',
        amount: 1450000,
        status: 'تحویل شده',
        icon: 'headphones'
      }
    ],
    adminNote: 'مشتری جدید، ثبت‌نام از کمپین پاییزی اینستاگرام.'
  },
  {
    id: 'usr-3',
    fullName: 'مهدی رستمی',
    nationalId: '۰۰۵۹۸۱۷۲۲۳',
    phone: '۰۹۱۹ ۱۰۰ ۲۰۳۰',
    email: 'm.rostami@cnamobile.ir',
    role: 'super_admin',
    totalPurchases: 0,
    orderCount: 0,
    orderSummary: 'دسترسی نامحدود به دیتابیس و انبار',
    walletBalance: 1500000,
    joinedAt: '۰۱ فروردین ۱۴۰۱',
    lastLogin: 'هم‌اکنون آنلاین',
    status: 'active',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCfEUrud_q_WV-i1XarVz3vn7RPPQXJm4ebUN0dGBtVQZSEuf3Nj7_q-A-yTalWRP4pgslJWlKnSX3-rGPcuSHMx-04CjT4bcjmK8IbBH-TQE_sWDrzn8HY4396F8HZxzv65s0BBy9yLalYrBeTqC0JkotxvFuSD_AW8OG9kee9Fs4jO5XeDjKisfyl_jKwAuyVIVVXCGQXa4daTNu37i2LXl3Yg6ltk9e9fQQOexZM',
    adminNote: 'ادمین ارشد سیستم و مدیر فنی زیرساخت سی‌ان‌ای.'
  },
  {
    id: 'usr-4',
    fullName: 'الناز حسینی',
    nationalId: '۰۴۴۰۱۲۳۳۹۰',
    phone: '۰۹۰۱ ۲۲۳ ۴۴۵۵',
    email: 'e.hosseini99@yahoo.com',
    role: 'customer',
    totalPurchases: 4200000,
    orderCount: 1,
    orderSummary: '۱ سفارش لغو شده (مشکوک به فیشینگ)',
    walletBalance: 0,
    joinedAt: '۰۵ دی ۱۴۰۲',
    lastLogin: '۳ روز پیش',
    status: 'suspended',
    avatar: '',
    adminNote: 'حساب مسدود به دلیل ارسال فیش واریزی جعلی در فاکتور ۹۰۴۱.'
  }
];

const INITIAL_LOGS: SystemLog[] = [
  {
    id: 'log-1',
    title: 'تغییر قیمت دلاری',
    author: 'مسئول فروش',
    description: 'به‌روزرسانی نرخ ۱۲ مدل آیفون بر اساس نوسان درهم',
    timeAgo: '۱۰ دقیقه پیش',
    icon: 'price_change',
    type: 'price'
  },
  {
    id: 'log-2',
    title: 'ثبت حواله انبار',
    author: 'انباردار مرکزی',
    description: 'ورود ۴۰ عدد شارژر اصلی ۴۵ وات سامسونگ به موجودی',
    timeAgo: '۴۵ دقیقه پیش',
    icon: 'inventory',
    type: 'inventory'
  },
  {
    id: 'log-3',
    title: 'تأیید گارانتی طلایی',
    author: 'خدمات پس از فروش',
    description: 'فعال‌سازی کد شناسه اصالت برای سفارش #CNA-89390',
    timeAgo: '۲ ساعت پیش',
    icon: 'security',
    type: 'warranty'
  },
  {
    id: 'log-4',
    title: 'ارسال پیامک انبوه جشنواره',
    author: 'واحد مارکتینگ',
    description: 'کمپین آخر هفته ارسال به ۲,۱۰۰ خریدار فعال',
    timeAgo: '۳ ساعت پیش',
    icon: 'campaign',
    type: 'campaign'
  }
];

const INITIAL_INVOICES: FinancialInvoice[] = [
  {
    id: 'inv-1',
    invoiceNumber: 'CNA-INV-1403-8941',
    orderNumber: 'CNA-10492',
    customerName: 'علیرضا محمدی',
    nationalId: '۰۰۱۴۸۹۲۲۷۳',
    economicCode: '۴۱۱۸۹۲۳۴۵۶',
    subtotal: 86727272,
    vatAmount: 8672728,
    totalAmount: 95400000,
    paymentGateway: 'درگاه بانک ملت (شاپرک)',
    paymentRefCode: 'SHP-8921849102',
    status: 'approved',
    date: '۱۴۰۳/۰۸/۲۱',
    itemsCount: 2
  },
  {
    id: 'inv-2',
    invoiceNumber: 'CNA-INV-1403-8940',
    orderNumber: 'CNA-10491',
    customerName: 'سارا طباطبایی',
    nationalId: '۱۲۷۴۰۹۰۸۱۱',
    subtotal: 62727272,
    vatAmount: 6272728,
    totalAmount: 69000000,
    paymentGateway: 'درگاه سامان کیش (سپ)',
    paymentRefCode: 'SEP-7738291038',
    status: 'approved',
    date: '۱۴۰۳/۰۸/۲۱',
    itemsCount: 1
  },
  {
    id: 'inv-3',
    invoiceNumber: 'CNA-INV-1403-8939',
    orderNumber: 'CNA-10490',
    customerName: 'پویا ضیایی',
    nationalId: '۰۹۱۷۱۱۱۲۲۳',
    subtotal: 10018182,
    vatAmount: 1001818,
    totalAmount: 11020000,
    paymentGateway: 'آسان پرداخت (آپ)',
    paymentRefCode: 'AP-9928172641',
    status: 'approved',
    date: '۱۴۰۳/۰۸/۲۰',
    itemsCount: 2
  },
  {
    id: 'inv-4',
    invoiceNumber: 'CNA-INV-1403-8938',
    orderNumber: 'CNA-10489',
    customerName: 'مریم رضایی',
    nationalId: '۰۹۲۱۵۵۵۷۷۶',
    subtotal: 1318182,
    vatAmount: 131818,
    totalAmount: 1450000,
    paymentGateway: 'فیش واریزی پایا / ساتنا',
    paymentRefCode: 'SATNA-55829102',
    status: 'pending_tax',
    date: '۱۴۰۳/۰۸/۲۱',
    itemsCount: 1
  },
  {
    id: 'inv-5',
    invoiceNumber: 'CNA-INV-1403-8937',
    orderNumber: 'CNA-89412',
    customerName: 'سامان کریمی',
    nationalId: '۰۰۷۸۹۱۲۲۳۱',
    subtotal: 94727272,
    vatAmount: 9472728,
    totalAmount: 104200000,
    paymentGateway: 'درگاه سامان کیش',
    paymentRefCode: 'SEP-6648192019',
    status: 'approved',
    date: '۱۴۰۳/۰۸/۲۱',
    itemsCount: 2
  }
];

const INITIAL_COUPONS: DiscountCoupon[] = [
  {
    id: 'cp-1',
    code: 'CNA-YALDA',
    title: 'جشنواره پاییزه و شب یلدا',
    type: 'percent',
    value: 10,
    minOrderAmount: 2000000,
    maxDiscountCap: 1500000,
    usageCount: 184,
    maxUsage: 500,
    startDate: '۱۴۰۳/۰۸/۰۱',
    endDate: '۱۴۰۳/۰۹/۳۰',
    isActive: true,
    targetAudience: 'all'
  },
  {
    id: 'cp-2',
    code: 'IPHONE16-VIP',
    title: 'تخفیف ویژه باشگاه مشتریان طلایی آیفون',
    type: 'fixed',
    value: 2000000,
    minOrderAmount: 50000000,
    maxDiscountCap: 2000000,
    usageCount: 42,
    maxUsage: 100,
    startDate: '۱۴۰۳/۰۸/۱۵',
    endDate: '۱۴۰۳/۰۹/۱۵',
    isActive: true,
    targetAudience: 'vip'
  },
  {
    id: 'cp-3',
    code: 'WELCOME-CNA',
    title: 'هدیه اولین خرید کاربران جدید',
    type: 'fixed',
    value: 300000,
    minOrderAmount: 1000000,
    maxDiscountCap: 300000,
    usageCount: 312,
    maxUsage: 1000,
    startDate: '۱۴۰۳/۰۱/۰۱',
    endDate: '۱۴۰۳/۱۲/۲۹',
    isActive: true,
    targetAudience: 'new_customers'
  },
  {
    id: 'cp-4',
    code: 'ANKER-POWER',
    title: 'تخفیف اکسسوری و شارژرهای انکر',
    type: 'percent',
    value: 15,
    minOrderAmount: 500000,
    maxDiscountCap: 800000,
    usageCount: 95,
    maxUsage: 200,
    startDate: '۱۴۰۳/۰۸/۱۰',
    endDate: '۱۴۰۳/۰۸/۳۰',
    isActive: true,
    targetAudience: 'all'
  },
  {
    id: 'cp-5',
    code: 'BLACK-FRIDAY',
    title: 'جمعه شگفت‌انگیز سی‌ان‌ای (بلک فرایدی)',
    type: 'percent',
    value: 20,
    minOrderAmount: 3000000,
    maxDiscountCap: 3000000,
    usageCount: 0,
    maxUsage: 300,
    startDate: '۱۴۰۳/۰۹/۰۵',
    endDate: '۱۴۰۳/۰۹/۱۰',
    isActive: false,
    targetAudience: 'all'
  }
];

const INITIAL_SETTINGS: StoreSettings = {
  storeName: 'سی‌ان‌ای موبایل | CNA Mobile',
  tagline: 'مرکز تخصصی عرضه گوشی‌های هوشمند و لوازم جانبی اورجینال با گارانتی طلایی',
  supportPhone: '۰۲۱-۸۸۸۸۹۹۹۹',
  emergencyPhone: '۰۹۱۲۳۴۵۶۷۸۹',
  centralAddress: 'تهران، خیابان ولیعصر، تقاطع میرداماد، مجتمع کامپیوتر پایتخت، طبقه همکف، واحد ۱۸',
  postalCode: '۱۹۱۹۸۸۲۳۱۱',
  workHours: 'شنبه تا چهارشنبه ۹:۰۰ الی ۲۱:۰۰ | پنج‌شنبه‌ها ۹:۰۰ الی ۱۸:۰۰',
  isStoreOpen: true,
  autoManifestEnabled: true,
  taxRatePercent: 10,
  mellatTerminalId: '89218491',
  samanMerchantId: '10839218',
  kavenegarApiKey: '55718291029384719283749102938471',
  freeShippingThreshold: 1000000,
  expressTehranCost: 85000,
  tipaxBaseCost: 110000,
  zebraPort: 'COM-3',
  twoFactorEnabled: true
};

interface AdminDataContextType {
  // Products
  products: Product[];
  addProduct: (product: Omit<Product, 'id'>) => Product;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  bulkDeleteProducts: (ids: string[]) => void;
  bulkTogglePublish: (ids: string[], isPublished: boolean) => void;
  bulkUpdatePrice: (ids: string[], mode: 'fixed' | 'percent', value: number) => void;
  incrementStock: (skuOrBarcode: string, quantity: number, shelf?: string) => { success: boolean; message: string };
  togglePublish: (id: string) => void;

  // Orders
  orders: Order[];
  updateOrderStatus: (orderId: string, newStatus: OrderStatus) => { success: boolean; message: string };
  cancelOrder: (orderId: string) => { success: boolean; message: string };
  createOrder: (order: Omit<Order, 'id'>) => Order;

  // Users
  users: AdminUser[];
  addUser: (user: { fullName: string; phone: string; email: string; nationalId?: string; role: UserRole }) => AdminUser;
  updateUserStatus: (id: string, newStatus: UserStatus) => { success: boolean; message: string };
  updateUserRole: (id: string, newRole: UserRole) => void;
  updateUserAdminNote: (id: string, note: string) => void;
  deleteUser: (id: string) => void;

  // Invoices & Financials
  invoices: FinancialInvoice[];
  addInvoice: (invoice: Omit<FinancialInvoice, 'id'>) => FinancialInvoice;
  updateInvoiceStatus: (id: string, status: InvoiceStatus) => void;

  // Discounts & Coupons
  coupons: DiscountCoupon[];
  addCoupon: (coupon: Omit<DiscountCoupon, 'id' | 'usageCount'>) => DiscountCoupon;
  toggleCouponActive: (id: string) => void;
  deleteCoupon: (id: string) => void;

  // Settings
  settings: StoreSettings;
  updateSettings: (newSettings: Partial<StoreSettings>) => void;

  // Logs
  systemLogs: SystemLog[];
  addSystemLog: (log: Omit<SystemLog, 'id'>) => void;

  // Global Toast
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const AdminDataContext = createContext<AdminDataContextType | undefined>(undefined);

export const AdminDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('cna_admin_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('cna_admin_orders');
    return saved ? JSON.parse(saved) : INITIAL_ORDERS;
  });

  const [users, setUsers] = useState<AdminUser[]>(() => {
    const saved = localStorage.getItem('cna_admin_users');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  const [invoices, setInvoices] = useState<FinancialInvoice[]>(() => {
    const saved = localStorage.getItem('cna_admin_invoices');
    return saved ? JSON.parse(saved) : INITIAL_INVOICES;
  });

  const [coupons, setCoupons] = useState<DiscountCoupon[]>(() => {
    const saved = localStorage.getItem('cna_admin_coupons');
    return saved ? JSON.parse(saved) : INITIAL_COUPONS;
  });

  const [settings, setSettings] = useState<StoreSettings>(() => {
    const saved = localStorage.getItem('cna_admin_settings');
    return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
  });

  const [systemLogs, setSystemLogs] = useState<SystemLog[]>(() => {
    const saved = localStorage.getItem('cna_admin_logs');
    return saved ? JSON.parse(saved) : INITIAL_LOGS;
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3500);
  };

  // Sync with local storage
  useEffect(() => {
    localStorage.setItem('cna_admin_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('cna_admin_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('cna_admin_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('cna_admin_invoices', JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem('cna_admin_coupons', JSON.stringify(coupons));
  }, [coupons]);

  useEffect(() => {
    localStorage.setItem('cna_admin_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('cna_admin_logs', JSON.stringify(systemLogs));
  }, [systemLogs]);

  // --- PRODUCT ACTIONS ---
  const addProduct = (prodData: Omit<Product, 'id'>) => {
    const newProduct: Product = {
      ...prodData,
      id: `prod-${Date.now()}`
    };
    setProducts((prev) => [newProduct, ...prev]);
    showToast(`محصول "${newProduct.name}" با موفقیت به انبار اضافه شد.`);
    addSystemLog({
      title: 'افزودن محصول جدید',
      author: 'مدیر ارشد سی‌ان‌ای',
      description: `کالای "${newProduct.name}" با کد ${newProduct.sku} ثبت شد.`,
      timeAgo: 'هم‌اکنون',
      icon: 'add_box',
      type: 'inventory'
    });
    return newProduct;
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const updated = { ...p, ...updates };
          return updated;
        }
        return p;
      })
    );
    showToast('اطلاعات محصول با موفقیت به‌روزرسانی شد.');
  };

  const deleteProduct = (id: string) => {
    const target = products.find((p) => p.id === id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    showToast(`کالای "${target?.name || id}" با موفقیت حذف شد.`);
  };

  const bulkDeleteProducts = (ids: string[]) => {
    setProducts((prev) => prev.filter((p) => !ids.includes(p.id)));
    showToast(`${ids.length} کالا از سیستم انبار حذف شدند.`);
  };

  const bulkTogglePublish = (ids: string[], isPublished: boolean) => {
    setProducts((prev) =>
      prev.map((p) => (ids.includes(p.id) ? { ...p, isPublished } : p))
    );
    showToast(`وضعیت انتشار ${ids.length} محصول به‌روز شد.`);
  };

  const bulkUpdatePrice = (ids: string[], mode: 'fixed' | 'percent', value: number) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (!ids.includes(p.id)) return p;
        let newPrice = p.price;
        if (mode === 'percent') {
          newPrice = Math.round(p.price * (1 + value / 100));
        } else {
          newPrice = Math.max(1000, p.price + value);
        }
        return { ...p, price: newPrice };
      })
    );
    showToast(`قیمت ${ids.length} کالای انتخابی اصلاح گردید.`);
  };

  const togglePublish = (id: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isPublished: !p.isPublished } : p))
    );
  };

  const incrementStock = (skuOrBarcode: string, quantity: number, shelf?: string) => {
    const cleanSearch = skuOrBarcode.trim().toLowerCase();
    const targetIndex = products.findIndex(
      (p) =>
        p.sku.toLowerCase() === cleanSearch ||
        p.barcode.toLowerCase() === cleanSearch ||
        p.name.toLowerCase().includes(cleanSearch)
    );

    if (targetIndex === -1) {
      return { success: false, message: 'کالایی با این بارکد یا شناسه SKU یافت نشد.' };
    }

    const target = products[targetIndex];
    const newStock = Math.max(0, target.stock + quantity);
    const updated = {
      ...target,
      stock: newStock,
      shelfLocation: shelf || target.shelfLocation
    };

    setProducts((prev) => {
      const copy = [...prev];
      copy[targetIndex] = updated;
      return copy;
    });

    addSystemLog({
      title: 'ورود سریع به انبار',
      author: 'انباردار مرکزی',
      description: `افزایش ${quantity} عدد موجودی برای ${target.name} (موجودی فعلی: ${newStock})`,
      timeAgo: 'هم‌اکنون',
      icon: 'inventory',
      type: 'inventory'
    });

    showToast(`موجودی "${target.name}" به ${newStock} عدد افزایش یافت.`);
    return { success: true, message: `موجودی با موفقیت به ${newStock} عدد تغییر یافت.` };
  };

  // --- ORDER ACTIONS & INVENTORY RULE ---
  const updateOrderStatus = (orderId: string, newStatus: OrderStatus): { success: boolean; message: string } => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) {
      return { success: false, message: 'سفارش یافت نشد.' };
    }

    if (order.status === 'delivered' && newStatus === 'cancelled') {
      return {
        success: false,
        message: 'امکان لغو سفارشی که قبلاً تحویل مشتری شده وجود ندارد!'
      };
    }

    if (order.status === newStatus) {
      return { success: true, message: 'وضعیت تغییری نکرد.' };
    }

    // If changing to cancelled, restore stock!
    if (newStatus === 'cancelled' && order.status !== 'cancelled') {
      order.items.forEach((item) => {
        setProducts((prev) =>
          prev.map((p) => {
            if (p.sku === item.productId || p.name.includes(item.productName)) {
              return { ...p, stock: p.stock + item.quantity };
            }
            return p;
          })
        );
      });
      showToast(`سفارش #${order.orderNumber} لغو شد و اقلام آن به موجودی انبار بازگشت.`);
    } else {
      showToast(`وضعیت سفارش #${order.orderNumber} به "${getStatusLabelFa(newStatus)}" تغییر یافت.`);
    }

    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );

    addSystemLog({
      title: 'تغییر وضعیت مرسوله',
      author: 'واحد پردازش سفارشات',
      description: `سفارش #${order.orderNumber} به وضعیت "${getStatusLabelFa(newStatus)}" تغییر کرد.`,
      timeAgo: 'هم‌اکنون',
      icon: 'local_shipping',
      type: 'inventory'
    });

    return { success: true, message: 'وضعیت با موفقیت به‌روزرسانی شد.' };
  };

  const cancelOrder = (orderId: string) => {
    return updateOrderStatus(orderId, 'cancelled');
  };

  const createOrder = (orderData: Omit<Order, 'id'>) => {
    const newOrder: Order = {
      ...orderData,
      id: `ord-${Date.now()}`
    };
    setOrders((prev) => [newOrder, ...prev]);
    showToast(`سفارش جدید #${newOrder.orderNumber} با موفقیت ثبت شد.`);
    return newOrder;
  };

  // --- USER ACTIONS ---
  const addUser = (userData: { fullName: string; phone: string; email: string; nationalId?: string; role: UserRole }) => {
    const newUser: AdminUser = {
      id: `usr-${Date.now()}`,
      fullName: userData.fullName,
      nationalId: userData.nationalId || '۰۰' + Math.floor(10000000 + Math.random() * 90000000),
      phone: userData.phone,
      email: userData.email,
      role: userData.role,
      totalPurchases: 0,
      orderCount: 0,
      orderSummary: 'کاربر جدید (بدون سابقه سفارش)',
      walletBalance: 0,
      joinedAt: 'امروز',
      lastLogin: 'تاکنون وارد نشده',
      status: 'active',
      avatar: ''
    };
    setUsers((prev) => [newUser, ...prev]);
    showToast(`کاربر "${newUser.fullName}" با سطح دسترسی "${getRoleLabelFa(newUser.role)}" افزوده شد.`);
    addSystemLog({
      title: 'ثبت کاربر جدید',
      author: 'مدیر ارشد سی‌ان‌ای',
      description: `حساب کاربری برای ${newUser.fullName} با نقش ${getRoleLabelFa(newUser.role)} ایجاد شد.`,
      timeAgo: 'هم‌اکنون',
      icon: 'person_add',
      type: 'security'
    });
    return newUser;
  };

  const updateUserStatus = (id: string, newStatus: UserStatus): { success: boolean; message: string } => {
    const target = users.find((u) => u.id === id);
    if (!target) {
      return { success: false, message: 'کاربر یافت نشد.' };
    }

    if (target.role === 'super_admin' && newStatus === 'suspended') {
      return {
        success: false,
        message: 'خطای امنیتی: حساب ادمین ارشد کل سیستم غیرقابل مسدودسازی است!'
      };
    }

    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, status: newStatus } : u))
    );

    const msg =
      newStatus === 'active'
        ? `حساب کاربری "${target.fullName}" فعال شد.`
        : `حساب کاربری "${target.fullName}" مسدود موقت گردید.`;
    showToast(msg);
    return { success: true, message: msg };
  };

  const updateUserRole = (id: string, newRole: UserRole) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, role: newRole } : u))
    );
    showToast('سطح دسترسی کاربر به‌روزرسانی شد.');
  };

  const updateUserAdminNote = (id: string, note: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, adminNote: note } : u))
    );
    showToast('یادداشت مدیر با موفقیت ذخیره شد.');
  };

  const deleteUser = (id: string) => {
    const target = users.find((u) => u.id === id);
    if (target?.role === 'super_admin') {
      showToast('خطای امنیتی: حذف حساب ادمین ارشد امکان‌پذیر نیست.');
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== id));
    showToast(`کاربر "${target?.fullName || id}" حذف شد.`);
  };

  // --- INVOICE ACTIONS ---
  const addInvoice = (invData: Omit<FinancialInvoice, 'id'>) => {
    const newInvoice: FinancialInvoice = {
      ...invData,
      id: `inv-${Date.now()}`
    };
    setInvoices((prev) => [newInvoice, ...prev]);
    showToast(`فاکتور رسمی #${newInvoice.invoiceNumber} ثبت گردید.`);
    return newInvoice;
  };

  const updateInvoiceStatus = (id: string, status: InvoiceStatus) => {
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === id ? { ...inv, status } : inv))
    );
    showToast(`وضعیت فاکتور رسمی به‌روزرسانی شد.`);
  };

  // --- COUPON ACTIONS ---
  const addCoupon = (couponData: Omit<DiscountCoupon, 'id' | 'usageCount'>) => {
    const newCoupon: DiscountCoupon = {
      ...couponData,
      id: `cp-${Date.now()}`,
      usageCount: 0
    };
    setCoupons((prev) => [newCoupon, ...prev]);
    showToast(`کد تخفیف "${newCoupon.code}" با موفقیت ایجاد و فعال شد.`);
    addSystemLog({
      title: 'ایجاد کد تخفیف',
      author: 'واحد بازاریابی',
      description: `کد "${newCoupon.code}" به مقدار ${newCoupon.value}${newCoupon.type === 'percent' ? '٪' : ' تومان'} تعریف شد.`,
      timeAgo: 'هم‌اکنون',
      icon: 'sell',
      type: 'campaign'
    });
    return newCoupon;
  };

  const toggleCouponActive = (id: string) => {
    setCoupons((prev) =>
      prev.map((cp) => (cp.id === id ? { ...cp, isActive: !cp.isActive } : cp))
    );
    showToast('وضعیت کد تخفیف تغییر یافت.');
  };

  const deleteCoupon = (id: string) => {
    setCoupons((prev) => prev.filter((cp) => cp.id !== id));
    showToast('کد تخفیف حذف گردید.');
  };

  // --- SETTINGS ACTIONS ---
  const updateSettings = (newSettings: Partial<StoreSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
    showToast('تنظیمات سیستم با موفقیت در سرور ذخیره شد.');
    addSystemLog({
      title: 'به‌روزرسانی تنظیمات سیستم',
      author: 'مدیر ارشد سی‌ان‌ای',
      description: 'پیکربندی فروشگاه و پارامترهای ارتباطی به‌روزرسانی شد.',
      timeAgo: 'هم‌اکنون',
      icon: 'settings',
      type: 'security'
    });
  };

  // --- LOG ACTIONS ---
  const addSystemLog = (logData: Omit<SystemLog, 'id'>) => {
    const newLog: SystemLog = {
      ...logData,
      id: `log-${Date.now()}`
    };
    setSystemLogs((prev) => [newLog, ...prev.slice(0, 19)]);
  };

  return (
    <AdminDataContext.Provider
      value={{
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        bulkDeleteProducts,
        bulkTogglePublish,
        bulkUpdatePrice,
        incrementStock,
        togglePublish,
        orders,
        updateOrderStatus,
        cancelOrder,
        createOrder,
        users,
        addUser,
        updateUserStatus,
        updateUserRole,
        updateUserAdminNote,
        deleteUser,
        invoices,
        addInvoice,
        updateInvoiceStatus,
        coupons,
        addCoupon,
        toggleCouponActive,
        deleteCoupon,
        settings,
        updateSettings,
        systemLogs,
        addSystemLog,
        toastMessage,
        showToast
      }}
    >
      {children}
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 start-6 z-50 max-w-md bg-inverse-surface text-inverse-on-surface px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in border border-outline-variant/30">
          <span className="material-symbols-outlined text-primary-fixed text-[22px]">info</span>
          <span className="text-body-sm font-body-sm">{toastMessage}</span>
        </div>
      )}
    </AdminDataContext.Provider>
  );
};

export const useAdminData = () => {
  const context = useContext(AdminDataContext);
  if (!context) {
    throw new Error('useAdminData must be used within an AdminDataProvider');
  }
  return context;
};

// Helper labels
export function getStatusLabelFa(status: OrderStatus): string {
  switch (status) {
    case 'pending':
      return 'در انتظار تایید حسابداری';
    case 'processing':
      return 'در حال پردازش در انبار';
    case 'shipped':
      return 'تحویل باربری / ارسال شده';
    case 'delivered':
      return 'تحویل داده شده';
    case 'cancelled':
      return 'لغو شده / مرجوعی';
    default:
      return status;
  }
}

export function getRoleLabelFa(role: UserRole): string {
  switch (role) {
    case 'super_admin':
      return 'ادمین ارشد سیستم';
    case 'vip':
      return 'مشتری VIP طلایی';
    case 'warehouse_manager':
      return 'مدیر انبار و موجودی';
    case 'support':
      return 'اپراتور پشتیبانی';
    case 'customer':
    default:
      return 'مشتری عادی';
  }
}
