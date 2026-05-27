import { BadRequestException, Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { LocationsService } from './locations.service';
import { NeshanService } from './neshan.service';

@Public()
@Controller('locations')
export class LocationsController {
  constructor(
    private readonly service: LocationsService,
    private readonly neshan: NeshanService,
  ) {}

  @Get('provinces')
  provinces() {
    return this.service.getProvinces();
  }

  @Get('provinces/:id/cities')
  cities(@Param('id') id: string) {
    return this.service.getCitiesByProvince(id);
  }

  @Get('cities/:id/neighborhoods')
  neighborhoods(@Param('id') id: string) {
    return this.service.getNeighborhoods(id);
  }

  @Get('search')
  search(@Query('q') q: string) {
    if (!q || q.length < 2) return [];
    return this.service.search(q);
  }

  /**
   * Reverse-geocode coordinates → Persian address (Neshan).
   * GET /locations/reverse?lat=35.7&lng=51.4
   */
  @Get('reverse')
  reverse(@Query('lat') latRaw: string, @Query('lng') lngRaw: string) {
    const lat = Number(latRaw);
    const lng = Number(lngRaw);
    if (!isFinite(lat) || !isFinite(lng)) {
      throw new BadRequestException('lat و lng معتبر لازم است');
    }
    return this.neshan.reverse(lat, lng);
  }

  /**
   * Forward-geocode an address → coordinates (Neshan).
   * GET /locations/geocode?address=...
   */
  @Get('geocode')
  geocode(@Query('address') address: string) {
    if (!address || address.trim().length < 2) {
      throw new BadRequestException('آدرس باید حداقل ۲ کاراکتر باشد');
    }
    return this.neshan.geocode(address.trim());
  }

  /**
   * Place autocomplete around a center (defaults to Tehran).
   * GET /locations/search-places?term=کافه&lat=...&lng=...
   */
  @Get('search-places')
  searchPlaces(
    @Query('term') term: string,
    @Query('lat') latRaw?: string,
    @Query('lng') lngRaw?: string,
  ) {
    if (!term || term.trim().length < 2) return { count: 0, items: [] };
    const lat = latRaw != null ? Number(latRaw) : undefined;
    const lng = lngRaw != null ? Number(lngRaw) : undefined;
    return this.neshan.searchPlaces(
      term.trim(),
      isFinite(lat as number) ? lat : undefined,
      isFinite(lng as number) ? lng : undefined,
    );
  }
}
