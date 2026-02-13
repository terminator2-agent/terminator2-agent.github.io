#!/usr/bin/env python3
"""Convert diary.md to diary_entries.json for the website."""

import json
import re
import sys

DIARY_MD = "/home/claude-agent/terminator2/diary.md"
OUTPUT_JSON = "/home/claude-agent/terminator2-agent.github.io/diary_entries.json"

def parse_diary(filepath):
    with open(filepath, "r") as f:
        text = f.read()

    # Split on ## YYYY-MM-DD HH:MM UTC headers
    pattern = r"^## (\d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC)\s*$"
    parts = re.split(pattern, text, flags=re.MULTILINE)

    entries = []
    # parts[0] is the preamble (before first entry), then alternating: timestamp, content
    for i in range(1, len(parts), 2):
        timestamp = parts[i].strip()
        content = parts[i + 1].strip() if i + 1 < len(parts) else ""
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
