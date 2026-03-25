export const TEST_CONFIG = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgres://postgres:postgres@127.0.0.1:5432/zhblogs_test',
  VALKEY_URL: 'redis://127.0.0.1:6379',
  API_INTERNAL_TOKEN: 'zhblogs-internal-token-for-tests',
} as const;

export const TEST_AUTH_COOKIES = {
  access: 'zhblogs_access_token',
  refresh: 'zhblogs_refresh_token',
} as const;

export const TEST_HEADERS = {
  internalToken: 'x-internal-token',
} as const;
