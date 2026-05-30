import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PIC = (s: number) => `https://picsum.photos/seed/agahiram-${s}/800/800`;
const THUMB = (s: number) => `https://picsum.photos/seed/agahiram-${s}/300/300`;

const SAMPLES: Array<{
  title: string;
  description: string;
  price: bigint | number;
  catSlug: string;
}> = [
  {
    title: 'آیفون ۱۵ پرو مکس ۲۵۶ گیگ گلوبال',
    description: 'دست‌دوم در حد نو، باتری ۹۸٪، رنگ تیتانیوم طبیعی، جعبه و لوازم کامل.',
    price: 88_000_000,
    catSlug: 'mobile-phones',
  },
  {
    title: 'پژو ۲۰۶ تیپ ۲ مدل ۱۳۹۸',
    description: 'بیمه کامل، فنی سالم، بدنه بدون رنگ، کارکرد ۸۵ هزار، خاص پسند.',
    price: 320_000_000,
    catSlug: 'cars',
  },
  {
    title: 'آپارتمان ۸۵ متری ۲ خواب در سعادت‌آباد',
    description: 'طبقه سوم، آسانسور، پارکینگ، انباری، طرح نوساز، نور عالی، فروش فوری.',
    price: 8_500_000_000n,
    catSlug: 'residential-sale',
  },
  {
    title: 'مک‌بوک پرو ۱۴ اینچ M3 ۱۶/۵۱۲',
    description: 'پلمب، گارانتی ۱۸ ماه شرکت اپل، فاقد هرگونه خط و خش.',
    price: 165_000_000,
    catSlug: 'laptops',
  },
  {
    title: 'مبل راحتی ۹ نفره سلطنتی',
    description: 'پارچه ضد آب، چوب راش، رنگ کرم، تحویل در محل.',
    price: 24_500_000,
    catSlug: 'furniture',
  },
  {
    title: 'دوربین کانن EOS R6 mark II',
    description: 'بدنه + لنز ۲۴-۱۰۵، شاتر ۸ هزار، گارانتی شرکتی.',
    price: 145_000_000,
    catSlug: 'cameras',
  },
];

async function main() {
  const user = await prisma.user.findFirst({ where: { phone: '09120000000' } });
  if (!user) throw new Error('Admin user not found - run seed first');

  const tehranProvince = await prisma.province.findFirst({
    where: { OR: [{ name: 'تهران' }, { slug: 'tehran' }] },
  });
  if (!tehranProvince) throw new Error('Tehran province not found');
  const tehran =
    (await prisma.city.findFirst({
      where: { provinceId: tehranProvince.id, name: { contains: 'تهران' } },
    })) ?? (await prisma.city.findFirst({ where: { provinceId: tehranProvince.id } }));
  if (!tehran) throw new Error('Tehran city not found');
  console.log(`Using city: ${tehran.name} (${tehran.slug})`);

  console.log('Seeding sample posts...');

  for (let i = 0; i < SAMPLES.length; i++) {
    const s = SAMPLES[i]!;
    const category = await prisma.category.findUnique({ where: { slug: s.catSlug } });
    if (!category) {
      console.warn(`Category ${s.catSlug} not found, skipping ${s.title}`);
      continue;
    }
    const seed = 100 + i * 7;
    await prisma.post.create({
      data: {
        userId: user.id,
        categoryId: category.id,
        cityId: tehran.id,
        title: s.title,
        description: s.description,
        price: typeof s.price === 'bigint' ? s.price : BigInt(s.price),
        priceType: 'fixed',
        type: 'post',
        status: 'approved',
        isPromoted: i === 0,
        viewCount: 50 + i * 30,
        media: {
          create: [
            {
              url: PIC(seed),
              thumbnailUrl: THUMB(seed),
              type: 'image',
              order: 0,
              width: 800,
              height: 800,
            },
            {
              url: PIC(seed + 1),
              thumbnailUrl: THUMB(seed + 1),
              type: 'image',
              order: 1,
              width: 800,
              height: 800,
            },
          ],
        },
      },
    });
  }

  console.log(`Created ${SAMPLES.length} sample posts.`);

  const mobileCategory = await prisma.category.findUnique({ where: { slug: 'mobile-phones' } });
  if (mobileCategory) {
    await prisma.post.create({
      data: {
        userId: user.id,
        categoryId: mobileCategory.id,
        cityId: tehran.id,
        title: 'ویدیو معرفی آیفون ۱۵ پرو',
        description: 'نمایش کوتاه از ظاهر و قابلیت‌های گوشی.',
        price: 88_000_000n,
        priceType: 'fixed',
        type: 'reel',
        status: 'approved',
        viewCount: 120,
        media: {
          create: [
            {
              url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
              thumbnailUrl: PIC(999),
              type: 'video',
              order: 0,
              width: 720,
              height: 1280,
            },
          ],
        },
      },
    });
    console.log('Created sample reel.');
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().finally(() => process.exit(1));
  });
