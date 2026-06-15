import { defineConfig, env } from "prisma/config";
import dotenv from "dotenv"; 
import path from "path";

const directoryPath = import.meta.dirname;

dotenv.config({
  path : path.resolve(directoryPath, "../../.env")
})

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
