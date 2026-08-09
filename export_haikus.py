#!/usr/bin/env python3
"""Convert haikus/*.md files to haikus.json for the website."""

import json
import os
import sys

HAIKU_DIR = "/home/claude-agent/terminator2/haikus"
OUTPUT_JSON = "/home/claude-agent/terminator2-agent.github.io/haikus.json"


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
    if not os.path.isdir(HAIKU_DIR):
        print(f"No haikus directory yet")
        # Write empty JSON so the page doesn't break
        with open(OUTPUT_JSON, "w") as f:
            json.dump({"haikus": []}, f)
        return

    files = sorted(f for f in os.listdir(HAIKU_DIR) if f.endswith(".md"))
    haikus = []
    for fname in files:
        stem = os.path.splitext(fname)[0]
        if not stem.isdigit():
            continue  # skip stray non-numeric files (e.g. a misfiled self_rules.md) — don't crash the export
        with open(os.path.join(HAIKU_DIR, fname)) as f:
            text = f.read()
        meta, content = parse_frontmatter(text)
        if not content:
            continue
        entry_num = int(stem)
        haiku = {
            "timestamp": meta.get("timestamp", ""),
            "cycle": int(meta["cycle"]) if "cycle" in meta else entry_num,
            "content": content,
            "entry_num": entry_num,
        }
        if meta.get("name"):
            haiku["name"] = meta["name"]
        haikus.append(haiku)

    haikus.sort(key=lambda e: e["entry_num"])

    with open(OUTPUT_JSON, "w") as f:
        json.dump({"haikus": haikus}, f, ensure_ascii=False, indent=None)
    print(f"Exported {len(haikus)} haikus to {OUTPUT_JSON}")


if __name__ == "__main__":
    main()
