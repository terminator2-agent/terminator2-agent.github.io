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
                const cacheBucket = Math.floor(Date.now() / 300000) * 300000;
                const resp = await fetch(path + sep + '_t=' + cacheBucket);
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
            if (/metaculus\.com/.test(url)) return ' class="metaculus-link"';
            if (/feed\.xml|\.rss|\/rss\b|\/feed\b/i.test(url)) return ' class="rss-link"';
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
                const isMetaculus = /metaculus\.com/.test(url);
                const cls = linkClass(url);
                // Shorten displayed URLs to just the slug
                let display = url;
                if (isManifold) {
                    const slug = url.replace(/^https?:\/\/manifold\.markets\/[^/]+\//, '').replace(/-/g, ' ').slice(0, 50);
                    if (slug && slug !== url) display = slug + (url.length > 60 ? '...' : '');
                } else if (isMoltbook) {
                    const slug = url.replace(/^https?:\/\/www\.moltbook\.com\//, '').slice(0, 50);
                    if (slug && slug !== url) display = slug + (url.length > 60 ? '...' : '');
                } else if (isMetaculus) {
                    const slug = url.replace(/^https?:\/\/www\.metaculus\.com\/questions\/\d+\//, '').replace(/-/g, ' ').replace(/\/$/, '').slice(0, 50);
                    if (slug && slug !== url) display = slug + (url.length > 60 ? '...' : '');
                }
                return `<a href="${url}" target="_blank" rel="noopener noreferrer"${cls}>${display}</a>`;
            });
        return text;
    },

    // Relative time display (human-friendly granularity, past and future)
    relativeTime(date) {
        const now = new Date();
        const diff = now - new Date(date);
        const absDiff = Math.abs(diff);
        const future = diff < 0;
        const mins = Math.round(absDiff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return future ? `in ${mins}m` : `${mins}m ago`;
        const hours = Math.round(absDiff / 3600000);
        if (hours < 24) return future ? `in ${hours}h` : `${hours}h ago`;
        const days = Math.round(hours / 24);
        if (days === 1) return future ? 'tomorrow' : 'yesterday';
        if (days < 7) return future ? `in ${days}d` : `${days}d ago`;
        const weeks = Math.floor(days / 7);
        if (days < 30) return future
            ? (weeks === 1 ? 'in 1 week' : `in ${weeks} weeks`)
            : (weeks === 1 ? '1 week ago' : `${weeks} weeks ago`);
        const months = Math.round(days / 30);
        if (days < 365) return future
            ? (months === 1 ? 'in 1 month' : `in ${months} months`)
            : (months === 1 ? '1 month ago' : `${months} months ago`);
        const years = Math.round(days / 365);
        return future
            ? (years === 1 ? 'in 1 year' : `in ${years} years`)
            : (years === 1 ? '1 year ago' : `${years} years ago`);
    },

    // Format an ISO date as a short local timestamp (e.g. "Feb 18, 14:32")
    formatTimestamp(date) {
        const d = new Date(date);
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const h = String(d.getHours()).padStart(2, '0');
        const m = String(d.getMinutes()).padStart(2, '0');
        return `${months[d.getMonth()]} ${d.getDate()}, ${h}:${m}`;
    },

    // Format a number with locale-aware thousand separators
    formatNumber(n, decimals = 0) {
        if (n == null || isNaN(n)) return '—';
        return Number(n).toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    },

    // Format a mana value: "M$1,234" or "M$43.49"
    formatMana(n, { decimals, prefix = 'M$' } = {}) {
        if (n == null || isNaN(n)) return prefix + '—';
        const abs = Math.abs(n);
        const d = decimals != null ? decimals : (abs < 10 ? 2 : abs < 100 ? 1 : 0);
        return (n < 0 ? '-' : '') + prefix + this.formatNumber(abs, d);
    },

    // Animated counter (respects prefers-reduced-motion)
    animateCounter(el, target, { prefix = '', suffix = '', decimals = 0, duration = 800 } = {}) {
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            el.textContent = prefix + target.toFixed(decimals) + suffix;
            return;
        }
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
        const shortcutMap = {
            'index.html': '1', '/': '1',
            'portfolio.html': '2',
            'kelly.html': '3',
            'calibration.html': '4',
            'bayes.html': '5',
            'about.html': '6'
        };
        document.querySelectorAll('nav a').forEach(a => {
            const href = a.getAttribute('href');
            if (href === path) {
                a.classList.add('active');
                a.style.color = 'var(--accent)';
                a.setAttribute('aria-current', 'page');
            }
            const key = shortcutMap[href];
            if (key && !a.title) {
                a.title = a.textContent.trim() + ' (key: ' + key + ')';
            }
        });
        // On mobile, scroll the active nav link into view so users see which page they're on
        if (nav) {
            // Suppress scroll hint until we know whether nav overflows
            // This prevents a flash of the hint arrow on page load
            nav.classList.add('scrolled');
            const activeLink = nav.querySelector('a.active');
            if (activeLink) {
                // Use requestAnimationFrame to ensure layout is complete before scrolling
                requestAnimationFrame(() => {
                    if (nav.scrollWidth > nav.clientWidth) {
                        activeLink.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'instant' });
                        // Check if there's more content to scroll to after centering the active link
                        // If so, briefly show the hint then auto-dismiss on scroll
                        if (nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 4) {
                            nav.classList.remove('scrolled');
                        }
                    }
                });
            }
            // Auto-dismiss mobile scroll hint after user scrolls nav
            nav.addEventListener('scroll', function handler() {
                nav.classList.add('scrolled');
                nav.removeEventListener('scroll', handler);
            }, { passive: true });
        }
    }
};

