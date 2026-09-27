import { z } from "zod";

export const addReviewSchema = z.object({
  rating: z.number().min(1).max(5),

  comment: z.string().trim().max(1000).default(""),
});

export const editReviewSchema = z.object({
  rating: z.number().min(1).max(5).optional(),

  comment: z.string().trim().max(1000).optional(),
});
