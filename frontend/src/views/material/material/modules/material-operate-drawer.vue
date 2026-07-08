<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import type { FormRules } from 'naive-ui';
import { NButton, NDrawer, NDrawerContent, NForm, NFormItem, NInput, NSelect, NSpace, NText } from 'naive-ui';
import { fetchCreateMaterial, fetchUnitPage, fetchUpdateMaterial, fetchCodeRulePage } from '@/service/api';
import { useNaiveForm } from '@/hooks/common/form';

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
  codePrefix: undefined,
  unit: undefined,
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

const title = computed(() => (props.type === 'add' ? '新增物料' : '编辑物料'));

const rules = computed<FormRules>(() => ({
  applicant: [
    {
      required: true,
      message: '请输入申请人',
      trigger: 'blur'
    },
    {
      max: 50,
      message: '申请人长度不能超过50个字符',
      trigger: 'blur'
    }
  ],
  materialName: [
    {
      required: true,
      message: '请输入物料名称',
      trigger: 'blur'
    },
    {
      max: 500,
      message: '物料名称长度不能超过500个字符',
      trigger: 'blur'
    }
  ],
  codePrefix: [
    {
      required: true,
      message: '请选择编码前缀',
      trigger: 'change'
    }
  ],
  specifications: [
    {
      max: 1000,
      message: '规格型号长度不能超过1000个字符',
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
        window.$message?.success('新增成功');
        visible.value = false;
        emit('submitted');
      }
    } else if (props.rowData) {
      const { error } = await fetchUpdateMaterial(props.rowData.id, body);
      if (!error) {
        window.$message?.success('更新成功');
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
        <NFormItem label="申请人" path="applicant">
          <NInput v-model:value="formModel.applicant" placeholder="请输入申请人" />
        </NFormItem>

        <NFormItem label="物料名称" path="materialName">
          <NInput v-model:value="formModel.materialName" placeholder="请输入物料名称" />
        </NFormItem>

        <NFormItem label="编码前缀" path="codePrefix">
          <NSelect
            v-model:value="formModel.codePrefix"
            :options="prefixOptions"
            placeholder="请选择编码前缀"
          />
        </NFormItem>

        <NFormItem label="单位" path="unit">
          <NSelect
            v-model:value="formModel.unit"
            clearable
            :options="unitOptions"
            placeholder="请选择单位"
          />
        </NFormItem>

        <NFormItem label="规格型号" path="specifications">
          <NInput
            v-model:value="formModel.specifications"
            type="textarea"
            placeholder="请输入规格型号"
          />
        </NFormItem>

        <template v-if="props.type === 'edit'">
          <NFormItem label="申请日期">
            <NText>{{ formModel.applicationDate || '-' }}</NText>
          </NFormItem>

          <NFormItem label="前缀说明">
            <NText>{{ formModel.explainContent || '-' }}</NText>
          </NFormItem>

          <NFormItem label="单位编码">
            <NText>{{ formModel.unitCode || '-' }}</NText>
          </NFormItem>
        </template>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="visible = false">取消</NButton>
          <NButton type="primary" :loading="loading" @click="handleSubmit">
            确定
          </NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped></style>
