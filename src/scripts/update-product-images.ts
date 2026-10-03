import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import mongoose from "mongoose";

import { connectDatabase } from "../config/database.js";
import { ProductModel } from "../models/product.model.js";

type SeedProduct = {
  name: string;
  image: string;
  images: string[];
};

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);

const productsPath = path.join(currentDir, "../data/products.json");

const main = async () => {
  console.log("Starting product image update...");

  const fileContent = await fs.readFile(productsPath, "utf8");

  const products = JSON.parse(fileContent) as SeedProduct[];

  if (!products.length) {
    throw new Error("products.json is empty");
  }

  await connectDatabase();

  console.log("Connected to MongoDB.");

  try {
    let updated = 0;
    let notFound = 0;

    for (const product of products) {
      if (!product.name) {
        console.warn("Skipping product without a name.");
        continue;
      }

      if (!product.image) {
        console.warn(`Skipping "${product.name}" because image is missing.`);
        continue;
      }

      if (!Array.isArray(product.images)) {
        console.warn(
          `Skipping "${product.name}" because images is not an array.`,
        );
        continue;
      }

      const result = await ProductModel.updateOne(
        { name: product.name },
        {
          $set: {
            image: product.image,
            images: product.images,
          },
        },
      );

      if (result.matchedCount === 0) {
        notFound++;

        console.warn(`Product not found: ${product.name}`);

        continue;
      }

      if (result.modifiedCount > 0) {
        updated++;

        console.log(`Updated: ${product.name}`);
      } else {
        console.log(`Already up to date: ${product.name}`);
      }
    }

    console.log("");
    console.log("================================");
    console.log("PRODUCT IMAGE UPDATE COMPLETED");
    console.log("================================");
    console.log(`Products in JSON: ${products.length}`);
    console.log(`Products updated: ${updated}`);
    console.log(`Products not found: ${notFound}`);
    console.log("================================");
  } finally {
    await mongoose.disconnect();

    console.log("Disconnected from MongoDB.");
  }
};

main().catch(async (error: unknown) => {
  console.error("Failed to update product images:");
  console.error(error);

  try {
    await mongoose.disconnect();
  } catch {
    // Ignore disconnect errors.
  }

  process.exit(1);
});
