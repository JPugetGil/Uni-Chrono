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
  /** Zone depuis le point de départ : neutre, distincte des catégories */
  origin: '#334155',
};

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
