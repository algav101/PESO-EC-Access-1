"use client";

import React, { useState, useMemo } from "react";
import {
  MapPin,
  Users,
  ShieldCheck,
  Building,
  CheckCircle2,
  Calendar,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
  ArrowRight,
  Filter,
} from "lucide-react";
import {
  DINGALAN_BARANGAY_GROUPINGS,
  getBarangayKey,
  getStandardBarangayName,
  classifyBeneficiaryGroup,
  computeGroupDemographics,
} from "@/lib/dingalan-groupings";

interface DeploymentGroupingMatrixProps {
  beneficiaries: any[];
  selectedBarangay: string;
  onEditBeneficiary: (pb: any) => void;
  onDeleteBeneficiary: (pb: any) => void;
  programId?: string;
}

export function DeploymentGroupingMatrix({
  beneficiaries,
  selectedBarangay,
  onEditBeneficiary,
  onDeleteBeneficiary,
  programId,
}: DeploymentGroupingMatrixProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  // Group active beneficiaries by standard Barangay and Group
  const groupedData = useMemo(() => {
    const barangayMap: Record<
      string,
      {
        barangay: string;
        groups: Array<{
          groupName: string;
          groupLabel: string;
          designatedMainArea: string;
          coveredPuroks: string[];
          beneficiaries: any[];
          demographics: ReturnType<typeof computeGroupDemographics>;
        }>;
        totalCount: number;
      }
    > = {};

    // Initialize all barangays and their defined groups
    Object.entries(DINGALAN_BARANGAY_GROUPINGS).forEach(([bKey, cfg]) => {
      barangayMap[cfg.barangay] = {
        barangay: cfg.barangay,
        groups: cfg.groups.map((g) => ({
          groupName: g.groupName,
          groupLabel: g.groupLabel,
          designatedMainArea: g.designatedMainArea,
          coveredPuroks: g.purokSitios,
          beneficiaries: [],
          demographics: {
            totalCount: 0,
            maleCount: 0,
            femaleCount: 0,
            scPwdMaleCount: 0,
            scPwdFemaleCount: 0,
            isSeniorCount: 0,
            isPwdCount: 0,
            isIpCount: 0,
            is4PsCount: 0,
          },
        })),
        totalCount: 0,
      };
    });

    // Populate beneficiaries into groups
    beneficiaries.forEach((pb) => {
      if (pb.participationStatus === "REPLACED") return;
      const b = pb.beneficiary || pb;
      const rawBrgy = b.barangay || "Paltic";
      const stdBrgy = getStandardBarangayName(rawBrgy);

      if (!barangayMap[stdBrgy]) {
        barangayMap[stdBrgy] = {
          barangay: stdBrgy,
          groups: [],
          totalCount: 0,
        };
      }

      const brgyEntry = barangayMap[stdBrgy];
      brgyEntry.totalCount += 1;

      const classification = classifyBeneficiaryGroup(stdBrgy, b.sitio || "");
      let groupEntry = brgyEntry.groups.find((g) => g.groupName === classification.groupName);

      if (!groupEntry) {
        groupEntry = {
          groupName: classification.groupName,
          groupLabel: classification.groupLabel,
          designatedMainArea: classification.designatedMainArea,
          coveredPuroks: [],
          beneficiaries: [],
          demographics: {
            totalCount: 0,
            maleCount: 0,
            femaleCount: 0,
            scPwdMaleCount: 0,
            scPwdFemaleCount: 0,
            isSeniorCount: 0,
            isPwdCount: 0,
            isIpCount: 0,
            is4PsCount: 0,
          },
        };
        brgyEntry.groups.push(groupEntry);
      }

      groupEntry.beneficiaries.push(pb);
    });

    // Calculate demographics for each group
    Object.values(barangayMap).forEach((brgyEntry) => {
      brgyEntry.groups.forEach((g) => {
        g.demographics = computeGroupDemographics(g.beneficiaries);
      });
    });

    return barangayMap;
  }, [beneficiaries]);

  const displayBarangays = Object.values(groupedData).filter((b) => {
    if (selectedBarangay === "ALL") return true;
    return b.barangay === selectedBarangay;
  });

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="p-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase text-amber-300 tracking-wider flex items-center space-x-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>TUPAD Work Program Deployment Grouping Matrix</span>
          </span>
          <h3 className="text-base font-black tracking-tight mt-0.5">
            Beneficiaries Grouped by Barangay &amp; Purok/Sitio Assignment
          </h3>
          <p className="text-xs text-blue-100 max-w-2xl">
            Basis of deployment for the 10-day TUPAD work program. Groups harmonize nearby Sitios (e.g. Umiray Group 1: Singawan, Pinamaypayan, and Dugyan) with designated work activities and accurate demographic ratios.
          </p>
        </div>

        {programId && (
          <a
            href={`/programs/${programId}/work-program`}
            className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-xs rounded-xl shadow transition flex items-center space-x-1.5 self-start md:self-auto"
          >
            <span>View 10-Day Work Program</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        )}
      </div>

      {/* Barangay Group Cards */}
      <div className="space-y-6">
        {displayBarangays.map((brgy) => (
          <div key={brgy.barangay} className="gov-card overflow-hidden shadow border border-slate-200">
            {/* Barangay Title Bar */}
            <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-gov-blue/10 text-gov-blue rounded-xl">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                    Barangay {brgy.barangay}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {brgy.groups.length} Deployment Group(s) •{" "}
                    <span className="font-bold text-gov-blue">{brgy.totalCount} Enrolled Beneficiaries</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Groups Grid */}
            <div className="divide-y divide-slate-100">
              {brgy.groups.map((g) => {
                const isExpanded = Boolean(expandedGroups[`${brgy.barangay}_${g.groupName}`]);
                const demo = g.demographics;

                return (
                  <div key={g.groupName} className="p-4 sm:p-5 space-y-3 hover:bg-slate-50/50 transition">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="px-2.5 py-0.5 bg-amber-100 text-amber-950 font-black text-xs rounded-lg border border-amber-300 shadow-2xs">
                            {g.groupLabel}
                          </span>
                          <span className="text-xs font-bold text-slate-800">{g.designatedMainArea}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 font-medium">
                          Covered Puroks &amp; Sitios:{" "}
                          <span className="font-bold text-slate-900">
                            {g.coveredPuroks.slice(0, 6).join(", ")}
                            {g.coveredPuroks.length > 6 ? ` +${g.coveredPuroks.length - 6} more` : ""}
                          </span>
                        </p>
                      </div>

                      {/* Demographics Pill Box */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-1 bg-slate-900 text-white border border-slate-800 rounded-lg text-xs font-black">
                          Total: {demo.totalCount}
                        </span>
                        <span className="px-2 py-1 bg-slate-100 text-slate-900 border border-slate-300 rounded-lg text-[11px] font-bold">
                          Male: {demo.maleCount}
                        </span>
                        <span className="px-2 py-1 bg-slate-100 text-slate-900 border border-slate-300 rounded-lg text-[11px] font-bold">
                          Female: {demo.femaleCount}
                        </span>
                        <span className="px-2 py-1 bg-purple-50 text-purple-900 border border-purple-300 rounded-lg text-[11px] font-bold">
                          SC: {demo.isSeniorCount}
                        </span>
                        <span className="px-2 py-1 bg-blue-50 text-blue-900 border border-blue-300 rounded-lg text-[11px] font-bold">
                          PWD: {demo.isPwdCount}
                        </span>
                        {demo.isIpCount > 0 && (
                          <span className="px-2 py-1 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-lg text-[11px] font-bold">
                            IP: {demo.isIpCount}
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => toggleGroup(`${brgy.barangay}_${g.groupName}`)}
                          className="p-1.5 text-slate-700 hover:text-slate-950 hover:bg-slate-200 rounded-lg border border-slate-300 transition ml-1 flex items-center space-x-1 text-xs font-bold shadow-2xs"
                        >
                          <span>{isExpanded ? "Hide Roster" : "View Roster"}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Group Roster Table */}
                    {isExpanded && (
                      <div className="pt-2">
                        <div className="border border-slate-300 rounded-xl overflow-x-auto bg-white shadow-xs">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-900 text-white font-extrabold uppercase text-[10px] border-b border-slate-800">
                              <tr>
                                <th className="px-3 py-2.5">#</th>
                                <th className="px-3 py-2.5">Full Name</th>
                                <th className="px-3 py-2.5">Purok / Sitio</th>
                                <th className="px-3 py-2.5">Sex &amp; Age</th>
                                <th className="px-3 py-2.5">Categories</th>
                                <th className="px-3 py-2.5">Contact No.</th>
                                <th className="px-3 py-2.5 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {g.beneficiaries.map((pb) => {
                                const b = pb.beneficiary || pb;
                                return (
                                  <tr key={pb.id} className="hover:bg-slate-50/90">
                                    <td className="px-3 py-2.5 font-mono font-black text-slate-950">
                                      {pb.designatedNumber || "-"}
                                    </td>
                                    <td className="px-3 py-2.5 font-black text-slate-950">{b.fullName}</td>
                                    <td className="px-3 py-2.5 font-bold text-slate-800">{b.sitio || "-"}</td>
                                    <td className="px-3 py-2.5 font-mono font-semibold text-slate-800">
                                      {b.sex || "-"} / {b.age || "-"} yrs
                                    </td>
                                    <td className="px-3 py-2.5">
                                      <div className="flex flex-wrap gap-1">
                                        {(b.isSenior || (b.age && b.age >= 60)) && (
                                          <span className="px-1.5 py-0.2 bg-purple-50 text-purple-900 border border-purple-300 rounded text-[9px] font-bold">
                                            SC
                                          </span>
                                        )}
                                        {b.isPwd && (
                                          <span className="px-1.5 py-0.2 bg-blue-50 text-blue-900 border border-blue-300 rounded text-[9px] font-bold">
                                            PWD
                                          </span>
                                        )}
                                        {b.isIp && (
                                          <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded text-[9px] font-bold">
                                            IP
                                          </span>
                                        )}
                                        {b.is4Ps && (
                                          <span className="px-1.5 py-0.2 bg-amber-50 text-amber-900 border border-amber-300 rounded text-[9px] font-bold">
                                            4Ps
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-3 py-2.5 font-mono font-bold text-slate-800">{b.contactNumber || "-"}</td>
                                    <td className="px-3 py-2.5 text-right">
                                      <div className="flex items-center justify-end space-x-1">
                                        <button
                                          type="button"
                                          onClick={() => onEditBeneficiary(pb)}
                                          className="p-1 text-slate-500 hover:text-gov-blue hover:bg-slate-100 rounded transition"
                                          title="Edit Beneficiary"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => onDeleteBeneficiary(pb)}
                                          className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition"
                                          title="Delete Beneficiary"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
