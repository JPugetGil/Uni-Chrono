export interface Etablissements {
    total_count: number,
    results: Array<Etablissement>
}

export interface Etablissement {
    "coordonnees": {
        "lon": number,
        "lat": number
    },
    "type_d_etablissement": string[],
    "uo_lib": string,
    /** Identifiant UAI de l'établissement */
    "uai"?: string,
    /** Région (nom) */
    "reg_nom"?: string,
    /** Département (nom) */
    "dep_nom"?: string,
    /** Commune (nom) */
    "com_nom"?: string,
    color?: string
}