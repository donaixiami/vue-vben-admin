<script lang="ts" setup>
// UploadRequestOptions
// UploadFile
import type { UploadFile } from 'element-plus';

import { ref, watch } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import { ElIcon, ElImage, ElMessage, ElUpload } from 'element-plus';

import { setUploadOss } from '#/api/system/file';

const fileList = ref<UploadFile[]>([]);
const [Modal, modalApi] = useVbenModal({
  // 取消上传
  onCancel() {
    modalApi.close();
  },

  onClosed() {
    console.log(2);
  },
  async onConfirm() {
    modalApi.lock();
    fileList.value.forEach(async (file) => {
      await setUploadOss(file.raw as File);
    });
    modalApi.unlock();
    modalApi.close();
  },
  onOpened() {
    console.log(4);
  },
});

function getUrl(file: UploadFile) {
  if (!file.raw) {
    return '';
  }
  return URL.createObjectURL(file.raw);
}

function handleRemove(file: UploadFile) {
  fileList.value = fileList.value.filter((item) => item !== file);
}

watch(
  () => fileList.value,
  (newVal: UploadFile[]) => {
    let fileSizeNum = 0;
    newVal.forEach((item) => {
      // 大于 10mb 直接剔除
      if (!item?.size || item?.size > 10 * 1024 * 1024) {
        fileSizeNum++;
        handleRemove(item);
      }
    });
    if (fileSizeNum > 0) {
      ElMessage.error(`有 ${fileSizeNum} 个文件大小超过 10mb，已剔除`);
    }
  },
);
</script>
<template>
  <Modal class="w-150" title="上传文件">
    <ElUpload
      class="upload-demo"
      drag
      multiple
      :limit="5"
      v-model:file-list="fileList"
      :auto-upload="false"
    >
      <ElIcon class="el-icon--upload">
        <IconifyIcon icon="mdi:package-up" class="size-6" />
      </ElIcon>
      <div class="el-upload__text">将文件拖放到此处或 <em>点击上传</em></div>
      <template #tip>
        <div class="el-upload__tip">文件大小不超过 10mb</div>
      </template>
      <template #file="{ file }">
        <div class="flex items-center gap-2 cursor-pointer">
          <div class="flex items-center gap-2 flex-1">
            <ElImage
              :src="getUrl(file)"
              :preview-src-list="[getUrl(file)]"
              show-progress
              class="h-10 w-10"
              preview-teleported
              fit="cover"
            />
            <div class="text-sm text-gray-500">{{ file.name }}</div>
          </div>

          <IconifyIcon
            icon="ant-design:close-circle-twotone"
            class="size-6 hover:text-red-500 transition-colors mr-1"
            @click="handleRemove(file)"
          />
        </div>
      </template>
    </ElUpload>
  </Modal>
</template>
