import type { SystemDictionaryApi } from '#/api/system/dictionary';

import { getDictionaryByIdentifier } from '#/api/system/dictionary';

type SendStateDictionaryItem = Pick<
  SystemDictionaryApi.DictionaryValueItem,
  'label' | 'value'
>;

type SendStateCellTagOption = {
  label: string;
  type?: string;
  value: number | string;
};

function buildSendStateTagOptions(
  sendStateItems: SendStateDictionaryItem[],
  sendStateColorItems: SendStateDictionaryItem[],
): SendStateCellTagOption[] {
  const colorByValue = new Map(
    sendStateColorItems.map((item) => [String(item.value), item.label]),
  );

  return sendStateItems.map((item) => {
    const type = colorByValue.get(String(item.value));
    return type
      ? {
          label: item.label,
          type,
          value: item.value,
        }
      : {
          label: item.label,
          value: item.value,
        };
  });
}

function extractDictionaryItems(
  dictionary: null | SystemDictionaryApi.DictionaryDetail,
) {
  return Array.isArray(dictionary?.value) ? dictionary.value : [];
}

async function loadSendStateTagOptions(): Promise<SendStateCellTagOption[]> {
  try {
    const sendStateDictionary = await getDictionaryByIdentifier('send_state');
    const sendStateColorDictionary =
      await getDictionaryByIdentifier('send_state_color');

    return buildSendStateTagOptions(
      extractDictionaryItems(sendStateDictionary),
      extractDictionaryItems(sendStateColorDictionary),
    );
  } catch {
    return [];
  }
}

export {
  buildSendStateTagOptions,
  loadSendStateTagOptions,
  type SendStateCellTagOption,
  type SendStateDictionaryItem,
};
