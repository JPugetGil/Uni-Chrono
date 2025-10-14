const dataGouvBaseURL = "https://data.enseignementsup-recherche.gouv.fr"

const etablissements = (offset: number) =>
    dataGouvBaseURL +
    `/api/explore/v2.1/catalog/datasets/fr-esr-principaux-etablissements-enseignement-superieur/records?order_by=uai&select=coordonnees%2Ctype_d_etablissement%2Cuo_lib&limit=100&offset=${offset}&lang=fr&refine=pays_etranger_acheminement%3A%22France%22`

const fetchEtablissementsData = async (offset: number) => {
    const response = await fetch(etablissements(offset))
    const data = await response.json()
    return data
}

export const fetchAllEtablissementsData = async () => {
    let offset = 0
    let etablissements = []
    let data = await fetchEtablissementsData(offset)
    let totalEtablissement = data.total_count

    etablissements.push(...data.results)

    while (totalEtablissement > offset) {
        offset += 100
        data = await fetchEtablissementsData(offset)
        etablissements.push(...data.results)
    }

    return etablissements
        .map((etablissement) => ({
            ...etablissement,
            color: `#${Math.floor(Math.random() * 16777215).toString(16)}`
        }))
}
