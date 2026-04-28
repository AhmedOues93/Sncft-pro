const storageKey = 'sncft_passenger_api_base';
const passengerTokenKey = 'sncft_passenger_auth_token';
let state = {
  apiBaseUrl: localStorage.getItem(storageKey) || 'http://localhost:3000',
  authToken: localStorage.getItem(passengerTokenKey) || '',
  origin: null,
  destination: null,
  pagination: { offset: 0, limit: 5, hasNext: false, hasPrevious: false, nextOffset: null, previousOffset: 0 },
  lastQuery: null,
  results: [],
};

const el = {
  apiBaseUrl: document.getElementById('apiBaseUrl'),
  saveApiConfig: document.getElementById('saveApiConfig'),
  registerName: document.getElementById('registerName'),
  registerEmail: document.getElementById('registerEmail'),
  registerPassword: document.getElementById('registerPassword'),
  registerBtn: document.getElementById('registerBtn'),
  loginEmail: document.getElementById('loginEmail'),
  loginPassword: document.getElementById('loginPassword'),
  loginBtn: document.getElementById('loginBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  authState: document.getElementById('authState'),
  originInput: document.getElementById('originInput'),
  destinationInput: document.getElementById('destinationInput'),
  originSuggestions: document.getElementById('originSuggestions'),
  destinationSuggestions: document.getElementById('destinationSuggestions'),
  dateInput: document.getElementById('dateInput'),
  timeInput: document.getElementById('timeInput'),
  passengersInput: document.getElementById('passengersInput'),
  searchBtn: document.getElementById('searchBtn'),
  saveFavoriteBtn: document.getElementById('saveFavoriteBtn'),
  searchState: document.getElementById('searchState'),
  results: document.getElementById('results'),
  details: document.getElementById('details'),
  prevBtn: document.getElementById('prevBtn'),
  nextBtn: document.getElementById('nextBtn'),
};

el.apiBaseUrl.value = state.apiBaseUrl;

function setStateMessage(msg, error = false) {
  el.searchState.textContent = msg;
  el.searchState.className = error ? 'state error' : 'state';
}

function getDateTimeIso() {
  const date = el.dateInput.value || new Date().toISOString().slice(0, 10);
  const time = el.timeInput.value || '05:00';
  return `${date}T${time}:00`;
}

async function fetchJson(path, options = {}) {
  const headers = { ...(state.authToken ? { authorization: `Bearer ${state.authToken}` } : {}), ...(options.headers || {}) };
  const response = await fetch(`${state.apiBaseUrl}${path}`, { ...options, headers });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
}


async function refreshPassengerMe() {
  if (!state.authToken) {
    el.authState.textContent = 'Non connecté — Connectez-vous pour sauvegarder';
    return;
  }
  try {
    const me = await fetchJson('/auth/me');
    el.authState.textContent = `Connecté: ${me.displayName || me.email}`;
  } catch (error) {
    el.authState.textContent = `Erreur auth: ${error.message}`;
  }
}

async function registerPassenger() {
  try {
    await fetchJson('/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: '' },
      body: JSON.stringify({ displayName: el.registerName.value.trim(), email: el.registerEmail.value.trim(), password: el.registerPassword.value }),
    });
    el.authState.textContent = 'Compte créé. Connectez-vous.';
  } catch (error) {
    el.authState.textContent = `Erreur inscription: ${error.message}`;
  }
}

async function loginPassenger() {
  try {
    const data = await fetchJson('/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: '' },
      body: JSON.stringify({ email: el.loginEmail.value.trim(), password: el.loginPassword.value }),
    });
    state.authToken = data.accessToken;
    localStorage.setItem(passengerTokenKey, state.authToken);
    await refreshPassengerMe();
  } catch (error) {
    el.authState.textContent = `Erreur login: ${error.message}`;
  }
}

async function logoutPassenger() {
  try {
    if (state.authToken) await fetchJson('/auth/logout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  } catch {}
  state.authToken = '';
  localStorage.removeItem(passengerTokenKey);
  await refreshPassengerMe();
}

async function saveFavorite() {
  if (!state.authToken) {
    el.authState.textContent = 'Connectez-vous pour sauvegarder';
    return;
  }
  if (!state.origin || !state.destination) {
    setStateMessage('Sélectionnez départ/destination avant sauvegarde.', true);
    return;
  }
  try {
    await fetchJson('/me/favorites', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ originStationId: state.origin.id, destinationStationId: state.destination.id, label: `${state.origin.name} → ${state.destination.name}` }),
    });
    setStateMessage('Favori sauvegardé.');
  } catch (error) {
    setStateMessage(`Erreur favori: ${error.message}`, true);
  }
}

async function saveJourneyForLater(journey) {
  if (!state.authToken) {
    el.authState.textContent = 'Connectez-vous pour sauvegarder';
    return;
  }

  const trainNumbers = journey.segments.map((segment) => segment.trainNumber);
  const date = el.dateInput.value || new Date().toISOString().slice(0, 10);

  try {
    await fetchJson('/me/saved-journeys', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        originStationId: state.origin.id,
        destinationStationId: state.destination.id,
        departureTime: journey.departureTime,
        arrivalTime: journey.arrivalTime,
        trainNumbers,
        journeyPayload: journey,
        travelDate: date,
      }),
    });
    setStateMessage('Trajet sauvegardé pour plus tard.');
  } catch (error) {
    setStateMessage(`Erreur sauvegarde trajet: ${error.message}`, true);
  }
}

