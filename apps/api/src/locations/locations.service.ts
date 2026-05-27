import { Injectable } from '@nestjs/common';
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

  async search(query: string, limit = 10) {
    return this.prisma.city.findMany({
      where: { name: { contains: query, mode: 'insensitive' } },
      include: { province: true },
      take: limit,
    });
  }
}
