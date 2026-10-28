## Uni-Chrono

Uni-Chrono shows where you can study after the baccalauréat in France (every programme listed on Parcoursup) and, for each site, the area you can reach within a given time on foot, by bike, by car or by public transport (an isochrone), with the rents of the municipalities in that area.

**Available in French and English.** Deployed on GitHub Pages: https://jpugetgil.github.io/Uni-Chrono/

### Features

- Map of the ~8,300 sites offering Parcoursup programmes, grouped into clusters and coloured by category (university or IUT, specialised school, high school or CFA, other).
- One search box for institutions, programmes, cities and addresses; cascading region → department → city filters, programme type and status (public, private under contract, private).
- The reachable area of the opened site, with time bands (for example 5, 10 and 15 minutes), each in its own colour (violet, teal, yellow; readable with colour vision deficiencies). Areas are cached for the session, per position (about 11 m, so the sites of one campus share theirs), mode and duration, and shared by the site panel, the starting point and the comparison.
- For each reachable area: surface, municipalities (Paris, Lyon and Marseille by arrondissement), median rent, and a list of municipalities with their advertised rent per m² and an estimated monthly rent.
- For each site: its Parcoursup programmes with links to their Parcoursup pages, status, website, and the CROUS residences in its reachable area.
- From an address or your location: the sites reachable within the chosen time, by time band.
- Search by programme ("BTS - Services informatiques aux organisations"…) to keep only the sites offering it.
- Favourites (up to 4) compared side by side: area, municipalities, median rent, CROUS residences, programmes.
- Shareable links: the URL carries the opened site, the starting point, the mode, the duration and the filters.
- IGN map (default) or OpenStreetMap basemap, with an automatic switch to OpenStreetMap (and a short notice) where the IGN map fails: outside its coverage (France, overseas territories and border areas) or during an outage; CROUS residences and restaurants layers.
- Desktop side panel, mobile bottom sheet; installable as a PWA.

### Data

`npm run data` (`scripts/build-data.ts`) downloads and prepares the data into `public/data/` (not versioned):

| File | Content | Source |
|------|---------|--------|
| `etablissements.json` | Sites: one institution (UAI) at one location, with its programme types, category and status | "Cartographie des formations Parcoursup", latest session (MESR, Licence Ouverte) |
| `formations/<UAI prefix>.json` | Programmes of each site, loaded when a site is opened | same |
| `filieres.json` | Programme labels, referenced by index from the sites | same |
| `communes.json` | Municipalities and the arrondissements of Paris, Lyon and Marseille, with their advertised rent | geo.api.gouv.fr and the latest "Carte des loyers" (ANIL, data.gouv.fr) |
| `crous.json` | CROUS residences and restaurants | CROUS datasets (data.enseignementsup-recherche.gouv.fr, Licence Ouverte) |
| `meta.json` | Sources and preparation date, shown in the app | |

The script fails if a source returns too few rows, so a broken source never replaces good data. The deployment workflow runs it on every push to `main` and every Monday.

### Services

| What | Service | Key |
|------|---------|-----|
| Isochrones (walking, driving) | Géoplateforme isochrone service (IGN), BD TOPO road network, one request per time band. About 5 requests per second per visitor's IP, then a short block: the app sends at most 4 per second and waits out a 429 | none |
| Isochrones (cycling, public transport; optional) | Geoapify Isoline API: `bicycle` mode, and `approximated_transit` mode, an estimate from OpenStreetMap transit lines without timetables (the `transit` mode gave areas smaller than walking in French cities). Free plan: 3,000 credits a day, shared by all visitors | `VITE_GEOAPIFY_API_KEY` |
| Address search | Géoplateforme geocoding (IGN) | none |
| Municipality contours | geo.api.gouv.fr | none |
| Basemaps | Plan IGN (Géoplateforme WMTS), OpenStreetMap tiles | none |

The Geoapify key is embedded in the built JavaScript and is therefore public. Without it, the cycling and public transport modes are hidden; walking and driving need no key. To spare the shared quota, an area is only computed for the site the user opens (or a starting point they ask for), once the mode and duration have settled (0.4 s), and kept in the session cache and, through the service worker, in the browser cache (Geoapify 7 days, IGN 30 days).

### Run locally

Prerequisites: Node.js 22.18 or later (the data script is TypeScript run directly by Node). A Geoapify key is optional (cycling and public transport).

1. `cp .env.example .env` and, optionally, fill in `VITE_GEOAPIFY_API_KEY`.
2. `npm install`
3. `npm run dev`, then open the URL printed by Vite (the app is served under `/Uni-Chrono/`). The first run prepares the data (`npm run data`, about 10 seconds); run `npm run data` again to refresh it.

`npm run build` builds the production bundle into `dist/`; `npm run preview` serves it. `npm run icons` regenerates the favicon, PWA, maskable and Apple icons from `public/favicon.svg`.

### Tests

- `npm test`: unit tests (Vitest) for the geometry, filters, housing, data preparation and API helpers.
- `npm run test:e2e`: browser tests (Playwright) on the production build, with every external service mocked (`e2e/mocks.ts`). Install the browser once with `npx playwright install chromium`.
- `npm run lint`: ESLint.

### Continuous integration and deployment

- `.github/workflows/ci.yml` runs lint, unit tests, build and browser tests on every pull request.
- `.github/workflows/deploy-pages.yml` runs lint and unit tests, prepares the data, then builds and deploys `main` to GitHub Pages, on every push and every Monday. Set the optional `VITE_GEOAPIFY_API_KEY` repository secret.
