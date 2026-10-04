import jwt from "jsonwebtoken";
import ErrorHandler from "./error.js";
import User from "../models/user.js";

// Authentication uses a JWT sent in the Authorization header ("Bearer <token>").
// This works the same on localhost, Vercel and Render, even when the website and API are on different domains
// (cookies would be blocked by browsers in that case).
export const signToken = (user) => {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not set");
  return jwt.sign({ id: String(user._id), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: user.role === "admin" ? "12h" : "7d",
  });
};

export const requireAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return next(new ErrorHandler("Please log in to continue.", 401));
    let payload;
    try { payload = jwt.verify(token, process.env.JWT_SECRET); }
    catch { return next(new ErrorHandler("Your session has expired. Please log in again.", 401)); }
    const user = await User.findById(payload.id);
    if (!user) return next(new ErrorHandler("Please log in to continue.", 401));
    req.user = user;
    next();
  } catch (e) { next(e); }
};

// Role check - must run after requireAuth. The role always comes from the database, never from the token.
export const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user?.role) ? next() : next(new ErrorHandler("You do not have permission to do that.", 403));
