import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

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
        icon: c.icon,
        order: c.order,
        attributes: c.attributes,
        children: build(c.id),
      }));
    return build(null);
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
