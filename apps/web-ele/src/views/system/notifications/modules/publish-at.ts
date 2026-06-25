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
  return shouldShowPublishAt(values) ? 'required' : null;
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
  getPublishAtRules,
  normalizePublishAtForSubmit,
  shouldShowPublishAt,
};
