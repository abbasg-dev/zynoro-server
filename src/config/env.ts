import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().default(5000),

  CLIENT_URL: z.string().url().default("http://localhost:3000"),

  API_URL: z.string().min(1),

  MONGODB_URI: z.string().min(1),

  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),

  JWT_EXPIRES_IN: z.string().default("7d"),

  FIREBASE_PROJECT_ID: z.string().optional(),

  FIREBASE_CLIENT_EMAIL: z.string().optional(),

  FIREBASE_PRIVATE_KEY: z.string().optional(),

  STRIPE_SECRET_KEY: z.string().min(1),
});

export const env = schema.parse(process.env);
