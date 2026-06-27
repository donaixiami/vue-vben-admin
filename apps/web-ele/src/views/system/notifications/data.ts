import type { MessageTypeCellTagOption } from './modules/message-type';
import type { SendStateCellTagOption } from './modules/send-state';

import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { SystemNotificationsApi } from '#/api';

import { markRaw, ref } from 'vue';

import { upload_file } from '#/api/common/upload';
import { getDictionaryByIdentifier } from '#/api/system/dictionary';
import { $t } from '#/locales';

import {
  clearPublishAtWhenSendNow,
  disablePastPublishDate,
  getDefaultPublishTime,
  getPublishAtRules,
  shouldShowPublishAt,
} from './modules/publish-at';
import TargetTable from './modules/target-table.vue';

const dialogImageUrl = ref('');
const dialogVisible = ref(false);

export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'title',
      label: '消息名称',
      rules: 'required',
    },
    {
      component: 'Tiptap',
      fieldName: 'message',
      label: '消息内容',
      rules: 'required',
      componentProps: {
        imageResizable: true,
      },
    },
    {
      component: 'ApiSelect',
      componentProps: {
        api: async () => {
          const dictionary = await getDictionaryByIdentifier('message_type');
          return Array.isArray(dictionary?.value) ? dictionary.value : [];
        },
        afterFetch: (data: Array<{ label: string; value: string }>) => {
          return data.map((item) => ({
            label: item.label,
            value: item.value,
          }));
        },
        clearable: true,
        placeholder: '请选择消息类型',
      },
      defaultValue: 'system',
      fieldName: 'type',
      label: '消息类型',
      rules: 'required',
    },
    {
      component: 'ApiSelect',
      componentProps: {
        api: async () => {
          const dictionary = await getDictionaryByIdentifier('broadcast_range');
          return Array.isArray(dictionary?.value) ? dictionary.value : [];
        },
        afterFetch: (data: Array<{ label: string; value: string }>) => {
          return data.map((item) => ({
            label: item.label,
            value: item.value,
          }));
        },
        clearable: true,
        placeholder: '请选择广播范围',
      },
      defaultValue: 'all',
      fieldName: 'target_type',
      label: '广播范围',
      rules: 'required',
    },
    {
      formItemClass: 'items-start',
      fieldName: 'target_ids',
      label: '广播目标',
      rules: 'required',
      component: markRaw(TargetTable),
      componentProps: (values) => ({
        targetType: values.target_type,
      }),
      defaultValue: [],
      dependencies: {
        show: (values) => values.target_type !== 'all',
        triggerFields: ['target_type'],
      },
    },
    {
      component: 'DatePicker',
      componentProps: () => ({
        valueFormat: 'YYYY-MM-DD HH:mm:ss',
        style: { width: '100%' },
        type: 'datetime',
        placeholder: '请选择定时发布时间',
        disabledDate: disablePastPublishDate,
        arrowControl: true,
        defaultTime: getDefaultPublishTime(),
      }),
      fieldName: 'publish_at',
      label: '定时发布时间',
      dependencies: {
        rules: getPublishAtRules,
        show: shouldShowPublishAt,
        trigger: clearPublishAtWhenSendNow,
        triggerFields: ['send_now'],
      },
    },
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
        limit: 1,
        listType: 'picture-card',
        maxCount: 1,
        multiple: false,
        onPreview: (file: any) => {
          dialogImageUrl.value = file?.url;
          dialogVisible.value = true;
        },
        showUploadList: true,
      },
      fieldName: 'avatars',
      label: '消息图标或头像',
      renderComponentContent: () => {
        return {
          default: () => $t('examples.form.upload-image'),
        };
      },
      rules: 'required',
    },
    {
      component: 'RadioGroup',
      componentProps: {
        buttonStyle: 'solid',
        isButton: true,
        options: [
          { label: '是', value: true },
          { label: '否', value: false },
        ],
        optionType: 'button',
      },
      defaultValue: false,
      fieldName: 'send_now',
      label: '是否立即发送',
      dependencies: {
        trigger: async (values, actions) => {
          const type = values.type as
            | SystemNotificationsApi.NotificationType
            | undefined;
          if (!type || values.id) {
            return;
          }
          await actions.setFieldValue('send_now', type === 'message');
        },
        triggerFields: ['type'],
      },
    },
    {
      component: 'RadioGroup',
      componentProps: {
        buttonStyle: 'solid',
        isButton: true,
        options: [
          { label: '高', value: 'high' },
          { label: '中', value: 'medium' },
          { label: '低', value: 'low' },
        ],
        optionType: 'button',
      },
      defaultValue: 'medium',
      fieldName: 'priority',
      label: '优先级',
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

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'title',
      label: '标题',
    },
    {
      component: 'Input',
      fieldName: 'id',
      label: '消息ID',
    },
    {
      component: 'ApiSelect',
      componentProps: {
        api: async () => {
          const dictionary = await getDictionaryByIdentifier('message_type');
          return Array.isArray(dictionary?.value) ? dictionary.value : [];
        },
        afterFetch: (data: Array<{ label: string; value: string }>) => {
          return data.map((item) => ({
            label: item.label,
            value: item.value,
          }));
        },
        clearable: true,
        placeholder: '请选择消息类型',
      },
      fieldName: 'type',
      label: '消息类型',
    },
    {
      component: 'ApiSelect',
      componentProps: {
        api: async () => {
          const dictionary = await getDictionaryByIdentifier('send_state');
          return Array.isArray(dictionary?.value) ? dictionary.value : [];
        },
        afterFetch: (data: Array<{ label: string; value: string }>) => {
          return data.map((item) => ({
            label: item.label,
            value: item.value,
          }));
        },
        clearable: true,
        placeholder: '请选择发送状态',
      },
      fieldName: 'send_status',
      label: '发送状态',
    },
    {
      component: 'RangePicker',
      fieldName: 'created_at',
      label: $t('system.role.createTime'),
      componentProps: { valueFormat: 'YYYY-MM-DD HH:mm:ss' },
    },
  ];
}

