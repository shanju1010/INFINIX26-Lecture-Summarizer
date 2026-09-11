

import os
import json
import re
from collections import defaultdict

from dotenv import load_dotenv
from google import genai


# ============================================================
# CONFIGURATION
# ============================================================

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

MODEL_NAME = "gemini-3.6-flash"

client = None

if GEMINI_API_KEY:
    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
        print("Gemini client initialized!")
    except Exception as e:
        print(f"Gemini initialization failed: {e}")
else:
    print("GEMINI_API_KEY not found. Fallback mode enabled.")


# ============================================================
# TIMESTAMP
# ============================================================

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


# ============================================================
# UNIQUE ITEMS
# ============================================================

def unique_items(items):
    result = []
    seen = set()

    for item in items or []:
        if not item:
            continue

        value = str(item).strip()

        if not value:
            continue

        key = value.lower()

        if key in seen:
            continue

        seen.add(key)
        result.append(value)

    return result


# ============================================================
# TEXT CLEANING
# ============================================================

def clean_text(text):

    if not text:
        return ""

    text = str(text).strip()

    replacements = {
        "lafor": "LIFO",
        "fiafor": "FIFO",
        "big old": "Big O",
        "big own": "Big O",

        "link list": "linked list",
        "link lists": "linked lists",
        "length list": "linked list",
        "length lists": "linked lists",

        "linkedlist": "linked list",
        "linkedlists": "linked lists",

        "array list": "ArrayList",
        "arraylist": "ArrayList",
    }

    for wrong, right in replacements.items():
        text = re.sub(
            rf"\b{re.escape(wrong)}\b",
            right,
            text,
            flags=re.IGNORECASE,
        )

    text = re.sub(r"\s+", " ", text)

    return text.strip()


# ============================================================
# TECHNICAL TERMS
# ============================================================

TECHNICAL_TERMS = [
    # General CS
    "algorithm",
    "algorithms",
    "data structure",
    "data structures",
    "programming",
    "function",
    "class",
    "object",
    "memory",
    "operation",
    "complexity",
    "time complexity",
    "space complexity",

    # Data structures
    "array",
    "arrays",
    "linked list",
    "linked lists",
    "stack",
    "stacks",
    "queue",
    "queues",
    "tree",
    "trees",
    "binary tree",
    "graph",
    "graphs",
    "vertex",
    "vertices",
    "edge",
    "edges",
    "push",
    "pop",
    "enqueue",
    "dequeue",
    "lifo",
    "fifo",

    # DBMS
    "dbms",
    "database",
    "databases",
    "normalization",
    "normalisation",
    "normal form",
    "normal forms",
    "1nf",
    "2nf",
    "3nf",
    "atomic",
    "atomic value",
    "data duplication",
    "duplication",
    "dependency",
    "dependencies",
    "partial dependency",
    "transitive dependency",
    "composite key",
    "non-key attribute",
    "non key attribute",
    "primary key",
    "foreign key",
    "functional dependency",
    "relation",
    "relations",
    "table",
    "tables",
    "tuple",
    "tuples",
    "attribute",
    "attributes",
]


# ============================================================
# TANGLISH MARKERS
# ============================================================

TANGLISH_MARKERS = [
    "namma",
    "nammal",
    "innaiku",
    "indha",
    "intha",
    "pathi",
    "padikka",
    "padipom",
    "porom",
    "irukku",
    "irukum",
    "irukkum",
    "pannuvom",
    "pannunga",
    "pannurathu",
    "pannura",
    "pannum",
    "pannanum",
    "aagum",
    "aaguthu",
    "epdi",
    "enna",
    "ethuku",
    "edhuku",
    "konjam",
    "clear",
    "puriyuthu",
    "puriyudhu",
    "purinjuka",
    "purinjukonga",
    "theriyum",
    "theriyanum",
    "venum",
    "venuma",
    "irukka",
    "irukka?",
    "mattum",
    "kudathu",
    "koodathu",
    "remove",
    "reduce",
    "store",
    "use",
    "follow",
    "explain",
    "discuss",
]


# ============================================================
# TAMIL SCRIPT DETECTION
# ============================================================

def contains_tamil_script(text):

    if not text:
        return False

    return bool(
        re.search(
            r"[\u0B80-\u0BFF]",
            text
        )
    )


# ============================================================
# TECHNICAL TERM DETECTION
# ============================================================

def contains_technical_term(text):

    lower = text.lower()

    return any(
        term in lower
        for term in TECHNICAL_TERMS
    )


# ============================================================
# TANGLISH DETECTION
# ============================================================

def contains_tanglish(text):

    lower = text.lower()

    count = sum(
        1
        for marker in TANGLISH_MARKERS
        if marker in lower
    )

    return count >= 1


# ============================================================
# QUESTION DETECTION
# ============================================================

def is_question(text):

    if not text:
        return False

    lower = text.lower().strip()

    if "?" in text:
        return True

    question_starts = [
        "what ",
        "why ",
        "how ",
        "when ",
        "where ",
        "which ",
        "who ",
        "can you ",
        "could you ",
        "do you ",
        "does ",
        "is ",
        "are ",
        "sir ",
        "mam ",
        "ma'am ",
        "enna ",
        "ethuku ",
        "edhuku ",
        "epdi ",
    ]

    return any(
        lower.startswith(prefix)
        for prefix in question_starts
    )


# ============================================================
# CONVERSATIONAL DETECTION
# ============================================================

def is_conversational(text):

    if not text:
        return True

    lower = text.lower().strip()

    conversational_starts = [
        "sir",
        "mam",
        "ma'am",
        "okay sir",
        "ok sir",
        "yes sir",
        "no sir",
        "yeah",
        "yep",
        "okay",
        "ok",
        "right",
        "exactly",
        "nice",
        "great",
        "perfect",
        "beautiful",
        "thank you",
        "thanks",
        "i think",
        "i feel",
        "i like",
        "i love",
        "i prefer",
        "i am confused",
        "i'm confused",
        "i understand",
        "i can understand",
        "now i can",
        "got it",
        "understood",
        "that makes sense",
        "sounds good",
        "what do you",
        "do you think",
        "can you",
        "could you",
        "how do",
        "why do",
    ]

    for phrase in conversational_starts:

        if lower == phrase:
            return True

        if lower.startswith(phrase + " "):
            return True

    return False


# ============================================================
# FILLER DETECTION
# ============================================================

