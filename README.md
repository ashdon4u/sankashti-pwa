# Sankashti Chaturthi Moonrise PWA

A tiny installable web app that shows the moonrise time at the user's location for each monthly Sankashti Chaturthi, so devotees know when to break their fast.

## What's inside

| File | Purpose |
|---|---|
| `index.html` | UI shell (mobile-first) |
| `app.js` | Tithi detection + moonrise via SunCalc |
| `manifest.webmanifest` | PWA install metadata |
| `sw.js` | Service worker (offline caching) |
| `icon-192.png`, `icon-512.png` | App icons |

## Run locally

PWAs require **HTTPS or localhost**. Any static server works:

```bash
cd sankashti-pwa
python3 -m http.server 8080
# then open http://localhost:8080
```

## Deploy for free (any one)

- **GitHub Pages** — push to a repo, enable Pages on `main` branch.
- **Netlify** — drag-drop the folder at app.netlify.com.
- **Cloudflare Pages** — connect repo, build command blank, output dir `/`.
- **Vercel** — `vercel` CLI in the folder.

All give HTTPS automatically, which you need for geolocation + service workers.

## How it works

1. **Sankashti date = Krishna Paksha Chaturthi**, i.e. the 4th tithi of the waning moon phase each lunar month. The code scans forward day by day and picks days where the tithi index equals 19 (tithis 16–30 are Krishna Paksha, so 16+4−1 = 19).
2. **Tithi** is derived from SunCalc's `getMoonIllumination().phase` — approximation to ~1 tithi accuracy. For ritual precision, cross-check with your regional panchang.
3. **Moonrise** is computed by `SunCalc.getMoonTimes(date, lat, lng)` — good to about ±2 minutes.
4. **Location** comes from the browser's Geolocation API, or a city name via free OpenStreetMap Nominatim geocoding.

## Ideas to extend

- Push notification 1 hour before moonrise (requires a push service — OneSignal free tier is simplest).
- Auto-detect regional variant (Sankashti vs. Vinayaka Chaturthi, Angarki on Tuesdays, etc.).
- Show the named form of Ganesha for that month's Sankashti.
- Swap in a real panchang library like `drik-panchanga` (Python) or port its algorithm to JS for sidereal accuracy.
- Add a calendar export (`.ics`) so the date lands in the user's calendar.

## Known caveats

- Tithi-via-moon-phase is an approximation. On days where the transition happens near local midnight/sunrise, it can disagree with a panchang by a day. Disclaimer is shown in the UI.
- Moonrise can legitimately not exist on certain days at extreme latitudes.
