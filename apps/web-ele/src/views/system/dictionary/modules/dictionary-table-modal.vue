<script lang="ts" setup>
import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

const emits = defineEmits(['submit']);

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
    <AForm
      ref="formRef"
      name="dynamic_form_nest_item"
      :model="dynamicValidateForm"
    >
      <div
        v-for="(user, index) in dynamicValidateForm"
        :key="user.id"
        class="flex gap-4"
      >
        <AFormItem
          class="flex-1"
          :name="[index, 'value']"
          :rules="[
            {
              required: true,
              message: '请填写键',
            },
            {
              async validator(_: any, value: any) {
                const labels = dynamicValidateForm
                  .map((item) => item.value)
                  .filter((v) => v !== undefined && v !== null && v !== '');

                const count = labels.filter((v) => v === value).length;

                if (count > 1) {
                  throw new Error('键值不能重复');
                }
              },
              trigger: ['change', 'blur'],
            },
          ]"
        >
          <AInput v-model:value="user.value" placeholder="键" />
        </AFormItem>

        <AFormItem
          class="flex-1"
          :name="[index, 'label']"
          :rules="{
            required: true,
            message: '请填写值',
          }"
        >
          <AInput v-model:value="user.label" placeholder="值" />
        </AFormItem>
        <div
          class="flex h-8 items-center justify-center"
          v-if="dynamicValidateForm.length > 1"
        >
          <IconifyIcon
            icon="carbon:close-outline"
            class="size-5 cursor-pointer transition-all hover:text-red-500"
            @click="removeUser(user)"
          />
        </div>
      </div>
      <AFormItem>
        <AButton type="dashed" block @click="addUser"> + 添加 </AButton>
      </AFormItem>
    </AForm>
  </Modal>
</template>
