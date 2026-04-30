const API_BASE = localStorage.getItem('sncft_api_base') || 'http://127.0.0.1:3000';

const state = {
  origin: { id: 'tunis ville', name: 'Tunis Ville' },
  destination: { id: 'hammam lif', name: 'Hammam Lif' },
  offset: 0,
  limit: 5,
  lastQuery: null,
  lastResponse: null,
  selectedJourney: null,
  sliderIndex: 0,
};

function $(id) {
  return document.getElementById(id);
}

function qs(selector, root = document) {
  return root.querySelector(selector);
}

function qsa(selector, root = document) {
  return [...root.querySelectorAll(selector)];
}

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value;
}

function todayString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function ensureDefaults() {
  if ($('originInput') && !$('originInput').value) $('originInput').value = 'Tunis Ville';
  if ($('destinationInput') && !$('destinationInput').value) $('destinationInput').value = 'Hammam Lif';
  if ($('dateInput') && !$('dateInput').value) $('dateInput').value = todayString();
  if ($('timeInput') && !$('timeInput').value) $('timeInput').value = '05:00';
  if ($('passengersInput') && !$('passengersInput').value) $('passengersInput').value = '1';
}

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  const text = await res.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text };
  }

  if (!res.ok) {
    throw new Error(data?.error || `Erreur API ${res.status}`);
  }

  return data;
}

function normalizeInputStation(value) {
  const raw = String(value || '').trim();
  const key = raw.toLowerCase();

  const aliases = {
    tunis: 'Tunis',
    'tunis ville': 'Tunis Ville',
    hammam: 'Hammam Lif',
    'hammam lif': 'Hammam Lif',
    erriadh: 'Erriadh',
    riadh: 'Erriadh',
    mellassine: 'Mellassine',
    bougatfa: 'Bougatfa',
    goubaa: 'Goubaa',
    gobaa: 'Goubaa',
    ezzahra: 'LYCEE EZZAHRA',
    'ez zahra': 'EZ-ZAHRA',
  };

  return aliases[key] || raw;
}

function debounce(fn, delay = 220) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

