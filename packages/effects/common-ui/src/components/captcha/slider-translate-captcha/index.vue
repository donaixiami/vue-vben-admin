<script setup lang="ts">
import type {
  CaptchaData,
  CaptchaVerifyPassingData,
  SliderCaptchaActionType,
  SliderRotateVerifyPassingData,
  SliderTranslateCaptchaDragEndData,
  SliderTranslateCaptchaProps,
} from '../types';

import {
  computed,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  unref,
  useTemplateRef,
  watch,
} from 'vue';

import { Check, ChevronsRight } from '@vben/icons';
import { $t } from '@vben/locales';

import { VbenSpineText } from '@vben-core/shadcn-ui';

import SliderCaptcha from '../slider-captcha/index.vue';

type DragEvent = KeyboardEvent | MouseEvent | TouchEvent;

const props = withDefaults(defineProps<SliderTranslateCaptchaProps>(), {
  canvasHeight: 280,
  canvasWidth: 420,
  circleRadius: 10,
  defaultTip: '',
  diffDistance: 3,
  disabled: false,
  mode: 'client',
  squareLength: 42,
  src: '',
});

const emit = defineEmits<{
  dragEnd: [SliderTranslateCaptchaDragEndData];
  refresh: [];
  success: [CaptchaVerifyPassingData];
}>();

const PI = Math.PI;
const MAX_TRACK_DELTA_X = 20;
const MAX_TRACK_DELTA_TIME = 40;
const SLIDER_ACTION_AND_GAP = 46;
const canvasOpr = {
  clip: 'clip',
  fill: 'fill',
} as const;

type CanvasOpr = (typeof canvasOpr)[keyof typeof canvasOpr];

const modalValue = defineModel<boolean>({ default: false });
const slideBarRef = useTemplateRef<SliderCaptchaActionType>('slideBarRef');
const sliderHostRef = useTemplateRef<HTMLDivElement>('sliderHostRef');
const serverImageRef = useTemplateRef<HTMLButtonElement>('serverImageRef');
const puzzleCanvasRef = useTemplateRef<HTMLCanvasElement>('puzzleCanvasRef');
const pieceCanvasRef = useTemplateRef<HTMLCanvasElement>('pieceCanvasRef');

const dragTrack = ref<CaptchaData[]>([]);
const currentSourceX = ref(0);
const keyboardDragging = ref(false);
const serverSliderLocked = ref(false);
const left = ref('0');
let canvasImage: HTMLImageElement | undefined;
let canvasLoadHandler: (() => void) | undefined;

const state = reactive({
  dragging: false,
  endTime: 0,
  isPassing: false,
  moveDistance: 0,
  pieceX: 0,
  pieceY: 0,
  showTip: false,
  startTime: 0,
});

const isServer = computed(() => props.mode === 'server');
const sliderModel = computed({
  get: () =>
    isServer.value
      ? serverSliderLocked.value || modalValue.value
      : modalValue.value,
  set: (value: boolean) => {
    if (isServer.value) {
      serverSliderLocked.value = value;
    } else {
      modalValue.value = value;
    }
  },
});
const displayWidth = computed(() =>
  isServer.value ? props.puzzle?.imageWidth : props.canvasWidth,
);
const componentStyle = computed(() => ({
  maxWidth: displayWidth.value ? `${displayWidth.value}px` : undefined,
}));
const serverImageStyle = computed(() => {
  const puzzle = props.puzzle;
  if (!puzzle) return {};
  return {
    aspectRatio: `${puzzle.imageWidth} / ${puzzle.imageHeight}`,
  };
});
const pieceStyle = computed(() => {
  const puzzle = props.puzzle;
  if (!isServer.value || !puzzle) return { left: left.value };
  return {
    height: `${(puzzle.pieceHeight / puzzle.imageHeight) * 100}%`,
    left: `${(currentSourceX.value / puzzle.imageWidth) * 100}%`,
    top: `${(puzzle.pieceY / puzzle.imageHeight) * 100}%`,
    width: `${(puzzle.pieceWidth / puzzle.imageWidth) * 100}%`,
  };
});
const verifyTip = computed(() =>
  (isServer.value ? modalValue.value : state.isPassing)
    ? $t('ui.captcha.sliderTranslateSuccessTip', [
        ((state.endTime - state.startTime) / 1000).toFixed(1),
      ])
    : $t('ui.captcha.sliderTranslateFailTip'),
);

