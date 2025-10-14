import { MapContainer, TileLayer, Polygon, Marker } from "react-leaflet";
import './App.css'
import { fetchAllEtablissementsData } from './dataGouvFetcher';
import { fetchIsochroneData } from './mapboxFetcher';
import { useEffect, useState, Fragment } from 'react';
import ProgressBar from './ProgressBar';


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
      <div className="App">
        <header>
          <h1>Universities or schools in France</h1>
          <div style={{ width: "100%", maxWidth: 480, margin: "1em auto" }}>
            <p>Displaying isochrones of universities and schools in France.</p>
            {total > 0 && (
              <ProgressBar percent={percent} resolved={resolved} total={total} />
            )}
          </div>
        </header>
        <label>Time in minutes:</label>
        <input
          type="number"
          min="1"
          max="60"
          value={timeInMinutes}
          onChange={(e) => setTimeInMinutes(parseInt(e.target.value))}
        />
        <label>Transport mode:</label>
        <select
          value={transportMode}
          onChange={(e) => setTransportMode(e.target.value as 'walking' | 'cycling' | 'driving-traffic' | 'driving')}
        >
          <option value="driving">Driving</option>
          <option value="walking">Walking</option>
          <option value="cycling">Cycling</option>
          <option value="driving-traffic">Driving (Traffic)</option>
        </select>
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
