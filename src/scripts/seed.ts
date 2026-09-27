import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import mongoose from "mongoose";

import { connectDatabase } from "../config/database.js";

import { BrandModel } from "../models/brand.model.js";
import { CategoryModel } from "../models/category.model.js";
import { ProductModel } from "../models/product.model.js";

type SeedBrand = {
  _id: string;
  name: string;
};

type SeedCategory = {
  _id: string;
  name: string;
};

type SeedReview = {
  _id?: string;
  user?: string;
  rating?: number;
  comment?: string;
  likes?: string[];
  dislikes?: string[];
  createdAt?: string;
  updatedAt?: string;
};

type SeedProduct = {
  _id?: string;
  name: string;
  description: string;
  richDescription?: string;
  image: string;
  images?: string[];

  brand: {
    _id: string;
    name?: string;
  };

  category: {
    _id: string;
    name?: string;
  };

  originalPrice: number;
  discount: number;
  priceAfterDiscount: number;
  countInStock: number;

  isFeatured?: boolean;
  shipping?: boolean;
  returnable?: boolean;
  trend?: boolean;

  returnPeriod?: string;
  shippingInfo?: string;

  color?: string[];
  ram?: string[];
  weight?: string[];
  sizes?: string[];

  rating?: number;
  numReviews?: number;
  orderCount?: number;

  reviews?: SeedReview[];
};

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);

const dataDirectory = path.resolve(currentDir, "../data");

const brandsPath = path.join(dataDirectory, "brands.json");

const categoriesPath = path.join(dataDirectory, "categories.json");

const productsPath = path.join(dataDirectory, "products.json");

const readJsonFile = async <T>(filePath: string): Promise<T> => {
  const content = await fs.readFile(filePath, "utf8");

  return JSON.parse(content) as T;
};

const assertNoDuplicateIds = (
  items: { _id: string }[],
  collectionName: string,
) => {
  const ids = new Set<string>();

  for (const item of items) {
    if (!item._id) {
      throw new Error(`${collectionName}: every item must have an _id`);
    }

    if (ids.has(item._id)) {
      throw new Error(`${collectionName}: duplicate _id "${item._id}"`);
    }

    ids.add(item._id);
  }
};

const createObjectIdMap = (
  ids: string[],
): Map<string, mongoose.Types.ObjectId> => {
  const map = new Map<string, mongoose.Types.ObjectId>();

  for (const id of ids) {
    map.set(id, new mongoose.Types.ObjectId());
  }

  return map;
};

const validateProductReferences = (
  products: SeedProduct[],
  brandIds: Set<string>,
  categoryIds: Set<string>,
) => {
  for (const product of products) {
    if (!product.brand?._id) {
      throw new Error(`Product "${product.name}" is missing brand._id`);
    }

    if (!product.category?._id) {
      throw new Error(`Product "${product.name}" is missing category._id`);
    }

    if (!brandIds.has(product.brand._id)) {
      throw new Error(
        `Product "${product.name}" references unknown brand "${product.brand._id}"`,
      );
    }

    if (!categoryIds.has(product.category._id)) {
      throw new Error(
        `Product "${product.name}" references unknown category "${product.category._id}"`,
      );
    }
  }
};

