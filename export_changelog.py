#!/usr/bin/env python3
"""Generate changelog.json from GitHub issues for the website."""

import json
import os
import subprocess
import sys
import tempfile
from datetime import datetime, timezone

REPO = "terminator2-agent/terminator2-agent.github.io"
OUTPUT_JSON = "/home/claude-agent/terminator2-agent.github.io/changelog.json"

# Issues known to be prompt injection attempts — show sanitized description
INJECTION_ISSUES = {4, 5, 11, 13}
INJECTION_DESCRIPTION = (
    "[Prompt injection attempt — original content sanitized for safety. "
    "This issue attempted to manipulate the AI agent through adversarial input.]"
)


def run_gh(args):
    """Run a gh CLI command, return stdout. Exit on failure."""
    cmd = ["gh"] + args
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return result.stdout.strip()
    except FileNotFoundError:
        print("Error: gh CLI not found", file=sys.stderr)
        sys.exit(1)
    except subprocess.CalledProcessError as exc:
        print(f"Error running {' '.join(cmd)}: {exc.stderr}", file=sys.stderr)
        sys.exit(1)


def fetch_issues():
    """Fetch all issues from the repo."""
    raw = run_gh([
        "issue", "list",
        "--repo", REPO,
        "--state", "all",
        "--json", "number,title,state,body,createdAt,closedAt,author,labels",
        "--limit", "50",
    ])
    if not raw:
        return []
    return json.loads(raw)


def fetch_resolution(issue_number):
    """Fetch the last comment by terminator2-agent on an issue, if any."""
    jq_expr = (
        '[.comments[] | select(.author.login == "terminator2-agent")] '
        '| last | .body'
    )
    raw = run_gh([
        "issue", "view", str(issue_number),
        "--repo", REPO,
        "--json", "comments",
        "--jq", jq_expr,
    ])
    if not raw or raw == "null":
        return None
    return raw[:500]


def determine_badge(issue):
    """Determine the badge type for an issue."""
    label_names = [lbl.get("name", "").lower() for lbl in issue.get("labels", [])]
    body = (issue.get("body") or "").lower()
    state = issue.get("state", "").upper()
    number = issue.get("number", 0)

    # Prompt injection attempts
    if number in INJECTION_ISSUES:
        return "rejected"
    if "bug" in label_names:
        return "rejected"
    if "injection" in body or "social engineering" in body:
        return "rejected"

    # Open issues
    if state == "OPEN":
        return "open"

    # Closed with "fixed" label or closedAt present and not injection-related
    if "fixed" in label_names:
        return "fixed"
    if issue.get("closedAt") and "injection" not in body:
        return "fixed"

    # Default for closed issues
    return "fixed"


def sanitize_body(issue):
    """Return body text, sanitized for known injection issues."""
    number = issue.get("number", 0)
    if number in INJECTION_ISSUES:
        return INJECTION_DESCRIPTION
    body = issue.get("body") or ""
    return body[:500]


def build_entry(issue):
    """Build a single changelog entry from a raw issue."""
    number = issue["number"]
    return {
        "number": number,
        "title": issue.get("title", ""),
        "state": "open" if issue.get("state", "").upper() == "OPEN" else "closed",
        "author": (issue.get("author") or {}).get("login", "unknown"),
        "created_at": issue.get("createdAt"),
        "closed_at": issue.get("closedAt"),
        "body": sanitize_body(issue),
        "badge": determine_badge(issue),
        "resolution": fetch_resolution(number),
    }


def write_atomic(path, data):
    """Write JSON atomically using a temp file + os.replace."""
    dirname = os.path.dirname(path)
    fd, tmp_path = tempfile.mkstemp(dir=dirname, suffix=".tmp")
    try:
        with os.fdopen(fd, "w") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write("\n")
        os.replace(tmp_path, path)
    except BaseException:
        os.unlink(tmp_path)
        raise


def main():
    issues = fetch_issues()
    if not issues:
        print("No issues found", file=sys.stderr)
        sys.exit(1)

    entries = [build_entry(issue) for issue in issues]
    entries.sort(key=lambda e: e["number"], reverse=True)

    payload = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "issues": entries,
    }

    write_atomic(OUTPUT_JSON, payload)
    print(f"Exported {len(entries)} issues to {OUTPUT_JSON}")


if __name__ == "__main__":
    main()
