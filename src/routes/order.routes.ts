import { Router } from "express";
import {
  createOrder,
  getMyOrders,
  markOrderAsPaid,
} from "../controllers/order.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const orderRouter = Router();

orderRouter.post("/new", requireAuth, createOrder);
orderRouter.get("/mine", requireAuth, getMyOrders);
orderRouter.patch("/:orderId/pay", requireAuth, markOrderAsPaid);
