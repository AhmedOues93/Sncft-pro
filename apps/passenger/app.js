const ACCOUNT_KEY = 'sncft_passenger_accounts';
const SESSION_KEY = 'sncft_passenger_session';
const FAVORITES_KEY = 'sncft_passenger_favorites_by_account';
const TRIPS_KEY = 'sncft_passenger_trips_by_account';
const API_BASE_KEY = 'sncft_api_base';
const DEFAULT_API_BASE = 'http://127.0.0.1:3000';
const STRONG_PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const stationCoords = [
  { name: 'Tunis Ville', lat: 36.8008, lng: 10.18 },
  { name: 'Tunis', lat: 36.8065, lng: 10.1815 },
  { name: 'Hammam Lif', lat: 36.7272, lng: 10.3417 },
  { name: 'Ezzahra', lat: 36.7436, lng: 10.3082 },
  { name: 'Bougatfa', lat: 36.799, lng: 10.102 },
  { name: 'Goubaa', lat: 36.812, lng: 10.075 },
  { name: 'Mellassine', lat: 36.79, lng: 10.155 },
  { name: 'Erriadh', lat: 36.699, lng: 10.402 },
  { name: 'Ezzouhour 2', lat: 36.8012, lng: 10.1125 },
];

const state = {
  currentView: 'search',
  heroIndex: 0,
  stationFields: {},
  stationLookup: new Map(),
  session: null,
  accountMode: 'login',
  favorites: [],
  trips: [],
  hasSearched: false,
  currentOffset: 0,
  lastSearch: null,
  lastResultsMeta: null,
  currentJourneys: [],
};

const $ = (id) => document.getElementById(id);

