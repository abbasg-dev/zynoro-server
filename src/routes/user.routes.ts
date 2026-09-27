import { Router } from "express";
import { getUserById } from "../controllers/user.controller.js";

export const userRouter = Router();

userRouter.get("/:id", getUserById);
