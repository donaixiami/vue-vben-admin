import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { $t } from '#/locales';

export function useColumns(): VxeTableGridOptions['columns'] {
  return [
    {
      field: 'value',
      title: '键',
      width: 200,
    },
    {
      field: 'label',
      title: '值',
      width: 200,
    },
    {
      align: 'center',
      cellRender: {
        name: 'CellOperation',
      },
      field: 'operation',
      fixed: 'right',
      title: $t('system.role.operation'),
      width: 130,
    },
  ];
}
