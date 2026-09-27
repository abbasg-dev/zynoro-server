import type { Request, Response } from "express";
import mongoose, { type Types } from "mongoose";
import type { IReview } from "../models/product.model.js";
import { ProductModel } from "../models/product.model.js";
import { UserModel } from "../models/user.model.js";
import {
  addReviewSchema,
  editReviewSchema,
} from "../schemas/review.schemas.js";

const getProductId = (req: Request): string => {
  return String(req.params.productId);
};

const getReviewId = (req: Request): string => {
  return String(req.params.reviewId);
};

const findReview = (
  product: { reviews: IReview[] },
  reviewId: string,
): IReview | undefined => {
  return product.reviews.find((review) => review._id.toString() === reviewId);
};

const recalculateProductRating = (
  reviews: {
    rating: number;
  }[],
) => {
  const numReviews = reviews.length;

  if (numReviews === 0) {
    return {
      rating: 0,
      numReviews: 0,
    };
  }

  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);

  return {
    rating: Number((totalRating / numReviews).toFixed(1)),
    numReviews,
  };
};

/**
 * POST /api/reviews/:productId
 * Add a review
 */
export const addReview = async (req: Request, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  const productId = getProductId(req);

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({
      message: "Invalid product ID",
    });
  }

  const parsed = addReviewSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid review data",
      errors: parsed.error.flatten(),
    });
  }

  const product = await ProductModel.findById(productId);

  if (!product) {
    return res.status(404).json({
      message: "Product not found",
    });
  }

  const userId = req.userId;

  const existingReview = product.reviews.find(
    (review) => review.user.toString() === userId,
  );

  if (existingReview) {
    return res.status(409).json({
      message: "You have already reviewed this product",
    });
  }

  const user = await UserModel.findById(userId).select(
    "_id username displayName",
  );

  if (!user) {
    return res.status(404).json({
      message: "User not found",
    });
  }

  product.reviews.push({
    _id: new mongoose.Types.ObjectId(),
    user: user._id,
    rating: parsed.data.rating,
    comment: parsed.data.comment,
    likes: [],
    dislikes: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const ratingData = recalculateProductRating(product.reviews);

  product.rating = ratingData.rating;
  product.numReviews = ratingData.numReviews;

  await product.save();

  const createdReview = product.reviews[product.reviews.length - 1];

  return res.status(201).json({
    review: createdReview,
  });
};

/**
 * GET /api/reviews/:productId
 * Get all reviews for a product
 */
export const getReviews = async (req: Request, res: Response) => {
  const productId = getProductId(req);

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({
      message: "Invalid product ID",
    });
  }

  const product = await ProductModel.findById(productId).populate(
    "reviews.user",
    "_id username displayName",
  );

  if (!product) {
    return res.status(404).json({
      message: "Product not found",
    });
  }

  const reviews = [...product.reviews].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );

  return res.json({
    reviews,
    count: reviews.length,
  });
};

/**
 * GET /api/reviews/:productId/user
 * Get the authenticated user's review
 */
export const reviewByUser = async (req: Request, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  const productId = getProductId(req);

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({
      message: "Invalid product ID",
    });
  }

  const product = await ProductModel.findById(productId);

  if (!product) {
    return res.status(404).json({
      message: "Product not found",
    });
  }

  const review = product.reviews.find(
    (item) => item.user.toString() === req.userId,
  );

  if (!review) {
    return res.status(404).json({
      message: "You have not reviewed this product",
    });
  }

  return res.json({
    review,
  });
};

/**
 * GET /api/reviews/:productId/percentages
 * Get rating distribution
 */
export const ratingById = async (req: Request, res: Response) => {
  const productId = getProductId(req);

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({
      message: "Invalid product ID",
    });
  }

  const product = await ProductModel.findById(productId).select(
    "reviews rating numReviews",
  );

  if (!product) {
    return res.status(404).json({
      message: "Product not found",
    });
  }

  const total = product.reviews.length;

  const distribution = {
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0,
  };

  for (const review of product.reviews) {
    const rating = Math.round(review.rating);

    if (rating >= 1 && rating <= 5) {
      distribution[rating as keyof typeof distribution]++;
    }
  }

  const percentages = {
    5: total ? Number(((distribution[5] / total) * 100).toFixed(1)) : 0,
    4: total ? Number(((distribution[4] / total) * 100).toFixed(1)) : 0,
    3: total ? Number(((distribution[3] / total) * 100).toFixed(1)) : 0,
    2: total ? Number(((distribution[2] / total) * 100).toFixed(1)) : 0,
    1: total ? Number(((distribution[1] / total) * 100).toFixed(1)) : 0,
  };

  return res.json({
    totalReviews: total,
    distribution,
    percentages,
    averageRating: product.rating,
  });
};

/**
 * GET /api/reviews/:productId/filter
 *
 * Query:
 * rating=4
 * sort=newest
 * sort=highest
 * sort=lowest
 */
export const filterReviews = async (req: Request, res: Response) => {
  const productId = getProductId(req);

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({
      message: "Invalid product ID",
    });
  }

  const product = await ProductModel.findById(productId).populate(
    "reviews.user",
    "_id username displayName",
  );

  if (!product) {
    return res.status(404).json({
      message: "Product not found",
    });
  }

  let reviews = [...product.reviews];

  const ratingParam = req.query.rating ? String(req.query.rating) : undefined;

  const sortParam = req.query.sort ? String(req.query.sort) : "newest";

  if (ratingParam) {
    const minimumRating = Number(ratingParam);

    if (Number.isNaN(minimumRating) || minimumRating < 1 || minimumRating > 5) {
      return res.status(400).json({
        message: "Invalid rating filter",
      });
    }

    reviews = reviews.filter((review) => review.rating >= minimumRating);
  }

  if (sortParam === "highest") {
    reviews.sort((a, b) => b.rating - a.rating);
  } else if (sortParam === "lowest") {
    reviews.sort((a, b) => a.rating - b.rating);
  } else {
    reviews.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  return res.json({
    reviews,
    count: reviews.length,
  });
};

