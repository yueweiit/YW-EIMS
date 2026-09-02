<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import type { FormRules } from 'naive-ui';
import { NButton, NDrawer, NDrawerContent, NForm, NFormItem, NInput, NSpace } from 'naive-ui';
import { fetchCreateColor, fetchUpdateColor } from '@/service/api';
import { useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'ColorOperateDrawer'
});

interface Props {
  type: NaiveUI.TableOperateType;
  rowData?: Api.Color.ColorRecord | null;
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

const defaultForm: Api.Color.CreateParams = {
  colorCode: '',
  colorName: ''
};

const formModel = reactive<Api.Color.CreateParams>({ ...defaultForm });

const title = computed(() => (props.type === 'add' ? $t('page.ui.addColor') : $t('page.ui.editColor')));

const rules = computed<FormRules>(() => ({
  colorCode: [
    {
      required: true,
      message: $t('page.ui.enterColorCode'),
      trigger: 'blur'
    },
    {
      max: 50,
      message: $t('page.ui.colorCodeMax'),
      trigger: 'blur'
    }
  ],
  colorName: [
    {
      required: true,
      message: $t('page.ui.enterColorName'),
      trigger: 'blur'
    },
    {
      max: 100,
      message: $t('page.ui.colorNameMax'),
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

function setFormFromRow(row: Api.Color.ColorRecord) {
  Object.assign(formModel, {
    colorCode: row.colorCode,
    colorName: row.colorName
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
  const { colorCode, colorName } = formModel;
  return { colorCode, colorName };
}

async function handleSubmit() {
  loading.value = true;
  try {
    await validate();
    const body = getSubmitBody();
    if (props.type === 'add') {
      const { error } = await fetchCreateColor(body);
      if (!error) {
        window.$message?.success($t('common.addSuccess'));
        visible.value = false;
        emit('submitted');
      }
    } else if (props.rowData) {
      const { error } = await fetchUpdateColor(props.rowData.id, body);
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
        <NFormItem :label="$t('page.ui.colorCode')" path="colorCode">
          <NInput v-model:value="formModel.colorCode" :placeholder="$t('page.ui.enterColorCode')" />
        </NFormItem>

        <NFormItem :label="$t('page.ui.colorName')" path="colorName">
          <NInput v-model:value="formModel.colorName" :placeholder="$t('page.ui.enterColorName')" />
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
