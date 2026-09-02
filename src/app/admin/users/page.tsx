"use client";

import React, { useEffect, useState } from "react";
import { Users, UserPlus, Shield, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDate } from "@/lib/utils";

export default function UserManagementPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("TUPAD_COORDINATOR");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
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
        body: JSON.stringify({ username, password, fullName, email, role }),
      });

      if (res.ok) {
        setIsCreateOpen(false);
        setUsername("");
        setPassword("");
        setFullName("");
        setEmail("");
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create user");
      }
    } catch (e) {
      alert("Error creating user");
    }
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
            Manage PESO Admin, TUPAD Field Coordinators, and DOLE Regional Officers with RBAC security
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2 bg-gov-blue hover:bg-gov-light text-white font-bold text-xs rounded-xl shadow flex items-center space-x-1.5 transition self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4 text-gov-goldLight" />
          <span>Add System User</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="gov-card overflow-hidden shadow">
        <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Active Accounts ({users.length})
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b">
              <tr>
                <th className="px-4 py-3">Full Name</th>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Assigned Role</th>
                <th className="px-4 py-3">Email Address</th>
                <th className="px-4 py-3">Last Login</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-slate-900">{u.fullName}</td>
                  <td className="px-4 py-3 font-mono text-slate-600">@{u.username}</td>
                  <td className="px-4 py-3 font-semibold text-gov-blue">
                    {u.role.replace(/_/g, " ")}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{u.email || "-"}</td>
                  <td className="px-4 py-3 text-slate-500 font-mono">
                    {u.lastLoginAt ? formatDate(u.lastLoginAt, "MMM dd, yyyy HH:mm") : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={u.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form onSubmit={handleCreateUser} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Create New System User
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
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Password *</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-xs border rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Role *</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 font-bold"
              >
                <option value="PESO_ADMIN">PESO Admin (Full Operations Access)</option>
                <option value="TUPAD_COORDINATOR">TUPAD Field Coordinator (Scanning & Attendance)</option>
                <option value="DOLE_COORDINATOR">DOLE Coordinator (Auditing & Reports)</option>
              </select>
            </div>

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
                className="px-4 py-2 bg-gov-blue text-white font-bold text-xs rounded-lg shadow"
              >
                Create Account
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
