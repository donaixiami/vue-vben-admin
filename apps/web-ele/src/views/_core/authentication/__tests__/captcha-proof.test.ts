import { afterEach, describe, expect, it, vi } from 'vitest';

import { solveCaptchaProof } from '../captcha-proof';

function hasLeadingZeroHex(bytes: ArrayBuffer, difficulty: number) {
  return [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .startsWith('0'.repeat(difficulty));
}

describe('solveCaptchaProof', () => {
  afterEach(() => vi.restoreAllMocks());

  it('finds a counter whose SHA-256 hash has the requested prefix', async () => {
    const counter = await solveCaptchaProof(
      'challenge-1',
      'nonce-1',
      1,
      20_000,
    );
    const input = new TextEncoder().encode(`challenge-1:nonce-1:${counter}`);
    const digest = await crypto.subtle.digest('SHA-256', input);

    expect(hasLeadingZeroHex(digest, 1)).toBe(true);
  });

  it('stops when its abort signal is cancelled', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      solveCaptchaProof(
        'challenge-1',
        'nonce-1',
        3,
        5_000_000,
        controller.signal,
      ),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('observes cancellation while a digest batch is running', async () => {
    const controller = new AbortController();
    let resolveDigest!: (value: ArrayBuffer) => void;
    const digest = new Promise<ArrayBuffer>(
      (resolve) => (resolveDigest = resolve),
    );
    vi.spyOn(crypto.subtle, 'digest').mockReturnValue(digest);

    const solving = solveCaptchaProof(
      'challenge-1',
      'nonce-1',
      3,
      5_000_000,
      controller.signal,
    );
    controller.abort();
    resolveDigest(new Uint8Array(32).fill(0xFF).buffer);

    await expect(solving).rejects.toMatchObject({ name: 'AbortError' });
  });

  it.each([
    [2, [0x00, 0xFF]],
    [3, [0x00, 0x0F]],
    [4, [0x00, 0x00]],
  ])(
    'checks %i leading hex digits across byte boundaries',
    async (difficulty, prefix) => {
      const bytes = new Uint8Array(32).fill(0xFF);
      bytes.set(prefix);
      vi.spyOn(crypto.subtle, 'digest').mockResolvedValue(bytes.buffer);

      await expect(
        solveCaptchaProof('challenge-1', 'nonce-1', difficulty, 256),
      ).resolves.toBe(0);
    },
  );
});
