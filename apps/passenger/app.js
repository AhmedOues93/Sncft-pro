const ACCOUNT_KEY = 'sncft_passenger_accounts';
const SESSION_KEY = 'sncft_passenger_session';
const FAVORITES_KEY = 'sncft_passenger_favorites';
const API_BASE_KEY = 'sncft_api_base';
const DEFAULT_API_BASE = 'http://127.0.0.1:3000';
const MATRICULE_REGEX = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z0-9]+$/;

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
  heroIndex: 0,
  currentOffset: 0,
  lastSearch: null,
  currentJourneys: [],
  favorites: new Set(),
  stationFields: {},
  accountMode: 'login',
  session: null,
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

function formatDateLabel(dateValue, timeValue) {
  const iso = `${dateValue}T${timeValue || '00:00'}:00`;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return `${dateValue} ${timeValue}`.trim();
  return parsed.toLocaleString('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function setNow() {
  const now = new Date();
  $('dateInput').value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  $('timeInput').value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function setHero(index) {
  const slides = Array.from(document.querySelectorAll('.hero-slide'));
  const dots = Array.from(document.querySelectorAll('.hero-dots span'));
  if (!slides.length) return;
  state.heroIndex = (index + slides.length) % slides.length;
  slides.forEach((slide, slideIndex) => slide.classList.toggle('active', slideIndex === state.heroIndex));
  dots.forEach((dot, dotIndex) => dot.classList.toggle('active', dotIndex === state.heroIndex));
}

function initHero() {
  $('prevHero').addEventListener('click', () => setHero(state.heroIndex - 1));
  $('nextHero').addEventListener('click', () => setHero(state.heroIndex + 1));
  window.setInterval(() => setHero(state.heroIndex + 1), 5500);
}

async function searchStations(query) {
  const text = String(query || '').trim();
  if (!text) return [];

  const response = await fetch(`${apiBase()}/stations/search?q=${encodeURIComponent(text)}&limit=8`);
  if (!response.ok) return [];

  const data = await response.json();
  return Array.isArray(data.items) ? data.items : [];
}

function renderSuggestions(fieldState) {
  const { box, items } = fieldState;

  if (!items.length) {
    box.classList.remove('show');
    box.innerHTML = '';
    return;
  }

  box.innerHTML = items.map((item, index) => `
    <button class="suggestion-item" type="button" data-index="${index}">
      <span class="suggestion-name">${titleCase(item.name)}</span>
      <span class="suggestion-meta">${item.id}</span>
    </button>
  `).join('');
  box.classList.add('show');
}

function applyStationSelection(fieldState, item) {
  if (!item) return;
  fieldState.input.value = titleCase(item.name);
  fieldState.hidden.value = item.id;
  fieldState.selected = item;
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
    fieldState.selected = null;
    clearTimeout(fieldState.timer);

    const query = fieldState.input.value.trim();
    if (!query) {
      fieldState.items = [];
      renderSuggestions(fieldState);
      return;
    }

    fieldState.timer = window.setTimeout(() => {
      fetchSuggestionsForField(fieldKey, query);
    }, 220);
  });

  fieldState.input.addEventListener('focus', () => {
    if (fieldState.items.length) fieldState.box.classList.add('show');
  });

  fieldState.box.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-index]');
    if (!button) return;
    const item = fieldState.items[Number(button.dataset.index)];
    applyStationSelection(fieldState, item);
  });
}

async function resolveStationSelection(fieldKey) {
  const fieldState = state.stationFields[fieldKey];
  if (!fieldState) {
    return { error: 'Champ gare introuvable.' };
  }

  const visibleName = fieldState.input.value.trim();
  if (!visibleName) {
    return { error: 'Choisissez une gare depuis les suggestions.' };
  }

  if (fieldState.hidden.value) {
    return {
      id: fieldState.hidden.value,
      name: visibleName,
    };
  }

  const cachedItems = normalizeText(fieldState.lastQuery) === normalizeText(visibleName) ? fieldState.items : [];
  const items = cachedItems.length ? cachedItems : await searchStations(visibleName);
  const match = bestStationMatch(visibleName, items);

  if (!match) {
    return { error: 'Choisissez une gare depuis les suggestions.' };
  }

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

function favoritesList() {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
  } catch {
    return [];
  }
}

