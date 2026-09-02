"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit2 } from "lucide-react";
import { EditBeneficiaryModal } from "./EditBeneficiaryModal";

interface EditBeneficiaryButtonProps {
  beneficiary: any;
  programBeneficiary?: any;
}

export function EditBeneficiaryButton({
  beneficiary,
  programBeneficiary,
}: EditBeneficiaryButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-gov-goldLight font-bold text-xs rounded-xl border border-gov-gold/40 shadow transition flex items-center space-x-1.5"
        title="Edit Beneficiary Details & Status"
      >
        <Edit2 className="w-3.5 h-3.5 text-gov-gold" />
        <span>Edit Beneficiary Details</span>
      </button>

      <EditBeneficiaryModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        programId={programBeneficiary?.programId}
        programBeneficiary={programBeneficiary}
        beneficiary={beneficiary}
        onUpdated={() => {
          router.refresh();
        }}
      />
    </>
  );
}
