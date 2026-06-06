import { PrismaClient } from '@prisma/client';
import {
  DIVAR_CATEGORIES,
  IRAN_PROVINCES,
  BOOST_PLANS,
  cityToSlug,
} from '@agahiram/shared/constants';

const prisma = new PrismaClient();

async function seedCategories() {
  console.log('Seeding categories...');

  const upsertCategory = async (
    cat: (typeof DIVAR_CATEGORIES)[number],
    parentId: string | null,
  ) => {
    const row = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, icon: cat.icon, order: cat.order, parentId },
      create: {
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        order: cat.order,
        parentId,
      },
    });

    if (cat.attributes) {
      for (let i = 0; i < cat.attributes.length; i++) {
        const attr = cat.attributes[i]!;
        await prisma.categoryAttribute.upsert({
          where: {
            categoryId_key: { categoryId: row.id, key: attr.key },
          },
          update: {
            label: attr.label,
            type: attr.type,
            options: attr.options ?? [],
            required: attr.required ?? false,
            order: i,
          },
          create: {
            categoryId: row.id,
            key: attr.key,
            label: attr.label,
            type: attr.type,
            options: attr.options ?? [],
            required: attr.required ?? false,
            order: i,
          },
        });
      }
    }

    for (const child of cat.children ?? []) {
      await upsertCategory(child, row.id);
    }
  };

  for (const rootCat of DIVAR_CATEGORIES) {
    await upsertCategory(rootCat, null);
  }

  console.log('Categories seeded.');
}

async function seedLocations() {
  console.log('Seeding provinces and cities...');

  let totalCities = 0;
  for (const province of IRAN_PROVINCES) {
    /**
     * Upsert by Persian `name` (stable, @unique) rather than by `slug`, because
     * a previous run may have created the same province with a different slug
     * (e.g. `chaharmahal` vs `chaharmahal-bakhtiari`). Keying off the name lets
     * us migrate slugs in-place without violating the unique-name constraint.
     */
    const prov = await prisma.province.upsert({
      where: { name: province.name },
      update: { slug: province.slug },
      create: { name: province.name, slug: province.slug },
    });

    for (let i = 0; i < province.cities.length; i++) {
      const cityName = province.cities[i]!;
      const citySlug = cityToSlug(province.slug, cityName, i === 0);
      /**
       * Same trick for cities: a city is uniquely identified by
       * (provinceId, name) in practice — try to find an existing row first
       * and update its slug if needed; otherwise create.
       */
      const existing = await prisma.city.findFirst({
        where: { provinceId: prov.id, name: cityName },
        select: { id: true, slug: true },
      });
      if (existing) {
        if (existing.slug !== citySlug) {
          /* Only update slug if it actually changed AND the new slug is free. */
          const clash = await prisma.city.findUnique({ where: { slug: citySlug } });
          if (!clash || clash.id === existing.id) {
            await prisma.city.update({ where: { id: existing.id }, data: { slug: citySlug } });
          }
        }
      } else {
        /* Use slug as the create path — if the slug clashes globally we skip. */
        const clash = await prisma.city.findUnique({ where: { slug: citySlug } });
        if (!clash) {
          await prisma.city.create({
            data: { name: cityName, slug: citySlug, provinceId: prov.id },
          });
        }
      }
      totalCities++;
    }
  }

  console.log(`Locations seeded: ${IRAN_PROVINCES.length} provinces, ${totalCities} cities.`);
}

/** Sample neighborhoods for major cities — enough for filters and admin QA. */
const SAMPLE_NEIGHBORHOODS: Record<string, Array<{ name: string; slug: string }>> = {
  tehran: [
    { name: 'ونک', slug: 'vanak' },
    { name: 'سعادت‌آباد', slug: 'saadat-abad' },
    { name: 'پونک', slug: 'punak' },
    { name: 'نیاوران', slug: 'niavaran' },
    { name: 'تهرانپارس', slug: 'tehranpars' },
  ],
  isfahan: [
    { name: 'چهارباغ', slug: 'chahar-bagh' },
    { name: 'سی‌وسه‌پل', slug: 'si-o-se-pol' },
    { name: 'خیابان شیخ بهایی', slug: 'sheikh-bahaei' },
  ],
  shiraz: [
    { name: 'معالی‌آباد', slug: 'maali-abad' },
    { name: 'ستارخان', slug: 'sattarkhan' },
    { name: 'قدوسی', slug: 'ghodusi' },
  ],
};

async function seedNeighborhoods() {
  console.log('Seeding sample neighborhoods...');
  let count = 0;

  for (const [citySlug, neighborhoods] of Object.entries(SAMPLE_NEIGHBORHOODS)) {
    const city = await prisma.city.findUnique({ where: { slug: citySlug } });
    if (!city) continue;

    for (const n of neighborhoods) {
      await prisma.neighborhood.upsert({
        where: { cityId_slug: { cityId: city.id, slug: n.slug } },
        update: { name: n.name },
        create: { cityId: city.id, name: n.name, slug: n.slug },
      });
      count++;
    }
  }

  console.log(`Neighborhoods seeded: ${count} rows.`);
}

async function seedBoostPlans() {
  console.log('Seeding boost plans...');

  for (const plan of BOOST_PLANS) {
    const existing = await prisma.boostPlan.findFirst({
      where: { name: plan.name },
    });

    if (existing) {
      await prisma.boostPlan.update({
        where: { id: existing.id },
        data: plan,
      });
    } else {
      await prisma.boostPlan.create({ data: plan });
    }
  }

  console.log('Boost plans seeded.');
}

/** Dev-only fallback when ADMIN_PHONES is unset. Must match apps/api/src/config/admin-phones.ts */
const DEV_FALLBACK_ADMIN_PHONES = ['09100000001', '09100000002'] as const;

function getSeedAdminPhones(): string[] {
  const raw = process.env.ADMIN_PHONES?.trim();
  if (raw) {
    return raw
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
  }
  if (process.env.NODE_ENV === 'production') {
    console.warn('ADMIN_PHONES not set — skipping admin user seed in production');
    return [];
  }
  return [...DEV_FALLBACK_ADMIN_PHONES];
}

async function seedAdmin() {
  console.log('Seeding admin users...');
  const adminPhones = getSeedAdminPhones();
  if (adminPhones.length === 0) {
    console.log('No admin phones configured — admin seed skipped.');
    return;
  }

  for (let i = 0; i < adminPhones.length; i++) {
    const phone = adminPhones[i]!;
    const preferredUsername = i === 0 ? 'admin' : `admin${i + 1}`;

    /* Check if the preferred username is already taken by a *different* user. */
    const usernameOwner = await prisma.user.findUnique({ where: { username: preferredUsername } });
    const usernameConflict = usernameOwner && usernameOwner.phone !== phone;

    /* If the username is taken by someone else, promote that user to admin and
     * skip creating a duplicate. Otherwise upsert normally. */
    if (usernameConflict) {
      await prisma.user.update({
        where: { username: preferredUsername },
        data: { role: 'admin', isVerified: true },
      });
      console.log(
        `Username '${preferredUsername}' already exists — promoted existing user to admin.`,
      );
      continue;
    }

    await prisma.user.upsert({
      where: { phone },
      update: { role: 'admin', isVerified: true },
      create: {
        phone,
        name: 'مدیر سیستم',
        username: preferredUsername,
        role: 'admin',
        isVerified: true,
      },
    });
  }

  console.log(`Admin users seeded (phones: ${adminPhones.join(', ')}).`);
}

async function main() {
  await seedCategories();
  await seedLocations();
  await seedNeighborhoods();
  await seedBoostPlans();
  await seedAdmin();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
