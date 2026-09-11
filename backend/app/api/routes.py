from pathlib import Path
import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, File, Header, HTTPException, UploadFile
from fastapi.responses import PlainTextResponse, StreamingResponse

from app.services.transcription_service import transcribe_audio
from app.services.diarization_service import (
    diarize_audio,
    align_transcript_with_speakers,
)
from app.services.summary_service import generate_lecture_analysis


router = APIRouter(prefix="/api", tags=["Lecture Intelligence"])


# ============================================================
# DIRECTORIES
# ============================================================

UPLOAD_DIR = Path("uploads")
RESULT_DIR = Path("results")

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
RESULT_DIR.mkdir(parents=True, exist_ok=True)


# ============================================================
# ALLOWED AUDIO FILES
# ============================================================

ALLOWED_EXTENSIONS = {
    ".wav",
    ".mp3",
    ".m4a",
    ".mp4",
    ".webm",
    ".ogg",
    ".flac",
}


# ============================================================
# HELPERS
# ============================================================

def load_result(job_id: str):
    result_file = RESULT_DIR / f"{job_id}.json"

    if not result_file.exists():
        raise HTTPException(
            status_code=404,
            detail="Analysis result not found for this job ID",
        )

    try:
        with result_file.open("r", encoding="utf-8") as file:
            return json.load(file)

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to read analysis result: {str(e)}",
        )


def normalize_user_email(email):
    """
    Normalize the demo-auth email used by the frontend.
    Authentication itself is handled by the frontend for the hackathon demo.
    The backend uses this value only to separate saved history records.
    """
    if not email:
        return None

    email = str(email).strip().lower()
    return email or None


def get_history_user(x_user_email):
    return normalize_user_email(x_user_email)


def build_history_item(result):
    """
    Convert a full saved result into the lightweight object needed by History.
    """
    analysis = result.get("analysis", {}) or {}
    transcription = result.get("transcription", {}) or {}
    segments = transcription.get("segments", []) or []

    speakers = {
        str(segment.get("speaker"))
        for segment in segments
        if segment.get("speaker")
        and str(segment.get("speaker")).upper() != "UNKNOWN"
    }

    topic_count = len(analysis.get("topics", []) or [])
    speaker_count = len(speakers)

    # Prefer the actual diarization list when available.
    diarization = result.get("diarization", []) or []
    diarization_speakers = {
        str(item.get("speaker"))
        for item in diarization
        if isinstance(item, dict)
        and item.get("speaker")
    }
    if diarization_speakers:
        speaker_count = len(diarization_speakers)

    duration = 0.0
    if segments:
        try:
            duration = max(
                float(segment.get("end", 0) or 0)
                for segment in segments
            )
        except (TypeError, ValueError):
            duration = 0.0

    return {
        "job_id": result.get("job_id"),
        "filename": result.get("filename", "Unknown Lecture"),
        "audio_url": result.get("audio_url"),
        "status": result.get("status", "complete"),
        "created_at": result.get("created_at"),
        "user_email": result.get("user_email"),
        "duration_seconds": round(duration, 2),
        "topic_count": topic_count,
        "speaker_count": speaker_count,
        "summary": analysis.get("summary", ""),
    }


def result_belongs_to_user(result, user_email):
    """
    If a history request includes an email, only return records belonging
    to that email. Older records without an owner remain visible only when
    no email filter is supplied.
    """
    if not user_email:
        return True

    saved_email = normalize_user_email(result.get("user_email"))

    # Backward compatibility for analyses created before history ownership
    # was added. Those older result files have no user_email, so keep them
    # visible instead of making them disappear from History.
    if not saved_email:
        return True

    return saved_email == user_email


def find_result_file(job_id):
    result_file = RESULT_DIR / f"{job_id}.json"

    if not result_file.exists():
        raise HTTPException(
            status_code=404,
            detail="Analysis result not found for this job ID",
        )

    return result_file


def format_timestamp(seconds):
    try:
        seconds = int(float(seconds))
    except (TypeError, ValueError):
        seconds = 0

    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60

    if hours > 0:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"

    return f"{minutes:02d}:{secs:02d}"


