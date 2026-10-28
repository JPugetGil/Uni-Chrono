import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { CircleHelp, GraduationCap, MapPin, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
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
import { useZone } from './hooks/useZone';
import { useUserPreferences } from './hooks/useUserPreferences';
import { useDocumentTitle } from './hooks/useDocumentTitle';
import { useMediaQuery, useViewportHeight } from './hooks/useMediaQuery';
import { usePersistentFlag } from './hooks/usePersistentFlag';
import { useFormatters } from './i18n/useFormatters';
import { Place } from './geocodingFetcher';
import { Etablissement } from './types/etablissement';
import { Filters, etabId, matchesFilters } from './utils/filters';
import { boundsOf } from './utils/geo';
import { PROVIDER_NAMES, availableModes, zoneProviderFor } from './isochroneProvider';
import { parseUrlState, serializeUrlState } from './utils/urlState';
import { reachableEtablissements } from './utils/reachable';
import OriginPanel from './components/OriginPanel';
import FavoritesSection from './components/FavoritesSection';
import FavoriteButton from './components/FavoriteButton';
import CompareView from './components/CompareView';
import { MAX_FAVORITES, useFavorites } from './hooks/useFavorites';
import { useZones } from './hooks/useZones';
import { colors } from './design-system/tokens';

/** Largeur du panneau latéral (bureau) et marge autour */
const PANEL_WIDTH = 380;
const PANEL_GAP = 12;
/** Mobile : hauteur occupée par la barre de recherche, avec et sans puces dessous */
const SEARCH_BAR_INSET = 64;
const SEARCH_BAR_WITH_CHIPS_INSET = 100;

/** Couleurs des favoris comparés : les quatre premières teintes de la palette catégorielle */
const COMPARE_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100'];

const etabsBounds = (etabs: Etablissement[]) =>
  boundsOf(etabs.map((e) => [e.coordonnees.lat, e.coordonnees.lon] as [number, number]));

function App() {
  useDocumentTitle();
  const { t } = useTranslation();
  const fmt = useFormatters();
  const isMobile = useMediaQuery('(max-width: 767px)');
  const viewportHeight = useViewportHeight();

  // Lien partagé : établissement, trajet et filtres lus une fois dans l'URL
  const [initialUrl] = useState(() => parseUrlState(window.location.search, availableModes()));
  const { timeInMinutes, setTimeInMinutes, transportMode, setTransportMode } = useUserPreferences(initialUrl);
  const { etablissementsGeoJSON: etablissements, status: etabStatus, retry } = useEtablissements();

  // Établissement sélectionné (clic, recherche)
  const [selectedEtabId, setSelectedEtabId] = useState<string | null>(initialUrl.etab ?? null);
  const [filters, setFilters] = useState<Filters>(initialUrl.filters);
  // Cadrage demandé par la recherche ou un filtre géographique
  const [focusTarget, setFocusTarget] = useState<FocusTarget | null>(null);
  // Adresse choisie dans la recherche
  const [place, setPlace] = useState<Place | null>(() =>
    initialUrl.origin ? { id: 'url', context: '', kind: 'housenumber', ...initialUrl.origin } : null
  );
  // Calcul des établissements accessibles depuis ce point, demandé explicitement
  const [originActive, setOriginActive] = useState(!!initialUrl.origin);
  const [reachableOnly, setReachableOnly] = useState(true);
  // Commune mise en évidence depuis la liste des loyers
  const [hoveredCommune, setHoveredCommune] = useState<string | null>(null);
  const [pinnedCommune, setPinnedCommune] = useState<string | null>(null);
  const [panelCollapsed, setPanelCollapsed] = usePersistentFlag('panelCollapsed', false);
  const [onboardingDone, setOnboardingDone] = usePersistentFlag('onboardingDone', false);
  // Favoris et leur comparaison
  const favorites = useFavorites();
  const [compareOpen, setCompareOpen] = useState(false);
  const [sheetSnap, setSheetSnap] = useState<SheetSnap>(initialUrl.etab ? 'half' : 'collapsed');

  // L'URL suit l'état : copier l'adresse suffit à partager une fiche et ses réglages
  useEffect(() => {
    const query = serializeUrlState({
      etab: selectedEtabId ?? undefined,
      origin: place && originActive ? { lat: place.lat, lon: place.lon, label: place.label } : undefined,
      mode: transportMode,
      duree: timeInMinutes,
      filters,
    });
    if (query !== window.location.search) {
      window.history.replaceState(null, '', `${window.location.pathname}${query}${window.location.hash}`);
    }
  }, [selectedEtabId, place, originActive, transportMode, timeInMinutes, filters]);

  const filteredEtablissements = useMemo(
    () => (etablissements ?? []).filter((e) => matchesFilters(e, filters)),
    [etablissements, filters]
  );

  const selectedEtab = useMemo(
    () => (selectedEtabId ? etablissements?.find((e) => etabId(e) === selectedEtabId) ?? null : null),
    [etablissements, selectedEtabId]
  );

  // Service d'isochrones du mode choisi : IGN (marche, voiture) ou Geoapify (vélo, transports)
  const providerName = PROVIDER_NAMES[zoneProviderFor(transportMode)];

  // Zone de l'établissement ouvert, calculée à l'ouverture de sa fiche
  const selectedZone = useZone(selectedEtab?.coordonnees ?? null, timeInMinutes, transportMode, {
    color: selectedEtab?.color || '#2a78d6',
    etablissementId: selectedEtabId ?? undefined,
  });

  // Établissements accessibles depuis le point de départ (adresse, position), sur demande
  const origin = useMemo(() => (place ? { lat: place.lat, lon: place.lon } : null), [place]);
  const originZone = useZone(origin, timeInMinutes, transportMode, { enabled: originActive, color: colors.origin });
  const reachable = useMemo(
    () => (originZone.isochrone && origin ? reachableEtablissements(filteredEtablissements, originZone.isochrone, origin) : null),
    [originZone.isochrone, origin, filteredEtablissements]
  );
  const mapEtablissements = useMemo(
    () => (reachable && reachableOnly ? reachable.map((r) => r.etablissement) : filteredEtablissements),
    [reachable, reachableOnly, filteredEtablissements]
  );

  const selectedIsochrone = selectedZone.isochrone;
  const zoneError = selectedZone.error;
  const zoneStatus: ZoneStatus = selectedIsochrone ? 'ready' : zoneError ? 'error' : 'pending';

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
    setOriginActive(false);
    const maxZoom = p.kind === 'municipality' ? 13 : p.kind === 'housenumber' ? 16 : 15;
    // Point de départ : le volet s'ouvre sur le panneau « depuis ce point »
    if (isMobile) setSheetSnap('half');
    setFocusTarget({ bounds: [[p.lat, p.lon], [p.lat, p.lon]], maxZoom });
  };

  // Marges des panneaux posés sur la carte : cadrages, contrôles, pastilles
  const hasChips = !!filters.name || !!filters.filiere || !!place;
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
        onApplyFiliere={(filiere) => setFilters((f) => ({ ...f, filiere }))}
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
          {filters.filiere && (
            <Chip
              icon={<GraduationCap aria-hidden className="size-3.5 shrink-0" />}
              label={filters.filiere}
              removeLabel={t('search.removeFiliere')}
              onRemove={() => setFilters((f) => ({ ...f, filiere: undefined }))}
            />
          )}
          {place && (
            <Chip
              icon={<MapPin aria-hidden className="size-3.5 shrink-0" />}
              label={place.label}
              removeLabel={t('search.removePlace')}
              onRemove={() => {
                setPlace(null);
                setOriginActive(false);
              }}
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

  // Comparaison : favoris (dans l'ordre d'ajout), une couleur par favori, zones calculées à l'ouverture
  const favoriteEtabs = useMemo(
    () => favorites.ids.map((id) => etablissements?.find((e) => e.id === id)).filter((e): e is Etablissement => !!e),
    [favorites.ids, etablissements]
  );
  const zoneOf = useZones(compareOpen ? favoriteEtabs : [], timeInMinutes, transportMode);
  const compareColor = (id: string) => COMPARE_COLORS[Math.max(0, favorites.ids.indexOf(id)) % COMPARE_COLORS.length];
  const compareZones = compareOpen
    ? favoriteEtabs.flatMap((e) => {
        const zone = zoneOf(e.id);
        return zone.status === 'ready' ? [{ ...zone.isochrone, color: compareColor(e.id) }] : [];
      })
    : undefined;

  const panelContent = selectedEtab ? (
    <EtablissementDetails
      key={selectedEtabId}
      etablissement={selectedEtab}
      isochrone={selectedIsochrone}
      zoneStatus={zoneStatus}
      zoneError={zoneError}
      zoneProvider={providerName}
      // Clé absente ou refusée : réessayer ne changerait rien
      onRetryZone={zoneError === 'unconfigured' || zoneError === 'auth' ? undefined : selectedZone.retry}
      transportMode={transportMode}
      timeInMinutes={timeInMinutes}
      onClose={() => selectEtab(null)}
      pinnedCommune={pinnedCommune}
      onPinCommune={setPinnedCommune}
      onHoverCommune={setHoveredCommune}
      travelSettings={travelSettings}
      favoriteButton={
        <FavoriteButton
          active={favorites.ids.includes(selectedEtab.id)}
          full={favorites.ids.length >= MAX_FAVORITES}
          onToggle={() => favorites.toggle(selectedEtab.id)}
        />
      }
    />
  ) : compareOpen && favoriteEtabs.length >= 2 ? (
    <CompareView
      etablissements={favoriteEtabs}
      colorOf={compareColor}
      zoneOf={zoneOf}
      provider={providerName}
      timeInMinutes={timeInMinutes}
      transportMode={transportMode}
      travelSettings={travelSettings}
      onSelectEtab={selectEtab}
      onClose={() => setCompareOpen(false)}
    />
  ) : (
    <ExplorePanel
      showBrand={isMobile}
      onboardingVisible={!onboardingDone}
      onDismissOnboarding={() => setOnboardingDone(true)}
      onShowHelp={() => setOnboardingDone(false)}
      favoritesSection={
        <FavoritesSection
          favorites={favoriteEtabs}
          onSelect={selectEtab}
          onRemove={favorites.remove}
          onCompare={() => setCompareOpen(true)}
        />
      }
      originPanel={
        place && (
          <OriginPanel
            label={place.label}
            active={originActive}
            onActivate={() => setOriginActive(true)}
            loading={originZone.loading}
            error={originZone.error}
            provider={providerName}
            reachable={reachable}
            reachableOnly={reachableOnly}
            onReachableOnlyChange={setReachableOnly}
            timeInMinutes={timeInMinutes}
            transportMode={transportMode}
            onSelectEtab={selectEtab}
            travelSettings={travelSettings}
          />
        )
      }
      etablissements={etablissements}
      // Légende : établissements affichés (seulement les accessibles si demandé)
      filteredEtablissements={mapEtablissements}
      filters={filters}
      onFiltersChange={changeFilters}
      onFiltersReset={() => changeFilters({ name: filters.name, filiere: filters.filiere })}
    />
  );

  return (
    <div className="relative h-dvh w-full overflow-hidden" style={cssVars}>
      <MapView
        filteredEtablissements={mapEtablissements}
        selectedIsochrone={selectedIsochrone}
        originIsochrone={selectedEtab ? null : originZone.isochrone}
        compareZones={selectedEtab ? undefined : compareZones}
        onLocated={(lat, lon) =>
          selectPlace({ id: 'position', label: t('origin.myPosition'), context: '', kind: 'position', lat, lon })
        }
        transportMode={transportMode}
        selectedEtab={selectedEtab}
        onSelectEtab={selectEtab}
        focusTarget={focusTarget}
        insets={insets}
        place={place}
        highlightedCommune={hoveredCommune ?? pinnedCommune}
        showZoomControl={!isMobile}
      />

      <MapStatus status={etabStatus} onRetry={retry} />

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
                  <span className="truncate">{selectedEtab.nom}</span>
                </p>
              ) : (
                <p className="truncate text-sm font-semibold text-slate-900">
                  {t('panel.summary', { count: mapEtablissements.length, total: fmt.integer(mapEtablissements.length) })}
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
