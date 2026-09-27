import { z } from "zod";

const username = z.string()
  .trim()
  .min(3)
  .max(30)
  .regex(/^[a-zA-Z0-9_.-]+$/);

const password = z.string().min(8, "Password must contain at least 8 characters");

export const signUpSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  username,
  email: z.string().trim().email(),
  password,
  confirmPassword: password
}).refine(
  (data) => data.password === data.confirmPassword,
  { path: ["confirmPassword"], message: "Passwords do not match" }
);

export const signInSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1)
});

export const googleTokenSchema = z.object({
  idToken: z.string().min(1)
});
