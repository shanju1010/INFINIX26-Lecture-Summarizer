import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Upload,
  X,
  Play,
  Pause,
  AlertCircle,
  Music,
} from "lucide-react";

type State = "empty" | "selected" | "uploading" | "error";

export default function UploadPage() {
  const [state, setState] = useState<State>("empty");
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Select audio file
  const handleFile = (f: File) => {
    const allowedTypes = [
      "audio/mpeg",
      "audio/wav",
      "audio/x-wav",
      "audio/mp4",
      "audio/webm",
      "audio/ogg",
    ];

    const allowedExtensions = [
      ".mp3",
      ".wav",
      ".m4a",
      ".webm",
      ".ogg",
    ];

    const extension = "." + f.name.split(".").pop()?.toLowerCase();

    if (!allowedTypes.includes(f.type) && !allowedExtensions.includes(extension)) {
      setState("error");
      setFile(null);
      return;
    }

    // 500 MB limit
    const maxSize = 500 * 1024 * 1024;

    if (f.size > maxSize) {
      setState("error");
      setFile(null);
      return;
    }

    setFile(f);

    // Generate title from filename
    setTitle(
      f.name
        .replace(/\.[^/.]+$/, "")
        .replace(/[-_]/g, " ")
    );

    setState("selected");
    setProgress(0);
  };

  // Drag and drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);

    const droppedFile = e.dataTransfer.files[0];

    if (droppedFile) {
      handleFile(droppedFile);
    }
  };

  // REAL BACKEND UPLOAD
  const handleProcess = async () => {
    if (!file) {
      return;
    }

    try {
      setState("uploading");
      setProgress(10);

      // Create FormData
      const formData = new FormData();

      formData.append("file", file);

      console.log("Uploading file:", file.name);

      // Send file to FastAPI
      const response = await fetch(
        "http://127.0.0.1:8000/api/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      setProgress(70);

      // Check response
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        throw new Error(
          errorData?.detail || "Failed to upload audio"
        );
      }

      // Read backend response
      const data = await response.json();

      console.log("Backend response:", data);

      setProgress(100);

      /*
       * Store the job information.
       *
       * The ProcessingPage can use this later to
       * call the Whisper transcription API.
       */
      sessionStorage.setItem(
        "audioJob",
        JSON.stringify({
          job_id: data.job_id,
          filename: data.filename,
          status: data.status,
          title: title,
          description: desc,
        })
      );

      console.log("Job ID:", data.job_id);

      // Go to processing page
      navigate("/processing");
    } catch (error) {
      console.error("Upload error:", error);

      setState("error");
      setProgress(0);
    }
  };

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Remove selected file
  const removeFile = () => {
    setState("empty");
    setFile(null);
    setProgress(0);
    setPlaying(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold text-slate-900"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          Upload Audio
        </h1>

        <p className="text-[13px] text-slate-500 mt-0.5">
          Supported: MP3, WAV, M4A, WEBM, OGG · Max 500 MB
        </p>
      </div>

      {/* Drop Zone */}
      {state === "empty" || state === "error" ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
            dragging
              ? "border-[#5B6EF8] bg-[#5B6EF8]/5"
              : "border-slate-200 bg-slate-50/50 hover:border-[#5B6EF8]/50 hover:bg-[#5B6EF8]/3"
          }`}
        >

          {/* Hidden file input */}
          <input
            ref={inputRef}
            type="file"
            accept=".mp3,.wav,.m4a,.webm,.ogg,audio/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                handleFile(e.target.files[0]);
              }
            }}
          />

          {/* Upload Icon */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#5B6EF8] to-[#7C3AED] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#5B6EF8]/25">
            <Upload size={28} className="text-white" />
          </div>

          <p className="text-[15px] font-semibold text-slate-700 mb-1">
            {dragging
              ? "Release to upload"
              : "Drop your audio file here"}
          </p>

          <p className="text-[13px] text-slate-400 mb-4">
            or click to browse files
          </p>

          <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-500 bg-white border border-slate-200 px-4 py-2 rounded-xl">
            <Upload size={13} />
            Choose File
          </span>

          {/* Error */}
          {state === "error" && (
            <div className="mt-4 flex items-center justify-center gap-2 text-red-500 text-[13px]">
              <AlertCircle size={15} />
              File format not supported or file is larger than 500 MB.
            </div>
          )}

          {/* Format badges */}
          <div className="flex items-center justify-center gap-3 mt-5 flex-wrap">
            {["MP3", "WAV", "M4A", "WEBM", "OGG"].map((fmt) => (
              <span
                key={fmt}
                className="text-[11px] font-semibold text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-md"
              >
                {fmt}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {/* File Preview */}
      {(state === "selected" || state === "uploading") && file && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">

          {/* File information */}
          <div className="flex items-center gap-4">

            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#5B6EF8] to-[#7C3AED] flex items-center justify-center flex-shrink-0">
              <Music size={20} className="text-white" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-slate-800 truncate">
                {file.name}
              </p>

              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-[12px] text-slate-400">
                  {formatSize(file.size)}
                </span>

                <span className="text-[12px] text-slate-400">
                  · Audio file ready
                </span>
              </div>
            </div>

            {/* Remove button */}
            {state === "selected" && (
              <button
                onClick={removeFile}
                className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-500"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Waveform */}
          <div className="flex items-center gap-3">

            <button
              onClick={() => setPlaying(!playing)}
              className="w-8 h-8 rounded-full bg-[#5B6EF8] flex items-center justify-center flex-shrink-0 hover:bg-[#4A5DE8]"
            >
              {playing ? (
                <Pause size={13} className="text-white" />
              ) : (
                <Play
                  size={13}
                  className="text-white ml-0.5"
                />
              )}
            </button>

            <div className="flex-1 h-10 flex items-center gap-0.5 bg-slate-50 rounded-lg px-3 overflow-hidden">
              {Array.from({ length: 80 }).map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-sm ${
                    playing ? "wave-bar" : ""
                  } ${
                    i < 30
                      ? "bg-[#5B6EF8]"
                      : "bg-slate-200"
                  }`}
                  style={{
                    height: `${
                      20 +
                      Math.sin(i * 0.4) * 15 +
                      Math.random() * 20
                    }%`,
                  }}
                />
              ))}
            </div>

            <span className="text-[11px] font-mono text-slate-400 flex-shrink-0">
              Audio
            </span>
          </div>

          {/* REAL Upload Progress */}
          {state === "uploading" && (
            <div>

              <div className="flex items-center justify-between mb-1.5">

                <span className="text-[12px] font-medium text-slate-600">
                  Uploading audio...
                </span>

                <span className="text-[12px] font-semibold text-[#5B6EF8]">
                  {Math.round(progress)}%
                </span>

              </div>

              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">

                <div
                  className="h-full bg-gradient-to-r from-[#5B6EF8] to-[#7C3AED] rounded-full transition-all"
                  style={{
                    width: `${progress}%`,
                  }}
                />

              </div>

            </div>
          )}
        </div>
      )}

      {/* Metadata Form */}
      {(state === "selected" || state === "uploading") && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">

          <h3
            className="text-[14px] font-semibold text-slate-900"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Session Details
          </h3>

          {/* Title */}
          <div>

            <label className="text-[12px] font-medium text-slate-700 mb-1.5 block">
              Session Title
            </label>

            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ML Lecture: Neural Networks Fundamentals"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-[13.5px] focus:outline-none focus:border-[#5B6EF8] focus:ring-2 focus:ring-[#5B6EF8]/10"
            />

          </div>

          {/* Description */}
          <div>

            <label className="text-[12px] font-medium text-slate-700 mb-1.5 block">
              Description (optional)
            </label>

            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Week 8 lecture covering gradient descent and backpropagation..."
              rows={3}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-[13.5px] focus:outline-none focus:border-[#5B6EF8] focus:ring-2 focus:ring-[#5B6EF8]/10 resize-none"
            />

          </div>
        </div>
      )}

      {/* Actions */}
      {state === "selected" && (
        <div className="flex gap-3">

          {/* Remove */}
          <button
            onClick={removeFile}
            className="flex-1 border border-slate-200 text-slate-600 font-semibold py-3 rounded-xl hover:bg-slate-50 text-[13px]"
          >
            Remove File
          </button>

          {/* Process */}
          <button
            onClick={handleProcess}
            className="flex-2 flex-1 bg-gradient-to-r from-[#5B6EF8] to-[#7C3AED] text-white font-semibold py-3 rounded-xl hover:opacity-90 text-[13px] shadow-md shadow-[#5B6EF8]/20"
          >
            Process Audio →
          </button>

        </div>
      )}

    </div>
  );
}