function apiBase() {
  return localStorage.getItem(API_BASE_KEY) || DEFAULT_API_BASE;
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function titleCase(value) {
  return String(value || '')
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function rememberStations(items) {
  (items || []).forEach((item) => {
    if (!item?.id || !item?.name) return;
    state.stationLookup.set(normalizeText(item.id), item);
    state.stationLookup.set(normalizeText(item.name), item);
  });
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function sessionEmail() {
  return state.session?.email || null;
}

function accounts() {
  return readJson(ACCOUNT_KEY, []);
}

function saveAccounts(list) {
  writeJson(ACCOUNT_KEY, list);
}

function validateStrongPassword(password) {
  if (password.length < 8) return 'Le mot de passe doit contenir au moins 8 caracteres.';
  if (!/[A-Z]/.test(password)) return 'Le mot de passe doit contenir au moins une majuscule.';
  if (!/\d/.test(password)) return 'Le mot de passe doit contenir au moins un chiffre.';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Le mot de passe doit contenir au moins un caractere special.';
  return '';
}

function normalizePassengerAccount(account) {
  return {
    firstName: account?.firstName || '',
    lastName: account?.lastName || '',
    birthDate: account?.birthDate || '',
    email: String(account?.email || '').toLowerCase(),
    password: account?.password || '',
    createdAt: account?.createdAt || new Date().toISOString(),
  };
}

function seedAccounts() {
  const demoAccount = normalizePassengerAccount({
    firstName: 'Ahmed',
    lastName: 'Voyageur',
    birthDate: '1998-01-01',
    email: 'user@domain.tn',
    password: 'user123',
    createdAt: new Date().toISOString(),
  });

  const list = accounts();
  const next = list
    .filter((account) => String(account?.email || '').toLowerCase() !== demoAccount.email)
    .map(normalizePassengerAccount);
  saveAccounts([demoAccount, ...next]);
}

function favoritesStore() {
  return readJson(FAVORITES_KEY, {});
}

function tripsStore() {
  return readJson(TRIPS_KEY, {});
}

function loadAccountCollections() {
  const email = sessionEmail();
  const favoriteMap = favoritesStore();
  const tripMap = tripsStore();
  state.favorites = email ? (favoriteMap[email] || []) : [];
  state.trips = email ? (tripMap[email] || []) : [];
}

function saveAccountFavorites(list) {
  const email = sessionEmail();
  if (!email) return;
  const store = favoritesStore();
  store[email] = list;
  writeJson(FAVORITES_KEY, store);
  state.favorites = list;
}

function saveAccountTrips(list) {
  const email = sessionEmail();
  if (!email) return;
  const store = tripsStore();
  store[email] = list;
  writeJson(TRIPS_KEY, store);
  state.trips = list;
}

function favoriteKeys() {
  return new Set(state.favorites.map((item) => item.key));
}

function setNow() {
  const now = new Date();
  $('dateInput').value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  $('timeInput').value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function nextDaySearchIso(datetime) {
  const next = new Date(datetime);
  if (Number.isNaN(next.getTime())) return null;
  next.setDate(next.getDate() + 1);
  next.setHours(4, 0, 0, 0);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}T04:00:00`;
}

function formatDateLabel(datetime) {
  const parsed = new Date(datetime);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleString('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function setHero(index) {
  const slides = Array.from(document.querySelectorAll('#searchView .hero-slide'));
  const dots = Array.from(document.querySelectorAll('#searchView .hero-dots span'));
  if (!slides.length) return;
  state.heroIndex = (index + slides.length) % slides.length;
  slides.forEach((slide, slideIndex) => slide.classList.toggle('active', slideIndex === state.heroIndex));
  dots.forEach((dot, dotIndex) => dot.classList.toggle('active', dotIndex === state.heroIndex));
}

function initHero() {
  window.setInterval(() => {
    setHero(state.heroIndex + 1);
  }, 4800);
}

async function searchStations(query) {
  const text = String(query || '').trim();
  if (text.length < 2) return [];
  const response = await fetch(`${apiBase()}/stations/search?q=${encodeURIComponent(text)}&limit=8`);
  if (!response.ok) return [];
  const data = await response.json();
  const items = Array.isArray(data.items) ? data.items : [];
  rememberStations(items);
  return items;
}

function renderSuggestions(fieldState) {
  if (!fieldState.items.length) {
    fieldState.box.classList.remove('show');
    fieldState.box.innerHTML = '';
    return;
  }

  fieldState.box.innerHTML = fieldState.items.map((item, index) => `
    <button class="suggestion-item" type="button" data-index="${index}">
      <span class="suggestion-name">${titleCase(item.name)}</span>
      <span class="suggestion-meta">${item.id}</span>
    </button>
  `).join('');
  fieldState.box.classList.add('show');
}

function applyStationSelection(fieldState, item) {
  if (!item) return;
  const prettyName = titleCase(item.name);
  fieldState.input.value = prettyName;
  fieldState.input.setAttribute('value', prettyName);
  fieldState.hidden.value = item.id;
  fieldState.hidden.setAttribute('value', item.id);
  fieldState.selected = {
    id: item.id,
    name: prettyName,
  };
  fieldState.lastQuery = prettyName;
  fieldState.box.classList.remove('show');
}

function bestStationMatch(query, items) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return null;

  const ranked = items.map((item) => ({
    item,
    name: normalizeText(item.name),
    id: normalizeText(item.id),
  }));

  const exact = ranked.find((entry) => entry.name === normalizedQuery || entry.id === normalizedQuery);
  if (exact) return exact.item;

  const startsWith = ranked.filter((entry) => entry.name.startsWith(normalizedQuery) || entry.id.startsWith(normalizedQuery));
  if (startsWith.length === 1) return startsWith[0].item;

  const includes = ranked.filter((entry) => entry.name.includes(normalizedQuery) || entry.id.includes(normalizedQuery));
  if (includes.length === 1) return includes[0].item;

  return null;
}

function stationFromLookup(query) {
  return state.stationLookup.get(normalizeText(query)) || null;
}

async function fetchSuggestionsForField(fieldKey, query) {
  const fieldState = state.stationFields[fieldKey];
  if (!fieldState) return;

  const token = Date.now();
  fieldState.requestToken = token;

  try {
    const items = await searchStations(query);
    if (fieldState.requestToken !== token) return;
    fieldState.items = items;
    fieldState.lastQuery = query;
    renderSuggestions(fieldState);
  } catch {
    if (fieldState.requestToken !== token) return;
    fieldState.items = [];
    renderSuggestions(fieldState);
  }
}

function bindStationField(fieldKey, inputId, hiddenId, boxId) {
  const fieldState = {
    input: $(inputId),
    hidden: $(hiddenId),
    box: $(boxId),
    items: [],
    timer: null,
    lastQuery: '',
    requestToken: 0,
    selected: null,
  };

  state.stationFields[fieldKey] = fieldState;

  fieldState.input.addEventListener('input', () => {
    fieldState.hidden.value = '';
    fieldState.hidden.setAttribute('value', '');
    fieldState.input.removeAttribute('value');
    fieldState.selected = null;
    clearTimeout(fieldState.timer);
    const query = fieldState.input.value.trim();

    if (!query || query.length < 2) {
      fieldState.items = [];
      renderSuggestions(fieldState);
      return;
    }

    fieldState.timer = window.setTimeout(() => {
      fetchSuggestionsForField(fieldKey, query);
    }, 220);
  });

  fieldState.input.addEventListener('focus', () => {
    const query = fieldState.input.value.trim();
    if (fieldState.items.length && query.length >= 2) {
      fieldState.box.classList.add('show');
      return;
    }
    if (query.length >= 2) fetchSuggestionsForField(fieldKey, query);
  });

  const handleSuggestionChoice = (event) => {
    const button = event.target.closest('button[data-index]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    const item = fieldState.items[Number(button.dataset.index)];
    applyStationSelection(fieldState, item);
  };

  fieldState.box.addEventListener('mousedown', handleSuggestionChoice);
  fieldState.box.addEventListener('click', handleSuggestionChoice);
}

async function resolveStationSelection(fieldKey) {
  const fieldState = state.stationFields[fieldKey];
  if (!fieldState) return { error: 'Champ gare introuvable.' };

  const visibleName = fieldState.input.value.trim();
  if (!visibleName) return { error: 'Choisissez une gare depuis les suggestions.' };

  if (fieldState.hidden.value) {
    return {
      id: fieldState.hidden.value,
      name: titleCase(visibleName),
    };
  }

  const cachedItems = normalizeText(fieldState.lastQuery) === normalizeText(visibleName) ? fieldState.items : [];
  const items = cachedItems.length ? cachedItems : await searchStations(visibleName);
  const match = bestStationMatch(visibleName, items) || stationFromLookup(visibleName);

  if (!match) return { error: 'Choisissez une gare depuis les suggestions.' };

  applyStationSelection(fieldState, match);
  return {
    id: match.id,
    name: titleCase(match.name),
  };
}

function makeDatetime() {
  const date = $('dateInput').value;
  const time = $('timeInput').value || '00:00';
  return `${date}T${time}:00`;
}

async function fetchJourneyBatch(originId, destinationId, datetime, passengers, offset) {
  const url = `${apiBase()}/journeys/search?originStationId=${encodeURIComponent(originId)}&destinationStationId=${encodeURIComponent(destinationId)}&datetime=${encodeURIComponent(datetime)}&passengers=${passengers}&offset=${offset}&limit=5`;
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Recherche impossible.');
  return data;
}

function formatFare(journey) {
  const amount = Number(journey?.fare?.amount);
  if (!Number.isFinite(amount) || amount <= 0) return 'Tarif indisponible';
  return `${amount.toFixed(3)} ${journey?.fare?.currency || 'TND'}`;
}

function journeyTypeLabel(journey) {
  if (journey?.type === 'transfer' || (journey?.segments?.length || 0) > 1) {
    const transfers = Math.max(1, (journey.segments?.length || 2) - 1);
    return `${transfers} correspondance${transfers > 1 ? 's' : ''}`;
  }
  return 'Direct';
}

function trainSummary(journey) {
  return (journey.segments || []).map((segment) => segment.trainNumber).filter(Boolean).join(' + ');
}

function stationLabel(value) {
  return titleCase(value || '');
}

function segmentOriginName(segment) {
  return stationLabel(segment?.stops?.[0]?.stationName || segment?.originStationId || '');
}

function segmentDestinationName(segment) {
  const lastStop = Array.isArray(segment?.stops) ? segment.stops[segment.stops.length - 1] : null;
  return stationLabel(lastStop?.stationName || segment?.destinationStationId || '');
}

function transferWaitMinutes(journey, segmentIndex) {
  if (Number.isFinite(journey?.transferWaitMinutes)) return journey.transferWaitMinutes;
  const current = journey?.segments?.[segmentIndex];
  const next = journey?.segments?.[segmentIndex + 1];
  if (!current || !next) return null;
  const arrival = current.arrivalMinutes ?? current.stops?.[current.stops.length - 1]?.arrivalMinutes;
  const departure = next.departureMinutes ?? next.stops?.[0]?.departureMinutes;
  if (!Number.isFinite(arrival) || !Number.isFinite(departure)) return null;
  return Math.max(0, departure - arrival);
}

function journeyKey(journey) {
  const segments = Array.isArray(journey.segments) ? journey.segments : [];
  const segmentKey = segments.map((segment) => `${segment.lineCode}-${segment.trainNumber}-${segment.originStationId}-${segment.destinationStationId}`).join('|');
  return `${segmentKey}:${journey.departureTime}:${journey.arrivalTime}`;
}

function journeySnapshot(journey, searchContext) {
  const first = journey.segments?.[0];
  const last = journey.segments?.[journey.segments.length - 1];

  return {
    key: journeyKey(journey),
    originId: first?.originStationId || searchContext.origin.id,
    destinationId: last?.destinationStationId || searchContext.destination.id,
    originName: titleCase(first?.originStationId || searchContext.origin.name),
    destinationName: titleCase(last?.destinationStationId || searchContext.destination.name),
    departureTime: journey.departureTime,
    arrivalTime: journey.arrivalTime,
    durationMinutes: journey.durationMinutes,
    fareLabel: formatFare(journey),
    trainLabel: trainSummary(journey),
    typeLabel: journeyTypeLabel(journey),
    lineCodes: (journey.segments || []).map((segment) => segment.lineCode).filter(Boolean),
    passengers: searchContext.passengers,
    datetime: searchContext.originalDatetime,
  };
}

function historySnapshot(searchContext, data) {
  return {
    id: `${searchContext.origin.id}-${searchContext.destination.id}-${searchContext.originalDatetime}`,
    originId: searchContext.origin.id,
    destinationId: searchContext.destination.id,
    originName: searchContext.origin.name,
    destinationName: searchContext.destination.name,
    passengers: searchContext.passengers,
    originalDatetime: searchContext.originalDatetime,
    effectiveDatetime: searchContext.effectiveDatetime,
    resultCount: data.count || 0,
    createdAt: new Date().toISOString(),
  };
}

function saveHistoryEntry(searchContext, data) {
  if (!sessionEmail() || !data.count) return;
  const entry = historySnapshot(searchContext, data);
  const existing = state.trips.filter((item) => item.id !== entry.id);
  saveAccountTrips([entry, ...existing].slice(0, 12));
  renderTripsView();
}

function setSearchError(message) {
  $('searchError').textContent = message || '';
}

function setResultsNotice(message) {
  $('resultsNotice').textContent = message || '';
  $('resultsNotice').classList.toggle('hidden', !message);
}

function renderResultsMeta(searchContext) {
  $('resultsMeta').textContent = `${searchContext.origin.name} vers ${searchContext.destination.name} · ${formatDateLabel(searchContext.originalDatetime)} · ${searchContext.passengers} passager${searchContext.passengers > 1 ? 's' : ''}`;
}

function renderResults(data, searchContext) {
  const activeFavorites = favoriteKeys();
  state.lastResultsMeta = data;
  $('resultsCount').textContent = `${data.count || 0} resultat${Number(data.count) > 1 ? 's' : ''}`;
  renderResultsMeta(searchContext);
  $('resultsToolbar').classList.toggle('hidden', !data.total);
  $('earlierBtn').disabled = !data.hasPrevious;
  $('laterBtn').disabled = !data.hasNext;

  if (!state.currentJourneys.length) {
    $('resultsList').innerHTML = `
      <div class="empty-state">
        <h3>Aucun train trouve</h3>
        <p>Essayez un autre horaire ou verifiez les gares selectionnees.</p>
      </div>
    `;
    return;
  }

  $('resultsList').innerHTML = state.currentJourneys.map((journey, index) => {
    const first = journey.segments?.[0];
    const last = journey.segments?.[journey.segments.length - 1];
    const key = journeyKey(journey);
    const isFavorite = activeFavorites.has(key);

    return `
      <article class="journey-card">
        <div class="journey-top">
          <span class="badge">${journeyTypeLabel(journey)}</span>
          <span class="train-badge">Train ${trainSummary(journey)}</span>
        </div>

        <div class="times-row">
          <div>
            <div class="time">${journey.departureTime}</div>
            <div class="station">${segmentOriginName(first)}</div>
          </div>

          <div class="duration-pill">
            <strong>${journey.durationMinutes} min</strong>
            <span>${journey.segments?.length > 1 ? 'avec correspondance' : 'trajet direct'}</span>
          </div>

          <div>
            <div class="time">${journey.arrivalTime}</div>
            <div class="station right">${segmentDestinationName(last)}</div>
          </div>
        </div>

        <div class="journey-summary">
          <span class="price-badge">${formatFare(journey)}</span>
          <div class="journey-meta">
            ${(journey.segments || []).map((segment) => `<span class="mini-badge">Ligne ${segment.lineCode}</span>`).join('')}
          </div>
        </div>

        <div class="card-actions">
          <button class="view-btn" type="button" data-index="${index}">Voir le train</button>
          <button class="favorite-btn ${isFavorite ? 'active' : ''}" type="button" data-key="${key}">
            ${isFavorite ? 'Favori enregistre' : 'Ajouter au favori'}
          </button>
        </div>
      </article>
    `;
  }).join('');
}

function openSearchView() {
  setView('search');
  $('detailsSection').classList.add('hidden');
  if (state.hasSearched) $('resultsSection').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function promptLogin(message) {
  setView('profile');
  setAccountMode('login');
  setAccountMessage(message || 'Connectez-vous pour continuer.', 'error');
}

async function searchJourneys(offset = 0) {
  setSearchError('');
  setResultsNotice('');

  const origin = await resolveStationSelection('origin');
  if (origin.error) {
    setSearchError(origin.error);
    return;
  }

  const destination = await resolveStationSelection('destination');
  if (destination.error) {
    setSearchError(destination.error);
    return;
  }

  if (origin.id === destination.id) {
    setSearchError('Choisissez deux gares differentes.');
    return;
  }

  const passengers = Math.max(1, Math.min(9, Number($('passengersInput').value || 1)));
  const originalDatetime = makeDatetime();

  $('searchBtn').disabled = true;
  $('searchBtn').textContent = 'Recherche en cours...';

  try {
    let effectiveDatetime = originalDatetime;
    let data = await fetchJourneyBatch(origin.id, destination.id, effectiveDatetime, passengers, Math.max(0, offset));

    if (!data.count && !data.total && Number(offset) === 0) {
      const fallbackDatetime = nextDaySearchIso(originalDatetime);
      if (fallbackDatetime) {
        const fallbackData = await fetchJourneyBatch(origin.id, destination.id, fallbackDatetime, passengers, 0);
        if (fallbackData.count || fallbackData.total) {
          data = fallbackData;
          effectiveDatetime = fallbackDatetime;
          setResultsNotice("Aucun train plus tard aujourd'hui. Prochains departs disponibles.");
        }
      }
    }

    state.currentOffset = Math.max(0, offset);
    state.lastSearch = {
      origin,
      destination,
      passengers,
      originalDatetime,
      effectiveDatetime,
    };
    state.currentJourneys = Array.isArray(data.items) ? data.items : [];
    state.hasSearched = true;

    renderResults(data, state.lastSearch);
    saveHistoryEntry(state.lastSearch, data);

    $('resultsSection').classList.remove('hidden');
    $('detailsSection').classList.add('hidden');
    setView('search');
    $('resultsSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    setSearchError(error instanceof Error ? error.message : 'Recherche impossible.');
  } finally {
    $('searchBtn').disabled = false;
    $('searchBtn').textContent = 'Rechercher un train';
  }
}

function renderJourneyDetails(index) {
  const journey = state.currentJourneys[index];
  if (!journey) return;
  const first = journey.segments?.[0];
  const last = journey.segments?.[journey.segments.length - 1];

  const segmentsHtml = (journey.segments || []).map((segment, segmentIndex) => {
    const stopsHtml = (segment.stops || []).map((stop) => `
      <div class="segment-stop">
        <div class="stop-time">${stop.departureTime || stop.arrivalTime || '—'}</div>
        <div class="stop-rail"></div>
        <div class="stop-body">
          <strong>${titleCase(stop.stationName || stop.stationId || '')}</strong>
          <span>${segment.lineCode} · Train ${segment.trainNumber}</span>
        </div>
      </div>
    `).join('');

    const waitMinutes = transferWaitMinutes(journey, segmentIndex);
    const transferHtml = segmentIndex < (journey.segments.length - 1)
      ? `
        <div class="transfer-card">
          <strong>Correspondance a ${titleCase(journey.transferStationId || segment.destinationStationId || '')}</strong>
          <span>Attente: ${waitMinutes ?? 0} min</span>
        </div>
      `
      : '';

    return `
      <div>
        <article class="segment-block">
          <div class="segment-head">
            <span class="train-badge">Train ${segment.trainNumber}</span>
            <span class="mini-badge">Ligne ${segment.lineCode}</span>
          </div>
          <p class="segment-route">${titleCase(segment.originStationId)} → ${titleCase(segment.destinationStationId)} · ${segment.departureTime} → ${segment.arrivalTime}</p>
          <div class="segment-stops">${stopsHtml}</div>
        </article>
        ${transferHtml}
      </div>
    `;
  }).join('');

  $('detailsContent').innerHTML = `
    <div class="details-summary">
      <div class="journey-top">
        <span class="badge">${journeyTypeLabel(journey)}</span>
        <span class="train-badge">Train ${trainSummary(journey)}</span>
      </div>
      <h2>${journey.departureTime} → ${journey.arrivalTime}</h2>
      <p>${segmentOriginName(first)} → ${segmentDestinationName(last)} · ${journey.durationMinutes} min · ${formatFare(journey)}</p>
    </div>
    <div class="segment-list">${segmentsHtml}</div>
  `;

  $('resultsSection').classList.add('hidden');
  $('detailsSection').classList.remove('hidden');
  $('detailsSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function distanceKm(a, b) {
  const earthRadius = 6371;
  const latDelta = (b.lat - a.lat) * Math.PI / 180;
  const lngDelta = (b.lng - a.lng) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const haversine = Math.sin(latDelta / 2) ** 2 + Math.sin(lngDelta / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * earthRadius * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

async function resolveNearestStation(name) {
  const items = await searchStations(name);
  return bestStationMatch(name, items) || { id: normalizeText(name), name };
}

function useLocation() {
  if (!navigator.geolocation) {
    $('locationResult').textContent = 'La geolocalisation n est pas disponible sur ce navigateur.';
    return;
  }

  $('locationBtn').disabled = true;
  $('locationResult').textContent = 'Recherche de la gare la plus proche...';

  navigator.geolocation.getCurrentPosition(async (position) => {
    try {
      const point = { lat: position.coords.latitude, lng: position.coords.longitude };
      const nearest = stationCoords
        .map((station) => ({ ...station, km: distanceKm(point, station) }))
        .sort((left, right) => left.km - right.km)[0];

      const selected = await resolveNearestStation(nearest.name);
      applyStationSelection(state.stationFields.origin, selected);
      const walkingMinutes = Math.max(2, Math.round((nearest.km / 4.5) * 60));
      $('locationResult').textContent = `Gare la plus proche: ${titleCase(selected.name)} · environ ${walkingMinutes} min a pied.`;
    } catch {
      $('locationResult').textContent = 'Impossible d estimer la gare la plus proche pour le moment.';
    } finally {
      $('locationBtn').disabled = false;
    }
  }, () => {
    $('locationResult').textContent = 'Autorisation refusee ou position indisponible.';
    $('locationBtn').disabled = false;
  }, {
    enableHighAccuracy: true,
    timeout: 9000,
  });
}

function setAccountMode(mode) {
  state.accountMode = ['register', 'reset'].includes(mode) ? mode : 'login';
  const registerMode = state.accountMode === 'register';
  const resetMode = state.accountMode === 'reset';
  $('registerFields').classList.toggle('hidden', !registerMode);
  $('confirmPasswordField').classList.toggle('hidden', !resetMode);
  $('authTitle').textContent = registerMode ? 'Creer un compte' : 'Connexion';
  if (resetMode) $('authTitle').textContent = 'Reinitialiser le mot de passe';
  $('authSubtitle').textContent = registerMode
    ? 'Creez un compte voyageur avec votre nom, votre date de naissance, votre email et votre mot de passe.'
    : resetMode
      ? 'Saisissez votre email et choisissez un nouveau mot de passe fort. Cette reinitialisation est locale pour la demo.'
      : 'Connectez-vous pour retrouver vos favoris et vos trajets sur cet appareil.';
  $('accountSubmit').textContent = registerMode ? 'Creer mon compte' : resetMode ? 'Reinitialiser le mot de passe' : 'Se connecter';
  $('toggleRegister').textContent = registerMode ? 'J ai deja un compte' : resetMode ? 'Retour a la connexion' : 'Creer un compte';
  $('forgotPasswordBtn').classList.toggle('hidden', registerMode || resetMode);
  $('password').placeholder = resetMode ? 'Nouveau mot de passe' : 'Mot de passe';
  $('accountMessage').textContent = '';
}

function setAccountMessage(message, tone = 'default') {
  $('accountMessage').textContent = message || '';
  $('accountMessage').style.color = tone === 'error' ? '#EF4444' : tone === 'success' ? '#16A34A' : '#6B7280';
}

function updateProfileNav() {
  $('profileNavBtn').textContent = state.session?.firstName ? 'Profil' : 'Connexion';
}

function renderProfileView() {
  const loggedIn = Boolean(state.session);
  $('profileGuest').classList.toggle('hidden', loggedIn);
  $('profileAccount').classList.toggle('hidden', !loggedIn);

  if (!loggedIn) {
    updateProfileNav();
    return;
  }

  $('profileGreeting').textContent = `Salut ${state.session.firstName}`;
  $('profileLastName').textContent = state.session.lastName || '-';
  $('profileFirstName').textContent = state.session.firstName || '-';
  $('profileBirthDate').textContent = state.session.birthDate || '-';
  $('profileEmail').textContent = state.session.email;
  document.querySelector('.profile-avatar').textContent = state.session.firstName.charAt(0).toUpperCase();
  updateProfileNav();
}

function renderLoginRequired(containerId, title, description) {
  $(containerId).innerHTML = `
    <div class="login-required">
      <h3>${title}</h3>
      <p>${description}</p>
      <button class="empty-btn" type="button" data-action="login-prompt">Se connecter</button>
    </div>
  `;
}

function renderFavoritesView() {
  if (!sessionEmail()) {
    renderLoginRequired('favoritesContent', 'Connexion requise', 'Connectez-vous pour enregistrer et retrouver vos voyages favoris.');
    return;
  }

  if (!state.favorites.length) {
    $('favoritesContent').innerHTML = `
      <div class="empty-state">
        <h3>Aucun favori</h3>
        <p>Ajoutez un trajet depuis les resultats pour le retrouver ici rapidement.</p>
      </div>
    `;
    return;
  }

  $('favoritesContent').innerHTML = `
    <div class="saved-list">
      ${state.favorites.map((item) => `
        <article class="saved-card">
          <div class="saved-card-head">
            <span class="saved-badge">${item.typeLabel}</span>
            <span class="train-badge">Train ${item.trainLabel}</span>
          </div>
          <h3 class="saved-title">${item.originName} → ${item.destinationName}</h3>
          <p class="saved-subtitle">${item.departureTime} → ${item.arrivalTime} · ${item.durationMinutes} min · ${item.fareLabel}</p>
          <div class="saved-card-meta">
            ${item.lineCodes.map((lineCode) => `<span class="mini-badge">Ligne ${lineCode}</span>`).join('')}
          </div>
          <div class="saved-actions">
            <button class="view-btn" type="button" data-action="relaunch-favorite" data-key="${item.key}">Relancer</button>
            <button class="favorite-btn active" type="button" data-action="remove-favorite" data-key="${item.key}">Retirer</button>
          </div>
        </article>
      `).join('')}
    </div>
  `;
}

function renderTripsView() {
  if (!sessionEmail()) {
    renderLoginRequired('tripsContent', 'Connexion requise', 'Connectez-vous pour conserver votre historique de recherches et vos trajets recents.');
    return;
  }

  if (!state.trips.length) {
    $('tripsContent').innerHTML = `
      <div class="empty-state">
        <h3>Aucun trajet recent</h3>
        <p>Vos prochaines recherches apparaîtront ici apres connexion.</p>
      </div>
    `;
    return;
  }

  $('tripsContent').innerHTML = `
    <div class="saved-list">
      ${state.trips.map((item) => `
        <article class="saved-card">
          <div class="saved-card-head">
            <span class="saved-badge">${item.resultCount} depart${item.resultCount > 1 ? 's' : ''}</span>
            <span class="mini-badge">${item.passengers} passager${item.passengers > 1 ? 's' : ''}</span>
          </div>
          <h3 class="saved-title">${item.originName} → ${item.destinationName}</h3>
          <p class="saved-subtitle">${formatDateLabel(item.originalDatetime)}</p>
          <div class="saved-actions">
            <button class="view-btn" type="button" data-action="relaunch-trip" data-id="${item.id}">Relancer</button>
            <button class="secondary-btn" type="button" data-action="remove-trip" data-id="${item.id}">Supprimer</button>
          </div>
        </article>
      `).join('')}
    </div>
  `;
}

function persistSession(account) {
  state.session = {
    firstName: account.firstName,
    lastName: account.lastName,
    birthDate: account.birthDate,
    email: account.email,
  };
  writeJson(SESSION_KEY, state.session);
  loadAccountCollections();
  renderAllAccountViews();
}

function restoreSession() {
  state.session = readJson(SESSION_KEY, null);
  loadAccountCollections();
}

function clearAuthInputs() {
  ['firstName', 'lastName', 'birthDate', 'email', 'password', 'confirmPassword'].forEach((id) => {
    const input = $(id);
    if (input) input.value = '';
  });
}

function submitAccount() {
  const email = $('email').value.trim().toLowerCase();
  const password = $('password').value.trim();

  if (!email || !password) {
    setAccountMessage('Entrez votre email et votre mot de passe.', 'error');
    return;
  }

  if (state.accountMode === 'register') {
    const firstName = $('firstName').value.trim();
    const lastName = $('lastName').value.trim();
    const birthDate = $('birthDate').value;

    if (!firstName || !lastName || !birthDate) {
      setAccountMessage('Remplissez tous les champs pour creer le compte.', 'error');
      return;
    }

    const passwordError = validateStrongPassword(password);
    if (passwordError) {
      setAccountMessage(passwordError, 'error');
      return;
    }

    const list = accounts();
    if (list.some((account) => String(account?.email || '').toLowerCase() === email)) {
      setAccountMessage('Un compte avec cet email existe deja.', 'error');
      return;
    }

    list.push({
      firstName,
      lastName,
      birthDate,
      email,
      password,
      createdAt: new Date().toISOString(),
    });

    saveAccounts(list.map(normalizePassengerAccount));
    setAccountMode('login');
    $('email').value = email;
    $('password').value = '';
    setAccountMessage('Compte cree. Vous pouvez maintenant vous connecter.', 'success');
    return;
  }

  if (state.accountMode === 'reset') {
    const confirmPassword = $('confirmPassword').value.trim();
    const passwordError = validateStrongPassword(password);
    if (passwordError) {
      setAccountMessage(passwordError, 'error');
      return;
    }
    if (password !== confirmPassword) {
      setAccountMessage('Les mots de passe ne correspondent pas.', 'error');
      return;
    }
    const list = accounts().map(normalizePassengerAccount);
    const accountIndex = list.findIndex((item) => item.email === email);
    if (accountIndex < 0) {
      setAccountMessage('Aucun compte local ne correspond a cet email.', 'error');
      return;
    }
    list[accountIndex].password = password;
    saveAccounts(list);
    setAccountMode('login');
    $('email').value = email;
    $('password').value = '';
    $('confirmPassword').value = '';
    setAccountMessage('Mot de passe mis a jour. Vous pouvez vous connecter.', 'success');
    return;
  }

  const account = accounts()
    .map(normalizePassengerAccount)
    .find((item) => item.email === email && item.password === password);
  if (!account) {
    setAccountMessage('Compte introuvable. Utilisez user@domain.tn / user123 ou creez un compte.', 'error');
    return;
  }

  persistSession(account);
  clearAuthInputs();
  setView('profile');
}

function logout() {
  state.session = null;
  state.favorites = [];
  state.trips = [];
  localStorage.removeItem(SESSION_KEY);
  clearAuthInputs();
  setAccountMode('login');
  renderAllAccountViews();
  setView('profile');
}

function renderAllAccountViews() {
  renderProfileView();
  renderFavoritesView();
  renderTripsView();
}

function setView(viewName) {
  state.currentView = viewName;

  ['search', 'favorites', 'trips', 'profile'].forEach((view) => {
    $(`${view}View`).classList.toggle('hidden', view !== viewName);
  });

  document.querySelectorAll('.nav-btn').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === viewName);
  });

  if (viewName === 'favorites') renderFavoritesView();
  if (viewName === 'trips') renderTripsView();
  if (viewName === 'profile') renderProfileView();
}

function fillSearchForm(originId, originName, destinationId, destinationName, datetime, passengers) {
  const originField = state.stationFields.origin;
  const destinationField = state.stationFields.destination;

  applyStationSelection(originField, { id: originId, name: originName });
  applyStationSelection(destinationField, { id: destinationId, name: destinationName });

  const parsed = new Date(datetime);
  if (!Number.isNaN(parsed.getTime())) {
    $('dateInput').value = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
    $('timeInput').value = `${String(parsed.getHours()).padStart(2, '0')}:${String(parsed.getMinutes()).padStart(2, '0')}`;
  }

  $('passengersInput').value = String(passengers || 1);
}

function toggleFavoriteByKey(key) {
  const nextFavorites = state.favorites.filter((item) => item.key !== key);
  saveAccountFavorites(nextFavorites);
  renderFavoritesView();
}

function toggleFavorite(journey, button) {
  if (!sessionEmail()) {
    promptLogin('Connectez-vous pour enregistrer un favori.');
    return;
  }

  const key = journeyKey(journey);
  const existing = state.favorites.find((item) => item.key === key);

  if (existing) {
    saveAccountFavorites(state.favorites.filter((item) => item.key !== key));
  } else {
    const snapshot = journeySnapshot(journey, state.lastSearch);
    saveAccountFavorites([snapshot, ...state.favorites].slice(0, 20));
  }

  renderResults(state.lastResultsMeta || {
    count: state.currentJourneys.length,
    total: state.currentJourneys.length,
    hasPrevious: state.currentOffset > 0,
    hasNext: false,
  }, state.lastSearch);
  renderFavoritesView();

  if (button) {
    const active = favoriteKeys().has(key);
    button.classList.toggle('active', active);
    button.textContent = active ? 'Favori enregistre' : 'Ajouter au favori';
  }
}

function bind() {
  bindStationField('origin', 'originInput', 'originId', 'originSuggestions');
  bindStationField('destination', 'destinationInput', 'destinationId', 'destinationSuggestions');

  $('brandButton').addEventListener('click', openSearchView);

  document.querySelectorAll('.nav-btn').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.view === 'search') openSearchView();
      else setView(button.dataset.view);
    });
  });

  $('swapBtn').addEventListener('click', () => {
    const originField = state.stationFields.origin;
    const destinationField = state.stationFields.destination;

    const originSnapshot = {
      value: originField.input.value,
      id: originField.hidden.value,
      selected: originField.selected,
    };

    originField.input.value = destinationField.input.value;
    originField.hidden.value = destinationField.hidden.value;
    originField.selected = destinationField.selected;

    destinationField.input.value = originSnapshot.value;
    destinationField.hidden.value = originSnapshot.id;
    destinationField.selected = originSnapshot.selected;
  });

  $('searchBtn').addEventListener('click', () => searchJourneys(0));
  $('earlierBtn').addEventListener('click', () => searchJourneys(Math.max(0, state.currentOffset - 5)));
  $('laterBtn').addEventListener('click', () => searchJourneys(state.currentOffset + 5));
  $('locationBtn').addEventListener('click', useLocation);
  $('nowBtn').addEventListener('click', () => {
    setNow();
    if (state.lastSearch) searchJourneys(0);
  });

  $('resultsList').addEventListener('click', (event) => {
    const viewButton = event.target.closest('.view-btn');
    const favoriteButton = event.target.closest('.favorite-btn');

    if (viewButton) {
      renderJourneyDetails(Number(viewButton.dataset.index));
    }

    if (favoriteButton) {
      const index = state.currentJourneys.findIndex((journey) => journeyKey(journey) === favoriteButton.dataset.key);
      if (index >= 0) toggleFavorite(state.currentJourneys[index], favoriteButton);
    }
  });

  $('favoritesContent').addEventListener('click', (event) => {
    const loginButton = event.target.closest('[data-action="login-prompt"]');
    const relaunchButton = event.target.closest('[data-action="relaunch-favorite"]');
    const removeButton = event.target.closest('[data-action="remove-favorite"]');

    if (loginButton) {
      promptLogin('Connectez-vous pour acceder a vos favoris.');
    }

    if (relaunchButton) {
      const favorite = state.favorites.find((item) => item.key === relaunchButton.dataset.key);
      if (!favorite) return;
      fillSearchForm(favorite.originId, favorite.originName, favorite.destinationId, favorite.destinationName, favorite.datetime, favorite.passengers);
      openSearchView();
      searchJourneys(0);
    }

    if (removeButton) {
      toggleFavoriteByKey(removeButton.dataset.key);
    }
  });

  $('tripsContent').addEventListener('click', (event) => {
    const loginButton = event.target.closest('[data-action="login-prompt"]');
    const relaunchButton = event.target.closest('[data-action="relaunch-trip"]');
    const removeButton = event.target.closest('[data-action="remove-trip"]');

    if (loginButton) {
      promptLogin('Connectez-vous pour acceder a vos trajets.');
    }

    if (relaunchButton) {
      const trip = state.trips.find((item) => item.id === relaunchButton.dataset.id);
      if (!trip) return;
      fillSearchForm(trip.originId, trip.originName, trip.destinationId, trip.destinationName, trip.originalDatetime, trip.passengers);
      openSearchView();
      searchJourneys(0);
    }

    if (removeButton) {
      const nextTrips = state.trips.filter((item) => item.id !== removeButton.dataset.id);
      saveAccountTrips(nextTrips);
      renderTripsView();
    }
  });

  $('closeDetails').addEventListener('click', () => {
    $('detailsSection').classList.add('hidden');
    if (state.hasSearched) $('resultsSection').classList.remove('hidden');
  });

  $('toggleRegister').addEventListener('click', () => {
    setAccountMode(state.accountMode === 'login' ? 'register' : 'login');
  });
  $('forgotPasswordBtn').addEventListener('click', () => {
    clearAuthInputs();
    setAccountMode('reset');
  });
  $('accountSubmit').addEventListener('click', submitAccount);
  $('logoutBtn').addEventListener('click', logout);

  document.addEventListener('click', (event) => {
    Object.values(state.stationFields).forEach((fieldState) => {
      if (!fieldState.box.contains(event.target) && event.target !== fieldState.input) {
        fieldState.box.classList.remove('show');
      }
    });
  });
}

window.addEventListener('DOMContentLoaded', () => {
  seedAccounts();
  restoreSession();
  setNow();
  initHero();
  bind();
  setAccountMode('login');
  renderAllAccountViews();
  updateProfileNav();
});
