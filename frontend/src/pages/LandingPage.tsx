import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import {
  Headphones,
  Upload,
  Mic,
  FileText,
  Users,
  Zap,
  GraduationCap,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  Menu,
  X,
  Brain,
  Database,
  FileDown,
} from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Speech-to-Text",
    desc: "Convert lecture recordings into timestamped transcripts using Whisper, while preserving technical terminology and mixed-language speech.",
    color: "from-[#5B6EF8] to-[#7C3AED]",
    bg: "bg-blue-50",
  },
  {
    icon: Users,
    title: "Speaker Diarization",
    desc: "Identify different speakers and associate transcript segments with the correct speaker throughout the lecture.",
    color: "from-[#7C3AED] to-[#EC4899]",
    bg: "bg-purple-50",
  },
  {
    icon: Brain,
    title: "Structured Lecture Notes",
    desc: "Transform the transcript into topic-wise notes, explanations, key takeaways, and concise learning points.",
    color: "from-[#06B6D4] to-[#5B6EF8]",
    bg: "bg-cyan-50",
  },
  {
    icon: GraduationCap,
    title: "Exam-Focused Insights",
    desc: "Extract important concepts and generate revision-friendly exam points and questions from the lecture.",
    color: "from-[#F59E0B] to-[#EF4444]",
    bg: "bg-amber-50",
  },
];

const steps = [
  {
    n: "01",
    label: "Upload Lecture",
    desc: "MP3, WAV, M4A or record live",
    icon: Upload,
  },
  {
    n: "02",
    label: "Transcription",
    desc: "Whisper speech-to-text",
    icon: FileText,
  },
  {
    n: "03",
    label: "Speaker Diarization",
    desc: "Identify who said what",
    icon: Users,
  },
  {
    n: "04",
    label: "Speaker Alignment",
    desc: "Connect speech with speakers",
    icon: CheckCircle2,
  },
  {
    n: "05",
    label: "AI Lecture Intelligence",
    desc: "Notes, takeaways and exam points",
    icon: Brain,
  },
];

const capabilities = [
  { value: "Whisper", label: "Speech Recognition" },
  { value: "Pyannote", label: "Speaker Diarization" },
  { value: "Gemini", label: "AI Lecture Analysis" },
  { value: "PDF / DOCX", label: "Report Export" },
];

const demoTranscript = [
  {
    speaker: "Lecturer",
    time: "00:00:09",
    text: "Database normalization reduces repeated data and improves database organization.",
    dot: "bg-[#5B6EF8]",
  },
  {
    speaker: "Student",
    time: "00:00:18",
    text: "Sir, what is the condition for First Normal Form?",
    dot: "bg-[#7C3AED]",
  },
  {
    speaker: "Lecturer",
    time: "00:00:39",
    text: "Each cell should contain a single atomic value. Multiple values should not be stored in one cell.",
    dot: "bg-[#5B6EF8]",
  },
  {
    speaker: "Lecturer",
    time: "00:01:01",
    text: "Third Normal Form removes transitive dependency.",
    dot: "bg-[#5B6EF8]",
  },
];

