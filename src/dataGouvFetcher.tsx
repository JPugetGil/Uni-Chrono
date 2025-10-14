const geoPortailBaseURL = "https://data.geopf.fr/navigation/isochrone"

// Simple token-bucket rate limiter to enforce max 5 requests per second
// Allows bursts up to `bucketSize` but refills `maxTokens` every `refillIntervalMs`.
class RateLimiter {
    private maxTokens: number
    private tokens: number
    private refillIntervalMs: number
    private queue: Array<() => void>
    private refillTimer: any

    constructor(maxTokens = 5, refillIntervalMs = 1000) {
        this.maxTokens = maxTokens
        this.tokens = maxTokens
        this.refillIntervalMs = refillIntervalMs
        this.queue = []
        this.refillTimer = setInterval(() => this.refill(), this.refillIntervalMs)
    }

    private refill() {
        this.tokens = this.maxTokens
        this.drainQueue()
    }

    private drainQueue() {
        while (this.tokens > 0 && this.queue.length > 0) {
            const job = this.queue.shift()
            if (job) {
                this.tokens -= 1
                job()
            }
        }
    }

    // schedule returns a promise resolved by running `fn` when token available
    public schedule<T>(fn: () => Promise<T>, signal?: AbortSignal): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            if (signal?.aborted) {
                return reject(new DOMException('Aborted', 'AbortError'))
            }

            const run = () => {
                if (signal?.aborted) {
                    return reject(new DOMException('Aborted', 'AbortError'))
                }

                fn().then(resolve).catch(reject)
            }

            // If token available, consume and run immediately
            if (this.tokens > 0) {
                this.tokens -= 1
                run()
            } else {
                // otherwise enqueue and attach abort listener to remove if aborted
                const wrappedJob = () => run()
                this.queue.push(wrappedJob)

                const onAbort = () => {
                    // try to remove from queue
                    const idx = this.queue.indexOf(wrappedJob)
                    if (idx !== -1) this.queue.splice(idx, 1)
                    signal?.removeEventListener('abort', onAbort)
                    reject(new DOMException('Aborted', 'AbortError'))
                }

                signal?.addEventListener('abort', onAbort)
            }
        })
    }

    public stop() {
        clearInterval(this.refillTimer)
        this.queue = []
    }
}

const isochroneRateLimiter = new RateLimiter(5, 1000)

// Helper: perform fetch through rate limiter and retry on failures
const fetchWithRetries = (url: string, signal?: AbortSignal, maxRetries = 3): Promise<any> => {
    let attempt = 0

    return new Promise((resolve, reject) => {
        const tryOnce = () => {
            if (signal?.aborted) {
                return reject(new DOMException('Aborted', 'AbortError'))
            }

            attempt += 1

            isochroneRateLimiter.schedule(async () => {
                const response = await fetch(url, { signal })
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`)
                }
                const data = await response.json()
                return data
            }, signal).then(resolve).catch((err) => {
                // If aborted, reject immediately
                if (signal?.aborted) {
                    return reject(new DOMException('Aborted', 'AbortError'))
                }

                if (attempt <= maxRetries) {
                    const delay = 500 * Math.pow(2, attempt - 1) // 500ms, 1s, 2s, ...
                    setTimeout(() => {
                        tryOnce()
                    }, delay)
                } else {
                    reject(err)
                }
            })
        }

        tryOnce()
    })
}

export const fetchIsochroneData = async (lat: number, lon: number, time: number = 1800, transportMode: string, signal?: AbortSignal) => {
    if (lat < -63.28125 || lat > 55.8984375 || lon < -63.28125 || lon > 55.8984375) {
        return null;
    }

    const url = geoPortailBaseURL + `?gp-access-lib=3.4.2&resource=bdtopo-valhalla&point=${lon},${lat}&direction=departure&costType=time&costValue=${time}&profile=${transportMode}&timeUnit=second&distanceUnit=meter&crs=EPSG:4326&constraints=`

    // Use the fetch-with-retries helper so failures are retried (re-queued) a few times
    const data = await fetchWithRetries(url, signal, 3)
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
            color: `#${Math.floor(Math.random() * 16777215).toString(16)}`
        }))
}
