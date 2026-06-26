import { z } from '#/adapter/form';

type PublishAtValues = {
  publish_at?: null | string;
  send_now?: boolean;
};

type PublishAtFormActions = {
  setFieldValue: (
    field: string,
    value: null | string | undefined,
  ) => Promise<unknown> | unknown;
};

function shouldShowPublishAt(values: PublishAtValues) {
  return values.send_now !== true;
}

function getPublishAtRules(values: PublishAtValues) {
  return shouldShowPublishAt(values)
    ? z
        .string()
        .nullish()
        .refine(
          (value) => !value || isFuturePublishAt(value),
          '定时发布时间不能早于当前时间',
        )
    : null;
}

function disablePastPublishDate(date: Date, now = new Date()) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  return date.getTime() < today.getTime();
}

function getDefaultPublishTime(now = new Date()) {
  return new Date(now);
}

function isFuturePublishAt(value: null | string | undefined, now = new Date()) {
  if (!value) {
    return false;
  }

  const publishAt = new Date(value.replace(' ', 'T')).getTime();
  return Number.isFinite(publishAt) && publishAt >= now.getTime();
}

async function clearPublishAtWhenSendNow(
  values: PublishAtValues,
  actions: PublishAtFormActions,
) {
  if (values.send_now === true && values.publish_at !== null) {
    await actions.setFieldValue('publish_at', null);
  }
}

function normalizePublishAtForSubmit<T extends PublishAtValues>(values: T): T {
  if (values.send_now !== true) {
    return values;
  }

  return {
    ...values,
    publish_at: null,
  };
}

export {
  clearPublishAtWhenSendNow,
  disablePastPublishDate,
  getDefaultPublishTime,
  getPublishAtRules,
  isFuturePublishAt,
  normalizePublishAtForSubmit,
  shouldShowPublishAt,
};