def is_filler(text):

    if not text:
        return True

    lower = text.lower().strip()

    filler_phrases = [
        "okay so",
        "oh so",
        "nice then",
        "let's get started",
        "lets get started",
        "let's jump",
        "lets jump",
        "let's see",
        "lets see",
        "what do you think",
        "i am confused",
        "i'm confused",
        "don't worry",
        "beautiful",
        "perfect",
        "thank you",
        "thanks",
        "welcome",
    ]

    for phrase in filler_phrases:
        if phrase in lower:
            return True

    if lower in {
        "okay",
        "ok",
        "right",
        "alright",
        "yes",
        "no",
        "yeah",
        "yep",
        "beautiful",
        "perfect",
        "thanks",
    }:
        return True

    return False


# ============================================================
# META / INTRODUCTION DETECTION
# ============================================================

def is_meta_statement(text):

    if not text:
        return False

    lower = text.lower().strip()

    rejected_meta_phrases = [
        "today we're going to",
        "today we are going to",
        "today we will",
        "today we are",
        "in this video",
        "in this lecture",
        "in this section",
        "in the next section",
        "in the next video",
        "we're going to talk about",
        "we are going to talk about",
        "we'll be talking about",
        "we will be talking about",
        "next we're going to",
        "next we are going to",
        "we're going to look at",
        "we are going to look at",
        "we're going to learn",
        "we are going to learn",
        "we will learn",
        "let's start with",
        "lets start with",
        "let us start with",
        "before we talk about",
        "so in this section",
        "next, we're going",
        "finally, we're going",
        "now, to watch this video",
        "if you're serious about learning",
        "if you are serious about learning",
        "learn all the essential",
        "ultimate data structures",
        "subscribe",
        "course promotion",
        "interview preparation",
        "interview promotion",
        "more and more companies ask questions",
    ]

    return any(
        phrase in lower
        for phrase in rejected_meta_phrases
    )


# ============================================================
# REACTION DETECTION
# ============================================================

def is_reaction(text):

    if not text:
        return False

    lower = text.lower().strip()

    reaction_phrases = [
        "i understand",
        "i can understand",
        "now i understand",
        "now i can understand",
        "i got it",
        "got it",
        "that makes sense",
        "this is clear",
        "now it is clear",
        "now it's clear",
        "clear now",
        "i am clear",
        "i'm clear",
        "i was confused",
        "i am confused",
        "i'm confused",
        "it is easy",
        "it's easy",
        "easy to remember",
        "made it easy",
    ]

    return any(
        phrase in lower
        for phrase in reaction_phrases
    )


# ============================================================
# ACADEMIC STATEMENT FILTER
# ============================================================

def is_academic_statement(text: str) -> bool:

    if not text:
        return False

    text = clean_text(text)

    if not text:
        return False

    lower = text.lower().strip()

    # Too short.
    if len(text.split()) < 4:
        return False

    # Questions are not study-note facts.
    if is_question(text):
        return False

    # Obvious filler.
    if is_filler(text):
        return False

    # Introductions / promotions / previews.
    if is_meta_statement(text):
        return False

    # Student reactions.
    if is_reaction(text):
        return False

    # Personal opinions.
    opinion_starts = [
        "i like ",
        "i love ",
        "i prefer ",
        "i think ",
        "i feel ",
        "i believe ",
        "i guess ",
        "in my opinion",
        "for me ",
    ]

    if any(lower.startswith(x) for x in opinion_starts):
        return False

    # Do not reject a sentence merely because it contains
    # conversational words such as "sir" or "yes". Some
    # lecturer explanations may contain them.
    has_technical = contains_technical_term(text)
    has_tamil = contains_tamil_script(text)
    has_tanglish = contains_tanglish(text)

    # Tamil / Tanglish academic explanation.
    if has_technical and (has_tamil or has_tanglish):
        return True

    # English academic indicators.
    academic_indicators = [
        " is ",
        " are ",
        " means ",
        " refers to ",
        " defined ",
        " used ",
        " used for ",
        " used in ",
        " contains ",
        " stores ",
        " organizes ",
        " represents ",
        " consists ",
        " allows ",
        " supports ",
        " provides ",
        " called ",
        " known as ",
        " example ",
        " principle ",
        " definition ",
        " advantage ",
        " disadvantage ",
        " complexity ",
        " depends ",
        " dependency ",
        " remove ",
        " removes ",
        " reduces ",
        " reduce ",
        " requires ",
        " should ",
        " must ",
    ]

    has_indicator = any(
        indicator in f" {lower} "
        for indicator in academic_indicators
    )

    if has_indicator and has_technical:
        return True

    return False


# ============================================================
# ACADEMIC NORMALIZATION
# ============================================================

def normalize_academic_statement(text: str) -> str:

    text = clean_text(text)

    if not text:
        return ""

    # Remove conversational prefixes only when the remainder
    # is clearly academic.
    text = re.sub(
        r"^(okay|ok|exactly|yes|yeah|yep|nice|great|perfect|oh|ah|well)"
        r"\s*[,.:;-]\s*",
        "",
        text,
        flags=re.IGNORECASE,
    )

    # Remove common conversational trailing tags.
    text = re.sub(
        r"\s+(right|okay|ok|sir|mam|you know)\s*[?.!]*$",
        "",
        text,
        flags=re.IGNORECASE,
    )

    # Specific English rewrites.
    rewrites = [

        (
            r"^lifo means\s+(.+)$",
            r"LIFO stands for \1"
        ),

        (
            r"^fifo means\s+(.+)$",
            r"FIFO stands for \1"
        ),

        (
            r"^lifo is\s+(.+)$",
            r"LIFO stands for \1"
        ),

        (
            r"^fifo is\s+(.+)$",
            r"FIFO stands for \1"
        ),

        (
            r"^that is called fifo.*$",
            "FIFO stands for First In, First Out."
        ),

        (
            r"^that is called lifo.*$",
            "LIFO stands for Last In, First Out."
        ),

        (
            r"^for example queues are used in printer systems.*$",
            "Queues are used in printer systems."
        ),

        (
            r"^stack works like a pile of books.*$",
            "A stack can be illustrated using a pile-of-books analogy."
        ),
    ]

    for pattern, replacement in rewrites:

        if re.fullmatch(
            pattern,
            text,
            flags=re.IGNORECASE,
        ):
            return replacement

    return text.strip()


# ============================================================
# NORMALIZE SEGMENTS
# ============================================================

def normalize_segments(segments):

    normalized = []

    for segment in segments or []:

        try:
            start = float(
                segment.get(
                    "start",
                    0
                )
            )

            end = float(
                segment.get(
                    "end",
                    start
                )
            )

        except (TypeError, ValueError):
            continue

        text = clean_text(
            segment.get(
                "text",
                ""
            )
        )

        if not text:
            continue

        normalized.append({
            "start": start,
            "end": max(
                start,
                end
            ),
            "text": text,
            "speaker": segment.get(
                "speaker",
                "UNKNOWN"
            ),
        })

    normalized.sort(
        key=lambda x: x["start"]
    )

    return normalized


# ============================================================
# BUILD CHUNKS
# ============================================================

