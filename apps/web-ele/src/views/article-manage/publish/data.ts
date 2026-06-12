import type { VbenFormSchema } from '#/adapter/form';

import { z } from '#/adapter/form';
import { getCategoryTypeList } from '#/api/system/category-type';
import { $t } from '#/locales';

export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入文章标题',
      },
      fieldName: 'title',
      label: '文章标题',
      rules: z
        .string()
        .min(2, '文章标题至少2个字符')
        .max(100, '文章标题最多100个字符'),
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入副标题（可选）',
      },
      fieldName: 'sub_title',
      label: '副标题',
    },
    {
      component: 'ApiSelect',
      componentProps: {
        api: getCategoryTypeList,
        fieldNames: {
          label: 'name',
          value: 'name',
        },
        placeholder: '请选择文章分类',
      },
      fieldName: 'type',
      label: '文章分类',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入封面图片URL',
      },
      fieldName: 'cover',
      label: '封面图片',
      help: '请输入图片URL地址',
    },
    {
      component: 'Textarea',
      componentProps: {
        placeholder: '请输入文章内容',
        rows: 12,
      },
      fieldName: 'content',
      label: '文章内容',
      rules: z.string().min(10, '文章内容至少10个字符'),
    },
    {
      component: 'RadioGroup',
      componentProps: {
        buttonStyle: 'solid',
        options: [
          { label: '显示', value: 1 },
          { label: '隐藏', value: 0 },
        ],
        optionType: 'button',
      },
      defaultValue: 1,
      fieldName: 'evidently',
      label: '是否显示',
      help: '控制文章是否在前台显示',
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
      help: '启用后文章才能正常访问',
    },
  ];
}
