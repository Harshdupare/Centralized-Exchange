import path from "path";
import { fileURLToPath } from "url";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
loadEnvConfig(repoRoot, process.env.NODE_ENV !== "production");

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@repo/db", "@prisma/client", "@prisma/adapter-pg", "pg"],
};

export default nextConfig;
