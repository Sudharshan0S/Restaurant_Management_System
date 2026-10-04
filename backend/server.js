import dotenv from "dotenv";
dotenv.config({ path: "./config.env", quiet: true });
import app from "./app.js";
import { connectDB } from "./database/dbConnection.js";

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  console.error("JWT_SECRET is missing or too short. Set a long random value (see config.env.example).");
  process.exit(1);
}

const PORT = process.env.PORT || 5000;

try {
  await connectDB();
  console.log("MongoDB connected successfully");
} catch (err) {
  console.error("MongoDB connection failed. Is MongoDB running and MONGO_URI correct?", err.message);
  process.exit(1);
}

app.listen(PORT, () => console.log(`SERVER HAS STARTED AT PORT ${PORT}`));