watch(
  () => state.isPassing,
  (isPassing) => {
    if (isPassing) {
      const time = (state.endTime - state.startTime) / 1000;
      emit('success', { isPassing, time: time.toFixed(1) });
    }
    modalValue.value = isPassing;
  },
);

watch(
  () => props.puzzle,
  () => {
    if (isServer.value) reset();
  },
);

watch(
  () => props.src,
  () => {
    if (!isServer.value) reset();
  },
);

watch(
  () => props.mode,
  () => reset(),
);

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function setLeft(value: string) {
  left.value = value;
}

function getEventClientY(event?: DragEvent) {
  if (!event || event instanceof KeyboardEvent) return undefined;
  if ('clientY' in event) return event.clientY;
  const touch = event.touches[0] ?? event.changedTouches[0];
  return touch?.clientY;
}

function getSourceY(event?: DragEvent) {
  const puzzle = props.puzzle;
  if (!puzzle) return 0;
  const clientY = getEventClientY(event);
  const rect = serverImageRef.value?.getBoundingClientRect();
  if (clientY === undefined || !rect?.height) {
    return Math.round(puzzle.pieceY + puzzle.pieceHeight / 2);
  }
  return Math.round(
    clamp(
      ((clientY - rect.top) / rect.height) * puzzle.imageHeight,
      0,
      puzzle.imageHeight,
    ),
  );
}

function getSliderTravelWidth() {
  const host = sliderHostRef.value;
  const action = host?.querySelector<HTMLElement>('[name="captcha-action"]');
  const track = action?.parentElement;
  const trackWidth =
    track?.getBoundingClientRect().width || track?.offsetWidth || 0;
  const actionWidth =
    action?.getBoundingClientRect().width || action?.offsetWidth || 40;
  if (trackWidth > actionWidth) {
    return Math.max(1, trackWidth - actionWidth - 6);
  }
  const hostWidth =
    host?.getBoundingClientRect().width || host?.offsetWidth || 0;
  if (hostWidth > SLIDER_ACTION_AND_GAP) {
    return hostWidth - SLIDER_ACTION_AND_GAP;
  }
  return Math.max(1, props.puzzle?.movementWidth ?? props.canvasWidth);
}

function appendTrack(targetX: number, targetY: number, elapsed: number) {
  const last = dragTrack.value.at(-1);
  if (!last) {
    dragTrack.value.push({ t: elapsed, x: targetX, y: targetY });
    return;
  }
  const deltaX = targetX - last.x;
  const deltaY = targetY - last.y;
  const deltaTime = Math.max(0, elapsed - last.t);
  if (deltaX === 0 && deltaY === 0 && deltaTime === 0) return;
  const steps = Math.max(
    1,
    Math.ceil(Math.abs(deltaX) / MAX_TRACK_DELTA_X),
    Math.ceil(deltaTime / MAX_TRACK_DELTA_TIME),
  );
  for (let index = 1; index <= steps; index += 1) {
    const progress = index / steps;
    dragTrack.value.push({
      t: Math.round(last.t + deltaTime * progress),
      x: Math.round(last.x + deltaX * progress),
      y: Math.round(last.y + deltaY * progress),
    });
  }
}

function beginServerDrag(event?: DragEvent) {
  if (props.disabled || !props.puzzle) return;
  state.startTime = Date.now();
  state.endTime = 0;
  state.dragging = true;
  state.showTip = false;
  dragTrack.value = [{ t: 0, x: 0, y: getSourceY(event) }];
}

function updateServerDrag(moveX: number, event?: DragEvent) {
  const puzzle = props.puzzle;
  if (props.disabled || !puzzle || !state.startTime) return;
  const travelWidth = getSliderTravelWidth();
  const sourceX = Math.round(
    (clamp(moveX, 0, travelWidth) / travelWidth) * puzzle.movementWidth,
  );
  currentSourceX.value = sourceX;
  state.moveDistance = sourceX;
  appendTrack(sourceX, getSourceY(event), Date.now() - state.startTime);
}

function finishServerDrag(event?: DragEvent) {
  const puzzle = props.puzzle;
  if (props.disabled || !puzzle || !state.startTime) return;
  const duration = Math.max(0, Math.round(Date.now() - state.startTime));
  appendTrack(currentSourceX.value, getSourceY(event), duration);
  state.endTime = Date.now();
  state.dragging = false;
  keyboardDragging.value = false;
  serverSliderLocked.value = true;
  emit('dragEnd', {
    duration,
    finalX: currentSourceX.value,
    track: dragTrack.value.map((point) => ({ ...point })),
    width: puzzle.movementWidth,
  });
}

