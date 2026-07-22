import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { SystemFileApi } from '#/api';

import { $t } from '#/locales';
import { formatByteSize, formatImageSize } from '#/utils/private-upload-form';

import { canPreviewFile } from './modules/file-image-preview';

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'id',
      label: 'ID',
      componentProps: { allowClear: true },
    },
    {
      component: 'Input',
      fieldName: 'original_name',
      label: '文件名',
      componentProps: { allowClear: true },
    },
    {
      component: 'RangePicker',
      fieldName: 'created_at',
      label: $t('system.role.createTime'),
      componentProps: { valueFormat: 'YYYY-MM-DD HH:mm:ss' },
    },
  ];
}

export function useColumns<T = SystemFileApi.SystemFile>(
  onActionClick: OnActionClickFn<T>,
): VxeTableGridOptions['columns'] {
  return [
    { field: 'id', title: 'ID', width: 80 },
    {
      field: 'original_name',
      title: '文件名',
      minWidth: 200,
    },
    {
      field: 'mime_type',
      title: 'MIME',
      minWidth: 140,
    },
    {
      field: 'byte_size',
      title: '大小',
      width: 110,
      formatter: ({ cellValue }) => formatByteSize(cellValue),
    },
    {
      field: 'is_image',
      title: '图片',
      width: 80,
      formatter: ({ cellValue }) => (cellValue ? '是' : '否'),
    },
    {
      field: 'image_size',
      title: '尺寸',
      width: 110,
      formatter: ({ row }) =>
        formatImageSize((row as any)?.image_width, (row as any)?.image_height),
    },
    {
      field: 'content_hash_prefix',
      title: 'Hash 前缀',
      minWidth: 140,
    },
    {
      field: 'ref_count',
      title: '引用数',
      width: 90,
    },
    {
      field: 'delete_status',
      title: '删除状态',
      width: 110,
    },
    {
      field: 'created_at',
      title: $t('system.role.createTime'),
      width: 180,
    },
    {
      align: 'center',
      cellRender: {
        attrs: {
          nameField: 'original_name',
          nameTitle: '文件',
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: [
          {
            code: 'view',
            contentText: '查看',
            link: true,
            show: (row: SystemFileApi.SystemFile) => canPreviewFile(row),
          },
          'delete',
        ],
      },
      field: 'operation',
      fixed: 'right',
      title: $t('system.role.operation'),
      width: 160,
    },
  ];
}
