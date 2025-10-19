import './App.css'
import { useState, Fragment } from 'react';
import HeaderCard from './components/HeaderCard';
import MapView from './components/MapView';
import EtablissementModal from './components/EtablissementModal';
import { Filters } from './components/FilterPanel';
import { useEtablissements } from './hooks/useEtablissements';
import { useIsochrones } from './hooks/useIsochrones';
import { useUserPreferences } from './hooks/useUserPreferences';
import { useDocumentTitle } from './hooks/useDocumentTitle';

function App() {
  useDocumentTitle();

  const { timeInMinutes, setTimeInMinutes, transportMode, setTransportMode } = useUserPreferences();
  const { etablissementsGeoJSON, loadedFromCache: etabFromCache, cacheTimestampTitle: etabCacheTitle } = useEtablissements();
  const { isochrones, loadedFromCache: isoFromCache, cacheTimestampTitle: isoCacheTitle } = useIsochrones(
    etablissementsGeoJSON,
    timeInMinutes,
    transportMode
  );

  // Track which marker is hovered (by etablissementId)
  const [hoveredEtabId, setHoveredEtabId] = useState<string | null>(null);
  // Track selected etablissement (click)
  const [selectedEtabId, setSelectedEtabId] = useState<string | null>(null);
  // Filters state
  const [filters, setFilters] = useState<Filters>({});
  const loadedFromCache = isoFromCache || etabFromCache;
  const cacheTimestampTitle = isoFromCache ? isoCacheTitle : etabCacheTitle;
  const total = etablissementsGeoJSON?.length || 0;
  const resolved = isochrones?.length || 0;
  const percent = total > 0 ? Math.round((resolved / total) * 100) : 0;

  return (
    <Fragment>
      <div>
        <HeaderCard
          total={total}
          resolved={resolved}
          percent={percent}
          loadedFromCache={loadedFromCache}
          cacheTimestampTitle={cacheTimestampTitle}
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
        isochrones={isochrones}
        filters={filters}
        hoveredEtabId={hoveredEtabId}
        selectedEtabId={selectedEtabId}
        onHoverEtab={setHoveredEtabId}
        onSelectEtab={setSelectedEtabId}
      />

      <EtablissementModal
        selectedEtabId={selectedEtabId}
        etablissements={etablissementsGeoJSON || []}
        isochrones={isochrones}
        transportMode={transportMode}
        timeInMinutes={timeInMinutes}
        onClose={() => setSelectedEtabId(null)}
      />
    </Fragment>
  );
}


export default App
