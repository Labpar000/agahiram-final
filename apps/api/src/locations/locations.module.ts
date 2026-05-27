import { Module } from '@nestjs/common';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';
import { NeshanService } from './neshan.service';

@Module({
  controllers: [LocationsController],
  providers: [LocationsService, NeshanService],
  exports: [LocationsService, NeshanService],
})
export class LocationsModule {}
