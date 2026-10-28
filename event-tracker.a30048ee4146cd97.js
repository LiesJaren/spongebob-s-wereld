/**
 * EventTracker - Client-side event tracking for Audioscrape
 *
 * Usage:
 *   const tracker = new EventTracker();
 *   tracker.trackAudio('play', episodeId, { position_seconds: 45 });
 *   tracker.trackScroll(75); // 75% scroll depth
 *   tracker.trackHover('segment', segmentId, 2500); // 2.5s hover
 */
class EventTracker {
    constructor(options = {}) {
        this.apiEndpoint = options.apiEndpoint || '/api/events';
        this.batchEndpoint = options.batchEndpoint || '/api/events/batch';
        this.flushInterval = options.flushInterval || 5000; // 5 seconds
        this.maxBatchSize = options.maxBatchSize || 20;
        this.debug = options.debug || false;

        this.queue = [];
        this.sessionId = this.getOrCreateSessionId();
        this.pageType = this.detectPageType();
        this.pageUrl = window.location.href;

        // Start periodic flush
        this.flushTimer = setInterval(() => this.flush(), this.flushInterval);

        // Flush on page unload
        window.addEventListener('beforeunload', () => this.flush(true));

        // Track viewport size
        this.viewportWidth = window.innerWidth;
        this.viewportHeight = window.innerHeight;

        if (this.debug) {
            console.log('[EventTracker] Initialized', {
                sessionId: this.sessionId,
                pageType: this.pageType,
                pageUrl: this.pageUrl
            });
        }
    }

    /**
     * Get or create session ID from cookie
     */
    getOrCreateSessionId() {
        const name = 'audioscrape_session=';
        const decodedCookie = decodeURIComponent(document.cookie);
        const cookies = decodedCookie.split(';');

        for (let cookie of cookies) {
            cookie = cookie.trim();
            if (cookie.startsWith(name)) {
                return cookie.substring(name.length);
            }
        }

        // Create new session ID
        const sessionId = this.generateUUID();
        // Note: Server will set the actual session cookie
        return sessionId;
    }

    /**
     * Generate UUID v4
     */
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Detect current page type from URL
     */
    detectPageType() {
        const path = window.location.pathname;
        if (path.includes('/episode/')) return 'episode';
        if (path.startsWith('/podcast/')) return 'podcast';
        if (path.startsWith('/entity/') || path.startsWith('/person/')) return 'entity';
        if (path.startsWith('/search')) return 'search';
        if (path === '/' || path === '') return 'home';
        // Transcript pages (/item/{id}) are episodes by another URL shape —
        // the one MCP responses and the home's transcript rows link to.
        if (path.startsWith('/item/')) return 'episode';
        // Workspace console surfaces (dashboard, welcome, api-keys, usage…)
        // were reporting null and polluting page_type with blanks.
        if (path.startsWith('/workspaces/')) return 'workspace';
        // Personal settings surface: /account (the retired /alerts and
        // /profile/* shell redirect into it).
        if (path === '/account' || path === '/alerts' || path.startsWith('/profile')) return 'settings';
        return null;
    }

    /**
     * Track a generic event
     */
    track(eventType, eventCategory, eventData = {}) {
        const event = {
            event_type: eventType,
            event_category: eventCategory,
            page_type: this.pageType,
            page_url: this.pageUrl,
            event_data: eventData,
            viewport_width: this.viewportWidth,
            viewport_height: this.viewportHeight
        };

        this.queue.push(event);

        if (this.debug) {
            console.log('[EventTracker] Queued event:', eventType, eventData);
        }

        // Auto-flush if queue is full
        if (this.queue.length >= this.maxBatchSize) {
            this.flush();
        }
    }

    /**
     * Track audio events
     */
    trackAudio(action, episodeId, data = {}) {
        const eventType = `audio.${action}`;
        const eventData = {
            episode_id: episodeId,
            action: action,
            ...data
        };
        this.track(eventType, 'audio', eventData);
    }

    /**
     * Track scroll depth
     */
    trackScroll(depthPercent) {
        this.track('scroll.depth', 'scroll', {
            depth_percent: depthPercent,
            max_scroll: window.scrollY + this.viewportHeight,
            viewport_height: this.viewportHeight
        });
    }

    /**
     * Track hover duration
     */
    trackHover(elementType, elementId, durationMs, additionalData = {}) {
        this.track('mouse.hover', 'mouse', {
            element_type: elementType,
            element_id: elementId,
            duration_ms: durationMs,
            ...additionalData
        });
    }

    /**
     * Track time on page
     */
    trackTimeOnPage(activeSeconds, idleSeconds) {
        this.track('time.page_active', 'time', {
            active_seconds: activeSeconds,
            idle_seconds: idleSeconds,
            total_seconds: activeSeconds + idleSeconds
        });
    }

