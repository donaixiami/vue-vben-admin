<script lang="ts" setup>
import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { ElButton } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';

import { useColumns } from './dictionary-table-modal-data';

const emits = defineEmits(['submit']);

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: useColumns(),
    rowConfig: {
      keyField: 'id',
      drag: true,
    },
    pagerConfig: {
      enabled: false,
    },
  },
});

interface DataList {
  label: string;
  value: string;
  id: number;
}
const formRef = ref<any>();
const dynamicValidateForm = ref<DataList[]>([
  {
    label: '',
    value: '',
    id: Date.now(),
  },
]);
const removeUser = (item: DataList) => {
  const index = dynamicValidateForm.value.indexOf(item);
  if (index !== -1) {
    dynamicValidateForm.value.splice(index, 1);
  }
};
const addUser = () => {
  dynamicValidateForm.value.push({
    label: '',
    value: '',
    id: Date.now(),
  });
};

const [Modal, modalApi] = useVbenModal({
  draggable: true,
  fullscreenButton: false,
  onCancel() {
    modalApi.close();
  },
  onOpenChange(isOpen) {
    if (isOpen) {
      const dataList = modalApi.getData() as DataList[] | undefined;

      // 如果没有数据，就给一个默认项
      if (!dataList || dataList.length === 0) {
        dynamicValidateForm.value = [{ id: Date.now(), label: '', value: '' }];
        return;
      }

      dynamicValidateForm.value = dataList.map((item) => ({
        ...item,
        id: Date.now() + Math.random(), // 避免多个项 id 一样
      }));
    }
  },
  async onConfirm() {
    if (formRef.value) {
      const values = await formRef.value.validate();
      emits('submit', values);
      formRef.value.resetFields();
      modalApi.close();
    }
  },
});
</script>
<template>
  <Modal title="设置列表">
    <Grid table-title="用户列表">
      <template #toolbar-tools>
        <ElButton type="primary">
          <Plus class="size-5" />
          添加键值
        </ElButton>
      </template>
    </Grid>
  </Modal>
</template>
