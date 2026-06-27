import type { Ref } from 'vue';

import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { SystemDictionaryApi } from '#/api';

import { h } from 'vue';

import { z } from '#/adapter/form';
import { isMenuIdentifierExists } from '#/api';
import { $t } from '#/locales';

import ValueTable from './modules/value-table.vue';

export function useFormSchema(
  formData: Ref<SystemDictionaryApi.SystemDictionary | undefined>,
): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'identifier',
      label: '唯一标识',
      rules: z
        .string()
        .min(2, $t('ui.formRules.minLength', [$t('system.menu.menuName'), 2]))
        .max(30, $t('ui.formRules.maxLength', [$t('system.menu.menuName'), 30]))
        .regex(/^[A-Za-z_]+$/, '唯一标识只能包含字母和下划线')
        .refine(
          async (value: string) => {
            return !(await isMenuIdentifierExists(value, formData.value?.id));
          },
          (value) => ({
            message: $t('ui.formRules.alreadyExists', [
              $t('system.menu.menuName'),
              value,
            ]),
          }),
        ),
    },
    {
      component: 'Input',
      fieldName: 'name',
      label: '字典名称',
      rules: 'required',
    },

    {
      formItemClass: 'items-start',
      fieldName: 'valueList',
      label: '内容',
      rules: 'required',
      component: h(ValueTable),
      defaultValue: [],
    },

    {
      component: 'InputNumber',
      fieldName: 'sort',
      label: '排序',
      rules: 'required',
      defaultValue: 0,
      componentProps: {
        class: 'w-full',
      },
    },

    {
      component: 'RadioGroup',
      componentProps: {
        buttonStyle: 'solid',
        isButton: true,
        options: [
          { label: $t('common.enabled'), value: 1 },
          { label: $t('common.disabled'), value: 0 },
        ],
        optionType: 'button',
      },
      defaultValue: 1,
      fieldName: 'status',
      label: $t('system.role.status'),
    },
  ];
}

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'id',
      label: '字典ID',
      componentProps: { allowClear: true },
    },
    {
      component: 'Input',
      fieldName: 'name',
      label: '字典名称',
      componentProps: { allowClear: true },
    },
    {
      component: 'Input',
      fieldName: 'identifier',
      label: '字典key',
      componentProps: { allowClear: true },
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: [
          { label: $t('common.enabled'), value: 1 },
          { label: $t('common.disabled'), value: 0 },
        ],
      },
      fieldName: 'status',
      label: $t('system.role.status'),
    },

    {
      component: 'RangePicker',
      fieldName: 'created_at',
      label: $t('system.role.createTime'),
      componentProps: { valueFormat: 'YYYY-MM-DD HH:mm:ss' },
    },
  ];
}

export function useColumns<T = SystemDictionaryApi.SystemDictionary>(
  onActionClick: OnActionClickFn<T>,
  onStatusChange?: (newStatus: any, row: T) => PromiseLike<boolean | undefined>,
): VxeTableGridOptions['columns'] {
  return [
    {
      field: 'id',
      title: 'ID',
      width: 80,
    },

    {
      field: 'name',
      title: '字典名称',
      minWidth: 200,
    },

    {
      field: 'identifier',
      title: '字典key',
      minWidth: 200,
    },

    {
      cellRender: {
        attrs: { beforeChange: onStatusChange },
        name: onStatusChange ? 'CellSwitch' : 'CellTag',
      },
      field: 'status',
      title: $t('system.role.status'),
      width: 100,
    },

    {
      field: 'created_at',
      title: $t('system.role.createTime'),
      width: 200,
    },
    {
      align: 'center',
      cellRender: {
        attrs: {
          nameField: 'name',
          nameTitle: '字典',
          onClick: onActionClick,
        },
        name: 'CellOperation',
      },
      field: 'operation',
      fixed: 'right',
      title: $t('system.role.operation'),
      width: 130,
    },
  ];
}

export function useValueTableColumns<
  T = { id: number; label: string; value: string },
>(onActionClick: OnActionClickFn<T>): VxeTableGridOptions['columns'] {
  return [
    {
      field: 'value',
      title: '键',
      editRender: {
        name: 'input',
        attrs: {
          placeholder: '请输入键',
          class: 'vxe-default-input w-full px-2',
        },
      },
    },
    {
      field: 'label',
      title: '值',
      editRender: {
        name: 'input',
        attrs: {
          class: 'vxe-default-input w-full px-2',
          placeholder: '请输入值',
        },
      },
    },
    {
      align: 'center',
      cellRender: {
        attrs: {
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: ['delete'], // 🔥 只显示删除
      },
      field: 'operation',
      fixed: 'right',
      title: '操作',
      width: 130,
    },
  ];
}