    /**
     * Track search interactions
     */
    trackSearch(action, data = {}) {
        const eventType = `search.${action}`;
        this.track(eventType, 'search', data);
    }

    /**
     * Track entity clicks
     */
    trackEntityClick(entityId, entityName, context = {}) {
        this.track('click.entity', 'engagement', {
            entity_id: entityId,
            entity_name: entityName,
            ...context
        });
    }

    /**
     * Flush queued events to server
     */
    async flush(useKeepalive = false) {
        if (this.queue.length === 0) {
            return;
        }

        const events = [...this.queue];
        this.queue = [];

        if (this.debug) {
            console.log(`[EventTracker] Flushing ${events.length} events`, useKeepalive ? '(keepalive)' : '');
        }

        try {
            const payload = { events };

            if (useKeepalive) {
                // Use sendBeacon for reliable delivery on page unload
                const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
                navigator.sendBeacon(this.batchEndpoint, blob);
            } else {
                // Normal fetch
                const response = await fetch(this.batchEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok && this.debug) {
                    console.error('[EventTracker] Failed to send events:', response.status);
                }
            }
        } catch (error) {
            if (this.debug) {
                console.error('[EventTracker] Error sending events:', error);
            }
            // Re-queue events on failure (unless using keepalive)
            if (!useKeepalive) {
                this.queue = [...events, ...this.queue];
            }
        }
    }

    /**
     * Stop tracking and clean up
     */
    destroy() {
        clearInterval(this.flushTimer);
        this.flush(true);
    }
}

/**
 * Audio Player Tracking
 * Automatically tracks play, pause, ended, and progress events
 */
class AudioPlayerTracker {
    constructor(audioElement, episodeId, tracker) {
        this.audio = audioElement;
        this.episodeId = episodeId;
        this.tracker = tracker;
        this.progressInterval = 30000; // Report progress every 30 seconds
        this.progressTimer = null;
        // The owner may report positions in episode time (a playback window
        // serves an excerpt whose 0:00 is not the episode's) and add facts
        // such as the window start to every event.
        this.timeFn = null;
        this.extraFn = null;
        this.lastPos = null;

        this.setupListeners();
    }

    pos() {
        return this.timeFn ? this.timeFn() : this.audio.currentTime;
    }

    facts(more) {
        let extra = {};
        try { extra = this.extraFn ? this.extraFn() : {}; } catch (_) { extra = {}; }
        return Object.assign({
            position_seconds: Math.floor(this.pos()),
            duration_seconds: Math.floor(this.audio.duration)
        }, extra, more || {});
    }

    setupListeners() {
        this.audio.addEventListener('play', () => {
            this.tracker.trackAudio('play', this.episodeId, this.facts());
            this.lastPos = this.pos();

            // Start progress tracking
            this.startProgressTracking();
        });

        this.audio.addEventListener('pause', () => {
            this.tracker.trackAudio('pause', this.episodeId, this.facts());

            // Stop progress tracking
            this.stopProgressTracking();
        });

        this.audio.addEventListener('ended', () => {
            this.tracker.trackAudio('ended', this.episodeId, this.facts());

            this.stopProgressTracking();
        });

        this.audio.addEventListener('seeked', () => {
            this.tracker.trackAudio('seeked', this.episodeId, this.facts());
            this.lastPos = this.pos();
        });
    }

    startProgressTracking() {
        this.stopProgressTracking();
        this.progressTimer = setInterval(() => {
            if (this.audio.paused) return;
            // Only real listening counts: an element that failed to load
            // stays "playing" with a frozen playhead, and used to report
            // progress every 30 s regardless.
            const p = this.pos();
            if (this.lastPos !== null && p <= this.lastPos + 1) return;
            this.lastPos = p;
            this.tracker.trackAudio('progress', this.episodeId, this.facts({
                percent_complete: Math.floor((this.audio.currentTime / this.audio.duration) * 100)
            }));
        }, this.progressInterval);
    }

    stopProgressTracking() {
        if (this.progressTimer) {
            clearInterval(this.progressTimer);
            this.progressTimer = null;
        }
    }
}

/**
 * Scroll Depth Tracker
 * Tracks scroll milestones (25%, 50%, 75%, 100%)
 */
class ScrollDepthTracker {
    constructor(tracker) {
        this.tracker = tracker;
        this.milestones = [25, 50, 75, 100];
        this.reached = new Set();

        this.setupListener();
    }

    setupListener() {
        let timeout;
        window.addEventListener('scroll', () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => this.checkMilestones(), 200);
        });
    }

    checkMilestones() {
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrolled = window.scrollY;
        const percent = Math.round((scrolled / scrollHeight) * 100);

        for (const milestone of this.milestones) {
            if (percent >= milestone && !this.reached.has(milestone)) {
                this.reached.add(milestone);
                this.tracker.trackScroll(milestone);
            }
        }
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EventTracker, AudioPlayerTracker, ScrollDepthTracker };
}