function syncFavorites() {
  state.favorites = new Set(favoritesList());
  updateFavoritesCount();
}

function saveFavorites() {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(state.favorites)));
  updateFavoritesCount();
}

function updateFavoritesCount() {
  const countNode = $('profileFavoritesCount');
  if (countNode) countNode.textContent = String(state.favorites.size);
}

function journeyKey(journey) {
  const segments = Array.isArray(journey.segments) ? journey.segments : [];
  const id = segments.map((segment) => `${segment.lineCode}-${segment.trainNumber}-${segment.originStationId}-${segment.destinationStationId}`).join('|');
  return `${id}:${journey.departureTime}:${journey.arrivalTime}`;
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

function renderResultsMeta() {
  if (!state.lastSearch) {
    $('resultsMeta').textContent = '';
    return;
  }

  $('resultsMeta').textContent = `${state.lastSearch.origin.name} vers ${state.lastSearch.destination.name} · ${formatDateLabel($('dateInput').value, $('timeInput').value)} · ${state.lastSearch.passengers} passager${state.lastSearch.passengers > 1 ? 's' : ''}`;
}

function renderResults(data) {
  $('resultsCount').textContent = `${data.count || 0} resultat${Number(data.count) > 1 ? 's' : ''}`;
  renderResultsMeta();

  $('earlierBtn').disabled = !data.hasPrevious;
  $('laterBtn').disabled = !data.hasNext;

  if (!state.currentJourneys.length) {
    $('resultsList').innerHTML = '<div class="empty-state">Aucun train disponible pour cette recherche. Essayez un autre horaire ou verifiez les gares selectionnees.</div>';
    return;
  }

  $('resultsList').innerHTML = state.currentJourneys.map((journey, index) => {
    const first = journey.segments?.[0];
    const last = journey.segments?.[journey.segments.length - 1];
    const key = journeyKey(journey);
    const isFavorite = state.favorites.has(key);

    return `
      <article class="journey-card">
        <div class="journey-top">
          <span class="badge">${journeyTypeLabel(journey)}</span>
          <span class="train-badge">Train ${trainSummary(journey)}</span>
        </div>

        <div class="times-row">
          <div>
            <div class="time">${journey.departureTime}</div>
            <div class="station">${titleCase(first?.originStationId || '')}</div>
          </div>

          <div class="duration-pill">
            <strong>${journey.durationMinutes} min</strong>
            <span>${journey.segments?.length > 1 ? 'avec correspondance' : 'trajet direct'}</span>
          </div>

          <div>
            <div class="time">${journey.arrivalTime}</div>
            <div class="station right">${titleCase(last?.destinationStationId || '')}</div>
          </div>
        </div>

        <div class="journey-summary">
          <span class="price-badge">${formatFare(journey)}</span>
          <div class="journey-meta">
            ${(journey.segments || []).map((segment) => `<span class="mini-badge">Ligne ${segment.lineCode || '—'}</span>`).join('')}
          </div>
        </div>

        <div class="card-actions">
          <button class="view-btn" type="button" data-index="${index}">Voir le train</button>
          <button class="favorite-btn ${isFavorite ? 'active' : ''}" type="button" data-key="${key}">
            ${isFavorite ? 'Favori ajoute' : 'Ajouter au favori'}
          </button>
        </div>
      </article>
    `;
  }).join('');
}

function renderJourneyDetails(index) {
  const journey = state.currentJourneys[index];
  if (!journey) return;

  const stops = [];
  const seen = new Set();

  (journey.segments || []).forEach((segment) => {
    (segment.stops || []).forEach((stop) => {
      const key = `${stop.stationId}-${stop.arrivalTime}-${stop.departureTime}-${segment.trainNumber}`;
      if (seen.has(key)) return;
      seen.add(key);
      stops.push({
        time: stop.departureTime || stop.arrivalTime || '—',
        station: titleCase(stop.stationName || stop.stationId || ''),
        line: segment.lineCode || '—',
        train: segment.trainNumber || '—',
      });
    });
  });

  $('detailsContent').innerHTML = `
    <div class="details-hero">
      <div class="journey-top">
        <span class="badge">${journeyTypeLabel(journey)}</span>
        <span class="train-badge">Train ${trainSummary(journey)}</span>
      </div>
      <h2>${journey.departureTime} → ${journey.arrivalTime}</h2>
      <p>${journey.durationMinutes} min · ${formatFare(journey)}</p>
    </div>

    <div class="timeline">
      ${stops.map((stop) => `
        <div class="stop">
          <div class="stop-time">${stop.time}</div>
          <div class="stop-rail"></div>
          <div class="stop-card">
            <strong>${stop.station}</strong>
            <span>Ligne ${stop.line} · Train ${stop.train}</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  $('resultsSection').classList.add('hidden');
  $('detailsSection').classList.remove('hidden');
}

function setSearchError(message) {
  $('searchError').textContent = message || '';
}

async function searchJourneys(offset = 0) {
  setSearchError('');

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
  const datetime = makeDatetime();
  const url = `${apiBase()}/journeys/search?originStationId=${encodeURIComponent(origin.id)}&destinationStationId=${encodeURIComponent(destination.id)}&datetime=${encodeURIComponent(datetime)}&passengers=${passengers}&offset=${Math.max(0, offset)}&limit=5`;

  $('searchBtn').disabled = true;
  $('searchBtn').textContent = 'Recherche en cours...';

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Recherche impossible.');
    }

    state.currentOffset = Math.max(0, offset);
    state.lastSearch = {
      origin,
      destination,
      passengers,
      datetime,
    };
    state.currentJourneys = Array.isArray(data.items) ? data.items : [];

    renderResults(data);
    $('resultsToolbar').classList.remove('hidden');
    $('resultsSection').classList.remove('hidden');
    $('detailsSection').classList.add('hidden');
    $('resultsSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    setSearchError(error instanceof Error ? error.message : 'Recherche impossible.');
  } finally {
    $('searchBtn').disabled = false;
    $('searchBtn').textContent = 'Rechercher un train';
  }
}

