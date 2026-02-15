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
    linkify(text) {
        // [text](url) → <a>
        text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
            '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
        // bare URLs — skip if inside an existing <a> tag (href or body)
        text = text.replace(/<a[^>]*>.*?<\/a>|(https?:\/\/[^\s<)]+)/gs,
            (match, url) => url
                ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
                : match);
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

// Auto-init nav on load
document.addEventListener('DOMContentLoaded', () => T2.initNav());
