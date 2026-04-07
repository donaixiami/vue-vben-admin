<script lang="ts" setup>
import { reactive, ref } from 'vue';

interface User {
  first: string;
  last: string;
  id: number;
}
const formRef = ref<any>();
const dynamicValidateForm = reactive<{ users: User[] }>({
  users: [],
});
const removeUser = (item: User) => {
  const index = dynamicValidateForm.users.indexOf(item);
  if (index !== -1) {
    dynamicValidateForm.users.splice(index, 1);
  }
};
const addUser = () => {
  dynamicValidateForm.users.push({
    first: '',
    last: '',
    id: Date.now(),
  });
};
const onFinish = (values) => {
  console.log('Received values of form:', values);
  console.log('dynamicValidateForm.users:', dynamicValidateForm.users);
};
</script>
<template>
  <AForm
    ref="formRef"
    name="dynamic_form_nest_item"
    :model="dynamicValidateForm"
    @finish="onFinish"
  >
    <ASpace
      v-for="(user, index) in dynamicValidateForm.users"
      :key="user.id"
      style="display: flex; margin-bottom: 8px"
      align="baseline"
    >
      <AFormItem
        :name="['users', index, 'first']"
        :rules="{
          required: true,
          message: 'Missing first name',
        }"
      >
        <AInput v-model:value="user.first" placeholder="First Name" />
      </AFormItem>
      <AFormItem
        :name="['users', index, 'last']"
        :rules="{
          required: true,
          message: 'Missing last name',
        }"
      >
        <AInput v-model:value="user.last" placeholder="Last Name" />
      </AFormItem>
      <div @click="removeUser(user)">-</div>
    </ASpace>
    <AFormItem>
      <a-button type="dashed" block @click="addUser"> + Add user </a-button>
    </AFormItem>
    <AFormItem>
      <a-button type="primary" html-type="submit">Submit</a-button>
    </AFormItem>
  </AForm>
</template>
