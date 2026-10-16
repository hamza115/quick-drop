import { MongoClient, type Db } from "mongodb";
import { getEnv } from "@/lib/env";

// Cache the client on globalThis so hot reloads and warm serverless instances reuse one connection pool.
const globalForMongo = globalThis as unknown as { quickdropMongoClient?: MongoClient };

export function getMongoClient(): MongoClient {
  if (!globalForMongo.quickdropMongoClient) {
    globalForMongo.quickdropMongoClient = new MongoClient(getEnv().MONGODB_URI, {
      appName: "quickdrop",
      serverSelectionTimeoutMS: 5_000,
    });
  }
  return globalForMongo.quickdropMongoClient;
}

export function getDb(): Db {
  return getMongoClient().db(getEnv().MONGODB_DB_NAME);
}

/** Throws if the database cannot be reached. Used by the health check. */
export async function pingDatabase(): Promise<void> {
  await getDb().command({ ping: 1 });
}