function toggleFavorite(key, button) {
  if (state.favorites.has(key)) state.favorites.delete(key);
  else state.favorites.add(key);

  saveFavorites();
  const active = state.favorites.has(key);
  button.classList.toggle('active', active);
  button.textContent = active ? 'Favori ajoute' : 'Ajouter au favori';
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
  return bestStationMatch(name, items) || {
    id: normalizeText(name),
    name,
  };
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
      const point = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };

      const nearest = stationCoords
        .map((station) => ({ ...station, km: distanceKm(point, station) }))
        .sort((left, right) => left.km - right.km)[0];

      const selected = await resolveNearestStation(nearest.name);
      const originField = state.stationFields.origin;
      applyStationSelection(originField, selected);

      const walkingMinutes = Math.max(2, Math.round((nearest.km / 4.5) * 60));
      $('locationResult').textContent = `Gare la plus proche : ${titleCase(selected.name)} · environ ${walkingMinutes} min a pied.`;
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

function accounts() {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNT_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveAccounts(list) {
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify(list));
}

function setAccountMode(mode) {
  state.accountMode = mode === 'register' ? 'register' : 'login';
  const registerMode = state.accountMode === 'register';
  $('registerFields').classList.toggle('hidden', !registerMode);
  $('accountTitle').textContent = registerMode ? 'Creer un compte' : 'Connexion';
  $('accountSubtitle').textContent = registerMode
    ? 'Créez un compte local avec votre matricule, vos coordonnees et votre mot de passe.'
    : 'Connectez-vous pour retrouver vos preferences localement sur cet appareil.';
  $('accountSubmit').textContent = registerMode ? 'Creer mon compte' : 'Se connecter';
  $('toggleRegister').textContent = registerMode ? 'J ai deja un compte' : 'Creer un compte';
  $('accountMessage').textContent = '';
}

function setAccountMessage(message, tone = 'default') {
  $('accountMessage').textContent = message || '';
  $('accountMessage').style.color = tone === 'error' ? '#EF4444' : tone === 'success' ? '#16A34A' : '#6B7280';
}

function updateAccountButton() {
  $('openAccount').textContent = state.session?.firstName ? state.session.firstName : 'Compte';
}

