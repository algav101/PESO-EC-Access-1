"use client";

import React, { useEffect, useState } from "react";
import {
  FolderKanban,
  PlusCircle,
  Search,
  Calendar,
  MapPin,
  Users,
  ArrowRight,
  Clock,
  Edit2,
  Trash2,
  MoreVertical,
} from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDate } from "@/lib/utils";
import { EditProgramModal } from "@/components/programs/EditProgramModal";
import { DeleteProgramModal } from "@/components/programs/DeleteProgramModal";

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modal States
  const [editProgram, setEditProgram] = useState<any | null>(null);
  const [deleteProgram, setDeleteProgram] = useState<any | null>(null);

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    try {
      const res = await fetch("/api/v1/programs");
      if (res.ok) {
        const data = await res.json();
        setPrograms(data.programs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = programs.filter((p) => {
    const matchesSearch =
      p.programCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.programName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <FolderKanban className="w-6 h-6 text-gov-blue" />
            <span>TUPAD Work Programs</span>
          </h1>
          <p className="text-xs text-slate-500">
            Create, edit parameters, schedule work days, and monitor emergency employment programs
          </p>
        </div>

        <a
          href="/programs/new"
          className="px-4 py-2.5 bg-gov-blue hover:bg-gov-light text-white font-bold text-xs rounded-xl shadow transition flex items-center space-x-2 self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4 text-gov-goldLight" />
          <span>Create New Program</span>
        </a>
      </div>

      {/* Filters */}
      <div className="gov-card p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by program code or name..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-gov-blue bg-slate-50"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-500">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 font-medium focus:outline-none focus:border-gov-blue"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="COMPLETED">Completed</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </div>

      {/* Program Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400">Loading programs...</div>
      ) : filtered.length === 0 ? (
        <div className="gov-card p-12 text-center space-y-3">
          <FolderKanban className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">No programs found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Get started by creating your first 10-day TUPAD work program or adjusting your search filters.
          </p>
          <a
            href="/programs/new"
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-gov-blue text-white text-xs font-bold rounded-lg shadow"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Program</span>
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((prog) => (
            <div
              key={prog.id}
              className="gov-card p-5 space-y-4 gov-card-hover border-t-4 border-t-gov-blue flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-gov-blue border border-blue-200">
                      {prog.programCode}
                    </span>
                    <h2 className="text-base font-bold text-slate-900 mt-1">{prog.programName}</h2>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <StatusBadge status={prog.status} />
                    <button
                      onClick={() => setEditProgram(prog)}
                      className="p-1 text-slate-400 hover:text-gov-blue hover:bg-slate-100 rounded-lg transition"
                      title="Edit Program Details"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteProgram(prog)}
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Delete Program"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="flex items-center space-x-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{prog.municipality}, {prog.province}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{prog.requiredWorkDays} Work Days ({prog.dailyHours}h/day)</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{prog._count?.programBeneficiaries || 0} Beneficiaries</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Orientation: {formatDate(prog.orientationDate, "MMM dd, yyyy")}</span>
                  </div>
                </div>

                {prog.natureOfWork && (
                  <p className="text-[11px] text-slate-500 line-clamp-2">
                    <strong className="text-slate-700">Scope: </strong>
                    {prog.natureOfWork}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex space-x-2">
                  <a
                    href={`/programs/${prog.id}/import`}
                    className="px-2.5 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                  >
                    Import Masterlist
                  </a>
                  <a
                    href={`/stubs?programId=${prog.id}`}
                    className="px-2.5 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                  >
                    QR Stubs
                  </a>
                </div>

                <a
                  href={`/programs/${prog.id}`}
                  className="px-3.5 py-1.5 text-xs font-bold bg-gov-blue hover:bg-gov-light text-white rounded-lg transition shadow flex items-center space-x-1"
                >
                  <span>Open Hub</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Program Modal */}
      {editProgram && (
        <EditProgramModal
          isOpen={!!editProgram}
          onClose={() => setEditProgram(null)}
          program={editProgram}
          onProgramUpdated={() => {
            fetchPrograms();
          }}
        />
      )}

      {/* Delete Program Modal */}
      {deleteProgram && (
        <DeleteProgramModal
          isOpen={!!deleteProgram}
          onClose={() => {
            setDeleteProgram(null);
            fetchPrograms();
          }}
          program={deleteProgram}
          beneficiaryCount={deleteProgram._count?.programBeneficiaries || 0}
        />
      )}
    </div>
  );
}
