<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import type { SelectOption } from 'naive-ui';
import { useLoading } from '@sa/hooks';
import { fetchSearchSupplier, fetchSearchTax, fetchSyncToErp } from '@/service/api';
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
const taxOptions = ref<SelectOption[]>([]);
const taxLoading = ref(false);

const defaultForm = {
  org: '',
  supplier: '',
  supplier_code: '',
  tax: '',
  tax_code: '',
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
    formModel.tax = '';
    formModel.tax_code = '';
    formModel.doc_date = Date.now();
    formModel.oa_code = props.oaCode;
    formModel.waybill = '';
    formModel.remark = '';
    supplierOptions.value = [];
    taxOptions.value = [];
  }
});

function buildRowMap(row: any) {
  const rowMap: Record<string, string> = {};

  for (const cell of row?.rowValue || []) {
    rowMap[cell.label] = cell.value || '';
  }

  return rowMap;
}

function pickValue(rowMap: Record<string, string>, candidates: string[]) {
  for (const key of candidates) {
    if (rowMap[key]) return rowMap[key];
  }

  const hit = Object.entries(rowMap).find(([key]) => candidates.some(candidate => key.includes(candidate)));
  return hit?.[1] || '';
}

function parseNumber(value: string) {
  const num = Number(String(value || '').replace(/,/g, '').trim());
  return Number.isFinite(num) ? num : 0;
}

const approvalStatus = computed(() => {
  return props.oaDetails?.['审批状态'] || props.oaDetails?.['瀹℃壒鐘舵€?'] || '';
});

const canPush = computed(() => {
  return !approvalStatus.value || approvalStatus.value === 'COMPLETED' || approvalStatus.value === '已完成';
});

const previewRows = computed(() => {
  if (!props.oaDetails) return [];

  for (const value of Object.values(props.oaDetails)) {
    if (typeof value !== 'string' || !value.trim().startsWith('[')) continue;

    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed) || !parsed.length || !parsed[0].rowValue) continue;

      return parsed.map((row, index) => {
        const rowMap = buildRowMap(row);
        const materialName = pickValue(rowMap, ['物品名称Nombre del artículo', '物品名称', '物料名称', 'Nombre']);
        const materialCode = pickValue(rowMap, ['物品编码Código', '物品编码', '物料编码', 'ODT / 订单号', 'Código']);
        const unit = pickValue(rowMap, ['单位Unidad', '单位', '计量单位', 'Unidad']);
        const qty = parseNumber(pickValue(rowMap, ['数量Cantidad', '数量', 'Cantidad']));
        const price = parseNumber(pickValue(rowMap, ['单价Precio', '单价', 'Precio']));
        const amount = parseNumber(pickValue(rowMap, ['总金额Monto Total', '总金额', 'Monto Total']));

        return {
          index: index + 1,
          materialCode: materialCode || '-',
          materialName: materialName || '-',
          unit: unit || '-',
          qty,
          price,
          amount: amount || qty * price
        };
      });
    } catch {
      // skip non-table values
    }
  }

  return [];
});

const previewTotal = computed(() => previewRows.value.reduce((sum, row) => sum + row.amount, 0));

const previewColumns = [
  { key: 'index', title: '序号', width: 60, align: 'center' as const },
  { key: 'materialCode', title: '物料编码', minWidth: 120 },
  { key: 'materialName', title: '物料名称', minWidth: 180 },
  { key: 'unit', title: '单位', width: 80 },
  { key: 'qty', title: '数量', width: 100 },
  { key: 'price', title: '单价', width: 100 },
  { key: 'amount', title: '金额', width: 120 }
];

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

async function handleTaxSearch(query: string) {
  if (!query.trim() && taxOptions.value.length) return;
  taxLoading.value = true;
  try {
    const { data, error } = await fetchSearchTax(query || '');
    if (!error && data) {
      taxOptions.value = data.map((item: any) => ({
        label: `${item.code || item.taxCode} - ${item.name || item.taxName}${item.rateValue ? `（${item.rateValue}%）` : ''}`,
        value: item.name || item.taxName,
        _code: item.code || item.taxCode
      }));
    }
  } finally {
    taxLoading.value = false;
  }
}

function handleTaxDropdownOpen(open: boolean) {
  if (open && taxOptions.value.length === 0) {
    handleTaxSearch('');
  }
}

function handleTaxUpdate(value: string, option: SelectOption) {
  formModel.tax = value;
  formModel.tax_code = (option as any)._code || '';
}

async function handleSubmit() {
  startLoading();
  try {
    await validate();

    if (!props.oaDetails) {
      window.$message?.error('审批详情为空');
      return;
    }

    if (!canPush.value) {
      window.$message?.error(`审批状态为 ${approvalStatus.value}，仅已完成审批允许推送`);
      return;
    }

    if (!previewRows.value.length) {
      window.$message?.error('未识别到可推送的明细行');
      return;
    }

    const params: Api.Oa.SyncErpParams = {
      modal_data: {
        org: formModel.org,
        supplier: formModel.supplier,
        supplier_code: formModel.supplier_code || undefined,
        tax_code: formModel.tax_code || undefined,
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
  <NDrawer v-model:show="visible" width="760px" placement="right">
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

        <NFormItem label="税率" path="tax">
          <NSelect
            v-model:value="formModel.tax"
            :options="taxOptions"
            :loading="taxLoading"
            filterable
            clearable
            remote
            placeholder="请选择税率（可选）"
            @search="handleTaxSearch"
            @update:value="handleTaxUpdate"
            @update:show="handleTaxDropdownOpen"
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

      <NAlert v-if="!canPush" type="warning" class="mb-12px">
        当前审批状态为 {{ approvalStatus || '-' }}，仅已完成审批允许推送到 ERP。
      </NAlert>

      <NCard size="small" :bordered="true" title="推送明细预览">
        <NDataTable
          :columns="previewColumns"
          :data="previewRows"
          :pagination="false"
          size="small"
          striped
        />
        <div class="mt-8px text-right text-14px">
          共 {{ previewRows.length }} 行，合计金额：{{ previewTotal.toFixed(2) }}
        </div>
      </NCard>

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
