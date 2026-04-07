import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { SystemRoleApi } from '#/api';

import { setUploadOss } from '#/api/system/file';
import { $t } from '#/locales';

export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Upload',
      componentProps: {
        accept: '.png,.jpg,.jpeg',
        // 自动携带认证信息
        customRequest: setUploadOss,
        disabled: false,
        maxCount: 1,
        multiple: false,
        showUploadList: true,
        // 上传列表的内建样式，支持四种基本样式 text, picture, picture-card 和 picture-circle
        listType: 'picture-card',
      },
      fieldName: 'files',
      label: $t('examples.form.file'),
      renderComponentContent: () => {
        return {
          default: () => $t('examples.form.upload-image'),
        };
      },
      rules: 'required',
    },
    {
      component: 'Input',
      fieldName: 'username',
      label: '用户名称',
      rules: 'required',
    },
    {
      component: 'Input',
      fieldName: 'password',
      label: '密码',
      rules: 'required',
    },
    {
      component: 'Input',
      fieldName: 'real_name',
      label: '昵称',
      rules: 'required',
    },
    {
      component: 'RadioGroup',
      componentProps: {
        buttonStyle: 'solid',
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
      fieldName: 'realName',
      label: $t('system.role.roleName'),
      componentProps: { allowClear: true },
    },
    {
      component: 'Input',
      fieldName: 'id',
      label: $t('system.role.id'),
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

export function useColumns<T = SystemRoleApi.SystemRole>(
  onActionClick: OnActionClickFn<T>,
  onStatusChange?: (newStatus: any, row: T) => PromiseLike<boolean | undefined>,
): VxeTableGridOptions['columns'] {
  return [
    {
      field: 'id',
      title: $t('system.role.id'),
      width: 80,
    },

    {
      cellRender: { name: 'CellImage' },
      field: 'avatar',
      title: '头像',
      width: 130,
    },
    {
      field: 'realName',
      title: $t('system.role.roleName'),
      minWidth: 200,
    },

    {
      field: 'username',
      title: '用户名',
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
          nameTitle: $t('system.role.name'),
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
