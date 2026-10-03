import type { Request, Response } from "express";
import { BrandModel } from "../models/brand.model.js";
import mongoose from "mongoose";

const isValidObjectId = (value: unknown): boolean =>
  typeof value === "string" && mongoose.Types.ObjectId.isValid(value);

export const getBrandList = async (_req: Request, res: Response) => {
  const brands = await BrandModel.find().sort({ name: 1 }).lean();

  return res.json({
    brands,
  });
};

export const getBrandById = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({
      message: "Invalid brand ID",
    });
  }

  const brand = await BrandModel.findById(id).lean();

  if (!brand) {
    return res.status(404).json({
      message: "Brand not found",
    });
  }

  return res.json({
    brand,
  });
};
