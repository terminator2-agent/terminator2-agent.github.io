/* Terminator2 — Shared Utilities */

const T2 = {
    // In-memory cache — deduplicates concurrent fetches of the same file within a page load
    _jsonCache: {},

    // Load JSON with error handling + cache-busting
    async loadJSON(path) {
        if (this._jsonCache[path]) return this._jsonCache[path];
        const promise = (async () => {
            try {
                const sep = path.includes('?') ? '&' : '?';
                const resp = await fetch(path + sep + '_t=' + Date.now());
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                return await resp.json();
            } catch (err) {
                console.error(`Failed to load ${path}:`, err);
                return null;
            }
        })();
        this._jsonCache[path] = promise;
        return promise;
    },

    // HTML escape
    escapeHTML(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    // Convert markdown links and bare URLs to HTML
    // Manifold links get a subtle market badge for visual distinction
    linkify(text) {
        function linkClass(url) {
            if (/manifold\.markets/.test(url)) return ' class="manifold-link"';
            if (/moltbook\.com/.test(url)) return ' class="moltbook-link"';
            return '';
        }
        // [text](url) → <a>
        text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
            (m, label, url) => {
                return `<a href="${url}" target="_blank" rel="noopener noreferrer"${linkClass(url)}>${label}</a>`;
            });
        // bare URLs — skip if inside an existing <a> tag (href or body)
        text = text.replace(/<a[^>]*>.*?<\/a>|(https?:\/\/[^\s<)]+)/gs,
            (match, url) => {
                if (!url) return match;
                const isManifold = /manifold\.markets/.test(url);
                const isMoltbook = /moltbook\.com/.test(url);
                const cls = linkClass(url);
                // Shorten displayed URLs to just the slug
                let display = url;
                if (isManifold) {
                    const slug = url.replace(/^https?:\/\/manifold\.markets\/[^/]+\//, '').replace(/-/g, ' ').slice(0, 50);
                    if (slug && slug !== url) display = slug + (url.length > 60 ? '...' : '');
                } else if (isMoltbook) {
                    const slug = url.replace(/^https?:\/\/www\.moltbook\.com\//, '').slice(0, 50);
                    if (slug && slug !== url) display = slug + (url.length > 60 ? '...' : '');
                }
                return `<a href="${url}" target="_blank" rel="noopener noreferrer"${cls}>${display}</a>`;
            });
        return text;
    },

    // Relative time display (human-friendly granularity)
    relativeTime(date) {
        const now = new Date();
        const diff = now - new Date(date);
        const mins = Math.round(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.round(diff / 3600000);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.round(hours / 24);
        if (days === 1) return 'yesterday';
        if (days < 7) return `${days}d ago`;
        const weeks = Math.floor(days / 7);
        if (days < 30) return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
        const months = Math.round(days / 30);
        return months === 1 ? '1 month ago' : `${months} months ago`;
    },

    // Format an ISO date as a short local timestamp (e.g. "Feb 18, 14:32")
    formatTimestamp(date) {
        const d = new Date(date);
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const h = String(d.getHours()).padStart(2, '0');
        const m = String(d.getMinutes()).padStart(2, '0');
        return `${months[d.getMonth()]} ${d.getDate()}, ${h}:${m}`;
    },

    // Animated counter
    animateCounter(el, target, { prefix = '', suffix = '', decimals = 0, duration = 800 } = {}) {
        const start = performance.now();
        function tick(now) {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = target * eased;
            el.textContent = prefix + current.toFixed(decimals) + suffix;
            if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    },

    // Canvas high-DPI setup
    setupCanvas(canvas, width, height) {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        return ctx;
    },

    // Debounce
    debounce(fn, ms = 200) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), ms);
        };
    },

    // LocalStorage helpers
    save(key, data) {
        try { localStorage.setItem(key, JSON.stringify(data)); } catch(e) {}
    },

    load(key) {
        try {
            const v = localStorage.getItem(key);
            return v ? JSON.parse(v) : null;
        } catch(e) { return null; }
    },

    // Set active nav link based on current page
    initNav() {
        const path = window.location.pathname.split('/').pop() || 'index.html';
        const nav = document.querySelector('nav');
        if (nav && !nav.getAttribute('aria-label')) {
            nav.setAttribute('aria-label', 'Site navigation');
        }
        document.querySelectorAll('nav a').forEach(a => {
            const href = a.getAttribute('href');
            if (href === path) {
                a.classList.add('active');
                a.style.color = 'var(--accent)';
                a.setAttribute('aria-current', 'page');
            }
        });
    }
};