function handleStart(event: MouseEvent | TouchEvent) {
  if (props.disabled) return;
  if (isServer.value) {
    beginServerDrag(event);
  } else {
    state.startTime = Date.now();
  }
}

function handleDragBarMove(data: SliderRotateVerifyPassingData) {
  if (props.disabled) return;
  state.dragging = true;
  if (isServer.value) {
    updateServerDrag(data.moveX, data.event);
    return;
  }
  state.moveDistance = data.moveX;
  setLeft(`${data.moveX}px`);
}

function handleDragEnd(event: MouseEvent | TouchEvent) {
  if (props.disabled) return;
  if (isServer.value) {
    finishServerDrag(event);
    return;
  }
  if (
    Math.abs(state.pieceX - state.moveDistance) >= (props.diffDistance || 3)
  ) {
    setLeft('0');
    state.moveDistance = 0;
  } else {
    state.isPassing = true;
    state.endTime = Date.now();
  }
  state.showTip = true;
  state.dragging = false;
}

function syncKeyboardSlider() {
  const host = sliderHostRef.value;
  const action = host?.querySelector<HTMLElement>('[name="captcha-action"]');
  const track = action?.parentElement;
  const bar = track?.firstElementChild as HTMLElement | undefined;
  if (!action || !track) return;
  const travelWidth = getSliderTravelWidth();
  const movementWidth = props.puzzle?.movementWidth || 1;
  const moveX = (currentSourceX.value / movementWidth) * travelWidth;
  action.style.left = `${moveX}px`;
  if (bar) bar.style.width = `${moveX + action.offsetWidth / 2}px`;
}

function handleKeyboard(event: KeyboardEvent) {
  const puzzle = props.puzzle;
  if (!isServer.value || props.disabled || !puzzle) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    reset();
    return;
  }
  if (event.key === 'Enter' || event.key === ' ') {
    if (!keyboardDragging.value) return;
    event.preventDefault();
    finishServerDrag(event);
    return;
  }
  if (!['ArrowLeft', 'ArrowRight', 'End', 'Home'].includes(event.key)) return;
  event.preventDefault();
  if (!keyboardDragging.value) {
    keyboardDragging.value = true;
    beginServerDrag(event);
  }
  const step = Math.max(1, Math.round(puzzle.movementWidth / 20));
  let sourceX = currentSourceX.value;
  switch (event.key) {
    case 'ArrowLeft': {
      sourceX -= step;
      break;
    }
    case 'End': {
      sourceX = puzzle.movementWidth;
      break;
    }
    case 'Home': {
      sourceX = 0;
      break;
    }
    default: {
      sourceX += step;
    }
  }
  currentSourceX.value = clamp(sourceX, 0, puzzle.movementWidth);
  state.moveDistance = currentSourceX.value;
  appendTrack(
    currentSourceX.value,
    getSourceY(event),
    Date.now() - state.startTime,
  );
  syncKeyboardSlider();
}

function clearCanvasImage() {
  if (!canvasImage) return;
  if (canvasLoadHandler) {
    canvasImage.removeEventListener('load', canvasLoadHandler);
  }
  canvasImage = undefined;
  canvasLoadHandler = undefined;
}

function resetCanvas() {
  const puzzleCanvas = unref(puzzleCanvasRef);
  const pieceCanvas = unref(pieceCanvasRef);
  if (!puzzleCanvas || !pieceCanvas) return;
  pieceCanvas.width = props.canvasWidth;
  pieceCanvas.height = props.canvasHeight;
  puzzleCanvas
    .getContext('2d')
    ?.clearRect(0, 0, props.canvasWidth, props.canvasHeight);
  pieceCanvas
    .getContext('2d', { willReadFrequently: true })
    ?.clearRect(0, 0, props.canvasWidth, props.canvasHeight);
}

