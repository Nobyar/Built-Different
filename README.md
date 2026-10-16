# Built Different

A calm, mobile-friendly trip companion for camping, kayaking and fishing the Delaware River through **Delaware Water Gap National Recreation Area**, from the northern park boundary (Port Jervis / Matamoras) to Kittatinny Point.

Live: https://built-different-rbyn.vercel.app

## Features
- **Map**: Leaflet with soft / USGS topo / Esri satellite basemaps, zoom to 19, marker clustering, labels at high zoom, highlighted river line (OpenStreetMap), searchable site list (click to fly to a site).
  - All **62 primitive river campsites** (NPS zones 1–5) plus Alosa, Rivers Bend and Valley View group campgrounds, 11 access points, 13 fishing spots, 5 USGS gauges.
  - Every popup has copy-coordinates plus Google Maps / Apple Maps links. Popups say whether a location is precise or approximate.
  - Float planner with river miles (from the NPS river-camping map) and camping-minimum checks.
- **Campsite check-ins** ("We've been here"): visit date, optional name, note and photos. Visited sites get a ✓ marker, there's a per-site history/gallery, and an "only visited" filter.
- **River Conditions**: live USGS instantaneous values (discharge, stage, water temp) with 7-day sparklines and a conditions rating.
- **Weather**: Open-Meteo current / 24 h / 7-day forecasts for Milford, Dingmans Ferry and Delaware Water Gap, plus NWS alerts.
- **Fishing Report**: sourced recent reports and labeled general guidance.
- **The River Tree**: a shared community note board with photos.
- **Plan Your Trip**: NPS rules, permits, safety and packing list.

## Architecture
- Static front end: `index.html`, `style.css`, and `river.js` + `site-data.js` + `tree.js` + `app.js`, which `build.sh` concatenates into `bundle.js`. No framework.
- `api/notes.js`: a Vercel serverless function (Node) backed by **Vercel Blob**.
  - Entries are stored as JSON files under `entries/tree/` and `entries/checkin/`; photos go under `photos/`.
  - `GET /api/notes?kind=tree|checkin`, `POST /api/notes`, `DELETE /api/notes?id=…` (header `x-delete-token`).
  - Abuse protection:
    - length limits (600-char notes, 40-char names)
    - at most 4 photos per post, ≤ 900 KB each after client-side resize to 1600 px, with JPEG/PNG/WebP magic-byte checks
    - honeypot field and a minimum time-on-form
    - per-IP rate limit (6 posts/hour, keyed by a salted hash of the IP)
    - all user text HTML-escaped on the server
- The posting device gets a delete token (kept in localStorage) so people can remove their own posts.

## Environment
- `BLOB_READ_WRITE_TOKEN` is injected by Vercel when the Blob store is connected to the project. **Never commit it.**

## Local development
```sh
npm install
sh build.sh
npx vercel dev   # serves the static site and /api
```

## Data sources and accuracy
- Campsite names, zones, site IDs and river miles: NPS "River Camping" map (DEWA-MIDE-River-Campsites.pdf, Oct 2023) and the river camping page.
- Precise per-site coordinates: OpenStreetMap features tagged with the NPS site IDs (all of zone 4: QU, PE, BC, FP, HA). Other zones use the NPS "Guide to the Gap" group coordinate, with individual spacing estimated.
- River line: OpenStreetMap Delaware River relation 371307 (ODbL).
- Not an official NPS product. Always check NPS current conditions before launching.
