import { Schema, model, type Document } from "mongoose";

export interface IBrand extends Document {
  name: string;
}

const brandSchema = new Schema<IBrand>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

export const BrandModel = model<IBrand>("Brand", brandSchema);
