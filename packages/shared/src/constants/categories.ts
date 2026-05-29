/**
 * Comprehensive classifieds taxonomy for Agahiram.
 *
 * Independently authored for the Iranian classifieds market, structured around
 * standard functional verticals (املاک، خودرو، دیجیتال، خدمات، استخدام، ...).
 * Each leaf may declare typed attributes that drive both the create-post form
 * and the explore filters.
 *
 * Attribute types:
 *   text   — free-form short string
 *   number — integer / decimal (tomans, m², year, mileage…)
 *   select — single choice from `options`
 *   bool   — yes/no toggle
 */

/**
 * Attribute kinds — kept in sync with the `AttributeType` enum exported from
 * `../types` (the values must literally match for round-tripping through the DB).
 */
export type CategoryAttributeKind = 'text' | 'number' | 'select' | 'bool';

export interface CategoryAttribute {
  key: string;
  label: string;
  type: CategoryAttributeKind;
  options?: string[];
  required?: boolean;
  /** Render this attribute as a chip in explore filters (default for selects). */
  filterable?: boolean;
}

export interface CategorySeed {
  name: string;
  slug: string;
  icon: string;
  order: number;
  /** Optional emoji shown in pills/cards alongside the lucide icon. */
  emoji?: string;
  children?: CategorySeed[];
  attributes?: CategoryAttribute[];
}

/* ─────────────────────────── Shared option sets ──────────────────────────── */

const COND_NEW_USED = ['نو', 'در حد نو', 'کارکرده', 'نیاز به تعمیر'];
const COND_TWO = ['نو', 'کارکرده'];
const YES_NO_OPTIONS = ['دارد', 'ندارد'];
const ROOMS = ['بدون اتاق', '۱', '۲', '۳', '۴', '۵ و بیشتر'];
const FLOOR_OPTIONS = ['همکف', '۱', '۲', '۳', '۴', '۵', '۶ و بالاتر'];
const PROPERTY_DOC = ['تک‌برگ', 'منگوله‌دار', 'قولنامه‌ای', 'شراکتی', 'وقفی', 'بنچاق', 'بدون سند'];
const HEATING = ['پکیج', 'شوفاژ', 'بخاری گازی', 'موتورخانه مرکزی', 'کولر گازی', 'فن‌کوئل'];
const COOLING = ['کولر آبی', 'کولر گازی', 'فن‌کوئل', 'چیلر', 'ندارد'];
const KITCHEN_CABINET = ['ام‌دی‌اف', 'هایگلاس', 'فلزی', 'چوب', 'ممبران'];
const FACADE = ['آجر', 'سنگ', 'سرامیک', 'کامپوزیت', 'سیمان', 'شیشه', 'ترکیبی'];
const CAR_GEARBOX = ['دنده‌ای', 'اتوماتیک', 'CVT', 'نیمه‌اتوماتیک'];
const CAR_FUEL = ['بنزینی', 'گازوئیلی', 'دوگانه‌سوز شرکتی', 'دوگانه‌سوز دستی', 'هیبریدی', 'برقی'];
const CAR_BODY_STATUS = [
  'سالم و بی‌خط و خش',
  'خط و خش جزئی',
  'صافکاری بی‌رنگ',
  'رنگ‌شدگی جزئی',
  'دوررنگ',
  'تمام‌رنگ',
  'تصادفی',
];
const CAR_INSURANCE = ['تا یک ماه', 'تا سه ماه', 'تا شش ماه', 'بیشتر از شش ماه', 'ندارد'];
const COLORS = [
  'سفید',
  'مشکی',
  'نقره‌ای',
  'خاکستری',
  'نوک‌مدادی',
  'قرمز',
  'آبی',
  'سبز',
  'زرد',
  'قهوه‌ای',
  'بژ',
  'نارنجی',
  'سایر',
];

const IRANIAN_CAR_BRANDS = [
  'ایران‌خودرو',
  'سایپا',
  'پارس‌خودرو',
  'مدیران‌خودرو',
  'بهمن‌موتور',
  'کرمان‌موتور',
  'دیار‌خودرو',
  'آرین‌پارس',
  'زامیاد',
];
const FOREIGN_CAR_BRANDS = [
  'ام‌جی',
  'بی‌ام‌و',
  'بنز',
  'پورشه',
  'تویوتا',
  'جیلی',
  'چری',
  'دانگ‌فنگ',
  'رنو',
  'سیتروئن',
  'سوبارو',
  'سوزوکی',
  'فولکس‌واگن',
  'فورد',
  'کیا',
  'لکسوس',
  'لیفان',
  'مزدا',
  'میتسوبیشی',
  'نیسان',
  'هیوندای',
  'هاوال',
  'هوندا',
  'وُلوو',
];

const MOBILE_BRANDS = [
  'اپل',
  'سامسونگ',
  'شیائومی',
  'هوآوی',
  'آنر',
  'وان‌پلاس',
  'گوگل',
  'سونی',
  'الجی',
  'نوکیا',
  'موتورولا',
  'اوپو',
  'ویوو',
  'ریلمی',
  'تکنو',
  'انفنیکس',
  'سایر',
];

const STORAGE_OPTIONS = [
  '۸ گیگ',
  '۱۶ گیگ',
  '۳۲ گیگ',
  '۶۴ گیگ',
  '۱۲۸ گیگ',
  '۲۵۶ گیگ',
  '۵۱۲ گیگ',
  '۱ ترابایت',
];

