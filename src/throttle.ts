const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'));
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true }
    );
  });

/**
 * Espace les appels d'au moins `intervalMs` (débit maximal d'un service),
 * dans l'ordre d'arrivée ; `pause` repousse tous les appels suivants (blocage
 * annoncé par le service).
 */
export class Throttle {
  private readonly intervalMs: number;
  /** Horodatage au plus tôt du prochain appel */
  private next = 0;

  constructor(intervalMs: number) {
    this.intervalMs = intervalMs;
  }

  /** Attend le créneau réservé pour cet appel */
  async wait(signal?: AbortSignal): Promise<void> {
    const now = Date.now();
    const slot = Math.max(now, this.next);
    this.next = slot + this.intervalMs;
    if (slot > now) await sleep(slot - now, signal);
  }

  pause(ms: number): void {
    this.next = Math.max(this.next, Date.now() + ms);
  }
}
