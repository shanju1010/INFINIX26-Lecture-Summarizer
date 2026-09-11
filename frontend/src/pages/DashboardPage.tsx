import { Link } from "react-router-dom";
import {
  Upload,
  Mic,
  Clock,
  FileText,
  Users,
  CheckSquare,
  TrendingUp,
  Eye,
} from "lucide-react";
import { useEffect, useState } from "react";

type AudioJob = {
  job_id: string;
  filename: string;
  status: string;
  title?: string;
  description?: string;
};

type TranscriptSegment = {
  start: number;
  end: number;
  text: string;
  speaker?: string;
};

type Transcription = {
  job_id?: string;
  filename?: string;
  status?: string;
  text?: string;
  segments?: TranscriptSegment[];
};

type SpeakerInsight = {
  speaker?: string;
  name?: string;
  summary?: string;
  points?: string[];
  action_items?: string[];
  tasks?: string[];
};

type AnalysisResult = {
  job_id?: string;
  filename?: string;
  status?: string;
  transcription?: Transcription;
  analysis?: {
    summary?: string;
    topics?: unknown[];
    key_takeaways?: unknown[];
    exam_points?: unknown[];
    action_items?: unknown[];
    actions?: unknown[];
    tasks?: unknown[];
    speaker_insights?: SpeakerInsight[];
    speakers?: unknown[];
  };
};