function initCanvas() {
  if (isServer.value) return;
  const puzzleCanvas = unref(puzzleCanvasRef);
  const pieceCanvas = unref(pieceCanvasRef);
  if (!puzzleCanvas || !pieceCanvas) return;
  const puzzleCanvasCtx = puzzleCanvas.getContext('2d');
  const pieceCanvasCtx = pieceCanvas.getContext('2d', {
    willReadFrequently: true,
  });
  if (!puzzleCanvasCtx || !pieceCanvasCtx) return;
  clearCanvasImage();
  const image = new Image();
  canvasImage = image;
  image.crossOrigin = 'Anonymous';
  canvasLoadHandler = () => {
    if (canvasImage !== image) return;
    draw(puzzleCanvasCtx, pieceCanvasCtx);
    puzzleCanvasCtx.drawImage(
      image,
      0,
      0,
      props.canvasWidth,
      props.canvasHeight,
    );
    pieceCanvasCtx.drawImage(
      image,
      0,
      0,
      props.canvasWidth,
      props.canvasHeight,
    );
    const pieceLength = props.squareLength + 2 * props.circleRadius + 3;
    const sourceY = state.pieceY - 2 * props.circleRadius - 1;
    const imageData = pieceCanvasCtx.getImageData(
      state.pieceX,
      sourceY,
      pieceLength,
      pieceLength,
    );
    pieceCanvas.width = pieceLength;
    pieceCanvasCtx.putImageData(imageData, 0, sourceY);
    setLeft('0');
  };
  image.addEventListener('load', canvasLoadHandler);
  image.src = props.src;
}

function getRandomNumberByRange(start: number, end: number) {
  return Math.round(Math.random() * (end - start) + start);
}

function draw(ctx1: CanvasRenderingContext2D, ctx2: CanvasRenderingContext2D) {
  state.pieceX = getRandomNumberByRange(
    props.squareLength + 2 * props.circleRadius,
    props.canvasWidth - (props.squareLength + 2 * props.circleRadius),
  );
  state.pieceY = getRandomNumberByRange(
    3 * props.circleRadius,
    props.canvasHeight - (props.squareLength + 2 * props.circleRadius),
  );
  drawPiece(ctx1, state.pieceX, state.pieceY, canvasOpr.fill);
  drawPiece(ctx2, state.pieceX, state.pieceY, canvasOpr.clip);
}

function drawPiece(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  operation: CanvasOpr,
) {
  context.beginPath();
  context.moveTo(x, y);
  context.arc(
    x + props.squareLength / 2,
    y - props.circleRadius + 2,
    props.circleRadius,
    0.72 * PI,
    2.26 * PI,
  );
  context.lineTo(x + props.squareLength, y);
  context.arc(
    x + props.squareLength + props.circleRadius - 2,
    y + props.squareLength / 2,
    props.circleRadius,
    1.21 * PI,
    2.78 * PI,
  );
  context.lineTo(x + props.squareLength, y + props.squareLength);
  context.lineTo(x, y + props.squareLength);
  context.arc(
    x + props.circleRadius - 2,
    y + props.squareLength / 2,
    props.circleRadius + 0.4,
    2.76 * PI,
    1.24 * PI,
    true,
  );
  context.lineTo(x, y);
  context.lineWidth = 2;
  context.fillStyle = 'rgba(255, 255, 255, 0.7)';
  context.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  context.stroke();
  operation === canvasOpr.clip ? context.clip() : context.fill();
  context.globalCompositeOperation = 'destination-over';
}

function resetState() {
  state.dragging = false;
  state.endTime = 0;
  state.isPassing = false;
  state.moveDistance = 0;
  state.pieceX = 0;
  state.pieceY = 0;
  state.showTip = false;
  state.startTime = 0;
  currentSourceX.value = 0;
  dragTrack.value = [];
  keyboardDragging.value = false;
  serverSliderLocked.value = false;
  setLeft('0');
}

function reset() {
  resetState();
  slideBarRef.value?.resume?.();
  clearCanvasImage();
  if (!isServer.value) {
    resetCanvas();
    initCanvas();
  }
}

function resume() {
  reset();
}

function refresh() {
  reset();
  emit('refresh');
}

function handleRefreshClick() {
  if (!props.disabled) refresh();
}

function handleTouchCancel() {
  if (props.disabled || !isServer.value || !state.dragging) return;
  reset();
  emit('refresh');
}

defineExpose({ refresh, reset, resume });

onMounted(() => initCanvas());
onBeforeUnmount(() => clearCanvasImage());
</script>

