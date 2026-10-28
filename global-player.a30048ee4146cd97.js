/**
 * Global Audio Player
 * Persistent audio player that works across all pages
 *
 * Positions are EPISODE time. A public podcast episode may be served as a
 * playback window — an excerpt around the moment asked for, whose own 0:00
 * is `win.start` seconds into the episode (services/playback_window.rs).
 * `episodeTime()` maps the element's clock back; page scripts use it instead
 * of `audio.currentTime`.
 */

class GlobalPlayer {
    constructor() {
        this.audio = null;
        this.isInitialized = false;
        this.currentEpisode = null;
        this.playbackSpeeds = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
        this.currentSpeedIndex = 2; // Default 1x
        // What the server serves of the loaded track: { full: true } or the
        // window { start, end, inGap }, plus duration + publisher link.
        this.win = null;
        // A track restored from an earlier page waits here, unloaded, until
        // the listener presses play (loading it would spend their budget).
        this.pendingStart = null;
        this.loadToken = 0;

        // Restore state from localStorage
        this.restoreState();
    }

    init() {
        if (this.isInitialized) return;

        this.audio = document.getElementById('global-audio-element');
        if (!this.audio) {
            console.warn('Global audio element not found');
            return;
        }

        this.bindEvents();

        // Listening-behavior telemetry: one tracker for the ONE persistent
        // audio element (listeners bind once); episodeId is updated per track
        // in loadEpisode(). Guarded — tracking must never break playback.
        try {
            if (window.eventTracker && typeof AudioPlayerTracker !== 'undefined') {
                this.tracker = new AudioPlayerTracker(this.audio, null, window.eventTracker);
                this.tracker.timeFn = () => this.episodeTime();
                this.tracker.extraFn = () => this.windowFacts();
            }
        } catch (_) { this.tracker = null; }

        this.isInitialized = true;

        // If we have a restored episode, set it up (but don't autoplay)
        if (this.currentEpisode) {
            this.loadEpisode(this.currentEpisode, false);
        }
    }

    bindEvents() {
        const audio = this.audio;

        // Time update
        audio.addEventListener('timeupdate', () => this.onTimeUpdate());

        // Loaded metadata
        audio.addEventListener('loadedmetadata', () => this.onLoadedMetadata());

        // Play/pause state
        audio.addEventListener('play', () => this.onPlayStateChange(true));
        audio.addEventListener('pause', () => this.onPlayStateChange(false));

        // Buffering
        audio.addEventListener('progress', () => this.onProgress());

        // Ended
        audio.addEventListener('ended', () => this.onEnded());

        // Error
        audio.addEventListener('error', (e) => this.onError(e));

        // UI Controls
        this.bindUIControls();
    }

    bindUIControls() {
        // Play/Pause buttons (desktop and mobile)
        ['global-play-pause', 'global-play-pause-mobile'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.addEventListener('click', () => this.togglePlay());
        });

