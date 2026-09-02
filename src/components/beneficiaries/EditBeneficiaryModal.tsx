"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Edit2,
  Save,
  User,
  MapPin,
  Calendar,
  Phone,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Table as TableIcon,
  Tag,
} from "lucide-react";

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

const PARTICIPATION_STATUSES = [
  { value: "ACTIVE", label: "ACTIVE", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "REPLACED", label: "REPLACED", color: "bg-rose-50 text-rose-700 border-rose-200" },
  { value: "WITHDRAWN", label: "WITHDRAWN", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "DISQUALIFIED", label: "DISQUALIFIED", color: "bg-red-50 text-red-800 border-red-200" },
  { value: "COMPLETED", label: "COMPLETED", color: "bg-blue-50 text-blue-700 border-blue-200" },
];

interface EditBeneficiaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  programId?: string;
  programBeneficiary?: any;
  beneficiary?: any;
  onUpdated: (updatedData: any) => void;
}

export function EditBeneficiaryModal({
  isOpen,
  onClose,
  programId,
  programBeneficiary,
  beneficiary,
  onUpdated,
}: EditBeneficiaryModalProps) {
  // Target data objects
  const targetPb = programBeneficiary || null;
  const targetBene = beneficiary || programBeneficiary?.beneficiary || null;
  const progId = programId || targetPb?.programId || "";

  // Form states
  const [designatedNumber, setDesignatedNumber] = useState("");
  const [participationStatus, setParticipationStatus] = useState("ACTIVE");
  const [orientationStatus, setOrientationStatus] = useState("PENDING");
  const [tableNumber, setTableNumber] = useState("");
  const [slotGroup, setSlotGroup] = useState("");

  const [fullName, setFullName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [sex, setSex] = useState("MALE");
  const [barangay, setBarangay] = useState("Paltic");
  const [sitio, setSitio] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [civilStatus, setCivilStatus] = useState("SINGLE");
  const [occupation, setOccupation] = useState("");
  const [idType, setIdType] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [masterStatus, setMasterStatus] = useState("ACTIVE");

  const [isSenior, setIsSenior] = useState(false);
  const [isPwd, setIsPwd] = useState(false);
  const [is4Ps, setIs4Ps] = useState(false);
  const [isIp, setIsIp] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMsg(null);

      if (targetPb) {
        setDesignatedNumber(targetPb.designatedNumber || "");
        setParticipationStatus(targetPb.participationStatus || "ACTIVE");
        setTableNumber(targetPb.tableNumber || "");
        setSlotGroup(targetPb.slotGroup || "Main");
        const hasOrientation = targetPb.orientationAttendance && targetPb.orientationAttendance.length > 0;
        setOrientationStatus(hasOrientation ? "PRESENT" : "PENDING");
      }

      if (targetBene) {
        setFullName(targetBene.fullName || "");
        setBirthday(targetBene.birthday || "");
        setSex(targetBene.sex || "MALE");
        setBarangay(targetBene.barangay || "Paltic");
        setSitio(targetBene.sitio || "");
        setContactNumber(targetBene.contactNumber || "");
        setCivilStatus(targetBene.civilStatus || "SINGLE");
        setOccupation(targetBene.occupation || "");
        setIdType(targetBene.idType || "");
        setIdNumber(targetBene.idNumber || "");
        setMasterStatus(targetBene.status || "ACTIVE");

        setIsSenior(Boolean(targetBene.isSenior));
        setIsPwd(Boolean(targetBene.isPwd));
        setIs4Ps(Boolean(targetBene.is4Ps));
        setIsIp(Boolean(targetBene.isIp));
      }
    }
  }, [isOpen, programBeneficiary, beneficiary]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (!fullName.trim()) {
        throw new Error("Beneficiary full name is required.");
      }
      if (!birthday.trim()) {
        throw new Error("Birthday is required (YYYY-MM-DD).");
      }

      let res: Response;
      if (progId && targetPb) {
        // Update via Program Beneficiary endpoint
        res = await fetch(`/api/v1/programs/${progId}/beneficiaries`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            programBeneficiaryId: targetPb.id,
            designatedNumber,
            participationStatus,
            tableNumber,
            slotGroup,
            orientationStatus,
            fullName,
            birthday,
            sex,
            barangay,
            sitio,
            contactNumber,
            civilStatus,
            occupation,
            idType,
            idNumber,
            isSenior,
            isPwd,
            is4Ps,
            isIp,
            masterStatus,
          }),
        });
      } else if (targetBene) {
        // Update directly via master beneficiary endpoint
        res = await fetch(`/api/v1/beneficiaries/${targetBene.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName,
            birthday,
            sex,
            barangay,
            sitio,
            contactNumber,
            civilStatus,
            occupation,
            idType,
            idNumber,
            isSenior,
            isPwd,
            is4Ps,
            isIp,
            status: masterStatus,
          }),
        });
      } else {
        throw new Error("No target beneficiary data specified for editing.");
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update beneficiary data.");
      }

      setSuccessMsg("Beneficiary updated successfully!");
      onUpdated(data.beneficiary);

      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full my-8 p-6 space-y-5 shadow-2xl border-t-4 border-t-gov-blue max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-gov-blue/10 rounded-xl text-gov-blue">
              <Edit2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center space-x-2">
                <span>Edit Beneficiary Details & Status</span>
                {designatedNumber && (
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-gov-blue/10 text-gov-blue">
                    #{designatedNumber}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {targetBene?.beneficiaryNumber || "TUPAD Masterlist"} • Update status, assignment, or profile info
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 pr-1 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center space-x-2 font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center space-x-2 font-medium">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 1. STATUS & PARTICIPATION CONTROLS */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
              <Tag className="w-3.5 h-3.5 text-gov-blue" />
              <span>Status & Participation Settings</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Participation Status */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Participation Status
                </label>
                <select
                  value={participationStatus}
                  onChange={(e) => setParticipationStatus(e.target.value)}
                  className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-blue focus:outline-none"
                >
                  {PARTICIPATION_STATUSES.map((st) => (
                    <option key={st.value} value={st.value}>
                      {st.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Orientation Status */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Orientation Attendance
                </label>
                <select
                  value={orientationStatus}
                  onChange={(e) => setOrientationStatus(e.target.value)}
                  className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-blue focus:outline-none"
                >
                  <option value="PRESENT">✓ PRESENT (Oriented)</option>
                  <option value="PENDING">⌛ PENDING (Unoriented)</option>
                  <option value="ABSENT">✕ ABSENT</option>
                </select>
              </div>

              {/* Master Status */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Master System Status
                </label>
                <select
                  value={masterStatus}
                  onChange={(e) => setMasterStatus(e.target.value)}
                  className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-blue focus:outline-none"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="BLACKLISTED">BLACKLISTED</option>
                  <option value="DECEASED">DECEASED</option>
                </select>
              </div>
            </div>

            {/* Table and Designated # Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-200/60">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Designated #
                </label>
                <input
                  type="text"
                  value={designatedNumber}
                  onChange={(e) => setDesignatedNumber(e.target.value)}
                  placeholder="e.g. 1"
                  className="w-full text-xs font-mono font-bold px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-blue focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Table Assignment
                </label>
                <input
                  type="text"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="e.g. Table 1"
                  className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-blue focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Slot Group
                </label>
                <input
                  type="text"
                  value={slotGroup}
                  onChange={(e) => setSlotGroup(e.target.value)}
                  placeholder="e.g. Main, DepEd Slot"
                  className="w-full text-xs font-medium px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-blue focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* 2. PERSONAL IDENTITY & PROFILE */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
              <User className="w-3.5 h-3.5 text-gov-blue" />
              <span>Personal Identity & Demographics</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Full Name (LASTNAME, FIRSTNAME MIDDLENAME) *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. DELA CRUZ, JUAN SANTOS"
                  className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-blue focus:outline-none uppercase"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Birthday (YYYY-MM-DD) *
                </label>
                <input
                  type="text"
                  required
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  placeholder="1990-05-15"
                  className="w-full text-xs font-mono font-medium px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-blue focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Sex
                </label>
                <select
                  value={sex}
                  onChange={(e) => setSex(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-blue focus:outline-none"
                >
                  <option value="MALE">MALE</option>
                  <option value="FEMALE">FEMALE</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Contact Number
                </label>
                <input
                  type="text"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="09123456789"
                  className="w-full text-xs font-mono px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-blue focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Civil Status
                </label>
                <select
                  value={civilStatus}
                  onChange={(e) => setCivilStatus(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-blue focus:outline-none"
                >
                  <option value="SINGLE">SINGLE</option>
                  <option value="MARRIED">MARRIED</option>
                  <option value="WIDOWED">WIDOWED</option>
                  <option value="SEPARATED">SEPARATED</option>
                  <option value="COHABITING">COHABITING</option>
                </select>
              </div>
            </div>
          </div>

          {/* 3. BARANGAY & LOCATION */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
              <MapPin className="w-3.5 h-3.5 text-gov-blue" />
              <span>Location & Residence</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Barangay (Dingalan) *
                </label>
                <select
                  value={barangay}
                  onChange={(e) => setBarangay(e.target.value)}
                  className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-blue focus:outline-none"
                >
                  {DINGALAN_BARANGAYS.map((brgy) => (
                    <option key={brgy} value={brgy}>
                      {brgy}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Sitio / Purok / Street
                </label>
                <input
                  type="text"
                  value={sitio}
                  onChange={(e) => setSitio(e.target.value)}
                  placeholder="e.g. Sitio Mulawin, Purok Tanigue"
                  className="w-full text-xs font-medium px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-blue focus:outline-none uppercase"
                />
              </div>
            </div>
          </div>

          {/* 4. VULNERABILITY & SOCIAL CLASSIFICATIONS */}
          <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl space-y-2">
            <label className="block text-[11px] font-bold text-gov-blue uppercase tracking-wider">
              Special Classifications
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSenior}
                  onChange={(e) => setIsSenior(e.target.checked)}
                  className="rounded text-gov-blue focus:ring-gov-blue w-4 h-4"
                />
                <span className="font-semibold text-slate-700">Senior Citizen (60+)</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPwd}
                  onChange={(e) => setIsPwd(e.target.checked)}
                  className="rounded text-gov-blue focus:ring-gov-blue w-4 h-4"
                />
                <span className="font-semibold text-slate-700">PWD</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={is4Ps}
                  onChange={(e) => setIs4Ps(e.target.checked)}
                  className="rounded text-gov-blue focus:ring-gov-blue w-4 h-4"
                />
                <span className="font-semibold text-slate-700">4Ps Beneficiary</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isIp}
                  onChange={(e) => setIsIp(e.target.checked)}
                  className="rounded text-gov-blue focus:ring-gov-blue w-4 h-4"
                />
                <span className="font-semibold text-slate-700">Indigenous (IP)</span>
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-3 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg border transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto px-5 py-2 bg-gov-blue hover:bg-gov-light text-white font-bold text-xs rounded-lg shadow-md transition flex items-center justify-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? "Saving Changes..." : "Save Beneficiary Changes"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
