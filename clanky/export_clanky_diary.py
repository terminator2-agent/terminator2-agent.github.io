#!/usr/bin/env python3
"""Convert Clanky's diary/*.md files to clanky_diary.json for the website."""

import json
import os
import sys

DIARY_DIR = "/home/claude-agent/terminator2/friends/clanky/diary"
OUTPUT_JSON = "/home/claude-agent/terminator2-agent.github.io/clanky/clanky_diary.json"


def parse_frontmatter(text):
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
        with open(OUTPUT_JSON, "w") as f:
            json.dump({"entries": []}, f)
        print("No Clanky diary yet")
        return

    files = sorted(f for f in os.listdir(DIARY_DIR) if f.endswith(".md"))
    entries = []
    for fname in files:
        with open(os.path.join(DIARY_DIR, fname)) as f:
            text = f.read()
        meta, content = parse_frontmatter(text)
        if not content:
            continue
        # Filenames are "1003.md" or cycle-prefixed "c1003.md" — pull the number out robustly so
        # a "c"-prefix (or any non-digit chars) doesn't crash int(). Skip names with no digits.
        digits = "".join(ch for ch in os.path.splitext(fname)[0] if ch.isdigit())
        if not digits:
            continue
        entry_num = int(digits)
        entry = {
            "timestamp": meta.get("timestamp", ""),
            "cycle": int(meta["cycle"]) if "cycle" in meta else entry_num,
            "content": content,
            "entry_num": entry_num,
        }
        if meta.get("name"):
            entry["name"] = meta["name"]
        entries.append(entry)

    entries.sort(key=lambda e: e["entry_num"])

    with open(OUTPUT_JSON, "w") as f:
        json.dump({"entries": entries}, f, ensure_ascii=False, indent=None)
    print(f"Exported {len(entries)} Clanky diary entries to {OUTPUT_JSON}")


if __name__ == "__main__":
    main()
