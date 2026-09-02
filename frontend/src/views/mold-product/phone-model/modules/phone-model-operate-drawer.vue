<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import type { FormRules } from 'naive-ui';
import { NButton, NDrawer, NDrawerContent, NForm, NFormItem, NInput, NSpace } from 'naive-ui';
import { fetchCreatePhoneModel, fetchUpdatePhoneModel } from '@/service/api';
import { useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'PhoneModelOperateDrawer'
});

interface Props {
  type: NaiveUI.TableOperateType;
  rowData?: Api.PhoneModel.PhoneModelRecord | null;
}

const props = withDefaults(defineProps<Props>(), {
  rowData: null
});

interface Emits {
  (e: 'submitted'): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>('visible', { default: false });

const { formRef, validate, restoreValidation } = useNaiveForm();
const loading = ref(false);

const defaultForm: Api.PhoneModel.CreateParams = {
  phoneName: '',
  phoneShortName: ''
};

const formModel = reactive<Api.PhoneModel.CreateParams>({ ...defaultForm });

const title = computed(() => (props.type === 'add' ? $t('page.ui.addPhoneModel') : $t('page.ui.editPhoneModel')));

const rules = computed<FormRules>(() => ({
  phoneName: [
    {
      required: true,
      message: $t('page.ui.enterPhoneName'),
      trigger: 'blur'
    },
    {
      max: 100,
      message: $t('page.ui.phoneNameMax'),
      trigger: 'blur'
    }
  ],
  phoneShortName: [
    {
      max: 50,
      message: $t('page.ui.phoneShortNameMax'),
      trigger: 'blur'
    }
  ]
}));

function resetForm() {
  Object.assign(formModel, { ...defaultForm });
  nextTick(() => {
    restoreValidation();
  });
}

function setFormFromRow(row: Api.PhoneModel.PhoneModelRecord) {
  Object.assign(formModel, {
    phoneName: row.phoneName,
    phoneShortName: row.phoneShortName || ''
  });
  nextTick(() => {
    restoreValidation();
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

function getSubmitBody() {
  const { phoneName, phoneShortName } = formModel;
  return { phoneName, phoneShortName };
}

async function handleSubmit() {
  loading.value = true;
  try {
    await validate();
    const body = getSubmitBody();
    if (props.type === 'add') {
      const { error } = await fetchCreatePhoneModel(body);
      if (!error) {
        window.$message?.success($t('common.addSuccess'));
        visible.value = false;
        emit('submitted');
      }
    } else if (props.rowData) {
      const { error } = await fetchUpdatePhoneModel(props.rowData.id, body);
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
        <NFormItem :label="$t('page.ui.phoneName')" path="phoneName">
          <NInput v-model:value="formModel.phoneName" :placeholder="$t('page.ui.enterPhoneName')" />
        </NFormItem>

        <NFormItem :label="$t('page.ui.phoneShortName')" path="phoneShortName">
          <NInput v-model:value="formModel.phoneShortName" :placeholder="$t('page.ui.enterPhoneShortName')" />
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
