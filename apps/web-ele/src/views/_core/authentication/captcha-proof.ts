const BATCH_SIZE = 256;
const MAX_COUNTER = 250_000;
const encoder = new TextEncoder();

function abortError() {
  return new DOMException('Captcha proof was aborted', 'AbortError');
}

function hasLeadingZeroHex(digest: ArrayBuffer, difficulty: number) {
  let remaining = difficulty;
  for (const byte of new Uint8Array(digest)) {
    if (remaining === 0) return true;
    if (byte >> 4 !== 0) return false;
    remaining -= 1;
    if (remaining === 0) return true;
    if ((byte & 0x0F) !== 0) return false;
    remaining -= 1;
  }
  return remaining === 0;
}

function abortable<T>(promise: Promise<T>, signal?: AbortSignal) {
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

function yieldToBrowser() {
  return new Promise<void>((resolve) => window.setTimeout(resolve, 0));
}

export async function solveCaptchaProof(
  challengeId: string,
  nonce: string,
  difficulty: number,
  max = MAX_COUNTER,
  signal?: AbortSignal,
  startCounter = 0,
) {
  if (signal?.aborted) throw abortError();
  if (!challengeId.trim() || challengeId.length > 128) {
    throw new RangeError('Invalid captcha challenge id');
  }
  if (!nonce.trim() || nonce.length > 64) {
    throw new RangeError('Invalid captcha proof nonce');
  }
  if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 3) {
    throw new RangeError('Invalid captcha proof difficulty');
  }
  if (!Number.isInteger(max) || max < 0 || max > MAX_COUNTER) {
    throw new RangeError('Invalid captcha proof counter budget');
  }
  if (
    !Number.isInteger(startCounter) ||
    startCounter < 0 ||
    startCounter > max
  ) {
    throw new RangeError('Invalid captcha proof start counter');
  }

  for (
    let batchStart = startCounter;
    batchStart <= max;
    batchStart += BATCH_SIZE
  ) {
    if (signal?.aborted) throw abortError();
    const batchEnd = Math.min(batchStart + BATCH_SIZE - 1, max);
    const counters = Array.from(
      { length: batchEnd - batchStart + 1 },
      (_, index) => batchStart + index,
    );
    const digests = await abortable(
      Promise.all(
        counters.map((counter) =>
          crypto.subtle.digest(
            'SHA-256',
            encoder.encode(`${challengeId}:${nonce}:${counter}`),
          ),
        ),
      ),
      signal,
    );
    const match = digests.findIndex((digest) =>
      hasLeadingZeroHex(digest, difficulty),
    );
    if (match !== -1) return counters[match] as number;
    await abortable(yieldToBrowser(), signal);
  }

  throw new Error('Captcha proof could not be solved');
}
