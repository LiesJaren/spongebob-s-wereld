/* Jaren's Onderwatermissies — lokale app.
   Alle voortgang wordt alleen in deze browser op dit apparaat opgeslagen. */
(() => {
  'use strict';

  const APP_ID = 'jaren-onderwatermissies';
  const APP_VERSION = 1;
  const STORAGE_KEY = 'jaren-onderwatermissies-v1';
  const BRUSSELS = 'Europe/Brussels';
  const AVATAR_SRC = 'e6766199-f380-4f51-9668-b47f36cfb918.png';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  // ---------------------------------------------------------------------------
  // Spelgegevens
  // ---------------------------------------------------------------------------

  const TEMPLATES = {
    clothes: {
      title: 'Kleren in de wasmand',
      tagline: 'Wasmand-Kwallenvangst',
      place: 'Ananas',
      icon: '🧺',
      points: 5,
      steps: [
        'Pak de afgesproken vuile kleren.',
        'Breng ze rustig naar de wasmand.',
        'Leg de kleren in de wasmand.'
      ],
      success: 'Je kleren liggen in de wasmand. Dat helpt ons thuis.'
    },
    toys: {
      title: 'Speelgoed opruimen',
      tagline: 'Schoonmaak in de Ananas',
      place: 'Ananas',
      icon: '🧸',
      points: 10,
      steps: [
        'Kies één speelgoedsoort.',
        'Stop die in de juiste bak.',
        'Bekijk samen het opgeruimde plekje.'
      ],
      success: 'Je speelplek is weer opgeruimd. Fijn gedaan!'
    },
    bag: {
      title: 'Boekentas klaarzetten',
      tagline: 'Klaar voor de vaarschool',
      place: 'Mevr. Puff',
      icon: '🎒',
      points: 10,
      steps: [
        'Kijk samen wat er mee moet.',
        'Stop de spullen in je tas.',
        'Zet je tas op de vaste plek.'
      ],
      success: 'Je tas staat klaar voor de vaarschool. Goed voorbereid!'
    },
    plate: {
      title: 'Bordje wegzetten',
      tagline: 'Afruimdienst in de Krokante Krab',
      place: 'Krokante Krab',
      icon: '🍽️',
      points: 5,
      steps: [
        'Pak je eigen bord.',
        'Breng het rustig naar de afgesproken plek.',
        'Zet het bord veilig neer.'
      ],
      success: 'Je bord staat veilig op de afgesproken plek. Dank je wel!'
    },
    trash: {
      title: 'Afval weggooien',
      tagline: 'Afval-Anker in de haven',
      place: 'Haven',
      icon: '🗑️',
      points: 3,
      steps: [
        'Pak het afgesproken veilige afval.',
        'Kies samen de juiste bak.',
        'Gooi het afval erin.'
      ],
      success: 'Het afval zit in de juiste bak. De zee blijft een beetje schoner!'
    }
  };

  // Maandag = 1 ... zondag = 7. Drie haalbare missies per dag.
  const DAY_PLAN = {
    1: ['clothes', 'toys', 'bag'],
    2: ['clothes', 'bag', 'trash'],
    3: ['clothes', 'toys', 'bag'],
    4: ['clothes', 'plate', 'trash'],
    5: ['clothes', 'toys', 'plate'],
    6: ['clothes', 'toys', 'trash'],
    7: ['clothes', 'bag', 'plate']
  };

  const AVATAR_ITEMS = [
    { id: 'avatar-muts', name: 'Werknemersmuts', icon: '🧢', price: 20, effect: 'Een muts op je avatar.' },
    { id: 'avatar-net', name: 'Kwallenvangersnetje', icon: '🥅', price: 30, effect: 'Een netje naast je avatar.' },
    { id: 'avatar-cape', name: 'Superheldencape', icon: '🦸', price: 40, effect: 'Een cape aan je avatar.' },
    { id: 'avatar-pirate', name: 'Piratenhoed', icon: '🏴‍☠️', price: 60, effect: 'Later ook mee naar het Pirateneiland.' },
    { id: 'avatar-helmet', name: 'Duikhelm', icon: '🤿', price: 80, effect: 'Een echte duikhelm op je hoofd.' }
  ];

  const ROOM_ITEMS = [
    { id: 'room-lamp', name: 'Schelpenlamp', icon: '🪔', price: 15, effect: 'Een lamp op een vaste plek.', position: { left: '8%', top: '32%' } },
    { id: 'room-mat', name: 'Zeesterrenmat', icon: '⭐', price: 25, effect: 'Een mat op de vloer.', position: { left: '38%', bottom: '5%' } },
    { id: 'room-aquarium', name: 'Bubbelaquarium', icon: '🐠', price: 40, effect: 'Een aquarium met rustige visjes.', position: { right: '5%', top: '36%' } },
    { id: 'room-chest', name: 'Schatkist', icon: '🧰', price: 60, effect: 'Een kist naast je bed.', position: { right: '36%', bottom: '16%' } },
    { id: 'room-window', name: 'Piratenraam', icon: '🚢', price: 80, effect: 'Uitzicht op een echt schip.', position: { left: '7%', top: '29%' } }
  ];

  const ALL_ITEMS = [...AVATAR_ITEMS, ...ROOM_ITEMS];
  const ITEM_BY_ID = Object.fromEntries(ALL_ITEMS.map((item) => [item.id, item]));

  const TITLES = [
    { min: 0, title: 'Nieuwe zeemaat' },
    { min: 50, title: 'Ananas-helper' },
    { min: 150, title: 'Kwallenvriend' },
    { min: 300, title: 'Huis-held' },
    { min: 500, title: 'Kapitein van Biquini Broek' }
  ];

  const REWARD_SUGGESTIONS = [
    { id: 'suggest-game', title: 'Samen een spelletje kiezen', price: 40, appointment: 'Op een afgesproken speelmoment, ongeveer 30 minuten.', active: false, suggestion: true },
    { id: 'suggest-film', title: 'De film kiezen op filmavond', price: 100, appointment: 'Tijdens een geplande gezinsfilmavond, uit de afgesproken filmlijst.', active: false, suggestion: true },
    { id: 'suggest-outing', title: 'Een gezinsuitje kiezen', price: 250, appointment: 'In het weekend, uit de vooraf afgesproken activiteiten.', active: false, suggestion: true }
  ];

  const TASK_STATUS = {
    todo: { label: 'Te doen', className: 'status-todo' },
    doing: { label: 'Bezig', className: 'status-doing' },
    waiting: { label: 'Wacht op een ouder', className: 'status-waiting' },
    approved: { label: 'Goedgekeurd', className: 'status-approved' }
  };

  const REQUEST_STATUS = {
    requested: { label: 'Aangevraagd', className: 'status-waiting' },
    confirmed: { label: 'Bevestigd', className: 'status-approved' },
    executed: { label: 'Uitgevoerd', className: 'status-approved' },
    rejected: { label: 'Afgewezen', className: '' },
    cancelled: { label: 'Geannuleerd', className: '' }
  };

  // ---------------------------------------------------------------------------
  // Hulpjes
  // ---------------------------------------------------------------------------

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const kwal = (amount) => `${amount} ${Number(amount) === 1 ? 'kwal' : 'kwallen'}`;

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[character]));

  const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  function brusselsParts() {
    const parts = new Intl.DateTimeFormat('nl-BE', {
      timeZone: BRUSSELS,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short'
    }).formatToParts(new Date());
    const get = (type) => parts.find((part) => part.type === type)?.value || '';
    return {
      date: `${get('year')}-${get('month')}-${get('day')}`,
      weekday: get('weekday')
    };
  }

  function todayKey() {
    return brusselsParts().date;
  }

  function weekdayNumber() {
    const weekday = brusselsParts().weekday.toLowerCase();
    const days = { ma: 1, di: 2, wo: 3, do: 4, vr: 5, za: 6, zo: 7 };
    return days[weekday.slice(0, 2)] || new Date().getDay() || 7;
  }

  function formatDate(dateKey) {
    const [year, month, day] = String(dateKey).split('-').map(Number);
    if (!year || !month || !day) return dateKey;
    return new Intl.DateTimeFormat('nl-BE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC'
    }).format(new Date(Date.UTC(year, month - 1, day, 12)));
  }

  function formatMoment(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('nl-BE', {
      timeZone: BRUSSELS,
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  function titleFor(experience) {
    return TITLES.reduce((best, candidate) => experience >= candidate.min ? candidate : best, TITLES[0]);
  }

  function hashPin(pin) {
    let hash = 2166136261;
    for (const character of `jaren:${pin}`) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16);
  }

  // ---------------------------------------------------------------------------
  // Status en opslag
  // ---------------------------------------------------------------------------

  function defaultState() {
    return {
      app: APP_ID,
      version: APP_VERSION,
      wallet: 0,
      experience: 0,
      owned: {},
      placed: {},
      equipped: null,
      settings: { voice: true, calm: false },
      pinHash: null,
      days: {},
      rewards: REWARD_SUGGESTIONS.map((reward) => ({ ...reward })),
      requests: [],
      transactions: []
    };
  }

  function boolMap(raw, allowedIds) {
    const result = {};
    if (!raw || typeof raw !== 'object') return result;
    for (const id of allowedIds) {
      if (raw[id] === true) result[id] = true;
    }
    return result;
  }

  function normalizeTask(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const template = TEMPLATES[raw.templateId];
    const title = typeof raw.title === 'string' && raw.title.trim()
      ? raw.title.trim().slice(0, 120)
      : template?.title;
    if (!title) return null;
    const steps = Array.isArray(raw.steps)
      ? raw.steps.filter((step) => typeof step === 'string' && step.trim()).slice(0, 12).map((step) => step.trim().slice(0, 240))
      : template?.steps?.slice() || [];
    if (!steps.length) return null;
    const status = ['todo', 'doing', 'waiting', 'approved'].includes(raw.status) ? raw.status : 'todo';
    return {
      id: typeof raw.id === 'string' && raw.id ? raw.id.slice(0, 160) : `${raw.date || ''}:${raw.templateId || uid()}`,
      templateId: typeof raw.templateId === 'string' ? raw.templateId : '',
      title,
      tagline: typeof raw.tagline === 'string' ? raw.tagline.slice(0, 120) : (template?.tagline || ''),
      place: typeof raw.place === 'string' ? raw.place.slice(0, 80) : (template?.place || ''),
      icon: typeof raw.icon === 'string' ? raw.icon.slice(0, 16) : (template?.icon || '✦'),
      points: clamp(Math.round(Number(raw.points ?? template?.points) || 0), 0, 500),
      steps,
      success: typeof raw.success === 'string' ? raw.success.slice(0, 300) : (template?.success || 'Goed gedaan!'),
      status,
      step: clamp(Math.round(Number(raw.step) || 0), 0, steps.length),
      createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
      startedAt: typeof raw.startedAt === 'string' ? raw.startedAt : null,
      submittedAt: typeof raw.submittedAt === 'string' ? raw.submittedAt : null,
      approvedAt: typeof raw.approvedAt === 'string' ? raw.approvedAt : null,
      helpCount: clamp(Math.round(Number(raw.helpCount) || 0), 0, 999),
      nudge: typeof raw.nudge === 'string' ? raw.nudge.slice(0, 400) : ''
    };
  }

  function normalizeReward(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const title = typeof raw.title === 'string' ? raw.title.trim().slice(0, 60) : '';
    const appointment = typeof raw.appointment === 'string' ? raw.appointment.trim().slice(0, 120) : '';
    if (!title || !appointment) return null;
    return {
      id: typeof raw.id === 'string' && raw.id ? raw.id.slice(0, 160) : uid(),
      title,
      price: clamp(Math.round(Number(raw.price) || 0), 1, 500),
      appointment,
      active: raw.active === true,
      suggestion: raw.suggestion === true,
      createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString()
    };
  }

  function normalizeRequest(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const title = typeof raw.title === 'string' ? raw.title.trim().slice(0, 60) : '';
    if (!title) return null;
    const status = ['requested', 'confirmed', 'executed', 'rejected', 'cancelled'].includes(raw.status)
      ? raw.status
      : 'requested';
    return {
      id: typeof raw.id === 'string' && raw.id ? raw.id.slice(0, 160) : uid(),
      rewardId: typeof raw.rewardId === 'string' ? raw.rewardId : '',
      title,
      price: clamp(Math.round(Number(raw.price) || 0), 0, 500),
      appointment: typeof raw.appointment === 'string' ? raw.appointment.slice(0, 120) : '',
      when: typeof raw.when === 'string' ? raw.when.slice(0, 120) : '',
      status,
      requestedAt: typeof raw.requestedAt === 'string' ? raw.requestedAt : new Date().toISOString(),
      confirmedAt: typeof raw.confirmedAt === 'string' ? raw.confirmedAt : null,
      executedAt: typeof raw.executedAt === 'string' ? raw.executedAt : null,
      refunded: raw.refunded === true
    };
  }

  function normalizeState(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new Error('Ongeldige reservekopie.');
    }
    const looksLikeBackup = raw.app === APP_ID || (typeof raw.wallet === 'number' && raw.days && typeof raw.days === 'object');
    if (!looksLikeBackup) {
      throw new Error('Dit bestand lijkt geen reservekopie van deze app te zijn.');
    }
    if (raw.app && raw.app !== APP_ID) {
      throw new Error('Deze reservekopie hoort niet bij deze app.');
    }
    const base = defaultState();
    const state = {
      ...base,
      wallet: clamp(Math.round(Number(raw.wallet) || 0), 0, 1000000),
      experience: clamp(Math.round(Number(raw.experience) || 0), 0, 10000000),
      owned: boolMap(raw.owned, ALL_ITEMS.map((item) => item.id)),
      placed: {},
      equipped: null,
      settings: {
        voice: raw.settings?.voice !== false,
        calm: raw.settings?.calm === true
      },
      pinHash: typeof raw.pinHash === 'string' ? raw.pinHash : null,
      days: {},
      rewards: [],
      requests: [],
      transactions: []
    };

    const ownedFurniture = Object.keys(boolMap(raw.placed, ROOM_ITEMS.map((item) => item.id)));
    state.placed = Object.fromEntries(ownedFurniture.filter((id) => state.owned[id]).map((id) => [id, true]));
    const equipped = typeof raw.equipped === 'string' ? raw.equipped : null;
    state.equipped = equipped && state.owned[equipped] && AVATAR_ITEMS.some((item) => item.id === equipped)
      ? equipped
      : null;

    if (raw.days && typeof raw.days === 'object' && !Array.isArray(raw.days)) {
      for (const [date, tasks] of Object.entries(raw.days)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Array.isArray(tasks)) continue;
        const normalized = tasks.map(normalizeTask).filter(Boolean);
        if (normalized.length) state.days[date] = normalized;
      }
    }

    if (Array.isArray(raw.rewards)) {
      state.rewards = raw.rewards.map(normalizeReward).filter(Boolean);
    }
    if (Array.isArray(raw.requests)) {
      state.requests = raw.requests.map(normalizeRequest).filter(Boolean);
    }
    if (Array.isArray(raw.transactions)) {
      state.transactions = raw.transactions
        .filter((entry) => entry && typeof entry === 'object')
        .slice(-1000)
        .map((entry) => ({
          id: typeof entry.id === 'string' ? entry.id : uid(),
          type: typeof entry.type === 'string' ? entry.type.slice(0, 40) : 'onbekend',
          amount: Math.round(Number(entry.amount) || 0),
          sourceId: typeof entry.sourceId === 'string' ? entry.sourceId : '',
          label: typeof entry.label === 'string' ? entry.label.slice(0, 120) : '',
          at: typeof entry.at === 'string' ? entry.at : new Date().toISOString()
        }));
    }
    return state;
  }

  function loadState() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return defaultState();
      return normalizeState(JSON.parse(stored));
    } catch (error) {
      console.warn('Opgeslagen voortgang kon niet worden gelezen.', error);
      return defaultState();
    }
  }

  let state = loadState();

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Voortgang opslaan mislukt.', error);
      showNotice('De voortgang kon niet worden opgeslagen. Maak ruimte vrij in de browser.');
    }
  }

  function addTransaction(type, amount, sourceId, label = '') {
    state.transactions.push({
      id: uid(),
      type,
      amount,
      sourceId,
      label,
      at: new Date().toISOString()
    });
    if (state.transactions.length > 1000) state.transactions = state.transactions.slice(-1000);
  }

  // ---------------------------------------------------------------------------
  // Dagelijkse missies
  // ---------------------------------------------------------------------------

  function planForToday() {
    return DAY_PLAN[weekdayNumber()] || ['clothes', 'plate', 'bag'];
  }

  function createTask(templateId, date) {
    const template = TEMPLATES[templateId];
    return {
      id: `${date}:${templateId}`,
      templateId,
      title: template.title,
      tagline: template.tagline,
      place: template.place,
      icon: template.icon,
      points: template.points,
      steps: template.steps.slice(),
      success: template.success,
      status: 'todo',
      step: 0,
      createdAt: new Date().toISOString(),
      startedAt: null,
      submittedAt: null,
      approvedAt: null,
      helpCount: 0,
      nudge: ''
    };
  }

  function ensureToday() {
    const date = todayKey();
    const planned = planForToday();
    if (!state.days[date]) {
      state.days[date] = planned.map((templateId) => createTask(templateId, date));
      saveState();
      return;
    }
    const existing = new Set(state.days[date].map((task) => task.templateId));
    let added = false;
    for (const templateId of planned) {
      if (!existing.has(templateId) && TEMPLATES[templateId]) {
        state.days[date].push(createTask(templateId, date));
        added = true;
      }
    }
    if (added) saveState();
  }

  function findTask(taskId) {
    for (const tasks of Object.values(state.days)) {
      const found = tasks.find((task) => task.id === taskId);
      if (found) return found;
    }
    return null;
  }

  function allWaitingTasks() {
    const waiting = [];
    for (const [date, tasks] of Object.entries(state.days)) {
      for (const task of tasks) {
        if (task.status === 'waiting') waiting.push({ date, task });
      }
    }
    return waiting.sort((a, b) => String(a.task.submittedAt || '').localeCompare(String(b.task.submittedAt || '')));
  }

  // ---------------------------------------------------------------------------
  // UI-status
  // ---------------------------------------------------------------------------

  const ui = {
    view: 'welcome',
    currentTaskKey: null,
    helpOpen: false,
    helpMessage: '',
    nudgeTaskKey: null,
    pinMode: 'enter'
  };

  let parentUnlocked = false;
  let noticeTimer = null;
  let lastKnownDay = todayKey();

  function showNotice(message, timeout = 6000) {
    const notice = $('#notice');
    if (!notice) return;
    notice.textContent = message;
    notice.hidden = false;
    clearTimeout(noticeTimer);
    if (timeout > 0) {
      noticeTimer = setTimeout(() => {
        notice.hidden = true;
      }, timeout);
    }
  }

  function updateWallet() {
    const count = $('#wallet-count');
    if (count) count.textContent = String(state.wallet);
    const label = $('.wallet-label');
    if (label) label.textContent = Number(state.wallet) === 1 ? 'kwal' : 'kwallen';
    const wallet = $('.wallet');
    if (wallet) {
      wallet.title = `Mijn kwallen: ${kwal(state.wallet)}. Heldenervaring: ${state.experience}.`;
      wallet.setAttribute('aria-label', `${kwal(state.wallet)}.`);
    }
  }

  // ---------------------------------------------------------------------------
  // Voorlezen en geluid
  // ---------------------------------------------------------------------------

  const hasSpeechSynthesis = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  const voiceClips = window.JAREN_VOICE_CLIPS || {};
  const hasVoiceClips = Object.keys(voiceClips).length > 0;
  const canSpeak = hasVoiceClips || hasSpeechSynthesis;

  let speechAudio = null;
  let speechSession = 0;

  // Zelfde sleutel als voice_key() in voice/generate_voice.py.
  function voiceKey(text) {
    return (String(text).toLowerCase().normalize('NFC').match(/[\p{L}\p{N}]+/gu) || []).join(' ');
  }

  function stopSpeech() {
    speechSession += 1;
    if (speechAudio) {
      speechAudio.onerror = null;
      speechAudio.pause();
      try {
        speechAudio.currentTime = 0;
      } catch {
        // Een lege audio-bron mag geen fout geven.
      }
    }
    if (hasSpeechSynthesis) window.speechSynthesis.cancel();
  }

  // Alleen nodig voor zinnen die niet vooraf zijn ingesproken, zoals een
  // eigen berichtje van een ouder.
  function speakWithBrowser(text) {
    if (!hasSpeechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'nl-NL';
    utterance.rate = 0.95;
    utterance.pitch = 1.02;
    const voices = window.speechSynthesis.getVoices();
    const dutch = voices.find((voice) => voice.lang?.toLowerCase().startsWith('nl')) || voices.find((voice) => voice.lang?.toLowerCase().includes('nl'));
    if (dutch) utterance.voice = dutch;
    window.speechSynthesis.speak(utterance);
  }

  function speak(text) {
    if (!canSpeak || !state.settings.voice || !text) return;
    const value = String(text).trim();
    if (!value) return;

    stopIntro();
    stopSpeech();
    const session = speechSession;
    const clip = voiceClips[voiceKey(value)];
    if (!clip) {
      speakWithBrowser(value);
      return;
    }

    if (!speechAudio) {
      speechAudio = new Audio();
      speechAudio.preload = 'auto';
    }

    let fellBack = false;
    const fallback = () => {
      if (fellBack || session !== speechSession) return;
      fellBack = true;
      speakWithBrowser(value);
    };

    speechAudio.onerror = fallback;
    speechAudio.src = clip;
    const started = speechAudio.play();
    if (started && typeof started.catch === 'function') started.catch(fallback);
  }

  function updateVoiceIcon() {
    const icon = $('#voice-icon');
    const button = $('[data-action="toggle-voice"]');
    if (icon) icon.textContent = state.settings.voice ? '🔊' : '🔇';
    if (button) {
      button.setAttribute('aria-pressed', String(state.settings.voice));
      button.title = state.settings.voice ? 'Voorleesstem uitzetten' : 'Voorleesstem aanzetten';
    }
    const setting = $('#voice-setting');
    if (setting) {
      setting.checked = state.settings.voice;
      setting.disabled = !canSpeak;
    }
  }

  function applySettings() {
    document.body.classList.toggle('calm-mode', state.settings.calm);
    const calm = $('#calm-setting');
    if (calm) calm.checked = state.settings.calm;
    updateVoiceIcon();
  }

  function syncIntroButton() {
    const audio = $('#intro-audio');
    const button = $('#intro-button');
    if (!audio || !button) return;
    const playing = !audio.paused && !audio.ended;
    button.innerHTML = playing
      ? '<span aria-hidden="true">⏸</span> Stop de intro'
      : '<span aria-hidden="true">▶</span> Beluister de intro';
    button.setAttribute('aria-pressed', String(playing));
  }

  function toggleIntro() {
    const audio = $('#intro-audio');
    if (!audio) return;
    if (audio.paused || audio.ended) {
      stopSpeech();
      audio.currentTime = 0;
      audio.play().catch(() => showNotice('De intro kan nu niet worden afgespeeld.'));
    } else {
      audio.pause();
      audio.currentTime = 0;
      syncIntroButton();
    }
  }

  function stopIntro() {
    const audio = $('#intro-audio');
    if (!audio || audio.paused) return;
    audio.pause();
    audio.currentTime = 0;
    syncIntroButton();
  }

  // ---------------------------------------------------------------------------
  // Navigatie
  // ---------------------------------------------------------------------------

  const VIEWS = ['welcome', 'missions', 'mission', 'room', 'chest', 'parent'];

  function navigate(name) {
    if (!VIEWS.includes(name)) return;
    if (name === 'parent' && !parentUnlocked) {
      openPin(state.pinHash ? 'enter' : 'setup');
      return;
    }
    if (name !== 'parent') parentUnlocked = false;

    stopSpeech();
    stopIntro();
    const notice = $('#notice');
    if (notice) {
      notice.hidden = true;
      clearTimeout(noticeTimer);
    }
    ensureToday();
    ui.view = name;
    if (['welcome', 'missions', 'room', 'chest'].includes(name) && location.hash !== `#${name}`) {
      history.replaceState(null, '', `#${name}`);
    }

    for (const viewName of VIEWS) {
      const section = document.getElementById(`${viewName}-view`);
      if (section) section.hidden = viewName !== name;
    }

    const bottomNav = $('#bottom-nav');
    if (bottomNav) bottomNav.hidden = name === 'welcome';

    $$('.nav-button').forEach((button) => {
      if (button.dataset.action === name) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });

    renderView(name);
    updateWallet();
    window.scrollTo({ top: 0, behavior: 'auto' });
    const app = $('#app');
    if (app) app.focus({ preventScroll: true });
  }

  function renderView(name) {
    if (name === 'missions') renderMissions();
    else if (name === 'mission') renderMission();
    else if (name === 'room') renderRoom();
    else if (name === 'chest') renderChest();
    else if (name === 'parent') {
      renderParent();
      applySettings();
    }
  }

  function refresh() {
    ensureToday();
    updateWallet();
    renderView(ui.view);
  }

  // ---------------------------------------------------------------------------
  // Missies tonen
  // ---------------------------------------------------------------------------

  function focusAfterRender(selector) {
    requestAnimationFrame(() => {
      const element = $(selector);
      if (element) element.focus({ preventScroll: false });
    });
  }

  function statusPill(task) {
    const status = TASK_STATUS[task.status] || TASK_STATUS.todo;
    return `<span class="status-pill ${status.className}">${status.label}</span>`;
  }

  function renderMissions() {
    const list = $('#missions-list');
    if (!list) return;
    const tasks = state.days[todayKey()] || [];

    if (!tasks.length) {
      list.innerHTML = '<p class="empty-state">Voor vandaag staan er geen missies klaar. Dat is helemaal goed.</p>';
      return;
    }

    list.innerHTML = tasks.map((task) => {
      let action = '';
      if (task.status === 'todo' || task.status === 'doing') {
        action = `<button class="button button-primary" data-action="start-task" data-task="${esc(task.id)}">${task.status === 'todo' ? 'Start' : 'Verder'}</button>`;
      } else if (task.status === 'approved') {
        action = `<button class="button button-secondary" data-action="view-task" data-task="${esc(task.id)}">Bekijk</button>`;
      }

      return `
        <article class="mission-card">
          <div class="mission-icon" aria-hidden="true">${esc(task.icon)}</div>
          <h2>${esc(task.title)}</h2>
          <p class="mission-tag">${esc(task.tagline)} · ${esc(task.place)}</p>
          <div class="mission-footer">
            <span class="points">+${kwal(task.points)}</span>
            <div class="mission-footer-actions">
              ${statusPill(task)}
              ${action}
            </div>
          </div>
        </article>`;
    }).join('');
  }

  function missionReadText(task) {
    const stepNumber = Math.min(task.step + 1, task.steps.length);
    return `${task.title}. Stap ${stepNumber} van ${task.steps.length}. ${task.steps[Math.min(task.step, task.steps.length - 1)]}`;
  }

  function renderMission() {
    const content = $('#mission-content');
    if (!content) return;
    const task = ui.currentTaskKey ? findTask(ui.currentTaskKey) : null;

    if (!task) {
      content.innerHTML = `
        <div class="step-card empty-mission">
          <p class="eyebrow">Geen missie gekozen</p>
          <h1>Kies eerst een missie.</h1>
          <p class="lead">Op het scherm Missies zie je wat je vandaag kunt doen.</p>
          <div class="step-actions">
            <button class="button button-primary" data-action="missions">Naar mijn missies</button>
          </div>
        </div>`;
      return;
    }

    if (task.status === 'approved') {
      renderSuccess(task);
      return;
    }
    if (task.status === 'waiting') {
      renderWaiting(task);
      return;
    }
    if (task.step >= task.steps.length) {
      renderFinish(task);
      return;
    }
    renderStep(task);
  }

  function renderStep(task) {
    const content = $('#mission-content');
    const stepNumber = Math.min(task.step + 1, task.steps.length);
    const instruction = task.steps[Math.min(task.step, task.steps.length - 1)];
    const nudge = task.nudge
      ? `<p class="step-nudge">💬 ${esc(task.nudge)}</p>`
      : '';
    const helpOptions = ui.helpOpen ? `
      <div class="help-options">
        <button class="button" data-action="help-first">Doe de eerste stap met mij.</button>
        <button class="button" data-action="help-repeat">Zeg nog eens wat ik moet doen.</button>
        <button class="button" data-action="help-pause">Het is nu te veel. Even pauze.</button>
      </div>` : '';
    const helperText = ui.helpMessage || 'Je mag altijd om hulp of pauze vragen. Samen lukt het ook.';
    const practiceInvite = `
      <div class="practice-invite">
        <span class="practice-invite-icon" aria-hidden="true">${esc(task.icon)}</span>
        <div class="practice-invite-copy">
          <strong>Oefen het eerst</strong>
          <p>Doe de taak eerst rustig hier. Daarna mag je het thuis echt doen.</p>
        </div>
        <button class="button button-secondary" data-action="practice" data-game="${esc(task.templateId)}"><span aria-hidden="true">▶</span> Oefen</button>
      </div>`;

    content.innerHTML = `
      <div class="mission-play">
        <div class="step-card">
          <p class="eyebrow">${esc(task.tagline)} · ${esc(task.place)}</p>
          <div class="step-icon" aria-hidden="true">${esc(task.icon)}</div>
          <p class="step-count">Stap ${stepNumber} van ${task.steps.length}</p>
          <p class="step-instruction">${esc(instruction)}</p>
          ${nudge}
          ${practiceInvite}
          <div class="step-actions">
            <button class="button button-primary button-large" data-action="step-done">Gedaan →</button>
            <button class="button button-secondary" data-action="help-toggle">Help mij even</button>
            <button class="button button-secondary" data-action="pause">Pauze</button>
            <button class="button button-secondary" data-action="read-step">🔊 Lees voor</button>
          </div>
        </div>
        <aside class="helper-card">
          <img src="${AVATAR_SRC}" alt="">
          <h2>${ui.helpOpen ? 'Waarmee kan ik helpen?' : 'Samen lukt het'}</h2>
          <p>${esc(helperText)}</p>
          ${helpOptions}
        </aside>
      </div>`;
  }

  async function playPractice(gameId) {
    if (typeof window.startPracticeGame !== 'function') return;
    stopSpeech();
    const result = await window.startPracticeGame(gameId);
    if (result?.completed && result.summary) {
      showNotice(`🌟 ${result.summary}`, 7000);
      speak(result.summary);
    }
  }

  async function playBubbleGame() {
    if (typeof window.startBubbleGame !== 'function') return;
    stopSpeech();
    await window.startBubbleGame();
  }

  function renderFinish(task) {
    const content = $('#mission-content');
    content.innerHTML = `
      <div class="step-card finish-card">
        <div class="step-icon" aria-hidden="true">${esc(task.icon)}</div>
        <p class="eyebrow">Bijna klaar</p>
        <h2>Klaar met je missie?</h2>
        <p class="lead">Laat het even aan mama of papa zien. Zij kijken of het gelukt is. Daarna krijg je <strong>+${kwal(task.points)}</strong>.</p>
        <div class="step-actions">
          <button class="button button-primary button-large" data-action="finish-task">Mijn taak is klaar</button>
          <button class="button button-secondary" data-action="read-finish">🔊 Lees voor</button>
          <button class="button button-secondary" data-action="missions">Terug naar mijn missies</button>
        </div>
      </div>`;
  }

  function renderWaiting(task) {
    const content = $('#mission-content');
    content.innerHTML = `
      <div class="step-card finish-card">
        <p class="eyebrow">Wacht op een ouder</p>
        <h1>Goed gedaan, Jaren!</h1>
        <p class="lead">Je taak is klaar. Laat het apparaat even aan mama of Birger zien. Je krijgt <strong>+${kwal(task.points)}</strong> als het is goedgekeurd. Je hoeft niets opnieuw te doen.</p>
        <div class="step-actions">
          <button class="button button-primary" data-action="missions">Terug naar mijn missies</button>
          <button class="button button-secondary" data-action="read-waiting">🔊 Lees voor</button>
        </div>
      </div>`;
  }

  function renderSuccess(task) {
    const content = $('#mission-content');
    const title = titleFor(state.experience);
    content.innerHTML = `
      <div class="step-card success-card">
        <p class="success-big" aria-hidden="true">🪼</p>
        <p class="eyebrow">Goedgekeurd</p>
        <h1>Goed gedaan, Jaren!</h1>
        <p class="lead">${esc(task.success)} <strong>+${kwal(task.points)}!</strong></p>
        <p class="fine-print">Je hebt nu ${kwal(state.wallet)} en je bent ${esc(title.title)}.</p>
        <div class="step-actions success-actions">
          <button class="button button-primary" data-action="missions">Terug naar mijn missies</button>
          <button class="button button-secondary" data-action="room">Bekijk mijn Ananas</button>
          <button class="button button-secondary" data-action="read-success" data-task="${esc(task.id)}">🔊 Lees voor</button>
        </div>
      </div>`;
  }

  // ---------------------------------------------------------------------------
  // Kamer en winkel
  // ---------------------------------------------------------------------------

  function styleFromPosition(position) {
    return Object.entries(position || {}).map(([key, value]) => `${key}:${value}`).join(';');
  }

  function renderRoom() {
    const roomItems = $('#room-items');
    if (roomItems) {
      const furniture = ROOM_ITEMS
        .filter((item) => state.placed[item.id])
        .map((item) => `<span data-room-item="${esc(item.id)}" style="${styleFromPosition(item.position)}" title="${esc(item.name)}">${esc(item.icon)}</span>`)
        .join('');
      const equipped = state.equipped ? ITEM_BY_ID[state.equipped] : null;
      const equipment = equipped
        ? `<span class="avatar-equipment" title="${esc(equipped.name)}">${esc(equipped.icon)}</span>`
        : '';
      roomItems.innerHTML = furniture + equipment;
    }

    renderShop(AVATAR_ITEMS, 'avatar', '#avatar-shop');
    renderShop(ROOM_ITEMS, 'room', '#furniture-shop');

    const badge = $('#hero-badge');
    if (badge) {
      const title = titleFor(state.experience);
      badge.innerHTML = `🏅 <strong>${esc(title.title)}</strong> · ${kwal(state.experience)} ervaring`;
    }
  }

  function renderShop(items, kind, target) {
    const container = $(target);
    if (!container) return;
    container.innerHTML = items.map((item) => {
      const owned = state.owned[item.id] === true;
      const equipped = state.equipped === item.id;
      const placed = state.placed[item.id] === true;
      let statusText = kwal(item.price);
      let button = `<button class="button button-primary" data-action="buy-item" data-kind="${kind}" data-item="${esc(item.id)}">Kopen</button>`;

      if (owned && kind === 'avatar') {
        statusText = equipped ? 'In gebruik' : 'Van jou';
        button = `<button class="button ${equipped ? 'button-secondary' : 'button-primary'}" data-action="equip-item" data-item="${esc(item.id)}">${equipped ? 'Afzetten' : 'Aantrekken'}</button>`;
      } else if (owned) {
        statusText = placed ? 'Staat in je kamer' : 'Van jou';
        button = `<button class="button ${placed ? 'button-secondary' : 'button-primary'}" data-action="place-item" data-item="${esc(item.id)}">${placed ? 'Wegzetten' : 'Neerzetten'}</button>`;
      }

      return `
        <article class="shop-card${owned ? ' is-owned' : ''}">
          <span class="shop-icon" aria-hidden="true">${esc(item.icon)}</span>
          <div class="shop-info">
            <strong>${esc(item.name)}</strong>
            <span>${esc(item.effect)}</span>
            <span class="shop-price">${esc(statusText)}</span>
          </div>
          ${button}
        </article>`;
    }).join('');
  }

  // ---------------------------------------------------------------------------
  // De echte schatkist
  // ---------------------------------------------------------------------------

  function renderChest() {
    const rewardsList = $('#rewards-list');
    if (rewardsList) {
      const rewards = state.rewards.filter((reward) => reward.active);
      if (!rewards.length) {
        rewardsList.innerHTML = '<p class="empty-state">Mama of Birger heeft nog geen echte beloning klaargezet. Je kunt wel al sparen voor je kamer.</p>';
      } else {
        rewardsList.innerHTML = rewards.map((reward) => {
          const missing = reward.price - state.wallet;
          const action = missing <= 0
            ? `<button class="button button-primary" data-action="request-reward" data-reward="${esc(reward.id)}">Deze wil ik</button>
               <span class="fine-print">Je houdt ${kwal(state.wallet - reward.price)} over.</span>`
            : `<button class="button button-secondary" disabled>Nog ${kwal(missing)} sparen</button>`;
          return `
            <article class="reward-card">
              <div class="reward-info">
                <h3>${esc(reward.title)}</h3>
                <p>${esc(reward.appointment)}</p>
                <p class="points">${kwal(reward.price)}</p>
              </div>
              <div class="reward-action">${action}</div>
            </article>`;
        }).join('');
      }
    }

    const requestsList = $('#requests-list');
    if (!requestsList) return;
    const requests = state.requests
      .filter((request) => ['requested', 'confirmed', 'executed'].includes(request.status))
      .sort((a, b) => String(b.requestedAt || '').localeCompare(String(a.requestedAt || '')));

    if (!requests.length) {
      requestsList.innerHTML = '<p class="empty-state">Nog geen afspraak. Kies hierboven een beloning als je er genoeg kwallen voor hebt.</p>';
      return;
    }

    requestsList.innerHTML = requests.map((request) => {
      const status = REQUEST_STATUS[request.status] || REQUEST_STATUS.requested;
      let detail = 'Mama of Birger bekijkt je aanvraag.';
      if (request.status === 'confirmed') detail = request.when ? `Afgesproken: ${request.when}` : 'De afspraak is bevestigd.';
      if (request.status === 'executed') detail = 'Deze beloning is uitgevoerd. Veel plezier!';
      const cancel = request.status === 'executed'
        ? ''
        : `<button class="button button-secondary" data-action="cancel-request" data-request="${esc(request.id)}">Annuleren</button>`;
      return `
        <article class="reward-card request-card">
          <div class="reward-info">
            <h3>${esc(request.title)}</h3>
            <p><span class="status-pill ${status.className}">${status.label}</span> · ${kwal(request.price)}</p>
            <p>${esc(detail)}</p>
          </div>
          <div class="reward-action">${cancel}</div>
        </article>`;
    }).join('');
  }

  // ---------------------------------------------------------------------------
  // Ouderhoek
  // ---------------------------------------------------------------------------

  function renderParent() {
    renderApprovals();
    renderParentRequests();
    renderParentRewards();
    applySettings();
  }

  function renderApprovals() {
    const list = $('#approvals-list');
    if (!list) return;
    const waiting = allWaitingTasks();

    if (!waiting.length) {
      list.innerHTML = '<p class="empty-state">Er wacht nu geen missie op goedkeuring.</p>';
      return;
    }

    list.innerHTML = waiting.map(({ date, task }) => {
      const helpNote = task.helpCount > 0 ? ' · hulp gevraagd' : '';
      const nudgePanel = ui.nudgeTaskKey === task.id ? `
        <div class="nudge-steps">
          <p><strong>Welke stap is nog niet klaar?</strong></p>
          <div class="nudge-options">
            ${task.steps.map((step, index) => `<button type="button" data-action="nudge-step" data-task="${esc(task.id)}" data-step="${index}">${index + 1}. ${esc(step)}</button>`).join('')}
            <button type="button" class="button button-secondary" data-action="cancel-nudge">Annuleren</button>
          </div>
        </div>` : '';

      return `
        <div class="approval-card">
          <div class="approval-info">
            <strong>${esc(task.title)}</strong>
            <p>${esc(formatDate(date))} · ${task.steps.length} stappen · +${kwal(task.points)}${helpNote}</p>
            <p>Laatste stap: ${esc(task.steps[task.steps.length - 1])}</p>
          </div>
          <div class="approval-actions">
            <button class="button button-primary" data-action="approve-task" data-task="${esc(task.id)}">Goedkeuren: +${task.points}</button>
            <button class="button button-secondary" data-action="nudge-task" data-task="${esc(task.id)}">Nog één stap samen</button>
          </div>
          ${nudgePanel}
        </div>`;
    }).join('');
  }

  function renderParentRequests() {
    const list = $('#parent-requests');
    if (!list) return;
    const requests = [...state.requests].sort((a, b) => String(b.requestedAt || '').localeCompare(String(a.requestedAt || '')));

    if (!requests.length) {
      list.innerHTML = '<p class="empty-state">Er zijn nog geen beloningsaanvragen.</p>';
      return;
    }

    list.innerHTML = requests.map((request) => {
      const status = REQUEST_STATUS[request.status] || REQUEST_STATUS.requested;
      let actions = '';
      if (request.status === 'requested') {
        actions = `
          <label class="request-when">Dag of moment
            <input type="text" maxlength="120" data-when="${esc(request.id)}" value="${esc(request.when)}" placeholder="Bijv. vrijdag na het eten">
          </label>
          <button class="button button-primary" data-action="confirm-request" data-request="${esc(request.id)}">Bevestig afspraak</button>
          <button class="button button-coral" data-action="reject-request" data-request="${esc(request.id)}">Afwijzen</button>`;
      } else if (request.status === 'confirmed') {
        actions = `
          <button class="button button-primary" data-action="execute-request" data-request="${esc(request.id)}">Markeer als uitgevoerd</button>
          <button class="button button-coral" data-action="reject-request" data-request="${esc(request.id)}">Annuleer afspraak</button>`;
      }

      const details = [
        request.when ? `<p><strong>Moment:</strong> ${esc(request.when)}</p>` : '',
        request.executedAt ? `<p><strong>Uitgevoerd:</strong> ${esc(formatMoment(request.executedAt))}</p>` : '',
        `<p class="fine-print">Aangevraagd ${esc(formatMoment(request.requestedAt))}${request.refunded ? ' · kwallen terugbetaald' : ''}</p>`
      ].join('');

      return `
        <article class="reward-card request-card">
          <div class="request-info">
            <h3>${esc(request.title)}</h3>
            <p><span class="status-pill ${status.className}">${status.label}</span> · ${kwal(request.price)}</p>
            <p>Afspraak: ${esc(request.appointment)}</p>
            ${details}
          </div>
          <div class="request-actions">${actions}</div>
        </article>`;
    }).join('');
  }

  function renderParentRewards() {
    const list = $('#parent-rewards');
    if (!list) return;
    if (!state.rewards.length) {
      list.innerHTML = '<p class="empty-state">Er zijn nog geen beloningen. Voeg hierboven een haalbare afspraak toe.</p>';
      return;
    }
    list.innerHTML = state.rewards.map((reward) => `
      <div class="parent-reward">
        <div class="parent-reward-info">
          <strong>${esc(reward.title)}</strong>
          <span class="fine-print">${kwal(reward.price)} · ${esc(reward.appointment)}${reward.suggestion ? ' · voorstel' : ''}</span>
        </div>
        <div class="approval-actions">
          <button class="button ${reward.active ? 'button-secondary' : 'button-primary'}" data-action="toggle-reward" data-reward="${esc(reward.id)}">${reward.active ? 'Uitzetten' : 'Aanzetten'}</button>
          <button class="button button-coral" data-action="delete-reward" data-reward="${esc(reward.id)}">Verwijderen</button>
        </div>
      </div>`).join('');
  }

  // ---------------------------------------------------------------------------
  // Acties in de missie
  // ---------------------------------------------------------------------------

  function startTask(taskId) {
    const task = findTask(taskId);
    if (!task) return;
    ui.currentTaskKey = task.id;
    ui.helpOpen = false;
    ui.helpMessage = '';

    if (task.status === 'todo') {
      task.status = 'doing';
      task.startedAt = new Date().toISOString();
      saveState();
    }

    navigate('mission');

    if (task.status === 'approved') {
      speak(`${task.success} Je kreeg ${kwal(task.points)}.`);
    } else if (task.status === 'waiting') {
      speak('Goed gedaan! Laat het even aan mama of papa zien.');
    } else if (task.step >= task.steps.length) {
      speak('Klaar met je missie? Laat het even aan mama of papa zien.');
    } else if (task.nudge) {
      const withNudge = `${task.nudge} ${missionReadText(task)}`;
      // Een eigen berichtje van een ouder heeft geen vaste clip. Zeg dan in
      // elk geval de stap voor, zodat het voorlezen blijft werken.
      speak(voiceClips[voiceKey(withNudge)] ? withNudge : missionReadText(task));
    } else {
      speak(missionReadText(task));
    }
  }

  function viewTask(taskId) {
    startTask(taskId);
  }

  function completeStep() {
    const task = findTask(ui.currentTaskKey);
    if (!task || !['todo', 'doing'].includes(task.status)) return;
    if (task.status === 'todo') {
      task.status = 'doing';
      task.startedAt = new Date().toISOString();
    }
    if (task.step >= task.steps.length) return;

    task.step += 1;
    task.nudge = '';
    ui.helpOpen = false;
    ui.helpMessage = '';
    saveState();
    renderMission();

    if (task.step >= task.steps.length) {
      speak('Klaar met je missie? Laat het even aan mama of papa zien.');
      focusAfterRender('[data-action="finish-task"]');
    } else {
      speak(task.steps[task.step]);
      focusAfterRender('[data-action="step-done"]');
    }
  }

  function toggleHelp() {
    const task = findTask(ui.currentTaskKey);
    if (!task) return;
    ui.helpOpen = !ui.helpOpen;
    if (ui.helpOpen) {
      task.helpCount = (task.helpCount || 0) + 1;
      saveState();
    }
    renderMission();
    if (ui.helpOpen) {
      speak('Waarmee kan ik helpen?');
      focusAfterRender('[data-action="help-first"]');
    }
  }

  function helpFirst() {
    const task = findTask(ui.currentTaskKey);
    if (!task) return;
    ui.helpMessage = `Vraag mama of papa om de eerste stap samen te doen: ${task.steps[0]}`;
    speak(ui.helpMessage);
    renderMission();
    focusAfterRender('[data-action="help-repeat"]');
  }

  function helpRepeat() {
    const task = findTask(ui.currentTaskKey);
    if (!task) return;
    const step = task.steps[Math.min(task.step, task.steps.length - 1)];
    ui.helpMessage = `Deze stap: ${step}`;
    speak(ui.helpMessage);
    renderMission();
    focusAfterRender('[data-action="help-repeat"]');
  }

  function pauseTask() {
    const task = findTask(ui.currentTaskKey);
    if (!task) return;
    if (task.status === 'todo') {
      task.status = 'doing';
      task.startedAt = new Date().toISOString();
    }
    if (task.status !== 'doing') return;
    saveState();
    navigate('missions');
    showNotice('Pauze. Je stap blijft bewaard. Je kunt later verder.');
    speak('Pauze. Je stap blijft bewaard.');
  }

  function finishTask() {
    const task = findTask(ui.currentTaskKey);
    if (!task || task.status !== 'doing' || task.step < task.steps.length) return;
    task.status = 'waiting';
    task.submittedAt = new Date().toISOString();
    saveState();
    renderMission();
    showNotice('Je taak is klaar en wacht op mama of Birger.');
    speak('Goed gedaan! Laat het even aan mama of papa zien. Je hoeft niets opnieuw te doen.');
    focusAfterRender('[data-action="missions"]');
  }

  function approveTask(taskId) {
    const task = findTask(taskId);
    if (!task || task.status !== 'waiting') return;
    task.status = 'approved';
    task.approvedAt = new Date().toISOString();
    state.wallet += task.points;
    state.experience += task.points;
    addTransaction('earn', task.points, task.id, task.title);
    saveState();
    updateWallet();
    renderParent();
    showNotice(`Goedgekeurd! Jaren krijgt +${kwal(task.points)}.`);
    if (ui.nudgeTaskKey === task.id) ui.nudgeTaskKey = null;
  }

  function openNudge(taskId) {
    const task = findTask(taskId);
    if (!task || task.status !== 'waiting') return;
    ui.nudgeTaskKey = ui.nudgeTaskKey === taskId ? null : taskId;
    renderParent();
  }

  function chooseNudgeStep(taskId, stepIndex) {
    const task = findTask(taskId);
    if (!task || task.status !== 'waiting') return;
    const index = clamp(Number(stepIndex) || 0, 0, task.steps.length - 1);
    task.status = 'doing';
    task.step = index;
    task.nudge = `Je bent al begonnen. ${task.steps[index]} Mama of papa helpt even.`;
    task.nudgedAt = new Date().toISOString();
    saveState();
    ui.nudgeTaskKey = null;
    renderParent();
    showNotice('De missie staat weer open. Jaren ziet welke stap nog moet.');
  }

  // ---------------------------------------------------------------------------
  // Winkel en beloningen
  // ---------------------------------------------------------------------------

  async function buyItem(itemId, kind) {
    const item = ITEM_BY_ID[itemId];
    if (!item || state.owned[itemId]) return;

    if (state.wallet < item.price) {
      showNotice(`Je hebt nog ${kwal(item.price - state.wallet)} nodig voor ${item.name}.`);
      return;
    }

    const ok = await confirmAction({
      eyebrow: 'Spulletje kopen',
      title: `${item.name} kopen?`,
      body: `Dit kost ${kwal(item.price)}. Je houdt er ${kwal(state.wallet - item.price)} over.`,
      yes: 'Ja, kopen',
      no: 'Verder sparen'
    });
    if (!ok) return;
    if (state.owned[itemId] || state.wallet < item.price) return;

    state.wallet -= item.price;
    state.owned[itemId] = true;
    if (kind === 'avatar' || AVATAR_ITEMS.some((avatarItem) => avatarItem.id === itemId)) {
      state.equipped = itemId;
    } else {
      state.placed[itemId] = true;
    }
    addTransaction('purchase', -item.price, itemId, item.name);
    saveState();
    updateWallet();
    renderRoom();
    showNotice(`${item.name} is nu van jou!`);
    speak(`${item.name} is van jou.`);
  }

  function equipItem(itemId) {
    if (!state.owned[itemId] || !AVATAR_ITEMS.some((item) => item.id === itemId)) return;
    state.equipped = state.equipped === itemId ? null : itemId;
    saveState();
    renderRoom();
  }

  function placeItem(itemId) {
    if (!state.owned[itemId] || !ROOM_ITEMS.some((item) => item.id === itemId)) return;
    state.placed[itemId] = !state.placed[itemId];
    saveState();
    renderRoom();
  }

  async function requestReward(rewardId) {
    const reward = state.rewards.find((candidate) => candidate.id === rewardId && candidate.active);
    if (!reward) return;
    if (state.wallet < reward.price) {
      showNotice(`Je hebt nog ${kwal(reward.price - state.wallet)} nodig.`);
      return;
    }

    const ok = await confirmAction({
      eyebrow: 'Echte beloning',
      title: `"${reward.title}" aanvragen?`,
      body: `Dit kost ${kwal(reward.price)}. Je houdt er ${kwal(state.wallet - reward.price)} over. Mama of Birger bevestigt daarna de afspraak.`,
      yes: 'Ja, vraag aan',
      no: 'Nog even niet'
    });
    if (!ok) return;
    if (state.wallet < reward.price) return;

    state.wallet -= reward.price;
    state.requests.unshift({
      id: uid(),
      rewardId: reward.id,
      title: reward.title,
      price: reward.price,
      appointment: reward.appointment,
      when: '',
      status: 'requested',
      requestedAt: new Date().toISOString(),
      confirmedAt: null,
      executedAt: null,
      refunded: false
    });
    addTransaction('reserve', -reward.price, reward.id, reward.title);
    saveState();
    updateWallet();
    renderChest();
    showNotice('Je aanvraag is verstuurd. Mama of Birger bevestigt de afspraak.');
    speak('Je aanvraag is verstuurd. Mama of Birger bevestigt de afspraak.');
  }

  function refundRequest(request, nextStatus) {
    if (!request || request.refunded) return;
    state.wallet += request.price;
    request.refunded = true;
    request.status = nextStatus;
    request.refundedAt = new Date().toISOString();
    addTransaction('refund', request.price, request.id, request.title);
  }

  async function cancelRequest(requestId) {
    const request = state.requests.find((candidate) => candidate.id === requestId);
    if (!request || !['requested', 'confirmed'].includes(request.status)) return;

    const ok = await confirmAction({
      eyebrow: 'Beloning annuleren',
      title: 'Deze aanvraag annuleren?',
      body: 'De kwallen komen een keer terug op je saldo. De afspraak komt te vervallen.',
      yes: 'Ja, annuleren',
      no: 'Nee, laten staan'
    });
    if (!ok) return;
    if (!['requested', 'confirmed'].includes(request.status)) return;

    refundRequest(request, 'cancelled');
    saveState();
    updateWallet();
    renderChest();
    showNotice('Geannuleerd. De kwallen staan weer op je saldo.');
  }

  function confirmRequest(requestId) {
    const request = state.requests.find((candidate) => candidate.id === requestId);
    if (!request || request.status !== 'requested') return;
    const input = $$('[data-when]').find((element) => element.dataset.when === request.id);
    request.when = (input?.value || '').trim().slice(0, 120) || 'In overleg';
    request.status = 'confirmed';
    request.confirmedAt = new Date().toISOString();
    saveState();
    renderParent();
    showNotice('De afspraak is bevestigd. Jaren ziet het moment in de schatkist.');
  }

  async function rejectRequest(requestId) {
    const request = state.requests.find((candidate) => candidate.id === requestId);
    if (!request || !['requested', 'confirmed'].includes(request.status)) return;

    const ok = await confirmAction({
      eyebrow: 'Beloning afwijzen',
      title: 'Deze aanvraag afwijzen?',
      body: 'De kwallen komen een keer terug op het saldo. Een bestaande afspraak verdwijnt niet stilletjes: Jaren ziet de status in de schatkist.',
      yes: 'Ja, afwijzen',
      no: 'Nee, laten staan'
    });
    if (!ok) return;
    if (!['requested', 'confirmed'].includes(request.status)) return;

    refundRequest(request, 'rejected');
    saveState();
    updateWallet();
    renderParent();
    showNotice('De aanvraag is afgewezen. De kwallen zijn terugbetaald.');
  }

  function executeRequest(requestId) {
    const request = state.requests.find((candidate) => candidate.id === requestId);
    if (!request || request.status !== 'confirmed') return;
    request.status = 'executed';
    request.executedAt = new Date().toISOString();
    saveState();
    renderParent();
    showNotice('Beloning uitgevoerd. De afspraak blijft zichtbaar in de geschiedenis.');
  }

  function toggleReward(rewardId) {
    const reward = state.rewards.find((candidate) => candidate.id === rewardId);
    if (!reward) return;
    reward.active = !reward.active;
    saveState();
    renderParent();
    showNotice(reward.active ? 'De beloning staat aan en is zichtbaar voor Jaren.' : 'De beloning staat uit.');
  }

  async function deleteReward(rewardId) {
    const reward = state.rewards.find((candidate) => candidate.id === rewardId);
    if (!reward) return;
    const ok = await confirmAction({
      eyebrow: 'Beloning verwijderen',
      title: `"${reward.title}" verwijderen?`,
      body: 'Bestaande aanvragen en afspraken blijven bewaard. Alleen deze beloning verdwijnt uit de lijst.',
      yes: 'Ja, verwijderen',
      no: 'Annuleren'
    });
    if (!ok) return;
    state.rewards = state.rewards.filter((candidate) => candidate.id !== rewardId);
    saveState();
    renderParent();
    showNotice('De beloning is verwijderd.');
  }

  function handleRewardSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const title = String(data.get('title') || '').trim().slice(0, 60);
    const appointment = String(data.get('appointment') || '').trim().slice(0, 120);
    const price = clamp(Math.round(Number(data.get('price')) || 0), 1, 500);

    if (!title || !appointment || !Number.isFinite(price)) {
      showNotice('Vul een beloning, een prijs en een duidelijke afspraak in.');
      return;
    }

    state.rewards.push({
      id: uid(),
      title,
      price,
      appointment,
      active: true,
      suggestion: false,
      createdAt: new Date().toISOString()
    });
    saveState();
    form.reset();
    renderParent();
    showNotice('De nieuwe beloning staat aan.');
  }

  // ---------------------------------------------------------------------------
  // Ouder-PIN en bevestigingen
  // ---------------------------------------------------------------------------

  function openPin(mode) {
    const dialog = $('#pin-dialog');
    const form = $('#pin-form');
    if (!dialog || !form) return;
    ui.pinMode = mode;
    const setup = mode === 'setup';
    form.reset();

    $('#pin-title').textContent = setup ? 'Kies een ouder-PIN' : 'Voer de ouder-PIN in';
    $('#pin-description').textContent = setup
      ? 'Kies vier cijfers. De PIN voorkomt dat Jaren per ongeluk instellingen wijzigt. Het is geen beveiliging voor gevoelige gegevens.'
      : 'De PIN voorkomt dat Jaren per ongeluk instellingen wijzigt.';
    $('#pin-confirm-wrap').hidden = !setup;
    $('#pin-confirm').required = setup;
    $('#pin-error').textContent = '';

    if (dialog.open) dialog.close();
    dialog.showModal();
    requestAnimationFrame(() => $('#pin-input').focus());
  }

  function handlePinSubmit(event) {
    event.preventDefault();
    const pin = String($('#pin-input').value || '').trim();
    const confirmation = String($('#pin-confirm').value || '').trim();
    const error = $('#pin-error');

    if (!/^\d{4}$/.test(pin)) {
      error.textContent = 'Vul precies vier cijfers in.';
      $('#pin-input').focus();
      return;
    }

    if (ui.pinMode === 'setup') {
      if (pin !== confirmation) {
        error.textContent = 'De twee PIN-codes zijn niet gelijk.';
        $('#pin-confirm').value = '';
        $('#pin-confirm').focus();
        return;
      }
      state.pinHash = hashPin(pin);
      saveState();
      $('#pin-dialog').close();
      parentUnlocked = true;
      navigate('parent');
      showNotice('De ouder-PIN is ingesteld. De ouderhoek is nu open.');
      return;
    }

    if (hashPin(pin) !== state.pinHash) {
      error.textContent = 'Die PIN klopt niet. Probeer het opnieuw.';
      $('#pin-input').value = '';
      $('#pin-input').focus();
      return;
    }

    $('#pin-dialog').close();
    parentUnlocked = true;
    navigate('parent');
  }

  function confirmAction({ eyebrow = 'Even checken', title, body, yes = 'Ja', no = 'Nee' }) {
    const dialog = $('#confirm-dialog');
    if (!dialog) {
      return Promise.resolve(window.confirm(`${title}\n\n${body}`));
    }

    return new Promise((resolve) => {
      const handleClose = () => {
        dialog.removeEventListener('close', handleClose);
        resolve(dialog.returnValue === 'yes');
      };

      $('#confirm-eyebrow').textContent = eyebrow;
      $('#confirm-title').textContent = title;
      $('#confirm-body').textContent = body;
      $('#confirm-yes').textContent = yes;
      $('#confirm-no').textContent = no;
      dialog.returnValue = 'no';
      dialog.addEventListener('close', handleClose);
      if (dialog.open) dialog.close();
      dialog.showModal();
    });
  }

  // ---------------------------------------------------------------------------
  // Instellingen, export en herstel
  // ---------------------------------------------------------------------------

  function toggleVoice() {
    state.settings.voice = !state.settings.voice;
    saveState();
    applySettings();
    if (state.settings.voice) {
      showNotice('De voorleesstem staat aan.');
      speak('Hallo Jaren! Ik lees weer voor.');
    } else {
      stopSpeech();
      showNotice('De voorleesstem staat uit.');
    }
  }

  function exportProgress() {
    const payload = {
      ...state,
      app: APP_ID,
      version: APP_VERSION,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `jaren-onderwatermissies-${todayKey()}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    showNotice('De voortgang is geëxporteerd. Bewaar het bestand op een veilige plek.');
  }

  async function importProgress(file) {
    if (!file) return;
    let text = '';
    try {
      text = await file.text();
    } catch (error) {
      console.error(error);
      showNotice('Het gekozen bestand kon niet worden gelezen.');
      return;
    }

    let restored;
    try {
      restored = normalizeState(JSON.parse(text));
    } catch (error) {
      showNotice(error?.message || 'Dit is geen geldige reservekopie van deze app.');
      return;
    }

    const ok = await confirmAction({
      eyebrow: 'Voortgang herstellen',
      title: 'Deze reservekopie terugzetten?',
      body: 'De huidige voortgang op dit apparaat wordt vervangen door de inhoud van het bestand.',
      yes: 'Ja, herstellen',
      no: 'Annuleren'
    });
    if (!ok) return;

    state = restored;
    saveState();
    lastKnownDay = todayKey();
    ensureToday();
    applySettings();
    updateWallet();
    if (ui.currentTaskKey && !findTask(ui.currentTaskKey)) ui.currentTaskKey = null;
    renderView(ui.view);
    showNotice('De voortgang is hersteld.');
  }

  // ---------------------------------------------------------------------------
  // Gebeurtenissen
  // ---------------------------------------------------------------------------

  async function handleActionClick(event) {
    const target = event.target instanceof Element ? event.target.closest('[data-action]') : null;
    if (!target || target.disabled) return;
    if (target.tagName === 'A') event.preventDefault();
    const action = target.dataset.action;

    switch (action) {
      case 'welcome':
        navigate('welcome');
        break;
      case 'begin':
        navigate('missions');
        speak('Hoi Jaren! Dit kun je vandaag doen. Kies een missie. Je mag altijd om hulp of pauze vragen.');
        break;
      case 'missions':
        navigate('missions');
        break;
      case 'room':
        navigate('room');
        break;
      case 'chest':
        navigate('chest');
        break;
      case 'parent':
        navigate('parent');
        break;
      case 'toggle-voice':
        toggleVoice();
        break;
      case 'play-intro':
        toggleIntro();
        break;
      case 'start-task':
        startTask(target.dataset.task);
        break;
      case 'view-task':
        viewTask(target.dataset.task);
        break;
      case 'step-done':
        completeStep();
        break;
      case 'help-toggle':
        toggleHelp();
        break;
      case 'help-first':
        helpFirst();
        break;
      case 'help-repeat':
        helpRepeat();
        break;
      case 'help-pause':
        pauseTask();
        break;
      case 'pause':
        pauseTask();
        break;
      case 'finish-task':
        finishTask();
        break;
      case 'read-step': {
        const task = findTask(ui.currentTaskKey);
        if (task) speak(missionReadText(task));
        break;
      }
      case 'read-finish':
        speak('Klaar met je missie? Laat het even aan mama of papa zien.');
        break;
      case 'read-waiting':
        speak('Goed gedaan! Laat het even aan mama of papa zien. Je hoeft niets opnieuw te doen.');
        break;
      case 'read-success': {
        const task = findTask(target.dataset.task) || findTask(ui.currentTaskKey);
        if (task) speak(`${task.success} Je kreeg ${kwal(task.points)}.`);
        break;
      }
      case 'practice':
        await playPractice(target.dataset.game);
        break;
      case 'bubble-break':
        await playBubbleGame();
        break;
      case 'buy-item':
        await buyItem(target.dataset.item, target.dataset.kind);
        break;
      case 'equip-item':
        equipItem(target.dataset.item);
        break;
      case 'place-item':
        placeItem(target.dataset.item);
        break;
      case 'request-reward':
        await requestReward(target.dataset.reward);
        break;
      case 'cancel-request':
        await cancelRequest(target.dataset.request);
        break;
      case 'approve-task':
        approveTask(target.dataset.task);
        break;
      case 'nudge-task':
        openNudge(target.dataset.task);
        break;
      case 'nudge-step':
        chooseNudgeStep(target.dataset.task, target.dataset.step);
        break;
      case 'cancel-nudge':
        ui.nudgeTaskKey = null;
        renderParent();
        break;
      case 'confirm-request':
        confirmRequest(target.dataset.request);
        break;
      case 'reject-request':
        await rejectRequest(target.dataset.request);
        break;
      case 'execute-request':
        executeRequest(target.dataset.request);
        break;
      case 'toggle-reward':
        toggleReward(target.dataset.reward);
        break;
      case 'delete-reward':
        await deleteReward(target.dataset.reward);
        break;
      case 'export':
        exportProgress();
        break;
      case 'close-pin':
        $('#pin-dialog')?.close();
        break;
      case 'close-confirm': {
        const dialog = $('#confirm-dialog');
        if (dialog) {
          dialog.returnValue = 'no';
          dialog.close();
        }
        break;
      }
      default:
        break;
    }
  }

  function checkDayChange() {
    const current = todayKey();
    if (current === lastKnownDay) return;
    lastKnownDay = current;
    ensureToday();
    if (ui.view === 'missions') renderMissions();
    if (ui.view === 'mission' && (!ui.currentTaskKey || !findTask(ui.currentTaskKey))) renderMission();
    showNotice('Er staan nieuwe missies voor vandaag klaar.');
  }

  function bindEvents() {
    document.addEventListener('click', handleActionClick);
    document.addEventListener('jaren:speak', (event) => {
      const text = event.detail?.text;
      if (text) speak(text);
    });
    document.addEventListener('jaren:stop', stopSpeech);
    $('#pin-form')?.addEventListener('submit', handlePinSubmit);
    $('#reward-form')?.addEventListener('submit', handleRewardSubmit);

    $('#voice-setting')?.addEventListener('change', (event) => {
      state.settings.voice = event.target.checked;
      saveState();
      applySettings();
      if (!state.settings.voice) stopSpeech();
    });

    $('#calm-setting')?.addEventListener('change', (event) => {
      state.settings.calm = event.target.checked;
      saveState();
      applySettings();
    });

    $('#import-file')?.addEventListener('change', async (event) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      await importProgress(file);
    });

    const pinDialog = $('#pin-dialog');
    pinDialog?.addEventListener('close', () => {
      $('#pin-form')?.reset();
      const error = $('#pin-error');
      if (error) error.textContent = '';
    });

    const introAudio = $('#intro-audio');
    introAudio?.addEventListener('play', syncIntroButton);
    introAudio?.addEventListener('pause', syncIntroButton);
    introAudio?.addEventListener('ended', () => {
      introAudio.currentTime = 0;
      syncIntroButton();
    });

    window.addEventListener('hashchange', () => {
      const name = location.hash.replace('#', '');
      if (!VIEWS.includes(name) || name === ui.view) return;
      if (name === 'parent') {
        if (!parentUnlocked) openPin(state.pinHash ? 'enter' : 'setup');
        return;
      }
      navigate(name);
    });

    window.addEventListener('load', () => {
      const name = location.hash.replace('#', '');
      if (['missions', 'room', 'chest'].includes(name) && ui.view === 'welcome') {
        navigate(name);
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) checkDayChange();
    });

    setInterval(checkDayChange, 60000);
  }

  // ---------------------------------------------------------------------------
  // Starten
  // ---------------------------------------------------------------------------

  function init() {
    ensureToday();
    lastKnownDay = todayKey();
    applySettings();
    updateWallet();
    bindEvents();
    syncIntroButton();
    renderMissions();
    renderRoom();
    renderChest();

    const hash = location.hash.replace('#', '');
    if (['missions', 'room', 'chest', 'mission'].includes(hash)) {
      navigate(hash);
    } else {
      ui.view = 'welcome';
    }
  }

  init();
})();
