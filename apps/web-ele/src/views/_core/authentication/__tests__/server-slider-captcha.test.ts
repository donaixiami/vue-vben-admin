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
        return () =>
          h('div', { 'data-test': 'slider' }, [
            h('div', { name: 'captcha-action' }),
          ]);
      },
    }),
  };
});

function pngData(width: number, height: number) {
  const bytes = new Uint8Array(24);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13]);
  bytes.set([73, 72, 68, 82], 12);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return `data:image/png;base64,${btoa(String.fromCodePoint(...bytes))}`;
}

const challenge = {
  backgroundImage: pngData(320, 160),
  challengeId: '11111111-1111-4111-8111-111111111111',
  expiresIn: 60,
  imageHeight: 160,
  imageWidth: 320,
  movementWidth: 278,
  pieceImage: pngData(42, 42),
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

function setSliderMetrics(
  wrapper: ReturnType<typeof mountCaptcha>,
  wrapperWidth: number,
  actionWidth: number,
) {
  const sliderArea = wrapper.get('[data-test="slider-area"]');
  vi.spyOn(sliderArea.element, 'getBoundingClientRect').mockReturnValue({
    bottom: 40,
    height: 40,
    left: 0,
    right: wrapperWidth,
    top: 0,
    width: wrapperWidth,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
  Object.defineProperty(
    wrapper.get('[name="captcha-action"]').element,
    'offsetWidth',
    { configurable: true, value: actionWidth },
  );
}

function stubResizeObserver() {
  let callback: ResizeObserverCallback | undefined;
  let instance: ResizeObserver | undefined;
  const disconnect = vi.fn();
  const observe = vi.fn();
  const unobserve = vi.fn();
  class ResizeObserverStub {
    disconnect = disconnect;
    observe = observe;
    unobserve = unobserve;

    constructor(nextCallback: ResizeObserverCallback) {
      callback = nextCallback;
      instance = this as unknown as ResizeObserver;
    }
  }
  vi.stubGlobal('ResizeObserver', ResizeObserverStub);
  return {
    disconnect,
    invoke: () => callback?.([], instance as ResizeObserver),
    observe,
    unobserve,
  };
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
    vi.unstubAllGlobals();
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

  it.each([
    ['zero ttl', { expiresIn: 0 }],
    ['NaN ttl', { expiresIn: Number.NaN }],
    ['huge ttl', { expiresIn: 10_000 }],
    ['unsupported proof difficulty', { proofDifficulty: 4 }],
    [
      'zero movement width',
      { imageWidth: 42, movementWidth: 0, pieceWidth: 42 },
    ],
    ['invalid UUID', { challengeId: 'challenge-1' }],
    ['blank nonce', { proofNonce: '   ' }],
    ['piece y outside image', { pieceY: 130 }],
    ['oversized PNG header', { backgroundImage: pngData(10_000, 10_000) }],
    ['wrong piece dimensions', { pieceImage: pngData(43, 42) }],
    ['malformed PNG', { backgroundImage: 'data:image/png;base64,YmFk' }],
    [
      'oversized image data',
      {
        backgroundImage: `data:image/png;base64,${'A'.repeat(1_000_001)}`,
      },
    ],
  ])('rejects an invalid challenge with %s', async (_name, override) => {
    vi.useFakeTimers();
    getChallenge.mockResolvedValueOnce({ ...challenge, ...override });
    const wrapper = mountCaptcha();
    await flushPromises();

    expect(wrapper.find('[data-test="background"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('验证图片加载失败，请重试');
    await vi.advanceTimersByTimeAsync(300_000);
    expect(getChallenge).toHaveBeenCalledOnce();
  });

  it('observes the image area after the asynchronous challenge renders', async () => {
    const observer = stubResizeObserver();
    getChallenge.mockResolvedValue(challenge);
    const wrapper = mountCaptcha();
    await flushPromises();
    const image = wrapper.get('[data-test="image-area"]');

    expect(observer.observe).toHaveBeenCalledWith(image.element);

    await (wrapper.vm as unknown as { reset: () => Promise<void> }).reset();
    expect(observer.unobserve).toHaveBeenCalledWith(image.element);
    const replacement = wrapper.get('[data-test="image-area"]');
    expect(observer.observe).toHaveBeenCalledWith(replacement.element);

    wrapper.unmount();
    expect(observer.unobserve).toHaveBeenCalledWith(replacement.element);
    expect(observer.disconnect).toHaveBeenCalledOnce();
  });

  it('remeasures through ResizeObserver before normalizing movement', async () => {
    const observer = stubResizeObserver();
    const wrapper = await loadedCaptcha();
    solveProof.mockResolvedValue(6);
    verifyCaptcha.mockResolvedValue({ captchaToken: 'token', expiresIn: 120 });
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
    setSliderMetrics(wrapper, 160, 18);
    observer.invoke();
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const slider = sliderOf(wrapper);
    slider.vm.$emit('start', { pageY: 0 });
    now = 300;
    slider.vm.$emit('move', { event: { pageY: 0 }, moveX: 136 });
    now = 350;
    slider.vm.$emit('end', { pageY: 0 });
    await flushPromises();

    expect(observer.observe).toHaveBeenCalledWith(image.element);
    expect(lastVerifyParams().finalX).toBe(278);
    const pieceStyle = (
      wrapper.get('[data-test="piece"]').element as HTMLElement
    ).style;
    expect(pieceStyle.left).toBe('139px');
    expect(pieceStyle.width).toBe('21px');
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

    setSliderMetrics(wrapper, 160, 18);
    const slider = sliderOf(wrapper);
    slider.vm.$emit('start', { pageY: 100 });
    now = 1050;
    slider.vm.$emit('move', { event: { pageY: 102 }, moveX: 34 });
    now = 1300;
    slider.vm.$emit('move', { event: { pageY: 104 }, moveX: 136 });
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
    const pieceStyle = (
      wrapper.get('[data-test="piece"]').element as HTMLElement
    ).style;
    expect(
      Number.parseFloat(pieceStyle.left) + Number.parseFloat(pieceStyle.width),
    ).toBeLessThanOrEqual(160);
  });

  it('does not inflate dense same-millisecond events or duration', async () => {
    const wrapper = await loadedCaptcha();
    solveProof.mockResolvedValue(2);
    verifyCaptcha.mockResolvedValue({ captchaToken: 'token', expiresIn: 120 });
    let now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const slider = sliderOf(wrapper);
    slider.vm.$emit('start', { pageY: 0 });
    for (let index = 0; index < 300; index += 1) {
      slider.vm.$emit('move', {
        event: { pageY: 0 },
        moveX: index % 100,
      });
    }
    now = 1250;
    slider.vm.$emit('end', { pageY: 0 });
    await flushPromises();

    const params = lastVerifyParams();
    expect(params.duration).toBe(250);
    expect(
      params.track.slice(0, 5).every(({ t }: { t: number }) => t === 0),
    ).toBe(true);
    expect(Math.max(...params.track.map(({ t }: { t: number }) => t))).toBe(
      250,
    );
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

  it('disables an expired token before a replacement challenge resolves', async () => {
    vi.useFakeTimers();
    let resolveChallenge!: (value: typeof challenge) => void;
    getChallenge
      .mockResolvedValueOnce(challenge)
      .mockImplementationOnce(
        () => new Promise((resolve) => (resolveChallenge = resolve)),
      );
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

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['']);
    expect(wrapper.find('[data-test="background"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="slider"]').exists()).toBe(false);
    resolveChallenge(challenge);
    await flushPromises();
    expect(wrapper.find('[data-test="background"]').exists()).toBe(true);
    expect(sliderOf(wrapper).attributes('model-value')).toBe('false');
    wrapper.unmount();
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

  it('disables all interaction while a replacement challenge is pending', async () => {
    getChallenge
      .mockResolvedValueOnce(challenge)
      .mockReturnValueOnce(new Promise(() => {}));
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

    expect(wrapper.find('[data-test="background"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('正在加载验证图片');
    now = 700;
    slider.vm.$emit('start', { pageY: 0 });
    slider.vm.$emit('move', { event: { pageY: 0 }, moveX: 200 });
    slider.vm.$emit('end', { pageY: 0 });
    await flushPromises();

    expect(solveProof).toHaveBeenCalledOnce();
    expect(verifyCaptcha).toHaveBeenCalledOnce();
    wrapper.unmount();
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

  it('resets and obtains a new challenge when resetKey changes', async () => {
    getChallenge.mockResolvedValue(challenge);
    const wrapper = mount(ServerSliderCaptcha, { props: { resetKey: 0 } });
    await flushPromises();

    await wrapper.setProps({ resetKey: 1 });
    await flushPromises();

    expect(resume).toHaveBeenCalled();
    expect(getChallenge).toHaveBeenCalledTimes(2);
  });

  it('ignores pointer and keyboard interaction while disabled', async () => {
    getChallenge.mockResolvedValue(challenge);
    const wrapper = mount(ServerSliderCaptcha, { props: { disabled: true } });
    await flushPromises();
    const slider = sliderOf(wrapper);

    slider.vm.$emit('start', { pageY: 0 });
    slider.vm.$emit('move', { event: { pageY: 0 }, moveX: 100 });
    slider.vm.$emit('end', { pageY: 0 });
    await wrapper.get('[data-test="image-area"]').trigger('keydown', {
      key: 'ArrowRight',
    });
    await wrapper.get('[data-test="image-area"]').trigger('keydown', {
      key: 'Enter',
    });
    await flushPromises();

    expect(solveProof).not.toHaveBeenCalled();
    expect(verifyCaptcha).not.toHaveBeenCalled();
    expect(
      wrapper.get('[data-test="image-area"]').attributes('aria-disabled'),
    ).toBe('true');
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

  it('reports the rounded real elapsed duration', async () => {
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
    expect(params.duration).toBe(250);
  });

  it('automatically refreshes an expired challenge', async () => {
    vi.useFakeTimers();
    getChallenge.mockResolvedValue({ ...challenge, expiresIn: 10 });
    mountCaptcha();
    await flushPromises();

    await vi.advanceTimersByTimeAsync(10_000);
    await flushPromises();

    expect(getChallenge).toHaveBeenCalledTimes(2);
  });

  it('removes an expired challenge before its replacement resolves', async () => {
    vi.useFakeTimers();
    getChallenge
      .mockResolvedValueOnce({ ...challenge, expiresIn: 10 })
      .mockReturnValueOnce(new Promise(() => {}));
    const wrapper = mountCaptcha();
    await flushPromises();

    await vi.advanceTimersByTimeAsync(10_000);

    expect(wrapper.find('[data-test="background"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="slider"]').exists()).toBe(false);
  });

  it('removes an expired challenge when refreshing fails', async () => {
    vi.useFakeTimers();
    getChallenge
      .mockResolvedValueOnce({ ...challenge, expiresIn: 10 })
      .mockRejectedValueOnce(new Error('offline'));
    const wrapper = mountCaptcha();
    await flushPromises();

    await vi.advanceTimersByTimeAsync(10_000);
    await flushPromises();

    expect(wrapper.find('[data-test="background"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('验证图片加载失败，请重试');
  });

  it('ignores duplicate end events while verification is running', async () => {
    const wrapper = await loadedCaptcha();
    let resolveProof!: (counter: number) => void;
    solveProof.mockImplementation(
      () => new Promise<number>((resolve) => (resolveProof = resolve)),
    );
    verifyCaptcha.mockResolvedValue({ captchaToken: 'token', expiresIn: 120 });
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const slider = sliderOf(wrapper);
    slider.vm.$emit('start', { pageY: 0 });
    now = 300;
    slider.vm.$emit('move', { event: { pageY: 0 }, moveX: 100 });
    now = 350;
    slider.vm.$emit('end', { pageY: 0 });
    slider.vm.$emit('end', { pageY: 0 });
    resolveProof(1);
    await flushPromises();

    expect(solveProof).toHaveBeenCalledOnce();
    expect(verifyCaptcha).toHaveBeenCalledOnce();
  });

  it('keeps challenge expiry active and aborts pending proof before verify', async () => {
    vi.useFakeTimers();
    getChallenge
      .mockResolvedValueOnce({ ...challenge, expiresIn: 10 })
      .mockReturnValueOnce(new Promise(() => {}));
    const wrapper = mountCaptcha();
    await flushPromises();
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
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const slider = sliderOf(wrapper);
    slider.vm.$emit('start', { pageY: 0 });
    now = 300;
    slider.vm.$emit('move', { event: { pageY: 0 }, moveX: 100 });
    now = 350;
    slider.vm.$emit('end', { pageY: 0 });
    await nextTick();

    await vi.advanceTimersByTimeAsync(10_000);
    await flushPromises();

    expect(proofSignal?.aborted).toBe(true);
    expect(verifyCaptcha).not.toHaveBeenCalled();
    expect(wrapper.find('[data-test="background"]').exists()).toBe(false);
    expect(getChallenge).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });

  it('does not verify after the absolute deadline when the timer is delayed', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    getChallenge.mockResolvedValueOnce({ ...challenge, expiresIn: 10 });
    const wrapper = mountCaptcha();
    await flushPromises();
    solveProof.mockResolvedValue(5);
    verifyCaptcha.mockResolvedValue({ captchaToken: 'late', expiresIn: 120 });
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const slider = sliderOf(wrapper);
    slider.vm.$emit('start', { pageY: 0 });
    now = 300;
    slider.vm.$emit('move', { event: { pageY: 0 }, moveX: 100 });
    now = 350;
    slider.vm.$emit('end', { pageY: 0 });
    vi.setSystemTime(15_000);
    await flushPromises();

    expect(verifyCaptcha).not.toHaveBeenCalled();
    expect(wrapper.find('[data-test="background"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('does not publish a verify result that resolves after challenge expiry', async () => {
    vi.useFakeTimers();
    getChallenge
      .mockResolvedValueOnce({ ...challenge, expiresIn: 10 })
      .mockReturnValueOnce(new Promise(() => {}));
    const wrapper = mountCaptcha();
    await flushPromises();
    solveProof.mockResolvedValue(5);
    let resolveVerify!: (value: {
      captchaToken: string;
      expiresIn: number;
    }) => void;
    verifyCaptcha.mockImplementation(
      () => new Promise((resolve) => (resolveVerify = resolve)),
    );
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const slider = sliderOf(wrapper);
    slider.vm.$emit('start', { pageY: 0 });
    now = 300;
    slider.vm.$emit('move', { event: { pageY: 0 }, moveX: 100 });
    now = 350;
    slider.vm.$emit('end', { pageY: 0 });
    await flushPromises();
    expect(verifyCaptcha).toHaveBeenCalledOnce();

    await vi.advanceTimersByTimeAsync(10_000);
    resolveVerify({ captchaToken: 'expired-token', expiresIn: 120 });
    await flushPromises();

    expect(wrapper.emitted('update:modelValue') ?? []).not.toContainEqual([
      'expired-token',
    ]);
    expect(wrapper.text()).not.toContain('验证通过');
    wrapper.unmount();
  });

  it('cancels touch interaction and proof without verifying', async () => {
    getChallenge
      .mockResolvedValueOnce(challenge)
      .mockReturnValueOnce(new Promise(() => {}));
    const wrapper = mountCaptcha();
    await flushPromises();
    expect(wrapper.get('[data-test="image-area"]').classes()).toContain(
      'touch-none',
    );
    expect(sliderOf(wrapper).classes()).toContain('touch-none');
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
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const slider = sliderOf(wrapper);
    slider.vm.$emit('start', { touches: [{ pageY: 0 }] });
    now = 300;
    slider.vm.$emit('move', {
      event: { touches: [{ pageY: 0 }] },
      moveX: 100,
    });
    now = 350;
    slider.vm.$emit('end', { changedTouches: [{ pageY: 0 }], touches: [] });
    await nextTick();

    await wrapper.trigger('touchcancel');
    await flushPromises();

    expect(proofSignal?.aborted).toBe(true);
    expect(verifyCaptcha).not.toHaveBeenCalled();
    expect(getChallenge).toHaveBeenCalledTimes(2);
    expect(wrapper.find('[data-test="background"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('cancels an active touch drag before proof starts', async () => {
    getChallenge
      .mockResolvedValueOnce(challenge)
      .mockReturnValueOnce(new Promise(() => {}));
    const wrapper = mountCaptcha();
    await flushPromises();
    const slider = sliderOf(wrapper);
    slider.vm.$emit('start', { touches: [{ pageY: 0 }] });
    slider.vm.$emit('move', {
      event: { touches: [{ pageY: 1 }] },
      moveX: 100,
    });

    await wrapper.trigger('touchcancel');
    await flushPromises();

    expect(solveProof).not.toHaveBeenCalled();
    expect(verifyCaptcha).not.toHaveBeenCalled();
    expect(getChallenge).toHaveBeenCalledTimes(2);
    expect(wrapper.find('[data-test="background"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('drops an in-flight verify result after touchcancel', async () => {
    getChallenge
      .mockResolvedValueOnce(challenge)
      .mockReturnValueOnce(new Promise(() => {}));
    const wrapper = mountCaptcha();
    await flushPromises();
    solveProof.mockResolvedValue(7);
    let resolveVerify!: (value: {
      captchaToken: string;
      expiresIn: number;
    }) => void;
    verifyCaptcha.mockImplementation(
      () => new Promise((resolve) => (resolveVerify = resolve)),
    );
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const slider = sliderOf(wrapper);
    slider.vm.$emit('start', { touches: [{ pageY: 0 }] });
    now = 300;
    slider.vm.$emit('move', {
      event: { touches: [{ pageY: 0 }] },
      moveX: 100,
    });
    now = 350;
    slider.vm.$emit('end', { changedTouches: [{ pageY: 0 }], touches: [] });
    await flushPromises();
    expect(verifyCaptcha).toHaveBeenCalledOnce();

    await wrapper.trigger('touchcancel');
    resolveVerify({ captchaToken: 'cancelled-token', expiresIn: 120 });
    await flushPromises();

    expect(wrapper.emitted('update:modelValue') ?? []).not.toContainEqual([
      'cancelled-token',
    ]);
    expect(wrapper.find('[data-test="background"]').exists()).toBe(false);
    wrapper.unmount();
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
