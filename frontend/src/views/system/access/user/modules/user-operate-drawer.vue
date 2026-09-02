<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import type { FormInst, FormRules } from 'naive-ui';
import { NButton, NDrawer, NDrawerContent, NForm, NFormItem, NInput, NSelect, NSpace } from 'naive-ui';
import { REG_USER_NAME } from '@/constants/reg';
import { fetchCreateUser, fetchRoleOptions, fetchUpdateUser } from '@/service/api';
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
  email: '',
  dingTalkSubject: '',
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
    },
    {
      validator: (_rule, value: string) => {
        if (props.type === 'edit' && props.rowData && value === props.rowData.userName) {
          return true;
        }

        if (!value || REG_USER_NAME.test(value)) {
          return true;
        }

        return new Error($t('form.userName.invalid'));
      },
      trigger: ['input', 'blur']
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
      : [],
  email: [
    {
      validator: (_rule, value: string) => {
        if (!value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
          return true;
        }

        return new Error($t('page.ui.emailInvalid'));
      },
      trigger: ['input', 'blur']
    }
  ]
}));

const roleOptions = ref<{ label: string; value: string }[]>([]);

const statusOptions = computed(() => [
  { label: $t('page.ui.enabled'), value: '1' },
  { label: $t('page.ui.disabled'), value: '2' }
]);

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
    email: row.email || '',
    dingTalkSubject: row.dingTalkSubject || '',
    roles: row.roles,
    buttons: row.buttons,
    status: row.status || '1'
  });
  nextTick(() => {
    formRef.value?.restoreValidation();
  });
}

async function loadRoleOptions() {
  const { data } = await fetchRoleOptions();
  if (data) {
    roleOptions.value = data.map(role => ({
      label: `${role.name}（${role.code}）`,
      value: role.code
    }));
  }
}

watch(visible, val => {
  if (val) {
    void loadRoleOptions();
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
        <NFormItem :label="$t('page.ui.username')" path="userName">
          <NInput v-model:value="formModel.userName" :placeholder="$t('form.userName.required')" />
        </NFormItem>

        <NFormItem :label="$t('page.ui.password')" path="password">
          <NInput
            v-model:value="formModel.password"
            type="password"
            :placeholder="props.type === 'edit' ? $t('page.ui.leaveBlankUnchanged') : $t('form.pwd.required')"
          />
        </NFormItem>

        <NFormItem :label="$t('page.ui.realName')" path="realName">
          <NInput v-model:value="formModel.realName" :placeholder="$t('page.ui.enterRealName')" />
        </NFormItem>

        <NFormItem :label="$t('page.ui.email')" path="email">
          <NInput v-model:value="formModel.email" :placeholder="$t('page.ui.enterErpNextEmail')" />
        </NFormItem>

        <NFormItem :label="$t('page.ui.dingTalkSubject')" path="dingTalkSubject">
          <NInput
            v-model:value="formModel.dingTalkSubject"
            :placeholder="$t('page.ui.dingTalkSubjectPlaceholder')"
          />
        </NFormItem>

        <NFormItem :label="$t('page.ui.roles')" path="roles">
          <NSelect
            v-model:value="formModel.roles"
            multiple
            :options="roleOptions"
            :placeholder="$t('page.ui.selectRole')"
          />
        </NFormItem>

        <NFormItem :label="$t('page.ui.buttonPermissions')" path="buttons">
          <NSelect
            v-model:value="formModel.buttons"
            multiple
            filterable
            tag
            :options="[]"
            :placeholder="$t('page.ui.buttonPermissionPlaceholder')"
          />
        </NFormItem>

        <NFormItem :label="$t('page.ui.status')" path="status">
          <NSelect v-model:value="formModel.status" :options="statusOptions" :placeholder="$t('page.ui.selectStatus')" />
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
