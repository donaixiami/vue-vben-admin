<script setup lang="ts">
import type { AuthApi } from '#/api/core/auth';

import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';

import { SliderCaptcha } from '@vben/common-ui';

import { getCaptchaChallengeApi, verifyCaptchaApi } from '#/api/core/auth';

import { solveCaptchaProof } from './captcha-proof';

interface SliderMoveData {
  event: MouseEvent | TouchEvent;
  moveX: number;
}

interface SliderCaptchaExposed {
  resume: () => void;
}

const modelValue = defineModel<string>({ default: '' });

const challenge = ref<AuthApi.CaptchaChallengeResult>();
const imageArea = ref<HTMLDivElement>();
const slider = ref<SliderCaptchaExposed>();
const sliderArea = ref<HTMLDivElement>();
const displayWidth = ref(320);
const pieceX = ref(0);
const loading = ref(true);
const passed = ref(false);
const statusText = ref('正在加载验证图片…');
const track = ref<AuthApi.TrackPoint[]>([]);

let challengeTimer: ReturnType<typeof setTimeout> | undefined;
let proofController: AbortController | undefined;
let resizeObserver: ResizeObserver | undefined;
let startTime = 0;
let startY = 0;
let lastX = 0;
let destroyed = false;
let dragging = false;
let challengeRequestId = 0;

const scale = computed(() => {
  const imageWidth = challenge.value?.imageWidth ?? 320;
  return Math.min(1, displayWidth.value / imageWidth);
});
const imageHeight = computed(
  () => (challenge.value?.imageHeight ?? 160) * scale.value,
);
const pieceSize = computed(
  () => (challenge.value?.pieceWidth ?? 42) * scale.value,
);
const pieceTop = computed(() => (challenge.value?.pieceY ?? 0) * scale.value);
const pieceLeft = computed(() => pieceX.value * scale.value);
const sliderActionStyle = computed(() => ({
  width: `${Math.max(18, pieceSize.value - 6)}px`,
}));

function eventPageY(event: MouseEvent | TouchEvent) {
  if ('pageY' in event) return event.pageY;
  return event.touches[0]?.pageY ?? event.changedTouches[0]?.pageY ?? startY;
}

function measure() {
  const width = imageArea.value?.getBoundingClientRect().width ?? 0;
  displayWidth.value = width > 0 ? Math.min(width, 320) : 320;
}

function clearChallengeTimer() {
  if (challengeTimer) clearTimeout(challengeTimer);
  challengeTimer = undefined;
}

function abortProof() {
  proofController?.abort();
  proofController = undefined;
}

function clearAttempt() {
  abortProof();
  modelValue.value = '';
  passed.value = false;
  pieceX.value = 0;
  track.value = [];
  lastX = 0;
  startTime = 0;
  startY = 0;
  dragging = false;
}

function expireChallenge() {
  clearChallengeTimer();
  clearAttempt();
  challenge.value = undefined;
  loading.value = true;
  statusText.value = '正在加载验证图片…';
  slider.value?.resume();
}

function scheduleExpiry(expiresIn: number) {
  challengeTimer = setTimeout(
    () => {
      expireChallenge();
      void loadChallenge(false);
    },
    Math.max(0, expiresIn * 1000),
  );
}

async function loadChallenge(showLoading = true) {
  const requestId = ++challengeRequestId;
  clearChallengeTimer();
  abortProof();
  if (showLoading) {
    loading.value = true;
    statusText.value = '正在加载验证图片…';
  }
  try {
    const result = await getCaptchaChallengeApi();
    if (destroyed || requestId !== challengeRequestId) return false;
    challenge.value = result;
    clearAttempt();
    loading.value = false;
    statusText.value = '请拖动滑块完成拼图';
    await nextTick();
    measure();
    scheduleExpiry(result.expiresIn);
    return true;
  } catch {
    if (destroyed || requestId !== challengeRequestId) return false;
    challenge.value = undefined;
    loading.value = false;
    statusText.value = '验证图片加载失败，请重试';
    return false;
  }
}

function elapsedTime() {
  return Math.max(0, Math.round(performance.now() - startTime));
}

function appendPoint(x: number, y: number, elapsed: number) {
  const points = track.value;
  const t = Math.max(0, Math.round(elapsed));
  points.push({ t, x: Math.round(x), y: Math.round(y) });
}

function appendInterpolatedPoint(x: number, y: number, elapsed: number) {
  const previous = track.value.at(-1);
  if (!previous) {
    appendPoint(x, y, elapsed);
    return;
  }
  const targetT = Math.max(previous.t, Math.round(elapsed));
  const timeSteps = Math.ceil((targetT - previous.t) / 40);
  const distanceSteps = Math.ceil(Math.abs(x - previous.x) / 20);
  const steps = Math.max(1, timeSteps, distanceSteps);
  for (let step = 1; step <= steps; step += 1) {
    const ratio = step / steps;
    appendPoint(
      previous.x + (x - previous.x) * ratio,
      previous.y + (y - previous.y) * ratio,
      Math.round(previous.t + (targetT - previous.t) * ratio),
    );
  }
}

function beginAttempt(y: number) {
  if (!challenge.value || loading.value || passed.value) return;
  clearAttempt();
  statusText.value = '请拖动滑块完成拼图';
  startTime = performance.now();
  startY = y;
  dragging = true;
  appendPoint(0, 0, 0);
}

function handleStart(event: MouseEvent | TouchEvent) {
  beginAttempt(eventPageY(event));
}