<template>
  <div
    :style="componentStyle"
    class="relative flex w-full flex-col items-center"
  >
    <button
      v-if="isServer && puzzle"
      ref="serverImageRef"
      :aria-disabled="disabled"
      :disabled="disabled"
      :style="serverImageStyle"
      :aria-label="$t('ui.captcha.refreshAriaLabel')"
      class="relative block w-full overflow-hidden border border-border p-0 shadow-md"
      data-testid="captcha-image"
      type="button"
      @click="handleRefreshClick"
    >
      <img
        :src="puzzle.backgroundImage"
        :alt="$t('ui.captcha.alt')"
        class="block size-full object-fill"
        data-testid="captcha-background"
        draggable="false"
      />
      <img
        :src="puzzle.pieceImage"
        :style="pieceStyle"
        alt=""
        aria-hidden="true"
        class="pointer-events-none absolute object-fill"
        data-testid="captcha-piece"
        draggable="false"
      />
      <div
        class="absolute bottom-0 left-0 z-10 w-full text-center text-xs text-white"
        data-testid="captcha-tip"
      >
        <div v-if="modalValue" class="bg-success/80 px-2 py-1.5">
          {{ verifyTip }}
        </div>
        <div v-else-if="!state.dragging" class="bg-black/45 px-2 py-1.5">
          {{ defaultTip || $t('ui.captcha.sliderTranslateDefaultTip') }}
        </div>
      </div>
    </button>

    <div
      v-else-if="isServer"
      class="flex min-h-40 w-full items-center justify-center border border-border text-xs text-muted-foreground"
    >
      {{ defaultTip || $t('ui.captcha.sliderTranslateDefaultTip') }}
    </div>

    <div
      v-else
      class="relative flex max-w-full cursor-pointer overflow-hidden border border-border shadow-md"
      data-testid="captcha-refresh"
      @click="handleRefreshClick"
    >
      <canvas
        ref="puzzleCanvasRef"
        :height="canvasHeight"
        :width="canvasWidth"
        class="block h-auto max-w-full"
      ></canvas>
      <canvas
        ref="pieceCanvasRef"
        :height="canvasHeight"
        :style="pieceStyle"
        :width="canvasWidth"
        class="absolute"
      ></canvas>
      <div
        class="absolute bottom-0 left-0 z-10 w-full text-center text-xs text-white"
        data-testid="captcha-tip"
      >
        <div
          v-if="state.showTip"
          :class="{
            'bg-success/80': state.isPassing,
            'bg-destructive/80': !state.isPassing,
          }"
          class="px-2 py-1.5"
        >
          {{ verifyTip }}
        </div>
        <div v-if="!state.dragging" class="bg-black/45 px-2 py-1.5">
          {{ defaultTip || $t('ui.captcha.sliderTranslateDefaultTip') }}
        </div>
      </div>
    </div>

    <div
      ref="sliderHostRef"
      :aria-disabled="disabled"
      :aria-valuemax="isServer ? puzzle?.movementWidth : undefined"
      aria-valuemin="0"
      :aria-valuenow="isServer ? currentSourceX : undefined"
      :aria-label="isServer ? $t('ui.captcha.sliderDefaultText') : undefined"
      :class="{
        'pointer-events-none opacity-60': disabled,
      }"
      :role="isServer ? 'slider' : undefined"
      :tabindex="isServer ? (disabled ? -1 : 0) : undefined"
      class="w-full"
      data-testid="captcha-slider"
      @keydown="handleKeyboard"
      @touchcancel.capture="handleTouchCancel"
    >
      <SliderCaptcha
        ref="slideBarRef"
        v-model="sliderModel"
        class="mt-5"
        is-slot
        @end="handleDragEnd"
        @move="handleDragBarMove"
        @start="handleStart"
      >
        <template #text="{ isPassing: sliderPassing }">
          <slot :is-passing="isServer ? modalValue : sliderPassing" name="text">
            <VbenSpineText class="flex h-full items-center">
              {{
                (isServer ? modalValue : sliderPassing)
                  ? $t('ui.captcha.sliderSuccessText')
                  : $t('ui.captcha.sliderDefaultText')
              }}
            </VbenSpineText>
          </slot>
        </template>
        <template #actionIcon="{ isPassing: sliderPassing }">
          <slot
            :is-passing="isServer ? modalValue : sliderPassing"
            name="actionIcon"
          >
            <Check v-if="isServer ? modalValue : sliderPassing" />
            <ChevronsRight v-else />
          </slot>
        </template>
      </SliderCaptcha>
    </div>
  </div>
</template>
