import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { SystemArticleApi } from '#/api';

// import RichEditor from '#/components/RichEditor.vue';
import { $t } from '#/locales';

export function useFormSchema(): VbenFormSchema[] {
  return [
    // {
    //   component: 'Upload',
    //   componentProps: {
    //     // 更多属性见：https://ant.design/components/upload-cn
    //     accept: '.png,.jpg,.jpeg',
    //     // 自动携带认证信息
    //     customRequest: upload_file,
    //     disabled: false,
    //     maxCount: 1,
    //     multiple: false,
    //     showUploadList: true,
    //     // 上传列表的内建样式，支持四种基本样式 text, picture, picture-card 和 picture-circle
    //     listType: 'picture-card',
    //   },
    //   fieldName: 'files',
    //   label: $t('examples.form.file'),
    //   renderComponentContent: () => {
    //     return {
    //       default: () => $t('examples.form.upload-image'),
    //     };
    //   },
    //   rules: 'required',
    // },
    {
      component: 'Input',
      fieldName: 'title',
      label: '文章名称',
      rules: 'required',
    },

    {
      component: 'Input',
      fieldName: 'sub_title',
      label: '副标题',
      rules: 'required',
    },
    {
      component: 'Input',
      fieldName: 'content',
      label: '内容',
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
      fieldName: 'title',
      label: '文章标题',
      componentProps: { allowClear: true },
    },
    {
      component: 'Input',
      fieldName: 'real_name',
      label: '用户昵称',
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

export function useColumns<T = SystemArticleApi.SystemArticle>(
  onActionClick: OnActionClickFn<T>,
  onStatusChange?: (newStatus: any, row: T) => PromiseLike<boolean | undefined>,
): VxeTableGridOptions['columns'] {
  return [
    {
      field: 'id',
      title: '文章ID',
      width: 80,
    },

    {
      cellRender: { name: 'CellImage' },
      field: 'cover',
      title: '封面',
      width: 130,
    },
    {
      field: 'title',
      title: '标题',
      minWidth: 130,
    },
    {
      field: 'sub_title',
      title: '副标题',
      minWidth: 130,
    },
    {
      field: 'creator.real_name',
      title: '用户',
      minWidth: 130,
    },
    {
      field: 'type',
      title: '文章类型',
      width: 130,
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
          nameTitle: '文章',
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
