<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import type { FormInst, FormRules } from 'naive-ui';
import { NButton, NDrawer, NDrawerContent, NForm, NFormItem, NInput, NSelect, NSpace } from 'naive-ui';
import { fetchCreateErpNextMapping, fetchUpdateErpNextMapping } from '@/service/api';
import { $t } from '@/locales';
import { erpNextMappingTypeOptions } from './options';

defineOptions({
  name: 'ErpNextMappingOperateDrawer'
});

interface Props {
  type: NaiveUI.TableOperateType;
  rowData?: Api.ErpNextMapping.ErpNextMappingRecord | null;
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

const defaultForm: Api.ErpNextMapping.CreateParams = {
  type: 'ITEM_GROUP',
  sourceKey: '',
  targetValue: ''
};

const formModel = reactive<Api.ErpNextMapping.CreateParams>({ ...defaultForm });

const title = computed(() => (props.type === 'add' ? $t('common.add') : $t('common.edit')));

const rules: FormRules = {
  type: [{ required: true, message: '请选择映射类型', trigger: 'change' }],
  sourceKey: [
    { required: true, message: '请输入源值', trigger: 'blur' },
    {
      validator: (_rule, value: string) => value.length <= 50,
      message: '源值最多 50 个字符',
      trigger: 'input'
    }
  ],
  targetValue: [
    { required: true, message: '请输入 ERPNext 目标值', trigger: 'blur' },
    {
      validator: (_rule, value: string) => value.length <= 200,
      message: 'ERPNext 目标值最多 200 个字符',
      trigger: 'input'
    }
  ]
};

function resetForm() {
  Object.assign(formModel, { ...defaultForm });
  nextTick(() => {
    formRef.value?.restoreValidation();
  });
}

function setFormFromRow(row: Api.ErpNextMapping.ErpNextMappingRecord) {
  Object.assign(formModel, {
    type: row.type,
    sourceKey: row.sourceKey,
    targetValue: row.targetValue
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
      const { error } = await fetchCreateErpNextMapping(formModel);
      if (!error) {
        window.$message?.success($t('common.addSuccess'));
        visible.value = false;
        emit('submitted');
      }
    } else if (props.rowData) {
      const { error } = await fetchUpdateErpNextMapping(props.rowData.id, {
        type: formModel.type,
        sourceKey: formModel.sourceKey,
        targetValue: formModel.targetValue
      });
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
  <NDrawer v-model:show="visible" width="460px" placement="right">
    <NDrawerContent :title="title" :native-scrollbar="false">
      <NForm ref="formRef" :model="formModel" :rules="rules" label-placement="left" label-width="120px">
        <NFormItem label="映射类型" path="type">
          <NSelect v-model:value="formModel.type" :options="erpNextMappingTypeOptions" placeholder="请选择映射类型" />
        </NFormItem>

        <NFormItem label="源值" path="sourceKey">
          <NInput v-model:value="formModel.sourceKey" :maxlength="50" placeholder="请输入系统内源值" />
        </NFormItem>

        <NFormItem label="ERPNext目标值" path="targetValue">
          <NInput
            v-model:value="formModel.targetValue"
            type="textarea"
            :maxlength="200"
            placeholder="请输入 ERPNext 中对应的目标值"
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