/**
 * PUT /api/reviews/:productId/:reviewId
 * Edit own review
 */
export const editReview = async (req: Request, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  const productId = getProductId(req);
  const reviewId = getReviewId(req);

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({
      message: "Invalid product ID",
    });
  }

  if (!mongoose.Types.ObjectId.isValid(reviewId)) {
    return res.status(400).json({
      message: "Invalid review ID",
    });
  }

  const parsed = editReviewSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid review data",
      errors: parsed.error.flatten(),
    });
  }

  const product = await ProductModel.findById(productId);

  if (!product) {
    return res.status(404).json({
      message: "Product not found",
    });
  }

  const review = findReview(product, reviewId);

  if (!review) {
    return res.status(404).json({
      message: "Review not found",
    });
  }

  if (review.user.toString() !== req.userId) {
    return res.status(403).json({
      message: "You can only edit your own review",
    });
  }

  if (parsed.data.rating !== undefined) {
    review.rating = parsed.data.rating;
  }

  if (parsed.data.comment !== undefined) {
    review.comment = parsed.data.comment;
  }

  review.updatedAt = new Date();

  const ratingData = recalculateProductRating(product.reviews);

  product.rating = ratingData.rating;
  product.numReviews = ratingData.numReviews;

  await product.save();

  return res.json({
    review,
  });
};

/**
 * DELETE /api/reviews/:productId/:reviewId
 */
export const deleteReview = async (req: Request, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  const productId = getProductId(req);
  const reviewId = getReviewId(req);

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({
      message: "Invalid product ID",
    });
  }

  if (!mongoose.Types.ObjectId.isValid(reviewId)) {
    return res.status(400).json({
      message: "Invalid review ID",
    });
  }

  const product = await ProductModel.findById(productId);

  if (!product) {
    return res.status(404).json({
      message: "Product not found",
    });
  }

  const review = findReview(product, reviewId);

  if (!review) {
    return res.status(404).json({
      message: "Review not found",
    });
  }

  if (review.user.toString() !== req.userId) {
    return res.status(403).json({
      message: "You can only delete your own review",
    });
  }

  product.reviews = product.reviews.filter(
    (item) => item._id.toString() !== reviewId,
  );

  const ratingData = recalculateProductRating(product.reviews);

  product.rating = ratingData.rating;
  product.numReviews = ratingData.numReviews;

  await product.save();

  return res.json({
    message: "Review deleted successfully",
  });
};

/**
 * POST /api/reviews/:productId/:reviewId/like
 */
export const likeReview = async (req: Request, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  const productId = getProductId(req);
  const reviewId = getReviewId(req);

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({
      message: "Invalid product ID",
    });
  }

  if (!mongoose.Types.ObjectId.isValid(reviewId)) {
    return res.status(400).json({
      message: "Invalid review ID",
    });
  }

  const product = await ProductModel.findById(productId);

  if (!product) {
    return res.status(404).json({
      message: "Product not found",
    });
  }

  const review = findReview(product, reviewId);

  if (!review) {
    return res.status(404).json({
      message: "Review not found",
    });
  }

  const alreadyLiked = review.likes.some(
    (id: Types.ObjectId) => id.toString() === req.userId,
  );

  if (alreadyLiked) {
    review.likes = review.likes.filter(
      (id: Types.ObjectId) => id.toString() !== req.userId,
    );
  } else {
    review.likes.push(new mongoose.Types.ObjectId(req.userId));

    review.dislikes = review.dislikes.filter(
      (id: Types.ObjectId) => id.toString() !== req.userId,
    );
  }

  await product.save();

  return res.json({
    likes: review.likes.length,
    dislikes: review.dislikes.length,
    liked: !alreadyLiked,
  });
};

/**
 * POST /api/reviews/:productId/:reviewId/dislike
 */
export const dislikeReview = async (req: Request, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  const productId = getProductId(req);
  const reviewId = getReviewId(req);

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({
      message: "Invalid product ID",
    });
  }

  if (!mongoose.Types.ObjectId.isValid(reviewId)) {
    return res.status(400).json({
      message: "Invalid review ID",
    });
  }

  const product = await ProductModel.findById(productId);

  if (!product) {
    return res.status(404).json({
      message: "Product not found",
    });
  }

  const review = findReview(product, reviewId);

  if (!review) {
    return res.status(404).json({
      message: "Review not found",
    });
  }

  const alreadyDisliked = review.dislikes.some(
    (id: Types.ObjectId) => id.toString() === req.userId,
  );

  if (alreadyDisliked) {
    review.dislikes = review.dislikes.filter(
      (id: Types.ObjectId) => id.toString() !== req.userId,
    );
  } else {
    review.dislikes.push(new mongoose.Types.ObjectId(req.userId));

    review.likes = review.likes.filter(
      (id: Types.ObjectId) => id.toString() !== req.userId,
    );
  }

  await product.save();

  return res.json({
    likes: review.likes.length,
    dislikes: review.dislikes.length,
    disliked: !alreadyDisliked,
  });
};
