import { Router } from "express";

import {
  getProductList,
  getProductById,
  getFeaturedProducts,
  getTrendingProducts,
} from "../controllers/product.controller.js";

export const productRouter = Router();

productRouter.get("/", getProductList);
productRouter.get("/featured", getFeaturedProducts);
productRouter.get("/trending", getTrendingProducts);
productRouter.get("/:id", getProductById);
