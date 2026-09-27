import { Router } from "express";
import { createOrder, getMyOrders } from "../controllers/order.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const orderRouter = Router();

orderRouter.post("/", requireAuth, createOrder);

orderRouter.get("/my", requireAuth, getMyOrders);
