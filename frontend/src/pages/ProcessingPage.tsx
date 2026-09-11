import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle,
  Loader2,
  Music,
  AlertCircle,
} from "lucide-react";

type StepStatus = "pending" | "processing" | "done" | "error";

type AudioJob = {
  job_id: string;
  filename: string;
  status: string;
  title?: string;
  description?: string;
};

const steps = [
  {
    label: "Audio Uploaded",
    desc: "File received and validated",
  },
  {
    label: "Speech Recognition",
    desc: "Converting audio to text using Whisper",
  },
  {
    label: "Generating Transcript",
    desc: "Formatting timestamped transcript",
  },
  {
    label: "Identifying Speakers",
    desc: "Analyzing voice patterns and speaker diarization",
  },
  {
    label: "Speaker Alignment",
    desc: "Linking transcript segments with detected speakers",
  },
  {
    label: "Generating AI Summary",
    desc: "Extracting key topics, takeaways and exam points",
  },
];

export default function ProcessingPage() {
  const navigate = useNavigate();

  const [stepStatuses, setStepStatuses] = useState<StepStatus[]>(
    steps.map(() => "pending")
  );

  const [overallProgress, setOverallProgress] = useState(0);

  const [audioJob, setAudioJob] = useState<AudioJob | null>(null);

  const [error, setError] = useState("");

  const [transcriptionComplete, setTranscriptionComplete] =
    useState(false);

  /*
   * Prevent duplicate API calls during the same page mount.
   * React StrictMode can run useEffect twice in development.
   */
  const analysisStartedRef = useRef(false);

  useEffect(() => {
    /*
     * Prevent duplicate execution.
     */
    if (analysisStartedRef.current) {
      console.log(
        "Lecture analysis already started. Skipping duplicate call."
      );
      return;
    }

    const storedJob = sessionStorage.getItem("audioJob");

    if (!storedJob) {
      setError(
        "No uploaded audio session was found. Please upload an audio file again."
      );
      return;
    }

    try {
      const job: AudioJob = JSON.parse(storedJob);

      if (!job.job_id) {
        throw new Error("Invalid audio job ID.");
      }

      /*
       * Mark as started ONLY after we successfully
       * read and validate the job.
       */
      analysisStartedRef.current = true;

      setAudioJob(job);

      /*
       * Audio upload completed.
       */
      setStepStatuses((prev) => {
        const next = [...prev];

        next[0] = "done";
        next[1] = "processing";

        return next;
      });

      setOverallProgress(16);

      /*
       * Start complete backend analysis.
       */
      transcribeAudio(job.job_id);
    } catch (err) {
      console.error("Failed to read audio job:", err);

      setError("Invalid audio session information.");

      analysisStartedRef.current = false;
    }
  }, []);

  const transcribeAudio = async (jobId: string) => {
    try {
      console.log("========================================");
      console.log("STARTING COMPLETE LECTURE ANALYSIS");
      console.log("Job ID:", jobId);
      console.log("========================================");

      /*
       * Backend performs:
       *
       * 1. Whisper transcription
       * 2. Pyannote speaker diarization
       * 3. Speaker/transcript alignment
       * 4. Gemini / fallback AI analysis
       */

      const response = await fetch(
        `http://127.0.0.1:8000/api/analyze/${jobId}`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        throw new Error(
          errorData?.detail || "Lecture analysis failed"
        );
      }

      const data = await response.json();

      console.log("========================================");
      console.log("COMPLETE LECTURE ANALYSIS RESPONSE");
      console.log(data);
      console.log("========================================");

      /*
       * Store complete result.
       * ResultsPage reads this from sessionStorage.
       */
      sessionStorage.setItem(
        "transcriptionResult",
        JSON.stringify(data)
      );

      /*
       * Whisper transcription completed.
       */
      setStepStatuses((prev) => {
        const next = [...prev];

        next[1] = "done";
        next[2] = "processing";

        return next;
      });

      setOverallProgress(33);

      /*
       * The backend has already completed:
       *
       * - Transcript formatting
       * - Speaker diarization
       * - Speaker alignment
       * - AI analysis
       *
       * We only animate the UI here.
       */
      setTimeout(() => {
        setStepStatuses((prev) => {
          const next = [...prev];

          /*
           * Transcript
           */
          next[2] = "done";

          /*
           * Speaker diarization
           */
          next[3] = "done";

          /*
           * Speaker alignment
           */
          next[4] = "done";

          /*
           * AI analysis
           */
          next[5] = "done";

          return next;
        });

        setOverallProgress(100);
        setTranscriptionComplete(true);

        console.log("========================================");
        console.log("LECTURE ANALYSIS UI COMPLETE");
        console.log("========================================");
      }, 700);
    } catch (err) {
      console.error("Lecture analysis error:", err);

      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong during lecture analysis.";

      setError(message);

      setStepStatuses((prev) => {
        const next = [...prev];

        next[1] = "error";

        return next;
      });
    }
  };

  const getStepIcon = (
    status: StepStatus,
    index: number
  ) => {
    if (status === "done") {
      return (
        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle
            size={18}
            className="text-emerald-500"
          />
        </div>
      );
    }

    if (status === "processing") {
      return (
        <div className="w-8 h-8 rounded-full bg-[#5B6EF8]/10 flex items-center justify-center">
          <Loader2
            size={16}
            className="text-[#5B6EF8] animate-spin"
          />
        </div>
      );
    }

    if (status === "error") {
      return (
        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
          <AlertCircle
            size={18}
            className="text-red-500"
          />
        </div>
      );
    }

    return (
      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
        <span className="text-[12px] font-bold text-slate-400">
          {index + 1}
        </span>
      </div>
    );
  };

  const getStatusBadge = (status: StepStatus) => {
    if (status === "done") {
      return (
        <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
          Done
        </span>
      );
    }

    if (status === "processing") {
      return (
        <span className="text-[11px] font-semibold text-[#5B6EF8] bg-[#5B6EF8]/10 px-2 py-0.5 rounded-full">
          Running
        </span>
      );
    }

    if (status === "error") {
      return (
        <span className="text-[11px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
          Failed
        </span>
      );
    }

    return null;
  };

  return (
    <div className="max-w-xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <h1
          className="text-2xl font-bold text-slate-900"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          Processing Audio
        </h1>

        <p className="text-[13px] text-slate-500 mt-0.5">
          {audioJob?.title || "Processing your lecture"}
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

        {/* Audio Header */}
        <div className="p-5 border-b border-slate-100 flex items-center gap-4">

          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#5B6EF8] to-[#7C3AED] flex items-center justify-center">
            <Music
              size={20}
              className="text-white"
            />
          </div>

          <div className="flex-1 min-w-0">

            <p className="text-[14px] font-semibold text-slate-800 truncate">
              {audioJob?.filename || "Audio file"}
            </p>

            <p className="text-[12px] text-slate-400 mt-0.5">
              Job ID:{" "}
              {audioJob?.job_id
                ? audioJob.job_id.substring(0, 8) + "..."
                : "Loading..."}
            </p>

          </div>
        </div>

        {/* Overall Progress */}
        <div className="px-5 py-4 bg-slate-50/50">

          <div className="flex items-center justify-between mb-2">

            <span className="text-[12px] font-semibold text-slate-700">
              Overall Progress
            </span>

            <span className="text-[12px] font-bold text-[#5B6EF8]">
              {Math.round(overallProgress)}%
            </span>

          </div>

          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">

            <div
              className="h-full bg-gradient-to-r from-[#5B6EF8] to-[#7C3AED] rounded-full transition-all duration-500"
              style={{
                width: `${overallProgress}%`,
              }}
            />

          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-5 mt-5 p-4 rounded-xl bg-red-50 border border-red-100">

            <div className="flex items-start gap-3">

              <AlertCircle
                size={18}
                className="text-red-500 mt-0.5 flex-shrink-0"
              />

              <div>

                <p className="text-[13px] font-semibold text-red-700">
                  Processing Error
                </p>

                <p className="text-[12px] text-red-600 mt-1">
                  {error}
                </p>

              </div>

            </div>
          </div>
        )}

        {/* Processing Steps */}
        <div className="p-5 space-y-3">

          {steps.map((step, i) => {

            const status = stepStatuses[i];

            return (
              <div
                key={step.label}
                className={`flex items-center gap-4 p-3.5 rounded-xl transition-all ${
                  status === "processing"
                    ? "bg-[#5B6EF8]/5 border border-[#5B6EF8]/15"
                    : status === "done"
                    ? "bg-slate-50/50"
                    : status === "error"
                    ? "bg-red-50/50 border border-red-100"
                    : ""
                }`}
              >

                {/* Icon */}
                {getStepIcon(status, i)}

                {/* Text */}
                <div className="flex-1 min-w-0">

                  <p
                    className={`text-[13.5px] font-semibold ${
                      status === "done"
                        ? "text-slate-700"
                        : status === "processing"
                        ? "text-[#5B6EF8]"
                        : status === "error"
                        ? "text-red-600"
                        : "text-slate-400"
                    }`}
                  >
                    {step.label}
                  </p>

                  <p
                    className={`text-[12px] ${
                      status === "pending"
                        ? "text-slate-300"
                        : "text-slate-400"
                    }`}
                  >
                    {step.desc}
                  </p>

                </div>

                {/* Badge */}
                {getStatusBadge(status)}

              </div>
            );
          })}

        </div>

        {/* Analysis Complete */}
        {transcriptionComplete && !error && (
          <div className="p-5 border-t border-slate-100 bg-slate-50/50">

            <div className="text-center py-4">

              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">

                <CheckCircle
                  size={28}
                  className="text-emerald-500"
                />

              </div>

              <h3
                className="text-[16px] font-bold text-slate-900 mb-1"
                style={{
                  fontFamily: "Outfit, sans-serif",
                }}
              >
                Lecture Analysis Complete
              </h3>

              <p className="text-[13px] text-slate-500 mb-4">
                Whisper transcribed the audio, speakers were
                identified and aligned, and AI generated
                structured lecture notes.
              </p>

              <div className="flex items-center justify-center gap-3">

                <button
                  onClick={() => navigate("/results")}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-[#5B6EF8] to-[#7C3AED] text-white font-semibold px-6 py-3 rounded-xl hover:opacity-90 shadow-md shadow-[#5B6EF8]/20 text-[14px]"
                >
                  View Lecture Notes →
                </button>

              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}