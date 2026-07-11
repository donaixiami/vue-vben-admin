import { flushPromises, mount } from '@vue/test-utils';
import { nextTick } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ServerSliderCaptcha from '../server-slider-captcha.vue';

const { getChallenge, resume, solveProof, verifyCaptcha } = vi.hoisted(() => ({
  getChallenge: vi.fn(),
  resume: vi.fn(),
  solveProof: vi.fn(),
  verifyCaptcha: vi.fn(),
}));

vi.mock('#/api/core/auth', () => ({
  getCaptchaChallengeApi: getChallenge,
  verifyCaptchaApi: verifyCaptcha,
}));

vi.mock('../captcha-proof', () => ({
  solveCaptchaProof: solveProof,
}));

vi.mock('@vben/common-ui', async () => {
  const { defineComponent, h } = await import('vue');
  return {
    SliderCaptcha: defineComponent({
      name: 'SliderCaptcha',
      emits: ['end', 'move', 'start'],
      setup(_, { expose }) {
        expose({ resume });
        return () => h('div', { 'data-test': 'slider' });
      },
    }),
  };
});

const challenge = {
  backgroundImage: 'data:image/png;base64,background',
  challengeId: 'challenge-1',
  expiresIn: 60,
  imageHeight: 160,
  imageWidth: 320,
  movementWidth: 278,
  pieceImage: 'data:image/png;base64,piece',
  pieceWidth: 42,
  pieceY: 48,
  proofDifficulty: 3,
  proofNonce: 'nonce-1',
};

function mountCaptcha(modelValue?: string) {
  return mount(ServerSliderCaptcha, {
    props: modelValue === undefined ? {} : { modelValue },
  });
}

function sliderOf(wrapper: ReturnType<typeof mountCaptcha>) {
  return wrapper.getComponent({ name: 'SliderCaptcha' });
}

function lastVerifyParams() {
  const params = verifyCaptcha.mock.calls.at(-1)?.[0];
  expect(params).toBeDefined();
  if (!params) throw new Error('Expected captcha verification parameters');
  return params;
}

async function loadedCaptcha() {
  getChallenge.mockResolvedValueOnce(challenge);
  const wrapper = mountCaptcha();
  await flushPromises();
  return wrapper;
}

