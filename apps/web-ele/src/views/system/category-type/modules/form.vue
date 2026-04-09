<script lang="ts" setup>
import type { Recordable } from '@vben/types';

import type { VbenFormSchema } from '#/adapter/form';
import type { SystemCategoryTypeApi } from '#/api';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { $te } from '@vben/locales';
import { getPopupContainer } from '@vben/utils';

import { breakpointsTailwind, useBreakpoints } from '@vueuse/core';

import { useVbenForm, z } from '#/adapter/form';
import {
  createCategoryType,
  getCategoryTypeTree,
  isMenuNameExists,
  updateCategoryType,
} from '#/api';
import { $t } from '#/locales';

const emit = defineEmits<{
  success: [];
}>();
const formData = ref<SystemCategoryTypeApi.SystemCategoryType>();
const titleSuffix = ref<string>();
const schema: VbenFormSchema[] = [
  {
    component: 'Input',
    fieldName: 'name',
    label: '分类名称',
    rules: z
      .string()
      .min(2, $t('ui.formRules.minLength', [$t('system.menu.menuName'), 2]))
      .max(30, $t('ui.formRules.maxLength', [$t('system.menu.menuName'), 30]))
      .refine(
        async (value: string) => {
          return !(await isMenuNameExists(value, formData.value?.id));
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
    component: 'ApiTreeSelect',
    componentProps: {
      api: getCategoryTypeTree,
      class: 'w-full',
      filterTreeNode(input: string, node: Recordable<any>) {
        console.log('node:::', node);
        console.log('input:::', input);
        if (!input || input.length === 0) {
          return true;
        }
        const title: string = node.name ?? '';
        if (!title) return false;
        return title.includes(input) || $t(title).includes(input);
      },
      getPopupContainer,
      labelField: 'name',
      showSearch: true,
      treeDefaultExpandAll: true,
      valueField: 'id',
      childrenField: 'children',
    },
    fieldName: 'pid',
    label: '上级分类',
  },
  {
    component: 'Textarea',
    componentProps() {
      // 不需要处理多语言时就无需这么做
      return {
        addonAfter: titleSuffix.value,
        onChange({ target: { value } }: any) {
          titleSuffix.value = value && $te(value) ? $t(value) : undefined;
        },
      };
    },
    fieldName: 'remark',
    label: '备注',
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
    label: $t('system.menu.status'),
  },
];

const breakpoints = useBreakpoints(breakpointsTailwind);
const isHorizontal = computed(() => breakpoints.greaterOrEqual('md').value);

const [Form, formApi] = useVbenForm({
  commonConfig: {
    colon: true,
    formItemClass: 'col-span-2 md:col-span-1',
  },
  schema,
  showDefaultActions: false,
  wrapperClass: 'grid-cols-2 gap-x-4',
});

const [Drawer, drawerApi] = useVbenDrawer({
  onConfirm: onSubmit,
  onOpenChange(isOpen) {
    if (isOpen) {
      const data =
        drawerApi.getData<SystemCategoryTypeApi.SystemCategoryType>();
      if (data?.type === 'link') {
        data.link_src = data.meta?.link;
      } else if (data?.type === 'embedded') {
        data.link_src = data.meta?.iframeSrc;
      }
      if (data) {
        formData.value = data;
        formApi.setValues(formData.value);
        titleSuffix.value = formData.value.meta?.title
          ? $t(formData.value.meta.title)
          : '';
      } else {
        formApi.resetForm();
        titleSuffix.value = '';
      }
    }
  },
});

async function onSubmit() {
  const { valid } = await formApi.validate();
  if (valid) {
    drawerApi.lock();
    const data =
      await formApi.getValues<
        Omit<SystemCategoryTypeApi.SystemCategoryType, 'children' | 'id'>
      >();
    if (data.type === 'link') {
      data.meta = { ...data.meta, link: data.link_src };
    } else if (data.type === 'embedded') {
      data.meta = { ...data.meta, iframeSrc: data.link_src };
    }
    delete data.link_src;

    try {
      await (formData.value?.id
        ? updateCategoryType(formData.value.id, data)
        : createCategoryType(data));
      emit('success');
      drawerApi.close();
    } finally {
      drawerApi.unlock();
    }
  }
}
const getDrawerTitle = computed(() =>
  formData.value?.id
    ? $t('ui.actionTitle.edit', [$t('system.menu.name')])
    : $t('ui.actionTitle.create', [$t('system.menu.name')]),
);
</script>
<template>
  <Drawer class="w-full max-w-[800px]" :title="getDrawerTitle">
    <Form class="mx-4" :layout="isHorizontal ? 'horizontal' : 'vertical'" />
  </Drawer>
</template>
