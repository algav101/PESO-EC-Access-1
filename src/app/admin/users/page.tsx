"use client";

import React, { useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  Shield,
  CheckCircle2,
  XCircle,
  Edit,
  MapPin,
  RefreshCw,
  Key,
  FileSpreadsheet,
  UploadCloud,
  Download,
  AlertCircle,
  FileText,
  Crown,
  ShieldAlert,
  ShieldCheck,
  Camera,
  Clock,
  Eye,
  EyeOff,
  Copy,
  Check,
  Unlock,
  Sparkles,
} from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDate } from "@/lib/utils";

const DINGALAN_BARANGAYS = [
  "Aplaya",
  "Butas na Bato",
  "Caragsacan",
  "Davildavilan",
  "Dikapanikian",
  "Ibona",
  "Matawe",
  "Paltic",
  "Poblacion",
  "Tanawan",
  "Umiray",
];

const SAMPLE_CSV = `FULL NAME,USERNAME,ASSIGNED ROLE,ASSIGNED SCOPE/BARANGAY,PASSWORD,EMAIL ADDRESS
NEDDIE,PESO UMIRAY1,TUPAD COORDINATOR,UMIRAY,UMIRAY123,
SHIELA,PESO UMIRAY2,TUPAD COORDINATOR,UMIRAY,UMIRAY123,
MARIAN,PESO UMIRAY3,TUPAD COORDINATOR,UMIRAY,UMIRAY123,
NALYN,PESO UMIRAY4,TUPAD COORDINATOR,UMIRAY,UMIRAY123,
GRACE,PESO IBONA1,TUPAD COORDINATOR,IBONA,IBONA123,
VENGEL,PESO IBONA2,TUPAD COORDINATOR,IBONA,IBONA123,
MAY,PESO MATAWE1,TUPAD COORDINATOR,MATAWE,MATAWE123,
ANNALYN,PESO MATAWE 2,TUPAD COORDINATOR,MATAWE,MATAWE123,
ENA,PESO BNB,TUPAD COORDINATOR,BUTAS NA BATO,BUTAS NA BATO123,
JONA,PESO APLAYA2,TUPAD COORDINATOR,APLAYA,APLAYA123,
MOLLY,PESO POBLACION 1,TUPAD COORDINATOR,POBLACION,POBLACION123,
IKOY,PESO POBLACION 2,TUPAD COORDINATOR,POBLACION,POBLACION123,
NEMZ,PESO DAVILDAVILAN1,TUPAD COORDINATOR,DAVILDAVILAN,DAVILDAVILAN123,
GLO,PESO DAVILDAVILAN2,TUPAD COORDINATOR,DAVILDAVILAN,DAVILDAVILAN123,
TESSIE,PESO CARAGSACAN 1,TUPAD COORDINATOR,CARAGSACAN,CARAGSACAN123,
BEBANG,PESO CARAGSACAN2,TUPAD COORDINATOR,CARAGSACAN,CARAGSACAN123,
MARICEL,PESO TANAWAN1,TUPAD COORDINATOR,TANAWAN,TANAWAN123,
JESSICA,PESO TANAWAN2,TUPAD COORDINATOR,TANAWAN,TANAWAN123,
TERE C.,PESO DIKA,TUPAD COORDINATOR,DIKAPANIKIAN,DIKAPANIKIAN123,
RAMONITA,PESO PALTIC,TUPAD COORDINATOR,PALTIC,PALTIC123,
MARIA DOC,PESO PALTIC_DOC,TUPAD ASSISTING DOCUMENTOR,PALTIC,PALTIC123,
MARK,DOLEFOAURORA_1,DOLE COORDINATOR,ALL BARANGAY,ALL BARANGAY123,
ANGELO,DOLEFOAURORA_2,DOLE COORDINATOR,ALL BARANGAY,ALL BARANGAY123,`;

