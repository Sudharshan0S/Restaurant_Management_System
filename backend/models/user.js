import mongoose from "mongoose";

export const ROLES = ["customer", "admin"];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minLength: 2, maxLength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: function () { return this.role !== "admin"; }, default: "" },
    role: { type: String, enum: ROLES, default: "customer", index: true },
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;
