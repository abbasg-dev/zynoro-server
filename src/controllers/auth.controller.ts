import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { UserModel } from "../models/user.model.js";
import {
  signInSchema,
  signUpSchema,
  googleTokenSchema,
} from "../schemas/auth.schemas.js";
import { createAccessToken } from "../utils/jwt.js";
import { firebaseAdminAuth } from "../config/firebase-admin.js";

const publicUser = (user: any) => ({
  id: user._id,
  email: user.email,
  username: user.username,
  displayName: user.displayName,
  firebaseUid: user.firebaseUid ?? null,
  providers: user.providers,
});

export const signUp = async (req: Request, res: Response) => {
  const parsed = signUpSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const { email, username, displayName, password } = parsed.data;

  const existing = await UserModel.findOne({
    $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
  });

  if (existing) {
    const field = existing.email === email.toLowerCase() ? "email" : "username";
    return res.status(409).json({
      message: `${field === "email" ? "Email" : "Username"} is already in use`,
      field,
    });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await UserModel.create({
    email: email.toLowerCase(),
    username: username.toLowerCase(),
    displayName,
    passwordHash,
    providers: ["password"],
  });

  const token = createAccessToken(user.id);

  return res.status(201).json({ user: publicUser(user), token });
};

export const signIn = async (req: Request, res: Response) => {
  const parsed = signInSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const user = await UserModel.findOne({
    email: parsed.data.email.toLowerCase(),
  });

  if (!user?.passwordHash) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);

  if (!valid) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  if (!user.providers.includes("password")) {
    user.providers.push("password");
    await user.save();
  }

  return res.json({
    user: publicUser(user),
    token: createAccessToken(user.id),
  });
};

export const signInWithGoogle = async (req: Request, res: Response) => {
  if (!firebaseAdminAuth) {
    return res.status(503).json({
      message: "Firebase Admin is not configured",
    });
  }

  const parsed = googleTokenSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid Firebase ID token payload",
    });
  }

  try {
    const decoded = await firebaseAdminAuth.verifyIdToken(parsed.data.idToken);

    if (!decoded.email) {
      return res.status(400).json({
        message: "Google account has no email",
      });
    }

    const email = decoded.email.toLowerCase();

    let user = await UserModel.findOne({
      $or: [{ firebaseUid: decoded.uid }, { email }],
    });

    if (!user) {
      const base =
        email
          .split("@")[0]
          ?.replace(/[^a-zA-Z0-9_.-]/g, "")
          .slice(0, 24) || `user_${decoded.uid.slice(0, 8)}`;

      let username = base.toLowerCase();
      let i = 1;

      while (await UserModel.exists({ username })) {
        username = `${base}_${i++}`.toLowerCase();
      }

      user = await UserModel.create({
        email,
        username,
        displayName: decoded.name ?? username,
        firebaseUid: decoded.uid,
        providers: ["google"],
      });
    } else {
      user.firebaseUid = decoded.uid;

      if (!user.providers.includes("google")) {
        user.providers.push("google");
      }

      await user.save();
    }

    return res.json({
      user: publicUser(user),
      token: createAccessToken(user.id),
    });
  } catch {
    return res.status(401).json({
      message: "Invalid Firebase ID token",
    });
  }
};

export const me = async (req: Request, res: Response) => {
  const user = await UserModel.findById(req.userId);

  if (!user) return res.status(404).json({ message: "User not found" });

  return res.json({ user: publicUser(user) });
};
