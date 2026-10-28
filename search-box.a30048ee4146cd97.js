/* search-box.js — THE search box. One component mounted on every input where
   search appears (the chrome box in base.html, the phone drawer field, the
   /search hero bar) so they behave identically: suggestions (auto-suggest,
   debounced), recent searches (one shared localStorage list), scope memory,
   keyboard ("/" focuses the visible primary box; ↑/↓ move, Enter picks or
   submits, Esc closes then clears).

   Usage:
     SearchBox.mount(inputEl, {
       onSubmit(query, {source})  // default: navigate to /search?q=…&scope=…
       onChange(value)            // every input event
       onClear()                  // ✕ pressed (after the value is emptied)
       scopeProvider()            // scope to submit with; default: remembered scope (a scoped page's own scope wins)
       primary: true|false        // "/" target candidate (default true; the drawer says false)
       inline: true               // menu in flow after the container (drawer), not floating
       clearEl                    // ✕ button; default: .searchbox-clear inside the container
     })
       scopeChip: false           // no "in {name}" chip inside this box (the /search hero)
       onScopeChange(scope)       // the page scope chip was set/removed (scope = {param,label}|null)
   Mounting twice on the same input merges the options into the existing instance
   (base.html mounts the chrome box with defaults; /search re-mounts it with
   in-place handlers). Markup is design-system only: .card + .list-row (.on).

   Scope chip ("search within"): ONE input per page — a collection page never
   adds a second box, it sets body[data-search-scope="series=<slug>"] (+
   data-search-scope-label) and every mounted box shows the same removable
   "in {name}" chip (.searchbox-scope) left of the input; submits carry the
   param (/search?q=…&series=…). × removes it for this page (in memory; the
   page's default chip is back on reload). SearchBox.setScope({param,label}|null)
   does the same from script; SearchBox.focus() focuses the visible primary box
   (phones: opens the drawer field) — <a data-search-focus> does that on click. */
