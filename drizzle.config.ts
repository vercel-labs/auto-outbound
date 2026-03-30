import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config({
  path: `.env.${process.env.NODE_ENV || "local"}`,
});

export default defineConfig({
  out: "./drizzle",
  schema: "./db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
