/**
 * Follow — the ONE verb on public audio (docs/design-system.md).
 *
 * Binds every [data-follow] on the page:
 *   [data-follow-btn]      Follow ↔ ✓ Following (POST/DELETE /api/internal/follows/{id});
 *                          anonymous → sign-in with a return path.
 *   [data-follow-bar]      shown only while followed (same data-podcast-id, anywhere
 *                          on the page); holds the consequence switches.
 *   [data-follow-opt]      transcribe_now | email_alert | webhook_alert switches
 *                          (PATCH). Failures revert the switch + inline error.
 *   [data-unfollow]        row-menu Unfollow on the Recordings page (removes the row).
 *
 * Feedback follows docs/ui-feedback-contract.md: act()/api() from api-client.js,
 * inlineError() beside the control, never alert().
 */
(function () {
    'use strict';

    const SIGN_IN = '/login';
    const base = (id) => `/api/internal/follows/${encodeURIComponent(id)}`;

    function signIn() {
        const next = location.pathname + location.search;
        location.href = `${SIGN_IN}?next=${encodeURIComponent(next)}`;
    }

    function barsFor(id) {
        return Array.from(document.querySelectorAll(`[data-follow-bar][data-podcast-id="${CSS.escape(String(id))}"]`));
    }

    function wrappersFor(id) {
        return Array.from(document.querySelectorAll(`[data-follow][data-podcast-id="${CSS.escape(String(id))}"]`));
    }

    /** Paint a Follow button + its bars from a FollowState (or a bare followed flag). */
    function render(id, st) {
        const followed = !!(st && st.followed);
        wrappersFor(id).forEach((w) => {
            w.dataset.followed = followed ? 'true' : 'false';
            const btn = w.querySelector('[data-follow-btn]');
            if (!btn) return;
            btn.classList.toggle('btn-primary', !followed);
            btn.classList.toggle('btn-ghost', followed);
            btn.classList.toggle('follow-on', followed);
            btn.textContent = followed ? '✓ Following' : 'Follow';
        });
        barsFor(id).forEach((bar) => {
            bar.classList.toggle('hidden', !followed);
            bar.querySelectorAll('[data-follow-opt]').forEach((input) => {
                const key = input.dataset.followOpt;
                input.checked = followed && st && typeof st[key] === 'boolean' ? st[key] : false;
                input.disabled = false;
            });
            const err = bar.querySelector('.action-error');
            if (err) err.remove();
        });
    }

    async function toggleFollow(btn) {
        const wrap = btn.closest('[data-follow]');
        if (!wrap) return;
        if (wrap.dataset.signedIn !== 'true') {
            signIn();
            return;
        }
        const id = wrap.dataset.podcastId;
        const on = wrap.dataset.followed === 'true';
        const revertMs = 600;
        const result = await act(btn, () => api(on ? 'DELETE' : 'POST', base(id)), {
            done: on ? 'Unfollowed' : '✓ Following',
            revertMs,
        });
        if (result === false) return;
        const st = on ? { followed: false } : (typeof result === 'object' ? result : { followed: true });
        // Bars react at once (Follow → the bar appears, Unfollow → it hides and
        // the switches reset); the button is repainted after act()'s done-state.
        barsFor(id).forEach((bar) => bar.classList.toggle('hidden', on));
        wrappersFor(id).forEach((w) => { w.dataset.followed = on ? 'false' : 'true'; });
        setTimeout(() => render(id, st), revertMs + 20);
    }

    async function toggleOpt(input) {
        const bar = input.closest('[data-follow-bar]');
        if (!bar) return;
        const id = bar.dataset.podcastId;
        const key = input.dataset.followOpt;
        const wanted = input.checked;
        const anchor = input.closest('label') || input;
        if (typeof clearInlineError === 'function') clearInlineError(anchor);
        input.disabled = true;
        try {
            const st = await api('PATCH', base(id), { [key]: wanted });
            input.disabled = false;
            if (st && typeof st[key] === 'boolean') input.checked = st[key];
            if (typeof flashDone === 'function') flashDone(anchor);
        } catch (e) {
            input.disabled = false;
            input.checked = !wanted;
            if (typeof inlineError === 'function') inlineError(anchor, e.message);
        }
    }

    async function unfollowRow(btn) {
        const row = btn.closest('[data-follow]');
        if (!row) return;
        const id = row.dataset.podcastId;
        const ok = await act(btn, () => api('DELETE', base(id)), {
            confirmText: 'Unfollow? New recordings stop landing in this workspace.',
            done: '✓ Unfollowed',
            revertMs: 600,
        });
        if (!ok) return;
        const menu = btn.closest('details');
        if (menu) menu.removeAttribute('open');
        setTimeout(() => {
            row.remove();
            // Keep the Followed chip + section counter honest without a reload.
            const remaining = document.querySelectorAll('.recordings-follows [data-follow]').length;
            document.querySelectorAll('a[href="#followed"] .count').forEach((c) => { c.textContent = remaining; });
            const head = document.querySelector('.recordings-follows .section-head .mono');
            if (head) head.firstChild && (head.firstChild.textContent = `${remaining} · `);
            if (remaining === 0) location.reload();
        }, 600);
    }

    function bind() {
        document.addEventListener('click', (ev) => {
            const followBtn = ev.target.closest('[data-follow-btn]');
            if (followBtn) {
                ev.preventDefault();
                toggleFollow(followBtn);
                return;
            }
            const unfollowBtn = ev.target.closest('[data-unfollow]');
            if (unfollowBtn) {
                ev.preventDefault();
                unfollowRow(unfollowBtn);
            }
        });
        document.addEventListener('change', (ev) => {
            const input = ev.target.closest('[data-follow-opt]');
            if (input) toggleOpt(input);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bind);
    } else {
        bind();
    }
})();

/**
 * Library Follow — the same verb on a LIBRARY (a published workspace), on
 * /explore tiles and the library page. Following subscribes the viewer to the
 * workspace (POST/DELETE /api/internal/workspaces/{id}/subscribe), which is
 * what makes the library searchable from their assistant.
 *
 *   [data-library-follow="on"|"off"|"signin"] + data-workspace-id
 *   [data-reload]  a page whose chrome depends on membership (the library
 *                  page: Manage / ✓ Following / Follow) re-renders after
 *                  success; tiles flip in place.
 */
(function () {
    'use strict';

    function signIn() {
        if (typeof showLoginModal === 'function') { showLoginModal(); return; }
        const next = location.pathname + location.search;
        location.href = `/login?next=${encodeURIComponent(next)}`;
    }

    async function toggleLibrary(btn) {
        const mode = btn.dataset.libraryFollow;
        const id = btn.dataset.workspaceId;
        if (mode === 'signin') { signIn(); return; }
        const on = mode === 'on';
        const revertMs = 600;
        const result = await act(
            btn,
            () => api(on ? 'POST' : 'DELETE', `/api/internal/workspaces/${encodeURIComponent(id)}/subscribe`),
            on ? { done: '✓ Following', revertMs }
               : { confirmText: 'Stop following this library?', done: 'Unfollowed', revertMs }
        );
        if (result === false) return;
        if ('reload' in btn.dataset) { setTimeout(() => location.reload(), revertMs + 50); return; }
        setTimeout(() => {
            btn.dataset.libraryFollow = on ? 'off' : 'on';
            btn.classList.toggle('follow-on', on);
            btn.textContent = on ? '✓ Following' : 'Follow';
        }, revertMs + 20);
    }

    document.addEventListener('click', (ev) => {
        const btn = ev.target.closest('[data-library-follow]');
        if (btn) toggleLibrary(btn);
    });
})();
