import { PrismaClient } from '@prisma/client';
import {
  ADMIN_PHONES,
  DIVAR_CATEGORIES,
  IRAN_PROVINCES,
  BOOST_PLANS,
  cityToSlug,
} from '@agahiram/shared/constants';

const prisma = new PrismaClient();

async function seedCategories() {
  console.log('Seeding categories...');

  for (const rootCat of DIVAR_CATEGORIES) {
    const parent = await prisma.category.upsert({
      where: { slug: rootCat.slug },
      update: { name: rootCat.name, icon: rootCat.icon, order: rootCat.order },
      create: {
        name: rootCat.name,
        slug: rootCat.slug,
        icon: rootCat.icon,
        order: rootCat.order,
      },
    });

    if (rootCat.children) {
      for (const child of rootCat.children) {
        const childCat = await prisma.category.upsert({
          where: { slug: child.slug },
          update: {
            name: child.name,
            icon: child.icon,
            order: child.order,
            parentId: parent.id,
          },
          create: {
            name: child.name,
            slug: child.slug,
            icon: child.icon,
            order: child.order,
            parentId: parent.id,
          },
        });

        if (child.attributes) {
          for (let i = 0; i < child.attributes.length; i++) {
            const attr = child.attributes[i];
            await prisma.categoryAttribute.upsert({
              where: {
                categoryId_key: { categoryId: childCat.id, key: attr.key },
              },
              update: {
                label: attr.label,
                type: attr.type,
                options: attr.options ?? [],
                required: attr.required ?? false,
                order: i,
              },
              create: {
                categoryId: childCat.id,
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
      }
    }
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

async function seedAdmin() {
  console.log('Seeding admin users...');

  for (let i = 0; i < ADMIN_PHONES.length; i++) {
    const phone = ADMIN_PHONES[i]!;
    await prisma.user.upsert({
      where: { phone },
      update: { role: 'admin', isVerified: true },
      create: {
        phone,
        name: 'مدیر سیستم',
        username: i === 0 ? 'admin' : `admin${i + 1}`,
        role: 'admin',
        isVerified: true,
      },
    });
  }

  console.log(`Admin users seeded (phones: ${ADMIN_PHONES.join(', ')}).`);
}

async function main() {
  await seedCategories();
  await seedLocations();
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
