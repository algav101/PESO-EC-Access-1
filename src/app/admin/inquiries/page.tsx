"use client";

import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Search,
  CheckCircle2,
  Clock,
  Send,
  Trash2,
  User,
  Phone,
  MapPin,
  Sparkles,
  AlertTriangle,
  FileText,
  HelpCircle,
  Lightbulb,
  FileQuestion,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function AdminInquiriesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "PESO_ADMIN";

  const [messages, setMessages] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [loading, setLoading] = useState(true);

  // Active message modal for reply & review
  const [activeMsg, setActiveMsg] = useState<any | null>(null);
  const [replyText, setReplyText] = useState("");
  const [adminRemarks, setAdminRemarks] = useState("");
  const [targetStatus, setTargetStatus] = useState("REPLIED");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchMessages();
  }, [search, selectedStatus, selectedCategory]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        search,
        status: selectedStatus,
        category: selectedCategory,
      }).toString();

      const res = await fetch(`/api/v1/admin/inquiries?${q}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setUnreadCount(data.unreadCount || 0);
        setTotalCount(data.totalCount || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReview = (msg: any) => {
    setActiveMsg(msg);
    setReplyText(msg.adminReply || "");
    setAdminRemarks(msg.adminRemarks || "");
    setTargetStatus(msg.status === "UNREAD" ? "REVIEWED" : msg.status);
  };

  const handleSaveReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMsg) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/v1/admin/inquiries/${activeMsg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: replyText.trim() ? "REPLIED" : targetStatus,
          adminReply: replyText.trim() || undefined,
          adminRemarks: adminRemarks.trim() || undefined,
        }),
      });

      if (res.ok) {
        await fetchMessages();
        setActiveMsg(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this message?")) return;
    try {
      const res = await fetch(`/api/v1/admin/inquiries/${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchMessages();
        if (activeMsg?.id === id) setActiveMsg(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <MessageSquare className="w-6 h-6 text-gov-blue" />
            <span>Public Inquiries & Citizen Feedback Inbox</span>
          </h1>
          <p className="text-xs text-slate-500">
            Messages, suggestions, complaints, and application follow-ups submitted via the public landing page
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="px-3 py-1 bg-amber-50 text-amber-900 border border-amber-300 font-bold text-xs rounded-full">
            {unreadCount} Unread Messages
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="gov-card p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
            Filter Status
          </label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 font-semibold focus:outline-none focus:border-gov-blue"
          >
            <option value="ALL">All Statuses ({totalCount})</option>
            <option value="UNREAD">Unread ({unreadCount})</option>
            <option value="REVIEWED">Reviewed</option>
            <option value="REPLIED">Replied</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
            Filter Category
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 font-semibold focus:outline-none focus:border-gov-blue"
          >
            <option value="ALL">All Categories</option>
            <option value="INQUIRY">Inquiries</option>
            <option value="APPLICATION_FOLLOWUP">Application Follow-ups</option>
            <option value="SUGGESTION">Suggestions</option>
            <option value="COMMENT">Comments</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
            Search Messages
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tracking #, sender, content..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-gov-blue bg-white font-semibold"
            />
          </div>
        </div>
      </div>

      {/* Messages Table */}
      <div className="gov-card overflow-hidden">
        <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Inquiry Messages ({messages.length})
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">Loading citizen messages...</div>
        ) : messages.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No inquiry messages match criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b">
                <tr>
                  <th className="px-4 py-3">Tracking #</th>
                  <th className="px-4 py-3">Sender & Human Verifier</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Message Content</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date Submitted</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {messages.map((msg) => (
                  <tr
                    key={msg.id}
                    className={`hover:bg-slate-50 transition ${
                      msg.status === "UNREAD" ? "bg-amber-50/30 font-semibold" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-mono font-bold text-gov-blue">
                      {msg.trackingCode}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-900 block">
                        {msg.senderName}
                        {msg.isAnonymous && (
                          <span className="ml-1.5 text-[9px] font-mono text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                            Anonymous
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {msg.senderContact} • Brgy. {msg.senderBarangay || "Dingalan"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded uppercase">
                        {msg.category.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate text-slate-700">
                      {msg.subject && <strong className="block text-slate-900 truncate">{msg.subject}</strong>}
                      <span className="text-slate-500 truncate block">{msg.message}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          msg.status === "UNREAD"
                            ? "bg-amber-100 text-amber-900 border border-amber-300"
                            : msg.status === "REPLIED"
                            ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {msg.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">
                      {new Date(msg.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenReview(msg)}
                        className="px-2.5 py-1 text-[11px] font-bold text-gov-blue hover:text-white bg-blue-50 hover:bg-gov-blue border border-blue-200 rounded-lg transition"
                      >
                        View & Reply
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(msg.id)}
                          className="px-2 py-1 text-[11px] font-bold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 rounded-lg transition"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review & Reply Modal */}
      {activeMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full my-6 p-6 space-y-4 shadow-2xl border-t-4 border-t-gov-blue">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-[10px] text-slate-400 font-mono font-bold block">
                  Ticket #{activeMsg.trackingCode}
                </span>
                <h3 className="text-base font-black text-slate-900">
                  {activeMsg.subject || activeMsg.category.replace(/_/g, " ")}
                </h3>
              </div>
              <button
                onClick={() => setActiveMsg(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Sender details */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Sender:</span>
                <span className="font-bold text-slate-900">
                  {activeMsg.senderName} {activeMsg.isAnonymous ? "(Requested Anonymous Publicly)" : ""}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Contact:</span>
                <span className="font-mono font-bold text-slate-800">{activeMsg.senderContact}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Barangay:</span>
                <span className="font-semibold text-slate-800">{activeMsg.senderBarangay || "Dingalan"}</span>
              </div>
            </div>

            {/* Message text */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700 uppercase">
                Citizen's Message:
              </label>
              <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-xl text-xs text-slate-900 font-medium leading-relaxed whitespace-pre-wrap">
                {activeMsg.message}
              </div>
            </div>

            {/* Reply Form */}
            <form onSubmit={handleSaveReply} className="space-y-4 pt-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Official PESO Dingalan Reply (Visible to citizen via tracking code):
                </label>
                <textarea
                  rows={3}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Magandang araw! Nais naming ipaalam na ang inyong aplikasyon ay..."
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-gov-blue leading-relaxed"
                ></textarea>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Internal Admin Remarks / Notes:
                </label>
                <input
                  type="text"
                  value={adminRemarks}
                  onChange={(e) => setAdminRemarks(e.target.value)}
                  placeholder="Internal notes for PESO staff..."
                  className="w-full px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-xl bg-slate-50 focus:outline-none focus:border-gov-blue"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value)}
                  className="text-xs font-bold px-3 py-2 border border-slate-300 rounded-xl bg-slate-50"
                >
                  <option value="REVIEWED">Mark as Reviewed</option>
                  <option value="REPLIED">Mark as Replied</option>
                  <option value="RESOLVED">Mark as Resolved</option>
                </select>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setActiveMsg(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl border"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 bg-gov-blue hover:bg-gov-light text-white font-bold text-xs rounded-xl shadow transition flex items-center space-x-1.5 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5 text-gov-gold" />
                    <span>{isSaving ? "Saving..." : "Save & Post Reply"}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
