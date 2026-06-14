import type { VxeTableGridOptions } from '#/adapter/vxe-table';

export function useColumns(): VxeTableGridOptions['columns'] {
  return [
    {
      field: 'value',
      title: '键',
    },
    {
      field: 'label',
      title: '值',
    },
    {
      align: 'center',
      cellRender: {
        name: 'CellOperation',
      },
      field: 'operation',
      fixed: 'right',
      title: '操作',
      width: 130,
    },
  ];
}
