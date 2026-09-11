import os
import torch
import whisper
from pyannote.audio import Pipeline


# ============================================================
# CONFIGURATION
# ============================================================

# Your hackathon lecture demo contains:
#   1. Lecturer
#   2. Student
#
# Keeping this configurable makes it easy to change later.
EXPECTED_MIN_SPEAKERS = 2
EXPECTED_MAX_SPEAKERS = 2


# ============================================================
# LOAD DIARIZATION MODEL
# ============================================================

print("Loading diarization model...")

pipeline = Pipeline.from_pretrained(
    "pyannote/speaker-diarization-community-1"
)

if pipeline is None:
    raise RuntimeError(
        "Failed to load pyannote speaker diarization model."
    )

if torch.cuda.is_available():
    pipeline.to(torch.device("cuda"))
    print("Diarization device: CUDA")
else:
    print("Diarization device: CPU")

print("Diarization model loaded!")


# ============================================================
# LOAD AUDIO USING WHISPER
# ============================================================

def load_audio_for_diarization(audio_path: str):
    """
    Load audio using Whisper's audio loader.

    Whisper converts the audio to:
    - mono
    - 16 kHz
    - float32 waveform

    Returns:
        waveform: torch tensor with shape [1, samples]
        sample_rate: 16000
    """

    audio_path = os.path.abspath(audio_path)

    if not os.path.isfile(audio_path):
        raise FileNotFoundError(
            f"Audio file does not exist: {audio_path}"
        )

    print(f"Loading audio with Whisper: {audio_path}")

    audio = whisper.load_audio(audio_path)

    waveform = torch.from_numpy(audio).float()

    # [samples] -> [1, samples]
    if waveform.ndim == 1:
        waveform = waveform.unsqueeze(0)

    return waveform, 16000


# ============================================================
# SPEAKER DIARIZATION
# ============================================================

def diarize_audio(audio_path: str) -> list:
    """
    Run pyannote speaker diarization.

    For the current hackathon lecture demo, the audio is
    expected to contain two speakers:
        - Lecturer
        - Student

    Returns:
        [
            {
                "speaker": "SPEAKER_00",
                "start": 0.0,
                "end": 5.2
            },
            ...
        ]
    """

    print()
    print("=" * 60)
    print("STARTING SPEAKER DIARIZATION")
    print("=" * 60)

    audio_path = os.path.abspath(audio_path)

    print(f"Audio: {audio_path}")
    print(
        f"Expected speakers: "
        f"{EXPECTED_MIN_SPEAKERS}-{EXPECTED_MAX_SPEAKERS}"
    )
    print("=" * 60)

    # --------------------------------------------------------
    # Load audio
    # --------------------------------------------------------

    waveform, sample_rate = load_audio_for_diarization(
        audio_path
    )

    duration = waveform.shape[1] / sample_rate

    print(
        f"Audio loaded successfully: "
        f"{duration:.2f} seconds"
    )

    # --------------------------------------------------------
    # Run pyannote
    #
    # IMPORTANT:
    # min_speakers / max_speakers are supplied because the
    # current hackathon lecture test contains lecturer +
    # student. This prevents the model from collapsing the
    # recording into a single speaker when the evidence is
    # borderline.
    # --------------------------------------------------------

    try:
        output = pipeline(
            {
                "waveform": waveform,
                "sample_rate": sample_rate
            },
            min_speakers=EXPECTED_MIN_SPEAKERS,
            max_speakers=EXPECTED_MAX_SPEAKERS
        )
    except TypeError:
        # Compatibility fallback for versions where the loaded
        # pipeline does not expose these keyword arguments.
        print(
            "Speaker-count arguments are not supported by this "
            "pipeline version. Running default diarization."
        )

        output = pipeline(
            {
                "waveform": waveform,
                "sample_rate": sample_rate
            }
        )

    # --------------------------------------------------------
    # Use exclusive diarization when available
    #
    # Community-1 provides exclusive diarization specifically
    # to make reconciliation with transcription timestamps
    # easier.
    # --------------------------------------------------------

    if hasattr(
        output,
        "exclusive_speaker_diarization"
    ):
        diarization = output.exclusive_speaker_diarization
        print("Using exclusive speaker diarization.")
    elif hasattr(output, "speaker_diarization"):
        diarization = output.speaker_diarization
        print("Using standard speaker diarization.")
    else:
        raise RuntimeError(
            "Diarization output does not contain a supported "
            "speaker diarization result."
        )

    # --------------------------------------------------------
    # Convert pyannote output to JSON-friendly format
    # --------------------------------------------------------

    speaker_segments = []

    for turn, _, speaker in diarization.itertracks(
        yield_label=True
    ):
        start = float(turn.start)
        end = float(turn.end)

        if end <= start:
            continue

        speaker_segments.append(
            {
                "speaker": str(speaker),
                "start": round(start, 3),
                "end": round(end, 3)
            }
        )

    # --------------------------------------------------------
    # Sort by time
    # --------------------------------------------------------

    speaker_segments.sort(
        key=lambda item: (
            item["start"],
            item["end"]
        )
    )

    # --------------------------------------------------------
    # Print result / debug information
    # --------------------------------------------------------

    print()
    print("DIARIZATION COMPLETED")
    print(
        f"Speaker segments: "
        f"{len(speaker_segments)}"
    )
    print("=" * 60)

    unique_speakers = sorted(
        set(
            segment["speaker"]
            for segment in speaker_segments
        )
    )

    print(
        f"Speakers detected: "
        f"{len(unique_speakers)}"
    )

    for speaker in unique_speakers:
        speaker_parts = [
            segment
            for segment in speaker_segments
            if segment["speaker"] == speaker
        ]

        total_time = sum(
            segment["end"] - segment["start"]
            for segment in speaker_parts
        )

        print(
            f"  - {speaker}: "
            f"{len(speaker_parts)} segments, "
            f"{total_time:.2f}s"
        )

    # This is extremely useful during the hackathon.
    print()
    print("RAW DIARIZATION TIMELINE")
    print("-" * 60)

    for segment in speaker_segments:
        print(
            f'{segment["start"]:7.2f} - '
            f'{segment["end"]:7.2f} -> '
            f'{segment["speaker"]}'
        )

    print("=" * 60)

    return speaker_segments


