import { Module } from '@nestjs/common';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';
import { MapirService } from './mapir.service';

@Module({
  controllers: [LocationsController],
  providers: [LocationsService, MapirService],
  exports: [LocationsService, MapirService],
})
export class LocationsModule {}
