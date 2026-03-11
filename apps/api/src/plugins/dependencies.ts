import type { GlideClient } from '@valkey/valkey-glide'
import type { dbRead, dbWrite } from '@zhblogs/db'

export type DbRead = typeof dbRead
export type DbWrite = typeof dbWrite
export type CacheClient = GlideClient

export interface AppDb {
  read: DbRead
  write: DbWrite
  cache?: CacheClient
}
