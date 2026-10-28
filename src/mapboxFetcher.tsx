import { Coordinate, IsochroneBand } from './types/isochrone';
import { IsochroneError, httpError, isRetryable } from './isochroneError';

const mapBoxBaseURL = "https://api.mapbox.com/isochrone/v1/mapbox";

// Simple token-bucket rate limiter to enforce max 5 requests per second
class RateLimiter {
    private maxTokens: number
    private tokens: number
    private refillIntervalMs: number
    private queue: Array<() => void>
    private refillTimer: ReturnType<typeof setInterval>

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

            if (this.tokens > 0) {
                this.tokens -= 1
                run()
            } else {
                const wrappedJob = () => run()
                this.queue.push(wrappedJob)

                const onAbort = () => {
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

// Mapbox Isochrone API : ~300 requêtes/minute — 4/s reste sous la limite
const isochroneRateLimiter = new RateLimiter(4, 1000)

const fetchWithRetries = (url: string, signal?: AbortSignal, maxRetries = 3): Promise<GeoJSON.FeatureCollection<GeoJSON.Polygon>> => {
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
                    throw httpError(response)
                }
                const data = await response.json()
                return data
            }, signal).then(resolve).catch((err) => {
                if (signal?.aborted) {
                    return reject(new DOMException('Aborted', 'AbortError'))
                }

                // Clé refusée ou requête invalide : inutile de réessayer
                if (attempt <= maxRetries && isRetryable(err)) {
                    const delay = (err instanceof IsochroneError && err.retryAfterMs) || 500 * Math.pow(2, attempt - 1)
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

// You must provide your Mapbox access token here
const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_API_KEY || '';

// Seul un jeton public (« pk. ») peut être publié dans le JavaScript ; toute autre
// valeur (vide, secret « sk. », faute de frappe) est traitée comme une clé absente
export const hasMapboxKey = MAPBOX_ACCESS_TOKEN.startsWith('pk.');

/**
 * Isochrones d'un point pour plusieurs durées en une seule requête
 * (bandes de temps, jusqu'à 4 durées croissantes entre 1 et 60 min).
 */
export const fetchIsochroneData = async (
    lat: number,
    lon: number,
    contoursMinutes: number[],
    transportMode: string = "driving", // "driving", "walking", "cycling"
    signal?: AbortSignal
): Promise<IsochroneBand[]> => {
    if (!hasMapboxKey) {
        throw new IsochroneError('unconfigured', 'VITE_MAPBOX_API_KEY absente')
    }

    // Mapbox supports only certain profiles
    const supportedProfiles = ["driving", "walking", "cycling"]
    const profile = supportedProfiles.includes(transportMode) ? transportMode : "driving"

    // Mapbox expects lon,lat
    const coordinates = `${lon},${lat}`

    const minutes = [...new Set(contoursMinutes.map((m) => Math.min(60, Math.max(1, Math.round(m)))))]
        .sort((a, b) => a - b)
        .slice(-4)

    const url = `${mapBoxBaseURL}/${profile}/${coordinates}?contours_minutes=${minutes.join(',')}&polygons=true&access_token=${MAPBOX_ACCESS_TOKEN}`

    const data = await fetchWithRetries(url, signal, 3)
    return formatIsochrone(data)
}

// Une feature par durée (propriété `contour`) : anneau extérieur, [lon, lat] → [lat, lon]
const formatIsochrone = (isochroneData: GeoJSON.FeatureCollection<GeoJSON.Polygon>): IsochroneBand[] => {
    if (!isochroneData || !isochroneData.features || !isochroneData.features.length) {
        return []
    }
    return isochroneData.features
        .map((feature) => ({
            minutes: Number(feature.properties?.contour),
            coordinates: (feature.geometry?.coordinates[0] || []).map(
                (coord: number[]) => [coord[1], coord[0]] as Coordinate
            ),
        }))
        .filter((band) => Number.isFinite(band.minutes) && band.coordinates.length > 0)
        .sort((a, b) => a.minutes - b.minutes)
}
