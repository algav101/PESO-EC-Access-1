"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AuthUser, hasPermission } from "@/lib/permissions";

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (u: AuthUser, token?: string) => void;
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
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("peso_cached_user");
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (e) {
          return null;
        }
      }
    }
    return null;
  });
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
            localStorage.setItem("peso_cached_user", JSON.stringify(data.user));
          } else {
            setUser(null);
            localStorage.removeItem("peso_cached_user");
          }
        } else if (res.status === 401) {
          setUser(null);
          localStorage.removeItem("peso_cached_user");
        } else {
          // Fallback to cached session when offline or server unreachable
          const cached = localStorage.getItem("peso_cached_user");
          if (cached) {
            try {
              setUser(JSON.parse(cached));
            } catch (e) {}
          }
        }
      } catch (err) {
        // Network failure / completely offline: use cached session
        const cached = localStorage.getItem("peso_cached_user");
        if (cached) {
          try {
            setUser(JSON.parse(cached));
          } catch (e) {}
        }
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [pathname]);

  const login = (u: AuthUser, token?: string) => {
    setUser(u);
    if (typeof window !== "undefined") {
      localStorage.setItem("peso_cached_user", JSON.stringify(u));
      if (token) {
        localStorage.setItem("peso_jwt_token", token);
      }
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
    } catch (e) {}
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("peso_cached_user");
      localStorage.removeItem("peso_jwt_token");
    }
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