export function useColumns<T = SystemNotificationsApi.SystemNotifications>(
  onActionClick: OnActionClickFn<T>,
  sendStateOptions: SendStateCellTagOption[] = [],
  messageTypeOptions: MessageTypeCellTagOption[] = [],
): VxeTableGridOptions['columns'] {
  return [
    {
      field: 'id',
      title: 'ID',
      width: 80,
    },
    {
      field: 'title',
      title: '通知标题',
      minWidth: 160,
    },

    {
      cellRender: {
        name: 'CellTag',
        options: messageTypeOptions,
      },
      field: 'type',
      title: '通知类型',
      minWidth: 160,
    },
    {
      field: 'read_at',
      title: '阅读时间',
      minWidth: 160,
    },
    {
      cellRender: {
        name: 'CellTag',
        options: sendStateOptions,
      },
      field: 'send_status',
      title: '发送状态',
      minWidth: 100,
    },
    {
      cellRender: {
        name: 'CellTag',
        options: [
          { value: 1, label: '启用', type: 'success' },
          { value: 0, label: '停用', type: 'error' },
        ],
      },
      field: 'status',
      title: $t('system.role.status'),
      minWidth: 100,
    },
    {
      field: 'created_at',
      title: $t('system.role.createTime'),
      minWidth: 200,
    },
    {
      field: 'sent_at',
      title: '发送时间',
      minWidth: 200,
    },
    {
      align: 'center',
      cellRender: {
        attrs: {
          nameField: 'name',
          nameTitle: '消息',
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: [
          {
            type: 'primary',
            link: true,
            contentText: '发送',
            code: 'send',
            show: (row: SystemNotificationsApi.SystemNotifications) =>
              !['revoked', 'sent'].includes(row.send_status),
          },
          {
            code: 'edit',
            show: (row: SystemNotificationsApi.SystemNotifications) =>
              !['revoked', 'sent'].includes(row.send_status),
          },
          {
            type: 'danger',
            link: true,
            contentText: '撤回',
            code: 'withdraw',
            show: (row: SystemNotificationsApi.SystemNotifications) =>
              row.send_status === 'sent',
          },
          'delete',
        ],
      },

      field: 'operation',
      fixed: 'right',
      title: $t('system.role.operation'),
      minWidth: 130,
    },
  ];
}

export function useValueTableColumns<
  T = { id: number; label: string; value: string },
>(onActionClick: OnActionClickFn<T>): VxeTableGridOptions['columns'] {
  return [
    {
      field: 'value',
      title: '键',
      editRender: {
        name: 'input',
        attrs: {
          placeholder: '请输入键',
          class: 'vxe-default-input w-full px-2',
        },
      },
    },
    {
      field: 'label',
      title: '值',
      editRender: {
        name: 'input',
        attrs: {
          class: 'vxe-default-input w-full px-2',
          placeholder: '请输入值',
        },
      },
    },
    {
      align: 'center',
      cellRender: {
        attrs: {
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: ['delete'], // 🔥 只显示删除
      },
      field: 'operation',
      fixed: 'right',
      title: '操作',
      width: 130,
    },
  ];
}
