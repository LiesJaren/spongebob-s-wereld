/* Rustige oefenspelletjes: eerst virtueel de taak doen, daarna thuis.
   Geen timer, geen score en geen verlies. */
(() => {
  'use strict';

  const LAUNDRY_ITEMS = [
    { id: 'shirt', icon: '👕', name: 'T-shirt', select: 'Je koos het T-shirt. Tik nu op de wasmand.', done: 'Het T-shirt zit in de wasmand.' },
    { id: 'socks', icon: '🧦', name: 'sokken', select: 'Je koos de sokken. Tik nu op de wasmand.', done: 'De sokken zitten in de wasmand.' },
    { id: 'shorts', icon: '🩳', name: 'broek', select: 'Je koos de broek. Tik nu op de wasmand.', done: 'De broek zit in de wasmand.' },
    { id: 'dress', icon: '👗', name: 'jurkje', select: 'Je koos het jurkje. Tik nu op de wasmand.', done: 'Het jurkje zit in de wasmand.' }
  ];

  const TOYS = [
    { icon: '🧸', name: 'knuffel', done: 'De knuffel ligt in de speelgoedbak!' },
    { icon: '🚗', name: 'autootje', done: 'Het autootje ligt in de speelgoedbak!' },
    { icon: '🧩', name: 'puzzel', done: 'De puzzel ligt in de speelgoedbak!' }
  ];

  const SCHOOL_ITEMS = [
    { icon: '🥪', name: 'brooddoos', done: 'De brooddoos zit in de tas!' },
    { icon: '🧴', name: 'drinkfles', done: 'De drinkfles zit in de tas!' },
    { icon: '📘', name: 'boek', done: 'Het boek zit in de tas!' }
  ];

  const PLATE_STEPS = [
    { icon: '🍽️', name: 'Pak je bord' },
    { icon: '👣', name: 'Loop naar de afruimplek' },
    { icon: '🍽️', name: 'Zet je bord neer' }
  ];

  const WASTE_ITEMS = [
    { icon: '📄', name: 'vel papier' },
    { icon: '📰', name: 'krant' },
    { icon: '📦', name: 'kartonnen doos' }
  ];

  const WASTE_BINS = [
    { id: 'paper', icon: '📄', name: 'Papier' },
    { id: 'rest', icon: '🗑️', name: 'Restafval' }
  ];

  const GAMES = {
    clothes: {
      title: 'Kleren in de wasmand',
      eyebrow: 'De Ananas · Oefenen',
      intro: 'Tik op een kledingstuk en daarna op de wasmand.',
      spoken: 'Tik op een kledingstuk. Tik daarna op de wasmand. Neem rustig je tijd.',
      mode: 'laundry',
      total: LAUNDRY_ITEMS.length,
      unit: 'kleren',
      resultDone: 'De wasmand is vol! Nu mag je het thuis doen.',
      summary: 'Goed geoefend met de wasmand! Nu mag je het thuis doen.'
    },
    toys: {
      title: 'Speelgoed opruimen',
      eyebrow: 'De Ananas · Oefenen',
      intro: 'Tik op de speeltjes om ze in de speelgoedbak te doen.',
      spoken: 'Tik op de speeltjes. Dan gaan ze in de speelgoedbak. Neem rustig je tijd.',
      mode: 'toys',
      total: TOYS.length,
      unit: 'speeltjes',
      resultDone: 'Alle speeltjes zitten in de bak! Nu mag je het thuis doen.',
      summary: 'Goed geoefend met opruimen! Nu mag je het thuis doen.'
    },
    bag: {
      title: 'Boekentas klaarzetten',
      eyebrow: 'De vaarschool · Oefenen',
      intro: 'Tik op de spullen die in je tas moeten.',
      spoken: 'Tik op de brooddoos, de drinkfles en het boek. Dan zitten ze in je tas. Neem rustig je tijd.',
      mode: 'bag',
      total: SCHOOL_ITEMS.length,
      unit: 'spullen',
      resultDone: 'Je tas is klaar! Nu mag je het thuis doen.',
      summary: 'Goed geoefend met je boekentas! Nu mag je het thuis doen.'
    },
    plate: {
      title: 'Bordje wegzetten',
      eyebrow: 'De Krokante Krab · Oefenen',
      intro: 'Tik op de stap die oplicht.',
      spoken: 'Tik op de stap die oplicht. Eerst je bord pakken, dan lopen, dan neerzetten. Neem rustig je tijd.',
      mode: 'plate',
      total: PLATE_STEPS.length,
      unit: 'stappen',
      resultDone: 'Het bordje staat op de afruimplek! Nu mag je het thuis doen.',
      summary: 'Goed geoefend met het bordje! Nu mag je het thuis doen.'
    },
    trash: {
      title: 'Afval sorteren',
      eyebrow: 'De haven · Oefenen',
      intro: 'Waar hoort het papier? Tik op de juiste bak.',
      spoken: 'Dit is schoon, droog papier. Waar hoort het? Tik op de papierbak. Neem rustig je tijd.',
      mode: 'waste',
      total: WASTE_ITEMS.length,
      unit: 'stukken papier',
      resultDone: 'Alles zit in de papierbak! Nu mag je het thuis doen.',
      summary: 'Goed geoefend met afval sorteren! Nu mag je het thuis doen.'
    },
    bubbles: {
      title: 'Even bubbelen',
      eyebrow: 'De Ananas · Rustig spelletje',
      intro: 'Tik op de bubbels om ze te laten ploppen. Je mag stoppen wanneer je wilt.',
      spoken: 'Tik op de bubbels om ze te laten ploppen. Je mag stoppen wanneer je wilt. Neem rustig je tijd.',
      mode: 'bubbles',
      total: null,
      unit: 'bubbels',
      resultDone: 'Goed gebubbeld!',
      summary: 'Goed gebubbeld!'
    }
  };

  const dialog = document.getElementById('practice-dialog');
  const stage = document.getElementById('practice-stage');
  const eyebrowEl = document.getElementById('practice-eyebrow');
  const titleEl = document.getElementById('practice-title');
  const introEl = document.getElementById('practice-intro');
  const progressEl = document.getElementById('practice-progress');
  const feedbackEl = document.getElementById('practice-feedback');
  const resultEl = document.getElementById('practice-result');
  const resultIconEl = document.getElementById('practice-result-icon');
  const resultTitleEl = document.getElementById('practice-result-title');
  const resultTextEl = document.getElementById('practice-result-text');
  const speakButton = document.getElementById('practice-speak');
  const stopButton = document.getElementById('practice-stop');
  const doneButton = document.getElementById('practice-done');

  let activeGame = null;
  let ignoreCloseEvent = false;
  let bubbleTimer = null;
  const timeouts = new Set();

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));

  const setText = (element, text) => {
    if (element) element.textContent = text;
  };

  const say = (text) => {
    if (!text) return;
    document.dispatchEvent(new CustomEvent('jaren:speak', { detail: { text } }));
  };

  const prefersStill = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
    || document.body.classList.contains('calm-mode');

  function clearTimeouts() {
    clearInterval(bubbleTimer);
    bubbleTimer = null;
    for (const timeout of timeouts) clearTimeout(timeout);
    timeouts.clear();
  }

  function later(callback, delay) {
    const timeout = setTimeout(() => {
      timeouts.delete(timeout);
      callback();
    }, delay);
    timeouts.add(timeout);
    return timeout;
  }

  function cleanup() {
    clearTimeouts();
    if (stage) stage.innerHTML = '';
  }

  function updateProgress(game) {
    if (!progressEl) return;
    if (game.config.mode === 'bubbles') {
      progressEl.textContent = `Gepopt: ${game.done}`;
      return;
    }
    progressEl.textContent = `${game.done} van ${game.config.total} ${game.config.unit}`;
  }

  function setFeedback(text, wrong = false) {
    if (!feedbackEl) return;
    feedbackEl.textContent = text;
    feedbackEl.classList.toggle('is-wrong', Boolean(wrong));
  }

  function resetUi(game) {
    const config = game.config;
    setText(eyebrowEl, config.eyebrow);
    setText(titleEl, config.title);
    setText(introEl, config.intro);
    setText(progressEl, '');
    setFeedback('');
    setText(resultIconEl, '🌟');
    setText(resultTitleEl, 'Goed geoefend!');
    setText(resultTextEl, '');
    if (resultEl) resultEl.hidden = true;
    if (introEl) introEl.hidden = false;
    if (progressEl) progressEl.hidden = false;
    if (feedbackEl) feedbackEl.hidden = false;
    if (stage) {
      stage.hidden = false;
      stage.className = `practice-stage mode-${config.mode}`;
      stage.innerHTML = '';
    }
    if (stopButton) {
      stopButton.hidden = false;
      stopButton.textContent = config.mode === 'bubbles' ? 'Klaar' : 'Stop';
    }
    if (doneButton) doneButton.hidden = true;
    updateProgress(game);
  }

  function complete(game) {
    if (game.finished) return;
    game.finished = true;
    cleanup();
    setText(resultIconEl, '🌟');
    setText(resultTitleEl, 'Goed geoefend!');
    setText(resultTextEl, game.config.resultDone);
    if (stage) stage.hidden = true;
    if (introEl) introEl.hidden = true;
    if (progressEl) progressEl.hidden = true;
    if (feedbackEl) feedbackEl.hidden = true;
    if (resultEl) resultEl.hidden = false;
    if (stopButton) stopButton.hidden = true;
    if (doneButton) {
      doneButton.hidden = false;
      doneButton.focus();
    }
    say(game.config.resultDone);
  }

  function finishIfComplete(game) {
    if (game.done >= game.config.total) {
      complete(game);
      return true;
    }
    return false;
  }

  function closeGame(completed) {
    if (!activeGame || activeGame.resolved) return;
    const game = activeGame;
    game.resolved = true;
    const summary = completed ? game.config.summary : '';
    cleanup();
    document.dispatchEvent(new CustomEvent('jaren:stop'));
    activeGame = null;
    if (dialog?.open) {
      ignoreCloseEvent = true;
      dialog.close();
    }
    game.resolve({ completed: Boolean(completed), count: game.done, summary });
  }

  function render(game) {
    if (!stage || activeGame !== game || game.finished) return;
    stage.innerHTML = '';
    switch (game.config.mode) {
      case 'laundry': renderLaundry(game); break;
      case 'toys': renderToys(game); break;
      case 'bag': renderBag(game); break;
      case 'plate': renderPlate(game); break;
      case 'waste': renderWaste(game); break;
      case 'bubbles': renderBubbles(game); break;
      default: break;
    }
  }

  function renderLaundry(game) {
    const collectedIcons = game.collected
      .map((id) => LAUNDRY_ITEMS.find((item) => item.id === id)?.icon || '')
      .join(' ');

    stage.innerHTML = `
      <div class="laundry-scene">
        <div class="laundry-floor" aria-label="Kleren op de vloer">
          ${LAUNDRY_ITEMS.map((item) => game.collected.includes(item.id)
            ? '<span class="laundry-space" aria-hidden="true">✓</span>'
            : `<button type="button" class="practice-choice clothing ${game.selected === item.id ? 'is-selected' : ''}" data-clothing="${item.id}" aria-pressed="${game.selected === item.id}" aria-label="${esc(item.name)}"><span class="choice-icon" aria-hidden="true">${item.icon}</span><span class="choice-name">${esc(item.name)}</span></button>`).join('')}
        </div>
        <button type="button" class="laundry-basket" data-basket ${game.selected ? '' : 'disabled'} aria-label="Leg het gekozen kledingstuk in de wasmand">
          <span class="basket-clothes" aria-hidden="true">${collectedIcons}</span>
          <span class="basket-icon" aria-hidden="true">🧺</span>
          <span class="basket-label">${game.selected ? 'Leg erin' : 'Wasmand'}</span>
        </button>
      </div>`;

    stage.querySelectorAll('[data-clothing]').forEach((button) => {
      button.addEventListener('click', () => {
        if (activeGame !== game || game.finished) return;
        const item = LAUNDRY_ITEMS.find((entry) => entry.id === button.dataset.clothing);
        if (!item || game.collected.includes(item.id)) return;
        game.selected = item.id;
        setFeedback(item.select);
        say(item.select);
        render(game);
        stage.querySelector('[data-basket]')?.focus({ preventScroll: true });
      });
    });

    stage.querySelector('[data-basket]')?.addEventListener('click', () => {
      if (activeGame !== game || game.finished || !game.selected) return;
      const item = LAUNDRY_ITEMS.find((entry) => entry.id === game.selected);
      if (!item || game.collected.includes(item.id)) return;
      game.collected.push(item.id);
      game.selected = null;
      game.done = game.collected.length;
      updateProgress(game);
      setFeedback(item.done);
      say(item.done);
      if (finishIfComplete(game)) return;
      render(game);
      stage.querySelector('[data-clothing]')?.focus({ preventScroll: true });
    });
  }

  function renderToys(game) {
    const remaining = TOYS
      .map((toy, index) => ({ ...toy, index }))
      .filter((toy) => !game.collected.includes(toy.index));

    stage.innerHTML = `
      <div class="practice-scene toys-scene">
        <div class="practice-choices" aria-label="Speeltjes om op te ruimen">
          ${remaining.length
            ? remaining.map((toy) => `<button type="button" class="practice-choice toy-choice" data-toy="${toy.index}" aria-label="${esc(toy.name)} in de speelgoedbak doen"><span class="choice-icon" aria-hidden="true">${toy.icon}</span><span class="choice-name">${esc(toy.name)}</span></button>`).join('')
            : '<p class="practice-empty">De speelgoedbak is vol!</p>'}
        </div>
        <div class="practice-destination" aria-label="Speelgoedbak">
          <span class="destination-icon" aria-hidden="true">🧺</span>
          <strong>Speelgoedbak</strong>
          <span class="destination-items" aria-hidden="true">${game.collected.map((index) => TOYS[index]?.icon || '').join(' ')}</span>
        </div>
      </div>`;

    stage.querySelectorAll('[data-toy]').forEach((button) => {
      button.addEventListener('click', () => {
        if (activeGame !== game || game.finished) return;
        const index = Number(button.dataset.toy);
        if (!Number.isInteger(index) || game.collected.includes(index)) return;
        game.collected.push(index);
        game.done = game.collected.length;
        updateProgress(game);
        setFeedback(TOYS[index].done);
        say(TOYS[index].done);
        if (finishIfComplete(game)) return;
        render(game);
        stage.querySelector('[data-toy]')?.focus({ preventScroll: true });
      });
    });
  }

  function renderBag(game) {
    const remaining = SCHOOL_ITEMS
      .map((item, index) => ({ ...item, index }))
      .filter((item) => !game.collected.includes(item.index));

    stage.innerHTML = `
      <div class="practice-scene bag-scene">
        <div class="practice-choices" aria-label="Spullen voor in de tas">
          ${remaining.length
            ? remaining.map((item) => `<button type="button" class="practice-choice bag-choice" data-bag="${item.index}" aria-label="${esc(item.name)} in de tas doen"><span class="choice-icon" aria-hidden="true">${item.icon}</span><span class="choice-name">${esc(item.name)}</span></button>`).join('')
            : '<p class="practice-empty">Alles zit in de tas!</p>'}
        </div>
        <div class="practice-destination" aria-label="Boekentas">
          <span class="destination-icon" aria-hidden="true">🎒</span>
          <strong>Boekentas</strong>
          <span class="destination-items" aria-hidden="true">${game.collected.map((index) => SCHOOL_ITEMS[index]?.icon || '').join(' ')}</span>
        </div>
      </div>`;

    stage.querySelectorAll('[data-bag]').forEach((button) => {
      button.addEventListener('click', () => {
        if (activeGame !== game || game.finished) return;
        const index = Number(button.dataset.bag);
        if (!Number.isInteger(index) || game.collected.includes(index)) return;
        game.collected.push(index);
        game.done = game.collected.length;
        updateProgress(game);
        setFeedback(SCHOOL_ITEMS[index].done);
        say(SCHOOL_ITEMS[index].done);
        if (finishIfComplete(game)) return;
        render(game);
        stage.querySelector('[data-bag]')?.focus({ preventScroll: true });
      });
    });
  }

  function renderPlate(game) {
    stage.innerHTML = `
      <div class="practice-scene plate-scene">
        <div class="plate-trail">
          ${PLATE_STEPS.map((step, index) => {
            const done = index < game.done;
            const current = index === game.done;
            return `<button type="button" class="practice-choice plate-step ${done ? 'is-done' : ''} ${current ? 'is-current' : ''}" data-step="${index}" ${current ? '' : 'disabled'} aria-label="${esc(step.name)}">
              <span class="choice-icon" aria-hidden="true">${done ? '✓' : step.icon}</span>
              <span class="choice-name">${esc(step.name)}</span>
            </button>`;
          }).join('')}
        </div>
        <p class="plate-note">Tik op de stap die oplicht.</p>
      </div>`;

    stage.querySelectorAll('[data-step]').forEach((button) => {
      button.addEventListener('click', () => {
        if (activeGame !== game || game.finished) return;
        const index = Number(button.dataset.step);
        if (index !== game.done) return;
        const step = PLATE_STEPS[index];
        game.done += 1;
        updateProgress(game);
        setFeedback(`${step.name}. Gedaan!`);
        if (finishIfComplete(game)) return;
        const next = PLATE_STEPS[game.done];
        if (next) say(next.name);
        render(game);
        stage.querySelector('[data-step]:not(:disabled)')?.focus({ preventScroll: true });
      });
    });
  }

  function renderWaste(game) {
    const item = WASTE_ITEMS[game.done];
    if (!item) return;

    stage.innerHTML = `
      <div class="practice-scene waste-scene">
        <div class="waste-item" role="img" aria-label="${esc(item.name)}">
          <span class="waste-icon" aria-hidden="true">${item.icon}</span>
          <strong>${esc(item.name)}</strong>
        </div>
        <div class="waste-bins" role="group" aria-label="Kies de juiste bak">
          ${WASTE_BINS.map((bin) => `<button type="button" class="practice-choice waste-bin ${bin.id}" data-bin="${bin.id}" aria-label="${esc(bin.name)}"><span class="choice-icon" aria-hidden="true">${bin.icon}</span><span class="choice-name">${esc(bin.name)}</span></button>`).join('')}
        </div>
      </div>`;

    stage.querySelectorAll('[data-bin]').forEach((button) => {
      button.addEventListener('click', () => {
        if (activeGame !== game || game.finished) return;
        if (button.dataset.bin === 'paper') {
          game.done += 1;
          updateProgress(game);
          setFeedback('Goed zo! Papier hoort bij papier.');
          say('Goed zo! Papier hoort bij papier.');
          if (finishIfComplete(game)) return;
          render(game);
          stage.querySelector('[data-bin="paper"]')?.focus({ preventScroll: true });
        } else {
          setFeedback('Dit is schoon, droog papier. Probeer de papierbak.', true);
          say('Dit is schoon, droog papier. Probeer de papierbak.');
          button.classList.add('is-wrong');
          later(() => button.classList.remove('is-wrong'), 500);
        }
      });
    });
  }

  function renderBubbles(game) {
    stage.innerHTML = '<div class="bubble-field" aria-label="Bubbelveld"></div>';
    const field = stage.querySelector('.bubble-field');
    if (!field) return;

    const spawn = () => {
      if (activeGame !== game || game.finished || !field) return;
      if (field.querySelectorAll('.practice-bubble').length >= 6) return;

      const bubble = document.createElement('button');
      bubble.type = 'button';
      bubble.className = 'practice-bubble';
      bubble.setAttribute('aria-label', 'Bubbel');
      const size = Math.round(52 + Math.random() * 28);
      bubble.style.setProperty('--size', `${size}px`);

      if (prefersStill()) {
        bubble.classList.add('is-still');
        bubble.style.setProperty('--left', `${4 + Math.random() * 78}%`);
        bubble.style.setProperty('--top', `${4 + Math.random() * 70}%`);
        later(() => bubble.remove(), 8000);
      } else {
        bubble.style.setProperty('--left', `${4 + Math.random() * 78}%`);
        bubble.style.setProperty('--drift', `${Math.round(Math.random() * 50 - 25)}px`);
        bubble.style.setProperty('--rise', `${8 + Math.random() * 3}s`);
        bubble.addEventListener('animationend', () => bubble.remove(), { once: true });
      }

      bubble.addEventListener('click', () => {
        if (activeGame !== game || game.finished) return;
        game.done += 1;
        updateProgress(game);
        bubble.remove();
      });

      field.append(bubble);
    };

    spawn();
    spawn();
    spawn();
    bubbleTimer = setInterval(spawn, 1200);
  }

  function startGame(gameId, isBubble = false) {
    const id = isBubble ? 'bubbles' : (GAMES[gameId] ? gameId : 'clothes');
    const config = GAMES[id];

    if (!dialog || !stage || typeof dialog.showModal !== 'function') {
      return Promise.resolve({ completed: false, count: 0, summary: '' });
    }
    if (activeGame) {
      return Promise.resolve({ completed: false, count: activeGame.done, summary: '' });
    }

    cleanup();
    return new Promise((resolve) => {
      const game = {
        id,
        config,
        resolve,
        done: 0,
        collected: [],
        selected: null,
        finished: false,
        resolved: false
      };
      activeGame = game;
      resetUi(game);
      dialog.showModal();
      render(game);
      say(config.spoken);
    });
  }

  dialog?.addEventListener('close', () => {
    if (ignoreCloseEvent) {
      ignoreCloseEvent = false;
      return;
    }
    if (activeGame) closeGame(activeGame.finished);
  });

  stopButton?.addEventListener('click', () => {
    if (!activeGame) return;
    closeGame(activeGame.config.mode === 'bubbles');
  });

  doneButton?.addEventListener('click', () => {
    if (activeGame) closeGame(true);
  });

  speakButton?.addEventListener('click', () => {
    if (activeGame) say(activeGame.config.spoken);
  });

  window.startPracticeGame = (gameId) => startGame(gameId, false);
  window.startBubbleGame = () => startGame('bubbles', true);
})();