const main = async () => {
  console.log("Starting database seed...");

  console.log(`Data directory: ${dataDirectory}`);

  const [brands, categories, products] = await Promise.all([
    readJsonFile<SeedBrand[]>(brandsPath),
    readJsonFile<SeedCategory[]>(categoriesPath),
    readJsonFile<SeedProduct[]>(productsPath),
  ]);

  console.log(`Loaded ${brands.length} brands`);

  console.log(`Loaded ${categories.length} categories`);

  console.log(`Loaded ${products.length} products`);

  if (brands.length === 0) {
    throw new Error("brands.json is empty");
  }

  if (categories.length === 0) {
    throw new Error("categories.json is empty");
  }

  if (products.length === 0) {
    throw new Error("products.json is empty");
  }

  /*
   * Validate seed IDs.
   *
   * These IDs do NOT have to be MongoDB ObjectIds.
   * They are only used as stable references between
   * brands/categories/products inside the seed JSON.
   */
  assertNoDuplicateIds(brands, "brands.json");

  assertNoDuplicateIds(categories, "categories.json");

  /*
   * Products may or may not have _id values.
   * We only validate them when present.
   */
  const productIds = products
    .map((product) => product._id)
    .filter((id): id is string => Boolean(id));

  if (productIds.length > 0) {
    assertNoDuplicateIds(
      products.filter(
        (
          product,
        ): product is SeedProduct & {
          _id: string;
        } => Boolean(product._id),
      ),
      "products.json",
    );
  }

  const brandIds = new Set(brands.map((brand) => brand._id));

  const categoryIds = new Set(categories.map((category) => category._id));

  validateProductReferences(products, brandIds, categoryIds);

  /*
   * Create real MongoDB ObjectIds.
   *
   * Example:
   *
   * JSON brand:
   *   "78b01f12a3c0001"
   *
   * becomes something like:
   *   68d7f2c9e6f0c7a4b8c12345
   *
   * The SAME generated ObjectId is used everywhere
   * that brand is referenced.
   */
  const brandObjectIds = createObjectIdMap(brands.map((brand) => brand._id));

  const categoryObjectIds = createObjectIdMap(
    categories.map((category) => category._id),
  );

  /*
   * Convert brands into MongoDB documents.
   */
  const brandDocuments = brands.map((brand) => ({
    _id: brandObjectIds.get(brand._id)!,
    name: brand.name,
  }));

  /*
   * Convert categories into MongoDB documents.
   */
  const categoryDocuments = categories.map((category) => ({
    _id: categoryObjectIds.get(category._id)!,
    name: category.name,
  }));

  /*
   * Convert products into MongoDB documents.
   */
  const productDocuments = products.map((product) => {
    const brandId = brandObjectIds.get(product.brand._id);

    const categoryId = categoryObjectIds.get(product.category._id);

    if (!brandId) {
      throw new Error(
        `Could not map brand "${product.brand._id}" for product "${product.name}"`,
      );
    }

    if (!categoryId) {
      throw new Error(
        `Could not map category "${product.category._id}" for product "${product.name}"`,
      );
    }

    return {
      /*
       * Let MongoDB generate a real ObjectId
       * for the product.
       */
      ...(product._id && mongoose.Types.ObjectId.isValid(product._id)
        ? {
            _id: new mongoose.Types.ObjectId(product._id),
          }
        : {}),

      name: product.name,

      description: product.description,

      richDescription: product.richDescription,

      image: product.image,

      images: product.images ?? [],

      brand: brandId,

      category: categoryId,

      originalPrice: product.originalPrice,

      discount: product.discount,

      priceAfterDiscount: product.priceAfterDiscount,

      countInStock: product.countInStock,

      isFeatured: product.isFeatured ?? false,

      shipping: product.shipping ?? true,

      returnable: product.returnable ?? true,

      trend: product.trend ?? false,

      returnPeriod: product.returnPeriod,

      shippingInfo: product.shippingInfo,

      color: product.color ?? [],

      ram: product.ram ?? [],

      weight: product.weight ?? [],

      sizes: product.sizes ?? [],

      rating: product.rating ?? 0,

      numReviews: product.numReviews ?? 0,

      orderCount: product.orderCount ?? 0,

      /*
       * Seed reviews are optional.
       * Normally the initial seed will contain none.
       */
      reviews:
        product.reviews?.map((review) => ({
          _id:
            review._id && mongoose.Types.ObjectId.isValid(review._id)
              ? new mongoose.Types.ObjectId(review._id)
              : new mongoose.Types.ObjectId(),

          user:
            review.user && mongoose.Types.ObjectId.isValid(review.user)
              ? new mongoose.Types.ObjectId(review.user)
              : undefined,

          rating: review.rating ?? 5,

          comment: review.comment ?? "",

          likes:
            review.likes
              ?.filter((id) => mongoose.Types.ObjectId.isValid(id))
              .map((id) => new mongoose.Types.ObjectId(id)) ?? [],

          dislikes:
            review.dislikes
              ?.filter((id) => mongoose.Types.ObjectId.isValid(id))
              .map((id) => new mongoose.Types.ObjectId(id)) ?? [],

          createdAt: review.createdAt ? new Date(review.createdAt) : new Date(),

          updatedAt: review.updatedAt ? new Date(review.updatedAt) : new Date(),
        })) ?? [],
    };
  });

  /*
   * Connect to MongoDB.
   */
  await connectDatabase();

  console.log("Connected to MongoDB.");

  try {
    /*
     * Clear existing seed-related collections.
     *
     * IMPORTANT:
     * This deletes all products, brands and categories
     * from this database.
     */
    console.log("Clearing existing products...");

    await ProductModel.deleteMany({});

    console.log("Clearing existing brands...");

    await BrandModel.deleteMany({});

    console.log("Clearing existing categories...");

    await CategoryModel.deleteMany({});

    /*
     * Insert categories first.
     */
    console.log("Inserting categories...");

    await CategoryModel.insertMany(categoryDocuments);

    /*
     * Insert brands.
     */
    console.log("Inserting brands...");

    await BrandModel.insertMany(brandDocuments);

    /*
     * Insert products.
     *
     * Because brand/category IDs were mapped above,
     * every product points to the correct inserted
     * MongoDB document.
     */
    console.log("Inserting products...");

    await ProductModel.insertMany(productDocuments);

    /*
     * Verify database integrity.
     */
    console.log("Checking product references...");

    const insertedProducts = await ProductModel.find()
      .select("_id name brand category")
      .lean();

    const insertedBrands = await BrandModel.find().select("_id name").lean();

    const insertedCategories = await CategoryModel.find()
      .select("_id name")
      .lean();

    const insertedBrandIds = new Set(
      insertedBrands.map((brand) => brand._id.toString()),
    );

    const insertedCategoryIds = new Set(
      insertedCategories.map((category) => category._id.toString()),
    );

    const invalidProducts = insertedProducts.filter(
      (product) =>
        !insertedBrandIds.has(product.brand.toString()) ||
        !insertedCategoryIds.has(product.category.toString()),
    );

    if (invalidProducts.length > 0) {
      throw new Error(
        `Integrity check failed. ${invalidProducts.length} products have invalid brand/category references.`,
      );
    }

    /*
     * Final summary.
     */
    console.log("");
    console.log("================================");
    console.log("DATABASE SEED COMPLETED");
    console.log("================================");

    console.log(`Categories: ${insertedCategories.length}`);

    console.log(`Brands: ${insertedBrands.length}`);

    console.log(`Products: ${insertedProducts.length}`);

    console.log("All product brand/category references are valid.");

    console.log("================================");
  } finally {
    await mongoose.disconnect();

    console.log("Disconnected from MongoDB.");
  }
};

main().catch(async (error: unknown) => {
  console.error("");
  console.error("================================");
  console.error("DATABASE SEED FAILED");
  console.error("================================");
  console.error(error);

  try {
    await mongoose.disconnect();
  } catch {
    // Ignore disconnect errors.
  }

  process.exit(1);
});
