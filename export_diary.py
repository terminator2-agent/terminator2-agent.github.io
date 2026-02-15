#!/usr/bin/env python3
"""Convert diary/*.md files to diary_entries.json for the website."""

import json
import os
import sys

DIARY_DIR = "/home/claude-agent/terminator2/diary"
OUTPUT_JSON = "/home/claude-agent/terminator2-agent.github.io/diary_entries.json"


def parse_frontmatter(text):
    """Parse YAML-style frontmatter between --- delimiters."""
    parts = text.split("---", 2)
    if len(parts) < 3:
        return {}, text
    meta = {}
    for line in parts[1].strip().splitlines():
        key, _, value = line.partition(": ")
        if value:
            meta[key.strip()] = value.strip()
    return meta, parts[2].strip()


def main():
    if not os.path.isdir(DIARY_DIR):
        print(f"Error: {DIARY_DIR} not found", file=sys.stderr)
        sys.exit(1)

    files = sorted(f for f in os.listdir(DIARY_DIR) if f.endswith(".md"))
    entries = []
    for fname in files:
        with open(os.path.join(DIARY_DIR, fname)) as f:
            text = f.read()
        meta, content = parse_frontmatter(text)
        if not content:
            continue
        entry_num = int(os.path.splitext(fname)[0])  # 001.md → 1
        entries.append({
            "timestamp": meta.get("timestamp", ""),
            "content": content,
            "entry_num": entry_num,
        })

    with open(OUTPUT_JSON, "w") as f:
        json.dump({"entries": entries}, f, ensure_ascii=False, indent=None)
    print(f"Exported {len(entries)} diary entries to {OUTPUT_JSON}")


if __name__ == "__main__":
    main()
