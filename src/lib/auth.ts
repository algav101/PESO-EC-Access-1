import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { AuthUser } from "./permissions";

export * from "./permissions";

const AUTH_SECRET = process.env.AUTH_SECRET || "peso_tupad_dingalan_super_secret_jwt_key_2026";
const COOKIE_NAME = "tupad_auth_token";

export function signToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
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

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}
