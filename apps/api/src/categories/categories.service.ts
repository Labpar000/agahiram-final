import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { DIVAR_CATEGORIES, type CategorySeed } from '@agahiram/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService implements OnModuleInit {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Reference categories must exist for the create-post flow (step 2) and the
   * explore filters to render anything. If the table is empty — e.g. on a fresh
   * database where the standalone `db:seed` script was never run — bootstrap the
   * taxonomy from the bundled `DIVAR_CATEGORIES` constants so the app is usable
   * out of the box. This is idempotent: it only runs when the table is empty.
   */
  async onModuleInit() {
    try {
      const count = await this.prisma.category.count();
      if (count > 0) return;
      this.logger.warn('Category table is empty — seeding default taxonomy…');
      await this.seedDefaults();
      const seeded = await this.prisma.category.count();
      this.logger.log(`Seeded ${seeded} categories from bundled taxonomy.`);
    } catch (err) {
      // Never block API startup on seeding; surface the issue in logs instead.
      this.logger.error(
        `Category bootstrap-seed failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private async seedDefaults() {
    const upsert = async (cat: CategorySeed, parentId: string | null) => {
      const row = await this.prisma.category.upsert({
        where: { slug: cat.slug },
        update: { name: cat.name, icon: cat.icon, order: cat.order, parentId },
        create: { name: cat.name, slug: cat.slug, icon: cat.icon, order: cat.order, parentId },
      });

      for (let i = 0; i < (cat.attributes?.length ?? 0); i++) {
        const attr = cat.attributes![i]!;
        await this.prisma.categoryAttribute.upsert({
          where: { categoryId_key: { categoryId: row.id, key: attr.key } },
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

      for (const child of cat.children ?? []) {
        await upsert(child, row.id);
      }
    };

    for (const root of DIVAR_CATEGORIES) {
      await upsert(root, null);
    }
  }

  async getTree() {
    const all = await this.prisma.category.findMany({
      include: { attributes: { orderBy: { order: 'asc' } } },
      orderBy: { order: 'asc' },
    });
    const byParent = new Map<string | null, typeof all>();
    for (const cat of all) {
      const key = cat.parentId;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(cat);
    }
    const build = (parentId: string | null): unknown[] =>
      (byParent.get(parentId) ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        parentId: c.parentId,
        icon: c.icon,
        order: c.order,
        attributes: c.attributes,
        children: build(c.id),
      }));
    return build(null);
  }

  async getDescendantIds(id: string) {
    const all = await this.prisma.category.findMany({
      select: { id: true, parentId: true },
    });
    const byParent = new Map<string | null, string[]>();
    for (const c of all) {
      if (!byParent.has(c.parentId)) byParent.set(c.parentId, []);
      byParent.get(c.parentId)!.push(c.id);
    }
    const out = new Set<string>([id]);
    const visit = (parentId: string) => {
      for (const childId of byParent.get(parentId) ?? []) {
        if (out.has(childId)) continue;
        out.add(childId);
        visit(childId);
      }
    };
    visit(id);
    return [...out];
  }

  async getById(id: string) {
    const cat = await this.prisma.category.findUnique({
      where: { id },
      include: { attributes: { orderBy: { order: 'asc' } } },
    });
    if (!cat) throw new NotFoundException('دسته یافت نشد');
    return cat;
  }

  async getBySlug(slug: string) {
    const cat = await this.prisma.category.findUnique({
      where: { slug },
      include: { attributes: { orderBy: { order: 'asc' } } },
    });
    if (!cat) throw new NotFoundException('دسته یافت نشد');
    return cat;
  }
}
