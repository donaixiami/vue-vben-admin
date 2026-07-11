const BATCH_SIZE = 256;
const encoder = new TextEncoder();

function abortError() {
  return new DOMException('Captcha proof was aborted', 'AbortError');
}

function hasLeadingZeroHex(digest: ArrayBuffer, difficulty: number) {
  let remaining = difficulty;
  for (const byte of new Uint8Array(digest)) {
    if (remaining === 0) return true;
    const high = byte >> 4;
    if (high !== 0) return false;
    remaining -= 1;
    if (remaining === 0) return true;
    const low = byte & 0x0F;
    if (low !== 0) return false;
    remaining -= 1;
  }
  return remaining === 0;
}

function yieldToBrowser() {
  return new Promise<void>((resolve) => window.setTimeout(resolve, 0));
}

export async function solveCaptchaProof(
  challengeId: string,
  nonce: string,
  difficulty: number,
  max = 5_000_000,
  signal?: AbortSignal,
): Promise<number> {
  if (signal?.aborted) throw abortError();
  if (!Number.isInteger(difficulty) || difficulty < 0 || difficulty > 64) {
    throw new RangeError('Invalid captcha proof difficulty');
  }

  for (let batchStart = 0; batchStart < max; batchStart += BATCH_SIZE) {
    if (signal?.aborted) throw abortError();
    const batchEnd = Math.min(batchStart + BATCH_SIZE, max);
    const candidates = Array.from(
      { length: batchEnd - batchStart },
      (_, index) => batchStart + index,
    );
    const digests = await Promise.all(
      candidates.map((counter) =>
        crypto.subtle.digest(
          'SHA-256',
          encoder.encode(`${challengeId}:${nonce}:${counter}`),
        ),
      ),
    );
    if (signal?.aborted) throw abortError();
    const matchIndex = digests.findIndex((digest) =>
      hasLeadingZeroHex(digest, difficulty),
    );
    const matchedCounter = candidates[matchIndex];
    if (matchedCounter !== undefined) return matchedCounter;
    await yieldToBrowser();
  }

  throw new Error('Captcha proof could not be solved');
}
