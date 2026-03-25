import type { AppBootstrapOptions, AppConfig } from '@/infrastructure/app/http/app-config.service';

import { TEST_AUTH_COOKIES, TEST_CONFIG, TEST_HEADERS } from './defaults';

export { TEST_AUTH_COOKIES, TEST_CONFIG, TEST_HEADERS };

export const createTestEnvOverrides = (overrides: Partial<AppConfig> = {}): Partial<AppConfig> => ({
  ...TEST_CONFIG,
  ...overrides,
});

export const withTestEnvOverrides = (options: AppBootstrapOptions = {}): AppBootstrapOptions => ({
  ...options,
  envOverrides: createTestEnvOverrides(options.envOverrides),
});
