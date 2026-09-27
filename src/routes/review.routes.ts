import { Router } from "express";

import {
  addReview,
  getReviews,
  reviewByUser,
  ratingById,
  editReview,
  deleteReview,
  likeReview,
  dislikeReview,
  filterReviews,
} from "../controllers/review.controller.js";

import { requireAuth } from "../middleware/auth.middleware.js";

export const reviewRouter = Router();

reviewRouter.get("/:productId", getReviews);

reviewRouter.get("/:productId/percentages", ratingById);

reviewRouter.get("/:productId/user", requireAuth, reviewByUser);

reviewRouter.get("/:productId/filter", filterReviews);

reviewRouter.post("/:productId", requireAuth, addReview);

reviewRouter.put("/:productId/:reviewId", requireAuth, editReview);

reviewRouter.delete("/:productId/:reviewId", requireAuth, deleteReview);

reviewRouter.post("/:productId/:reviewId/like", requireAuth, likeReview);

reviewRouter.post("/:productId/:reviewId/dislike", requireAuth, dislikeReview);
