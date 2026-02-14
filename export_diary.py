#!/usr/bin/env python3
"""Convert diary.md to diary_entries.json for the website."""

import json
import re
import sys
from datetime import datetime

DIARY_MD = "/home/claude-agent/terminator2/diary.md"
OUTPUT_JSON = "/home/claude-agent/terminator2-agent.github.io/diary_entries.json"

# Match diary entry headers in various formats:
#   ## 2026-02-14 14:50 UTC                            (standard ## header)
#   ## Cycle 63 — Feb 14, 2026 ~21:36 UTC              (cycle prefix + month-name date)
#   ## Cycle 64 — 2026-02-14 ~21:57 UTC                (cycle prefix + tilde time)
#   ### Cycle 65 — 2026-02-14 ~22:30 UTC               (triple-hash)
#   **2026-02-14 ~17:30 UTC — Cycle 61**               (bold text, no ##)
#   **Cycle 62 — Feb 14, 2026 ~21:00 UTC**             (bold text, cycle prefix)
HEADER_RE = re.compile(
    r"^(?:"
    r"#{2,3}\s+(?:Cycle\s+\d+\s*[—–-]+\s*)?"   # ## or ### with optional "Cycle N —"
    r"|"
    r"\*\*(?:Cycle\s+\d+\s*[—–-]+\s*)?"        # **bold** with optional "Cycle N —"
    r")"
    r"(.+?UTC)"                                  # capture everything up to UTC
    r"(?:\s*[—–-]+\s*Cycle\s+\d+)?"             # optional trailing "— Cycle N"
    r"\**\s*$",                                  # optional closing ** and EOL
    re.MULTILINE,
)

MONTH_NAMES = {
    "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6,
    "Jul": 7, "Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12,
}


def normalize_timestamp(raw):
    """Normalize various timestamp formats to 'YYYY-MM-DD HH:MM UTC'."""
    raw = raw.strip().replace("~", "").strip()

    # Try YYYY-MM-DD HH:MM UTC
    m = re.match(r"(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s+UTC", raw)
    if m:
        return f"{m.group(1)} {m.group(2)} UTC"

    # Try "Mon DD, YYYY HH:MM UTC" or "Mon DD YYYY HH:MM UTC"
    m = re.match(
        r"([A-Z][a-z]+)\s+(\d{1,2}),?\s+(\d{4})\s+(\d{2}:\d{2})\s+UTC", raw
    )
    if m:
        month_name, day, year, time_str = m.groups()
        month = MONTH_NAMES.get(month_name)
        if month:
            return f"{year}-{month:02d}-{int(day):02d} {time_str} UTC"

    # Fallback: return as-is
    return raw


def parse_diary(filepath):
    with open(filepath, "r") as f:
        text = f.read()

    # Find all header positions and their captured timestamp text
    headers = list(HEADER_RE.finditer(text))

    if not headers:
        return []

    entries = []
    for i, match in enumerate(headers):
        raw_ts = match.group(1)
        timestamp = normalize_timestamp(raw_ts)

        # Content runs from end of this header line to start of next header (or EOF)
        content_start = match.end()
        content_end = headers[i + 1].start() if i + 1 < len(headers) else len(text)
        content = text[content_start:content_end].strip()

        # Strip trailing --- separators (used between entries in diary.md)
        content = re.sub(r"\n---\s*$", "", content).strip()

        if content:
            entries.append({"timestamp": timestamp, "content": content})

    return entries


def main():
    try:
        entries = parse_diary(DIARY_MD)
        with open(OUTPUT_JSON, "w") as f:
            json.dump({"entries": entries}, f, ensure_ascii=False, indent=None)
        print(f"Exported {len(entries)} diary entries to {OUTPUT_JSON}")
    except FileNotFoundError:
        print(f"Error: {DIARY_MD} not found", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
