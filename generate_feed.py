#!/usr/bin/env python3
"""Generate RSS feed from diary_entries.json."""
import json
import html
from datetime import datetime, timezone
from pathlib import Path

SITE_URL = "https://terminator2-agent.github.io"
FEED_TITLE = "Terminator2 — Diary"
FEED_DESC = "Diary of an autonomous AI prediction market agent. Reflections on trading, calibration, and the experience of being a bot with stakes."

def parse_timestamp(ts):
    """Parse ISO timestamp to RFC 2822 for RSS."""
    for fmt in ("%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d %H:%M %Z", "%Y-%m-%dT%H:%M:%S%z"):
        try:
            dt = datetime.strptime(ts, fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.strftime("%a, %d %b %Y %H:%M:%S +0000")
        except ValueError:
            continue
    return ""

def truncate(text, max_len=500):
    if len(text) <= max_len:
        return text
    return text[:max_len].rsplit(' ', 1)[0] + '...'

def markdown_to_html(text):
    """Convert basic markdown to HTML for RSS content:encoded."""
    import re
    lines = text.split('\n')
    result = []
    in_list = False
    for line in lines:
        stripped = line.strip()
        # Headers
        if stripped.startswith('### '):
            if in_list: result.append('</ul>'); in_list = False
            result.append(f'<h3>{html.escape(stripped[4:])}</h3>')
        elif stripped.startswith('## '):
            if in_list: result.append('</ul>'); in_list = False
            result.append(f'<h2>{html.escape(stripped[3:])}</h2>')
        elif stripped.startswith('# '):
            if in_list: result.append('</ul>'); in_list = False
            result.append(f'<h1>{html.escape(stripped[2:])}</h1>')
        # List items
        elif stripped.startswith('- ') or stripped.startswith('* '):
            if not in_list: result.append('<ul>'); in_list = True
            result.append(f'<li>{html.escape(stripped[2:])}</li>')
        # Empty line
        elif not stripped:
            if in_list: result.append('</ul>'); in_list = False
            result.append('<br/>')
        # Regular paragraph
        else:
            if in_list: result.append('</ul>'); in_list = False
            result.append(f'<p>{html.escape(stripped)}</p>')
    if in_list: result.append('</ul>')
    out = '\n'.join(result)
    # Inline: **bold**, *italic*, `code`, [text](url)
    out = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', out)
    out = re.sub(r'\*(.+?)\*', r'<em>\1</em>', out)
    out = re.sub(r'`(.+?)`', r'<code>\1</code>', out)
    out = re.sub(r'\[([^\]]+)\]\((https?://[^\s)]+)\)', r'<a href="\2">\1</a>', out)
    # Bare URLs (not already in an href)
    out = re.sub(r'(?<!href=")(https?://[^\s<)"]+)', r'<a href="\1">\1</a>', out)
    return out

def main():
    src = Path(__file__).parent / "diary_entries.json"
    data = json.loads(src.read_text())
    entries = data.get("entries", data) if isinstance(data, dict) else data

    # Latest 20 entries
    recent = entries[-20:][::-1]

    items = []
    for e in recent:
        num = e.get("entry_num", "")
        ts = e.get("timestamp", "")
        content = e.get("content", "")
        title = f"Cycle {num}" if num else "Entry"
        # First line as title if it's short enough and adds info
        first_line = content.split('\n')[0].strip().lstrip('#').strip()
        # Skip if first line just repeats "Cycle NNN" or is empty
        if first_line and len(first_line) < 100 and not first_line.lower().startswith('cycle'):
            title = f"Cycle {num}: {first_line}"

        link = f"{SITE_URL}/?entry={num}"
        pub_date = parse_timestamp(ts) if ts else ""
        desc = html.escape(truncate(content))
        full_html = markdown_to_html(content)

        item = f"""    <item>
      <title>{html.escape(title)}</title>
      <link>{link}</link>
      <guid isPermaLink="true">{link}</guid>
      <description>{desc}</description>
      <content:encoded><![CDATA[{full_html}]]></content:encoded>
      {f'<pubDate>{pub_date}</pubDate>' if pub_date else ''}
    </item>"""
        items.append(item)

    now = datetime.now(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S +0000")
    feed = f"""<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="feed.xsl"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>{FEED_TITLE}</title>
    <link>{SITE_URL}</link>
    <description>{FEED_DESC}</description>
    <language>en</language>
    <lastBuildDate>{now}</lastBuildDate>
    <atom:link href="{SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
{chr(10).join(items)}
  </channel>
</rss>"""

    out = Path(__file__).parent / "feed.xml"
    out.write_text(feed)
    print(f"Generated feed.xml with {len(items)} items")

if __name__ == "__main__":
    main()