async function fetchSuggestions(kind) {
  const input = kind === 'origin' ? $('originInput') : $('destinationInput');
  const box = kind === 'origin' ? $('originSuggestions') : $('destinationSuggestions');
  if (!input || !box) return;

  const q = input.value.trim();
  if (q.length < 2) {
    box.innerHTML = '';
    return;
  }

  try {
    const data = await api(`/stations/search?q=${encodeURIComponent(q)}&limit=10`);
    const items = data.items || [];

    box.innerHTML = items.map((item) => `
      <button type="button" data-id="${escapeHtml(item.id)}" data-name="${escapeHtml(item.name)}">
        ${escapeHtml(item.name)}
      </button>
    `).join('');

    qsa('button', box).forEach((btn) => {
      btn.addEventListener('click', () => {
        const selected = { id: btn.dataset.id, name: btn.dataset.name };
        if (kind === 'origin') state.origin = selected;
        if (kind === 'destination') state.destination = selected;
        input.value = selected.name;
        box.innerHTML = '';
      });
    });
  } catch (error) {
    box.innerHTML = `<button type="button">Erreur stations</button>`;
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function getDatetime() {
  ensureDefaults();
  const date = $('dateInput')?.value || todayString();
  const time = $('timeInput')?.value || '05:00';
  return `${date}T${time}:00`;
}

function collectSearch(offset = 0) {
  const originValue = $('originInput')?.value || state.origin.name;
  const destinationValue = $('destinationInput')?.value || state.destination.name;

  return {
    originStationId: state.origin?.id || normalizeInputStation(originValue),
    destinationStationId: state.destination?.id || normalizeInputStation(destinationValue),
    datetime: getDatetime(),
    passengers: Math.max(1, Number($('passengersInput')?.value || 1)),
    offset,
    limit: 5,
  };
}

function formatFare(fare) {
  if (!fare) return 'Tarif indisponible';
  const amount = Number(fare.amount || 0);
  if (!Number.isFinite(amount) || amount <= 0) return 'Tarif indisponible';
  const passengers = Number(fare.passengerCount || 1);
  const suffix = passengers > 1 ? ` · ${passengers} voyageurs` : '';
  return `${amount.toFixed(3)} ${fare.currency || 'TND'}${suffix}`;
}

function fareBreakdown(fare) {
  const parts = fare?.breakdown || [];
  if (!parts.length || parts.length < 2) return '';
  return parts.map((p) => `Ligne ${p.lineCode}: ${Number(p.amount || 0).toFixed(3)} TND`).join(' + ');
}

function journeyTypeLabel(journey) {
  return journey.type === 'transfer' ? 'Correspondance' : 'Direct';
}

function trainNumbers(journey) {
  return (journey.segments || []).map((s) => `Train ${s.trainNumber}`).join(' · ');
}

function segmentRoute(segment) {
  return `${displayStation(segment.originStationId)} → ${displayStation(segment.destinationStationId)}`;
}

function displayStation(value) {
  if (!value) return '';
  return String(value)
    .split(' ')
    .map((word) => word.length ? word[0].toUpperCase() + word.slice(1) : word)
    .join(' ');
}

async function searchJourneys(offset = 0) {
  const list = $('journeyList');
  if (!list) return;

  $('timeNav')?.classList.remove('hidden');
  showResultsList();

  list.innerHTML = `
    <article class="empty-state">
      <h3>Recherche en cours…</h3>
      <p>Chargement des trains disponibles.</p>
    </article>
  `;

  const query = collectSearch(offset);
  state.offset = offset;
  state.lastQuery = query;

  try {
    const params = new URLSearchParams({
      originStationId: query.originStationId,
      destinationStationId: query.destinationStationId,
      datetime: query.datetime,
      passengers: String(query.passengers),
      offset: String(query.offset),
      limit: '5',
    });

    const data = await api(`/journeys/search?${params.toString()}`);
    state.lastResponse = data;
    renderJourneys(data);
  } catch (error) {
    list.innerHTML = `
      <article class="empty-state">
        <h3>Erreur de recherche</h3>
        <p class="error">${escapeHtml(error.message)}</p>
      </article>
    `;
    setText('resultMeta', 'Erreur API');
  }
}

function renderJourneys(data) {
  const list = $('journeyList');
  if (!list) return;

  const items = data.items || [];
  const total = Number(data.total || items.length || 0);

  setText('resultMeta', `${items.length} / ${total} train(s)`);

  if (!items.length) {
    list.innerHTML = `
      <article class="empty-state">
        <h3>Aucun train trouvé</h3>
        <p>Essayez une autre heure ou une autre station.</p>
      </article>
    `;
    return;
  }

  list.innerHTML = items.map((journey, index) => {
    const first = journey.segments?.[0];
    const last = journey.segments?.[journey.segments.length - 1];
    const breakdown = fareBreakdown(journey.fare);

    return `
      <article class="journey-card">
        <div class="journey-top">
          <span class="badge ${journey.type === 'transfer' ? 'transfer' : ''}">${journeyTypeLabel(journey)}</span>
          <span class="train-number">${escapeHtml(trainNumbers(journey))}</span>
        </div>

        <div class="journey-main">
          <div class="journey-point">
            <div class="journey-time">${escapeHtml(journey.departureTime)}</div>
            <div class="journey-station">${escapeHtml(displayStation(first?.originStationId))}</div>
          </div>

          <div class="route-mid">
            <div class="rail-line"></div>
            <span class="duration-pill">${Number(journey.durationMinutes || 0)} min</span>
          </div>

          <div class="journey-point">
            <div class="journey-time">${escapeHtml(journey.arrivalTime)}</div>
            <div class="journey-station">${escapeHtml(displayStation(last?.destinationStationId))}</div>
          </div>
        </div>

        <div class="journey-meta">
          <span class="fare-chip">${escapeHtml(formatFare(journey.fare))}</span>
          ${journey.type === 'transfer' ? `<span class="duration-pill">Changement: ${escapeHtml(displayStation(journey.transferStationId))}</span>` : ''}
          ${breakdown ? `<span class="fare-detail">${escapeHtml(breakdown)}</span>` : ''}
        </div>

        <div class="journey-actions">
          <button class="details-btn" type="button" data-details="${index}">Voir le train</button>
          <button class="save-btn" type="button" data-save="${index}">Favori</button>
        </div>
      </article>
    `;
  }).join('');

  qsa('[data-details]', list).forEach((btn) => {
    btn.addEventListener('click', () => renderDetails(items[Number(btn.dataset.details)]));
  });

  qsa('[data-save]', list).forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.textContent = 'Ajouté';
      btn.disabled = true;
    });
  });
}

