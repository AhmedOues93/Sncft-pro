const apiBase = window.localStorage.getItem('PASSENGER_API_BASE_URL') || 'http://localhost:3000';
let currentOffset = 0;

function isoFromInput(v) {
  return v ? new Date(v).toISOString() : new Date().toISOString();
}

function renderJourneys(payload) {
  const container = document.getElementById('results');
  container.innerHTML = '';
  (payload.journeys || []).forEach((journey) => {
    const card = document.createElement('div');
    card.className = 'card';
    const segments = journey.segments.map((s) => `${s.trainNumber} (${s.originStationName}→${s.destinationStationName})`).join(' + ');
    card.innerHTML = `
      <strong>${journey.type.toUpperCase()}</strong><br/>
      ${new Date(journey.departureDateTime).toLocaleTimeString()} → ${new Date(journey.arrivalDateTime).toLocaleTimeString()}<br/>
      Duration: ${journey.durationMinutes} min<br/>
      Trains: ${segments}<br/>
      Fare: ${journey.fare.amount} ${journey.fare.currency}
    `;
    container.appendChild(card);
  });
}

async function search(offset = currentOffset) {
  currentOffset = Math.max(0, offset);
  const origin = document.getElementById('origin').value;
  const destination = document.getElementById('destination').value;
  const datetime = isoFromInput(document.getElementById('datetime').value);
  const passengers = Number(document.getElementById('passengers').value || '1');

  const params = new URLSearchParams({
    originStationId: origin,
    destinationStationId: destination,
    datetime,
    passengers: String(passengers),
    offset: String(currentOffset),
    limit: '5',
  });

  const res = await fetch(`${apiBase}/journeys/search?${params.toString()}`);
  const payload = await res.json();
  renderJourneys(payload);
}

document.getElementById('search').addEventListener('click', () => search(currentOffset));
document.getElementById('earlier').addEventListener('click', () => search(Math.max(0, currentOffset - 5)));
document.getElementById('later').addEventListener('click', () => search(currentOffset + 5));
document.getElementById('now').addEventListener('click', () => {
  document.getElementById('datetime').value = '';
  search(0);
});
