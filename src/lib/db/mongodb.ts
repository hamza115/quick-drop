import { MongoClient, type Db } from "mongodb";
import { getEnv } from "@/lib/env";

// Cache the client on globalThis so hot reloads and warm serverless instances reuse one connection pool.
const globalForMongo = globalThis as unknown as { quickdropMongoClient?: MongoClient };

/** Waits before reconnecting after a failed connection, doubling up to the cap while the database stays down. */
const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;

function createClient(): MongoClient {
  const client = new MongoClient(getEnv().MONGODB_URI, {
    appName: "quickdrop",
    serverSelectionTimeoutMS: 5_000,
  });

  // When a connection attempt fails (for example the cluster is briefly unreachable), the driver closes
  // its topology but keeps it, so every later query fails with "Topology is closed" until the instance
  // restarts. Connect again instead, on the same client, because Better Auth holds a reference to it.
  let delay = RECONNECT_BASE_MS;
  client.on("topologyClosed", () => {
    setTimeout(() => {
      client
        .connect()
        .then(() => {
          delay = RECONNECT_BASE_MS;
        })
        .catch(() => undefined); // A failed attempt closes the topology again, which schedules the next one.
    }, delay);
    delay = Math.min(delay * 2, RECONNECT_MAX_MS);
  });
  return client;
}

export function getMongoClient(): MongoClient {
  globalForMongo.quickdropMongoClient ??= createClient();
  return globalForMongo.quickdropMongoClient;
}

export function getDb(): Db {
  return getMongoClient().db(getEnv().MONGODB_DB_NAME);
}

/** Throws if the database cannot be reached. Used by the health check. */
export async function pingDatabase(): Promise<void> {
  await getDb().command({ ping: 1 });
}
