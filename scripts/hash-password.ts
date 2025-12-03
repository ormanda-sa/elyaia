// scripts/hash-password.ts
// تشغيل يدوي: npx ts-node scripts/hash-password.ts your-password-here

import crypto from "crypto";

const PASSWORD_SECRET = process.env.PASSWORD_SECRET || "darb-filter-secret";

function hashPassword(plain: string): string {
  return crypto
    .createHmac("sha256", PASSWORD_SECRET)
    .update(plain)
    .digest("hex");
}

const plain = process.argv[2];

if (!plain) {
  console.error("اكتب كلمة المرور بعد اسم الملف");
  process.exit(1);
}

const hashed = hashPassword(plain);
console.log("Plain:", plain);
console.log("Hash :", hashed);
