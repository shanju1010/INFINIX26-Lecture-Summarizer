import re

import torch
import whisper


# ============================================================
# DEVICE
# ============================================================

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

print(f"Using device: {DEVICE}")


# ============================================================
# LOAD WHISPER MODEL ONCE
# ============================================================

print("Loading Whisper model...")

model = whisper.load_model(
    "medium",
    device=DEVICE
)

print("Whisper model loaded!")


# ============================================================
# TECHNICAL TRANSCRIPT CORRECTIONS
# ============================================================

# Conservative corrections for common Whisper mistakes,
# especially for computer science lectures.

CORRECTIONS = {

    # LIFO / FIFO
    "lafor": "LIFO",
    "lafor means": "LIFO means",

    "fiafor": "FIFO",
    "fiafor means": "FIFO means",

    "lifo": "LIFO",
    "fifo": "FIFO",

    # Linked List
    "link list": "linked list",
    "link lists": "linked lists",
    "linkedlist": "linked list",
    "linkedlists": "linked lists",

    # Common spacing problems
    "likea": "like a",

    # Queue examples
    "your queue is like":
        "a queue is like",

    "queues or user in printer system":
        "queues are used in printer systems",

    # Stack examples
    "stacks or user in browsers and under operations":
        "stacks are used in browsers and undo operations",

    "with which data structure do you like":
        "which data structure do you like",
}


def correct_transcript_text(text: str) -> str:
    """
    Correct common Whisper transcription mistakes.

    This function is intentionally conservative.
    It does not translate Tamil, Tanglish, or English.
    It only fixes known recognition errors.
    """

    corrected = text

    for wrong, right in CORRECTIONS.items():

        pattern = r"\b" + re.escape(wrong) + r"\b"

        corrected = re.sub(
            pattern,
            right,
            corrected,
            flags=re.IGNORECASE
        )

    return corrected


# ============================================================
# TANGLISH / CODE-SWITCHING DETECTION
# ============================================================

# Common Romanized Tamil words.
#
# IMPORTANT:
# These are NOT translations.
# They are only used to detect whether the transcript
# probably contains Tanglish.

TANGLISH_MARKERS = [

    # Common conversational Tamil
    "enna",
    "enna-na",
    "enna na",
    "ithu",
    "idhu",
    "athu",
    "adhu",
    "intha",
    "indha",
    "antha",
    "andha",

    # Pronouns / common words
    "namma",
    "nanga",
    "naan",
    "naanga",
    "neenga",
    "nee",
    "avan",
    "ava",
    "avanga",

    # Time / context
    "innaiku",
    "iniku",
    "nethu",
    "naalaiku",
    "ippo",
    "ippa",
    "aprom",
    "appuram",

    # Common Tamil verbs
    "pannum",
    "pannuvom",
    "pannunga",
    "pannitu",
    "panni",
    "panna",
    "panrom",
    "pandrom",

    "varum",
    "varuthu",
    "vandhu",
    "vanthu",

    "pogum",
    "poguthu",
    "porom",
    "povom",

    "padikka",
    "padikrom",
    "padikkanum",
    "padippom",

    "irukku",
    "irukkum",
    "irundhu",
    "irunthu",

    "aagum",
    "aaguthu",

    # Question / explanation words
    "epdi",
    "eppadi",
    "yen",
    "yenna",
    "ethuku",
    "edhuku",
    "eppovum",
    "eppo",

    # Connectors
    "pathi",
    "kooda",
    "mattum",
    "apdi",
    "ipdi",
    "athunaala",
    "adhunaala",

    # Common classroom Tanglish
    "use pannuvom",
    "use panrom",
    "explain pannuvom",
    "explain panrom",
    "check pannuvom",
    "check panrom",
    "learn pannuvom",
    "learn panrom",
]


# ============================================================
# ENGLISH TECHNICAL TERMS
# ============================================================

# These help identify Tamil + English technical
# code-switching in academic lectures.

