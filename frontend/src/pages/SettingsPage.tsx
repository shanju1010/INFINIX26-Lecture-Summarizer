import { useState } from "react";
import { Link } from "react-router-dom";
import { Globe, FileText, LogOut, Check } from "lucide-react";

function Select({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-[12.5px] font-medium rounded-xl px-3 py-1.5 bg-slate-50 text-slate-700 border border-slate-200 focus:outline-none focus:border-[#5B6EF8]"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

export default function SettingsPage() {
  const [lang, setLang] = useState("English (US)");
  const [summaryLen, setSummaryLen] = useState("Standard");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // Keep LectureIQ permanently in light mode.
    document.documentElement.classList.remove("dark", "LectureIQ-dark");
    document.documentElement.style.colorScheme = "light";
    document.body.style.colorScheme = "light";

    localStorage.removeItem("LectureIQ_theme");
    localStorage.setItem(
      "LectureIQ_preferences",
      JSON.stringify({
        language: lang,
        summaryLength: summaryLen,
        appearance: "light",
      })
    );

    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 text-slate-800">
      {/* PAGE HEADER */}
      <div>
        <h1
          className="text-2xl font-bold text-slate-900"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          Settings
        </h1>
        <p className="text-[12px] text-slate-400 mt-1">
          Customize your lecture analysis preferences.
        </p>
      </div>

      <div className="grid lg:grid-cols-4 gap-5">
        {/* SETTINGS SIDEBAR */}
        <div className="lg:col-span-1">
          <nav className="rounded-2xl border border-slate-100 bg-white shadow-sm p-2">
            <div className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium bg-[#5B6EF8]/10 text-[#5B6EF8]">
              <Globe size={15} className="text-[#5B6EF8]" />
              Preferences
            </div>

            <hr className="my-2 border-slate-100" />

            <Link
              to="/"
              onClick={() => {
                document.documentElement.classList.remove("dark", "LectureIQ-dark");
                localStorage.removeItem("LectureIQ_theme");
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-red-500 hover:bg-red-50 transition-all"
            >
              <LogOut size={15} />
              Sign Out
            </Link>
          </nav>
        </div>

        {/* SETTINGS CONTENT */}
        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5">
            <div className="mb-4">
              <h2
                className="text-[15px] font-bold text-slate-900"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Preferences
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Configure how LectureIQ processes and presents your lectures.
              </p>
            </div>

            {/* LANGUAGE */}
            <div className="flex items-center justify-between gap-4 py-4 border-b border-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-50">
                  <Globe size={15} className="text-slate-500" />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-slate-800">Language</p>
                  <p className="text-[11px] text-slate-400">
                    Transcription and interface language
                  </p>
                </div>
              </div>

              <Select
                value={lang}
                options={[
                  "English (US)",
                  "English (UK)",
                  "Tamil",
                  "Tanglish (Tamil + English)",
                ]}
                onChange={setLang}
              />
            </div>

            {/* SUMMARY LENGTH */}
            <div className="flex items-center justify-between gap-4 py-4 border-b border-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-50">
                  <FileText size={15} className="text-slate-500" />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-slate-800">
                    Summary Length
                  </p>
                  <p className="text-[11px] text-slate-400">
                    How detailed AI lecture summaries are generated
                  </p>
                </div>
              </div>

              <Select
                value={summaryLen}
                options={["Brief", "Standard", "Detailed"]}
                onChange={setSummaryLen}
              />
            </div>

            {/* LIGHT MODE ONLY */}
            <div className="flex items-center justify-between gap-4 py-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-50">
                  <span className="text-base" aria-hidden="true">☀️</span>
                </div>
                <div>
                  <p className="text-[13px] font-medium text-slate-800">Appearance</p>
                  <p className="text-[11px] text-slate-400">
                    Light mode is always enabled
                  </p>
                </div>
              </div>

              <span className="text-[12px] font-semibold text-[#5B6EF8] bg-[#5B6EF8]/10 px-3 py-1.5 rounded-xl">
                Light
              </span>
            </div>

            {/* SAVE */}
            <div className="pt-3 border-t border-slate-50">
              <button
                type="button"
                onClick={handleSave}
                className={`flex items-center gap-2 text-[13px] font-semibold px-5 py-2.5 rounded-xl transition-all ${
                  saved
                    ? "bg-emerald-500 text-white"
                    : "bg-gradient-to-r from-[#5B6EF8] to-[#7C3AED] text-white hover:opacity-90"
                }`}
              >
                {saved ? (
                  <>
                    <Check size={14} />
                    Saved!
                  </>
                ) : (
                  "Save Preferences"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