def build_report_text(result):
    analysis = result.get("analysis", {})
    transcription = result.get("transcription", {})

    segments = transcription.get("segments", [])

    lines = []

    lines.append("LECTURE INTELLIGENCE REPORT")
    lines.append("=" * 70)
    lines.append("")

    lines.append(
        f"Lecture: {result.get('filename', 'Unknown')}"
    )

    lines.append("")

    # ========================================================
    # SUMMARY
    # ========================================================

    lines.append("OVERALL LECTURE SUMMARY")
    lines.append("-" * 70)

    lines.append(
        analysis.get(
            "summary",
            "No summary available."
        )
    )

    lines.append("")

    # ========================================================
    # STRUCTURED NOTES
    # ========================================================

    lines.append("STRUCTURED LECTURE NOTES")
    lines.append("-" * 70)

    topics = analysis.get("topics", [])

    for index, topic in enumerate(topics, 1):

        lines.append("")
        lines.append(
            f"{index}. {topic.get('title', 'Untitled Topic')}"
        )

        start = topic.get("start_time")
        end = topic.get("end_time")

        if start is not None and end is not None:
            lines.append(
                f"Timestamp: "
                f"{format_timestamp(start)} - "
                f"{format_timestamp(end)}"
            )

        lines.append("")

        for point in topic.get("points", []):

            lines.append(
                f"• {point}"
            )

        if topic.get("important"):

            important_note = topic.get(
                "important_note",
                "Important topic"
            )

            lines.append("")
            lines.append(
                f"⭐ Important: {important_note}"
            )

    lines.append("")

    # ========================================================
    # KEY TAKEAWAYS
    # ========================================================

    lines.append("KEY TAKEAWAYS")
    lines.append("-" * 70)

    for takeaway in analysis.get(
        "key_takeaways",
        []
    ):

        lines.append(
            f"• {takeaway}"
        )

    lines.append("")

    # ========================================================
    # EXAM POINTS
    # ========================================================

    lines.append("EXAM / IMPORTANT POINTS")
    lines.append("-" * 70)

    for point in analysis.get(
        "exam_points",
        []
    ):

        lines.append(
            f"⭐ {point}"
        )

    lines.append("")

    # ========================================================
    # SPEAKER ANALYSIS
    # ========================================================

    lines.append("SPEAKER ANALYSIS")
    lines.append("-" * 70)

    for speaker in analysis.get(
        "speaker_insights",
        []
    ):

        lines.append("")
        lines.append(
            speaker.get(
                "speaker",
                "UNKNOWN"
            )
        )

        lines.append(
            f"Role: {speaker.get('role', 'Unknown')}"
        )

        lines.append("")

        lines.append("Contributions:")

        for contribution in speaker.get(
            "contributions",
            []
        ):

            lines.append(
                f"• {contribution}"
            )

        action_items = speaker.get(
            "action_items",
            []
        )

        if action_items:

            lines.append("")
            lines.append("Action Items:")

            for action in action_items:

                lines.append(
                    f"• {action}"
                )

    lines.append("")

    # ========================================================
    # FULL TRANSCRIPT
    # ========================================================

    lines.append("FULL TRANSCRIPT")
    lines.append("-" * 70)

    for segment in segments:

        start = format_timestamp(
            segment.get("start", 0)
        )

        speaker = segment.get(
            "speaker",
            "UNKNOWN"
        )

        text = segment.get(
            "text",
            ""
        ).strip()

        lines.append(
            f"[{start}] {speaker}: {text}"
        )

    return "\n".join(lines)


# ============================================================
# UPLOAD AUDIO
# ============================================================

@router.post("/upload")
async def upload_audio(
    file: UploadFile = File(...),
    x_user_email: str | None = Header(default=None),
):

    extension = Path(
        file.filename or ""
    ).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:

        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported audio format. "
                "Use WAV, MP3, M4A, MP4, WEBM, OGG or FLAC."
            ),
        )

    job_id = str(uuid.uuid4())

    safe_filename = (
        f"{job_id}{extension}"
    )

    audio_path = UPLOAD_DIR / safe_filename

    try:

        with audio_path.open(
            "wb"
        ) as buffer:

            while True:

                chunk = await file.read(
                    1024 * 1024
                )

                if not chunk:
                    break

                buffer.write(chunk)

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to save uploaded audio: {str(e)}",
        )

    return {
        "job_id": job_id,
        "filename": file.filename,
        "audio_url": f"/uploads/{safe_filename}",
        "status": "uploaded",
        "user_email": normalize_user_email(x_user_email),
    }


# ============================================================
# TRANSCRIBE
# ============================================================