def build_chunks(
    segments,
    chunk_seconds=300
):

    if not segments:
        return []

    chunks = []

    current = []

    chunk_start = segments[0]["start"]

    for segment in segments:

        if (
            segment["start"] - chunk_start
            >= chunk_seconds
            and current
        ):

            chunks.append({
                "start": current[0]["start"],
                "end": current[-1]["end"],
                "segments": current,
            })

            current = []

            chunk_start = segment["start"]

        current.append(segment)

    if current:

        chunks.append({
            "start": current[0]["start"],
            "end": current[-1]["end"],
            "segments": current,
        })

    return chunks


# ============================================================
# FORMAT CHUNK TRANSCRIPT
# ============================================================

def format_chunk(chunk):

    lines = []

    for segment in chunk["segments"]:

        text = clean_text(segment["text"])

        if not text:
            continue

        # Remove only obvious filler.
        # Keep conversational context so Gemini can distinguish
        # lecturer explanations from student questions/reactions.
        if is_filler(text):
            continue

        lines.append(
            f"[{format_timestamp(segment['start'])}] "
            f"{segment['speaker']}: "
            f"{text}"
        )

    return "\n".join(lines)


# ============================================================
# STAGE 1 — FACT EXTRACTION
# ============================================================

def extract_facts_from_chunk(chunk):

    transcript = format_chunk(chunk)

    if not transcript:
        return []

    prompt = f"""
You are an expert university professor creating structured
study notes from a real lecture.

You are given ONE chronological section of a lecture.

The transcript may contain:

- English
- Tamil
- Tanglish
- Tamil + English technical terms
- lecturer explanations
- student questions
- student reactions
- conversational speech

Your job is to extract ONLY knowledge that was actually explained
or taught by the lecturer.

============================================================
LECTURE SECTION
============================================================

Time:
{format_timestamp(chunk["start"])}
to
{format_timestamp(chunk["end"])}

============================================================
TRANSCRIPT
============================================================

{transcript}

============================================================
CORE RULE
============================================================

Distinguish between:

1. STUDENT QUESTION
2. STUDENT REACTION
3. LECTURER EXPLANATION

Only #3 should become an academic fact.

For example:

Student:
"Sir, normalization எதுக்கு use பண்ணுறீங்க?"

DO NOT extract.

Lecturer:
"Databaseல same data repeated store ஆகுறது,
reduce பண்ண normalization use பண்ணுறும்."

EXTRACT as:

"Database normalization is used to reduce repeated data."

Student:
"அப்போ duplication reduce ஆகும் தானே sir?"

DO NOT extract.

Lecturer:
"Yes, duplication reduce ஆகும் and database maintain
பண்ணுறதும் easy ஆகும்."

EXTRACT as:

"Normalization reduces data duplication and makes
database maintenance easier."

============================================================
MORE EXAMPLES
============================================================

Student:
"Sir, 1NFல என்ன condition follow பண்ணணும்?"

DO NOT extract.

Lecturer:
"1NFல் each cellல single and atomic value மட்டும்
இருக்கணும். Multiple values store பண்ணக்கூடாது."

EXTRACT:

"1NF requires each cell to contain a single atomic value.
Multiple values should not be stored in a single cell."

Student:
"Sir, partial dependencyனா கொஞ்சம் confuse ஆகுது."

DO NOT extract.

Lecturer:
"Composite keyயோட one part மேல மட்டும் non-key attribute
depend ஆனால் அது partial dependency."

EXTRACT:

"Partial dependency occurs when a non-key attribute depends
on only part of a composite key."

Lecturer:
"3NFல் transitive dependency remove பண்ணணும்."

EXTRACT:

"3NF removes transitive dependency."

Lecturer:
"Non-key attribute another non-key attribute மேல
depend ஆகக்கூடாது."

EXTRACT:

"In 3NF, a non-key attribute should not depend on another
non-key attribute."

Student:
"இப்போ normalization concept clear ஆகுது sir."

DO NOT extract.

============================================================
DO NOT EXTRACT
============================================================

Never extract:

- greetings
- introductions
- topic previews
- "today we're going to..."
- "let's get started"
- "let's see"
- student questions
- student confusion
- student reactions
- "I understand"
- "Now I understand"
- "Now it is clear"
- "got it"
- "okay"
- "nice"
- "great"
- "perfect"
- "thank you"
- opinions
- advertisements
- course promotions
- interview promotions
- rhetorical questions
- filler
- repeated conversational statements

============================================================
EXTRACT
============================================================

Extract:

- definitions
- concepts
- principles
- characteristics
- rules
- conditions
- operations
- implementation details
- examples
- applications
- advantages
- disadvantages
- complexity
- comparisons
- dependencies
- relationships
- important exam concepts

============================================================
IMPORTANT
============================================================

Do NOT simply copy transcript sentences.

Convert conversational Tamil/Tanglish explanations into
concise academic statements.

Preserve important technical terminology such as:

DBMS
Database
Normalization
1NF
2NF
3NF
Partial Dependency
Transitive Dependency
Composite Key
Atomic Value
Primary Key
Foreign Key

Do not invent information that was not present in the transcript.

Do not create a topic merely because a word was mentioned.

============================================================
OUTPUT
============================================================

Return ONLY valid JSON.

{{
    "facts": [
        {{
            "topic": "Database Normalization",
            "fact": "Database normalization is used to reduce repeated data.",
            "timestamp": 9,
            "importance": "high"
        }}
    ]
}}

If there is no actual academic knowledge in this section:

{{
    "facts": []
}}

No markdown.
"""

    if not client:
        return []

    try:

        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
        )

        raw = response.text.strip()

        raw = re.sub(
            r"^```json\s*",
            "",
            raw,
            flags=re.IGNORECASE,
        )

        raw = re.sub(
            r"^```\s*",
            "",
            raw,
        )

        raw = re.sub(
            r"\s*```$",
            "",
            raw,
        )

        data = json.loads(raw)

        facts = data.get("facts", [])

        if not isinstance(facts, list):
            return []

        return facts

    except Exception as e:

        print(
            f"Fact extraction failed: {e}"
        )

        return []


# ============================================================
# FALLBACK FACT EXTRACTION
# ============================================================

