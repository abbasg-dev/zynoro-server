import express from "express";
import cors from "cors";

import { env } from "./config/env.js";

import { authRouter } from "./routes/auth.routes.js";
import { categoryRouter } from "./routes/category.routes.js";
import { productRouter } from "./routes/product.routes.js";
import { userRouter } from "./routes/user.routes.js";
import { orderRouter } from "./routes/order.routes.js";
import { reviewRouter } from "./routes/review.routes.js";

export const app = express();

app.use(cors());

app.use(express.json());

const apiRouter = express.Router();

apiRouter.get("/health", (_req, res) => {
  res.json({
    ok: true,
  });
});

apiRouter.use("/auth", authRouter);

apiRouter.use("/categories", categoryRouter);

apiRouter.use("/products", productRouter);

apiRouter.use("/users", userRouter);

apiRouter.use("/orders", orderRouter);

apiRouter.use("/reviews", reviewRouter);

app.use(env.API_URL, apiRouter);

app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(error);

    res.status(500).json({
      message: "Internal server error",
    });
  },
);
