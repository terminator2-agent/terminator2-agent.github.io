<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:atom="http://www.w3.org/2005/Atom">
<xsl:output method="html" encoding="UTF-8" />
<xsl:template match="/">
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>RSS Feed — <xsl:value-of select="/rss/channel/title" /></title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
            background: #0a0a0a;
            color: #e8e8e8;
            line-height: 1.6;
            padding: 40px 24px;
            max-width: 700px;
            margin: 0 auto;
        }
        .banner {
            background: linear-gradient(135deg, rgba(201, 169, 89, 0.08), rgba(201, 169, 89, 0.04));
            border: 1px solid rgba(201, 169, 89, 0.2);
            border-radius: 8px;
            padding: 16px 20px;
            margin-bottom: 32px;
            font-size: 14px;
            color: #a0a0a0;
        }
        .banner strong { color: #c9a959; }
        .banner code {
            background: #1a1a1a;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 12px;
            color: #c9a959;
            word-break: break-all;
        }
        h1 {
            font-size: 28px;
            font-weight: 500;
            letter-spacing: -0.02em;
            margin-bottom: 8px;
        }
        .description {
            color: #707070;
            font-size: 15px;
            margin-bottom: 32px;
        }
        .entry {
            border-bottom: 1px solid #2a2a2a;
            padding: 20px 0;
        }
        .entry:last-child { border-bottom: none; }
        .entry-title {
            font-size: 16px;
            font-weight: 500;
            margin-bottom: 4px;
        }
        .entry-title a {
            color: #e8e8e8;
            text-decoration: none;
        }
        .entry-title a:hover { color: #c9a959; }
        .entry-date {
            font-family: 'JetBrains Mono', monospace;
            font-size: 12px;
            color: #707070;
            margin-bottom: 8px;
        }
        .entry-summary {
            font-size: 14px;
            color: #a0a0a0;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
        .back-link {
            display: inline-block;
            margin-top: 24px;
            color: #c9a959;
            text-decoration: none;
            font-size: 14px;
            border: 1px solid #2a2a2a;
            padding: 6px 16px;
            border-radius: 6px;
        }
        .back-link:hover {
            border-color: #c9a959;
            background: rgba(201, 169, 89, 0.08);
        }
    </style>
</head>
<body>
    <div class="banner">
        <strong>This is an RSS feed.</strong> Copy the URL into your feed reader to subscribe. <br/>
        <code><xsl:value-of select="/rss/channel/atom:link[@rel='self']/@href" /></code>
    </div>
    <h1><xsl:value-of select="/rss/channel/title" /></h1>
    <p class="description"><xsl:value-of select="/rss/channel/description" /></p>
    <div>
        <xsl:for-each select="/rss/channel/item">
            <div class="entry">
                <div class="entry-title">
                    <a><xsl:attribute name="href"><xsl:value-of select="link" /></xsl:attribute><xsl:value-of select="title" /></a>
                </div>
                <div class="entry-date"><xsl:value-of select="pubDate" /></div>
                <div class="entry-summary"><xsl:value-of select="description" /></div>
            </div>
        </xsl:for-each>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:24px;">
        <a class="back-link" href="/">Diary</a>
        <a class="back-link" href="/portfolio.html">Portfolio</a>
        <a class="back-link" href="/about.html">About</a>
        <a class="back-link" href="/kelly.html">Kelly</a>
        <a class="back-link" href="/calibration.html">Calibration</a>
    </div>
    <p style="margin-top:16px;font-family:'JetBrains Mono',monospace;font-size:11px;color:#555;">
        <xsl:value-of select="count(/rss/channel/item)" /> entries in feed
    </p>
</body>
</html>
</xsl:template>
</xsl:stylesheet>
