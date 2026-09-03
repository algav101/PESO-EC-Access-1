"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { PesoLogo } from "@/components/layout/PesoLogo";
import { useAuth } from "@/context/AuthContext";
import {
  Shield,
  Lock,
  User,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  UserCheck,
  Building,
  MapPin,
  Sparkles,
} from "lucide-react";

interface PresetAccount {
  label: string;
  name: string;
  username: string;
  role: string;
  barangay?: string;
}

const PRESET_ROLES: { id: string; label: string; description: string; accounts: PresetAccount[] }[] = [
  {
    id: "PESO_ADMIN",
    label: "PESO Admin",
    description: "Full administrative, database, and program management access",
    accounts: [
      { label: "PESO Dingalan Admin Officer", name: "PESO Dingalan Admin", username: "admin", role: "PESO Admin", barangay: "Municipality-wide" },
    ],
  },
  {
    id: "TUPAD_COORDINATOR",
    label: "TUPAD Field Coordinator",
    description: "Barangay-scoped field attendance, photo uploads, and beneficiary work program access",
    accounts: [
      { label: "NEDDIE (Brgy. Umiray)", name: "Neddie", username: "peso_umiray1", role: "Tupad Coordinator", barangay: "Umiray" },
      { label: "SHIELA (Brgy. Umiray)", name: "Shiela", username: "peso_umiray2", role: "Tupad Coordinator", barangay: "Umiray" },
      { label: "MARIAN (Brgy. Umiray)", name: "Marian", username: "peso_umiray3", role: "Tupad Coordinator", barangay: "Umiray" },
      { label: "NALYN (Brgy. Umiray)", name: "Nalyn", username: "peso_umiray4", role: "Tupad Coordinator", barangay: "Umiray" },
      { label: "GRACE (Brgy. Ibona)", name: "Grace", username: "peso_ibona1", role: "Tupad Coordinator", barangay: "Ibona" },
      { label: "VENGEL (Brgy. Ibona)", name: "Vengel", username: "peso_ibona2", role: "Tupad Coordinator", barangay: "Ibona" },
      { label: "MAY (Brgy. Matawe)", name: "May", username: "peso_matawe1", role: "Tupad Coordinator", barangay: "Matawe" },
      { label: "ANNALYN (Brgy. Matawe)", name: "Annalyn", username: "peso_matawe_2", role: "Tupad Coordinator", barangay: "Matawe" },
      { label: "ENA (Brgy. Butas na Bato)", name: "Ena", username: "peso_bnb", role: "Tupad Coordinator", barangay: "Butas na Bato" },
      { label: "JONA (Brgy. Aplaya)", name: "Jona", username: "peso_aplaya2", role: "Tupad Coordinator", barangay: "Aplaya" },
      { label: "MOLLY (Brgy. Poblacion)", name: "Molly", username: "peso_poblacion_1", role: "Tupad Coordinator", barangay: "Poblacion" },
      { label: "IKOY (Brgy. Poblacion)", name: "Ikoy", username: "peso_poblacion_2", role: "Tupad Coordinator", barangay: "Poblacion" },
      { label: "NEMZ (Brgy. Davildavilan)", name: "Nemz", username: "peso_davildavilan1", role: "Tupad Coordinator", barangay: "Davildavilan" },
      { label: "GLO (Brgy. Davildavilan)", name: "Glo", username: "peso_davildavilan2", role: "Tupad Coordinator", barangay: "Davildavilan" },
      { label: "TESSIE (Brgy. Caragsacan)", name: "Tessie", username: "peso_caragsacan_1", role: "Tupad Coordinator", barangay: "Caragsacan" },
      { label: "BEBANG (Brgy. Caragsacan)", name: "Bebang", username: "peso_caragsacan2", role: "Tupad Coordinator", barangay: "Caragsacan" },
      { label: "MARICEL (Brgy. Tanawan)", name: "Maricel", username: "peso_tanawan1", role: "Tupad Coordinator", barangay: "Tanawan" },
      { label: "JESSICA (Brgy. Tanawan)", name: "Jessica", username: "peso_tanawan2", role: "Tupad Coordinator", barangay: "Tanawan" },
      { label: "TERE C. (Brgy. Dikapanikian)", name: "Tere C.", username: "peso_dika", role: "Tupad Coordinator", barangay: "Dikapanikian" },
      { label: "RAMONITA (Brgy. Paltic)", name: "Ramonita", username: "peso_paltic", role: "Tupad Coordinator", barangay: "Paltic" },
      { label: "General Field Coordinator", name: "Field Coordinator", username: "coordinator", role: "Tupad Coordinator", barangay: "All Barangays" },
    ],
  },
  {
    id: "DOLE_COORDINATOR",
    label: "DOLE Regional Coordinator",
    description: "Auditing, compliance monitoring, and regional report inspection",
    accounts: [
      { label: "MARK (DOLE Aurora Field Office)", name: "Mark", username: "dolefoaurora_1", role: "DOLE Coordinator", barangay: "All Barangays" },
      { label: "ANGELO (DOLE Aurora Field Office)", name: "Angelo", username: "dolefoaurora_2", role: "DOLE Coordinator", barangay: "All Barangays" },
      { label: "General DOLE Officer", name: "DOLE Auditor", username: "dole", role: "DOLE Coordinator", barangay: "All Barangays" },
    ],
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedAccountUsername, setSelectedAccountUsername] = useState<string>("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When role changes
  const handleRoleChange = (roleId: string) => {
    setSelectedRole(roleId);
    setSelectedAccountUsername("");
    if (!roleId) {
      setUsername("");
      return;
    }
    const roleObj = PRESET_ROLES.find((r) => r.id === roleId);
    if (roleObj && roleObj.accounts.length === 1) {
      setSelectedAccountUsername(roleObj.accounts[0].username);
      setUsername(roleObj.accounts[0].username);
    }
  };

  // When specific account is picked from dropdown
  const handleAccountSelect = (uname: string) => {
    setSelectedAccountUsername(uname);
    setUsername(uname);
  };

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

  const currentRoleObj = PRESET_ROLES.find((r) => r.id === selectedRole);
  const currentAccount = currentRoleObj?.accounts.find((a) => a.username === username);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-100">
      <div className="w-full max-w-md space-y-6">
        {/* Card */}
        <div className="gov-card p-6 sm:p-8 border-t-4 border-t-gov-gold shadow-xl bg-white">
          {/* Header */}
          <div className="text-center space-y-3 pb-6 border-b border-slate-100">
            <div className="flex items-center justify-center">
              <img
                src="/images/login-portal-badge.png"
                alt="MAEDUP! e PESO access"
                className="h-20 sm:h-24 w-auto object-contain drop-shadow-md"
              />
            </div>
            <div className="space-y-0.5">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                LGU DINGALAN • PESO DINGALAN
              </h2>
              <p className="text-xs text-slate-500 font-semibold">
                TUPAD EC Management System Login
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
            {/* 1. Quick Role Selection Dropdown */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span>1. Select User Role</span>
                <span className="text-[10px] text-gov-blue font-normal flex items-center space-x-0.5">
                  <Sparkles className="w-3 h-3 text-gov-gold" />
                  <span>Quick Account Finder</span>
                </span>
              </label>
              <select
                value={selectedRole}
                onChange={(e) => handleRoleChange(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-gov-blue focus:ring-1 focus:ring-gov-blue bg-slate-50 font-medium text-slate-800"
              >
                <option value="">-- Choose Role / Manual Typing --</option>
                {PRESET_ROLES.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Specific User / Barangay Account Dropdown (if Role selected) */}
            {currentRoleObj && currentRoleObj.accounts.length > 0 && (
              <div className="space-y-1 animate-in fade-in">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                  <UserCheck className="w-3.5 h-3.5 text-gov-blue" />
                  <span>2. Select Official User Account</span>
                </label>
                <select
                  value={selectedAccountUsername}
                  onChange={(e) => handleAccountSelect(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gov-blue/50 rounded-lg focus:outline-none focus:border-gov-blue bg-blue-50/50 font-bold text-slate-900"
                >
                  <option value="">-- Select Your Name or Assigned Barangay --</option>
                  {currentRoleObj.accounts.map((acc) => (
                    <option key={acc.username} value={acc.username}>
                      {acc.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Account Info Pill */}
            {currentAccount && (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs animate-in fade-in">
                <div className="flex items-center space-x-1.5 text-slate-700">
                  <MapPin className="w-3.5 h-3.5 text-gov-gold" />
                  <span className="font-semibold">Assigned Scope:</span>
                  <span className="font-extrabold text-slate-900">{currentAccount.barangay}</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-gov-blue font-bold font-mono">
                  {currentAccount.username}
                </span>
              </div>
            )}

            {/* 3. Username Input */}
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
                  placeholder="e.g. admin or peso_umiray1"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-gov-blue focus:ring-1 focus:ring-gov-blue bg-white font-medium"
                  required
                />
              </div>
            </div>

            {/* 4. Password Input */}
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
              className="w-full py-2.5 bg-gov-blue hover:bg-gov-light text-white font-bold text-xs rounded-lg transition shadow-md flex items-center justify-center space-x-2 disabled:opacity-50 mt-2"
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
