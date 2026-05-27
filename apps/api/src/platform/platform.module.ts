import { Global, Module } from '@nestjs/common';
import { SettingsService } from '../admin/settings.service';
import { AuditLogService } from '../admin/audit-log.service';

/**
 * Cross-cutting platform services (settings + audit log) live in their own
 * @Global module so any feature module can inject them without creating a
 * dependency edge to AdminModule. Admin still re-exports them for the public
 * read endpoints, but consumers (AuthService, MaintenanceGuard, …) reach for
 * the global provider here.
 */
@Global()
@Module({
  providers: [SettingsService, AuditLogService],
  exports: [SettingsService, AuditLogService],
})
export class PlatformModule {}
