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

function withAbort<T>(promise: Promise<T>, signal?: AbortSignal) {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(abortError());
  return new Promise<T>((resolve, reject) => {
    const handleAbort = () => {
      signal.removeEventListener('abort', handleAbort);
      reject(abortError());
    };
    signal.addEventListener('abort', handleAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener('abort', handleAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', handleAbort);
        reject(error);
      },
    );
  });
}

export async function solveCaptchaProof(
  challengeId: string,
  nonce: string,
  difficulty: number,
  max = 5_000_000,
  signal?: AbortSignal,
  startCounter = 0,
): Promise<number> {
  if (signal?.aborted) throw abortError();
  if (!Number.isInteger(difficulty) || difficulty < 0 || difficulty > 64) {
    throw new RangeError('Invalid captcha proof difficulty');
  }

  for (
    let batchStart = startCounter;
    batchStart <= max;
    batchStart += BATCH_SIZE
  ) {
    if (signal?.aborted) throw abortError();
    const batchEnd = Math.min(batchStart + BATCH_SIZE - 1, max);
    const candidates = Array.from(
      { length: batchEnd - batchStart + 1 },
      (_, index) => batchStart + index,
    );
    const digests = await withAbort(
      Promise.all(
        candidates.map((counter) =>
          crypto.subtle.digest(
            'SHA-256',
            encoder.encode(`${challengeId}:${nonce}:${counter}`),
          ),
        ),
      ),
      signal,
    );
    if (signal?.aborted) throw abortError();
    const matchIndex = digests.findIndex((digest) =>
      hasLeadingZeroHex(digest, difficulty),
    );
    const matchedCounter = candidates[matchIndex];
    if (matchedCounter !== undefined) return matchedCounter;
    await withAbort(yieldToBrowser(), signal);
  }

  throw new Error('Captcha proof could not be solved');
}
