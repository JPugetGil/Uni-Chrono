import './App.css'
import { useState, useEffect, Fragment } from 'react';
import HeaderCard from './components/HeaderCard';
import MapView from './components/MapView';
import EtablissementModal from './components/EtablissementModal';
import { Filters } from './components/FilterPanel';
import { useEtablissements } from './hooks/useEtablissements';
import { useIsochrones } from './hooks/useIsochrones';
import { useTransitIsochrone } from './hooks/useTransitIsochrone';
import { useUserPreferences } from './hooks/useUserPreferences';
import { useDocumentTitle } from './hooks/useDocumentTitle';

function App() {
  useDocumentTitle();

  const { timeInMinutes, setTimeInMinutes, transportMode, setTransportMode } = useUserPreferences();
  const { etablissementsGeoJSON } = useEtablissements();
  const { isochrones, requestIsochrones, pendingCount, batchTotal } = useIsochrones(timeInMinutes, transportMode);

  // Track which marker is hovered (by etablissementId)
  const [hoveredEtabId, setHoveredEtabId] = useState<string | null>(null);
  // Track selected etablissement (click)
  const [selectedEtabId, setSelectedEtabId] = useState<string | null>(null);
  // Filters state
  const [filters, setFilters] = useState<Filters>({});

  // Mode transit (Navitia) : isochrone calculée à la demande pour la sélection
  const isTransit = transportMode === 'transit';
  const selectedEtab = selectedEtabId
    ? etablissementsGeoJSON?.find(x => (x.uai || `${x.coordonnees.lat},${x.coordonnees.lon}`) === selectedEtabId) || null
    : null;
  const { isochrone: transitIsochrone } = useTransitIsochrone(selectedEtab, timeInMinutes, isTransit);
  const displayedIsochrones = isTransit ? (transitIsochrone ? [transitIsochrone] : []) : isochrones;

  // La sélection d'un pin déclenche le calcul de son isochrone si absente
  useEffect(() => {
    if (selectedEtab && !isTransit) requestIsochrones([selectedEtab]);
  }, [selectedEtab, isTransit, requestIsochrones]);

  return (
    <Fragment>
      <div>
        <HeaderCard
          showOnDemandHint={!isTransit && displayedIsochrones.length === 0}
          timeInMinutes={timeInMinutes}
          onTimeChange={setTimeInMinutes}
          transportMode={transportMode}
          onTransportModeChange={setTransportMode}
          etablissements={etablissementsGeoJSON}
          filters={filters}
          onFiltersChange={setFilters}
          onFiltersReset={() => setFilters({})}
        />
      </div>
      <MapView
        etablissements={etablissementsGeoJSON || []}
        isochrones={displayedIsochrones}
        filters={filters}
        transportMode={transportMode}
        hoveredEtabId={hoveredEtabId}
        selectedEtabId={selectedEtabId}
        onHoverEtab={setHoveredEtabId}
        onSelectEtab={setSelectedEtabId}
        onRequestIsochrones={isTransit ? undefined : requestIsochrones}
        isochronesPending={pendingCount}
        isochronesBatchTotal={batchTotal}
      />

      <EtablissementModal
        selectedEtabId={selectedEtabId}
        etablissements={etablissementsGeoJSON || []}
        isochrones={displayedIsochrones}
        transportMode={transportMode}
        timeInMinutes={timeInMinutes}
        onClose={() => setSelectedEtabId(null)}
      />
    </Fragment>
  );
}


export default App