export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const closeMobile = () => setMobileOpen(false);

  // Uploading/recording lecture content requires authentication.
  // Send unauthenticated users to Login first.
  const handleProtectedNavigation = (path: string) => {
    const auth = localStorage.getItem("audiomind_auth");

    if (auth) {
      try {
        const parsed = JSON.parse(auth);
        if (parsed?.isLoggedIn) {
          navigate(path);
          return;
        }
      } catch {
        // Invalid auth data: treat the user as logged out.
      }
    }

    navigate("/login");
  };

  return (
    <div className="min-h-full bg-white text-slate-900 overflow-x-hidden">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center h-16 gap-8">
          <Link
            to="/"
            className="flex items-center gap-2.5 flex-shrink-0"
            onClick={closeMobile}
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#5B6EF8] to-[#7C3AED] flex items-center justify-center">
              <Headphones size={16} className="text-white" />
            </div>
            <span
              className="text-[15px] font-semibold"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              AudioMind <span className="text-[#5B6EF8]">AI</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6 ml-4">
            {[
              ["Features", "#features"],
              ["How It Works", "#how-it-works"],
              ["Technology", "#technology"],
              ["Demo", "#demo"],
            ].map(([label, href]) => (
              <a
                key={label}
                href={href}
                className="text-[13.5px] text-slate-600 hover:text-slate-900 font-medium transition-colors"
              >
                {label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3 ml-auto">
            <Link
              to="/login"
              className="text-[13.5px] font-medium text-slate-700 hover:text-slate-900 px-4 py-2"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="text-[13.5px] font-semibold bg-gradient-to-r from-[#5B6EF8] to-[#7C3AED] text-white px-5 py-2 rounded-xl hover:opacity-90 transition-opacity"
            >
              Get Started
            </Link>
          </div>

          <button
            className="md:hidden ml-auto p-2 rounded-xl text-slate-500 hover:bg-slate-100"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white px-4 py-4 space-y-2">
            {[
              ["Features", "#features"],
              ["How It Works", "#how-it-works"],
              ["Technology", "#technology"],
              ["Demo", "#demo"],
            ].map(([label, href]) => (
              <a
                key={label}
                href={href}
                className="block text-[14px] font-medium text-slate-700 py-2"
                onClick={closeMobile}
              >
                {label}
              </a>
            ))}
            <hr className="border-slate-100" />
            <Link
              to="/login"
              className="block text-[14px] font-medium text-slate-700 py-2"
              onClick={closeMobile}
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="block text-center text-[14px] font-semibold bg-[#5B6EF8] text-white py-2.5 rounded-xl"
              onClick={closeMobile}
            >
              Get Started
            </Link>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative pt-20 pb-24 px-4 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-br from-[#5B6EF8]/8 via-[#7C3AED]/6 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 bg-[#5B6EF8]/10 text-[#5B6EF8] text-[12px] font-semibold px-4 py-2 rounded-full mb-6">
              <Zap size={12} /> AI-Powered Lecture Intelligence
            </div>

            <h1
              className="text-5xl sm:text-6xl font-bold tracking-tight mb-6 leading-tight"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Turn Every Lecture Into{" "}
              <span className="gradient-text">Organized Knowledge</span>
            </h1>

            <p className="text-lg text-slate-500 leading-relaxed max-w-2xl mx-auto">
              AudioMind AI converts lecture recordings into timestamped
              transcripts, identifies speakers, and generates structured
              notes, key takeaways, and exam-focused insights.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-10">
              <button
                type="button"
                onClick={() => handleProtectedNavigation("/upload")}
                className="flex items-center gap-2.5 bg-gradient-to-r from-[#5B6EF8] to-[#7C3AED] text-white font-semibold px-7 py-3.5 rounded-2xl hover:opacity-90 shadow-lg shadow-[#5B6EF8]/25 text-[15px]"
              >
                <Upload size={18} /> Upload Lecture
              </button>

              <button
                type="button"
                onClick={() => handleProtectedNavigation("/record")}
                className="flex items-center gap-2.5 bg-white border border-slate-200 text-slate-700 font-semibold px-7 py-3.5 rounded-2xl hover:bg-slate-50 text-[15px]"
              >
                <Mic size={18} className="text-[#5B6EF8]" /> Record Lecture
              </button>
            </div>

            <p className="text-[12px] text-slate-400 mt-4">
              Upload a recording or capture a lecture directly from your
              microphone.
            </p>
          </div>

          {/* Realistic product preview */}
          <div id="demo" className="max-w-5xl mx-auto relative scroll-mt-24">
            <div className="bg-white rounded-3xl shadow-2xl shadow-slate-200/80 border border-slate-100 overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
                <span className="w-3 h-3 rounded-full bg-red-400" />
                <span className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="ml-4 text-[12px] text-slate-400 font-mono">
                  AudioMind AI — Lecture Analysis
                </span>
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-[11px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">
                    Analysis Complete
                  </span>
                </div>
              </div>

              <div className="p-5 md:p-6 grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-4">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Speaker-Aware Transcript
                  </p>

                  {demoTranscript.map((seg, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${seg.dot} mt-2 flex-shrink-0`}
                      />
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[11px] font-semibold text-slate-700">
                            {seg.speaker}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {seg.time}
                          </span>
                        </div>
                        <p className="text-[12px] text-slate-600 leading-relaxed">
                          {seg.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    AI Lecture Notes
                  </p>

                  <div className="bg-gradient-to-br from-[#5B6EF8]/8 to-[#7C3AED]/8 rounded-xl p-3.5 space-y-2.5">
                    {[
                      "Database Normalization",
                      "Purpose: reduce data duplication",
                      "1NF: atomic values",
                      "3NF: remove transitive dependency",
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#5B6EF8] mt-1.5 flex-shrink-0" />
                        <span className="text-[11px] text-slate-700">
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="bg-amber-50 rounded-xl p-3.5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <GraduationCap
                        size={14}
                        className="text-amber-600"
                      />
                      <span className="text-[11px] font-semibold text-amber-800">
                        Exam Insight
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-700 leading-relaxed">
                      1NF requires each cell to contain a single atomic value.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -left-6 top-1/3 bg-white rounded-2xl shadow-lg border border-slate-100 px-4 py-3 hidden lg:flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#5B6EF8]/10 flex items-center justify-center">
                <Users size={15} className="text-[#5B6EF8]" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-900">
                  Speaker Aware
                </p>
                <p className="text-[10px] text-slate-400">
                  Who said what
                </p>
              </div>
            </div>

            <div className="absolute -right-6 top-1/4 bg-white rounded-2xl shadow-lg border border-slate-100 px-4 py-3 hidden lg:flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Zap size={15} className="text-emerald-500" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-900">
                  Timestamped
                </p>
                <p className="text-[10px] text-slate-400">
                  Lecture intelligence
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="py-12 border-y border-slate-100 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6">
          {capabilities.map((item) => (
            <div key={item.label} className="text-center">
              <p
                className="text-xl sm:text-2xl font-bold gradient-text"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {item.value}
              </p>
              <p className="text-[13px] text-slate-500 mt-1">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-4 scroll-mt-16">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[12px] font-semibold text-[#5B6EF8] uppercase tracking-wider mb-3">
              Features
            </p>
            <h2
              className="text-4xl font-bold text-slate-900"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Everything you need to learn from lectures
            </h2>
            <p className="text-[15px] text-slate-500 max-w-2xl mx-auto mt-4">
              One pipeline turns long lecture recordings into structured,
              speaker-aware learning material.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f) => {
              const Icon = f.icon;

              return (
                <div
                  key={f.title}
                  className="bg-white rounded-2xl border border-slate-100 p-6 hover:shadow-lg hover:shadow-slate-100 hover:-translate-y-0.5 transition-all"
                >
                  <div
                    className={`w-11 h-11 rounded-xl ${f.bg} flex items-center justify-center mb-5`}
                  >
                    <div
                      className={`w-6 h-6 rounded-lg bg-gradient-to-br ${f.color} flex items-center justify-center`}
                    >
                      <Icon size={13} className="text-white" />
                    </div>
                  </div>

                  <h3
                    className="text-[15px] font-semibold text-slate-900 mb-2"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    {f.title}
                  </h3>

                  <p className="text-[13px] text-slate-500 leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why AudioMind */}
      <section className="py-24 px-4 bg-slate-50/60">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[12px] font-semibold text-[#5B6EF8] uppercase tracking-wider mb-3">
              Why AudioMind AI
            </p>
            <h2
              className="text-4xl font-bold text-slate-900"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              From long recordings to useful study material
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-100 p-7">
              <p className="text-[15px] font-semibold text-slate-900 mb-5">
                Traditional lecture recording
              </p>
              <div className="space-y-4">
                {[
                  "Long audio is difficult to revise",
                  "Manual note-taking during class",
                  "Important explanations are hard to find",
                  "Speaker changes are not clearly marked",
                  "Revision requires replaying the recording",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <span className="mt-1 w-5 h-5 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[11px]">
                      ×
                    </span>
                    <span className="text-[13px] text-slate-500">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#5B6EF8]/15 p-7 shadow-sm">
              <p className="text-[15px] font-semibold text-slate-900 mb-5">
                With AudioMind AI
              </p>
              <div className="space-y-4">
                {[
                  "Timestamped transcript",
                  "Speaker-aware lecture content",
                  "Topic-wise structured notes",
                  "Key takeaways and important points",
                  "Exam-focused questions and flashcards",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2
                      size={20}
                      className="text-emerald-500 flex-shrink-0"
                    />
                    <span className="text-[13px] text-slate-600">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section
        id="how-it-works"
        className="py-24 px-4 bg-gradient-to-br from-slate-50 to-white scroll-mt-16"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[12px] font-semibold text-[#5B6EF8] uppercase tracking-wider mb-3">
              Process
            </p>
            <h2
              className="text-4xl font-bold text-slate-900"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              From lecture audio to learning intelligence
            </h2>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-0">
            {steps.map((step, i) => {
              const Icon = step.icon;

              return (
                <div
                  key={step.n}
                  className="flex md:flex-col items-center md:items-center gap-4 md:gap-0 flex-1"
                >
                  <div className="flex-shrink-0 md:mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#5B6EF8] to-[#7C3AED] flex items-center justify-center shadow-lg shadow-[#5B6EF8]/20">
                      <Icon size={22} className="text-white" />
                    </div>
                  </div>

                  <div className="md:text-center">
                    <p className="text-[10px] font-bold text-[#5B6EF8] tracking-widest mb-0.5">
                      {step.n}
                    </p>
                    <p
                      className="text-[14px] font-semibold text-slate-900"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      {step.label}
                    </p>
                    <p className="text-[12px] text-slate-400">
                      {step.desc}
                    </p>
                  </div>

                  {i < steps.length - 1 && (
                    <div className="hidden md:flex flex-1 items-center justify-center">
                      <ArrowRight
                        size={18}
                        className="text-slate-300 mx-2"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Technology */}
      <section id="technology" className="py-24 px-4 scroll-mt-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[12px] font-semibold text-[#5B6EF8] uppercase tracking-wider mb-3">
              Technology
            </p>
            <h2
              className="text-4xl font-bold text-slate-900"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Built as an end-to-end AI pipeline
            </h2>
            <p className="text-[15px] text-slate-500 max-w-2xl mx-auto mt-4">
              Each stage solves a specific part of the lecture intelligence
              problem, from speech recognition to structured learning output.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: FileText,
                title: "Whisper",
                desc: "Timestamped speech transcription.",
              },
              {
                icon: Users,
                title: "Pyannote",
                desc: "Speaker diarization and voice segmentation.",
              },
              {
                icon: Brain,
                title: "Gemini",
                desc: "Lecture structure, takeaways and exam insights.",
              },
              {
                icon: Database,
                title: "FastAPI",
                desc: "Backend pipeline and analysis APIs.",
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-slate-100 bg-white p-6 text-center"
                >
                  <div className="w-11 h-11 rounded-xl bg-[#5B6EF8]/10 flex items-center justify-center mx-auto mb-4">
                    <Icon size={19} className="text-[#5B6EF8]" />
                  </div>
                  <h3
                    className="text-[15px] font-semibold text-slate-900"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    {item.title}
                  </h3>
                  <p className="text-[12px] text-slate-500 mt-2 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-6 rounded-2xl bg-slate-50 border border-slate-100 p-5 text-center">
            <p className="text-[12px] text-slate-500">
              Audio → Whisper Transcript → Speaker Diarization → Timestamp
              Alignment → AI Lecture Analysis → PDF / DOCX / Flashcards
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-gradient-to-br from-[#5B6EF8] to-[#7C3AED] rounded-3xl p-12 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.16),transparent_28%),radial-gradient(circle_at_80%_70%,rgba(255,255,255,0.12),transparent_30%)]" />

            <div className="relative">
              <h2
                className="text-4xl font-bold mb-4"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Turn your next lecture into organized knowledge
              </h2>

              <p className="text-blue-100 mb-8">
                Upload a lecture, let AudioMind AI process it, and get
                structured learning material in one place.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  to="/signup"
                  className="flex items-center gap-2 bg-white text-[#5B6EF8] font-semibold px-7 py-3.5 rounded-2xl hover:bg-blue-50 text-[15px]"
                >
                  Get Started <ChevronRight size={18} />
                </Link>

                <a
                  href="#demo"
                  className="flex items-center gap-2 border border-white/30 text-white font-semibold px-7 py-3.5 rounded-2xl hover:bg-white/10 text-[15px]"
                >
                  View Demo <ArrowRight size={16} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#5B6EF8] to-[#7C3AED] flex items-center justify-center">
                <Headphones size={13} className="text-white" />
              </div>
              <span
                className="text-[14px] font-semibold text-slate-700"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                AudioMind AI
              </span>
            </Link>

            <div className="flex items-center gap-6">
              <a
                href="#features"
                className="text-[13px] text-slate-400 hover:text-slate-600"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                className="text-[13px] text-slate-400 hover:text-slate-600"
              >
                How It Works
              </a>
              <a
                href="#technology"
                className="text-[13px] text-slate-400 hover:text-slate-600"
              >
                Technology
              </a>
              <a
                href="#demo"
                className="text-[13px] text-slate-400 hover:text-slate-600"
              >
                Demo
              </a>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleProtectedNavigation("/upload")}
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#5B6EF8] hover:text-[#7C3AED]"
              >
                <FileDown size={14} />
                Start Analysis
              </button>
            </div>
          </div>

          <p className="text-center text-[12px] text-slate-400 mt-8">
            © 2026 AudioMind AI. Built for intelligent lecture understanding.
          </p>
        </div>
      </footer>
    </div>
  );
}