(function () {
    'use strict';

    var RECENT_KEY = 'recentSearches';   // same list search.html has always kept
    var SCOPE_KEY = 'as_search_scope';   // all | workspace | public
    var MAX_RECENT = 8;
    var SHOW_RECENT = 6;
    var DEBOUNCE_MS = 150;
    var MIN_CHARS = 2;
    var SCOPES = ['all', 'workspace', 'public'];

    var instances = [];
    var seq = 0;

    // ---- storage ----
    var recent = {
        get: function () {
            try {
                var v = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
                return Array.isArray(v) ? v.filter(function (s) { return s && typeof s.query === 'string'; }) : [];
            } catch (e) { return []; }
        },
        add: function (query, resultCount) {
            if (!query || !query.trim()) return;
            try {
                var list = recent.get().filter(function (s) { return s.query.toLowerCase() !== query.toLowerCase(); });
                list.unshift({ query: query, timestamp: Date.now(), resultCount: resultCount == null ? null : resultCount });
                localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
            } catch (e) { /* storage unavailable */ }
        },
        clear: function () {
            try { localStorage.removeItem(RECENT_KEY); } catch (e) { /* storage unavailable */ }
        }
    };
    var scope = {
        get: function () {
            try {
                var v = localStorage.getItem(SCOPE_KEY);
                return SCOPES.indexOf(v) >= 0 ? v : 'all';
            } catch (e) { return 'all'; }
        },
        set: function (v) {
            if (SCOPES.indexOf(v) < 0) return;
            try { localStorage.setItem(SCOPE_KEY, v); } catch (e) { /* storage unavailable */ }
        }
    };

    // ---- page scope ("in {name}") ----
    // {param:'series=slug', label:'Show name'} | null. Seeded from the <body>
    // data attributes; setScope() replaces it for this page view.
    var pageScope = null, scopeSeeded = false;
    function seedScope() {
        if (scopeSeeded || !document.body) return;   // the script loads in <head>
        scopeSeeded = true;
        var d = document.body.dataset;
        if (!d.searchScope) return;
        var p = d.searchScope.replace(/^[?&]+/, '');
        var m = p.match(/^(library|series|dataset)=(.+)$/);
        if (!m) return;
        var v = m[2];
        try { v = decodeURIComponent(v); } catch (e) { /* keep raw */ }
        pageScope = { param: m[1] + '=' + encodeURIComponent(v).replace(/%2F/g, '/'), label: d.searchScopeLabel || v };
    }

    function searchUrl(query, sc, sp) {
        seedScope();
        var u = '/search?q=' + encodeURIComponent(query);
        if (sc && sc !== 'all') u += '&scope=' + encodeURIComponent(sc);
        var param = sp === undefined ? (pageScope && pageScope.param) : (sp && sp.param);
        if (param) u += '&' + param;
        return u;
    }
    // The scope to submit with when the caller picked none: the remembered tab,
    // except on a page with its own scope ("in {name}"), where the page decides.
    // A tab remembered from another visit must not turn a public library search
    // into a "Your recordings" search that finds nothing.
    function defaultScope() {
        seedScope();
        return pageScope ? 'all' : scope.get();
    }
    function navigate(query, sc) {
        window.location.href = searchUrl(query, sc == null ? defaultScope() : sc);
    }
    function setScope(next) {
        seedScope();
        pageScope = next && next.param ? { param: String(next.param).replace(/^[?&]+/, ''), label: next.label || '' } : null;
        instances.forEach(function (b) {
            b.renderScope();
            if (b.opts.onScopeChange) b.opts.onScopeChange(pageScope);
        });
    }

    // ---- suggestion fetching (shared cache across boxes) ----
    var cache = new Map();
    function fetchSuggestions(query, type) {
        var key = (type || '') + ':' + query;
        if (cache.has(key)) return Promise.resolve(cache.get(key));
        var body = { query: query, limit: 10 };
        if (type) body.suggest_type = type;
        return fetch('/api/internal/auto-suggest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(body)
        }).then(function (r) { return r.ok ? r.json() : { suggestions: [] }; })
          .then(function (d) { var s = (d && d.suggestions) || []; cache.set(key, s); return s; })
          .catch(function () { return []; });
    }

    // speaker:/by: and podcast:/in: prefixes complete against that facet.
    function filterContext(value, cursor) {
        var before = value.substring(0, cursor);
        var m;
        if ((m = before.match(/(?:speaker|by):\s*"([^"]*)$/i)) || (m = before.match(/(?:speaker|by):\s*([^"\s]*)$/i))) return { type: 'speaker', partial: m[1] || '' };
        if ((m = before.match(/(?:podcast|in):\s*"([^"]*)$/i)) || (m = before.match(/(?:podcast|in):\s*([^"\s]*)$/i))) return { type: 'podcast', partial: m[1] || '' };
        return null;
    }

    function isVisible(el) {
        return !!el && el.offsetParent !== null && !el.closest('.hidden');
    }

    // ---- the instance ----
    function Box(input, opts) {
        this.input = input;
        this.opts = Object.assign({ primary: true, inline: false }, opts || {});
        this.id = 'searchbox-' + (++seq);
        this.container = this.opts.container || input.parentElement;
        seedScope();
        this.items = [];      // [{kind:'suggestion'|'recent'|'clear', ...}]
        this.active = -1;
        this.open = false;
        this.timer = null;
        this.reqSeq = 0;
        this.build();
        this.bind();
    }

    Box.prototype.build = function () {
        var menu = document.createElement('div');
        menu.className = 'card searchbox-menu hidden' + (this.opts.inline ? ' searchbox-inline' : '');
        menu.id = this.id + '-list';
        menu.setAttribute('role', 'listbox');
        if (this.opts.inline) this.container.insertAdjacentElement('afterend', menu);
        else { this.container.classList.add('searchbox-host'); this.container.appendChild(menu); }
        this.menu = menu;

        this.input.setAttribute('role', 'combobox');
        this.input.setAttribute('aria-autocomplete', 'list');
        this.input.setAttribute('aria-expanded', 'false');
        this.input.setAttribute('aria-controls', menu.id);
        this.input.setAttribute('aria-haspopup', 'listbox');

        this.clearEl = this.opts.clearEl || this.container.querySelector('.searchbox-clear');
        this.syncValueState();
        this.renderScope();
    };

    // The "in {name}" chip inside the box (left of the input). Design-system
    // chip; the × is a 24px target and removes the scope for this page.
    Box.prototype.renderScope = function () {
        if (this.opts.scopeChip === false) return;
        if (this.scopeEl) { this.scopeEl.remove(); this.scopeEl = null; }
        this.container.classList.toggle('searchbox-scoped', !!pageScope);
        if (!pageScope) return;
        var chip = document.createElement('span');
        chip.className = 'chip on searchbox-scope';
        var label = document.createElement('span');
        label.className = 'searchbox-scope-label';
        label.textContent = 'in ' + pageScope.label;
        label.title = pageScope.label;
        var x = document.createElement('a');
        x.className = 'searchbox-scope-x';
        x.href = '#';
        x.setAttribute('aria-label', 'Remove scope');
        x.textContent = '×';
        x.addEventListener('click', function (e) { e.preventDefault(); setScope(null); });
        chip.appendChild(label); chip.appendChild(x);
        this.container.insertBefore(chip, this.input);
        this.scopeEl = chip;
    };

    Box.prototype.syncValueState = function () {
        this.container.classList.toggle('searchbox-has-value', this.input.value.length > 0);
    };

    Box.prototype.bind = function () {
        var self = this, input = this.input;
        input.addEventListener('input', function () {
            self.syncValueState();
            if (self.opts.onChange) self.opts.onChange(input.value);
            self.schedule();
        });
        input.addEventListener('focus', function () { self.schedule(0); });
        input.addEventListener('blur', function () { self.close(); });
        input.addEventListener('keydown', function (e) { self.keydown(e); });
        // Clicks in the menu must not blur the input before they land.
        this.menu.addEventListener('mousedown', function (e) { e.preventDefault(); });
        this.menu.addEventListener('click', function (e) {
            var row = e.target.closest('[data-idx]');
            if (row) { self.pick(parseInt(row.getAttribute('data-idx'), 10)); return; }
            if (e.target.closest('[data-act="clear-recent"]')) { recent.clear(); self.render([]); }
        });
        var form = input.form;
        if (form) form.addEventListener('submit', function (e) { e.preventDefault(); self.submit('form'); });
        if (this.clearEl) {
            this.clearEl.addEventListener('click', function () {
                self.clear();
                if (self.opts.onClear) self.opts.onClear(); else input.focus();
            });
        }
    };

    Box.prototype.clear = function () {
        this.input.value = '';
        this.syncValueState();
        this.close();
        if (this.opts.onChange) this.opts.onChange('');
    };

    Box.prototype.schedule = function (ms) {
        var self = this;
        clearTimeout(this.timer);
        this.timer = setTimeout(function () { self.refresh(); }, ms == null ? DEBOUNCE_MS : ms);
    };

    Box.prototype.refresh = function () {
        var self = this, value = this.input.value, trimmed = value.trim();
        var seqNo = ++this.reqSeq;
        if (!trimmed) {
            var list = recent.get().slice(0, SHOW_RECENT);
            this.render(list.map(function (s) { return { kind: 'recent', text: s.query, meta: s.resultCount != null ? s.resultCount + ' results' : '' }; }));
            return;
        }
        var ctx = filterContext(value, this.input.selectionStart == null ? value.length : this.input.selectionStart);
        if (!ctx && trimmed.length < MIN_CHARS) { this.close(); return; }
        var q = ctx ? ctx.partial : trimmed;
        fetchSuggestions(q, ctx ? ctx.type : null).then(function (list) {
            if (seqNo !== self.reqSeq || document.activeElement !== self.input) return;
            if (ctx) {
                self.render(list.map(function (s) {
                    return { kind: 'filter', filterType: ctx.type, text: s.text, sub: s.metadata && s.metadata.subtitle || '', head: ctx.type === 'speaker' ? 'Speakers' : 'Podcasts' };
                }));
                return;
            }
            var podcasts = list.filter(function (s) { return s.type === 'podcast'; }).slice(0, 3);
            var episodes = list.filter(function (s) { return s.type === 'episode'; }).slice(0, 3);
            var others = list.filter(function (s) { return s.type !== 'podcast' && s.type !== 'episode'; }).slice(0, 4);
            var items = [];
            podcasts.forEach(function (s) { items.push(toItem(s, 'Podcasts')); });
            episodes.forEach(function (s) { items.push(toItem(s, 'Episodes')); });
            others.forEach(function (s) { items.push(toItem(s, 'Search for')); });
            self.render(items);
        });
    };

    function toItem(s, head) {
        var m = s.metadata || {};
        var href = null;
        if (s.type === 'episode' && m.podcast_slug && m.episode_slug) href = '/podcast/' + m.podcast_slug + '/episode/' + m.episode_slug;
        else if (s.type === 'podcast' && m.podcast_slug) href = '/podcast/' + m.podcast_slug;
        return { kind: 'suggestion', head: head, text: s.text, sub: m.subtitle || '', count: m.count || '', href: href };
    }

    Box.prototype.render = function (items) {
        this.items = items;
        this.active = -1;
        var menu = this.menu;
        menu.textContent = '';
        if (!items.length) { this.close(); return; }
        var lastHead = null, self = this;
        var isRecent = items[0].kind === 'recent';
        if (isRecent) {
            var head = document.createElement('div');
            head.className = 'searchbox-head';
            var k = document.createElement('span'); k.className = 'kicker'; k.textContent = 'Recent';
            var c = document.createElement('button'); c.type = 'button'; c.setAttribute('data-act', 'clear-recent'); c.textContent = 'Clear';
            head.appendChild(k); head.appendChild(c);
            menu.appendChild(head);
        }
        items.forEach(function (it, i) {
            if (!isRecent && it.head && it.head !== lastHead) {
                lastHead = it.head;
                var h = document.createElement('div'); h.className = 'searchbox-head';
                var kk = document.createElement('span'); kk.className = 'kicker'; kk.textContent = it.head;
                h.appendChild(kk); menu.appendChild(h);
            }
            var row = document.createElement('div');
            row.className = 'list-row searchbox-row';
            row.id = self.id + '-opt-' + i;
            row.setAttribute('role', 'option');
            row.setAttribute('aria-selected', 'false');
            row.setAttribute('data-idx', String(i));
            var body = document.createElement('div'); body.className = 'list-row-body';
            var title = document.createElement('div'); title.className = 'list-row-title';
            title.textContent = it.text + (it.href ? ' →' : '');
            body.appendChild(title);
            var metaText = it.sub || it.meta || '';
            if (metaText) { var meta = document.createElement('div'); meta.className = 'list-row-meta'; meta.textContent = metaText; body.appendChild(meta); }
            row.appendChild(body);
            if (it.count) { var cnt = document.createElement('span'); cnt.className = 'mono list-row-meta'; cnt.textContent = it.count; row.appendChild(cnt); }
            menu.appendChild(row);
        });
        menu.classList.remove('hidden');
        this.open = true;
        this.input.setAttribute('aria-expanded', 'true');
    };

    Box.prototype.close = function () {
        clearTimeout(this.timer);
        this.reqSeq++;
        this.open = false;
        this.active = -1;
        this.menu.classList.add('hidden');
        this.input.setAttribute('aria-expanded', 'false');
        this.input.removeAttribute('aria-activedescendant');
    };

    Box.prototype.move = function (delta) {
        if (!this.open || !this.items.length) return;
        var n = this.items.length;
        // -1 = nothing highlighted (the typed text); wraps through it.
        var next = this.active + delta;
        if (next >= n) next = -1;
        if (next < -1) next = n - 1;
        this.active = next;
        var self = this;
        this.menu.querySelectorAll('[data-idx]').forEach(function (row, i) {
            var on = i === self.active;
            row.classList.toggle('on', on);
            row.setAttribute('aria-selected', on ? 'true' : 'false');
            if (on) { self.input.setAttribute('aria-activedescendant', row.id); row.scrollIntoView({ block: 'nearest' }); }
        });
        if (this.active < 0) this.input.removeAttribute('aria-activedescendant');
    };

    Box.prototype.keydown = function (e) {
        switch (e.key) {
            case 'ArrowDown': if (this.open) { e.preventDefault(); this.move(1); } else { this.schedule(0); } break;
            case 'ArrowUp': if (this.open) { e.preventDefault(); this.move(-1); } break;
            case 'Enter':
                e.preventDefault();
                if (this.open && this.active >= 0) this.pick(this.active);
                else this.submit('enter');
                break;
            case 'Escape':
                e.preventDefault();
                if (this.open) this.close();
                else if (this.input.value) this.clear();
                else this.input.blur();
                break;
            default: break;
        }
    };

    Box.prototype.pick = function (i) {
        var it = this.items[i];
        if (!it) return;
        if (it.kind === 'filter') { this.insertFilter(it.filterType, it.text); return; }
        this.close();
        if (it.href) { window.location.href = it.href; return; }
        this.input.value = it.text;
        this.syncValueState();
        this.submit(it.kind);
    };

    Box.prototype.insertFilter = function (type, value) {
        var input = this.input, q = input.value;
        var cursor = input.selectionStart == null ? q.length : input.selectionStart;
        var before = q.substring(0, cursor), after = q.substring(cursor);
        var pat = type === 'speaker' ? /(?:speaker|by):\s*"?[^"\s]*$/i : /(?:podcast|in):\s*"?[^"\s]*$/i;
        var m = before.match(pat);
        if (m) {
            var pm = m[0].match(/^(speaker|by|podcast|in):\s*/i);
            var prefix = pm ? pm[0] : type + ':';
            var quoted = value.indexOf(' ') >= 0 ? '"' + value + '"' : value;
            var head = before.substring(0, m.index);
            input.value = head + prefix + quoted + ' ' + after.replace(/^\s+/, '');
            var pos = head.length + prefix.length + quoted.length + 1;
            input.focus();
            input.setSelectionRange(pos, pos);
            this.syncValueState();
            if (this.opts.onChange) this.opts.onChange(input.value);
        }
        this.close();
    };

    Box.prototype.submit = function (source) {
        var q = this.input.value.trim();
        if (!q) return;
        this.close();
        var sc = this.opts.scopeProvider ? this.opts.scopeProvider() : defaultScope();
        if (this.opts.onSubmit) this.opts.onSubmit(q, { source: source, scope: sc });
        else navigate(q, sc);
    };

    Box.prototype.setValue = function (v) {
        this.input.value = v || '';
        this.syncValueState();
    };

    // ---- "/" focuses the visible primary box (GitHub/YouTube convention) ----
    function primaryBox() {
        for (var i = 0; i < instances.length; i++) {
            if (instances[i].opts.primary !== false && isVisible(instances[i].input)) return instances[i];
        }
        return null;
    }
    document.addEventListener('keydown', function (e) {
        if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
        var t = e.target;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
        var box = primaryBox();
        if (!box) return;
        e.preventDefault();
        box.input.focus();
        box.input.select();
    });
    // Focus THE box: the visible primary one; on phones (none visible) open
    // the drawer and focus its field — the same target "/" would use.
    function focusBox() {
        var box = primaryBox();
        if (!box) {
            var toggle = document.getElementById('nav-toggle');
            if (toggle) toggle.click();
            var drawer = instances.find(function (b) { return b.opts.primary === false; });
            if (drawer) { setTimeout(function () { drawer.input.focus(); }, 50); return true; }
            return false;
        }
        box.input.focus();
        box.input.select();
        return true;
    }
    document.addEventListener('click', function (e) {
        var a = e.target.closest('[data-search-focus]');
        if (!a) return;
        e.preventDefault();
        focusBox();
    });

    window.SearchBox = {
        mount: function (input, opts) {
            if (!input) return null;
            var existing = instances.find(function (b) { return b.input === input; });
            if (existing) { Object.assign(existing.opts, opts || {}); existing.clearEl = existing.opts.clearEl || existing.clearEl; return existing; }
            var b = new Box(input, opts);
            instances.push(b);
            return b;
        },
        get: function (input) { return instances.find(function (b) { return b.input === input; }) || null; },
        primary: primaryBox,
        focus: focusBox,
        recent: recent,
        scope: scope,
        pageScope: function () { seedScope(); return pageScope; },
        setScope: setScope,
        navigate: navigate,
        url: searchUrl
    };
})();
