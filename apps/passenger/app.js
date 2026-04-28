const storageKey = 'sncft_passenger_api_base';
let state = {
  apiBaseUrl: localStorage.getItem(storageKey) || 'http://localhost:3000',
  origin: null,
  destination: null,
  pagination: { offset: 0, limit: 5, hasNext: false, hasPrevious: false, nextOffset: null, previousOffset: 0 },
  lastQuery: null,
  results: [],
};

const el = {
  apiBaseUrl: document.getElementById('apiBaseUrl'),
  saveApiConfig: document.getElementById('saveApiConfig'),
  originInput: document.getElementById('originInput'),
  destinationInput: document.getElementById('destinationInput'),
  originSuggestions: document.getElementById('originSuggestions'),
  destinationSuggestions: document.getElementById('destinationSuggestions'),
  dateInput: document.getElementById('dateInput'),
  timeInput: document.getElementById('timeInput'),
  passengersInput: document.getElementById('passengersInput'),
  searchBtn: document.getElementById('searchBtn'),
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

async function fetchJson(path) {
  const response = await fetch(`${state.apiBaseUrl}${path}`);
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
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
el.prevBtn.onclick = () => {
  if (state.pagination.hasPrevious) search(state.pagination.previousOffset);
};
el.nextBtn.onclick = () => {
  if (state.pagination.hasNext && state.pagination.nextOffset !== null) search(state.pagination.nextOffset);
};
