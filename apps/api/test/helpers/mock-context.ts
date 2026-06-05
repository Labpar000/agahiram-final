import type { ExecutionContext } from '@nestjs/common';

export function createMockExecutionContext(user?: Record<string, unknown>): ExecutionContext {
  const request = { user };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
      getNext: () => undefined,
    }),
    getHandler: () => function handler() {},
    getClass: () => class MockClass {},
    getArgs: () => [],
    getArgByIndex: () => undefined,
    switchToRpc: () => ({ getContext: () => ({}), getData: () => ({}) }),
    switchToWs: () => ({ getClient: () => ({}), getData: () => ({}), getPattern: () => '' }),
    getType: () => 'http',
  } as ExecutionContext;
}
