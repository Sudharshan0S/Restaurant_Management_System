import mongoose from "mongoose";
import { seedAdmin } from "./seed.js";

// One cached connection per process. Works for a normal server and for serverless hosts (Vercel),
// where the same instance handles many requests.
const state = (globalThis.__restaurantDb ||= { promise: null, ready: false });

export async function connectDB() {
  if (state.ready && mongoose.connection.readyState === 1) return mongoose.connection;
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is not set.");
  state.promise ||= mongoose
    .connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: Number(process.env.MONGO_SELECT_TIMEOUT_MS) || 10000, maxPoolSize: 10 })
    .then(async () => {
      await seedAdmin();
      state.ready = true;
      return mongoose.connection;
    })
    .catch((err) => { state.promise = null; throw err; });
  return state.promise;
}
