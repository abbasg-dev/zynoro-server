import type { Request, Response } from "express";
import mongoose from "mongoose";
import { ProductModel } from "../models/product.model.js";

const parseNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === "") {
    return undefined;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : undefined;
};

const isValidObjectId = (value: unknown) =>
  typeof value === "string" && mongoose.Types.ObjectId.isValid(value);

export const getProductList = async (req: Request, res: Response) => {
  const {
    category,
    brand,
    minPrice,
    maxPrice,
    minDiscount,
    maxDiscount,
    minRating,
    search,
    sort,
  } = req.query;

  const filter: Record<string, any> = {};

  if (category) {
    if (!isValidObjectId(category)) {
      return res.status(400).json({
        message: "Invalid category ID",
      });
    }

    filter.category = category;
  }

  if (brand) {
    if (!isValidObjectId(brand)) {
      return res.status(400).json({
        message: "Invalid brand ID",
      });
    }

    filter.brand = brand;
  }

  const minPriceValue = parseNumber(minPrice);
  const maxPriceValue = parseNumber(maxPrice);

  if (minPriceValue !== undefined || maxPriceValue !== undefined) {
    filter.priceAfterDiscount = {};

    if (minPriceValue !== undefined) {
      filter.priceAfterDiscount.$gte = minPriceValue;
    }

    if (maxPriceValue !== undefined) {
      filter.priceAfterDiscount.$lte = maxPriceValue;
    }
  }

  const minDiscountValue = parseNumber(minDiscount);
  const maxDiscountValue = parseNumber(maxDiscount);

  if (minDiscountValue !== undefined || maxDiscountValue !== undefined) {
    filter.discount = {};

    if (minDiscountValue !== undefined) {
      filter.discount.$gte = minDiscountValue;
    }

    if (maxDiscountValue !== undefined) {
      filter.discount.$lte = maxDiscountValue;
    }
  }

  const minRatingValue = parseNumber(minRating);

  if (minRatingValue !== undefined) {
    filter.rating = {
      $gte: minRatingValue,
    };
  }

  if (search && typeof search === "string") {
    filter.$text = {
      $search: search,
    };
  }

  let query = ProductModel.find(filter)
    .populate("brand", "name")
    .populate("category", "name");

  switch (sort) {
    case "price-low":
      query = query.sort({ priceAfterDiscount: 1 });
      break;

    case "price-high":
      query = query.sort({ priceAfterDiscount: -1 });
      break;

    case "rating":
      query = query.sort({ rating: -1 });
      break;

    case "discount":
      query = query.sort({ discount: -1 });
      break;

    case "popular":
      query = query.sort({ orderCount: -1 });
      break;

    case "newest":
      query = query.sort({ createdAt: -1 });
      break;

    default:
      query = query.sort({ createdAt: -1 });
  }

  const products = await query.lean();

  return res.json({
    count: products.length,
    products,
  });
};

export const getProductById = async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({
      message: "Invalid product ID",
    });
  }

  const product = await ProductModel.findById(req.params.id)
    .populate("brand", "name")
    .populate("category", "name")
    .lean();

  if (!product) {
    return res.status(404).json({
      message: "Product not found",
    });
  }

  return res.json({
    product,
  });
};

export const getFeaturedProducts = async (req: Request, res: Response) => {
  const { count } = req.params;
  const { category } = req.query;

  const filter: {
    isFeatured: boolean;
    category?: string;
  } = {
    isFeatured: true,
  };

  if (typeof category === "string" && category.trim()) {
    filter.category = category;
  }

  const products = await ProductModel.find(filter)
    .populate("category", "name")
    .sort({
      orderCount: -1,
    })
    .limit(Number(count))
    .lean();

  return res.json({
    products,
  });
};

export const getTrendingProducts = async (req: Request, res: Response) => {
  const { count } = req.params;

  const filter: {
    isFeatured: boolean;
    trend: boolean;
  } = {
    isFeatured: false,
    trend: true,
  };

  const products = await ProductModel.find(filter)
    .populate("name")
    .sort({
      orderCount: -1,
    })
    .limit(Number(count))
    .lean();

  return res.json({
    products,
  });
};

export const getHighestPrice = async (req: Request, res: Response) => {
  const highestProduct = await ProductModel.findOne()
    .sort({ originalPrice: -1 })
    .select("originalPrice")
    .lean();

  if (!highestProduct) {
    return res.status(404).json({
      message: "No products found",
    });
  }

  return res.json({
    highestPrice: highestProduct.originalPrice,
  });
};
