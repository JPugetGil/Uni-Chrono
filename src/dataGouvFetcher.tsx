import { Etablissement, Etablissements, getEtablissementCategory } from './types/etablissement'
import { categoryColors } from './design-system/tokens'

const dataGouvBaseURL = "https://data.enseignementsup-recherche.gouv.fr"
const PAGE_SIZE = 100

const etablissements = (offset: number) =>
    dataGouvBaseURL +
    `/api/explore/v2.1/catalog/datasets/fr-esr-implantations_etablissements_d_enseignement_superieur_publics/records?select=uai%2Csiege_lib%2Ctype_d_etablissement%2Cimplantation_lib%2Ccoordonnees%2Cservices%2Cdate_ouverture%2Cur_lib%2Ccom_nom%2Cdep_nom%2Creg_nom&limit=${PAGE_SIZE}&offset=${offset}&lang=fr`

const fetchEtablissementsData = async (offset: number, signal?: AbortSignal): Promise<Etablissements> => {
    const response = await fetch(etablissements(offset), { signal })
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
    }
    return await response.json() as Etablissements
}

/**
 * Charge toutes les pages du jeu de données. `onProgress` reçoit le nombre
 * d'enregistrements lus et le total annoncé, pour l'indicateur de chargement.
 */
export const fetchAllEtablissementsData = async (
    onProgress?: (loaded: number, total: number) => void,
    signal?: AbortSignal
): Promise<Etablissement[]> => {
    const etablissements: Etablissement[] = []
    const seenUai = new Set<string>()

    let total = Infinity
    for (let offset = 0; offset < total; offset += PAGE_SIZE) {
        const data = await fetchEtablissementsData(offset, signal)
        total = data.total_count
        for (const e of data.results) {
            if (e?.uai && e?.coordonnees?.lat != null && e?.coordonnees?.lon != null && !seenUai.has(e.uai)) {
                seenUai.add(e.uai)
                etablissements.push(e)
            }
        }
        onProgress?.(Math.min(offset + PAGE_SIZE, total), total)
    }

    // Couleur de la catégorie (université, grand établissement, école, autre) :
    // marqueur, isochrone et pastille de la fiche partagent la même teinte
    return etablissements.map(
        (etablissement) =>
            ({
                ...etablissement,
                color: categoryColors[getEtablissementCategory(etablissement)]
            } as Etablissement)
    )
}
