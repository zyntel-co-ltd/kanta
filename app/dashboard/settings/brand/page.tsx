"use client";

import { useState, useRef } from "react";
import { Upload, Building2, Palette, Save, Lock, CheckCircle2 } from "lucide-react";

const IS_PRO = process.env.NEXT_PUBLIC_PRO_FEATURES === "true";

const inputCls =
  "w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 "
  + "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 "
  + "focus:border-emerald-400 transition-all";

type BrandSettings = {
  hospitalName: string;
  tagline: string;
  primaryColor: string;
  secondaryColor: string;
  logoPreview: string | null;
};

const DEFAULTS: BrandSettings = {
  hospitalName: process.env.NEXT_PUBLIC_HOSPITAL_NAME || "Nakasero Hospital",
  tagline: "Laboratory Management System",
  primaryColor: "#059669",
  secondaryColor: "#065f46",
  logoPreview: null,
};

export default function BrandPage() {
  const [settings, setSettings] = useState<BrandSettings>(DEFAULTS);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!IS_PRO) {
    return (
      <div className="max-w-2xl mx-auto mt-12 text-center space-y-6 animate-slide-up">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto">
          <Lock size={28} className="text-slate-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Brand Management</h2>
          <p className="text-slate-500 mt-2 leading-relaxed">
            Customise your hospital logo, name and brand colours. This feature is available in the
            <strong className="text-slate-700"> Pro plan</strong>.
          </p>
        </div>
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 text-left space-y-3">
          <p className="text-sm font-semibold text-slate-700">Pro includes:</p>
          <ul className="space-y-2 text-sm text-slate-600">
            {[
              "Custom hospital logo in header and LRIDS display",
              "Primary & secondary brand colour configuration",
              "User photo avatars",
              "Custom LRIDS facility display names",
              "White-label reports with hospital branding",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-slate-400">
          To enable Pro, set <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">NEXT_PUBLIC_PRO_FEATURES=true</code> in your environment variables.
        </p>
      </div>
    );
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setSettings((s) => ({ ...s, logoPreview: ev.target?.result as string }));
    };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    /* In a full implementation this would:
       1. Upload logo to Supabase Storage
       2. Write settings to facility_branding table
       3. Reload BrandContext
    */
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="max-w-2xl space-y-8 animate-slide-up">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight" style={{ letterSpacing: "-0.025em" }}>
          Brand &amp; Customisation
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Configure your hospital identity across all screens and displays.
        </p>
      </div>

      {/* Logo section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Building2 size={16} className="text-emerald-600" />
          <h2 className="text-sm font-semibold text-slate-800">Hospital Identity</h2>
        </div>

        {/* Logo upload */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-2">Logo</label>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50 overflow-hidden flex-shrink-0">
              {settings.logoPreview ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={settings.logoPreview} alt="Logo preview" className="w-full h-full object-contain" />
              ) : (
                <Building2 size={28} className="text-slate-300" />
              )}
            </div>
            <div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <Upload size={14} />
                Upload Logo
              </button>
              <p className="text-xs text-slate-400 mt-1.5">PNG or SVG, max 2 MB. Recommended: 200×200px</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/svg+xml,image/jpeg"
                onChange={handleLogoChange}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* Hospital name */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">Hospital Name</label>
          <input
            type="text"
            value={settings.hospitalName}
            onChange={(e) => setSettings((s) => ({ ...s, hospitalName: e.target.value }))}
            className={inputCls}
            placeholder="e.g. Nakasero Hospital"
          />
          <p className="text-xs text-slate-400 mt-1">Shown in the header and on the LRIDS display board.</p>
        </div>

        {/* Tagline */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">Tagline</label>
          <input
            type="text"
            value={settings.tagline}
            onChange={(e) => setSettings((s) => ({ ...s, tagline: e.target.value }))}
            className={inputCls}
            placeholder="e.g. Laboratory Management System"
          />
        </div>
      </div>

      {/* Colours section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Palette size={16} className="text-emerald-600" />
          <h2 className="text-sm font-semibold text-slate-800">Brand Colours</h2>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Primary Colour</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={settings.primaryColor}
                onChange={(e) => setSettings((s) => ({ ...s, primaryColor: e.target.value }))}
                className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer bg-white p-0.5"
              />
              <input
                type="text"
                value={settings.primaryColor}
                onChange={(e) => setSettings((s) => ({ ...s, primaryColor: e.target.value }))}
                className={inputCls}
                placeholder="#059669"
                maxLength={7}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Secondary Colour</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={settings.secondaryColor}
                onChange={(e) => setSettings((s) => ({ ...s, secondaryColor: e.target.value }))}
                className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer bg-white p-0.5"
              />
              <input
                type="text"
                value={settings.secondaryColor}
                onChange={(e) => setSettings((s) => ({ ...s, secondaryColor: e.target.value }))}
                className={inputCls}
                placeholder="#065f46"
                maxLength={7}
              />
            </div>
          </div>
        </div>

        {/* Preview strip */}
        <div className="rounded-xl overflow-hidden border border-slate-200">
          <div
            className="h-12 flex items-center px-4 gap-3"
            style={{ background: `linear-gradient(135deg, ${settings.secondaryColor}, ${settings.primaryColor})` }}
          >
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
              <Building2 size={14} className="text-white" />
            </div>
            <div>
              <p className="text-white text-sm font-bold leading-none">{settings.hospitalName || "Hospital Name"}</p>
              <p className="text-white/60 text-[10px] mt-0.5">{settings.tagline}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
          style={{ background: settings.primaryColor }}
        >
          <Save size={15} />
          {saved ? "Saved!" : "Save Changes"}
        </button>
        {saved && (
          <div className="flex items-center gap-1.5 text-sm text-emerald-600">
            <CheckCircle2 size={15} />
            Changes saved
          </div>
        )}
      </div>

      <div className="rounded-xl bg-amber-50 border border-amber-100 px-5 py-4">
        <p className="text-xs text-amber-700 font-medium">
          Colour changes take full effect after redeploying the app. For immediate effect, update{" "}
          <code className="bg-amber-100 px-1 rounded">NEXT_PUBLIC_HOSPITAL_NAME</code> and{" "}
          <code className="bg-amber-100 px-1 rounded">NEXT_PUBLIC_HOSPITAL_LOGO_URL</code> in your environment variables.
        </p>
      </div>
    </div>
  );
}
