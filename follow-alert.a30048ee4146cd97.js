// Follow/alert buttons (GH#182 step 5). Drop a container anywhere:
//
//   <div class="follow-alert" data-authenticated="true|false"
//        data-query="data centers"            <!-- query alert -->
//        data-entity-slug="duke-energy"       <!-- OR entity follow -->
//        data-label="Alert me on new results"></div>
//
// On the search page the container may omit data-query; the component reads
// the ?q= URL param at click time. Signed-in: one click through act().
// Anonymous: expands an inline email field (double opt-in — the API sends a
// confirmation mail). Uses the act()/api() primitives per the UI feedback
// contract — no alert(), errors render inline.
(function () {
    function build(container) {
        var label = container.dataset.label || 'Alert me on new results';
        var authed = container.dataset.authenticated === 'true';

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-ghost follow-alert-btn';
        btn.textContent = '🔔 ' + label;
        container.appendChild(btn);

        var form = null; // anonymous email form, created lazily

        function payload(email) {
            var body = { frequency: 'daily' };
            if (container.dataset.entitySlug) {
                body.entity_slug = container.dataset.entitySlug;
            } else {
                var q = container.dataset.query;
                if (!q) {
                    var params = new URLSearchParams(window.location.search);
                    q = params.get('q') || params.get('query') || '';
                }
                body.query = q;
            }
            if (email) body.email = email;
            return body;
        }

        async function subscribe(triggerBtn, email) {
            var body = payload(email);
            if (!body.entity_slug && !body.query) {
                inlineError(triggerBtn, 'Type a search first, then set the alert.');
                return;
            }
            var ok = await act(triggerBtn, async function () {
                await api('POST', '/api/alerts/subscribe', body);
            }, { done: authed ? '✓ Subscribed — daily digest' : '✓ Check your email', revertMs: 6000 });
            if (ok && form) {
                setTimeout(function () { form.remove(); form = null; }, 6200);
            }
        }

        btn.addEventListener('click', function () {
            if (authed) {
                subscribe(btn);
                return;
            }
            if (form) { form.querySelector('input').focus(); return; }
            form = document.createElement('div');
            form.className = 'follow-alert-form';
            var input = document.createElement('input');
            input.type = 'email';
            input.required = true;
            input.placeholder = 'you@example.com';
            input.className = 'follow-alert-email';
            input.setAttribute('aria-label', 'Email for alerts');
            var go = document.createElement('button');
            go.type = 'button';
            go.className = 'btn btn-ghost';
            go.textContent = 'Send confirmation';
            go.addEventListener('click', function () {
                var email = input.value.trim();
                if (!email || email.indexOf('@') < 1) {
                    inlineError(go, 'Enter a valid email.');
                    return;
                }
                subscribe(go, email);
            });
            input.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') { e.preventDefault(); go.click(); }
            });
            form.appendChild(input);
            form.appendChild(go);
            container.appendChild(form);
            input.focus();
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('.follow-alert').forEach(build);
    });
})();
