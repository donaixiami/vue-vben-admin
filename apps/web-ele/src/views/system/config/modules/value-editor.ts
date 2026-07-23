import type { VbenFormSchema } from '#/adapter/form';
import type { SystemConfigApi } from '#/api';

import { z } from '#/adapter/form';

export const CAPTCHA_DECOY_MODE_CONFIG_KEY = 'sys.captcha.decoyMode';
export const CAPTCHA_DECOY_PROBABILITY_CONFIG_KEY =
  'sys.captcha.decoyProbability';
export const STORAGE_MIN_FREE_BYTES_CONFIG_KEY = 'sys.storage.minFreeBytes';
const BYTES_PER_GB = 1024 ** 3;

const CONFIG_VALUE_SCHEMA_BASE = {
  fieldName: 'config_value',
  label: '参数键值',
} as const;

const CAPTCHA_DECOY_MODE_OPTIONS = [
  { label: '概率生成', value: 'random' },
  { label: '必然生成', value: 'always' },
  { label: '不生成', value: 'never' },
];

interface ConfigValueEditorSchemaActions {
  setState: (state: { schema: VbenFormSchema[] }) => unknown;
  updateSchema: (schema: Partial<VbenFormSchema>[]) => unknown;
}

interface SystemConfigFormHydrationActions extends ConfigValueEditorSchemaActions {
  setValues: (values: Record<string, unknown>) => Promise<unknown> | unknown;
}

export function applyConfigValueEditorSchema(
  actions: ConfigValueEditorSchemaActions,
  baseSchema: VbenFormSchema[],
  configKey?: string,
) {
  actions.setState({ schema: baseSchema });
  actions.updateSchema([createConfigValueSchema(configKey)]);
}

export function normalizeSystemConfigEditorValues(
  configKey: string | undefined,
  values: Record<string, unknown>,
): Record<string, unknown> {
  if (configKey === STORAGE_MIN_FREE_BYTES_CONFIG_KEY) {
    const configValue = values.config_value;
    if (configValue === null || configValue === undefined) return values;
    const bytes = Number(configValue);
    return {
      ...values,
      config_value:
        Number.isFinite(bytes) && bytes >= 0 ? bytes / BYTES_PER_GB : null,
    };
  }

  if (configKey !== CAPTCHA_DECOY_PROBABILITY_CONFIG_KEY) return values;

  const configValue = values.config_value;
  if (configValue === null || configValue === undefined) return values;

  const normalized =
    typeof configValue === 'string' ? configValue.trim() : configValue;
  if (normalized === '') {
    return { ...values, config_value: null };
  }

  const numericValue =
    typeof normalized === 'number' ? normalized : Number(normalized);
  const isValidProbability =
    Number.isInteger(numericValue) && numericValue >= 0 && numericValue <= 100;

  return {
    ...values,
    config_value: isValidProbability ? numericValue : null,
  };
}

export async function hydrateSystemConfigForm(
  actions: SystemConfigFormHydrationActions,
  baseSchema: VbenFormSchema[],
  configKey: string | undefined,
  values: Record<string, unknown>,
) {
  applyConfigValueEditorSchema(actions, baseSchema, configKey);
  await actions.setValues(normalizeSystemConfigEditorValues(configKey, values));
}

export function createConfigValueSchema(configKey?: string): VbenFormSchema {
  if (configKey === CAPTCHA_DECOY_MODE_CONFIG_KEY) {
    return {
      ...CONFIG_VALUE_SCHEMA_BASE,
      component: 'Select',
      componentProps: {
        allowClear: false,
        clearable: false,
        options: CAPTCHA_DECOY_MODE_OPTIONS,
      },
      rules: z
        .string()
        .refine(
          (value) => ['always', 'never', 'random'].includes(value),
          '参数键值只能为 random、always 或 never',
        ),
    };
  }

  if (configKey === CAPTCHA_DECOY_PROBABILITY_CONFIG_KEY) {
    return {
      ...CONFIG_VALUE_SCHEMA_BASE,
      component: 'InputNumber',
      componentProps: {
        max: 100,
        min: 0,
        precision: 0,
        step: 1,
      },
      rules: z
        .number()
        .int('参数键值必须为整数')
        .min(0, '参数键值不能小于 0')
        .max(100, '参数键值不能大于 100'),
    };
  }

  if (configKey === STORAGE_MIN_FREE_BYTES_CONFIG_KEY) {
    return {
      ...CONFIG_VALUE_SCHEMA_BASE,
      component: 'InputNumber',
      componentProps: {
        min: 0,
        precision: 2,
        step: 1,
      },
      rules: z.number().min(0, '最低保留容量不能小于 0 GB'),
    };
  }

  return {
    ...CONFIG_VALUE_SCHEMA_BASE,
    component: 'Textarea',
    componentProps: {
      autosize: { maxRows: 8, minRows: 4 },
      maxlength: 3000,
      showWordLimit: true,
    },
    formItemClass: 'items-start',
  };
}

type SystemConfigSubmitValues = Omit<
  SystemConfigApi.UpdateConfigParams,
  'config_value'
> & {
  config_value?: null | number | string;
};

function normalizeNullableText(value: null | string | undefined) {
  if (value === undefined || value === null) return null;
  return value.trim() === '' ? null : value;
}

function normalizeConfigValue(value: null | number | string | undefined) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') {
    return value.trim() === '' ? null : value;
  }
  return String(value);
}

export function normalizeSystemConfigSubmitValues(
  values: SystemConfigSubmitValues,
): SystemConfigApi.CreateConfigParams {
  const configValue =
    values.config_key === STORAGE_MIN_FREE_BYTES_CONFIG_KEY &&
    typeof values.config_value === 'number'
      ? String(Math.round(values.config_value * BYTES_PER_GB))
      : normalizeConfigValue(values.config_value);
  return {
    config_key: values.config_key?.trim() ?? '',
    config_value: configValue,
    is_system: values.is_system ?? false,
    name: values.name?.trim() ?? '',
    remark: normalizeNullableText(values.remark),
  };
}
