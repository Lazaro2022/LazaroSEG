import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure neon for serverless environments
neonConfig.webSocketConstructor = ws;

// In production, disable fetching over HTTP and prefer WebSocket connections
if (process.env.NODE_ENV === 'production') {
  neonConfig.fetchConnectionCache = true;
  neonConfig.useSecureWebSocket = true;
}

if (!process.env.DATABASE_URL) {
  console.warn("⚠️ DATABASE_URL not set - database features will be limited");
}

// Configure connection pool for production deployment
const poolConfig = {
  connectionString: process.env.DATABASE_URL || 'postgresql://placeholder:placeholder@localhost:5432/placeholder',
  // Optimize for serverless deployment
  max: process.env.NODE_ENV === 'production' ? 1 : 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

export const pool = new Pool(poolConfig);
export const db = drizzle({ client: pool, schema });