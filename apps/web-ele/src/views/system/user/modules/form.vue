<script lang="ts" setup>
import type { Recordable } from '@vben/types';

import type { VbenFormSchema } from '#/adapter/form';
import type { SystemDeptApi } from '#/api/system/dept';
import type { SystemUserApi } from '#/api/system/user';

import { computed, h, nextTick, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { getPopupContainer } from '@vben/utils';

import { ElDialog } from 'element-plus';

import { z } from '#/adapter/form';
import { useVbenForm } from '#/adapter/form';
import { upload_file } from '#/api/common/upload';
import { getDeptList } from '#/api/system/dept';
import { createUser, updateUser } from '#/api/system/user';
import { $t } from '#/locales';
const emits = defineEmits(['success']);

const formData = ref<SystemUserApi.SystemUser>();

const [Form, formApi] = useVbenForm({
  schema: useFormSchema(),
  showDefaultActions: false,
});

const dialogVisible = ref(false);
const dialogImageUrl = ref('');
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
        onPreview: (file: any) => {
          dialogImageUrl.value = file?.url;
          dialogVisible.value = true;
        },
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
      componentProps: {
        placeholder: '请输入昵称',
      },
      component: 'Input',
      fieldName: 'real_name',
      label: '昵称',
      rules: 'required',
    },
    {
      componentProps: {
        placeholder: '请输入用户名称',
      },
      component: 'Input',
      fieldName: 'username',
      label: '用户名称',
      rules: z
        .string()
        .min(3, '用户名至少为3个字符')
        .max(20, '用户名最多为20个字符')
        .regex(/^[a-zA-Z0-9_]+$/, '用户名只能是字母、数字'),
    },
    {
      componentProps: {
        placeholder: '请输入密码',
        type: 'password',
        showPassword: true,
      },
      component: 'Input',
      fieldName: 'password',
      label: '密码',
      defaultValue: '123456',
      rules: 'required',
      dependencies: {
        triggerFields: ['id'],
        async show() {
          return !id.value;
        },
      },
    },
    {
      rules: 'required',
      component: 'ApiTreeSelect',
      componentProps: {
        api: getDeptList,
        class: 'w-full',
        filterTreeNode(input: string, node: SystemDeptApi.SystemDept) {
          if (!input || input.length === 0) {
            return true;
          }
          const title: string = node?.name ?? '';
          if (!title) return false;
          return title.includes(input) || $t(title).includes(input);
        },
        getPopupContainer,
        labelField: 'name',
        highlightCurrent: true,
        checkStrictly: true,
        clearable: true,
        valueField: 'id',
        childrenField: 'children',
      },
      fieldName: 'dept_id',
      label: '部门',
      renderComponentContent() {
        return {
          title({ label }: { label: string; meta: Recordable<SystemDeptApi.SystemDept> }) {
            const coms = [];
            if (!label) return '';
            coms.push(h('span', { class: '' }, $t(label || '')));
            return h('div', {}, coms);
          },
        };
      },
    },
    {
      componentProps: {
        placeholder: '请输入电话',
      },
      component: 'Input',
      fieldName: 'phone',
      label: '电话',
      rules: z
        .string()
        .min(11, '手机号必须为11位')
        .max(11, '手机号必须为11位')
        .regex(
          /^(?:(?:\+|00)86)?1(?:(?:3[\d])|(?:4[5-79])|(?:5[0-35-9])|(?:6[5-7])|(?:7[0-8])|(?:8[\d])|(?:9[1589]))\d{8}$/,
          '请输入正确的手机号',
        )
        .optional(),
    },
    {
      componentProps: {
        placeholder: '请输入邮箱',
      },
      component: 'Input',
      fieldName: 'email',
      label: '邮箱',
      rules: z
        .string()
        .regex(/^[A-Za-z0-9\u4E00-\u9FA5]+@[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$/, '请输入正确的邮箱')
        .optional(),
    },
    {
      component: 'RadioGroup',
      componentProps: {
        buttonStyle: 'solid',
        isButton: true,
        options: [
          { label: '男', value: 1 },
          { label: '女', value: 0 },
        ],
        optionType: 'button',
      },
      defaultValue: 1,
      fieldName: 'sex',
      label: '性别',
    },
    // 年龄
    {
      component: 'InputNumber',
      fieldName: 'age',
      label: '年龄',
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
    {
      component: 'Input',
      fieldName: 'remark',
      label: '备注',
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

    delete values.avatars;
    if (response && response.id) {
      values.avatar_file_id = response.id;
    }

    drawerApi.lock();
    (id.value ? updateUser(id.value, values) : createUser(values))
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
      if (data && data?.avatar) {
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
  <div>
    <Drawer :title="getDrawerTitle">
      <Form />
    </Drawer>

    <ElDialog v-model="dialogVisible">
      <img w-full :src="dialogImageUrl" alt="Preview Image" />
    </ElDialog>
  </div>
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
