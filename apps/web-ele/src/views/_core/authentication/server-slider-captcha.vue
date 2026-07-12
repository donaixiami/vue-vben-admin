<script setup lang="ts">
import type {
  SliderTranslateCaptchaActionType,
  SliderTranslateCaptchaDragEndData,
} from '@vben/common-ui';

import type { AuthApi } from '#/api/core/auth';

import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { SliderTranslateCaptcha } from '@vben/common-ui';

import { getCaptchaChallengeApi, verifyCaptchaApi } from '#/api/core/auth';

import { solveCaptchaProof } from './captcha-proof';

const props = withDefaults(
  defineProps<{ disabled?: boolean; resetKey?: number }>(),
  { disabled: false, resetKey: 0 },
);

const modelValue = defineModel<string>({ default: '' });
const challenge = ref<AuthApi.CaptchaChallengeResult>();
const slider = ref<SliderTranslateCaptchaActionType>();
const loading = ref(true);
const loadFailed = ref(false);
const verifying = ref(false);
const passed = ref(false);
const statusText = ref('正在加载验证图片…');

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PNG_DATA_PATTERN = /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/;
const MAX_IMAGE_DATA_LENGTH = 1_000_000;
const disabled = computed(
  () => props.disabled || loading.value || verifying.value || passed.value,
);

let destroyed = false;
let challengeController: AbortController | undefined;
let attemptController: AbortController | undefined;
let expiryTimer: ReturnType<typeof setTimeout> | undefined;
let challengeExpiresAt = 0;
let generation = 0;

function abortError(error: unknown, controller?: AbortController) {
  return (
    controller?.signal.aborted ||
    (error instanceof DOMException && error.name === 'AbortError')
  );
}

function clearExpiryTimer() {
  if (expiryTimer) clearTimeout(expiryTimer);
  expiryTimer = undefined;
}

function abortAttempt() {
  attemptController?.abort();
  attemptController = undefined;
  verifying.value = false;
}

function invalidate() {
  generation += 1;
  challengeController?.abort();
  challengeController = undefined;
  abortAttempt();
  clearExpiryTimer();
  challengeExpiresAt = 0;
  challenge.value = undefined;
  modelValue.value = '';
  passed.value = false;
  loading.value = true;
  loadFailed.value = false;
  statusText.value = '正在加载验证图片…';
}

function isIntegerInRange(value: number, min: number, max: number) {
  return (
    Number.isInteger(value) &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
  );
}

function isShortNonBlank(value: unknown, maxLength: number): value is string {
  return (
    typeof value === 'string' && !!value.trim() && value.length <= maxLength
  );
}

function readPngSize(value: unknown) {
  if (
    typeof value !== 'string' ||
    value.length > MAX_IMAGE_DATA_LENGTH ||
    !PNG_DATA_PATTERN.test(value)
  ) {
    return;
  }
  const encoded = value.slice('data:image/png;base64,'.length);
  if (encoded.length < 32) return;
  try {
    const header = atob(encoded.slice(0, 32));
    if (header.length < 24) return;
    const bytes = Uint8Array.from(
      header,
      (character) => character.codePointAt(0) ?? 0,
    );
    if (
      [137, 80, 78, 71, 13, 10, 26, 10].some(
        (byte, index) => bytes[index] !== byte,
      )
    ) {
      return;
    }
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (view.getUint32(8) !== 13 || header.slice(12, 16) !== 'IHDR') return;
    return { height: view.getUint32(20), width: view.getUint32(16) };
  } catch {}
}

function validateChallenge(result: AuthApi.CaptchaChallengeResult) {
  const puzzle = result?.puzzle;
  const backgroundSize = readPngSize(puzzle?.backgroundImage);
  const pieceSize = readPngSize(puzzle?.pieceImage);
  if (
    !result ||
    !UUID_PATTERN.test(result.challengeId) ||
    !isIntegerInRange(result.expiresIn, 10, 300) ||
    !isIntegerInRange(result.proofDifficulty, 1, 3) ||
    !isShortNonBlank(result.proofNonce, 64) ||
    !puzzle ||
    !isIntegerInRange(puzzle.imageWidth, 1, 320) ||
    !isIntegerInRange(puzzle.imageHeight, 1, 160) ||
    !isIntegerInRange(puzzle.pieceWidth, 1, puzzle.imageWidth) ||
    !isIntegerInRange(puzzle.pieceHeight, 1, puzzle.imageHeight) ||
    !isIntegerInRange(
      puzzle.pieceY,
      0,
      puzzle.imageHeight - puzzle.pieceHeight,
    ) ||
    !isIntegerInRange(puzzle.movementWidth, 1, puzzle.imageWidth) ||
    puzzle.movementWidth !== puzzle.imageWidth - puzzle.pieceWidth ||
    backgroundSize?.width !== puzzle.imageWidth ||
    backgroundSize.height !== puzzle.imageHeight ||
    pieceSize?.width !== puzzle.pieceWidth ||
    pieceSize.height !== puzzle.pieceHeight
  ) {
    throw new Error('Invalid captcha challenge');
  }
}

