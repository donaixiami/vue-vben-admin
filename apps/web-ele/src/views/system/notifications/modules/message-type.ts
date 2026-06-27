import type { SystemDictionaryApi } from '#/api/system/dictionary';

import { getDictionaryByIdentifier } from '#/api/system/dictionary';

type MessageTypeDictionaryItem = Pick<
  SystemDictionaryApi.DictionaryValueItem,
  'label' | 'value'
>;

type MessageTypeCellTagOption = {
  label: string;
  type?: string;
  value: number | string;
};

function extractDictionaryItems(
  dictionary: null | SystemDictionaryApi.DictionaryDetail,
) {
  return Array.isArray(dictionary?.value) ? dictionary.value : [];
}

function buildMessageTypeTagOptions(
  messageTypeItems: MessageTypeDictionaryItem[],
  messageTypeColorItems: MessageTypeDictionaryItem[],
): MessageTypeCellTagOption[] {
  const colorByValue = new Map(
    messageTypeColorItems.map((item) => [String(item.value), item.label]),
  );

  return messageTypeItems.map((item) => {
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

async function loadMessageTypeTagOptions(): Promise<
  MessageTypeCellTagOption[]
> {
  try {
    const messageTypeDictionary =
      await getDictionaryByIdentifier('message_type');
    const messageTypeColorDictionary =
      await getDictionaryByIdentifier('message_type_color');

    return buildMessageTypeTagOptions(
      extractDictionaryItems(messageTypeDictionary),
      extractDictionaryItems(messageTypeColorDictionary),
    );
  } catch {
    return [];
  }
}

export {
  buildMessageTypeTagOptions,
  loadMessageTypeTagOptions,
  type MessageTypeCellTagOption,
  type MessageTypeDictionaryItem,
};
