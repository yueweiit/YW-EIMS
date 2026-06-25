<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import type { FormRules } from 'naive-ui';
import { NButton, NDrawer, NDrawerContent, NForm, NFormItem, NInput, NSpace } from 'naive-ui';
import { fetchColorPage, fetchCreateProductCode, fetchUpdateProductCode } from '@/service/api';
import { useNaiveForm } from '@/hooks/common/form';

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

const title = computed(() => (props.type === 'add' ? '新增产品编码' : '编辑产品编码'));

const rules = computed<FormRules>(() => ({
  productCode: [
    {
      required: true,
      message: '请输入产品编码',
      trigger: 'blur'
    },
    {
      max: 50,
      message: '产品编码长度不能超过50个字符',
      trigger: 'blur'
    }
  ],
  productType: [
    {
      required: true,
      message: '请输入产品类型',
      trigger: 'blur'
    },
    {
      max: 50,
      message: '产品类型长度不能超过50个字符',
      trigger: 'blur'
    }
  ],
  productName: [
    {
      required: true,
      message: '请输入产品名称',
      trigger: 'blur'
    },
    {
      max: 100,
      message: '产品名称长度不能超过100个字符',
      trigger: 'blur'
    }
  ],
  colorCode: [
    {
      required: true,
      message: '请输入颜色编码',
      trigger: 'change'
    }
  ],
  colorName: [
    {
      required: true,
      message: '请输入颜色名称',
      trigger: 'blur'
    },
    {
      max: 50,
      message: '颜色名称长度不能超过50个字符',
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
  const { data, error } = await fetchColorPage({ current: 1, size: 1000 });
  if (!error && data) {
    colorList.value = data.records;
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
  await validate();

  loading.value = true;
  try {
    const body = getSubmitBody();
    if (props.type === 'add') {
      const { error } = await fetchCreateProductCode(body);
      if (!error) {
        window.$message?.success('新增成功');
        visible.value = false;
        emit('submitted');
      }
    } else if (props.rowData) {
      const { error } = await fetchUpdateProductCode(props.rowData.id, body);
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
</script>

<template>
  <NDrawer v-model:show="visible" width="420px" placement="right">
    <NDrawerContent :title="title" :native-scrollbar="false">
      <NForm ref="formRef" :model="formModel" :rules="rules" label-placement="left" label-width="90px">
        <NFormItem label="产品编码" path="productCode">
          <NInput v-model:value="formModel.productCode" placeholder="请输入产品编码" />
        </NFormItem>

        <NFormItem label="产品类型" path="productType">
          <NInput v-model:value="formModel.productType" placeholder="请输入产品类型" />
        </NFormItem>

        <NFormItem label="产品名称" path="productName">
          <NInput v-model:value="formModel.productName" placeholder="请输入产品名称" />
        </NFormItem>

        <NFormItem label="颜色编码" path="colorCode">
          <NInput v-model:value="formModel.colorCode" placeholder="输入编码自动带出名称" @blur="onColorCodeBlur" />
        </NFormItem>

        <NFormItem label="颜色名称" path="colorName">
          <NInput v-model:value="formModel.colorName" placeholder="输入名称自动带出编码" @blur="onColorNameBlur" />
        </NFormItem>
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