@router.post("/transcribe/{job_id}")
async def transcribe_job(
    job_id: str
):

    audio_files = list(
        UPLOAD_DIR.glob(
            f"{job_id}.*"
        )
    )

    if not audio_files:

        raise HTTPException(
            status_code=404,
            detail="Audio file not found for this job ID",
        )

    audio_path = audio_files[0]

    try:

        transcription = transcribe_audio(
            str(audio_path)
        )

        return {
            "job_id": job_id,
            "filename": audio_path.name,
            "status": "transcribed",
            "transcription": transcription,
        }

    except Exception as e:

        print(
            f"Transcription failed: {str(e)}"
        )

        raise HTTPException(
            status_code=500,
            detail=f"Transcription failed: {str(e)}",
        )


# ============================================================
# ANALYZE
# ============================================================

@router.post("/analyze/{job_id}")
async def analyze_job(
    job_id: str,
    x_user_email: str | None = Header(default=None),
):

    audio_files = list(
        UPLOAD_DIR.glob(
            f"{job_id}.*"
        )
    )

    if not audio_files:

        raise HTTPException(
            status_code=404,
            detail="Audio file not found for this job ID",
        )

    audio_path = audio_files[0]

    try:

        print(
            "=============================================="
        )

        print(
            f"Starting analysis for: {audio_path.name}"
        )

        # ----------------------------------------------------
        # WHISPER
        # ----------------------------------------------------

        print(
            "[1/4] Running Whisper transcription..."
        )

        transcription = transcribe_audio(
            str(audio_path)
        )

        transcript_segments = transcription.get(
            "segments",
            []
        )

        print(
            f"Whisper segments: "
            f"{len(transcript_segments)}"
        )

        # ----------------------------------------------------
        # DIARIZATION
        # ----------------------------------------------------

        print(
            "[2/4] Running speaker diarization..."
        )

        speaker_segments = diarize_audio(
            str(audio_path)
        )

        print(
            f"Speaker segments: "
            f"{len(speaker_segments)}"
        )

        # ----------------------------------------------------
        # ALIGNMENT
        # ----------------------------------------------------

        print(
            "[3/4] Aligning transcript with speakers..."
        )

        aligned_segments = (
            align_transcript_with_speakers(
                transcript_segments,
                speaker_segments,
            )
        )

        transcription[
            "segments"
        ] = aligned_segments

        # ----------------------------------------------------
        # AI ANALYSIS
        # ----------------------------------------------------

        print(
            "[4/4] Running AI lecture analysis..."
        )

        analysis = generate_lecture_analysis(
            aligned_segments
        )

        result = {

            "job_id": job_id,

            "filename": audio_path.name,

            "audio_url":
                f"/uploads/{audio_path.name}",

            "status":
                "complete",

            "created_at":
                datetime.now(timezone.utc).isoformat(),

            "user_email":
                normalize_user_email(x_user_email),

            "transcription":
                transcription,

            "analysis":
                analysis,
        }

        # ----------------------------------------------------
        # SAVE RESULT
        # ----------------------------------------------------

        result_file = (
            RESULT_DIR /
            f"{job_id}.json"
        )

        with result_file.open(
            "w",
            encoding="utf-8"
        ) as file:

            json.dump(
                result,
                file,
                ensure_ascii=False,
                indent=2,
            )

        print(
            f"Result saved: {result_file}"
        )

        print(
            "=============================================="
        )

        return result

    except Exception as e:

        print(
            f"Analysis failed: {str(e)}"
        )

        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(e)}",
        )


# ============================================================
# GET SAVED RESULT
# ============================================================

@router.get("/result/{job_id}")
async def get_result(
    job_id: str,
    x_user_email: str | None = Header(default=None),
):
    result = load_result(job_id)
    user_email = get_history_user(x_user_email)

    if user_email and not result_belongs_to_user(result, user_email):
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this lecture result",
        )

    return result


# ============================================================
# HISTORY
# ============================================================

