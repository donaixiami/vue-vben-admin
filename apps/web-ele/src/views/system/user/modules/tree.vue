<script lang="ts" setup>
import type { FilterNodeMethodFunction, TreeInstance } from 'element-plus';

import { ref, watch } from 'vue';

import { ElInput, ElTree } from 'element-plus';

import { getDeptList } from '#/api/system/dept';

interface Tree {
  [key: string]: any;
}

const props = defineProps<{
  gridApi: {
    query?: (params?: Record<string, any>) => Promise<void> | void;
  };
}>();

const emit = defineEmits(['currentChange']);

const filterText = ref('');
const treeRef = ref<TreeInstance>();

const defaultProps = {
  children: 'children',
  label: 'name',
};

watch(filterText, (val) => {
  // eslint误判了这里的filter所以直接忽略了检测
  // eslint-disable-next-line unicorn/no-array-callback-reference
  treeRef.value!.filter(val);
});
const filterNode: FilterNodeMethodFunction = (value: string, data: Tree) => {
  if (!value) return true;
  return data.name.includes(value);
};

const currentNodeKey = ref('0');
const defaultExpandedKeys = ref<string[]>(['0']);
const treeData = ref<Tree[]>([]);
const getDataList = async () => {
  const res: Tree[] = await getDeptList();
  treeData.value = [
    {
      id: '0',
      name: '全部部门',
      children: res,
    },
  ];
  props.gridApi?.query?.();
};
getDataList();

function onCurrentChange(key: Tree) {
  if (key.id === '0') {
    props.gridApi?.query?.();
    return;
  }
  props.gridApi?.query?.({ dept_id: key.id });
  emit('currentChange', key.id);
}
</script>

<template>
  <div>
    <div class="p-3 border-b-1">组织机构</div>
    <ElInput v-model="filterText" class="w-60 mb-2 border-b-1 p-2" placeholder="部门搜索" />
    <div class="p-2 pt-0">
      <ElTree
        node-key="id"
        :highlight-current="true"
        :expand-on-click-node="false"
        ref="treeRef"
        style="max-width: 600px"
        :data="treeData"
        :props="defaultProps"
        :filter-node-method="filterNode"
        :current-node-key="currentNodeKey"
        @current-change="onCurrentChange"
        :default-expanded-keys="defaultExpandedKeys"
      />
    </div>
  </div>
</template>
