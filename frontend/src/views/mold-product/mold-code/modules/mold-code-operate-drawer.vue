<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import type { FormRules } from 'naive-ui';
import { NButton, NDrawer, NDrawerContent, NForm, NFormItem, NInput, NSelect, NSpace } from 'naive-ui';
import { fetchCreateMoldCode, fetchMoldMaterialPage, fetchUpdateMoldCode } from '@/service/api';
import { useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'MoldCodeOperateDrawer'
});

interface Props {
  type: NaiveUI.TableOperateType;
  rowData?: Api.MoldCode.MoldCodeRecord | null;
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
const materialOptions = ref<{ label: string; value: string }[]>([]);
const materialTypeCodeMap = ref<Map<string, string>>(new Map());

const defaultForm: Api.MoldCode.CreateParams = {
  moldType: '',
  moldName: '',
  moldPrefix: '',
  materialName: ''
};

const formModel = reactive<Api.MoldCode.CreateParams>({ ...defaultForm });

const title = computed(() => (props.type === 'add' ? $t('page.ui.addMoldCode') : $t('page.ui.editMoldCode')));

const moldCodePreview = computed(() => {
  const prefix = formModel.moldPrefix?.trim();
  const typeCode = materialTypeCodeMap.value.get(formModel.materialName);
  if (prefix && typeCode) {
    return (prefix + typeCode).toUpperCase();
  }
  return '';
});

const rules = computed<FormRules>(() => ({
  moldType: [
    {
      required: true,
      message: $t('page.ui.selectMoldType'),
      trigger: 'blur'
    },
    {
      max: 50,
      message: $t('page.ui.moldTypeMax'),
      trigger: 'blur'
    }
  ],
  moldName: [
    {
      required: true,
      message: $t('page.ui.enterMoldName'),
      trigger: 'blur'
    },
    {
      max: 100,
      message: $t('page.ui.moldNameMax'),
      trigger: 'blur'
    }
  ],
  moldPrefix: [
    {
      required: true,
      message: $t('page.ui.enterMoldPrefix'),
      trigger: 'blur'
    },
    {
      max: 50,
      message: $t('page.ui.moldPrefixMax'),
      trigger: 'blur'
    }
  ],
  materialName: [
    {
      required: true,
      message: $t('page.ui.selectMaterialName'),
      trigger: 'change'
    }
  ]
}));

async function loadMaterialOptions() {
  try {
    const { data, error } = await fetchMoldMaterialPage({ current: 1, size: 100 });
    if (!error && data) {
      materialOptions.value = data.records.map(item => ({
        label: item.typeName,
        value: item.typeName
      }));
      const map = new Map<string, string>();
      data.records.forEach(item => {
        map.set(item.typeName, item.typeCode);
      });
      materialTypeCodeMap.value = map;
    }
  } catch {
    window.$message?.error($t('page.ui.loadMaterialListFailed'));
  }
}

function resetForm() {
  Object.assign(formModel, { ...defaultForm });
  nextTick(() => {
    restoreValidation();
  });
}

function setFormFromRow(row: Api.MoldCode.MoldCodeRecord) {
  Object.assign(formModel, {
    moldType: row.moldType,
    moldName: row.moldName,
    moldPrefix: row.moldPrefix,
    materialName: row.typeName
  });
  nextTick(() => {
    restoreValidation();
  });
}

watch(visible, val => {
  if (val) {
    loadMaterialOptions();
    if (props.type === 'edit' && props.rowData) {
      setFormFromRow(props.rowData);
    } else {
      resetForm();
    }
  }
});

function getSubmitBody() {
  const { moldType, moldName, moldPrefix, materialName } = formModel;
  return { moldType, moldName, moldPrefix, materialName };
}

async function handleSubmit() {
  loading.value = true;
  try {
    await validate();
    const body = getSubmitBody();
    if (props.type === 'add') {
      const { error } = await fetchCreateMoldCode(body);
      if (!error) {
        window.$message?.success($t('common.addSuccess'));
        visible.value = false;
        emit('submitted');
      }
    } else if (props.rowData) {
      const { error } = await fetchUpdateMoldCode(props.rowData.id, body);
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
        <NFormItem :label="$t('page.ui.moldType')" path="moldType">
          <NInput v-model:value="formModel.moldType" :placeholder="$t('page.ui.selectMoldType')" />
        </NFormItem>

        <NFormItem :label="$t('page.ui.moldName')" path="moldName">
          <NInput v-model:value="formModel.moldName" :placeholder="$t('page.ui.enterMoldName')" />
        </NFormItem>

        <NFormItem :label="$t('page.ui.moldPrefix')" path="moldPrefix">
          <NInput v-model:value="formModel.moldPrefix" :placeholder="$t('page.ui.enterMoldPrefix')" />
        </NFormItem>

        <NFormItem :label="$t('page.ui.materialTypeName')" path="materialName">
          <NSelect
            v-model:value="formModel.materialName"
            :options="materialOptions"
            :placeholder="$t('page.ui.selectMaterialName')"
            filterable
          />
        </NFormItem>

        <NFormItem v-if="moldCodePreview" :label="$t('page.ui.moldCode')">
          <NInput :value="moldCodePreview" :placeholder="$t('page.ui.autoGenerate')" disabled />
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
