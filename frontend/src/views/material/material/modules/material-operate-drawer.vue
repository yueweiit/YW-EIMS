<script setup lang="ts">
import { computed, h, nextTick, reactive, ref, watch } from 'vue';
import type { DataTableColumns, FormRules } from 'naive-ui';
import {
  NButton,
  NDataTable,
  NDrawer,
  NDrawerContent,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NSpace,
  NText
} from 'naive-ui';
import {
  fetchCodeRulePage,
  fetchImportMaterials,
  fetchPreviewMaterialCodes,
  fetchUnitPage,
  fetchUpdateMaterial
} from '@/service/api';
import { useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'MaterialOperateDrawer'
});

interface Props {
  type: NaiveUI.TableOperateType;
  rowData?: Api.Material.MaterialRecord | null;
}

interface Emits {
  (e: 'submitted'): void;
}

interface MaterialBatchRow extends Api.Material.CreateParams {
  key: number;
}

type MaterialBatchTextField = 'applicant' | 'materialName' | 'specifications';

const props = withDefaults(defineProps<Props>(), {
  rowData: null
});

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>('visible', { default: false });

const { formRef, validate, restoreValidation } = useNaiveForm();
const loading = ref(false);
const unitOptions = ref<{ label: string; value: string }[]>([]);
const prefixOptions = ref<{ label: string; value: string }[]>([]);
const batchRows = ref<MaterialBatchRow[]>([]);
const codePreviews = ref<Array<string | null>>([]);
const batchCodePrefixes = computed(() => batchRows.value.map(row => row.codePrefix || ''));
let previewRequestId = 0;
let nextBatchRowKey = 0;

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

const title = computed(() =>
  props.type === 'add' ? $t('page.ui.materialBatchAdd') : $t('page.ui.materialEdit')
);

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

function createBatchRow(): MaterialBatchRow {
  nextBatchRowKey += 1;
  return {
    key: nextBatchRowKey,
    applicant: '',
    materialName: '',
    codePrefix: '',
    unit: '',
    specifications: ''
  };
}

function resetBatchRows() {
  batchRows.value = [createBatchRow()];
}

function appendBatchRow() {
  batchRows.value.push(createBatchRow());
}

function removeBatchRow(key: number) {
  if (batchRows.value.length <= 1) return;
  const index = batchRows.value.findIndex(row => row.key === key);
  if (index >= 0) batchRows.value.splice(index, 1);
}

async function refreshCodePreviews() {
  const requestId = ++previewRequestId;
  const prefixes = batchCodePrefixes.value;
  if (!prefixes.some(Boolean)) {
    codePreviews.value = prefixes.map(() => null);
    return;
  }

  const { data, error } = await fetchPreviewMaterialCodes(prefixes);
  if (requestId !== previewRequestId) return;
  codePreviews.value = !error && data ? data.codes : prefixes.map(() => null);
}

watch(batchCodePrefixes, () => {
  void refreshCodePreviews();
}, { immediate: true });

function renderTextInput(
  row: MaterialBatchRow,
  field: MaterialBatchTextField,
  placeholder: string,
  maxlength: number
) {
  return h(NInput, {
    value: row[field] || '',
    size: 'small',
    maxlength,
    placeholder,
    'onUpdate:value': (value: string) => {
      row[field] = value;
    }
  });
}

const batchColumns = computed<DataTableColumns<MaterialBatchRow>>(() => [
  {
    key: 'index',
    title: $t('page.ui.serialNumber'),
    width: 60,
    align: 'center',
    render: (_row, index) => index + 1
  },
  {
    key: 'applicant',
    title: $t('page.ui.applicant'),
    width: 160,
    render: row => renderTextInput(row, 'applicant', $t('page.ui.enterApplicant'), 50)
  },
  {
    key: 'materialName',
    title: $t('page.ui.materialName'),
    width: 220,
    render: row => renderTextInput(row, 'materialName', $t('page.ui.enterMaterialName'), 500)
  },
  {
    key: 'specifications',
    title: $t('page.ui.specifications'),
    width: 220,
    render: row => renderTextInput(row, 'specifications', $t('page.ui.enterSpecifications'), 1000)
  },
  {
    key: 'unit',
    title: $t('page.ui.unitLabel'),
    width: 120,
    render: row =>
      h(NSelect, {
        value: row.unit || null,
        options: unitOptions.value,
        placeholder: $t('page.ui.selectUnit'),
        size: 'small',
        clearable: true,
        filterable: true,
        'onUpdate:value': (value: string | null) => {
          row.unit = value || undefined;
        }
      })
  },
  {
    key: 'codePrefix',
    title: $t('page.ui.codePrefix'),
    width: 210,
    render: row =>
      h(NSelect, {
        value: row.codePrefix || null,
        options: prefixOptions.value,
        placeholder: $t('page.ui.selectCodePrefix'),
        size: 'small',
        filterable: true,
        'onUpdate:value': (value: string | null) => {
          row.codePrefix = value || '';
        }
      })
  },
  {
    key: 'codePreview',
    title: $t('page.ui.codePreview'),
    width: 170,
    render: (_row, index) => {
      const code = codePreviews.value[index];
      return code
        ? h(NText, { type: 'success' }, { default: () => code })
        : h(NText, { depth: 3 }, { default: () => $t('page.ui.codePreviewPlaceholder') });
    }
  },
  {
    key: 'operate',
    title: $t('page.ui.operation'),
    width: 100,
    fixed: 'right',
    align: 'center',
    render: row =>
      h(
        NButton,
        {
          size: 'small',
          type: 'error',
          ghost: true,
          disabled: batchRows.value.length <= 1,
          'aria-label': $t('page.ui.removeMaterialRow'),
          onClick: () => removeBatchRow(row.key)
        },
        { default: () => $t('common.delete') }
      )
  }
]);

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
      resetBatchRows();
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

