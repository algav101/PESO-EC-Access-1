"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  Users,
  Clock,
  Printer,
} from "lucide-react";
import { formatTime } from "@/lib/utils";

function AttendanceMatrixContent() {
  const searchParams = useSearchParams();
  const urlProgramId = searchParams.get("programId");

  const [programs, setPrograms] = useState<any[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>(urlProgramId || "");
  const [program, setProgram] = useState<any | null>(null);
  const [beneficiaries, setBeneficiaries] = useState<any[]>([]);
  const [selectedBarangay, setSelectedBarangay] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPrograms();
  }, []);

  useEffect(() => {
    if (selectedProgramId) {
      fetchProgramAndMatrix(selectedProgramId);
    }
  }, [selectedProgramId]);

  const fetchPrograms = async () => {
    try {
      const res = await fetch("/api/v1/programs");
      if (res.ok) {
        const data = await res.json();
        const progs = data.programs || [];
        setPrograms(progs);
        if (!selectedProgramId && progs.length > 0) {
          setSelectedProgramId(progs[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProgramAndMatrix = async (progId: string) => {
    setLoading(true);
    try {
      const pRes = await fetch(`/api/v1/programs/${progId}`);
      if (pRes.ok) {
        const pData = await pRes.json();
        setProgram(pData.program);
      }

      const bRes = await fetch(`/api/v1/programs/${progId}/beneficiaries`);
      if (bRes.ok) {
        const bData = await bRes.json();
        setBeneficiaries(bData.beneficiaries || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = beneficiaries.filter((pb) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      pb.designatedNumber.toLowerCase().includes(q) ||
      pb.beneficiary.fullName.toLowerCase().includes(q);
    const matchesBrgy = selectedBarangay === "ALL" || pb.beneficiary.barangay === selectedBarangay;
    return matchesSearch && matchesBrgy;
  });

  const numWorkDays = program?.workDays?.length || program?.requiredWorkDays || 10;
  const workDaysList = program?.workDays || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <FileSpreadsheet className="w-6 h-6 text-gov-blue" />
            <span>10-Day Dynamic Attendance Matrix</span>
          </h1>
          <p className="text-xs text-slate-500">
            Pivoted attendance records formatted strictly according to Dingalan TUPAD Reference 2 structure
          </p>
        </div>

        {selectedProgramId && (
          <a
            href={`/api/v1/reports/export?type=ATTENDANCE&programId=${selectedProgramId}`}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow flex items-center space-x-1.5 transition"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel (.XLSX)</span>
          </a>
        )}
      </div>

      {/* Filter Bar */}
      <div className="gov-card p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Select Program</label>
          <select
            value={selectedProgramId}
            onChange={(e) => setSelectedProgramId(e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 font-bold focus:outline-none focus:border-gov-blue"
          >
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.programCode} - {p.programName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Filter Barangay</label>
          <select
            value={selectedBarangay}
            onChange={(e) => setSelectedBarangay(e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:outline-none focus:border-gov-blue"
          >
            <option value="ALL">All Barangays</option>
            {[
              "Aplaya", "Butas na Bato", "Caragsacan", "Davildavilan",
              "Dikapanikian", "Ibona", "Matawe", "Paltic",
              "Poblacion", "Tanawan", "Umiray"
            ].map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Search Beneficiary</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or designated #..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-gov-blue bg-white"
            />
          </div>
        </div>
      </div>

      {/* Attendance Matrix Table */}
      <div className="gov-card overflow-hidden">
        <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Consolidated Attendance Matrix ({filtered.length} Beneficiaries • {numWorkDays} Work Days)
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">Loading Attendance Matrix...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">No records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b text-center">
                {/* Row 1: Day Headers */}
                <tr>
                  <th rowSpan={2} className="px-3 py-2 border-r bg-slate-200 text-left">
                    # Desig
                  </th>
                  <th rowSpan={2} className="px-3 py-2 border-r bg-slate-200 text-left min-w-[180px]">
                    Beneficiary Name
                  </th>
                  <th rowSpan={2} className="px-3 py-2 border-r bg-slate-200 text-left">
                    Barangay
                  </th>
                  <th rowSpan={2} className="px-3 py-2 border-r bg-slate-200">
                    Table
                  </th>

                  {Array.from({ length: numWorkDays }).map((_, dIdx) => {
                    const dayObj = workDaysList.find((w: any) => w.dayNumber === dIdx + 1);
                    return (
                      <th
                        key={dIdx}
                        colSpan={4}
                        className="px-2 py-1.5 border-r border-b bg-blue-50 text-gov-blue text-[10px] font-extrabold uppercase"
                      >
                        Day {dIdx + 1} {dayObj ? `(${dayObj.workDate})` : ""}
                      </th>
                    );
                  })}
                </tr>

                {/* Row 2: In/Out Headers */}
                <tr className="text-[9px] bg-slate-100 text-slate-600">
                  {Array.from({ length: numWorkDays }).map((_, dIdx) => (
                    <React.Fragment key={dIdx}>
                      <th className="px-1.5 py-1 border-r">AM IN</th>
                      <th className="px-1.5 py-1 border-r">AM OUT</th>
                      <th className="px-1.5 py-1 border-r">PM IN</th>
                      <th className="px-1.5 py-1 border-r">PM OUT</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-mono text-[10px]">
                {filtered.map((pb) => (
                  <tr key={pb.id} className="hover:bg-slate-50 text-center">
                    <td className="px-3 py-2 text-left font-bold text-gov-blue border-r">
                      {pb.designatedNumber}
                    </td>
                    <td className="px-3 py-2 text-left font-bold text-slate-900 font-sans border-r truncate">
                      {pb.beneficiary.fullName}
                    </td>
                    <td className="px-3 py-2 text-left text-slate-700 font-sans border-r">
                      {pb.beneficiary.barangay}
                    </td>
                    <td className="px-3 py-2 font-bold text-slate-800 border-r">
                      {pb.tableNumber || "T1"}
                    </td>

                    {/* Work Days Pivoted In/Out columns */}
                    {Array.from({ length: numWorkDays }).map((_, dIdx) => {
                      const dayObj = workDaysList.find((w: any) => w.dayNumber === dIdx + 1);
                      const rec = dayObj
                        ? pb.attendanceRecords?.find(
                            (a: any) => a.workDayId === dayObj.id || a.attendanceDate === dayObj.workDate
                          )
                        : null;

                      return (
                        <React.Fragment key={dIdx}>
                          <td className="px-1.5 py-2 border-r text-slate-800">
                            {rec?.morningTimeIn ? formatTime(rec.morningTimeIn) : "-"}
                          </td>
                          <td className="px-1.5 py-2 border-r text-slate-800">
                            {rec?.morningTimeOut ? formatTime(rec.morningTimeOut) : "-"}
                          </td>
                          <td className="px-1.5 py-2 border-r text-slate-800">
                            {rec?.afternoonTimeIn ? formatTime(rec.afternoonTimeIn) : "-"}
                          </td>
                          <td className="px-1.5 py-2 border-r text-slate-800">
                            {rec?.afternoonTimeOut ? formatTime(rec.afternoonTimeOut) : "-"}
                          </td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AttendanceMatrixPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading Attendance Matrix...</div>}>
      <AttendanceMatrixContent />
    </Suspense>
  );
}