ENGLISH_TECHNICAL_TERMS = [

    "stack",
    "queue",
    "lifo",
    "fifo",
    "array",
    "arrays",
    "linked list",
    "linked lists",
    "tree",
    "trees",
    "graph",
    "graphs",

    "data",
    "structure",
    "structures",
    "algorithm",
    "algorithms",

    "program",
    "programming",
    "function",
    "functions",

    "class",
    "classes",
    "object",
    "objects",

    "memory",
    "database",
    "databases",

    "system",
    "systems",
    "operation",
    "operations",

    "principle",
    "example",
    "examples",

    "computer",
    "software",
    "hardware",

    "variable",
    "variables",
    "pointer",
    "pointers",

    "recursion",
    "sorting",
    "searching",

    "machine learning",
    "artificial intelligence",
    "neural network",
    "deep learning",

    "python",
    "java",
    "javascript",
    "c++",
    "sql",

    "browser",
    "browsers",
    "printer",
    "application",
]


def normalize_for_detection(text: str) -> str:
    """
    Normalize text only for detection.

    The original transcript is NOT modified here.
    """

    text = text.lower()

    # Replace punctuation with spaces except hyphens.
    text = re.sub(
        r"[.,!?;:()\[\]{}\"']",
        " ",
        text
    )

    # Normalize repeated spaces.
    text = re.sub(
        r"\s+",
        " ",
        text
    )

    return text.strip()


def count_tanglish_markers(text: str) -> int:
    """
    Count likely Romanized Tamil words/phrases.
    """

    normalized = normalize_for_detection(text)

    count = 0

    for marker in TANGLISH_MARKERS:

        marker = marker.lower()

        if " " in marker or "-" in marker:

            if marker in normalized:
                count += 1

        else:

            pattern = r"\b" + re.escape(marker) + r"\b"

            if re.search(
                pattern,
                normalized
            ):
                count += 1

    return count


def count_technical_terms(text: str) -> int:
    """
    Count English technical terms.

    These terms help distinguish ordinary English from
    Tamil + English academic code-switching.
    """

    normalized = normalize_for_detection(text)

    count = 0

    for term in ENGLISH_TECHNICAL_TERMS:

        term = term.lower()

        if " " in term:

            if term in normalized:
                count += 1

        else:

            pattern = r"\b" + re.escape(term) + r"\b"

            if re.search(
                pattern,
                normalized
            ):
                count += 1

    return count


def detect_tanglish(text: str) -> bool:
    """
    Detect probable Tanglish.

    Tanglish here means Romanized Tamil mixed with
    English / English technical terms.

    Example:

        "Innaiku namma stack pathi padikka porom"

    The transcript contains:
        - Romanized Tamil markers
        - English technical terminology

    Therefore it is likely Tanglish.

    This is a heuristic, not a perfect language classifier.
    """

    if not text:
        return False

    tanglish_count = count_tanglish_markers(text)
    technical_count = count_technical_terms(text)

    # Strong Tanglish signal:
    # at least 2 Tamil markers + 1 English technical term.
    if tanglish_count >= 2 and technical_count >= 1:
        return True

    # General Tanglish speech:
    # at least 3 Romanized Tamil markers.
    if tanglish_count >= 3:
        return True

    return False


def detect_tamil_script(text: str) -> bool:
    """
    Detect actual Tamil Unicode characters.

    Example:
        "இன்னைக்கு நம்ம stack பற்றி படிக்கப் போறோம்"

    This is useful when Tamil script and English are mixed.
    """

    if not text:
        return False

    return bool(
        re.search(
            r"[\u0B80-\u0BFF]",
            text
        )
    )


def detect_code_switching(
    text: str,
    detected_language: str
) -> bool:
    """
    Detect Tamil + English/code-switched speech.

    Supports both:

    1. Romanized Tamil / Tanglish
       Example:
       "Innaiku namma stack pathi padikka porom"

    2. Tamil Unicode + English
       Example:
       "இன்னைக்கு நம்ம stack பற்றி படிக்கப் போறோம்"
    """

    if not text:
        return False

    tanglish = detect_tanglish(text)

    tamil_script = detect_tamil_script(text)

    technical_terms = count_technical_terms(text)

    # Romanized Tamil + English
    if tanglish:
        return True

    # Tamil script + English technical vocabulary
    if tamil_script and technical_terms >= 1:
        return True

    return False


# ============================================================
# LANGUAGE LABEL
# ============================================================