function scheduleReload(expiresAt: number) {
  clearExpiryTimer();
  expiryTimer = setTimeout(
    () => void loadChallenge(),
    Math.max(0, expiresAt - Date.now()),
  );
}

function expired() {
  return challengeExpiresAt <= 0 || Date.now() >= challengeExpiresAt;
}

function validDragData(
  data: SliderTranslateCaptchaDragEndData,
  current: AuthApi.CaptchaChallengeResult,
) {
  return (
    isIntegerInRange(data.duration, 250, 10_000) &&
    isIntegerInRange(data.finalX, 0, current.puzzle.movementWidth) &&
    data.width === current.puzzle.movementWidth &&
    Array.isArray(data.track) &&
    data.track.length >= 8
  );
}

async function loadChallenge() {
  invalidate();
  const currentGeneration = generation;
  const controller = new AbortController();
  challengeController = controller;
  try {
    const result = await getCaptchaChallengeApi(controller.signal);
    if (
      destroyed ||
      currentGeneration !== generation ||
      controller.signal.aborted
    ) {
      return false;
    }
    validateChallenge(result);
    challenge.value = result;
    challengeExpiresAt = Date.now() + result.expiresIn * 1000;
    loading.value = false;
    loadFailed.value = false;
    statusText.value = '请拖动滑块完成拼图';
    scheduleReload(challengeExpiresAt);
    return true;
  } catch (error) {
    if (
      destroyed ||
      currentGeneration !== generation ||
      abortError(error, controller)
    ) {
      return false;
    }
    loading.value = false;
    loadFailed.value = true;
    statusText.value = '验证图片加载失败，请重试';
    return false;
  } finally {
    if (challengeController === controller) challengeController = undefined;
  }
}

async function failAttempt() {
  const loaded = await loadChallenge();
  if (!destroyed && loaded) statusText.value = '验证失败，请重试';
}

async function handleDragEnd(data: SliderTranslateCaptchaDragEndData) {
  const current = challenge.value;
  if (!current || disabled.value) return;
  if (expired()) {
    await loadChallenge();
    return;
  }
  if (!validDragData(data, current)) {
    await failAttempt();
    return;
  }

  const currentGeneration = generation;
  const controller = new AbortController();
  attemptController = controller;
  verifying.value = true;
  statusText.value = '正在验证…';
  try {
    const proofCounter = await solveCaptchaProof(
      current.challengeId,
      current.proofNonce,
      current.proofDifficulty,
      250_000,
      controller.signal,
    );
    if (
      destroyed ||
      currentGeneration !== generation ||
      controller.signal.aborted ||
      expired()
    ) {
      if (expired() && currentGeneration === generation) void loadChallenge();
      return;
    }
    const result = await verifyCaptchaApi(
      {
        challengeId: current.challengeId,
        proofCounter,
        ...data,
      },
      controller.signal,
    );
    if (
      destroyed ||
      currentGeneration !== generation ||
      controller.signal.aborted ||
      expired()
    ) {
      if (expired() && currentGeneration === generation) void loadChallenge();
      return;
    }
    if (
      !isShortNonBlank(result.captchaToken, 2048) ||
      !isIntegerInRange(result.expiresIn, 10, 300)
    ) {
      throw new Error('Invalid captcha verification result');
    }
    modelValue.value = result.captchaToken;
    passed.value = true;
    verifying.value = false;
    statusText.value = '验证通过';
    challengeExpiresAt = Date.now() + result.expiresIn * 1000;
    scheduleReload(challengeExpiresAt);
  } catch (error) {
    if (
      destroyed ||
      currentGeneration !== generation ||
      abortError(error, controller)
    ) {
      return;
    }
    await failAttempt();
  } finally {
    if (attemptController === controller) attemptController = undefined;
  }
}

async function reset() {
  slider.value?.reset();
  await loadChallenge();
}

defineExpose({ reset });

watch(
  () => props.resetKey,
  () => void reset(),
);

onMounted(() => void loadChallenge());
onBeforeUnmount(() => {
  destroyed = true;
  generation += 1;
  challengeController?.abort();
  abortAttempt();
  clearExpiryTimer();
});
</script>

<template>
  <div class="w-full max-w-[320px] overflow-hidden">
    <SliderTranslateCaptcha
      v-if="challenge"
      ref="slider"
      :disabled="disabled"
      mode="server"
      v-model="passed"
      :puzzle="challenge.puzzle"
      @drag-end="handleDragEnd"
      @refresh="reset"
    />
    <button
      v-if="loadFailed"
      class="mt-2 text-sm text-primary underline-offset-4 hover:underline"
      data-test="captcha-retry"
      type="button"
      @click="reset"
    >
      重新加载验证码
    </button>
    <p class="mt-2 min-h-5 text-sm" role="status">{{ statusText }}</p>
  </div>
</template>