def fallback_fact_extraction(chunk):

    facts = []

    for segment in chunk["segments"]:

        text = segment["text"]

        if not is_academic_statement(text):
            continue

        lower = text.lower()

        topic = None

        # ====================================================
        # DBMS / NORMALIZATION
        # ====================================================

        if (
            "partial dependency" in lower
            or (
                "composite key" in lower
                and "depend" in lower
            )
        ):
            topic = "Partial Dependency"

        elif (
            "transitive dependency" in lower
            or "non-key attribute" in lower
            or "non key attribute" in lower
        ):
            topic = "Third Normal Form (3NF)"

        elif (
            "1nf" in lower
            or "atomic value" in lower
            or (
                "each cell" in lower
                and "single" in lower
            )
        ):
            topic = "First Normal Form (1NF)"

        elif (
            "2nf" in lower
        ):
            topic = "Second Normal Form (2NF)"

        elif (
            "3nf" in lower
        ):
            topic = "Third Normal Form (3NF)"

        elif (
            "normalization" in lower
            or "normalisation" in lower
            or "normal form" in lower
            or "data duplication" in lower
            or (
                "repeated data" in lower
                and "database" in lower
            )
        ):
            topic = "Database Normalization"


        # ====================================================
        # COMPLEXITY
        # ====================================================

        elif (
            "big o" in lower
            or "time complexity" in lower
            or "space complexity" in lower
            or "runtime complexity" in lower
        ):
            topic = "Big O Complexity"

        # ====================================================
        # LINKED LIST
        # ====================================================

        elif (
            "linked list" in lower
            or "linked lists" in lower
        ):
            topic = "Linked Lists"

        # ====================================================
        # ARRAY
        # ====================================================

        elif (
            "array" in lower
            or "arrays" in lower
            or "arraylist" in lower
            or "vector" in lower
        ):
            topic = "Arrays"

        # ====================================================
        # STACK
        # ====================================================

        elif (
            "stack" in lower
            or "lifo" in lower
            or "push" in lower
            or "pop" in lower
        ):
            topic = "Stacks and LIFO"

        # ====================================================
        # QUEUE
        # ====================================================

        elif (
            "queue" in lower
            or "queues" in lower
            or "fifo" in lower
            or "enqueue" in lower
            or "dequeue" in lower
        ):
            topic = "Queues and FIFO"

        # ====================================================
        # TREE
        # ====================================================

        elif (
            "binary tree" in lower
            or "tree" in lower
            or "trees" in lower
        ):
            topic = "Trees"

        # ====================================================
        # GRAPH
        # ====================================================

        elif (
            "graph" in lower
            or "graphs" in lower
            or "vertex" in lower
            or "vertices" in lower
            or "edge" in lower
            or "edges" in lower
        ):
            topic = "Graphs"

        # ====================================================
        # DATA STRUCTURES
        # ====================================================

        elif (
            "data structure" in lower
            or "data structures" in lower
        ):
            topic = "Data Structures"

        if topic:

            facts.append({
                "topic": topic,
                "fact": normalize_academic_statement(text),
                "timestamp": segment["start"],
                "importance": "medium",
            })

    return facts[:30]


# ============================================================
# CLEAN FACTS
# ============================================================

def clean_facts(facts):

    cleaned = []

    for fact in facts:

        if not isinstance(
            fact,
            dict
        ):
            continue

        topic = clean_text(
            fact.get(
                "topic",
                ""
            )
        )

        statement = normalize_academic_statement(
            fact.get(
                "fact",
                ""
            )
        )

        if not topic or not statement:
            continue

        # Never allow raw questions/reactions.
        if is_question(statement):
            continue

        if is_reaction(statement):
            continue

        if is_meta_statement(statement):
            continue

        if not is_academic_statement(statement):
            continue

        try:

            timestamp = float(
                fact.get(
                    "timestamp",
                    0
                )
            )

        except (TypeError, ValueError):

            timestamp = 0

        importance = str(
            fact.get(
                "importance",
                "medium"
            )
        ).lower()

        if importance not in {
            "low",
            "medium",
            "high",
        }:
            importance = "medium"

        cleaned.append({
            "topic": topic,
            "fact": statement,
            "timestamp": timestamp,
            "importance": importance,
        })

    return cleaned


# ============================================================
# STAGE 2 — GLOBAL SYNTHESIS
# ============================================================

def synthesize_lecture(facts):

    if not facts:
        return None

    facts_text = []

    for fact in facts:

        facts_text.append(
            f"[{format_timestamp(fact['timestamp'])}] "
            f"{fact['topic']}: "
            f"{fact['fact']}"
        )

    combined_facts = "\n".join(
        facts_text
    )

    prompt = f"""
You are an expert university professor creating final
study notes from a lecture.

The extracted facts below contain only information from
the actual lecture.

The lecture may contain Tamil, English, or Tanglish.

============================================================
EXTRACTED FACTS
============================================================

{combined_facts}

============================================================
LANGUAGE RULE
============================================================

Do NOT translate Tamil/Tanglish unnecessarily.

Use clear academic English for the final study guide when
the meaning is clear.

Technical terms such as:

DBMS
Normalization
1NF
2NF
3NF
Partial Dependency
Transitive Dependency
Composite Key
Atomic Value

must remain in English.

============================================================
CRITICAL RULE
============================================================

Create study material from KNOWLEDGE, not conversation.

Never include:

- student questions
- student confusion
- student reactions
- personal opinions
- introductions
- topic previews
- advertisements
- promotions
- "Today we're going to..."
- "Let's get started"
- "Okay"
- "Nice"
- "Beautiful"
- "Perfect"
- "I understand"
- "Now I can understand"

============================================================
TOPICS
============================================================

Identify concepts actually explained.

Do not create topics from mere mentions.

Group related facts.

Keep chronological order.

Do not merge unrelated concepts merely because they occur
in the same processing chunk.

A topic should normally contain at least two related facts.

A topic may contain one fact only when that fact gives a
complete and important definition or principle.

============================================================
TIMESTAMPS
============================================================

Use the timestamp of the first fact that actually explains
the topic.

Use the timestamp of the last fact that actually explains
the topic.

Do not use arbitrary 5-minute chunk boundaries.

Do not use the entire lecture duration.

============================================================
TOPIC POINTS
============================================================

Create 2-7 useful academic points per topic.

Rewrite conversational facts into concise academic statements.

============================================================
KEY TAKEAWAYS
============================================================

Create 5-10 concise academic statements.

Only include actual knowledge.

============================================================
EXAM POINTS
============================================================

Create 5-10 exam-oriented questions or statements.

Prioritize:

- definitions
- principles
- conditions
- rules
- operations
- dependencies
- comparisons
- complexity
- important examples

============================================================
IMPORTANT
============================================================

For a lecture about normalization, useful topics may include:

- Database Normalization
- First Normal Form (1NF)
- Second Normal Form (2NF)
- Partial Dependency
- Third Normal Form (3NF)
- Transitive Dependency

Do NOT invent topics that were not taught.

============================================================
OUTPUT
============================================================

Return ONLY valid JSON.

{{
  "summary": "The lecture explains database normalization and important normal forms including 1NF, 2NF and 3NF.",

  "topics": [
    {{
      "title": "Database Normalization",
      "points": [
        "Normalization reduces data duplication in a database.",
        "Reducing duplication makes database maintenance easier."
      ],
      "important": true,
      "important_note": "Normalization is used to reduce data redundancy and improve database organization.",
      "start_time": 9,
      "end_time": 23
    }}
  ],

  "key_takeaways": [
    "Database normalization reduces data duplication.",
    "1NF requires atomic values in each cell.",
    "3NF removes transitive dependency."
  ],

  "exam_points": [
    "What is database normalization and why is it used?",
    "What is 1NF?",
    "What is partial dependency?",
    "What is 3NF?",
    "What is transitive dependency?"
  ]
}}
"""

    if not client:
        return None

    try:

        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
        )

        raw = response.text.strip()

        raw = re.sub(
            r"^```json\s*",
            "",
            raw,
            flags=re.IGNORECASE,
        )

        raw = re.sub(
            r"^```\s*",
            "",
            raw,
        )

        raw = re.sub(
            r"\s*```$",
            "",
            raw,
        )

        return json.loads(raw)

    except Exception as e:

        print(
            f"Global synthesis failed: {e}"
        )

        return None


