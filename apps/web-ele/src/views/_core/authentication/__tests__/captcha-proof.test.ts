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
    const digest = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(`challenge-1:nonce-1:${counter}`),
    );

    expect(hasLeadingZeroHex(digest, 1)).toBe(true);
  });

  it('rejects immediately when aborted even if digests never settle', async () => {
    const controller = new AbortController();
    vi.spyOn(crypto.subtle, 'digest').mockReturnValue(new Promise(() => {}));
    const solving = solveCaptchaProof(
      'challenge-1',
      'nonce-1',
      3,
      250_000,
      controller.signal,
    );
    controller.abort();

    await expect(solving).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('includes counter 250,000 in the search range', async () => {
    vi.spyOn(crypto.subtle, 'digest').mockResolvedValue(
      new Uint8Array(32).buffer,
    );

    await expect(
      solveCaptchaProof(
        'challenge-1',
        'nonce-1',
        3,
        250_000,
        undefined,
        250_000,
      ),
    ).resolves.toBe(250_000);
  });

  it.each([
    ['difficulty above protocol', 'challenge-1', 'nonce-1', 4, 10],
    ['challenge id too long', 'c'.repeat(129), 'nonce-1', 3, 10],
    ['nonce too long', 'challenge-1', 'n'.repeat(65), 3, 10],
    ['counter budget too large', 'challenge-1', 'nonce-1', 3, 250_001],
  ])(
    'rejects %s before hashing',
    async (_name, challengeId, nonce, difficulty, maxCounter) => {
      const digest = vi.spyOn(crypto.subtle, 'digest');

      await expect(
        solveCaptchaProof(challengeId, nonce, difficulty, maxCounter),
      ).rejects.toBeInstanceOf(RangeError);
      expect(digest).not.toHaveBeenCalled();
    },
  );
});
