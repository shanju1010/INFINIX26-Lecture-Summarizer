import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Eye,
  Download,
  Trash2,
  FileText,
  Mic,
  Loader2,
} from "lucide-react";

type FilterType = "All" | "Lectures" | "Meetings" | "Recent";

type HistoryItem = {
  job_id: string;
  filename: string;
  audio_url?: string;
  status: string;
  created_at?: string;
  user_email?: string;
  duration_seconds?: number;
  topic_count?: number;
  speaker_count?: number;
  summary?: string;
};

type HistoryResponse = {
  count: number;
  history: HistoryItem[];
};

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000";

function formatDuration(seconds: number) {
  if (!seconds || seconds <= 0) {
    return "0m";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m`;
  }

  return `${remainingSeconds}s`;
}

function formatDate(value?: string) {
  if (!value) {
    return "Recently";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getCurrentUserEmail() {
  try {
    const storedAuth = localStorage.getItem("audiomind_auth");

    if (!storedAuth) {
      return "";
    }

    const auth = JSON.parse(storedAuth);

    return typeof auth.email === "string"
      ? auth.email.trim().toLowerCase()
      : "";
  } catch {
    return "";
  }
}

function getSessionTitle(session: HistoryItem) {
  return session.filename || "Untitled Lecture";
}

function getStatus(status: string) {
  const normalized = status.toLowerCase();

  if (normalized === "complete" || normalized === "completed") {
    return "Complete";
  }

  if (normalized === "processing") {
    return "Processing";
  }

  if (normalized === "failed" || normalized === "error") {
    return "Failed";
  }

  return "Uploaded";
}

export default function HistoryPage() {
  const [filter, setFilter] = useState<FilterType>("All");
  const [search, setSearch] = useState("");
  const [sessions, setSessions] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");

  const filters: FilterType[] = [
    "All",
    "Lectures",
    "Meetings",
    "Recent",
  ];

  const loadHistory = async () => {
    setLoading(true);
    setError("");

    try {
      const email = getCurrentUserEmail();

      const headers: HeadersInit = {};

      if (email) {
        headers["X-User-Email"] = email;
      }

      const response = await fetch(
        `${API_BASE}/api/history`,
        {
          method: "GET",
          headers,
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => null);

        throw new Error(
          errorData?.detail ||
            "Failed to load session history."
        );
      }

      const data: HistoryResponse =
        await response.json();

      setSessions(
        Array.isArray(data.history)
          ? data.history
          : []
      );
    } catch (err) {
      console.error("History loading failed:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load session history."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();

    const handleFocus = () => {
      loadHistory();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(
      "Delete this lecture session? The saved analysis and uploaded audio will be removed."
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(id);
    setError("");

    try {
      const email = getCurrentUserEmail();

      const headers: HeadersInit = {};

      if (email) {
        headers["X-User-Email"] = email;
      }

      const response = await fetch(
        `${API_BASE}/api/history/${id}`,
        {
          method: "DELETE",
          headers,
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => null);

        throw new Error(
          errorData?.detail ||
            "Failed to delete the session."
        );
      }

      setSessions((previous) =>
        previous.filter(
          (session) => session.job_id !== id
        )
      );

      // Keep the current browser session consistent if the
      // deleted session happens to be the currently displayed one.
      try {
        const storedJob =
          sessionStorage.getItem("audioJob");

        if (storedJob) {
          const job = JSON.parse(storedJob);

          if (job.job_id === id) {
            sessionStorage.removeItem("audioJob");
            sessionStorage.removeItem(
              "transcriptionResult"
            );
          }
        }
      } catch {
        // Backend deletion already succeeded.
      }
    } catch (err) {
      console.error("History deletion failed:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete the session."
      );
    } finally {
      setDeletingId("");
    }
  };

  const handleExport = (
    session: HistoryItem,
    format: "txt" | "pdf" | "docx"
  ) => {
    window.open(
      `${API_BASE}/api/export/${session.job_id}/${format}`,
      "_blank"
    );
  };

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();

    return sessions.filter((session) => {
      const title = getSessionTitle(session).toLowerCase();
      const summary = (session.summary || "").toLowerCase();

      const matchesSearch =
        !query ||
        title.includes(query) ||
        summary.includes(query);

      if (!matchesSearch) {
        return false;
      }

      const type =
        title.includes("meeting")
          ? "Meeting"
          : "Lecture";

      if (filter === "Lectures") {
        return type === "Lecture";
      }

      if (filter === "Meetings") {
        return type === "Meeting";
      }

      if (filter === "Recent") {
        return true;
      }

      return true;
    });
  }, [sessions, search, filter]);

  const statusBadge: Record<string, string> = {
    Complete:
      "bg-emerald-100 text-emerald-700",
    Processing:
      "bg-amber-100 text-amber-700",
    Uploaded:
      "bg-blue-100 text-blue-700",
    Failed:
      "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-5">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold text-slate-900"
            style={{
              fontFamily: "Outfit, sans-serif",
            }}
          >
            Session History
          </h1>

          <p className="text-[13px] text-slate-500 mt-0.5">
            {loading
              ? "Loading sessions..."
              : `${visible.length} ${
                  visible.length === 1
                    ? "session"
                    : "sessions"
                } found`}
          </p>
        </div>

        <Link
          to="/upload"
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#5B6EF8] to-[#7C3AED] text-white font-semibold px-4 py-2.5 rounded-xl text-[13px] hover:opacity-90 shadow-md shadow-[#5B6EF8]/20"
        >
          <FileText size={15} />
          New Analysis
        </Link>
      </div>

      {/* SEARCH + FILTERS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="text"
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search sessions..."
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 bg-white rounded-xl text-[13px] focus:outline-none focus:border-[#5B6EF8] focus:ring-2 focus:ring-[#5B6EF8]/10"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                filter === f
                  ? "bg-[#5B6EF8] text-white"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 text-[12px]">
          {error}
        </div>
      )}

      {/* LOADING */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
          <Loader2
            size={24}
            className="text-[#5B6EF8] animate-spin mx-auto mb-3"
          />

          <p className="text-[13px] font-semibold text-slate-700">
            Loading session history...
          </p>

          <p className="text-[12px] text-slate-400 mt-1">
            Fetching your saved lecture analyses.
          </p>
        </div>
      ) : visible.length === 0 ? (
        /* EMPTY STATE */
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <FileText
              size={24}
              className="text-slate-400"
            />
          </div>

          <p className="text-[15px] font-semibold text-slate-700 mb-1">
            {sessions.length === 0
              ? "No sessions found"
              : "No matching sessions"}
          </p>

          <p className="text-[13px] text-slate-400">
            {sessions.length === 0
              ? "Upload an audio file to create your first session."
              : "Try another search or filter."}
          </p>

          {sessions.length === 0 && (
            <Link
              to="/upload"
              className="inline-flex items-center gap-2 mt-4 bg-[#5B6EF8] text-white px-4 py-2 rounded-xl text-[12px] font-semibold"
            >
              <FileText size={14} />
              Upload Audio
            </Link>
          )}
        </div>
      ) : (
        /* SESSION CARDS */
        <div className="space-y-2.5">
          {visible.map((session) => {
            const status = getStatus(session.status);
            const isDeleting =
              deletingId === session.job_id;

            const isMeeting =
              getSessionTitle(session)
                .toLowerCase()
                .includes("meeting");

            return (
              <div
                key={session.job_id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4 hover:shadow-md hover:border-slate-200 transition-all group"
              >
                {/* ICON */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isMeeting
                      ? "bg-purple-50"
                      : "bg-blue-50"
                  }`}
                >
                  {isMeeting ? (
                    <Mic
                      size={17}
                      className="text-[#7C3AED]"
                    />
                  ) : (
                    <FileText
                      size={17}
                      className="text-[#5B6EF8]"
                    />
                  )}
                </div>

                {/* INFORMATION */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-semibold text-slate-800 truncate">
                    {getSessionTitle(session)}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-[11px] text-slate-400">
                      {formatDate(session.created_at)}
                    </span>

                    <span className="text-[11px] text-slate-300">
                      ·
                    </span>

                    <span className="text-[11px] text-slate-400">
                      {formatDuration(
                        session.duration_seconds || 0
                      )}
                    </span>

                    <span className="text-[11px] text-slate-300">
                      ·
                    </span>

                    <span className="text-[11px] text-slate-400">
                      {session.speaker_count || 0}{" "}
                      speakers
                    </span>

                    <span className="text-[11px] text-slate-300">
                      ·
                    </span>

                    <span className="text-[11px] text-slate-400">
                      {session.topic_count || 0} topics
                    </span>

                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        statusBadge[status] ||
                        "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {status}
                    </span>
                  </div>
                </div>

                {/* ACTIONS */}
                <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  {status === "Complete" && (
                    <>
                      <Link
                        to={`/results?jobId=${session.job_id}`}
                        className="flex items-center gap-1 text-[12px] font-medium text-[#5B6EF8] bg-[#5B6EF8]/10 px-3 py-1.5 rounded-xl hover:bg-[#5B6EF8]/15"
                      >
                        <Eye size={13} />
                        View
                      </Link>

                      <button
                        type="button"
                        onClick={() =>
                          handleExport(
                            session,
                            "pdf"
                          )
                        }
                        className="flex items-center gap-1 text-[12px] font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl hover:bg-slate-200"
                      >
                        <Download size={13} />
                        PDF
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() =>
                      handleDelete(session.job_id)
                    }
                    className="p-1.5 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-50"
                    title="Delete session"
                  >
                    {isDeleting ? (
                      <Loader2
                        size={15}
                        className="animate-spin"
                      />
                    ) : (
                      <Trash2 size={15} />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