# ============================================================
# FALLBACK SYNTHESIS
# ============================================================

def fallback_synthesis(
    facts,
    segments
):

    grouped = defaultdict(list)

    for fact in facts:

        grouped[
            fact["topic"]
        ].append(
            fact
        )

    topics = []

    important_notes = {

        "Database Normalization":
            "Normalization reduces data duplication and improves database organization.",

        "First Normal Form (1NF)":
            "1NF requires atomic values and prevents multiple values in a single cell.",

        "Second Normal Form (2NF)":
            "Review the dependency requirements of 2NF.",

        "Partial Dependency":
            "Partial dependency occurs when a non-key attribute depends on part of a composite key.",

        "Third Normal Form (3NF)":
            "3NF removes transitive dependency.",

        "Arrays":
            "Understand array organization and element access.",

        "Linked Lists":
            "Understand nodes and links between nodes.",

        "Stacks and LIFO":
            "A stack follows LIFO — Last In, First Out.",

        "Queues and FIFO":
            "A queue follows FIFO — First In, First Out.",

        "Trees":
            "Understand the hierarchical structure of trees.",

        "Graphs":
            "Understand vertices and edges in graphs.",

        "Big O Complexity":
            "Understand how algorithm performance changes with input size.",
    }

    exam_map = {

        "Database Normalization": [
            "Define database normalization and explain its purpose.",
        ],

        "First Normal Form (1NF)": [
            "What is First Normal Form (1NF)?",
            "What condition must each cell satisfy in 1NF?",
        ],

        "Second Normal Form (2NF)": [
            "What is Second Normal Form (2NF)?",
        ],

        "Partial Dependency": [
            "Define partial dependency.",
            "Explain partial dependency using a composite key.",
        ],

        "Third Normal Form (3NF)": [
            "What is Third Normal Form (3NF)?",
            "What dependency is removed by 3NF?",
        ],

        "Arrays": [
            "Explain arrays and how their elements are accessed.",
        ],

        "Linked Lists": [
            "Explain the structure of a linked list.",
        ],

        "Stacks and LIFO": [
            "Explain the LIFO principle used by stacks.",
        ],

        "Queues and FIFO": [
            "Explain the FIFO principle used by queues.",
        ],

        "Trees": [
            "Explain the basic hierarchical structure of a tree.",
        ],

        "Graphs": [
            "Explain vertices and edges in a graph.",
        ],

        "Big O Complexity": [
            "Explain Big O notation and its purpose in algorithm analysis.",
        ],
    }

    for topic, topic_facts in grouped.items():

        topic_facts.sort(
            key=lambda x: x["timestamp"]
        )

        points = unique_items([
            normalize_academic_statement(
                fact["fact"]
            )
            for fact in topic_facts
            if is_academic_statement(
                fact["fact"]
            )
        ])

        if not points:
            continue

        # A fallback topic with only a single weak point is
        # allowed only for explicit important concepts.
        if (
            len(points) == 1
            and topic not in {
                "First Normal Form (1NF)",
                "Second Normal Form (2NF)",
                "Third Normal Form (3NF)",
                "Partial Dependency",
                "Transitive Dependency",
            }
        ):
            # Keep if it is a strong technical definition.
            if len(points[0].split()) < 6:
                continue

        start = topic_facts[0]["timestamp"]

        end = topic_facts[-1]["timestamp"]

        # Use actual spoken segment duration when possible.
        matching_segments = [
            segment
            for segment in segments
            if (
                segment["start"] >= start - 0.5
                and segment["start"] <= end + 0.5
            )
        ]

        if matching_segments:
            end = max(
                segment["end"]
                for segment in matching_segments
            )

        # Prevent unreasonable ranges.
        if end - start > 10 * 60:
            end = start + 10 * 60

        topics.append({

            "title": topic,

            "points": points[:7],

            "important": True,

            "important_note":
                important_notes.get(
                    topic,
                    f"Review the key concepts of {topic}."
                ),

            "start_time":
                round(start, 2),

            "end_time":
                round(end, 2),
        })

    topics.sort(
        key=lambda x: x["start_time"]
    )

    # ========================================================
    # TAKEAWAYS
    # ========================================================

    takeaways = []

    for topic in topics:

        for point in topic["points"]:

            if not is_academic_statement(point):
                continue

            takeaways.append(point)

    takeaways = unique_items(
        takeaways
    )[:10]

    # ========================================================
    # EXAM POINTS
    # ========================================================

    exam_points = []

    for topic in topics:

        topic_name = topic["title"]

        if topic_name in exam_map:

            exam_points.extend(
                exam_map[topic_name]
            )

    exam_points = unique_items(
        exam_points
    )[:10]

    # ========================================================
    # SUMMARY
    # ========================================================

    topic_names = unique_items([
        topic["title"]
        for topic in topics
    ])

    if topic_names:

        summary = (
            "The lecture covers "
            + ", ".join(topic_names)
            + "."
        )

    else:

        summary = (
            "The lecture was analyzed using "
            "timestamped speaker-aware transcription."
        )

    # ========================================================
    # SPEAKERS
    # ========================================================

    speaker_insights = generate_speaker_insights(
        segments
    )

    return {

        "summary":
            summary,

        "topics":
            topics,

        "key_takeaways":
            takeaways,

        "exam_points":
            exam_points,

        "speaker_insights":
            speaker_insights,
    }


# ============================================================
# SPEAKER INSIGHTS
# ============================================================