const LAPTOP_BRANDS = [
  'اپل',
  'ایسوس',
  'لنوو',
  'اچ‌پی',
  'دل',
  'ام‌اس‌آی',
  'ایسر',
  'مایکروسافت',
  'هوآوی',
  'سامسونگ',
  'تکنو',
  'سایر',
];
const TV_SIZES = [
  '۲۴ اینچ و کمتر',
  '۳۲ اینچ',
  '۴۳ اینچ',
  '۵۰ اینچ',
  '۵۵ اینچ',
  '۶۵ اینچ',
  '۷۵ اینچ و بزرگ‌تر',
];

const JOB_CONTRACT = ['تمام‌وقت', 'پاره‌وقت', 'پروژه‌ای', 'دورکاری', 'کارآموزی'];
const JOB_GENDER = ['مرد', 'زن', 'فرقی ندارد'];
const JOB_EXPERIENCE = [
  'بدون نیاز به سابقه',
  'کمتر از ۱ سال',
  '۱ تا ۳ سال',
  '۳ تا ۵ سال',
  'بیش از ۵ سال',
];

/* ───────────────────────────── Helper builders ───────────────────────────── */

const priceRangeAttr: CategoryAttribute = {
  key: 'price',
  label: 'قیمت (تومان)',
  type: 'number',
};

const yearAttr = (label = 'سال ساخت'): CategoryAttribute => ({
  key: 'year',
  label,
  type: 'number',
});

const conditionAttr = (opts: string[] = COND_NEW_USED): CategoryAttribute => ({
  key: 'condition',
  label: 'وضعیت',
  type: 'select',
  options: opts,
  required: true,
});

const brandAttr = (opts: string[], required = true): CategoryAttribute => ({
  key: 'brand',
  label: 'برند',
  type: 'select',
  options: opts,
  required,
});

const modelAttr = (required = false): CategoryAttribute => ({
  key: 'model',
  label: 'مدل',
  type: 'text',
  required,
});

/* ───────────────────────────── Real estate ───────────────────────────────── */

const realEstateAttrs: CategoryAttribute[] = [
  { key: 'area', label: 'متراژ (متر مربع)', type: 'number', required: true },
  { key: 'rooms', label: 'تعداد اتاق', type: 'select', options: ROOMS, required: true },
  yearAttr('سال ساخت'),
  { key: 'floor', label: 'طبقه', type: 'select', options: FLOOR_OPTIONS },
  { key: 'totalFloors', label: 'تعداد کل طبقات', type: 'number' },
  { key: 'unitsPerFloor', label: 'واحد در طبقه', type: 'number' },
  { key: 'doc', label: 'سند', type: 'select', options: PROPERTY_DOC },
  { key: 'parking', label: 'پارکینگ', type: 'select', options: YES_NO_OPTIONS },
  { key: 'elevator', label: 'آسانسور', type: 'select', options: YES_NO_OPTIONS },
  { key: 'storage', label: 'انباری', type: 'select', options: YES_NO_OPTIONS },
  { key: 'balcony', label: 'بالکن', type: 'select', options: YES_NO_OPTIONS },
  { key: 'heating', label: 'سیستم گرمایش', type: 'select', options: HEATING },
  { key: 'cooling', label: 'سیستم سرمایش', type: 'select', options: COOLING },
  { key: 'cabinet', label: 'جنس کابینت', type: 'select', options: KITCHEN_CABINET },
  { key: 'facade', label: 'نمای ساختمان', type: 'select', options: FACADE },
  { key: 'wc', label: 'سرویس بهداشتی', type: 'select', options: ['ایرانی', 'فرنگی', 'هر دو'] },
  { key: 'furnished', label: 'مبله', type: 'select', options: YES_NO_OPTIONS },
  { key: 'renovated', label: 'بازسازی شده', type: 'select', options: YES_NO_OPTIONS },
];

const rentExtras: CategoryAttribute[] = [
  { key: 'deposit', label: 'ودیعه (تومان)', type: 'number', required: true },
  { key: 'rent', label: 'اجاره ماهانه (تومان)', type: 'number', required: true },
  { key: 'convertible', label: 'قابل تبدیل', type: 'select', options: YES_NO_OPTIONS },
];

/* ───────────────────────────── Vehicles ──────────────────────────────────── */

const carAttrs: CategoryAttribute[] = [
  brandAttr([...IRANIAN_CAR_BRANDS, ...FOREIGN_CAR_BRANDS, 'سایر']),
  modelAttr(true),
  { ...yearAttr(), required: true },
  { key: 'mileage', label: 'کارکرد (کیلومتر)', type: 'number', required: true },
  { key: 'color', label: 'رنگ', type: 'select', options: COLORS },
  { key: 'gearbox', label: 'گیربکس', type: 'select', options: CAR_GEARBOX },
  { key: 'fuel', label: 'سوخت', type: 'select', options: CAR_FUEL },
  { key: 'bodyStatus', label: 'وضعیت بدنه', type: 'select', options: CAR_BODY_STATUS },
  {
    key: 'interior',
    label: 'وضعیت داخل خودرو',
    type: 'select',
    options: ['در حد نو', 'سالم', 'نیاز به تعمیر'],
  },
  { key: 'insurance', label: 'وضعیت بیمه', type: 'select', options: CAR_INSURANCE },
  { key: 'thirdPartyExpiry', label: 'انقضای بیمه شخص ثالث', type: 'text' },
  {
    key: 'plate',
    label: 'نوع پلاک',
    type: 'select',
    options: ['شخصی', 'تاکسی', 'دولتی', 'منطقه آزاد', 'گذر موقت', 'بدون پلاک'],
  },
  {
    key: 'origin',
    label: 'مبدا خودرو',
    type: 'select',
    options: ['داخلی', 'مونتاژ', 'وارداتی شرکتی', 'وارداتی شخصی'],
  },
];