function renderDetails(journey) {
  if (!journey) return;
  state.selectedJourney = journey;

  qs('.details-card')?.classList.add('open-details');
  qs('.journey-list')?.classList.add('hide-on-details');
  qs('.pagination')?.classList.add('hide-on-details');
  qs('.results-head')?.classList.add('hide-on-details');

  setText('detailsTitle', `${journeyTypeLabel(journey)} · ${journey.departureTime} → ${journey.arrivalTime}`);

  const body = $('detailsBody');
  if (!body) return;

  const breakdown = fareBreakdown(journey.fare);

  body.innerHTML = `
    <button class="back-results-btn" type="button" id="backResultsBtn">← Retour aux trains</button>

    <div class="journey-meta">
      <span class="fare-chip">${escapeHtml(formatFare(journey.fare))}</span>
      ${breakdown ? `<span class="fare-detail">${escapeHtml(breakdown)}</span>` : ''}
    </div>

    ${(journey.segments || []).map((segment) => `
      <section class="segment-card">
        <div class="journey-top">
          <span class="badge">Ligne ${escapeHtml(segment.lineCode)}</span>
          <span class="train-number">Train ${escapeHtml(segment.trainNumber)}</span>
        </div>
        <strong>${escapeHtml(segmentRoute(segment))}</strong>

        ${(segment.stops || []).map((stop) => `
          <div class="stop-row">
            <div class="stop-time">${escapeHtml(stop.departureTime || stop.arrivalTime)}</div>
            <div class="stop-name">${escapeHtml(stop.stationName || displayStation(stop.stationId))}</div>
          </div>
        `).join('')}
      </section>
    `).join('')}
  `;

  $('backResultsBtn')?.addEventListener('click', showResultsList);
}

function showResultsList() {
  qs('.details-card')?.classList.remove('open-details');
  qs('.journey-list')?.classList.remove('hide-on-details');
  qs('.pagination')?.classList.remove('hide-on-details');
  qs('.results-head')?.classList.remove('hide-on-details');
}

function adjustTime(minutes) {
  ensureDefaults();
  const input = $('timeInput');
  if (!input) return;

  const [h, m] = input.value.split(':').map(Number);
  const total = Math.max(0, Math.min(23 * 60 + 59, h * 60 + m + minutes));
  const hh = String(Math.floor(total / 60)).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  input.value = `${hh}:${mm}`;
  searchJourneys(0);
}

function bindEvents() {
  $('originInput')?.addEventListener('input', debounce(() => {
    state.origin = { id: '', name: $('originInput').value };
    fetchSuggestions('origin');
  }));

  $('destinationInput')?.addEventListener('input', debounce(() => {
    state.destination = { id: '', name: $('destinationInput').value };
    fetchSuggestions('destination');
  }));

  $('swapBtn')?.addEventListener('click', () => {
    const originInput = $('originInput');
    const destinationInput = $('destinationInput');
    if (!originInput || !destinationInput) return;

    const previousOrigin = { ...state.origin };
    state.origin = { ...state.destination };
    state.destination = previousOrigin;

    const oldValue = originInput.value;
    originInput.value = destinationInput.value;
    destinationInput.value = oldValue;
  });

  $('searchBtn')?.addEventListener('click', () => searchJourneys(0));

  $('earlierBtn')?.addEventListener('click', () => adjustTime(-30));
  $('laterBtn')?.addEventListener('click', () => adjustTime(30));
  $('resetBtn')?.addEventListener('click', () => {
    $('dateInput').value = todayString();
    const now = new Date();
    $('timeInput').value = `${String(now.getHours()).padStart(2, '0')}:${String(Math.floor(now.getMinutes() / 5) * 5).padStart(2, '0')}`;
    searchJourneys(0);
  });

  $('previousPageBtn')?.addEventListener('click', () => {
    searchJourneys(Math.max(0, state.offset - 5));
  });

  $('nextPageBtn')?.addEventListener('click', () => {
    searchJourneys(state.offset + 5);
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.station-row')) {
      if ($('originSuggestions')) $('originSuggestions').innerHTML = '';
      if ($('destinationSuggestions')) $('destinationSuggestions').innerHTML = '';
    }
  });
}

function initSlider() {
  const slides = qsa('.hero-slide');
  const dots = qsa('.hero-dot');
  if (!slides.length) return;

  setInterval(() => {
    state.sliderIndex = (state.sliderIndex + 1) % slides.length;
    slides.forEach((slide, index) => slide.classList.toggle('active', index === state.sliderIndex));
    dots.forEach((dot, index) => dot.classList.toggle('active', index === state.sliderIndex));
  }, 3500);

  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
      state.sliderIndex = index;
      slides.forEach((slide, i) => slide.classList.toggle('active', i === index));
      dots.forEach((d, i) => d.classList.toggle('active', i === index));
    });
  });
}

function init() {
  ensureDefaults();
  bindEvents();
  initSlider();
  setText('apiStatus', 'API connectée');
}

window.addEventListener('DOMContentLoaded', init);