function validateBatchRows() {
  const invalidIndex = batchRows.value.findIndex(
    row => !row.applicant.trim() || !row.materialName.trim() || !row.codePrefix.trim()
  );
  if (invalidIndex >= 0) {
    window.$message?.error(
      $t('page.ui.materialBatchAddRowRequired', { row: invalidIndex + 1 })
    );
    return false;
  }
  return true;
}

function getBatchSubmitRows(): Api.Material.CreateParams[] {
  return batchRows.value.map(({ key: _key, ...row }) => ({
    applicant: row.applicant.trim(),
    materialName: row.materialName.trim(),
    codePrefix: row.codePrefix.trim().toUpperCase(),
    unit: row.unit?.trim() || undefined,
    specifications: row.specifications?.trim() || undefined
  }));
}

async function handleBatchSubmit() {
  if (!validateBatchRows()) return;

  loading.value = true;
  try {
    const { data, error } = await fetchImportMaterials(getBatchSubmitRows());
    if (error || !data) return;

    if (data.success > 0) {
      window.$message?.success(
        $t('page.ui.materialBatchAddSuccess', { count: data.success })
      );
    }
    if (data.failed > 0) {
      window.$message?.warning(data.errors.join('\n'), { duration: 8000 });
    }
    if (data.success > 0 || data.failed === 0) {
      visible.value = false;
      emit('submitted');
    }
  } finally {
    loading.value = false;
  }
}

async function handleSubmit() {
  if (props.type === 'add') {
    await handleBatchSubmit();
    return;
  }

  await validate();

  loading.value = true;
  try {
    const body = getSubmitBody();
    if (props.rowData) {
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
  <NDrawer
    v-model:show="visible"
    :width="props.type === 'add' ? 'min(1200px, 94vw)' : '420px'"
    placement="right"
  >
    <NDrawerContent :title="title" :native-scrollbar="false">
      <template v-if="props.type === 'add'">
        <div class="batch-add-panel">
          <NSpace justify="space-between" align="center" wrap>
            <NText depth="3">{{ $t('page.ui.materialBatchAddHint') }}</NText>
            <NButton type="primary" secondary @click="appendBatchRow">
              <template #icon>
                <SvgIcon icon="mdi:plus" />
              </template>
              {{ $t('page.ui.addMaterialRow') }}
            </NButton>
          </NSpace>

          <NDataTable
            :columns="batchColumns"
            :data="batchRows"
            :pagination="false"
            :row-key="row => row.key"
            :scroll-x="1260"
            :max-height="'calc(100vh - 240px)'"
            striped
          />
        </div>
      </template>

      <NForm
        v-else
        ref="formRef"
        :model="formModel"
        :rules="rules"
        label-placement="left"
        label-width="90px"
      >
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

        <NFormItem :label="$t('page.ui.applicationDate')">
          <NText>{{ formModel.applicationDate || '-' }}</NText>
        </NFormItem>

        <NFormItem :label="$t('page.ui.prefixDescription')">
          <NText>{{ formModel.explainContent || '-' }}</NText>
        </NFormItem>

        <NFormItem :label="$t('page.ui.unitCode')">
          <NText>{{ formModel.unitCode || '-' }}</NText>
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

<style scoped>
.batch-add-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.batch-add-panel :deep(.n-input),
.batch-add-panel :deep(.n-base-selection) {
  width: 100%;
}

.batch-add-panel :deep(.n-data-table-td) {
  vertical-align: top;
}
</style>
