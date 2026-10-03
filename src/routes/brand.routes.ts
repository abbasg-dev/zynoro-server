import { Router } from "express";
import { getBrandList, getBrandById } from "../controllers/brand.controller.js";

export const brandRouter = Router();

brandRouter.get("/", getBrandList);
brandRouter.get("/:id", getBrandById);
