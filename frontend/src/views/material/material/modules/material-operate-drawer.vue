<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import type { FormRules } from 'naive-ui';
import { NButton, NDrawer, NDrawerContent, NForm, NFormItem, NInput, NSelect, NSpace, NText } from 'naive-ui';
import { fetchCreateMaterial, fetchUnitPage, fetchUpdateMaterial, fetchCodeRulePage } from '@/service/api';
import { useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'MaterialOperateDrawer'
});

interface Props {
  type: NaiveUI.TableOperateType;
  rowData?: Api.Material.MaterialRecord | null;
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
const unitOptions = ref<{ label: string; value: string }[]>([]);
const prefixOptions = ref<{ label: string; value: string }[]>([]);

const defaultForm: Api.Material.CreateParams & {
  applicationDate?: string | null;
  explainContent?: string | null;
  unitCode?: string | null;
} = {
  applicant: '',
  materialName: '',
  codePrefix: '',
  unit: '',
  specifications: '',
  applicationDate: null,
  explainContent: null,
  unitCode: null
};

const formModel = reactive<Api.Material.CreateParams & {
  applicationDate?: string | null;
  explainContent?: string | null;
  unitCode?: string | null;
}>({ ...defaultForm });

const title = computed(() => (props.type === 'add' ? $t('page.ui.materialAdd') : $t('page.ui.materialEdit')));

const rules = computed<FormRules>(() => ({
  applicant: [
    {
      required: true,
      message: $t('page.ui.enterApplicant'),
      trigger: 'blur'
    },
    {
      max: 50,
      message: $t('page.ui.applicantMax'),
      trigger: 'blur'
    }
  ],
  materialName: [
    {
      required: true,
      message: $t('page.ui.enterMaterialName'),
      trigger: 'blur'
    },
    {
      max: 500,
      message: $t('page.ui.materialNameMax'),
      trigger: 'blur'
    }
  ],
  codePrefix: [
    {
      required: true,
      message: $t('page.ui.selectCodePrefix'),
      trigger: 'change'
    }
  ],
  specifications: [
    {
      max: 1000,
      message: $t('page.ui.specificationsMax'),
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

function setFormFromRow(row: Api.Material.MaterialRecord) {
  Object.assign(formModel, {
    applicant: row.applicant,
    materialName: row.materialName,
    codePrefix: row.codePrefix || undefined,
    unit: row.unit || undefined,
    specifications: row.specifications || '',
    applicationDate: row.applicationDate,
    explainContent: row.explainContent,
    unitCode: row.unitCode
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

async function loadUnitOptions() {
  const { data, error } = await fetchUnitPage({ current: 1, size: 100 });
  if (!error && data) {
    unitOptions.value = data.records.map(u => ({
      label: u.unit,
      value: u.unit
    }));
  }
}

async function loadPrefixOptions() {
  const { data, error } = await fetchCodeRulePage({ current: 1, size: 100 });
  if (!error && data) {
    prefixOptions.value = data.records.map(r => {
      const effectivePrefix = r.prefixLength ? r.codePrefix.substring(0, r.prefixLength) : r.codePrefix;
      return {
        label: `${effectivePrefix} - ${r.explainContent}`,
        value: r.codePrefix
      };
    });
  }
}

function getSubmitBody() {
  const { applicant, materialName, codePrefix, unit, specifications } = formModel;
  return { applicant, materialName, codePrefix, unit, specifications };
}

async function handleSubmit() {
  await validate();

  loading.value = true;
  try {
    const body = getSubmitBody();
    if (props.type === 'add') {
      const { error } = await fetchCreateMaterial(body);
      if (!error) {
        window.$message?.success($t('common.addSuccess'));
        visible.value = false;
        emit('submitted');
      }
    } else if (props.rowData) {
      const { error } = await fetchUpdateMaterial(props.rowData.id, body);
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

loadUnitOptions();
loadPrefixOptions();
</script>

<template>
  <NDrawer v-model:show="visible" width="420px" placement="right">
    <NDrawerContent :title="title" :native-scrollbar="false">
      <NForm ref="formRef" :model="formModel" :rules="rules" label-placement="left" label-width="90px">
        <NFormItem :label="$t('page.ui.applicant')" path="applicant">
          <NInput v-model:value="formModel.applicant" :placeholder="$t('page.ui.enterApplicant')" />
        </NFormItem>

        <NFormItem :label="$t('page.ui.materialName')" path="materialName">
          <NInput v-model:value="formModel.materialName" :placeholder="$t('page.ui.enterMaterialName')" />
        </NFormItem>

        <NFormItem :label="$t('page.ui.codePrefix')" path="codePrefix">
          <NSelect
            v-model:value="formModel.codePrefix"
            :options="prefixOptions"
            :placeholder="$t('page.ui.selectCodePrefix')"
          />
        </NFormItem>

        <NFormItem :label="$t('page.ui.unitLabel')" path="unit">
          <NSelect
            v-model:value="formModel.unit"
            clearable
            :options="unitOptions"
            :placeholder="$t('page.ui.selectUnit')"
          />
        </NFormItem>

        <NFormItem :label="$t('page.ui.specifications')" path="specifications">
          <NInput
            v-model:value="formModel.specifications"
            type="textarea"
            :placeholder="$t('page.ui.enterSpecifications')"
          />
        </NFormItem>

        <template v-if="props.type === 'edit'">
          <NFormItem :label="$t('page.ui.applicationDate')">
            <NText>{{ formModel.applicationDate || '-' }}</NText>
          </NFormItem>

          <NFormItem :label="$t('page.ui.prefixDescription')">
            <NText>{{ formModel.explainContent || '-' }}</NText>
          </NFormItem>

          <NFormItem :label="$t('page.ui.unitCode')">
            <NText>{{ formModel.unitCode || '-' }}</NText>
          </NFormItem>
        </template>
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
