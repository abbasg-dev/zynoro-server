import { app } from "./app.js";
import { connectDatabase } from "./config/database.js";
import { env } from "./config/env.js";

try {
  await connectDatabase();

  console.log("Database connected successfully.");

  app.listen(env.PORT, () => {
    console.log(`API running on http://localhost:${env.PORT}`);
    console.log("Server started successfully.");
  });
} catch (error) {
  console.error("Database connection failed.");
  console.error("Failed to start server:", error);

  process.exit(1);
}
