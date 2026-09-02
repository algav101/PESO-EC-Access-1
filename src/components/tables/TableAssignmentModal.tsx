"use client";

import React, { useState, useEffect } from "react";
import {
  Table as TableIcon,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Sliders,
  X,
  RefreshCw,
  Layers,
  ArrowRight,
} from "lucide-react";

export interface TableRuleItem {
  id?: string;
  startNumber: number;
  endNumber: number;
  tableNumber: string;
  slotGroup: string;
}

interface TableAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  programId: string;
  programName?: string;
  totalBeneficiaryCount?: number;
  onRulesUpdated?: () => void;
}

export function TableAssignmentModal({
  isOpen,
  onClose,
  programId,
  programName,
  totalBeneficiaryCount = 0,
  onRulesUpdated,
}: TableAssignmentModalProps) {
  const [rules, setRules] = useState<TableRuleItem[]>([]);
  const [totalCount, setTotalCount] = useState(totalBeneficiaryCount);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && programId) {
      fetchRules();
    }
  }, [isOpen, programId]);

  const fetchRules = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/programs/${programId}/table-rules`);
      if (res.ok) {
        const data = await res.json();
        const existingRules = data.rules || [];
        setTotalCount(data.totalBeneficiaries || totalBeneficiaryCount);

        if (existingRules.length > 0) {
          setRules(
            existingRules.map((r: any) => ({
              id: r.id,
              startNumber: r.startNumber,
              endNumber: r.endNumber,
              tableNumber: r.tableNumber,
              slotGroup: r.slotGroup || "",
            }))
          );
        } else {
          // Default initial rule
          const count = data.totalBeneficiaries || totalBeneficiaryCount || 100;
          generatePresetSplit(100, count);
        }
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const generatePresetSplit = (batchSize: number, total: number) => {
    const effectiveTotal = Math.max(total, 1);
    const newRules: TableRuleItem[] = [];
    let currentStart = 1;
    let tableIndex = 1;

    while (currentStart <= effectiveTotal) {
      const currentEnd = Math.min(currentStart + batchSize - 1, effectiveTotal);
      newRules.push({
        startNumber: currentStart,
        endNumber: currentEnd,
        tableNumber: `Table ${tableIndex}`,
        slotGroup: `Slot Group ${tableIndex} (${currentStart}-${currentEnd})`,
      });
      currentStart = currentEnd + 1;
      tableIndex++;
    }

    setRules(newRules);
  };

  const handleAddRow = () => {
    const lastRule = rules[rules.length - 1];
    const nextStart = lastRule ? lastRule.endNumber + 1 : 1;
    const nextEnd = nextStart + 99;
    const nextTableNum = `Table ${rules.length + 1}`;

    setRules([
      ...rules,
      {
        startNumber: nextStart,
        endNumber: nextEnd,
        tableNumber: nextTableNum,
        slotGroup: `Slot Group ${rules.length + 1} (${nextStart}-${nextEnd})`,
      },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    const updated = rules.filter((_, i) => i !== index);
    setRules(updated);
  };

  const handleFieldChange = (index: number, field: keyof TableRuleItem, value: any) => {
    const updated = [...rules];
    updated[index] = { ...updated[index], [field]: value };
    setRules(updated);
  };

  const handleSaveAndApply = async () => {
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    // Validate ranges
    for (let i = 0; i < rules.length; i++) {
      const r = rules[i];
      if (r.startNumber > r.endNumber) {
        setError(`Row ${i + 1}: Start Number (#${r.startNumber}) cannot be greater than End Number (#${r.endNumber})`);
        setSaving(false);
        return;
      }
      if (!r.tableNumber.trim()) {
        setError(`Row ${i + 1}: Table Number is required`);
        setSaving(false);
        return;
      }
    }

    try {
      const res = await fetch(`/api/v1/programs/${programId}/table-rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save table rules");

      setSuccessMsg("Table assignments successfully saved & retroactively applied to all beneficiaries!");
      if (onRulesUpdated) onRulesUpdated();

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const totalCoveredCapacity = rules.reduce((acc, r) => acc + Math.max(0, r.endNumber - r.startNumber + 1), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-gov-blue text-gov-goldLight">
              <TableIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight text-white flex items-center space-x-2">
                <span>Table Assignment & Beneficiary Range Configuration</span>
              </h3>
              <p className="text-[11px] text-slate-300">
                {programName || "TUPAD Program"} • {totalCount} Total Enrolled Beneficiaries
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-xs text-emerald-800 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Quick Presets Bar */}
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gov-blue uppercase flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-gov-gold" />
                <span>1-Click Auto-Split Range Presets</span>
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                Total Covered: <strong>{totalCoveredCapacity}</strong> / {totalCount}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => generatePresetSplit(100, totalCount)}
                className="px-3 py-1.5 bg-white hover:bg-gov-blue hover:text-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 shadow-sm transition"
              >
                Split by 100 (1-100, 101-200...)
              </button>
              <button
                type="button"
                onClick={() => generatePresetSplit(50, totalCount)}
                className="px-3 py-1.5 bg-white hover:bg-gov-blue hover:text-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 shadow-sm transition"
              >
                Split by 50 (1-50, 51-100...)
              </button>
              <button
                type="button"
                onClick={() => generatePresetSplit(75, totalCount)}
                className="px-3 py-1.5 bg-white hover:bg-gov-blue hover:text-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 shadow-sm transition"
              >
                Split by 75 (1-75, 76-150...)
              </button>
              <button
                type="button"
                onClick={() => generatePresetSplit(Math.ceil(totalCount / 5), totalCount)}
                className="px-3 py-1.5 bg-white hover:bg-gov-blue hover:text-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 shadow-sm transition"
              >
                Equal Across 5 Tables
              </button>
            </div>
          </div>

          {/* Table Ranges Configuration Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Table Assignment Rules ({rules.length} Tables)
              </h4>
              <button
                type="button"
                onClick={handleAddRow}
                className="px-3 py-1 bg-gov-blue hover:bg-gov-light text-white font-bold text-xs rounded-lg shadow transition flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Table Range</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b">
                  <tr>
                    <th className="px-3 py-2.5">Start #</th>
                    <th className="px-3 py-2.5">End #</th>
                    <th className="px-3 py-2.5 text-center">Equivalent Beneficiary Count</th>
                    <th className="px-3 py-2.5">Table Assignment</th>
                    <th className="px-3 py-2.5">Slot / Category Tag</th>
                    <th className="px-2 py-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rules.map((rule, idx) => {
                    const count = Math.max(0, rule.endNumber - rule.startNumber + 1);
                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        {/* Start Number */}
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="1"
                            value={rule.startNumber}
                            onChange={(e) =>
                              handleFieldChange(idx, "startNumber", parseInt(e.target.value, 10) || 1)
                            }
                            className="w-20 px-2.5 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-gov-blue"
                          />
                        </td>

                        {/* End Number */}
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="1"
                            value={rule.endNumber}
                            onChange={(e) =>
                              handleFieldChange(idx, "endNumber", parseInt(e.target.value, 10) || 1)
                            }
                            className="w-20 px-2.5 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-gov-blue"
                          />
                        </td>

                        {/* Equivalent Beneficiary Count */}
                        <td className="px-3 py-2 text-center">
                          <span className="px-3 py-1 rounded-full text-xs font-black font-mono bg-blue-50 text-gov-blue border border-blue-200 inline-block">
                            {count} Beneficiaries
                          </span>
                        </td>

                        {/* Table Number */}
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={rule.tableNumber}
                            onChange={(e) => handleFieldChange(idx, "tableNumber", e.target.value)}
                            placeholder="e.g. Table 1"
                            className="w-28 px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-gov-blue"
                          />
                        </td>

                        {/* Slot Group Tag */}
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={rule.slotGroup}
                            onChange={(e) => handleFieldChange(idx, "slotGroup", e.target.value)}
                            placeholder="e.g. Main Regular"
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-gov-blue"
                          />
                        </td>

                        {/* Delete Action */}
                        <td className="px-2 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Delete Table Rule"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Clicking Apply will retroactively update table numbers for all <strong>{totalCount}</strong> beneficiaries.
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 border rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAndApply}
              disabled={saving || rules.length === 0}
              className="px-5 py-2 bg-gov-gold hover:bg-gov-goldLight text-gov-dark font-extrabold text-xs rounded-xl shadow-lg flex items-center space-x-1.5 transition disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>{saving ? "Updating Beneficiary Records..." : "Save & Apply to Beneficiaries"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
