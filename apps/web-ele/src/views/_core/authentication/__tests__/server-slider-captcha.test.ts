import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ServerSliderCaptcha from '../server-slider-captcha.vue';

const { getChallenge, publicReset, solveProof, verifyCaptcha } = vi.hoisted(
  () => ({
    getChallenge: vi.fn(),
    publicReset: vi.fn(),
    solveProof: vi.fn(),
    verifyCaptcha: vi.fn(),
  }),
);

vi.mock('#/api/core/auth', () => ({
  getCaptchaChallengeApi: getChallenge,
  verifyCaptchaApi: verifyCaptcha,
}));
vi.mock('../captcha-proof', () => ({ solveCaptchaProof: solveProof }));
vi.mock('@vben/common-ui', () => ({
  SliderTranslateCaptcha: defineComponent({
    name: 'SliderTranslateCaptcha',
    props: {
      disabled: Boolean,
      mode: { default: undefined, type: String },
      modelValue: Boolean,
      puzzle: { default: undefined, type: Object },
    },
    emits: ['drag-end', 'refresh'],
    setup(_, { expose }) {
      expose({ reset: publicReset });
      return () => h('div', { 'data-test': 'public-slider' });
    },
  }),
}));

function pngData(width: number, height: number) {
  const bytes = new Uint8Array(24);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13]);
  bytes.set([73, 72, 68, 82], 12);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return `data:image/png;base64,${btoa(String.fromCodePoint(...bytes))}`;
}

const puzzle = {
  backgroundImage: pngData(320, 160),
  imageHeight: 160,
  imageWidth: 320,
  movementWidth: 255,
  pieceHeight: 65,
  pieceImage: pngData(65, 65),
  pieceWidth: 65,
  pieceY: 48,
};
const challenge = {
  challengeId: '11111111-1111-4111-8111-111111111111',
  expiresIn: 60,
  proofDifficulty: 3,
  proofNonce: 'nonce-1',
  puzzle,
};
const dragData = {
  duration: 400,
  finalX: 120,
  track: Array.from({ length: 8 }, (_, index) => ({
    t: index * 50,
    x: index * 15,
    y: index,
  })),
  width: 255,
};

function deferred<T>() {
  let reject!: (reason?: unknown) => void;
  let resolve!: (value: PromiseLike<T> | T) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, reject, resolve };
}

function mountCaptcha(modelValue = '') {
  return mount(ServerSliderCaptcha, { props: { modelValue } });
}

function sliderOf(wrapper: ReturnType<typeof mountCaptcha>) {
  return wrapper.getComponent({ name: 'SliderTranslateCaptcha' });
}

async function loadedCaptcha() {
  getChallenge.mockResolvedValueOnce(challenge);
  const wrapper = mountCaptcha();
  await flushPromises();
  return wrapper;
}