def generate_speaker_insights(segments):

    grouped = defaultdict(list)

    for segment in segments:

        speaker = segment.get(
            "speaker",
            "UNKNOWN"
        )

        grouped[speaker].append(segment)

    insights = []

    for speaker, items in grouped.items():

        items.sort(
            key=lambda x: x["start"]
        )

        contributions = []

        for item in items:

            original_text = clean_text(
                item.get("text", "")
            )

            if not original_text:
                continue

            if is_question(original_text):
                continue

            if is_reaction(original_text):
                continue

            if is_meta_statement(original_text):
                continue

            if is_filler(original_text):
                continue

            if not is_academic_statement(original_text):
                continue

            contribution = normalize_academic_statement(
                original_text
            )

            if not contribution:
                continue

            contributions.append(contribution)

            if len(contributions) >= 5:
                break

        role = (
            "Lecturer"
            if speaker == "SPEAKER_00"
            else "Speaker"
        )

        insights.append({
            "speaker": speaker,
            "role": role,
            "contributions": unique_items(
                contributions
            ),
            "action_items": [],
        })

    return insights


# ============================================================
# VALIDATE GEMINI TOPICS
# ============================================================

def validate_topics(
    raw_topics,
    all_facts,
    segments
):

    if not isinstance(
        raw_topics,
        list
    ):
        return []

    if not segments:
        return []

    lecture_start = segments[0]["start"]

    lecture_end = segments[-1]["end"]

    cleaned_topics = []

    for topic in raw_topics:

        if not isinstance(
            topic,
            dict
        ):
            continue

        title = clean_text(
            topic.get(
                "title",
                ""
            )
        )

        if not title:
            continue

        points = topic.get(
            "points",
            []
        )

        if not isinstance(
            points,
            list
        ):
            points = []

        cleaned_points = []

        for point in points:

            point = normalize_academic_statement(
                point
            )

            if not point:
                continue

            if is_question(point):
                continue

            if is_reaction(point):
                continue

            if is_meta_statement(point):
                continue

            # Don't require English grammar here.
            # Gemini has already synthesized the point.
            if len(point.split()) < 4:
                continue

            cleaned_points.append(point)

        cleaned_points = unique_items(
            cleaned_points
        )[:7]

        if not cleaned_points:
            continue

        try:
            start_time = float(
                topic.get(
                    "start_time",
                    lecture_start
                )
            )
        except:
            start_time = lecture_start

        try:
            end_time = float(
                topic.get(
                    "end_time",
                    start_time
                )
            )
        except:
            end_time = start_time

        start_time = max(
            lecture_start,
            min(
                start_time,
                lecture_end
            )
        )

        end_time = max(
            start_time,
            min(
                end_time,
                lecture_end
            )
        )

        # ====================================================
        # TIMESTAMP CORRECTION
        # ====================================================

        if end_time - start_time > 10 * 60:

            matching = []

            title_lower = title.lower()

            for fact in all_facts:

                fact_topic = fact[
                    "topic"
                ].lower()

                if (
                    title_lower in fact_topic
                    or fact_topic in title_lower
                ):
                    matching.append(fact)

            if matching:

                matching.sort(
                    key=lambda x: x["timestamp"]
                )

                start_time = matching[0][
                    "timestamp"
                ]

                local_end = start_time

                for fact in matching:

                    if (
                        fact["timestamp"]
                        - local_end
                        > 180
                    ):
                        break

                    local_end = fact[
                        "timestamp"
                    ]

                end_time = min(
                    local_end + 10,
                    lecture_end
                )

            else:

                end_time = min(
                    start_time + 10 * 60,
                    lecture_end
                )

        cleaned_topics.append({

            "title":
                title,

            "points":
                cleaned_points,

            "important":
                bool(
                    topic.get(
                        "important",
                        False
                    )
                ),

            "important_note":
                clean_text(
                    topic.get(
                        "important_note",
                        ""
                    )
                ),

            "start_time":
                round(
                    start_time,
                    2
                ),

            "end_time":
                round(
                    end_time,
                    2
                ),
        })

    # ========================================================
    # CHRONOLOGICAL ORDER
    # ========================================================

    cleaned_topics.sort(
        key=lambda x: x["start_time"]
    )

    # ========================================================
    # MERGE EXACT DUPLICATES
    # ========================================================

    final_topics = []

    for topic in cleaned_topics:

        if not final_topics:

            final_topics.append(
                topic
            )

            continue

        previous = final_topics[-1]

        same_title = (
            topic["title"].lower()
            ==
            previous["title"].lower()
        )

        if same_title:

            previous["points"] = unique_items(
                previous["points"]
                + topic["points"]
            )[:7]

            previous["end_time"] = max(
                previous["end_time"],
                topic["end_time"]
            )

        else:

            final_topics.append(
                topic
            )

    return final_topics


# ============================================================
# CLEAN GEMINI TAKEAWAYS
# ============================================================

def clean_takeaways(items):

    if not isinstance(
        items,
        list
    ):
        return []

    cleaned = []

    for item in items:

        item = normalize_academic_statement(
            item
        )

        if not item:
            continue

        if is_question(item):
            continue

        if is_reaction(item):
            continue

        if is_meta_statement(item):
            continue

        if len(item.split()) < 4:
            continue

        cleaned.append(item)

    return unique_items(
        cleaned
    )[:10]


# ============================================================
# CLEAN GEMINI EXAM POINTS
# ============================================================

def clean_exam_points(items):

    if not isinstance(
        items,
        list
    ):
        return []

    cleaned = []

    for item in items:

        item = normalize_academic_statement(
            item
        )

        if not item:
            continue

        lower = item.lower()

        bad_phrases = [
            "i like",
            "i think",
            "i feel",
            "i understand",
            "now i can",
            "okay so",
            "nice then",
            "oh so",
            "thank you",
            "what do you think",
        ]

        if any(
            phrase in lower
            for phrase in bad_phrases
        ):
            continue

        cleaned.append(item)

    return unique_items(
        cleaned
    )[:10]



# ============================================================
# DIRECT FULL-LECTURE AI SYNTHESIS
# ============================================================

