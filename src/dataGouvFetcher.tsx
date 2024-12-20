const geoPortailBaseURL = "https://data.geopf.fr/navigation/isochrone"

export const fetchIsochroneData = async (lat: number, lon: number, time: number = 1800, transportMode: string, signal: AbortSignal) => {
    if (lat < -63.28125 || lat > 55.8984375 || lon < -63.28125 || lon > 55.8984375) {
        return null;
    }

    const response = await fetch(
        geoPortailBaseURL + `?gp-access-lib=3.4.2&resource=bdtopo-valhalla&point=${lon},${lat}&direction=departure&costType=time&costValue=${time}&profile=${transportMode}&timeUnit=second&distanceUnit=meter&crs=EPSG:4326&constraints=`,
        { signal }
    )
    const data = await response.json()
    return formatIsochrone(data)
}

const dataGouvBaseURL = "https://data.enseignementsup-recherche.gouv.fr"
const etablissements = (offset: number) => 
    dataGouvBaseURL + 
    `/api/explore/v2.1/catalog/datasets/fr-esr-principaux-etablissements-enseignement-superieur/records?order_by=uai&select=coordonnees%2Ctype_d_etablissement%2Cuo_lib&limit=100&offset=${offset}&lang=fr&refine=pays_etranger_acheminement%3A%22France%22`

const fetchEtablissementsData = async (offset: number) => {
    const response = await fetch(etablissements(offset))
    const data = await response.json()
    return data
}

const formatIsochrone = (isochroneData: any) => {
    if (!isochroneData) {
        return []
    }

    return isochroneData?.geometry?.coordinates[0]
        .map((coord: any) => [coord[1], coord[0]])
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
            color: `#${Math.floor(Math.random()*16777215).toString(16)}`
        }))
}
