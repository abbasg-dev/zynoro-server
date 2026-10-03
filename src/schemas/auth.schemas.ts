import { z } from "zod";

const username = z
  .string()
  .trim()
  .min(3)
  .max(30)
  .regex(/^[a-zA-Z0-9_.-]+$/);

const password = z
  .string()
  .min(8, "Password must contain at least 8 characters");

export const signUpSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(2, "Display name must contain at least 2 characters")
      .max(80),

    email: z.string().trim().email("Invalid email address"),

    password,

    confirmPassword: password,
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export const signInSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const firebaseTokenSchema = z.object({
  idToken: z.string().min(1, "Firebase ID token is required"),
});
