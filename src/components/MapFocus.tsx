import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import * as L from 'leaflet';
import { Etablissement } from '../types/etablissement';
import { Isochrone } from '../types/isochrone';
import { boundsOf, flattenCoordinates } from '../utils/geo';
import { etabId } from '../utils/filters';

/** Marges (px) des panneaux posés sur la carte : le cadrage se fait dans la zone restée visible */
export interface MapInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Emprise à cadrer (résultat de recherche, filtre géographique) */
export interface FocusTarget {
  bounds: L.LatLngBoundsLiteral;
  maxZoom: number;
}

interface MapFocusProps {
  selected: Etablissement | null;
  /** Isochrone de l'établissement sélectionné, quand elle est disponible */
  selectedIsochrone?: Isochrone | null;
  target: FocusTarget | null;
  insets: MapInsets;
}

const MARGIN = 24;
/** Place laissée en bas à la pastille de calcul des zones */
const BOTTOM_CLEARANCE = 100;

const fitOptions = (insets: MapInsets, maxZoom: number): L.FitBoundsOptions & L.PanOptions => ({
  paddingTopLeft: L.point(insets.left + MARGIN, insets.top + MARGIN),
  paddingBottomRight: L.point(insets.right + MARGIN, insets.bottom + BOTTOM_CLEARANCE),
  maxZoom,
  duration: 0.75,
});

/**
 * Déplacements de la carte :
 * - sélection : vers l'établissement, puis vers son isochrone dès qu'elle arrive
 *   (une seule fois : les autres isochrones reçues ne recentrent pas la carte) ;
 * - cible de recherche ou de filtre.
 */
const MapFocus: React.FC<MapFocusProps> = ({ selected, selectedIsochrone, target, insets }) => {
  const map = useMap();
  // Lu au moment du déplacement : un changement de marges seul ne recadre pas
  const insetsRef = useRef(insets);
  useEffect(() => {
    insetsRef.current = insets;
  }, [insets]);

  const lastRef = useRef<{ id: string; iso?: Isochrone | null } | null>(null);

  useEffect(() => {
    if (!selected) {
      lastRef.current = null;
      return;
    }
    const id = etabId(selected);
    const last = lastRef.current;
    if (last && last.id === id && last.iso === selectedIsochrone) return;
    lastRef.current = { id, iso: selectedIsochrone };
    // Zone en cours de recalcul (changement de mode ou de durée) : la carte ne bouge pas
    if (last?.id === id && !selectedIsochrone) return;

    const zone = selectedIsochrone ? boundsOf(flattenCoordinates(selectedIsochrone.coordinates)) : null;
    if (zone) {
      map.flyToBounds(zone, fitOptions(insetsRef.current, 16));
    } else {
      const { lat, lon } = selected.coordonnees;
      map.flyToBounds(L.latLng(lat, lon).toBounds(1500), fitOptions(insetsRef.current, 15));
    }
  }, [map, selected, selectedIsochrone]);

  useEffect(() => {
    if (target) map.flyToBounds(target.bounds, fitOptions(insetsRef.current, target.maxZoom));
  }, [map, target]);

  return null;
};

export default MapFocus;