async function loadSuggestions(query, target) {
  if (!query || query.length < 2) {
    target.innerHTML = '';
    return;
  }

  try {
    const data = await fetchJson(`/stations/search?q=${encodeURIComponent(query)}&limit=10`);
    target.innerHTML = '';
    data.items.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item.name;
      li.onclick = () => {
        if (target === el.originSuggestions) {
          state.origin = item;
          el.originInput.value = item.name;
        } else {
          state.destination = item;
          el.destinationInput.value = item.name;
        }
        target.innerHTML = '';
      };
      target.appendChild(li);
    });
  } catch {
    target.innerHTML = '<li>Erreur suggestions</li>';
  }
}

function formatJourney(journey, idx) {
  const segments = journey.segments.map((seg) => `${seg.lineCode} #${seg.trainNumber}`).join(' → ');
  return `<div class="journey">
    <div><strong>${journey.type === 'direct' ? 'Direct' : 'Correspondance'}</strong> - ${journey.departureTime} → ${journey.arrivalTime} (${journey.durationMinutes} min)</div>
    <div>${segments}</div>
    <div>Tarif: ${journey.fare.amount} ${journey.fare.currency}</div>
    ${journey.transferStationId ? `<div>Correspondance: ${journey.transferStationId} (${journey.transferWaitMinutes} min)</div>` : ''}
    <button data-index="${idx}" class="detailsBtn">Voir détails</button>
    <button data-save="${idx}" class="saveJourneyBtn">Sauvegarder</button>
  </div>`;
}

function buildDetails(journey) {
  const stops = [];
  journey.segments.forEach((segment, segmentIndex) => {
    segment.stops.forEach((stop, idx) => {
      if (segmentIndex > 0 && idx === 0 && stops.length && stops[stops.length - 1].stationId === stop.stationId) return;
      stops.push(stop);
    });
  });

  const lines = stops.map((s) => `<li>${s.stationName} - ${s.arrivalTime}/${s.departureTime}</li>`).join('');
  return `<div>
    <div><strong>${journey.departureTime} → ${journey.arrivalTime}</strong> (${journey.durationMinutes} min)</div>
    ${journey.transferStationId ? `<div>Correspondance à ${journey.transferStationId} (${journey.transferWaitMinutes} min)</div>` : ''}
    <div>Tarif total (${journey.fare.passengerCount} passagers): ${journey.fare.amount} ${journey.fare.currency}</div>
    <ul>${lines}</ul>
  </div>`;
}

function renderResults() {
  if (!state.results.length) {
    el.results.innerHTML = '<p class="empty">Aucun trajet trouvé.</p>';
    return;
  }
  el.results.innerHTML = state.results.map(formatJourney).join('');
  document.querySelectorAll('.detailsBtn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.getAttribute('data-index'));
      el.details.innerHTML = buildDetails(state.results[idx]);
    });
  });
  document.querySelectorAll('.saveJourneyBtn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.getAttribute('data-save'));
      saveJourneyForLater(state.results[idx]);
    });
  });
}

async function search(offset = 0) {
  if (!state.origin || !state.destination) {
    setStateMessage('Veuillez sélectionner départ et destination.', true);
    return;
  }

  const passengers = Math.max(1, Number(el.passengersInput.value || 1));
  const datetime = getDateTimeIso();

  setStateMessage('Chargement...');

  const query = new URLSearchParams({
    originStationId: state.origin.id,
    destinationStationId: state.destination.id,
    datetime,
    passengers: String(passengers),
    offset: String(offset),
    limit: '5',
  });

  try {
    const data = await fetchJson(`/journeys/search?${query}`);
    state.lastQuery = { passengers, datetime };
    state.pagination = {
      offset: data.offset,
      limit: data.limit,
      hasNext: data.hasNext,
      hasPrevious: data.hasPrevious,
      nextOffset: data.nextOffset,
      previousOffset: data.previousOffset,
    };
    state.results = data.items;
    setStateMessage(`Résultats: ${data.count}/${data.total}`);
    renderResults();
  } catch (error) {
    setStateMessage(`Erreur API: ${error.message}`, true);
    el.results.innerHTML = '<p class="error">Erreur lors de la recherche.</p>';
  }
}

el.saveApiConfig.onclick = () => {
  state.apiBaseUrl = el.apiBaseUrl.value.trim() || 'http://localhost:3000';
  localStorage.setItem(storageKey, state.apiBaseUrl);
  setStateMessage(`API: ${state.apiBaseUrl}`);
};

el.originInput.addEventListener('input', () => {
  state.origin = null;
  loadSuggestions(el.originInput.value, el.originSuggestions);
});
el.destinationInput.addEventListener('input', () => {
  state.destination = null;
  loadSuggestions(el.destinationInput.value, el.destinationSuggestions);
});

el.searchBtn.onclick = () => search(0);
el.saveFavoriteBtn.onclick = saveFavorite;
el.registerBtn.onclick = registerPassenger;
el.loginBtn.onclick = loginPassenger;
el.logoutBtn.onclick = logoutPassenger;
el.prevBtn.onclick = () => {
  if (state.pagination.hasPrevious) search(state.pagination.previousOffset);
};
el.nextBtn.onclick = () => {
  if (state.pagination.hasNext && state.pagination.nextOffset !== null) search(state.pagination.nextOffset);
};

refreshPassengerMe();
