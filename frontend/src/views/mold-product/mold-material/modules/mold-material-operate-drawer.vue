<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import type { FormRules } from 'naive-ui';
import { NButton, NDrawer, NDrawerContent, NForm, NFormItem, NInput, NSpace } from 'naive-ui';
import { fetchCreateMoldMaterial, fetchUpdateMoldMaterial } from '@/service/api';
import { useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'MoldMaterialOperateDrawer'
});

interface Props {
  type: NaiveUI.TableOperateType;
  rowData?: Api.MoldMaterial.MoldMaterialRecord | null;
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

const defaultForm: Api.MoldMaterial.CreateParams = {
  typeCode: '',
  typeName: ''
};

const formModel = reactive<Api.MoldMaterial.CreateParams>({ ...defaultForm });

const title = computed(() => (props.type === 'add' ? $t('page.ui.addMoldMaterial') : $t('page.ui.editMoldMaterial')));

const rules = computed<FormRules>(() => ({
  typeCode: [
    {
      required: true,
      message: $t('page.ui.enterMaterialTypeCode'),
      trigger: 'blur'
    },
    {
      max: 50,
      message: $t('page.ui.materialTypeCodeMax'),
      trigger: 'blur'
    }
  ],
  typeName: [
    {
      required: true,
      message: $t('page.ui.enterMaterialTypeName'),
      trigger: 'blur'
    },
    {
      max: 100,
      message: $t('page.ui.materialTypeNameMax'),
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

function setFormFromRow(row: Api.MoldMaterial.MoldMaterialRecord) {
  Object.assign(formModel, {
    typeCode: row.typeCode,
    typeName: row.typeName
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
  const { typeCode, typeName } = formModel;
  return { typeCode, typeName };
}

async function handleSubmit() {
  loading.value = true;
  try {
    await validate();
    const body = getSubmitBody();
    if (props.type === 'add') {
      const { error } = await fetchCreateMoldMaterial(body);
      if (!error) {
        window.$message?.success($t('common.addSuccess'));
        visible.value = false;
        emit('submitted');
      }
    } else if (props.rowData) {
      const { error } = await fetchUpdateMoldMaterial(props.rowData.id, body);
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
        <NFormItem :label="$t('page.ui.materialTypeCode')" path="typeCode">
          <NInput v-model:value="formModel.typeCode" :placeholder="$t('page.ui.enterMaterialTypeCode')" />
        </NFormItem>

        <NFormItem :label="$t('page.ui.materialTypeName')" path="typeName">
          <NInput v-model:value="formModel.typeName" :placeholder="$t('page.ui.enterMaterialTypeName')" />
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
