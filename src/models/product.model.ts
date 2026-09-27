import mongoose, { Schema, model, type Document, type Types } from "mongoose";

export interface IReview {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  rating: number;
  comment: string;
  likes: Types.ObjectId[];
  dislikes: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IProduct extends Document {
  name: string;
  description: string;
  richDescription?: string;

  image: string;
  images: string[];

  brand: Types.ObjectId;
  category: Types.ObjectId;

  originalPrice: number;
  discount: number;
  priceAfterDiscount: number;

  countInStock: number;

  isFeatured: boolean;
  shipping: boolean;
  returnable: boolean;
  trend: boolean;

  returnPeriod?: string;
  shippingInfo?: string;

  color?: string[];
  ram?: string[];
  weight?: string[];
  sizes?: string[];

  rating: number;
  numReviews: number;
  orderCount: number;

  reviews: IReview[];
}

const reviewSchema = new Schema<IReview>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    comment: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },

    likes: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    dislikes: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  },
);

const productSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    description: {
      type: String,
      required: true,
    },

    richDescription: {
      type: String,
    },

    image: {
      type: String,
      required: true,
    },

    images: {
      type: [String],
      default: [],
    },

    brand: {
      type: Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
      index: true,
    },

    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },

    originalPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    discount: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },

    priceAfterDiscount: {
      type: Number,
      required: true,
      min: 0,
    },

    countInStock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },

    shipping: {
      type: Boolean,
      default: true,
    },

    returnable: {
      type: Boolean,
      default: true,
    },

    trend: {
      type: Boolean,
      default: false,
      index: true,
    },

    returnPeriod: {
      type: String,
    },

    shippingInfo: {
      type: String,
    },

    color: {
      type: [String],
      default: [],
    },

    ram: {
      type: [String],
      default: [],
    },

    weight: {
      type: [String],
      default: [],
    },

    sizes: {
      type: [String],
      default: [],
    },

    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },

    numReviews: {
      type: Number,
      default: 0,
    },

    orderCount: {
      type: Number,
      default: 0,
    },

    reviews: {
      type: [reviewSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

productSchema.index({
  name: "text",
  description: "text",
});

productSchema.index({
  category: 1,
  brand: 1,
  priceAfterDiscount: 1,
  discount: 1,
  rating: -1,
});

export const ProductModel = model<IProduct>("Product", productSchema);
