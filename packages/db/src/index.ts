import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "./generated/client/client.js";

declare global {
  var prismaGlobal: PrismaClient | undefined;
  var prismaPoolGlobal: Pool | undefined;
}

function createClient() {
  const pool =
    globalThis.prismaPoolGlobal ??
    new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const client = globalThis.prismaGlobal ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = client;
}

export default client;
