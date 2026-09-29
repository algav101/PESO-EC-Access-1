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
  ArrowLeft,
  Home,
  UserCheck,
  Building,
  MapPin,
  Sparkles,
  Eye,
  EyeOff,
} from "lucide-react";

interface PresetAccount {
  label: string;
  name: string;
  username: string;
  role: string;
  barangay?: string;
}

interface PresetRoleGroup {
  id: string;
  label: string;
  description: string;
  accounts: PresetAccount[];
}

const DEFAULT_ROLE_GROUPS = [
  {
    id: "DOMAIN_MASTER",
    label: "👑 Domain Master (Super Admin)",
    description: "Full system owner access, beneficiary profile editing, and administrative control",
    fallbackAccounts: [
      { label: "PESO Dingalan Admin Officer", name: "PESO Dingalan Admin", username: "admin", role: "Domain Master", barangay: "Municipality-wide (Full Access)" },
    ],
  },
  {
    id: "PESO_ADMIN",
    label: "🛡️ PESO Administrator",
    description: "Full operational management, user administration, program creation, and report export",
    fallbackAccounts: [
      { label: "PESO Operations Administrator", name: "PESO Administrator", username: "peso_admin", role: "PESO Admin", barangay: "Municipality-wide (Full Operations)" },
      { label: "PESO Division Head", name: "PESO Head Officer", username: "peso_head", role: "PESO Admin", barangay: "Municipality-wide (Operations)" },
      { label: "PESO Program Manager", name: "PESO Manager", username: "peso_manager", role: "PESO Admin", barangay: "Municipality-wide (Programs)" },
    ],
  },
  {
    id: "PESO_STAFF",
    label: "💼 PESO Operations Staff",
    description: "Front-desk operations, manual beneficiary entry, verification, and replacement requests",
    fallbackAccounts: [
      { label: "MARCIAL BONIFACIO (Operations Desk)", name: "Marcial Bonifacio", username: "pesostaff", role: "PESO Operations Staff", barangay: "Municipality-wide (Desk)" },
      { label: "PESO STAFF - MCDO Desk", name: "Staff MCDO", username: "mcdo", role: "PESO Operations Staff", barangay: "Municipality-wide (Desk)" },
      { label: "PESO STAFF - IKOY Desk", name: "Staff Ikoy", username: "ikoy", role: "PESO Operations Staff", barangay: "Municipality-wide (Desk)" },
      { label: "General PESO Staff Officer", name: "PESO Staff", username: "staff", role: "PESO Operations Staff", barangay: "Municipality-wide" },
    ],
  },
  {
    id: "TUPAD_COORDINATOR",
    label: "TUPAD Field Coordinator",
    description: "Barangay-scoped field attendance, photo uploads, and beneficiary work program access",
    fallbackAccounts: [
      { label: "NEDDIE (Brgy. Umiray)", name: "Neddie", username: "peso_umiray1", role: "Tupad Coordinator", barangay: "Umiray" },
      { label: "SHIELA (Brgy. Umiray)", name: "Shiela", username: "peso_umiray2", role: "Tupad Coordinator", barangay: "Umiray" },
      { label: "MARIAN (Brgy. Umiray)", name: "Marian", username: "peso_umiray3", role: "Tupad Coordinator", barangay: "Umiray" },
      { label: "NALYN (Brgy. Umiray)", name: "Nalyn", username: "peso_umiray4", role: "Tupad Coordinator", barangay: "Umiray" },
      { label: "BERNLY (Brgy. Umiray - Pinamaypayan)", name: "Bernly", username: "coorpinamaypayan", role: "Tupad Coordinator", barangay: "Umiray" },
      { label: "ROMELYN (Brgy. Umiray - Singawan)", name: "Romelyn", username: "coorsingawan", role: "Tupad Coordinator", barangay: "Umiray" },
      { label: "JENELYN (Brgy. Umiray - Centro 1)", name: "Jenelyn", username: "coorumiraycentro1", role: "Tupad Coordinator", barangay: "Umiray" },
      { label: "MARILYN (Brgy. Umiray - Centro 2)", name: "Marilyn", username: "coorumiraycentro2", role: "Tupad Coordinator", barangay: "Umiray" },
      { label: "GRACE (Brgy. Ibona)", name: "Grace", username: "peso_ibona1", role: "Tupad Coordinator", barangay: "Ibona" },
      { label: "VENGEL (Brgy. Ibona)", name: "Vengel", username: "peso_ibona2", role: "Tupad Coordinator", barangay: "Ibona" },
      { label: "MAY (Brgy. Matawe)", name: "May", username: "peso_matawe1", role: "Tupad Coordinator", barangay: "Matawe" },
      { label: "ANNALYN (Brgy. Matawe)", name: "Annalyn", username: "peso_matawe_2", role: "Tupad Coordinator", barangay: "Matawe" },
      { label: "YOLLY (Brgy. Matawe)", name: "Yolly", username: "matawecoor", role: "Tupad Coordinator", barangay: "Matawe" },
      { label: "EHNA (Brgy. Butas na Bato)", name: "Ehna", username: "enabnb", role: "Tupad Coordinator", barangay: "Butas na Bato" },
      { label: "JONA (Brgy. Aplaya)", name: "Jona", username: "peso_aplaya2", role: "Tupad Coordinator", barangay: "Aplaya" },
      { label: "MAYLYN (Brgy. Aplaya)", name: "Maylyn", username: "aplaya1", role: "Tupad Coordinator", barangay: "Aplaya" },
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
    id: "TUPAD_ASSISTING_DOCUMENTOR",
    label: "📸 Tupad Assisting Documentor",
    description: "Field role limited exclusively to Daily Accomplishment Photos and DTR (Attendance) scanning",
    fallbackAccounts: [
      { label: "General Assisting Documentor", name: "Tupad Documentor", username: "documentor", role: "Tupad Assisting Documentor", barangay: "All Barangays" },
      { label: "MARIA (Brgy. Paltic Documentor)", name: "Maria Documentor", username: "peso_paltic_doc", role: "Tupad Assisting Documentor", barangay: "Paltic" },
      { label: "JUAN (Brgy. Umiray Documentor)", name: "Juan Documentor", username: "peso_umiray_doc", role: "Tupad Assisting Documentor", barangay: "Umiray" },
      { label: "LIZA (Brgy. Aplaya Documentor)", name: "Liza Documentor", username: "peso_aplaya_doc", role: "Tupad Assisting Documentor", barangay: "Aplaya" },
      { label: "JENNIE (Brgy. Aplaya Documentor)", name: "Jennie Documentor", username: "peso_aplaya", role: "Tupad Assisting Documentor", barangay: "Aplaya" },
      { label: "MONETTE (Brgy. Aplaya Documentor)", name: "Monette Documentor", username: "peso_aplaya_2", role: "Tupad Assisting Documentor", barangay: "Aplaya" },
      { label: "SHEM (Brgy. Butas na Bato Documentor)", name: "Shem Documentor", username: "peso_bnb", role: "Tupad Assisting Documentor", barangay: "Butas na Bato" },
      { label: "BEBANG (Brgy. Caragsacan Documentor)", name: "Bebang Documentor", username: "peso_caragsacan", role: "Tupad Assisting Documentor", barangay: "Caragsacan" },
      { label: "MARVILYN (Brgy. Caragsacan Documentor)", name: "Marvilyn Documentor", username: "peso caragsacan", role: "Tupad Assisting Documentor", barangay: "Caragsacan" },
      { label: "MARVILYN (Caragsacan Secondary)", name: "Marvilyn Coordinator", username: "tupad coordinator-marvilyn", role: "Tupad Assisting Documentor", barangay: "Caragsacan" },
      { label: "IMELDA (Brgy. Ibona Documentor)", name: "Imelda Documentor", username: "peso_ibona", role: "Tupad Assisting Documentor", barangay: "Ibona" },
      { label: "NHEMA (Brgy. Ibona Documentor)", name: "Nhema Documentor", username: "peso_ibona_2", role: "Tupad Assisting Documentor", barangay: "Ibona" },
      { label: "GRACELYN (Brgy. Matawe Documentor)", name: "Gracelyn Documentor", username: "peso_matawe", role: "Tupad Assisting Documentor", barangay: "Matawe" },
      { label: "DAVILDAVILAN (Brgy. Davildavilan Documentor)", name: "Davildavilan Documentor", username: "peso_davildavilan_doc", role: "Tupad Assisting Documentor", barangay: "Davildavilan" },
      { label: "TANAWAN (Brgy. Tanawan Documentor)", name: "Tanawan Documentor", username: "peso_tanawan_doc", role: "Tupad Assisting Documentor", barangay: "Tanawan" },
      { label: "DIKAPANIKIAN (Brgy. Dikapanikian Documentor)", name: "Dikapanikian Documentor", username: "peso_dika_doc", role: "Tupad Assisting Documentor", barangay: "Dikapanikian" },
      { label: "DAISY (Brgy. Poblacion Documentor)", name: "Daisy Documentor", username: "peso_poblacion", role: "Tupad Assisting Documentor", barangay: "Poblacion" },
      { label: "GENELYN (Brgy. Poblacion Documentor)", name: "Genelyn Documentor", username: "peso_poblacion_2", role: "Tupad Assisting Documentor", barangay: "Poblacion" },
    ],
  },
  {
    id: "DOLE_COORDINATOR",
    label: "DOLE Regional Coordinator",
    description: "Auditing, compliance monitoring, and regional report inspection",
    fallbackAccounts: [
      { label: "MARK (DOLE Aurora Field Office)", name: "Mark", username: "dolefoaurora_1", role: "DOLE Coordinator", barangay: "All Barangays" },
      { label: "ANGELO (DOLE Aurora Field Office)", name: "Angelo", username: "dolefoaurora_2", role: "DOLE Coordinator", barangay: "All Barangays" },
      { label: "General DOLE Officer", name: "DOLE Auditor", username: "dole", role: "DOLE Coordinator", barangay: "All Barangays" },
    ],
  },
];

function buildPresetRoleGroups(dbUsers?: any[]): PresetRoleGroup[] {
  if (!dbUsers || dbUsers.length === 0) {
    return DEFAULT_ROLE_GROUPS.map((g) => ({
      id: g.id,
      label: g.label,
      description: g.description,
      accounts: g.fallbackAccounts,
    }));
  }

  // 1. Process known standard roles
  const knownGroups: PresetRoleGroup[] = DEFAULT_ROLE_GROUPS.map((g) => {
    const matching = dbUsers.filter((u) => u.role === g.id);
    if (matching.length === 0) {
      return {
        id: g.id,
        label: g.label,
        description: g.description,
        accounts: g.fallbackAccounts,
      };
    }

    const accounts: PresetAccount[] = matching.map((u) => {
      const brgy = u.assignedBarangay ? `(Brgy. ${u.assignedBarangay})` : "(All Barangays)";
      return {
        label: `${u.fullName.toUpperCase()} ${brgy}`,
        name: u.fullName,
        username: u.username,
        role: g.label,
        barangay: u.assignedBarangay || "Municipality-wide",
      };
    });

    return {
      id: g.id,
      label: g.label,
      description: g.description,
      accounts,
    };
  });

  // 2. Check for any additional custom roles in the database
  const standardIds = new Set(DEFAULT_ROLE_GROUPS.map((g) => g.id));
  const customRoleUsers = dbUsers.filter((u) => !standardIds.has(u.role));

  if (customRoleUsers.length > 0) {
    const customRolesMap: Record<string, any[]> = {};
    customRoleUsers.forEach((u) => {
      if (!customRolesMap[u.role]) customRolesMap[u.role] = [];
      customRolesMap[u.role].push(u);
    });

    Object.entries(customRolesMap).forEach(([customRole, uList]) => {
      knownGroups.push({
        id: customRole,
        label: `👤 ${customRole.replace(/_/g, " ")}`,
        description: "Custom system user role",
        accounts: uList.map((u) => ({
          label: `${u.fullName.toUpperCase()} ${u.assignedBarangay ? `(Brgy. ${u.assignedBarangay})` : ""}`.trim(),
          name: u.fullName,
          username: u.username,
          role: customRole,
          barangay: u.assignedBarangay || "Municipality-wide",
        })),
      });
    });
  }

  return knownGroups;
}

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [presetRoles, setPresetRoles] = useState<PresetRoleGroup[]>(() => buildPresetRoleGroups());
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedAccountUsername, setSelectedAccountUsername] = useState<string>("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch live active users dynamically from database
  React.useEffect(() => {
    // 1. Check local cache first for instant render
    try {
      const cached = localStorage.getItem("peso_login_preset_users");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPresetRoles(buildPresetRoleGroups(parsed));
        }
      }
    } catch {}

    // 2. Fetch fresh users from database
    const fetchLivePresets = async () => {
      try {
        const res = await fetch("/api/v1/auth/presets");
        if (res.ok) {
          const data = await res.json();
          if (data.users && Array.isArray(data.users) && data.users.length > 0) {
            setPresetRoles(buildPresetRoleGroups(data.users));
            try {
              localStorage.setItem("peso_login_preset_users", JSON.stringify(data.users));
            } catch {}
          }
        }
      } catch (err) {
        console.warn("Could not load live user presets from server, using fallback:", err);
      }
    };

    fetchLivePresets();
  }, []);

  // Security Policy: Auto-filling of username and password is ONLY permitted for field coordinator & assisting documentor.
  // For PESO Operations Staff, DOLE Coordinator, Domain Master, and PESO Admin, auto-filling is strictly disabled.
  const isAutoFillRole = (roleId?: string | null): boolean => {
    if (!roleId) return false;
    return roleId === "TUPAD_COORDINATOR" || roleId === "TUPAD_ASSISTING_DOCUMENTOR";
  };

  const getPresetPassword = (uname: string, brgy?: string, roleId?: string): string => {
    // Strictly disallow password auto-fill for administrative, DOLE, and operations staff roles
    if (roleId && !isAutoFillRole(roleId)) {
      return "";
    }

    const u = (uname || "").toLowerCase().trim().replace(/^@+/, "");
    const b = (brgy || "").toLowerCase();

    // Prevent any password lookup for non-field roles
    if (
      u === "admin" ||
      u.startsWith("peso_admin") ||
      u === "peso_head" ||
      u === "peso_manager" ||
      u === "pesostaff" ||
      u === "mcdo" ||
      u === "ikoy" ||
      u === "staff" ||
      u.startsWith("dole")
    ) {
      return "";
    }

    if (u === "coordinator") return "coord123";
    if (u === "documentor") return "doc123";
    if (u === "enabnb") return "BUTAS_NA_BATO123";
    if (u.includes("umiray") || u.includes("pinamaypayan") || u.includes("singawan") || b.includes("umiray")) return "UMIRAY123";
    if (u.includes("ibona") || b.includes("ibona")) return "IBONA123";
    if (u.includes("matawe") || b.includes("matawe")) return "MATAWE123";
    if (u.includes("bnb") || u.includes("butas") || b.includes("butas")) return "BUTAS NA BATO123";
    if (u.includes("aplaya") || b.includes("aplaya")) return "APLAYA123";
    if (u.includes("poblacion") || b.includes("poblacion")) return "POBLACION123";
    if (u.includes("davildavilan") || b.includes("davildavilan")) return "DAVILDAVILAN123";
    if (u.includes("caragsacan") || b.includes("caragsacan")) return "CARAGSACAN123";
    if (u.includes("tanawan") || b.includes("tanawan")) return "TANAWAN123";
    if (u.includes("dika") || b.includes("dikapanikian")) return "DIKAPANIKIAN123";
    if (u.includes("paltic") || b.includes("paltic")) return "PALTIC123";
    if (brgy && brgy !== "Municipality-wide" && !brgy.includes("All Barangays")) {
      return `${brgy.trim().toUpperCase()}123`;
    }
    return "Dingalan123!";
  };

  // When role changes
  const handleRoleChange = (roleId: string) => {
    setSelectedRole(roleId);
    setSelectedAccountUsername("");
    setUsername("");
    setPassword("");

    if (!roleId) return;

    // Auto-filling username & password is ONLY permitted for Field Coordinator and Assisting Documentor
    if (!isAutoFillRole(roleId)) {
      return;
    }

    const roleObj = presetRoles.find((r) => r.id === roleId);
    if (roleObj && roleObj.accounts.length === 1) {
      const uname = roleObj.accounts[0].username;
      setSelectedAccountUsername(uname);
      setUsername(uname);
      const defPass = getPresetPassword(uname, roleObj.accounts[0].barangay, roleId);
      if (defPass) setPassword(defPass);
    }
  };

  // When specific account is picked from dropdown
  const handleAccountSelect = (uname: string) => {
    setSelectedAccountUsername(uname);

    // Auto-filling username & password is ONLY permitted for Field Coordinator and Assisting Documentor
    if (!isAutoFillRole(selectedRole)) {
      setUsername("");
      setPassword("");
      return;
    }

    setUsername(uname);
    const roleObj = presetRoles.find((r) => r.id === selectedRole);
    const acc = roleObj?.accounts.find((a) => a.username === uname);
    const defPass = getPresetPassword(uname, acc?.barangay, selectedRole);
    if (defPass) setPassword(defPass);
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

      login(data.user, data.token);
      const targetUrl =
        data.user?.role === "TUPAD_COORDINATOR" || data.user?.role === "TUPAD_ASSISTING_DOCUMENTOR"
          ? "/field"
          : "/dashboard";
      window.location.href = targetUrl;
    } catch (err: any) {
      if (err.message === "Failed to fetch" || err.name === "TypeError") {
        setError("Network connection failed. Please ensure the local server is running and refresh the page.");
      } else {
        setError(err.message || "Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const currentRoleObj = presetRoles.find((r) => r.id === selectedRole);
  const currentAccount = currentRoleObj?.accounts.find((a) => a.username === username);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-100 relative overflow-hidden">
      {/* Official PESO EC Access Emblem Logo Page Background Watermark */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden"
      >
        <img
          src="/images/peso-ec-access-emblem.gif"
          alt="PESO EC Access Official Emblem Watermark"
          className="w-[90vw] max-w-[700px] object-contain opacity-[0.06] select-none scale-105 filter blur-[0.2px]"
        />
      </div>

      <div className="w-full max-w-md space-y-4 relative z-10">
        {/* Top Back Navigation Button */}
        <div className="flex items-center justify-between">
          <a
            href="/"
            className="inline-flex items-center space-x-1.5 text-xs font-black text-slate-700 hover:text-gov-blue bg-white hover:bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-300 shadow-xs transition transform hover:-translate-x-0.5"
            title="Bumalik sa Landing Page"
          >
            <ArrowLeft className="w-4 h-4 text-gov-blue" />
            <span>Bumalik sa Landing Page</span>
          </a>

          <a
            href="/apply"
            className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 rounded-xl border border-emerald-200 transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Online Application</span>
          </a>
        </div>

        {/* Card */}
        <div className="gov-card p-6 sm:p-8 border-t-4 border-t-gov-gold shadow-xl bg-white/95 backdrop-blur-xs">
          {/* Header */}
          <div className="text-center space-y-3 pb-6 border-b border-slate-100">
            <div className="flex items-center justify-center">
              <img
                src="/images/peso-ec-access-emblem.gif"
                alt="Official PESO EC Access Emblem Logo"
                className="h-24 sm:h-28 w-auto object-contain drop-shadow-md rounded-2xl hover:scale-105 transition-transform"
              />
            </div>
            <div className="space-y-0.5">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                LGU DINGALAN • PESO DINGALAN
              </h2>
              <p className="text-xs text-slate-500 font-semibold">
                PESO EC Access System Login
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
          <form onSubmit={handleSubmit} autoComplete="off" className="mt-6 space-y-4">
            {/* 1. Quick Role Selection Dropdown */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span>1. Select User Role</span>
                <span className="text-[10px] text-gov-blue font-normal flex items-center space-x-0.5">
                  <Sparkles className="w-3 h-3 text-gov-gold" />
                  <span>Role Navigator</span>
                </span>
              </label>
              <select
                value={selectedRole}
                onChange={(e) => handleRoleChange(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-gov-blue focus:ring-1 focus:ring-gov-blue bg-slate-50 font-medium text-slate-800 cursor-pointer"
              >
                <option value="">-- Choose Role / Manual Typing --</option>
                {presetRoles.map((role) => {
                  const isField = isAutoFillRole(role.id);
                  return (
                    <option key={role.id} value={role.id}>
                      {role.label} {isField ? `(⚡ Auto-Fill Enabled • ${role.accounts.length} field users)` : `(🔒 Manual Login Required)`}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Security Notice for Non-Field Roles (Admin, Staff, DOLE, Domain Master) */}
            {selectedRole && !isAutoFillRole(selectedRole) && (
              <div className="p-3 bg-amber-50/90 border border-amber-200/90 rounded-xl flex items-start space-x-2.5 text-xs text-amber-950 animate-in fade-in duration-200 shadow-2xs">
                <Shield className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-extrabold text-[11px] text-amber-950 uppercase tracking-wide">
                    🔒 Security Policy: Manual Login Required
                  </p>
                  <p className="text-[11px] text-amber-900 leading-relaxed">
                    Auto-filling of username and password is <strong>disabled</strong> for PESO Operations Staff, DOLE Coordinator, Domain Master, and PESO Admin. Please enter your credentials manually below.
                  </p>
                </div>
              </div>
            )}

            {/* 2. Account Picker (Strictly for TUPAD Field Coordinator & Assisting Documentor only) */}
            {selectedRole && isAutoFillRole(selectedRole) && currentRoleObj && currentRoleObj.accounts.length > 0 && (
              <div className="space-y-1 animate-in fade-in duration-200">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span>2. Pick Specific Field Account ({currentRoleObj.accounts.length} available)</span>
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    ⚡ Auto-fills Credentials
                  </span>
                </label>
                <select
                  value={selectedAccountUsername}
                  onChange={(e) => handleAccountSelect(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-blue-300 rounded-lg focus:outline-none focus:border-gov-blue focus:ring-1 focus:ring-gov-blue bg-blue-50/50 font-semibold text-gov-blue cursor-pointer"
                >
                  <option value="">-- Select Specific Field User ({currentRoleObj.label}) --</option>
                  {currentRoleObj.accounts.map((acc) => (
                    <option key={acc.username} value={acc.username}>
                      {acc.label} ({acc.username})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Account Info Pill (Only for Field Roles) */}
            {isAutoFillRole(selectedRole) && currentAccount && (
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
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Username</span>
                {isAutoFillRole(selectedRole) && currentAccount ? (
                  <span className="text-[10px] text-emerald-600 font-semibold flex items-center space-x-1">
                    <UserCheck className="w-3 h-3" />
                    <span>Auto-filled: {currentAccount.name}</span>
                  </span>
                ) : selectedRole && !isAutoFillRole(selectedRole) ? (
                  <span className="text-[10px] text-amber-700 font-semibold flex items-center space-x-1">
                    <Lock className="w-3 h-3 text-amber-600" />
                    <span>Manual Entry Required</span>
                  </span>
                ) : null}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  name="username"
                  id="username"
                  autoComplete="off"
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
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] font-bold text-gov-blue hover:text-gov-dark flex items-center space-x-1 focus:outline-none transition"
                >
                  {showPassword ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5 text-gov-blue" />
                      <span>Itago (Hide)</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5 text-gov-blue" />
                      <span>Ipakita (Show)</span>
                    </>
                  )}
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  id="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-gov-blue focus:ring-1 focus:ring-gov-blue bg-white font-medium"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2.5 p-1 text-slate-400 hover:text-gov-blue focus:outline-none rounded transition"
                  title={showPassword ? "Hide password" : "Show password"}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-gov-blue" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
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

            {/* Secondary Back Link inside card */}
            <div className="pt-3 border-t border-slate-100 text-center">
              <a
                href="/"
                className="inline-flex items-center space-x-1 text-xs font-semibold text-slate-500 hover:text-gov-blue transition hover:underline"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Bumalik sa Landing Page (Home)</span>
              </a>
            </div>
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
