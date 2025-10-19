import { Etablissement, Etablissements } from './types/etablissement'

const dataGouvBaseURL = "https://data.enseignementsup-recherche.gouv.fr"

const etablissements = (offset: number) =>
    dataGouvBaseURL +
    `/api/explore/v2.1/catalog/datasets/fr-esr-implantations_etablissements_d_enseignement_superieur_publics/records?select=uai%2Csiege_lib%2Ctype_d_etablissement%2Cimplantation_lib%2Ccoordonnees%2Cservices%2Cdate_ouverture%2Cur_lib%2Ccom_nom%2Cdep_nom%2Creg_nom&limit=100&offset=${offset}&lang=fr`

const fetchEtablissementsData = async (offset: number): Promise<Etablissements> => {
    const response = await fetch(etablissements(offset))
    return await response.json() as Etablissements
}

export const fetchAllEtablissementsData = async (): Promise<Etablissement[]> => {
    let offset = 0
    const etablissements: Etablissement[] = []
    const seenUai = new Set<string>()

    let data = await fetchEtablissementsData(offset)
    const totalEtablissement = data.total_count

    for (const e of data.results) {
        if (e?.uai && e?.coordonnees?.lat != null && e?.coordonnees?.lon != null && !seenUai.has(e.uai)) {
            seenUai.add(e.uai)
            etablissements.push(e)
        }
    }

    while (totalEtablissement > offset) {
        offset += 100
        data = await fetchEtablissementsData(offset)
        for (const e of data.results) {
            if (e?.uai && e?.coordonnees?.lat != null && e?.coordonnees?.lon != null && !seenUai.has(e.uai)) {
                seenUai.add(e.uai)
                etablissements.push(e)
            }
        }
    }

    return etablissements.map(
        (etablissement) =>
            ({
                ...etablissement,
                color: `#${Math.floor(Math.random() * 16777215).toString(16)}`
            } as Etablissement)
    )
}
