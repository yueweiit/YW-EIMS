<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import type { SelectOption } from 'naive-ui';
import { useLoading } from '@sa/hooks';
import { fetchSyncToErp, fetchSearchSupplier } from '@/service/api';
import { useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({ name: 'ErpSyncDrawer' });

interface Props {
  oaCode: string;
  oaDetails: Api.Oa.ApprovalDetail | null;
}

const props = defineProps<Props>();

const visible = defineModel<boolean>('visible', { default: false });

const { loading, startLoading, endLoading } = useLoading(false);
const { formRef, validate, restoreValidation } = useNaiveForm();

const orgOptions: SelectOption[] = [
  { label: '星铭', value: '星铭' },
  { label: '星城', value: '星城' }
];

const supplierOptions = ref<SelectOption[]>([]);
const supplierLoading = ref(false);

const defaultForm = {
  org: '',
  supplier: '',
  supplier_code: '',
  doc_date: null as number | null,
  oa_code: '',
  waybill: '',
  remark: ''
};

const formModel = reactive({ ...defaultForm });

const rules = {
  org: [{ required: true, message: $t('page.oa.approval.erpSync.orgPlaceholder'), trigger: 'change' }],
  supplier: [{ required: true, message: $t('page.oa.approval.erpSync.supplierPlaceholder'), trigger: 'change' }],
  doc_date: [{ required: true, message: $t('page.oa.approval.erpSync.docDatePlaceholder'), trigger: 'change', type: 'number' as const }]
};

watch(visible, val => {
  if (val) {
    restoreValidation();
    formModel.org = '';
    formModel.supplier = '';
    formModel.supplier_code = '';
    formModel.doc_date = Date.now();
    formModel.oa_code = props.oaCode;
    formModel.waybill = '';
    formModel.remark = '';
    supplierOptions.value = [];
  }
});

async function handleSupplierSearch(query: string) {
  if (!query.trim() && supplierOptions.value.length) return;
  supplierLoading.value = true;
  try {
    const { data, error } = await fetchSearchSupplier(query || '');
    if (!error && data) {
      supplierOptions.value = data.map((item: any) => ({
        label: `${item.code || item.vendorCode} - ${item.name || item.vendorName}`,
        value: item.name || item.vendorName,
        _code: item.code || item.vendorCode
      }));
    }
  } finally {
    supplierLoading.value = false;
  }
}

function handleSupplierDropdownOpen(open: boolean) {
  if (open && supplierOptions.value.length === 0) {
    handleSupplierSearch('');
  }
}

function handleSupplierUpdate(value: string, option: SelectOption) {
  formModel.supplier = value;
  formModel.supplier_code = (option as any)._code || '';
}

async function handleSubmit() {
  startLoading();
  try {
    await validate();

    if (!props.oaDetails) {
      window.$message?.error('审批详情为空');
      return;
    }

    const params: Api.Oa.SyncErpParams = {
      modal_data: {
        org: formModel.org,
        supplier: formModel.supplier,
        supplier_code: formModel.supplier_code || undefined,
        doc_date: formModel.doc_date ? new Date(formModel.doc_date).toISOString().split('T')[0] : '',
        oa_code: formModel.oa_code,
        waybill: formModel.waybill || undefined,
        remark: formModel.remark || undefined
      },
      oa_details: props.oaDetails as unknown as Record<string, any>
    };

    const { data, error } = await fetchSyncToErp(params);
    if (!error) {
      window.$message?.success($t('page.oa.approval.erpSync.pushSuccess'));
      visible.value = false;
    } else {
      window.$message?.error(data?.message || $t('page.oa.approval.erpSync.pushFailed'));
    }
  } finally {
    endLoading();
  }
}
</script>

<template>
  <NDrawer v-model:show="visible" width="480px" placement="right">
    <NDrawerContent :title="$t('page.oa.approval.erpSync.title')" :native-scrollbar="false">
      <NForm ref="formRef" :model="formModel" :rules="rules" label-placement="left" label-width="90px">
        <NFormItem :label="$t('page.oa.approval.erpSync.org')" path="org">
          <NSelect
            v-model:value="formModel.org"
            :options="orgOptions"
            :placeholder="$t('page.oa.approval.erpSync.orgPlaceholder')"
          />
        </NFormItem>

        <NFormItem :label="$t('page.oa.approval.erpSync.supplier')" path="supplier">
          <NSelect
            v-model:value="formModel.supplier"
            :options="supplierOptions"
            :loading="supplierLoading"
            filterable
            remote
            :placeholder="$t('page.oa.approval.erpSync.supplierPlaceholder')"
            @search="handleSupplierSearch"
            @update:value="handleSupplierUpdate"
            @update:show="handleSupplierDropdownOpen"
          />
        </NFormItem>

        <NFormItem :label="$t('page.oa.approval.erpSync.docDate')" path="doc_date">
          <NDatePicker
            v-model:value="formModel.doc_date"
            type="date"
            :placeholder="$t('page.oa.approval.erpSync.docDatePlaceholder')"
            style="width: 100%"
          />
        </NFormItem>

        <NFormItem :label="$t('page.oa.approval.erpSync.oaCode')" path="oa_code">
          <NInput v-model:value="formModel.oa_code" disabled />
        </NFormItem>

        <NFormItem :label="$t('page.oa.approval.erpSync.waybill')" path="waybill">
          <NInput
            v-model:value="formModel.waybill"
            :placeholder="$t('page.oa.approval.erpSync.waybillPlaceholder')"
          />
        </NFormItem>

        <NFormItem :label="$t('page.oa.approval.erpSync.remark')" path="remark">
          <NInput
            v-model:value="formModel.remark"
            type="textarea"
            :placeholder="$t('page.oa.approval.erpSync.remarkPlaceholder')"
            :rows="3"
          />
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="visible = false">{{ $t('common.cancel') }}</NButton>
          <NButton type="primary" :loading="loading" @click="handleSubmit">
            {{ $t('page.oa.approval.pushToErp') }}
          </NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>
