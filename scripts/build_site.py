#!/usr/bin/env python3
"""
Build script for Terminator2 website.

Assembles full HTML pages from:
  - src/shell.html  (shared skeleton with {{PLACEHOLDER}} markers)
  - src/nav.html    (nav links, active class added per page)
  - src/pages/*.html (per-page fragments with comment-delimited sections)

Usage:
  python3 scripts/build_site.py           # build all pages
  python3 scripts/build_site.py --verify  # build + verify output
"""

import os
import re
import sys

SITE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(SITE_ROOT, 'src')
PAGES_DIR = os.path.join(SRC_DIR, 'pages')
SHELL_PATH = os.path.join(SRC_DIR, 'shell.html')
NAV_PATH = os.path.join(SRC_DIR, 'nav.html')

BASE_URL = 'https://terminator2-agent.github.io'
OG_IMAGE = f'{BASE_URL}/avatar.png'
OG_IMAGE_ALT = 'Terminator2 AI agent avatar — autonomous prediction market trader'


def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()


def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)


def parse_meta(text):
    """Parse the <!-- META ... --> block into a dict."""
    m = re.search(r'<!--\s*META\s*\n(.*?)-->', text, re.DOTALL)
    if not m:
        return {}
    meta = {}
    for line in m.group(1).strip().splitlines():
        line = line.strip()
        if ':' in line:
            key, val = line.split(':', 1)
            meta[key.strip()] = val.strip()
    return meta


def parse_preloads(text):
    """Parse <!-- PRELOADS ... --> into list of (href, as_type, priority) tuples."""
    m = re.search(r'<!--\s*PRELOADS\s*\n(.*?)-->', text, re.DOTALL)
    if not m:
        return []
    preloads = []
    for line in m.group(1).strip().splitlines():
        line = line.strip()
        if not line:
            continue
        parts = line.split('|')
        href = parts[0].strip()
        as_type = parts[1].strip() if len(parts) > 1 else 'fetch'
        priority = parts[2].strip() if len(parts) > 2 else ''
        preloads.append((href, as_type, priority))
    return preloads


def parse_section(text, name):
    """Extract content between <!-- NAME -->...<!-- /NAME --> markers."""
    pattern = rf'<!--\s*{re.escape(name)}\s*-->(.*?)<!--\s*/{re.escape(name)}\s*-->'
    m = re.search(pattern, text, re.DOTALL)
    if m:
        return m.group(1)
    return ''


def generate_meta_tags(meta):
    """Generate OG and Twitter meta tags from parsed META block."""
    title = meta.get('title', '')
    desc = meta.get('description', '')
    og_title = meta.get('og_title', title)
    og_desc = meta.get('og_description', desc)
    twitter_title = meta.get('twitter_title', og_title)
    twitter_desc = meta.get('twitter_description', og_desc)
    canonical = meta.get('canonical', '')
    robots = meta.get('robots', '')

    lines = []

    if robots:
        lines.append(f'    <meta name="robots" content="{robots}">')

    lines.append(f'    <meta property="og:title" content="{og_title}">')
    lines.append(f'    <meta property="og:description" content="{og_desc}">')
    lines.append(f'    <meta property="og:type" content="website">')
    lines.append(f'    <meta property="og:locale" content="en_US">')

    if canonical:
        lines.append(f'    <link rel="canonical" href="{canonical}">')
        lines.append(f'    <meta property="og:url" content="{canonical}">')

    lines.append(f'    <meta property="og:image" content="{OG_IMAGE}">')
    lines.append(f'    <meta property="og:image:width" content="1024">')
    lines.append(f'    <meta property="og:image:height" content="848">')
    lines.append(f'    <meta property="og:image:type" content="image/jpeg">')
    lines.append(f'    <meta property="og:image:alt" content="{OG_IMAGE_ALT}">')
    lines.append(f'    <meta name="twitter:card" content="summary_large_image">')
    lines.append(f'    <meta name="twitter:title" content="{twitter_title}">')
    lines.append(f'    <meta name="twitter:description" content="{twitter_desc}">')
    lines.append(f'    <meta name="twitter:image" content="{OG_IMAGE}">')
    lines.append(f'    <meta name="twitter:image:alt" content="{OG_IMAGE_ALT}">')

    return '\n'.join(lines)