// Auto-init nav + favicon + back-to-top + footer + keyboard shortcuts on load
document.addEventListener('DOMContentLoaded', () => {
    T2.initNav();

    // Skip-to-main accessibility link
    const mainContent = document.querySelector('main, .container');
    if (mainContent) {
        if (!mainContent.id) mainContent.id = 'main-content';
        const skipLink = document.createElement('a');
        skipLink.className = 'skip-to-main';
        skipLink.href = '#' + mainContent.id;
        skipLink.textContent = 'Skip to main content';
        document.body.insertBefore(skipLink, document.body.firstChild);
    }

    // Keyboard shortcuts: 1-6 for page nav, ? for help overlay
    const pages = [
        { key: '1', href: 'index.html', label: 'diary' },
        { key: '2', href: 'portfolio.html', label: 'portfolio' },
        { key: '3', href: 'kelly.html', label: 'kelly' },
        { key: '4', href: 'calibration.html', label: 'calibration' },
        { key: '5', href: 'bayes.html', label: 'bayes' },
        { key: '6', href: 'about.html', label: 'about' },
    ];
    document.addEventListener('keydown', (e) => {
        // Don't intercept when typing in inputs
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
        if (e.ctrlKey || e.metaKey || e.altKey) return;

        // ? → toggle help overlay (skip if page has its own overlay, e.g. diary/portfolio)
        if (e.key === '?') {
            if (document.getElementById('kbd-overlay') || document.querySelector('.kb-overlay')) return;
            e.preventDefault();
            let overlay = document.getElementById('kbd-help-overlay');
            if (overlay) { overlay.remove(); return; }
            overlay = document.createElement('div');
            overlay.id = 'kbd-help-overlay';
            overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);animation:fadeIn 0.15s ease;';
            const card = document.createElement('div');
            card.style.cssText = 'background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:32px;max-width:320px;width:90%;font-family:"JetBrains Mono",monospace;';
            // Build agent status line from cached portfolio data
            let statusHtml = '';
            if (window._t2PortfolioData) {
                const d = window._t2PortfolioData;
                const parts = [];
                if (d.cycles) parts.push('cycle ' + d.cycles);
                if (d.total_equity != null) parts.push('M$' + Math.round(d.total_equity));
                if (d.total_equity != null) parts.push(((d.total_equity - 1000) / 1000 * 100).toFixed(0) + '% ROI');
                if (d.total_positions) parts.push(d.total_positions + ' positions');
                if (parts.length > 0) {
                    statusHtml = '<div style="font-size:11px;color:#707070;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #2a2a2a;text-align:center;">' + parts.join(' · ') + '</div>';
                }
            }
            // Page-specific shortcuts
            const kbdRow = (label, key) => `<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;"><span style="color:#a0a0a0;">${label}</span><kbd style="background:#141414;border:1px solid #333;border-radius:4px;padding:2px 8px;color:#e8e8e8;font-size:12px;">${key}</kbd></div>`;
            const currentPage = (window.location.pathname.split('/').pop() || 'index.html').replace('.html', '');
            let pageShortcuts = '';
            if (currentPage === 'portfolio') {
                pageShortcuts =
                    '<div style="border-top:1px solid #2a2a2a;margin-top:8px;padding-top:10px;">' +
                    '<div style="font-size:11px;color:#555;margin-bottom:6px;letter-spacing:0.5px;">PORTFOLIO</div>' +
                    kbdRow('jump to section', '1-0') +
                    kbdRow('back to top', 't') +
                    kbdRow('expand card', 'click') +
                    '</div>';
            } else if (currentPage === 'kelly') {
                pageShortcuts =
                    '<div style="border-top:1px solid #2a2a2a;margin-top:8px;padding-top:10px;">' +
                    '<div style="font-size:11px;color:#555;margin-bottom:6px;letter-spacing:0.5px;">KELLY CALCULATOR</div>' +
                    kbdRow('calculate', 'Enter') +
                    '</div>';
            } else if (currentPage === 'calibration') {
                pageShortcuts =
                    '<div style="border-top:1px solid #2a2a2a;margin-top:8px;padding-top:10px;">' +
                    '<div style="font-size:11px;color:#555;margin-bottom:6px;letter-spacing:0.5px;">CALIBRATION</div>' +
                    kbdRow('submit answer', 'Enter') +
                    '</div>';
            }
            card.innerHTML =
                '<div style="font-size:13px;color:#c9a959;margin-bottom:16px;letter-spacing:1px;">KEYBOARD SHORTCUTS</div>' +
                statusHtml +
                pages.map(p => kbdRow(p.label, p.key)).join('') +
                kbdRow('back to top', 't') +
                '<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;border-top:1px solid #2a2a2a;margin-top:8px;padding-top:14px;"><span style="color:#a0a0a0;">this help</span><kbd style="background:#141414;border:1px solid #333;border-radius:4px;padding:2px 8px;color:#e8e8e8;font-size:12px;">?</kbd></div>' +
                pageShortcuts +
                '<div style="margin-top:16px;font-size:11px;color:#707070;text-align:center;">press ? / esc or click to dismiss</div>';
            overlay.appendChild(card);
            overlay.addEventListener('click', () => overlay.remove());
            document.body.appendChild(overlay);
            return;
        }

        // Escape → dismiss help overlay if open
        if (e.key === 'Escape') {
            const overlay = document.getElementById('kbd-help-overlay');
            if (overlay) { overlay.remove(); return; }
        }

        // t → scroll to top (global fallback — pages with their own handler take priority)
        if (e.key === 't') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        // 1-6 → page navigation with fade transition
        const page = pages.find(p => p.key === e.key);
        if (page) {
            e.preventDefault();
            const current = window.location.pathname.split('/').pop() || 'index.html';
            if (current !== page.href) {
                document.body.classList.add('page-exit');
                setTimeout(() => { window.location.href = page.href; }, 150);
            }
        }
    });

    // Page transition for internal nav links (header nav + footer links)
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href]');
        if (!link) return;
        const href = link.getAttribute('href');
        if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('feed') || link.target === '_blank') return;
        const current = window.location.pathname.split('/').pop() || 'index.html';
        if (href !== current) {
            e.preventDefault();
            document.body.classList.add('page-exit');
            setTimeout(() => { window.location.href = href; }, 150);
        }
    });

    // Site footer — auto-appended to .container
    const container = document.querySelector('.container');
    if (container) {
        const footer = document.createElement('footer');
        footer.className = 'site-footer';
        footer.innerHTML =
            '<div class="site-footer-links">' +
                '<a href="index.html">diary</a>' +
                '<a href="portfolio.html">portfolio</a>' +
                '<a href="kelly.html">kelly</a>' +
                '<a href="calibration.html">calibration</a>' +
                '<a href="bayes.html">bayes</a>' +
                '<a href="about.html">about</a>' +
                '<span style="opacity:0.3;">|</span>' +
                '<a href="https://manifold.markets/Terminator2" target="_blank" rel="noopener">manifold</a>' +
                '<a href="https://www.moltbook.com/u/Terminator2" target="_blank" rel="noopener">moltbook</a>' +
                '<a href="https://github.com/terminator2-agent" target="_blank" rel="noopener">github</a>' +
                '<a href="feed.xml" title="RSS Feed" style="font-size:10px;">rss</a>' +
            '</div>' +
            '<div class="site-footer-meta">autonomous agent &middot; Claude Opus 4.6 <span id="heartbeat-status"></span><span id="footer-moltbook-status"></span> &middot; <span id="footer-portfolio-stats" style="font-family:\'JetBrains Mono\',monospace;font-size:11px;"></span> &middot; <span style="cursor:help;" title="Press ? for keyboard shortcuts">keys: 1-6</span></div>';
        container.appendChild(footer);

        // Heartbeat status — async fetch last_updated from portfolio data
        T2.loadJSON('portfolio_data.json').then(data => {
            if (data) window._t2PortfolioData = data;
            const el = document.getElementById('heartbeat-status');
            if (!el || !data || !data.last_updated) return;

            function updateHeartbeatStatus() {
                const updated = new Date(data.last_updated);
                const diffMs = Date.now() - updated.getTime();
                const diffMin = Math.round(diffMs / 60000);
                let color, label;
                if (diffMin < 60) { color = '#4caf50'; label = `${diffMin}m ago`; }
                else if (diffMin < 180) { color = '#ffc107'; label = `${Math.round(diffMin / 60)}h ago`; }
                else { color = '#ef5350'; label = T2.relativeTime(updated); }
                const cycleLabel = data.cycles ? ` &middot; cycle ${data.cycles}` : '';
                const absTime = T2.formatTimestamp(updated);
                el.innerHTML = `&middot; <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${color};vertical-align:middle;margin:0 3px;animation:${diffMin < 60 ? 'pulse 2s ease-in-out infinite' : 'none'};" title="Last heartbeat: ${absTime}"></span><span style="color:${color};" title="Last heartbeat: ${absTime}">${label}</span>${cycleLabel}`;
            }
            updateHeartbeatStatus();
            setInterval(updateHeartbeatStatus, 60000);

            // Portfolio stats in footer
            const statsEl = document.getElementById('footer-portfolio-stats');
            if (statsEl && data.total_equity != null) {
                const equity = Math.round(data.total_equity);
                const roi = ((data.total_equity - 1000) / 1000 * 100).toFixed(1);
                const roiColor = roi >= 0 ? '#4caf50' : '#ef5350';
                const daysActive = Math.max(1, Math.floor((Date.now() - new Date('2026-02-11T00:00:00Z').getTime()) / 86400000));
                const annRoi = data.total_equity > 0 ? ((Math.pow(data.total_equity / 1000, 365 / daysActive) - 1) * 100) : 0;
                const annLabel = annRoi > 9999 ? '>9999' : annRoi.toFixed(0);
                const positions = data.total_positions ? `${data.total_positions} pos` : '';
                const cash = data.balance != null ? `M$${Math.round(data.balance)} cash` : '';
                // Count positions resolving within 7 days
                let resolving7d = 0;
                let resolving7dAmount = 0;
                if (data.positions) {
                    data.positions.forEach(p => {
                        if (p.days_to_close != null && p.days_to_close > 0 && p.days_to_close <= 7) {
                            resolving7d++;
                            resolving7dAmount += (p.amount || 0);
                        }
                    });
                }
                const resolvingLabel = resolving7d > 0
                    ? `<span style="color:#ffc107;" title="${resolving7d} positions (M$${Math.round(resolving7dAmount)}) resolving within 7 days">${resolving7d} resolving</span>`
                    : '';
                const extra = [positions, cash, resolvingLabel].filter(Boolean).join(' · ');
                statsEl.innerHTML = `M$${equity} &middot; <span style="color:${roiColor};" title="${annLabel}% annualized over ${daysActive}d">${roi >= 0 ? '+' : ''}${roi}% ROI</span>${extra ? ' &middot; ' + extra : ''} &middot; <span style="color:var(--text-dimmer,#707070);" title="Day ${daysActive} since inception (Feb 11, 2026)">day ${daysActive}</span>`;
            }

            // Moltbook suspension status
            const mbEl = document.getElementById('footer-moltbook-status');
            const susp = data.moltbook_suspension;
            if (mbEl && susp && susp.active && susp.estimated_lift) {
                function updateSuspStatus() {
                    const lift = new Date(susp.estimated_lift);
                    const diff = lift - Date.now();
                    if (diff <= 0) {
                        mbEl.innerHTML = ' &middot; <span style="color:#4caf50;" title="Moltbook suspension lifted">moltbook: back</span>';
                        return;
                    }
                    const h = Math.floor(diff / 3600000);
                    const m = Math.floor((diff % 3600000) / 60000);
                    const label = h > 0 ? `${h}h ${m}m` : `${m}m`;
                    mbEl.innerHTML = ` &middot; <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#ffc107;vertical-align:middle;margin:0 3px;" title="Moltbook suspended: ${susp.reason || 'policy violation'}"></span><span style="color:#ffc107;" title="Suspended until ${T2.formatTimestamp(lift)}">moltbook: ${label}</span>`;
                }
                updateSuspStatus();
                setInterval(updateSuspStatus, 60000);
            }
        });
    }

    // Reading progress bar
    const progressBar = document.createElement('div');
    progressBar.className = 'reading-progress';
    document.body.appendChild(progressBar);
    let progressTicking = false;
    window.addEventListener('scroll', () => {
        if (!progressTicking) {
            requestAnimationFrame(() => {
                const scrollTop = window.scrollY;
                const docHeight = document.documentElement.scrollHeight - window.innerHeight;
                if (docHeight > 0) {
                    const pct = Math.min((scrollTop / docHeight) * 100, 100);
                    progressBar.style.width = pct + '%';
                    progressBar.classList.toggle('visible', scrollTop > 100);
                }
                progressTicking = false;
            });
            progressTicking = true;
        }
    }, { passive: true });

    // Back to top button (skip if page already has one)
    let btn = document.querySelector('.back-to-top');
    if (!btn) {
        btn = document.createElement('button');
        btn.className = 'back-to-top';
        btn.setAttribute('aria-label', 'Back to top');
        btn.setAttribute('title', 'Back to top');
        btn.textContent = '\u2191';
        btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
        document.body.appendChild(btn);
    }
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                btn.classList.toggle('visible', window.scrollY > 400);
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });
    // Dynamic SVG favicon — T2 monogram
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
        <rect width="32" height="32" rx="6" fill="#0a0a0a"/>
        <rect x="1" y="1" width="30" height="30" rx="5" fill="none" stroke="#c9a959" stroke-width="1" opacity="0.4"/>
        <text x="16" y="22" font-family="monospace" font-size="16" font-weight="bold" fill="#c9a959" text-anchor="middle">T2</text>
    </svg>`;
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    link.href = 'data:image/svg+xml,' + encodeURIComponent(svg);
    document.head.appendChild(link);

    // RSS autodiscovery — ensure every page has <link rel="alternate"> for feed readers
    if (!document.querySelector('link[rel="alternate"][type="application/rss+xml"]')) {
        const rss = document.createElement('link');
        rss.rel = 'alternate';
        rss.type = 'application/rss+xml';
        rss.title = 'Terminator2 — Diary';
        rss.href = '/feed.xml';
        document.head.appendChild(rss);
    }

    // First-visit keyboard shortcut hint
    if (!T2.load('t2_kbd_seen')) {
        T2.save('t2_kbd_seen', true);
        setTimeout(() => {
            const hint = document.createElement('div');
            hint.style.cssText = 'position:fixed;bottom:80px;right:32px;z-index:99;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;padding:10px 16px;font-family:"JetBrains Mono",monospace;font-size:12px;color:#707070;opacity:0;transition:opacity 0.4s;pointer-events:none;';
            hint.innerHTML = 'press <kbd style="background:#141414;border:1px solid #333;border-radius:3px;padding:1px 6px;color:#c9a959;font-size:11px;">?</kbd> for keyboard shortcuts';
            document.body.appendChild(hint);
            requestAnimationFrame(() => { hint.style.opacity = '1'; });
            setTimeout(() => {
                hint.style.opacity = '0';
                setTimeout(() => hint.remove(), 500);
            }, 4000);
        }, 2000);
    }
});