/* ─────────────────────────────── Digital ─────────────────────────────────── */

const mobileAttrs: CategoryAttribute[] = [
  brandAttr(MOBILE_BRANDS),
  modelAttr(true),
  { key: 'storage', label: 'حافظه داخلی', type: 'select', options: STORAGE_OPTIONS },
  {
    key: 'ram',
    label: 'رم',
    type: 'select',
    options: ['۲ گیگ', '۳ گیگ', '۴ گیگ', '۶ گیگ', '۸ گیگ', '۱۲ گیگ', '۱۶ گیگ'],
  },
  conditionAttr(),
  { key: 'warranty', label: 'گارانتی', type: 'select', options: ['شرکتی', 'بدون گارانتی'] },
  { key: 'color', label: 'رنگ', type: 'select', options: COLORS },
  {
    key: 'simType',
    label: 'تعداد سیم‌کارت',
    type: 'select',
    options: ['تک‌سیم', 'دوسیم', 'سه‌سیم'],
  },
];

const laptopAttrs: CategoryAttribute[] = [
  brandAttr(LAPTOP_BRANDS),
  modelAttr(true),
  { key: 'cpu', label: 'پردازنده', type: 'text' },
  {
    key: 'ram',
    label: 'رم',
    type: 'select',
    options: ['۴ گیگ', '۸ گیگ', '۱۶ گیگ', '۳۲ گیگ', '۶۴ گیگ'],
  },
  { key: 'storage', label: 'حافظه', type: 'text' },
  { key: 'gpu', label: 'کارت گرافیک', type: 'text' },
  {
    key: 'screen',
    label: 'اندازه نمایشگر',
    type: 'select',
    options: ['کمتر از ۱۳ اینچ', '۱۳ اینچ', '۱۴ اینچ', '۱۵.۶ اینچ', '۱۶ اینچ', '۱۷ اینچ و بزرگ‌تر'],
  },
  conditionAttr(),
];

const tvAttrs: CategoryAttribute[] = [
  brandAttr([
    'سامسونگ',
    'الجی',
    'سونی',
    'تی‌سی‌ال',
    'هایسنس',
    'شیائومی',
    'پارس',
    'جی‌پلاس',
    'سایر',
  ]),
  modelAttr(false),
  { key: 'size', label: 'اندازه صفحه', type: 'select', options: TV_SIZES, required: true },
  {
    key: 'panel',
    label: 'نوع پنل',
    type: 'select',
    options: ['LED', 'OLED', 'QLED', 'پلاسما', 'LCD'],
  },
  { key: 'resolution', label: 'وضوح', type: 'select', options: ['HD', 'Full HD', '4K', '8K'] },
  { key: 'smart', label: 'هوشمند', type: 'select', options: YES_NO_OPTIONS },
  conditionAttr(),
];

/* ──────────────────────────────── Jobs ───────────────────────────────────── */

const jobAttrs: CategoryAttribute[] = [
  {
    key: 'contractType',
    label: 'نوع همکاری',
    type: 'select',
    options: JOB_CONTRACT,
    required: true,
  },
  { key: 'gender', label: 'جنسیت', type: 'select', options: JOB_GENDER },
  { key: 'experience', label: 'سابقه کار', type: 'select', options: JOB_EXPERIENCE },
  { key: 'salary', label: 'حقوق ماهیانه (تومان)', type: 'number' },
  { key: 'salaryNegotiable', label: 'حقوق توافقی', type: 'bool' },
  { key: 'insurance', label: 'بیمه', type: 'bool' },
  { key: 'remote', label: 'دورکاری', type: 'bool' },
];

/* ─────────────────────────── Full taxonomy tree ──────────────────────────── */

