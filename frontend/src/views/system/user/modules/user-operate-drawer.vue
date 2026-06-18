<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import type { FormInst, FormRules } from 'naive-ui';
import { NButton, NDrawer, NDrawerContent, NForm, NFormItem, NInput, NSelect, NSpace } from 'naive-ui';
import { fetchCreateUser, fetchUpdateUser } from '@/service/api';
import { $t } from '@/locales';

defineOptions({
  name: 'UserOperateDrawer'
});

interface Props {
  type: NaiveUI.TableOperateType;
  rowData?: Api.User.UserRecord | null;
}

const props = withDefaults(defineProps<Props>(), {
  rowData: null
});

interface Emits {
  (e: 'submitted'): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>('visible', { default: false });

const formRef = ref<FormInst | null>(null);
const loading = ref(false);

const defaultForm: Api.User.CreateParams = {
  userName: '',
  password: '',
  realName: '',
  roles: ['R_USER'],
  buttons: [],
  status: '1'
};

const formModel = reactive<Api.User.CreateParams>({ ...defaultForm });

const title = computed(() => (props.type === 'add' ? $t('common.add') : $t('common.edit')));

const rules = computed<FormRules>(() => ({
  userName: [
    {
      required: true,
      message: $t('form.userName.required'),
      trigger: 'blur'
    }
  ],
  password:
    props.type === 'add'
      ? [
          {
            required: true,
            message: $t('form.pwd.required'),
            trigger: 'blur'
          }
        ]
      : []
}));

const roleOptions = [
  { label: '超级管理员', value: 'R_SUPER' },
  { label: '管理员', value: 'R_ADMIN' },
  { label: '普通用户', value: 'R_USER' }
];

const statusOptions = [
  { label: '启用', value: '1' },
  { label: '禁用', value: '2' }
];

function resetForm() {
  Object.assign(formModel, { ...defaultForm });
  nextTick(() => {
    formRef.value?.restoreValidation();
  });
}

function setFormFromRow(row: Api.User.UserRecord) {
  Object.assign(formModel, {
    userName: row.userName,
    password: '',
    realName: row.realName || '',
    roles: row.roles,
    buttons: row.buttons,
    status: row.status || '1'
  });
  nextTick(() => {
    formRef.value?.restoreValidation();
  });
}

watch(visible, val => {
  if (val) {
    if (props.type === 'edit' && props.rowData) {
      setFormFromRow(props.rowData);
    } else {
      resetForm();
    }
  }
});

async function handleSubmit() {
  await formRef.value?.validate();

  loading.value = true;
  try {
    if (props.type === 'add') {
      const { error } = await fetchCreateUser(formModel);
      if (!error) {
        window.$message?.success($t('common.addSuccess'));
        visible.value = false;
        emit('submitted');
      }
    } else if (props.rowData) {
      const { password, ...rest } = formModel;
      const updateData: Api.User.UpdateParams = password ? { ...formModel } : rest;
      const { error } = await fetchUpdateUser(props.rowData.id, updateData);
      if (!error) {
        window.$message?.success($t('common.updateSuccess'));
        visible.value = false;
        emit('submitted');
      }
    }
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <NDrawer v-model:show="visible" width="420px" placement="right">
    <NDrawerContent :title="title" :native-scrollbar="false">
      <NForm ref="formRef" :model="formModel" :rules="rules" label-placement="left" label-width="90px">
        <NFormItem label="用户名" path="userName">
          <NInput v-model:value="formModel.userName" :placeholder="$t('form.userName.required')" />
        </NFormItem>

        <NFormItem label="密码" path="password">
          <NInput
            v-model:value="formModel.password"
            type="password"
            :placeholder="props.type === 'edit' ? '不修改请留空' : $t('form.pwd.required')"
          />
        </NFormItem>

        <NFormItem label="真实姓名" path="realName">
          <NInput v-model:value="formModel.realName" placeholder="请输入真实姓名" />
        </NFormItem>

        <NFormItem label="角色" path="roles">
          <NSelect
            v-model:value="formModel.roles"
            multiple
            :options="roleOptions"
            placeholder="请选择角色"
          />
        </NFormItem>

        <NFormItem label="按钮权限" path="buttons">
          <NSelect
            v-model:value="formModel.buttons"
            multiple
            filterable
            tag
            :options="[]"
            placeholder="请输入按钮权限标识"
          />
        </NFormItem>

        <NFormItem label="状态" path="status">
          <NSelect v-model:value="formModel.status" :options="statusOptions" placeholder="请选择状态" />
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="visible = false">{{ $t('common.cancel') }}</NButton>
          <NButton type="primary" :loading="loading" @click="handleSubmit">
            {{ $t('common.confirm') }}
          </NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped></style>
