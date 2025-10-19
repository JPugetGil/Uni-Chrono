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