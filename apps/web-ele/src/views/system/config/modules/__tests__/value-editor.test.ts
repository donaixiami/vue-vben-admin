import { describe, expect, it, vi } from 'vitest';

import {
  applyConfigValueEditorSchema,
  CAPTCHA_DECOY_MODE_CONFIG_KEY,
  CAPTCHA_DECOY_PROBABILITY_CONFIG_KEY,
  createConfigValueSchema,
  hydrateSystemConfigForm,
  normalizeSystemConfigEditorValues,
  normalizeSystemConfigSubmitValues,
} from '../value-editor';

vi.mock('#/adapter/form', () => {
  const createSchema = (baseCheck: (value: unknown) => boolean) => {
    const checks = [baseCheck];
    const schema = {
      int: () => {
        checks.push((value) => Number.isInteger(value));
        return schema;
      },
      max: (maximum: number) => {
        checks.push((value) => typeof value === 'number' && value <= maximum);
        return schema;
      },
      min: (minimum: number) => {
        checks.push((value) => typeof value === 'number' && value >= minimum);
        return schema;
      },
      refine: (check: (value: string) => boolean) => {
        checks.push((value) => typeof value === 'string' && check(value));
        return schema;
      },
      safeParse: (value: unknown) => ({
        success: checks.every((check) => check(value)),
      }),
    };
    return schema;
  };

  return {
    z: {
      number: () => createSchema((value) => typeof value === 'number'),
      string: () => createSchema((value) => typeof value === 'string'),
    },
  };
});

