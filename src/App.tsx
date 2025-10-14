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


function App() {
  const [timeInMinutes, setTimeInMinutes] = useState<number>(15);
  const [transportMode, setTransportMode] = useState<'walking' | 'cycling' | 'driving-traffic' | 'driving'>('walking');

  // Etablissements GeoJSON data
  const [etablissementsGeoJSON, setEtablissementsGeoJSON] = useState<any>();
  const [isochrones, setIsochrones] = useState<any>();
  const [controller, setController] = useState(new AbortController());
  // Track which marker is hovered (by index)
  const [hoveredMarkerIndex, setHoveredMarkerIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const data = await fetchAllEtablissementsData();
      setEtablissementsGeoJSON(data);
    };

    fetchData()
      .catch(console.error);
  }, [])

  useEffect(() => {
    controller.abort();
    setIsochrones([]);
    const cont = new AbortController();
    setController(cont);
    const signal = cont.signal;

    const fetchData = async () => {
      if (!etablissementsGeoJSON) return

      for (const etablissement of etablissementsGeoJSON) {
        if (signal.aborted) break
        try {
          const isochrone = await fetchIsochroneData(etablissement.coordonnees.lat, etablissement.coordonnees.lon, timeInMinutes * 60, transportMode, signal);
          if (!isochrone) continue
          isochrone.color = etablissement.color;
          setIsochrones((prevIsochrones: any) => [...(prevIsochrones || []), isochrone]);
        } catch (err) {
          // ignore individual fetch errors (including abort)
          // console.error(err)
        }
      }
    };

    fetchData()
      .catch(console.error);
  }, [etablissementsGeoJSON, timeInMinutes, transportMode])

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
              <div style={{ marginBottom: 8 }}>
                {total > 0 && (
                  <ProgressBar percent={percent} resolved={resolved} total={total} />
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'row', gap: 16, alignItems: 'center' }}>
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
            .map((etablissement: any, index: number) =>
              <Marker
                key={index}
                position={etablissement.coordonnees}
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
            .filter((_: any, index: number) => {
              // If hovering, only show the linked isochrone
              if (hoveredMarkerIndex !== null) {
                return index === hoveredMarkerIndex;
              }
              return true;
            })
            .map((isochrone: any, index: number) =>
              <Polygon key={index} positions={isochrone} color={isochrone.color} />
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
