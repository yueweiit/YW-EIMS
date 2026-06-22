<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import type { FormInst, FormRules } from 'naive-ui';
import { NButton, NDrawer, NDrawerContent, NForm, NFormItem, NInput, NSpace } from 'naive-ui';
import { fetchCreateUnit, fetchUpdateUnit } from '@/service/api';
import { $t } from '@/locales';

defineOptions({
  name: 'UnitOperateDrawer'
});

interface Props {
  type: NaiveUI.TableOperateType;
  rowData?: Api.Unit.UnitRecord | null;
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

const defaultForm: Api.Unit.CreateParams = {
  unitCode: '',
  unit: ''
};

const formModel = reactive<Api.Unit.CreateParams>({ ...defaultForm });

const title = computed(() => (props.type === 'add' ? $t('common.add') : $t('common.edit')));

const rules = computed<FormRules>(() => ({
  unitCode: [
    {
      required: props.type === 'add',
      message: '请输入单位编码',
      trigger: 'blur'
    },
    {
      max: 3,
      message: '单位编码最多3个字符',
      trigger: 'blur'
    }
  ],
  unit: [
    {
      required: true,
      message: '请输入单位名称',
      trigger: 'blur'
    },
    {
      max: 50,
      message: '单位名称最多50个字符',
      trigger: 'blur'
    }
  ]
}));

function resetForm() {
  Object.assign(formModel, { ...defaultForm });
  nextTick(() => {
    formRef.value?.restoreValidation();
  });
}

function setFormFromRow(row: Api.Unit.UnitRecord) {
  Object.assign(formModel, {
    unitCode: row.unitCode,
    unit: row.unit
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
      const { error } = await fetchCreateUnit(formModel);
      if (!error) {
        window.$message?.success($t('common.addSuccess'));
        visible.value = false;
        emit('submitted');
      }
    } else if (props.rowData) {
      const { error } = await fetchUpdateUnit(props.rowData.unitCode, { unit: formModel.unit });
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
        <NFormItem label="单位编码" path="unitCode">
          <NInput
            v-model:value="formModel.unitCode"
            :disabled="props.type === 'edit'"
            :maxlength="3"
            placeholder="请输入单位编码"
          />
        </NFormItem>

        <NFormItem label="单位名称" path="unit">
          <NInput
            v-model:value="formModel.unit"
            :maxlength="50"
            placeholder="请输入单位名称"
          />
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