function formatDuration(seconds: number) {
  if (!seconds || seconds <= 0) return "0m";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;

  return `${remainingSeconds}s`;
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getLastTranscriptEnd(result: AnalysisResult | null) {
  const segments = result?.transcription?.segments ?? [];

  if (segments.length === 0) return 0;

  return Math.max(
    ...segments.map((segment) => Number(segment.end) || 0)
  );
}

function getSpeakerCount(result: AnalysisResult | null) {
  const segments = result?.transcription?.segments ?? [];

  // If aligned speaker labels are included in the saved result,
  // count them directly from the transcript.
  const transcriptSpeakers = new Set(
    segments
      .map((segment) => segment.speaker)
      .filter(
        (speaker): speaker is string =>
          Boolean(speaker && speaker.trim())
      )
  );

  if (transcriptSpeakers.size > 0) {
    return transcriptSpeakers.size;
  }

  // Fallback to speaker insights returned by the AI analysis.
  const speakerInsights =
    result?.analysis?.speaker_insights ?? [];

  const insightSpeakers = new Set(
    speakerInsights
      .map(
        (item) =>
          item.speaker?.trim() ||
          item.name?.trim()
      )
      .filter(
        (speaker): speaker is string =>
          Boolean(speaker)
      )
  );

  if (insightSpeakers.size > 0) {
    return insightSpeakers.size;
  }

  // Final fallback if the backend returns a speakers array.
  const speakers = result?.analysis?.speakers ?? [];

  return Array.isArray(speakers) ? speakers.length : 0;
}

function getActionItemCount(result: AnalysisResult | null) {
  const analysis = result?.analysis;

  if (!analysis) return 0;

  const directActionItems = Array.isArray(analysis.action_items)
    ? analysis.action_items
    : [];

  if (directActionItems.length > 0) {
    return directActionItems.length;
  }

  const directActions = Array.isArray(analysis.actions)
    ? analysis.actions
    : [];

  if (directActions.length > 0) {
    return directActions.length;
  }

  const directTasks = Array.isArray(analysis.tasks)
    ? analysis.tasks
    : [];

  if (directTasks.length > 0) {
    return directTasks.length;
  }

  // Some analysis versions store tasks under each speaker.
  const speakerInsights =
    analysis.speaker_insights ?? [];

  return speakerInsights.reduce((total, speaker) => {
    const actionItems = Array.isArray(speaker.action_items)
      ? speaker.action_items.length
      : 0;

    const tasks = Array.isArray(speaker.tasks)
      ? speaker.tasks.length
      : 0;

    return total + actionItems + tasks;
  }, 0);
}

export default function DashboardPage() {
  const [audioJob, setAudioJob] = useState<AudioJob | null>(null);
  const [analysisResult, setAnalysisResult] =
    useState<AnalysisResult | null>(null);

  useEffect(() => {
    const loadDashboardData = () => {
      try {
        const storedJob = sessionStorage.getItem("audioJob");
        const storedResult =
          sessionStorage.getItem("transcriptionResult");

        if (storedJob) {
          setAudioJob(JSON.parse(storedJob));
        } else {
          setAudioJob(null);
        }

        if (storedResult) {
          const parsedResult: AnalysisResult =
            JSON.parse(storedResult);

          setAnalysisResult(parsedResult);
        } else {
          setAnalysisResult(null);
        }
      } catch (error) {
        console.error(
          "Failed to load dashboard data:",
          error
        );

        setAudioJob(null);
        setAnalysisResult(null);
      }
    };

    loadDashboardData();

    // Refresh when the user returns to the dashboard after
    // completing an analysis in another route.
    const handleFocus = () => loadDashboardData();
    window.addEventListener("focus", handleFocus);

    return () =>
      window.removeEventListener("focus", handleFocus);
  }, []);

  const duration = getLastTranscriptEnd(analysisResult);
  const speakerCount = getSpeakerCount(analysisResult);
  const actionItemCount =
    getActionItemCount(analysisResult);

  const hasCompletedAnalysis =
    Boolean(
      analysisResult?.transcription ||
      analysisResult?.analysis
    );

  const stats = [
    {
      label: "Total Sessions",
      value: audioJob ? "1" : "0",
      change: audioJob ? "Current" : "No sessions",
      icon: FileText,
      bg: "bg-blue-50",
      text: "text-[#5B6EF8]",
    },
    {
      label: "Audio Processed",
      value: hasCompletedAnalysis
        ? formatDuration(duration)
        : "0m",
      change: hasCompletedAnalysis
        ? "Processed"
        : "Waiting",
      icon: TrendingUp,
      bg: "bg-purple-50",
      text: "text-purple-600",
    },
    {
      label: "Speakers Identified",
      value: String(speakerCount),
      change:
        speakerCount > 0
          ? "Detected"
          : "Pending",
      icon: Users,
      bg: "bg-emerald-50",
      text: "text-emerald-600",
    },
    {
      label: "Action Items",
      value: String(actionItemCount),
      change:
        actionItemCount > 0
          ? "AI analysis"
          : hasCompletedAnalysis
          ? "None detected"
          : "Waiting",
      icon: CheckSquare,
      bg: "bg-amber-50",
      text: "text-amber-600",
    },
  ];

  const sessionStatus = hasCompletedAnalysis
    ? "Complete"
    : audioJob
    ? "Uploaded"
    : "No Session";

  const statusColor: Record<string, string> = {
    Complete: "bg-emerald-100 text-emerald-700",
    Uploaded: "bg-blue-100 text-blue-700",
    Processing: "bg-amber-100 text-amber-700",
    Failed: "bg-red-100 text-red-700",
    "No Session": "bg-slate-100 text-slate-500",
  };

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold text-slate-900"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Lecture Intelligence Dashboard 👋
          </h1>

          <p className="text-[13px] text-slate-500 mt-1">
            Analyze lectures, meetings and conversations with AI.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/upload"
            className="flex items-center gap-2 bg-gradient-to-r from-[#5B6EF8] to-[#7C3AED] text-white font-semibold px-4 py-2.5 rounded-xl text-[13px] shadow-md"
          >
            <Upload size={15} />
            Upload Audio
          </Link>

          <Link
            to="/record"
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 font-semibold px-4 py-2.5 rounded-xl text-[13px]"
          >
            <Mic size={15} className="text-[#5B6EF8]" />
            Record
          </Link>
        </div>
      </div>

      {/* STATISTICS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}
                >
                  <Icon size={18} className={stat.text} />
                </div>

                <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded-full">
                  {stat.change}
                </span>
              </div>

              <p className="text-2xl font-bold text-slate-900">
                {stat.value}
              </p>

              <p className="text-[12px] text-slate-500 mt-1">
                {stat.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* MAIN GRID */}
      <div className="grid lg:grid-cols-3 gap-5">

        {/* RECENT SESSION */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm">

          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="text-[15px] font-semibold text-slate-900">
              Recent Session
            </h2>

            <Link
              to="/history"
              className="text-[12px] font-semibold text-[#5B6EF8]"
            >
              View all
            </Link>
          </div>

          {!audioJob ? (
            <div className="px-5 py-12 text-center">

              <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                <FileText
                  size={20}
                  className="text-slate-400"
                />
              </div>

              <p className="text-[13px] font-semibold text-slate-700">
                No audio sessions yet
              </p>

              <p className="text-[12px] text-slate-400 mt-1">
                Upload a lecture or meeting to start your first analysis.
              </p>

              <Link
                to="/upload"
                className="inline-flex items-center gap-2 mt-4 bg-[#5B6EF8] text-white px-4 py-2 rounded-xl text-[12px] font-semibold"
              >
                <Upload size={14} />
                Upload Audio
              </Link>

            </div>
          ) : (
            <div className="px-5 py-4">

              <div className="flex items-center gap-4">

                <div className="w-10 h-10 rounded-xl bg-[#5B6EF8]/10 flex items-center justify-center">
                  <FileText
                    size={16}
                    className="text-[#5B6EF8]"
                  />
                </div>

                <div className="flex-1 min-w-0">

                  <p className="text-[13px] font-semibold text-slate-800 truncate">
                    {audioJob.title || audioJob.filename}
                  </p>

                  <p className="text-[11px] text-slate-400 mt-1">
                    {formatDate(new Date())}
                    {" · "}
                    {hasCompletedAnalysis
                      ? formatDuration(duration)
                      : "Not processed"}
                  </p>

                </div>

                <span
                  className={`text-[11px] font-semibold px-2 py-1 rounded-full ${
                    statusColor[sessionStatus]
                  }`}
                >
                  {sessionStatus}
                </span>

                {hasCompletedAnalysis && (
                  <Link
                    to="/results"
                    className="flex items-center gap-1 text-[12px] font-semibold text-[#5B6EF8]"
                  >
                    <Eye size={13} />
                    View
                  </Link>
                )}

              </div>

            </div>
          )}

        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-4">

          {/* QUICK ACTIONS */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">

            <h2 className="text-[14px] font-semibold text-slate-900 mb-4">
              Quick Actions
            </h2>

            <div className="space-y-2.5">

              <Link
                to="/upload"
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#5B6EF8] to-[#7C3AED] flex items-center justify-center">
                  <Upload size={14} className="text-white" />
                </div>

                <div>
                  <p className="text-[12.5px] font-semibold text-slate-800">
                    Upload Audio
                  </p>

                  <p className="text-[11px] text-slate-400">
                    MP3, WAV, M4A, WEBM
                  </p>
                </div>
              </Link>

              <Link
                to="/record"
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50"
              >
                <div className="w-8 h-8 rounded-lg bg-rose-500 flex items-center justify-center">
                  <Mic size={14} className="text-white" />
                </div>

                <div>
                  <p className="text-[12.5px] font-semibold text-slate-800">
                    Record Audio
                  </p>

                  <p className="text-[11px] text-slate-400">
                    Use your microphone
                  </p>
                </div>
              </Link>

              <Link
                to="/history"
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center">
                  <Clock size={14} className="text-white" />
                </div>

                <div>
                  <p className="text-[12.5px] font-semibold text-slate-800">
                    View History
                  </p>

                  <p className="text-[11px] text-slate-400">
                    Previous analyses
                  </p>
                </div>
              </Link>

            </div>
          </div>

          {/* ANALYSIS PIPELINE */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">

            <h2 className="text-[14px] font-semibold text-slate-900 mb-4">
              Analysis Pipeline
            </h2>

            <div className="space-y-3">

              {[
                ["Audio Upload", "Ready", "bg-emerald-500", "text-emerald-600"],
                ["Whisper Transcription", "Ready", "bg-emerald-500", "text-emerald-600"],
                ["Speaker Diarization", "Ready", "bg-emerald-500", "text-emerald-600"],
                ["AI Summary", "Ready", "bg-emerald-500", "text-emerald-600"],
                ["Action Items", "Ready", "bg-emerald-500", "text-emerald-600"],
              ].map(([name, status, dot, statusText]) => (
                <div
                  key={name}
                  className="flex items-center gap-3"
                >
                  <div className={`w-2 h-2 rounded-full ${dot}`} />

                  <span className="text-[12px] text-slate-600">
                    {name}
                  </span>

                  <span
                    className={`ml-auto text-[10px] font-semibold ${statusText}`}
                  >
                    {status}
                  </span>
                </div>
              ))}

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