@router.get("/history")
async def get_history(
    x_user_email: str | None = Header(default=None),
):
    """
    Return all completed lecture analyses.

    The frontend sends the currently logged-in demo user's email through
    X-User-Email. This keeps each user's history separated without adding
    a database dependency during the hackathon.
    """
    user_email = get_history_user(x_user_email)
    history = []

    for result_file in RESULT_DIR.glob("*.json"):
        try:
            with result_file.open("r", encoding="utf-8") as file:
                result = json.load(file)
        except (json.JSONDecodeError, OSError) as e:
            print(
                f"Skipping unreadable history file "
                f"{result_file.name}: {e}"
            )
            continue

        if user_email and not result_belongs_to_user(
            result,
            user_email,
        ):
            continue

        item = build_history_item(result)

        if not item.get("job_id"):
            continue

        history.append(item)

    # Newest sessions first.
    history.sort(
        key=lambda item: item.get("created_at") or "",
        reverse=True,
    )

    return {
        "count": len(history),
        "history": history,
    }


# ============================================================
# DELETE HISTORY ITEM
# ============================================================

@router.delete("/history/{job_id}")
async def delete_history(
    job_id: str,
    x_user_email: str | None = Header(default=None),
):
    """
    Delete one saved analysis and its uploaded audio file.
    """
    result_file = find_result_file(job_id)
    result = load_result(job_id)

    user_email = get_history_user(x_user_email)

    if user_email and not result_belongs_to_user(
        result,
        user_email,
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to delete this lecture",
        )

    deleted_audio = False

    audio_url = result.get("audio_url")
    if audio_url:
        audio_name = Path(str(audio_url)).name
        audio_path = UPLOAD_DIR / audio_name

        if audio_path.exists():
            try:
                audio_path.unlink()
                deleted_audio = True
            except OSError as e:
                print(
                    f"Could not delete audio file "
                    f"{audio_path}: {e}"
                )

    # Also remove a matching audio file if audio_url was not present.
    if not deleted_audio:
        for audio_path in UPLOAD_DIR.glob(f"{job_id}.*"):
            try:
                audio_path.unlink()
                deleted_audio = True
            except OSError as e:
                print(
                    f"Could not delete audio file "
                    f"{audio_path}: {e}"
                )

    try:
        result_file.unlink()
    except OSError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete history result: {str(e)}",
        )

    return {
        "job_id": job_id,
        "status": "deleted",
        "audio_deleted": deleted_audio,
        "message": "Lecture history deleted successfully",
    }


# ============================================================
# EXPORT TXT
# ============================================================

@router.get("/export/{job_id}/txt")
async def export_txt(
    job_id: str
):

    result = load_result(
        job_id
    )

    try:

        content = build_report_text(
            result
        )

        return PlainTextResponse(

            content=content,

            media_type="text/plain",

            headers={
                "Content-Disposition":
                    (
                        f'attachment; '
                        f'filename="lecture_{job_id}.txt"'
                    )
            },
        )

    except Exception as e:

        print(
            f"TXT export failed: {str(e)}"
        )

        raise HTTPException(
            status_code=500,
            detail=f"TXT export failed: {str(e)}",
        )


# ============================================================
# EXPORT PDF
# ============================================================