describe('system config value editor', () => {
  it('restores the base schema before every value editor update', () => {
    const calls: Array<{ method: string; value: unknown }> = [];
    const actions = {
      setState: (value: unknown) => calls.push({ method: 'setState', value }),
      updateSchema: (value: unknown) =>
        calls.push({ method: 'updateSchema', value }),
    };
    const baseSchema = [createConfigValueSchema()];

    applyConfigValueEditorSchema(
      actions,
      baseSchema,
      CAPTCHA_DECOY_MODE_CONFIG_KEY,
    );
    applyConfigValueEditorSchema(actions, baseSchema, 'sys.example');

    expect(calls.map(({ method }) => method)).toEqual([
      'setState',
      'updateSchema',
      'setState',
      'updateSchema',
    ]);
    expect(calls[0]?.value).toEqual({ schema: baseSchema });
    expect(calls[2]?.value).toEqual({ schema: baseSchema });
    expect(calls[1]?.value).toMatchObject([{ component: 'Select' }]);
    expect(calls[3]?.value).toMatchObject([{ component: 'Textarea' }]);
  });

  it('applies the dynamic schema before hydrating form values', async () => {
    const actions = {
      setState: vi.fn(),
      setValues: vi.fn().mockResolvedValue(undefined),
      updateSchema: vi.fn(),
    };
    const baseSchema = [createConfigValueSchema()];
    const values = { config_value: 'random' };

    await hydrateSystemConfigForm(
      actions,
      baseSchema,
      CAPTCHA_DECOY_MODE_CONFIG_KEY,
      values,
    );

    expect(actions.setState).toHaveBeenCalledWith({ schema: baseSchema });
    expect(actions.updateSchema).toHaveBeenCalledWith([
      expect.objectContaining({ component: 'Select' }),
    ]);
    expect(actions.setValues).toHaveBeenCalledWith(values);
    const setStateOrder =
      actions.setState.mock.invocationCallOrder[0] ?? Infinity;
    const updateSchemaOrder =
      actions.updateSchema.mock.invocationCallOrder[0] ?? Infinity;
    const setValuesOrder =
      actions.setValues.mock.invocationCallOrder[0] ?? Infinity;
    expect(setStateOrder).toBeLessThan(updateSchemaOrder);
    expect(updateSchemaOrder).toBeLessThan(setValuesOrder);
  });

  it('normalizes stored probability strings for the number editor', () => {
    for (const [stored, expected] of [
      ['50', 50],
      ['0', 0],
      ['100', 100],
      [null, null],
      ['abc', null],
      ['   ', null],
    ] as const) {
      expect(
        normalizeSystemConfigEditorValues(
          CAPTCHA_DECOY_PROBABILITY_CONFIG_KEY,
          { config_value: stored },
        ),
      ).toEqual({ config_value: expected });
    }

    expect(
      normalizeSystemConfigEditorValues('site.name', { config_value: '50' }),
    ).toEqual({ config_value: '50' });
  });

  it('hydrates the probability editor with a number', async () => {
    const actions = {
      setState: vi.fn(),
      setValues: vi.fn().mockResolvedValue(undefined),
      updateSchema: vi.fn(),
    };

    await hydrateSystemConfigForm(
      actions,
      [createConfigValueSchema()],
      CAPTCHA_DECOY_PROBABILITY_CONFIG_KEY,
      { config_value: '50', name: '概率' },
    );

    expect(actions.setValues).toHaveBeenCalledWith({
      config_value: 50,
      name: '概率',
    });
  });

  it('uses a constrained select for the captcha decoy mode', () => {
    const schema = createConfigValueSchema(CAPTCHA_DECOY_MODE_CONFIG_KEY);

    expect(schema).toMatchObject({
      component: 'Select',
      componentProps: {
        clearable: false,
        options: [
          { label: '概率生成', value: 'random' },
          { label: '必然生成', value: 'always' },
          { label: '不生成', value: 'never' },
        ],
      },
      fieldName: 'config_value',
      label: '参数键值',
    });
    expect(schema.rules && typeof schema.rules !== 'string').toBe(true);
    if (!schema.rules || typeof schema.rules === 'string') return;
    expect(schema.rules.safeParse('random').success).toBe(true);
    expect(schema.rules.safeParse('always').success).toBe(true);
    expect(schema.rules.safeParse('never').success).toBe(true);
    expect(schema.rules.safeParse('sometimes').success).toBe(false);
  });

  it('uses an integer input for the captcha decoy probability', () => {
    const schema = createConfigValueSchema(
      CAPTCHA_DECOY_PROBABILITY_CONFIG_KEY,
    );

    expect(schema).toMatchObject({
      component: 'InputNumber',
      componentProps: {
        max: 100,
        min: 0,
        precision: 0,
        step: 1,
      },
      fieldName: 'config_value',
      label: '参数键值',
    });
    expect(schema.rules && typeof schema.rules !== 'string').toBe(true);
    if (!schema.rules || typeof schema.rules === 'string') return;
    expect(schema.rules.safeParse(0).success).toBe(true);
    expect(schema.rules.safeParse(50).success).toBe(true);
    expect(schema.rules.safeParse(100).success).toBe(true);
    expect(schema.rules.safeParse(-1).success).toBe(false);
    expect(schema.rules.safeParse(50.5).success).toBe(false);
    expect(schema.rules.safeParse(101).success).toBe(false);
  });

  it('keeps the textarea editor for ordinary and unspecified keys', () => {
    for (const key of [undefined, 'sys.example']) {
      expect(createConfigValueSchema(key)).toMatchObject({
        component: 'Textarea',
        componentProps: {
          autosize: { maxRows: 8, minRows: 4 },
          maxlength: 3000,
          showWordLimit: true,
        },
        fieldName: 'config_value',
        formItemClass: 'items-start',
        label: '参数键值',
      });
    }
  });

  it('serializes a numeric config value and preserves existing normalization', () => {
    expect(
      normalizeSystemConfigSubmitValues({
        config_key: ' sys.captcha.decoyProbability ',
        config_value: 50,
        is_system: undefined,
        name: ' 概率 ',
        remark: ' 备注 ',
      }),
    ).toEqual({
      config_key: 'sys.captcha.decoyProbability',
      config_value: '50',
      is_system: false,
      name: '概率',
      remark: ' 备注 ',
    });
  });

  it('normalizes blank and null ordinary values to null', () => {
    const base = {
      config_key: ' sys.example ',
      is_system: true,
      name: ' 示例 ',
      remark: null,
    };

    expect(
      normalizeSystemConfigSubmitValues({ ...base, config_value: '   ' }),
    ).toMatchObject({ config_value: null, remark: null });
    expect(
      normalizeSystemConfigSubmitValues({ ...base, config_value: null }),
    ).toMatchObject({ config_value: null, remark: null });
  });

  it('preserves non-blank config and remark whitespace on submit', () => {
    expect(
      normalizeSystemConfigSubmitValues({
        config_key: 'site.name',
        config_value: '  value  ',
        name: 'Site name',
        remark: '  note  ',
      }),
    ).toMatchObject({
      config_value: '  value  ',
      remark: '  note  ',
    });

    expect(
      normalizeSystemConfigSubmitValues({
        config_key: 'sys.captcha.decoyProbability',
        config_value: 50,
        name: 'Probability',
      }),
    ).toMatchObject({ config_value: '50' });

    expect(
      normalizeSystemConfigSubmitValues({
        config_key: 'site.name',
        config_value: '   ',
        name: 'Site name',
        remark: '   ',
      }),
    ).toMatchObject({ config_value: null, remark: null });
  });
});
