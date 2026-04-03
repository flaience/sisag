import crypto from "crypto";

export function generateInviteToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function getInviteExpiration(days = 7) {
  const now = new Date();
  now.setDate(now.getDate() + days);
  return now;
}