def get_language_label(
    language: str,
    is_code_switched: bool = False
) -> str:
    """
    Generate a user-friendly language label.

    Whisper may report "English" for Tanglish because
    Tanglish uses Roman/English characters.

    Therefore, if code-switching is detected, we show
    "Tanglish (Tamil + English)" instead.
    """

    if is_code_switched:
        return "Tanglish (Tamil + English)"

    language = (
        language or "unknown"
    ).lower().strip()

    language_labels = {

        "en": "English",
        "ta": "Tamil",

        "hi": "Hindi",
        "te": "Telugu",
        "ml": "Malayalam",
        "kn": "Kannada",

        "fr": "French",
        "de": "German",
        "es": "Spanish",
        "it": "Italian",

        "ja": "Japanese",
        "ko": "Korean",
        "zh": "Chinese",
    }

    return language_labels.get(
        language,
        language.upper()
        if language
        else "Unknown"
    )


# ============================================================
# TRANSCRIBE AUDIO
# ============================================================

def transcribe_audio(audio_path: str):

    print(
        f"Transcribing audio: {audio_path}"
    )

    # --------------------------------------------------------
    # Whisper automatically detects the dominant language.
    #
    # IMPORTANT:
    # We DO NOT force:
    #
    #     language="en"
    #
    # or:
    #
    #     language="ta"
    #
    # because the lecture may contain both.
    # --------------------------------------------------------

    result = model.transcribe(

        audio_path,

        # Automatic language detection
        language=None,

        # GPU optimization
        fp16=(DEVICE == "cuda"),

        # Do not print Whisper's long internal output
        verbose=False
    )

    # --------------------------------------------------------
    # Whisper detected language
    # --------------------------------------------------------

    detected_language = result.get(
        "language",
        "unknown"
    )

    # --------------------------------------------------------
    # Correct complete transcript
    # --------------------------------------------------------

    corrected_text = correct_transcript_text(
        result.get("text", "")
    )

    # --------------------------------------------------------
    # Detect Tanglish / code-switching
    # --------------------------------------------------------

    is_code_switched = detect_code_switching(
        corrected_text,
        detected_language
    )

    # --------------------------------------------------------
    # Generate final language label
    # --------------------------------------------------------

    language_label = get_language_label(
        detected_language,
        is_code_switched
    )

    # --------------------------------------------------------
    # Timestamped segments
    # --------------------------------------------------------

    corrected_segments = []

    for segment in result.get(
        "segments",
        []
    ):

        raw_text = segment.get(
            "text",
            ""
        ).strip()

        corrected_text_segment = (
            correct_transcript_text(
                raw_text
            )
        )

        corrected_segments.append(
            {
                "start": float(
                    segment.get(
                        "start",
                        0
                    )
                ),

                "end": float(
                    segment.get(
                        "end",
                        0
                    )
                ),

                "text": corrected_text_segment
            }
        )

    # --------------------------------------------------------
    # Final response
    # --------------------------------------------------------

    return {

        # Full original-style transcript
        # with only conservative corrections.
        "text": corrected_text,

        # Timestamped transcript.
        "segments": corrected_segments,

        # Whisper's detected language.
        "language": detected_language,

        # User-friendly language label.
        "language_label": language_label,

        # True when Tamil + English mixing is detected.
        "is_code_switched": is_code_switched
    }


# ============================================================
# TEST
# ============================================================

if __name__ == "__main__":

    audio_path = (
        r"C:\infinix-aiml\backend\uploads\tanglish_test.wav"
    )

    result = transcribe_audio(
        audio_path
    )

    print(
        "\n========== DETECTED LANGUAGE ==========\n"
    )

    print(
        f"Whisper Language : "
        f"{result['language']}"
    )

    print(
        f"Display Language  : "
        f"{result['language_label']}"
    )

    print(
        f"Code-Switched    : "
        f"{result['is_code_switched']}"
    )

    print(
        "\n========== CORRECTED TRANSCRIPT ==========\n"
    )

    print(
        result["text"]
    )

    print(
        "\n========== CORRECTED SEGMENTS ==========\n"
    )

    for segment in result["segments"]:

        print(
            f"{segment['start']:.2f} - "
            f"{segment['end']:.2f} | "
            f"{segment['text']}"
        )