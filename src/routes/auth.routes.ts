import { Router } from "express";
import {
  me,
  signIn,
  signInWithGoogle,
  signInWithFacebook,
  signUp,
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const authRouter = Router();

authRouter.post("/signup", signUp);
authRouter.post("/signin", signIn);
authRouter.post("/google", signInWithGoogle);
authRouter.post("/facebook", signInWithFacebook);
authRouter.get("/me", requireAuth, me);
