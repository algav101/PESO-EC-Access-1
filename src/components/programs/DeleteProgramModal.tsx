"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Trash2,
  AlertTriangle,
  X,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";

interface DeleteProgramModalProps {
  isOpen: boolean;
  onClose: () => void;
  program: any;
  beneficiaryCount?: number;
}

export function DeleteProgramModal({
  isOpen,
  onClose,
  program,
  beneficiaryCount = 0,
}: DeleteProgramModalProps) {
  const router = useRouter();
  const [confirmInput, setConfirmInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !program) return null;

  const expectedCode = (program.programCode || "").trim();
  const isMatch = confirmInput.trim().toUpperCase() === expectedCode.toUpperCase();

  const handleDelete = async () => {
    if (!isMatch) {
      setError(`Please type the exact program code '${expectedCode}' to confirm deletion.`);
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/programs/${program.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete program");

      alert(data.message || `Program '${program.programName}' was successfully deleted.`);
      onClose();
      router.push("/programs");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-red-200 overflow-hidden space-y-4 p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-6 h-6" />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-1.5">
          <h3 className="text-base font-black text-slate-900 tracking-tight">
            Permanently Delete Work Program?
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            This action <strong className="text-red-700">cannot be undone</strong>. Deleting <strong>{program.programName}</strong> will permanently remove all associated:
          </p>
          <ul className="text-xs text-slate-500 list-disc list-inside space-y-0.5 pt-1">
            <li><strong>{beneficiaryCount}</strong> Enrolled Beneficiary Roster Records</li>
            <li>Cryptographic QR Codes & Verification Tokens</li>
            <li>10-Day Attendance Records & Daily Scans</li>
            <li>Geotagged Accomplishment Photos</li>
            <li>Table Assignment Rules</li>
          </ul>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center space-x-1.5">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-2 pt-1">
          <label className="block text-xs font-bold text-slate-700">
            Type <span className="font-mono text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">{expectedCode}</span> to confirm:
          </label>
          <input
            type="text"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            placeholder={`Enter ${expectedCode}`}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono font-bold focus:outline-none focus:border-red-500 bg-slate-50"
          />
        </div>

        <div className="pt-3 flex items-center justify-end space-x-2 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 border rounded-lg"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting || !isMatch}
            className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-lg transition flex items-center space-x-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {deleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            <span>{deleting ? "Deleting Program..." : "Permanently Delete Program"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
