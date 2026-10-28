import { normalizeText } from '../utils/text';

export interface Etablissements {
    total_count: number;
    results: Etablissement[];
}

export type EtablissementType = string | string[] | null;

export interface Etablissement {
    siege_lib?: string | null;
    type_d_etablissement?: EtablissementType;
    implantation_lib?: string | null;
    coordonnees: {
        lon: number;
        lat: number;
    };
    services?: string[] | null;
    date_ouverture?: string | null;
    uai?: string | null;
    ur_lib?: string | null;
    com_nom?: string | null;
    dep_nom?: string | null;
    reg_nom?: string | null;
    color?: string;
}

const normalizeLabel = (value?: string | null): string | undefined => {
    return value ? value.replace(/\s+/g, ' ').trim() || undefined : undefined;
};

export const getEtablissementName = (etablissement: Etablissement): string => {
    return (
        normalizeLabel(etablissement.implantation_lib) ||
        normalizeLabel(etablissement.siege_lib) ||
        normalizeLabel(etablissement.ur_lib) ||
        etablissement.uai ||
        '—'
    );
};

export const getEtablissementTypes = (etablissement: Etablissement): string[] => {
    const raw = etablissement.type_d_etablissement;
    if (!raw) return [];
    return Array.isArray(raw) ? raw : [raw];
};

/**
 * Regroupement des types du MESR en quatre catégories affichables (couleur du
 * marqueur, légende) : au-delà de trois teintes, les couleurs ne restent pas
 * distinguables entre toutes les paires.
 */
export type EtablissementCategory = 'university' | 'grand' | 'school' | 'other';

export const ETABLISSEMENT_CATEGORIES: EtablissementCategory[] = ['university', 'grand', 'school', 'other'];

const categoryOfType = (type: string): EtablissementCategory => {
    const n = normalizeText(type);
    if (n.startsWith('grand etablissement')) return 'grand';
    if (n.startsWith('universite') || n.startsWith('communaute') || n.startsWith('pole de recherche')) return 'university';
    if (/ecole|institut|ingenieur|architecture/.test(n)) return 'school';
    return 'other';
};

export const getEtablissementCategory = (etablissement: Etablissement): EtablissementCategory => {
    const categories = getEtablissementTypes(etablissement).map(categoryOfType);
    return ETABLISSEMENT_CATEGORIES.find((c) => categories.includes(c)) ?? 'other';
};