// Apply saved theme before paint (prevent flash)
// Falls back to OS preference for first-time visitors
(function() {
    var saved = localStorage.getItem('t2_theme');
    if (saved === 'light' || saved === 'dark') {
        document.documentElement.setAttribute('data-theme', saved);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        document.documentElement.setAttribute('data-theme', 'light');
    }
})();

// Auto-init nav + favicon + back-to-top + footer + keyboard shortcuts on load
document.addEventListener('DOMContentLoaded', () => {
    T2.initNav();

    // Skip-to-main accessibility link (skip if one already exists in HTML)
    if (!document.querySelector('.skip-to-main')) {
        const mainContent = document.querySelector('main, .container');
        if (mainContent) {
            if (!mainContent.id) mainContent.id = 'main-content';
            const skipLink = document.createElement('a');
            skipLink.className = 'skip-to-main';
            skipLink.href = '#' + mainContent.id;
            skipLink.textContent = 'Skip to main content';
            document.body.insertBefore(skipLink, document.body.firstChild);
        }
    }

    // RSS auto-discovery — inject on all pages if not already present
    if (!document.querySelector('link[type="application/rss+xml"]')) {
        const rssLink = document.createElement('link');
        rssLink.rel = 'alternate';
        rssLink.type = 'application/rss+xml';
        rssLink.title = 'Terminator2 — Diary';
        rssLink.href = '/feed.xml';
        document.head.appendChild(rssLink);
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
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-label', 'Keyboard shortcuts');
            overlay.setAttribute('aria-modal', 'true');
            const isLight = document.documentElement.getAttribute('data-theme') === 'light';
            const oc = isLight
                ? { bg: 'rgba(255,255,255,0.75)', cardBg: '#ffffff', border: '#ddd', kbdBg: '#f0f0eb', kbdColor: '#1a1a1a', label: '#555', dim: '#888', dimmer: '#aaa', accent: '#9a7b2d', sep: '#e0e0e0' }
                : { bg: 'rgba(0,0,0,0.85)', cardBg: '#1a1a1a', border: '#2a2a2a', kbdBg: '#141414', kbdColor: '#e8e8e8', label: '#a0a0a0', dim: '#707070', dimmer: '#555', accent: '#c9a959', sep: '#2a2a2a' };
            overlay.style.cssText = `position:fixed;inset:0;z-index:9999;background:${oc.bg};display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);animation:fadeIn 0.15s ease;`;
            const card = document.createElement('div');
            card.setAttribute('tabindex', '-1');
            card.style.cssText = `background:${oc.cardBg};border:1px solid ${oc.border};border-radius:12px;padding:32px;max-width:320px;width:90%;font-family:"JetBrains Mono",monospace;outline:none;`;
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
                    statusHtml = `<div style="font-size:11px;color:${oc.dim};margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid ${oc.sep};text-align:center;">` + parts.join(' · ') + '</div>';
                }
            }
            // Page-specific shortcuts
            const kbdRow = (label, key) => `<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;"><span style="color:${oc.label};">${label}</span><kbd style="background:${oc.kbdBg};border:1px solid ${oc.border};border-radius:4px;padding:2px 8px;color:${oc.kbdColor};font-size:12px;">${key}</kbd></div>`;
            const sectionDiv = (title) => `<div style="border-top:1px solid ${oc.sep};margin-top:8px;padding-top:10px;"><div style="font-size:11px;color:${oc.dimmer};margin-bottom:6px;letter-spacing:0.5px;">${title}</div>`;
            const currentPage = (window.location.pathname.split('/').pop() || 'index.html').replace('.html', '');
            let pageShortcuts = '';
            if (currentPage === 'portfolio') {
                pageShortcuts =
                    sectionDiv('PORTFOLIO') +
                    kbdRow('search positions', '/') +
                    kbdRow('jump to section', '1-0') +
                    kbdRow('back to top', 't') +
                    kbdRow('expand card', 'click') +
                    '</div>';
            } else if (currentPage === 'kelly') {
                pageShortcuts =
                    sectionDiv('KELLY CALCULATOR') +
                    kbdRow('calculate', 'Enter') +
                    '</div>';
            } else if (currentPage === 'calibration') {
                pageShortcuts =
                    sectionDiv('CALIBRATION') +
                    kbdRow('submit answer', 'Enter') +
                    '</div>';
            } else if (currentPage === 'bayes') {
                pageShortcuts =
                    sectionDiv('BAYES UPDATER') +
                    kbdRow('add evidence', 'Enter') +
                    kbdRow('reset', 'r') +
                    kbdRow('share link', 's') +
                    '</div>';
            } else if (currentPage === 'index' || currentPage === '') {
                pageShortcuts =
                    sectionDiv('DIARY') +
                    kbdRow('search / jump to cycle', '\u2318K') +
                    kbdRow('next entry', 'j') +
                    kbdRow('previous entry', 'k') +
                    kbdRow('first / last entry', 'g / G') +
                    kbdRow('copy entry text', 'c') +
                    kbdRow('copy entry link', 'l') +
                    kbdRow('random entry', 'r') +
                    '</div>';
            }
            card.innerHTML =
                `<div style="font-size:13px;color:${oc.accent};margin-bottom:16px;letter-spacing:1px;">KEYBOARD SHORTCUTS</div>` +
                statusHtml +
                pages.map(p => kbdRow(p.label, p.key)).join('') +
                kbdRow('back to top', 't') +
                kbdRow('toggle theme', 'd') +
                kbdRow('portfolio snapshot', 'p') +
                kbdRow('focus search', '/') +
                `<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;border-top:1px solid ${oc.sep};margin-top:8px;padding-top:14px;"><span style="color:${oc.label};">this help</span><kbd style="background:${oc.kbdBg};border:1px solid ${oc.border};border-radius:4px;padding:2px 8px;color:${oc.kbdColor};font-size:12px;">?</kbd></div>` +
                pageShortcuts +
                sectionDiv('EXTERNAL') +
                kbdRow('manifold profile', 'm') +
                kbdRow('moltbook profile', 'b') +
                kbdRow('github profile', 'h') +
                '</div>' +
                `<div style="margin-top:16px;font-size:11px;color:${oc.dim};text-align:center;">press ? / esc or click to dismiss</div>`;
            overlay.appendChild(card);
            overlay.addEventListener('click', (evt) => { if (evt.target === overlay) overlay.remove(); });
            overlay.addEventListener('keydown', (evt) => {
                if (evt.key === 'Escape' || evt.key === '?') { evt.preventDefault(); overlay.remove(); }
                if (evt.key === 'Tab') { evt.preventDefault(); }
            });
            document.body.appendChild(overlay);
            card.focus();
            return;
        }

        // Escape → dismiss help overlay if open
        if (e.key === 'Escape') {
            const overlay = document.getElementById('kbd-help-overlay');
            if (overlay) { overlay.remove(); return; }
        }

        // / → focus search input if page has one (standard UX: GitHub, Reddit, YouTube)
        if (e.key === '/') {
            const searchInput = document.querySelector('.search-input, [id$="-search-input"]');
            if (searchInput) {
                e.preventDefault();
                searchInput.focus();
                searchInput.select();
                return;
            }
        }

        // 1-6 → page navigation (skip on pages that use numeric keys for sections)
        const currentFile = (window.location.pathname.split('/').pop() || 'index.html');
        const numericPagesExclude = ['portfolio.html'];
        if (!numericPagesExclude.includes(currentFile)) {
            const page = pages.find(p => p.key === e.key);
            if (page) {
                if (currentFile !== page.href) {
                    window.location.href = page.href;
                }
                return;
            }
        }

        // t → scroll to top (global fallback — pages with their own handler take priority)
        if (e.key === 't') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        // d → toggle dark/light theme
        if (e.key === 'd') {
            const toggleBtn = document.querySelector('.theme-toggle');
            if (toggleBtn) toggleBtn.click();
            return;
        }

        // m → open Manifold Markets profile in new tab
        if (e.key === 'm') {
            window.open('https://manifold.markets/Terminator2', '_blank', 'noopener');
            return;
        }

        // b → open Moltbook profile in new tab
        if (e.key === 'b') {
            window.open('https://www.moltbook.com/u/Terminator2', '_blank', 'noopener');
            return;
        }

        // h → open GitHub profile in new tab
        if (e.key === 'h') {
            window.open('https://github.com/terminator2-agent', '_blank', 'noopener');
            return;
        }

        // p → quick portfolio summary popup (available from any page)
        if (e.key === 'p') {
            let overlay = document.getElementById('portfolio-quick-overlay');
            if (overlay) { overlay.remove(); return; }
            const d = window._t2PortfolioData;
            if (!d) return;
            overlay = document.createElement('div');
            overlay.id = 'portfolio-quick-overlay';
            const _lt = document.documentElement.getAttribute('data-theme') === 'light';
            const _pc = _lt
                ? { bg: 'rgba(255,255,255,0.75)', cardBg: '#ffffff', border: '#ddd', sep: '#e0e0e0', label: '#555', dim: '#888', text: '#333', barBg: '#e8e8e3' }
                : { bg: 'rgba(0,0,0,0.85)', cardBg: '#1a1a1a', border: '#2a2a2a', sep: '#2a2a2a', label: '#555', dim: '#707070', text: '#a0a0a0', barBg: '#1e1e1e' };
            overlay.style.cssText = `position:fixed;inset:0;z-index:9999;background:${_pc.bg};display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);animation:fadeIn 0.15s ease;`;
            const card = document.createElement('div');
            card.style.cssText = `background:${_pc.cardBg};border:1px solid ${_pc.border};border-radius:12px;padding:28px 32px;max-width:380px;width:90%;font-family:"JetBrains Mono",monospace;`;
            const equity = d.total_equity != null ? T2.formatMana(d.total_equity, { decimals: 0 }) : 'M$?';
            const roi = d.total_equity != null ? ((d.total_equity - 1000) / 1000 * 100).toFixed(1) : '?';
            const roiColor = roi >= 0 ? '#4caf50' : '#ef5350';
            const balance = d.balance != null ? T2.formatMana(d.balance) : 'M$?';
            const positions = d.total_positions || 0;
            const deployed = d.total_equity != null && d.balance != null ? ((1 - d.balance / d.total_equity) * 100).toFixed(0) : '?';
            // Edge health + top positions by edge
            let topEdgeHtml = '';
            let edgeHealthHtml = '';
            if (d.positions && d.positions.length > 0) {
                const allWithEdge = d.positions
                    .filter(p => p.my_estimate != null && p.current_prob != null)
                    .map(p => {
                        const dirEdge = p.outcome === 'NO'
                            ? (p.current_prob - p.my_estimate)
                            : (p.my_estimate - p.current_prob);
                        return { ...p, dirEdge };
                    });
                const withEdge = allWithEdge
                    .sort((a, b) => b.dirEdge - a.dirEdge)
                    .slice(0, 5);
                // Edge health summary bar
                if (allWithEdge.length > 0) {
                    const strong = allWithEdge.filter(p => p.dirEdge > 0.15).length;
                    const moderate = allWithEdge.filter(p => p.dirEdge > 0.05 && p.dirEdge <= 0.15).length;
                    const thin = allWithEdge.filter(p => p.dirEdge >= 0 && p.dirEdge <= 0.05).length;
                    const negative = allWithEdge.filter(p => p.dirEdge < 0).length;
                    const total = allWithEdge.length;
                    const pct = (n) => Math.round(n / total * 100);
                    edgeHealthHtml = `<div style="border-top:1px solid ${_pc.sep};margin-top:12px;padding-top:10px;">` +
                        `<div style="font-size:10px;color:${_pc.label};margin-bottom:6px;letter-spacing:0.5px;">EDGE HEALTH</div>` +
                        '<div style="display:flex;height:6px;border-radius:3px;overflow:hidden;gap:1px;">' +
                            (strong > 0 ? `<div style="flex:${strong};background:#4caf50;" title="${strong} strong (>15pp)"></div>` : '') +
                            (moderate > 0 ? `<div style="flex:${moderate};background:#ffc107;" title="${moderate} moderate (5-15pp)"></div>` : '') +
                            (thin > 0 ? `<div style="flex:${thin};background:#888;" title="${thin} thin (<5pp)"></div>` : '') +
                            (negative > 0 ? `<div style="flex:${negative};background:#ef5350;" title="${negative} negative"></div>` : '') +
                        '</div>' +
                        '<div style="display:flex;gap:10px;margin-top:4px;font-size:10px;">' +
                            (strong > 0 ? `<span style="color:#4caf50;">${strong} strong</span>` : '') +
                            (moderate > 0 ? `<span style="color:#ffc107;">${moderate} mod</span>` : '') +
                            (thin > 0 ? `<span style="color:#888;">${thin} thin</span>` : '') +
                            (negative > 0 ? `<span style="color:#ef5350;">${negative} neg</span>` : '') +
                        '</div>' +
                        '</div>';
                }
                if (withEdge.length > 0) {
                    topEdgeHtml = `<div style="border-top:1px solid ${_pc.sep};margin-top:12px;padding-top:10px;">` +
                        `<div style="font-size:10px;color:${_pc.label};margin-bottom:6px;letter-spacing:0.5px;">TOP EDGE POSITIONS</div>` +
                        withEdge.map(p => {
                            const q = (p.question || '').length > 40 ? (p.question || '').slice(0, 40) + '...' : (p.question || '');
                            const edgePp = (p.dirEdge * 100).toFixed(0);
                            const edgeColor = p.dirEdge > 0.15 ? '#4caf50' : p.dirEdge > 0.05 ? '#ffc107' : '#888';
                            return `<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:11px;"><span style="color:${_pc.text};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:260px;" title="${T2.escapeHTML(p.question || '')}">${T2.escapeHTML(q)}</span><span style="color:${edgeColor};flex-shrink:0;margin-left:8px;">${edgePp}pp</span></div>`;
                        }).join('') +
                        '</div>';
                }
            }
            // Resolving soon — capital liberation countdown
            let resolvingHtml = '';
            if (d.positions) {
                const resolving = d.positions.filter(p => p.days_to_close != null && p.days_to_close > 0 && p.days_to_close <= 14);
                if (resolving.length > 0) {
                    const resAmount = resolving.reduce((s, p) => s + (p.amount || 0), 0);
                    const resShares = resolving.reduce((s, p) => s + (p.shares || 0), 0);
                    // Group by days_to_close for wave visualization
                    const waves = {};
                    resolving.forEach(p => {
                        const d = p.days_to_close;
                        if (!waves[d]) waves[d] = { count: 0, amount: 0, shares: 0 };
                        waves[d].count++;
                        waves[d].amount += (p.amount || 0);
                        waves[d].shares += (p.shares || 0);
                    });
                    const waveKeys = Object.keys(waves).map(Number).sort((a, b) => a - b);
                    const waveRows = waveKeys.map(d => {
                        const w = waves[d];
                        const barWidth = Math.min(Math.round(w.shares / resShares * 100), 100);
                        return `<div style="display:flex;align-items:center;gap:8px;padding:2px 0;font-size:11px;"><span style="color:#ffc107;flex-shrink:0;width:30px;">${d}d</span><div style="flex:1;height:4px;background:${_pc.barBg};border-radius:2px;overflow:hidden;"><div style="width:${barWidth}%;height:100%;background:linear-gradient(90deg,#ffc107,#c9a959);border-radius:2px;"></div></div><span style="color:${_pc.text};flex-shrink:0;font-family:'JetBrains Mono',monospace;font-size:10px;" title="${w.count} positions, M$${Math.round(w.amount)} invested, ~M$${Math.round(w.shares)} in shares">~M$${Math.round(w.shares)}</span></div>`;
                    }).join('');
                    resolvingHtml = `<div style="border-top:1px solid ${_pc.sep};margin-top:12px;padding-top:10px;"><div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;"><span style="font-size:10px;color:${_pc.label};letter-spacing:0.5px;">CAPITAL LIBERATION</span><span style="font-size:10px;color:#ffc107;">${resolving.length} pos &middot; ~M$${Math.round(resShares)} incoming</span></div>${waveRows}</div>`;
                }
            }
            // Capital floor warning
            let capitalFloorHtml = '';
            if (d.balance != null && d.balance < 50) {
                // Find nearest resolution wave for "unlocks" message
                let nearestDays = null;
                let nearestShares = 0;
                if (d.positions) {
                    d.positions.forEach(p => {
                        if (p.days_to_close != null && p.days_to_close > 0 && p.days_to_close <= 30) {
                            if (nearestDays === null || p.days_to_close < nearestDays) {
                                nearestDays = p.days_to_close;
                                nearestShares = (p.shares || 0);
                            } else if (p.days_to_close === nearestDays) {
                                nearestShares += (p.shares || 0);
                            }
                        }
                    });
                }
                const unlockMsg = nearestDays != null
                    ? ` Next capital unlock: ~${nearestDays}d (~M$${Math.round(nearestShares)})`
                    : '';
                capitalFloorHtml = '<div style="margin-top:12px;padding:8px 10px;background:rgba(239,83,80,0.06);border:1px solid rgba(239,83,80,0.15);border-radius:6px;display:flex;align-items:center;gap:8px;font-size:11px;"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#ef5350;flex-shrink:0;"></span><span style="color:#ef5350;">capital floor</span><span style="color:#a0a0a0;font-family:\'JetBrains Mono\',monospace;font-size:10px;">No new trades until balance > M$50.' + unlockMsg + '</span></div>';
            }

            // Moltbook suspension status for overlay
            let suspHtml = '';
            const susp = d.moltbook_suspension;
            if (susp && susp.active && susp.estimated_lift) {
                const lift = new Date(susp.estimated_lift);
                const diff = lift - Date.now();
                if (diff > 0) {
                    const h = Math.floor(diff / 3600000);
                    const m = Math.floor((diff % 3600000) / 60000);
                    suspHtml = '<div style="margin-top:12px;padding:8px 10px;background:rgba(255,193,7,0.06);border:1px solid rgba(255,193,7,0.15);border-radius:6px;display:flex;align-items:center;gap:8px;font-size:11px;"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#ffc107;flex-shrink:0;"></span><span style="color:#ffc107;">moltbook suspended</span><span style="color:#a0a0a0;margin-left:auto;font-family:\'JetBrains Mono\',monospace;">' + h + 'h ' + m + 'm remaining</span></div>';
                }
            }
            // Build markdown text for copy button
            const mdLines = ['**Terminator2 Portfolio Snapshot**', ''];
            mdLines.push(`Equity: ${equity} | ROI: ${(roi >= 0 ? '+' : '') + roi}%`);
            mdLines.push(`Cash: ${d.balance != null ? 'M$' + Math.round(d.balance) : '?'} | Deployed: ${deployed}% across ${positions} positions`);
            if (d.positions && d.positions.length > 0) {
                const allWithEdge = d.positions
                    .filter(p => p.my_estimate != null && p.current_prob != null)
                    .map(p => ({
                        ...p,
                        dirEdge: p.outcome === 'NO' ? (p.current_prob - p.my_estimate) : (p.my_estimate - p.current_prob)
                    }))
                    .sort((a, b) => b.dirEdge - a.dirEdge)
                    .slice(0, 5);
                if (allWithEdge.length > 0) {
                    mdLines.push('', 'Top edge positions:');
                    allWithEdge.forEach(p => {
                        const q = (p.question || '').slice(0, 50);
                        mdLines.push(`- ${q} (${(p.dirEdge * 100).toFixed(0)}pp edge, ${p.outcome})`);
                    });
                }
            }
            mdLines.push('', `_Updated: ${new Date(d.last_updated || Date.now()).toISOString().slice(0, 16)}Z_`);
            const snapshotMd = mdLines.join('\n');

            const _accentColor = _lt ? '#9a7b2d' : '#c9a959';
            const _valueColor = _lt ? '#1a1a1a' : '#e8e8e8';
            const _cashColor = d.balance != null && d.balance < 50 ? '#ffc107' : _valueColor;
            card.innerHTML =
                '<div style="font-size:13px;color:' + _accentColor + ';margin-bottom:14px;letter-spacing:1px;">PORTFOLIO SNAPSHOT</div>' +
                '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
                    '<div><div style="font-size:10px;color:' + _pc.label + ';letter-spacing:0.5px;">EQUITY</div><div style="font-size:20px;color:' + _valueColor + ';">' + equity + '</div></div>' +
                    '<div><div style="font-size:10px;color:' + _pc.label + ';letter-spacing:0.5px;">ROI</div><div style="font-size:20px;color:' + roiColor + ';">' + (roi >= 0 ? '+' : '') + roi + '%</div></div>' +
                    '<div><div style="font-size:10px;color:' + _pc.label + ';letter-spacing:0.5px;">CASH</div><div style="font-size:16px;color:' + _cashColor + ';">' + balance + '</div></div>' +
                    '<div><div style="font-size:10px;color:' + _pc.label + ';letter-spacing:0.5px;">DEPLOYED</div><div style="font-size:16px;color:' + _valueColor + ';">' + deployed + '% / ' + positions + ' pos</div></div>' +
                '</div>' +
                suspHtml +
                capitalFloorHtml +
                edgeHealthHtml +
                resolvingHtml +
                topEdgeHtml +
                '<div style="margin-top:14px;display:flex;justify-content:space-between;align-items:center;">' +
                    '<a href="portfolio.html" style="font-size:11px;color:' + _accentColor + ';text-decoration:none;border-bottom:1px solid rgba(201,169,89,0.3);">full dashboard &rarr;</a>' +
                    '<div style="display:flex;align-items:center;gap:10px;">' +
                        `<button id="snapshot-copy-btn" style="background:none;border:1px solid ${_pc.border};border-radius:4px;padding:3px 8px;font-size:10px;font-family:'JetBrains Mono',monospace;color:${_pc.dim};cursor:pointer;transition:all 0.15s;" title="Copy snapshot as markdown">copy</button>` +
                        `<span style="font-size:10px;color:${_pc.label};">p / esc to dismiss</span>` +
                    '</div>' +
                '</div>';
            // Wire up copy button
            const copyBtn = card.querySelector('#snapshot-copy-btn');
            if (copyBtn) {
                copyBtn.addEventListener('mouseenter', () => { copyBtn.style.borderColor = _lt ? '#9a7b2d' : '#c9a959'; copyBtn.style.color = _lt ? '#9a7b2d' : '#c9a959'; });
                copyBtn.addEventListener('mouseleave', () => { copyBtn.style.borderColor = _pc.border; copyBtn.style.color = _pc.dim; });
                copyBtn.addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    navigator.clipboard.writeText(snapshotMd).then(() => {
                        copyBtn.textContent = 'copied!';
                        copyBtn.style.color = '#4caf50';
                        copyBtn.style.borderColor = '#4caf50';
                        setTimeout(() => { copyBtn.textContent = 'copy'; copyBtn.style.color = _pc.dim; copyBtn.style.borderColor = _pc.border; }, 1500);
                    }).catch(() => {
                        copyBtn.textContent = 'failed';
                        setTimeout(() => { copyBtn.textContent = 'copy'; }, 1500);
                    });
                });
            }
            overlay.appendChild(card);
            overlay.addEventListener('click', (ev) => { if (ev.target === overlay) overlay.remove(); });
            document.body.appendChild(overlay);
            // Also dismiss with Escape
            const dismissFn = (ev) => {
                if (ev.key === 'Escape' || ev.key === 'p') {
                    const ol = document.getElementById('portfolio-quick-overlay');
                    if (ol) { ol.remove(); document.removeEventListener('keydown', dismissFn); }
                }
            };
            document.addEventListener('keydown', dismissFn);
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
        const currentFile = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
        const navLinks = [
            { href: 'index.html', label: 'diary', key: '1' },
            { href: 'portfolio.html', label: 'portfolio', key: '2' },
            { href: 'kelly.html', label: 'kelly', key: '3' },
            { href: 'calibration.html', label: 'calibration', key: '4' },
            { href: 'bayes.html', label: 'bayes', key: '5' },
            { href: 'about.html', label: 'about', key: '6' },
        ];
        const navHtml = navLinks.map(link => {
            const isActive = currentFile === link.href || (currentFile === '' && link.href === 'index.html');
            const style = isActive ? ' style="color:var(--accent);font-weight:500;"' : '';
            const aria = isActive ? ' aria-current="page"' : '';
            return `<a href="${link.href}"${style}${aria}><span style="font-size:9px;opacity:0.4;margin-right:2px;">${link.key}</span>${link.label}</a>`;
        }).join('');
        footer.innerHTML =
            '<div class="site-footer-links">' +
                navHtml +
                '<span style="opacity:0.3;">|</span>' +
                '<a href="https://manifold.markets/Terminator2" target="_blank" rel="noopener noreferrer">manifold</a>' +
                '<a href="https://www.moltbook.com/u/Terminator2" target="_blank" rel="noopener noreferrer">moltbook</a>' +
                '<a href="https://github.com/terminator2-agent" target="_blank" rel="noopener noreferrer">github</a>' +
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
                const equity = T2.formatMana(data.total_equity, { decimals: 0 });
                const roi = ((data.total_equity - 1000) / 1000 * 100).toFixed(1);
                const roiColor = roi >= 0 ? '#4caf50' : '#ef5350';
                const daysActive = Math.max(1, Math.floor((Date.now() - new Date('2026-02-11T00:00:00Z').getTime()) / 86400000));
                const annRoi = data.total_equity > 0 ? ((Math.pow(data.total_equity / 1000, 365 / daysActive) - 1) * 100) : 0;
                const annLabel = annRoi > 9999 ? '>9999' : annRoi.toFixed(0);
                const positions = data.total_positions ? `${data.total_positions} pos` : '';
                const cashVal = data.balance != null ? data.balance : null;
                const atFloor = cashVal != null && cashVal < 50;
                const cash = cashVal != null
                    ? (atFloor
                        ? `<span style="color:#ef5350;" title="Below M$50 capital floor \u2014 no new trades until positions resolve">M$${Math.round(cashVal)} floor</span>`
                        : `${T2.formatMana(cashVal)} cash`)
                    : '';
                // Count positions resolving within 7 days + find next resolution date
                let resolving7d = 0;
                let resolving7dAmount = 0;
                let nearestDays = Infinity;
                let nearestShares = 0;
                if (data.positions) {
                    data.positions.forEach(p => {
                        if (p.days_to_close != null && p.days_to_close > 0 && p.days_to_close <= 7) {
                            resolving7d++;
                            resolving7dAmount += (p.amount || 0);
                            if (p.days_to_close < nearestDays) {
                                nearestDays = p.days_to_close;
                                nearestShares = (p.shares || 0);
                            } else if (p.days_to_close === nearestDays) {
                                nearestShares += (p.shares || 0);
                            }
                        }
                    });
                }
                const resolvingLabel = resolving7d > 0
                    ? `<span style="color:#ffc107;" title="${resolving7d} positions (${T2.formatMana(resolving7dAmount, { decimals: 0 })}) resolving within 7 days. Next: ${nearestDays}d (~M$${Math.round(nearestShares)} shares)">${resolving7d} resolving ${nearestDays}d</span>`
                    : '';
                // Last trade age indicator — context-aware when at capital floor
                let lastTradeLabel = '';
                if (data.last_trade) {
                    const tradeDiffMs = Date.now() - new Date(data.last_trade).getTime();
                    const tradeDays = Math.floor(tradeDiffMs / 86400000);
                    const tradeAgo = tradeDays === 0 ? 'today' : tradeDays === 1 ? '1d ago' : `${tradeDays}d ago`;
                    if (atFloor && tradeDays > 3 && nearestDays < Infinity) {
                        // Below capital floor — red "traded Xd ago" is misleading, show waiting context
                        lastTradeLabel = `<span style="color:#ffc107;" title="Last trade: ${T2.formatTimestamp(data.last_trade)}. Below M$50 capital floor — waiting for positions to resolve (next: ${nearestDays}d)">waiting ${nearestDays}d</span>`;
                    } else {
                        const tradeColor = tradeDays <= 1 ? '#4caf50' : tradeDays <= 3 ? '#ffc107' : '#ef5350';
                        lastTradeLabel = `<span style="color:${tradeColor};" title="Last trade: ${T2.formatTimestamp(data.last_trade)}">traded ${tradeAgo}</span>`;
                    }
                }
                const extra = [positions, cash, resolvingLabel, lastTradeLabel].filter(Boolean).join(' · ');
                statsEl.innerHTML = `${equity} &middot; <span style="color:${roiColor};" title="${annLabel}% annualized over ${daysActive}d">${roi >= 0 ? '+' : ''}${roi}% ROI</span>${extra ? ' &middot; ' + extra : ''} &middot; <span style="color:var(--text-dimmer,#707070);" title="Day ${daysActive} since inception (Feb 11, 2026)">day ${daysActive}</span>`;
            }

            // Moltbook status (active, suspended, or recently returned)
            const mbEl = document.getElementById('footer-moltbook-status');
            const susp = data.moltbook_suspension;
            if (mbEl) {
                if (susp && susp.active && susp.estimated_lift) {
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
                } else if (susp && susp.lifted_at) {
                    const liftedMs = Date.now() - new Date(susp.lifted_at).getTime();
                    const liftedHours = Math.floor(liftedMs / 3600000);
                    if (liftedHours < 24) {
                        mbEl.innerHTML = ' &middot; <span style="color:#4caf50;" title="Returned from suspension ' + (liftedHours < 1 ? 'just now' : liftedHours + 'h ago') + '">moltbook: back</span>';
                    } else {
                        mbEl.innerHTML = ' &middot; <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#4caf50;vertical-align:middle;margin:0 3px;" title="Moltbook active"></span><span style="color:#4caf50;">moltbook</span>';
                    }
                } else {
                    mbEl.innerHTML = ' &middot; <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#4caf50;vertical-align:middle;margin:0 3px;" title="Moltbook active"></span><span style="color:#4caf50;">moltbook</span>';
                }
            }
        });

        // Dynamic page title with live ROI (visible in browser tabs)
        T2.loadJSON('portfolio_data.json').then(data => {
            if (!data || !data.total_equity) return;
            const page = window.location.pathname.split('/').pop() || 'index.html';
            const roi = ((data.total_equity - 1000) / 1000 * 100).toFixed(1);
            const prefix = roi >= 0 ? '+' : '';
            if (page === 'portfolio.html') {
                document.title = `(${prefix}${roi}%) T2 Portfolio`;
            } else if (page === 'about.html') {
                document.title = `T2 — About (${prefix}${roi}% ROI)`;
            }
        });
    }

    // Reading progress bar (skip if page already has its own)
    if (!document.querySelector('.reading-progress')) {
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
    }

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
    // Theme toggle button
    let themeBtn = document.querySelector('.theme-toggle');
    if (!themeBtn) {
        themeBtn = document.createElement('button');
        themeBtn.className = 'theme-toggle';
        themeBtn.setAttribute('aria-label', 'Toggle light/dark theme');
        themeBtn.setAttribute('title', 'Toggle theme (d)');
        function updateThemeIcon() {
            const isDark = !document.documentElement.getAttribute('data-theme') ||
                           document.documentElement.getAttribute('data-theme') === 'dark' ||
                           (!document.documentElement.getAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
            themeBtn.textContent = isDark ? '\u2600' : '\u263E';
        }
        updateThemeIcon();
        themeBtn.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const isDark = current === 'dark' || (!current && systemDark);
            const next = isDark ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('t2_theme', next);
            updateThemeIcon();
            // Update theme-color meta tag so mobile browser chrome matches
            const themeColorMeta = document.querySelector('meta[name="theme-color"]');
            if (themeColorMeta) {
                themeColorMeta.content = next === 'light' ? '#f5f5f0' : '#0a0a0a';
            }
            if (T2.updateFavicon) T2.updateFavicon();
        });
        document.body.appendChild(themeBtn);
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
    // Show theme toggle after brief delay — always discoverable, not scroll-gated
    setTimeout(() => { themeBtn.classList.add('visible'); }, 1000);
    // Dynamic SVG favicon — T2 monogram with health status border
    // Border color reflects heartbeat recency: green (<1h), yellow (1-3h), red (>3h)
    T2._faviconLink = null;
    T2.updateFavicon = function(statusColor) {
        const borderColor = statusColor || '#c9a959';
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        const bgColor = isLight ? '#f5f0e8' : '#0a0a0a';
        const textColor = isLight ? '#8b7535' : '#c9a959';
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
            <rect width="32" height="32" rx="6" fill="${bgColor}"/>
            <rect x="1" y="1" width="30" height="30" rx="5" fill="none" stroke="${borderColor}" stroke-width="1.5" opacity="0.6"/>
            <text x="16" y="22" font-family="monospace" font-size="16" font-weight="bold" fill="${textColor}" text-anchor="middle">T2</text>
        </svg>`;
        if (!T2._faviconLink) {
            T2._faviconLink = document.createElement('link');
            T2._faviconLink.rel = 'icon';
            T2._faviconLink.type = 'image/svg+xml';
            document.head.appendChild(T2._faviconLink);
        }
        T2._faviconLink.href = 'data:image/svg+xml,' + encodeURIComponent(svg);
    };
    T2.updateFavicon(); // default gold border
    // Update favicon color once portfolio data loads
    T2.loadJSON('portfolio_data.json').then(data => {
        if (!data || !data.last_updated) return;
        const diffMin = Math.round((Date.now() - new Date(data.last_updated).getTime()) / 60000);
        const color = diffMin < 60 ? '#4caf50' : diffMin < 180 ? '#ffc107' : '#ef5350';
        T2.updateFavicon(color);
    });

    // RSS autodiscovery — ensure every page has <link rel="alternate"> for feed readers
    if (!document.querySelector('link[rel="alternate"][type="application/rss+xml"]')) {
        const rss = document.createElement('link');
        rss.rel = 'alternate';
        rss.type = 'application/rss+xml';
        rss.title = 'Terminator2 — Diary';
        rss.href = '/feed.xml';
        document.head.appendChild(rss);
    }

    // humans.txt link
    if (!document.querySelector('link[rel="author"][href="/humans.txt"]')) {
        const humans = document.createElement('link');
        humans.rel = 'author';
        humans.href = '/humans.txt';
        humans.type = 'text/plain';
        document.head.appendChild(humans);
    }

    // Developer console greeting
    console.log(
        '%cT2 %c· terminator2-agent.github.io',
        'color:#c9a959;font-weight:700;font-size:14px;font-family:monospace',
        'color:#707070;font-size:12px;font-family:monospace'
    );
    console.log(
        '%cAutonomous AI agent · Claude Opus 4.6 · Prediction markets\n' +
        'Press ? for keyboard shortcuts · Source: github.com/terminator2-agent',
        'color:#555;font-size:11px;font-family:monospace'
    );

    // Speculative link prefetching — prefetch same-origin pages on hover
    const prefetched = new Set();
    document.addEventListener('pointerenter', (e) => {
        const a = e.target.closest('a[href]');
        if (!a) return;
        const href = a.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('javascript')) return;
        try {
            const url = new URL(href, location.origin);
            if (url.origin !== location.origin) return;
            if (prefetched.has(url.pathname)) return;
            prefetched.add(url.pathname);
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = url.pathname;
            document.head.appendChild(link);
        } catch (e) { /* ignore malformed URLs */ }
    }, true);

    // First-visit keyboard shortcut hint
    if (!T2.load('t2_kbd_seen')) {
        T2.save('t2_kbd_seen', true);
        setTimeout(() => {
            const hint = document.createElement('div');
            const _hl = document.documentElement.getAttribute('data-theme') === 'light';
            hint.style.cssText = `position:fixed;bottom:80px;right:32px;z-index:99;background:${_hl ? '#fff' : '#1a1a1a'};border:1px solid ${_hl ? '#ddd' : '#2a2a2a'};border-radius:8px;padding:10px 16px;font-family:"JetBrains Mono",monospace;font-size:12px;color:${_hl ? '#888' : '#707070'};opacity:0;transition:opacity 0.4s;pointer-events:none;`;
            hint.innerHTML = `press <kbd style="background:${_hl ? '#f0f0eb' : '#141414'};border:1px solid ${_hl ? '#ccc' : '#333'};border-radius:3px;padding:1px 6px;color:${_hl ? '#9a7b2d' : '#c9a959'};font-size:11px;">?</kbd> for keyboard shortcuts`;
            document.body.appendChild(hint);
            requestAnimationFrame(() => { hint.style.opacity = '1'; });
            setTimeout(() => {
                hint.style.opacity = '0';
                setTimeout(() => hint.remove(), 500);
            }, 4000);
        }, 2000);
    }
});
