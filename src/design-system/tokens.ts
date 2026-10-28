import { EtablissementCategory } from '../types/etablissement';

/**
 * Couleurs lues côté JavaScript (tracés Leaflet, marqueurs) : Leaflet ne
 * connaît pas les classes Tailwind. Les valeurs reprennent le thème d'index.css.
 */
export const colors = {
  /** blue-700 : contraste 6,7:1 sur blanc */
  primary: '#1d4ed8',
  /** slate-900 : contour de la commune survolée */
  highlight: '#0f172a',
  /** Calques CROUS : teintes distinctes des catégories d'établissement */
  crousLogement: '#6250d6',
  crousRestaurant: '#c2417a',
};

/**
 * Bandes de temps d'une zone, de la plus proche à la plus lointaine : rampe
 * viridis (violet, sarcelle, jaune), dont la clarté croît vers l'extérieur.
 * Mesuré le 28/10/2026 en remplissage à 45 % sur les fonds Plan IGN et OSM
 * (clair, forêt, bâti) : écart entre bandes voisines ΔE OKLab ≥ 16,8 en vision
 * normale et ≥ 13,3 en protanopie ou deutéranopie simulées, contre 2,7 à 4,5
 * avec l'ancienne teinte unique superposée. `line` : contour de la bande,
 * foncé pour le jaune (3,2:1 sur le fond de carte).
 */
export const bandColors = [
  { fill: '#440154', line: '#440154' },
  { fill: '#21918c', line: '#21918c' },
  { fill: '#fde725', line: '#9a8500' },
];

/**
 * Couleur par catégorie d'établissement. Trois teintes validées entre toutes
 * les paires (daltonisme compris) + un gris neutre pour « Autre ».
 */
export const categoryColors: Record<EtablissementCategory, string> = {
  university: '#2a78d6',
  school: '#eb6834',
  lycee: '#1baf7a',
  other: '#898781',
};
