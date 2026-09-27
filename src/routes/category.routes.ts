import { Router } from "express";
import {
  getCategoryList,
  getTopCategories,
} from "../controllers/category.controller.js";

export const categoryRouter = Router();

categoryRouter.get("/", getCategoryList);
categoryRouter.get("/top", getTopCategories);