function handleMove({ event, moveX }: SliderMoveData) {
  const current = challenge.value;
  if (!current || !dragging) return;
  const action = sliderArea.value?.querySelector<HTMLElement>(
    '[name="captcha-action"]',
  );
  const wrapperWidth =
    sliderArea.value?.getBoundingClientRect().width || displayWidth.value;
  const actionWidth = action?.offsetWidth || Math.max(18, pieceSize.value - 6);
  const actualMovementWidth = Math.max(1, wrapperWidth - actionWidth - 6);
  lastX = Math.max(
    0,
    Math.min(
      current.movementWidth,
      (moveX / actualMovementWidth) * current.movementWidth,
    ),
  );
  pieceX.value = lastX;
  appendInterpolatedPoint(lastX, eventPageY(event) - startY, elapsedTime());
}

async function failAttempt() {
  clearAttempt();
  loading.value = false;
  statusText.value = '验证失败，请重试';
  slider.value?.resume();
  const loaded = await loadChallenge(false);
  if (!destroyed && loaded) statusText.value = '验证失败，请重试';
}

async function finishAttempt(finalY: number) {
  const current = challenge.value;
  if (!current || !dragging || loading.value || passed.value) return;
  dragging = false;
  const realElapsed = elapsedTime();
  appendInterpolatedPoint(lastX, finalY - startY, realElapsed);
  const duration = realElapsed;
  if (duration < 250) {
    await failAttempt();
    return;
  }

  clearChallengeTimer();
  loading.value = true;
  statusText.value = '正在验证…';
  const controller = new AbortController();
  proofController = controller;
  try {
    const proofCounter = await solveCaptchaProof(
      current.challengeId,
      current.proofNonce,
      current.proofDifficulty,
      5_000_000,
      controller.signal,
    );
    if (controller.signal.aborted || proofController !== controller) return;
    const result = await verifyCaptchaApi({
      challengeId: current.challengeId,
      duration,
      finalX: Math.round(lastX),
      proofCounter,
      track: track.value.map((point) => ({ ...point })),
      width: current.movementWidth,
    });
    if (
      destroyed ||
      controller.signal.aborted ||
      proofController !== controller
    ) {
      return;
    }
    modelValue.value = result.captchaToken;
    passed.value = true;
    loading.value = false;
    statusText.value = '验证通过';
    scheduleExpiry(result.expiresIn);
  } catch (error) {
    if (
      destroyed ||
      controller.signal.aborted ||
      (error instanceof DOMException && error.name === 'AbortError')
    ) {
      return;
    }
    await failAttempt();
  } finally {
    if (proofController === controller) proofController = undefined;
  }
}

async function handleEnd(event: MouseEvent | TouchEvent) {
  await finishAttempt(eventPageY(event));
}

function handleKeyboard(event: KeyboardEvent) {
  const current = challenge.value;
  if (!current || loading.value || passed.value) return;
  if (event.key === 'Enter') {
    if (!dragging) return;
    event.preventDefault();
    void finishAttempt(startY);
    return;
  }
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  event.preventDefault();
  if (!dragging) beginAttempt(0);
  const direction = event.key === 'ArrowRight' ? 1 : -1;
  const step = Math.max(1, current.movementWidth / 20);
  lastX = Math.max(
    0,
    Math.min(current.movementWidth, lastX + direction * step),
  );
  pieceX.value = lastX;
  appendInterpolatedPoint(lastX, 0, elapsedTime());
}

async function reset() {
  clearChallengeTimer();
  clearAttempt();
  slider.value?.resume();
  await loadChallenge();
}

defineExpose({ reset });

onMounted(() => {
  void loadChallenge();
  window.addEventListener('resize', measure);
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(measure);
    if (imageArea.value) resizeObserver.observe(imageArea.value);
  }
});

onBeforeUnmount(() => {
  destroyed = true;
  clearChallengeTimer();
  abortProof();
  resizeObserver?.disconnect();
  window.removeEventListener('resize', measure);
});
</script>

<template>
  <div class="w-full max-w-[320px] overflow-hidden">
    <div
      v-if="challenge"
      ref="imageArea"
      aria-label="滑块拼图验证图片"
      :aria-disabled="loading || passed"
      :aria-valuemax="challenge.movementWidth"
      aria-valuemin="0"
      :aria-valuenow="Math.round(pieceX)"
      :aria-valuetext="statusText"
      class="relative w-full max-w-[320px] overflow-hidden rounded-md"
      data-test="image-area"
      role="slider"
      tabindex="0"
      :style="{ height: `${imageHeight}px` }"
      @keydown="handleKeyboard"
    >
      <img
        alt=""
        class="absolute inset-0 block h-full w-full select-none"
        data-test="background"
        draggable="false"
        :src="challenge.backgroundImage"
      />
      <img
        alt=""
        class="pointer-events-none absolute select-none"
        data-test="piece"
        draggable="false"
        :src="challenge.pieceImage"
        :style="{
          height: `${pieceSize}px`,
          left: `${pieceLeft}px`,
          top: `${pieceTop}px`,
          width: `${pieceSize}px`,
        }"
      />
    </div>

    <div v-if="challenge" ref="sliderArea" data-test="slider-area">
      <SliderCaptcha
        ref="slider"
        :action-style="sliderActionStyle"
        class="mt-3"
        is-slot
        :model-value="passed"
        success-text="验证通过"
        text="请拖动滑块完成拼图"
        @end="handleEnd"
        @move="handleMove"
        @start="handleStart"
      />
    </div>

    <p class="mt-2 min-h-5 text-sm" role="status">
      {{ statusText }}
    </p>
  </div>
</template>
