/**
 * Erreurs des services d'isochrones (IGN, Geoapify), classées pour
 * afficher un message utile et ne relancer que ce qui peut réussir.
 * - unconfigured : clé absente au build
 * - auth : clé refusée (401, 403)
 * - quota : trop de demandes (429)
 * - failed : autre échec (réseau, 4xx, 5xx, réponse vide)
 */
export type IsochroneErrorKind = 'unconfigured' | 'auth' | 'quota' | 'failed';

export class IsochroneError extends Error {
  readonly kind: IsochroneErrorKind;
  readonly status?: number;
  /** Délai demandé par le service avant une nouvelle tentative (en-tête Retry-After) */
  readonly retryAfterMs?: number;

  constructor(kind: IsochroneErrorKind, message: string, options: { status?: number; retryAfterMs?: number } = {}) {
    super(message);
    this.name = 'IsochroneError';
    this.kind = kind;
    this.status = options.status;
    this.retryAfterMs = options.retryAfterMs;
  }
}

/** Erreur correspondant à une réponse HTTP en échec */
export const httpError = (response: Response): IsochroneError => {
  const { status } = response;
  const kind: IsochroneErrorKind = status === 401 || status === 403 ? 'auth' : status === 429 ? 'quota' : 'failed';
  const retryAfter = Number(response.headers?.get('Retry-After'));
  return new IsochroneError(kind, `HTTP ${status}`, {
    status,
    retryAfterMs: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : undefined,
  });
};

/** Vaut la peine de réessayer : erreur réseau, quota momentané ou erreur serveur (pas une requête refusée) */
export const isRetryable = (error: unknown): boolean =>
  !(error instanceof IsochroneError) || error.kind === 'quota' || (error.status ?? 0) >= 500;

export const errorKindOf = (error: unknown): IsochroneErrorKind =>
  error instanceof IsochroneError ? error.kind : 'failed';
