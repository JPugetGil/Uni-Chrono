import { MapContainer, TileLayer, Polygon, Marker } from "react-leaflet";
import './App.css'
import { fetchAllEtablissementsData } from './dataGouvFetcher';
import { fetchIsochroneData } from './mapboxFetcher';
import { useEffect, useState, Fragment } from 'react';
import ProgressBar from './components/ProgressBar';
import TimeSelector from './components/TimeSelector';
import TransportModeSelector from './components/TransportModeSelector';
import Card from './design-system/Card';
import Typography from './design-system/Typography';
import { Isochrone } from './types/isochrone';
import { Etablissement } from './types/etablissement';

import LocalStorageCache from './LocalStorageCache';

function App() {
  // TTL par défaut pour le cache: 24 heures
  const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

  const [timeInMinutes, setTimeInMinutes] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('timeInMinutes');
      const n = saved ? Number(saved) : NaN;
      return Number.isFinite(n) && n > 0 ? n : 15;
    } catch {
      return 15;
    }
  });
  const [transportMode, setTransportMode] = useState<'walking' | 'cycling' | 'driving-traffic' | 'driving'>(() => {
    try {
      const saved = localStorage.getItem('transportMode');
      const allowed = new Set(['walking', 'cycling', 'driving-traffic', 'driving']);
      return saved && allowed.has(saved) ? (saved as 'walking' | 'cycling' | 'driving-traffic' | 'driving') : 'walking';
    } catch {
      return 'walking';
    }
  });

  const [loadedFromCache, setLoadedFromCache] = useState<boolean>(false);
  const [cacheTimestampTitle, setCacheTimestampTitle] = useState<string>('');

  // Initialisation depuis le cache localStorage si disponible
  const [etablissementsGeoJSON, setEtablissementsGeoJSON] = useState<Etablissement[] | undefined>(() => {
    const cached = LocalStorageCache.loadEtablissements();
    return cached || undefined;
  });
  // Clé de cache isochrones dépendante du mode et du temps
  const cacheKey = `${transportMode}:${timeInMinutes}`;
  const [isochrones, setIsochrones] = useState<Isochrone[]>(() => {
    const cached = LocalStorageCache.loadIsochrones(cacheKey);
    return cached || [];
  });
  const [controller, setController] = useState(new AbortController());
  // Track which marker is hovered (by index)
  const [hoveredMarkerIndex, setHoveredMarkerIndex] = useState<number | null>(null);

  useEffect(() => {
    // Si déjà en cache, ne pas refetch
    if (etablissementsGeoJSON && etablissementsGeoJSON.length > 0) return;
    const fetchData = async () => {
      const cachedEntry = LocalStorageCache.loadEtablissementsEntry(DEFAULT_TTL_MS);
      if (cachedEntry && cachedEntry.data.length > 0) {
        setEtablissementsGeoJSON(cachedEntry.data);
        setLoadedFromCache(true);
        setCacheTimestampTitle(`Étab. mis en cache: ${new Date(cachedEntry.ts).toLocaleString()}`);
        return;
      }
      const data = await fetchAllEtablissementsData();
      setEtablissementsGeoJSON(data);
      LocalStorageCache.saveEtablissements(data);
      setLoadedFromCache(false);
    };
    fetchData().catch(console.error);
  });

  // Persister les préférences utilisateur (temps et mode) dans le localStorage
  useEffect(() => {
    try {
      localStorage.setItem('timeInMinutes', String(timeInMinutes));
    } catch {
      // ignore
    }
  }, [timeInMinutes]);

  useEffect(() => {
    try {
      localStorage.setItem('transportMode', transportMode);
    } catch {
      // ignore
    }
  }, [transportMode]);

  useEffect(() => {
    controller.abort();

    // D'abord essayer de charger depuis le cache pour cette config (mode+temps)
    const cachedEntry = LocalStorageCache.loadIsochronesEntry(cacheKey, DEFAULT_TTL_MS);
    if (cachedEntry && cachedEntry.data.length > 0) {
      setIsochrones(cachedEntry.data);
      setLoadedFromCache(true);
      setCacheTimestampTitle(`Isochrones mis en cache: ${new Date(cachedEntry.ts).toLocaleString()}`);
      return; // Pas besoin de refetch
    }

    // Pas de cache: reset l'état et le cache puis fetch
    setIsochrones([]);
    LocalStorageCache.saveIsochrones([], cacheKey);
    const cont = new AbortController();
    setController(cont);
    const signal = cont.signal;

    const fetchData = async () => {
      if (!etablissementsGeoJSON) return;

      for (const etablissement of etablissementsGeoJSON) {
        if (signal.aborted) break;
        try {
          const coordinates = await fetchIsochroneData(
            etablissement.coordonnees.lat,
            etablissement.coordonnees.lon,
            timeInMinutes * 60,
            transportMode,
            signal
          );
          if (!coordinates || coordinates.length === 0) continue;
          const isochrone: Isochrone = {
            coordinates,
            color: etablissement.color || '#000000',
          };
          setIsochrones((prevIsochrones) => {
            const updated = [...prevIsochrones, isochrone];
            LocalStorageCache.saveIsochrones(updated, cacheKey);
            return updated;
          });
        } catch {
          // ignore individual fetch errors (including abort)
        }
      }
      setLoadedFromCache(false);
    };

    fetchData().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etablissementsGeoJSON, timeInMinutes, transportMode]);

  // Compute percentage of resolved isochrones
  const total = etablissementsGeoJSON?.length || 0;
  const resolved = isochrones?.length || 0;
  const percent = total > 0 ? Math.round((resolved / total) * 100) : 0;

  return (
    <Fragment>
      <div>
        <Card>
          <div style={{ display: 'flex', flexDirection: 'row', gap: 32, alignItems: 'stretch', flexWrap: 'wrap' }}>
            {/* Left column: title and description */}
            <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography variant="h1">Universities or schools in France</Typography>
              <Typography variant="body">Displaying isochrones of universities and schools in France.</Typography>
            </div>
            {/* Right column: progress bar and configuration */}
            <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16 }}>
              <div style={{ marginBottom: 8, display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                {total > 0 && (
                  <ProgressBar percent={percent} resolved={resolved} total={total} />
                )}
                {loadedFromCache && (
                  <span title={cacheTimestampTitle} style={{ marginLeft: 12, padding: '2px 8px', background: '#eef6ff', color: '#1e5bb8', borderRadius: 12, fontSize: 12, whiteSpace: 'nowrap' }}>
                    Loaded from cache
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                <TimeSelector value={timeInMinutes} onChange={setTimeInMinutes} />
                <TransportModeSelector value={transportMode} onChange={v => setTransportMode(v as typeof transportMode)} />
              </div>
            </div>
          </div>
        </Card>
      </div>
      <MapContainer
        center={[46.603354, 1.888334]}
        zoom={6}
        style={{ flexGrow: 1 }}
      >
        {
          etablissementsGeoJSON && etablissementsGeoJSON
            .map((etablissement, index: number) =>
              <Marker
                key={index}
                position={[etablissement.coordonnees.lat, etablissement.coordonnees.lon]}
                title={etablissement.uo_lib}
                alt={etablissement.uo_lib}
                eventHandlers={{
                  mouseover: () => setHoveredMarkerIndex(index),
                  mouseout: () => setHoveredMarkerIndex(null),
                }}
              />
            )
        }
        {
          isochrones && isochrones
            .filter((_isochrone, index: number) => {
              // If hovering, only show the linked isochrone
              if (hoveredMarkerIndex !== null) {
                return index === hoveredMarkerIndex;
              }
              return true;
            })
            .map((isochrone: Isochrone, index: number) =>
              <Polygon key={index} positions={isochrone.coordinates} color={isochrone.color} />
            )
        }
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
      </MapContainer>
    </Fragment>
  );
}


export default App
