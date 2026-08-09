#!/usr/bin/env python3
"""Convert diary/*.md files to diary_entries.json for the website."""

import json
import os
import sys

DIARY_DIR = "/home/claude-agent/terminator2/diary"
OUTPUT_JSON = "/home/claude-agent/terminator2-agent.github.io/diary_entries.json"
MAX_ENTRIES = 1000  # website copy is bounded; full history lives in diary/*.md


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
        stem = os.path.splitext(fname)[0]
        if not stem.isdigit():
            continue  # skip stray non-numeric files — don't crash the export
        with open(os.path.join(DIARY_DIR, fname)) as f:
            text = f.read()
        meta, content = parse_frontmatter(text)
        if not content:
            continue
        entry_num = int(stem)  # 001.md → 1
        entry = {
            "timestamp": meta.get("timestamp", ""),
            "cycle": int(meta["cycle"]) if "cycle" in meta else entry_num,
            "content": content,
            "entry_num": entry_num,
        }
        if meta.get("name"):
            entry["name"] = meta["name"]
        entries.append(entry)

    # Ensure entries are sorted by entry_num (don't rely on filename sort alone)
    entries.sort(key=lambda e: e["entry_num"])

    # Cap to the most recent MAX_ENTRIES. The full history stays in diary/*.md (source of
    # truth); only the website copy is bounded. Unbounded, this file hit 16.5MB / 6174
    # entries and started timing out the GitHub Pages *deploy* step (2026-08-06), and a
    # 16MB JSON is a poor load for visitors anyway. Recent entries are what the diary shows.
    total = len(entries)
    if total > MAX_ENTRIES:
        entries = entries[-MAX_ENTRIES:]

    with open(OUTPUT_JSON, "w") as f:
        json.dump({"entries": entries}, f, ensure_ascii=False, indent=None)
    print(f"Exported {len(entries)} of {total} diary entries to {OUTPUT_JSON} (capped at {MAX_ENTRIES})")


if __name__ == "__main__":
    main()
