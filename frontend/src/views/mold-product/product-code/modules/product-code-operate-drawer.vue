<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import type { FormRules } from 'naive-ui';
import { NButton, NDrawer, NDrawerContent, NForm, NFormItem, NInput, NSpace } from 'naive-ui';
import { fetchColorPage, fetchCreateProductCode, fetchUpdateProductCode } from '@/service/api';
import { useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'ProductCodeOperateDrawer'
});

interface Props {
  type: NaiveUI.TableOperateType;
  rowData?: Api.ProductCode.ProductCodeRecord | null;
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
const colorList = ref<Api.Color.ColorRecord[]>([]);

const defaultForm: Api.ProductCode.CreateParams = {
  productCode: '',
  productType: '',
  productName: '',
  colorCode: '',
  colorName: ''
};

const formModel = reactive<Api.ProductCode.CreateParams>({ ...defaultForm });

const title = computed(() => (props.type === 'add' ? $t('page.ui.addProductCode') : $t('page.ui.editProductCode')));

const rules = computed<FormRules>(() => ({
  productCode: [
    {
      required: true,
      message: $t('page.ui.enterProductCode'),
      trigger: 'blur'
    },
    {
      max: 50,
      message: $t('page.ui.productCodeMax'),
      trigger: 'blur'
    }
  ],
  productType: [
    {
      required: true,
      message: $t('page.ui.enterProductType'),
      trigger: 'blur'
    },
    {
      max: 50,
      message: $t('page.ui.productTypeMax'),
      trigger: 'blur'
    }
  ],
  productName: [
    {
      required: true,
      message: $t('page.ui.enterProductName'),
      trigger: 'blur'
    },
    {
      max: 100,
      message: $t('page.ui.productNameMax'),
      trigger: 'blur'
    }
  ],
  colorCode: [
    {
      required: true,
      message: $t('page.ui.enterColorCode'),
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
      max: 50,
      message: $t('page.ui.colorNameShortMax'),
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

function setFormFromRow(row: Api.ProductCode.ProductCodeRecord) {
  Object.assign(formModel, {
    productCode: row.productCode,
    productType: row.productType,
    productName: row.productName,
    colorCode: row.colorCode,
    colorName: row.colorName
  });
  nextTick(() => {
    restoreValidation();
  });
}

watch(visible, val => {
  if (val) {
    loadColorList();
    if (props.type === 'edit' && props.rowData) {
      setFormFromRow(props.rowData);
    } else {
      resetForm();
    }
  }
});

async function loadColorList() {
  try {
    const { data, error } = await fetchColorPage({ current: 1, size: 100 });
    if (!error && data) {
      colorList.value = data.records;
    }
  } catch {
    window.$message?.error($t('page.ui.loadColorListFailed'));
  }
}

/** 输入颜色编码后自动带出颜色名称 */
function onColorCodeBlur() {
  const code = formModel.colorCode?.trim();
  if (!code) return;
  const matched = colorList.value.find(c => c.colorCode === code);
  if (matched) {
    formModel.colorName = matched.colorName;
  }
}

/** 输入颜色名称后自动带出颜色编码 */
function onColorNameBlur() {
  const name = formModel.colorName?.trim();
  if (!name) return;
  const matched = colorList.value.find(c => c.colorName === name);
  if (matched) {
    formModel.colorCode = matched.colorCode;
  }
}

function getSubmitBody() {
  const { productCode, productType, productName, colorCode, colorName } = formModel;
  return { productCode, productType, productName, colorCode, colorName };
}

async function handleSubmit() {
  loading.value = true;
  try {
    await validate();
    const body = getSubmitBody();
    if (props.type === 'add') {
      const { error } = await fetchCreateProductCode(body);
      if (!error) {
        window.$message?.success($t('common.addSuccess'));
        visible.value = false;
        emit('submitted');
      }
    } else if (props.rowData) {
      const { error } = await fetchUpdateProductCode(props.rowData.id, body);
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
        <NFormItem :label="$t('page.ui.productCode')" path="productCode">
          <NInput v-model:value="formModel.productCode" :placeholder="$t('page.ui.enterProductCode')" />
        </NFormItem>

        <NFormItem :label="$t('page.ui.productType')" path="productType">
          <NInput v-model:value="formModel.productType" :placeholder="$t('page.ui.enterProductType')" />
        </NFormItem>

        <NFormItem :label="$t('page.ui.productName')" path="productName">
          <NInput v-model:value="formModel.productName" :placeholder="$t('page.ui.enterProductName')" />
        </NFormItem>

        <NFormItem :label="$t('page.ui.colorCode')" path="colorCode">
          <NInput v-model:value="formModel.colorCode" :placeholder="$t('page.ui.colorCodeAutoName')" @blur="onColorCodeBlur" />
        </NFormItem>

        <NFormItem :label="$t('page.ui.colorName')" path="colorName">
          <NInput v-model:value="formModel.colorName" :placeholder="$t('page.ui.colorNameAutoCode')" @blur="onColorNameBlur" />
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