@router.get("/export/{job_id}/pdf")
async def export_pdf(
    job_id: str
):

    result = load_result(
        job_id
    )

    try:

        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.lib.enums import TA_CENTER
        from reportlab.lib.units import mm
        from reportlab.platypus import (
            SimpleDocTemplate,
            Paragraph,
            Spacer,
            PageBreak,
        )
        from xml.sax.saxutils import escape
        import io

        analysis = result.get(
            "analysis",
            {}
        )

        buffer = io.BytesIO()

        document = SimpleDocTemplate(

            buffer,

            pagesize=A4,

            rightMargin=18 * mm,

            leftMargin=18 * mm,

            topMargin=18 * mm,

            bottomMargin=18 * mm,

            title="Lecture Intelligence Report",
        )

        styles = getSampleStyleSheet()

        title_style = styles["Title"]

        title_style.alignment = TA_CENTER

        heading_style = styles["Heading1"]

        subheading_style = styles["Heading2"]

        body_style = styles["BodyText"]

        story = []

        # ----------------------------------------------------
        # TITLE
        # ----------------------------------------------------

        story.append(
            Paragraph(
                "LECTURE INTELLIGENCE REPORT",
                title_style,
            )
        )

        story.append(
            Spacer(1, 8)
        )

        story.append(
            Paragraph(
                escape(
                    str(
                        result.get(
                            "filename",
                            "Unknown Lecture"
                        )
                    )
                ),
                body_style,
            )
        )

        story.append(
            Spacer(1, 15)
        )

        # ----------------------------------------------------
        # SUMMARY
        # ----------------------------------------------------

        story.append(
            Paragraph(
                "Overall Lecture Summary",
                heading_style,
            )
        )

        story.append(
            Paragraph(
                escape(
                    str(
                        analysis.get(
                            "summary",
                            "No summary available."
                        )
                    )
                ),
                body_style,
            )
        )

        story.append(
            Spacer(1, 12)
        )

        # ----------------------------------------------------
        # TOPICS
        # ----------------------------------------------------

        story.append(
            Paragraph(
                "Structured Lecture Notes",
                heading_style,
            )
        )

        for index, topic in enumerate(
            analysis.get(
                "topics",
                []
            ),
            1,
        ):

            story.append(
                Paragraph(
                    f"{index}. "
                    f"{escape(str(topic.get('title', 'Untitled Topic')))}",
                    subheading_style,
                )
            )

            start = topic.get(
                "start_time"
            )

            end = topic.get(
                "end_time"
            )

            if (
                start is not None
                and end is not None
            ):

                story.append(
                    Paragraph(
                        (
                            f"Timestamp: "
                            f"{format_timestamp(start)} - "
                            f"{format_timestamp(end)}"
                        ),
                        body_style,
                    )
                )

            story.append(
                Spacer(1, 4)
            )

            for point in topic.get(
                "points",
                []
            ):

                story.append(
                    Paragraph(
                        "• "
                        + escape(
                            str(point)
                        ),
                        body_style,
                    )
                )

                story.append(
                    Spacer(1, 2)
                )

            important_note = topic.get(
                "important_note"
            )

            if (
                topic.get("important")
                and important_note
            ):

                story.append(
                    Paragraph(
                        (
                            "<b>Important:</b> "
                            + escape(
                                str(
                                    important_note
                                )
                            )
                        ),
                        body_style,
                    )
                )

            story.append(
                Spacer(1, 10)
            )

        # ----------------------------------------------------
        # TAKEAWAYS
        # ----------------------------------------------------

        story.append(
            PageBreak()
        )

        story.append(
            Paragraph(
                "Key Takeaways",
                heading_style,
            )
        )

        for takeaway in analysis.get(
            "key_takeaways",
            []
        ):

            story.append(
                Paragraph(
                    "• "
                    + escape(
                        str(takeaway)
                    ),
                    body_style,
                )
            )

            story.append(
                Spacer(1, 3)
            )

        story.append(
            Spacer(1, 10)
        )

        # ----------------------------------------------------
        # EXAM POINTS
        # ----------------------------------------------------

        story.append(
            Paragraph(
                "Exam / Important Points",
                heading_style,
            )
        )

        for point in analysis.get(
            "exam_points",
            []
        ):

            story.append(
                Paragraph(
                    "⭐ "
                    + escape(
                        str(point)
                    ),
                    body_style,
                )
            )

            story.append(
                Spacer(1, 3)
            )

        story.append(
            Spacer(1, 10)
        )

        # ----------------------------------------------------
        # SPEAKER ANALYSIS
        # ----------------------------------------------------

        story.append(
            Paragraph(
                "Speaker Analysis",
                heading_style,
            )
        )

        for speaker in analysis.get(
            "speaker_insights",
            []
        ):

            story.append(
                Paragraph(
                    escape(
                        str(
                            speaker.get(
                                "speaker",
                                "UNKNOWN"
                            )
                        )
                    ),
                    subheading_style,
                )
            )

            story.append(
                Paragraph(
                    (
                        "Role: "
                        + escape(
                            str(
                                speaker.get(
                                    "role",
                                    "Unknown"
                                )
                            )
                        )
                    ),
                    body_style,
                )
            )

            story.append(
                Spacer(1, 4)
            )

            for contribution in speaker.get(
                "contributions",
                []
            ):

                story.append(
                    Paragraph(
                        "• "
                        + escape(
                            str(
                                contribution
                            )
                        ),
                        body_style,
                    )
                )

            story.append(
                Spacer(1, 8)
            )

        document.build(
            story
        )

        buffer.seek(0)

        return StreamingResponse(

            buffer,

            media_type="application/pdf",

            headers={
                "Content-Disposition":
                    (
                        f'attachment; '
                        f'filename="lecture_{job_id}.pdf"'
                    )
            },
        )

    except Exception as e:

        print(
            f"PDF export failed: {str(e)}"
        )

        raise HTTPException(
            status_code=500,
            detail=f"PDF export failed: {str(e)}",
        )