describe('server slider captcha adapter', () => {
  beforeEach(() => {
    vi.useRealTimers();
    getChallenge.mockReset();
    verifyCaptcha.mockReset();
    solveProof.mockReset();
    publicReset.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('passes the validated nested puzzle to the public server component', async () => {
    const wrapper = await loadedCaptcha();
    const slider = sliderOf(wrapper);

    expect(slider.props()).toMatchObject({
      mode: 'server',
      modelValue: false,
      puzzle,
    });
    expect(wrapper.find('[data-test="public-slider"]').exists()).toBe(true);
    expect(wrapper.find('[name="captcha-action"]').exists()).toBe(false);
    expect(wrapper.html()).not.toContain('targetX');
  });

  it.each([
    ['zero ttl', { expiresIn: 0 }],
    ['invalid UUID', { challengeId: 'challenge-1' }],
    ['blank nonce', { proofNonce: '   ' }],
    ['unsupported proof difficulty', { proofDifficulty: 4 }],
    ['wrong movement width', { puzzle: { ...puzzle, movementWidth: 256 } }],
    ['piece outside image', { puzzle: { ...puzzle, pieceY: 100 } }],
    [
      'wrong piece PNG height',
      { puzzle: { ...puzzle, pieceImage: pngData(65, 64) } },
    ],
    [
      'malformed background PNG',
      { puzzle: { ...puzzle, backgroundImage: 'bad' } },
    ],
  ])('rejects a challenge with %s', async (_name, override) => {
    getChallenge.mockResolvedValueOnce({ ...challenge, ...override });
    const wrapper = mountCaptcha();
    await flushPromises();

    expect(wrapper.find('[data-test="public-slider"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('验证图片加载失败，请重试');
    expect(wrapper.get('[data-test="captcha-retry"]').text()).toBe(
      '重新加载验证码',
    );
  });

  it('retries challenge loading from the failure text button', async () => {
    getChallenge
      .mockRejectedValueOnce(new Error('generate failed'))
      .mockResolvedValueOnce(challenge);
    const wrapper = mountCaptcha();
    await flushPromises();

    await wrapper.get('[data-test="captcha-retry"]').trigger('click');
    await flushPromises();

    expect(getChallenge).toHaveBeenCalledTimes(2);
    expect(wrapper.find('[data-test="captcha-retry"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="public-slider"]').exists()).toBe(true);
  });

  it('solves proof and verifies the public component drag evidence once', async () => {
    const wrapper = await loadedCaptcha();
    solveProof.mockResolvedValue(17);
    verifyCaptcha.mockResolvedValue({
      captchaToken: 'token-1',
      expiresIn: 120,
    });
    const slider = sliderOf(wrapper);

    slider.vm.$emit('drag-end', dragData);
    slider.vm.$emit('drag-end', dragData);
    await nextTick();
    expect(slider.props('disabled')).toBe(true);
    await flushPromises();

    expect(solveProof).toHaveBeenCalledOnce();
    expect(solveProof).toHaveBeenCalledWith(
      challenge.challengeId,
      challenge.proofNonce,
      challenge.proofDifficulty,
      250_000,
      expect.any(AbortSignal),
    );
    expect(verifyCaptcha).toHaveBeenCalledWith(
      {
        challengeId: challenge.challengeId,
        proofCounter: 17,
        ...dragData,
      },
      expect.any(AbortSignal),
    );
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['token-1']);
    expect(slider.props('modelValue')).toBe(true);
    expect(slider.props('disabled')).toBe(true);
  });

  it('refreshes immediately without proof for invalid drag evidence', async () => {
    getChallenge.mockResolvedValue(challenge);
    const wrapper = mountCaptcha();
    await flushPromises();

    sliderOf(wrapper).vm.$emit('drag-end', {
      ...dragData,
      duration: 249,
      track: dragData.track.slice(0, 7),
      width: 254,
    });
    await flushPromises();

    expect(solveProof).not.toHaveBeenCalled();
    expect(verifyCaptcha).not.toHaveBeenCalled();
    expect(getChallenge).toHaveBeenCalledTimes(2);
  });

  it('refresh clears a token and replaces the challenge', async () => {
    getChallenge.mockResolvedValue(challenge);
    const wrapper = mountCaptcha('old-token');
    await flushPromises();

    sliderOf(wrapper).vm.$emit('refresh');
    await flushPromises();

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['']);
    expect(getChallenge).toHaveBeenCalledTimes(2);
    expect(sliderOf(wrapper).props('modelValue')).toBe(false);
  });

  it('reset aborts pending proof and ignores its late result', async () => {
    getChallenge.mockResolvedValue(challenge);
    const wrapper = mountCaptcha();
    await flushPromises();
    const proof = deferred<number>();
    let proofSignal: AbortSignal | undefined;
    solveProof.mockImplementation((_id, _nonce, _difficulty, _max, signal) => {
      proofSignal = signal;
      return proof.promise;
    });

    sliderOf(wrapper).vm.$emit('drag-end', dragData);
    await nextTick();
    await (wrapper.vm as unknown as { reset: () => Promise<void> }).reset();
    proof.resolve(8);
    await flushPromises();

    expect(proofSignal?.aborted).toBe(true);
    expect(verifyCaptcha).not.toHaveBeenCalled();
    expect(getChallenge).toHaveBeenCalledTimes(2);
  });

  it('aborts an older challenge request and ignores its late result', async () => {
    const first = deferred<typeof challenge>();
    getChallenge
      .mockImplementationOnce(() => first.promise)
      .mockResolvedValueOnce(challenge);
    const wrapper = mountCaptcha();
    await nextTick();
    const firstSignal = getChallenge.mock.calls[0]?.[0] as AbortSignal;

    await (wrapper.vm as unknown as { reset: () => Promise<void> }).reset();
    first.resolve({ ...challenge, proofNonce: 'stale' });
    await flushPromises();

    expect(firstSignal.aborted).toBe(true);
    expect(sliderOf(wrapper).props('puzzle')).toEqual(puzzle);
    expect(solveProof).not.toHaveBeenCalled();
  });

  it('uses the absolute challenge deadline and removes expired UI while reloading', async () => {
    vi.useFakeTimers();
    getChallenge
      .mockResolvedValueOnce({ ...challenge, expiresIn: 10 })
      .mockReturnValueOnce(new Promise(() => {}));
    const wrapper = mountCaptcha();
    await flushPromises();

    await vi.advanceTimersByTimeAsync(10_000);

    expect(getChallenge).toHaveBeenCalledTimes(2);
    expect(wrapper.find('[data-test="public-slider"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('正在加载验证图片');
    wrapper.unmount();
  });

  it('aborts proof when unmounted', async () => {
    const wrapper = await loadedCaptcha();
    let proofSignal: AbortSignal | undefined;
    solveProof.mockImplementation((_id, _nonce, _difficulty, _max, signal) => {
      proofSignal = signal;
      return new Promise(() => {});
    });

    sliderOf(wrapper).vm.$emit('drag-end', dragData);
    await nextTick();
    wrapper.unmount();

    expect(proofSignal?.aborted).toBe(true);
  });
});
