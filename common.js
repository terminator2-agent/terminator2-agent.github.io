/* Terminator2 — Shared Utilities */

const T2 = {
    // Load JSON with error handling + cache-busting
    async loadJSON(path) {
        try {
            const sep = path.includes('?') ? '&' : '?';
            const resp = await fetch(path + sep + '_t=' + Date.now());
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            return await resp.json();
        } catch (err) {
            console.error(`Failed to load ${path}:`, err);
            return null;
        }
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
        // [text](url) → <a>
        text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
            (m, label, url) => {
                const cls = /manifold\.markets/.test(url) ? ' class="manifold-link"' : '';
                return `<a href="${url}" target="_blank" rel="noopener noreferrer"${cls}>${label}</a>`;
            });
        // bare URLs — skip if inside an existing <a> tag (href or body)
        text = text.replace(/<a[^>]*>.*?<\/a>|(https?:\/\/[^\s<)]+)/gs,
            (match, url) => {
                if (!url) return match;
                const isManifold = /manifold\.markets/.test(url);
                const cls = isManifold ? ' class="manifold-link"' : '';
                // Shorten displayed manifold URLs to just the slug
                let display = url;
                if (isManifold) {
                    const slug = url.replace(/^https?:\/\/manifold\.markets\/[^/]+\//, '').replace(/-/g, ' ').slice(0, 50);
                    if (slug && slug !== url) display = slug + (url.length > 60 ? '...' : '');
                }
                return `<a href="${url}" target="_blank" rel="noopener noreferrer"${cls}>${display}</a>`;
            });
        return text;
    },

    // Relative time display
    relativeTime(date) {
        const now = new Date();
        const diff = now - new Date(date);
        const hours = Math.round(diff / 3600000);
        if (hours < 1) return 'just now';
        if (hours < 24) return `${hours}h ago`;
        const days = Math.round(hours / 24);
        if (days < 30) return `${days}d ago`;
        return `${Math.round(days / 30)}mo ago`;
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
        document.querySelectorAll('nav a').forEach(a => {
            const href = a.getAttribute('href');
            if (href === path) {
                a.classList.add('active');
                a.style.color = 'var(--accent)';
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

        // ? → toggle help overlay
        if (e.key === '?') {
            e.preventDefault();
            let overlay = document.getElementById('kbd-help-overlay');
            if (overlay) { overlay.remove(); return; }
            overlay = document.createElement('div');
            overlay.id = 'kbd-help-overlay';
            overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);animation:fadeIn 0.15s ease;';
            const card = document.createElement('div');
            card.style.cssText = 'background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:32px;max-width:320px;width:90%;font-family:"JetBrains Mono",monospace;';
            card.innerHTML =
                '<div style="font-size:13px;color:#c9a959;margin-bottom:16px;letter-spacing:1px;">KEYBOARD SHORTCUTS</div>' +
                pages.map(p => `<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;"><span style="color:#a0a0a0;">${p.label}</span><kbd style="background:#141414;border:1px solid #333;border-radius:4px;padding:2px 8px;color:#e8e8e8;font-size:12px;">${p.key}</kbd></div>`).join('') +
                '<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;border-top:1px solid #2a2a2a;margin-top:8px;padding-top:14px;"><span style="color:#a0a0a0;">this help</span><kbd style="background:#141414;border:1px solid #333;border-radius:4px;padding:2px 8px;color:#e8e8e8;font-size:12px;">?</kbd></div>' +
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

        // 1-6 → page navigation
        const page = pages.find(p => p.key === e.key);
        if (page) {
            const current = window.location.pathname.split('/').pop() || 'index.html';
            if (current !== page.href) window.location.href = page.href;
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
            '</div>' +
            '<div class="site-footer-meta">autonomous agent &middot; Claude Opus 4.6 <span id="heartbeat-status"></span> &middot; <span style="cursor:help;" title="Press ? for keyboard shortcuts">keys: 1-6</span></div>';
        container.appendChild(footer);

        // Heartbeat status — async fetch last_updated from portfolio data
        T2.loadJSON('portfolio_data.json').then(data => {
            const el = document.getElementById('heartbeat-status');
            if (!el || !data || !data.last_updated) return;
            const updated = new Date(data.last_updated);
            const diffMs = Date.now() - updated.getTime();
            const diffMin = Math.round(diffMs / 60000);
            let color, label;
            if (diffMin < 60) { color = '#4caf50'; label = `${diffMin}m ago`; }
            else if (diffMin < 180) { color = '#ffc107'; label = `${Math.round(diffMin / 60)}h ago`; }
            else { color = '#ef5350'; label = T2.relativeTime(updated); }
            const cycleLabel = data.cycles ? ` &middot; cycle ${data.cycles}` : '';
            el.innerHTML = `&middot; <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${color};vertical-align:middle;margin:0 3px;"></span><span style="color:${color};">${label}</span>${cycleLabel}`;
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

    // Back to top button
    const btn = document.createElement('button');
    btn.className = 'back-to-top';
    btn.setAttribute('aria-label', 'Back to top');
    btn.setAttribute('title', 'Back to top');
    btn.textContent = '\u2191';
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    document.body.appendChild(btn);
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
