<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import type { FormInst, FormRules } from 'naive-ui';
import { NButton, NDrawer, NDrawerContent, NForm, NFormItem, NInput, NInputNumber, NSpace, NText } from 'naive-ui';
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
  explainContent: '',
  prefixLength: undefined
};

const formModel = reactive<Api.CodeRule.CreateParams>({ ...defaultForm });

const title = computed(() => (props.type === 'add' ? $t('common.add') : $t('common.edit')));

const rules = computed<FormRules>(() => ({
  codePrefix:
    props.type === 'add'
      ? [
          {
            required: true,
            message: $t('page.ui.enterPrefix'),
            trigger: 'blur'
          },
          {
            validator: (_rule, value: string) => value.length <= 10,
            message: $t('page.ui.prefixMax'),
            trigger: 'input'
          }
        ]
      : [],
  explainContent: [
    {
      required: true,
      message: $t('page.ui.enterPrefixDescription'),
      trigger: 'blur'
    },
    {
      validator: (_rule, value: string) => value.length <= 100,
      message: $t('page.ui.prefixDescriptionMax'),
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
    explainContent: row.explainContent,
    prefixLength: row.prefixLength ?? undefined
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
        explainContent: formModel.explainContent,
        prefixLength: formModel.prefixLength
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
        <NFormItem :label="$t('page.ui.codePrefix')" path="codePrefix">
          <NInput
            v-model:value="formModel.codePrefix"
            :disabled="props.type === 'edit'"
            :maxlength="10"
            :placeholder="$t('page.ui.enterPrefix')"
          />
        </NFormItem>

        <NFormItem :label="$t('page.ui.prefixDescription')" path="explainContent">
          <NInput
            v-model:value="formModel.explainContent"
            type="textarea"
            :maxlength="100"
            :placeholder="$t('page.ui.enterPrefixDescription')"
          />
        </NFormItem>

        <NFormItem :label="$t('page.ui.prefixLength')" path="prefixLength">
          <NInputNumber
            v-model:value="formModel.prefixLength"
            :min="1"
            :max="10"
            :placeholder="$t('page.ui.prefixLengthPlaceholder')"
            style="width: 100%"
          />
          <NText depth="3" style="font-size: 12px; margin-top: 4px;">
            {{ $t('page.ui.prefixLengthHelp') }}
          </NText>
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