describe('server slider captcha', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    getChallenge.mockReset();
    verifyCaptcha.mockReset();
    resume.mockReset();
    solveProof.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads a challenge and renders the server images without exposing a target x', async () => {
    const wrapper = await loadedCaptcha();

    expect(getChallenge).toHaveBeenCalledOnce();
    expect(wrapper.get('[data-test="background"]').attributes('src')).toBe(
      challenge.backgroundImage,
    );
    expect(wrapper.get('[data-test="piece"]').attributes('src')).toBe(
      challenge.pieceImage,
    );
    expect(wrapper.get('[aria-label="滑块拼图验证图片"]')).toBeTruthy();
    expect(wrapper.html()).not.toContain('targetX');
  });

  it('normalizes movement and sends an interpolated, monotonic track', async () => {
    const wrapper = await loadedCaptcha();
    solveProof.mockResolvedValue(17);
    verifyCaptcha.mockResolvedValue({
      captchaToken: 'captcha-token',
      expiresIn: 120,
    });
    let now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const image = wrapper.get('[data-test="image-area"]');
    vi.spyOn(image.element, 'getBoundingClientRect').mockReturnValue({
      bottom: 80,
      height: 80,
      left: 0,
      right: 160,
      top: 0,
      width: 160,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    window.dispatchEvent(new Event('resize'));
    await nextTick();

    const slider = sliderOf(wrapper);
    slider.vm.$emit('start', { pageY: 100 });
    now = 1050;
    slider.vm.$emit('move', { event: { pageY: 102 }, moveX: 35 });
    now = 1300;
    slider.vm.$emit('move', { event: { pageY: 104 }, moveX: 139 });
    now = 1400;
    slider.vm.$emit('end', { pageY: 105 });
    await flushPromises();

    const params = lastVerifyParams();
    expect(params).toMatchObject({
      challengeId: challenge.challengeId,
      duration: 400,
      finalX: 278,
      proofCounter: 17,
      width: 278,
    });
    expect(params.track.length).toBeGreaterThanOrEqual(8);
    expect(new Set(params.track.map(({ t }: { t: number }) => t)).size).toBe(
      params.track.length,
    );
    expect(params.track.at(-1)).toMatchObject({ x: 278, y: 5, t: 400 });
  });

  it('supports touchend changedTouches coordinates', async () => {
    const wrapper = await loadedCaptcha();
    solveProof.mockResolvedValue(3);
    verifyCaptcha.mockResolvedValue({ captchaToken: 'token', expiresIn: 120 });
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const slider = sliderOf(wrapper);
    slider.vm.$emit('start', { touches: [{ pageY: 100 }] });
    now = 300;
    slider.vm.$emit('move', {
      event: { touches: [{ pageY: 103 }] },
      moveX: 100,
    });
    now = 350;
    slider.vm.$emit('end', { changedTouches: [{ pageY: 105 }], touches: [] });
    await flushPromises();

    expect(lastVerifyParams().track.at(-1)?.y).toBe(5);
  });

  it('provides keyboard slider controls and verifies with Enter', async () => {
    const wrapper = await loadedCaptcha();
    solveProof.mockResolvedValue(8);
    verifyCaptcha.mockResolvedValue({
      captchaToken: 'keyboard-token',
      expiresIn: 120,
    });
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const image = wrapper.get('[data-test="image-area"]');

    expect(image.attributes()).toMatchObject({
      'aria-valuemax': '278',
      'aria-valuemin': '0',
      role: 'slider',
      tabindex: '0',
    });
    await image.trigger('keydown', { key: 'ArrowRight' });
    now = 300;
    await image.trigger('keydown', { key: 'ArrowRight' });
    now = 350;
    await image.trigger('keydown', { key: 'Enter' });
    await flushPromises();

    const params = lastVerifyParams();
    expect(params.finalX).toBeGreaterThan(0);
    expect(params.track.length).toBeGreaterThanOrEqual(8);
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([
      'keyboard-token',
    ]);
  });

  it('publishes the token and passed state after successful verification', async () => {
    const wrapper = await loadedCaptcha();
    solveProof.mockResolvedValue(4);
    verifyCaptcha.mockResolvedValue({
      captchaToken: 'captcha-token',
      expiresIn: 120,
    });
    const times = [0, 300, 350];
    vi.spyOn(performance, 'now').mockImplementation(() => times.shift() ?? 350);
    const slider = sliderOf(wrapper);
    slider.vm.$emit('start', { pageY: 0 });
    slider.vm.$emit('move', { event: { pageY: 0 }, moveX: 100 });
    slider.vm.$emit('end', { pageY: 0 });
    await flushPromises();

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([
      'captcha-token',
    ]);
    expect(wrapper.text()).toContain('验证通过');
  });

  it('clears an expired captcha token and loads a new challenge', async () => {
    vi.useFakeTimers();
    getChallenge.mockResolvedValue(challenge);
    const wrapper = mountCaptcha();
    await flushPromises();
    solveProof.mockResolvedValue(4);
    verifyCaptcha.mockResolvedValue({
      captchaToken: 'captcha-token',
      expiresIn: 1,
    });
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const slider = sliderOf(wrapper);
    slider.vm.$emit('start', { pageY: 0 });
    now = 300;
    slider.vm.$emit('move', { event: { pageY: 0 }, moveX: 100 });
    now = 350;
    slider.vm.$emit('end', { pageY: 0 });
    await flushPromises();

    await vi.advanceTimersByTimeAsync(1000);
    await flushPromises();

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['']);
    expect(getChallenge).toHaveBeenCalledTimes(2);
  });

  it('does not verify an unrealistically short drag and refreshes the challenge', async () => {
    getChallenge.mockResolvedValue(challenge);
    const wrapper = mountCaptcha();
    await flushPromises();
    const times = [1000, 1100, 1200];
    vi.spyOn(performance, 'now').mockImplementation(
      () => times.shift() ?? 1200,
    );
    const slider = sliderOf(wrapper);
    slider.vm.$emit('start', { pageY: 0 });
    slider.vm.$emit('move', { event: { pageY: 0 }, moveX: 100 });
    slider.vm.$emit('end', { pageY: 0 });
    await flushPromises();

    expect(verifyCaptcha).not.toHaveBeenCalled();
    expect(getChallenge).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain('验证失败，请重试');
  });

  it('resumes and fetches a fresh challenge after verification fails', async () => {
    getChallenge.mockResolvedValue(challenge);
    const wrapper = mountCaptcha();
    await flushPromises();
    solveProof.mockResolvedValue(4);
    verifyCaptcha.mockRejectedValue(new Error('rejected'));
    const times = [0, 300, 350];
    vi.spyOn(performance, 'now').mockImplementation(() => times.shift() ?? 350);
    const slider = sliderOf(wrapper);
    slider.vm.$emit('start', { pageY: 0 });
    slider.vm.$emit('move', { event: { pageY: 0 }, moveX: 100 });
    slider.vm.$emit('end', { pageY: 0 });
    await flushPromises();

    expect(resume).toHaveBeenCalled();
    expect(getChallenge).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain('验证失败，请重试');
  });

  it('keeps the loading error when fetching a replacement challenge fails', async () => {
    getChallenge
      .mockResolvedValueOnce(challenge)
      .mockRejectedValueOnce(new Error('offline'));
    const wrapper = mountCaptcha();
    await flushPromises();
    solveProof.mockResolvedValue(4);
    verifyCaptcha.mockRejectedValue(new Error('rejected'));
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const slider = sliderOf(wrapper);
    slider.vm.$emit('start', { pageY: 0 });
    now = 300;
    slider.vm.$emit('move', { event: { pageY: 0 }, moveX: 100 });
    now = 350;
    slider.vm.$emit('end', { pageY: 0 });
    await flushPromises();

    expect(wrapper.text()).toContain('验证图片加载失败，请重试');
  });

  it('reset clears the token and obtains a new challenge', async () => {
    getChallenge.mockResolvedValue(challenge);
    const wrapper = mountCaptcha('old-token');
    await flushPromises();

    await (wrapper.vm as unknown as { reset: () => Promise<void> }).reset();
    await flushPromises();

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['']);
    expect(resume).toHaveBeenCalled();
    expect(getChallenge).toHaveBeenCalledTimes(2);
  });

  it('keeps a reset challenge when an aborted proof resolves late', async () => {
    getChallenge.mockResolvedValue(challenge);
    const wrapper = mountCaptcha();
    await flushPromises();
    let resolveProof!: (counter: number) => void;
    solveProof.mockImplementation(
      () => new Promise<number>((resolve) => (resolveProof = resolve)),
    );
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const slider = sliderOf(wrapper);
    slider.vm.$emit('start', { pageY: 0 });
    now = 300;
    slider.vm.$emit('move', { event: { pageY: 0 }, moveX: 100 });
    now = 350;
    slider.vm.$emit('end', { pageY: 0 });
    await nextTick();

    await (wrapper.vm as unknown as { reset: () => Promise<void> }).reset();
    resolveProof(9);
    await flushPromises();

    expect(verifyCaptcha).not.toHaveBeenCalled();
    expect(getChallenge).toHaveBeenCalledTimes(2);
  });

  it('never reports a duration shorter than the real elapsed time', async () => {
    const wrapper = await loadedCaptcha();
    solveProof.mockResolvedValue(1);
    verifyCaptcha.mockResolvedValue({ captchaToken: 'token', expiresIn: 120 });
    let now = 10;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const slider = sliderOf(wrapper);
    slider.vm.$emit('start', { pageY: 0 });
    now = 260.1;
    slider.vm.$emit('move', { event: { pageY: 0 }, moveX: 100 });
    slider.vm.$emit('end', { pageY: 0 });
    await flushPromises();

    const params = lastVerifyParams();
    expect(params.duration).toBeGreaterThanOrEqual(251);
    expect(params.duration).toBe(params.track.at(-1)?.t);
  });

  it('automatically refreshes an expired challenge', async () => {
    vi.useFakeTimers();
    getChallenge.mockResolvedValue({ ...challenge, expiresIn: 1 });
    mountCaptcha();
    await flushPromises();

    await vi.advanceTimersByTimeAsync(1000);
    await flushPromises();

    expect(getChallenge).toHaveBeenCalledTimes(2);
  });

  it('aborts an in-flight proof when unmounted', async () => {
    const wrapper = await loadedCaptcha();
    let proofSignal: AbortSignal | undefined;
    solveProof.mockImplementation(
      (_id, _nonce, _difficulty, _max, signal) =>
        new Promise((_resolve, reject) => {
          proofSignal = signal;
          signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        }),
    );
    const times = [0, 300, 350];
    vi.spyOn(performance, 'now').mockImplementation(() => times.shift() ?? 350);
    const slider = sliderOf(wrapper);
    slider.vm.$emit('start', { pageY: 0 });
    slider.vm.$emit('move', { event: { pageY: 0 }, moveX: 100 });
    slider.vm.$emit('end', { pageY: 0 });
    await nextTick();

    wrapper.unmount();

    expect(proofSignal?.aborted).toBe(true);
    expect(verifyCaptcha).not.toHaveBeenCalled();
  });
});
