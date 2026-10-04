import bcrypt from "bcryptjs";
import ErrorHandler from "../middlewares/error.js";
import User from "../models/user.js";
import { signToken } from "../middlewares/auth.js";
import { cleanText, isEmail, normalizePhone, strongPassword } from "../utils/validators.js";

const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, phone: u.phone, role: u.role });
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password-1", 10); // equalises timing for unknown emails

export const register = async (req, res, next) => {
  try {
    const name = cleanText(req.body.name, 60);
    const email = String(req.body.email || "").trim().toLowerCase();
    const phone = normalizePhone(req.body.phone);
    const { password } = req.body;
    if (name.length < 2) throw new ErrorHandler("Please enter your name (at least 2 characters).", 400);
    if (!isEmail(email)) throw new ErrorHandler("Please enter a valid email address.", 400);
    if (!phone) throw new ErrorHandler("Please enter a valid 10-digit Indian mobile number.", 400);
    if (!strongPassword(password)) throw new ErrorHandler("Password must be 8-72 characters and include a letter and a number.", 400);

    if (await User.exists({ email })) throw new ErrorHandler("An account with this email already exists. Please log in.", 409);
    const user = await User.create({ name, email, phone, role: "customer", passwordHash: await bcrypt.hash(password, 12) });
    res.status(201).json({ success: true, message: "Account created.", user: publicUser(user), token: signToken(user) });
  } catch (e) { next(e); }
};

// Shared by the customer and admin login pages. `role` decides which accounts may use which endpoint.
const loginAs = (role) => async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const user = isEmail(email) ? await User.findOne({ email }).select("+passwordHash") : null;
    const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
    if (!user || !ok) throw new ErrorHandler("Invalid email or password.", 401);
    if (role === "admin" && user.role !== "admin") throw new ErrorHandler("Invalid email or password.", 401);
    if (role === "customer" && user.role === "admin") throw new ErrorHandler("This is an admin account. Please use the admin login page.", 403);
    res.json({ success: true, message: "Logged in.", user: publicUser(user), token: signToken(user) });
  } catch (e) { next(e); }
};
export const login = loginAs("customer");
export const adminLogin = loginAs("admin");

export const logout = (req, res) => res.json({ success: true, message: "Logged out." }); // token is discarded by the client
export const me = (req, res) => res.json({ success: true, user: publicUser(req.user) });
