import { Schema, model, type Document } from "mongoose";

export interface ICategory extends Document {
  name: string;
  isTopCategory: boolean;
}

const categorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    isTopCategory: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

export const CategoryModel = model<ICategory>("Category", categorySchema);
