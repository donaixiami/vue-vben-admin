<script lang="ts" setup>
import type { VbenFormSchema } from '#/adapter/form';

import { ref } from 'vue';

import { Page } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { ElMessage } from 'element-plus';

import { useVbenForm, z } from '#/adapter/form';
import { createArticle } from '#/api/article-manage/article-list';
import { getCategoryTypeList } from '#/api/system/category-type';

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
  },
  layout: 'horizontal',
  schema: [
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
        options: [
          { label: '显示', value: 1 },
          { label: '隐藏', value: 0 },
        ],
      },
      defaultValue: 1,
      fieldName: 'evidently',
      label: '是否显示',
      help: '控制文章是否在前台显示',
    },
    {
      component: 'RadioGroup',
      componentProps: {
        options: [
          { label: '启用', value: 1 },
          { label: '禁用', value: 0 },
        ],
      },
      defaultValue: 1,
      fieldName: 'status',
      label: '状态',
      help: '启用后文章才能正常访问',
    },
  ] as VbenFormSchema[],
  wrapperClass: 'grid-cols-1',
});

const loading = ref(false);

async function handleSubmit() {
  const { valid, values } = await formApi.validate();
  if (!valid) {
    return;
  }

  loading.value = true;
  try {
    await createArticle(values as any);
    ElMessage.success('文章发布成功！');
    formApi.resetForm();
  } catch (error: any) {
    ElMessage.error(error?.message || '文章发布失败，请重试');
  } finally {
    loading.value = false;
  }
}

function handleReset() {
  formApi.resetForm();
  ElMessage.info('表单已重置');
}
</script>

<template>
  <Page
    auto-content-height
    content-class="flex flex-col"
    title="发布文章"
    description="填写文章信息并发布到系统"
  >
    <div class="mx-auto w-full max-w-5xl p-6">
      <div class="rounded-lg bg-white p-8 shadow-sm dark:bg-gray-800">
        <Form>
          <template #submitButton>
            <div class="mt-6 flex gap-3">
              <el-button
                type="primary"
                size="large"
                :loading="loading"
                @click="handleSubmit"
              >
                {{ loading ? '发布中...' : '发布文章' }}
              </el-button>
              <el-button size="large" @click="handleReset">
                重置
              </el-button>
            </div>
          </template>
        </Form>
      </div>
    </div>
  </Page>
</template>

<style scoped>
:deep(.vben-form) {
  .vben-form-item {
    margin-bottom: 24px;
  }

  .vben-form-label {
    font-weight: 500;
  }
}
</style>
