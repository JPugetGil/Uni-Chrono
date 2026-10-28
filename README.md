## Uni-Chrono

Uni-Chrono shows where you can study after the baccalauréat in France (every programme listed on Parcoursup) and, for each site, the area you can reach within a given time on foot, by bike or by car (an isochrone), with the rents of the municipalities in that area.

**Available in French and English.** Deployed on GitHub Pages: https://jpugetgil.github.io/Uni-Chrono/

### Features

- Map of the ~8,300 sites offering Parcoursup programmes, grouped into clusters and coloured by category (university or IUT, specialised school, high school or CFA, other).
- One search box for institutions, cities and addresses; cascading region → department → city filters, programme type and status (public, private under contract, private).
- Isochrones on demand, for the selected site or for every site in view, with time bands (for example 5, 10 and 15 minutes).
- For each reachable area: surface, municipalities (Paris, Lyon and Marseille by arrondissement), median rent, and a list of municipalities with their advertised rent per m² and an estimated monthly rent.
- For each site: its Parcoursup programmes with links to their Parcoursup pages, status, website, and the CROUS residences in its reachable area.
- From an address or your location: the sites reachable within the chosen time, by time band.
- Search by programme ("BTS - Services informatiques aux organisations"…) to keep only the sites offering it.
- Favourites (up to 4) compared side by side: area, municipalities, median rent, CROUS residences, programmes.
- Shareable links: the URL carries the opened site, the starting point, the mode, the duration and the filters.
- IGN map (default) or OpenStreetMap basemap; CROUS residences and restaurants layers.
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
| Isochrones (walking, cycling, driving) | Mapbox Isochrone API | `VITE_MAPBOX_API_KEY` (public `pk.` token) |
| Isochrones (walking, driving) without Mapbox, or when Mapbox fails | Géoplateforme isochrone service (IGN) | none |
| Isochrones (public transport, optional) | Geoapify Isoline API, `approximated_transit` mode: an estimate from OpenStreetMap transit lines, without timetables (the `transit` mode gave areas smaller than walking in French cities). Free plan: 3,000 credits a day, shared by all visitors | `VITE_GEOAPIFY_API_KEY` |
| Address search | Géoplateforme geocoding (IGN) | none |
| Municipality contours | geo.api.gouv.fr | none |
| Basemaps | Plan IGN (Géoplateforme WMTS), OpenStreetMap tiles | none |

API keys are embedded in the built JavaScript and are therefore public. Restrict them to the site's URL in the provider's dashboard (Mapbox: token URL restrictions). Without a Mapbox key, walking and driving areas come from the IGN service and cycling explains that it is unavailable; without a Geoapify key the public transport mode is hidden. Computing every site in view at once is reserved for Mapbox; with IGN and Geoapify, areas are computed for the opened site only, to spare these shared services. Mapbox answers a refused key with a 401 without CORS headers, which a browser cannot tell from a network error: the app therefore falls back to IGN on any Mapbox failure.

### Run locally

Prerequisites: Node.js 22.18 or later (the data script is TypeScript run directly by Node) and a Mapbox token.

1. `cp .env.example .env` and fill in `VITE_MAPBOX_API_KEY`.
2. `npm install`
3. `npm run dev`, then open the URL printed by Vite (the app is served under `/Uni-Chrono/`). The first run prepares the data (`npm run data`, about 10 seconds); run `npm run data` again to refresh it.

`npm run build` builds the production bundle into `dist/`; `npm run preview` serves it. `npm run icons` regenerates the favicon, PWA, maskable and Apple icons from `public/favicon.svg`.

### Tests

- `npm test`: unit tests (Vitest) for the geometry, filters, housing, data preparation and API helpers.
- `npm run test:e2e`: browser tests (Playwright) on the production build, with every external service mocked (`e2e/mocks.ts`). Install the browser once with `npx playwright install chromium`.
- `npm run lint`: ESLint.

### Continuous integration and deployment

- `.github/workflows/ci.yml` runs lint, unit tests, build and browser tests on every pull request.
- `.github/workflows/deploy-pages.yml` runs lint and unit tests, prepares the data, then builds and deploys `main` to GitHub Pages, on every push and every Monday. Set the `VITE_MAPBOX_API_KEY` and, optionally, `VITE_GEOAPIFY_API_KEY` repository secrets.