export const DIVAR_CATEGORIES: CategorySeed[] = [
  /* 1 ─ Real estate ─────────────────────────────────────────────────── */
  {
    name: 'املاک',
    slug: 'real-estate',
    icon: 'home',
    emoji: '🏠',
    order: 1,
    children: [
      {
        name: 'فروش آپارتمان',
        slug: 'apartment-sale',
        icon: 'building',
        order: 1,
        attributes: [priceRangeAttr, ...realEstateAttrs],
      },
      {
        name: 'اجاره آپارتمان',
        slug: 'apartment-rent',
        icon: 'key',
        order: 2,
        attributes: [...rentExtras, ...realEstateAttrs],
      },
      {
        name: 'خرید و فروش خانه و ویلا',
        slug: 'house-villa-sale',
        icon: 'home',
        order: 3,
        attributes: [
          priceRangeAttr,
          ...realEstateAttrs,
          { key: 'landArea', label: 'متراژ زمین', type: 'number' },
        ],
      },
      {
        name: 'اجاره خانه و ویلا',
        slug: 'house-villa-rent',
        icon: 'door-open',
        order: 4,
        attributes: [...rentExtras, ...realEstateAttrs],
      },
      {
        name: 'اجاره روزانه و کوتاه‌مدت',
        slug: 'short-term-rent',
        icon: 'calendar',
        order: 5,
        attributes: [
          { key: 'dailyRate', label: 'اجاره روزانه (تومان)', type: 'number', required: true },
          { key: 'rooms', label: 'تعداد اتاق', type: 'select', options: ROOMS },
          { key: 'capacity', label: 'ظرفیت (نفر)', type: 'number' },
          { key: 'pool', label: 'استخر', type: 'select', options: YES_NO_OPTIONS },
          { key: 'wifi', label: 'اینترنت', type: 'select', options: YES_NO_OPTIONS },
        ],
      },
      {
        name: 'فروش دفتر کار، مغازه و غرفه',
        slug: 'commercial-sale',
        icon: 'store',
        order: 6,
        attributes: [
          priceRangeAttr,
          ...realEstateAttrs,
          { key: 'frontage', label: 'بر زمین (متر)', type: 'number' },
        ],
      },
      {
        name: 'اجاره دفتر کار، مغازه و غرفه',
        slug: 'commercial-rent',
        icon: 'briefcase',
        order: 7,
        attributes: [...rentExtras, ...realEstateAttrs],
      },
      {
        name: 'خرید و فروش دفتر کار و اداری',
        slug: 'office-sale',
        icon: 'office',
        order: 8,
        attributes: [priceRangeAttr, ...realEstateAttrs],
      },
      {
        name: 'اجاره دفتر کار و اداری',
        slug: 'office-rent',
        icon: 'office-rent',
        order: 9,
        attributes: [...rentExtras, ...realEstateAttrs],
      },
      {
        name: 'فروش زمین و کلنگی',
        slug: 'land-sale',
        icon: 'land',
        order: 10,
        attributes: [
          priceRangeAttr,
          { key: 'landArea', label: 'متراژ زمین', type: 'number', required: true },
          { key: 'frontage', label: 'بر زمین (متر)', type: 'number' },
          { key: 'doc', label: 'سند', type: 'select', options: PROPERTY_DOC },
          {
            key: 'zoning',
            label: 'نوع کاربری',
            type: 'select',
            options: [
              'مسکونی',
              'تجاری',
              'اداری',
              'مسکونی-تجاری',
              'صنعتی',
              'کشاورزی',
              'بایر',
              'تفکیکی',
            ],
          },
        ],
      },
      {
        name: 'باغ، ویلا و زمین کشاورزی',
        slug: 'garden-farmland',
        icon: 'tree',
        order: 11,
        attributes: [
          priceRangeAttr,
          { key: 'landArea', label: 'متراژ زمین', type: 'number', required: true },
          { key: 'buildingArea', label: 'متراژ بنا', type: 'number' },
          { key: 'water', label: 'آب', type: 'select', options: YES_NO_OPTIONS },
          { key: 'electricity', label: 'برق', type: 'select', options: YES_NO_OPTIONS },
          { key: 'gas', label: 'گاز', type: 'select', options: YES_NO_OPTIONS },
        ],
      },
      { name: 'پیش‌فروش', slug: 'pre-sale', icon: 'crane', order: 12 },
      { name: 'مشارکت در ساخت', slug: 'construction-partnership', icon: 'handshake', order: 13 },
    ],
  },

  /* 2 ─ Vehicles ─────────────────────────────────────────────────────── */
  {
    name: 'وسایل نقلیه',
    slug: 'vehicles',
    icon: 'car',
    emoji: '🚗',
    order: 2,
    children: [
      {
        name: 'خودرو سواری',
        slug: 'cars',
        icon: 'car',
        order: 1,
        attributes: [priceRangeAttr, ...carAttrs],
      },
      {
        name: 'خودرو کلاسیک',
        slug: 'classic-cars',
        icon: 'classic-car',
        order: 2,
        attributes: [priceRangeAttr, ...carAttrs],
      },
      {
        name: 'وانت',
        slug: 'pickup',
        icon: 'truck',
        order: 3,
        attributes: [priceRangeAttr, ...carAttrs],
      },
      {
        name: 'کامیون، اتوبوس و مینی‌بوس',
        slug: 'heavy-vehicles',
        icon: 'truck-heavy',
        order: 4,
        attributes: [
          priceRangeAttr,
          brandAttr(
            [
              'ایویکو',
              'بنز',
              'هیوندای',
              'ولوو',
              'اسکانیا',
              'فاو',
              'دانگ‌فنگ',
              'فوتون',
              'کاویان',
              'ایسوزو',
              'مزدا',
              'سایر',
            ],
            false,
          ),
          modelAttr(false),
          yearAttr(),
          { key: 'mileage', label: 'کارکرد (کیلومتر)', type: 'number' },
          { key: 'fuel', label: 'سوخت', type: 'select', options: CAR_FUEL },
        ],
      },
      {
        name: 'ماشین‌آلات صنعتی و کشاورزی',
        slug: 'industrial-vehicles',
        icon: 'tractor',
        order: 5,
      },
      {
        name: 'موتورسیکلت',
        slug: 'motorcycles',
        icon: 'motorcycle',
        order: 6,
        attributes: [
          priceRangeAttr,
          brandAttr(
            [
              'هوندا',
              'یاماها',
              'سوزوکی',
              'کاوازاکی',
              'بنلی',
              'دایچی',
              'پیاژو',
              'سی‌اف موتو',
              'گلکسی',
              'تک‌تاز',
              'احسان',
              'کویر موتور',
              'متین',
              'سایر',
            ],
            false,
          ),
          modelAttr(false),
          yearAttr(),
          { key: 'mileage', label: 'کارکرد (کیلومتر)', type: 'number', required: true },
          {
            key: 'cc',
            label: 'حجم موتور (سی‌سی)',
            type: 'select',
            options: ['کمتر از ۱۲۵', '۱۲۵', '۱۵۰', '۲۰۰', '۲۵۰', '۳۰۰ و بیشتر'],
          },
          conditionAttr(),
        ],
      },
      { name: 'قطعات و لوازم جانبی خودرو', slug: 'auto-parts', icon: 'wrench', order: 7 },
      { name: 'قطعات و لوازم جانبی موتورسیکلت', slug: 'motorcycle-parts', icon: 'cog', order: 8 },
      { name: 'لوازم تزئینی خودرو', slug: 'auto-accessories', icon: 'sparkles', order: 9 },
      { name: 'قایق و وسایل آبی', slug: 'boats', icon: 'ship', order: 10 },
    ],
  },

  /* 3 ─ Digital ──────────────────────────────────────────────────────── */
  {
    name: 'کالای دیجیتال',
    slug: 'digital',
    icon: 'smartphone',
    emoji: '📱',
    order: 3,
    children: [
      {
        name: 'موبایل',
        slug: 'mobile-phones',
        icon: 'smartphone',
        order: 1,
        attributes: [priceRangeAttr, ...mobileAttrs],
      },
      {
        name: 'لوازم جانبی موبایل',
        slug: 'mobile-accessories',
        icon: 'cable',
        order: 2,
        attributes: [priceRangeAttr, conditionAttr(COND_TWO)],
      },
      {
        name: 'تبلت',
        slug: 'tablets',
        icon: 'tablet',
        order: 3,
        attributes: [priceRangeAttr, ...mobileAttrs],
      },
      {
        name: 'لپ‌تاپ',
        slug: 'laptops',
        icon: 'laptop',
        order: 4,
        attributes: [priceRangeAttr, ...laptopAttrs],
      },
      {
        name: 'کامپیوتر و قطعات',
        slug: 'computers',
        icon: 'cpu',
        order: 5,
        attributes: [priceRangeAttr, conditionAttr()],
      },
      {
        name: 'مانیتور، پرینتر و اسکنر',
        slug: 'monitors-printers',
        icon: 'monitor',
        order: 6,
        attributes: [priceRangeAttr, conditionAttr()],
      },
      { name: 'تجهیزات شبکه و سرور', slug: 'networking', icon: 'router', order: 7 },
      {
        name: 'کنسول، بازی و سرگرمی',
        slug: 'gaming',
        icon: 'gamepad',
        order: 8,
        attributes: [
          priceRangeAttr,
          brandAttr(['پلی‌استیشن', 'ایکس‌باکس', 'نینتندو', 'استیم‌دک', 'پی‌سی', 'سایر'], false),
          conditionAttr(),
        ],
      },
      {
        name: 'تلویزیون و پروژکتور',
        slug: 'tv',
        icon: 'tv',
        order: 9,
        attributes: [priceRangeAttr, ...tvAttrs],
      },
      {
        name: 'سیستم صوتی و هدفون',
        slug: 'audio',
        icon: 'headphones',
        order: 10,
        attributes: [priceRangeAttr, conditionAttr()],
      },
      {
        name: 'دوربین عکاسی و فیلم‌برداری',
        slug: 'cameras',
        icon: 'camera',
        order: 11,
        attributes: [
          priceRangeAttr,
          brandAttr(
            [
              'کانن',
              'نیکون',
              'سونی',
              'فوجی‌فیلم',
              'پاناسونیک',
              'لایکا',
              'الیمپوس',
              'گوپرو',
              'دی‌جی‌آی',
              'سایر',
            ],
            false,
          ),
          modelAttr(false),
          conditionAttr(),
        ],
      },
      { name: 'ساعت هوشمند و دستبند سلامتی', slug: 'smartwatch', icon: 'watch', order: 12 },
      { name: 'لوازم و تجهیزات هوشمند', slug: 'smart-devices', icon: 'home-smart', order: 13 },
      {
        name: 'سیم‌کارت، رند و کد',
        slug: 'sim-cards',
        icon: 'sim',
        order: 14,
        attributes: [
          priceRangeAttr,
          {
            key: 'operator',
            label: 'اپراتور',
            type: 'select',
            options: ['همراه اول', 'ایرانسل', 'رایتل', 'شاتل موبایل'],
            required: true,
          },
          {
            key: 'simType',
            label: 'نوع سیم‌کارت',
            type: 'select',
            options: ['دائمی', 'اعتباری', 'دیتای اینترنت'],
          },
          { key: 'rond', label: 'رند', type: 'bool' },
        ],
      },
    ],
  },

  /* 4 ─ Home & Kitchen ──────────────────────────────────────────────── */
  {
    name: 'خانه و آشپزخانه',
    slug: 'home-kitchen',
    icon: 'sofa',
    emoji: '🛋️',
    order: 4,
    children: [
      {
        name: 'لوازم خانگی بزرگ',
        slug: 'major-appliances',
        icon: 'fridge',
        order: 1,
        attributes: [
          priceRangeAttr,
          brandAttr(
            [
              'سامسونگ',
              'الجی',
              'اسنوا',
              'بوش',
              'پارس',
              'آبسال',
              'دوو',
              'حایر',
              'هیتاچی',
              'الکترولوکس',
              'پاکشوما',
              'بکو',
              'پلار',
              'سایر',
            ],
            false,
          ),
          conditionAttr(),
        ],
      },
      {
        name: 'لوازم خانگی کوچک',
        slug: 'small-appliances',
        icon: 'blender',
        order: 2,
        attributes: [priceRangeAttr, conditionAttr()],
      },
      { name: 'لوازم آشپزخانه و سرو', slug: 'kitchenware', icon: 'utensils', order: 3 },
      {
        name: 'مبلمان و میز',
        slug: 'furniture',
        icon: 'armchair',
        order: 4,
        attributes: [
          priceRangeAttr,
          conditionAttr(COND_TWO),
          {
            key: 'pieces',
            label: 'تعداد نفرات',
            type: 'select',
            options: ['۳ نفره', '۵ نفره', '۷ نفره', '۹ نفره', 'بیشتر از ۹ نفره'],
          },
        ],
      },
      { name: 'تخت‌خواب و سرویس خواب', slug: 'beds', icon: 'bed', order: 5 },
      { name: 'دکوراسیون و چیدمان', slug: 'decoration', icon: 'frame', order: 6 },
      {
        name: 'فرش، گلیم و موکت',
        slug: 'rugs',
        icon: 'rug',
        order: 7,
        attributes: [
          priceRangeAttr,
          { key: 'size', label: 'متراژ / ابعاد', type: 'text', required: true },
          conditionAttr(COND_TWO),
          {
            key: 'material',
            label: 'جنس',
            type: 'select',
            options: ['اکریلیک', 'پلی‌استر', 'پلی‌پروپیلن', 'پشم', 'ابریشم', 'ترکیبی'],
          },
        ],
      },
      { name: 'لوستر و سیستم روشنایی', slug: 'lighting', icon: 'lamp', order: 8 },
      { name: 'لوازم گرمایش و سرمایش', slug: 'climate-control', icon: 'fan', order: 9 },
      { name: 'گل، گیاه و باغبانی', slug: 'plants-garden', icon: 'leaf', order: 10 },
      { name: 'پرده و کاغذ دیواری', slug: 'curtains', icon: 'curtain', order: 11 },
    ],
  },

  /* 5 ─ Personal items ──────────────────────────────────────────────── */
  {
    name: 'وسایل شخصی',
    slug: 'personal',
    icon: 'shirt',
    emoji: '👜',
    order: 5,
    children: [
      {
        name: 'پوشاک و کفش زنانه',
        slug: 'womens-clothing',
        icon: 'dress',
        order: 1,
        attributes: [
          priceRangeAttr,
          conditionAttr(COND_TWO),
          { key: 'size', label: 'سایز', type: 'text' },
        ],
      },
      {
        name: 'پوشاک و کفش مردانه',
        slug: 'mens-clothing',
        icon: 'shirt',
        order: 2,
        attributes: [
          priceRangeAttr,
          conditionAttr(COND_TWO),
          { key: 'size', label: 'سایز', type: 'text' },
        ],
      },
      { name: 'پوشاک و کفش بچگانه و نوزاد', slug: 'kids-clothing', icon: 'baby-clothes', order: 3 },
      {
        name: 'ساعت',
        slug: 'watches',
        icon: 'watch',
        order: 4,
        attributes: [priceRangeAttr, conditionAttr()],
      },
      {
        name: 'طلا، نقره و زیورآلات',
        slug: 'jewelry',
        icon: 'gem',
        order: 5,
        attributes: [
          priceRangeAttr,
          {
            key: 'material',
            label: 'جنس',
            type: 'select',
            options: ['طلا', 'نقره', 'بدلیجات', 'سنگ‌های قیمتی', 'سایر'],
            required: true,
          },
          conditionAttr(COND_TWO),
        ],
      },
      { name: 'عطر، آرایش و بهداشت', slug: 'beauty', icon: 'sparkles', order: 6 },
      { name: 'کالای نوزاد و کودک', slug: 'baby-kids', icon: 'baby', order: 7 },
      { name: 'عینک و لنز', slug: 'eyewear', icon: 'glasses', order: 8 },
      { name: 'کیف و کوله', slug: 'bags', icon: 'bag', order: 9 },
    ],
  },

  /* 6 ─ Leisure ─────────────────────────────────────────────────────── */
  {
    name: 'سرگرمی و فراغت',
    slug: 'leisure',
    icon: 'music',
    emoji: '🎮',
    order: 6,
    children: [
      { name: 'کتاب، مجله و فیلم آموزشی', slug: 'books', icon: 'book', order: 1 },
      { name: 'آلات موسیقی، صوتی و نوری', slug: 'instruments', icon: 'guitar', order: 2 },
      { name: 'آثار هنری و سرگرمی', slug: 'art', icon: 'palette', order: 3 },
      { name: 'اسباب‌بازی و بازی‌های فکری', slug: 'toys', icon: 'toy-brick', order: 4 },
      { name: 'اشیاء عتیقه و کلکسیونی', slug: 'antiques', icon: 'gem-stone', order: 5 },
      {
        name: 'لوازم ورزشی و کمپینگ',
        slug: 'sports',
        icon: 'dumbbell',
        order: 6,
        attributes: [priceRangeAttr, conditionAttr()],
      },
      {
        name: 'دوچرخه و اسکیت',
        slug: 'bicycles',
        icon: 'bike',
        order: 7,
        attributes: [
          priceRangeAttr,
          {
            key: 'kind',
            label: 'نوع',
            type: 'select',
            options: [
              'کوهستان',
              'شهری',
              'بچگانه',
              'ثابت',
              'برقی',
              'تاشو',
              'تریال',
              'BMX',
              'مسابقه‌ای',
              'سایر',
            ],
          },
          { key: 'frameSize', label: 'سایز فریم', type: 'text' },
          conditionAttr(COND_TWO),
        ],
      },
      { name: 'وسایل کوهنوردی، شکار و ماهیگیری', slug: 'outdoor', icon: 'mountain', order: 8 },
      { name: 'بلیط، تور و سفر', slug: 'tickets-tours', icon: 'plane', order: 9 },
    ],
  },

  /* 7 ─ Animals ─────────────────────────────────────────────────────── */
  {
    name: 'حیوانات',
    slug: 'animals',
    icon: 'paw',
    emoji: '🐾',
    order: 7,
    children: [
      {
        name: 'سگ',
        slug: 'dogs',
        icon: 'dog',
        order: 1,
        attributes: [
          priceRangeAttr,
          { key: 'breed', label: 'نژاد', type: 'text' },
          { key: 'gender', label: 'جنسیت', type: 'select', options: ['نر', 'ماده'] },
          { key: 'age', label: 'سن', type: 'text' },
          { key: 'vaccinated', label: 'واکسیناسیون', type: 'select', options: YES_NO_OPTIONS },
        ],
      },
      { name: 'گربه', slug: 'cats', icon: 'cat', order: 2 },
      { name: 'پرندگان', slug: 'birds', icon: 'bird', order: 3 },
      { name: 'ماهی و آبزیان', slug: 'fish', icon: 'fish', order: 4 },
      { name: 'دام، طیور و حیوانات دیگر', slug: 'livestock', icon: 'cow', order: 5 },
      { name: 'لوازم حیوانات خانگی', slug: 'pet-supplies', icon: 'bone', order: 6 },
    ],
  },

  /* 8 ─ Industrial ──────────────────────────────────────────────────── */
  {
    name: 'تجهیزات و صنعتی',
    slug: 'industrial',
    icon: 'factory',
    emoji: '🏭',
    order: 8,
    children: [
      { name: 'مواد اولیه و قطعات صنعتی', slug: 'raw-materials', icon: 'box', order: 1 },
      { name: 'ابزار آلات', slug: 'tools', icon: 'wrench', order: 2 },
      {
        name: 'تجهیزات صنعتی، تجاری و اداری',
        slug: 'commercial-equipment',
        icon: 'briefcase',
        order: 3,
      },
      { name: 'ماشین‌آلات و خط تولید', slug: 'machinery', icon: 'cog', order: 4 },
      {
        name: 'تجهیزات پزشکی و آزمایشگاهی',
        slug: 'medical-equipment',
        icon: 'stethoscope',
        order: 5,
      },
      { name: 'تجهیزات نظافت صنعتی و خانگی', slug: 'cleaning-equipment', icon: 'spray', order: 6 },
      { name: 'محصولات کشاورزی، دامداری و صنعتی', slug: 'agricultural', icon: 'wheat', order: 7 },
    ],
  },

  /* 9 ─ Services ────────────────────────────────────────────────────── */
  {
    name: 'خدمات',
    slug: 'services',
    icon: 'handshake',
    emoji: '🛠️',
    order: 9,
    children: [
      { name: 'خدمات سفر و حمل و نقل', slug: 'transport-services', icon: 'truck', order: 1 },
      { name: 'ساختمانی و نظافت', slug: 'construction-services', icon: 'hard-hat', order: 2 },
      { name: 'خدمات خودرو', slug: 'auto-services', icon: 'car-wrench', order: 3 },
      { name: 'کسب و کار، تبلیغات و چاپ', slug: 'business-services', icon: 'megaphone', order: 4 },
      { name: 'آرایشی و سلامت', slug: 'beauty-services', icon: 'scissors', order: 5 },
      { name: 'مالی، حقوقی و بیمه', slug: 'financial-services', icon: 'calculator', order: 6 },
      { name: 'کلاس، آموزش و مشاوره', slug: 'education-services', icon: 'graduation', order: 7 },
      { name: 'باغبانی، حیوانات و گیاهان', slug: 'garden-services', icon: 'leaf', order: 8 },
      { name: 'موبایل، کامپیوتر و اینترنت', slug: 'it-services', icon: 'laptop', order: 9 },
      { name: 'رویداد، عکاسی و فیلم‌برداری', slug: 'event-services', icon: 'camera', order: 10 },
      { name: 'موسیقی، رقص و هنر', slug: 'art-services', icon: 'music', order: 11 },
      { name: 'تعمیرات لوازم خانگی', slug: 'appliance-repair', icon: 'wrench-tool', order: 12 },
    ],
  },

  /* 10 ─ Jobs ───────────────────────────────────────────────────────── */
  {
    name: 'استخدام و کاریابی',
    slug: 'jobs',
    icon: 'briefcase',
    emoji: '💼',
    order: 10,
    children: [
      {
        name: 'اداری، منشی‌گری و مدیریت',
        slug: 'admin-jobs',
        icon: 'building',
        order: 1,
        attributes: jobAttrs,
      },
      {
        name: 'فروشندگی و بازاریابی',
        slug: 'sales-jobs',
        icon: 'chart',
        order: 2,
        attributes: jobAttrs,
      },
      {
        name: 'خدمات و پشتیبانی مشتری',
        slug: 'service-jobs',
        icon: 'headset',
        order: 3,
        attributes: jobAttrs,
      },
      {
        name: 'مالی و حسابداری',
        slug: 'finance-jobs',
        icon: 'calculator',
        order: 4,
        attributes: jobAttrs,
      },
      {
        name: 'حمل و نقل و راننده',
        slug: 'driver-jobs',
        icon: 'truck',
        order: 5,
        attributes: jobAttrs,
      },
      {
        name: 'آشپز، کافی‌من و گارسون',
        slug: 'food-jobs',
        icon: 'utensils',
        order: 6,
        attributes: jobAttrs,
      },
      {
        name: 'مهندسی، فنی و آی‌تی',
        slug: 'engineering-jobs',
        icon: 'cog',
        order: 7,
        attributes: jobAttrs,
      },
      {
        name: 'پزشک، پرستار و سلامت',
        slug: 'health-jobs',
        icon: 'stethoscope',
        order: 8,
        attributes: jobAttrs,
      },
      {
        name: 'آموزش، پژوهش و دانشگاه',
        slug: 'education-jobs',
        icon: 'book',
        order: 9,
        attributes: jobAttrs,
      },
      {
        name: 'طراحی، گرافیک و دیجیتال مارکتینگ',
        slug: 'design-jobs',
        icon: 'palette',
        order: 10,
        attributes: jobAttrs,
      },
      {
        name: 'نظافت و خدمات شهری',
        slug: 'cleaning-jobs',
        icon: 'broom',
        order: 11,
        attributes: jobAttrs,
      },
      {
        name: 'نگهبانی، حفاظت و امنیت',
        slug: 'security-jobs',
        icon: 'shield',
        order: 12,
        attributes: jobAttrs,
      },
      {
        name: 'خیاطی، تولید و کارگاهی',
        slug: 'workshop-jobs',
        icon: 'scissors',
        order: 13,
        attributes: jobAttrs,
      },
      {
        name: 'معماری و عمران',
        slug: 'architecture-jobs',
        icon: 'compass',
        order: 14,
        attributes: jobAttrs,
      },
    ],
  },

  /* 11 ─ Social ─────────────────────────────────────────────────────── */
  {
    name: 'اجتماعی',
    slug: 'social',
    icon: 'users',
    emoji: '🤝',
    order: 11,
    children: [
      { name: 'رویداد، کنفرانس و کلاس', slug: 'events', icon: 'calendar', order: 1 },
      { name: 'داوطلبانه و خیریه', slug: 'charity', icon: 'heart', order: 2 },
      { name: 'گمشده‌ها و پیداشده‌ها', slug: 'lost-found', icon: 'search', order: 3 },
      { name: 'دوست‌یابی و گفتگو', slug: 'community', icon: 'chat-circle', order: 4 },
    ],
  },
];

