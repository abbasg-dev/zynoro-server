import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { UserModel, IUser } from "../models/user.model.js";
import {
  signInSchema,
  signUpSchema,
  firebaseTokenSchema,
} from "../schemas/auth.schemas.js";
import { createAccessToken } from "../utils/jwt.js";
import { firebaseAdminAuth } from "../config/firebase-admin.js";

const publicUser = (user: IUser) => ({
  id: user._id,
  email: user.email,
  username: user.username,
  displayName: user.displayName,
  photoURL: user.photoURL ?? null,
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

  const { email, displayName, password } = parsed.data;

  const normalizedEmail = email.toLowerCase();

  const existing = await UserModel.findOne({
    email: normalizedEmail,
  });

  if (existing) {
    return res.status(409).json({
      message: "Email is already in use",
      field: "email",
    });
  }

  const username = await generateUsername(displayName, normalizedEmail);

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await UserModel.create({
    email: normalizedEmail,
    username,
    displayName,
    passwordHash,
    providers: ["password"],
  });

  return res.status(201).json({
    user: publicUser(user),
    token: createAccessToken(user.id),
  });
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

  const parsed = firebaseTokenSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid Firebase ID token payload",
    });
  }

  try {
    const decoded = await firebaseAdminAuth.verifyIdToken(parsed.data.idToken);

    if (decoded.firebase?.sign_in_provider !== "google.com") {
      return res.status(401).json({
        message: "Firebase ID token is not from Google",
      });
    }

    if (!decoded.email) {
      return res.status(400).json({
        message: "Google account has no email",
      });
    }

    const email = decoded.email.toLowerCase();

    let user = await UserModel.findOne({
      $or: [{ googleUid: decoded.uid }, { email }],
    });

    if (!user) {
      const username = await generateUsername(decoded.name ?? "", email);

      user = await UserModel.create({
        email,
        username,
        displayName: decoded.name ?? username,
        photoURL: decoded.picture ?? null,
        googleUid: decoded.uid,
        providers: ["google"],
      });
    } else {
      user.googleUid = decoded.uid;
      user.displayName = decoded.name ?? user.displayName;
      user.photoURL = decoded.picture ?? user.photoURL;

      if (!user.providers.includes("google")) {
        user.providers.push("google");
      }

      await user.save();
    }

    return res.json({
      user: publicUser(user),
      token: createAccessToken(user.id),
    });
  } catch (error) {
    console.error("Google Firebase authentication failed:", error);

    return res.status(401).json({
      message: "Invalid Google Firebase ID token",
    });
  }
};

export const signInWithFacebook = async (req: Request, res: Response) => {
  if (!firebaseAdminAuth) {
    return res.status(503).json({
      message: "Firebase Admin is not configured",
    });
  }

  const parsed = firebaseTokenSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid Firebase ID token payload",
    });
  }

  try {
    const decoded = await firebaseAdminAuth.verifyIdToken(parsed.data.idToken);

    if (decoded.firebase?.sign_in_provider !== "facebook.com") {
      return res.status(401).json({
        message: "Firebase ID token is not from Facebook",
      });
    }

    if (!decoded.email) {
      return res.status(400).json({
        message: "Facebook account has no email",
      });
    }

    const email = decoded.email.toLowerCase();

    let user = await UserModel.findOne({
      $or: [{ facebookUid: decoded.uid }, { email }],
    });

    if (!user) {
      const username = await generateUsername(decoded.name ?? "", email);

      user = await UserModel.create({
        email,
        username,
        displayName: decoded.name ?? username,
        photoURL: decoded.picture ?? null,
        facebookUid: decoded.uid,
        providers: ["facebook"],
      });
    } else {
      user.facebookUid = decoded.uid;
      user.displayName = decoded.name ?? user.displayName;
      user.photoURL = decoded.picture ?? user.photoURL;

      if (!user.providers.includes("facebook")) {
        user.providers.push("facebook");
      }

      await user.save();
    }

    return res.json({
      user: publicUser(user),
      token: createAccessToken(user.id),
    });
  } catch (error) {
    console.error("Facebook Firebase authentication failed:", error);

    return res.status(401).json({
      message: "Invalid Facebook Firebase ID token",
    });
  }
};

export const me = async (req: Request, res: Response) => {
  const user = await UserModel.findById(req.userId);

  if (!user) return res.status(404).json({ message: "User not found" });

  return res.json({ user: publicUser(user) });
};

const generateUsername = async (displayName: string, email: string) => {
  const emailUsername = email.split("@")[0] ?? "";

  const base =
    displayName
      .toLowerCase()
      .replace(/[^a-z0-9_.-]/g, "")
      .slice(0, 24) ||
    emailUsername
      .toLowerCase()
      .replace(/[^a-z0-9_.-]/g, "")
      .slice(0, 24) ||
    "user";

  let username = base;
  let counter = 1;

  while (await UserModel.exists({ username })) {
    username = `${base}_${counter++}`;
  }

  return username;
};