function renderAccountState() {
  const loggedIn = Boolean(state.session);
  $('accountAuthState').classList.toggle('hidden', loggedIn);
  $('accountProfileState').classList.toggle('hidden', !loggedIn);

  if (loggedIn) {
    $('profileName').textContent = `${state.session.firstName} ${state.session.lastName}`.trim();
    $('profileEmail').textContent = state.session.email;
    $('profileMatricule').textContent = state.session.matricule;
  }

  updateAccountButton();
  updateFavoritesCount();
}

function showAccount(mode = 'login') {
  $('accountPanel').classList.remove('hidden');
  $('accountPanel').setAttribute('aria-hidden', 'false');
  if (!state.session) setAccountMode(mode);
  renderAccountState();
}

function hideAccount() {
  $('accountPanel').classList.add('hidden');
  $('accountPanel').setAttribute('aria-hidden', 'true');
}

function persistSession(account) {
  state.session = {
    matricule: account.matricule,
    firstName: account.firstName,
    lastName: account.lastName,
    email: account.email,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(state.session));
  renderAccountState();
}

function clearAuthInputs() {
  ['matricule', 'firstName', 'lastName', 'email', 'password'].forEach((id) => {
    const field = $(id);
    if (field) field.value = '';
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
    const matricule = $('matricule').value.trim();
    const firstName = $('firstName').value.trim();
    const lastName = $('lastName').value.trim();

    if (!matricule || !firstName || !lastName) {
      setAccountMessage('Remplissez tous les champs pour creer le compte.', 'error');
      return;
    }

    if (!MATRICULE_REGEX.test(matricule)) {
      setAccountMessage('Le matricule doit contenir au moins une lettre et un chiffre.', 'error');
      return;
    }

    const list = accounts();
    if (list.some((account) => account.email === email)) {
      setAccountMessage('Un compte avec cet email existe deja.', 'error');
      return;
    }

    list.push({
      matricule,
      firstName,
      lastName,
      email,
      password,
      createdAt: new Date().toISOString(),
    });

    saveAccounts(list);
    setAccountMode('login');
    $('email').value = email;
    $('password').value = '';
    setAccountMessage('Compte cree. Vous pouvez maintenant vous connecter.', 'success');
    return;
  }

  const account = accounts().find((item) => item.email === email && item.password === password);
  if (!account) {
    setAccountMessage('Compte introuvable. Verifiez vos identifiants ou creez un compte.', 'error');
    return;
  }

  persistSession(account);
  hideAccount();
}

function logout() {
  state.session = null;
  localStorage.removeItem(SESSION_KEY);
  renderAccountState();
  setAccountMode('login');
  clearAuthInputs();
  showAccount('login');
}

function initSession() {
  try {
    state.session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    state.session = null;
  }
  renderAccountState();
}

function bind() {
  bindStationField('origin', 'originInput', 'originId', 'originSuggestions');
  bindStationField('destination', 'destinationInput', 'destinationId', 'destinationSuggestions');

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

  $('resultsList').addEventListener('click', (event) => {
    const viewButton = event.target.closest('.view-btn');
    const favoriteButton = event.target.closest('.favorite-btn');

    if (viewButton) {
      renderJourneyDetails(Number(viewButton.dataset.index));
    }

    if (favoriteButton) {
      toggleFavorite(favoriteButton.dataset.key, favoriteButton);
    }
  });

  $('closeDetails').addEventListener('click', () => {
    $('detailsSection').classList.add('hidden');
    $('resultsSection').classList.remove('hidden');
  });

  $('openAccount').addEventListener('click', () => showAccount('login'));
  $('closeAccount').addEventListener('click', hideAccount);
  $('toggleRegister').addEventListener('click', () => {
    setAccountMode(state.accountMode === 'register' ? 'login' : 'register');
  });
  $('accountSubmit').addEventListener('click', submitAccount);
  $('logoutBtn').addEventListener('click', logout);

  document.addEventListener('click', (event) => {
    Object.values(state.stationFields).forEach((fieldState) => {
      if (!fieldState.box.contains(event.target) && event.target !== fieldState.input) {
        fieldState.box.classList.remove('show');
      }
    });

    if (event.target === $('accountPanel')) hideAccount();
  });
}

window.addEventListener('DOMContentLoaded', () => {
  setNow();
  initHero();
  syncFavorites();
  bind();
  initSession();
});