# ============================================================
# EXPORT WORD / DOCX
# ============================================================

@router.get("/export/{job_id}/docx")
async def export_docx(
    job_id: str
):

    result = load_result(
        job_id
    )

    try:

        from docx import Document
        from docx.shared import Pt
        from docx.enum.text import WD_ALIGN_PARAGRAPH
        import io

        analysis = result.get(
            "analysis",
            {}
        )

        document = Document()

        # ----------------------------------------------------
        # TITLE
        # ----------------------------------------------------

        title = document.add_heading(
            "LECTURE INTELLIGENCE REPORT",
            0,
        )

        title.alignment = (
            WD_ALIGN_PARAGRAPH.CENTER
        )

        paragraph = document.add_paragraph()

        paragraph.add_run(
            "Lecture: "
        ).bold = True

        paragraph.add_run(
            str(
                result.get(
                    "filename",
                    "Unknown"
                )
            )
        )

        # ----------------------------------------------------
        # SUMMARY
        # ----------------------------------------------------

        document.add_heading(
            "Overall Lecture Summary",
            level=1,
        )

        document.add_paragraph(
            str(
                analysis.get(
                    "summary",
                    "No summary available."
                )
            )
        )

        # ----------------------------------------------------
        # TOPICS
        # ----------------------------------------------------

        document.add_heading(
            "Structured Lecture Notes",
            level=1,
        )

        for index, topic in enumerate(
            analysis.get(
                "topics",
                []
            ),
            1,
        ):

            document.add_heading(
                (
                    f"{index}. "
                    f"{topic.get('title', 'Untitled Topic')}"
                ),
                level=2,
            )

            start = topic.get(
                "start_time"
            )

            end = topic.get(
                "end_time"
            )

            if (
                start is not None
                and end is not None
            ):

                timestamp = document.add_paragraph()

                timestamp.add_run(
                    "Timestamp: "
                ).bold = True

                timestamp.add_run(
                    (
                        f"{format_timestamp(start)} - "
                        f"{format_timestamp(end)}"
                    )
                )

            for point in topic.get(
                "points",
                []
            ):

                document.add_paragraph(
                    str(point),
                    style="List Bullet",
                )

            if topic.get(
                "important"
            ):

                note = topic.get(
                    "important_note"
                )

                if note:

                    paragraph = document.add_paragraph()

                    paragraph.add_run(
                        "IMPORTANT: "
                    ).bold = True

                    paragraph.add_run(
                        str(note)
                    )

        # ----------------------------------------------------
        # TAKEAWAYS
        # ----------------------------------------------------

        document.add_heading(
            "Key Takeaways",
            level=1,
        )

        for takeaway in analysis.get(
            "key_takeaways",
            []
        ):

            document.add_paragraph(
                str(takeaway),
                style="List Bullet",
            )

        # ----------------------------------------------------
        # EXAM POINTS
        # ----------------------------------------------------

        document.add_heading(
            "Exam / Important Points",
            level=1,
        )

        for point in analysis.get(
            "exam_points",
            []
        ):

            document.add_paragraph(
                str(point),
                style="List Bullet",
            )

        # ----------------------------------------------------
        # SPEAKER ANALYSIS
        # ----------------------------------------------------

        document.add_heading(
            "Speaker Analysis",
            level=1,
        )

        for speaker in analysis.get(
            "speaker_insights",
            []
        ):

            document.add_heading(
                str(
                    speaker.get(
                        "speaker",
                        "UNKNOWN"
                    )
                ),
                level=2,
            )

            document.add_paragraph(
                (
                    "Role: "
                    + str(
                        speaker.get(
                            "role",
                            "Unknown"
                        )
                    )
                )
            )

            for contribution in speaker.get(
                "contributions",
                []
            ):

                document.add_paragraph(
                    str(contribution),
                    style="List Bullet",
                )

        # ----------------------------------------------------
        # SAVE TO MEMORY BUFFER
        # ----------------------------------------------------

        buffer = io.BytesIO()

        document.save(
            buffer
        )

        buffer.seek(0)

        return StreamingResponse(

            buffer,

            media_type=(
                "application/vnd.openxmlformats-officedocument."
                "wordprocessingml.document"
            ),

            headers={
                "Content-Disposition":
                    (
                        f'attachment; '
                        f'filename="lecture_{job_id}.docx"'
                    )
            },
        )

    except Exception as e:

        print(
            f"DOCX export failed: {str(e)}"
        )

        raise HTTPException(
            status_code=500,
            detail=f"DOCX export failed: {str(e)}",
        )
    # ============================================================