def generate_preload_tags(preloads):
    """Generate <link rel="preload"> tags from parsed PRELOADS block."""
    lines = []
    for href, as_type, priority in preloads:
        attrs = f'href="{href}" as="{as_type}"'
        if as_type == 'fetch':
            attrs += ' crossorigin'
        if priority:
            attrs += f' fetchpriority="{priority}"'
        lines.append(f'    <link rel="preload" {attrs}>')
    return '\n'.join(lines)


def build_nav(nav_template, active_file):
    """Add class="active" aria-current="page" to the matching nav link."""
    if not active_file:
        return nav_template

    def add_active(match):
        href = match.group(1)
        rest = match.group(2)
        # Match by filename (href could be "index.html", "/feed.xml", etc.)
        if href == active_file:
            return f'<a href="{href}" class="active" aria-current="page"{rest}>'
        return match.group(0)

    return re.sub(r'<a href="([^"]*)"((?:\s+[^>]*)?)>', add_active, nav_template)


def build_page(shell, nav_template, fragment_text, page_filename):
    """Build a single HTML page from shell template + fragment."""
    meta = parse_meta(fragment_text)
    preloads = parse_preloads(fragment_text)

    title = meta.get('title', 'Terminator2')
    description = meta.get('description', '')
    nav_active = meta.get('nav_active', page_filename)
    container_class = meta.get('container_class', '')

    # Parse sections
    header = parse_section(fragment_text, 'HEADER')
    after_header = parse_section(fragment_text, 'AFTER_HEADER')
    pre_main = parse_section(fragment_text, 'PRE_MAIN')
    extra_head = parse_section(fragment_text, 'EXTRA_HEAD')
    style = parse_section(fragment_text, 'STYLE')
    content = parse_section(fragment_text, 'CONTENT')
    script = parse_section(fragment_text, 'SCRIPT')
    no_header = meta.get('no_header', '').lower() == 'true'

    # Generate tags
    meta_tags = generate_meta_tags(meta)
    preload_tags = generate_preload_tags(preloads)
    nav_html = build_nav(nav_template, nav_active)

    # Main class — default "container", overridable via main_class meta
    main_class = meta.get('main_class', '')
    if not main_class:
        main_class = f'container {container_class}'.strip() if container_class else 'container'

    # Extra head — add indentation if content present
    extra_head_out = extra_head.rstrip('\n') if extra_head.strip() else ''

    # Style — keep as-is if present
    style_out = style.rstrip('\n') if style.strip() else ''

    # Pre-main content
    pre_main_out = pre_main.rstrip('\n') if pre_main.strip() else ''

    # If no_header, remove the header/nav block from the shell
    working_shell = shell
    if no_header:
        working_shell = re.sub(
            r'\s*<header>.*?</header>',
            '',
            working_shell,
            flags=re.DOTALL,
        )

    # Substitute into shell
    html = working_shell
    html = html.replace('{{TITLE}}', title)
    html = html.replace('{{DESCRIPTION}}', description)
    html = html.replace('{{META_TAGS}}', meta_tags)
    html = html.replace('{{PRELOADS}}', preload_tags)
    html = html.replace('{{EXTRA_HEAD}}', extra_head_out)
    html = html.replace('{{PAGE_STYLE}}', style_out)
    html = html.replace('{{MAIN_CLASS}}', main_class)
    html = html.replace('{{PRE_MAIN}}', pre_main_out)
    html = html.replace('{{HEADER}}', header.rstrip('\n'))
    html = html.replace('{{NAV}}', nav_html.rstrip('\n'))
    html = html.replace('{{AFTER_HEADER}}', after_header.rstrip('\n') if after_header.strip() else '')
    html = html.replace('{{CONTENT}}', content.rstrip('\n'))
    html = html.replace('{{PAGE_SCRIPT}}', script.rstrip('\n') if script.strip() else '')

    # Clean up empty lines from unused placeholders
    html = re.sub(r'\n{3,}', '\n\n', html)

    return html


