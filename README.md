## Uni-Chrono

Uni-Chrono shows French higher-education institutions on a map and, for each one, the area you can reach within a given time on foot, by bike or by car (an isochrone), with the rents of the municipalities in that area.

**Available in French and English.** Deployed on GitHub Pages: https://jpugetgil.github.io/Uni-Chrono/

### Features

- Map of higher-education sites, grouped into clusters and coloured by category (university, grand établissement, school or institute, other).
- One search box for institutions, cities and addresses; cascading region → department → city filters.
- Isochrones on demand, for the selected institution or for every institution in view, with time bands (for example 5, 10 and 15 minutes).
- For each reachable area: surface, municipalities, median rent, and a list of municipalities with their advertised rent per m² and an estimated monthly rent.
- Desktop side panel, mobile bottom sheet; installable as a PWA.

### Data and services

| What | Source | Key |
|------|--------|-----|
| Institutions | MESR open data, dataset `fr-esr-implantations_etablissements_d_enseignement_superieur_publics` | none |
| Isochrones (walking, cycling, driving) | Mapbox Isochrone API | `VITE_MAPBOX_API_KEY` |
| Isochrones (public transport, optional) | Navitia | `VITE_NAVITIA_API_KEY` |
| Address search | Géoplateforme geocoding (IGN) | none |
| Municipalities and contours | geo.api.gouv.fr | none |
| Rents | "Carte des loyers" (ANIL), data.gouv.fr | none |
| Basemap | OpenStreetMap tiles via Leaflet | none |

API keys are embedded in the built JavaScript and are therefore public. Restrict them to the site's URL in the provider's dashboard (Mapbox: token URL restrictions).

### Run locally

Prerequisites: Node.js LTS (22 or later) and a Mapbox token.

1. `cp .env.example .env` and fill in `VITE_MAPBOX_API_KEY`.
2. `npm install`
3. `npm run dev`, then open the URL printed by Vite (the app is served under `/Uni-Chrono/`).

`npm run build` builds the production bundle into `dist/`; `npm run preview` serves it.

### Tests

- `npm test`: unit tests (Vitest) for the geometry, filters, housing and API helpers.
- `npm run test:e2e`: browser tests (Playwright) on the production build, with every external service mocked (`e2e/mocks.ts`). Install the browser once with `npx playwright install chromium`.
- `npm run lint`: ESLint.

### Continuous integration and deployment

- `.github/workflows/ci.yml` runs lint, unit tests, build and browser tests on every pull request.
- `.github/workflows/deploy-pages.yml` runs lint and unit tests, then builds and deploys `main` to GitHub Pages. Set the `VITE_MAPBOX_API_KEY` repository secret.
