// src/lib/passwordHash.ts
import crypto from "crypto";

/**
 * نفس الدالة تُستخدم في:
 * - إنشاء مستخدم جديد (Onboarding)
 * - تسجيل الدخول /api/auth/login
 * - تغيير كلمة المرور /api/auth/reset-password
 */
export function hashPassword(rawPassword: string): string {
  const secret = process.env.PASSWORD_SECRET || "";
  return crypto
    .createHash("sha256")
    .update(`${secret}:${rawPassword}`)
    .digest("hex");
}
