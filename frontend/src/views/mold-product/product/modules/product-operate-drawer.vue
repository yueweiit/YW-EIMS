<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import type { FormRules } from 'naive-ui';
import { NButton, NDrawer, NDrawerContent, NForm, NFormItem, NSelect, NSpace } from 'naive-ui';
import { fetchCreateProduct, fetchPhoneModelPage, fetchProductCodePage, fetchUpdateProduct } from '@/service/api';
import { useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

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

const title = computed(() => (props.type === 'add' ? $t('page.ui.addProduct') : $t('page.ui.editProduct')));

const rules = computed<FormRules>(() => ({
  productType: [
    {
      required: true,
      message: $t('page.ui.selectProductType'),
      trigger: 'change'
    }
  ],
  phoneShortName: [
    {
      required: true,
      message: $t('page.ui.selectPhoneShortName'),
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
    window.$message?.error($t('page.ui.loadProductTypeListFailed'));
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
        .map(item => ({
          label: item.phoneShortName || item.phoneName,
          value: item.phoneShortName || item.phoneName
        }));
      if (reset) {
        phoneShortNameOptions.value = newOptions;
      } else {
        phoneShortNameOptions.value = [...phoneShortNameOptions.value, ...newOptions];
      }
      phoneShortNameTotal.value = data.total;
    }
  } catch {
    window.$message?.error($t('page.ui.loadPhoneModelListFailed'));
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
        window.$message?.success($t('page.ui.generatedProductItems', { count }));
        visible.value = false;
        emit('submitted');
      }
    } else if (props.rowData) {
      const { error } = await fetchUpdateProduct(props.rowData.id, body);
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
        <NFormItem :label="$t('page.ui.productType')" path="productType">
          <NSelect
            v-model:value="formModel.productType"
            :options="productTypeOptions"
            :placeholder="$t('page.ui.selectProductType')"
            filterable
          />
        </NFormItem>

        <NFormItem :label="$t('page.ui.phoneShortName')" path="phoneShortName">
          <NSelect
            v-model:value="formModel.phoneShortName"
            :options="phoneShortNameOptions"
            :placeholder="$t('page.ui.selectPhoneShortName')"
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
