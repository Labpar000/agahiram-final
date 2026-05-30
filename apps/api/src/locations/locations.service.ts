import { Injectable } from '@nestjs/common';
import { normalizePersianText } from '@agahiram/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  getProvinces() {
    return this.prisma.province.findMany({ orderBy: { name: 'asc' } });
  }

  getCitiesByProvince(provinceId: string) {
    return this.prisma.city.findMany({
      where: { provinceId },
      orderBy: { name: 'asc' },
    });
  }

  getNeighborhoods(cityId: string) {
    return this.prisma.neighborhood.findMany({
      where: { cityId },
      orderBy: { name: 'asc' },
    });
  }

  async getCityById(id: string) {
    return this.prisma.city.findUnique({
      where: { id },
      include: { province: true },
    });
  }

  async search(query: string, limit = 10) {
    const q = normalizePersianText(query) || query;
    return this.prisma.city.findMany({
      where: { name: { contains: q, mode: 'insensitive' } },
      include: { province: true },
      take: limit,
    });
  }
}
