"use client";

import { ShieldAlert } from "lucide-react";
import { ApplicationForm } from "@/components/applications/ApplicationForm";
import { useAuth } from "@/context/AuthContext";
import { canEncodeWalkIn } from "@/lib/application-workflow";

export default function WalkInEncodingPage() {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-sm text-slate-500">Checking walk-in encoding access...</div>;
  if (!canEncodeWalkIn(user)) return <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800"><ShieldAlert className="mb-3 h-8 w-8" /><h1 className="font-black">Walk-in Encoding access required</h1><p className="text-sm">Sign in using an authorized encoder account.</p></div>;
  return <div className="space-y-4"><p className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">Walk-in applications go to the admin Walk-in Submissions inbox for review. Encoding does not approve or enroll an applicant.</p><ApplicationForm mode="WALK_IN" encoderName={user!.fullName} /></div>;
}
