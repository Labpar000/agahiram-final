import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { UserRole } from '@agahiram/shared';
import { RolesGuard } from '../src/auth/roles.guard';
import { createMockExecutionContext } from './helpers/mock-context';

describe('RolesGuard', () => {
  const reflector = {
    getAllAndOverride: <T>(_key: string, _targets: unknown[]): T | undefined => undefined,
  } as Reflector;

  it('allows access when no roles are required', () => {
    const guard = new RolesGuard(reflector);
    const context = createMockExecutionContext({ role: UserRole.USER, phone: '09120000000' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects users without required role', () => {
    const guard = new RolesGuard({
      getAllAndOverride: () => [UserRole.ADMIN],
    } as Reflector);
    const context = createMockExecutionContext({ role: UserRole.USER, phone: '09120000000' });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('rejects elevated roles when phone is not on admin allowlist', () => {
    const guard = new RolesGuard({
      getAllAndOverride: () => [UserRole.ADMIN],
    } as Reflector);
    const context = createMockExecutionContext({ role: UserRole.ADMIN, phone: '09999999999' });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('allows allowlisted admin phones', () => {
    const guard = new RolesGuard({
      getAllAndOverride: () => [UserRole.ADMIN],
    } as Reflector);
    const context = createMockExecutionContext({ role: UserRole.ADMIN, phone: '09120000000' });

    expect(guard.canActivate(context)).toBe(true);
  });
});
