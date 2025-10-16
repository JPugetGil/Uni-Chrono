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
    color?: string
}