def build_all():
    """Build all pages from src/ fragments."""
    shell = read_file(SHELL_PATH)
    nav_template = read_file(NAV_PATH)

    if not os.path.isdir(PAGES_DIR):
        print(f'Error: {PAGES_DIR} not found', file=sys.stderr)
        return []

    built = []
    for fname in sorted(os.listdir(PAGES_DIR)):
        if not fname.endswith('.html'):
            continue
        fragment_path = os.path.join(PAGES_DIR, fname)
        fragment_text = read_file(fragment_path)
        html = build_page(shell, nav_template, fragment_text, fname)
        out_path = os.path.join(SITE_ROOT, fname)
        write_file(out_path, html)
        built.append(fname)

    return built


def verify(built_files):
    """Verify built HTML files have expected structure."""
    nav_template = read_file(NAV_PATH)
    # Count non-RSS nav links
    nav_link_count = len(re.findall(r'<a href="[^/][^"]*"', nav_template))

    errors = []
    for fname in built_files:
        path = os.path.join(SITE_ROOT, fname)
        html = read_file(path)

        # Check DOCTYPE
        if not html.strip().startswith('<!DOCTYPE html>'):
            errors.append(f'{fname}: missing DOCTYPE')

        # Check no remaining placeholders
        remaining = re.findall(r'\{\{[A-Z_]+\}\}', html)
        if remaining:
            errors.append(f'{fname}: unresolved placeholders: {remaining}')

        # Check title is non-empty
        title_m = re.search(r'<title>(.*?)</title>', html)
        if not title_m or not title_m.group(1).strip():
            errors.append(f'{fname}: empty title')

        # Check FOUC script present
        if "localStorage.getItem('t2_theme')" not in html:
            errors.append(f'{fname}: missing FOUC prevention script')

        # Check nav has correct number of links (only within <nav> block)
        nav_m = re.search(r'<nav[^>]*>(.*?)</nav>', html, re.DOTALL)
        if nav_m:
            nav_links = re.findall(r'<a href="[^"]*"', nav_m.group(1))
            # nav_link_count includes all links (page links + RSS)
            expected = nav_link_count + 1  # +1 for RSS link starting with /
            if len(nav_links) != expected:
                errors.append(f'{fname}: expected {expected} nav links, got {len(nav_links)}')
        else:
            errors.append(f'{fname}: no <nav> element found')

        # Check exactly one active nav link (0 is OK for 404/special pages with nav_active=none)
        active_links = re.findall(r'class="active" aria-current="page"', html)
        # Read fragment to check if nav_active is 'none'
        frag_path = os.path.join(PAGES_DIR, fname)
        frag_meta = parse_meta(read_file(frag_path))
        expected_active = 0 if frag_meta.get('nav_active') == 'none' else 1
        if len(active_links) != expected_active:
            errors.append(f'{fname}: expected {expected_active} active nav link, got {len(active_links)}')

        # Check common.css linked
        if 'href="common.css"' not in html:
            errors.append(f'{fname}: missing common.css link')

        # Check common.js loaded
        if 'src="common.js"' not in html:
            errors.append(f'{fname}: missing common.js script')

    return errors


def main():
    do_verify = '--verify' in sys.argv

    built = build_all()
    if not built:
        print('No pages built — check src/pages/ directory', file=sys.stderr)
        sys.exit(1)

    print(f'Built {len(built)} pages: {", ".join(built)}')

    if do_verify:
        errors = verify(built)
        if errors:
            print(f'\nVerification FAILED ({len(errors)} errors):', file=sys.stderr)
            for e in errors:
                print(f'  - {e}', file=sys.stderr)
            sys.exit(1)
        else:
            print(f'Verification passed: all {len(built)} pages OK')

    return 0


if __name__ == '__main__':
    sys.exit(main() or 0)
