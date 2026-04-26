/* Sankashti Chaturthi Moonrise PWA
 * - Finds Krishna Paksha Chaturthi (4th tithi of waning phase) each lunar month
 * - Uses SunCalc for moonrise at user's lat/lng
 */

// ---------- Tithi / Chaturthi detection ----------
// A tithi = 12° of difference between moon's and sun's ecliptic longitudes.
// Krishna Paksha Chaturthi = 19th tithi overall (tithis 16–30 are Krishna Paksha).
// We approximate using SunCalc's moon illumination "phase" (0 new, 0.5 full, 1 new again).
// Krishna Chaturthi sits at phase ≈ 0.633 (4/30 past full).

function tithiFromPhase(phase) {
  // Convert phase (0..1) into tithi index 1..30. Phase 0 = amavasya end / start of Shukla 1.
  const t = Math.floor(phase * 30) + 1;
  return Math.min(30, Math.max(1, t));
}

// Sankashti Chaturthi rule: the day is Sankashti if Krishna Chaturthi tithi
// is present AT MOONRISE. When Chaturthi spans two consecutive moonrises,
// Drik Panchang convention is to pick the day where Chaturthi is "more
// pervading" at moonrise — i.e. the later day with higher phase value
// (Chaturthi closer to ending). This handles cases like June 2026 where
// Chaturthi is barely started on one evening and nearly ending on the next.
function findUpcomingSankashti(fromDate, count = 6, lat, lng) {
  const candidates = [];
  const d = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  for (let i = 0; i < 400; i++) {
    const probe = new Date(d);
    probe.setDate(d.getDate() + i);
    let refTime;
    if (lat != null) {
      const noon = new Date(probe.getFullYear(), probe.getMonth(), probe.getDate(), 12, 0, 0);
      const rise = SunCalc.getMoonTimes(noon, lat, lng).rise;
      refTime = rise || new Date(probe.getFullYear(), probe.getMonth(), probe.getDate(), 22, 0, 0);
    } else {
      refTime = new Date(probe.getFullYear(), probe.getMonth(), probe.getDate(), 22, 0, 0);
    }
    const phase = SunCalc.getMoonIllumination(refTime).phase;
    if (tithiFromPhase(phase) === 19) {
      candidates.push({ date: new Date(probe), phase });
    }
  }
  // Group consecutive-day candidates; within a run, pick the one with the
  // highest phase (Chaturthi closest to ending at moonrise).
  const results = [];
  let i = 0;
  while (i < candidates.length && results.length < count) {
    let j = i;
    let best = candidates[i];
    while (j + 1 < candidates.length &&
           Math.round((candidates[j + 1].date - candidates[j].date) / 86400000) === 1) {
      j++;
      if (candidates[j].phase > best.phase) best = candidates[j];
    }
    results.push(best.date);
    i = j + 1;
    // Skip past any stragglers still within the same lunar month
    while (i < candidates.length &&
           (candidates[i].date - best.date) / 86400000 < 20) i++;
  }
  return results;
}

// ---------- Moonrise & Chandra Darshan ----------
function moonriseAt(date, lat, lng) {
  // Use noon local-time of the target date as the reference point so SunCalc
  // searches the correct 24h window in the user's timezone (evening moonrise).
  // Do NOT pass inUTC=true — that returns the PREVIOUS evening's moonrise
  // for east-of-UTC locations like India.
  const noon = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  const t = SunCalc.getMoonTimes(noon, lat, lng);
  if (t.rise) return t.rise;
  // Fallback: scan for rise from noon forward (handles edge cases)
  for (let h = 0; h < 36; h++) {
    const probe = new Date(noon.getTime() + h * 3600 * 1000);
    const a0 = SunCalc.getMoonPosition(probe, lat, lng).altitude;
    const a1 = SunCalc.getMoonPosition(new Date(probe.getTime() + 3600000), lat, lng).altitude;
    if (a0 < 0 && a1 >= 0) return new Date(probe.getTime() + 1800000);
  }
  return null;
}

