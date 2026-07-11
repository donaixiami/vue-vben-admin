import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getCaptchaChallengeApi, verifyCaptchaApi } from '../auth';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('#/api/request', () => ({
  baseRequestClient: { post: vi.fn() },
  requestClient: { get: vi.fn(), post },
}));

describe('captcha auth API', () => {
  beforeEach(() => post.mockReset());

  it('requests a server captcha challenge with POST', async () => {
    post.mockResolvedValue({ challengeId: 'challenge-1' });

    await getCaptchaChallengeApi();

    expect(post).toHaveBeenCalledWith('/auth/captcha/challenge');
  });

  it('posts the complete verification payload', async () => {
    const data = {
      challengeId: 'challenge-1',
      duration: 400,
      finalX: 120,
      proofCounter: 7,
      track: Array.from({ length: 8 }, (_, index) => ({
        t: index * 50,
        x: index * 10,
        y: index,
      })),
      width: 278,
    };
    post.mockResolvedValue({ captchaToken: 'token', expiresIn: 120 });

    await verifyCaptchaApi(data);

    expect(post).toHaveBeenCalledWith('/auth/captcha/verify', data);
  });
});
