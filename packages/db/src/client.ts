import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

const writePool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

const readPool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export const dbWrite = drizzle(writePool)
export const dbRead = drizzle(readPool)