# AI FLASHCARDS
# ============================================================

# ============================================================
# FLASHCARDS
# Generated from the already-completed lecture analysis.
# No additional Gemini API call required.
# ============================================================

@router.post("/flashcards/{job_id}")
async def generate_flashcards(job_id: str):

    result = load_result(job_id)

    try:
        analysis = result.get("analysis", {})

        topics = analysis.get("topics", [])
        exam_points = analysis.get("exam_points", [])
        takeaways = analysis.get("key_takeaways", [])

        flashcards = []
        seen_questions = set()

        def add_card(question, answer, topic):
            question = str(question).strip()
            answer = str(answer).strip()
            topic = str(topic).strip()

            if not question or not answer:
                return

            key = question.lower()

            if key in seen_questions:
                return

            seen_questions.add(key)

            flashcards.append({
                "id": len(flashcards) + 1,
                "question": question,
                "answer": answer,
                "topic": topic,
            })

        # ----------------------------------------------------
        # 1. Create cards from topic points
        # ----------------------------------------------------

        for topic in topics:

            title = topic.get(
                "title",
                "General"
            )

            points = topic.get(
                "points",
                []
            )

            important_note = topic.get(
                "important_note"
            )

            # Important note becomes a direct revision card.
            if important_note:

                add_card(
                    f"What is the important point about {title}?",
                    important_note,
                    title
                )

            # Topic points become Q&A cards.
            for point in points:

                point = str(point).strip()

                if not point:
                    continue

                # Try to create a natural question.
                if point.endswith("?"):

                    question = point
                    answer = (
                        "Refer to the lecture explanation."
                    )

                else:

                    question = (
                        f"What should you know about {title}?"
                    )

                    answer = point

                add_card(
                    question,
                    answer,
                    title
                )

                # Avoid generating too many cards
                # from the same topic.
                if len(flashcards) >= 12:
                    break

            if len(flashcards) >= 12:
                break

        # ----------------------------------------------------
        # 2. Add exam-point cards if needed
        # ----------------------------------------------------

        for exam_point in exam_points:

            exam_point = str(
                exam_point
            ).strip()

            if not exam_point:
                continue

            # If already phrased as a question,
            # keep it.
            if exam_point.endswith("?"):

                question = exam_point

            else:

                question = (
                    f"Exam Question: {exam_point}"
                )

            # Find related answer from topic points.
            answer = None
            related_topic = "Exam Preparation"

            exam_words = set(
                exam_point.lower().split()
            )

            for topic in topics:

                title = str(
                    topic.get(
                        "title",
                        ""
                    )
                )

                points = topic.get(
                    "points",
                    []
                )

                for point in points:

                    point_words = set(
                        str(point)
                        .lower()
                        .split()
                    )

                    overlap = len(
                        exam_words &
                        point_words
                    )

                    if overlap >= 2:

                        answer = str(
                            point
                        ).strip()

                        related_topic = title
                        break

                if answer:
                    break

            if not answer:

                answer = (
                    "Review the related lecture topic "
                    "and its key concepts."
                )

            add_card(
                question,
                answer,
                related_topic
            )

            if len(flashcards) >= 15:
                break

        # ----------------------------------------------------
        # 3. Use takeaways if still too few cards
        # ----------------------------------------------------

        for takeaway in takeaways:

            if len(flashcards) >= 15:
                break

            takeaway = str(
                takeaway
            ).strip()

            if not takeaway:
                continue

            add_card(
                "What is a key takeaway from this lecture?",
                takeaway,
                "Key Takeaway"
            )

        # ----------------------------------------------------
        # 4. Limit final number
        # ----------------------------------------------------

        flashcards = flashcards[:15]

        return {
            "job_id": job_id,
            "flashcards": flashcards,
            "count": len(flashcards),
            "source": "lecture_analysis"
        }

    except Exception as e:

        print(
            f"Flashcard generation failed: {str(e)}"
        )

        raise HTTPException(
            status_code=500,
            detail=(
                f"Flashcard generation failed: {str(e)}"
            )
        )