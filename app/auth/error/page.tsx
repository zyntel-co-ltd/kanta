"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertCircle size={28} className="text-red-400" />
          </div>
        </div>
        <h1 className="text-xl font-semibold text-white mb-2">
          Invalid or expired link
        </h1>
        <p className="text-slate-400 mb-6">
          This password reset link is invalid or has expired. Please request a
          new one.
        </p>
        <Link
          href="/forgot-password"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-500 transition-colors"
        >
          Request new reset link
        </Link>
        <Link
          href="/login"
          className="block mt-4 text-sm text-slate-400 hover:text-slate-300"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
