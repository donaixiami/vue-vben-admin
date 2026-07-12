import type { AuthApi } from '../auth';

import { beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';

import { getCaptchaChallengeApi, verifyCaptchaApi } from '../auth';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('#/api/request', () => ({
  baseRequestClient: { post: vi.fn() },
  requestClient: { get: vi.fn(), post },
}));

describe('captcha auth API', () => {
  beforeEach(() => post.mockReset());

  it('requests a challenge with an abort signal', async () => {
    const controller = new AbortController();
    post.mockResolvedValue({ challengeId: 'challenge-1' });

    await getCaptchaChallengeApi(controller.signal);

    expect(post).toHaveBeenCalledWith('/auth/captcha/challenge', undefined, {
      signal: controller.signal,
    });
  });

  it('posts the complete verification payload with an abort signal', async () => {
    const controller = new AbortController();
    const data: AuthApi.VerifyCaptchaParams = {
      challengeId: 'challenge-1',
      duration: 400,
      finalX: 120,
      proofCounter: 7,
      track: Array.from({ length: 8 }, (_, index) => ({
        t: index * 50,
        x: index * 10,
        y: index,
      })),
      width: 255,
    };
    post.mockResolvedValue({ captchaToken: 'token', expiresIn: 120 });

    await verifyCaptchaApi(data, controller.signal);

    expect(post).toHaveBeenCalledWith('/auth/captcha/verify', data, {
      signal: controller.signal,
    });
  });
});

describe('captcha auth API types', () => {
  it('models the challenge geometry as a nested puzzle', () => {
    expectTypeOf<AuthApi.CaptchaChallengeResult>().toEqualTypeOf<{
      challengeId: string;
      expiresIn: number;
      proofDifficulty: number;
      proofNonce: string;
      puzzle: {
        backgroundImage: string;
        imageHeight: number;
        imageWidth: number;
        movementWidth: number;
        pieceHeight: number;
        pieceImage: string;
        pieceWidth: number;
        pieceY: number;
      };
    }>();
  });

  it('requires exactly the three login credential strings', () => {
    expectTypeOf<AuthApi.LoginParams>().toEqualTypeOf<{
      captchaToken: string;
      password: string;
      username: string;
    }>();
  });
});
