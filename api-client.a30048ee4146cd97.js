/**
 * UI feedback contract primitives — docs/ui-feedback-contract.md.
 * Loaded globally by base.html. Every state-changing interaction goes through
 * these so feedback looks and behaves identically app-wide:
 *
 *   api(method, url, body)   fetch wrapper: JSON in/out, throws Error(message)
 *   act(btn, fn, opts)       button state machine: spinner → "✓ done" → revert
 *   inlineError(el, msg)     error text beside the control (never alert())
 *   flashDone(el)            transient ✓ beside a non-button control
 *
 * (This file replaced the unused ApiClient class; the 401 → login-modal
 * behavior is the one thing carried over.)
 */

/**
 * Best-effort error telemetry: every failure a user could see rides the
 * existing client_events pipeline (event-tracker.js → /api/events/batch →
 * client_events table, event_category 'error'), so ops can alert on it with
 * session/user attribution. Must never throw or block the UX — and it's
 * absent on standalone marketing pages that load only this file, hence the
 * optional chaining.
 */
function reportUiError(data) {
    try {
        window.eventTracker?.track('ui.error', 'error', data);
    } catch (_) { /* telemetry must never break the page */ }
}

async function api(method, url, body) {
    let res;
    // FormData passes through untouched (the browser sets the multipart
    // boundary header itself); everything else is JSON.
    const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
    try {
        res = await fetch(url, {
            method,
            credentials: 'same-origin',
            headers: body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : {},
            body: isForm ? body : (body !== undefined ? JSON.stringify(body) : undefined),
        });
    } catch (_) {
        reportUiError({ url, method, status: 0, kind: 'network' });
        throw new Error('Network error — check your connection');
    }
    // 401 → login modal is handled UX (expired session), not a failure worth
    // alerting on; it is deliberately not beaconed.
    if (res.status === 401 && typeof showLoginModal === 'function') {
        showLoginModal();
        throw new Error('Please sign in first');
    }
    if (!res.ok) {
        let msg = await res.text();
        let code = null;
        let detail = null;
        try {
            const j = JSON.parse(msg);
            code = j.code || null;
            msg = j.error || j.message || j.detail || msg;
            detail = j; // the whole envelope, for callers that render its fields (quota walls)
        } catch (_) { /* plain-text error body */ }
        // Never surface an HTML error page (Cloudflare 502, render_500) or a
        // wall of text as inline error copy. A coded JSON error is the
        // server explaining itself (quota text with the plans link, file
        // limits) and gets room to do so — the 300-char cap swallowed every
        // 402 into "Request failed" for a week.
        const cap = code ? 700 : 300;
        if (!msg || /^\s*</.test(msg) || msg.length > cap) {
            msg = `Request failed (HTTP ${res.status})`;
        }
        reportUiError({ url, method, status: res.status, code, message: msg.slice(0, 200) });
        const err = new Error(msg);
        err.status = res.status;
        err.code = code; // machine-readable branch key, e.g. 'ALREADY_SUBSCRIBED'
        err.detail = detail; // parsed JSON body (null for plain-text errors)
        err.beaconed = true;
        throw err;
    }
    const ct = res.headers.get('content-type') || '';
    return ct.includes('application/json') ? res.json() : res.text();
}

/**
 * Run `fn` with the button in a busy state, then show a green done state.
 * Returns fn's result (or true) on success, false on failure. Failures are
 * already shown via inlineError — callers must not alert().
 */
async function act(btn, fn, opts = {}) {
    const { done = '✓ Done', busy = null, revertMs = 2000, confirmText = null } = opts;
    if (btn.dataset.busy) return false;
    if (confirmText && !confirm(confirmText)) return false;
    clearInlineError(btn);
    const label = btn.innerHTML;
    btn.dataset.busy = '1';
    btn.disabled = true;
    if (busy) btn.innerHTML = busy;
    try {
        const result = await fn();
        delete btn.dataset.busy;
        btn.classList.add('is-done');
        btn.innerHTML = done;
        setTimeout(() => {
            btn.classList.remove('is-done');
            btn.innerHTML = label;
            btn.disabled = false;
        }, revertMs);
        // Success must be truthy even when the endpoint returns 201/204 with
        // an empty body (api() resolves to '' there) — callers key off `if (ok)`.
        return result === undefined || result === null || result === '' ? true : result;
    } catch (e) {
        delete btn.dataset.busy;
        btn.disabled = false;
        btn.innerHTML = label;
        inlineError(btn, e.message);
        // api() failures already beaconed themselves; this catches JS bugs
        // in the callback itself (the stale-CDN class of breakage).
        if (!e.beaconed) {
            reportUiError({ url: location.pathname, kind: 'js', message: String(e && e.message).slice(0, 200) });
        }
        return false;
    }
}

/** Show an error message in a small element right after `anchor`. */
function inlineError(anchor, msg) {
    let el = anchor.nextElementSibling;
    if (!el || !el.classList || !el.classList.contains('action-error')) {
        el = document.createElement('span');
        el.className = 'action-error';
        anchor.insertAdjacentElement('afterend', el);
    }
    el.textContent = msg;
}

function clearInlineError(anchor) {
    const el = anchor.nextElementSibling;
    if (el && el.classList && el.classList.contains('action-error')) el.remove();
}

/** Transient success check beside a non-button control (select, checkbox…). */
function flashDone(anchor) {
    clearInlineError(anchor);
    const el = document.createElement('span');
    el.className = 'action-done-flash';
    el.textContent = '✓';
    anchor.insertAdjacentElement('afterend', el);
    setTimeout(() => el.remove(), 1500);
}
