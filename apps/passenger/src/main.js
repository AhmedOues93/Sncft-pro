const slides = [...document.querySelectorAll('.hero-slide')];
const dots = [...document.querySelectorAll('.dot')];
let slideIndex = 0;

function setSlide(index) {
  slideIndex = index % slides.length;
  slides.forEach((slide, i) => slide.classList.toggle('active', i === slideIndex));
  dots.forEach((dot, i) => dot.classList.toggle('active', i === slideIndex));
}

setInterval(() => setSlide(slideIndex + 1), 3600);

const journeys = [
  { dep: '08:15', arr: '09:00', origin: 'Tunis Ville', dest: 'Hammam Lif', duration: '45 min', type: 'Direct', line: 'A', train: 'Train A101', fare: '1.700 TND' },
  { dep: '09:30', arr: '10:15', origin: 'Tunis Ville', dest: 'Hammam Lif', duration: '45 min', type: 'Direct', line: 'A', train: 'Train A107', fare: '1.700 TND' },
  { dep: '18:24', arr: '20:42', origin: 'Ezzouhour 2', dest: 'Mellassine', duration: '2 h 18', type: '1 correspondance', line: 'D', train: 'A508 + D645', fare: '2.400 TND', transfer: 'Tunis Ville · 30 min' },
  { dep: '23:30', arr: '00:11 +1', origin: 'Tunis Ville', dest: 'Erriadh', duration: '41 min', type: 'Direct', line: 'A', train: 'Train 259', fare: '1.900 TND' },
  { dep: '06:40', arr: '07:18', origin: 'Tunis Ville', dest: 'Bougatfa', duration: '38 min', type: 'Direct', line: 'E', train: 'Train E301', fare: '1.500 TND' }
];

const stops = [
  ['08:15', 'Tunis Ville'],
  ['08:21', 'Jebel Jelloud'],
  ['08:31', 'Rades'],
  ['08:38', 'Ezzahra'],
  ['08:44', 'Hammam Lif']
];

function showView(id) {
  document.querySelectorAll('.view').forEach((view) => view.classList.toggle('active', view.id === id));
}

function renderJourneys() {
  const list = document.getElementById('journeyList');
  list.innerHTML = journeys.map((j, index) => `
    <article class="journey">
      <div class="journey-top">
        <div><div class="time">${j.dep}</div><div class="station">${j.origin}</div></div>
        <div class="route-line">
          <span class="badge">${j.type}</span>
          <div class="rail"><div></div></div>
          <div class="duration">${j.duration}</div>
        </div>
        <div style="text-align:right"><div class="time">${j.arr}</div><div class="station">${j.dest}</div></div>
      </div>
      <div class="journey-meta">
        <div class="line">${j.line}</div>
        <div class="train">${j.train}</div>
        <div class="fare">${j.fare}</div>
      </div>
      ${j.transfer ? `<div style="margin-top:10px;background:#eff7ff;border-radius:16px;padding:10px;font-weight:800;color:#0b2d57">⇄ ${j.transfer}</div>` : ''}
      <button class="details" data-details="${index}">Voir les détails</button>
    </article>
  `).join('');

  list.querySelectorAll('[data-details]').forEach((btn) => {
    btn.addEventListener('click', () => showView('details'));
  });
}

function renderStops() {
  document.getElementById('timelineStops').innerHTML = stops.map(([time, name]) => `
    <div class="stop">
      <div class="stop-time">${time}</div>
      <div class="stop-dot"></div>
      <div class="stop-name">${name}</div>
    </div>
  `).join('');
}

document.getElementById('searchBtn').addEventListener('click', () => showView('results'));
document.querySelectorAll('[data-open-results]').forEach((el) => el.addEventListener('click', () => showView('results')));
document.querySelectorAll('[data-view]').forEach((el) => el.addEventListener('click', () => showView(el.dataset.view)));

document.getElementById('swapBtn').addEventListener('click', () => {
  const origin = document.getElementById('originLabel');
  const destination = document.getElementById('destinationLabel');
  const temp = origin.textContent;
  origin.textContent = destination.textContent;
  destination.textContent = temp;
});

renderJourneys();
renderStops();