// Chandra Darshan Muhurta: moment when moon reaches ~8° altitude
// (traditional "one hand-span above horizon" for arghya)
function chandraDarshanAt(riseDate, lat, lng, thresholdDeg = 8) {
  if (!riseDate) return null;
  const thresholdRad = thresholdDeg * Math.PI / 180;
  let t = new Date(riseDate.getTime());
  // step forward in 1-min increments, max 180 minutes
  for (let i = 0; i < 180; i++) {
    t = new Date(t.getTime() + 60 * 1000);
    const alt = SunCalc.getMoonPosition(t, lat, lng).altitude;
    if (alt >= thresholdRad) return t;
  }
  return null;
}

// ---------- UI ----------
const $ = (id) => document.getElementById(id);

const state = {
  lat: null, lng: null, locName: null,
};

function fmtDate(d) {
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function fmtTime(d) {
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function render() {
  const now = new Date();
  const upcoming = findUpcomingSankashti(now, 6, state.lat, state.lng);
  if (!upcoming.length) { $('nextDate').textContent = 'Unable to compute'; return; }

  const next = upcoming[0];
  $('nextDate').textContent = fmtDate(next);

  if (state.lat != null) {
    $('locLine').textContent = state.locName || `${state.lat.toFixed(2)}, ${state.lng.toFixed(2)}`;
    const rise = moonriseAt(next, state.lat, state.lng);
    const darshan = chandraDarshanAt(rise, state.lat, state.lng);
    $('moonTime').textContent = rise ? fmtTime(rise) : 'No moonrise that day';
    $('darshanTime').textContent = darshan ? fmtTime(darshan) : '—';
  } else {
    $('moonTime').textContent = '— set location —';
    $('darshanTime').textContent = '—';
  }

  const list = $('upcomingList');
  list.innerHTML = '';
  upcoming.slice(1).forEach(d => {
    const li = document.createElement('li');
    const left = document.createElement('span'); left.textContent = fmtDate(d);
    const right = document.createElement('span'); right.className = 'muted';
    if (state.lat != null) {
      const r = moonriseAt(d, state.lat, state.lng);
      const darshan = chandraDarshanAt(r, state.lat, state.lng);
      right.innerHTML = r
        ? `<span>${fmtTime(r)}</span> <span style="opacity:0.6;margin-left:8px">· ${darshan ? fmtTime(darshan) : '—'}</span>`
        : '—';
    } else right.textContent = '—';
    li.appendChild(left); li.appendChild(right);
    list.appendChild(li);
  });
}

function saveLoc() {
  localStorage.setItem('loc', JSON.stringify({ lat: state.lat, lng: state.lng, name: state.locName }));
}
function loadLoc() {
  try {
    const s = JSON.parse(localStorage.getItem('loc') || 'null');
    if (s && typeof s.lat === 'number') {
      state.lat = s.lat; state.lng = s.lng; state.locName = s.name || null;
    }
  } catch {}
}

$('locBtn').addEventListener('click', () => {
  $('msg').textContent = 'Requesting location…';
  navigator.geolocation.getCurrentPosition(
    pos => {
      state.lat = pos.coords.latitude;
      state.lng = pos.coords.longitude;
      state.locName = null;
      saveLoc(); $('msg').textContent = ''; render();
    },
    err => { $('msg').innerHTML = `<span class="err">${err.message}</span>`; },
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
  );
});

$('manualBtn').addEventListener('click', async () => {
  const city = prompt('Enter city name (e.g. "Hyderabad, India"):');
  if (!city) return;
  $('msg').textContent = 'Looking up…';
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(city)}`);
    const j = await r.json();
    if (!j.length) { $('msg').innerHTML = '<span class="err">City not found</span>'; return; }
    state.lat = parseFloat(j[0].lat);
    state.lng = parseFloat(j[0].lon);
    state.locName = j[0].display_name.split(',').slice(0, 2).join(',');
    saveLoc(); $('msg').textContent = ''; render();
  } catch (e) {
    $('msg').innerHTML = '<span class="err">Lookup failed — try GPS instead</span>';
  }
});

loadLoc();
render();
