import { Schema, model, type Document, type Types } from "mongoose";

export interface IOrderItem {
  product: Types.ObjectId;

  name: string;
  image: string;

  quantity: number;
  price: number;

  subtotal: number;
}

export interface IOrder extends Document {
  user: Types.ObjectId;

  items: IOrderItem[];

  total: number;

  paymentIntentId?: string;

  paid: boolean;
  paidAt?: Date;

  delivered: boolean;
  deliveredAt?: Date;

  status:
    | "pending"
    | "paid"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled";

  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    name: {
      type: String,
      required: true,
    },

    image: {
      type: String,
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: false,
  },
);

const orderSchema = new Schema<IOrder>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items: IOrderItem[]) => items.length > 0,
        message: "Order must contain at least one item",
      },
    },

    total: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentIntentId: {
      type: String,
      required: false,
    },

    paid: {
      type: Boolean,
      default: false,
    },

    paidAt: {
      type: Date,
    },

    delivered: {
      type: Boolean,
      default: false,
    },

    deliveredAt: {
      type: Date,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "paid",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      default: "pending",
    },
  },
  {
    timestamps: true,
  },
);

orderSchema.index({
  user: 1,
  createdAt: -1,
});

export const OrderModel = model<IOrder>("Order", orderSchema);