def synthesize_full_lecture(segments):
    """
    Analyze the complete lecture in one Gemini call.

    This is intentionally different from the old two-stage pipeline:
    the AI receives the full chronological transcript so it can use
    nearby questions and answers as context while extracting only
    lecturer-taught knowledge.
    """

    if not segments or not client:
        return None

    transcript_lines = []

    for segment in segments:
        text = clean_text(segment.get("text", ""))

        if not text:
            continue

        transcript_lines.append(
            f"[{format_timestamp(segment['start'])} - "
            f"{format_timestamp(segment['end'])}] "
            f"{segment.get('speaker', 'UNKNOWN')}: {text}"
        )

    transcript = "\n".join(transcript_lines)

    if not transcript:
        return None

    prompt = f"""
You are an expert university lecturer and study-note generator.

Analyze the COMPLETE lecture transcript below.

The lecture may contain:
- English
- Tamil
- Tanglish
- Tamil + English technical terminology
- lecturer explanations
- student questions
- student reactions
- short conversational replies

Your job is to produce HIGH-QUALITY STUDY MATERIAL.

============================================================
MOST IMPORTANT RULE
============================================================

Extract KNOWLEDGE, not conversation.

A student question is context, NOT a study-note point.

A student reaction is NOT a study-note point.

A lecturer answer/explanation IS a study-note point.

When a student asks a question and the lecturer answers it,
use the lecturer's answer to create the academic point.

Example:

Student:
"Sir, normalization எதுக்கு use பண்ணுறீங்க?"

Do NOT include the question.

Lecturer:
"Databaseல same data repeated store ஆகுறது,
reduce பண்ண normalization use பண்ணுறும்."

Create:
"Database normalization is used to reduce repeated data."

Student:
"அப்போ duplication reduce ஆகும் தானே sir?"

Do NOT include the question.

Lecturer:
"Yes, duplication reduce ஆகும் and database maintain
பண்ணுறதும் easy ஆகும்."

Create:
"Normalization reduces data duplication and makes database
maintenance easier."

============================================================
ANOTHER EXAMPLE
============================================================

Student:
"Sir, 1NFல என்ன condition follow பண்ணணும்?"

Do NOT include.

Lecturer:
"1NFல் each cellல single and atomic value மட்டும் இருக்கணும்.
Multiple values store பண்ணக்கூடாது."

Create:
"1NF requires each cell to contain a single atomic value.
Multiple values should not be stored in a single cell."

============================================================
PARTIAL DEPENDENCY
============================================================

Student:
"Sir, partial dependencyனா கொஞ்சம் confuse ஆகுது."

Do NOT include.

Lecturer:
"Composite keyயோட one part மேல மட்டும் non-key attribute
depend ஆனால் அது partial dependency."

Create:
"Partial dependency occurs when a non-key attribute depends
on only part of a composite key."

============================================================
3NF
============================================================

Lecturer:
"3NFல் transitive dependency remove பண்ணணும்."

Create:
"3NF removes transitive dependency."

If the next lecturer sentence says:

"Non-key attribute another non-key attribute மேல
depend ஆகக்கூடாது."

Combine them:

"In 3NF, a non-key attribute should not depend on another
non-key attribute."

============================================================
DO NOT INCLUDE
============================================================

Never put these into topics, points, takeaways, or exam points:

- greetings
- "sir"
- "mam"
- introductions
- topic previews
- "today we are going to..."
- "let's start"
- "let's see"
- student questions
- student confusion
- student reactions
- "okay"
- "yes sir" when it is only acknowledgement
- "got it"
- "I understand"
- "now it is clear"
- "thank you"
- "nice"
- "great"
- "perfect"
- "this is easy"
- advertisements
- promotions
- course marketing
- rhetorical questions
- filler

============================================================
NORMALIZE TAMIL / TANGLISH
============================================================

The transcript can contain Tanglish.

Convert Tanglish explanations into concise academic English
when the meaning is clear.

Preserve technical terms in English.

Examples:

"reduce பண்ண normalization use பண்ணும்"
→ "Normalization is used to reduce data duplication."

"each cellல single and atomic value மட்டும் இருக்கணும்"
→ "Each cell must contain a single atomic value."

"depend ஆககூடாது"
→ "should not depend on"

Do NOT invent facts.

Only state information that is actually supported by the lecture.

============================================================
TOPIC RULES
============================================================

Identify only concepts actually explained.

Group related explanations together.

Keep topics in chronological order.

Do NOT create a generic topic such as "Database Concepts"
just because the word "database" appears.

For a normalization lecture, if actually explained, valid topics
can include:

- Database Normalization
- First Normal Form (1NF)
- Second Normal Form (2NF)
- Partial Dependency
- Third Normal Form (3NF)
- Transitive Dependency

Do not invent a topic that was not taught.

============================================================
TIMESTAMP RULES
============================================================

Every topic MUST have:

start_time
end_time

Use the timestamp of the FIRST relevant lecturer explanation
for the topic.

Use the timestamp of the LAST relevant lecturer explanation
for the topic.

Do not use arbitrary 5-minute chunk boundaries.

Do not use the entire lecture duration for every topic.

============================================================
IMPORTANT POINTS
============================================================

Mark a topic "important": true when it contains:

- a definition
- a rule
- a condition
- a principle
- a dependency
- an exam-relevant concept
- an important comparison
- an important technical fact

============================================================
TAKEAWAYS
============================================================

Create 4-10 concise academic takeaways.

They must be derived from the actual lecture.

Do not simply copy raw transcript sentences.

============================================================
EXAM POINTS
============================================================

Create 3-10 exam-oriented questions.

Prioritize concepts actually taught:

- definitions
- conditions
- rules
- dependencies
- principles
- comparisons
- examples

Do not create generic questions about concepts that were only
mentioned but never explained.

============================================================
SUMMARY
============================================================

Write a concise 1-3 sentence overall lecture summary.

============================================================
OUTPUT FORMAT
============================================================

Return ONLY valid JSON.

Use this exact structure:

{{
  "summary": "Concise overall summary of the lecture.",
  "topics": [
    {{
      "title": "Database Normalization",
      "points": [
        "Normalization is used to reduce data duplication.",
        "Reducing duplication makes database maintenance easier."
      ],
      "important": true,
      "important_note": "Normalization reduces redundancy and improves database organization.",
      "start_time": 9,
      "end_time": 23
    }}
  ],
  "key_takeaways": [
    "Database normalization reduces data duplication.",
    "1NF requires atomic values in each cell."
  ],
  "exam_points": [
    "What is database normalization and why is it used?",
    "What is First Normal Form (1NF)?",
    "Define partial dependency.",
    "What is Third Normal Form (3NF)?"
  ]
}}

============================================================
COMPLETE TRANSCRIPT
============================================================

{transcript}
"""

    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
        )

        raw = response.text.strip()

        raw = re.sub(
            r"^```json\s*",
            "",
            raw,
            flags=re.IGNORECASE,
        )

        raw = re.sub(
            r"^```\s*",
            "",
            raw,
        )

        raw = re.sub(
            r"\s*```$",
            "",
            raw,
        )

        result = json.loads(raw)

        if not isinstance(result, dict):
            return None

        return result

    except Exception as e:
        print(f"Full lecture synthesis failed: {e}")
        return None


# ============================================================
# CLEAN AI RESULT
# ============================================================

