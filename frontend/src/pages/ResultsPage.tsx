import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  FileText,
  Users,
  Zap,
  Play,
  Pause,
  Download,
  ChevronDown,
  Copy,
  Search,
  Clock,
  Music,
  Star,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Brain,
} from "lucide-react";

type Tab = "transcript" | "summary" | "speakers";

type TranscriptSegment = {
  start: number;
  end: number;
  text: string;
  speaker?: string;
};

type Topic = {
  title: string;
  points: string[];
  important: boolean;
  important_note?: string | null;
  start_time?: number | null;
  end_time?: number | null;
};

type SpeakerInsight = {
  speaker: string;
  role: string;
  contributions: string[];
  action_items: string[];
};

type Analysis = {
  summary: string;
  topics: Topic[];
  key_takeaways: string[];
  exam_points: string[];
  speaker_insights?: SpeakerInsight[];
};
type Flashcard = {
  id: number;
  question: string;
  answer: string;
  topic: string;
};

type TranscriptionResult = {
  job_id: string;
  filename: string;

  // URL returned by FastAPI
  audio_url: string;

  status: string;

  transcription: {
    text: string;
    segments: TranscriptSegment[];
  };

  analysis: Analysis;
};


function formatTime(seconds: number | null | undefined) {
  if (
    seconds === null ||
    seconds === undefined ||
    !Number.isFinite(seconds)
  ) {
    return "00:00";
  }

  const totalSeconds = Math.max(0, Math.floor(seconds));

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(secs).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(
    2,
    "0"
  )}`;
}


export default function ResultsPage() {
  const [tab, setTab] = useState<Tab>("summary");

  const [playing, setPlaying] = useState(false);

  const [currentTime, setCurrentTime] = useState(0);

  const [audioDuration, setAudioDuration] = useState(0);

  const [search, setSearch] = useState("");
  const [showExportMenu, setShowExportMenu] = useState(false);

  // ============================================================
  // FLASHCARDS
  // ============================================================

  const [showFlashcards, setShowFlashcards] = useState(false);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [flashcardsLoading, setFlashcardsLoading] = useState(false);
  const [flashcardsError, setFlashcardsError] = useState("");

  const [result, setResult] =
    useState<TranscriptionResult | null>(null);

  const [error, setError] = useState("");

  // Real HTML audio element
  const audioRef = useRef<HTMLAudioElement | null>(null);


  // ============================================================
  // LOAD ANALYSIS
  // ============================================================

  const [searchParams] = useSearchParams();

  useEffect(() => {
    let cancelled = false;

    const loadAnalysis = async () => {
      setError("");
      setResult(null);

      const jobId = searchParams.get("jobId");

      // If History -> View was used, always load that exact
      // saved result from the backend.
      if (jobId) {
        try {
          const storedAuth =
            localStorage.getItem("LectureIQ_auth");

          let email = "";

          try {
            const auth = storedAuth
              ? JSON.parse(storedAuth)
              : null;

            email =
              typeof auth?.email === "string"
                ? auth.email.trim().toLowerCase()
                : "";
          } catch {
            email = "";
          }

          const headers: HeadersInit = {};

          if (email) {
            headers["X-User-Email"] = email;
          }

          const response = await fetch(
            `http://127.0.0.1:8000/api/result/${encodeURIComponent(
              jobId
            )}`,
            {
              method: "GET",
              headers,
            }
          );

          const data = await response.json().catch(() => null);

          if (!response.ok) {
            throw new Error(
              data?.detail ||
                "The selected lecture analysis could not be found."
            );
          }

          if (!cancelled) {
            setResult(data as TranscriptionResult);

            console.log(
              "Saved lecture analysis loaded:",
              data
            );
          }

          return;
        } catch (err) {
          console.error(
            "Failed to load saved lecture analysis:",
            err
          );

          if (!cancelled) {
            setError(
              err instanceof Error
                ? err.message
                : "Unable to load the selected lecture analysis."
            );
          }

          return;
        }
      }

      // Normal flow after a fresh upload/analysis:
      // keep supporting the result stored by the upload flow.
      try {
        const storedResult =
          sessionStorage.getItem("transcriptionResult");

        if (!storedResult) {
          if (!cancelled) {
            setError(
              "No lecture analysis was found. Please upload and process an audio file first."
            );
          }

          return;
        }

        const parsed: TranscriptionResult =
          JSON.parse(storedResult);

        if (!cancelled) {
          setResult(parsed);

          console.log(
            "Current lecture analysis loaded:",
            parsed
          );
        }
      } catch (err) {
        console.error(
          "Failed to load lecture analysis:",
          err
        );

        if (!cancelled) {
          setError(
            "Unable to load the lecture analysis."
          );
        }
      }
    };

    loadAnalysis();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);


  // ============================================================
  // TRANSCRIPT SEARCH
  // ============================================================

  const filteredSegments = useMemo(() => {
    if (!result?.transcription?.segments) {
      return [];
    }

    const query = search.trim().toLowerCase();

    if (!query) {
      return result.transcription.segments;
    }

    return result.transcription.segments.filter(
      (segment) =>
        segment.text
          .toLowerCase()
          .includes(query)
    );

  }, [result, search]);


  // ============================================================
  // WHISPER DURATION
  // ============================================================

  const totalDuration = useMemo(() => {
    if (
      !result?.transcription?.segments?.length
    ) {
      return 0;
    }

    return Math.max(
      ...result.transcription.segments.map(
        (segment) => segment.end
      )
    );

  }, [result]);


  // ============================================================
  // SPEAKER GROUPING
  // ============================================================

  const speakerGroups = useMemo(() => {
    if (!result?.transcription?.segments) return [];

    const groups = new Map<string, {
      speaker: string;
      segments: TranscriptSegment[];
      duration: number;
    }>();

    result.transcription.segments.forEach((segment) => {
      const speaker = segment.speaker || "UNKNOWN";

      if (!groups.has(speaker)) {
        groups.set(speaker, { speaker, segments: [], duration: 0 });
      }

      const group = groups.get(speaker)!;
      group.segments.push(segment);
      group.duration += Math.max(0, segment.end - segment.start);
    });

    return Array.from(groups.values()).sort((a, b) => b.duration - a.duration);
  }, [result]);

  // ============================================================
  // SPEAKER INSIGHTS
  // ============================================================
  // Gemini insights are shown when available. Until Gemini quota
  // is restored, the UI uses transcript-derived fallback insights.
  const speakerInsights = useMemo(() => {
    const insights = result?.analysis?.speaker_insights ?? [];

    return speakerGroups.map((group) => {
      const aiInsight = insights.find(
        (item) => item.speaker === group.speaker
      );

      return {
        speaker: group.speaker,
        role: aiInsight?.role || "Speaker",
        contributions:
          aiInsight?.contributions?.length
            ? aiInsight.contributions
            : [
                `Spoke across ${group.segments.length} transcript ${
                  group.segments.length === 1 ? "segment" : "segments"
                }.`,
                `Contributed approximately ${formatTime(
                  group.duration
                )} of spoken audio.`,
              ],
        action_items: aiInsight?.action_items ?? [],
        isAiGenerated: Boolean(aiInsight),
      };
    });
  }, [speakerGroups, result?.analysis]);


  // COPY
  // ============================================================

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);

      alert("Copied to clipboard");

    } catch (err) {
      console.error(
        "Unable to copy text:",
        err
      );
    }
  };

    // ============================================================
  // EXPORT
  // ============================================================

  const downloadFile = (
    format: "txt" | "pdf" | "docx",
    extension: string
  ) => {
    if (!result?.job_id) {
      alert("Lecture result is not available.");
      return;
    }

    const apiBase =
      import.meta.env.VITE_API_BASE_URL ||
      "http://127.0.0.1:8000";

    const url = `${apiBase}/api/export/${result.job_id}/${format}`;

    const link = document.createElement("a");
    link.href = url;
    link.download = `lecture_${result.job_id}.${extension}`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setShowExportMenu(false);
  };

  const exportTXT = () => {
    downloadFile("txt", "txt");
  };

  const exportPDF = () => {
    downloadFile("pdf", "pdf");
  };

  const exportDOCX = () => {
    downloadFile("docx", "docx");
  };

  // FLASHCARDS
  // ============================================================

  const generateFlashcards = async () => {
    if (!result?.job_id) {
      alert("Lecture result is not available.");
      return;
    }

    setFlashcardsLoading(true);
    setFlashcardsError("");

    try {
      const apiBase =
        import.meta.env.VITE_API_BASE_URL ||
        "http://127.0.0.1:8000";

      const response = await fetch(
        `${apiBase}/api/flashcards/${result.job_id}`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to generate flashcards."
        );
      }

      const generatedCards: Flashcard[] = Array.isArray(data.flashcards)
        ? data.flashcards
        : [];

      if (generatedCards.length === 0) {
        throw new Error(
          "No flashcards were generated for this lecture."
        );
      }

      setFlashcards(generatedCards);
      setFlashcardIndex(0);
      setShowAnswer(false);
      setShowFlashcards(true);
    } catch (err) {
      console.error("Flashcard generation failed:", err);

      setFlashcardsError(
        err instanceof Error
          ? err.message
          : "Failed to generate flashcards."
      );
    } finally {
      setFlashcardsLoading(false);
    }
  };

  const closeFlashcards = () => {
    setShowFlashcards(false);
    setShowAnswer(false);
  };

  const goToPreviousFlashcard = () => {
    setFlashcardIndex((current) => Math.max(0, current - 1));
    setShowAnswer(false);
  };

  const goToNextFlashcard = () => {
    if (flashcardIndex < flashcards.length - 1) {
      setFlashcardIndex((current) => current + 1);
      setShowAnswer(false);
    } else {
      closeFlashcards();
    }
  };

  // ============================================================
  // AUDIO PLAY / PAUSE
  // ============================================================

  const togglePlay = async () => {
    const audio = audioRef.current;

    if (!audio) {
      console.error("Audio element not available.");
      return;
    }

    try {

      if (audio.paused) {

        await audio.play();

        setPlaying(true);

      } else {

        audio.pause();

        setPlaying(false);
      }

    } catch (err) {

      console.error(
        "Audio playback failed:",
        err
      );
    }
  };


  // ============================================================
  // AUDIO TIME UPDATE
  // ============================================================

  const handleTimeUpdate = () => {
    const audio = audioRef.current;

    if (!audio) return;

    setCurrentTime(audio.currentTime);
  };


  // ============================================================
  // AUDIO METADATA
  // ============================================================

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;

    if (!audio) return;

    if (Number.isFinite(audio.duration)) {
      setAudioDuration(audio.duration);
    }
  };


  // ============================================================
  // AUDIO ENDED
  // ============================================================

  const handleAudioEnded = () => {
    setPlaying(false);
    setCurrentTime(0);
  };


  // ============================================================
  // SEEK AUDIO
  // ============================================================

  const seekAudio = (time: number) => {
    const audio = audioRef.current;

    if (!audio) return;

    audio.currentTime = time;

    setCurrentTime(time);

    // Start playing when a topic timestamp is clicked
    if (audio.paused) {

      audio
        .play()
        .then(() => {
          setPlaying(true);
        })
        .catch((err) => {
          console.error(
            "Unable to play audio after seeking:",
            err
          );
        });

    }
  };


  // ============================================================
  // ERROR STATE
  // ============================================================

  if (error) {
    return (
      <div className="max-w-3xl mx-auto">

        <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-8 text-center">

          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">

            <AlertCircle
              size={28}
              className="text-red-500"
            />

          </div>

          <h1
            className="text-xl font-bold text-slate-900 mb-2"
            style={{
              fontFamily: "Outfit, sans-serif",
            }}
          >
            Lecture Analysis Not Found
          </h1>

          <p className="text-sm text-slate-500">
            {error}
          </p>

        </div>

      </div>
    );
  }


  // ============================================================
  // LOADING STATE
  // ============================================================

  if (!result) {
    return (
      <div className="max-w-3xl mx-auto">

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">

          <div className="w-12 h-12 rounded-full bg-[#5B6EF8]/10 flex items-center justify-center mx-auto mb-4">

            <Zap
              size={22}
              className="text-[#5B6EF8] animate-pulse"
            />

          </div>

          <h2 className="text-lg font-bold text-slate-900">
            Loading Lecture Analysis...
          </h2>

          <p className="text-sm text-slate-500 mt-2">
            Loading your Whisper transcript and Gemini lecture notes.
          </p>

        </div>

      </div>
    );
  }


  const analysis = result.analysis;

  const displayedDuration =
    audioDuration || totalDuration;


  return (
    <div className="space-y-5 max-w-5xl mx-auto">


      {/* ================================================== */}
      {/* HEADER */}
      {/* ================================================== */}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

          <div className="flex items-center gap-4">

            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#5B6EF8] to-[#7C3AED] flex items-center justify-center flex-shrink-0">

              <Music
                size={18}
                className="text-white"
              />

            </div>


            <div className="min-w-0">

              <h1
                className="text-[16px] font-bold text-slate-900 truncate"
                style={{
                  fontFamily: "Outfit, sans-serif",
                }}
              >
                {result.filename}
              </h1>


              <div className="flex flex-wrap items-center gap-3 mt-1">

                <span className="text-[12px] text-slate-400">
                  {formatTime(displayedDuration)}
                </span>

                <span className="text-[12px] text-slate-300">
                  ·
                </span>

                <span className="text-[12px] text-slate-400">
                  {result.transcription.segments.length} segments
                </span>

                <span className="text-[12px] text-slate-300">
                  ·
                </span>

                <span className="text-[12px] text-slate-400">
                  Whisper + Diarization + AI Analysis
                </span>

                <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                  Complete
                </span>

              </div>

            </div>

          </div>


          {/* ACTION BUTTONS */}

          <div className="flex items-center gap-2">


                       <button
              type="button"
              onClick={generateFlashcards}
              disabled={flashcardsLoading}
              className="flex items-center gap-1.5 text-[12px] font-medium text-slate-600 border border-slate-200 px-3 py-2 rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Generate study flashcards from this lecture"
            >
              <Brain size={13} />
              {flashcardsLoading ? "Generating..." : "Flashcards"}
            </button>

<div className="relative">
  <button
    type="button"
    onClick={() => setShowExportMenu(!showExportMenu)}
    className="flex items-center gap-1.5 text-[12px] font-medium text-slate-600 border border-slate-200 px-3 py-2 rounded-xl hover:bg-slate-50"
  >
    <Download size={13} />
    Export

    <ChevronDown
      size={12}
      className={`transition-transform ${
        showExportMenu ? "rotate-180" : ""
      }`}
    />
  </button>

  {showExportMenu && (
    <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">

      {/* PDF */}
      <button
        type="button"
        onClick={exportPDF}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
          <FileText size={15} className="text-red-600" />
        </div>
        <div>
          <p className="text-[12px] font-semibold text-slate-700">Export PDF</p>
          <p className="text-[10px] text-slate-400">Lecture notes & transcript</p>
        </div>
      </button>

      {/* WORD */}
      <button
        type="button"
        onClick={exportDOCX}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
          <FileText size={15} className="text-blue-600" />
        </div>
        <div>
          <p className="text-[12px] font-semibold text-slate-700">Export Word</p>
          <p className="text-[10px] text-slate-400">Editable DOCX document</p>
        </div>
      </button>

      {/* TXT */}
      <button
        type="button"
        onClick={exportTXT}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
          <FileText size={15} className="text-slate-600" />
        </div>
        <div>
          <p className="text-[12px] font-semibold text-slate-700">Export TXT</p>
          <p className="text-[10px] text-slate-400">Plain text notes</p>
        </div>
      </button>

    </div>
  )}
</div>


          </div>

        </div>


        {/* ================================================== */}
        {/* REAL AUDIO PLAYER */}
        {/* ================================================== */}

        <div className="mt-4 bg-slate-50 rounded-xl p-3">

          <audio
            ref={audioRef}
            src={`http://127.0.0.1:8000${result.audio_url}`}
            preload="metadata"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleAudioEnded}
          />


          <div className="flex items-center gap-3">

            {/* PLAY / PAUSE */}

            <button
              onClick={togglePlay}
              className="w-9 h-9 rounded-full bg-[#5B6EF8] flex items-center justify-center flex-shrink-0 hover:bg-[#4A5DE8]"
              title={playing ? "Pause" : "Play"}
            >

              {playing ? (

                <Pause
                  size={14}
                  className="text-white"
                />

              ) : (

                <Play
                  size={14}
                  className="text-white ml-0.5"
                />

              )}

            </button>


            {/* PROGRESS */}

            <div className="flex-1">

              <input
                type="range"
                min="0"
                max={audioDuration || totalDuration || 1}
                value={Math.min(
                  currentTime,
                  audioDuration || totalDuration || 1
                )}
                onChange={(e) =>
                  seekAudio(
                    Number(e.target.value)
                  )
                }
                className="w-full accent-[#5B6EF8] cursor-pointer"
              />


              <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">

                <span>
                  {formatTime(currentTime)}
                </span>

                <span>
                  {formatTime(displayedDuration)}
                </span>

              </div>

            </div>

          </div>

        </div>

      </div>


      {/* ================================================== */}
      {/* TABS */}
      {/* ================================================== */}

      <div className="flex gap-1 bg-white rounded-2xl border border-slate-100 shadow-sm p-1.5">

        {[
          {
            id: "summary" as Tab,
            label: "Lecture Notes",
            icon: BookOpen,
          },
          {
            id: "transcript" as Tab,
            label: "Transcript",
            icon: FileText,
          },
          {
            id: "speakers" as Tab,
            label: "Speakers",
            icon: Users,
          },
        ].map(
          ({ id, label, icon: Icon }) => (

            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
                tab === id
                  ? "bg-gradient-to-r from-[#5B6EF8] to-[#7C3AED] text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >

              <Icon size={14} />

              <span className="hidden sm:inline">
                {label}
              </span>

            </button>

          )
        )}

      </div>


      {/* ================================================== */}
      {/* LECTURE NOTES */}
      {/* ================================================== */}

      {tab === "summary" && (

  <div className="space-y-4">

    {/* ================================================== */}
    {/* LECTURE INTELLIGENCE OVERVIEW */}
    {/* ================================================== */}

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Topics
            </p>

            <p className="text-2xl font-bold text-slate-800 mt-1">
              {analysis.topics.length}
            </p>
          </div>

          <div className="w-9 h-9 rounded-xl bg-[#5B6EF8]/10 flex items-center justify-center">
            <BookOpen
              size={17}
              className="text-[#5B6EF8]"
            />
          </div>
        </div>
      </div>


      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Speakers
            </p>

            <p className="text-2xl font-bold text-slate-800 mt-1">
              {speakerGroups.length}
            </p>
          </div>

          <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
            <Users
              size={17}
              className="text-violet-600"
            />
          </div>
        </div>
      </div>


      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Exam Points
            </p>

            <p className="text-2xl font-bold text-slate-800 mt-1">
              {analysis.exam_points.length}
            </p>
          </div>

          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
            <Star
              size={17}
              className="text-amber-500"
              fill="currentColor"
            />
          </div>
        </div>
      </div>


      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Takeaways
            </p>

            <p className="text-2xl font-bold text-slate-800 mt-1">
              {analysis.key_takeaways.length}
            </p>
          </div>

          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
            <CheckCircle2
              size={17}
              className="text-emerald-500"
            />
          </div>
        </div>
      </div>

    </div>


          {/* OVERALL SUMMARY */}

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">

            <div className="flex items-center gap-2 mb-4">

              <div className="w-8 h-8 rounded-lg bg-[#5B6EF8]/10 flex items-center justify-center">

                <Zap
                  size={16}
                  className="text-[#5B6EF8]"
                />

              </div>


              <div>

                <h2
                  className="text-[15px] font-bold text-slate-900"
                  style={{
                    fontFamily: "Outfit, sans-serif",
                  }}
                >
                  Overall Lecture Summary
                </h2>

                <p className="text-[11px] text-slate-400">
                  Generated from the actual lecture transcript
                </p>

              </div>

            </div>


            <p className="text-[13.5px] text-slate-700 leading-relaxed bg-slate-50 rounded-xl p-4">
              {analysis.summary}
            </p>

          </div>


          {/* STRUCTURED TOPICS */}

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">

            <div className="flex items-center gap-2 mb-5">

              <BookOpen
                size={17}
                className="text-[#5B6EF8]"
              />

              <h2
                className="text-[15px] font-bold text-slate-900"
                style={{
                  fontFamily: "Outfit, sans-serif",
                }}
              >
                Structured Lecture Notes
              </h2>

            </div>


            <div className="space-y-5">

              {analysis.topics.map(
                (topic, index) => (

                  <div
                    key={`${topic.title}-${index}`}
                    className="border border-slate-100 rounded-xl p-4 hover:border-[#5B6EF8]/20 transition-colors"
                  >

                    {/* TOPIC HEADER */}

                    <div className="flex items-start justify-between gap-3 mb-3">

                      <div className="flex items-start gap-3">

                        <div className="w-7 h-7 rounded-lg bg-[#5B6EF8]/10 flex items-center justify-center flex-shrink-0">

                          <span className="text-[11px] font-bold text-[#5B6EF8]">
                            {index + 1}
                          </span>

                        </div>


                        <div>

                          <h3 className="text-[14px] font-bold text-slate-800">
                            {topic.title}
                          </h3>


                          {/* CLICKABLE TIMESTAMP */}

                          {topic.start_time !== null &&
                            topic.start_time !== undefined &&
                            topic.end_time !== null &&
                            topic.end_time !== undefined && (

                              <button
                                type="button"
                                onClick={() =>
                                  seekAudio(
                                    topic.start_time as number
                                  )
                                }
                                className="inline-flex items-center gap-1.5 mt-2 px-2 py-1 rounded-md bg-slate-50 hover:bg-[#5B6EF8]/10 border border-slate-100 hover:border-[#5B6EF8]/20 transition-colors cursor-pointer"
                                title="Play this topic"
                              >

                                <Clock
                                  size={11}
                                  className="text-[#5B6EF8]"
                                />

                                <span className="text-[10px] font-mono font-medium text-slate-500">
                                  {formatTime(
                                    topic.start_time
                                  )}
                                </span>

                                <span className="text-[10px] text-slate-400">
                                  –
                                </span>

                                <span className="text-[10px] font-mono font-medium text-slate-500">
                                  {formatTime(
                                    topic.end_time
                                  )}
                                </span>

                                <Play
                                  size={9}
                                  className="text-[#5B6EF8]"
                                />

                              </button>

                            )}

                        </div>

                      </div>


                      {/* IMPORTANT */}

                      {topic.important && (

                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-600 px-2 py-1 rounded-full flex-shrink-0">

                          <Star
                            size={10}
                            fill="currentColor"
                          />

                          Important

                        </span>

                      )}

                    </div>


                    {/* TOPIC POINTS */}

                    <ul className="space-y-2 ml-10">

                      {topic.points.map(
                        (point, pointIndex) => (

                          <li
                            key={pointIndex}
                            className="flex items-start gap-2"
                          >

                            <span className="w-1.5 h-1.5 rounded-full bg-[#5B6EF8] mt-2 flex-shrink-0" />

                            <p className="text-[13px] text-slate-600 leading-relaxed">
                              {point}
                            </p>

                          </li>

                        )
                      )}

                    </ul>


                    {/* WHY IMPORTANT */}

                    {topic.important &&
                      topic.important_note && (

                        <div className="mt-4 ml-10 bg-amber-50 border border-amber-100 rounded-lg p-3">

                          <p className="text-[11px] font-semibold text-amber-700 mb-1">
                            Why this is important
                          </p>

                          <p className="text-[12px] text-amber-800">
                            {topic.important_note}
                          </p>

                        </div>

                      )}

                  </div>

                )
              )}

            </div>

          </div>


          {/* KEY TAKEAWAYS */}

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">

            <div className="flex items-center gap-2 mb-4">

              <CheckCircle2
                size={17}
                className="text-emerald-500"
              />

              <h2
                className="text-[15px] font-bold text-slate-900"
                style={{
                  fontFamily: "Outfit, sans-serif",
                }}
              >
                Key Takeaways
              </h2>

            </div>


            <div className="space-y-2">

              {analysis.key_takeaways.map(
                (takeaway, index) => (

                  <div
                    key={index}
                    className="flex items-start gap-3 bg-slate-50 rounded-xl p-3"
                  >

                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">

                      <span className="text-[10px] font-bold text-emerald-600">
                        {index + 1}
                      </span>

                    </div>


                    <p className="text-[13px] text-slate-700 leading-relaxed">
                      {takeaway}
                    </p>

                  </div>

                )
              )}

            </div>

          </div>


          {/* EXAM POINTS */}

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">

            <div className="flex items-center gap-2 mb-4">

              <Star
                size={17}
                className="text-amber-500"
                fill="currentColor"
              />

              <h2
                className="text-[15px] font-bold text-slate-900"
                style={{
                  fontFamily: "Outfit, sans-serif",
                }}
              >
                Exam / Important Points
              </h2>

            </div>


            {analysis.exam_points.length > 0 ? (

              <div className="space-y-2">

                {analysis.exam_points.map(
                  (point, index) => (

                    <div
                      key={index}
                      className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-start gap-3"
                    >

                      <Star
                        size={14}
                        className="text-amber-500 mt-0.5 flex-shrink-0"
                        fill="currentColor"
                      />

                      <p className="text-[13px] text-slate-700 leading-relaxed">
                        {point}
                      </p>

                    </div>

                  )
                )}

              </div>

            ) : (

              <p className="text-[13px] text-slate-500 bg-slate-50 rounded-xl p-4">
                No explicit exam points were identified in this lecture.
              </p>

            )}

          </div>

        </div>

      )}


      {/* ================================================== */}
      {/* TRANSCRIPT */}
      {/* ================================================== */}

      {tab === "transcript" && (

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">

          <div className="flex items-center gap-3 p-4 border-b border-slate-100">

            <div className="relative flex-1">

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
                placeholder="Search transcript..."
                className="w-full pl-9 pr-4 py-2 text-[13px] border border-slate-200 rounded-xl focus:outline-none focus:border-[#5B6EF8]"
              />

            </div>


            <button
              onClick={() =>
                copyText(
                  result.transcription.text
                )
              }
              className="flex items-center gap-1.5 text-[12px] font-medium text-slate-600 border border-slate-200 px-3 py-2 rounded-xl hover:bg-slate-50"
            >

              <Copy size={13} />

              Copy

            </button>

          </div>


          <div className="p-5 space-y-5 max-h-[600px] overflow-y-auto">

            {filteredSegments.length > 0 ? (

              filteredSegments.map(
                (segment, index) => (

                  <div
                    key={`${segment.start}-${segment.end}-${index}`}
                    className="flex gap-4 group"
                  >

                    <div className="flex-shrink-0 pt-0.5">

                      <div className="w-8 h-8 rounded-full bg-[#5B6EF8]/10 flex items-center justify-center text-[11px] font-bold text-[#5B6EF8]">
                        {index + 1}
                      </div>

                    </div>


                    <div className="flex-1">

                      <div className="flex items-center gap-3 mb-1">

                        <span className="text-[12.5px] font-semibold text-slate-800">
                          {segment.speaker ||
                            "Speaker pending"}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            seekAudio(
                              segment.start
                            )
                          }
                          className="text-[11px] font-mono text-slate-400 flex items-center gap-1 hover:text-[#5B6EF8]"
                          title="Play from this point"
                        >

                          <Clock size={10} />

                          {formatTime(
                            segment.start
                          )}

                          {" – "}

                          {formatTime(
                            segment.end
                          )}

                        </button>

                      </div>


                      <p className="text-[13.5px] text-slate-600 leading-relaxed">
                        {segment.text}
                      </p>

                    </div>

                  </div>

                )

              )

            ) : (

              <div className="text-center py-10">

                <Search
                  size={24}
                  className="text-slate-300 mx-auto mb-3"
                />

                <p className="text-sm text-slate-500">
                  No transcript segments found.
                </p>

              </div>

            )}

          </div>

        </div>

      )}


      {/* ================================================== */}
      {/* SPEAKERS */}
      {/* ================================================== */}

      {tab === "speakers" && (
        <div className="space-y-4">

          {/* SPEAKER OVERVIEW */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#5B6EF8]/10 flex items-center justify-center">
                  <Users size={20} className="text-[#5B6EF8]" />
                </div>

                <div>
                  <h2
                    className="text-[15px] font-bold text-slate-900"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    Speaker Analysis
                  </h2>

                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Diarization identifies who spoke and AI analysis explains
                    their contributions.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-lg font-bold text-[#5B6EF8]">
                    {speakerGroups.length}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {speakerGroups.length === 1 ? "Speaker" : "Speakers"}
                  </p>
                </div>

                <div className="h-8 w-px bg-slate-200" />

                <div className="text-right">
                  <p className="text-lg font-bold text-slate-700">
                    {result.transcription.segments.length}
                  </p>
                  <p className="text-[10px] text-slate-400">Segments</p>
                </div>
              </div>
            </div>
          </div>

          {speakerGroups.length > 0 ? (
            speakerGroups.map((group, index) => {
              const insight = speakerInsights.find(
                (item) => item.speaker === group.speaker
              );

              return (
                <div
                  key={group.speaker}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
                >
                  {/* SPEAKER HEADER */}
                  <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#5B6EF8] to-[#7C3AED] flex items-center justify-center">
                          <Users size={17} className="text-white" />
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-[14px] font-bold text-slate-800">
                              {group.speaker}
                            </h3>

                            <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                              {insight?.role || "Speaker"}
                            </span>

                            {insight?.isAiGenerated && (
                              <span className="text-[10px] font-semibold bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full">
                                AI Insight
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Speaker {index + 1} · {group.segments.length}{" "}
                            transcript{" "}
                            {group.segments.length === 1
                              ? "segment"
                              : "segments"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-5">
                        <div className="text-right">
                          <p className="text-[12px] font-semibold text-slate-600">
                            {formatTime(group.duration)}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            speaking time
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-[12px] font-semibold text-slate-600">
                            {Math.round(
                              (group.duration /
                                Math.max(totalDuration, 1)) *
                                100
                            )}
                            %
                          </p>
                          <p className="text-[10px] text-slate-400">
                            of lecture
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AI / FALLBACK INSIGHTS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border-b border-slate-100">
                    <div className="border border-slate-100 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Zap size={15} className="text-[#5B6EF8]" />
                        <h4 className="text-[12px] font-bold text-slate-800">
                          Contributions
                        </h4>
                      </div>

                      <ul className="space-y-2">
                        {(insight?.contributions || []).map(
                          (contribution, contributionIndex) => (
                            <li
                              key={contributionIndex}
                              className="flex items-start gap-2"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-[#5B6EF8] mt-1.5 flex-shrink-0" />
                              <p className="text-[12px] text-slate-600 leading-relaxed">
                                {contribution}
                              </p>
                            </li>
                          )
                        )}
                      </ul>

                      {!insight?.isAiGenerated && (
                        <p className="text-[10px] text-slate-400 mt-3">
                          Transcript-derived until AI speaker analysis is
                          available.
                        </p>
                      )}
                    </div>

                    <div className="border border-slate-100 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle2
                          size={15}
                          className="text-emerald-500"
                        />
                        <h4 className="text-[12px] font-bold text-slate-800">
                          Action Items
                        </h4>
                      </div>

                      {insight?.action_items?.length ? (
                        <ul className="space-y-2">
                          {insight.action_items.map(
                            (action, actionIndex) => (
                              <li
                                key={actionIndex}
                                className="flex items-start gap-2"
                              >
                                <span className="w-4 h-4 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <CheckCircle2
                                    size={10}
                                    className="text-emerald-500"
                                  />
                                </span>

                                <p className="text-[12px] text-slate-600 leading-relaxed">
                                  {action}
                                </p>
                              </li>
                            )
                          )}
                        </ul>
                      ) : (
                        <div className="bg-slate-50 rounded-lg p-3">
                          <p className="text-[11px] text-slate-500">
                            No explicit action items identified for this
                            speaker.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SPEAKER TRANSCRIPT */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-[12px] font-bold text-slate-800">
                        Speaker Transcript
                      </h4>

                      <span className="text-[10px] text-slate-400">
                        Click a timestamp to play
                      </span>
                    </div>

                    <div className="space-y-3 max-h-[420px] overflow-y-auto">
                      {group.segments.map((segment, segmentIndex) => (
                        <div
                          key={`${segment.start}-${segment.end}-${segmentIndex}`}
                          className="border border-slate-100 rounded-xl p-3 hover:border-[#5B6EF8]/20 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <span className="text-[10px] font-semibold text-[#5B6EF8] bg-[#5B6EF8]/10 px-2 py-1 rounded-md">
                              {group.speaker}
                            </span>

                            <button
                              type="button"
                              onClick={() => seekAudio(segment.start)}
                              className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-400 hover:text-[#5B6EF8]"
                              title="Play from this point"
                            >
                              <Clock size={10} />
                              {formatTime(segment.start)} –{" "}
                              {formatTime(segment.end)}
                              <Play size={9} />
                            </button>
                          </div>

                          <p className="text-[13px] text-slate-600 leading-relaxed">
                            {segment.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
              <AlertCircle
                size={24}
                className="text-slate-300 mx-auto mb-3"
              />

              <p className="text-sm font-semibold text-slate-600">
                No speaker information found
              </p>

              <p className="text-[12px] text-slate-400 mt-1">
                The processed transcript does not contain speaker labels.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ================================================== */}
      {/* FLASHCARD ERROR */}
      {/* ================================================== */}

      {flashcardsError && (
        <div className="fixed bottom-5 right-5 z-[110] max-w-sm bg-white border border-red-200 rounded-xl shadow-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle
              size={18}
              className="text-red-500 mt-0.5 flex-shrink-0"
            />

            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-red-700">
                Flashcards unavailable
              </p>

              <p className="text-[11px] text-red-600 mt-1 leading-relaxed">
                {flashcardsError}
              </p>

              <button
                type="button"
                onClick={() => setFlashcardsError("")}
                className="text-[11px] font-semibold text-slate-500 mt-2 hover:text-slate-700"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================== */}
      {/* FLASHCARD MODAL */}
      {/* ================================================== */}

      {showFlashcards && flashcards.length > 0 && (
        <div
          className="fixed inset-0 z-[100] bg-slate-900/45 backdrop-blur-[2px] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="flashcard-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeFlashcards();
            }
          }}
        >
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#5B6EF8]/10 flex items-center justify-center flex-shrink-0">
                  <Brain size={20} className="text-[#5B6EF8]" />
                </div>

                <div className="min-w-0">
                  <h2
                    id="flashcard-title"
                    className="text-[16px] font-bold text-slate-900"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    AI Study Flashcards
                  </h2>

                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Review important concepts from this lecture
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeFlashcards}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-50 text-xl"
                aria-label="Close flashcards"
              >
                ×
              </button>
            </div>

            <div className="px-6 pt-5">
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="text-[11px] font-semibold text-slate-500">
                  Card {flashcardIndex + 1} of {flashcards.length}
                </span>

                <span className="text-[10px] font-semibold text-[#5B6EF8] bg-[#5B6EF8]/10 px-2.5 py-1 rounded-full truncate max-w-[55%]">
                  {flashcards[flashcardIndex]?.topic || "General"}
                </span>
              </div>

              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#5B6EF8] to-[#7C3AED] transition-all duration-300"
                  style={{
                    width: `${
                      ((flashcardIndex + 1) / flashcards.length) * 100
                    }%`,
                  }}
                />
              </div>
            </div>

            <div className="p-6">
              <button
                type="button"
                onClick={() => setShowAnswer((current) => !current)}
                className="w-full min-h-[290px] rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100/80 transition-colors flex flex-col items-center justify-center text-center p-8 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#5B6EF8]/30"
              >
                {!showAnswer ? (
                  <>
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center mb-5 shadow-sm">
                      <Brain size={18} className="text-[#5B6EF8]" />
                    </div>

                    <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-slate-400 mb-4">
                      Question
                    </p>

                    <h3 className="text-[18px] sm:text-[20px] font-semibold text-slate-800 leading-relaxed max-w-xl">
                      {flashcards[flashcardIndex]?.question}
                    </h3>

                    <p className="text-[11px] text-[#5B6EF8] font-medium mt-8">
                      Click to reveal answer
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-5">
                      <CheckCircle2 size={18} className="text-emerald-500" />
                    </div>

                    <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-slate-400 mb-4">
                      Answer
                    </p>

                    <p className="text-[16px] sm:text-[18px] text-slate-700 leading-relaxed max-w-xl">
                      {flashcards[flashcardIndex]?.answer}
                    </p>

                    <p className="text-[11px] text-[#5B6EF8] font-medium mt-8">
                      Click to show question
                    </p>
                  </>
                )}
              </button>
            </div>

            <div className="px-6 pb-6 flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={flashcardIndex === 0}
                onClick={goToPreviousFlashcard}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-[12px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Previous
              </button>

              <button
                type="button"
                onClick={goToNextFlashcard}
                className="px-5 py-2.5 rounded-xl bg-[#5B6EF8] text-white text-[12px] font-semibold hover:bg-[#4A5DE8] transition-colors"
              >
                {flashcardIndex === flashcards.length - 1
                  ? "Finish"
                  : "Next →"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}