# ============================================================
# TIMESTAMP OVERLAP HELPER
# ============================================================

def calculate_overlap(
    start_a: float,
    end_a: float,
    start_b: float,
    end_b: float
) -> float:
    """
    Return the amount of time two intervals overlap.
    """

    return max(
        0.0,
        min(end_a, end_b) - max(start_a, start_b)
    )


# ============================================================
# ALIGN WHISPER TRANSCRIPT WITH SPEAKERS
# ============================================================

def align_transcript_with_speakers(
    transcript_segments: list,
    speaker_segments: list
) -> list:
    """
    Assign a speaker to every Whisper transcript segment.

    Strategy:
    1. Calculate overlap between the Whisper segment and every
       diarization segment.
    2. Select the speaker with maximum overlap.
    3. If there is no overlap, use the closest speaker segment
       to the Whisper segment midpoint.
    4. Preserve Whisper timestamps and text.

    Returns:
        [
            {
                "start": 0.0,
                "end": 5.2,
                "text": "...",
                "speaker": "SPEAKER_00",
                "duration": 5.2
            }
        ]
    """

    if not transcript_segments:
        return []

    if not speaker_segments:
        print(
            "WARNING: No speaker segments were produced. "
            "Transcript segments will be marked UNKNOWN."
        )

        return [
            {
                "start": float(segment["start"]),
                "end": float(segment["end"]),
                "text": str(
                    segment.get("text", "")
                ).strip(),
                "speaker": "UNKNOWN",
                "duration": round(
                    float(segment["end"])
                    - float(segment["start"]),
                    2
                )
            }
            for segment in transcript_segments
        ]

    # Make sure diarization data is chronological.
    sorted_speaker_segments = sorted(
        speaker_segments,
        key=lambda item: (
            float(item["start"]),
            float(item["end"])
        )
    )

    aligned_segments = []

    for segment in transcript_segments:

        start = float(segment["start"])
        end = float(segment["end"])

        if end < start:
            start, end = end, start

        text = str(
            segment.get("text", "")
        ).strip()

        midpoint = (start + end) / 2.0

        best_speaker = "UNKNOWN"
        best_overlap = 0.0

        # ----------------------------------------------------
        # Primary method: maximum timestamp overlap
        # ----------------------------------------------------

        for speaker_segment in sorted_speaker_segments:

            speaker_start = float(
                speaker_segment["start"]
            )

            speaker_end = float(
                speaker_segment["end"]
            )

            overlap = calculate_overlap(
                start,
                end,
                speaker_start,
                speaker_end
            )

            if overlap > best_overlap:
                best_overlap = overlap
                best_speaker = str(
                    speaker_segment["speaker"]
                )

        # ----------------------------------------------------
        # Fallback: closest diarization segment
        #
        # Whisper occasionally creates a segment boundary
        # exactly between two diarization turns. In that case
        # there may be zero overlap. Instead of returning
        # UNKNOWN, choose the closest speaker turn.
        # ----------------------------------------------------

        if best_overlap <= 0.0:

            closest_distance = float("inf")

            for speaker_segment in sorted_speaker_segments:

                speaker_start = float(
                    speaker_segment["start"]
                )

                speaker_end = float(
                    speaker_segment["end"]
                )

                if midpoint < speaker_start:
                    distance = speaker_start - midpoint
                elif midpoint > speaker_end:
                    distance = midpoint - speaker_end
                else:
                    distance = 0.0

                if distance < closest_distance:
                    closest_distance = distance
                    best_speaker = str(
                        speaker_segment["speaker"]
                    )

        aligned_segments.append(
            {
                "start": start,
                "end": end,
                "text": text,
                "speaker": best_speaker,
                "duration": round(
                    max(0.0, end - start),
                    2
                )
            }
        )

    # --------------------------------------------------------
    # Debug alignment
    # --------------------------------------------------------

    print()
    print("=" * 60)
    print("TRANSCRIPT / SPEAKER ALIGNMENT")
    print("=" * 60)

    for segment in aligned_segments:
        print(
            f'{segment["start"]:7.2f} - '
            f'{segment["end"]:7.2f} | '
            f'{segment["speaker"]:12} | '
            f'{segment["text"]}'
        )

    aligned_speakers = sorted(
        set(
            segment["speaker"]
            for segment in aligned_segments
            if segment["speaker"] != "UNKNOWN"
        )
    )

    print("=" * 60)
    print(
        f"Speakers represented in transcript: "
        f"{len(aligned_speakers)}"
    )

    for speaker in aligned_speakers:
        count = sum(
            1
            for segment in aligned_segments
            if segment["speaker"] == speaker
        )

        print(
            f"  - {speaker}: "
            f"{count} transcript segments"
        )

    print("=" * 60)

    return aligned_segments