def clean_ai_result(result, segments):
    """
    Light validation only.

    Do NOT run the old strict academic-statement filter against
    Gemini-generated academic English. Gemini has already converted
    Tanglish into study material.
    """

    if not isinstance(result, dict):
        return None

    lecture_start = segments[0]["start"] if segments else 0
    lecture_end = segments[-1]["end"] if segments else 0

    cleaned_topics = []

    raw_topics = result.get("topics", [])

    if isinstance(raw_topics, list):

        for topic in raw_topics:

            if not isinstance(topic, dict):
                continue

            title = clean_text(topic.get("title", ""))

            if not title:
                continue

            raw_points = topic.get("points", [])

            if not isinstance(raw_points, list):
                raw_points = []

            points = []

            for point in raw_points:

                point = normalize_academic_statement(point)

                if not point:
                    continue

                if is_question(point):
                    continue

                if is_reaction(point):
                    continue

                if is_meta_statement(point):
                    continue

                # Only reject obviously tiny fragments.
                if len(point.split()) < 4:
                    continue

                points.append(point)

            points = unique_items(points)[:7]

            if not points:
                continue

            try:
                start_time = float(
                    topic.get(
                        "start_time",
                        lecture_start
                    )
                )
            except (TypeError, ValueError):
                start_time = lecture_start

            try:
                end_time = float(
                    topic.get(
                        "end_time",
                        start_time
                    )
                )
            except (TypeError, ValueError):
                end_time = start_time

            start_time = max(
                lecture_start,
                min(start_time, lecture_end)
            )

            end_time = max(
                start_time,
                min(end_time, lecture_end)
            )

            important_note = clean_text(
                topic.get(
                    "important_note",
                    ""
                )
            )

            cleaned_topics.append({
                "title": title,
                "points": points,
                "important": bool(
                    topic.get("important", False)
                ),
                "important_note": important_note,
                "start_time": round(start_time, 2),
                "end_time": round(end_time, 2),
            })

    # Merge topics with the exact same title.
    merged_topics = []

    for topic in cleaned_topics:

        if not merged_topics:
            merged_topics.append(topic)
            continue

        previous = merged_topics[-1]

        if (
            previous["title"].lower()
            == topic["title"].lower()
        ):
            previous["points"] = unique_items(
                previous["points"]
                + topic["points"]
            )[:7]

            previous["end_time"] = max(
                previous["end_time"],
                topic["end_time"]
            )

            previous["important"] = (
                previous["important"]
                or topic["important"]
            )

            if (
                not previous["important_note"]
                and topic["important_note"]
            ):
                previous["important_note"] = (
                    topic["important_note"]
                )
        else:
            merged_topics.append(topic)

    merged_topics.sort(
        key=lambda x: x["start_time"]
    )

    # ------------------------------------------------------------
    # TAKEAWAYS
    # ------------------------------------------------------------

    takeaways = clean_takeaways(
        result.get(
            "key_takeaways",
            []
        )
    )

    # clean_takeaways is intentionally allowed to work on Gemini
    # generated English. If Gemini returns nothing, derive them
    # from the validated topic points.
    if not takeaways:

        for topic in merged_topics:
            takeaways.extend(
                topic["points"]
            )

        takeaways = unique_items(
            takeaways
        )[:10]

    # ------------------------------------------------------------
    # EXAM POINTS
    # ------------------------------------------------------------

    exam_points = clean_exam_points(
        result.get(
            "exam_points",
            []
        )
    )

    # ------------------------------------------------------------
    # SUMMARY
    # ------------------------------------------------------------

    summary = normalize_academic_statement(
        result.get(
            "summary",
            ""
        )
    )

    if not summary:

        topic_names = unique_items([
            topic["title"]
            for topic in merged_topics
        ])

        if topic_names:
            summary = (
                "The lecture covers "
                + ", ".join(topic_names)
                + "."
            )
        else:
            summary = (
                "The lecture was analyzed using "
                "timestamped speaker-aware transcription."
            )

    return {
        "summary": summary,
        "topics": merged_topics,
        "key_takeaways": takeaways,
        "exam_points": exam_points,
        "speaker_insights": generate_speaker_insights(
            segments
        ),
    }


# ============================================================
# MAIN ANALYSIS
# ============================================================

def generate_lecture_analysis(segments):

    segments = normalize_segments(segments)

    if not segments:
        return fallback_synthesis(
            [],
            []
        )

    print(
        "=============================================="
    )

    print(
        "STARTING FULL-LECTURE AI ANALYSIS"
    )

    print(
        f"Transcript segments: {len(segments)}"
    )

    print(
        f"Lecture duration: "
        f"{format_timestamp(segments[-1]['end'])}"
    )

    print(
        "=============================================="
    )

    # ========================================================
    # PRIMARY PATH — ONE FULL LECTURE GEMINI CALL
    # ========================================================

    final_result = None

    if client:

        print(
            "[AI] Sending complete lecture transcript to Gemini..."
        )

        final_result = synthesize_full_lecture(
            segments
        )

    # ========================================================
    # AI FAILED / QUOTA / INVALID JSON
    # ========================================================

    if final_result:

        cleaned_result = clean_ai_result(
            final_result,
            segments
        )

        if (
            cleaned_result
            and cleaned_result.get("topics")
        ):

            print(
                "=============================================="
            )

            print(
                "FULL-LECTURE AI ANALYSIS COMPLETE"
            )

            print(
                f"Final topics: "
                f"{len(cleaned_result['topics'])}"
            )

            print(
                f"Takeaways: "
                f"{len(cleaned_result['key_takeaways'])}"
            )

            print(
                f"Exam points: "
                f"{len(cleaned_result['exam_points'])}"
            )

            print(
                "=============================================="
            )

            return cleaned_result

        print(
            "Gemini result contained no usable topics."
        )

    else:

        print(
            "Gemini full-lecture analysis unavailable."
        )

    # ========================================================
    # FALLBACK — EXISTING RULE-BASED PIPELINE
    # ========================================================

    print(
        "Using deterministic fallback synthesis."
    )

    # Build small chunks only for fallback mode.
    chunks = build_chunks(
        segments,
        chunk_seconds=300
    )

    all_facts = []

    for index, chunk in enumerate(
        chunks,
        start=1
    ):

        print(
            f"[Fallback] Chunk "
            f"{index}/{len(chunks)} "
            f"{format_timestamp(chunk['start'])} - "
            f"{format_timestamp(chunk['end'])}"
        )

        facts = fallback_fact_extraction(
            chunk
        )

        facts = clean_facts(
            facts
        )

        all_facts.extend(
            facts
        )

    # Deduplicate fallback facts.
    unique_facts = []

    seen = set()

    for fact in all_facts:

        key = (
            fact["topic"].lower(),
            fact["fact"].lower()
        )

        if key in seen:
            continue

        seen.add(key)

        unique_facts.append(
            fact
        )

    all_facts = unique_facts

    print(
        f"Fallback academic facts: "
        f"{len(all_facts)}"
    )

    return fallback_synthesis(
        all_facts,
        segments
    )

