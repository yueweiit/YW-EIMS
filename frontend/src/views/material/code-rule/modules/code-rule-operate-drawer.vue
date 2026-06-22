<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import type { FormInst, FormRules } from 'naive-ui';
import { NButton, NDrawer, NDrawerContent, NForm, NFormItem, NInput, NSpace } from 'naive-ui';
import { fetchCreateCodeRule, fetchUpdateCodeRule } from '@/service/api';
import { $t } from '@/locales';

defineOptions({
  name: 'CodeRuleOperateDrawer'
});

interface Props {
  type: NaiveUI.TableOperateType;
  rowData?: Api.CodeRule.CodeRuleRecord | null;
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

const defaultForm: Api.CodeRule.CreateParams = {
  codePrefix: '',
  explainContent: ''
};

const formModel = reactive<Api.CodeRule.CreateParams>({ ...defaultForm });

const title = computed(() => (props.type === 'add' ? $t('common.add') : $t('common.edit')));

const rules = computed<FormRules>(() => ({
  codePrefix:
    props.type === 'add'
      ? [
          {
            required: true,
            message: '请输入编码前缀',
            trigger: 'blur'
          },
          {
            validator: (_rule, value: string) => value.length <= 10,
            message: '编码前缀最多10个字符',
            trigger: 'input'
          }
        ]
      : [],
  explainContent: [
    {
      required: true,
      message: '请输入前缀说明',
      trigger: 'blur'
    },
    {
      validator: (_rule, value: string) => value.length <= 100,
      message: '前缀说明最多100个字符',
      trigger: 'input'
    }
  ]
}));

function resetForm() {
  Object.assign(formModel, { ...defaultForm });
  nextTick(() => {
    formRef.value?.restoreValidation();
  });
}

function setFormFromRow(row: Api.CodeRule.CodeRuleRecord) {
  Object.assign(formModel, {
    codePrefix: row.codePrefix,
    explainContent: row.explainContent
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
      const { error } = await fetchCreateCodeRule(formModel);
      if (!error) {
        window.$message?.success($t('common.addSuccess'));
        visible.value = false;
        emit('submitted');
      }
    } else if (props.rowData) {
      const { error } = await fetchUpdateCodeRule(props.rowData.codePrefix, {
        explainContent: formModel.explainContent
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
  <NDrawer v-model:show="visible" width="420px" placement="right">
    <NDrawerContent :title="title" :native-scrollbar="false">
      <NForm ref="formRef" :model="formModel" :rules="rules" label-placement="left" label-width="90px">
        <NFormItem label="编码前缀" path="codePrefix">
          <NInput
            v-model:value="formModel.codePrefix"
            :disabled="props.type === 'edit'"
            :maxlength="10"
            placeholder="请输入编码前缀"
          />
        </NFormItem>

        <NFormItem label="前缀说明" path="explainContent">
          <NInput
            v-model:value="formModel.explainContent"
            type="textarea"
            :maxlength="100"
            placeholder="请输入前缀说明"
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
