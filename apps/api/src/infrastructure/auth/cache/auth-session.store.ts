import type { CacheClient } from '@/shared/runtime/types/app-dependencies.types';

const getWithCommandFallback = async (cache: CacheClient, key: string): Promise<unknown> => {
  if (cache.get) {
    return cache.get(key);
  }

  if (cache.customCommand) {
    return cache.customCommand(['GET', key]);
  }

  return null;
};

const setWithCommandFallback = async (
  cache: CacheClient,
  key: string,
  value: string,
): Promise<void> => {
  if (cache.set) {
    await cache.set(key, value);
    return;
  }

  if (cache.customCommand) {
    await cache.customCommand(['SET', key, value]);
  }
};

const deleteWithCommandFallback = async (cache: CacheClient, key: string): Promise<void> => {
  if (cache.delete) {
    await cache.delete(key);
    return;
  }

  if (cache.customCommand) {
    await cache.customCommand(['DEL', key]);
  }
};

export const readCacheJson = async <T>(
  cache: CacheClient | undefined,
  key: string,
): Promise<T | null> => {
  if (!cache) {
    return null;
  }

  const result = await getWithCommandFallback(cache, key);

  if (typeof result !== 'string') {
    return null;
  }

  return JSON.parse(result) as T;
};

export const writeCacheJson = async (
  cache: CacheClient | undefined,
  key: string,
  value: unknown,
): Promise<void> => {
  if (!cache) {
    return;
  }

  await setWithCommandFallback(cache, key, JSON.stringify(value));
};

export const removeCacheKey = async (
  cache: CacheClient | undefined,
  key: string,
): Promise<void> => {
  if (!cache) {
    return;
  }

  await deleteWithCommandFallback(cache, key);
};
