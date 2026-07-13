import type { Ref } from 'vue';

import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { SystemConfigApi } from '#/api';

import { z } from '#/adapter/form';
import { getSystemConfigKeyExists } from '#/api';
import { $t } from '#/locales';

import { createConfigValueSchema } from './modules/value-editor';

const SYSTEM_FLAG_OPTIONS = [
  { label: '是', type: 'success', value: true },
  { label: '否', type: 'info', value: false },
];

const SENSITIVE_CONFIG_KEYS = new Set(['sys.user.initPassword']);
const SENSITIVE_VALUE_MASK = '••••••••';

function formatConfigValue({
  cellValue,
  row,
}: {
  cellValue?: unknown;
  row: Pick<SystemConfigApi.SystemConfig, 'config_key'>;
}) {
  if (SENSITIVE_CONFIG_KEYS.has(row.config_key)) {
    return SENSITIVE_VALUE_MASK;
  }
  return cellValue === null || cellValue === undefined ? '' : String(cellValue);
}

export function useFormSchema(
  formData: Ref<SystemConfigApi.SystemConfig | undefined>,
): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        maxlength: 100,
        showWordLimit: true,
      },
      fieldName: 'name',
      label: '参数名称',
      rules: z
        .string()
        .min(1, '请输入参数名称')
        .max(100, '参数名称最多100个字符'),
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 100,
        showWordLimit: true,
      },
      fieldName: 'config_key',
      label: '参数键名',
      rules: z
        .string()
        .min(1, '请输入参数键名')
        .max(100, '参数键名最多100个字符')
        .regex(
          /^[A-Za-z0-9_.:-]+$/,
          '参数键名只能包含字母、数字、下划线、点、中划线和冒号',
        )
        .refine(
          async (value: string) => {
            return !(await getSystemConfigKeyExists({
              config_key: value,
              id: formData.value?.id,
            }));
          },
          (value) => ({
            message: `参数键名 ${value} 已存在`,
          }),
        ),
    },
    createConfigValueSchema(),
    {
      component: 'RadioGroup',
      componentProps: {
        buttonStyle: 'solid',
        isButton: true,
        options: SYSTEM_FLAG_OPTIONS,
        optionType: 'button',
      },
      defaultValue: false,
      fieldName: 'is_system',
      label: '系统内置',
    },
    {
      component: 'Textarea',
      componentProps: {
        autosize: { maxRows: 4, minRows: 2 },
        maxlength: 500,
        showWordLimit: true,
      },
      fieldName: 'remark',
      formItemClass: 'items-start',
      label: '备注',
    },
  ];
}

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { allowClear: true, clearable: true },
      fieldName: 'id',
      label: '参数ID',
    },
    {
      component: 'Input',
      componentProps: { allowClear: true, clearable: true },
      fieldName: 'name',
      label: '参数名称',
    },
    {
      component: 'Input',
      componentProps: { allowClear: true, clearable: true },
      fieldName: 'config_key',
      label: '参数键名',
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        clearable: true,
        options: SYSTEM_FLAG_OPTIONS,
      },
      fieldName: 'is_system',
      label: '系统内置',
    },
    {
      component: 'RangePicker',
      componentProps: { valueFormat: 'YYYY-MM-DD HH:mm:ss' },
      fieldName: 'created_at',
      label: '创建时间',
    },
  ];
}

export function useColumns<T = SystemConfigApi.SystemConfig>(
  onActionClick: OnActionClickFn<T>,
): VxeTableGridOptions['columns'] {
  return [
    {
      field: 'id',
      title: 'ID',
      width: 80,
    },
    {
      field: 'name',
      minWidth: 160,
      title: '参数名称',
    },
    {
      field: 'config_key',
      minWidth: 200,
      title: '参数键名',
    },
    {
      field: 'config_value',
      formatter: formatConfigValue,
      minWidth: 260,
      showOverflow: 'tooltip',
      title: '参数键值',
    },
    {
      cellRender: {
        name: 'CellTag',
        options: SYSTEM_FLAG_OPTIONS,
      },
      field: 'is_system',
      title: '系统内置',
      width: 100,
    },
    {
      field: 'remark',
      formatter: formatConfigValue,
      minWidth: 180,
      showOverflow: 'tooltip',
      title: '备注',
    },
    {
      field: 'created_at',
      title: '创建时间',
      width: 180,
    },
    {
      align: 'center',
      cellRender: {
        attrs: {
          nameField: 'name',
          nameTitle: '参数',
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: ['edit', 'delete'],
      },
      field: 'operation',
      fixed: 'right',
      title: $t('system.role.operation'),
      width: 130,
    },
  ];
}
