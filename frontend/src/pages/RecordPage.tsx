import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mic,
  Square,
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

type Stage = "ready" | "recording" | "stopped" | "processing";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000";

function formatTime(s: number) {
  const m = Math.floor(s / 60)
    .toString()
    .padStart(2, "0");
  const sec = (s % 60)
    .toString()
    .padStart(2, "0");

  return `${m}:${sec}`;
}

function getAuthEmail() {
  try {
    const stored = localStorage.getItem("audiomind_auth");

    if (!stored) {
      return "";
    }

    const auth = JSON.parse(stored);

    return typeof auth?.email === "string"
      ? auth.email.trim().toLowerCase()
      : "";
  } catch {
    return "";
  }
}

function getSupportedMimeType() {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
    "audio/mp4",
  ];

  for (const type of candidates) {
    if (
      typeof MediaRecorder !== "undefined" &&
      MediaRecorder.isTypeSupported(type)
    ) {
      return type;
    }
  }

  return "";
}

function getExtensionFromMimeType(mimeType: string) {
  const type = mimeType.toLowerCase();

  if (type.includes("ogg")) {
    return "ogg";
  }

  if (type.includes("mp4")) {
    return "mp4";
  }

  return "webm";
}

export default function RecordPage() {
  const [stage, setStage] = useState<Stage>("ready");
  const [seconds, setSeconds] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const navigate = useNavigate();

  const mediaRecorderRef =
    useRef<MediaRecorder | null>(null);

  const mediaStreamRef =
    useRef<MediaStream | null>(null);

  const chunksRef =
    useRef<Blob[]>([]);

  const audioRef =
    useRef<HTMLAudioElement | null>(null);

  const recordingStartedAtRef =
    useRef<number | null>(null);

  // ============================================================
  // TIMER
  // ============================================================

  useEffect(() => {
    if (stage !== "recording") {
      return;
    }

    const interval = window.setInterval(() => {
      if (recordingStartedAtRef.current !== null) {
        const elapsed = Math.floor(
          (Date.now() -
            recordingStartedAtRef.current) /
            1000
        );

        setSeconds(elapsed);
      }
    }, 250);

    return () => {
      window.clearInterval(interval);
    };
  }, [stage]);

  // ============================================================
  // CLEANUP
  // ============================================================

  useEffect(() => {
    return () => {
      mediaStreamRef.current
        ?.getTracks()
        .forEach((track) => track.stop());

      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // ============================================================
  // START RECORDING
  // ============================================================

  const handleStart = async () => {
    setError("");
    setPlaying(false);

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setError(
        "Your browser does not support microphone recording. Please use a recent Chrome or Edge browser."
      );
      return;
    }

    if (
      typeof MediaRecorder === "undefined"
    ) {
      setError(
        "Audio recording is not supported in this browser. Please use Chrome or Edge."
      );
      return;
    }

    try {
      // Ask for microphone access only after the user clicks.
      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

      mediaStreamRef.current = stream;

      const mimeType =
        getSupportedMimeType();

      const recorder = mimeType
        ? new MediaRecorder(stream, {
            mimeType,
          })
        : new MediaRecorder(stream);

      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = (event) => {
        console.error(
          "MediaRecorder error:",
          event
        );

        setError(
          "The browser could not record the microphone audio."
        );

        setStage("ready");
      };

      recorder.onstop = () => {
        const finalType =
          recorder.mimeType ||
          mimeType ||
          "audio/webm";

        const blob = new Blob(
          chunksRef.current,
          {
            type: finalType,
          }
        );

        if (blob.size === 0) {
          setError(
            "No audio was captured. Please check your microphone permission and try again."
          );
          setStage("ready");
          return;
        }

        const extension =
          getExtensionFromMimeType(
            finalType
          );

        const url =
          URL.createObjectURL(blob);

        setAudioUrl(url);
        setPlaying(false);
        setStage("stopped");

        // Keep the complete recorded blob available
        // for the Process Recording button.
        (
          window as Window & {
            __audioMindRecordedBlob?: Blob;
            __audioMindRecordedFilename?: string;
          }
        ).__audioMindRecordedBlob = blob;

        (
          window as Window & {
            __audioMindRecordedBlob?: Blob;
            __audioMindRecordedFilename?: string;
          }
        ).__audioMindRecordedFilename =
          `recording.${extension}`;
      };

      mediaRecorderRef.current = recorder;
      recordingStartedAtRef.current =
        Date.now();

      setSeconds(0);
      setStage("recording");

      recorder.start(250);
    } catch (err) {
      console.error(
        "Microphone access failed:",
        err
      );

      let message =
        "Unable to access the microphone.";

      if (
        err instanceof DOMException
      ) {
        if (
          err.name ===
          "NotAllowedError"
        ) {
          message =
            "Microphone permission was denied. Allow microphone access for this site and try again.";
        } else if (
          err.name ===
          "NotFoundError"
        ) {
          message =
            "No microphone was found. Connect a microphone and try again.";
        } else if (
          err.name ===
          "NotReadableError"
        ) {
          message =
            "The microphone is already being used by another application. Close other apps using the microphone and try again.";
        } else if (
          err.name ===
          "SecurityError"
        ) {
          message =
            "Microphone access is blocked by the browser security settings.";
        }
      }

      setError(message);
      setStage("ready");
    }
  };

  // ============================================================
  // STOP RECORDING
  // ============================================================

  const handleStop = () => {
    const recorder =
      mediaRecorderRef.current;

    if (
      !recorder ||
      recorder.state === "inactive"
    ) {
      return;
    }

    recorder.stop();

    mediaStreamRef.current
      ?.getTracks()
      .forEach((track) => track.stop());

    mediaStreamRef.current = null;

    recordingStartedAtRef.current = null;
  };

  // ============================================================
  // PLAY / PAUSE PREVIEW
  // ============================================================

  const togglePreview = async () => {
    const audio = audioRef.current;

    if (!audio || !audioUrl) {
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
        "Preview playback failed:",
        err
      );

      setError(
        "Unable to play the recorded audio."
      );
    }
  };

  // ============================================================
  // RE-RECORD
  // ============================================================

  const handleRerecord = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    setAudioUrl("");
    setSeconds(0);
    setPlaying(false);
    setError("");

    (
      window as Window & {
        __audioMindRecordedBlob?: Blob;
        __audioMindRecordedFilename?: string;
      }
    ).__audioMindRecordedBlob =
      undefined;

    (
      window as Window & {
        __audioMindRecordedBlob?: Blob;
        __audioMindRecordedFilename?: string;
      }
    ).__audioMindRecordedFilename =
      undefined;

    setStage("ready");
  };

  // ============================================================
  // PROCESS RECORDING
  // ============================================================

  const handleProcess = async () => {
    const recordedBlob = (
      window as Window & {
        __audioMindRecordedBlob?: Blob;
        __audioMindRecordedFilename?: string;
      }
    ).__audioMindRecordedBlob;

    const recordedFilename = (
      window as Window & {
        __audioMindRecordedBlob?: Blob;
        __audioMindRecordedFilename?: string;
      }
    ).__audioMindRecordedFilename;

    if (!recordedBlob || recordedBlob.size === 0) {
      setError(
        "Recorded audio is not available. Please record again."
      );
      return;
    }

    setError("");
    setIsProcessing(true);
    setStage("processing");

    try {
      const email = getAuthEmail();

      const uploadHeaders: HeadersInit = {};

      if (email) {
        uploadHeaders["X-User-Email"] = email;
      }

      const formData = new FormData();

      formData.append(
        "file",
        recordedBlob,
        recordedFilename ||
          "recording.webm"
      );

      const uploadResponse =
        await fetch(
          `${API_BASE}/api/upload`,
          {
            method: "POST",
            headers: uploadHeaders,
            body: formData,
          }
        );

      const uploadData =
        await uploadResponse
          .json()
          .catch(() => null);

      if (!uploadResponse.ok) {
        throw new Error(
          uploadData?.detail ||
            "Failed to upload the recording."
        );
      }

      const jobId =
        uploadData?.job_id;

      if (!jobId) {
        throw new Error(
          "The backend did not return a job ID."
        );
      }

      // Store basic job information for the
      // existing processing/results flow.
      sessionStorage.setItem(
        "audioJob",
        JSON.stringify({
          job_id: jobId,
          filename:
            uploadData.filename ||
            recordedFilename ||
            "recording.webm",
          audio_url:
            uploadData.audio_url || "",
        })
      );

      const analyzeHeaders: HeadersInit = {};

      if (email) {
        analyzeHeaders["X-User-Email"] =
          email;
      }

      const analyzeResponse =
        await fetch(
          `${API_BASE}/api/analyze/${jobId}`,
          {
            method: "POST",
            headers: analyzeHeaders,
          }
        );

      const analysisData =
        await analyzeResponse
          .json()
          .catch(() => null);

      if (!analyzeResponse.ok) {
        throw new Error(
          analysisData?.detail ||
            "Failed to process the recording."
        );
      }

      sessionStorage.setItem(
        "transcriptionResult",
        JSON.stringify(analysisData)
      );

      // Use jobId so ResultsPage loads the
      // exact persisted backend result.
      navigate(
        `/results?jobId=${encodeURIComponent(
          jobId
        )}`
      );
    } catch (err) {
      console.error(
        "Recording processing failed:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to process the recording."
      );

      setStage("stopped");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <h1
          className="text-2xl font-bold text-slate-900"
          style={{
            fontFamily:
              "Outfit, sans-serif",
          }}
        >
          Record Audio
        </h1>

        <p className="text-[13px] text-slate-500 mt-0.5">
          Record your lecture or meeting
          directly in the browser.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center space-y-8">
        {/* STATUS */}
        <div>
          <div className="flex items-center justify-center gap-2 mb-2">
            {stage === "recording" && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            )}

            <span
              className={`text-[13px] font-semibold uppercase tracking-wider ${
                stage === "ready"
                  ? "text-slate-400"
                  : stage === "recording"
                  ? "text-red-500"
                  : stage === "processing"
                  ? "text-[#5B6EF8]"
                  : "text-[#5B6EF8]"
              }`}
            >
              {stage === "ready"
                ? "Ready to Record"
                : stage === "recording"
                ? "Recording in Progress"
                : stage === "processing"
                ? "Processing Recording"
                : "Recording Complete"}
            </span>
          </div>

          {stage !== "ready" && (
            <p
              className="text-5xl font-bold font-mono text-slate-900"
              style={{
                fontFamily:
                  "JetBrains Mono, monospace",
              }}
            >
              {formatTime(seconds)}
            </p>
          )}
        </div>

        {/* ERROR */}
        {error && (
          <div className="flex items-start gap-3 text-left bg-red-50 border border-red-100 rounded-xl p-3">
            <AlertCircle
              size={17}
              className="text-red-500 mt-0.5 flex-shrink-0"
            />

            <div>
              <p className="text-[12px] font-semibold text-red-700">
                Recording error
              </p>

              <p className="text-[11px] text-red-600 mt-0.5 leading-relaxed">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* MAIN RECORDING AREA */}
        <div className="flex flex-col items-center gap-4">
          {stage === "ready" && (
            <button
              type="button"
              onClick={handleStart}
              className="w-28 h-28 rounded-full bg-gradient-to-br from-[#5B6EF8] to-[#7C3AED] flex items-center justify-center shadow-xl shadow-[#5B6EF8]/30 hover:opacity-90 hover:scale-105 transition-all"
              aria-label="Start recording"
            >
              <Mic
                size={40}
                className="text-white"
              />
            </button>
          )}

          {stage === "recording" && (
            <>
              {/* WAVEFORM */}
              <div className="flex items-center gap-0.5 h-16 w-48">
                {Array.from({
                  length: 32,
                }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-gradient-to-t from-[#5B6EF8] to-[#7C3AED] rounded-sm wave-bar"
                    style={{
                      minHeight: 4,
                      height: `${
                        10 +
                        Math.abs(
                          Math.sin(
                            seconds * 0.7 +
                              i
                          )
                        ) * 42
                      }px`,
                    }}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={handleStop}
                className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg shadow-red-500/30 hover:scale-105 transition-all"
                aria-label="Stop recording"
              >
                <Square
                  size={26}
                  className="text-white"
                  fill="white"
                />
              </button>

              <p className="text-[13px] text-slate-400">
                Click to stop recording
              </p>
            </>
          )}

          {stage === "stopped" && (
            <>
              {/* PREVIEW */}
              <div className="w-full flex items-center gap-3 bg-slate-50 rounded-xl p-3">
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  preload="metadata"
                  onEnded={() =>
                    setPlaying(false)
                  }
                />

                <button
                  type="button"
                  onClick={togglePreview}
                  className="w-8 h-8 rounded-full bg-[#5B6EF8] flex items-center justify-center flex-shrink-0"
                  aria-label={
                    playing
                      ? "Pause recording"
                      : "Play recording"
                  }
                >
                  {playing ? (
                    <Pause
                      size={13}
                      className="text-white"
                    />
                  ) : (
                    <Play
                      size={13}
                      className="text-white ml-0.5"
                    />
                  )}
                </button>

                <div className="flex-1 flex items-center gap-0.5 h-8">
                  {Array.from({
                    length: 60,
                  }).map((_, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-sm ${
                        i <
                        Math.max(
                          1,
                          Math.floor(
                            (seconds /
                              Math.max(
                                seconds,
                                1
                              )) *
                              60
                          )
                        )
                          ? "bg-[#5B6EF8]"
                          : "bg-slate-200"
                      }`}
                      style={{
                        height: `${
                          20 +
                          Math.abs(
                            Math.sin(
                              i * 0.5
                            )
                          ) *
                            50
                        }%`,
                      }}
                    />
                  ))}
                </div>

                <span className="text-[11px] font-mono text-slate-400 flex-shrink-0">
                  {formatTime(seconds)}
                </span>
              </div>

              <div className="flex gap-3 w-full">
                <button
                  type="button"
                  onClick={handleRerecord}
                  className="flex items-center justify-center gap-2 flex-1 border border-slate-200 text-slate-600 font-semibold py-3 rounded-xl hover:bg-slate-50 text-[13px]"
                >
                  <RotateCcw size={14} />
                  Re-record
                </button>

                <button
                  type="button"
                  onClick={handleProcess}
                  disabled={isProcessing}
                  className="flex items-center justify-center gap-2 flex-1 bg-gradient-to-r from-[#5B6EF8] to-[#7C3AED] text-white font-semibold py-3 rounded-xl hover:opacity-90 text-[13px] shadow-md shadow-[#5B6EF8]/20 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <Loader2
                        size={15}
                        className="animate-spin"
                      />
                      Processing...
                    </>
                  ) : (
                    <>
                      Process Recording
                      <ChevronRight
                        size={15}
                      />
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {stage === "processing" && (
            <div className="py-6 text-center">
              <div className="w-16 h-16 rounded-full bg-[#5B6EF8]/10 flex items-center justify-center mx-auto mb-4">
                <Loader2
                  size={30}
                  className="text-[#5B6EF8] animate-spin"
                />
              </div>

              <p className="text-[14px] font-semibold text-slate-700">
                Processing your recording...
              </p>

              <p className="text-[12px] text-slate-400 mt-1">
                Transcription, speaker
                diarization and AI analysis
                are running.
              </p>
            </div>
          )}
        </div>

        {stage === "ready" && (
          <div className="space-y-2">
            <p className="text-[13px] text-slate-500">
              Click the microphone to start
              recording
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 text-[12px] text-slate-400">
              <span>✓ Browser microphone</span>
              <span>✓ Noise suppression</span>
              <span>✓ Speaker diarization</span>
            </div>
          </div>
        )}

        {stage === "processing" && (
          <div className="flex items-center justify-center gap-2 text-[11px] text-emerald-600">
            <CheckCircle2 size={13} />
            Recording captured successfully
          </div>
        )}
      </div>

      {/* TIPS */}
      <div className="mt-4 bg-blue-50 rounded-2xl p-4 border border-blue-100">
        <p className="text-[12px] font-semibold text-[#5B6EF8] mb-2">
          Recording Tips
        </p>

        <ul className="space-y-1">
          {[
            "Allow microphone permission when the browser asks",
            "Speak clearly and keep a consistent distance from the microphone",
            "Minimize background noise for better speaker identification",
          ].map((tip, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-[12px] text-blue-700"
            >
              <span className="text-[#5B6EF8] mt-0.5">
                ·
              </span>
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
