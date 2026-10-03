import { Schema, model, type Document } from "mongoose";

export type AuthProvider = "password" | "google" | "facebook";

export interface IUser extends Document {
  email: string;
  username: string;
  displayName: string;
  photoURL?: string | null;
  passwordHash?: string;
  googleUid?: string;
  facebookUid?: string;
  providers: AuthProvider[];
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    displayName: {
      type: String,
      required: true,
    },
    photoURL: {
      type: String,
      default: null,
    },
    passwordHash: {
      type: String,
    },
    googleUid: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    facebookUid: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    providers: {
      type: [String],
      enum: ["password", "google", "facebook"],
      default: [],
    },
  },
  { timestamps: true },
);

export const UserModel = model<IUser>("User", userSchema);
