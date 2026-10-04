import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import compression from "compression";
import authRouter from "./routes/authRoute.js";
import adminRouter from "./routes/adminRoute.js";
import orderRouter from "./routes/orderRoute.js";
import reservationRouter from "./routes/reservationRoute.js";
import { connectDB } from "./database/dbConnection.js";
import { errorMiddleware } from "./middlewares/error.js";

dotenv.config({ path: "./config.env", quiet: true }); // harmless if the file is missing (Vercel/Render use dashboard variables)

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1); // correct client IPs behind Render/Vercel proxies (needed for rate limiting)

// CORS: login uses an Authorization header (no cookies), so cross-origin access is safe.
// Set FRONTEND_URL (comma separated) to restrict the API to your website; leave it empty to allow any origin.
const allowed = (process.env.FRONTEND_URL || "").split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || allowed.length === 0 || allowed.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)),
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
}));
app.use(compression());

app.get("/", (req, res) => res.status(200).json({ success: true, message: "Restaurant API is running." }));

// Make sure the database is connected (cached after the first request).
app.use("/api", async (req, res, next) => {
  if (process.env.SKIP_DB === "true") return next();
  try { await connectDB(); next(); }
  catch (err) {
    console.error("[db] connection failed:", err.message);
    res.status(503).json({ success: false, message: "The service is temporarily unavailable. Please try again shortly." });
  }
});

app.use(express.json({ limit: "20kb" }));
app.use((req, res, next) => { req.body ??= {}; next(); });

app.use("/api/admin", adminRouter);

app.use("/api/auth", authRouter);
app.use("/api/reservations", reservationRouter);
app.use("/api/orders", orderRouter);

app.use((req, res) => res.status(404).json({ success: false, message: "Not found." }));
app.use(errorMiddleware);

export default app;
