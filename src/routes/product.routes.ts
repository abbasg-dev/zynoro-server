import { Router } from "express";

import {
  getProductList,
  getProductById,
  getFeaturedProducts,
  getTrendingProducts,
  getHighestPrice,
} from "../controllers/product.controller.js";

export const productRouter = Router();

productRouter.get("/", getProductList);
productRouter.get("/featured/:count", getFeaturedProducts);
productRouter.get("/trending/:count", getTrendingProducts);
productRouter.get("/highest-price", getHighestPrice);
productRouter.get("/:id", getProductById);
