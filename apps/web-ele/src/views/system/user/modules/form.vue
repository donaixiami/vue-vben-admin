<script lang="ts" setup>
import type { VbenFormSchema } from '#/adapter/form';
import type { SystemUserApi } from '#/api/system/user';

import { computed, nextTick, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { useVbenForm } from '#/adapter/form';
import { upload_file } from '#/api/common/upload';
import { createUser, updateUser } from '#/api/system/user';
import { $t } from '#/locales';

const emits = defineEmits(['success']);

const formData = ref<SystemUserApi.SystemUser>();

const [Form, formApi] = useVbenForm({
  schema: useFormSchema(),
  showDefaultActions: false,
});

function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Upload',
      componentProps: {
        accept: '.png,.jpg,.jpeg',
        httpRequest: upload_file,
        onSuccess: (response: any, uploadFile: any) => {
          const url = response?.url ?? response?.file_url;
          if (url) {
            uploadFile.url = url;
          }
        },
        disabled: false,
        maxCount: 1,
        multiple: false,
        showUploadList: true,
        limit: 1,
        listType: 'picture-card',
      },
      fieldName: 'avatars',
      label: '头像',
      renderComponentContent: () => {
        return {
          default: () => $t('examples.form.upload-image'),
        };
      },
      rules: 'required',
    },
    {
      component: 'Input',
      fieldName: 'username',
      label: '用户名称',
      rules: 'required',
    },
    {
      component: 'Input',
      fieldName: 'password',
      label: '密码',
      dependencies: {
        triggerFields: ['id'],
        async rules() {
          return id.value ? '' : 'required';
        },
      },
    },
    {
      component: 'Input',
      fieldName: 'real_name',
      label: '昵称',
      rules: 'required',
    },
    {
      component: 'RadioGroup',
      componentProps: {
        buttonStyle: 'solid',
        isButton: true,
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

const id = ref();
const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = (await formApi.getValues()) as SystemUserApi.SystemUser;
    const response = values.avatars[0].response as { id: string; url: string };

    const data: SystemUserApi.SystemUser = {
      // 去掉 avatars 字段
      ...values,
      avatar_file_id: response.id,
    };
    delete data.avatars;

    drawerApi.lock();
    (id.value ? updateUser(id.value, data) : createUser(data))
      .then(() => {
        emits('success');
        drawerApi.close();
      })
      .catch(() => {
        drawerApi.unlock();
      });
  },

  async onOpenChange(isOpen) {
    if (isOpen) {
      const data = drawerApi.getData<SystemUserApi.SystemUser>();
      formApi.resetForm();
      if (data) {
        formApi.setValues({
          avatars: [
            {
              name: 'example.png',
              status: 'done',
              uid: '-1',
              url: data?.avatar || '',
            },
          ],
        });
      }

      if (data) {
        formData.value = data;
        id.value = data.id;
      } else {
        id.value = undefined;
      }

      // Wait for Vue to flush DOM updates (form fields mounted)
      await nextTick();
      if (data) {
        formApi.setValues(data);
      }
    }
  },
});

const getDrawerTitle = computed(() => {
  return formData.value?.id
    ? $t('common.edit', $t('system.role.name'))
    : $t('common.create', $t('system.role.name'));
});
</script>
<template>
  <Drawer :title="getDrawerTitle">
    <Form />
  </Drawer>
</template>
<style lang="css" scoped>
:deep(.ant-tree-title) {
  .tree-actions {
    display: none;
    margin-left: 20px;
  }
}

:deep(.ant-tree-title:hover) {
  .tree-actions {
    display: flex;
    flex: auto;
    justify-content: flex-end;
    margin-left: 20px;
  }
}
</style>
