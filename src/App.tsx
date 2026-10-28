import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { CircleHelp, MapPin, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import MapView from './components/MapView';
import MapStatus from './components/MapStatus';
import SearchBox from './components/SearchBox';
import ExplorePanel from './components/ExplorePanel';
import EtablissementDetails from './components/EtablissementDetails';
import TravelSettings from './components/TravelSettings';
import BottomSheet, { SheetSnap } from './components/BottomSheet';
import Brand from './components/Brand';
import LanguageSwitcher from './components/LanguageSwitcher';
import { CategoryDot } from './components/Legend';
import { FocusTarget, MapInsets } from './components/MapFocus';
import { ZoneStatus } from './components/ZoneSummary';
import IconButton from './design-system/IconButton';
import Chip from './design-system/Chip';
import { useEtablissements } from './hooks/useEtablissements';
import { useIsochrones } from './hooks/useIsochrones';
import { useTransitIsochrone } from './hooks/useTransitIsochrone';
import { useUserPreferences } from './hooks/useUserPreferences';
import { useDocumentTitle } from './hooks/useDocumentTitle';
import { useMediaQuery, useViewportHeight } from './hooks/useMediaQuery';
import { usePersistentFlag } from './hooks/usePersistentFlag';
import { useFormatters } from './i18n/useFormatters';
import { Place } from './geocodingFetcher';
import { Etablissement, getEtablissementName } from './types/etablissement';
import { Filters, etabId, matchesFilters } from './utils/filters';
import { boundsOf } from './utils/geo';

/** Largeur du panneau latéral (bureau) et marge autour */
const PANEL_WIDTH = 380;
const PANEL_GAP = 12;
/** Mobile : hauteur occupée par la barre de recherche, avec et sans puces dessous */
const SEARCH_BAR_INSET = 64;
const SEARCH_BAR_WITH_CHIPS_INSET = 100;

const etabsBounds = (etabs: Etablissement[]) =>
  boundsOf(etabs.map((e) => [e.coordonnees.lat, e.coordonnees.lon] as [number, number]));

function App() {
  useDocumentTitle();
  const { t } = useTranslation();
  const fmt = useFormatters();
  const isMobile = useMediaQuery('(max-width: 767px)');
  const viewportHeight = useViewportHeight();

  const { timeInMinutes, setTimeInMinutes, transportMode, setTransportMode } = useUserPreferences();
  const { etablissementsGeoJSON: etablissements, status: etabStatus, loaded, total, retry } = useEtablissements();
  const { isochrones, requestIsochrones, statusById, pendingCount, batchTotal, batchFailed } = useIsochrones(timeInMinutes, transportMode);

  // Établissement survolé (marqueur) et sélectionné (clic, recherche)
  const [hoveredEtabId, setHoveredEtabId] = useState<string | null>(null);
  const [selectedEtabId, setSelectedEtabId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({});
  // Cadrage demandé par la recherche ou un filtre géographique
  const [focusTarget, setFocusTarget] = useState<FocusTarget | null>(null);
  // Adresse choisie dans la recherche
  const [place, setPlace] = useState<Place | null>(null);
  // Commune mise en évidence depuis la liste des loyers
  const [hoveredCommune, setHoveredCommune] = useState<string | null>(null);
  const [pinnedCommune, setPinnedCommune] = useState<string | null>(null);
  const [panelCollapsed, setPanelCollapsed] = usePersistentFlag('panelCollapsed', false);
  const [onboardingDone, setOnboardingDone] = usePersistentFlag('onboardingDone', false);
  const [sheetSnap, setSheetSnap] = useState<SheetSnap>('collapsed');

  const filteredEtablissements = useMemo(
    () => (etablissements ?? []).filter((e) => matchesFilters(e, filters)),
    [etablissements, filters]
  );

  // Mode transit (Navitia) : isochrone calculée à la demande pour la sélection
  const isTransit = transportMode === 'transit';
  const selectedEtab = useMemo(
    () => (selectedEtabId ? etablissements?.find((e) => etabId(e) === selectedEtabId) ?? null : null),
    [etablissements, selectedEtabId]
  );
  const transit = useTransitIsochrone(selectedEtab, timeInMinutes, isTransit);
  const displayedIsochrones = useMemo(
    () => (isTransit ? (transit.isochrone ? [transit.isochrone] : []) : isochrones),
    [isTransit, transit.isochrone, isochrones]
  );

  // La sélection d'un établissement déclenche le calcul de son isochrone si absente
  useEffect(() => {
    if (selectedEtab && !isTransit) requestIsochrones([selectedEtab]);
  }, [selectedEtab, isTransit, requestIsochrones]);

  const selectedIsochrone = selectedEtabId
    ? displayedIsochrones.find((iso) => iso.etablissementId === selectedEtabId) ?? null
    : null;
  const zoneStatus: ZoneStatus =
    selectedIsochrone && selectedIsochrone.coordinates.length > 0
      ? 'ready'
      : selectedIsochrone || (isTransit ? transit.failed : selectedEtabId && statusById[selectedEtabId] === 'error')
        ? 'error'
        : 'pending';

  const selectEtab = useCallback(
    (id: string | null) => {
      setSelectedEtabId(id);
      setHoveredCommune(null);
      setPinnedCommune(null);
      if (id) setPanelCollapsed(false);
      if (isMobile) setSheetSnap(id ? 'half' : 'collapsed');
    },
    [isMobile, setPanelCollapsed]
  );

  // Échap ferme la fiche
  useEffect(() => {
    if (!selectedEtabId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) selectEtab(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedEtabId, selectEtab]);

  // Filtre géographique modifié : la carte cadre les établissements retenus
  const changeFilters = (next: Filters) => {
    const geoChanged =
      next.region !== filters.region || next.departement !== filters.departement || next.commune !== filters.commune;
    setFilters(next);
    if (geoChanged && etablissements && (next.region || next.departement || next.commune)) {
      const bounds = etabsBounds(etablissements.filter((e) => matchesFilters(e, next)));
      if (bounds) setFocusTarget({ bounds, maxZoom: 13 });
    }
  };

  const selectCity = (cityEtabs: Etablissement[]) => {
    const bounds = etabsBounds(cityEtabs);
    if (bounds) setFocusTarget({ bounds, maxZoom: 14 });
  };

  const selectPlace = (p: Place) => {
    selectEtab(null);
    setPlace(p);
    const maxZoom = p.kind === 'municipality' ? 13 : p.kind === 'housenumber' ? 16 : 15;
    setFocusTarget({ bounds: [[p.lat, p.lon], [p.lat, p.lon]], maxZoom });
  };

  // Marges des panneaux posés sur la carte : cadrages, contrôles, pastilles
  const hasChips = !!filters.name || !!place;
  const sheetHeights = useMemo(
    () => ({
      collapsed: 68,
      half: Math.round(viewportHeight * 0.46),
      full: viewportHeight - (hasChips ? SEARCH_BAR_WITH_CHIPS_INSET : SEARCH_BAR_INSET),
    }),
    [viewportHeight, hasChips]
  );
  const insets: MapInsets = useMemo(
    () =>
      isMobile
        ? { top: hasChips ? SEARCH_BAR_WITH_CHIPS_INSET : SEARCH_BAR_INSET, right: 0, bottom: sheetHeights[sheetSnap], left: 0 }
        : { top: 0, right: 48, bottom: 0, left: panelCollapsed ? 0 : PANEL_WIDTH + PANEL_GAP },
    [isMobile, hasChips, sheetHeights, sheetSnap, panelCollapsed]
  );
  const cssVars = {
    '--inset-left': `${insets.left}px`,
    '--inset-top': `${insets.top}px`,
    '--sheet-offset': `${insets.bottom}px`,
  } as React.CSSProperties;

  const searchArea = (
    <div className="flex flex-col gap-2">
      <SearchBox
        etablissements={etablissements}
        onSelectEtab={selectEtab}
        onSelectCity={selectCity}
        onSelectPlace={selectPlace}
        onApplyNameFilter={(name) => setFilters((f) => ({ ...f, name }))}
      />
      {hasChips && (
        <div className="flex flex-wrap gap-1.5">
          {filters.name && (
            <Chip
              label={t('search.nameFilter', { name: filters.name })}
              removeLabel={t('search.removeNameFilter')}
              onRemove={() => setFilters((f) => ({ ...f, name: undefined }))}
            />
          )}
          {place && (
            <Chip
              icon={<MapPin aria-hidden className="size-3.5 shrink-0" />}
              label={place.label}
              removeLabel={t('search.removePlace')}
              onRemove={() => setPlace(null)}
            />
          )}
        </div>
      )}
    </div>
  );

  const travelSettings = (
    <TravelSettings
      timeInMinutes={timeInMinutes}
      onTimeChange={setTimeInMinutes}
      transportMode={transportMode}
      onTransportModeChange={setTransportMode}
    />
  );

  const panelContent = selectedEtab ? (
    <EtablissementDetails
      key={selectedEtabId}
      etablissement={selectedEtab}
      isochrone={selectedIsochrone}
      zoneStatus={zoneStatus}
      onRetryZone={isTransit ? undefined : () => requestIsochrones([selectedEtab])}
      transportMode={transportMode}
      timeInMinutes={timeInMinutes}
      onClose={() => selectEtab(null)}
      pinnedCommune={pinnedCommune}
      onPinCommune={setPinnedCommune}
      onHoverCommune={setHoveredCommune}
      travelSettings={travelSettings}
    />
  ) : (
    <ExplorePanel
      showBrand={isMobile}
      onboardingVisible={!onboardingDone}
      onDismissOnboarding={() => setOnboardingDone(true)}
      onShowHelp={() => setOnboardingDone(false)}
      travelSettings={travelSettings}
      etablissements={etablissements}
      filteredEtablissements={filteredEtablissements}
      filters={filters}
      onFiltersChange={changeFilters}
      onFiltersReset={() => changeFilters({ name: filters.name })}
    />
  );

  return (
    <div className="relative h-dvh w-full overflow-hidden" style={cssVars}>
      <MapView
        etablissements={etablissements ?? []}
        filteredEtablissements={filteredEtablissements}
        isochrones={displayedIsochrones}
        filters={filters}
        transportMode={transportMode}
        hoveredEtabId={hoveredEtabId}
        selectedEtab={selectedEtab}
        onHoverEtab={setHoveredEtabId}
        onSelectEtab={selectEtab}
        // Volet plein écran (mobile) : la pastille de calcul n'aurait plus de place
        onRequestIsochrones={isTransit || (isMobile && sheetSnap === 'full') ? undefined : requestIsochrones}
        isochronesPending={pendingCount}
        isochronesBatchTotal={batchTotal}
        isochronesBatchFailed={batchFailed}
        focusTarget={focusTarget}
        insets={insets}
        place={place}
        highlightedCommune={hoveredCommune ?? pinnedCommune}
        showZoomControl={!isMobile}
      />

      <MapStatus status={etabStatus} loaded={loaded} total={total} onRetry={retry} />

      {isMobile ? (
        <>
          <div className="absolute inset-x-3 top-3 z-[1150]">{searchArea}</div>
          <BottomSheet
            snap={sheetSnap}
            onSnapChange={setSheetSnap}
            heights={sheetHeights}
            label={selectedEtab ? t('details.sheet') : t('app.name')}
            header={
              selectedEtab ? (
                <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <CategoryDot color={selectedEtab.color || '#898781'} className="size-3" />
                  <span className="truncate">{getEtablissementName(selectedEtab)}</span>
                </p>
              ) : (
                <p className="truncate text-sm font-semibold text-slate-900">
                  {t('panel.summary', {
                    time: timeInMinutes,
                    mode: t(`transport.by_${transportMode}`),
                    total: fmt.integer(filteredEtablissements.length),
                  })}
                </p>
              )
            }
          >
            {panelContent}
          </BottomSheet>
        </>
      ) : (
        <aside
          aria-label={t('app.name')}
          className="absolute top-3 left-3 z-[1100] flex max-h-[calc(100%-1.5rem)] flex-col rounded-2xl bg-white shadow-xl ring-1 ring-slate-900/10"
          style={{ width: PANEL_WIDTH }}
        >
          <div className="flex items-center gap-1 px-4 pt-3">
            <Brand />
            <div className="ml-auto flex items-center gap-0.5">
              <LanguageSwitcher />
              {onboardingDone && (
                <IconButton
                  label={t('panel.help')}
                  size="sm"
                  onClick={() => {
                    setOnboardingDone(false);
                    setPanelCollapsed(false);
                    selectEtab(null);
                  }}
                >
                  <CircleHelp aria-hidden className="size-5" />
                </IconButton>
              )}
              <IconButton
                label={panelCollapsed ? t('panel.expand') : t('panel.collapse')}
                aria-expanded={!panelCollapsed}
                size="sm"
                onClick={() => setPanelCollapsed(!panelCollapsed)}
              >
                {panelCollapsed ? (
                  <PanelLeftOpen aria-hidden className="size-5" />
                ) : (
                  <PanelLeftClose aria-hidden className="size-5" />
                )}
              </IconButton>
            </div>
          </div>
          <div className="p-3">{searchArea}</div>
          {!panelCollapsed && (
            <div className="min-h-0 flex-1 overflow-y-auto rounded-b-2xl border-t border-slate-200 px-4 py-4">
              {panelContent}
            </div>
          )}
        </aside>
      )}
    </div>
  );
}

export default App;
