import type { ComponentPublicInstance } from 'vue';

import { shallowMount } from '@vue/test-utils';

import { afterEach, describe, expect, it, vi } from 'vitest';

import SliderCaptcha from '../slider-captcha/index.vue';
import SliderTranslateCaptcha from './index.vue';

vi.mock('@vben/locales', () => ({
  $t: (key: string, args?: string[]) =>
    args?.length ? `${key}:${args.join(',')}` : key,
}));

const puzzle = {
  backgroundImage: 'data:image/png;base64,background',
  imageHeight: 200,
  imageWidth: 320,
  movementWidth: 255,
  pieceHeight: 65,
  pieceImage: 'data:image/png;base64,piece',
  pieceWidth: 65,
  pieceY: 72,
};

function mouseEvent(type: string, clientY = 50) {
  return new MouseEvent(type, { clientY });
}

function touchEvent(type: string, clientY: number) {
  const event = new Event(type) as TouchEvent;
  const touch = { clientY };
  Object.defineProperties(event, {
    changedTouches: { value: [touch] },
    touches: { value: type === 'touchend' ? [] : [touch] },
  });
  return event;
}

describe('SliderTranslateCaptcha server mode', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders server-provided background and transparent piece without client canvases', () => {
    const wrapper = shallowMount(SliderTranslateCaptcha, {
      props: { mode: 'server', puzzle },
    });

    const background = wrapper.get('[data-testid="captcha-background"]');
    const piece = wrapper.get('[data-testid="captcha-piece"]');

    expect(background.attributes('src')).toBe(puzzle.backgroundImage);
    expect(piece.attributes('src')).toBe(puzzle.pieceImage);
    expect(piece.attributes('style')).toContain('top: 36%');
    expect(piece.attributes('style')).toContain('width: 20.3125%');
    expect(wrapper.findAll('canvas')).toHaveLength(0);
  });

  it('keeps image refresh clickable and moves its prompt to the image bottom', async () => {
    const wrapper = shallowMount(SliderTranslateCaptcha, {
      props: { mode: 'server', puzzle },
    });

    const tip = wrapper.get('[data-testid="captcha-tip"]');

    expect(tip.classes()).toContain('bottom-0');
    expect(tip.classes()).not.toContain('h-15');

    await wrapper.get('[data-testid="captcha-image"]').trigger('click');
    expect(wrapper.emitted('refresh')).toHaveLength(1);
  });

  it('emits normalized source coordinates and interpolated drag evidence', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-12T00:00:00.000Z'));
    const wrapper = shallowMount(SliderTranslateCaptcha, {
      props: { mode: 'server', puzzle },
    });
    const image = wrapper.get('[data-testid="captcha-image"]');
    const sliderHost = wrapper.get('[data-testid="captcha-slider"]');
    image.element.getBoundingClientRect = () =>
      ({
        bottom: 210,
        height: 200,
        left: 0,
        right: 320,
        toJSON: () => ({}),
        top: 10,
        width: 320,
        x: 0,
        y: 10,
      }) as DOMRect;
    sliderHost.element.getBoundingClientRect = () =>
      ({
        bottom: 40,
        height: 40,
        left: 0,
        right: 246,
        toJSON: () => ({}),
        top: 0,
        width: 246,
        x: 0,
        y: 0,
      }) as DOMRect;

    const slider = wrapper.getComponent(SliderCaptcha);
    slider.vm.$emit('start', mouseEvent('mousedown', 50));
    vi.setSystemTime(new Date('2026-07-12T00:00:00.400Z'));
    slider.vm.$emit('move', {
      event: mouseEvent('mousemove', 90),
      moveDistance: 0,
      moveX: 100,
    });
    slider.vm.$emit('end', mouseEvent('mouseup', 90));
    await wrapper.vm.$nextTick();

    const payload = wrapper.emitted('dragEnd')?.[0]?.[0] as {
      duration: number;
      finalX: number;
      track: Array<{ t: number; x: number; y: number }>;
      width: number;
    };
    expect(payload.finalX).toBe(128);
    expect(payload.width).toBe(255);
    expect(payload.duration).toBe(400);
    expect(payload.track.length).toBeGreaterThanOrEqual(8);
    expect(payload.track[0]).toEqual({ t: 0, x: 0, y: 40 });
    expect(payload.track.at(-1)).toEqual({ t: 400, x: 128, y: 80 });
    expect(
      payload.track.every((point, index, points) => {
        const previous = points[index - 1];
        return (
          index === 0 ||
          (previous !== undefined &&
            point.t >= previous.t &&
            point.x - previous.x <= payload.width * 0.45)
        );
      }),
    ).toBe(true);
  });

  it('locks the slider at the released position until the server result resets it', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-12T00:00:00.000Z'));
    const wrapper = shallowMount(SliderTranslateCaptcha, {
      props: { mode: 'server', puzzle },
    });
    const slider = wrapper.getComponent(SliderCaptcha);

    slider.vm.$emit('start', mouseEvent('mousedown'));
    vi.setSystemTime(new Date('2026-07-12T00:00:00.400Z'));
    slider.vm.$emit('move', {
      event: mouseEvent('mousemove'),
      moveDistance: 0,
      moveX: 100,
    });
    slider.vm.$emit('end', mouseEvent('mouseup'));
    await wrapper.vm.$nextTick();

    expect(slider.props('modelValue')).toBe(true);
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();

    await wrapper.setProps({ modelValue: true });
    expect(wrapper.get('[data-testid="captcha-tip"]').text()).toContain(
      'ui.captcha.sliderTranslateSuccessTip:0.4',
    );
    await wrapper.setProps({ modelValue: false });

    (
      wrapper.vm as ComponentPublicInstance & {
        reset: () => void;
      }
    ).reset();
    await wrapper.vm.$nextTick();

    expect(slider.props('modelValue')).toBe(false);
  });

  it('exposes reset and refresh while disabled blocks refresh and dragging', () => {
    const wrapper = shallowMount(SliderTranslateCaptcha, {
      props: { disabled: true, mode: 'server', puzzle },
    });
    const vm = wrapper.vm as ComponentPublicInstance & {
      refresh: () => void;
      reset: () => void;
      resume: () => void;
    };

    expect(wrapper.get('[data-testid="captcha-slider"]').classes()).toContain(
      'pointer-events-none',
    );
    wrapper
      .getComponent(SliderCaptcha)
      .vm.$emit('start', mouseEvent('mousedown'));
    expect(wrapper.emitted('dragEnd')).toBeUndefined();
    wrapper.get('[data-testid="captcha-image"]').trigger('click');
    expect(wrapper.emitted('refresh')).toBeUndefined();

    vm.reset();
    vm.resume();
    vm.refresh();
    expect(wrapper.emitted('refresh')).toHaveLength(1);
  });

  it('supports keyboard dragging through the puzzle-specific slider host', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-12T00:00:00.000Z'));
    const wrapper = shallowMount(SliderTranslateCaptcha, {
      props: { mode: 'server', puzzle },
    });
    const sliderHost = wrapper.get('[data-testid="captcha-slider"]');

    expect(sliderHost.attributes('role')).toBe('slider');
    expect(sliderHost.attributes('aria-valuemax')).toBe('255');
    expect(sliderHost.attributes('tabindex')).toBe('0');

    await sliderHost.trigger('keydown', { key: 'ArrowRight' });
    expect(sliderHost.attributes('aria-valuenow')).toBe('13');
    vi.setSystemTime(new Date('2026-07-12T00:00:00.350Z'));
    await sliderHost.trigger('keydown', { key: 'End' });
    vi.setSystemTime(new Date('2026-07-12T00:00:00.400Z'));
    await sliderHost.trigger('keydown', { key: 'Enter' });

    const payload = wrapper.emitted('dragEnd')?.[0]?.[0] as {
      duration: number;
      finalX: number;
      track: Array<{ t: number; x: number; y: number }>;
      width: number;
    };
    expect(payload).toMatchObject({
      duration: 400,
      finalX: 255,
      width: 255,
    });
    expect(payload.track.length).toBeGreaterThanOrEqual(8);
  });

  it('normalizes touch coordinates into the source image coordinate system', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-12T00:00:00.000Z'));
    const wrapper = shallowMount(SliderTranslateCaptcha, {
      props: { mode: 'server', puzzle },
    });
    const image = wrapper.get('[data-testid="captcha-image"]');
    const sliderHost = wrapper.get('[data-testid="captcha-slider"]');
    image.element.getBoundingClientRect = () =>
      ({ height: 200, top: 10 }) as DOMRect;
    sliderHost.element.getBoundingClientRect = () =>
      ({ width: 246 }) as DOMRect;

    const slider = wrapper.getComponent(SliderCaptcha);
    slider.vm.$emit('start', touchEvent('touchstart', 30));
    vi.setSystemTime(new Date('2026-07-12T00:00:00.300Z'));
    slider.vm.$emit('move', {
      event: touchEvent('touchmove', 70),
      moveDistance: 0,
      moveX: 100,
    });
    vi.setSystemTime(new Date('2026-07-12T00:00:00.400Z'));
    slider.vm.$emit('end', touchEvent('touchend', 90));
    await wrapper.vm.$nextTick();

    const payload = wrapper.emitted('dragEnd')?.[0]?.[0] as {
      track: Array<{ t: number; x: number; y: number }>;
    };
    expect(payload.track[0]?.y).toBe(20);
    expect(payload.track.at(-1)?.y).toBe(80);
  });

  it('refreshes an active server challenge on touch cancellation unless disabled', async () => {
    const wrapper = shallowMount(SliderTranslateCaptcha, {
      props: { mode: 'server', puzzle },
    });
    wrapper
      .getComponent(SliderCaptcha)
      .vm.$emit('start', touchEvent('touchstart', 30));
    await wrapper.get('[data-testid="captcha-slider"]').trigger('touchcancel');

    expect(wrapper.emitted('refresh')).toHaveLength(1);
    expect(
      wrapper.get('[data-testid="captcha-slider"]').attributes('aria-valuenow'),
    ).toBe('0');

    const disabledWrapper = shallowMount(SliderTranslateCaptcha, {
      props: { disabled: true, mode: 'server', puzzle },
    });
    disabledWrapper
      .getComponent(SliderCaptcha)
      .vm.$emit('start', touchEvent('touchstart', 30));
    await disabledWrapper
      .get('[data-testid="captcha-slider"]')
      .trigger('touchcancel');
    expect(disabledWrapper.emitted('refresh')).toBeUndefined();
  });

  it('keeps the canvas-based client mode as the default', () => {
    const wrapper = shallowMount(SliderTranslateCaptcha, {
      props: { src: 'client-image.png' },
    });

    expect(wrapper.findAll('canvas')).toHaveLength(2);
    expect(wrapper.find('[data-testid="captcha-background"]').exists()).toBe(
      false,
    );
  });
});