/** Quick lookup of root-category metadata for chips on Explore / Home. */
export const ROOT_CATEGORIES = DIVAR_CATEGORIES.map((c) => ({
  name: c.name,
  slug: c.slug,
  icon: c.icon,
  emoji: c.emoji,
  childrenCount: c.children?.length ?? 0,
}));

const countLeaves = (items: CategorySeed[]): number =>
  items.reduce((n, c) => n + (c.children?.length ? countLeaves(c.children) : 1), 0);

export const CATEGORY_COUNTS = {
  roots: DIVAR_CATEGORIES.length,
  leaves: countLeaves(DIVAR_CATEGORIES),
};

export const BOOST_PLANS = [
  {
    name: 'نردبان ۲۴ ساعته',
    durationHours: 24,
    price: 10000,
    description: 'آگهی شما ۲۴ ساعت در بالای فید نمایش داده می‌شود',
  },
  {
    name: 'نردبان ۷ روزه',
    durationHours: 168,
    price: 50000,
    description: 'آگهی شما ۷ روز در بالای فید و explore نمایش داده می‌شود',
  },
  {
    name: 'نردبان ۳۰ روزه ویژه',
    durationHours: 720,
    price: 200000,
    description: 'آگهی شما ۳۰ روز با اولویت بالا در همه بخش‌ها نمایش داده می‌شود',
  },
];

/* Re-export the new locations for backward compatibility of the old import path. */
export { IRAN_PROVINCES, IRAN_CITIES_FLAT, IRAN_LOCATION_COUNTS } from './iran-locations';
export type { ProvinceSeed } from './iran-locations';
