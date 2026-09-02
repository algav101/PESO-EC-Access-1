"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AuthUser, hasPermission } from "@/lib/permissions";

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (u: AuthUser) => void;
  logout: () => Promise<void>;
  can: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: async () => {},
  can: () => false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/v1/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            setUser(data.user);
          } else {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [pathname]);

  const login = (u: AuthUser) => {
    setUser(u);
  };

  const logout = async () => {
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
    } catch (e) {}
    setUser(null);
    router.push("/login");
  };

  const can = (permission: string) => {
    if (!user) return false;
    return hasPermission(user.role, permission);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
