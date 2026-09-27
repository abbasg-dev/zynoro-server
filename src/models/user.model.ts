import { Schema, model, type Document } from "mongoose";

export interface IUser extends Document {
  email: string;
  username: string;
  displayName: string;
  passwordHash?: string;
  firebaseUid?: string;
  providers: string[];
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
    displayName: { type: String, required: true },
    passwordHash: { type: String },
    firebaseUid: { type: String, unique: true, sparse: true, index: true },
    providers: {
      type: [String],
      enum: ["password", "google"],
      default: [],
    },
  },
  { timestamps: true },
);

export const UserModel = model<IUser>("User", userSchema);
