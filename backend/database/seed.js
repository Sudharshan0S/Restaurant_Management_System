import bcrypt from "bcryptjs";
import User from "../models/user.js";

// Admin account comes from ADMIN_EMAIL / ADMIN_PASSWORD. Local development falls back to admin@gmail.com / admin123.
// In production there is NO default: set both variables on your host or no admin account is created.
export async function seedAdmin() {
  let email = process.env.ADMIN_EMAIL;
  let password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    if (process.env.NODE_ENV === "production") {
      console.warn("[admin] ADMIN_EMAIL / ADMIN_PASSWORD are not set - no admin account was created.");
      return;
    }
    email = "admin@gmail.com"; password = "admin123";
  }
  email = email.trim().toLowerCase();
  const existing = await User.findOne({ email }).select("+passwordHash");
  if (!existing) {
    await User.create({ name: "Admin", email, role: "admin", passwordHash: await bcrypt.hash(password, 12) });
    console.log(`[admin] Admin account created for ${email}`);
  } else if (existing.role === "admin" && !(await bcrypt.compare(password, existing.passwordHash))) {
    existing.passwordHash = await bcrypt.hash(password, 12); // lets you change the password by changing the env variable
    await existing.save();
    console.log("[admin] Admin password updated from ADMIN_PASSWORD.");
  }
}