        // Rewind buttons
        ['global-rewind', 'global-rewind-mobile'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.addEventListener('click', () => this.seek(-10));
        });

        // Forward buttons
        ['global-forward', 'global-forward-mobile'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.addEventListener('click', () => this.seek(10));
        });

        // Speed buttons
        ['global-speed', 'global-speed-mobile'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.addEventListener('click', () => this.cycleSpeed());
        });

        // Progress bars
        ['global-progress-bar', 'global-progress-bar-mobile'].forEach(id => {
            const bar = document.getElementById(id);
            if (bar) {
                bar.addEventListener('click', (e) => this.onProgressClick(e, bar));
            }
        });

        // Volume
        const volumeToggle = document.getElementById('global-volume-toggle');
        if (volumeToggle) {
            volumeToggle.addEventListener('click', () => this.toggleMute());
        }

        const volumeSlider = document.getElementById('global-volume');
        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                this.audio.volume = e.target.value / 100;
                this.updateVolumeIcon();
            });
        }

        // Close buttons (desktop and mobile)
        ['global-player-close', 'global-player-close-mobile'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.addEventListener('click', () => this.hide());
        });

        // Playback window notice: the next part, and the full episode at
        // the publisher.
        const next = document.getElementById('global-window-next');
        if (next) next.addEventListener('click', () => this.playNext());
        const publisher = document.getElementById('global-window-publisher');
        if (publisher) publisher.addEventListener('click', () => this.track('publisher_click'));

        // Episode title click - navigate to episode
        const titleLink = document.getElementById('global-episode-link');
        if (titleLink) {
            titleLink.addEventListener('click', (e) => {
                if (this.currentEpisode && this.currentEpisode.url) {
                    e.preventDefault();
                    window.location.href = this.currentEpisode.url;
                }
            });
        }
    }

    // Play an episode
    play(options) {
        // Self-initialize: ?t= deep-link handlers run on DOMContentLoaded and
        // can land BEFORE our own DOMContentLoaded init (page scripts register
        // first). Without this, loadEpisode() hit a null audio element and the
        // later init() re-loaded the track paused at its SAVED position,
        // silently dropping the requested startTime. init() is idempotent.
        if (!this.isInitialized) this.init();

        const { episodeId, title, podcastTitle, podcastSlug, episodeSlug, startTime = 0, imageUrl = null, url = null } = options;

        this.currentEpisode = {
            episodeId,
            title,
            podcastTitle,
            podcastSlug,
            episodeSlug,
            imageUrl,
            // Explicit url wins: content items (uploads, YouTube, …) live at
            // /content/item/{id} and have no podcast/episode slugs.
            url: url || (podcastSlug && episodeSlug ? `/podcast/${podcastSlug}/episode/${episodeSlug}` : null)
        };

        this.loadEpisode(this.currentEpisode, true, startTime);
        this.show();
        this.saveState();
    }

    // Load a track. `startTime` is the moment asked for; `continueFrom`
    // (optional) is where playback should resume inside the new window —
    // "play next part" asks for the window after the previous one ends.
    loadEpisode(episode, autoplay = false, startTime = 0, continueFrom = null) {
        if (!this.audio) return;

        // Tracker listeners are bound once to the persistent element; only
        // the attributed episode changes per track.
        if (this.tracker) this.tracker.episodeId = episode.episodeId;

        this.updateEpisodeInfo(episode);
        this.hideNote();
        this.win = null;
        const token = ++this.loadToken;
        const source = this.audio.querySelector('source');

        if (!autoplay) {
            // Restored from an earlier page: nothing is fetched until play.
            this.pendingStart = this.getSavedTime(episode.episodeId);
            if (source) source.removeAttribute('src');
            this.audio.load();
            return;
        }
        this.pendingStart = null;
        this.show();

        const t = Math.max(0, Math.floor(startTime || 0));
        const target = continueFrom !== null ? continueFrom : Math.max(0, startTime || 0);

        // `src` is set synchronously so play() stays inside the listener's
        // click; /media decides what this request gets (the whole file, or
        // the window around `t`) and the window info maps clip time back.
        if (source) {
            source.src = `/media/${episode.episodeId}?t=${t}`;
        }
        this.audio.load();

        const info = fetch(`/api/media/${episode.episodeId}/window?t=${t}`, { credentials: 'same-origin' })
            .then(r => (r.ok ? r.json() : null))
            .catch(() => null);
        info.then(w => {
            if (token !== this.loadToken || !w || !w.exhausted) return;
            this.win = null;
            this.showNote("Today's listening is used up.", { publisher: w.publisher_url });
            this.track('window_exhausted');
        });

        this.audio.addEventListener('loadedmetadata', () => {
            info.then(w => {
                if (token !== this.loadToken) return;
                this.applyWindow(w);
                const at = Math.max(0, target - this.windowOffset());
                if (at > 0) {
                    this.audio.currentTime = at;
                }
                this.audio.playbackRate = this.playbackSpeeds[this.currentSpeedIndex];
                this.onLoadedMetadata();
                this.audio.play().catch(e => console.error('Autoplay failed:', e));
            });
        }, { once: true });
    }

    applyWindow(w) {
        const duration = w && w.duration ? w.duration : null;
        const publisherUrl = w ? (w.publisher_url || null) : null;
        if (w && w.full === false && !w.exhausted) {
            this.win = { full: false, start: w.start, end: w.end, inGap: !!w.in_gap, duration, publisherUrl };
            if (this.win.inGap) {
                this.showNote('This passage plays only at the publisher.', { publisher: publisherUrl });
            }
        } else {
            this.win = { full: true, duration, publisherUrl };
        }
    }

    windowOffset() {
        return this.win && !this.win.full ? this.win.start : 0;
    }

    windowFacts() {
        return this.win && !this.win.full ? { window_start: this.win.start } : {};
    }

    // Seconds into the EPISODE (not into the served excerpt).
    episodeTime() {
        return (this.audio ? (this.audio.currentTime || 0) : 0) + this.windowOffset();
    }

    episodeDuration() {
        if (this.win && this.win.duration) return this.win.duration;
        return this.windowOffset() + ((this.audio && this.audio.duration) || 0);
    }

    updateEpisodeInfo(episode) {
        // Desktop
        const titleEl = document.getElementById('global-episode-title');
        const podcastEl = document.getElementById('global-podcast-title');

        if (titleEl) titleEl.textContent = episode.title || 'Unknown Episode';
        if (podcastEl) podcastEl.textContent = episode.podcastTitle || 'Unknown Podcast';

        // Mobile
        const mobileTitleEl = document.getElementById('global-podcast-title-mobile');
        if (mobileTitleEl) {
            mobileTitleEl.textContent = `${episode.title} - ${episode.podcastTitle}`;
        }

        // Image — hide when this track has none, or the previous track's
        // artwork stays up next to the new title.
        const imgEl = document.getElementById('global-episode-image');
        if (imgEl) {
            if (episode.imageUrl) {
                imgEl.src = episode.imageUrl;
                imgEl.classList.remove('hidden');
            } else {
                imgEl.classList.add('hidden');
                imgEl.removeAttribute('src');
            }
        }
    }

    togglePlay() {
        if (!this.audio) return;

        if (this.pendingStart !== null && this.currentEpisode) {
            this.loadEpisode(this.currentEpisode, true, this.pendingStart);
            return;
        }
        if (this.audio.paused) {
            if (this.atWindowEnd()) {
                this.playNext();
                return;
            }
            this.hideNote();
            this.audio.play().catch(e => console.error('Play failed:', e));
        } else {
            this.audio.pause();
        }
    }

    seek(seconds) {
        if (!this.audio) return;
        this.seekTo(Math.max(0, this.episodeTime() + seconds));
    }

    // Seek to `time` episode seconds. Outside the served window this loads
    // the window around `time` (and starts playing it).
    seekTo(time) {
        if (!this.audio) return;
        if (this.pendingStart !== null && this.currentEpisode) {
            this.loadEpisode(this.currentEpisode, true, time);
            return;
        }
        if (this.win && !this.win.full && (time < this.win.start || time >= this.win.end)) {
            this.loadEpisode(this.currentEpisode, true, time);
            return;
        }
        this.hideNote();
        this.audio.currentTime = Math.max(0, time - this.windowOffset());
    }

    // The window after the one that just ended.
    playNext() {
        if (!this.currentEpisode || !this.win || this.win.full) return;
        const from = this.win.end;
        this.loadEpisode(this.currentEpisode, true, from + 15, from);
    }

    atWindowEnd() {
        return !!(this.win && !this.win.full && this.episodeTime() >= this.win.end - 0.5);
    }

    cycleSpeed() {
        this.currentSpeedIndex = (this.currentSpeedIndex + 1) % this.playbackSpeeds.length;
        const speed = this.playbackSpeeds[this.currentSpeedIndex];
        this.audio.playbackRate = speed;

        // Update UI
        ['global-speed', 'global-speed-mobile'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.textContent = speed + 'x';
        });
    }

    toggleMute() {
        if (!this.audio) return;
        this.audio.muted = !this.audio.muted;
        this.updateVolumeIcon();
    }

    updateVolumeIcon() {
        const volumeIcon = document.getElementById('global-volume-icon');
        const muteIcon = document.getElementById('global-mute-icon');

        if (this.audio.muted || this.audio.volume === 0) {
            volumeIcon?.classList.add('hidden');
            muteIcon?.classList.remove('hidden');
        } else {
            volumeIcon?.classList.remove('hidden');
            muteIcon?.classList.add('hidden');
        }
    }

    onProgressClick(e, bar) {
        const rect = bar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        const duration = this.episodeDuration();
        if (duration > 0) this.seekTo(percent * duration);
    }

    // Event handlers
    onTimeUpdate() {
        const current = this.episodeTime();
        const duration = this.episodeDuration();
        const percent = duration > 0 ? (current / duration) * 100 : 0;

        // Update progress bars
        ['global-progress', 'global-progress-mobile'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.width = percent + '%';
        });

        // Update time displays
        ['global-current-time', 'global-current-time-mobile'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = this.formatTime(current);
        });

        // The excerpt ends here: stop and offer the next part.
        if (this.atWindowEnd() && !this.audio.paused) {
            this.audio.pause();
            this.showWindowEnd();
        }

        // Save position periodically (every 5 seconds)
        if (Math.floor(current) % 5 === 0) {
            this.savePosition();
        }
    }

    onLoadedMetadata() {
        const duration = this.episodeDuration();

        ['global-duration', 'global-duration-mobile'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = this.formatTime(duration);
        });
    }

    onPlayStateChange(isPlaying) {
        // Update play/pause icons
        ['', '-mobile'].forEach(suffix => {
            const playIcon = document.getElementById('global-play-icon' + suffix);
            const pauseIcon = document.getElementById('global-pause-icon' + suffix);

            if (isPlaying) {
                playIcon?.classList.add('hidden');
                pauseIcon?.classList.remove('hidden');
            } else {
                playIcon?.classList.remove('hidden');
                pauseIcon?.classList.add('hidden');
            }
        });
    }

    onProgress() {
        if (this.audio.buffered.length > 0) {
            const bufferedEnd = this.windowOffset() + this.audio.buffered.end(this.audio.buffered.length - 1);
            const duration = this.episodeDuration();
            const percent = duration > 0 ? (bufferedEnd / duration) * 100 : 0;

            ['global-buffered', 'global-buffered-mobile'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.width = percent + '%';
            });
        }
    }

    onEnded() {
        this.onPlayStateChange(false);
        if (this.win && !this.win.full) {
            this.showWindowEnd();
        }
    }

    onError(e) {
        console.error('Audio error:', e);
    }

    // Playback window notice above the controls.
    showWindowEnd() {
        const duration = this.episodeDuration();
        const more = !(duration > 0 && this.win && this.win.end >= duration - 1);
        this.showNote('Excerpt ends here.', {
            next: more,
            publisher: this.win ? this.win.publisherUrl : null
        });
        this.track('window_end');
    }

    showNote(text, opts = {}) {
        const note = document.getElementById('global-window-note');
        if (!note) return;
        const textEl = document.getElementById('global-window-note-text');
        if (textEl) textEl.textContent = text;
        const next = document.getElementById('global-window-next');
        if (next) next.hidden = !opts.next;
        const pub = document.getElementById('global-window-publisher');
        if (pub) {
            if (opts.publisher) {
                pub.href = opts.publisher;
                pub.hidden = false;
            } else {
                pub.hidden = true;
                pub.removeAttribute('href');
            }
        }
        note.hidden = false;
    }

    hideNote() {
        const note = document.getElementById('global-window-note');
        if (note) note.hidden = true;
    }

    track(action) {
        try {
            if (window.eventTracker && this.currentEpisode) {
                window.eventTracker.trackAudio(action, this.currentEpisode.episodeId, Object.assign({
                    position_seconds: Math.floor(this.episodeTime())
                }, this.windowFacts()));
            }
        } catch (_) { /* tracking never breaks playback */ }
    }

    // Show/hide player
    show() {
        const player = document.getElementById('global-audio-player');
        if (player) {
            player.classList.remove('hidden');
            // Add padding to body to account for fixed player
            document.body.style.paddingBottom = '80px';
        }
    }

    hide() {
        const player = document.getElementById('global-audio-player');
        if (player) {
            player.classList.add('hidden');
            document.body.style.paddingBottom = '';
        }
        this.audio?.pause();
        this.hideNote();
        this.clearState();
    }

    isVisible() {
        const player = document.getElementById('global-audio-player');
        return player && !player.classList.contains('hidden');
    }

    // LocalStorage persistence
    saveState() {
        if (!this.currentEpisode) return;

        localStorage.setItem('globalPlayer', JSON.stringify({
            episode: this.currentEpisode,
            speed: this.playbackSpeeds[this.currentSpeedIndex]
        }));
    }

    savePosition() {
        if (!this.currentEpisode || !this.audio || this.pendingStart !== null) return;

        localStorage.setItem(`playerPos_${this.currentEpisode.episodeId}`,
            Math.floor(this.episodeTime()).toString());
    }

    getSavedTime(episodeId) {
        const saved = localStorage.getItem(`playerPos_${episodeId}`);
        return saved ? parseInt(saved, 10) : 0;
    }

    restoreState() {
        try {
            const saved = localStorage.getItem('globalPlayer');
            if (saved) {
                const data = JSON.parse(saved);
                this.currentEpisode = data.episode;

                // Restore speed
                const speedIndex = this.playbackSpeeds.indexOf(data.speed);
                if (speedIndex !== -1) {
                    this.currentSpeedIndex = speedIndex;
                }
            }
        } catch (e) {
            console.error('Failed to restore player state:', e);
        }
    }

    clearState() {
        this.currentEpisode = null;
        this.pendingStart = null;
        localStorage.removeItem('globalPlayer');
    }

    // Utility
    // m:ss, or h:mm:ss from an hour up (a council meeting read "314:08").
    formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';

        const total = Math.floor(seconds);
        const hours = Math.floor(total / 3600);
        const mins = Math.floor((total % 3600) / 60);
        const secs = (total % 60).toString().padStart(2, '0');
        return hours > 0
            ? `${hours}:${mins.toString().padStart(2, '0')}:${secs}`
            : `${mins}:${secs}`;
    }
}

// Create global instance
window.globalPlayer = new GlobalPlayer();

// The second a page's deep link points at (?t= or #t=), else 0: a page's
// header Play starts where the link pointed, not at the top of the recording.
// Here rather than in the transcript partial, which untranscribed pages skip.
window.deepLinkStart = function () {
    const q = parseFloat(new URLSearchParams(window.location.search).get('t'));
    if (!isNaN(q) && q >= 0) return q;
    const h = parseFloat(new URLSearchParams(window.location.hash.slice(1)).get('t'));
    return (!isNaN(h) && h >= 0) ? h : 0;
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.globalPlayer.init();

    // Don't auto-show on page load - only show after explicit play action
    // The player will show when user clicks play on any episode
});
