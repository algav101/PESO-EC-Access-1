"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { PesoLogo } from "@/components/layout/PesoLogo";
import { useAuth } from "@/context/AuthContext";
import { Shield, Lock, User, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Please provide your username and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      login(data.user);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-100">
      <div className="w-full max-w-md space-y-6">
        {/* Card */}
        <div className="gov-card p-6 sm:p-8 border-t-4 border-t-gov-gold shadow-xl">
          {/* Header */}
          <div className="text-center space-y-3 pb-6 border-b border-slate-100">
            <div className="flex items-center justify-center">
              <PesoLogo className="h-16 w-16" size={64} />
            </div>
            <div className="space-y-0.5">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                LGU DINGALAN • PESO DINGALAN
              </h2>
              <p className="text-xs text-slate-500 font-semibold">
                TUPAD EC Management System
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Username / User ID
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin or coordinator"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-gov-blue focus:ring-1 focus:ring-gov-blue bg-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-gov-blue focus:ring-1 focus:ring-gov-blue bg-white"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gov-blue hover:bg-gov-light text-white font-bold text-xs rounded-lg transition shadow-md flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In to System</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security Notice */}
        <div className="text-center text-[11px] text-slate-500 space-y-1">
          <div className="flex items-center justify-center space-x-1 text-slate-600">
            <Shield className="w-3.5 h-3.5 text-gov-gold" />
            <span className="font-bold">Official Government Information System</span>
          </div>
          <p>Protected under Republic Act 10173 (Data Privacy Act of 2012)</p>
        </div>
      </div>
    </div>
  );
}
