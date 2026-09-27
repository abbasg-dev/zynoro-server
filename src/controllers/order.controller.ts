import type { Request, Response } from "express";
import mongoose from "mongoose";
import Stripe from "stripe";
import { OrderModel } from "../models/order.model.js";
import { ProductModel } from "../models/product.model.js";
import { createOrderSchema } from "../schemas/order.schemas.js";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error("STRIPE_SECRET_KEY is not configured");
}

const stripe = new Stripe(stripeSecretKey);

export const createOrder = async (req: Request, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  const parsed = createOrderSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const productIds = parsed.data.items.map((item) => item.productId);

  const invalidId = productIds.find(
    (id) => !mongoose.Types.ObjectId.isValid(id),
  );

  if (invalidId) {
    return res.status(400).json({
      message: `Invalid product ID: ${invalidId}`,
    });
  }

  const products = await ProductModel.find({
    _id: {
      $in: productIds,
    },
  });

  if (products.length !== productIds.length) {
    return res.status(404).json({
      message: "One or more products were not found",
    });
  }

  const orderItems = [];

  for (const item of parsed.data.items) {
    const product = products.find(
      (product) => product._id.toString() === item.productId,
    );

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    if (product.countInStock < item.quantity) {
      return res.status(400).json({
        message: `${product.name} does not have enough stock`,
      });
    }

    const subtotal = product.priceAfterDiscount * item.quantity;

    orderItems.push({
      product: product._id,
      name: product.name,
      image: product.image,
      quantity: item.quantity,
      price: product.priceAfterDiscount,
      subtotal,
    });
  }

  const total = orderItems.reduce((sum, item) => sum + item.subtotal, 0);

  let paymentIntent: Stripe.PaymentIntent | null = null;

  if (parsed.data.createPaymentIntent) {
    const amountInFils = Math.round(total * 100);

    paymentIntent = await stripe.paymentIntents.create({
      amount: amountInFils,
      currency: "aed",
      payment_method_types: ["card"],
      metadata: {
        userId: req.userId,
      },
    });
  }

  const order = await OrderModel.create({
    user: req.userId,
    items: orderItems,
    total,
    paymentIntentId: paymentIntent?.id,
    paid: false,
    delivered: false,
    status: "pending",
  });

  for (const item of parsed.data.items) {
    await ProductModel.findByIdAndUpdate(item.productId, {
      $inc: {
        countInStock: -item.quantity,
        orderCount: item.quantity,
      },
    });
  }

  return res.status(201).json({
    order,
    paymentIntent: paymentIntent
      ? {
          id: paymentIntent.id,
          clientSecret: paymentIntent.client_secret,
        }
      : null,
  });
};

export const getMyOrders = async (req: Request, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  const orders = await OrderModel.find({
    user: req.userId,
  })
    .sort({
      createdAt: -1,
    })
    .select("_id createdAt total paid delivered status")
    .lean();

  const formattedOrders = orders.map((order) => ({
    id: order._id,
    date: order.createdAt,
    total: order.total,
    paid: order.paid,
    delivered: order.delivered,
    status: order.status,
  }));

  return res.json({
    orders: formattedOrders,
  });
};
