import { afterEach, describe, expect, it, vi } from 'vitest';
import { Throttle } from './throttle';

afterEach(() => {
  vi.useRealTimers();
});

describe('Throttle', () => {
  it('espace les appels de l’intervalle, dans l’ordre d’arrivée', async () => {
    vi.useFakeTimers();
    const throttle = new Throttle(250);
    const start = Date.now();
    const times: number[] = [];
    const calls = [0, 1, 2].map(() => throttle.wait().then(() => times.push(Date.now() - start)));

    await vi.advanceTimersByTimeAsync(1000);
    await Promise.all(calls);
    expect(times).toEqual([0, 250, 500]);
  });

  it('ne fait pas attendre un appel arrivé après l’intervalle', async () => {
    vi.useFakeTimers();
    const throttle = new Throttle(250);
    await throttle.wait();
    await vi.advanceTimersByTimeAsync(400);
    const start = Date.now();
    await throttle.wait();
    expect(Date.now() - start).toBe(0);
  });

  it('repousse les appels suivants après une pause', async () => {
    vi.useFakeTimers();
    const throttle = new Throttle(250);
    await throttle.wait();
    throttle.pause(4000);
    const start = Date.now();
    const next = throttle.wait().then(() => Date.now() - start);
    await vi.advanceTimersByTimeAsync(5000);
    expect(await next).toBe(4000);
  });

  it('abandonne l’attente quand la demande est annulée', async () => {
    vi.useFakeTimers();
    const throttle = new Throttle(250);
    await throttle.wait();
    const controller = new AbortController();
    const waiting = throttle.wait(controller.signal);
    controller.abort();
    await expect(waiting).rejects.toMatchObject({ name: 'AbortError' });
  });
});
