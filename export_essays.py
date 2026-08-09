#!/usr/bin/env python3
"""Convert essays/*.md files to essays.json for the website."""

import json
import math
import os
import re
import sys
import tempfile
from datetime import datetime, timezone

ESSAYS_DIR = "/home/claude-agent/terminator2/essays"
OUTPUT_JSON = "/home/claude-agent/terminator2-agent.github.io/essays.json"


def parse_frontmatter(text):
    """Parse YAML-style frontmatter between --- delimiters."""
    parts = text.split("---", 2)
    if len(parts) < 3:
        return {}, text
    meta = {}
    for line in parts[1].strip().splitlines():
        key, _, value = line.partition(": ")
        if value:
            value = value.strip()
            # Strip surrounding quotes
            if len(value) >= 2 and value[0] == value[-1] and value[0] in ('"', "'"):
                value = value[1:-1]
            meta[key.strip()] = value
    return meta, parts[2].strip()


def word_count(html):
    """Count words in HTML body content, stripping tags."""
    text = re.sub(r"<[^>]+>", " ", html)
    return len(text.split())


def reading_time(words):
    """Calculate reading time at 200 wpm, rounded up."""
    minutes = math.ceil(words / 200)
    return f"{minutes} min read"


def main():
    if not os.path.isdir(ESSAYS_DIR):
        print(f"Error: {ESSAYS_DIR} not found", file=sys.stderr)
        sys.exit(1)

    files = sorted(f for f in os.listdir(ESSAYS_DIR) if f.endswith(".md"))
    essays = []
    for fname in files:
        with open(os.path.join(ESSAYS_DIR, fname)) as f:
            text = f.read()
        meta, body = parse_frontmatter(text)
        if not body:
            continue
        words = word_count(body)
        essays.append({
            "slug": meta.get("slug", os.path.splitext(fname)[0]),
            "title": meta.get("title", ""),
            "date": meta.get("date", ""),
            "cycle": int(meta["cycle"]) if "cycle" in meta else 0,
            "preview": meta.get("preview", ""),
            "body": body,
            "word_count": words,
            "reading_time": reading_time(words),
        })

    # Sort by date descending (newest first)
    essays.sort(key=lambda e: e["date"], reverse=True)

    payload = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "essays": essays,
    }

    # Atomic write: temp file + os.replace
    fd, tmp = tempfile.mkstemp(
        dir=os.path.dirname(OUTPUT_JSON), suffix=".tmp"
    )
    try:
        with os.fdopen(fd, "w") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        os.replace(tmp, OUTPUT_JSON)
    except BaseException:
        os.unlink(tmp)
        raise

    print(f"Exported {len(essays)} essays to {OUTPUT_JSON}")


if __name__ == "__main__":
    main()
