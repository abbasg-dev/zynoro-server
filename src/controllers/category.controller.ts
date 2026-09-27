import type { Request, Response } from "express";
import { CategoryModel } from "../models/category.model.js";

export const getCategoryList = async (_req: Request, res: Response) => {
  const categories = await CategoryModel.find().sort({ name: 1 }).lean();

  return res.json({
    categories,
  });
};

export const getTopCategories = async (_req: Request, res: Response) => {
  const categories = await CategoryModel.aggregate([
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "category",
        as: "products",
      },
    },
    {
      $project: {
        name: 1,
        productCount: {
          $size: "$products",
        },
      },
    },
    {
      $sort: {
        productCount: -1,
      },
    },
  ]);

  return res.json({
    categories,
  });
};
