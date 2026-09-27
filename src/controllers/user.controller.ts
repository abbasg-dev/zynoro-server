import type { Request, Response } from "express";
import { UserModel } from "../models/user.model.js";

export const getUserById = async (req: Request, res: Response) => {
  const user = await UserModel.findById(req.params.id).select(
    "_id username displayName firebaseUid providers createdAt",
  );

  if (!user) {
    return res.status(404).json({
      message: "User not found",
    });
  }

  return res.json({
    user,
  });
};