export default function UserManagementPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<any | null>(null);

  // Password View & Visibility States (Domain Master & PESO Admin)
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [showAllPasswords, setShowAllPasswords] = useState(false);
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showEditCurrentPassword, setShowEditCurrentPassword] = useState(false);
  const [showPreviewPasswords, setShowPreviewPasswords] = useState(false);

  // CSV Import State
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [csvContent, setCsvContent] = useState(SAMPLE_CSV);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [parsingPreview, setParsingPreview] = useState(false);

  // Create Form State
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("TUPAD_COORDINATOR");
  const [assignedBarangay, setAssignedBarangay] = useState("Paltic");

  // Edit Form State
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("TUPAD_COORDINATOR");
  const [editBarangay, setEditBarangay] = useState("");
  const [editStatus, setEditStatus] = useState("ACTIVE");
  const [editPassword, setEditPassword] = useState("");

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const toggleAllPasswords = () => {
    const nextState = !showAllPasswords;
    setShowAllPasswords(nextState);
    const newMap: Record<string, boolean> = {};
    users.forEach((u) => {
      newMap[u.id] = nextState;
    });
    setVisiblePasswords(newMap);
  };

  const copyToClipboard = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedUserId(id);
    setTimeout(() => {
      setCopiedUserId(null);
    }, 2000);
  };

  const generateSuggestedPassword = (targetRole: string, targetBarangay?: string) => {
    if (targetRole === "TUPAD_COORDINATOR" || targetRole === "TUPAD_ASSISTING_DOCUMENTOR") {
      const b = targetBarangay || assignedBarangay || "PALTIC";
      return `${b.toUpperCase().replace(/\s+/g, "_")}123`;
    }
    if (targetRole === "DOLE_COORDINATOR") {
      return "ALL BARANGAY123";
    }
    if (targetRole === "DOMAIN_MASTER") {
      return "admin123";
    }
    return "Dingalan2026!";
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/v1/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          fullName,
          email,
          role,
          assignedBarangay:
            role === "TUPAD_COORDINATOR" || role === "TUPAD_ASSISTING_DOCUMENTOR" ? assignedBarangay : null,
        }),
      });

      if (res.ok) {
        setIsCreateOpen(false);
        setUsername("");
        setPassword("");
        setFullName("");
        setEmail("");
        setRole("TUPAD_COORDINATOR");
        setAssignedBarangay("Paltic");
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create user");
      }
    } catch (e) {
      alert("Error creating user");
    }
  };

  const openEditModal = (u: any) => {
    setEditUser(u);
    setEditFullName(u.fullName || "");
    setEditEmail(u.email || "");
    setEditRole(u.role || "TUPAD_COORDINATOR");
    setEditBarangay(u.assignedBarangay || "Paltic");
    setEditStatus(u.status || "ACTIVE");
    setEditPassword("");
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    try {
      const payload: any = {
        id: editUser.id,
        fullName: editFullName,
        email: editEmail,
        role: editRole,
        status: editStatus,
        assignedBarangay:
          editRole === "TUPAD_COORDINATOR" || editRole === "TUPAD_ASSISTING_DOCUMENTOR" ? editBarangay : null,
      };
      if (editPassword.trim()) {
        payload.password = editPassword.trim();
      }

      const res = await fetch("/api/v1/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setEditUser(null);
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update user");
      }
    } catch (e) {
      alert("Error updating user");
    }
  };

  // CSV Import Handlers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        setCsvContent(text);
        handlePreviewCSV(text);
      };
      reader.readAsText(file);
    }
  };

  const handlePreviewCSV = async (contentToPreview?: string) => {
    setParsingPreview(true);
    try {
      const res = await fetch("/api/v1/users/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csvContent: contentToPreview || csvContent,
          preview: true,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPreviewRows(data.users || []);
      } else {
        alert(data.error || "Failed to parse CSV");
      }
    } catch (e) {
      alert("Error parsing CSV");
    } finally {
      setParsingPreview(false);
    }
  };

  const handleCommitImport = async () => {
    setImporting(true);
    try {
      const res = await fetch("/api/v1/users/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csvContent,
          preview: false,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Successfully imported ${data.importedCount || 0} user accounts!`);
        setIsImportOpen(false);
        setPreviewRows([]);
        fetchUsers();
      } else {
        alert(data.error || "Failed to import users");
      }
    } catch (e) {
      alert("Error importing users");
    } finally {
      setImporting(false);
    }
  };

  const downloadSampleCsv = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "tupad_coordinators_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <Users className="w-6 h-6 text-gov-blue" />
            <span>Staff & Coordinator User Management</span>
          </h1>
          <p className="text-xs text-slate-500">
            Manage PESO Admins, Barangay-Assigned TUPAD Coordinators, and DOLE Regional Officers with RBAC security
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Batch CSV Import Button */}
          <button
            onClick={() => {
              setIsImportOpen(true);
              handlePreviewCSV(csvContent);
            }}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow flex items-center space-x-1.5 transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            <span>Import Users from CSV</span>
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 bg-gov-blue hover:bg-gov-light text-white font-bold text-xs rounded-xl shadow flex items-center space-x-1.5 transition"
          >
            <UserPlus className="w-4 h-4 text-gov-goldLight" />
            <span>Add Single User</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="gov-card overflow-hidden shadow">
        <div className="p-4 bg-slate-50 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Active Accounts ({users.length})
            </span>
            <span className="hidden md:inline-flex items-center space-x-1 px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-300 rounded text-[10px] font-bold">
              <Key className="w-3 h-3 text-amber-600" />
              <span>Password View: Domain Master &amp; PESO Admin</span>
            </span>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto">
            {/* Global Show/Hide All Passwords Toggle */}
            <button
              onClick={toggleAllPasswords}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition flex items-center space-x-1.5 shadow-xs ${
                showAllPasswords
                  ? "bg-amber-100 text-amber-950 border-amber-400 hover:bg-amber-200"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:text-gov-blue"
              }`}
              title={showAllPasswords ? "Hide all passwords" : "Show all passwords"}
            >
              {showAllPasswords ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-amber-700" />
                  <span>Hide All Passwords</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-gov-blue" />
                  <span>Show All Passwords</span>
                </>
              )}
            </button>

            <button
              onClick={fetchUsers}
              className="p-1.5 text-slate-500 hover:text-gov-blue hover:bg-white rounded-lg transition border border-slate-200"
              title="Refresh User List"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b">
              <tr>
                <th className="px-4 py-3">Full Name</th>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Assigned Role</th>
                <th className="px-4 py-3">Assigned Scope / Barangay</th>
                <th className="px-4 py-3 bg-amber-50/70 border-x border-amber-200/60 text-amber-950">
                  <div className="flex items-center space-x-1">
                    <Key className="w-3 h-3 text-amber-600" />
                    <span>Password (Admin View)</span>
                  </div>
                </th>
                <th className="px-4 py-3">Email Address</th>
                <th className="px-4 py-3">Last Login</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const isRevealed = visiblePasswords[u.id] || showAllPasswords;
                const displayPass = u.plainPassword || generateSuggestedPassword(u.role, u.assignedBarangay);
                return (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-900">{u.fullName}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">@{u.username}</td>
                    <td className="px-4 py-3 font-semibold">
                      {u.role === "DOMAIN_MASTER" ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-gradient-to-r from-amber-500/10 to-purple-500/10 text-amber-900 border border-amber-400/60 rounded-full font-black text-[11px] shadow-xs">
                          <Crown className="w-3.5 h-3.5 text-amber-600" />
                          <span>Domain Master</span>
                        </span>
                      ) : u.role === "PESO_ADMIN" ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-blue-50 text-gov-blue border border-blue-200 rounded-full font-bold text-[11px]">
                          <ShieldAlert className="w-3 h-3" />
                          <span>PESO Admin</span>
                        </span>
                      ) : u.role === "PESO_STAFF" ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full font-bold text-[11px]">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          <span>PESO Operations Staff</span>
                        </span>
                      ) : u.role === "TUPAD_ASSISTING_DOCUMENTOR" ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-teal-50 text-teal-800 border border-teal-300 rounded-full font-black text-[11px] shadow-xs">
                          <Camera className="w-3 h-3 text-teal-600" />
                          <span>Tupad Assisting Documentor</span>
                        </span>
                      ) : (
                        <span className="text-slate-700 font-medium">
                          {(u.role || "").replace(/_/g, " ")}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {u.role === "TUPAD_COORDINATOR" || u.role === "TUPAD_ASSISTING_DOCUMENTOR" ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg font-bold text-[11px]">
                          <MapPin className="w-3 h-3 text-amber-600" />
                          <span>Brgy. {u.assignedBarangay || "All (Floating)"}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px] font-medium">
                          Municipality-wide (All 11 Barangays)
                        </span>
                      )}
                    </td>
                    {/* Password Cell */}
                    <td className="px-4 py-3 bg-amber-50/30 border-x border-amber-100">
                      <div className="flex items-center space-x-1.5 font-mono">
                        <span
                          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                            isRevealed
                              ? "bg-amber-100/90 text-amber-950 border border-amber-300 font-bold"
                              : "bg-slate-100 text-slate-400 tracking-widest"
                          }`}
                        >
                          {isRevealed ? displayPass : "••••••••"}
                        </span>
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(u.id)}
                          className="p-1 text-slate-400 hover:text-gov-blue hover:bg-slate-200 rounded transition"
                          title={isRevealed ? "Hide password" : "Show password"}
                        >
                          {isRevealed ? (
                            <EyeOff className="w-3.5 h-3.5 text-amber-700" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(displayPass, u.id)}
                          className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded transition"
                          title="Copy password to clipboard"
                        >
                          {copiedUserId === u.id ? (
                            <span className="inline-flex items-center text-[10px] text-emerald-600 font-bold">
                              <Check className="w-3.5 h-3.5 text-emerald-600 mr-0.5" />
                              <span>Copied</span>
                            </span>
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{u.email || "-"}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono">
                      {u.lastLoginAt ? formatDate(u.lastLoginAt, "MMM dd, yyyy HH:mm") : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={u.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openEditModal(u)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-lg transition inline-flex items-center space-x-1"
                      >
                        <Edit className="w-3 h-3 text-slate-500" />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CSV Batch Import Modal */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 space-y-4 shadow-2xl animate-fadeIn my-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                  <span>Batch Import User Accounts from CSV</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Upload a CSV or paste CSV text with headers: <code>FULL NAME, USERNAME, ASSIGNED ROLE, ASSIGNED SCOPE/BARANGAY, PASSWORD, EMAIL ADDRESS</code>
                </p>
              </div>

              <button
                onClick={downloadSampleCsv}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg border flex items-center space-x-1 transition self-start sm:self-auto"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Sample CSV</span>
              </button>
            </div>

            {/* File Upload Input & Text Area */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  1. Upload .CSV File
                </label>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-4 bg-slate-50 hover:bg-emerald-50/50 hover:border-emerald-400 cursor-pointer transition">
                  <UploadCloud className="w-7 h-7 text-emerald-600 mb-1" />
                  <span className="text-xs font-bold text-slate-700">Choose CSV file from computer</span>
                  <span className="text-[10px] text-slate-400">Supports standard comma-separated files</span>
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    2. Or Paste Raw CSV Data
                  </label>
                  <button
                    type="button"
                    onClick={() => handlePreviewCSV(csvContent)}
                    className="text-[11px] font-bold text-gov-blue hover:underline"
                  >
                    Refresh Preview ↺
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={csvContent}
                  onChange={(e) => {
                    setCsvContent(e.target.value);
                  }}
                  className="w-full p-2 text-[11px] font-mono border rounded-xl bg-slate-900 text-emerald-400 focus:outline-none"
                  placeholder="Paste CSV text with header..."
                />
              </div>
            </div>

            {/* Parsed Preview Table */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Parsed Accounts Preview ({previewRows.length} Rows Detected)</span>
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowPreviewPasswords(!showPreviewPasswords)}
                    className="text-[11px] font-bold text-gov-blue hover:text-gov-dark flex items-center space-x-1 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded"
                  >
                    {showPreviewPasswords ? (
                      <>
                        <EyeOff className="w-3 h-3" />
                        <span>Hide Passwords</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3 h-3" />
                        <span>Show Passwords</span>
                      </>
                    )}
                  </button>
                  {parsingPreview && (
                    <span className="text-xs text-slate-500 font-semibold animate-pulse">
                      Parsing rows...
                    </span>
                  )}
                </div>
              </div>

              <div className="border rounded-xl max-h-56 overflow-y-auto bg-slate-50">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-200/80 text-slate-700 font-bold uppercase text-[10px] sticky top-0 border-b">
                    <tr>
                      <th className="px-3 py-2">Full Name</th>
                      <th className="px-3 py-2">Username</th>
                      <th className="px-3 py-2">Role</th>
                      <th className="px-3 py-2">Assigned Barangay</th>
                      <th className="px-3 py-2 bg-amber-50 text-amber-950">Password</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {previewRows.map((r, idx) => (
                      <tr key={idx} className="hover:bg-white">
                        <td className="px-3 py-2 font-bold text-slate-900">{r.fullName}</td>
                        <td className="px-3 py-2 font-mono text-gov-blue">@{r.username}</td>
                        <td className="px-3 py-2 font-semibold">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px]">
                            {r.role}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {r.assignedBarangay ? (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded font-bold text-[10px]">
                              Brgy. {r.assignedBarangay}
                            </span>
                          ) : (
                            <span className="text-slate-400">All (Municipality)</span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-mono bg-amber-50/40 font-semibold text-amber-950">
                          {showPreviewPasswords ? r.password : "••••••••"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-[11px] text-slate-500">
                Passwords will be securely hashed with <strong>bcrypt (10 rounds)</strong>.
              </span>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsImportOpen(false)}
                  className="px-4 py-2 text-xs font-bold border rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCommitImport}
                  disabled={importing || previewRows.length === 0}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg shadow transition flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{importing ? "Importing Accounts..." : `Commit & Create ${previewRows.length} Accounts`}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Single User Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form onSubmit={handleCreateUser} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <UserPlus className="w-4 h-4 text-gov-blue" />
              <span>Create New System User</span>
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Full Name *</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Maria Santos"
                className="w-full px-3 py-2 text-xs border rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Username *</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. msantos"
                className="w-full px-3 py-2 text-xs border rounded-lg font-mono"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">Password *</label>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setPassword(generateSuggestedPassword(role, assignedBarangay))}
                    className="text-[10px] text-gov-blue hover:text-gov-dark font-bold flex items-center space-x-0.5"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>Auto-Suggest</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword(!showCreatePassword)}
                    className="text-[10px] text-slate-500 hover:text-gov-blue font-semibold flex items-center space-x-0.5"
                  >
                    {showCreatePassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showCreatePassword ? "Hide" : "Show"}</span>
                  </button>
                </div>
              </div>
              <div className="relative">
                <input
                  type={showCreatePassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-3 pr-10 py-2 text-xs border rounded-lg font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCreatePassword(!showCreatePassword)}
                  className="absolute right-2.5 top-2.5 p-0.5 text-slate-400 hover:text-gov-blue"
                  title={showCreatePassword ? "Hide password" : "Show password"}
                >
                  {showCreatePassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. msantos@dingalan.gov.ph"
                className="w-full px-3 py-2 text-xs border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Role *</label>
              <select
                value={role}
                onChange={(e) => {
                  const newRole = e.target.value;
                  setRole(newRole);
                  if (password) {
                    setPassword(generateSuggestedPassword(newRole, assignedBarangay));
                  }
                }}
                className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 font-bold"
              >
                <option value="TUPAD_COORDINATOR">TUPAD Field Coordinator (Barangay-Scoped)</option>
                <option value="TUPAD_ASSISTING_DOCUMENTOR">Tupad Assisting Documentor (Photo & DTR Scanning Only)</option>
                <option value="PESO_STAFF">PESO Operations Staff (Operational Access - No Bulk Import)</option>
                <option value="PESO_ADMIN">PESO Admin (Full Operations Access)</option>
                <option value="DOMAIN_MASTER">👑 Domain Master (Super Admin Access)</option>
                <option value="DOLE_COORDINATOR">DOLE Coordinator (Auditing & Reports)</option>
              </select>
            </div>

            {/* Barangay Assignment (For TUPAD Coordinators and Assisting Documentors) */}
            {(role === "TUPAD_COORDINATOR" || role === "TUPAD_ASSISTING_DOCUMENTOR") && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5 animate-fadeIn">
                <label className="block text-xs font-bold text-amber-950 uppercase flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-600" />
                  <span>Assigned Barangay *</span>
                </label>
                <p className="text-[11px] text-amber-800 leading-tight">
                  User will only be allowed to view Work Programs, Beneficiaries, and Upload Photos for this specific Barangay.
                </p>
                <select
                  value={assignedBarangay}
                  onChange={(e) => {
                    const newBrgy = e.target.value;
                    setAssignedBarangay(newBrgy);
                    if (password) {
                      setPassword(generateSuggestedPassword(role, newBrgy));
                    }
                  }}
                  className="w-full px-3 py-2 text-xs border border-amber-300 rounded-lg bg-white font-bold text-slate-800 mt-1"
                >
                  {DINGALAN_BARANGAYS.map((b) => (
                    <option key={b} value={b}>
                      Barangay {b}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2 text-xs font-bold border rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-gov-blue text-white font-bold text-xs rounded-lg shadow hover:bg-gov-light transition"
              >
                Create Account
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form onSubmit={handleUpdateUser} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <Edit className="w-4 h-4 text-gov-blue" />
              <span>Edit User Account (@{editUser.username})</span>
            </h3>

            {/* Current Active Password Card */}
            <div className="p-3 bg-amber-50/80 border border-amber-300 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 flex items-center space-x-1">
                  <Key className="w-3 h-3 text-amber-600" />
                  <span>Current Active Password (Admin View)</span>
                </span>
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => setShowEditCurrentPassword(!showEditCurrentPassword)}
                    className="p-1 text-slate-500 hover:text-gov-blue hover:bg-white rounded transition"
                    title={showEditCurrentPassword ? "Hide password" : "Show password"}
                  >
                    {showEditCurrentPassword ? (
                      <EyeOff className="w-3.5 h-3.5 text-amber-700" />
                    ) : (
                      <Eye className="w-3.5 h-3.5 text-slate-600" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const cur = editUser.plainPassword || generateSuggestedPassword(editUser.role, editUser.assignedBarangay);
                      copyToClipboard(cur, `edit-modal-${editUser.id}`);
                    }}
                    className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-white rounded transition"
                    title="Copy current password"
                  >
                    {copiedUserId === `edit-modal-${editUser.id}` ? (
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center">
                        <Check className="w-3.5 h-3.5 mr-0.5" />
                        <span>Copied</span>
                      </span>
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-600" />
                    )}
                  </button>
                </div>
              </div>
              <div className="font-mono text-xs font-extrabold text-amber-950 bg-white/80 px-2.5 py-1.5 rounded-lg border border-amber-200">
                {showEditCurrentPassword
                  ? (editUser.plainPassword || generateSuggestedPassword(editUser.role, editUser.assignedBarangay))
                  : "••••••••••••"}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Full Name *</label>
              <input
                type="text"
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                className="w-full px-3 py-2 text-xs border rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email Address</label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs border rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Role *</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 font-bold"
                >
                  <option value="TUPAD_COORDINATOR">TUPAD Coordinator</option>
                  <option value="TUPAD_ASSISTING_DOCUMENTOR">Tupad Assisting Documentor</option>
                  <option value="PESO_STAFF">PESO Operations Staff</option>
                  <option value="PESO_ADMIN">PESO Admin</option>
                  <option value="DOMAIN_MASTER">👑 Domain Master</option>
                  <option value="DOLE_COORDINATOR">DOLE Coordinator</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Status *</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 font-bold"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="DISABLED">DISABLED</option>
                </select>
              </div>
            </div>

            {/* Barangay Assignment for Coordinator / Assisting Documentor */}
            {(editRole === "TUPAD_COORDINATOR" || editRole === "TUPAD_ASSISTING_DOCUMENTOR") && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5">
                <label className="block text-xs font-bold text-amber-950 uppercase flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-600" />
                  <span>Assigned Barangay *</span>
                </label>
                <select
                  value={editBarangay}
                  onChange={(e) => setEditBarangay(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-amber-300 rounded-lg bg-white font-bold text-slate-800"
                >
                  {DINGALAN_BARANGAYS.map((b) => (
                    <option key={b} value={b}>
                      Barangay {b}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase flex items-center space-x-1">
                  <Key className="w-3.5 h-3.5 text-slate-400" />
                  <span>Reset / Change Password (Optional)</span>
                </label>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setEditPassword(generateSuggestedPassword(editRole, editBarangay))}
                    className="text-[10px] text-gov-blue hover:text-gov-dark font-bold flex items-center space-x-0.5"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>Auto-Suggest</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="text-[10px] text-slate-500 hover:text-gov-blue font-semibold flex items-center space-x-0.5"
                  >
                    {showEditPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showEditPassword ? "Hide" : "Show"}</span>
                  </button>
                </div>
              </div>
              <div className="relative">
                <input
                  type={showEditPassword ? "text" : "password"}
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Leave blank to keep existing password"
                  className="w-full pl-3 pr-10 py-2 text-xs border rounded-lg font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowEditPassword(!showEditPassword)}
                  className="absolute right-2.5 top-2.5 p-0.5 text-slate-400 hover:text-gov-blue"
                  title={showEditPassword ? "Hide password" : "Show password"}
                >
                  {showEditPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setEditUser(null)}
                className="px-4 py-2 text-xs font-bold border rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-gov-blue text-white font-bold text-xs rounded-lg shadow hover:bg-gov-light transition"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
