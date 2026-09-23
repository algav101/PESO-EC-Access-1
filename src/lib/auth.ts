import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import crypto from "crypto";
import { AuthUser } from "./permissions";

export * from "./permissions";

const AUTH_SECRET = process.env.AUTH_SECRET || "peso_tupad_dingalan_super_secret_jwt_key_2026";
const COOKIE_NAME = "tupad_auth_token";

if (process.env.NODE_ENV === "production" && !process.env.AUTH_SECRET) {
  console.warn("⚠️ SECURITY WARNING: AUTH_SECRET environment variable is not explicitly set in production!");
}

export function signToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      assignedBarangay: user.assignedBarangay || null,
    },
    AUTH_SECRET,
    { expiresIn: "7d" }
  );
}

export function verifyToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, AUTH_SECRET) as AuthUser;
  } catch (error) {
    return null;
  }
}

export async function getCurrentUser(request?: Request): Promise<AuthUser | null> {
  // 1. Check Cookie first
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (token) {
      const user = verifyToken(token);
      if (user) return user;
    }
  } catch (e) {
    // Cookie store may fail outside request contexts
  }

  // 2. Fallback to Authorization Bearer token header (for mobile apps, PWA, or cross-device sync)
  if (request) {
    try {
      const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
      if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
        const token = authHeader.slice(7).trim();
        if (token) {
          const user = verifyToken(token);
          if (user) return user;
        }
      }
    } catch (e) {}
  }

  return null;
}

/**
 * Generates a cryptographically signed CAPTCHA challenge that cannot be forged or bypassed by the client.
 */
export function generateCaptchaChallenge(): { num1: number; num2: number; question: string; token: string } {
  const num1 = Math.floor(Math.random() * 15) + 5;
  const num2 = Math.floor(Math.random() * 12) + 3;
  const answer = num1 + num2;
  const timestamp = Date.now();
  const payload = `${answer}:${timestamp}`;
  const hmac = crypto.createHmac("sha256", AUTH_SECRET).update(payload).digest("hex");
  const token = Buffer.from(`${payload}:${hmac}`).toString("base64");

  return {
    num1,
    num2,
    question: `${num1} + ${num2} = ?`,
    token,
  };
}

/**
 * Validates a user's answer against the server-signed CAPTCHA token (expires in 10 minutes).
 */
export function verifyCaptchaChallenge(userAnswer: string | number, token: string): boolean {
  if (!userAnswer || !token) return false;
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [expectedAnswerStr, timestampStr, providedHmac] = decoded.split(":");
    if (!expectedAnswerStr || !timestampStr || !providedHmac) return false;

    // Check expiration (10 minutes)
    const ageMs = Date.now() - parseInt(timestampStr, 10);
    if (isNaN(ageMs) || ageMs < 0 || ageMs > 10 * 60 * 1000) return false;

    const recomputedHmac = crypto
      .createHmac("sha256", AUTH_SECRET)
      .update(`${expectedAnswerStr}:${timestampStr}`)
      .digest("hex");

    if (recomputedHmac !== providedHmac) return false;

    return String(userAnswer).trim() === expectedAnswerStr.trim();
  } catch {
    return false;
  }
}

