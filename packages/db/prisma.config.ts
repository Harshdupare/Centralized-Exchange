import { defineConfig, env } from "prisma/config";
import dotenvFlow from "dotenv-flow"; 
import path from "path";

dotenvFlow.config({
  path : path.resolve(__dirname, "../../")
})

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
