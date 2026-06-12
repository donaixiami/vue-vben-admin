<script lang="ts" setup>
import { ref } from 'vue';

import { Page } from '@vben/common-ui';

import { ElMessage } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import { createArticle } from '#/api/article-manage/article-list';

import { useFormSchema } from './data';

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
  },
  layout: 'horizontal',
  schema: useFormSchema(),
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
