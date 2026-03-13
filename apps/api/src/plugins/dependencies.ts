import type { dbRead, dbWrite } from '@zhblogs/db'

export type DbRead = typeof dbRead
export type DbWrite = typeof dbWrite

export interface CacheClient {
  ping: () => Promise<unknown>
  get?: (key: string) => Promise<unknown>
  set?: (key: string, value: string, options?: unknown) => Promise<unknown>
  customCommand?: (args: string[]) => Promise<unknown>
  close: () => void
}

export interface AppDb {
  read: DbRead
  write: DbWrite
  cache?: CacheClient
}
