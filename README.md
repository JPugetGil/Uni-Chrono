## Uni-Chrono

Uni-Chrono is a web application for visualizing isochrones for higher-education institutions in France. It displays universities/schools on a map, and for each one a polygon representing the area reachable in X minutes for a given mode of transport.

**🌍 Available in French and English** - The application supports internationalization (i18n) with language switching between French and English.

### What the application does

- Fetches the list of higher-education institutions (France) from the MESR open data platform.
- Displays each institution as a marker on a map (OpenStreetMap via Leaflet).
- Computes and draws, for each institution, an isochrone (reachable area) based on:
  - the selected time (in minutes),
  - the mode of transport (walking, cycling, driving).
- Updates the map live when you change the time or transport mode.
- Shows a progress bar indicating how many isochrones have been computed out of the total.
- Caches institutions and isochrones in local storage (localStorage) to speed up subsequent loads. (1 hour expiration)
- Provides a filter panel to search institutions by name, type, region, department, or commune.
- **Supports language switching (FR/EN)** with automatic browser language detection and localStorage persistence.

### Data and services used

- Institutions data: dataset "fr-esr-principaux-etablissements-enseignement-superieur" (data.enseignementsup-recherche.gouv.fr), filtered to France.
- Isochrone computation: Mapbox Isochrone API (supported profiles: walking, cycling, driving). A Mapbox token (VITE_MAPBOX_API_KEY) is required.
- Basemap: OpenStreetMap tiles, rendered via React-Leaflet.

## Start the project (How to run)

Prerequisites:
- Node.js LTS (18+ recommended)
- A valid Mapbox token for the Isochrone API

Environment setup:
1. Create a `.env` file at the project root (or `.env.local`) and add your key: `VITE_MAPBOX_API_KEY=pk.XXXXXXXXXXXX`
2. Check `vite.config.ts`: the field `base: '/Uni-Chrono/'` is suited for GitHub Pages deployment under the `Uni-Chrono` repo. Locally, it works as is.

Install and run locally:
1. Install dependencies: `npm install`
2. Start the development server: `npm run dev`
3. Open the URL printed by Vite (typically http://localhost:5173).

Production build and preview:
1. Build the project: `npm run build`
2. Preview the build: `npm run preview`
