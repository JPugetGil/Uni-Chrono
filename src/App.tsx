import { MapContainer, TileLayer, Polygon, Marker } from "react-leaflet";
import './App.css'
import { fetchAllEtablissementsData, fetchIsochroneData } from './dataGouvFetcher';
import { useEffect, useState, Fragment } from 'react';

function App() {
  const [timeInMinutes, setTimeInMinutes] = useState<number>(5);
  const [transportMode, setTransportMode] = useState<'pedestrian' | 'car'>('pedestrian');

  // Etablissements GeoJSON data
  const [etablissementsGeoJSON, setEtablissementsGeoJSON] = useState<any>();
  const [isochrones, setIsochrones] = useState<any>();
  const [controller, setController] = useState(new AbortController());

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
      etablissementsGeoJSON?.forEach(async (etablissement: any) => {
        const isochrone = await fetchIsochroneData(etablissement.coordonnees.lat, etablissement.coordonnees.lon, timeInMinutes * 60, transportMode, signal);
        isochrone.color = etablissement.color;
        setIsochrones((prevIsochrones: any) => [...(prevIsochrones || []), isochrone]);
      });
    };

    fetchData()
      .catch(console.error);
  }, [etablissementsGeoJSON, timeInMinutes, transportMode])

  return (
    <Fragment>
      <div className="App">
        <header className="App-header">
          <h1>Universities or schools in France</h1>
          <p>Displaying isochrones of universities and schools in France</p>
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
          onChange={(e) => setTransportMode(e.target.value as 'pedestrian' | 'car')}
        >
          <option value="car">Car</option>
          <option value="pedestrian">Pedestrian</option>
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
              <Marker key={index} position={etablissement.coordonnees} title={etablissement.uo_lib} alt={etablissement.uo_lib} />
            )
        }
        {
          isochrones && isochrones
            .filter((isochrone: any) => isochrone)
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
