<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import type { FormRules } from 'naive-ui';
import { NButton, NDrawer, NDrawerContent, NForm, NFormItem, NSelect, NSpace } from 'naive-ui';
import { fetchCreateProduct, fetchPhoneModelPage, fetchProductCodePage, fetchUpdateProduct } from '@/service/api';
import { useNaiveForm } from '@/hooks/common/form';

defineOptions({
  name: 'ProductOperateDrawer'
});

interface Props {
  type: NaiveUI.TableOperateType;
  rowData?: Api.Product.ProductRecord | null;
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
const productTypeOptions = ref<{ label: string; value: string }[]>([]);
const phoneShortNameOptions = ref<{ label: string; value: string }[]>([]);
const phoneShortNameLoading = ref(false);
const phoneShortNamePage = ref(1);
const phoneShortNameTotal = ref(0);
const phoneShortNameSearchText = ref('');

const defaultForm: Api.Product.CreateParams = {
  productType: '',
  phoneShortName: ''
};

const formModel = reactive<Api.Product.CreateParams>({ ...defaultForm });

const title = computed(() => (props.type === 'add' ? '新增产品' : '编辑产品'));

const rules = computed<FormRules>(() => ({
  productType: [
    {
      required: true,
      message: '请选择产品类型',
      trigger: 'change'
    }
  ],
  phoneShortName: [
    {
      required: true,
      message: '请选择手机简称',
      trigger: 'change'
    }
  ]
}));

function resetForm() {
  Object.assign(formModel, { ...defaultForm });
  nextTick(() => {
    restoreValidation();
  });
}

function setFormFromRow(row: Api.Product.ProductRecord) {
  Object.assign(formModel, {
    productType: row.productType,
    phoneShortName: row.phoneShortName
  });
  nextTick(() => {
    restoreValidation();
  });
}

watch(visible, val => {
  if (val) {
    loadProductTypeOptions();
    loadPhoneShortNameOptions();
    if (props.type === 'edit' && props.rowData) {
      setFormFromRow(props.rowData);
    } else {
      resetForm();
    }
  }
});

async function loadProductTypeOptions() {
  try {
    const { data, error } = await fetchProductCodePage({ current: 1, size: 100 });
    if (!error && data) {
      // 按 productType 去重
      const seen = new Set<string>();
      productTypeOptions.value = data.records
        .filter(item => {
          if (seen.has(item.productType)) return false;
          seen.add(item.productType);
          return true;
        })
        .map(item => ({
          label: item.productType,
          value: item.productType
        }));
    }
  } catch {
    window.$message?.error('加载产品类型列表失败');
  }
}

async function loadPhoneShortNameOptions(searchText = '', reset = true) {
  if (reset) {
    phoneShortNamePage.value = 1;
    phoneShortNameOptions.value = [];
  }
  phoneShortNameSearchText.value = searchText;
  phoneShortNameLoading.value = true;
  try {
    const { data, error } = await fetchPhoneModelPage({
      current: phoneShortNamePage.value,
      size: 5,
      phoneName: searchText || undefined
    });
    if (!error && data) {
      const newOptions = data.records
        .filter(item => item.phoneShortName)
        .map(item => ({
          label: item.phoneShortName!,
          value: item.phoneShortName!
        }));
      if (reset) {
        phoneShortNameOptions.value = newOptions;
      } else {
        phoneShortNameOptions.value = [...phoneShortNameOptions.value, ...newOptions];
      }
      phoneShortNameTotal.value = data.total;
    }
  } catch {
    window.$message?.error('加载手机型号列表失败');
  } finally {
    phoneShortNameLoading.value = false;
  }
}

function handlePhoneShortNameSearch(query: string) {
  loadPhoneShortNameOptions(query, true);
}

function handlePhoneShortNameScroll(e: Event) {
  const target = e.target as HTMLElement;
  if (target.scrollHeight - target.scrollTop - target.clientHeight < 20) {
    if (phoneShortNameOptions.value.length < phoneShortNameTotal.value) {
      phoneShortNamePage.value++;
      loadPhoneShortNameOptions(phoneShortNameSearchText.value, false);
    }
  }
}

function getSubmitBody() {
  const { productType, phoneShortName } = formModel;
  return { productType, phoneShortName };
}

async function handleSubmit() {
  loading.value = true;
  try {
    await validate();
    const body = getSubmitBody();
    if (props.type === 'add') {
      const { data, error } = await fetchCreateProduct(body);
      if (!error) {
        const count = Array.isArray(data) ? data.length : data ? 1 : 0;
        window.$message?.success(`成功生成 ${count} 条品目`);
        visible.value = false;
        emit('submitted');
      }
    } else if (props.rowData) {
      const { error } = await fetchUpdateProduct(props.rowData.id, body);
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
        <NFormItem label="产品类型" path="productType">
          <NSelect
            v-model:value="formModel.productType"
            :options="productTypeOptions"
            placeholder="请选择产品类型"
            filterable
          />
        </NFormItem>

        <NFormItem label="手机简称" path="phoneShortName">
          <NSelect
            v-model:value="formModel.phoneShortName"
            :options="phoneShortNameOptions"
            placeholder="请选择手机简称"
            filterable
            remote
            :loading="phoneShortNameLoading"
            :clearable="true"
            @search="handlePhoneShortNameSearch"
            @scroll="handlePhoneShortNameScroll"
          />
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
