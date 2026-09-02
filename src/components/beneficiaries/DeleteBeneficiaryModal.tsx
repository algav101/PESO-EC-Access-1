"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, AlertTriangle, X } from "lucide-react";

interface DeleteBeneficiaryModalProps {
  beneficiaryId: string;
  fullName: string;
  beneficiaryNumber: string;
  barangay?: string;
  redirectTo?: string;
}

export function DeleteBeneficiaryModal({
  beneficiaryId,
  fullName,
  beneficiaryNumber,
  barangay,
  redirectTo = "/beneficiaries",
}: DeleteBeneficiaryModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/beneficiaries/${beneficiaryId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete beneficiary");
      }
      setIsOpen(false);
      router.push(redirectTo);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 font-bold text-xs rounded-xl border border-rose-200 transition flex items-center space-x-1.5 shadow-xs"
        title="Permanently delete beneficiary record and all associations"
      >
        <Trash2 className="w-3.5 h-3.5" />
        <span>Delete Beneficiary</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border-t-4 border-t-rose-600">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3 text-rose-700">
                <div className="p-2.5 bg-rose-100 rounded-full">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Delete Beneficiary Permanently</h3>
                  <p className="text-xs text-slate-500 font-medium">Remove from TUPAD Masterlist</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Beneficiary #:</span>
                <span className="font-mono font-bold text-gov-blue">{beneficiaryNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Full Name:</span>
                <span className="font-bold text-slate-900">{fullName}</span>
              </div>
              {barangay && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Barangay:</span>
                  <span className="font-semibold text-slate-700">{barangay}</span>
                </div>
              )}
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
              <div className="flex items-center space-x-1.5 font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>Permanent Deletion Warning:</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                This will permanently delete this beneficiary record, all program enrollments, generated QR codes, orientation logs, attendance scans, and payout records. This action cannot be undone.
              </p>
            </div>

            {error && (
              <div className="p-2.5 bg-red-100 text-red-800 rounded-lg text-xs font-semibold">
                {error}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isDeleting}
                className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg border transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="w-full sm:w-auto px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow transition flex items-center justify-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? "Deleting..." : "Permanently Delete"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
